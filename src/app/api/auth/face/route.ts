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
): { isMatch: boolean; similarity: number; confidence: number; mae: number; cosine: number; sigDiff: number; rigidSigDiff?: number } {
  if (!rawStored || !rawQuery || rawStored.length === 0 || rawQuery.length === 0) {
    return { isMatch: false, similarity: 0, confidence: 0, mae: 1, cosine: 0, sigDiff: 1, rigidSigDiff: 1 };
  }

  // ── Modern embedding comparison (128-D or 512-D from @vladmandic/human or face-api) ──
  if (rawStored.length >= 64 && rawQuery.length >= 64 && Math.abs(rawStored.length - rawQuery.length) < 100) {
    const len = Math.min(rawStored.length, rawQuery.length);
    let sumSq = 0;
    for (let i = 0; i < len; i++) {
      const d = (rawStored[i] ?? 0) - (rawQuery[i] ?? 0);
      sumSq += d * d;
    }
    const euclidean = Math.sqrt(sumSq);
    // Convert to similarity: 1 = identical, 0 = totally different
    const similarity = Math.max(0, Math.min(1, 1 - euclidean / 2));
    // Server threshold: 0.40 (same as client)
    const isMatch = similarity >= 0.40;
    const confidence = Math.round(similarity * 100);
    return { isMatch, similarity, confidence, mae: euclidean, cosine: 0, sigDiff: 1 - similarity };
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

  // 4. Rigid Skull Anthropometric Invariant (Indices 0, 1, 3, 4, 5, 8, 10, 11, 14, 18, 19, 28, 29, 49, 51)
  // Immutable under smile, laugh, talking, and low-angle camera perspective
  const RIGID_INDICES = [0, 1, 3, 4, 5, 8, 10, 11, 14, 18, 19, 28, 29, 49, 51];
  let rigidSigDiff = 0;
  if (sigLen > 0) {
    let rSum = 0, rCount = 0;
    for (const idx of RIGID_INDICES) {
      if (idx < sigLen) {
        const avg = Math.max(0.05, (Math.abs(sigA[idx]) + Math.abs(sigB[idx])) / 2);
        rSum += Math.abs(sigA[idx] - sigB[idx]) / avg;
        rCount++;
      }
    }
    rigidSigDiff = rCount > 0 ? rSum / rCount : 1;
  }

  // Calibrated biometric thresholds (robust to natural expressions: smiling, laughing, speaking, mobile tilt):
  // Condition 1: High overall landmark alignment after canonical rotation
  const cond1 = cosine >= 0.9930 && mae <= 0.035 && (sigLen === 0 || sigDiff <= 0.16);
  // Condition 2: Deep facial bone proportions match
  const cond2 = sigLen > 0 && sigDiff <= 0.090;
  // Condition 3: Rigid skull bone structure match (immune to smile, open mouth, talking)
  const cond3 = rigidMae <= 0.032 && cosine >= 0.9900;
  // Condition 4: Close raw landmark fit
  const cond4 = mae <= 0.024 && cosine >= 0.9920;
  // Condition 5: Invariant 3D Anthropometric Signature Match
  const cond5 = sigLen >= 10 && sigDiff <= 0.080;
  // Condition 6: Rigid Craniofacial Invariant (Immune to phone angle, perspective tilt, smiling, laughing, talking)
  const cond6 = sigLen >= 15 && rigidSigDiff <= 0.048;

  const isMatch = cond1 || cond2 || cond3 || cond4 || cond5 || cond6;

  const landmarkScore = Math.max(0, Math.min(1, (0.035 - mae) / 0.035));
  const rigidScore    = Math.max(0, Math.min(1, (0.032 - rigidMae) / 0.032));
  const cosineScore   = Math.max(0, Math.min(1, (cosine - 0.9920) / 0.0080));
  const effectiveSigDiff = (rigidSigDiff > 0 && rigidSigDiff < sigDiff) ? rigidSigDiff : sigDiff;
  const sigScore      = sigLen > 0 ? Math.max(0, Math.min(1, (0.14 - effectiveSigDiff) / 0.14)) : landmarkScore;

  const similarity = isMatch
    ? Math.min(0.99, Math.max(0.88, 0.35 * rigidScore + 0.30 * landmarkScore + 0.20 * cosineScore + 0.15 * sigScore))
    : Math.max(0, 0.4 * landmarkScore + 0.3 * cosineScore + 0.3 * sigScore) * 0.65;

  const confidence = Math.round(similarity * 100);

  return { isMatch, similarity, confidence, mae, cosine, sigDiff, rigidSigDiff };
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

  // ── ENROLL ACTION: Direct Cloud Biometric Registration ────────────────────
  if (body.action === 'enroll') {
    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const emb = Array.isArray(body.embedding) ? body.embedding.map(Number) : [];
    const multiEmbs = Array.isArray(body.embeddings) ? body.embeddings : (emb.length > 0 ? [emb] : []);
    const meta = body.meta && typeof body.meta === 'object' ? body.meta : {};

    if (!userId || emb.length === 0) {
      return NextResponse.json({ ok: false, error: 'بيانات التسجيل البيومتري غير صالحة.' }, { status: 400 });
    }

    const newRecord = {
      userId,
      accountId:    meta.accountId || userId,
      studentId:    meta.studentId || userId,
      userName:     meta.userName || 'مستخدم',
      userRole:     meta.userRole || 'parent',
      userEmail:    meta.userEmail || `${userId}@masarplatform.org`,
      parentName:   meta.parentName || null,
      schoolBranch: meta.schoolBranch || 'MASAR',
      embedding:    emb,
      embeddings:   multiEmbs,
      enrolledAt:   new Date().toISOString(),
      updatedAt:    new Date().toISOString(),
    };

    const writes = [adminDb.collection('faceRecordsV2').doc(userId).set(newRecord, { merge: true })];
    if (meta.accountId && meta.accountId !== userId) {
      writes.push(adminDb.collection('faceRecordsV2').doc(meta.accountId).set({ ...newRecord, userId: meta.accountId }, { merge: true }));
    }
    if (meta.studentId && meta.studentId !== userId) {
      writes.push(adminDb.collection('faceRecordsV2').doc(meta.studentId).set({ ...newRecord, userId: meta.studentId }, { merge: true }));
    }
    await Promise.all(writes);

    console.log(`[FaceID] Cloud enrolled successfully for ${userId} (${meta.userName}) with ${multiEmbs.length} template(s)`);
    return NextResponse.json({ ok: true, message: 'تم حفظ بصمة الوجه سحابياً بنجاح.' });
  }

  const embedding: number[] = Array.isArray(body.embedding)
    ? body.embedding.map((v: unknown) => Number(v))
    : [];

  if (
    embedding.length === 0 ||
    embedding.some((v: number) => !Number.isFinite(v))
  ) {
    return NextResponse.json({ ok: false, error: 'بيانات الوجه غير صالحة.' }, { status: 400 });
  }

  const verifiedUserId = typeof body.verifiedUserId === 'string' && body.verifiedUserId.trim() ? body.verifiedUserId.trim() : null;

  let best: { userId: string | null; record: FaceRecordV2 | null; similarity: number; confidence: number } = {
    userId: null,
    record: null,
    similarity: 0,
    confidence: 0,
  };

  // Fast-path: Check verifiedUserId directly if client already matched locally
  if (verifiedUserId) {
    const directDoc = await adminDb.collection('faceRecordsV2').doc(verifiedUserId).get();
    if (directDoc.exists) {
      const record = directDoc.data() as FaceRecordV2 & { embeddings?: number[][] };
      const candidates: number[][] = [];
      if (Array.isArray(record.embeddings) && record.embeddings.length > 0) candidates.push(...record.embeddings);
      if (Array.isArray(record.embedding) && record.embedding.length > 0) candidates.push(record.embedding);
      for (const stored of candidates) {
        const res = compareBiometricFaces(stored, embedding);
        if (res.isMatch && res.similarity > best.similarity) {
          best = { userId: verifiedUserId, record, similarity: res.similarity, confidence: res.confidence };
        }
      }
    }
  }

  // If fast-path didn't match or wasn't provided, scan all records
  if (!best.userId) {
    const snap = await adminDb.collection('faceRecordsV2').get();
    snap.docs.forEach((doc) => {
      const record = doc.data() as FaceRecordV2 & { embeddings?: number[][] };
      const userId = record.userId || doc.id;
      if (!userId) return;

      const candidates: number[][] = [];
      if (Array.isArray(record.embeddings) && record.embeddings.length > 0) candidates.push(...record.embeddings);
      if (Array.isArray(record.embedding) && record.embedding.length > 0) candidates.push(record.embedding);

      for (const stored of candidates) {
        const res = compareBiometricFaces(stored, embedding);
        if (res.isMatch && res.similarity > best.similarity) {
          best = { userId, record, similarity: res.similarity, confidence: res.confidence };
        }
      }
    });
  }

  console.log(`[FaceID] Match evaluation: ${best.userId} with confidence ${best.confidence}% (similarity: ${best.similarity.toFixed(4)})`);

  if (!best.userId) {
    return NextResponse.json(
      { ok: false, reason: 'no_match', error: 'لم يتم التعرف على الوجه، ملامح الوجه لا تتطابق مع الحساب المسجل.' },
      { status: 401 },
    );
  }

  // جلب بيانات الحساب مع التمييز الدقيق بين الطالب وولي الأمر والفرع (مسار vs إخلاص جدة)
  let account: any = null;
  const isStudentRecord = best.record?.userRole === 'student' || Boolean(best.record?.studentId);

  if (isStudentRecord) {
    const studentId = best.record?.studentId || best.userId;
    // فحص الحساب المباشر
    const studentAccountDoc = await adminDb.collection('accounts').doc(studentId).get();
    const accData = studentAccountDoc.exists ? (studentAccountDoc.data() as AccountData) : null;

    // فحص class_students لمعرفة هل هو طالب فصل د. إسماعيل بجدة
    const classStudentDoc = await adminDb.collection('class_students').doc(studentId).get();
    const studentDoc = !classStudentDoc.exists ? await adminDb.collection('students').doc(studentId).get() : null;
    const sData = studentDoc?.exists ? (studentDoc.data() as any) : null;
    const csData = classStudentDoc.exists ? (classStudentDoc.data() as any) : null;

    const isIkhlas = classStudentDoc.exists ||
      best.record?.schoolBranch === 'IKHLAS_JEDDAH' ||
      accData?.schoolBranch === 'IKHLAS_JEDDAH' ||
      sData?.schoolBranch === 'IKHLAS_JEDDAH';

    const branch = isIkhlas ? 'IKHLAS_JEDDAH' : 'MASAR';
    const studentName = csData?.fullName || csData?.name || sData?.fullName || sData?.name || accData?.name || best.record?.userName || (isIkhlas ? 'طالب فصل د. إسماعيل' : 'طالب مسار');

    account = {
      id:           studentId,
      name:         studentName,
      email:        String(accData?.email || best.record?.userEmail || `${studentId}@masarplatform.org`).trim().toLowerCase(),
      role:         'student',
      schoolBranch: branch,
      phone:        accData?.phone || sData?.parentPhone || csData?.parentPhone,
      linkedStudentId: studentId,
    };
  } else {
    // حسابات الكادر أو أولياء الأمور
    let accountDoc = await adminDb.collection('accounts').doc(best.userId).get();
    if (!accountDoc.exists && best.record?.accountId) {
      accountDoc = await adminDb.collection('accounts').doc(best.record.accountId).get();
    }
    const accData = accountDoc.exists ? (accountDoc.data() as AccountData) : null;
    const linkedStudentId = accData?.linkedStudentId || best.record?.studentId;

    let isIkhlasParent = false;
    if (best.record?.schoolBranch === 'IKHLAS_JEDDAH' || accData?.schoolBranch === 'IKHLAS_JEDDAH') {
      isIkhlasParent = true;
    } else if (linkedStudentId) {
      const csDoc = await adminDb.collection('class_students').doc(linkedStudentId).get();
      if (csDoc.exists) isIkhlasParent = true;
    }

    const branch = isIkhlasParent ? 'IKHLAS_JEDDAH' : 'MASAR';
    const role = accData?.role || best.record?.userRole || 'parent';

    account = {
      id:           best.userId,
      name:         accData?.name || best.record?.userName || (role === 'parent' ? 'ولي أمر' : 'مستخدم مسار'),
      email:        String(accData?.email || best.record?.userEmail || `${best.userId}@masarplatform.org`).trim().toLowerCase(),
      role:         role,
      schoolBranch: branch,
      phone:        accData?.phone,
      linkedStudentId: linkedStudentId,
    };
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
  const getTemplates = searchParams.get('templates') === '1' || searchParams.get('all') === '1';

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: 'Firebase Admin غير متاح' }, { status: 503 });
  }

  // Pre-warm endpoint for browser-side instant Face ID cache
  if (getTemplates) {
    try {
      const snap = await adminDb.collection('faceRecordsV2').get();
      const templates = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          userId: data.userId || doc.id,
          accountId: data.accountId,
          studentId: data.studentId,
          userName: data.userName,
          userEmail: data.userEmail,
          userRole: data.userRole,
          schoolBranch: data.schoolBranch,
          parentName: data.parentName,
          embedding: data.embedding,
          embeddings: data.embeddings,
        };
      });
      return NextResponse.json(
        { ok: true, templates },
        {
          headers: {
            'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=300',
          },
        },
      );
    } catch (err: any) {
      return NextResponse.json({ ok: false, error: err?.message || 'خطأ في جلب بيانات قوالب الوجه' }, { status: 500 });
    }
  }

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'userId مطلوب' }, { status: 400 });
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
    return NextResponse.json({ ok: false, error: err?.message || 'خطأ في جلب بيانات الوجه' }, { status: 500 });
  }
}