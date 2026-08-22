import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin.server';

const ALLOWED_TYPES = new Set([
  'visit',
  'login',
  'login_google',
  'login_apple',
  'login_microsoft',
  'login_face',
  'register',
  'register_google',
  'register_apple',
  'register_microsoft',
  'logout',
  'login_failed',
]);

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim().slice(0, 180) : fallback;
}

function number(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export async function POST(req: NextRequest) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: 'لم يتم ضبط Firebase Admin على السيرفر.' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const type = text(body.type);
  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ ok: false, error: 'نوع الحدث غير صالح.' }, { status: 400 });
  }

  const createdAt = new Date().toISOString();
  const id = text(body.id, `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  const event = {
    id,
    type,
    userId: text(body.userId, 'guest'),
    userName: text(body.userName, 'زائر'),
    userRole: text(body.userRole, 'guest'),
    device: ['mobile', 'tablet', 'desktop'].includes(text(body.device)) ? text(body.device) : 'desktop',
    os: text(body.os, 'Unknown'),
    browser: text(body.browser, 'Unknown'),
    screenWidth: Math.max(0, Math.min(number(body.screenWidth, 0), 10000)),
    page: text(body.page, '/'),
    createdAt: text(body.createdAt, createdAt),
  };

  await adminDb.collection('platform_analytics').doc(id).set(event, { merge: true });
  return NextResponse.json({ ok: true });
}
