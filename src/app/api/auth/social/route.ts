import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin.server';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session.server';
import type { UserRole } from '@/lib/localDb';

const ROLES = new Set<UserRole>(['parent', 'student', 'teacher', 'specialist']);

export const runtime = 'nodejs';

type SessionAccount = {
  id: string;
  name: string;
  email: string;
  role: 'doctor' | 'parent' | 'student' | 'specialist' | 'teacher';
  schoolBranch?: 'MASAR' | 'IKHLAS_JEDDAH';
  phone?: string;
  [key: string]: unknown;
};

function validRole(value: unknown): UserRole {
  return ROLES.has(value as UserRole) ? (value as UserRole) : 'parent';
}

function validBranch(value: unknown): NonNullable<SessionAccount['schoolBranch']> {
  return value === 'IKHLAS_JEDDAH' || value === 'MASAR' ? value : 'MASAR';
}

function normalizeEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

async function sessionResponse(account: SessionAccount, isNew: boolean) {
  const token = await createSessionToken(account);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'تعذر إنشاء جلسة آمنة للحساب الاجتماعي.' }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true, account, isNew });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return response;
}

export async function POST(req: NextRequest) {
  const adminAuth = await getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) {
    return NextResponse.json(
      { ok: false, error: 'Firebase Admin غير مفعل على السيرفر، لذلك لا يمكن اعتماد دخول Google/Apple من السحابة.' },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const idToken = String(body.idToken || '');
  const providerId = String(body.providerId || 'social').replace(/\.com$/i, '');
  const preferredRole = validRole(body.preferredRole);
  const schoolBranch = validBranch(body.schoolBranch);

  if (!idToken) {
    return NextResponse.json({ ok: false, error: 'رمز الدخول الاجتماعي غير موجود.' }, { status: 400 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = normalizeEmail(decoded.email);
    const uid = decoded.uid;
    if (!email) {
      return NextResponse.json({ ok: false, error: 'لم يتم الحصول على البريد الإلكتروني من مزود الدخول.' }, { status: 400 });
    }

    if (email === 'dr.ismail@masar.com') {
      return NextResponse.json({ ok: false, error: 'لا يمكن استخدام حساب الدكتور للدخول الاجتماعي.' }, { status: 403 });
    }

    const accountsRef = adminDb.collection('accounts');
    const byUid = await accountsRef.where('firebaseUid', '==', uid).limit(1).get();
    const byEmail = byUid.empty ? await accountsRef.where('email', '==', email).limit(1).get() : null;
    const existingDoc = !byUid.empty ? byUid.docs[0] : byEmail && !byEmail.empty ? byEmail.docs[0] : null;
    const now = new Date().toISOString();

    if (existingDoc) {
      const existing = existingDoc.data() as Partial<SessionAccount>;
      const account: SessionAccount = {
        ...existing,
        id: existing.id || existingDoc.id,
        email,
        name: existing.name || decoded.name || email.split('@')[0] || 'مستخدم جديد',
        role: existing.role || preferredRole,
        firebaseUid: uid,
        providerId,
        createdVia: existing.createdVia || providerId,
        lastLoginAt: now,
      };

      await existingDoc.ref.set(account, { merge: true });
      return sessionResponse(account, false);
    }

    const account: SessionAccount = {
      id: `account_${uid}`,
      name: decoded.name || decoded.email?.split('@')[0] || 'مستخدم جديد',
      email,
      role: preferredRole,
      schoolBranch,
      createdVia: providerId,
      providerId,
      firebaseUid: uid,
      createdAt: now,
      lastLoginAt: now,
      onboardingRequired: true,
    };

    await accountsRef.doc(account.id).set(account, { merge: true });
    const activityId = `activity_${crypto.randomUUID()}`;
    await adminDb.collection('activities').doc(activityId).set({
      id: activityId,
      type: 'account',
      refId: account.id,
      title: 'تسجيل دخول اجتماعي',
      detail: `${account.email} - ${account.role}`,
      createdAt: now,
    });

    return sessionResponse(account, true);
  } catch (error) {
    console.error('[auth/social] verify failed:', error);
    return NextResponse.json({ ok: false, error: 'تعذر اعتماد حساب Google/Apple من Firebase.' }, { status: 401 });
  }
}
