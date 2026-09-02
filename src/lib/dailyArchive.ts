'use client';

import { readCloudCache, syncDocToCloud, writeCloudCache } from './firestoreSync';

export interface AttendanceEntry {
  studentId: string;
  studentName: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  score?: number;
  note?: string;
  exitTime?: string;
}

export interface DailyAttendanceSnapshot {
  id: string;
  date: string;
  dayName: string;
  sessionStart: string;
  sessionEnd: string;
  entries: AttendanceEntry[];
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  presentRate: number;
  savedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface HomeworkSubmissionEntry {
  studentId: string;
  studentName: string;
  status: 'submitted' | 'missing' | 'late';
  grade?: number;
  feedback?: string;
}

export interface DailyHomeworkSnapshot {
  id: string;
  date: string;
  homeworkTitle: string;
  subject: string;
  dueDate: string;
  submissions: HomeworkSubmissionEntry[];
  totalStudents: number;
  totalSubmitted: number;
  totalMissing: number;
  avgGrade?: number;
  createdAt: string;
}

export interface QuizResultEntry {
  studentId: string;
  studentName: string;
  score: number;
  answers?: any[];
}

export interface DailyQuizSnapshot {
  id: string;
  date: string;
  quizTitle: string;
  subject: string;
  results: QuizResultEntry[];
  totalStudents: number;
  avgScore: number;
  highScore: number;
  lowScore: number;
  createdAt: string;
}

const ATT_ARCHIVE_KEY  = 'masar.daily_attendance_archive.v1';
const HW_ARCHIVE_KEY   = 'masar.daily_homework_archive.v1';
const QUIZ_ARCHIVE_KEY = 'masar.daily_quiz_archive.v1';

const CLOUD_ATT_ARCHIVE  = 'daily_attendance_archive';
const CLOUD_HW_ARCHIVE   = 'daily_homework_archive';
const CLOUD_QUIZ_ARCHIVE = 'daily_quiz_archive';

const DAY_NAMES_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// ── Attendance Archive ─────────────────────────────────────

export function getAllAttendanceSnapshots(): DailyAttendanceSnapshot[] {
  if (typeof window === 'undefined') return [];
  return readCloudCache<DailyAttendanceSnapshot>(ATT_ARCHIVE_KEY)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getAttendanceSnapshotByDate(date: string): DailyAttendanceSnapshot | null {
  return getAllAttendanceSnapshots().find(s => s.date === date) ?? null;
}

export function autoSaveAttendanceSnapshot(
  entries: AttendanceEntry[],
  options?: { sessionStart?: string; sessionEnd?: string; savedBy?: string }
): DailyAttendanceSnapshot {
  if (typeof window === 'undefined') throw new Error('client only');

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const dayName = DAY_NAMES_AR[today.getDay()] ?? 'يوم دراسي';

  const totalPresent = entries.filter(e => e.status === 'present').length;
  const totalAbsent  = entries.filter(e => e.status === 'absent').length;
  const totalLate    = entries.filter(e => e.status === 'late').length;
  const presentRate  = entries.length > 0 ? Math.round((totalPresent / entries.length) * 100) : 0;

  const id = `att_${dateStr}`;
  const existing = getAttendanceSnapshotByDate(dateStr);

  const snapshot: DailyAttendanceSnapshot = {
    id,
    date: dateStr,
    dayName,
    sessionStart: options?.sessionStart ?? '07:30',
    sessionEnd:   options?.sessionEnd   ?? '11:50',
    entries,
    totalPresent,
    totalAbsent,
    totalLate,
    presentRate,
    savedBy: options?.savedBy ?? 'د. إسماعيل عيسى',
    createdAt: existing?.createdAt ?? today.toISOString(),
    updatedAt: today.toISOString(),
  };

  const all = readCloudCache<DailyAttendanceSnapshot>(ATT_ARCHIVE_KEY).filter(s => s.id !== id);
  writeCloudCache(ATT_ARCHIVE_KEY, [snapshot, ...all]);
  syncDocToCloud(CLOUD_ATT_ARCHIVE, id, snapshot);
  return snapshot;
}

// ── Homework Archive ───────────────────────────────────────

export function getAllHomeworkSnapshots(): DailyHomeworkSnapshot[] {
  if (typeof window === 'undefined') return [];
  return readCloudCache<DailyHomeworkSnapshot>(HW_ARCHIVE_KEY)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function saveHomeworkSnapshot(
  data: Omit<DailyHomeworkSnapshot, 'id' | 'createdAt'> & { id?: string }
): DailyHomeworkSnapshot {
  if (typeof window === 'undefined') throw new Error('client only');
  const id = data.id ?? `hw_${data.date}_${Date.now()}`;
  const snapshot: DailyHomeworkSnapshot = { ...data, id, createdAt: new Date().toISOString() };
  const all = readCloudCache<DailyHomeworkSnapshot>(HW_ARCHIVE_KEY).filter(s => s.id !== id);
  writeCloudCache(HW_ARCHIVE_KEY, [snapshot, ...all]);
  syncDocToCloud(CLOUD_HW_ARCHIVE, id, snapshot);
  return snapshot;
}

// ── Quiz Archive ───────────────────────────────────────────

export function getAllQuizSnapshots(): DailyQuizSnapshot[] {
  if (typeof window === 'undefined') return [];
  return readCloudCache<DailyQuizSnapshot>(QUIZ_ARCHIVE_KEY)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function saveQuizSnapshot(
  data: Omit<DailyQuizSnapshot, 'id' | 'createdAt'> & { id?: string }
): DailyQuizSnapshot {
  if (typeof window === 'undefined') throw new Error('client only');
  const id = data.id ?? `quiz_${data.date}_${Date.now()}`;
  const snapshot: DailyQuizSnapshot = { ...data, id, createdAt: new Date().toISOString() };
  const all = readCloudCache<DailyQuizSnapshot>(QUIZ_ARCHIVE_KEY).filter(s => s.id !== id);
  writeCloudCache(QUIZ_ARCHIVE_KEY, [snapshot, ...all]);
  syncDocToCloud(CLOUD_QUIZ_ARCHIVE, id, snapshot);
  return snapshot;
}

// ── Print Helpers ──────────────────────────────────────────

export function formatArabicDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const dayName = DAY_NAMES_AR[d.getDay()] ?? '';
    const formatted = d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${dayName} ${formatted}`;
  } catch { return dateStr; }
}

export function getStatusLabel(status: AttendanceEntry['status']): string {
  const map: Record<string, string> = { present: 'حاضر ✓', absent: 'غائب ✗', late: 'متأخر ⏰', excused: 'غياب بعذر' };
  return map[status] ?? status;
}

export function getStatusColor(status: AttendanceEntry['status']): string {
  const map: Record<string, string> = { present: '#16a34a', absent: '#dc2626', late: '#d97706', excused: '#2563eb' };
  return map[status] ?? '#64748b';
}
