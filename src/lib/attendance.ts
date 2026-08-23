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
}

const LOCAL_KEY = 'masar.attendance.v1';

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
  saveLocalAttendance([item, ...getLocalAttendance()]);
  await syncDocToCloud('attendance', item.id, item);
  return item;
}

export function updateAttendance(id: string, patch: Partial<AttendanceRecord>) {
  const items = getLocalAttendance().map(a => a.id === id ? { ...a, ...patch } : a);
  saveLocalAttendance(items);
  const item = items.find((a) => a.id === id);
  if (item) syncDocToCloud('attendance', id, item);
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
