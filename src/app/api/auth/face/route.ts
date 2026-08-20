import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin.server';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session.server';

const SIMILARITY_THRESHOLD = 0.42;

type FaceRecord = {
  userId?: string;
  embeddingEnc?: string;
};

type AccountData = {
  id?: string;
  name?: string;
  email?: string;
  role?: 'doctor' | 'parent' | 'student' | 'specialist' | 'teacher';
  schoolBranch?: 'MASAR' | 'IKHLAS_JEDDAH';
  phone?: string;
};

function deobfuscate(encoded: string): number[] | null {
  try {
    const key = 'MASAR_FACE_SECURE_2026_XK9';
    const raw = Buffer.from(encoded, 'base64').toString('binary');
    let result = '';
    for (let i = 0; i < raw.length; i += 1) {
      result += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    const parsed = JSON.parse(result);
    return Array.isArray(parsed) ? parsed.map(Number) : null;
  } catch {
    return null;
  }
}

function distance(a: number[], b: number[]) {
  if (a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

export async function POST(req: NextRequest) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { ok: false, error: 'Firebase Admin غير مفعل، لذلك لا يمكن تشغيل Face ID على السحابة.' },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const descriptor: number[] = Array.isArray(body.descriptor)
    ? body.descriptor.map((value: unknown) => Number(value))
    : [];
  if (descriptor.length !== 128 || descriptor.some((value: number) => !Number.isFinite(value))) {
    return NextResponse.json({ ok: false, error: 'بصمة الوجه غير صالحة.' }, { status: 400 });
  }

  const snap = await adminDb.collection('faceRecords').get();
  let best: { userId: string | null; distance: number } = { userId: null, distance: Infinity };

  snap.docs.forEach((doc) => {
    const record = doc.data() as FaceRecord;
    const stored = record.embeddingEnc ? deobfuscate(record.embeddingEnc) : null;
    const userId = record.userId || doc.id;
    if (!stored || !userId) return;
    const d = distance(stored, descriptor);
    if (d < best.distance) best = { userId, distance: d };
  });

  if (!best.userId || best.distance > SIMILARITY_THRESHOLD) {
    return NextResponse.json({ ok: false, reason: 'no_match', error: 'لم يتم التعرف على الوجه.' }, { status: 401 });
  }

  const accountDoc = await adminDb.collection('accounts').doc(best.userId).get();
  if (!accountDoc.exists) {
    return NextResponse.json({ ok: false, reason: 'account_missing', error: 'تم التعرف على الوجه لكن الحساب غير موجود.' }, { status: 404 });
  }

  const data = accountDoc.data() as AccountData;
  const email = String(data.email || '').trim().toLowerCase();
  const role = data.role;

  if (!email || !role) {
    return NextResponse.json({ ok: false, error: 'بيانات الحساب المرتبط بالوجه غير مكتملة.' }, { status: 409 });
  }

  const account = {
    id: data.id || accountDoc.id,
    name: data.name || 'مستخدم جديد',
    email,
    role,
    schoolBranch: data.schoolBranch,
    phone: data.phone,
  };

  const token = await createSessionToken(account);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'تعذر إنشاء جلسة آمنة.' }, { status: 500 });
  }

  await accountDoc.ref.set(
    {
      lastLoginAt: new Date().toISOString(),
      lastLoginProvider: 'face',
    },
    { merge: true },
  );

  const response = NextResponse.json({ ok: true, account, distance: best.distance });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
