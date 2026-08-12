'use client';

import { syncDocToCloud, deleteDocFromCloud } from './firestoreSync';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export type ClassStudentRecord = {
  id: string;
  fullName: string;
  fullNameEn?: string;
  grade: string;
  nationalId?: string;
  dateOfBirth?: string;
  parentName?: string;
  parentPhone?: string;
  photoUrl?: string;
  notes?: string;
  assignedProgram?: string;
  assignedPrograms?: string[];
  assignedBy?: string;
  assignedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ClassParentRecord = {
  id: string;
  name: string;
  phone: string;
  email: string;
  studentId: string;
  studentName: string;
  createdAt: string;
};

const CLASS_STUDENTS_KEY = 'masar_class_students_v1';
const CLOUD_COLLECTION = 'class_students';

const INITIAL_CLASS_STUDENTS: ClassStudentRecord[] = [
  {
    id: 'cls-std-001',
    fullName: 'انس ابراهيم محمد موافي',
    fullNameEn: 'Anas Ibrahim Mohamed Moafi',
    grade: 'الأول الابتدائي — فصل الإخلاص بجدة',
    nationalId: '1098234561',
    dateOfBirth: '2019-04-12',
    parentName: 'إبراهيم محمد موافي',
    parentPhone: '0551234567',
    assignedProgram: 'reading',
    assignedPrograms: ['reading', 'math'],
    createdAt: '2026-08-01T10:00:00Z',
    updatedAt: '2026-08-12T10:00:00Z',
  },
  {
    id: 'cls-std-002',
    fullName: 'أحمد إبراهيم علي إسماعيل',
    fullNameEn: 'Ahmed Ibrahim Ali Ismail',
    grade: 'الثاني الابتدائي — فصل الإخلاص بجدة',
    nationalId: '1087654321',
    dateOfBirth: '2018-09-20',
    parentName: 'إبراهيم علي إسماعيل',
    parentPhone: '0509876543',
    assignedProgram: 'math',
    assignedPrograms: ['math', 'learning-difficulties'],
    createdAt: '2026-08-05T10:00:00Z',
    updatedAt: '2026-08-12T10:00:00Z',
  },
];

export function getClassStudents(): ClassStudentRecord[] {
  if (typeof window === 'undefined') return INITIAL_CLASS_STUDENTS;
  try {
    const raw = localStorage.getItem(CLASS_STUDENTS_KEY);
    if (!raw) {
      localStorage.setItem(CLASS_STUDENTS_KEY, JSON.stringify(INITIAL_CLASS_STUDENTS));
      // Seed cloud with initial data
      INITIAL_CLASS_STUDENTS.forEach((s) => syncDocToCloud(CLOUD_COLLECTION, s.id, s));
      return INITIAL_CLASS_STUDENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CLASS_STUDENTS;
  }
}

export async function fetchClassStudentsFromCloud(): Promise<ClassStudentRecord[]> {
  try {
    const snap = await getDocs(collection(db, CLOUD_COLLECTION));
    if (!snap.empty) {
      const items = snap.docs.map((d) => d.data() as ClassStudentRecord);
      if (typeof window !== 'undefined') {
        localStorage.setItem(CLASS_STUDENTS_KEY, JSON.stringify(items));
      }
      return items;
    }
  } catch (e) {
    console.error('Error fetching class students from cloud DB:', e);
  }
  return getClassStudents();
}

export function saveClassStudent(student: Partial<ClassStudentRecord> & { fullName: string }): ClassStudentRecord {
  const list = getClassStudents();
  const now = new Date().toISOString();
  const existingIndex = list.findIndex((s) => s.id === student.id);

  let target: ClassStudentRecord;

  if (existingIndex >= 0) {
    target = {
      ...list[existingIndex],
      ...student,
      updatedAt: now,
    };
    list[existingIndex] = target;
  } else {
    target = {
      id: student.id || `cls-std-${Date.now()}`,
      fullName: student.fullName,
      fullNameEn: student.fullNameEn || '',
      grade: student.grade || 'الأول الابتدائي — فصل الإخلاص بجدة',
      nationalId: student.nationalId || '',
      dateOfBirth: student.dateOfBirth || '',
      parentName: student.parentName || '',
      parentPhone: student.parentPhone || '',
      photoUrl: student.photoUrl || '',
      notes: student.notes || '',
      assignedProgram: student.assignedProgram || 'reading',
      assignedPrograms: student.assignedPrograms || ['reading'],
      createdAt: now,
      updatedAt: now,
    };
    list.unshift(target);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(CLASS_STUDENTS_KEY, JSON.stringify(list));
  }

  // ☁️ Sync directly to Server Database Cloud
  syncDocToCloud(CLOUD_COLLECTION, target.id, target);

  return target;
}

export function deleteClassStudent(id: string): void {
  const list = getClassStudents().filter((s) => s.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(CLASS_STUDENTS_KEY, JSON.stringify(list));
  }

  // ☁️ Delete from Server Database Cloud
  deleteDocFromCloud(CLOUD_COLLECTION, id);
}

export function getClassParents(): ClassParentRecord[] {
  const students = getClassStudents();
  return students.map((s) => ({
    id: `prt-${s.id}`,
    name: s.parentName || `ولي أمر ${s.fullName.split(' ')[0]}`,
    phone: s.parentPhone || '0550000000',
    email: `parent.${s.id}@masarplatform.org`,
    studentId: s.id,
    studentName: s.fullName,
    createdAt: s.createdAt,
  }));
}
