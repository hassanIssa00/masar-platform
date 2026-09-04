import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin.server';
import {
  createSessionToken,
  credentialLookupId,
  normalizePasswordInput,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/session.server';

export const runtime = 'nodejs';

function cleanEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function cleanDigits(value: unknown): string {
  return String(value || '').replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = cleanEmail(body.email);
    const userPhone = String(body.phone || '').trim();
    const newPassword = String(body.newPassword || '').trim();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'البريد الإلكتروني غير صحيح.' },
        { status: 400 }
      );
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { ok: false, error: 'كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف.' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json(
        { ok: false, error: 'تعذر الاتصال بقاعدة البيانات. حاول مرة أخرى لاحقاً.' },
        { status: 503 }
      );
    }

    let accountData: any = null;
    let accountId: string | null = null;
    let registeredPhone = '';

    // 1. Search in accounts
    const accountByEmail = await adminDb.collection('accounts').where('email', '==', email).limit(1).get().catch(() => null);
    if (accountByEmail && !accountByEmail.empty) {
      const doc = accountByEmail.docs[0];
      accountId = doc.id;
      accountData = doc.data();
      registeredPhone = accountData.phone || '';
    }

    // 1b. Search by recoveryEmail in accounts
    if (!accountData) {
      const accountByRecovery = await adminDb.collection('accounts').where('recoveryEmail', '==', email).limit(1).get().catch(() => null);
      if (accountByRecovery && !accountByRecovery.empty) {
        const doc = accountByRecovery.docs[0];
        accountId = doc.id;
        accountData = doc.data();
        registeredPhone = accountData.phone || '';
      }
    }

    // 2. Search in auth_credentials & account_credentials
    if (!accountData) {
      for (const col of ['auth_credentials', 'account_credentials'] as const) {
        const credLookup = await adminDb.collection(col).doc(credentialLookupId(email)).get().catch(() => null);
        if (credLookup && credLookup.exists) {
          const credData = credLookup.data();
          accountId = credData?.accountId || null;
          registeredPhone = credData?.phone || registeredPhone;
          if (accountId) {
            const accDoc = await adminDb.collection('accounts').doc(accountId).get().catch(() => null);
            if (accDoc && accDoc.exists) {
              accountData = accDoc.data();
              registeredPhone = registeredPhone || accountData.phone || '';
            }
          }
          break;
        }
      }
    }

    // 3. Search in students collection
    if (!accountData) {
      const studentByParentEmail = await adminDb.collection('students').where('parentEmail', '==', email).limit(1).get().catch(() => null);
      if (studentByParentEmail && !studentByParentEmail.empty) {
        const sDoc = studentByParentEmail.docs[0];
        const sData = sDoc.data();
        accountId = sData.parentAccountId || `student_parent_${sDoc.id}`;
        registeredPhone = sData.parentPhone || sData.phone || '';
        accountData = {
          id: accountId,
          name: sData.parentName || 'ولي أمر الطالب ' + (sData.fullName || ''),
          email,
          role: 'parent',
          phone: registeredPhone,
          linkedStudentName: sData.fullName || '',
          linkedStudentId: sDoc.id,
        };
      }
    }

    if (!accountData || !accountId) {
      return NextResponse.json(
        { ok: false, error: 'لم يتم العثور على حساب مسجل بهذا البريد.' },
        { status: 404 }
      );
    }

    // Security Verification Check
    const regDigits = cleanDigits(registeredPhone);
    const userDigits = cleanDigits(userPhone);

    if (regDigits.length >= 4) {
      if (!userDigits) {
        return NextResponse.json(
          { ok: false, error: 'يرجى إدخال رقم الهاتف المسجل لتأكيد هويتك.' },
          { status: 400 }
        );
      }

      // Check match: full match, suffix match (last 8, 7, 4 digits), or substring
      const isMatch =
        regDigits === userDigits ||
        regDigits.endsWith(userDigits) ||
        userDigits.endsWith(regDigits) ||
        (userDigits.length >= 4 && regDigits.slice(-userDigits.length) === userDigits) ||
        (regDigits.length >= 7 && userDigits.length >= 7 && regDigits.slice(-7) === userDigits.slice(-7));

      if (!isMatch) {
        return NextResponse.json(
          { ok: false, error: 'رقم الهاتف المدخل غير مطابق للرقم المسجل في هذا الحساب. تأكد من إدخال الرقم الصحيح.' },
          { status: 403 }
        );
      }
    }

    // Hash new password
    const normalizedPassword = normalizePasswordInput(newPassword);
    const passwordHash = await bcrypt.hash(normalizedPassword, 12);
    const now = new Date().toISOString();
    const finalPhone = registeredPhone || userPhone;

    const credentialRecord = {
      accountId,
      email,
      phone: finalPhone,
      passwordHash,
      updatedAt: now,
      source: 'self-service-password-recovery',
    };

    const writes = [
      adminDb.collection('auth_credentials').doc(accountId).set(credentialRecord, { merge: true }),
      adminDb.collection('auth_credentials').doc(credentialLookupId(email)).set(credentialRecord, { merge: true }),
      adminDb.collection('account_credentials').doc(accountId).set(credentialRecord, { merge: true }),
      adminDb.collection('account_credentials').doc(credentialLookupId(email)).set(credentialRecord, { merge: true }),
      adminDb.collection('accounts').doc(accountId).set(
        {
          id: accountId,
          name: accountData.name || 'ولي أمر',
          email,
          phone: finalPhone,
          role: accountData.role || 'parent',
          schoolBranch: accountData.schoolBranch || 'MASAR',
          lastPasswordResetAt: now,
          updatedAt: now,
        },
        { merge: true }
      ),
    ];

    if (finalPhone) {
      writes.push(adminDb.collection('auth_credentials').doc(credentialLookupId(finalPhone)).set(credentialRecord, { merge: true }));
      writes.push(adminDb.collection('account_credentials').doc(credentialLookupId(finalPhone)).set(credentialRecord, { merge: true }));
    }

    await Promise.all(writes);

    // Sync with Firebase Auth
    try {
      const adminAuth = await getAdminAuth();
      if (adminAuth) {
        const fbUser = await adminAuth.getUserByEmail(email).catch(() => null);
        if (fbUser) {
          await adminAuth.updateUser(fbUser.uid, { password: normalizedPassword });
        } else {
          await adminAuth.createUser({
            uid: accountId,
            email,
            password: normalizedPassword,
            displayName: accountData.name || 'ولي أمر',
          }).catch(() => null);
        }
      }
    } catch (authError) {
      console.warn('[AuthResetPassword] Firebase Auth sync notice:', authError);
    }

    // Generate authenticated session token
    const fullAccount = {
      id: accountId,
      name: accountData.name || 'ولي أمر',
      email,
      role: accountData.role || 'parent',
      phone: finalPhone,
      schoolBranch: accountData.schoolBranch || 'MASAR',
      linkedStudentId: accountData.linkedStudentId,
      linkedStudentEmail: accountData.linkedStudentEmail,
      linkedStudentName: accountData.linkedStudentName,
      linkedParentId: accountData.linkedParentId,
      linkedParentEmail: accountData.linkedParentEmail,
    };

    const token = await createSessionToken(fullAccount);

    const response = NextResponse.json({
      ok: true,
      account: fullAccount,
      message: 'تم إعادة تعيين كلمة المرور بنجاح! تم تسجيل دخولك تلقائياً.',
    });

    if (token) {
      response.cookies.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return response;
  } catch (error) {
    console.error('[AuthResetPassword] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'حدث خطأ في الخادم أثناء تحديث كلمة المرور.' },
      { status: 500 }
    );
  }
}
