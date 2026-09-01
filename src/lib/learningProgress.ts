'use client';

import { readCloudCache, syncDocToCloud, writeCloudCache } from './firestoreSync';

export const LEARNING_ACTIVITY_KEY = 'masar.studentLearningActivity.v1';
export const CURRICULUM_ASSIGNMENTS_KEY = 'masar.curriculumAssignments.v1';
export const CURRICULUM_DRAWINGS_KEY = 'masar.curriculumDrawings.v1';

export type StudentLearningActivity = {
  id: string;
  studentId: string;
  studentName?: string;
  type: 'open_curriculum_page' | 'save_curriculum_page' | 'submit_homework' | 'open_homework';
  subjectSlug?: string;
  subjectTitle?: string;
  page?: number;
  href?: string;
  createdAt: string;
};

export type CurriculumAssignmentRecord = {
  id?: string;
  studentId: string;
  studentName: string;
  subjectSlug: string;
  subjectTitle: string;
  fromPage: number;
  toPage: number;
  assignedAt: string;
};

export type CurriculumDrawingRecord = {
  id: string;
  studentId: string;
  subjectSlug: string;
  page: number;
  dataUrl: string;
  updatedAt: string;
};

export function getStudentLearningActivities(studentId?: string) {
  const items = readCloudCache<StudentLearningActivity>(LEARNING_ACTIVITY_KEY);
  const filtered = studentId ? items.filter((item) => item.studentId === studentId) : items;
  return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getCurriculumAssignments(studentId?: string) {
  const items = readCloudCache<CurriculumAssignmentRecord>(CURRICULUM_ASSIGNMENTS_KEY);
  return studentId ? items.filter((item) => item.studentId === studentId) : items;
}

export function getCurriculumDrawings(studentId?: string) {
  const items = readCloudCache<CurriculumDrawingRecord>(CURRICULUM_DRAWINGS_KEY);
  return studentId ? items.filter((item) => item.studentId === studentId) : items;
}

export function recordStudentLearningActivity(activity: Omit<StudentLearningActivity, 'id' | 'createdAt'>) {
  if (typeof window === 'undefined' || !activity.studentId) return null;
  const next: StudentLearningActivity = {
    ...activity,
    id: `learn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const current = getStudentLearningActivities();
  const dedupeKey = `${next.studentId}_${next.type}_${next.subjectSlug || ''}_${next.page || ''}`;
  const withoutRecentDuplicate = current.filter((item) => {
    const itemKey = `${item.studentId}_${item.type}_${item.subjectSlug || ''}_${item.page || ''}`;
    const ageMs = Date.now() - new Date(item.createdAt).getTime();
    return !(itemKey === dedupeKey && ageMs < 60_000);
  });
  const updated = [next, ...withoutRecentDuplicate].slice(0, 1000);
  writeCloudCache(LEARNING_ACTIVITY_KEY, updated);
  void syncDocToCloud('student_learning_activity', next.id, next);
  return next;
}
