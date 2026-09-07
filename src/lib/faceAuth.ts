/**
 * FaceAuthService — Browser-side Face Recognition
 * - تقنية: MediaPipe Tasks Vision من Google (2024)
 * - 478 landmark ثلاثية الأبعاد لكل وجه (بدلاً من 128-dim في face-api.js)
 * - مقارنة بـ Cosine Similarity (أدق من Euclidean Distance)
 * - Liveness: كشف الرمشة عبر blendshapes مدمجة في MediaPipe
 * - التخزين: plain JSON في Firestore (لا XOR obfuscation)
 */

'use client';

import {
  deleteDocFromCloud,
  readCloudCache,
  syncDocToCloud,
  writeCloudCache,
} from './firestoreSync';

// ─── MediaPipe Config ─────────────────────────────────────────────────────────
const LOCAL_WASM_PATH = '/mediapipe/wasm';
const LOCAL_MODEL_PATH = '/mediapipe/face_landmarker.task';
const CDN_WASM_URL =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm';
const CDN_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// Collection جديدة — v2 حتى لا تتعارض مع records قديمة بصيغة face-api.js
const STORAGE_KEY = 'masar.face.v2';

// Cosine similarity threshold — 0.85 = 85% تشابه للقبول
const COSINE_THRESHOLD = 0.85;

// ─── Singleton FaceLandmarker ─────────────────────────────────────────────────
let faceLandmarker: any = null;
let loadPromise: Promise<void> | null = null;

// ─── Lazy Load MediaPipe FaceLandmarker ──────────────────────────────────────
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
        numFaces: 1,
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
        numFaces: 1,
      });
    }
  })().catch((err) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}

// ─── Face Record Interface ────────────────────────────────────────────────────
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

// ─── Geometric Normalization ──────────────────────────────────────────────────
function normalizeLandmarks(
  landmarks: { x: number; y: number; z: number }[],
): number[] {
  if (!landmarks || landmarks.length < 10) return [];

  const center = landmarks[1] ?? landmarks[0];
  const cx = center.x;
  const cy = center.y;
  const cz = center.z;

  const leftEye  = landmarks[263] ?? landmarks[0];
  const rightEye = landmarks[33]  ?? landmarks[0];
  const scale =
    Math.hypot(leftEye.x - rightEye.x, leftEye.y - rightEye.y) || 1;

  const result: number[] = [];
  for (const lm of landmarks) {
    result.push(
      (lm.x - cx) / scale,
      (lm.y - cy) / scale,
      (lm.z - cz) / scale,
    );
  }
  return result;
}

// ─── Cosine Similarity ────────────────────────────────────────────────────────
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

// ─── Public API ───────────────────────────────────────────────────────────────

export async function detectFace(video: HTMLVideoElement): Promise<{
  embedding: number[];
  landmarks: { x: number; y: number; z: number }[];
  blendshapes: { categoryName: string; score: number }[];
  box: { x: number; y: number; width: number; height: number } | null;
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

    const landmarks = result.faceLandmarks[0] as {
      x: number;
      y: number;
      z: number;
    }[];
    const embedding   = normalizeLandmarks(landmarks);
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

    return { embedding, landmarks, blendshapes, box };
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
  const similarity = cosineSimilarity(record.embedding, embedding);
  return { match: similarity >= COSINE_THRESHOLD, similarity };
}

export function findBestMatch(embedding: number[]): {
  userId: string | null;
  similarity: number;
} {
  const records = readStore();
  let best = { userId: null as string | null, similarity: 0 };
  for (const r of records) {
    const sim = cosineSimilarity(r.embedding, embedding);
    if (sim > best.similarity) best = { userId: r.userId, similarity: sim };
  }
  if (best.similarity < COSINE_THRESHOLD) {
    return { userId: null, similarity: best.similarity };
  }
  return best;
}

export function isFaceEnrolled(userId: string): boolean {
  if (!userId) return false;
  return readStore().some(r => r.userId === userId || r.accountId === userId || r.studentId === userId);
}

export function removeFaceEnrollment(userId: string): void {
  writeStore(readStore().filter(r => r.userId !== userId && r.accountId !== userId && r.studentId !== userId));
  deleteDocFromCloud('faceRecordsV2', userId);
}

export const unenrollFace = removeFaceEnrollment;

export function getEnrollmentDate(userId: string): string | null {
  return readStore().find(r => r.userId === userId)?.enrolledAt ?? null;
}
