import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin.server';
import { createSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session.server';
import { authenticateRequest } from '@/lib/auth/authorization';

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

// ── De-rotate any 1434 vector into canonical horizontal orientation (Backward Compatible) ──
function derotateVector1434(vec: number[]): number[] {
  if (!vec || vec.length < 1434) return vec;

  // Landmark 33: right eye -> index 33*3 = 99
  // Landmark 263: left eye -> index 263*3 = 789
  const rEyeX = vec[99], rEyeY = vec[100];
  const lEyeX = vec[789], lEyeY = vec[790];

  const dx = lEyeX - rEyeX;
  const dy = lEyeY - rEyeY;
  const angle = Math.atan2(dy, dx);

  if (Math.abs(angle) < 0.001) return vec; // Already horizontally aligned

  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);

  const out = new Array(vec.length);
  for (let i = 0; i < 478; i++) {
    const idx = i * 3;
    const x = vec[idx];
    const y = vec[idx + 1];
    const z = vec[idx + 2];

    out[idx] = x * cos - y * sin;
    out[idx + 1] = x * sin + y * cos;
    out[idx + 2] = z;
  }
  for (let i = 1434; i < vec.length; i++) {
    out[i] = vec[i];
  }
  return out;
}

// ── High-Precision Server-side Biometric Comparison ────────────────────────────
function compareBiometricFaces(
  rawStored: number[],
  rawQuery: number[],
): { isMatch: boolean; similarity: number; confidence: number; mae: number; cosine: number; sigDiff: number } {
  if (!rawStored || !rawQuery || rawStored.length === 0 || rawQuery.length === 0) {
    return { isMatch: false, similarity: 0, confidence: 0, mae: 1, cosine: 0, sigDiff: 1 };
  }

  // De-rotate both to canonical eye horizontal baseline
  const stored = derotateVector1434(rawStored);
  const query = derotateVector1434(rawQuery);

  const rawLen = Math.min(1434, stored.length, query.length);
  if (rawLen < 30) {
    return { isMatch: false, similarity: 0, confidence: 0, mae: 1, cosine: 0, sigDiff: 1 };
  }

  // 1. Raw Landmark Mean Absolute Error & Cosine
  let mae = 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < rawLen; i++) {
    const a = stored[i];
    const b = query[i];
    mae += Math.abs(a - b);
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  mae /= rawLen;
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  const cosine = denom === 0 ? 0 : dot / denom;

  // 2. Biometric Signature Ratios (52 invariant ratios)
  let sigDiff = 0;
  const sigA = stored.slice(1434);
  const sigB = query.slice(1434);
  const sigLen = Math.min(sigA.length, sigB.length);
  if (sigLen > 0) {
    for (let i = 0; i < sigLen; i++) {
      const avg = Math.max(0.05, (Math.abs(sigA[i]) + Math.abs(sigB[i])) / 2);
      sigDiff += Math.abs(sigA[i] - sigB[i]) / avg;
    }
    sigDiff /= sigLen;
  }

  // 3. Rigid Craniofacial Bone Architecture (Immune to smiles, laughter, talking, expressions)
  // Nose bridge, eye sockets, supraorbital brow, and temples
  const RIGID_BONES = [
    168, 6, 197, 195, 5, 4, 1, 2, 98, 327,
    33, 133, 263, 362, 130, 243, 463, 359,
    10, 107, 336, 67, 297, 109, 338,
    234, 454, 127, 356
  ];
  let rigidMae = 0;
  for (const b of RIGID_BONES) {
    const idx = b * 3;
    rigidMae += Math.abs(stored[idx] - query[idx]) +
                Math.abs(stored[idx + 1] - query[idx + 1]) +
                Math.abs(stored[idx + 2] - query[idx + 2]);
  }
  rigidMae /= (RIGID_BONES.length * 3);

  // Calibrated biometric thresholds (robust to natural expressions: smiling, laughing, speaking, mobile tilt):
  // Condition 1: High overall landmark alignment after canonical rotation
  const cond1 = cosine >= 0.9935 && mae <= 0.032 && (sigLen === 0 || sigDiff <= 0.16);
  // Condition 2: Deep facial bone proportions match
  const cond2 = sigLen > 0 && sigDiff <= 0.090;
  // Condition 3: Rigid skull bone structure match (immune to smile, open mouth, talking)
  const cond3 = rigidMae <= 0.028 && cosine >= 0.9920;
  // Condition 4: Close raw landmark fit
  const cond4 = mae <= 0.022 && cosine >= 0.9930;
  // Condition 5: Invariant 3D Anthropometric Signature Match (Immune to phone angle and perspective)
  const cond5 = sigLen >= 10 && sigDiff <= 0.080;

  const isMatch = cond1 || cond2 || cond3 || cond4 || cond5;

  const landmarkScore = Math.max(0, Math.min(1, (0.028 - mae) / 0.028));
  const rigidScore    = Math.max(0, Math.min(1, (0.026 - rigidMae) / 0.026));
  const cosineScore   = Math.max(0, Math.min(1, (cosine - 0.9940) / 0.0060));
  const sigScore      = sigLen > 0 ? Math.max(0, Math.min(1, (0.14 - sigDiff) / 0.14)) : landmarkScore;

  const similarity = isMatch
    ? Math.min(0.99, Math.max(0.85, 0.35 * rigidScore + 0.30 * landmarkScore + 0.20 * cosineScore + 0.15 * sigScore))
    : Math.max(0, 0.4 * landmarkScore + 0.3 * cosineScore + 0.3 * sigScore) * 0.65;

  const confidence = Math.round(similarity * 100);

  return { isMatch, similarity, confidence, mae, cosine, sigDiff };
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
  let best: { userId: string | null; record: FaceRecordV2 | null; similarity: number; confidence: number } = {
    userId: null,
    record: null,
    similarity: 0,
    confidence: 0,
  };

  snap.docs.forEach((doc) => {
    const record = doc.data() as FaceRecordV2 & { embeddings?: number[][] };
    const userId = record.userId || doc.id;
    if (!userId) return;

    // Support both single embedding and multi-angle embeddings array
    const candidates: number[][] = [];
    if (Array.isArray(record.embeddings) && record.embeddings.length > 0) {
      candidates.push(...record.embeddings);
    }
    if (Array.isArray(record.embedding) && record.embedding.length > 0) {
      candidates.push(record.embedding);
    }

    for (const stored of candidates) {
      const res = compareBiometricFaces(stored, embedding);
      if (res.isMatch && res.similarity > best.similarity) {
        best = { userId, record, similarity: res.similarity, confidence: res.confidence };
      }
    }
  });

  console.log(`[FaceID] Scanned ${snap.size} records. Best match: ${best.userId} with confidence ${best.confidence}% (similarity: ${best.similarity.toFixed(4)})`);

  if (!best.userId) {
    return NextResponse.json(
      { ok: false, reason: 'no_match', error: 'ظ„ظ… ظٹطھظ… ط§ظ„طھط¹ط±ظپ ط¹ظ„ظ‰ ط§ظ„ظˆط¬ظ‡طŒ ظ…ظ„ط§ظ…ط­ ط§ظ„ظˆط¬ظ‡ ظ„ط§ طھطھط·ط§ط¨ظ‚ ظ…ط¹ ط§ظ„ط­ط³ط§ط¨ ط§ظ„ظ…ط³ط¬ظ„.' },
      { status: 401 },
    );
  }

  // جلب بيانات الحساب مع التمييز الدقيق بين الطالب وولي الأمر
  let account: any = null;
  const isStudentRecord = best.record?.userRole === 'student' || Boolean(best.record?.studentId);

  if (isStudentRecord) {
    const studentId = best.record?.studentId || best.userId;
    // التحقق من وجود حساب طالب مباشر
    const studentAccountDoc = await adminDb.collection('accounts').doc(studentId).get();
    if (studentAccountDoc.exists && studentAccountDoc.data()?.role === 'student') {
      const data = studentAccountDoc.data() as AccountData;
      account = {
        id:           data.id || studentAccountDoc.id,
        name:         data.name || best.record?.userName || 'طالب مسار',
        email:        String(data.email || best.record?.userEmail || `${studentId}@masarplatform.org`).trim().toLowerCase(),
        role:         'student',
        schoolBranch: data.schoolBranch || best.record?.schoolBranch || 'IKHLAS_JEDDAH',
        phone:        data.phone,
        linkedStudentId: studentId,
      };
    } else {
      // جلب بيانات الطالب من جدول students أو class_students
      const studentDoc = await adminDb.collection('students').doc(studentId).get();
      const sData = studentDoc.exists ? (studentDoc.data() as any) : null;
      account = {
        id:           studentId,
        name:         sData?.name || best.record?.userName || 'طالب مسار',
        email:        best.record?.userEmail || `${studentId}@masarplatform.org`,
        role:         'student',
        schoolBranch: best.record?.schoolBranch || sData?.schoolBranch || 'IKHLAS_JEDDAH',
        phone:        sData?.phone,
        linkedStudentId: studentId,
      };
    }
  } else {
    // حسابات الكادر أو أولياء الأمور
    let accountDoc = await adminDb.collection('accounts').doc(best.userId).get();
    if (!accountDoc.exists && best.record?.accountId) {
      accountDoc = await adminDb.collection('accounts').doc(best.record.accountId).get();
    }

    if (accountDoc.exists) {
      const data = accountDoc.data() as AccountData;
      account = {
        id:           data.id || accountDoc.id,
        name:         data.name || best.record?.userName || 'مستخدم مسار',
        email:        String(data.email || best.record?.userEmail || `${best.userId}@masarplatform.org`).trim().toLowerCase(),
        role:         data.role || best.record?.userRole || 'parent',
        schoolBranch: data.schoolBranch || best.record?.schoolBranch || 'MASAR',
        phone:        data.phone,
        linkedStudentId: data.linkedStudentId,
      };
    } else if (best.record?.userName || best.record?.userRole) {
      account = {
        id:           best.userId,
        name:         best.record.userName || 'ولي أمر',
        email:        best.record.userEmail || `${best.userId}@masarplatform.org`,
        role:         best.record.userRole || 'parent',
        schoolBranch: best.record.schoolBranch || 'MASAR',
      };
    }
  }

  if (!account) {
    return NextResponse.json(
      { ok: false, reason: 'account_missing', error: 'تم التعرف على الوجه لكن تعذر ربطه بالحساب.' },
      { status: 404 },
    );
  }

  const token = await createSessionToken(account);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'طھط¹ط°ط± ط¥ظ†ط´ط§ط، ط¬ظ„ط³ط© ط¢ظ…ظ†ط©.' }, { status: 500 });
  }

  const response = NextResponse.json({
    ok: true,
    account,
    confidence: best.confidence,
  });

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'userId ظ…ط·ظ„ظˆط¨' }, { status: 400 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: 'Firebase Admin ط؛ظٹط± ظ…طھط§ط­' }, { status: 503 });
  }

  try {
    const doc = await adminDb.collection('faceRecordsV2').doc(userId).get();
    if (doc.exists) {
      const data = doc.data();
      return NextResponse.json({
        ok: true,
        enrolled: true,
        enrolledAt: data?.enrolledAt,
        userName: data?.userName,
      });
    }

    const byAccount = await adminDb.collection('faceRecordsV2').where('accountId', '==', userId).limit(1).get();
    if (!byAccount.empty) {
      const data = byAccount.docs[0].data();
      return NextResponse.json({
        ok: true,
        enrolled: true,
        enrolledAt: data?.enrolledAt,
        userName: data?.userName,
      });
    }

    return NextResponse.json({ ok: true, enrolled: false });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'ط®ط·ط£ ظپظٹ ط¬ظ„ط¨ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظˆط¬ظ‡' }, { status: 500 });
  }
}