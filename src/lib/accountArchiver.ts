'use client';

/**
 * accountArchiver.ts — نظام أرشفة وحذف الحسابات الشامل
 * ──────────────────────────────────────────────────────────────
 * عند حذف أي حساب:
 * 1. تُحفظ كل بياناته (الحساب، الطالب، السجلات، وبصمة الوجه مع الصورة 📸) داخل الأرشيف.
 * 2. يُحذف الحساب وبصمة الوجه نهائياً من النظام النشط ومن Firebase لمنع الدخول به مجدداً.
 * 3. يُمنع تسجيل الدخول بالوجه لهذا الحساب المحذوف تماماً.
 * 4. في صفحة الأرشيف (/archive)، تُعرض بيانات الحساب مع صورة وجهه وبصمته المؤرشفة.
 */

import { deleteDocFromCloud, readCloudCache, syncDocToCloud, writeCloudCache, clearCloudCache, clearSnapshotBackoff } from './firestoreSync';
import { getAccounts, getStudents, type AccountRecord, type StudentRecord } from './cloudStore';
import { getClassStudents } from './classDb';
import type { FaceRecord } from './faceAuth';

export const ARCHIVED_ACCOUNTS_KEY = 'masar.archived_accounts.v1';
const FACE_STORAGE_KEY = 'masar.face.v2';

export interface ArchivedAccountRecord {
  id: string; // Unique archive ID
  accountId: string;
  studentId?: string;
  userId?: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  schoolBranch?: string;
  deletedAt: string;
  deletedBy?: string;
  deletedReason?: string;
  
  // Preserved Face Biometrics & Camera Snapshot
  hasFaceEnrolled: boolean;
  faceRecord?: FaceRecord;
  photoUrl?: string; // Captured face snapshot (base64 dataUrl or photo link)
  embeddingsCount?: number;
  enrolledAt?: string;

  // Preserved snapshot of original data
  originalAccount?: AccountRecord;
  originalStudent?: StudentRecord;
}

/**
 * قراءة الحسابات المؤرشفة من التخزين المحلي والسحابي
 */
export function getArchivedAccounts(): ArchivedAccountRecord[] {
  return readCloudCache<ArchivedAccountRecord>(ARCHIVED_ACCOUNTS_KEY);
}

/**
 * حفظ سجل في أرشيف الحسابات المحذوفة
 */
export async function saveToArchivedAccounts(record: ArchivedAccountRecord): Promise<void> {
  const current = getArchivedAccounts();
  const filtered = current.filter((item) => item.accountId !== record.accountId && item.id !== record.id);
  const updated = [record, ...filtered];
  writeCloudCache(ARCHIVED_ACCOUNTS_KEY, updated);

  // Sync to Firestore 'archived_accounts' collection
  try {
    await syncDocToCloud('archived_accounts', record.id, record);
    if (record.accountId) {
      await syncDocToCloud('archived_accounts', record.accountId, record);
    }
  } catch (err) {
    console.warn('[accountArchiver] Cloud sync error:', err);
  }
}

/**
 * فحص هل الحساب محذوف ومؤرشف
 */
export function isAccountArchived(idOrEmail?: string): boolean {
  if (!idOrEmail) return false;
  const list = getArchivedAccounts();
  const target = idOrEmail.trim().toLowerCase();
  return list.some(
    (item) =>
      item.id === target ||
      item.accountId === target ||
      item.studentId === target ||
      item.userId === target ||
      (item.email && item.email.toLowerCase() === target)
  );
}

/**
 * قراءة بصمات الوجه المخزنة محلياً
 */
function readLocalFaceRecords(): FaceRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FACE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * كتابة بصمات الوجه محلياً
 */
function writeLocalFaceRecords(records: FaceRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FACE_STORAGE_KEY, JSON.stringify(records));
  } catch {}
}

/**
 * ── الدالة الرئيسية: أرشفة الحساب أولاً ثم تطهيره وحذفه بالكامل ──
 * @param targetId معرف الحساب (accountId) أو معرف الطالب (studentId)
 * @param reason سبب الحذف
 */
export async function archiveAndPurgeAccount(
  targetId: string,
  reason = 'حذف الحساب يدوياً بواسطة الإدارة'
): Promise<{ success: boolean; message: string; archivedRecord?: ArchivedAccountRecord }> {
  if (!targetId) {
    return { success: false, message: 'معرف الحساب غير صالح' };
  }

  try {
    // 1. البحث عن الحساب وبيانات الطالب المرتبطة
    const allAccounts = getAccounts();
    const allStudents = getStudents();
    const allClassStudents = getClassStudents();

    const targetAccount = allAccounts.find(
      (a) => a.id === targetId || a.linkedStudentId === targetId || (a.role === 'student' && a.id === targetId)
    );

    const linkedStudentId = targetAccount?.linkedStudentId || targetId;
    const targetStudent =
      allStudents.find((s) => s.id === linkedStudentId || s.id === targetId || s.studentAccountId === targetId) ||
      (allClassStudents.find((cs) => cs.id === linkedStudentId || cs.id === targetId) as any);

    // 2. البحث عن بصمة الوجه المسجلة
    const allFaces = readLocalFaceRecords();
    const matchingFace = allFaces.find(
      (f) =>
        f.userId === targetId ||
        f.accountId === targetId ||
        f.studentId === targetId ||
        (targetAccount && (f.userId === targetAccount.id || f.accountId === targetAccount.id)) ||
        (targetStudent && (f.userId === targetStudent.id || f.studentId === targetStudent.id))
    );

    // تحديد صورة الوجه: إما من البصمة أو من ملف الطالب
    const facePhoto =
      (matchingFace as any)?.photoUrl ||
      (matchingFace as any)?.snapshot ||
      targetStudent?.photoUrl ||
      (targetAccount as any)?.photoUrl ||
      undefined;

    const accountName = targetAccount?.name || targetStudent?.fullName || matchingFace?.userName || 'حساب بدون اسم';
    const accountEmail = targetAccount?.email || targetStudent?.email || matchingFace?.userEmail;
    const accountRole = targetAccount?.role || matchingFace?.userRole || (targetStudent ? 'student' : 'user');
    const accountBranch = targetAccount?.schoolBranch || targetStudent?.schoolBranch || matchingFace?.schoolBranch || 'MASAR';

    // 3. بناء وحفظ سجل الأرشفة
    const archiveId = `archived_${targetId}_${Date.now()}`;
    const archivedRecord: ArchivedAccountRecord = {
      id: archiveId,
      accountId: targetAccount?.id || targetId,
      studentId: targetStudent?.id || linkedStudentId,
      userId: matchingFace?.userId || targetId,
      name: accountName,
      email: accountEmail,
      phone: targetAccount?.phone || targetStudent?.parentPhone,
      role: accountRole,
      schoolBranch: accountBranch,
      deletedAt: new Date().toISOString(),
      deletedReason: reason,
      hasFaceEnrolled: Boolean(matchingFace),
      faceRecord: matchingFace ? { ...matchingFace, photoUrl: facePhoto } : undefined,
      photoUrl: facePhoto,
      embeddingsCount: matchingFace?.embeddings?.length || (matchingFace?.embedding ? 1 : 0),
      enrolledAt: matchingFace?.enrolledAt,
      originalAccount: targetAccount,
      originalStudent: targetStudent,
    };

    // حفظ في أرشيف الحسابات المحذوفة محلياً وسحابياً
    await saveToArchivedAccounts(archivedRecord);

    // 4. حذف بصمة الوجه من النظام النشط
    const remainingFaces = allFaces.filter(
      (f) =>
        f.userId !== targetId &&
        f.accountId !== targetId &&
        f.studentId !== targetId &&
        (!targetAccount || (f.userId !== targetAccount.id && f.accountId !== targetAccount.id)) &&
        (!targetStudent || (f.userId !== targetStudent.id && f.studentId !== targetStudent.id))
    );
    writeLocalFaceRecords(remainingFaces);

    // إزالة علامات تسجيل البصمة
    if (typeof window !== 'undefined') {
      try {
        const removeKeys = [
          targetId,
          targetAccount?.id,
          targetStudent?.id,
          matchingFace?.userId,
        ].filter(Boolean) as string[];

        removeKeys.forEach((k) => {
          localStorage.removeItem(`masar_face_enrolled_${k}`);
          localStorage.removeItem(`masar_face_prompt_seen_${k}`);
        });
      } catch {}
    }

    // حذف البصمة سحابياً من collection faceRecordsV2
    const cloudFaceDeletes = [
      deleteDocFromCloud('faceRecordsV2', targetId),
      deleteDocFromCloud('faceRecords', targetId),
    ];
    if (targetAccount?.id && targetAccount.id !== targetId) {
      cloudFaceDeletes.push(deleteDocFromCloud('faceRecordsV2', targetAccount.id));
    }
    if (targetStudent?.id && targetStudent.id !== targetId) {
      cloudFaceDeletes.push(deleteDocFromCloud('faceRecordsV2', targetStudent.id));
    }
    if (matchingFace?.userId && matchingFace.userId !== targetId) {
      cloudFaceDeletes.push(deleteDocFromCloud('faceRecordsV2', matchingFace.userId));
    }

    // إرسال أمر حذف البصمة لخادم المصادقة
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/auth/face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ action: 'delete', userId: targetId }),
        });
      } catch (err) {
        console.warn('[accountArchiver] /api/auth/face delete error:', err);
      }
    }

    // 5. حذف الحساب من قائمة الحسابات النشطة (accounts)
    if (targetAccount) {
      await deleteDocFromCloud('accounts', targetAccount.id);
      const remainingAccounts = allAccounts.filter((a) => a.id !== targetAccount.id);
      writeCloudCache('masar.accounts.v1', remainingAccounts);
    }
    await deleteDocFromCloud('accounts', targetId);

    // 6. إذا كان طالباً، حذفه من الطلاب النشطين (students)
    if (targetStudent) {
      await deleteDocFromCloud('students', targetStudent.id);
      const remainingStudents = allStudents.filter((s) => s.id !== targetStudent.id);
      writeCloudCache('masar.students.v1', remainingStudents);
    }

    // 7. استدعاء خادم التطهير لتنظيف الـ Firebase Auth وباقي الـ Collections
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/students/purge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ accountId: targetAccount?.id || targetId }),
        });
      } catch (err) {
        console.warn('[accountArchiver] /api/students/purge error:', err);
      }
    }

    // 8. تنظيف الذاكرة المؤقتة السحابية
    clearCloudCache();
    clearSnapshotBackoff();

    return {
      success: true,
      message: `تم حذف حساب "${accountName}" ونقله للأرشيف وحذف بصمته من النظام النشط.`,
      archivedRecord,
    };
  } catch (err: any) {
    console.error('[accountArchiver] archiveAndPurgeAccount error:', err);
    return { success: false, message: `فشلت الأرشفة والحذف: ${err?.message || 'خطأ غير متوقع'}` };
  }
}
