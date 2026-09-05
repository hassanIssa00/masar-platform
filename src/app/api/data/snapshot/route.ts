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
  ['curriculumAssignments', 'curriculum_assignments'],
  ['curriculumDrawings', 'curriculum_drawings'],
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
  ['studentLearningActivity', 'student_learning_activity'],
  ['simpleSpellingAssignments', 'simple_spelling_assignments'],
  ['simpleSpellingDrawings', 'simple_spelling_drawings'],
  ['dailyAttendanceArchive', 'daily_attendance_archive'],
  ['dailyHomeworkArchive', 'daily_homework_archive'],
  ['dailyQuizArchive', 'daily_quiz_archive'],
  ['meetingChats', 'meeting_chats'],
  ['studentBadges', 'studentBadges'],
] as const;

const MAX_DOCS_PER_COLLECTION = 150; // Lean queries to preserve quota
const SNAPSHOT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh cache on server
const STALE_SNAPSHOT_TTL_MS = 15 * 60 * 1000; // 15 minutes stale cache
const PARTIAL_RETRY_AFTER_MS = 2000;
const EXHAUSTED_RETRY_AFTER_MS = 30000;

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

function cleanEmail(value?: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function sameText(a?: unknown, b?: unknown): boolean {
  const left = String(a || '').trim();
  const right = String(b || '').trim();
  return !!left && !!right && left === right;
}

function isGeneratedEmail(email: string): boolean {
  return email.includes('@masar.local') ||
    email.includes('@masarplatform.org') ||
    email.startsWith('generated_') ||
    email.startsWith('parent.') ||
    email.startsWith('student.');
}

function isLinkedToUser(
  item: SnapshotItem,
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    schoolBranch?: string;
    linkedStudentId?: string;
    linkedStudentEmail?: string;
    linkedParentId?: string;
    linkedParentEmail?: string;
  },
  linkedStudentIds?: Set<string>,
  linkedStudentNames?: Set<string>,
) {
  // ── PRE-TIER: Explicitly resolved linked student IDs and names ──
  if (linkedStudentIds && linkedStudentIds.size > 0) {
    if (item?.id && linkedStudentIds.has(String(item.id))) return true;
    if (item?.studentId && linkedStudentIds.has(String(item.studentId))) return true;
    if (item?.accountId && linkedStudentIds.has(String(item.accountId))) return true;
    if (item?.studentAccountId && linkedStudentIds.has(String(item.studentAccountId))) return true;
    if (item?.linkedStudentId && linkedStudentIds.has(String(item.linkedStudentId))) return true;
    if (item?.parentAccountId && linkedStudentIds.has(String(item.parentAccountId))) return true;
    if (item?.linkedParentId && linkedStudentIds.has(String(item.linkedParentId))) return true;
  }

  if (linkedStudentNames && linkedStudentNames.size > 0) {
    const itemNorm = normalizeArabic(String(item?.fullName || item?.studentName || item?.name || ''));
    if (itemNorm && itemNorm.length >= 3) {
      if (linkedStudentNames.has(itemNorm)) return true;
      for (const knownName of linkedStudentNames) {
        if (itemNorm.includes(knownName) || knownName.includes(itemNorm)) return true;
      }
    }
  }

  // Universal broadcasts
  if (item?.studentId === 'all' || item?.studentId === 'student_assessment') return true;

  const userEmail = (user.email || '').trim().toLowerCase();
  const linkedStudentEmail = cleanEmail(user.linkedStudentEmail);
  const linkedParentEmail = cleanEmail(user.linkedParentEmail);
  const userPhone = cleanDigits(user.phone);
  const userPhoneSuffix = userPhone.length >= 8 ? userPhone.slice(-8) : '';
  const userName = normalizeArabic(user.name);
  const linkedId = user.linkedStudentId || '';
  const linkedParentId = user.linkedParentId || '';
  const itemBranch = String(item?.schoolBranch || item?.branch || '').trim();
  const sameBranch = !user.schoolBranch || !itemBranch || itemBranch === user.schoolBranch;

  // ── TIER 1: Direct linkedStudentId match (strongest signal) ──
  if (linkedId) {
    if (sameText(item?.id, linkedId)) return true;
    if (sameText(item?.studentId, linkedId)) return true;
    if (sameText(item?.accountId, linkedId)) return true;
    if (sameText(item?.studentAccountId, linkedId)) return true;
    if (sameText(item?.linkedStudentId, linkedId)) return true;
  }

  // ── TIER 2: Direct account/user ID match ──
  if (sameText(item?.id, user.id)) return true;
  if (sameText(item?.studentId, user.id)) return true;
  if (sameText(item?.accountId, user.id)) return true;
  if (sameText(item?.studentAccountId, user.id)) return true;
  if (sameText(item?.parentAccountId, user.id)) return true;
  if (sameText(item?.linkedParentId, user.id)) return true;
  if (sameText(item?.createdBy, user.id)) return true;
  if (sameText(item?.senderId, user.id)) return true;
  if (sameText(item?.firebaseUid, user.id)) return true;

  if (linkedParentId) {
    if (sameText(item?.parentAccountId, linkedParentId)) return true;
    if (sameText(item?.linkedParentId, linkedParentId)) return true;
    if (sameText(item?.accountId, linkedParentId)) return true;
  }

  const explicitStudentEmails = [
    item?.email,
    item?.recoveryEmail,
    item?.linkedStudentEmail,
  ].filter(Boolean).map(cleanEmail);
  if (linkedStudentEmail && explicitStudentEmails.some((e) => e === linkedStudentEmail)) return true;

  const explicitParentEmails = [
    item?.parentEmail,
    item?.linkedParentEmail,
  ].filter(Boolean).map(cleanEmail);
  if (linkedParentEmail && explicitParentEmails.some((e) => e === linkedParentEmail)) return true;

  // ── TIER 3: Phone match (last 8 digits) — uniquely identifies parent/family ──
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

  // ── TIER 4: Email match (skip generated/alias emails unless explicitly linked above) ──
  if (userEmail && !isGeneratedEmail(userEmail)) {
    const emailFields = [
      item?.email,
      item?.parentEmail,
      item?.recoveryEmail,
      item?.linkedStudentEmail,
      item?.linkedParentEmail,
    ].filter(Boolean).map((e) => String(e).trim().toLowerCase());
    if (emailFields.some((e) => e === userEmail)) return true;
  }

  if (!sameBranch) return false;

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
  const force = req.nextUrl.searchParams.get('force') === 'true';
  const cached = force ? null : snapshotCache.get(cacheKey);
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

  const SHARED_COLLECTIONS = new Set([
    // ── Content shared with ALL authenticated roles (student, parent, teacher, doctor) ──
    'students',              // all authenticated users can discover enrolled student profiles
    'curriculumFiles',
    'curriculumQuizzes',
    'classroomQuizzes',
    'assessmentTemplates',
    'resources',
    'branches',
    'ikhlasPosts',
    'liveSessions',
    'smartSchedules',
    'parentsCommunityChat',
    'parentsChatSettings',
    // ── Class data that students & parents MUST receive ──
    'homework',              // homework assigned by teacher → students must see it
    'studentCertLogs',       // certificates granted by doctor → students must see them
    'studentBadges',         // badges & medals granted by doctor → students & parents must see them
    'studentHomeworkLogs',   // homework submissions → doctor & parent must see them
    'classStudents',         // class roster → needed to resolve student identity
    'curriculumAssignments', // curriculum tasks shared with students
    'curriculumDrawings',    // curriculum drawings shared with students
    'notifications',         // notifications sent to parents/students
    'activity',              // class activity log
  ]);

  const rawCollectionItems = new Map<string, SnapshotItem[]>();

  await Promise.all(
    collections.map(async ([payloadKey, collectionName]) => {
      try {
        const snap = await adminDb.collection(collectionName).limit(MAX_DOCS_PER_COLLECTION).get();
        const items = snap.docs.map((doc) => {
          const data = doc.data();
          return { ...data, id: data.id || data.accountId || doc.id } as SnapshotItem;
        });
        rawCollectionItems.set(payloadKey, items);
      } catch (error) {
        console.error(`[snapshot] Failed reading ${collectionName}:`, error);
        failedCollections.push({
          key: payloadKey,
          reason: error instanceof Error ? error.message : 'unknown',
        });
      }
    }),
  );

  // If user is a parent or student, discover all linked student IDs & names across rosters
  let linkedStudentIds: Set<string> | undefined;
  let linkedStudentNames: Set<string> | undefined;

  if (!canReadAll && auth.user) {
    linkedStudentIds = new Set<string>();
    linkedStudentNames = new Set<string>();

    if (auth.user.id) linkedStudentIds.add(auth.user.id);
    if (auth.user.linkedStudentId) linkedStudentIds.add(auth.user.linkedStudentId);
    if (auth.user.linkedParentId) linkedStudentIds.add(auth.user.linkedParentId);
    if (auth.user.role === 'student' && auth.user.name) {
      const norm = normalizeArabic(auth.user.name);
      if (norm.length >= 3) linkedStudentNames.add(norm);
    }

    // Inspect loaded student and class roster records, or fetch if not in current request
    let rosterItems: SnapshotItem[] = [
      ...(rawCollectionItems.get('students') || []),
      ...(rawCollectionItems.get('classStudents') || []),
      ...(rawCollectionItems.get('accounts') || []),
    ];

    if (!rawCollectionItems.has('classStudents') || !rawCollectionItems.has('students')) {
      try {
        const [clsSnap, stdSnap] = await Promise.all([
          adminDb.collection('class_students').limit(100).get().catch(() => null),
          adminDb.collection('students').limit(100).get().catch(() => null),
        ]);
        if (clsSnap) {
          clsSnap.docs.forEach((d) => rosterItems.push({ ...d.data(), id: d.id }));
        }
        if (stdSnap) {
          stdSnap.docs.forEach((d) => rosterItems.push({ ...d.data(), id: d.id }));
        }
      } catch {}
    }

    for (const item of rosterItems) {
      if (isLinkedToUser(item, auth.user)) {
        if (item.id) linkedStudentIds.add(String(item.id));
        if (item.studentId) linkedStudentIds.add(String(item.studentId));
        if (item.accountId) linkedStudentIds.add(String(item.accountId));
        if (item.studentAccountId) linkedStudentIds.add(String(item.studentAccountId));
        if (item.linkedStudentId) linkedStudentIds.add(String(item.linkedStudentId));
        if (item.parentAccountId) linkedStudentIds.add(String(item.parentAccountId));
        if (item.linkedParentId) linkedStudentIds.add(String(item.linkedParentId));
        const sName = normalizeArabic(String(item.fullName || item.studentName || (item.role === 'student' ? item.name : '')));
        if (sName && sName.length >= 3 && !sName.includes('جديد') && !sName.includes('الاستبيان')) {
          linkedStudentNames.add(sName);
        }
      }
    }
  }

  collections.forEach(([payloadKey]) => {
    const items = rawCollectionItems.get(payloadKey) || [];
    const isShared = SHARED_COLLECTIONS.has(payloadKey);
    result[payloadKey] = canReadAll || isShared
      ? items
      : items.filter((item) => isLinkedToUser(item, auth.user!, linkedStudentIds, linkedStudentNames));
  });


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
