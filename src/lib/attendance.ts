'use client';

import { readCloudCache, syncDocToCloud, writeCloudCache } from './firestoreSync';
import { getCurrentPeriod, getTodayPeriods, getSavedSchedule, Period } from '@/data/ikhlasSchedule';

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
  periodNumber?: number;     // 1 to 7
  periodName?: string;       // e.g. 'الحصة الأولى'
  subjectName?: string;      // e.g. 'لغتي العربية'
}

export const PERIOD_NAMES: Record<number, string> = {
  1: 'الحصة الأولى',
  2: 'الحصة الثانية',
  3: 'الحصة الثالثة',
  4: 'الحصة الرابعة',
  5: 'الحصة الخامسة',
  6: 'الحصة السادسة',
  7: 'الحصة السابعة',
};

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

/**
 * Returns student's attendance record for a specific period on a specific date.
 */
export function getStudentPeriodAttendance(
  studentId: string,
  periodNumber: number,
  dateStr?: string,
): AttendanceRecord | undefined {
  const today = dateStr || new Date().toISOString().split('T')[0];
  const list = getLocalAttendance();
  return list.find(
    r => (r.studentId === studentId || r.studentName === studentId) &&
         r.sessionDate === today &&
         r.periodNumber === periodNumber
  );
}

/**
 * Returns a map of periodNumber -> AttendanceRecord for a student today.
 */
export function getStudentTodayPeriodsAttendance(
  studentId: string,
  dateStr?: string,
): Record<number, AttendanceRecord> {
  const today = dateStr || new Date().toISOString().split('T')[0];
  const list = getLocalAttendance();
  const map: Record<number, AttendanceRecord> = {};
  list
    .filter(r => (r.studentId === studentId || r.studentName === studentId) && r.sessionDate === today)
    .forEach(r => {
      const pNum = r.periodNumber ?? 1;
      // Keep the most recent or verified record for this period
      if (!map[pNum] || r.verifiedVia === 'face') {
        map[pNum] = r;
      }
    });
  return map;
}

/**
 * Returns the student's latest attendance record for today (any period), or undefined.
 */
export function getStudentTodayAttendance(studentId: string, dateStr?: string): AttendanceRecord | undefined {
  const today = dateStr || new Date().toISOString().split('T')[0];
  const list = getLocalAttendance();
  const records = list.filter(r => (r.studentId === studentId || r.studentName === studentId) && r.sessionDate === today);
  if (records.length === 0) return undefined;
  // Return face verified one first, or most recently created
  return records.find(r => r.verifiedVia === 'face') || records[0];
}

/**
 * Resolves the active or target period for attendance recording.
 */
export function resolveActivePeriod(preferredPeriodNumber?: number): { periodNumber: number; periodName: string; subjectName: string } {
  const schedule = getSavedSchedule();
  const todayPeriods = getTodayPeriods(schedule);

  if (preferredPeriodNumber && preferredPeriodNumber >= 1 && preferredPeriodNumber <= 7) {
    const found = todayPeriods.find(p => p.periodNumber === preferredPeriodNumber);
    return {
      periodNumber: preferredPeriodNumber,
      periodName: PERIOD_NAMES[preferredPeriodNumber] || `الحصة ${preferredPeriodNumber}`,
      subjectName: found?.subjectName || 'حصة دراسية',
    };
  }

  const current = getCurrentPeriod(schedule);
  if (current) {
    return {
      periodNumber: current.periodNumber,
      periodName: PERIOD_NAMES[current.periodNumber] || `الحصة ${current.periodNumber}`,
      subjectName: current.subjectName,
    };
  }

  // If before school or outside scheduled hours, default to period 1 (or the first period today)
  const first = todayPeriods[0];
  const pNum = first?.periodNumber || 1;
  return {
    periodNumber: pNum,
    periodName: PERIOD_NAMES[pNum] || `الحصة ${pNum}`,
    subjectName: first?.subjectName || 'الحصة الأولى',
  };
}

/**
 * Marks student present for a specific period using Face ID biometrics.
 * - Saves to masar.attendance.v1 and syncs to Firestore collection 'attendance'
 * - Updates the specific period in Dr. Ismail's matrix
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
    periodNumber?: number;
    periodName?: string;
    subjectName?: string;
  }
): Promise<{ record: AttendanceRecord; isNew: boolean }> {
  const todayStr = options?.sessionDate || new Date().toISOString().split('T')[0];
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Resolve target period
  const resolvedPeriod = resolveActivePeriod(options?.periodNumber);
  const periodNumber = options?.periodNumber || resolvedPeriod.periodNumber;
  const periodName = options?.periodName || PERIOD_NAMES[periodNumber] || resolvedPeriod.periodName;
  const subjectName = options?.subjectName || resolvedPeriod.subjectName;

  const existing = getStudentPeriodAttendance(studentId, periodNumber, todayStr);
  const photoUrl = options?.capturedPhotoUrl || existing?.capturedPhotoUrl;

  if (existing && existing.status === 'present' && existing.verifiedVia === 'face') {
    if (options?.capturedPhotoUrl && !existing.capturedPhotoUrl) {
      const updated: AttendanceRecord = { ...existing, capturedPhotoUrl: options.capturedPhotoUrl };
      updateAttendance(existing.id, updated);
      return { record: updated, isNew: false };
    }
    return { record: existing, isNew: false };
  }

  const confidence = options?.confidence ?? 0.98;
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
      periodNumber,
      periodName,
      subjectName,
      notes: existing.notes || `تم التحقق ببصمة الوجه (${periodName} - ${subjectName}) 📸`,
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
      periodNumber,
      periodName,
      subjectName,
      notes: `حضور ${periodName} (${subjectName}) عبر بصمة الوجه 📸`,
    });
  }

  // Update specific period in Dr. Ismail's matrix
  if (branch === 'IKHLAS_JEDDAH' || options?.isClassroom) {
    try {
      const storageKey = `${PERIOD_STORAGE_PREFIX}${todayStr}`;
      const cached = readCloudCache<{ id: string; date?: string; matrix: Record<string, Record<number, any>> }>(PERIOD_STORAGE_PREFIX);
      const existingObj = cached.find(item => item.id === storageKey);
      const matrix = existingObj?.matrix ? { ...existingObj.matrix } : {};

      if (!matrix[studentId]) {
        matrix[studentId] = {};
      }

      // Mark the SPECIFIC period as present
      matrix[studentId][periodNumber] = {
        status: 'present',
        score: 98,
        note: `حضور بيومتري ذكي (${periodName} - ${timeStr})`,
        exitLogged: undefined,
      };

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
