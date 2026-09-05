'use client';

import { syncDocToCloud, deleteDocFromCloud, readCloudCache, writeCloudCache } from './firestoreSync';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { normalizeArabicText, isStudentNameMatch } from './nameMatching';

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
  studentLastLoginAt?: string;
  parentLastLoginAt?: string;
  studentLastActiveAt?: string;
  parentLastActiveAt?: string;
  lastLoginAt?: string;
  lastActiveAt?: string;
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
  parentLastLoginAt?: string;
  parentLastActiveAt?: string;
  studentLastLoginAt?: string;
  studentLastActiveAt?: string;
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
  studentName?: string;
  title: string;
  subject: string;
  dueDate: string;
  grade?: number; // out of 10
  status: 'assigned' | 'submitted' | 'late' | 'missing';
  teacherFeedback?: string;
  createdAt: string;
};

export type StudentCertificateLog = {
  id: string;
  studentId: string;
  studentName?: string;
  title: string;
  subTitle?: string;
  programTitle: string;
  achievement?: string;
  ratingText?: string;
  completionDate: string;
  score: number;
  doctorName?: string;
  doctorTitle?: string;
  studentPrefix?: string;
  gradeLabel?: string;
  achievementIntro?: string;
  note?: string;
  certNumber?: string;
  badge?: string;
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
export function getStudentHomeworkLogs(studentId: string, studentName?: string): StudentHomeworkLog[] {
  return readList<StudentHomeworkLog>(HW_LOG_KEY).filter(h => {
    if (studentId && (h.studentId === studentId || h.studentId === 'all')) return true;
    if (studentName && (h as any).studentName && isStudentNameMatch(studentName, (h as any).studentName)) return true;
    return false;
  });
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
export function getStudentCertificateLogs(studentId: string, studentName?: string): StudentCertificateLog[] {
  return readList<StudentCertificateLog>(CERT_LOG_KEY).filter(c => {
    if (studentId && (c.studentId === studentId || c.studentId === 'all')) return true;
    if (studentName && c.studentName && isStudentNameMatch(studentName, c.studentName)) return true;
    return false;
  });
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

// DEFAULT_CLASS_STUDENTS was removed — dummy data must never exist in the codebase.
// Students are only added via saveClassStudent() or fetchClassStudentsFromCloud().



const CLASS_STUDENTS_KEY = 'masar_class_students_v1';
const CLOUD_COLLECTION = 'class_students';

export function getClassStudents(): ClassStudentRecord[] {
  if (typeof window === 'undefined') return [];
  const list = readCloudCache<ClassStudentRecord>(CLASS_STUDENTS_KEY);

  // NOTE: No auto-seeding of DEFAULT_CLASS_STUDENTS.
  // Deleted students must never come back automatically.
  // The list is only populated via saveClassStudent() or fetchClassStudentsFromCloud().

  // ☁️ Auto-sync: merge any students registered under IKHLAS_JEDDAH from the main students store
  try {
    const mainStudents = readCloudCache<any>('masar.students.v1');
    const existingNames = new Set(list.map((s) => s.fullName.trim().toLowerCase()));

    let hasNew = false;
    mainStudents.forEach((ms: any) => {
      // ONLY add if explicitly marked as this class branch — never use name heuristics
      const isClassStudent =
        ms.schoolBranch === 'IKHLAS_JEDDAH' ||
        ms.branch === 'IKHLAS_JEDDAH';

      const normName = (ms.fullName || '').trim().toLowerCase();
      if (isClassStudent && normName && !existingNames.has(normName)) {
        const clsRecord: ClassStudentRecord = {
          id: ms.id || `cls-${Date.now()}`,
          fullName: ms.fullName,
          fullNameEn: ms.fullNameEn || '',
          grade: ms.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
          nationalId: ms.nationalId || '',
          dateOfBirth: ms.dateOfBirth || '',
          parentName: ms.parentName || `ولي أمر ${ms.fullName}`,
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
    parentLastLoginAt: s.parentLastLoginAt,
    parentLastActiveAt: s.parentLastActiveAt,
    studentLastLoginAt: s.studentLastLoginAt || s.lastLoginAt,
    studentLastActiveAt: s.studentLastActiveAt || s.lastActiveAt,
    createdAt: s.createdAt,
  }));
}

// ═══════════════════════════════════════════════════════
//  STUDENT BADGES / MEDALS SYSTEM
// ═══════════════════════════════════════════════════════

const BADGES_KEY = 'masar_student_badges_v1';
const BADGES_CLOUD = 'studentBadges';

export type StudentBadgeRecord = {
  id: string;
  studentId: string;
  studentName: string;
  badgeId: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  color: string;
  note?: string;
  awardedBy: string;
  awardedAt: string;
  createdAt: string;
};

// Available badge templates that Dr. Ismail can send
export const BADGE_TEMPLATES = [
  {
    badgeId: 'b1',
    title: 'وسام الالتزام الصفي والريادة',
    description: 'مُنح للالتزام الدائم وحضور الحصص والتفاعل الإيجابي مع د. إسماعيل عيسى.',
    icon: '🥇',
    category: 'الانضباط والالتزام',
    points: 150,
    color: 'from-amber-400 to-amber-600',
  },
  {
    badgeId: 'b2',
    title: 'وسام بطل القراءة والطلاقة',
    description: 'مُنح لإتقان مهارات القراءة ونطق الأصوات والكلمات بطلاقة.',
    icon: '📖',
    category: 'لغتي العربية',
    points: 200,
    color: 'from-emerald-500 to-teal-700',
  },
  {
    badgeId: 'b3',
    title: 'وسام العبقرية والمسائل الحسابية',
    description: 'مُنح للحلول المتميزة للتمارين والعمليات الحسابية بدقة وذكاء.',
    icon: '🧮',
    category: 'الرياضيات',
    points: 180,
    color: 'from-blue-500 to-indigo-700',
  },
  {
    badgeId: 'b4',
    title: 'وسام الخط العربي الجميل والتنظيم',
    description: 'مُنح لحسن الترتيب والكتابة بخط واضح ومرتب في كراسة الواجبات.',
    icon: '✍️',
    category: 'الإملاء والخط',
    points: 120,
    color: 'from-violet-500 to-purple-700',
  },
  {
    badgeId: 'b5',
    title: 'وسام التطور الأكاديمي السريع',
    description: 'مُنح لتحقيق قفزة نوعية وتقدم ملموس في اكتساب المهارات.',
    icon: '🚀',
    category: 'التطور المستمر',
    points: 250,
    color: 'from-rose-500 to-pink-700',
  },
  {
    badgeId: 'b6',
    title: 'درع التفوق الفصلي الشامل 🏆',
    description: 'أعلى وسام تقديري يُمنح للطلاب المتميزين في نهاية الفترة التعليمية.',
    icon: '👑',
    category: 'التفوق العام',
    points: 500,
    color: 'from-amber-500 via-yellow-400 to-amber-600',
  },
];

export function saveBadge(data: Omit<StudentBadgeRecord, 'id' | 'createdAt'>): StudentBadgeRecord {
  const all = readCloudCache<StudentBadgeRecord>(BADGES_KEY);
  const record: StudentBadgeRecord = {
    ...data,
    id: `badge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  all.push(record);
  writeCloudCache(BADGES_KEY, all);
  syncDocToCloud(BADGES_CLOUD, record.id, record);
  return record;
}

export function getStudentBadges(studentId: string, studentName?: string): StudentBadgeRecord[] {
  const all = readCloudCache<StudentBadgeRecord>(BADGES_KEY);
  return all.filter((b) => {
    if (studentId && (b.studentId === studentId || b.studentId === 'all')) return true;
    if (studentName && b.studentName && isStudentNameMatch(studentName, b.studentName)) return true;
    return false;
  });
}

export function getAllBadges(): StudentBadgeRecord[] {
  return readCloudCache<StudentBadgeRecord>(BADGES_KEY);
}

