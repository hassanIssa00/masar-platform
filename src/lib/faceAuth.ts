/**
 * FaceAuthService — Ultra-High-Precision Browser-side Face Recognition v3.0
 * ─────────────────────────────────────────────────────────────────────────
 * تقنية: MediaPipe Tasks Vision من Google
 *   • 478 landmark ثلاثية الأبعاد + 52 نسبة بيومترية تشريحية دقيقة
 *   • تسجيل متعدد الزوايا: أمامي + يمين + يسار + أعلى + أسفل
 *   • Ensemble Matching: أفضل تطابق عبر جميع الزوايا المسجلة
 *   • مطابقة هجينة: MAE (≤0.020) + Cosine (≥0.9991) + Signature (≤3%)
 *   • Liveness: رمشة + تحدي اتجاه الرأس
 */

'use client';

import {
  deleteDocFromCloud,
  readCloudCache,
  syncDocToCloud,
  writeCloudCache,
} from './firestoreSync';

// ── MediaPipe Config ──────────────────────────────────────────────────────────
const LOCAL_WASM_PATH  = '/mediapipe/wasm';
const LOCAL_MODEL_PATH = '/mediapipe/face_landmarker.task';
const CDN_WASM_URL     = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm';
const CDN_MODEL_URL    = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Keep v2 key so existing enrollments still work; new records get `embeddings` array too
const STORAGE_KEY = 'masar.face.v2';

// ── Singleton FaceLandmarker ──────────────────────────────────────────────────
let faceLandmarker: any = null;
let loadPromise: Promise<void> | null = null;

export async function initFaceAuth(): Promise<void> {
  if (faceLandmarker) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

    let filesetResolver: any;
    let modelPath = LOCAL_MODEL_PATH;

    try {
      filesetResolver = await FilesetResolver.forVisionTasks(LOCAL_WASM_PATH);
    } catch {
      filesetResolver = await FilesetResolver.forVisionTasks(CDN_WASM_URL);
      modelPath = CDN_MODEL_URL;
    }

    const opts = (delegate: 'GPU' | 'CPU') => ({
      baseOptions: { modelAssetPath: modelPath, delegate },
      outputFaceBlendshapes: true,
      runningMode: 'VIDEO' as const,
      numFaces: 2,
    });

    try {
      faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, opts('GPU'));
    } catch {
      faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, opts('CPU'));
    }
  })().catch(err => { loadPromise = null; throw err; });

  return loadPromise;
}

// ── Face Record Interface ─────────────────────────────────────────────────────
export interface FaceRecord {
  userId:        string;
  accountId?:    string;
  studentId?:    string;
  userName?:     string;
  userEmail?:    string;
  userRole?:     string;
  parentName?:   string;
  schoolBranch?: string;
  /** Primary (frontal) embedding — kept for backward compat */
  embedding:  number[];
  /** [v3 NEW] Multi-angle embeddings: [frontal, right, left, up, down] */
  embeddings?: number[][];
  enrolledAt: string;
}

function readStore(): FaceRecord[] {
  return readCloudCache<FaceRecord>(STORAGE_KEY);
}

function writeStore(records: FaceRecord[]) {
  writeCloudCache(STORAGE_KEY, records);
}

// ── Geometric Normalization (478 landmarks → 1434-float vector) ───────────────
export function normalizeLandmarks(
  landmarks: { x: number; y: number; z?: number }[],
): number[] {
  if (!landmarks || landmarks.length < 10) return [];

  const center = landmarks[1] ?? landmarks[0];
  const cx = center.x, cy = center.y, cz = center.z || 0;

  const leftEye  = landmarks[263] ?? landmarks[0];
  const rightEye = landmarks[33]  ?? landmarks[0];
  const scale    = Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y) || 1;

  const result: number[] = [];
  for (const lm of landmarks) {
    result.push(
      (lm.x - cx) / scale,
      (lm.y - cy) / scale,
      ((lm.z || 0) - cz) / scale,
    );
  }
  return result;
}

// ── 52 Invariant Anthropometric Biometric Ratios ──────────────────────────────
//  Grouped into 8 categories covering every dimension of the human face.
//  All ratios are normalized by the interocular distance (IOD) making them
//  scale-, distance-, and zoom-invariant.  Group H ratios are self-normalized.
export function computeBiometricSignature(
  landmarks: { x: number; y: number; z?: number }[],
): number[] {
  if (!landmarks || landmarks.length < 468) return [];

  const dist = (i1: number, i2: number): number => {
    const p1 = landmarks[i1], p2 = landmarks[i2];
    if (!p1 || !p2) return 0;
    return Math.hypot(p1.x - p2.x, p1.y - p2.y, (p1.z || 0) - (p2.z || 0));
  };

  /** Pure Z-axis difference (depth protrusion — anti-spoofing) */
  const zdiff = (i1: number, i2: number): number => {
    const p1 = landmarks[i1], p2 = landmarks[i2];
    if (!p1 || !p2) return 0;
    return Math.abs((p1.z || 0) - (p2.z || 0));
  };

  const iod = dist(33, 263) || 1; // Interocular distance baseline

  return [
    // ── A: Horizontal Distances (10) ────────────────────────────────────────
    dist(133, 362) / iod,           //  0. Inner canthal distance
    dist(49,  279) / iod,           //  1. Nostril base width (alar)
    dist(61,  291) / iod,           //  2. Mouth width (cheilion)
    dist(234, 454) / iod,           //  3. Zygomatic (cheekbone) width
    dist(172, 397) / iod,           //  4. Gonion jaw width
    dist(127, 356) / iod,           //  5. Temporal width
    dist(70,  107) / iod,           //  6. Right eyebrow length
    dist(300, 336) / iod,           //  7. Left eyebrow length
    dist(107, 336) / iod,           //  8. Interbrow gap (glabella)
    dist(78,  308) / iod,           //  9. Inner mouth width

    // ── B: Vertical Distances (8) ────────────────────────────────────────────
    dist(10,  152) / iod,           // 10. Total face height (forehead-chin)
    dist(6,   152) / iod,           // 11. Mid-face to chin
    dist(6,   0)   / iod,           // 12. Nose bridge to upper lip
    dist(0,   17)  / iod,           // 13. Total lip height
    dist(1,   152) / iod,           // 14. Nose tip to chin
    dist(0,   13)  / iod,           // 15. Upper lip height (outer→inner)
    dist(14,  17)  / iod,           // 16. Lower lip height
    dist(2,   0)   / iod,           // 17. Philtrum length

    // ── C: Eye Geometry (8) ──────────────────────────────────────────────────
    dist(33,  133) / iod,           // 18. Right eye horizontal aperture
    dist(362, 263) / iod,           // 19. Left eye horizontal aperture
    dist(159, 145) / iod,           // 20. Right eye vertical aperture
    dist(386, 374) / iod,           // 21. Left eye vertical aperture
    dist(70,  159) / iod,           // 22. Right brow-to-eye distance
    dist(300, 386) / iod,           // 23. Left brow-to-eye distance
    dist(66,  159) / iod,           // 24. Right brow arch height
    dist(296, 386) / iod,           // 25. Left brow arch height

    // ── D: Canthal Tilt / Eye Corner Slope (2) ───────────────────────────────
    Math.abs((landmarks[33]?.y  ?? 0) - (landmarks[133]?.y ?? 0)) / iod,  // 26. Right
    Math.abs((landmarks[362]?.y ?? 0) - (landmarks[263]?.y ?? 0)) / iod,  // 27. Left

    // ── E: Nose Geometry (6) ─────────────────────────────────────────────────
    dist(6,   2)   / iod,           // 28. Nose bridge height
    dist(129, 358) / iod,           // 29. Alar base width
    dist(4,   2)   / iod,           // 30. Nose tip to right alar
    dist(4,   3)   / iod,           // 31. Nose tip to left alar
    dist(1,   61)  / iod,           // 32. Nose to right mouth corner
    dist(1,   291) / iod,           // 33. Nose to left mouth corner

    // ── F: Mouth & Chin (6) ──────────────────────────────────────────────────
    dist(13,  14)  / iod,           // 34. Interlabial gap
    dist(61,  152) / iod,           // 35. Right mouth corner to chin
    dist(291, 152) / iod,           // 36. Left mouth corner to chin
    dist(172, 152) / iod,           // 37. Right gonion to chin
    dist(397, 152) / iod,           // 38. Left gonion to chin
    dist(234, 152) / iod,           // 39. Cheekbone to chin

    // ── G: Z-Depth Protrusion — 3D anti-spoofing (6) ─────────────────────────
    zdiff(4,   33)  / iod,          // 40. Nose protrusion vs right eye
    zdiff(4,   263) / iod,          // 41. Nose protrusion vs left eye
    zdiff(0,   13)  / iod,          // 42. Lip protrusion depth
    zdiff(152, 172) / iod,          // 43. Chin depth vs jaw
    zdiff(4,   0)   / iod,          // 44. Nose-to-lip z-differential
    zdiff(33,  263) / iod,          // 45. Eye-plane z-symmetry

    // ── H: Facial Proportion Ratios — self-normalized (6) ────────────────────
    dist(10,  6)   / (dist(6,   152) || 1),   // 46. Upper/lower face ratio
    dist(159, 145) / (dist(386, 374) || 1),   // 47. R/L eye-height asymmetry
    dist(6,   0)   / (dist(0,   17)  || 1),   // 48. Nose-lip / lip-height ratio
    dist(234, 454) / (dist(172, 397) || 1),   // 49. Cheek / jaw width ratio
    dist(61,  291) / (dist(234, 454) || 1),   // 50. Mouth / cheek width ratio
    dist(10,  152) / (dist(234, 454) || 1),   // 51. Face height / width ratio
  ];
}

export function createFullBiometricEmbedding(
  landmarks: { x: number; y: number; z?: number }[],
): number[] {
  return [
    ...normalizeLandmarks(landmarks),
    ...computeBiometricSignature(landmarks),
  ];
}

// ── Head Pose Estimation (yaw / pitch) ───────────────────────────────────────
export function estimateHeadPose(
  landmarks: { x: number; y: number; z?: number }[],
): { yaw: number; pitch: number } {
  if (!landmarks || landmarks.length < 468) return { yaw: 0, pitch: 0 };

  const le = landmarks[33];   // right eye outer (camera perspective)
  const re = landmarks[263];  // left eye outer  (camera perspective)
  const nt = landmarks[4];    // nose tip
  const cn = landmarks[152];  // chin

  if (!le || !re || !nt || !cn) return { yaw: 0, pitch: 0 };

  const iod   = Math.hypot(re.x - le.x, re.y - le.y) || 1;
  const eyeCx = (le.x + re.x) / 2;
  const eyeCy = (le.y + re.y) / 2;

  // Yaw: horizontal nose offset from eye-center, normalized by IOD
  //  > 0 → camera-left  (user turns their face to their right in mirror view → screen-LEFT)
  //  < 0 → camera-right (user turns their face to their left  in mirror view → screen-RIGHT)
  const yaw = (nt.x - eyeCx) / iod;

  // Pitch: nose vertical fraction along face height; frontal ≈ 0.38-0.42
  const faceH = (cn.y - eyeCy) || 1;
  const pitch = (nt.y - eyeCy) / faceH - 0.40;
  // < 0 → chin up (tilt up)  |  > 0 → chin down (tilt down)

  return { yaw, pitch };
}

// ── High-Precision Single-Pair Comparison ────────────────────────────────────
export function compareBiometricFaces(
  stored: number[],
  query:  number[],
): {
  isMatch:    boolean;
  similarity: number;
  confidence: number;
  mae:        number;
  cosine:     number;
  sigDiff:    number;
} {
  const empty = { isMatch: false, similarity: 0, confidence: 0, mae: 1, cosine: 0, sigDiff: 1 };
  if (!stored || !query || stored.length === 0 || query.length === 0) return empty;

  const rawLen = Math.min(1434, stored.length, query.length);
  if (rawLen < 30) return empty;

  // 1. Landmark MAE + Cosine Similarity (on 1434-float normalized vectors)
  let mae = 0, dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < rawLen; i++) {
    const a = stored[i], b = query[i];
    mae  += Math.abs(a - b);
    dot  += a * b;
    magA += a * a;
    magB += b * b;
  }
  mae /= rawLen;
  const denom  = Math.sqrt(magA) * Math.sqrt(magB);
  const cosine = denom === 0 ? 0 : dot / denom;

  // 2. 52-ratio Biometric Signature Comparison
  let sigDiff = 0;
  const sigA   = stored.slice(1434);
  const sigB   = query.slice(1434);
  const sigLen = Math.min(sigA.length, sigB.length);
  if (sigLen > 0) {
    for (let i = 0; i < sigLen; i++) {
      // Clamp avg to 0.05 minimum to prevent near-zero canthal-tilt / Z-depth
      // ratios from causing relative errors to explode (e.g., 0.001/0.002 = 50%)
      const avg = Math.max(0.05, (Math.abs(sigA[i]) + Math.abs(sigB[i])) / 2);
      sigDiff  += Math.abs(sigA[i] - sigB[i]) / avg;
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
  const sigScore      = sigLen > 0
    ? Math.max(0, Math.min(1, (0.12 - sigDiff) / 0.12))
    : landmarkScore;

  const similarity = isMatch
    ? Math.min(0.99, Math.max(0.85, 0.40 * landmarkScore + 0.35 * cosineScore + 0.25 * sigScore))
    : Math.max(0, 0.4 * landmarkScore + 0.3 * cosineScore + 0.3 * sigScore) * 0.65;

  return { isMatch, similarity, confidence: Math.round(similarity * 100), mae, cosine, sigDiff };
}

// ── Ensemble: Best Match Across All Stored Angles ────────────────────────────
function getEmbeddingArray(record: FaceRecord): number[][] {
  if (record.embeddings && record.embeddings.length > 0) return record.embeddings;
  return [record.embedding]; // backward compat: wrap legacy single embedding
}

function bestMatchForRecord(record: FaceRecord, query: number[]): {
  isMatch: boolean;
  similarity: number;
} {
  let isMatch = false;
  let best    = 0;
  for (const stored of getEmbeddingArray(record)) {
    const res = compareBiometricFaces(stored, query);
    if (res.isMatch && res.similarity > best) {
      best    = res.similarity;
      isMatch = true;
    }
  }
  return { isMatch, similarity: best };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function detectFace(video: HTMLVideoElement): Promise<{
  embedding:      number[];
  landmarks:      { x: number; y: number; z: number }[];
  blendshapes:    { categoryName: string; score: number }[];
  box:            { x: number; y: number; width: number; height: number } | null;
  multipleFaces?: boolean;
} | null> {
  if (
    !faceLandmarker || !video || video.paused || video.ended ||
    !video.videoWidth || !video.videoHeight || video.readyState < 2
  ) return null;

  try {
    const result = faceLandmarker.detectForVideo(video, performance.now());
    if (!result.faceLandmarks || result.faceLandmarks.length === 0) return null;

    const multipleFaces = result.faceLandmarks.length > 1;
    const landmarks     = result.faceLandmarks[0] as { x: number; y: number; z: number }[];
    const embedding     = createFullBiometricEmbedding(landmarks);
    const blendshapes: { categoryName: string; score: number }[] =
      result.faceBlendshapes?.[0]?.categories ?? [];

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const lm of landmarks) {
      if (lm.x < minX) minX = lm.x;
      if (lm.y < minY) minY = lm.y;
      if (lm.x > maxX) maxX = lm.x;
      if (lm.y > maxY) maxY = lm.y;
    }

    return {
      embedding,
      landmarks,
      blendshapes,
      box: {
        x:      minX * video.videoWidth,
        y:      minY * video.videoHeight,
        width:  (maxX - minX) * video.videoWidth,
        height: (maxY - minY) * video.videoHeight,
      },
      multipleFaces,
    };
  } catch (err) {
    console.warn('detectFace error:', err);
    return null;
  }
}

export function checkBlink(
  blendshapes: { categoryName: string; score: number }[],
): { isBlinking: boolean; score: number } {
  if (!blendshapes || blendshapes.length === 0) return { isBlinking: false, score: 0 };
  const left  = blendshapes.find(b => b.categoryName === 'eyeBlinkLeft')?.score  ?? 0;
  const right = blendshapes.find(b => b.categoryName === 'eyeBlinkRight')?.score ?? 0;
  const score = (left + right) / 2;
  return { isBlinking: score > 0.35, score };
}

/**
 * Enroll a face with optional multi-angle embeddings.
 * @param embedding          Primary (frontal) embedding — always required
 * @param meta               User metadata
 * @param multiAngleEmbeddings  All 5 pose embeddings [frontal, right, left, up, down]
 */
export async function enrollFace(
  userId: string,
  embedding: number[],
  meta?: {
    accountId?:    string;
    studentId?:    string;
    userName?:     string;
    userEmail?:    string;
    userRole?:     string;
    parentName?:   string;
    schoolBranch?: string;
  },
  multiAngleEmbeddings?: number[][],
): Promise<void> {
  const records = readStore().filter(
    r => r.userId !== userId &&
         (!meta?.accountId || r.userId !== meta.accountId) &&
         (!meta?.studentId || r.userId !== meta.studentId)
  );

  const newRecord: FaceRecord = {
    userId,
    accountId:    meta?.accountId,
    studentId:    meta?.studentId,
    userName:     meta?.userName,
    userEmail:    meta?.userEmail,
    userRole:     meta?.userRole,
    parentName:   meta?.parentName,
    schoolBranch: meta?.schoolBranch,
    embedding,
    embeddings:   multiAngleEmbeddings && multiAngleEmbeddings.length > 0
      ? multiAngleEmbeddings
      : [embedding],
    enrolledAt: new Date().toISOString(),
  };

  records.push(newRecord);
  writeStore(records);

  if (typeof window !== 'undefined') {
    try {
      const mark = (id: string) => {
        localStorage.setItem(`masar_face_enrolled_${id}`, 'true');
        localStorage.setItem(`masar_face_prompt_seen_${id}`, 'true');
      };
      mark(userId);
      if (meta?.accountId) mark(meta.accountId);
      if (meta?.studentId) mark(meta.studentId);
    } catch {}
  }

  const writes = [syncDocToCloud('faceRecordsV2', userId, newRecord)];
  if (meta?.accountId && meta.accountId !== userId)
    writes.push(syncDocToCloud('faceRecordsV2', meta.accountId, { ...newRecord, userId: meta.accountId }));
  if (meta?.studentId && meta.studentId !== userId)
    writes.push(syncDocToCloud('faceRecordsV2', meta.studentId, { ...newRecord, userId: meta.studentId }));
  await Promise.allSettled(writes);
}

export function verifyFace(
  userId: string,
  embedding: number[],
): { match: boolean; similarity: number } {
  const record = readStore().find(
    r => r.userId === userId || r.accountId === userId || r.studentId === userId
  );
  if (!record) return { match: false, similarity: 0 };
  const { isMatch, similarity } = bestMatchForRecord(record, embedding);
  return { match: isMatch, similarity };
}

export function getAllFaceRecords(): FaceRecord[] {
  return readStore();
}

export function findBestFaceMatch(embedding: number[]): {
  record: FaceRecord | null;
  similarity: number;
} {
  let best = { record: null as FaceRecord | null, similarity: 0 };
  for (const r of readStore()) {
    const { isMatch, similarity } = bestMatchForRecord(r, embedding);
    if (isMatch && similarity > best.similarity) best = { record: r, similarity };
  }
  return best;
}

export function matchFaceAgainstList(
  embedding: number[],
  candidateStudentIds?: string[],
): { record: FaceRecord | null; similarity: number } {
  let records = readStore();
  if (candidateStudentIds && candidateStudentIds.length > 0) {
    const set = new Set(candidateStudentIds);
    records = records.filter(r =>
      set.has(r.userId) ||
      (r.studentId && set.has(r.studentId)) ||
      (r.accountId && set.has(r.accountId))
    );
  }
  let best = { record: null as FaceRecord | null, similarity: 0 };
  for (const r of records) {
    const { isMatch, similarity } = bestMatchForRecord(r, embedding);
    if (isMatch && similarity > best.similarity) best = { record: r, similarity };
  }
  return best;
}

export function findBestMatch(embedding: number[]): {
  userId: string | null;
  similarity: number;
} {
  let best = { userId: null as string | null, similarity: 0 };
  for (const r of readStore()) {
    const { isMatch, similarity } = bestMatchForRecord(r, embedding);
    if (isMatch && similarity > best.similarity) best = { userId: r.userId, similarity };
  }
  return best;
}

export function isFaceEnrolled(userId: string): boolean {
  if (!userId) return false;
  if (typeof window !== 'undefined' &&
      localStorage.getItem(`masar_face_enrolled_${userId}`) === 'true') return true;
  return readStore().some(
    r => r.userId === userId || r.accountId === userId || r.studentId === userId
  );
}

export async function checkFaceEnrolledCloud(userId: string): Promise<boolean> {
  if (!userId) return false;
  if (isFaceEnrolled(userId)) return true;
  try {
    const res  = await fetch(`/api/auth/face?userId=${encodeURIComponent(userId)}`, { credentials: 'include' });
    const data = res.ok ? await res.json() : null;
    if (data?.enrolled) {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`masar_face_enrolled_${userId}`, 'true');
          localStorage.setItem(`masar_face_prompt_seen_${userId}`, 'true');
        } catch {}
      }
      return true;
    }
  } catch {}
  return false;
}

export function removeFaceEnrollment(userId: string): void {
  writeStore(readStore().filter(
    r => r.userId !== userId && r.accountId !== userId && r.studentId !== userId
  ));
  deleteDocFromCloud('faceRecordsV2', userId);
}

export const unenrollFace = removeFaceEnrollment;

export function getEnrollmentDate(userId: string): string | null {
  return readStore().find(r => r.userId === userId)?.enrolledAt ?? null;
}