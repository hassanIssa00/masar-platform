import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireRole } from '@/lib/auth/authorization';
import { getAdminDb } from '@/lib/firebaseAdmin.server';

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
  await adminDb.collection('account_credentials').doc(auth.user.id).set(
    {
      accountId: auth.user.id,
      email: auth.user.email.trim().toLowerCase(),
      phone: auth.user.phone || '',
      passwordHash,
      updatedAt: new Date().toISOString(),
      source: 'self-service-password-change',
    },
    { merge: true },
  );

  return NextResponse.json({ ok: true });
}
