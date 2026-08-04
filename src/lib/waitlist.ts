'use client';

import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export type WaitlistStatus = 'new-lead' | 'contacted' | 'assessment-scheduled' | 'in-sessions' | 'completed' | 'lost';

export interface WaitlistRecord {
  id: string;
  childName: string;
  parentName: string;
  phone: string;
  age: number;
  concern: string;
  source: 'whatsapp' | 'phone' | 'referral' | 'website' | 'social-media';
  priority: 'high' | 'medium' | 'low';
  status: WaitlistStatus;
  notes: string;
  assignedDoctor?: string;
  nextFollowUp?: string;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_KEY = 'masar.waitlist.v1';

export function getLocalWaitlist(): WaitlistRecord[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); }
  catch { return []; }
}

export function saveLocalWaitlist(items: WaitlistRecord[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

export async function createWaitlistEntry(data: Omit<WaitlistRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<WaitlistRecord> {
  const now = new Date().toISOString();
  const item: WaitlistRecord = {
    ...data,
    id: `wl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now,
    updatedAt: now,
  };
  saveLocalWaitlist([item, ...getLocalWaitlist()]);
  try { await addDoc(collection(db, 'waitlist'), item); } catch {}
  return item;
}

export function updateWaitlistEntry(id: string, patch: Partial<WaitlistRecord>) {
  const items = getLocalWaitlist().map(w => w.id === id ? { ...w, ...patch, updatedAt: new Date().toISOString() } : w);
  saveLocalWaitlist(items);
}

export function deleteWaitlistEntry(id: string) {
  saveLocalWaitlist(getLocalWaitlist().filter(w => w.id !== id));
}

export const STATUS_LABELS: Record<WaitlistStatus, string> = {
  'new-lead': 'عميل جديد',
  'contacted': 'تم التواصل',
  'assessment-scheduled': 'مجدول للتقييم',
  'in-sessions': 'في الجلسات',
  'completed': 'مكتمل',
  'lost': 'فقدان التواصل',
};

export const STATUS_COLORS: Record<WaitlistStatus, string> = {
  'new-lead': 'bg-blue-100 text-blue-800',
  'contacted': 'bg-amber-100 text-amber-800',
  'assessment-scheduled': 'bg-purple-100 text-purple-800',
  'in-sessions': 'bg-teal-100 text-teal-800',
  'completed': 'bg-emerald-100 text-emerald-800',
  'lost': 'bg-rose-100 text-rose-800',
};

export const PIPELINE_STAGES: WaitlistStatus[] = [
  'new-lead', 'contacted', 'assessment-scheduled', 'in-sessions', 'completed',
];
