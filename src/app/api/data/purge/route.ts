import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/authorization';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin.server';
import { invalidateSnapshotCache } from '@/app/api/data/snapshot/route';

const COLLECTIONS_TO_PURGE = [
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
  'assessment_results',
  'iep_records',
  'consents',
  'resources',
  'session_records',
  'class_students',
  'student_notes',
  'student_homework_logs',
  'student_cert_logs',
  'quiz_submissions',
  'classroom_quizzes',
  'smart_schedules',
  'schedule_parse_logs',
  'parents_community_chat',
  'parents_chat_settings',
  'teacher_ai_chats',
  'ai_threads',
  'waitlist',
  'student_points',
  'point_transactions',
  'schedule_notification_logs',
  'live_sessions',
  'period_attendance',
  'platform_analytics',
  'simple_spelling_assignments',
  'simple_spelling_drawings',
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
    // 1. Purge all test data collections
    for (const colName of COLLECTIONS_TO_PURGE) {
      try {
        const snap = await adminDb.collection(colName).get();
        if (!snap.empty) {
          const batch = adminDb.batch();
          snap.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();
        }
      } catch (colErr) {
        console.warn(`[Purge] Error cleaning collection ${colName}:`, colErr);
      }
    }

    // 2. Clean test accounts from Firestore (keep Dr. Ismail and doctor accounts)
    try {
      const accSnap = await adminDb.collection('accounts').get();
      if (!accSnap.empty) {
        const batch = adminDb.batch();
        let deleted = false;
        accSnap.docs.forEach((doc) => {
          const data = doc.data();
          const email = (data.email || '').toLowerCase();
          if (email !== 'dr.ismail@masar.com' && data.role !== 'doctor') {
            batch.delete(doc.ref);
            deleted = true;
          }
        });
        if (deleted) await batch.commit();
      }
    } catch (accErr) {
      console.warn('[Purge] Error cleaning accounts:', accErr);
    }

    // 3. Clean test credentials from auth_credentials & account_credentials
    for (const credCol of ['auth_credentials', 'account_credentials']) {
      try {
        const credSnap = await adminDb.collection(credCol).get();
        if (!credSnap.empty) {
          const batch = adminDb.batch();
          let deleted = false;
          credSnap.docs.forEach((doc) => {
            const data = doc.data();
            const email = (data.email || '').toLowerCase();
            if (email !== 'dr.ismail@masar.com') {
              batch.delete(doc.ref);
              deleted = true;
            }
          });
          if (deleted) await batch.commit();
        }
      } catch (credErr) {
        console.warn(`[Purge] Error cleaning ${credCol}:`, credErr);
      }
    }

    // 4. Clean Firebase Auth users (keep Dr. Ismail)
    try {
      const adminAuth = await getAdminAuth();
      if (adminAuth) {
        const listUsersResult = await adminAuth.listUsers(1000);
        const uidsToDelete = listUsersResult.users
          .filter((u) => (u.email || '').toLowerCase() !== 'dr.ismail@masar.com')
          .map((u) => u.uid);
        if (uidsToDelete.length > 0) {
          // Delete users in chunks of 500
          for (let i = 0; i < uidsToDelete.length; i += 500) {
            const chunk = uidsToDelete.slice(i, i + 500);
            await adminAuth.deleteUsers(chunk);
          }
        }
      }
    } catch (authErr) {
      console.warn('[Purge] Error cleaning Firebase Auth users:', authErr);
    }

    invalidateSnapshotCache();

    return NextResponse.json({ ok: true, message: 'تم تفريغ كافة البيانات وسجلات وحسابات الطلاب بنجاح.' });
  } catch (error) {
    console.error('Error purging platform data:', error);
    return NextResponse.json({ ok: false, error: 'حدث خطأ أثناء تفريغ البيانات السحابية.' }, { status: 500 });
  }
}


