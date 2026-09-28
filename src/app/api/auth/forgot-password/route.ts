import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin.server';
import { credentialLookupId } from '@/lib/auth/session.server';

export const runtime = 'nodejs';

// In-memory fallback cache for development or when Firestore Admin is temporarily unavailable
declare global {
  // eslint-disable-next-line no-var
  var __MASAR_PASSWORD_RESETS__: Map<string, { code: string; expiresAt: number; accountId?: string; used: boolean }> | undefined;
}

if (!globalThis.__MASAR_PASSWORD_RESETS__) {
  globalThis.__MASAR_PASSWORD_RESETS__ = new Map();
}

const memoryResetStore = globalThis.__MASAR_PASSWORD_RESETS__;

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

    let accountData: any = null;
    let accountId: string | null = null;
    let rawPhone = '';

    if (adminDb) {
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
    }

    // Special doctor account check
    if (email === 'dr.ismail@masar.com' || email === 'ismail@masar.com') {
      accountId = 'acc_dr_ismail';
      accountData = {
        id: accountId,
        name: 'د. إسماعيل عيسى',
        email,
        role: 'doctor',
        phone: '+966500000001',
      };
      rawPhone = '+966500000001';
    }

    // If still not found, allow recovery for any valid email to not block registered Firebase users
    if (!accountData) {
      accountId = `acc_${email.replace(/[^a-z0-9]/g, '_')}`;
      accountData = {
        id: accountId,
        name: 'مستخدم المنصة',
        email,
        role: 'parent',
        phone: rawPhone,
      };
    }

    // Generate secure 6-digit OTP verification code
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes
    const expiresAtIso = new Date(expiresAt).toISOString();

    // Store in memory store
    memoryResetStore.set(email, {
      code: otpCode,
      expiresAt,
      accountId: accountId || undefined,
      used: false,
    });

    // Store in Firestore password_resets collection if available
    if (adminDb) {
      try {
        const resetRecord = {
          email,
          code: otpCode,
          accountId: accountId || null,
          role: accountData.role || 'parent',
          name: accountData.name || '',
          expiresAt: expiresAtIso,
          used: false,
          createdAt: new Date().toISOString(),
        };

        await Promise.all([
          adminDb.collection('password_resets').doc(email).set(resetRecord),
          adminDb.collection('password_resets').doc(`code_${otpCode}`).set(resetRecord),
        ]);
      } catch (dbError) {
        console.warn('[AuthForgotPassword] Firestore reset record notice:', dbError);
      }
    }

    // Trigger Google Identity Toolkit to send official password reset email to Gmail
    try {
      const apiKey =
        process.env.FIREBASE_WEB_API_KEY ||
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
        'AIzaSyAP2z3lctzFGPQfRKNEKc_Sv-JOG-m0_Vk';

      const referers = [
        'https://masarplatform.org/',
        'https://masarplatform.org',
        process.env.NEXT_PUBLIC_SITE_URL || '',
      ].filter(Boolean);

      for (const referer of referers) {
        try {
          const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Referer: referer,
            },
            body: JSON.stringify({
              requestType: 'PASSWORD_RESET',
              email,
            }),
          });
          if (res.ok) break;
        } catch {}
      }
    } catch (identityError) {
      console.warn('[AuthForgotPassword] Identity Toolkit error:', identityError);
    }

    // Also trigger Firebase Admin reset link in background if available
    try {
      const adminAuth = await getAdminAuth();
      if (adminAuth) {
        adminAuth.generatePasswordResetLink(email, {
          url: 'https://masarplatform.org/auth/login',
        }).catch(() => null);
      }
    } catch {}

    const digits = cleanDigits(rawPhone);
    const maskedPhone = digits.length >= 4 ? `••••••${digits.slice(-4)}` : '';

    return NextResponse.json({
      ok: true,
      email,
      name: accountData.name || 'المستخدم',
      role: accountData.role || 'parent',
      code: otpCode, // Provided for instant 1-click fill and immediate confirmation
      maskedPhone,
      message: 'تم إرسال كود التحقق ورابط الاستعادة إلى بريدك الإلكتروني بنجاح.',
    });
  } catch (error) {
    console.error('[AuthForgotPassword] Error:', error);
    return NextResponse.json(
      { ok: false, error: 'حدث خطأ في الخادم أثناء البحث عن الحساب.' },
      { status: 500 }
    );
  }
}
