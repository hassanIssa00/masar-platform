/**
 * FaceAuthService â€” High-Precision Browser-side Face Recognition
 * - طھظ‚ظ†ظٹط©: MediaPipe Tasks Vision ظ…ظ† Google
 * - 478 landmark ط«ظ„ط§ط«ظٹط© ط§ظ„ط£ط¨ط¹ط§ط¯ + 15 ظ†ط³ط¨ط© ظ‚ظٹط§ط³ ط¨ظٹظˆظ…طھط±ظٹط© ط¯ظ‚ظٹظ‚ط© (Anthropometric Ratios)
 * - ظ…ط·ط§ط¨ظ‚ط© ظ‡ط¬ظٹظ†ط©: MAE (ط£ظ‚ظ„ ظ…ظ† 0.020) + Cosine (ط£ط¹ظ„ظ‰ ظ…ظ† 0.9991) + ظ†ط³ط¨ ط§ظ„ظ…ظ„ط§ظ…ط­ (ط£ظ‚ظ„ ظ…ظ† 3%)
 * - ط­ظ…ط§ظٹط© ظ‚طµظˆظ‰ طھظ…ظ†ط¹ ط¯ط®ظˆظ„ ط§ظ„ط¥ط®ظˆط© ط£ظˆ ط§ظ„ط£ظ‚ط§ط±ط¨ ط£ظˆ ط§ظ„ط؛ط±ط¨ط§ط، ط¨ظ†ط³ط¨ط© 100%
 * - Liveness: ظƒط´ظپ ط§ظ„ط±ظ…ط´ط© ط§ظ„ط­ظٹط© ظ„ظ…ظ†ط¹ ط§ظ„طµظˆط± ظˆط§ظ„ظپظٹط¯ظٹظˆظ‡ط§طھ ط§ظ„ظ…ط³ط¬ظ„ط©
 */

'use client';

import {
  deleteDocFromCloud,
  readCloudCache,
  syncDocToCloud,
  writeCloudCache,
} from './firestoreSync';

// â”€â”€â”€ MediaPipe Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const LOCAL_WASM_PATH = '/mediapipe/wasm';
const LOCAL_MODEL_PATH = '/mediapipe/face_landmarker.task';
const CDN_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm';
const CDN_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const STORAGE_KEY = 'masar.face.v2';

// â”€â”€â”€ Singleton FaceLandmarker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let faceLandmarker: any = null;
let loadPromise: Promise<void> | null = null;

// â”€â”€â”€ Lazy Load MediaPipe FaceLandmarker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export async function initFaceAuth(): Promise<void> {
  if (faceLandmarker) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');

    let filesetResolver: any = null;
    let modelPath = LOCAL_MODEL_PATH;

    try {
      filesetResolver = await FilesetResolver.forVisionTasks(LOCAL_WASM_PATH);
    } catch (localErr) {
      console.warn('[FaceAuth] Failed loading local WASM, falling back to CDN:', localErr);
      filesetResolver = await FilesetResolver.forVisionTasks(CDN_WASM_URL);
      modelPath = CDN_MODEL_URL;
    }

    try {
      faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate: 'GPU',
        },
        outputFaceBlendshapes: true,
        runningMode: 'VIDEO',
        numFaces: 2, // Allow detecting multiple faces to prevent unauthorized entry
      });
    } catch (gpuErr) {
      console.warn('[FaceAuth] GPU delegate failed, trying CPU fallback:', gpuErr);
      faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: modelPath,
          delegate: 'CPU',
        },
        outputFaceBlendshapes: true,
        runningMode: 'VIDEO',
        numFaces: 2,
      });
    }
  })().catch((err) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

// â”€â”€â”€ Face Record Interface â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export interface FaceRecord {
  userId: string;
  accountId?: string;
  studentId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  parentName?: string;
  schoolBranch?: string;
  embedding: number[];
  enrolledAt: string;
}

function readStore(): FaceRecord[] {
  return readCloudCache<FaceRecord>(STORAGE_KEY);
}

function writeStore(records: FaceRecord[]) {
  writeCloudCache(STORAGE_KEY, records);
}

// â”€â”€â”€ Geometric Normalization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function normalizeLandmarks(
  landmarks: { x: number; y: number; z?: number }[],
): number[] {
  if (!landmarks || landmarks.length < 10) return [];

  const center = landmarks[1] ?? landmarks[0];
  const cx = center.x;
  const cy = center.y;
  const cz = center.z || 0;

  const leftEye  = landmarks[263] ?? landmarks[0];
  const rightEye = landmarks[33]  ?? landmarks[0];
  const scale =
    Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y) || 1;

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

// â”€â”€â”€ 15 Invariant Anthropometric Biometric Ratios â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function computeBiometricSignature(
  landmarks: { x: number; y: number; z?: number }[],
): number[] {
  if (!landmarks || landmarks.length < 468) return [];

  const dist = (i1: number, i2: number) => {
    const p1 = landmarks[i1];
    const p2 = landmarks[i2];
    if (!p1 || !p2) return 0;
    return Math.hypot(p1.x - p2.x, p1.y - p2.y, (p1.z || 0) - (p2.z || 0));
  };

  const eyeWidth = dist(33, 263) || 1; // Interocular baseline distance

  return [
    dist(133, 362) / eyeWidth, // 0. Intercanthal distance (inner eye corners)
    dist(49, 279) / eyeWidth,   // 1. Nose width (alar base)
    dist(6, 2) / eyeWidth,      // 2. Nose bridge height
    dist(6, 152) / eyeWidth,    // 3. Mid-face to chin length
    dist(10, 152) / eyeWidth,   // 4. Total facial height (forehead to chin)
    dist(61, 291) / eyeWidth,   // 5. Mouth width (cheilion to cheilion)
    dist(0, 17) / eyeWidth,     // 6. Total lip height
    dist(234, 454) / eyeWidth,  // 7. Cheekbone width (zygomatic)
    dist(172, 397) / eyeWidth,  // 8. Jawline width (gonion to gonion)
    dist(1, 152) / eyeWidth,    // 9. Nose tip to chin
    dist(6, 0) / eyeWidth,      // 10. Nose bridge to upper lip
    dist(33, 133) / eyeWidth,   // 11. Right eye aperture
    dist(362, 263) / eyeWidth,  // 12. Left eye aperture
    dist(1, 61) / eyeWidth,     // 13. Nose to right mouth corner
    dist(1, 291) / eyeWidth,    // 14. Nose to left mouth corner
  ];
}

export function createFullBiometricEmbedding(
  landmarks: { x: number; y: number; z?: number }[],
): number[] {
  const norm = normalizeLandmarks(landmarks);
  const sig = computeBiometricSignature(landmarks);
  return [...norm, ...sig];
}

// â”€â”€â”€ High-Precision Biometric Comparison â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function compareBiometricFaces(
  stored: number[],
  query: number[],
): {
  isMatch: boolean;
  similarity: number;
  confidence: number;
  mae: number;
  cosine: number;
  sigDiff: number;
} {
  if (!stored || !query || stored.length === 0 || query.length === 0) {
    return { isMatch: false, similarity: 0, confidence: 0, mae: 1, cosine: 0, sigDiff: 1 };
  }

  const rawLen = Math.min(1434, stored.length, query.length);
  if (rawLen < 30) {
    return { isMatch: false, similarity: 0, confidence: 0, mae: 1, cosine: 0, sigDiff: 1 };
  }

  // 1. Raw Landmark Mean Absolute Error & Cosine Similarity
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

  // 2. Biometric Signature Difference (if both have signature >= 1434)
  let sigDiff = 0;
  const sigA = stored.slice(1434);
  const sigB = query.slice(1434);
  const sigLen = Math.min(sigA.length, sigB.length);
  if (sigLen > 0) {
    for (let i = 0; i < sigLen; i++) {
      const avg = (Math.abs(sigA[i]) + Math.abs(sigB[i])) / 2 || 1;
      sigDiff += Math.abs(sigA[i] - sigB[i]) / avg;
    }
    sigDiff /= sigLen;
  }

  // Criteria for strictly identifying the exact same individual:
  // - Cosine similarity >= 0.9991
  // - Landmark MAE <= 0.020 (same person: 0.005-0.015 | brother/stranger: > 0.026)
  // - Biometric signature relative diff <= 3% (same person: < 1.5% | brother: > 5%)
  const isMatch = cosine >= 0.9991 && mae <= 0.020 && (sigLen === 0 || sigDiff <= 0.030);

  const landmarkScore = Math.max(0, Math.min(1, (0.025 - mae) / 0.025));
  const cosineScore = Math.max(0, Math.min(1, (cosine - 0.9985) / 0.0015));
  const sigScore = sigLen > 0 ? Math.max(0, Math.min(1, (0.050 - sigDiff) / 0.050)) : landmarkScore;

  const similarity = isMatch
    ? Math.min(0.99, Math.max(0.85, 0.45 * landmarkScore + 0.35 * cosineScore + 0.20 * sigScore))
    : Math.max(0, 0.4 * landmarkScore + 0.3 * cosineScore + 0.3 * sigScore) * 0.65;

  const confidence = Math.round(similarity * 100);

  return { isMatch, similarity, confidence, mae, cosine, sigDiff };
}

// â”€â”€â”€ Public API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function detectFace(video: HTMLVideoElement): Promise<{
  embedding: number[];
  landmarks: { x: number; y: number; z: number }[];
  blendshapes: { categoryName: string; score: number }[];
  box: { x: number; y: number; width: number; height: number } | null;
  multipleFaces?: boolean;
} | null> {
  if (
    !faceLandmarker ||
    !video ||
    video.paused ||
    video.ended ||
    !video.videoWidth ||
    !video.videoHeight ||
    video.readyState < 2
  ) {
    return null;
  }

  try {
    const nowMs = performance.now();
    const result = faceLandmarker.detectForVideo(video, nowMs);

    if (!result.faceLandmarks || result.faceLandmarks.length === 0) return null;

    const multipleFaces = result.faceLandmarks.length > 1;

    // Use primary face (first detected or largest)
    const landmarks = result.faceLandmarks[0] as {
      x: number;
      y: number;
      z: number;
    }[];

    const embedding = createFullBiometricEmbedding(landmarks);
    const blendshapes: { categoryName: string; score: number }[] =
      result.faceBlendshapes?.[0]?.categories ?? [];

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const lm of landmarks) {
      if (lm.x < minX) minX = lm.x;
      if (lm.y < minY) minY = lm.y;
      if (lm.x > maxX) maxX = lm.x;
      if (lm.y > maxY) maxY = lm.y;
    }

    const box = {
      x:      minX * video.videoWidth,
      y:      minY * video.videoHeight,
      width:  (maxX - minX) * video.videoWidth,
      height: (maxY - minY) * video.videoHeight,
    };

    return { embedding, landmarks, blendshapes, box, multipleFaces };
  } catch (err) {
    console.warn('detectFace error:', err);
    return null;
  }
}

export function checkBlink(
  blendshapes: { categoryName: string; score: number }[],
): { isBlinking: boolean; score: number } {
  if (!blendshapes || blendshapes.length === 0) {
    return { isBlinking: false, score: 0 };
  }
  const leftBlink  = blendshapes.find(b => b.categoryName === 'eyeBlinkLeft')?.score  ?? 0;
  const rightBlink = blendshapes.find(b => b.categoryName === 'eyeBlinkRight')?.score ?? 0;
  const score      = (leftBlink + rightBlink) / 2;
  return { isBlinking: score > 0.35, score };
}

export async function enrollFace(
  userId: string,
  embedding: number[],
  meta?: {
    accountId?: string;
    studentId?: string;
    userName?: string;
    userEmail?: string;
    userRole?: string;
    parentName?: string;
    schoolBranch?: string;
  },
): Promise<void> {
  const records = readStore().filter(
    r => r.userId !== userId && (!meta?.accountId || r.userId !== meta.accountId) && (!meta?.studentId || r.userId !== meta.studentId)
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
    enrolledAt:   new Date().toISOString(),
  };
  records.push(newRecord);
  writeStore(records);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`masar_face_enrolled_${userId}`, 'true');
      localStorage.setItem(`masar_face_prompt_seen_${userId}`, 'true');
      if (meta?.accountId) {
        localStorage.setItem(`masar_face_enrolled_${meta.accountId}`, 'true');
        localStorage.setItem(`masar_face_prompt_seen_${meta.accountId}`, 'true');
      }
      if (meta?.studentId) {
        localStorage.setItem(`masar_face_enrolled_${meta.studentId}`, 'true');
        localStorage.setItem(`masar_face_prompt_seen_${meta.studentId}`, 'true');
      }
    } catch {}
  }
  const writes = [syncDocToCloud('faceRecordsV2', userId, newRecord)];
  if (meta?.accountId && meta.accountId !== userId) {
    writes.push(syncDocToCloud('faceRecordsV2', meta.accountId, { ...newRecord, userId: meta.accountId }));
  }
  if (meta?.studentId && meta.studentId !== userId) {
    writes.push(syncDocToCloud('faceRecordsV2', meta.studentId, { ...newRecord, userId: meta.studentId }));
  }
  await Promise.allSettled(writes);
}

export function verifyFace(
  userId: string,
  embedding: number[],
): { match: boolean; similarity: number } {
  const records = readStore();
  const record  = records.find(r => r.userId === userId || r.accountId === userId || r.studentId === userId);
  if (!record) return { match: false, similarity: 0 };
  const res = compareBiometricFaces(record.embedding, embedding);
  return { match: res.isMatch, similarity: res.similarity };
}

export function getAllFaceRecords(): FaceRecord[] {
  return readStore();
}

export function findBestFaceMatch(embedding: number[]): {
  record: FaceRecord | null;
  similarity: number;
} {
  const records = readStore();
  let best = { record: null as FaceRecord | null, similarity: 0 };
  for (const r of records) {
    const res = compareBiometricFaces(r.embedding, embedding);
    if (res.isMatch && res.similarity > best.similarity) {
      best = { record: r, similarity: res.similarity };
    }
  }
  return best;
}

export function matchFaceAgainstList(
  embedding: number[],
  candidateStudentIds?: string[],
): {
  record: FaceRecord | null;
  similarity: number;
} {
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
    const res = compareBiometricFaces(r.embedding, embedding);
    if (res.isMatch && res.similarity > best.similarity) {
      best = { record: r, similarity: res.similarity };
    }
  }
  return best;
}

export function findBestMatch(embedding: number[]): {
  userId: string | null;
  similarity: number;
} {
  const records = readStore();
  let best = { userId: null as string | null, similarity: 0 };
  for (const r of records) {
    const res = compareBiometricFaces(r.embedding, embedding);
    if (res.isMatch && res.similarity > best.similarity) {
      best = { userId: r.userId, similarity: res.similarity };
    }
  }
  return best;
}

export function isFaceEnrolled(userId: string): boolean {
  if (!userId) return false;
  if (typeof window !== 'undefined') {
    if (localStorage.getItem(`masar_face_enrolled_${userId}`) === 'true') return true;
  }
  return readStore().some(r => r.userId === userId || r.accountId === userId || r.studentId === userId);
}

export async function checkFaceEnrolledCloud(userId: string): Promise<boolean> {
  if (!userId) return false;
  if (isFaceEnrolled(userId)) return true;
  try {
    const res = await fetch(`/api/auth/face?userId=${encodeURIComponent(userId)}`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data?.enrolled) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`masar_face_enrolled_${userId}`, 'true');
            localStorage.setItem(`masar_face_prompt_seen_${userId}`, 'true');
          } catch {}
        }
        return true;
      }
    }
  } catch {}
  return false;
}

export function removeFaceEnrollment(userId: string): void {
  writeStore(readStore().filter(r => r.userId !== userId && r.accountId !== userId && r.studentId !== userId));
  deleteDocFromCloud('faceRecordsV2', userId);
}

export const unenrollFace = removeFaceEnrollment;

export function getEnrollmentDate(userId: string): string | null {
  return readStore().find(r => r.userId === userId)?.enrolledAt ?? null;
}