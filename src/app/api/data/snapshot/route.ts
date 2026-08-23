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
const SNAPSHOT_CACHE_TTL_MS = 5 * 60 * 1000;
const STALE_SNAPSHOT_TTL_MS = 60 * 60 * 1000;

function isStaff(role: string) {
  return role === 'doctor' || role === 'specialist' || role === 'teacher';
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

function isLinkedToUser(item: SnapshotItem, user: { id: string; name: string; email: string; phone?: string }) {
  const userEmail = user.email?.toLowerCase();
  const userPhone = user.phone?.replace(/\s+/g, '');
  const fields = [
    item?.id,
    item?.accountId,
    item?.studentId,
    item?.createdBy,
    item?.firebaseUid,
    item?.email,
    item?.parentEmail,
    item?.parentPhone,
    item?.phone,
    item?.linkedStudentEmail,
    item?.studentName,
    item?.fullName,
    item?.name,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());

  return fields.some((value) => {
    const normalizedPhone = value.replace(/\s+/g, '');
    return (
      value === user.id.toLowerCase() ||
      value === user.name.toLowerCase() ||
      value === userEmail ||
      (!!userPhone && normalizedPhone === userPhone)
    );
  });
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
    });
  }

  return NextResponse.json({
    ok: true,
    data: result,
    partial: failedCollections.length > 0,
    failedCollections,
    serverTime,
  });
}
