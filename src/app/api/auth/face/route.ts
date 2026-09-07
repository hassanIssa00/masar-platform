import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin.server';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session.server';

// Cosine similarity threshold — نفس قيمة الـ client-side
const COSINE_THRESHOLD = 0.90;

type FaceRecordV2 = {
  userId?: string;
  accountId?: string;
  studentId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: 'doctor' | 'parent' | 'student' | 'specialist' | 'teacher';
  schoolBranch?: 'MASAR' | 'IKHLAS_JEDDAH';
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
  let best: { userId: string | null; record: FaceRecordV2 | null; similarity: number } = {
    userId: null,
    record: null,
    similarity: 0,
  };

  snap.docs.forEach((doc) => {
    const record = doc.data() as FaceRecordV2;
    const stored = Array.isArray(record.embedding) ? record.embedding : null;
    const userId = record.userId || doc.id;
    if (!stored || !userId) return;
    const sim = cosineSimilarity(stored, embedding);
    if (sim > best.similarity) {
      best = { userId, record, similarity: sim };
    }
  });

  if (!best.userId || best.similarity < COSINE_THRESHOLD) {
    return NextResponse.json(
      { ok: false, reason: 'no_match', error: 'لم يتم التعرف على الوجه.' },
      { status: 401 },
    );
  }

  // جلب بيانات الحساب مع fallback ذكي
  let accountDoc = await adminDb.collection('accounts').doc(best.userId).get();

  if (!accountDoc.exists && best.record?.accountId) {
    accountDoc = await adminDb.collection('accounts').doc(best.record.accountId).get();
  }

  if (!accountDoc.exists) {
    const byLinked = await adminDb.collection('accounts').where('linkedStudentId', '==', best.userId).limit(1).get();
    if (!byLinked.empty) {
      accountDoc = byLinked.docs[0];
    }
  }

  if (!accountDoc.exists) {
    const studentDoc = await adminDb.collection('students').doc(best.userId).get();
    if (studentDoc.exists) {
      const sData = studentDoc.data() as any;
      const accId = sData?.studentAccountId || sData?.accountId;
      if (accId) {
        accountDoc = await adminDb.collection('accounts').doc(accId).get();
      }
    }
  }

  if (!accountDoc.exists) {
    const csDoc = await adminDb.collection('class_students').doc(best.userId).get();
    if (csDoc.exists) {
      const csData = csDoc.data() as any;
      const accId = csData?.studentAccountId || csData?.accountId;
      if (accId) {
        accountDoc = await adminDb.collection('accounts').doc(accId).get();
      }
    }
  }

  let account: any = null;

  if (accountDoc.exists) {
    const data = accountDoc.data() as AccountData;
    account = {
      id:           data.id || accountDoc.id,
      name:         data.name || best.record?.userName || 'مستخدم جديد',
      email:        String(data.email || best.record?.userEmail || `${best.userId}@masarplatform.org`).trim().toLowerCase(),
      role:         data.role || best.record?.userRole || 'student',
      schoolBranch: data.schoolBranch || best.record?.schoolBranch || 'MASAR',
      phone:        data.phone,
      linkedStudentId: data.linkedStudentId || best.record?.studentId,
    };
  } else if (best.record?.userName || best.record?.userRole) {
    account = {
      id:           best.userId,
      name:         best.record.userName || 'طالب مسار',
      email:        best.record.userEmail || `${best.userId}@masarplatform.org`,
      role:         best.record.userRole || 'student',
      schoolBranch: best.record.schoolBranch || 'MASAR',
      linkedStudentId: best.record.studentId || best.userId,
    };
  } else {
    return NextResponse.json(
      { ok: false, reason: 'account_missing', error: 'تم التعرف على الوجه لكن تعذر ربطه بالحساب.' },
      { status: 404 },
    );
  }

  const token = await createSessionToken(account);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'تعذر إنشاء جلسة آمنة.' }, { status: 500 });
  }

  const now = new Date().toISOString();
  if (accountDoc.exists && accountDoc.ref) {
    await accountDoc.ref.set(
      { lastLoginAt: now, lastActiveAt: now, lastLoginProvider: 'face' },
      { merge: true },
    );
  }

  const linkedStudentId = account.linkedStudentId;
  if (linkedStudentId) {
    const studentUpdate =
      account.role === 'student'
        ? { studentLastLoginAt: now, studentLastActiveAt: now, lastLoginAt: now, lastActiveAt: now }
        : account.role === 'parent'
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
