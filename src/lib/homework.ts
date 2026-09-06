'use client';

import { deleteDocFromCloud, readCloudCache, syncDocToCloud, writeCloudCache } from './firestoreSync';

export interface HomeworkRecord {
  id: string;
  studentId: string;
  studentName: string;
  studentAccountId?: string;
  parentAccountId?: string;
  parentPhone?: string;
  parentName?: string;
  title: string;
  description: string;
  dueDate: string;
  status: 'assigned' | 'submitted' | 'reviewed';
  type?: 'TEXT' | 'CURRICULUM' | 'MULTIPLE_CHOICE' | 'QUIZ';
  subjectSlug?: string;
  subjectTitle?: string;
  fromPage?: number;
  toPage?: number;
  grade?: number | string; // score out of 10 or 100
  questions?: Array<{
    id?: string | number;
    text?: string;
    question?: string;
    options?: string[];
    correctAnswer?: string;
    correctAnswerIndex?: number;
    explanation?: string;
  }>;
  submissionAnswers?: any;
  parentNotes?: string;
  doctorFeedback?: string;
  createdAt: string;
  updatedAt?: string;
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

export async function createHomework(
  hw: Omit<HomeworkRecord, 'id' | 'createdAt' | 'status'> & { id?: string; status?: HomeworkRecord['status']; createdAt?: string }
): Promise<HomeworkRecord> {
  const current = getLocalHomework();
  const id = hw.id || `hw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const status = hw.status || 'assigned';
  const createdAt = hw.createdAt || new Date().toISOString();

  const item: HomeworkRecord = {
    ...hw,
    id,
    status,
    createdAt,
    updatedAt: new Date().toISOString(),
  };

  const existingIdx = current.findIndex((h) => h.id === id);
  let updated: HomeworkRecord[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = item;
  } else {
    updated = [item, ...current];
  }

  saveLocalHomework(updated);
  await syncDocToCloud('homework', item.id, item);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('masar:cloud-cache-update', { detail: { key: LOCAL_KEY } }));
  }

  return item;
}

export function updateHomeworkStatus(
  id: string,
  status: HomeworkRecord['status'],
  parentNotes?: string,
  optionsOrGrade?: { grade?: number | string; doctorFeedback?: string; quizScore?: number; correctCount?: number; totalQuestions?: number; answers?: any } | number | string
) {
  const resolvedGrade = typeof optionsOrGrade === 'number' || typeof optionsOrGrade === 'string' ? optionsOrGrade : optionsOrGrade?.grade;
  const resolvedDoctorFeedback = typeof optionsOrGrade === 'object' && optionsOrGrade !== null ? optionsOrGrade.doctorFeedback : (status === 'reviewed' ? parentNotes : undefined);
  const extraSubmissionAnswers = typeof optionsOrGrade === 'object' && optionsOrGrade !== null && (optionsOrGrade.answers || optionsOrGrade.quizScore !== undefined) ? {
    answers: optionsOrGrade.answers,
    score: optionsOrGrade.quizScore,
    correctCount: optionsOrGrade.correctCount,
    totalQuestions: optionsOrGrade.totalQuestions,
  } : undefined;

  const current = getLocalHomework();
  const updated = current.map((h) =>
    h.id === id
      ? {
          ...h,
          status,
          parentNotes: parentNotes !== undefined ? parentNotes : h.parentNotes,
          grade: resolvedGrade !== undefined ? resolvedGrade : h.grade,
          doctorFeedback: resolvedDoctorFeedback !== undefined ? resolvedDoctorFeedback : h.doctorFeedback,
          submissionAnswers: extraSubmissionAnswers !== undefined ? extraSubmissionAnswers : h.submissionAnswers,
          updatedAt: new Date().toISOString(),
        }
      : h
  );
  saveLocalHomework(updated);
  const item = updated.find((h) => h.id === id);
  if (item) {
    void syncDocToCloud('homework', id, item);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('masar:cloud-cache-update', { detail: { key: LOCAL_KEY } }));
  }
}

export async function deleteHomework(id: string): Promise<void> {
  const current = getLocalHomework();
  const updated = current.filter((h) => h.id !== id);
  saveLocalHomework(updated);
  await deleteDocFromCloud('homework', id);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('masar:cloud-cache-update', { detail: { key: LOCAL_KEY, id } }));
  }
}
