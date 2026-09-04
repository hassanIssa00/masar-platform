import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin.server';
import { credentialLookupId } from '@/lib/auth/session.server';

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

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { ok: false, error: 'يُرجى إدخال بريد إلكتروني صحيح.' },
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
    let rawPhone = '';

    // 1. Search in accounts collection
    const accountByEmail = await adminDb.collection('accounts').where('email', '==', email).limit(1).get().catch(() => null);
    if (accountByEmail && !accountByEmail.empty) {
      const doc = accountByEmail.docs[0];
      accountId = doc.id;
      accountData = doc.data();
      rawPhone = accountData.phone || '';
    }

    // 1b. Search by recoveryEmail in accounts
    if (!accountData) {
      const accountByRecovery = await adminDb.collection('accounts').where('recoveryEmail', '==', email).limit(1).get().catch(() => null);
      if (accountByRecovery && !accountByRecovery.empty) {
        const doc = accountByRecovery.docs[0];
        accountId = doc.id;
        accountData = doc.data();
        rawPhone = accountData.phone || '';
      }
    }

    // 2. Search in auth_credentials & account_credentials
    if (!accountData) {
      for (const col of ['auth_credentials', 'account_credentials'] as const) {
        const credLookup = await adminDb.collection(col).doc(credentialLookupId(email)).get().catch(() => null);
        if (credLookup && credLookup.exists) {
          const credData = credLookup.data();
          accountId = credData?.accountId || null;
          rawPhone = credData?.phone || rawPhone;
          if (accountId) {
            const accDoc = await adminDb.collection('accounts').doc(accountId).get().catch(() => null);
            if (accDoc && accDoc.exists) {
              accountData = accDoc.data();
              rawPhone = rawPhone || accountData.phone || '';
            }
          }
          break;
        }

        const credByEmail = await adminDb.collection(col).where('email', '==', email).limit(1).get().catch(() => null);
        if (credByEmail && !credByEmail.empty) {
          const credData = credByEmail.docs[0].data();
          accountId = credData?.accountId || null;
          rawPhone = credData?.phone || rawPhone;
          if (accountId) {
            const accDoc = await adminDb.collection('accounts').doc(accountId).get().catch(() => null);
            if (accDoc && accDoc.exists) {
              accountData = accDoc.data();
              rawPhone = rawPhone || accountData.phone || '';
            }
          }
          break;
        }
      }
    }

    // 3. Search in students collection (parent email or student email)
    if (!accountData) {
      const studentByParentEmail = await adminDb.collection('students').where('parentEmail', '==', email).limit(1).get().catch(() => null);
      if (studentByParentEmail && !studentByParentEmail.empty) {
        const sDoc = studentByParentEmail.docs[0];
        const sData = sDoc.data();
        accountId = sData.parentAccountId || `student_parent_${sDoc.id}`;
        accountData = {
          id: accountId,
          name: sData.parentName || 'ولي أمر الطالب ' + (sData.fullName || ''),
          email,
          role: 'parent',
          phone: sData.parentPhone || sData.phone || '',
          linkedStudentName: sData.fullName || '',
          linkedStudentId: sDoc.id,
        };
        rawPhone = accountData.phone;
      } else {
        const studentByEmail = await adminDb.collection('students').where('email', '==', email).limit(1).get().catch(() => null);
        if (studentByEmail && !studentByEmail.empty) {
          const sDoc = studentByEmail.docs[0];
          const sData = sDoc.data();
          accountId = sData.studentAccountId || sDoc.id;
          accountData = {
            id: accountId,
            name: sData.fullName || 'طالب',
            email,
            role: 'student',
            phone: sData.phone || sData.parentPhone || '',
            linkedStudentName: sData.fullName || '',
            linkedStudentId: sDoc.id,
          };
          rawPhone = accountData.phone;
        }
      }
    }

    if (!accountData) {
      return NextResponse.json(
        {
          ok: false,
          error: 'لم نتمكن من العثور على حساب مسجل بهذا البريد الإلكتروني. يُرجى التحقق من كتابة البريد بشكل صحيح أو إنشاء حساب جديد.',
        },
        { status: 404 }
      );
    }

    const digits = cleanDigits(rawPhone);
    let maskedPhone = '';
    let phoneHint = '';

    if (digits.length >= 4) {
      phoneHint = digits.slice(-4);
      if (digits.length >= 9) {
        maskedPhone = `${digits.slice(0, 3)}•••••${digits.slice(-2)}`;
      } else {
        maskedPhone = `••••••${phoneHint}`;
      }
    }

    // In the background, generate Firebase reset link if user exists in Firebase Auth
    try {
      const adminAuth = await getAdminAuth();
      if (adminAuth) {
        adminAuth.generatePasswordResetLink(email, {
          url: 'https://masarplatform.org/auth/login',
        }).catch(() => null);
      }
    } catch {}

    return NextResponse.json({
      ok: true,
      found: true,
      email,
      name: accountData.name || 'المستخدم',
      role: accountData.role || 'parent',
      hasPhone: Boolean(digits.length >= 4),
      maskedPhone,
      phoneHint,
      linkedStudentName: accountData.linkedStudentName || '',
    });
  } catch (error) {
    console.error('[AuthForgotPassword] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'حدث خطأ في الخادم أثناء البحث عن الحساب.' },
      { status: 500 }
    );
  }
}
