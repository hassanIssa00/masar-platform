import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const FIREBASE_AUTH_ORIGIN = 'https://masar-platform-8e642.firebaseapp.com';

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  const upstreamUrl = new URL(`/__/firebase/${path.join('/')}`, FIREBASE_AUTH_ORIGIN);
  upstreamUrl.search = request.nextUrl.search;

  const response = await fetch(upstreamUrl, {
    method: 'GET',
    headers: {
      accept: request.headers.get('accept') ?? '*/*',
      'user-agent': request.headers.get('user-agent') ?? 'MasarAuthProxy',
    },
    redirect: 'manual',
  });

  const headers = new Headers(response.headers);
  headers.delete('content-security-policy');
  headers.delete('x-frame-options');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
