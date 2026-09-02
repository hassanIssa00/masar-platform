import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebaseAdmin.server';

/**
 * ONE-TIME cleanup: Delete the 7 hardcoded fake students that were auto-seeded
 * into the class_students Firestore collection.
 */

const FAKE_STUDENT_IDS = [
  'std-rabee',
  'std-omar',
  'std-abdullah',
  'std-mohammed',
  'std-salman',
  'std-faisal',
  'std-sara',
];

const FAKE_STUDENT_NAMES = [
  'ربيع إسماعيل محمد كامل عيسى',
  'عمر خالد السعيد',
  'عبدالله يوسف المنصور',
  'محمد أحمد الغامدي',
  'سلمان فهد الحربي',
  'فيصل سعد القحطاني',
  'سارة تركي الدوسري',
];

export async function POST() {
  const db = getAdminDb();
  if (!db) {
    return NextResponse.json({ ok: false, error: 'Firebase Admin not configured' }, { status: 500 });
  }

  const deleted: string[] = [];
  const errors: string[] = [];

  // 1. Delete from class_students collection by ID
  for (const id of FAKE_STUDENT_IDS) {
    try {
      const docRef = db.collection('class_students').doc(id);
      const snap = await docRef.get();
      if (snap.exists) {
        await docRef.delete();
        deleted.push(`class_students/${id}`);
      }
    } catch (e: any) {
      errors.push(`class_students/${id}: ${e.message}`);
    }
  }

  // 2. Also search class_students by name (in case IDs were regenerated)
  try {
    const allDocs = await db.collection('class_students').listDocuments();
    for (const docRef of allDocs) {
      const snap = await docRef.get();
      const data = snap.data();
      if (!data) continue;
      const name = (data.fullName || '').trim();
      if (FAKE_STUDENT_NAMES.includes(name) && !FAKE_STUDENT_IDS.includes(snap.id)) {
        await docRef.delete();
        deleted.push(`class_students/${snap.id} (by name: ${name})`);
      }
    }
  } catch (e: any) {
    errors.push(`class_students scan: ${e.message}`);
  }

  // 3. Delete from students collection by name
  try {
    const allStudents = await db.collection('students').listDocuments();
    for (const docRef of allStudents) {
      const snap = await docRef.get();
      const data = snap.data();
      if (!data) continue;
      const name = (data.fullName || '').trim();
      if (FAKE_STUDENT_NAMES.includes(name) || FAKE_STUDENT_IDS.includes(snap.id)) {
        await docRef.delete();
        deleted.push(`students/${snap.id} (${name})`);
      }
    }
  } catch (e: any) {
    errors.push(`students scan: ${e.message}`);
  }

  // 4. Delete from accounts collection by name
  try {
    const allAccounts = await db.collection('accounts').listDocuments();
    for (const docRef of allAccounts) {
      const snap = await docRef.get();
      const data = snap.data();
      if (!data) continue;
      const name = (data.name || data.fullName || '').trim();
      if (FAKE_STUDENT_NAMES.includes(name) || FAKE_STUDENT_IDS.includes(snap.id)) {
        await docRef.delete();
        deleted.push(`accounts/${snap.id} (${name})`);
      }
    }
  } catch (e: any) {
    errors.push(`accounts scan: ${e.message}`);
  }

  // 5. Clean up any related cert logs, homework logs, notes
  for (const col of ['student_cert_logs', 'student_notes', 'student_hw_logs']) {
    try {
      const docs = await db.collection(col).listDocuments();
      for (const docRef of docs) {
        const snap = await docRef.get();
        const data = snap.data();
        if (!data) continue;
        if (FAKE_STUDENT_IDS.includes(data.studentId) || FAKE_STUDENT_NAMES.includes(data.studentName || '')) {
          await docRef.delete();
          deleted.push(`${col}/${snap.id}`);
        }
      }
    } catch (e: any) {
      errors.push(`${col}: ${e.message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    message: `تم حذف ${deleted.length} سجل من البيانات الوهمية نهائياً`,
    deleted,
    errors: errors.length > 0 ? errors : undefined,
    clientCacheToClear: [
      'masar_class_students_v1',
      'masar_student_notes_v1',
      'masar_student_hw_logs_v1',
      'masar_student_cert_logs_v1',
    ],
  });
}
