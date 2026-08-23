'use client';

import { deleteDocFromCloud, readCloudCache, syncDocToCloud, writeCloudCache } from './firestoreSync';

export interface BranchRecord {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string;
  managerName: string;
  doctorIds: string[];
  activeStudents: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

const LOCAL_KEY = 'masar.branches.v1';

export function getLocalBranches(): BranchRecord[] {
  if (typeof window === 'undefined') return [];
  return readCloudCache<BranchRecord>(LOCAL_KEY);
}

export function saveLocalBranches(items: BranchRecord[]) {
  if (typeof window === 'undefined') return;
  writeCloudCache(LOCAL_KEY, items);
}

export async function createBranch(data: Omit<BranchRecord, 'id' | 'createdAt'>): Promise<BranchRecord> {
  const item: BranchRecord = {
    ...data,
    id: `branch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  };
  saveLocalBranches([item, ...getLocalBranches()]);
  await syncDocToCloud('branches', item.id, item);
  return item;
}

export function updateBranch(id: string, patch: Partial<BranchRecord>) {
  const updated = getLocalBranches().map(b => b.id === id ? { ...b, ...patch } : b);
  saveLocalBranches(updated);
  const item = updated.find((b) => b.id === id);
  if (item) syncDocToCloud('branches', id, item);
}

export function deleteBranch(id: string) {
  saveLocalBranches(getLocalBranches().filter(b => b.id !== id));
  deleteDocFromCloud('branches', id);
}
