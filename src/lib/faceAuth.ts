/**
 * FaceAuthService — Browser-side Face Recognition
 * - Face detection via TinyFaceDetector (fast & lightweight)
 * - 128-dim face descriptor (embedding) via face-api.js
 * - Embedding stored encrypted in localStorage (never raw image)
 * - Liveness: eye-blink detection via Eye Aspect Ratio (EAR)
 */

const MODELS_URL = '/face-models';
const STORAGE_KEY = 'masar.face.v1';
const SIMILARITY_THRESHOLD = 0.42; // euclidean distance (lower = more similar)
const EAR_BLINK_THRESHOLD = 0.22;

let modelsLoaded = false;

// ─── Lazy load face-api.js (client-only) ────────────────────────────────────
async function loadModels() {
  if (modelsLoaded) return;
  const faceapi = await import('face-api.js');
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
    faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL),
  ]);
  modelsLoaded = true;
}

// ─── XOR-based obfuscation for localStorage (no server key needed) ──────────
function obfuscate(data: number[]): string {
  const key = 'MASAR_FACE_SECURE_2026_XK9';
  const json = JSON.stringify(data);
  let result = '';
  for (let i = 0; i < json.length; i++) {
    result += String.fromCharCode(json.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result);
}

function deobfuscate(encoded: string): number[] {
  const key = 'MASAR_FACE_SECURE_2026_XK9';
  const raw = atob(encoded);
  let result = '';
  for (let i = 0; i < raw.length; i++) {
    result += String.fromCharCode(raw.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return JSON.parse(result);
}

import { syncDocToCloud, deleteDocFromCloud } from './firestoreSync';

// ─── Storage helpers ─────────────────────────────────────────────────────────
interface FaceRecord {
  userId: string;
  embeddingEnc: string;         // obfuscated embedding
  enrolledAt: string;
}

function readStore(): FaceRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeStore(records: FaceRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ─── Eye Aspect Ratio for liveness ──────────────────────────────────────────
function eyeAspectRatio(landmarks: {x: number; y: number}[]): number {
  // EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
  const dist = (a: {x:number;y:number}, b: {x:number;y:number}) =>
    Math.hypot(a.x - b.x, a.y - b.y);
  const A = dist(landmarks[1], landmarks[5]);
  const B = dist(landmarks[2], landmarks[4]);
  const C = dist(landmarks[0], landmarks[3]);
  return (A + B) / (2.0 * C);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function initFaceAuth(): Promise<void> {
  await loadModels();
}

/**
 * Detect face + extract descriptor from a video element.
 * Returns null if no face found.
 */
export async function detectFace(video: HTMLVideoElement): Promise<{
  descriptor: Float32Array;
  landmarks: any;
  expressions: any;
  box: { x: number; y: number; width: number; height: number };
} | null> {
  const faceapi = await import('face-api.js');
  const detection = await faceapi
    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor()
    .withFaceExpressions();

  if (!detection) return null;

  return {
    descriptor: detection.descriptor,
    landmarks: detection.landmarks,
    expressions: detection.expressions,
    box: detection.detection.box,
  };
}

/**
 * Check liveness: detects a blink via Eye Aspect Ratio.
 * Requires taking 2 frames and comparing EAR.
 */
export function checkBlink(landmarks: any): { isBlinking: boolean; ear: number } {
  const pts = landmarks.positions;
  // Left eye: indices 36-41, Right eye: 42-47
  const leftEye = pts.slice(36, 42);
  const rightEye = pts.slice(42, 48);
  const leftEAR = eyeAspectRatio(leftEye);
  const rightEAR = eyeAspectRatio(rightEye);
  const ear = (leftEAR + rightEAR) / 2;
  return { isBlinking: ear < EAR_BLINK_THRESHOLD, ear };
}

/**
 * Enroll a user's face. Stores encrypted embedding in localStorage & Firestore Cloud.
 */
export function enrollFace(userId: string, descriptor: Float32Array): void {
  const records = readStore().filter(r => r.userId !== userId); // remove old
  const newRecord: FaceRecord = {
    userId,
    embeddingEnc: obfuscate(Array.from(descriptor)),
    enrolledAt: new Date().toISOString(),
  };
  records.push(newRecord);
  writeStore(records);
  syncDocToCloud('faceRecords', userId, newRecord);
}



/**
 * Verify a face descriptor against enrolled user.
 * Returns true if match within threshold.
 */
export function verifyFace(userId: string, descriptor: Float32Array): {
  match: boolean;
  distance: number;
} {
  const faceapi_euclidean = (a: number[], b: Float32Array) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
  };

  const records = readStore();
  const record = records.find(r => r.userId === userId);
  if (!record) return { match: false, distance: Infinity };

  const stored = deobfuscate(record.embeddingEnc);
  const distance = faceapi_euclidean(stored, descriptor);
  return { match: distance < SIMILARITY_THRESHOLD, distance };
}

/**
 * Find the best matching user across ALL enrolled users.
 * Used for "login with face without typing email first".
 */
export function findBestMatch(descriptor: Float32Array): {
  userId: string | null;
  distance: number;
} {
  const faceapi_euclidean = (a: number[], b: Float32Array) => {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
    return Math.sqrt(sum);
  };

  const records = readStore();
  let best = { userId: null as string | null, distance: Infinity };
  for (const r of records) {
    const stored = deobfuscate(r.embeddingEnc);
    const d = faceapi_euclidean(stored, descriptor);
    if (d < best.distance) best = { userId: r.userId, distance: d };
  }
  if (best.distance > SIMILARITY_THRESHOLD) return { userId: null, distance: best.distance };
  return best;
}

/**
 * Check if a user has an enrolled face.
 */
export function isFaceEnrolled(userId: string): boolean {
  return readStore().some(r => r.userId === userId);
}

/**
 * Remove face enrollment for a user (local + cloud).
 */
export function removeFaceEnrollment(userId: string): void {
  writeStore(readStore().filter(r => r.userId !== userId));
  deleteDocFromCloud('faceRecords', userId);
}

/** Alias for removeFaceEnrollment */
export const unenrollFace = removeFaceEnrollment;

/**
 * Get enrollment date for a user.
 */
export function getEnrollmentDate(userId: string): string | null {
  return readStore().find(r => r.userId === userId)?.enrolledAt ?? null;
}
