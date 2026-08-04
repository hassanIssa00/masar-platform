'use client';

import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export type QuestionType = 'multiple-choice' | 'true-false' | 'rating-scale' | 'observation' | 'open-text';

export interface AssessmentQuestion {
  id: string;
  type: QuestionType;
  text: string;
  options?: string[];
  correctAnswer?: string | number;
  domain: string;
  weight: number;
}

export interface AssessmentTemplate {
  id: string;
  title: string;
  description: string;
  targetAge: string;
  domains: string[];
  questions: AssessmentQuestion[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentResult {
  id: string;
  templateId: string;
  templateTitle: string;
  studentId: string;
  studentName: string;
  answers: Record<string, string | number>;
  scores: Record<string, number>;
  totalScore: number;
  completedAt: string;
  conductedBy: string;
  notes: string;
}

const TMPL_KEY = 'masar.assessmentTemplates.v1';
const RESULTS_KEY = 'masar.assessmentResults.v1';

export function getTemplates(): AssessmentTemplate[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(TMPL_KEY) || '[]'); } catch { return []; }
}

export function getResults(): AssessmentResult[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RESULTS_KEY) || '[]'); } catch { return []; }
}

export async function createTemplate(data: Omit<AssessmentTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssessmentTemplate> {
  const now = new Date().toISOString();
  const item: AssessmentTemplate = {
    ...data,
    id: `tmpl_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    createdAt: now,
    updatedAt: now,
  };
  localStorage.setItem(TMPL_KEY, JSON.stringify([item, ...getTemplates()]));
  try { await addDoc(collection(db, 'assessment_templates'), item); } catch {}
  return item;
}

export function deleteTemplate(id: string) {
  localStorage.setItem(TMPL_KEY, JSON.stringify(getTemplates().filter(t => t.id !== id)));
}

export async function saveResult(data: Omit<AssessmentResult, 'id'>): Promise<AssessmentResult> {
  const item: AssessmentResult = { ...data, id: `res_${Date.now()}` };
  localStorage.setItem(RESULTS_KEY, JSON.stringify([item, ...getResults()]));
  try { await addDoc(collection(db, 'assessment_results'), item); } catch {}
  return item;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  'multiple-choice': 'اختيار من متعدد',
  'true-false': 'صح أو خطأ',
  'rating-scale': 'مقياس التقدير 1-5',
  'observation': 'ملاحظة مباشرة',
  'open-text': 'إجابة مفتوحة',
};
