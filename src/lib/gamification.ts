'use client';

import { syncDocToCloud } from './firestoreSync';

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  pointsRequired: number;
  color: string;
}

export interface StudentPoints {
  studentId: string;
  studentName: string;
  totalPoints: number;
  level: number;
  badges: string[];
  streak: number;
  lastActivity: string;
}

export interface PointTransaction {
  id: string;
  studentId: string;
  studentName: string;
  points: number;
  reason: string;
  createdAt: string;
}

export const BADGES: Badge[] = [
  { id: 'first-session', name: 'بداية الرحلة', icon: '🌟', description: 'إكمال الجلسة الأولى', pointsRequired: 50, color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'week-streak', name: 'أسبوع متميز', icon: '🔥', description: 'حضور 7 جلسات متتالية', pointsRequired: 200, color: 'bg-orange-100 text-orange-800 border-orange-200' },
  { id: 'goal-achiever', name: 'محقق الأهداف', icon: '🎯', description: 'تحقيق 3 أهداف IEP', pointsRequired: 300, color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'reading-star', name: 'نجم القراءة', icon: '📖', description: 'إتقان 20 كلمة جديدة', pointsRequired: 150, color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  { id: 'speech-hero', name: 'بطل النطق', icon: '🎙️', description: 'إتقان 5 أصوات جديدة', pointsRequired: 250, color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'homework-king', name: 'ملك الواجبات', icon: '👑', description: 'إكمال 10 واجبات منزلية', pointsRequired: 400, color: 'bg-rose-100 text-rose-800 border-rose-200' },
  { id: 'champion', name: 'بطل مسار', icon: '🏆', description: 'الوصول لـ 1000 نقطة', pointsRequired: 1000, color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
];

export const LEVELS = [
  { level: 1, name: 'مبتدئ', minPoints: 0, color: 'text-slate-600' },
  { level: 2, name: 'متقدم', minPoints: 100, color: 'text-blue-600' },
  { level: 3, name: 'ممتاز', minPoints: 300, color: 'text-teal-600' },
  { level: 4, name: 'متميز', minPoints: 600, color: 'text-indigo-600' },
  { level: 5, name: 'بطل', minPoints: 1000, color: 'text-amber-600' },
];

const POINTS_KEY = 'masar.points.v1';
const TX_KEY = 'masar.transactions.v1';

export function getStudentPointsAll(): StudentPoints[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(POINTS_KEY) || '[]'); } catch { return []; }
}

export function getStudentPoints(studentId: string): StudentPoints | null {
  return getStudentPointsAll().find(p => p.studentId === studentId) || null;
}

export function getTransactions(): PointTransaction[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(TX_KEY) || '[]'); } catch { return []; }
}

export function calculateLevel(points: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) return LEVELS[i].level;
  }
  return 1;
}

export function getEarnedBadges(points: number): string[] {
  return BADGES.filter(b => points >= b.pointsRequired).map(b => b.id);
}

export async function awardPoints(studentId: string, studentName: string, points: number, reason: string) {
  const all = getStudentPointsAll();
  const existing = all.find(p => p.studentId === studentId);
  const newTotal = (existing?.totalPoints || 0) + points;
  const newLevel = calculateLevel(newTotal);
  const newBadges = getEarnedBadges(newTotal);

  const updated: StudentPoints = {
    studentId,
    studentName,
    totalPoints: newTotal,
    level: newLevel,
    badges: newBadges,
    streak: (existing?.streak || 0) + 1,
    lastActivity: new Date().toISOString(),
  };

  const newAll = existing ? all.map(p => p.studentId === studentId ? updated : p) : [...all, updated];
  localStorage.setItem(POINTS_KEY, JSON.stringify(newAll));
  await syncDocToCloud('student_points', studentId, updated);

  const tx: PointTransaction = {
    id: `tx_${Date.now()}`,
    studentId,
    studentName,
    points,
    reason,
    createdAt: new Date().toISOString(),
  };
  const txAll = [tx, ...getTransactions()].slice(0, 200);
  localStorage.setItem(TX_KEY, JSON.stringify(txAll));
  await syncDocToCloud('point_transactions', tx.id, tx);
  return updated;
}
