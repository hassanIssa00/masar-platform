'use client';

import { readCloudCache, syncDocToCloud, writeCloudCache } from './firestoreSync';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  sessionDate: string;
  sessionTime: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  parentNotified: boolean;
  createdAt: string;
  verifiedVia?: 'face' | 'manual' | 'auto_login';
  faceConfidence?: number;
  branch?: 'MASAR' | 'IKHLAS_JEDDAH';
  capturedPhotoUrl?: string; // Captured live photo from webcam/camera at verification moment
}

const LOCAL_KEY = 'masar.attendance.v1';
const PERIOD_STORAGE_PREFIX = 'masar_period_attendance_v2_';

export function getLocalAttendance(): AttendanceRecord[] {
  if (typeof window === 'undefined') return [];
  return readCloudCache<AttendanceRecord>(LOCAL_KEY);
}

export function saveLocalAttendance(items: AttendanceRecord[]) {
  if (typeof window === 'undefined') return;
  writeCloudCache(LOCAL_KEY, items);
}

export async function recordAttendance(data: Omit<AttendanceRecord, 'id' | 'createdAt'>): Promise<AttendanceRecord> {
  const item: AttendanceRecord = {
    ...data,
    id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  saveLocalAttendance([item, ...getLocalAttendance().filter(a => a.id !== item.id)]);
  await syncDocToCloud('attendance', item.id, item);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('masar_attendance_updated', { detail: item }));
  }
  return item;
}

export function updateAttendance(id: string, patch: Partial<AttendanceRecord>) {
  const items = getLocalAttendance().map(a => a.id === id ? { ...a, ...patch } : a);
  saveLocalAttendance(items);
  const item = items.find((a) => a.id === id);
  if (item) {
    syncDocToCloud('attendance', id, item);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('masar_attendance_updated', { detail: item }));
    }
  }
}

export function getStudentTodayAttendance(studentId: string, dateStr?: string): AttendanceRecord | undefined {
  const today = dateStr || new Date().toISOString().split('T')[0];
  const list = getLocalAttendance();
  return list.find(r => (r.studentId === studentId || r.studentName === studentId) && r.sessionDate === today);
}

/**
 * Marks student present using Face ID biometrics.
 * - Saves to masar.attendance.v1 and syncs to Firestore collection 'attendance'
 * - If branch is IKHLAS_JEDDAH or isClassroom=true, also updates the today period attendance matrix in Firestore
 */
export async function markStudentAttendanceViaFace(
  studentId: string,
  studentName: string,
  options?: {
    branch?: 'MASAR' | 'IKHLAS_JEDDAH';
    confidence?: number;
    isClassroom?: boolean;
    sessionDate?: string;
    capturedPhotoUrl?: string;
  }
): Promise<{ record: AttendanceRecord; isNew: boolean }> {
  const todayStr = options?.sessionDate || new Date().toISOString().split('T')[0];
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const existing = getStudentTodayAttendance(studentId, todayStr);
  const photoUrl = options?.capturedPhotoUrl || existing?.capturedPhotoUrl;

  if (existing && existing.status === 'present' && existing.verifiedVia === 'face') {
    // If a new photo is provided and existing record didn't have one, update it
    if (options?.capturedPhotoUrl && !existing.capturedPhotoUrl) {
      const updated: AttendanceRecord = { ...existing, capturedPhotoUrl: options.capturedPhotoUrl };
      updateAttendance(existing.id, updated);
      return { record: updated, isNew: false };
    }
    return { record: existing, isNew: false };
  }

  const confidence = options?.confidence ?? 0.96;
  const branch = options?.branch || (options?.isClassroom ? 'IKHLAS_JEDDAH' : 'MASAR');

  let rec: AttendanceRecord;
  if (existing) {
    rec = {
      ...existing,
      status: 'present',
      sessionTime: existing.sessionTime || timeStr,
      verifiedVia: 'face',
      faceConfidence: confidence,
      branch,
      capturedPhotoUrl: photoUrl,
      notes: existing.notes || 'تم التحقق الذكي ببصمة الوجه 📸',
    };
    updateAttendance(existing.id, rec);
  } else {
    rec = await recordAttendance({
      studentId,
      studentName,
      sessionDate: todayStr,
      sessionTime: timeStr,
      status: 'present',
      parentNotified: false,
      verifiedVia: 'face',
      faceConfidence: confidence,
      branch,
      capturedPhotoUrl: photoUrl,
      notes: 'تم تسجيل الحضور التلقائي عبر بصمة الوجه 📸',
    });
  }

  // If Ikhlas branch or classroom, synchronize with ClassAttendanceMatrix for Dr. Ismail
  if (branch === 'IKHLAS_JEDDAH' || options?.isClassroom) {
    try {
      const storageKey = `${PERIOD_STORAGE_PREFIX}${todayStr}`;
      const cached = readCloudCache<{ id: string; date?: string; matrix: Record<string, Record<number, any>> }>(PERIOD_STORAGE_PREFIX);
      const existingObj = cached.find(item => item.id === storageKey);
      const matrix = existingObj?.matrix ? { ...existingObj.matrix } : {};

      if (!matrix[studentId]) {
        matrix[studentId] = {};
      }

      // Mark all standard periods (1 through 7) as present
      for (let p = 1; p <= 7; p++) {
        matrix[studentId][p] = {
          status: 'present',
          score: 98,
          note: `حضور بيومتري ذكي (${timeStr})`,
          exitLogged: undefined,
        };
      }

      const updatedRecord = {
        id: storageKey,
        date: todayStr,
        updatedAt: now.toISOString(),
        matrix,
      };

      writeCloudCache(PERIOD_STORAGE_PREFIX, [updatedRecord, ...cached.filter(item => item.id !== storageKey)]);
      syncDocToCloud('period_attendance', `IKHLAS_${todayStr}`, updatedRecord);
    } catch (err) {
      console.warn('Class matrix sync error on face attendance:', err);
    }
  }

  return { record: rec, isNew: true };
}

export function getAttendanceStats(studentId: string) {
  const records = getLocalAttendance().filter(a => a.studentId === studentId);
  const total = records.length;
  const present = records.filter(a => a.status === 'present').length;
  const absent = records.filter(a => a.status === 'absent').length;
  const late = records.filter(a => a.status === 'late').length;
  const rate = total > 0 ? Math.round((present / total) * 100) : 0;
  return { total, present, absent, late, rate };
}

export const ATTENDANCE_LABELS: Record<AttendanceRecord['status'], string> = {
  present: 'حاضر ✓',
  absent: 'غائب ✗',
  late: 'متأخر',
  excused: 'غياب بعذر',
};

export const ATTENDANCE_COLORS: Record<AttendanceRecord['status'], string> = {
  present: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  absent: 'bg-rose-100 text-rose-800 border-rose-200',
  late: 'bg-amber-100 text-amber-800 border-amber-200',
  excused: 'bg-blue-100 text-blue-800 border-blue-200',
};
