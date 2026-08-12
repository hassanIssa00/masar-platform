'use client';

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
const CLASS_PARENTS_KEY = 'masar_class_parents_v1';

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
      return INITIAL_CLASS_STUDENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CLASS_STUDENTS;
  }
}

export function saveClassStudent(student: Partial<ClassStudentRecord> & { fullName: string }): ClassStudentRecord {
  const list = getClassStudents();
  const now = new Date().toISOString();
  const existingIndex = list.findIndex((s) => s.id === student.id);

  if (existingIndex >= 0) {
    const updated: ClassStudentRecord = {
      ...list[existingIndex],
      ...student,
      updatedAt: now,
    };
    list[existingIndex] = updated;
    if (typeof window !== 'undefined') {
      localStorage.setItem(CLASS_STUDENTS_KEY, JSON.stringify(list));
    }
    return updated;
  } else {
    const newStudent: ClassStudentRecord = {
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
    list.unshift(newStudent);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CLASS_STUDENTS_KEY, JSON.stringify(list));
    }
    return newStudent;
  }
}

export function deleteClassStudent(id: string): void {
  const list = getClassStudents().filter((s) => s.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(CLASS_STUDENTS_KEY, JSON.stringify(list));
  }
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
