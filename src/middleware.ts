import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'masar_session';

type MiddlewareSessionPayload = {
  exp?: number;
};

const DEFAULT_AUTH_SECRETS = [
  'masar_genesis_auth_secret_v2_2026_secure_key_#99318',
  'masar_default_session_secret_jwt_2026_prod_key_#88219',
];

function getJwtSecrets(): string[] {
  const envSecret = process.env.SESSION_SECRET?.trim();
  const list: string[] = [];
  if (envSecret) list.push(envSecret);
  for (const s of DEFAULT_AUTH_SECRETS) {
    if (!list.includes(s)) list.push(s);
  }
  return list;
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function verifySessionTokenInMiddleware(token: string): Promise<MiddlewareSessionPayload | null> {
  try {
    const secrets = getJwtSecrets();
    if (secrets.length === 0 || !token) return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;
    const data = `${headerB64}.${payloadB64}`;
    const enc = new TextEncoder();
    const sigBytes = base64UrlToBytes(sigB64);

    for (const secret of secrets) {
      try {
        const key = await crypto.subtle.importKey(
          'raw',
          enc.encode(secret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['verify'],
        );

        const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(data));
        if (valid) {
          const payloadText = new TextDecoder().decode(base64UrlToBytes(payloadB64));
          const payload = JSON.parse(payloadText) as MiddlewareSessionPayload;
          if (!payload.exp || Date.now() / 1000 <= payload.exp) {
            return payload;
          }
        }
      } catch {}
    }

    return null;
  } catch {
    return null;
  }
}

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
  '/account-generator',
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
  '/api/auth/social',
  '/api/auth/face',
  '/api/accounts/generate',
];

const LOGIN_URL = '/auth/login';

function matchesPublicPath(pathname: string, publicPath: string) {
  if (publicPath === '/') return pathname === '/';
  if (publicPath.endsWith('/')) return pathname === publicPath.slice(0, -1) || pathname.startsWith(publicPath);
  return pathname === publicPath;
}

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
  const isPublic = PUBLIC_PATHS.some((p) => matchesPublicPath(pathname, p));
  if (isPublic) return NextResponse.next();

  const isPublicApi = PUBLIC_API_PATHS.some((p) => pathname === p);
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

  const user = await verifySessionTokenInMiddleware(token);

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
