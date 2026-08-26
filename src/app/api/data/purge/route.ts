import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/authorization';
import { getAdminDb } from '@/lib/firebaseAdmin.server';

const COLLECTIONS_TO_PURGE = [
  'students',
  'reports',
  'surveys',
  'activities',
  'messages',
  'ikhlasLogs',
  'ikhlasPosts',
  'waitlist',
  'class_students',
  'student_notes',
  'student_homework_logs',
  'student_cert_logs',
  'assessment_results',
  'calendar_sessions',
  'notifications',
  'attendance',
  'iep_records',
  'session_records',
  'quiz_submissions',
  'simple_spelling_assignments',
  'simple_spelling_drawings',
  'student_points',
  'point_transactions',
];

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['doctor', 'specialist', 'teacher']);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ ok: false, error: 'غير مصرح لك بتفريغ بيانات المنصة.' }, { status: 401 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: 'لم يتم ضبط Firebase Admin على السيرفر.' }, { status: 503 });
  }

  try {
    for (const colName of COLLECTIONS_TO_PURGE) {
      const snap = await adminDb.collection(colName).get();
      if (!snap.empty) {
        const batch = adminDb.batch();
        snap.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
      }
    }

    return NextResponse.json({ ok: true, message: 'تم تفريغ كافة البيانات وسجلات الطلاب بنجاح.' });
  } catch (error) {
    console.error('Error purging platform data:', error);
    return NextResponse.json({ ok: false, error: 'حدث خطأ أثناء تفريغ البيانات السحابية.' }, { status: 500 });
  }
}
