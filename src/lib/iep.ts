'use client';

import { deleteDocFromCloud, syncDocToCloud } from './firestoreSync';

export type IEPGoalStatus = 'not-started' | 'in-progress' | 'achieved' | 'discontinued';
export type IEPDomain = 'academic' | 'speech' | 'social' | 'motor' | 'cognitive' | 'behavioral';

export interface IEPGoal {
  id: string;
  domain: IEPDomain;
  objective: string;
  targetDate: string;
  progressNotes: string;
  status: IEPGoalStatus;
  baselineScore: number;
  currentScore: number;
}

export interface IEPRecord {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  schoolName: string;
  doctorName: string;
  startDate: string;
  reviewDate: string;
  goals: IEPGoal[];
  strengths: string;
  challenges: string;
  accommodations: string[];
  status: 'active' | 'completed' | 'draft';
  createdAt: string;
  updatedAt: string;
}

const LOCAL_KEY = 'masar.iep.v1';

export function getLocalIEPs(): IEPRecord[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); }
  catch { return []; }
}

export function saveLocalIEPs(items: IEPRecord[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

export async function createIEP(data: Omit<IEPRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<IEPRecord> {
  const now = new Date().toISOString();
  const item: IEPRecord = {
    ...data,
    id: `iep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now,
    updatedAt: now,
  };
  const updated = [item, ...getLocalIEPs()];
  saveLocalIEPs(updated);
  await syncDocToCloud('iep_records', item.id, item);
  return item;
}

export function updateIEP(id: string, patch: Partial<IEPRecord>) {
  const items = getLocalIEPs().map(i => i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i);
  saveLocalIEPs(items);
  const item = items.find((i) => i.id === id);
  if (item) syncDocToCloud('iep_records', id, item);
}

export function deleteIEP(id: string) {
  saveLocalIEPs(getLocalIEPs().filter(i => i.id !== id));
  deleteDocFromCloud('iep_records', id);
}

export const DOMAIN_LABELS: Record<IEPDomain, string> = {
  academic: 'أكاديمي — قراءة ورياضيات',
  speech: 'نطق ولغة وتواصل',
  social: 'اجتماعي وعاطفي',
  motor: 'حركي — دقيق وكبير',
  cognitive: 'معرفي وانتباه وذاكرة',
  behavioral: 'سلوكي وتنظيمي',
};

export const DOMAIN_COLORS: Record<IEPDomain, string> = {
  academic: 'bg-indigo-100 text-indigo-800',
  speech: 'bg-teal-100 text-teal-800',
  social: 'bg-rose-100 text-rose-800',
  motor: 'bg-amber-100 text-amber-800',
  cognitive: 'bg-purple-100 text-purple-800',
  behavioral: 'bg-emerald-100 text-emerald-800',
};
