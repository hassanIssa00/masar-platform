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
  ['platformAnalytics', 'platform_analytics'],
] as const;

function isStaff(role: string) {
  return role === 'doctor' || role === 'specialist' || role === 'teacher';
}

type SnapshotItem = Record<string, unknown>;

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

  await Promise.all(
    COLLECTIONS.map(async ([payloadKey, collectionName]) => {
      const snap = await adminDb.collection(collectionName).get();
      const items = snap.docs.map((doc) => {
        const data = doc.data();
        return { ...data, id: data.id || data.accountId || doc.id } as SnapshotItem;
      });

      result[payloadKey] = canReadAll ? items : items.filter((item) => isLinkedToUser(item, auth.user!));
    }),
  );

  return NextResponse.json({
    ok: true,
    data: result,
    serverTime: new Date().toISOString(),
  });
}
