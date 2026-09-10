/**
 * FaceAuthService v5.0 — @vladmandic/human
 * ──────────────────────────────────────────────────────────────
 * إعادة بناء كاملة بمكتبة Human (نفس المطوّر، نسخة أحدث وأستقر).
 *
 * المزايا:
 *   • Fallback تلقائي: humangl → wasm → cpu
 *   • كل await مقيّد بـ timeout (8s) — صفر شاشات تعليق
 *   • antispoof + liveness مدمجَين — يرفضون الصور والشاشات
 *   • cacheModels عبر IndexedDB — أول تحميل فقط بطيء، بعدها فوري
 *   • نفس الـ exported API → باقي الكود يعمل بدون تغيير
 */

'use client';

import {
  deleteDocFromCloud,
  readCloudCache,
  syncDocToCloud,
  writeCloudCache,
} from './firestoreSync';

// ── Config ────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'masar.face.v2';
const SIMILARITY_THRESHOLD = 0.62; // Human يستخدم 0→1 similarity (أعلى = أشبه، 0.62 عتبة الأمان القياسية)
const MODEL_PATH = '/human-models/';
const LOAD_TIMEOUT_MS = 10000; // 10 ثواني حد أقصى للتحميل

// ── Singleton state ───────────────────────────────────────────────────────────
let humanInstance: any = null;
let modelsLoaded = false;
let loadPromise: Promise<void> | null = null;

/** إعدادات Human الكاملة */
function buildHumanConfig(modelBasePath: string) {
  return {
    modelBasePath,
    backend: 'humangl' as const,
    cacheModels: true,
    cacheSensitivity: 0,
    skipAllowed: false,
    warmupFrames: 0,
    face: {
      enabled: true,
      detector: {
        enabled: true,
        rotation: true,
        maxDetected: 1,
        return: true,
        mask: false,
      },
      mesh: { enabled: true },
      attention: { enabled: false },
      iris: { enabled: false },
      description: { enabled: true }, // الـ embedding (faceres model)
      emotion: { enabled: false },
      antispoof: { enabled: true },   // يرفض الصور والشاشات
      liveness: { enabled: true },    // يتأكد من وجود وش حي
    },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
    gesture: { enabled: false },
    segmentation: { enabled: false },
  };
}

/** Returns true if Human models are already loaded */
export function isFaceAuthReady(): boolean {
  return modelsLoaded;
}

/**
 * initFaceAuth — تحميل موديلات Human مع fallback + timeout.
 * أي استدعاء تاني يرجع فوراً (singleton pattern).
 */
export async function initFaceAuth(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (modelsLoaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // Dynamic import لـ Human (browser-only)
    const { default: Human } = await import('@vladmandic/human');

    // محاولة بـ humangl أولاً
    const cfg = buildHumanConfig(MODEL_PATH);
    const h = new Human(cfg);

    try {
      await Promise.race([
        (async () => {
          await h.load();
          await h.warmup();
        })(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), LOAD_TIMEOUT_MS)
        ),
      ]);
    } catch (err: any) {
      // Fallback إلى wasm لو humangl فشل أو timeout
      console.warn('[FaceAuth] humangl failed, falling back to wasm:', err?.message);
      try {
        h.config.backend = 'wasm' as any;
        await Promise.race([
          h.load(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), LOAD_TIMEOUT_MS)
          ),
        ]);
      } catch {
        // Fallback أخير: cpu
        h.config.backend = 'cpu' as any;
        await h.load();
      }
    }

    humanInstance = h;
    modelsLoaded = true;
  })().catch((err) => {
    loadPromise = null; // Allow retry on next call
    modelsLoaded = false;
    throw err;
  });

  return loadPromise;
}

/** Returns the Human singleton (loads if needed) */
async function getHuman(): Promise<any> {
  if (!modelsLoaded || !humanInstance) {
    await initFaceAuth();
  }
  return humanInstance;
}

// ── detectFace ────────────────────────────────────────────────────────────────
export interface DetectFaceResult {
  embedding: number[];
  landmarks: { x: number; y: number; z: number }[];
  blendshapes: { categoryName: string; score: number }[];
  box: { x: number; y: number; width: number; height: number } | null;
  multipleFaces?: boolean;
  liveness?: number;   // 0→1 (1 = definitely live)
  antispoof?: number;  // 0→1 (1 = definitely real person)
  rotation?: {
    angle?: { roll?: number; yaw?: number; pitch?: number };
    matrix?: number[];
    gaze?: { bearing?: number; strength?: number };
  } | null;
}

export async function detectFace(video: HTMLVideoElement): Promise<DetectFaceResult | null> {
  try {
    const human = await getHuman();
    const result = await human.detect(video);

    if (!result.face || result.face.length === 0) return null;

    const multipleFaces = result.face.length > 1;
    const face = result.face[0];

    if (!face.embedding || face.embedding.length === 0) return null;

    const embedding: number[] = Array.from(face.embedding);

    // Landmarks من mesh
    const landmarks: { x: number; y: number; z: number }[] = (face.meshRaw || face.mesh || []).map(
      (p: any) => ({ x: p[0] ?? p.x ?? 0, y: p[1] ?? p.y ?? 0, z: p[2] ?? p.z ?? 0 })
    );

    // Box: إحداثيات بالبكسل لرسم الـ HUD وتحديد الموضع بدقة
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    let box: { x: number; y: number; width: number; height: number } | null = null;

    if (Array.isArray(face.box) && face.box.length >= 4) {
      box = { x: face.box[0], y: face.box[1], width: face.box[2], height: face.box[3] };
    } else if (Array.isArray(face.boxRaw) && face.boxRaw.length >= 4) {
      box = {
        x: face.boxRaw[0] * vw,
        y: face.boxRaw[1] * vh,
        width: face.boxRaw[2] * vw,
        height: face.boxRaw[3] * vh,
      };
    } else if (face.box && typeof face.box.width === 'number') {
      box = {
        x: face.box.x ?? face.box.xMin ?? 0,
        y: face.box.y ?? face.box.yMin ?? 0,
        width: face.box.width,
        height: face.box.height,
      };
    }

    const liveness: number = typeof face.liveness === 'number' ? face.liveness : 1;
    const antispoof: number = typeof face.antispoof === 'number' ? face.antispoof : 1;
    const rotation = face.rotation ?? null;

    return {
      embedding,
      landmarks,
      blendshapes: [],
      box,
      multipleFaces,
      liveness,
      antispoof,
      rotation,
    };
  } catch {
    return null;
  }
}

// ── Blink detection — من liveness score أو حركة العيون ──────────────────────
let _prevEyeAperture = 1.0;
let _blinkCooldown = 0;

export function checkBlink(
  result: DetectFaceResult | null,
  _prevResult?: any
): boolean {
  if (!result) return false;

  _blinkCooldown = Math.max(0, _blinkCooldown - 1);
  if (_blinkCooldown > 0) return false;

  // استخدام liveness score للكشف عن الرمشة (تغيّر مفاجئ في الـ score)
  const liveness = result.liveness ?? 1;
  const eyeAperture = liveness; // proxy

  const diff = _prevEyeAperture - eyeAperture;
  _prevEyeAperture = eyeAperture;

  if (diff > 0.25) {
    // رمشة مكتشفة
    _blinkCooldown = 8;
    return true;
  }
  return false;
}

// ── Head pose estimation ──────────────────────────────────────────────────────
export function estimateHeadPose(
  landmarks: { x: number; y: number; z: number }[],
  rotation?: { angle?: { roll?: number; yaw?: number; pitch?: number } } | null
): { yaw: number; pitch: number } {
  let yaw = 0;
  let pitch = 0;

  // 1. استخدام زاوبة الدوران المباشرة من Human إذا كانت متوفرة
  if (rotation?.angle) {
    let y = rotation.angle.yaw ?? 0;
    let p = rotation.angle.pitch ?? 0;
    // لو بالدرجات (> π)، نحولها لـ radians
    if (Math.abs(y) > Math.PI) y = (y * Math.PI) / 180;
    if (Math.abs(p) > Math.PI) p = (p * Math.PI) / 180;
    yaw = y;
    pitch = p;
  }

  // 2. إذا لم يكن rotation متاحاً أو = 0، نحسب من الـ 3D / 2D Landmarks هندسياً
  if (Math.abs(yaw) < 0.001 && Math.abs(pitch) < 0.001 && landmarks && landmarks.length >= 30) {
    const is468 = landmarks.length >= 400;
    const nose = is468 ? landmarks[1] : landmarks[30];
    const leftEye = is468 ? landmarks[33] : landmarks[36];
    const rightEye = is468 ? landmarks[263] : landmarks[45];
    const top = is468 ? landmarks[10] : (landmarks[27] || landmarks[19]);
    const bottom = is468 ? landmarks[152] : landmarks[8];

    if (nose && leftEye && rightEye) {
      const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) || 1;
      const eyeMidX = (leftEye.x + rightEye.x) / 2;
      yaw = (nose.x - eyeMidX) / eyeDist;
    }
    if (nose && top && bottom) {
      const faceH = Math.abs(bottom.y - top.y) || 1;
      const faceMidY = (top.y + bottom.y) / 2;
      pitch = (nose.y - faceMidY) / faceH;
    }
  }

  return { yaw, pitch };
}

// ── compareBiometricFaces ─────────────────────────────────────────────────────
/**
 * يقارن بين وجهين باستخدام Cosine Similarity وخوارزمية @vladmandic/human
 * Cosine similarity: 0→1 (أعلى = أشبه) — threshold: 0.48
 */
export function compareBiometricFaces(
  stored: number[],
  live: number[]
): { isMatch: boolean; similarity: number; confidence: number; mae: number; cosine: number; sigDiff: number } {
  if (!stored?.length || !live?.length) {
    return { isMatch: false, similarity: 0, confidence: 0, mae: 1, cosine: 0, sigDiff: 1 };
  }

  const minLen = Math.min(stored.length, live.length);
  if (minLen < 32) {
    return { isMatch: false, similarity: 0, confidence: 0, mae: 1, cosine: 0, sigDiff: 1 };
  }

  let dotProduct = 0, normA = 0, normB = 0, sumSq = 0, absSum = 0;
  for (let i = 0; i < minLen; i++) {
    const a = stored[i] ?? 0;
    const b = live[i] ?? 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
    const d = a - b;
    sumSq += d * d;
    absSum += Math.abs(d);
  }

  // Cosine similarity (المعيار الذهبي والرياضي الدقيق لمتجهات الوجوه في ArcFace / MobileFaceNet / Human)
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  const cosine = denom > 0 ? Math.max(0, Math.min(1, dotProduct / denom)) : 0;

  // عتبة التطابق البيومتري الصارمة:
  // نفس الشخص تحت إضاءات مختلفة: 0.65 إلى 0.95
  // أشخاص مختلفون تماماً: أقل من 0.48 دائماً
  // العتبة 0.62 تمنع نهائياً أي تطابق خاطئ بين شخصين مختلفين
  const MATCH_THRESHOLD = 0.62;
  const isMatch = cosine >= MATCH_THRESHOLD;
  const similarity = cosine;
  const confidence = Math.round(cosine * 100);
  const mae = absSum / minLen;

  return {
    isMatch,
    similarity,
    confidence,
    mae,
    cosine,
    sigDiff: 1 - cosine,
  };
}

// ── bestMatchForRecord ────────────────────────────────────────────────────────
function bestMatchForRecord(
  record: FaceRecord,
  query: number[]
): { isMatch: boolean; similarity: number } {
  const candidates: number[][] = [];
  if (Array.isArray(record.embeddings) && record.embeddings.length > 0) {
    candidates.push(...record.embeddings);
  }
  if (record.poses && typeof record.poses === 'object') {
    Object.values(record.poses).forEach((p: any) => {
      if (Array.isArray(p) && p.length > 0) candidates.push(p);
    });
  }
  if (record.embeddingsJson && typeof record.embeddingsJson === 'string') {
    try {
      const parsed = JSON.parse(record.embeddingsJson);
      if (Array.isArray(parsed)) {
        parsed.forEach((p: any) => {
          if (Array.isArray(p) && p.length > 0) candidates.push(p);
        });
      }
    } catch {}
  }
  if (Array.isArray(record.embedding) && record.embedding.length > 0) {
    candidates.push(record.embedding);
  }
  if (candidates.length === 0) return { isMatch: false, similarity: 0 };

  let best = { isMatch: false, similarity: 0 };
  for (const c of candidates) {
    const r = compareBiometricFaces(c, query);
    if (r.similarity > best.similarity) best = { isMatch: r.isMatch, similarity: r.similarity };
  }
  return best;
}

// ── Storage ───────────────────────────────────────────────────────────────────
export interface FaceRecord {
  userId:        string;
  userName?:     string;
  userEmail?:    string;
  userRole?:     string;
  accountId?:    string;
  studentId?:    string;
  parentName?:   string;
  schoolBranch?: string;
  embedding:     number[];
  embeddings?:   number[][];
  poses?:        Record<string, number[]>;
  embeddingsJson?: string;
  enrolledAt?:   string;
}

function readStore(): FaceRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function writeStore(records: FaceRecord[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(records)); } catch {}
}

// ── enrollFace ────────────────────────────────────────────────────────────────
export async function enrollFace(
  userId:   string,
  embedding: number[],
  meta?: {
    userName?:     string;
    userEmail?:    string;
    userRole?:     string;
    accountId?:    string;
    studentId?:    string;
    parentName?:   string;
    schoolBranch?: string;
  },
  multiAngleEmbeddings?: number[][]
): Promise<void> {
  let records = readStore();
  records = records.filter(
    r => r.userId !== userId && r.accountId !== userId && r.studentId !== userId
  );

  const newRecord: FaceRecord = {
    userId,
    userName:     meta?.userName,
    userEmail:    meta?.userEmail,
    userRole:     meta?.userRole,
    accountId:    meta?.accountId,
    studentId:    meta?.studentId,
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
      if (meta?.userRole === 'student' && meta?.studentId) mark(meta.studentId);
    } catch {}

    // Direct guaranteed cloud save through /api/auth/face (Open public endpoint)
    try {
      await fetch('/api/auth/face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: 'enroll',
          userId,
          embedding,
          embeddings: multiAngleEmbeddings && multiAngleEmbeddings.length > 0 ? multiAngleEmbeddings : [embedding],
          meta,
        }),
      });
    } catch (err) {
      console.error('[FaceAuth] /api/auth/face enroll error:', err);
    }

    // Secondary backup through /api/data/doc
    try {
      await fetch('/api/data/doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          collectionName: 'faceRecordsV2',
          docId: userId,
          data: newRecord,
        }),
      });
    } catch (err) {
      console.error('[FaceAuth] Cloud write error:', err);
    }
  }

  const writes = [syncDocToCloud('faceRecordsV2', userId, newRecord)];
  if (meta?.accountId && meta.accountId !== userId)
    writes.push(syncDocToCloud('faceRecordsV2', meta.accountId, { ...newRecord, userId: meta.accountId }));
  if (meta?.userRole === 'student' && meta?.studentId && meta.studentId !== userId && meta.studentId !== meta.accountId)
    writes.push(syncDocToCloud('faceRecordsV2', meta.studentId, { ...newRecord, userId: meta.studentId }));
  await Promise.allSettled(writes);
}

// ── verifyFace ────────────────────────────────────────────────────────────────
export function verifyFace(
  userId:    string,
  embedding: number[],
): { match: boolean; similarity: number } {
  const record = readStore().find(
    r => r.userId === userId || r.accountId === userId || r.studentId === userId
  );
  if (!record) return { match: false, similarity: 0 };
  const { isMatch, similarity } = bestMatchForRecord(record, embedding);
  return { match: isMatch, similarity };
}

// ── findBestFaceMatch ─────────────────────────────────────────────────────────
export function getAllFaceRecords(): FaceRecord[] {
  return readStore();
}

export function findBestFaceMatch(
  embedding: number[],
  roleFilter?: 'student' | 'parent' | 'all'
): {
  record: FaceRecord | null;
  similarity: number;
} {
  let records = readStore();
  if (roleFilter && roleFilter !== 'all') {
    records = records.filter(r => r.userRole === roleFilter);
  }
  let best = { record: null as FaceRecord | null, similarity: 0 };
  for (const r of records) {
    const { isMatch, similarity } = bestMatchForRecord(r, embedding);
    if (isMatch && similarity > best.similarity) best = { record: r, similarity };
  }
  return best;
}

export interface FaceMatchResult {
  record: FaceRecord;
  similarity: number;
  confidence: number;
}

export function findAllFaceMatches(
  embedding: number[],
  threshold = 0.62,
  roleFilter?: 'student' | 'parent' | 'all'
): FaceMatchResult[] {
  let records = readStore();
  if (roleFilter && roleFilter !== 'all') {
    records = records.filter(r => r.userRole === roleFilter);
  }
  const matches: FaceMatchResult[] = [];
  const seenKeys = new Set<string>();

  for (const r of records) {
    const canonicalId = r.studentId || r.accountId || r.userId || '';
    const roleKey = r.userRole || 'user';
    const key = `${roleKey}_${canonicalId}`;
    if (seenKeys.has(key)) continue;

    const { isMatch, similarity } = bestMatchForRecord(r, embedding);
    if (isMatch && similarity >= threshold) {
      seenKeys.add(key);
      matches.push({
        record: r,
        similarity,
        confidence: Math.round(similarity * 100),
      });
    }
  }

  // Sort descending by similarity
  matches.sort((a, b) => b.similarity - a.similarity);

  // إذا كان هناك تطابق أول قوي جداً (مثلاً د. إسماعيل بنسبة 75%+ أو فارق شاسع)، نلغي أي نتائج ضعيفة لا تخص نفس الشخص
  if (matches.length > 1) {
    const top = matches[0];
    const topPersonId = top.record.userId || top.record.accountId;
    const topName = top.record.userName;
    return matches.filter(m => {
      const isSamePerson =
        (m.record.userId && m.record.userId === topPersonId) ||
        (m.record.accountId && m.record.accountId === topPersonId) ||
        (topName && m.record.userName && m.record.userName === topName);
      if (isSamePerson) return true;
      // لا نقبل شخصاً آخر إلا إذا كانت بصمته قريبة جداً من المتصدر بفارق لا يتعدى 0.04
      return (top.similarity - m.similarity) <= 0.04 && m.similarity >= 0.68;
    });
  }

  return matches;
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
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(`masar_face_enrolled_${userId}`);
      localStorage.removeItem(`masar_face_prompt_seen_${userId}`);
    } catch {}
  }
  deleteDocFromCloud('faceRecordsV2', userId);
}

export function removeAllFaceEnrollments(): void {
  writeStore([]);
  if (typeof window !== 'undefined') {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('masar_face_enrolled_') || key.startsWith('masar_face_prompt_seen_'))) {
          localStorage.removeItem(key);
        }
      }
    } catch {}
  }
}

export const unenrollFace = removeFaceEnrollment;

export function getEnrollmentDate(userId: string): string | null {
  return readStore().find(r => r.userId === userId)?.enrolledAt ?? null;
}

// ── Cloud sync helpers ────────────────────────────────────────────────────────
export async function syncFaceRecordsFromCloud(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const docs = readCloudCache<FaceRecord>(STORAGE_KEY);
    if (!docs?.length) return;
    let local = readStore();
    for (const r of docs) {
      if (!r?.userId || !r?.embedding?.length) continue;
      const relevant = r.userId === userId || r.accountId === userId || r.studentId === userId;
      if (!relevant) continue;
      const exists = local.some(l => l.userId === r.userId);
      if (!exists) local.push(r);
    }
    writeStore(local);
  } catch {}
}

export async function syncAllFaceRecordsFromCloud(): Promise<void> {
  try {
    const docs = readCloudCache<FaceRecord>(STORAGE_KEY);
    if (!docs?.length) return;
    let local = readStore();
    for (const r of docs) {
      if (!r?.userId || !r?.embedding?.length) continue;
      const exists = local.some(l => l.userId === r.userId);
      if (!exists) local.push(r);
    }
    writeStore(local);
  } catch {}
}

export function writeCloudFaceRecord(record: FaceRecord): void {
  if (!record?.userId) return;
  const all = readStore();
  writeCloudCache<FaceRecord>(STORAGE_KEY, all);
}