import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session.server';

/**
 * PUBLIC routes that do NOT require authentication.
 * Everything else is protected by default.
 *
 * Enrollment flow paths (/student/new, /survey, /assessment, /school-student/setup)
 * are public because they are accessed immediately after registration, before
 * the session cookie is available on the server.
 */
const PUBLIC_PATHS = [
  '/',
  '/signature',
  '/auth/login',
  '/auth/register',
  '/login',
  '/register',
  '/waitlist',
  '/verify/',
  '/programs/simple-spelling',
  '/programs/reading',
  '/programs/math',
  '/programs/learning-difficulties',
  // ── Post-registration enrollment flow (MASAR student path) ──────────────────
  '/student/new',     // Step 1: Enter student details
  '/survey',          // Step 2: Parent survey
  '/assessment',      // Step 3: Student placement test
  '/student/',        // Step 4: Student profile (after assessment)
  // ── Post-registration enrollment flow (IKHLAS student path) ─────────────────
  '/school-student/setup', // Step 1: DOB + avatar setup
  '/school-student',       // Student dashboard (IKHLAS)
  // ── Parent portals (have own client-side auth guard) ──────────────────────
  '/parent',
  '/school-parent',
  // ── Public static ───────────────────────────────────────────────────────────
  '/_next',
  '/favicon.ico',
  '/apple-icon.png',
  '/icon.png',
  '/robots.txt',
];

/**
 * API routes that are open (no auth required).
 * All other /api/* routes require authentication.
 */
const PUBLIC_API_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
];

const LOGIN_URL = '/auth/login';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Always allow static assets ──────────────────────────────────────────────
  if (
    pathname.startsWith('/_next/') ||
    pathname.match(/\.(svg|png|jpg|jpeg|webp|ico|woff2?|ttf|otf|css|js|map)$/)
  ) {
    return NextResponse.next();
  }

  // ── Always allow public pages and auth endpoints ─────────────────────────────
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p));
  if (isPublic) return NextResponse.next();

  const isPublicApi = PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));
  if (isPublicApi) return NextResponse.next();

  // ── All other routes require a valid session ─────────────────────────────────
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    // API request → return 401 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    // Page request → redirect to login
    const redirectUrl = new URL(`${LOGIN_URL}?redirect=${encodeURIComponent(pathname)}`, req.url);
    return NextResponse.redirect(redirectUrl);
  }

  const user = await verifySessionToken(token);

  if (!user) {
    // Invalid/expired token
    if (pathname.startsWith('/api/')) {
      const resp = NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
      resp.cookies.delete(SESSION_COOKIE_NAME);
      return resp;
    }
    const response = NextResponse.redirect(
      new URL(`${LOGIN_URL}?redirect=${encodeURIComponent(pathname)}`, req.url)
    );
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  // ── Authenticated ✅ ─────────────────────────────────────────────────────────
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon\\.ico|apple-icon\\.png|icon\\.png|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.webp|.*\\.woff2?).*)',
  ],
};
