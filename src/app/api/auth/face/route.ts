import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin.server';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session.server';

// Cosine similarity threshold — نفس قيمة الـ client-side
const COSINE_THRESHOLD = 0.90;

type FaceRecordV2 = {
  userId?: string;
  embedding?: number[];
};

type AccountData = {
  id?: string;
  name?: string;
  email?: string;
  role?: 'doctor' | 'parent' | 'student' | 'specialist' | 'teacher';
  schoolBranch?: 'MASAR' | 'IKHLAS_JEDDAH';
  phone?: string;
  linkedStudentId?: string;
};

function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length || a.length === 0) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export async function POST(req: NextRequest) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { ok: false, error: 'Firebase Admin غير مفعل، لا يمكن تشغيل Face ID على السحابة.' },
      { status: 503 },
    );
  }

  const body = await req.json().catch(() => ({}));

  // embedding = مصفوفة أرقام مُطبَّعة من MediaPipe (478 landmark × 3 = 1434 رقم)
  const embedding: number[] = Array.isArray(body.embedding)
    ? body.embedding.map((v: unknown) => Number(v))
    : [];

  if (
    embedding.length === 0 ||
    embedding.some((v: number) => !Number.isFinite(v))
  ) {
    return NextResponse.json({ ok: false, error: 'بيانات الوجه غير صالحة.' }, { status: 400 });
  }

  // جلب كل سجلات الوجه من Firestore (faceRecordsV2)
  const snap = await adminDb.collection('faceRecordsV2').get();
  let best: { userId: string | null; similarity: number } = { userId: null, similarity: 0 };

  snap.docs.forEach((doc) => {
    const record = doc.data() as FaceRecordV2;
    const stored = Array.isArray(record.embedding) ? record.embedding : null;
    const userId = record.userId || doc.id;
    if (!stored || !userId) return;
    const sim = cosineSimilarity(stored, embedding);
    if (sim > best.similarity) best = { userId, similarity: sim };
  });

  if (!best.userId || best.similarity < COSINE_THRESHOLD) {
    return NextResponse.json(
      { ok: false, reason: 'no_match', error: 'لم يتم التعرف على الوجه.' },
      { status: 401 },
    );
  }

  // جلب بيانات الحساب
  const accountDoc = await adminDb.collection('accounts').doc(best.userId).get();
  if (!accountDoc.exists) {
    return NextResponse.json(
      { ok: false, reason: 'account_missing', error: 'تم التعرف على الوجه لكن الحساب غير موجود.' },
      { status: 404 },
    );
  }

  const data = accountDoc.data() as AccountData;
  const email = String(data.email || '').trim().toLowerCase();
  const role  = data.role;

  if (!email || !role) {
    return NextResponse.json(
      { ok: false, error: 'بيانات الحساب المرتبط بالوجه غير مكتملة.' },
      { status: 409 },
    );
  }

  const account = {
    id:           data.id || accountDoc.id,
    name:         data.name || 'مستخدم جديد',
    email,
    role,
    schoolBranch: data.schoolBranch,
    phone:        data.phone,
  };

  const token = await createSessionToken(account);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'تعذر إنشاء جلسة آمنة.' }, { status: 500 });
  }

  const now = new Date().toISOString();
  await accountDoc.ref.set(
    { lastLoginAt: now, lastActiveAt: now, lastLoginProvider: 'face' },
    { merge: true },
  );

  const linkedStudentId = data.linkedStudentId;
  if (linkedStudentId) {
    const studentUpdate =
      role === 'student'
        ? { studentLastLoginAt: now, studentLastActiveAt: now, lastLoginAt: now, lastActiveAt: now }
        : role === 'parent'
        ? { parentLastLoginAt: now, parentLastActiveAt: now }
        : { lastLoginAt: now, lastActiveAt: now };

    await Promise.all([
      adminDb.collection('students').doc(linkedStudentId).set(studentUpdate, { merge: true }).catch(() => {}),
      adminDb.collection('class_students').doc(linkedStudentId).update(studentUpdate).catch(() => {}),
    ]);
  }

  const response = NextResponse.json({ ok: true, account, similarity: best.similarity });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path:     '/',
  });
  return response;
}
