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
  studentAccountId?: string;
  parentAccountId?: string;
  schoolBranch?: string;
  source?: string;
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
  studentAccountId?: string;
  parentAccountId?: string;
  parentPhone?: string;
  parentName?: string;
  title: string;
  subject: string;
  subjectSlug?: string;
  fromPage?: number;
  toPage?: number;
  dueDate: string;
  grade?: number | string; // out of 10 or '10/10'
  status: 'assigned' | 'submitted' | 'late' | 'missing' | 'reviewed';
  type?: 'CURRICULUM' | 'QUIZ' | 'TEXT';
  questions?: any[];
  teacherFeedback?: string;
  submissionAnswers?: Record<string, any>;
  submittedAt?: string;
  reviewedAt?: string;
  dispatchedToParent?: boolean;
  dispatchedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type StudentCertificateLog = {
  id: string;
  studentId: string;
  studentName?: string;
  studentAccountId?: string;
  parentAccountId?: string;
  parentPhone?: string;
  parentName?: string;
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
  dispatchedToParent?: boolean;
  dispatchedAt?: string;
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
  const normSearchName = studentName ? normalizeArabicText(studentName) : '';
  return readList<StudentHomeworkLog>(HW_LOG_KEY).filter(h => {
    if (!h) return false;
    // Strictly forbid 'all' for individual student homework logs
    if (h.studentId === 'all' || h.studentName === 'جميع طلاب الفصل') return false;

    // Direct ID match
    if (studentId) {
      if (h.studentId === studentId || h.studentAccountId === studentId || h.parentAccountId === studentId) return true;
      // If this log explicitly belongs to a DIFFERENT student ID, do NOT leak it via loose name match!
      if (h.studentId && h.studentId !== studentId && !h.studentId.startsWith('hw-log')) return false;
    }

    // Name match fallback only if studentId is not specified or log had no studentId
    if (normSearchName && h.studentName) {
      const normHwName = normalizeArabicText(h.studentName);
      if (normHwName === normSearchName) return true;
      if (isStudentNameMatch(studentName, h.studentName)) return true;
    }
    return false;
  });
}
export function saveStudentHomeworkLog(log: Omit<StudentHomeworkLog, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): StudentHomeworkLog {
  const all = readList<StudentHomeworkLog>(HW_LOG_KEY);
  const existing = log.id ? all.findIndex(h => h.id === log.id) : -1;

  let resolvedStudentAccountId = log.studentAccountId;
  let resolvedParentAccountId = log.parentAccountId;
  let resolvedParentPhone = log.parentPhone;
  let resolvedParentName = log.parentName;

  if ((!resolvedStudentAccountId || !resolvedParentAccountId || !resolvedParentPhone) && typeof window !== 'undefined') {
    try {
      const allAccounts = readList<any>('masar.accounts.v1');
      const allStudents = readList<any>('masar.students.v1');
      const classStudents = readList<any>(CLASS_STUDENTS_KEY);
      const pool = [...allStudents, ...classStudents];
      const targetStudent = pool.find((s: any) => s.id === log.studentId || (log.studentName && isStudentNameMatch(s.fullName, log.studentName)));
      if (targetStudent) {
        if (!resolvedParentPhone) resolvedParentPhone = targetStudent.parentPhone;
        if (!resolvedParentName) resolvedParentName = targetStudent.parentName;
        if (!resolvedStudentAccountId) resolvedStudentAccountId = (targetStudent as any).studentAccountId;
        if (!resolvedParentAccountId) resolvedParentAccountId = (targetStudent as any).parentAccountId;
      }
      if (!resolvedStudentAccountId && targetStudent) {
        const sAcc = allAccounts.find((a: any) => a.role === 'student' && (a.id === targetStudent.id || a.linkedStudentId === targetStudent.id || (targetStudent.fullName && a.name && isStudentNameMatch(a.name, targetStudent.fullName))));
        if (sAcc) resolvedStudentAccountId = sAcc.id;
      }
      if (!resolvedParentAccountId && targetStudent) {
        const pAcc = allAccounts.find((a: any) => a.role === 'parent' && ((a.phone && targetStudent.parentPhone && a.phone.slice(-8) === targetStudent.parentPhone.slice(-8)) || (targetStudent.parentName && a.name && isStudentNameMatch(a.name, targetStudent.parentName))));
        if (pAcc) resolvedParentAccountId = pAcc.id;
      }
    } catch {}
  }

  const newLog: StudentHomeworkLog = {
    ...log,
    id: log.id || `hw-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    studentAccountId: resolvedStudentAccountId,
    parentAccountId: resolvedParentAccountId,
    parentPhone: resolvedParentPhone,
    parentName: resolvedParentName,
    createdAt: log.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existing >= 0) {
    all[existing] = newLog;
    writeList(HW_LOG_KEY, all);
  } else {
    writeList(HW_LOG_KEY, [newLog, ...all]);
  }

  syncDocToCloud(CLOUD_HW_LOGS, newLog.id, newLog);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('masar:cloud-cache-update', { detail: { key: HW_LOG_KEY, id: newLog.id } }));
  }

  return newLog;
}
export function deleteStudentHomeworkLog(id: string) {
  writeList(HW_LOG_KEY, readList<StudentHomeworkLog>(HW_LOG_KEY).filter(h => h.id !== id));
  deleteDocFromCloud(CLOUD_HW_LOGS, id);
}

/**
 * Permanently delete an assignment and all its associated records across:
 * - curriculum_assignments & masar.curriculumAssignments.v1
 * - homework & masar.homework.v1
 * - student_homework_logs & masar_student_hw_logs_v1
 */
export async function deleteAssignmentPermanently(target: {
  id?: string;
  studentId?: string;
  studentName?: string;
  subjectSlug?: string;
  subjectTitle?: string;
  fromPage?: number;
  toPage?: number;
  title?: string;
}): Promise<void> {
  const targetId = target.id;
  const sId = target.studentId;
  const sSlug = target.subjectSlug;
  const fromP = target.fromPage;
  const targetTitle = target.title;

  // 1. Delete from curriculumAssignments cache & cloud
  const ASSIGNMENTS_KEY = 'masar.curriculumAssignments.v1';
  const currList = readList<any>(ASSIGNMENTS_KEY);
  const remainingCurr = currList.filter((a) => {
    if (targetId && a.id === targetId) return false;
    if (sId && sSlug && a.studentId === sId && a.subjectSlug === sSlug && (fromP === undefined || a.fromPage === fromP)) return false;
    return true;
  });
  writeList(ASSIGNMENTS_KEY, remainingCurr);
  if (targetId) {
    void deleteDocFromCloud('curriculum_assignments', targetId);
  }
  if (sId && sSlug) {
    void deleteDocFromCloud('curriculum_assignments', `${sId}_${sSlug}`);
  }

  // 2. Delete from homework cache & cloud
  const HW_KEY = 'masar.homework.v1';
  const hwList = readList<any>(HW_KEY);
  const remainingHw = hwList.filter((h) => {
    if (targetId && h.id === targetId) return false;
    if (targetTitle && h.title === targetTitle && (!sId || h.studentId === sId)) return false;
    if (sId && sSlug && h.studentId === sId && h.subjectSlug === sSlug && (fromP === undefined || h.fromPage === fromP)) return false;
    return true;
  });
  writeList(HW_KEY, remainingHw);
  if (targetId) {
    void deleteDocFromCloud('homework', targetId);
  }

  // 3. Delete from studentHomeworkLogs cache & cloud
  const hwLogs = readList<any>(HW_LOG_KEY);
  const toDeleteLogs: string[] = [];
  const remainingLogs = hwLogs.filter((l) => {
    const matchId = targetId && l.id === targetId;
    const matchTitle = targetTitle && l.title === targetTitle && (!sId || l.studentId === sId);
    const matchSubject = sId && sSlug && l.studentId === sId && (l.subjectSlug === sSlug || l.subject === target.subjectTitle) && (fromP === undefined || l.fromPage === fromP);
    if (matchId || matchTitle || matchSubject) {
      if (l.id) toDeleteLogs.push(l.id);
      return false;
    }
    return true;
  });
  writeList(HW_LOG_KEY, remainingLogs);
  toDeleteLogs.forEach((id) => deleteDocFromCloud(CLOUD_HW_LOGS, id));
  if (targetId && !toDeleteLogs.includes(targetId)) {
    deleteDocFromCloud(CLOUD_HW_LOGS, targetId);
  }

  // 4. Dispatch cloud cache update events
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('masar:cloud-cache-update', { detail: { key: ASSIGNMENTS_KEY } }));
    window.dispatchEvent(new CustomEvent('masar:cloud-cache-update', { detail: { key: HW_KEY } }));
    window.dispatchEvent(new CustomEvent('masar:cloud-cache-update', { detail: { key: HW_LOG_KEY } }));
    window.dispatchEvent(new CustomEvent('storage'));
  }
}

// ── Student Certificate Logs ──────────────────────────────────────────────
export function getStudentCertificateLogs(studentId: string, studentName?: string): StudentCertificateLog[] {
  const normSearchName = studentName ? normalizeArabicText(studentName) : '';
  return readList<StudentCertificateLog>(CERT_LOG_KEY).filter(c => {
    if (!c || c.studentId === 'all' || c.studentName === 'جميع طلاب الفصل') return false;
    if (studentId) {
      if (c.studentId === studentId || c.studentAccountId === studentId) return true;
      if (c.studentId && c.studentId !== studentId && !c.studentId.startsWith('cert-log')) return false;
    }
    if (normSearchName && c.studentName) {
      const normCertName = normalizeArabicText(c.studentName);
      if (normCertName === normSearchName) return true;
      if (isStudentNameMatch(studentName, c.studentName)) return true;
    }
    return false;
  });
}

export function saveStudentCertificateLog(log: Omit<StudentCertificateLog, 'id' | 'createdAt'> & { id?: string }): StudentCertificateLog {
  const all = readList<StudentCertificateLog>(CERT_LOG_KEY);
  
  let parentPhone = log.parentPhone;
  let parentName = log.parentName;
  let parentAccountId = log.parentAccountId;
  let studentAccountId = log.studentAccountId;
  
  if (!parentPhone || !parentAccountId || !studentAccountId || !parentName) {
    try {
      const allClass = readList<any>(CLASS_STUDENTS_KEY);
      const allMasar = readList<any>('masar.students.v1');
      const allPool = [...allClass, ...allMasar];
      const match = allPool.find(s => 
        (s.id && s.id === log.studentId) || 
        (log.studentName && s.fullName && isStudentNameMatch(s.fullName, log.studentName))
      );
      if (match) {
        parentPhone = parentPhone || match.parentPhone;
        parentName = parentName || match.parentName;
        parentAccountId = parentAccountId || match.parentAccountId || match.linkedParentId;
        studentAccountId = studentAccountId || match.studentAccountId || match.linkedStudentId;
      }
    } catch {}
  }

  const certNumber = log.certNumber || `MASAR-CERT-2026-${Math.floor(10000 + Math.random() * 90000)}`;
  const newLog: StudentCertificateLog = {
    ...log,
    id: log.id || `cert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    certNumber,
    parentPhone,
    parentName,
    parentAccountId,
    studentAccountId,
    dispatchedToParent: log.dispatchedToParent ?? true,
    dispatchedAt: log.dispatchedAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  const existingIndex = all.findIndex(c => c.id === newLog.id || (newLog.certNumber && c.certNumber === newLog.certNumber));
  if (existingIndex >= 0) {
    all[existingIndex] = newLog;
    writeList(CERT_LOG_KEY, all);
  } else {
    writeList(CERT_LOG_KEY, [newLog, ...all]);
  }

  syncDocToCloud(CLOUD_CERT_LOGS, newLog.id, newLog);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('masar:cloud-cache-update', { detail: { collection: CLOUD_CERT_LOGS, id: newLog.id } }));
  }
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

  // 🛡️ Filter out any rogue non-class students (e.g. MASAR platform students like Ahmed Fares)
  let activeClassList: ClassStudentRecord[] = [];
  try {
    const mainStudents = readCloudCache<any>('masar.students.v1');
    let hadPruned = false;

    list.forEach((s) => {
      const matchMain = mainStudents.find(
        (ms: any) => ms.id === s.id || (ms.fullName && s.fullName && isStudentNameMatch(ms.fullName, s.fullName))
      );

      const isMasarPlatformOnly =
        s.schoolBranch === 'MASAR' ||
        (matchMain && matchMain.schoolBranch === 'MASAR') ||
        (matchMain && matchMain.schoolBranch !== 'IKHLAS_JEDDAH' && matchMain.branch !== 'IKHLAS_JEDDAH' && (!matchMain.grade || !matchMain.grade.includes('فصل')) && (!matchMain.fullName || !matchMain.fullName.includes('ربيع'))) ||
        (s.fullName && (s.fullName.includes('فارس عبد الله') || s.fullName.includes('احمد فارس')) && s.schoolBranch !== 'IKHLAS_JEDDAH');

      if (isMasarPlatformOnly) {
        hadPruned = true;
        deleteDocFromCloud(CLOUD_COLLECTION, s.id);
      } else {
        const cleanedFullName = cleanClassStudentName(s.fullName);
        activeClassList.push(cleanedFullName !== s.fullName ? { ...s, fullName: cleanedFullName } : s);
      }
    });

    if (hadPruned) {
      writeCloudCache(CLASS_STUDENTS_KEY, activeClassList);
    }

    // ☁️ Auto-sync: merge any students registered under IKHLAS_JEDDAH from the main students store
    const existingNames = new Set(activeClassList.map((s) => s.fullName.trim().toLowerCase()));

    let hasNew = false;
    let hasUpdated = false;
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
          schoolBranch: 'IKHLAS_JEDDAH',
          source: 'ikhlas-jeddah',
          createdAt: ms.createdAt || new Date().toISOString(),
          updatedAt: ms.updatedAt || new Date().toISOString(),
        };
        activeClassList.push(clsRecord);
        existingNames.add(normName);
        hasNew = true;
        void syncDocToCloud(CLOUD_COLLECTION, clsRecord.id, clsRecord);
      } else if (isClassStudent && normName && ms.photoUrl) {
        // Also update photoUrl on EXISTING class students if the main store has a photo they're missing
        const existingIdx = activeClassList.findIndex((s) => s.fullName.trim().toLowerCase() === normName || s.id === ms.id);
        if (existingIdx >= 0 && !activeClassList[existingIdx].photoUrl) {
          activeClassList[existingIdx] = { ...activeClassList[existingIdx], photoUrl: ms.photoUrl, updatedAt: new Date().toISOString() };
          hasUpdated = true;
          void syncDocToCloud(CLOUD_COLLECTION, activeClassList[existingIdx].id, activeClassList[existingIdx]);
        }
      }
    });

    if (hasNew || hasUpdated) {
      writeCloudCache(CLASS_STUDENTS_KEY, activeClassList);
    }
  } catch (err) {
    console.warn('classDb sync warning:', err);
    activeClassList = list;
  }

  return activeClassList;
}

export async function fetchClassStudentsFromCloud(): Promise<ClassStudentRecord[]> {
  try {
    const snap = await getDocs(collection(db, CLOUD_COLLECTION));
    if (!snap.empty) {
      const items = snap.docs.map((d) => d.data() as ClassStudentRecord);
      const cleanItems = items.filter((s) => {
        const isMasar =
          s.schoolBranch === 'MASAR' ||
          (s.fullName && (s.fullName.includes('فارس عبد الله') || s.fullName.includes('احمد فارس')) && s.schoolBranch !== 'IKHLAS_JEDDAH');
        return !isMasar;
      });
      writeList(CLASS_STUDENTS_KEY, cleanItems);
      return cleanItems;
    }
  } catch (e) {
    console.error('Error fetching class students from cloud DB:', e);
  }
  return getClassStudents();
}

export function cleanClassStudentName(name?: string | null): string {
  if (!name) return '';
  const trimmed = name.trim();
  // Clean accidental prefix e.g. "فصل احمد ابراهيم زويل" -> "احمد ابراهيم زويل"
  const cleaned = trimmed.replace(/^فصل\s*[:\-–\/]?\s*/i, '').trim();
  return cleaned || trimmed;
}

export function saveClassStudent(student: Partial<ClassStudentRecord> & { fullName: string }): ClassStudentRecord {
  const list = getClassStudents();
  const now = new Date().toISOString();
  const existingIndex = list.findIndex((s) => s.id === student.id);
  const cleanName = cleanClassStudentName(student.fullName);

  let target: ClassStudentRecord;

  if (existingIndex >= 0) {
    target = {
      ...list[existingIndex],
      ...student,
      fullName: cleanName || list[existingIndex].fullName,
      updatedAt: now,
    };
    list[existingIndex] = target;
  } else {
    target = {
      id: student.id || `cls-std-${Date.now()}`,
      fullName: cleanName || student.fullName,
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
      schoolBranch: 'IKHLAS_JEDDAH',
      source: 'ikhlas-jeddah',
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
  schoolBranch?: string;
  studentAccountId?: string;
  parentAccountId?: string;
  parentPhone?: string;
  parentName?: string;
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
  dispatchedToParent?: boolean;
  dispatchedAt?: string;
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

export function saveBadge(data: Omit<StudentBadgeRecord, 'id' | 'createdAt'> & { id?: string }): StudentBadgeRecord {
  const all = readCloudCache<StudentBadgeRecord>(BADGES_KEY);
  
  let parentPhone = data.parentPhone;
  let parentName = data.parentName;
  let parentAccountId = data.parentAccountId;
  let studentAccountId = data.studentAccountId;

  if (!parentPhone || !parentAccountId || !studentAccountId || !parentName) {
    try {
      const allClass = readList<any>(CLASS_STUDENTS_KEY);
      const allMasar = readList<any>('masar.students.v1');
      const allPool = [...allClass, ...allMasar];
      const match = allPool.find(s => 
        (s.id && s.id === data.studentId) || 
        (data.studentName && s.fullName && isStudentNameMatch(s.fullName, data.studentName))
      );
      if (match) {
        parentPhone = parentPhone || match.parentPhone;
        parentName = parentName || match.parentName;
        parentAccountId = parentAccountId || match.parentAccountId || match.linkedParentId;
        studentAccountId = studentAccountId || match.studentAccountId || match.linkedStudentId;
      }
    } catch {}
  }

  const record: StudentBadgeRecord = {
    ...data,
    id: data.id || `badge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    parentPhone,
    parentName,
    parentAccountId,
    studentAccountId,
    dispatchedToParent: data.dispatchedToParent ?? true,
    dispatchedAt: data.dispatchedAt || new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  const existingIndex = all.findIndex(b => b.id === record.id);
  if (existingIndex >= 0) {
    all[existingIndex] = record;
    writeCloudCache(BADGES_KEY, all);
  } else {
    all.push(record);
    writeCloudCache(BADGES_KEY, all);
  }

  syncDocToCloud(BADGES_CLOUD, record.id, record);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('masar:cloud-cache-update', { detail: { collection: BADGES_CLOUD, id: record.id } }));
  }
  return record;
}

export function getStudentBadges(studentId: string, studentName?: string): StudentBadgeRecord[] {
  const all = readCloudCache<StudentBadgeRecord>(BADGES_KEY);
  const normSearchName = studentName ? normalizeArabicText(studentName) : '';
  return all.filter((b) => {
    if (!b || b.studentId === 'all' || b.studentName === 'جميع طلاب الفصل') return false;
    if (studentId) {
      if (b.studentId === studentId || b.studentAccountId === studentId) return true;
      if (b.studentId && b.studentId !== studentId) return false;
    }
    if (normSearchName && b.studentName) {
      const normBadgeName = normalizeArabicText(b.studentName);
      if (normBadgeName === normSearchName) return true;
      if (isStudentNameMatch(studentName, b.studentName)) return true;
    }
    return false;
  });
}

export function getAllBadges(): StudentBadgeRecord[] {
  return readCloudCache<StudentBadgeRecord>(BADGES_KEY);
}

/**
 * Centrally updates and synchronizes a student's photo across all data stores:
 * - class_students (Dr. Ismail's classroom roster)
 * - students (Masar platform student list)
 * - accounts (linked student account)
 * - local session (if matching current logged in student)
 * - cloud Firestore collections
 */
export function updateStudentPhotoAcrossStores(
  studentId: string,
  photoUrl: string,
  studentName?: string
): { success: boolean; photoUrl: string } {
  if (!studentId && !studentName) return { success: false, photoUrl: '' };

  const normTargetName = studentName ? normalizeArabicText(studentName) : '';

  // 1. Update in class_students
  try {
    const classStudents = getClassStudents();
    let classUpdated = false;
    const updatedClassList = classStudents.map((cs) => {
      const match =
        (studentId && cs.id === studentId) ||
        (studentId && (cs as any).studentAccountId === studentId) ||
        (normTargetName && cs.fullName && normalizeArabicText(cs.fullName) === normTargetName);
      if (match) {
        classUpdated = true;
        return { ...cs, photoUrl, updatedAt: new Date().toISOString() };
      }
      return cs;
    });
    if (classUpdated) {
      writeList(CLASS_STUDENTS_KEY, updatedClassList);
      const matched = updatedClassList.find(
        (c) =>
          (studentId && c.id === studentId) ||
          (normTargetName && c.fullName && normalizeArabicText(c.fullName) === normTargetName)
      );
      if (matched) {
        void syncDocToCloud(CLOUD_COLLECTION, matched.id, matched);
      }
    }
  } catch (err) {
    console.error('Error updating photo in class_students:', err);
  }

  // 2. Update in masar.students.v1
  try {
    const allStudents = readList<any>('masar.students.v1');
    let stUpdated = false;
    const updatedStList = allStudents.map((st) => {
      const match =
        (studentId && st.id === studentId) ||
        (studentId && st.studentAccountId === studentId) ||
        (normTargetName && st.fullName && normalizeArabicText(st.fullName) === normTargetName);
      if (match) {
        stUpdated = true;
        return { ...st, photoUrl, updatedAt: new Date().toISOString() };
      }
      return st;
    });
    if (stUpdated) {
      writeList('masar.students.v1', updatedStList);
      const matched = updatedStList.find(
        (s) =>
          (studentId && s.id === studentId) ||
          (normTargetName && s.fullName && normalizeArabicText(s.fullName) === normTargetName)
      );
      if (matched) {
        void syncDocToCloud('students', matched.id, matched);
      }
    }
  } catch (err) {
    console.error('Error updating photo in students:', err);
  }

  // 3. Update in masar.accounts.v1
  try {
    const allAccounts = readList<any>('masar.accounts.v1');
    let accUpdated = false;
    const updatedAccList = allAccounts.map((acc) => {
      const match =
        (studentId && acc.id === studentId) ||
        (studentId && acc.linkedStudentId === studentId) ||
        (normTargetName && acc.name && normalizeArabicText(acc.name) === normTargetName);
      if (match) {
        accUpdated = true;
        return { ...acc, photoUrl, updatedAt: new Date().toISOString() };
      }
      return acc;
    });
    if (accUpdated) {
      writeList('masar.accounts.v1', updatedAccList);
      const matched = updatedAccList.find(
        (a) =>
          (studentId && a.id === studentId) ||
          (normTargetName && a.name && normalizeArabicText(a.name) === normTargetName)
      );
      if (matched) {
        void syncDocToCloud('accounts', matched.id, matched);
      }
    }
  } catch (err) {
    console.error('Error updating photo in accounts:', err);
  }

  // 4. Update local session if matching
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('masar.session.v1') || sessionStorage.getItem('masar.session.v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          (parsed.id === studentId ||
            parsed.linkedStudentId === studentId ||
            (normTargetName && parsed.name && normalizeArabicText(parsed.name) === normTargetName))
        ) {
          parsed.photoUrl = photoUrl;
          localStorage.setItem('masar.session.v1', JSON.stringify(parsed));
          try { sessionStorage.setItem('masar.session.v1', JSON.stringify(parsed)); } catch {}
          window.dispatchEvent(new CustomEvent('masar:session-changed', { detail: parsed }));
        }
      }
    } catch {}

    // 5. Fire cross-view update events
    window.dispatchEvent(
      new CustomEvent('masar:cloud-cache-update', {
        detail: { key: CLASS_STUDENTS_KEY, photoUrl, studentId },
      })
    );
    window.dispatchEvent(
      new CustomEvent('masar:student-photo-updated', {
        detail: { studentId, photoUrl },
      })
    );
  }

  return { success: true, photoUrl };
}

