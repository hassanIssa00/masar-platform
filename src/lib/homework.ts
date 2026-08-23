'use client';

import { readCloudCache, syncDocToCloud, writeCloudCache } from './firestoreSync';

export interface HomeworkRecord {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'assigned' | 'submitted' | 'reviewed';
  parentNotes?: string;
  doctorFeedback?: string;
  createdAt: string;
}

const LOCAL_KEY = 'masar.homework.v1';

export function getLocalHomework(): HomeworkRecord[] {
  if (typeof window === 'undefined') return [];
  return readCloudCache<HomeworkRecord>(LOCAL_KEY);
}

export function saveLocalHomework(items: HomeworkRecord[]) {
  if (typeof window === 'undefined') return;
  writeCloudCache(LOCAL_KEY, items);
}

export async function createHomework(hw: Omit<HomeworkRecord, 'id' | 'createdAt' | 'status'>) {
  const item: HomeworkRecord = {
    id: `hw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    ...hw,
    status: 'assigned',
    createdAt: new Date().toISOString(),
  };

  const current = getLocalHomework();
  const updated = [item, ...current];
  saveLocalHomework(updated);

  await syncDocToCloud('homework', item.id, item);
  return item;
}

export function updateHomeworkStatus(id: string, status: HomeworkRecord['status'], parentNotes?: string) {
  const current = getLocalHomework();
  const updated = current.map((h) => (h.id === id ? { ...h, status, parentNotes: parentNotes ?? h.parentNotes } : h));
  saveLocalHomework(updated);
  const item = updated.find((h) => h.id === id);
  if (item) syncDocToCloud('homework', id, item);
}
