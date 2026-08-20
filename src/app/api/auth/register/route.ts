import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminDb } from '@/lib/firebaseAdmin.server';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session.server';
import type { UserRole } from '@/lib/localDb';

const ROLES = new Set<UserRole>(['parent', 'student', 'teacher']);

function cleanEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function cleanRole(value: unknown): UserRole {
  return ROLES.has(value as UserRole) ? (value as UserRole) : 'parent';
}

function cleanBranch(value: unknown): 'MASAR' | 'IKHLAS_JEDDAH' {
  return value === 'IKHLAS_JEDDAH' || value === 'MASAR' ? value : 'MASAR';
}

export async function POST(req: NextRequest) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { ok: false, error: 'Firebase Admin غير مفعل على السيرفر، لذلك لا يمكن إنشاء حساب سحابي.' },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const email = cleanEmail(body.email);
  const password = String(body.password || '');
  const role = cleanRole(body.role);
  const schoolBranch = cleanBranch(body.schoolBranch);
  const name = String(body.name || '').trim() || (role === 'parent' ? 'ولي أمر جديد' : 'طالب جديد');
  const phone = String(body.phone || '').trim();

  if (!email || !email.includes('@') || password.trim().length < 6) {
    return NextResponse.json({ ok: false, error: 'بيانات التسجيل غير مكتملة أو كلمة المرور قصيرة.' }, { status: 400 });
  }

  const existing = await adminDb.collection('accounts').where('email', '==', email).limit(1).get();
  if (!existing.empty) {
    return NextResponse.json({ ok: false, error: 'هذا البريد مسجل بالفعل. استخدم تسجيل الدخول أو استعادة كلمة المرور.' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const accountId = `account_${crypto.randomUUID()}`;
  const account = {
    id: accountId,
    name,
    email,
    phone,
    role,
    schoolBranch,
    createdVia: 'email',
    providerId: 'password',
    createdAt: now,
    lastLoginAt: now,
    onboardingRequired: true,
  };
  const passwordHash = await bcrypt.hash(password.trim(), 12);

  await Promise.all([
    adminDb.collection('accounts').doc(accountId).set(account, { merge: true }),
    adminDb.collection('account_credentials').doc(accountId).set(
      {
        accountId,
        email,
        phone,
        passwordHash,
        createdAt: now,
        source: 'manual-register',
      },
      { merge: true },
    ),
  ]);

  const token = await createSessionToken(account);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'تعذر إنشاء جلسة آمنة للحساب.' }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true, account });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
