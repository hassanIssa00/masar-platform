import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/authorization';
import { getAdminDb } from '@/lib/firebaseAdmin.server';
import { invalidateSnapshotCache } from '../snapshot/route';

const ALLOWED_COLLECTIONS = new Set([
  'accounts',
  'students',
  'reports',
  'surveys',
  'activities',
  'messages',
  'ikhlasLogs',
  'ikhlasPosts',
  'calendar_sessions',
  'faceRecords',
  'notifications',
  'attendance',
  'assessment_templates',
  'assessment_results',
  'iep_records',
  'consents',
  'resources',
  'session_records',
  'class_students',
  'student_notes',
  'student_homework_logs',
  'student_cert_logs',
  'curriculum_files',
  'curriculum_assignments',
  'curriculum_drawings',
  'curriculum_quizzes',
  'quiz_submissions',
  'classroom_quizzes',
  'smart_schedules',
  'schedule_parse_logs',
  'parents_community_chat',
  'parents_chat_settings',
  'ai_threads',
  'teacher_ai_threads',
  'teacher_ai_chats',
  'branches',
  'homework',
  'invoices',
  'waitlist',
  'student_points',
  'point_transactions',
  'schedule_notification_logs',
  'live_sessions',
  'period_attendance',
  'platform_analytics',
  'student_learning_activity',
  'platform_config',
  'simple_spelling_assignments',
  'simple_spelling_drawings',
  'daily_attendance_archive',
  'daily_homework_archive',
  'daily_quiz_archive',
  'meeting_chats',
]);

function cleanDocId(value: unknown) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!id || id.length > 160 || /[\/\\]/.test(id)) return '';
  return id;
}

function canMutate(role: string, collectionName: string, method: 'write' | 'delete') {
  if (role === 'doctor') return true;
  if (role === 'specialist' || role === 'teacher') {
    return collectionName !== 'account_credentials';
  }
  if (method === 'delete') return false;
  return [
    'accounts',
    'students',
    'reports',
    'surveys',
    'messages',
    'activities',
    'notifications',
    'consents',
    'quiz_submissions',
    'curriculum_drawings',
    'homework',
    'waitlist',
    'student_points',
    'point_transactions',
    'student_learning_activity',
    'simple_spelling_drawings',
    'faceRecords',
  ].includes(collectionName);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const collectionName = typeof body.collectionName === 'string' ? body.collectionName.trim() : '';
  const docId = cleanDocId(body.docId);
  const data = body.data && typeof body.data === 'object' ? body.data : null;

  if (!ALLOWED_COLLECTIONS.has(collectionName) || !docId || !data) {
    return NextResponse.json({ ok: false, error: 'طلب حفظ غير صالح.' }, { status: 400 });
  }

  const auth = await requireRole(req, ['doctor', 'specialist', 'teacher', 'parent', 'student']);
  
  // Public collections allowed for guest / unregistered student assessments and surveys
  const PUBLIC_SUBMISSION_COLLECTIONS = new Set([
    'students',
    'reports',
    'surveys',
    'waitlist',
    'quiz_submissions',
    'curriculum_drawings',
    'simple_spelling_drawings',
  ]);

  const isPublicAllowed = !auth.authorized && PUBLIC_SUBMISSION_COLLECTIONS.has(collectionName);

  if (!auth.authorized && !isPublicAllowed) {
    return NextResponse.json({ ok: false, error: 'غير مصرح بحفظ بيانات المنصة.' }, { status: 401 });
  }

  if (auth.authorized && auth.user && !canMutate(auth.user.role, collectionName, 'write')) {
    return NextResponse.json({ ok: false, error: 'غير مصرح بتعديل هذا النوع من البيانات.' }, { status: 403 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: 'لم يتم ضبط Firebase Admin على السيرفر.' }, { status: 503 });
  }

  await adminDb
    .collection(collectionName)
    .doc(docId)
    .set(
      {
        ...data,
        id: data.id || data.accountId || docId,
        updatedAt: data.updatedAt || new Date().toISOString(),
      },
      { merge: true },
    );

  invalidateSnapshotCache();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireRole(req, ['doctor', 'specialist', 'teacher']);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ ok: false, error: 'غير مصرح بحذف بيانات المنصة.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const collectionName = typeof body.collectionName === 'string' ? body.collectionName.trim() : '';
  const docId = cleanDocId(body.docId);

  if (!ALLOWED_COLLECTIONS.has(collectionName) || !docId) {
    return NextResponse.json({ ok: false, error: 'طلب حذف غير صالح.' }, { status: 400 });
  }

  if (!canMutate(auth.user.role, collectionName, 'delete')) {
    return NextResponse.json({ ok: false, error: 'غير مصرح بحذف هذا النوع من البيانات.' }, { status: 403 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: 'لم يتم ضبط Firebase Admin على السيرفر.' }, { status: 503 });
  }

  await adminDb.collection(collectionName).doc(docId).delete();
  invalidateSnapshotCache();
  return NextResponse.json({ ok: true });
}
