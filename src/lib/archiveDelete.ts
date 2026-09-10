'use client';

/**
 * archiveDelete.ts
 * حذف أي عنصر من الأرشيف (Firestore + localStorage)
 */

import { deleteDocFromCloud, readCloudCache, writeCloudCache } from './firestoreSync';

// ─── Mapping من اسم الـ Collection → مفتاح الـ localStorage ──────────────
const COLLECTION_TO_LOCAL_KEY: Record<string, string> = {
  reports:                'masar.reports.v1',
  surveys:                'masar.surveys.v1',
  accounts:               'masar.accounts.v1',
  students:               'masar.students.v1',
  messages:               'masar.messages.v1',
  activities:             'masar.activity.v1',
  attendance:             'masar.attendance.v1',
  ikhlasLogs:             'masar.ikhlasLogs.v1',
  notifications:          'masar.notifications.v1',
  iep_records:            'masar.iep.v1',
  session_records:        'masar.sessionRecords.v1',
  invoices:               'masar.invoices.v1',
  consents:               'masar.consents.v1',
  homework:               'masar.homework.v1',
  student_cert_logs:      'masar_student_cert_logs_v1',
  student_homework_logs:  'masar_student_hw_logs_v1',
  class_students:         'masar_class_students_v1',
  student_notes:          'masar.studentNotes.v1',
  points:                 'masar.points.v1',
  pointTransactions:      'masar.transactions.v1',
  student_badges:         'masar_student_badges_v1',
};

export interface DeleteResult {
  success: boolean;
  message: string;
}

/**
 * حذف عنصر واحد من مجموعة معينة
 * @param collectionName اسم الـ Firestore collection
 * @param docId معرف المستند
 */
export async function deleteArchiveItem(
  collectionName: string,
  docId: string
): Promise<DeleteResult> {
  if (!docId) {
    return { success: false, message: 'معرف العنصر غير موجود — لا يمكن الحذف' };
  }

  try {
    // 1. حذف من Firestore (Cloud)
    await deleteDocFromCloud(collectionName, docId);

    // 2. حذف من localStorage
    const localKey = COLLECTION_TO_LOCAL_KEY[collectionName];
    if (localKey && typeof window !== 'undefined') {
      const current = readCloudCache<Record<string, unknown>>(localKey);
      const updated = current.filter((item: any) => item.id !== docId);
      writeCloudCache(localKey, updated);
    }

    return { success: true, message: 'تم الحذف بنجاح من السحابة والذاكرة المحلية' };
  } catch (err: any) {
    console.error('[ArchiveDelete] Error:', err);
    return { success: false, message: `فشل الحذف: ${err?.message || 'خطأ في الاتصال'}` };
  }
}

/**
 * حذف بصمة وجه من localStorage فقط (تُخزَّن بشكل خاص)
 */
export async function deleteFaceRecord(userId: string): Promise<DeleteResult> {
  if (!userId) return { success: false, message: 'معرف المستخدم غير موجود' };
  try {
    await deleteDocFromCloud('faceRecordsV2', userId);
    // تحديث الـ localStorage
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('masar.face.v2');
        const records: any[] = raw ? JSON.parse(raw) : [];
        const updated = records.filter((r) => r.userId !== userId && r.accountId !== userId);
        localStorage.setItem('masar.face.v2', JSON.stringify(updated));
      } catch {}
    }
    return { success: true, message: 'تم حذف بصمة الوجه بنجاح' };
  } catch (err: any) {
    return { success: false, message: `فشل الحذف: ${err?.message || 'خطأ'}` };
  }
}
