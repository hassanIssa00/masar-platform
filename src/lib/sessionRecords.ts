'use client';

import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export type SessionRating = 1 | 2 | 3 | 4 | 5;
export type CooperationLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'refused';

export interface SessionRecord {
  id: string;
  studentId: string;
  studentName: string;
  sessionDate: string;
  sessionTime: string;
  durationMinutes: number;
  conductedBy: string;
  branchName?: string;

  // Session content
  goalsWorkedOn: string[];
  activitiesUsed: string[];
  materialsUsed: string[];

  // Clinical observations
  cooperation: CooperationLevel;
  attentionSpan: SessionRating;
  motivation: SessionRating;
  overallPerformance: SessionRating;

  // Progress
  progressNotes: string;
  challenges: string;
  nextSessionPlan: string;

  // Outcomes
  goalAchievements: { goalId: string; goalText: string; achieved: boolean; percentage: number }[];

  status: 'draft' | 'completed' | 'reviewed';
  createdAt: string;
}

const LOCAL_KEY = 'masar.sessionRecords.v1';

export function getLocalSessionRecords(): SessionRecord[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}

export function getStudentSessionRecords(studentId: string): SessionRecord[] {
  return getLocalSessionRecords().filter(r => r.studentId === studentId);
}

export async function createSessionRecord(data: Omit<SessionRecord, 'id' | 'createdAt'>): Promise<SessionRecord> {
  const item: SessionRecord = {
    ...data,
    id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(LOCAL_KEY, JSON.stringify([item, ...getLocalSessionRecords()]));
  try { await addDoc(collection(db, 'session_records'), item); } catch {}
  return item;
}

export function updateSessionRecord(id: string, patch: Partial<SessionRecord>) {
  const updated = getLocalSessionRecords().map(s => s.id === id ? { ...s, ...patch } : s);
  localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
}

export function deleteSessionRecord(id: string) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(getLocalSessionRecords().filter(s => s.id !== id)));
}

export const COOPERATION_LABELS: Record<CooperationLevel, string> = {
  excellent: 'ممتاز جداً',
  good: 'جيد',
  fair: 'متوسط',
  poor: 'ضعيف',
  refused: 'رفض التعاون',
};

export const COOPERATION_COLORS: Record<CooperationLevel, string> = {
  excellent: 'bg-emerald-100 text-emerald-800',
  good: 'bg-teal-100 text-teal-800',
  fair: 'bg-amber-100 text-amber-800',
  poor: 'bg-orange-100 text-orange-800',
  refused: 'bg-rose-100 text-rose-800',
};

export const RATING_LABELS: Record<SessionRating, string> = {
  1: 'ضعيف جداً',
  2: 'ضعيف',
  3: 'متوسط',
  4: 'جيد',
  5: 'ممتاز',
};
