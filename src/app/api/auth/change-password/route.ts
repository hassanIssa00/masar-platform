import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireRole } from '@/lib/auth/authorization';
import { getAdminDb } from '@/lib/firebaseAdmin.server';

function credentialLookupId(value: string) {
  return `lookup_${value.trim().toLowerCase().replace(/[^a-z0-9._+-]+/g, '_').slice(0, 140)}`;
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['doctor', 'specialist', 'teacher', 'parent', 'student']);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ ok: false, error: 'سجل الدخول أولاً لتغيير كلمة المرور.' }, { status: 401 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: 'Firebase Admin غير مفعل على السيرفر.' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const password = String(body.password || '').trim();
  if (password.length < 6) {
    return NextResponse.json({ ok: false, error: 'كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف.' }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const email = auth.user.email.trim().toLowerCase();
  const phone = auth.user.phone?.trim() || '';
  const credential = {
    accountId: auth.user.id,
    email,
    phone,
    passwordHash,
    updatedAt: new Date().toISOString(),
    source: 'self-service-password-change',
  };

  const writes = [
    adminDb.collection('account_credentials').doc(auth.user.id).set(credential, { merge: true }),
    adminDb.collection('account_credentials').doc(credentialLookupId(email)).set(credential, { merge: true }),
  ];
  if (phone) writes.push(adminDb.collection('account_credentials').doc(credentialLookupId(phone)).set(credential, { merge: true }));

  await Promise.all(writes);

  return NextResponse.json({ ok: true });
}
