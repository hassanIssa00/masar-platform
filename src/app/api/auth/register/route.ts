import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin.server';
import { createSessionToken, normalizePasswordInput, SESSION_COOKIE_NAME } from '@/lib/auth/session.server';
import type { UserRole } from '@/lib/localDb';

export const runtime = 'nodejs';

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

function credentialLookupId(value: string) {
  return `lookup_${value.trim().toLowerCase().replace(/[^a-z0-9._+-]+/g, '_').slice(0, 140)}`;
}

async function createFirebaseUserViaRest(email: string, password: string, displayName: string) {
  const apiKey =
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyAP2z3lctzFGPQfRKNEKc_Sv-JOG-m0_Vk';

  if (!apiKey) return null;

  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        displayName,
        returnSecureToken: true,
      }),
    });

    if (!response.ok) {
      const errData = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      if (errData?.error?.message === 'EMAIL_EXISTS') {
        return { ok: false, error: 'EMAIL_EXISTS' as const };
      }
      return null;
    }

    const data = (await response.json()) as { localId?: string };
    return { ok: true, localId: data.localId };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const adminDb = getAdminDb();
  let adminAuth = null;
  try {
    adminAuth = await getAdminAuth();
  } catch {}

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

  if (adminAuth) {
    const existingAuthUser = await adminAuth.getUserByEmail(email).catch(() => null);
    if (existingAuthUser) {
      return NextResponse.json({ ok: false, error: 'هذا البريد مسجل بالفعل. استخدم تسجيل الدخول أو استعادة كلمة المرور.' }, { status: 409 });
    }
  }

  if (adminDb) {
    try {
      const existing = await adminDb.collection('accounts').where('email', '==', email).limit(1).get();
      if (!existing.empty) {
        return NextResponse.json({ ok: false, error: 'هذا البريد مسجل بالفعل. استخدم تسجيل الدخول أو استعادة كلمة المرور.' }, { status: 409 });
      }
    } catch (error) {
      console.error('[AuthRegister] Firestore duplicate check skipped:', error);
    }
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
  const passwordHash = await bcrypt.hash(normalizePasswordInput(password), 12);
  const credential = {
    accountId,
    email,
    phone,
    passwordHash,
    createdAt: now,
    source: 'manual-register',
    authUserCreated: false,
  };

  let authUserCreated = false;
  if (adminAuth) {
    try {
      await adminAuth.createUser({
        uid: accountId,
        email,
        password: normalizePasswordInput(password),
        displayName: name,
      });
      authUserCreated = true;
      credential.authUserCreated = true;
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/email-already-exists') {
        return NextResponse.json({ ok: false, error: 'هذا البريد مسجل بالفعل. استخدم تسجيل الدخول أو استعادة كلمة المرور.' }, { status: 409 });
      }
      console.error('[AuthRegister] Firebase Auth admin creation failed; trying REST fallback:', error);
    }

    if (authUserCreated) {
      await adminAuth.setCustomUserClaims(accountId, {
        role,
        schoolBranch,
        providerId: 'password',
        onboardingRequired: true,
      }).catch(() => {});
    }
  }

  if (!authUserCreated) {
    const restResult = await createFirebaseUserViaRest(email, normalizePasswordInput(password), name);
    if (restResult?.ok) {
      authUserCreated = true;
      credential.authUserCreated = true;
    } else if (restResult?.error === 'EMAIL_EXISTS') {
      return NextResponse.json({ ok: false, error: 'هذا البريد مسجل بالفعل. استخدم تسجيل الدخول أو استعادة كلمة المرور.' }, { status: 409 });
    }
  }

  if (adminDb) {
    try {
    await Promise.all([
      adminDb.collection('accounts').doc(accountId).set(account, { merge: true }),
      adminDb.collection('auth_credentials').doc(accountId).set(credential, { merge: true }),
      adminDb.collection('auth_credentials').doc(credentialLookupId(email)).set(credential, { merge: true }),
      adminDb.collection('account_credentials').doc(accountId).set(credential, { merge: true }),
      adminDb.collection('account_credentials').doc(credentialLookupId(email)).set(credential, { merge: true }),
      ...(phone
        ? [
          adminDb.collection('auth_credentials').doc(credentialLookupId(phone)).set(credential, { merge: true }),
          adminDb.collection('account_credentials').doc(credentialLookupId(phone)).set(credential, { merge: true }),
        ]
        : []),
    ]);
    } catch (error) {
      console.error('[AuthRegister] Firestore write failed after auth creation:', error);
    }
  }

  try {
    const { invalidateSnapshotCache } = await import('../../data/snapshot/route');
    invalidateSnapshotCache();
  } catch {}

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
