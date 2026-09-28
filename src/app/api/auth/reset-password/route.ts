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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = cleanEmail(body.email);
    const code = String(body.code || '').trim();
    const newPassword = String(body.newPassword || '').trim();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'البريد الإلكتروني غير صحيح.' },
        { status: 400 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { ok: false, error: 'يُرجى إدخال كود التحقق المكون من 6 أرقام.' },
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

    // ── 1. Code Verification ──
    let codeValid = false;

    // Check memory store
    const memStore = globalThis.__MASAR_PASSWORD_RESETS__;
    if (memStore && memStore.has(email)) {
      const memRecord = memStore.get(email)!;
      if (memRecord.code === code || memRecord.code === code.replace(/\s+/g, '')) {
        if (memRecord.used) {
          return NextResponse.json(
            { ok: false, error: 'تم استخدام كود التحقق هذا من قبل. يُرجى طلب كود جديد.' },
            { status: 400 }
          );
        }
        if (Date.now() > memRecord.expiresAt) {
          return NextResponse.json(
            { ok: false, error: 'انتهت صلاحية كود التحقق (15 دقيقة). يُرجى طلب كود جديد.' },
            { status: 400 }
          );
        }
        codeValid = true;
        memRecord.used = true;
      }
    }

    // Check Firestore password_resets collection
    if (!codeValid && adminDb) {
      try {
        let resetDoc = await adminDb.collection('password_resets').doc(email).get().catch(() => null);
        if (!resetDoc?.exists) {
          resetDoc = await adminDb.collection('password_resets').doc(`code_${code}`).get().catch(() => null);
        }

        if (resetDoc?.exists) {
          const rData = resetDoc.data();
          if (rData?.code === code || rData?.code === code.replace(/\s+/g, '')) {
            if (rData?.used) {
              return NextResponse.json(
                { ok: false, error: 'تم استخدام كود التحقق هذا من قبل. يُرجى طلب كود جديد.' },
                { status: 400 }
              );
            }
            if (rData?.expiresAt && new Date(rData.expiresAt).getTime() < Date.now()) {
              return NextResponse.json(
                { ok: false, error: 'انتهت صلاحية كود التحقق. يُرجى طلب كود جديد.' },
                { status: 400 }
              );
            }
            codeValid = true;
            await resetDoc.ref.update({ used: true, usedAt: new Date().toISOString() }).catch(() => null);
          }
        }
      } catch (checkErr) {
        console.warn('[AuthResetPassword] Firestore code lookup notice:', checkErr);
      }
    }

    // Check if code is a Firebase Auth action code (oobCode)
    if (!codeValid) {
      try {
        const apiKey =
          process.env.FIREBASE_WEB_API_KEY ||
          process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
          'AIzaSyAP2z3lctzFGPQfRKNEKc_Sv-JOG-m0_Vk';

        const oobRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Referer: 'https://masarplatform.org/',
          },
          body: JSON.stringify({
            oobCode: code,
            newPassword,
          }),
        });

        if (oobRes.ok) {
          codeValid = true;
        }
      } catch {}
    }

    if (!codeValid) {
      return NextResponse.json(
        { ok: false, error: 'كود التحقق غير صحيح أو انتهت صلاحيته. يُرجى التحقق من الكود المرسل لبريدك الإلكتروني أو طلب كود جديد.' },
        { status: 400 }
      );
    }

    // ── 2. Account Resolution ──
    let accountData: any = null;
    let accountId: string | null = null;
    let registeredPhone = '';

    if (adminDb) {
      // Search in accounts
      const accountByEmail = await adminDb.collection('accounts').where('email', '==', email).limit(1).get().catch(() => null);
      if (accountByEmail && !accountByEmail.empty) {
        const doc = accountByEmail.docs[0];
        accountId = doc.id;
        accountData = doc.data();
        registeredPhone = accountData.phone || '';
      }

      // Search by recoveryEmail in accounts
      if (!accountData) {
        const accountByRecovery = await adminDb.collection('accounts').where('recoveryEmail', '==', email).limit(1).get().catch(() => null);
        if (accountByRecovery && !accountByRecovery.empty) {
          const doc = accountByRecovery.docs[0];
          accountId = doc.id;
          accountData = doc.data();
          registeredPhone = accountData.phone || '';
        }
      }

      // Search in auth_credentials & account_credentials
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

      // Search in students collection
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
        } else {
          const studentByEmail = await adminDb.collection('students').where('email', '==', email).limit(1).get().catch(() => null);
          if (studentByEmail && !studentByEmail.empty) {
            const sDoc = studentByEmail.docs[0];
            const sData = sDoc.data();
            accountId = sData.studentAccountId || sDoc.id;
            registeredPhone = sData.phone || sData.parentPhone || '';
            accountData = {
              id: accountId,
              name: sData.fullName || 'طالب',
              email,
              role: 'student',
              phone: registeredPhone,
              linkedStudentName: sData.fullName || '',
              linkedStudentId: sDoc.id,
            };
          }
        }
      }
    }

    if (email === 'dr.ismail@masar.com' || email === 'ismail@masar.com') {
      accountId = 'acc_dr_ismail';
      accountData = {
        id: accountId,
        name: 'د. إسماعيل عيسى',
        email,
        role: 'doctor',
        phone: '+966500000001',
      };
      registeredPhone = '+966500000001';
    }

    if (!accountData || !accountId) {
      accountId = `acc_${email.replace(/[^a-z0-9]/g, '_')}`;
      accountData = {
        id: accountId,
        name: 'مستخدم المنصة',
        email,
        role: 'parent',
        phone: registeredPhone,
      };
    }

    // ── 3. Hash New Password & Save ──
    const normalizedPassword = normalizePasswordInput(newPassword);
    const passwordHash = await bcrypt.hash(normalizedPassword, 12);
    const now = new Date().toISOString();

    const credentialRecord = {
      accountId,
      email,
      phone: registeredPhone,
      passwordHash,
      updatedAt: now,
      source: 'self-service-password-recovery-email',
    };

    if (adminDb) {
      const writes = [
        adminDb.collection('auth_credentials').doc(accountId).set(credentialRecord, { merge: true }),
        adminDb.collection('auth_credentials').doc(credentialLookupId(email)).set(credentialRecord, { merge: true }),
        adminDb.collection('account_credentials').doc(accountId).set(credentialRecord, { merge: true }),
        adminDb.collection('account_credentials').doc(credentialLookupId(email)).set(credentialRecord, { merge: true }),
        adminDb.collection('accounts').doc(accountId).set(
          {
            id: accountId,
            name: accountData.name || 'مستخدم المنصة',
            email,
            phone: registeredPhone,
            role: accountData.role || 'parent',
            schoolBranch: accountData.schoolBranch || 'MASAR',
            lastPasswordResetAt: now,
            updatedAt: now,
          },
          { merge: true }
        ),
      ];

      if (registeredPhone) {
        writes.push(adminDb.collection('auth_credentials').doc(credentialLookupId(registeredPhone)).set(credentialRecord, { merge: true }));
        writes.push(adminDb.collection('account_credentials').doc(credentialLookupId(registeredPhone)).set(credentialRecord, { merge: true }));
      }

      await Promise.all(writes).catch((wErr) => {
        console.warn('[AuthResetPassword] Writes notice:', wErr);
      });
    }

    // Sync with Firebase Auth
    try {
      const adminAuth = await getAdminAuth();
      if (adminAuth) {
        const fbUser = await adminAuth.getUserByEmail(email).catch(() => null);
        if (fbUser) {
          await adminAuth.updateUser(fbUser.uid, { password: normalizedPassword }).catch(() => null);
        } else {
          await adminAuth.createUser({
            uid: accountId,
            email,
            password: normalizedPassword,
            displayName: accountData.name || 'مستخدم المنصة',
          }).catch(() => null);
        }
      }
    } catch (authError) {
      console.warn('[AuthResetPassword] Firebase Auth sync notice:', authError);
    }

    // ── 4. Generate Authenticated Session Token ──
    const fullAccount = {
      id: accountId,
      name: accountData.name || 'مستخدم المنصة',
      email,
      role: accountData.role || 'parent',
      phone: registeredPhone,
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
