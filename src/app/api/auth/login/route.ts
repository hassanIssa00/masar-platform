import { NextRequest, NextResponse } from 'next/server';
import { verifyProductionCredential, createSessionToken, SESSION_COOKIE_NAME, hasSessionSecret } from '@/lib/auth/session.server';
import { getAdminDb, hasFirebaseAdminConfig } from '@/lib/firebaseAdmin.server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting disabled temporarily - uncomment to re-enable
    // const rateLimit = await checkRateLimit('login', identifier, { windowMs: 15 * 60 * 1000, maxRequests: 50, failClosed: false });
    // if (!rateLimit.allowed) { return NextResponse.json({ ok: false, reason: 'rate_limited', error: '...' }, { status: 429 }); }

    let body: { identifier?: unknown; password?: unknown; rememberMe?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { ok: false, reason: 'invalid_json', error: 'طلب تسجيل الدخول غير مكتمل. حدّث الصفحة وحاول مرة أخرى.' },
        { status: 400 }
      );
    }
    const { identifier: userIdentifier, password, rememberMe } = body;

    if (typeof userIdentifier !== 'string' || typeof password !== 'string' || !userIdentifier || !password) {
      return NextResponse.json(
        { ok: false, reason: 'missing', error: 'يرجى تقديم البريد الإلكتروني وكلمة المرور' },
        { status: 400 }
      );
    }

    // Verify credentials against server-side bcrypt implementation
    const account = await verifyProductionCredential(userIdentifier, password);

    if (!account) {
      return NextResponse.json(
        { ok: false, reason: 'password', error: 'بيانات الدخول غير صحيحة' },
        { status: 401 }
      );
    }

    // Create cryptographically signed server token
    const token = await createSessionToken(account);
    if (!token) {
      return NextResponse.json(
        { ok: false, reason: 'server_misconfigured', error: 'خطأ في إعدادات الأمان على الخادم' },
        { status: 500 }
      );
    }

    try {
      const adminDb = getAdminDb();
      if (adminDb && account.id && !account.id.startsWith('generated_')) {
        const now = new Date().toISOString();
        await adminDb.collection('accounts').doc(account.id).set(
          {
            id: account.id,
            name: account.name || 'مستخدم مسار',
            email: account.email || '',
            role: account.role || 'doctor',
            lastLoginAt: now,
            lastActiveAt: now,
            lastLoginProvider: 'password',
          },
          { merge: true },
        );

        const targetStudentId = (account as any).linkedStudentId;
        if (targetStudentId) {
          const studentUpdate =
            account.role === 'student'
              ? { studentLastLoginAt: now, studentLastActiveAt: now, lastLoginAt: now, lastActiveAt: now }
              : account.role === 'parent'
              ? { parentLastLoginAt: now, parentLastActiveAt: now }
              : { lastLoginAt: now, lastActiveAt: now };

          await Promise.all([
            adminDb.collection('students').doc(targetStudentId).set(studentUpdate, { merge: true }).catch(() => {}),
            adminDb.collection('class_students').doc(targetStudentId).update(studentUpdate).catch(() => {}),
          ]);
        }
      }
    } catch {}

    // Return JSON with account - cookie set separately
    const response = NextResponse.json({
      ok: true,
      account,
    });

    // Set HttpOnly + SameSite=Lax cookie (Default 7 days, 30 days if rememberMe)
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('[AuthLogin] Failed to process login request:', error);
    return NextResponse.json(
      { ok: false, reason: 'server_error', error: 'خطأ في معالجة طلب الدخول' },
      { status: 500 }
    );
  }
}
