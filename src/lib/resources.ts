'use client';

import { deleteDocFromCloud, readCloudCache, syncDocToCloud, writeCloudCache } from './firestoreSync';

export type ResourceCategory = 'worksheet' | 'activity' | 'video' | 'article' | 'tool' | 'assessment';
export type ResourceDomain = 'reading' | 'math' | 'speech' | 'social' | 'motor' | 'behavioral' | 'cognitive';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ResourceItem {
  id: string;
  title: string;
  description: string;
  category: ResourceCategory;
  domain: ResourceDomain;
  difficulty: DifficultyLevel;
  ageRange: string;
  fileUrl?: string;
  fileType?: 'pdf' | 'image' | 'video' | 'link';
  tags: string[];
  uploadedBy: string;
  downloads: number;
  createdAt: string;
}

const LOCAL_KEY = 'masar.resources.v1';

export function getLocalResources(): ResourceItem[] {
  if (typeof window === 'undefined') return [];
  return readCloudCache<ResourceItem>(LOCAL_KEY);
}

export async function createResource(data: Omit<ResourceItem, 'id' | 'createdAt' | 'downloads'>): Promise<ResourceItem> {
  const item: ResourceItem = {
    ...data,
    id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    downloads: 0,
    createdAt: new Date().toISOString(),
  };
  writeCloudCache(LOCAL_KEY, [item, ...getLocalResources()]);
  await syncDocToCloud('resources', item.id, item);
  return item;
}

export function deleteResource(id: string) {
  writeCloudCache(LOCAL_KEY, getLocalResources().filter(r => r.id !== id));
  deleteDocFromCloud('resources', id);
}

export function incrementDownload(id: string) {
  const updated = getLocalResources().map(r => r.id === id ? { ...r, downloads: r.downloads + 1 } : r);
  writeCloudCache(LOCAL_KEY, updated);
  const item = updated.find((r) => r.id === id);
  if (item) syncDocToCloud('resources', id, item);
}

export const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  worksheet: 'ورقة عمل',
  activity: 'نشاط علاجي',
  video: 'فيديو تعليمي',
  article: 'مقال علمي',
  tool: 'أداة تقييم',
  assessment: 'اختبار معياري',
};

export const DOMAIN_LABELS_RES: Record<ResourceDomain, string> = {
  reading: 'قراءة وكتابة',
  math: 'رياضيات',
  speech: 'نطق ولغة',
  social: 'مهارات اجتماعية',
  motor: 'مهارات حركية',
  behavioral: 'سلوك وتنظيم',
  cognitive: 'معرفة وانتباه',
};

export const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  beginner: 'مبتدئ',
  intermediate: 'متوسط',
  advanced: 'متقدم',
};
