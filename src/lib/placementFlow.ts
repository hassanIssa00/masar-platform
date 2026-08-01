'use client';

import { PlacementGradeKey } from '@/data/placementAssessments';

export type EntryGradeKey = PlacementGradeKey | 'learning-difficulties';

export const entryGradeOptions: Array<{ key: EntryGradeKey; label: string; assessmentKey: PlacementGradeKey }> = [
  { key: 'general', label: 'المستوى العام الجامع', assessmentKey: 'general' },
  { key: 'g1', label: 'الصف الأول الابتدائي', assessmentKey: 'g1' },
  { key: 'g2', label: 'الصف الثاني الابتدائي', assessmentKey: 'g2' },
  { key: 'g3', label: 'الصف الثالث الابتدائي', assessmentKey: 'g3' },
  { key: 'g4', label: 'الصف الرابع الابتدائي', assessmentKey: 'g4' },
  { key: 'g5', label: 'الصف الخامس الابتدائي', assessmentKey: 'g5' },
  { key: 'g6', label: 'الصف السادس الابتدائي', assessmentKey: 'g6' },
  { key: 'learning-difficulties', label: 'صعوبات التعلم', assessmentKey: 'general' },
];

export function getAssessmentKey(value: string): PlacementGradeKey {
  return entryGradeOptions.find((item) => item.key === value)?.assessmentKey ?? 'general';
}

export function getEntryGradeLabel(value: string) {
  return entryGradeOptions.find((item) => item.key === value)?.label ?? 'المستوى العام الجامع';
}

export function saveEntryGrade(value: string) {
  const assessmentKey = getAssessmentKey(value);
  localStorage.setItem('masar.entry-grade', value);
  localStorage.setItem('masar.assessment.gradeKey', assessmentKey);
  return assessmentKey;
}

export function getAssessmentHref(value: string) {
  return `/assessment?level=${getAssessmentKey(value)}`;
}
