import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const FIREBASE_AUTH_ORIGIN = 'https://masar-platform-8e642.firebaseapp.com';

async function proxyFirebaseAuth(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await context.params;
  const upstreamUrl = new URL(`/__/auth/${path.join('/')}`, FIREBASE_AUTH_ORIGIN);
  upstreamUrl.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.set('host', 'masar-platform-8e642.firebaseapp.com');

  const response = await fetch(upstreamUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer(),
    redirect: 'manual',
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('content-security-policy');
  responseHeaders.delete('x-frame-options');

  const location = responseHeaders.get('location');
  if (location?.startsWith(FIREBASE_AUTH_ORIGIN)) {
    responseHeaders.set('location', location.replace(FIREBASE_AUTH_ORIGIN, request.nextUrl.origin));
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyFirebaseAuth(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyFirebaseAuth(request, context);
}

export async function OPTIONS(request: NextRequest, context: { params: Promise<{ path?: string[] }> }) {
  return proxyFirebaseAuth(request, context);
}
