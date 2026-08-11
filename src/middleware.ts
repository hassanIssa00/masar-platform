import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';

  // If request is coming from nexus subdomain, route root / to /nexus
  if (hostname.toLowerCase().startsWith('nexus.')) {
    const url = request.nextUrl.clone();
    if (url.pathname === '/') {
      url.pathname = '/nexus';
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
