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

// ── High-Precision Server-side Biometric Comparison ────────────────────────────
function compareBiometricFaces(
  stored: number[],
  query: number[],
): { isMatch: boolean; similarity: number; confidence: number; mae: number; cosine: number; sigDiff: number } {
  if (!stored || !query || stored.length === 0 || query.length === 0) {
    return { isMatch: false, similarity: 0, confidence: 0, mae: 1, cosine: 0, sigDiff: 1 };
  }

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

  // Calibrated biometric threshold:
  // Condition 1: High overall landmark alignment
  const cond1 = cosine >= 0.9978 && mae <= 0.024 && (sigLen === 0 || sigDiff <= 0.115);
  // Condition 2: Deep facial bone proportions match (ratio difference <= 8.5%, cosine >= 0.9970, mae <= 0.026)
  const cond2 = sigLen > 0 && sigDiff <= 0.085 && cosine >= 0.9970 && mae <= 0.026;

  const isMatch = cond1 || cond2;

  const landmarkScore = Math.max(0, Math.min(1, (0.026 - mae) / 0.026));
  const cosineScore   = Math.max(0, Math.min(1, (cosine - 0.9970) / 0.0030));
  const sigScore      = sigLen > 0 ? Math.max(0, Math.min(1, (0.12 - sigDiff) / 0.12)) : landmarkScore;

  const similarity = isMatch
    ? Math.min(0.99, Math.max(0.85, 0.40 * landmarkScore + 0.35 * cosineScore + 0.25 * sigScore))
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

  // ط¬ظ„ط¨ ط¨ظٹط§ظ†ط§طھ ط§ظ„ط­ط³ط§ط¨ ظ…ط¹ fallback ط°ظƒظٹ
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
      name:         data.name || best.record?.userName || 'ظ…ط³طھط®ط¯ظ… ط¬ط¯ظٹط¯',
      email:        String(data.email || best.record?.userEmail || `${best.userId}@masarplatform.org`).trim().toLowerCase(),
      role:         data.role || best.record?.userRole || 'student',
      schoolBranch: data.schoolBranch || best.record?.schoolBranch || 'MASAR',
      phone:        data.phone,
      linkedStudentId: data.linkedStudentId || best.record?.studentId,
    };
  } else if (best.record?.userName || best.record?.userRole) {
    account = {
      id:           best.userId,
      name:         best.record.userName || 'ط·ط§ظ„ط¨ ظ…ط³ط§ط±',
      email:        best.record.userEmail || `${best.userId}@masarplatform.org`,
      role:         best.record.userRole || 'student',
      schoolBranch: best.record.schoolBranch || 'MASAR',
      linkedStudentId: best.record.studentId || best.userId,
    };
  } else {
    return NextResponse.json(
      { ok: false, reason: 'account_missing', error: 'طھظ… ط§ظ„طھط¹ط±ظپ ط¹ظ„ظ‰ ط§ظ„ظˆط¬ظ‡ ظ„ظƒظ† طھط¹ط°ط± ط±ط¨ط·ظ‡ ط¨ط§ظ„ط­ط³ط§ط¨.' },
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