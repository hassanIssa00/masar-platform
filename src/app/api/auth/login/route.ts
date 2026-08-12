import { NextRequest, NextResponse } from 'next/server';
import { verifyProductionCredential, createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session.server';
import { checkRateLimit, getClientIdentifier } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  try {
    // Rate limiting disabled temporarily - uncomment to re-enable
    // const rateLimit = await checkRateLimit('login', identifier, { windowMs: 15 * 60 * 1000, maxRequests: 50, failClosed: false });
    // if (!rateLimit.allowed) { return NextResponse.json({ ok: false, reason: 'rate_limited', error: '...' }, { status: 429 }); }

    const body = await req.json();
    const { identifier: userIdentifier, password, rememberMe } = body;

    if (!userIdentifier || !password) {
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

    // Return JSON with account - cookie set separately
    const response = NextResponse.json({
      ok: true,
      account,
    });

    // Set HttpOnly + SameSite=Lax cookie (Session cookie when rememberMe is false)
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: false, // Allow on HTTP too for testing
      sameSite: 'lax',
      path: '/',
      ...(rememberMe ? { maxAge: 7 * 24 * 60 * 60 } : {}),
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, reason: 'server_error', error: 'خطأ في معالجة طلب الدخول' },
      { status: 500 }
    );
  }
}
