import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/authorization';
import { getAdminDb } from '@/lib/firebaseAdmin.server';

const COLLECTIONS = [
  ['accounts', 'accounts'],
  ['students', 'students'],
  ['reports', 'reports'],
  ['surveys', 'surveys'],
  ['activity', 'activities'],
  ['messages', 'messages'],
  ['ikhlasLogs', 'ikhlasLogs'],
  ['ikhlasPosts', 'ikhlasPosts'],
  ['calendarSessions', 'calendar_sessions'],
  ['faceRecords', 'faceRecords'],
  ['notifications', 'notifications'],
  ['attendance', 'attendance'],
  ['assessmentTemplates', 'assessment_templates'],
  ['assessmentResults', 'assessment_results'],
  ['iepRecords', 'iep_records'],
  ['consents', 'consents'],
  ['resources', 'resources'],
  ['sessionRecords', 'session_records'],
  ['classStudents', 'class_students'],
  ['studentNotes', 'student_notes'],
  ['studentHomeworkLogs', 'student_homework_logs'],
  ['studentCertLogs', 'student_cert_logs'],
  ['curriculumFiles', 'curriculum_files'],
  ['curriculumQuizzes', 'curriculum_quizzes'],
  ['quizSubmissions', 'quiz_submissions'],
  ['classroomQuizzes', 'classroom_quizzes'],
  ['smartSchedules', 'smart_schedules'],
  ['scheduleParseLogs', 'schedule_parse_logs'],
  ['parentsCommunityChat', 'parents_community_chat'],
  ['parentsChatSettings', 'parents_chat_settings'],
  ['teacherAiThreads', 'teacher_ai_chats'],
  ['aiThreads', 'ai_threads'],
  ['branches', 'branches'],
  ['homework', 'homework'],
  ['invoices', 'invoices'],
  ['waitlist', 'waitlist'],
  ['points', 'student_points'],
  ['pointTransactions', 'point_transactions'],
  ['scheduleNotificationLogs', 'schedule_notification_logs'],
  ['liveSessions', 'live_sessions'],
  ['periodAttendance', 'period_attendance'],
  ['platformAnalytics', 'platform_analytics'],
  ['simpleSpellingAssignments', 'simple_spelling_assignments'],
  ['simpleSpellingDrawings', 'simple_spelling_drawings'],
] as const;

const MAX_DOCS_PER_COLLECTION = 800;
const SNAPSHOT_CACHE_TTL_MS = 5 * 1000; // 5 seconds fresh cache
const STALE_SNAPSHOT_TTL_MS = 30 * 1000;
const PARTIAL_RETRY_AFTER_MS = 1000;
const EXHAUSTED_RETRY_AFTER_MS = 5000;

function isStaff(role: string) {
  return role === 'doctor' || role === 'specialist' || role === 'teacher';
}

function normalizeArabic(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/^(أ\.|د\.|أستاذ|استاذ|دكتور|دكتوره|الدكتور|الدكتورة|السيد|السيدة|الشيخ|والد الطالب|والد|والدة|أم|ام|أبو|ابو|ولي أمر|ولي امر)\s+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanDigits(phone?: string | null): string {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

type SnapshotItem = Record<string, unknown>;
type FailedCollection = { key: string; reason: string };
type SnapshotCacheEntry = {
  data: Record<string, SnapshotItem[]>;
  failedCollections: FailedCollection[];
  expiresAt: number;
  staleUntil: number;
  serverTime: string;
};

const snapshotCache = new Map<string, SnapshotCacheEntry>();

export function invalidateSnapshotCache() {
  snapshotCache.clear();
}

function isLinkedToUser(item: SnapshotItem, user: { id: string; name: string; email: string; phone?: string; linkedStudentId?: string }) {
  const userEmail = (user.email || '').trim().toLowerCase();
  const userPhone = cleanDigits(user.phone);
  const userPhoneSuffix = userPhone.length >= 8 ? userPhone.slice(-8) : '';
  const userName = normalizeArabic(user.name);
  const linkedId = user.linkedStudentId || '';

  // ── TIER 1: Direct linkedStudentId match (strongest signal) ──
  if (linkedId) {
    if (item?.id === linkedId) return true;
    if (item?.studentId === linkedId) return true;
    if (item?.accountId === linkedId) return true;
    if (item?.linkedStudentId === linkedId) return true;
  }

  // ── TIER 2: Direct account/user ID match ──
  if (item?.id === user.id) return true;
  if (item?.studentId === user.id) return true;
  if (item?.accountId === user.id) return true;
  if (item?.createdBy === user.id) return true;
  if (item?.firebaseUid === user.id) return true;

  // ── TIER 3: Email match (skip generated/alias emails) ──
  const isGeneratedEmail = userEmail.includes('@masar.local') ||
    userEmail.includes('@masarplatform.org') ||
    userEmail.startsWith('generated_') ||
    userEmail.startsWith('parent.') ||
    userEmail.startsWith('student.');

  if (userEmail && !isGeneratedEmail) {
    const emailFields = [
      item?.email,
      item?.parentEmail,
      item?.recoveryEmail,
      item?.linkedStudentEmail,
    ].filter(Boolean).map((e) => String(e).trim().toLowerCase());
    if (emailFields.some((e) => e === userEmail)) return true;
  }

  // ── TIER 4: Phone match (last 8 digits) ──
  if (userPhoneSuffix) {
    const phoneFields = [
      item?.phone,
      item?.parentPhone,
      item?.whatsapp,
    ].filter(Boolean).map((p) => cleanDigits(String(p)));

    for (const pf of phoneFields) {
      if (pf.length >= 8) {
        const pfSuffix = pf.slice(-8);
        if (pfSuffix === userPhoneSuffix || pf.includes(userPhoneSuffix) || userPhone.includes(pfSuffix)) {
          return true;
        }
      }
    }
  }

  // ── TIER 5: Arabic name & patronymic match (only if name is real, not placeholder) ──
  const isPlaceholderName = !userName ||
    userName.includes('جديد') ||
    userName === 'ولي الامر' ||
    userName === 'طالب' ||
    userName.length < 3;

  if (!isPlaceholderName) {
    const itemParentName = normalizeArabic(String(item?.parentName || ''));
    const itemFullName = normalizeArabic(String(item?.fullName || item?.name || item?.studentName || ''));

    // Exact parent name match
    if (itemParentName && (itemParentName === userName || itemParentName.includes(userName) || userName.includes(itemParentName))) {
      return true;
    }

    // Patronymic: child's name contains parent's name as substring
    if (itemFullName && (itemFullName.includes(userName) || userName.includes(itemFullName))) {
      return true;
    }

    // Word-level patronymic: child's 2nd word onward matches parent name
    const userWords = userName.split(' ').filter(Boolean);
    const itemWords = itemFullName.split(' ').filter(Boolean);
    if (itemWords.length >= 2 && userWords.length >= 1) {
      const childFatherPart = itemWords.slice(1).join(' ');
      const userFull = userWords.join(' ');
      if (childFatherPart.includes(userFull) || userFull.includes(childFatherPart)) return true;
      if (itemWords[1] === userWords[0]) {
        if (userWords.length === 1) return true;
        if (userWords.length >= 2 && itemWords.length >= 3 && itemWords[2] === userWords[1]) return true;
        const matchCount = userWords.filter((w) => itemWords.slice(1).includes(w)).length;
        if (matchCount >= 2 || matchCount >= userWords.length - 1) return true;
      }
    }
  }

  return false;
}


export async function GET(req: NextRequest) {
  const auth = await requireRole(req, ['doctor', 'specialist', 'teacher', 'parent', 'student']);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ ok: false, error: 'غير مصرح بقراءة بيانات المنصة.' }, { status: 401 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: 'لم يتم ضبط Firebase Admin على السيرفر.' }, { status: 503 });
  }

  const canReadAll = isStaff(auth.user.role);
  const result: Record<string, SnapshotItem[]> = {};
  const failedCollections: Array<{ key: string; reason: string }> = [];
  const requested = req.nextUrl.searchParams
    .get('collections')
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const requestedSet = requested?.length ? new Set(requested) : null;
  const collections = requestedSet
    ? COLLECTIONS.filter(([payloadKey]) => requestedSet.has(payloadKey))
    : COLLECTIONS;
  const cacheKey = `${canReadAll ? 'staff' : 'user'}:${canReadAll ? 'all' : auth.user.id}:${collections
    .map(([payloadKey]) => payloadKey)
    .join(',')}`;
  const now = Date.now();
  const cached = snapshotCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json({
      ok: true,
      data: cached.data,
      partial: cached.failedCollections.length > 0,
      failedCollections: cached.failedCollections,
      cached: true,
      serverTime: cached.serverTime,
      retryAfterMs: cached.failedCollections.length > 0 ? PARTIAL_RETRY_AFTER_MS : 0,
    });
  }

  await Promise.all(
    collections.map(async ([payloadKey, collectionName]) => {
      try {
        const snap = await adminDb.collection(collectionName).limit(MAX_DOCS_PER_COLLECTION).get();
        const items = snap.docs.map((doc) => {
          const data = doc.data();
          return { ...data, id: data.id || data.accountId || doc.id } as SnapshotItem;
        });

        result[payloadKey] = canReadAll ? items : items.filter((item) => isLinkedToUser(item, auth.user!));
      } catch (error) {
        console.error(`[snapshot] Failed reading ${collectionName}:`, error);
        failedCollections.push({
          key: payloadKey,
          reason: error instanceof Error ? error.message : 'unknown',
        });
      }
    }),
  );

  const succeededCollections = Object.keys(result).length;
  const serverTime = new Date().toISOString();
  if (succeededCollections > 0) {
    snapshotCache.set(cacheKey, {
      data: result,
      failedCollections,
      expiresAt: now + SNAPSHOT_CACHE_TTL_MS,
      staleUntil: now + STALE_SNAPSHOT_TTL_MS,
      serverTime,
    });
  } else if (cached && cached.staleUntil > now) {
    return NextResponse.json({
      ok: true,
      data: cached.data,
      partial: true,
      stale: true,
      failedCollections,
      serverTime: cached.serverTime,
      retryAfterMs: EXHAUSTED_RETRY_AFTER_MS,
    });
  }

  const retryAfterMs =
    failedCollections.length === collections.length
      ? EXHAUSTED_RETRY_AFTER_MS
      : failedCollections.length > 0
        ? PARTIAL_RETRY_AFTER_MS
        : 0;

  return NextResponse.json({
    ok: true,
    data: result,
    partial: failedCollections.length > 0,
    failedCollections,
    retryAfterMs,
    serverTime,
  });
}
