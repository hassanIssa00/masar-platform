'use client';

import { syncDocToCloud, deleteDocFromCloud, readCloudCache, writeCloudCache } from './firestoreSync';
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

// ── Per-Student Records ────────────────────────────────────────────────────

export type StudentNote = {
  id: string;
  studentId: string;
  text: string;
  createdAt: string;
};

export type StudentHomeworkLog = {
  id: string;
  studentId: string;
  title: string;
  subject: string;
  dueDate: string;
  grade?: number; // out of 10
  status: 'submitted' | 'late' | 'missing';
  teacherFeedback?: string;
  createdAt: string;
};

export type StudentCertificateLog = {
  id: string;
  studentId: string;
  title: string;
  programTitle: string;
  completionDate: string;
  score: number;
  createdAt: string;
};

// ── Storage keys & Cloud collections for per-student records ──────────────
const NOTES_KEY = 'masar_student_notes_v1';
const HW_LOG_KEY = 'masar_student_hw_logs_v1';
const CERT_LOG_KEY = 'masar_student_cert_logs_v1';
const CLOUD_NOTES = 'student_notes';
const CLOUD_HW_LOGS = 'student_homework_logs';
const CLOUD_CERT_LOGS = 'student_cert_logs';

function readList<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  return readCloudCache<T>(key);
}
function writeList<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return;
  writeCloudCache(key, data);
}

// ── Student Notes ─────────────────────────────────────────────────────────
export function getStudentNotes(studentId: string): StudentNote[] {
  return readList<StudentNote>(NOTES_KEY).filter(n => n.studentId === studentId);
}
export function saveStudentNote(note: Omit<StudentNote, 'id' | 'createdAt'>): StudentNote {
  const all = readList<StudentNote>(NOTES_KEY);
  const newNote: StudentNote = { ...note, id: `note-${Date.now()}`, createdAt: new Date().toISOString() };
  writeList(NOTES_KEY, [newNote, ...all]);
  syncDocToCloud(CLOUD_NOTES, newNote.id, newNote);
  return newNote;
}
export function deleteStudentNote(noteId: string) {
  writeList(NOTES_KEY, readList<StudentNote>(NOTES_KEY).filter(n => n.id !== noteId));
  deleteDocFromCloud(CLOUD_NOTES, noteId);
}

// ── Student Homework Logs ─────────────────────────────────────────────────
export function getStudentHomeworkLogs(studentId: string): StudentHomeworkLog[] {
  return readList<StudentHomeworkLog>(HW_LOG_KEY).filter(h => h.studentId === studentId);
}
export function saveStudentHomeworkLog(log: Omit<StudentHomeworkLog, 'id' | 'createdAt'> & { id?: string }): StudentHomeworkLog {
  const all = readList<StudentHomeworkLog>(HW_LOG_KEY);
  const existing = log.id ? all.findIndex(h => h.id === log.id) : -1;
  const newLog: StudentHomeworkLog = { ...log, id: log.id || `hw-log-${Date.now()}`, createdAt: new Date().toISOString() };
  if (existing >= 0) { all[existing] = newLog; writeList(HW_LOG_KEY, all); }
  else { writeList(HW_LOG_KEY, [newLog, ...all]); }
  syncDocToCloud(CLOUD_HW_LOGS, newLog.id, newLog);
  return newLog;
}
export function deleteStudentHomeworkLog(id: string) {
  writeList(HW_LOG_KEY, readList<StudentHomeworkLog>(HW_LOG_KEY).filter(h => h.id !== id));
  deleteDocFromCloud(CLOUD_HW_LOGS, id);
}

// ── Student Certificate Logs ──────────────────────────────────────────────
export function getStudentCertificateLogs(studentId: string): StudentCertificateLog[] {
  return readList<StudentCertificateLog>(CERT_LOG_KEY).filter(c => c.studentId === studentId);
}
export function saveStudentCertificateLog(log: Omit<StudentCertificateLog, 'id' | 'createdAt'>): StudentCertificateLog {
  const all = readList<StudentCertificateLog>(CERT_LOG_KEY);
  const newLog: StudentCertificateLog = { ...log, id: `cert-log-${Date.now()}`, createdAt: new Date().toISOString() };
  writeList(CERT_LOG_KEY, [newLog, ...all]);
  syncDocToCloud(CLOUD_CERT_LOGS, newLog.id, newLog);
  return newLog;
}
export function deleteStudentCertificateLog(id: string) {
  writeList(CERT_LOG_KEY, readList<StudentCertificateLog>(CERT_LOG_KEY).filter(c => c.id !== id));
  deleteDocFromCloud(CLOUD_CERT_LOGS, id);
}

const CLASS_STUDENTS_KEY = 'masar_class_students_v1';
const CLOUD_COLLECTION = 'class_students';

export function getClassStudents(): ClassStudentRecord[] {
  if (typeof window === 'undefined') return [];
  const list = readCloudCache<ClassStudentRecord>(CLASS_STUDENTS_KEY);

  // ☁️ Auto-sync: If there are students or accounts registered under IKHLAS_JEDDAH or classroom flow
  try {
    const mainStudents = readCloudCache<any>('masar.students.v1');
    const existingNames = new Set(list.map((s) => s.fullName.trim().toLowerCase()));

    let hasNew = false;
    mainStudents.forEach((ms: any) => {
      const isClassStudent =
        ms.schoolBranch === 'IKHLAS_JEDDAH' ||
        ms.branch === 'IKHLAS_JEDDAH' ||
        (ms.grade && ms.grade.includes('فصل')) ||
        (ms.fullName && ms.fullName.includes('ربيع')) ||
        ms.source === 'ikhlas-jeddah';

      const normName = (ms.fullName || '').trim().toLowerCase();
      if (isClassStudent && normName && !existingNames.has(normName)) {
        const clsRecord: ClassStudentRecord = {
          id: ms.id || `cls-${Date.now()}`,
          fullName: ms.fullName,
          fullNameEn: ms.fullNameEn || '',
          grade: ms.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
          nationalId: ms.nationalId || '',
          dateOfBirth: ms.dateOfBirth || '',
          parentName: ms.parentName || '',
          parentPhone: ms.parentPhone || '',
          photoUrl: ms.photoUrl || '',
          notes: ms.notes || '',
          assignedProgram: ms.assignedProgram || 'reading',
          assignedPrograms: ms.assignedPrograms || ['reading'],
          createdAt: ms.createdAt || new Date().toISOString(),
          updatedAt: ms.updatedAt || new Date().toISOString(),
        };
        list.push(clsRecord);
        existingNames.add(normName);
        hasNew = true;
        void syncDocToCloud(CLOUD_COLLECTION, clsRecord.id, clsRecord);
      }
    });

    if (hasNew) {
      writeCloudCache(CLASS_STUDENTS_KEY, list);
    }
  } catch (err) {
    console.warn('classDb sync warning:', err);
  }

  return list;
}

export async function fetchClassStudentsFromCloud(): Promise<ClassStudentRecord[]> {
  try {
    const snap = await getDocs(collection(db, CLOUD_COLLECTION));
    if (!snap.empty) {
      const items = snap.docs.map((d) => d.data() as ClassStudentRecord);
      writeList(CLASS_STUDENTS_KEY, items);
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
      grade: student.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
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

  writeList(CLASS_STUDENTS_KEY, list);

  // ☁️ Sync directly to Server Database Cloud
  syncDocToCloud(CLOUD_COLLECTION, target.id, target);

  return target;
}

export function deleteClassStudent(id: string): void {
  const list = getClassStudents().filter((s) => s.id !== id);
  writeList(CLASS_STUDENTS_KEY, list);

  // ☁️ Delete from Server Database Cloud
  deleteDocFromCloud(CLOUD_COLLECTION, id);
}

export function getClassParents(): ClassParentRecord[] {
  const students = getClassStudents();
  return students.map((s) => ({
    id: `prt-${s.id}`,
    name: s.parentName || '',
    phone: s.parentPhone || '',
    email: '',
    studentId: s.id,
    studentName: s.fullName,
    createdAt: s.createdAt,
  }));
}
