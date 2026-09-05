'use client';

import { clearCloudCache, clearSnapshotBackoff, deleteDocFromCloud, readCloudCache, syncDocToCloud, writeCloudCache } from './firestoreSync';

export type UserRole = 'doctor' | 'parent' | 'student' | 'specialist' | 'teacher';

export type AccountRecord = {
  id: string;
  name: string;
  email: string;
  recoveryEmail?: string;
  phone?: string;
  role: UserRole;
  schoolBranch?: 'MASAR' | 'IKHLAS_JEDDAH';
  createdVia?: 'email' | 'google' | 'apple' | 'microsoft' | 'face';
  providerId?: string;
  firebaseUid?: string;
  lastLoginAt?: string;
  photoUrl?: string;
  onboardingRequired?: boolean;
  parentProfileComplete?: boolean;
  parentAge?: string | number;
  childrenCount?: string | number;
  parentNationalId?: string;
  parentNotes?: string;
  linkedStudentId?: string;
  linkedStudentEmail?: string;
  linkedStudentName?: string;
  linkedParentId?: string;
  linkedParentEmail?: string;
  grade?: string;
  lastActiveAt?: string;
  createdAt: string;
};

export type StudentRecord = {
  id: string;
  fullName: string;
  fullNameEn?: string;
  nationalId?: string;
  dateOfBirth?: string;
  grade: string;
  email?: string;
  recoveryEmail?: string;
  parentEmail?: string;
  parentName?: string;
  parentPhone?: string;
  parentAge?: string | number;
  childrenCount?: string | number;
  parentNationalId?: string;
  photoUrl?: string;
  notes?: string;
  reviewStatus?: 'awaiting-survey' | 'awaiting-doctor-review' | 'program-assigned';
  assignedProgram?: string;
  assignedPrograms?: string[];
  assignedBy?: string;
  assignedAt?: string;
  source: 'student-wizard' | 'survey' | 'import' | 'ikhlas-jeddah';
  schoolBranch?: 'MASAR' | 'IKHLAS_JEDDAH' | string;
  branch?: string;
  media?: Record<string, { type: 'audio' | 'image'; dataUrl: string; label: string; questionId?: string; categoryLabel?: string; createdAt?: string }>;
  studentAccountId?: string;
  parentAccountId?: string;
  linkedStudentId?: string;
  linkedStudentEmail?: string;
  linkedStudentName?: string;
  linkedParentId?: string;
  linkedParentEmail?: string;
  studentLastLoginAt?: string;
  parentLastLoginAt?: string;
  studentLastActiveAt?: string;
  parentLastActiveAt?: string;
  lastLoginAt?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ReportRecord = {
  id: string;
  studentId: string;
  studentName: string;
  grade: string;
  program: string;
  programColor: string;
  date: string;
  score: number;
  status: 'completed' | 'pending';
  type:
    | 'initial-assessment'
    | 'placement'
    | 'survey-analysis'
    | 'survey-answers'
    | 'clinical-analysis'
    | 'student-assessment-answers'
    | 'student-assessment-analysis';
  summary: string;
  recommendations: string[];
  answers: Array<{ question: string; answer: string }>;
  domains: Array<{ name: string; score: number; note: string }>;
  media?: Record<string, { type: 'audio' | 'image'; dataUrl: string; label: string; questionId?: string; categoryLabel?: string; createdAt?: string }>;
  dispatchedToParent?: boolean;
  dispatchedAt?: string;
  createdAt?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  parentAccountId?: string;
};

export type SurveySubmission = {
  id: string;
  studentId?: string;
  studentName: string;
  grade: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  answers: Record<string, string | number>;
  submittedAt: string;
};

export type ActivityRecord = {
  id: string;
  title: string;
  detail: string;
  type: 'account' | 'student' | 'report' | 'survey';
  refId?: string;
  createdAt: string;
};

export type MessageRecord = {
  id: string;
  studentId?: string;
  studentName?: string;
  parentName?: string;
  parentPhone?: string;
  parentEmail?: string;
  parentAccountId?: string;
  from: 'doctor' | 'parent' | 'student';
  to: 'doctor' | 'parent' | 'student';
  body: string;
  audioDataUrl?: string;
  attachmentType?: 'audio';
  createdAt: string;
  read?: boolean;
};

export type IkhlasDailyLogRecord = {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  attendance: 'present' | 'absent' | 'late';
  performanceScore: number;
  summaryReport: string;
  exitTime?: string;
  exitLoggedAt?: string;
  parentNotified?: boolean;
  lateAlertSent?: boolean;
  createdAt: string;
};

export type IkhlasCommunityPost = {
  id: string;
  title: string;
  content: string;
  type: 'homework' | 'announcement' | 'photo' | 'alert';
  dueDate?: string;
  author: string;
  createdAt: string;
};

const KEYS = {
  accounts: 'masar.accounts.v1',
  students: 'masar.students.v1',
  reports: 'masar.reports.v1',
  surveys: 'masar.surveys.v1',
  session: 'masar.session.v1',
  activity: 'masar.activity.v1',
  messages: 'masar.messages.v1',
  ikhlasLogs: 'masar.ikhlasLogs.v1',
  ikhlasPosts: 'masar.ikhlasPosts.v1',
};

// Flag kept in memory after a data purge — prevents stale client data being re-pushed to cloud
export const CLEARED_FLAG_KEY = 'masar.dataCleared.v1';
let dataClearedAt: string | null = null;
let activeSession: Partial<AccountRecord> & Pick<AccountRecord, 'id' | 'name' | 'email' | 'role'> | null = null;

export function isDataCleared(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(dataClearedAt);
}

export function markDataCleared() {
  if (typeof window === 'undefined') return;
  dataClearedAt = new Date().toISOString();
}

function readList<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  return readCloudCache<T>(key);
}

function writeList<T>(key: string, value: T[]) {
  if (typeof window === 'undefined') return;
  writeCloudCache<T>(key, value);
}

export function saveActivity(activity: Omit<ActivityRecord, 'id' | 'createdAt'>) {
  const activities = getActivities();
  const next: ActivityRecord = {
    ...activity,
    id: createId('activity'),
    createdAt: new Date().toISOString(),
  };

  writeList(KEYS.activity, [next, ...activities].slice(0, 80));
  syncDocToCloud('activities', next.id, next);
  return next;
}

export function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
export function getAccounts() {
  return readList<AccountRecord>(KEYS.accounts);
}

export function saveAccount(account: Omit<AccountRecord, 'id' | 'createdAt'> & Partial<Pick<AccountRecord, 'id' | 'createdAt'>>) {
  const accounts = getAccounts();
  const cleanEmail = (account.email || '').trim().toLowerCase();
  const existing = accounts.find(
    (item) => item.id === account.id || (cleanEmail && (item.email || '').trim().toLowerCase() === cleanEmail)
  );
  const next: AccountRecord = {
    ...existing,
    ...account,
    email: cleanEmail || account.email || '',
    id: existing?.id ?? account.id ?? createId('account'),
    createdAt: existing?.createdAt ?? account.createdAt ?? new Date().toISOString(),
  };

  writeList(KEYS.accounts, [next, ...accounts.filter((item) => item.id !== next.id)]);
  syncDocToCloud('accounts', next.id, next);
  saveActivity({
    type: 'account',
    refId: next.id,
    title: 'تحديث حساب مستخدم',
    detail: `${next.name || 'مستخدم'} - ${next.role || 'عضو'}`,
  });
  return next;
}

export function setSession(
  account: Partial<AccountRecord> & Pick<AccountRecord, 'id' | 'name' | 'email' | 'role'>,
  rememberMe: boolean = false,
  _writeClientCookie: boolean = false
) {
  void rememberMe;
  void _writeClientCookie;
  activeSession = account as AccountRecord;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('masar.session.v1', JSON.stringify(account));
    } catch {}
    window.dispatchEvent(new CustomEvent('masar:session-changed', { detail: account }));
  }
}

export function getSession() {
  if (typeof window === 'undefined') return null;
  if (activeSession) return activeSession;
  try {
    const cached = localStorage.getItem('masar.session.v1');
    if (cached) {
      activeSession = JSON.parse(cached);
      return activeSession;
    }
  } catch {}
  return null;
}

export async function hydrateSessionFromServer() {
  if (typeof window === 'undefined') return null;
  if (activeSession) return activeSession;
  try {
    const cached = localStorage.getItem('masar.session.v1');
    if (cached) {
      activeSession = JSON.parse(cached);
    }
  } catch {}
  try {
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    if (!response.ok) return activeSession;
    const payload = await response.json();
    if (!payload?.ok || !payload.account) return activeSession;
    setSession(payload.account);
    return activeSession;
  } catch {
    return activeSession;
  }
}

export function clearSession() {
  if (typeof window !== 'undefined') {
    activeSession = null;
    try {
      localStorage.removeItem('masar.session.v1');
      sessionStorage.removeItem('masar.session.v1');
    } catch {}
    window.dispatchEvent(new CustomEvent('masar:session-changed', { detail: null }));
    void fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
      keepalive: true,
    }).catch(() => {});
  }
}

export function getStudents() {
  return readList<StudentRecord>(KEYS.students);
}

export function saveStudent(student: Omit<StudentRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
  const students = getStudents();
  const now = new Date().toISOString();

  const norm = (t?: string | null) => (t || '').trim().toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ').trim();

  const isPlaceholder = (n?: string | null) => !n || n.includes('جديد') || n.includes('الاستبيان') || n === 'طالب' || n === 'الطالب' || n.startsWith('طالب ');
  const normName = norm(student.fullName);
  const cleanEmail = (v?: string | null) => (v || '').trim().toLowerCase();
  const cleanPhone = (v?: string | null) => (v || '').replace(/\D/g, '');
  const suffix8 = (v?: string | null) => {
    const digits = cleanPhone(v);
    return digits.length >= 8 ? digits.slice(-8) : '';
  };
  const branchMatches = (item: StudentRecord) => {
    if (!student.schoolBranch || !item.schoolBranch) return true;
    return item.schoolBranch === student.schoolBranch;
  };
  const studentEmails = new Set([student.email, student.recoveryEmail, student.linkedStudentEmail].map(cleanEmail).filter(Boolean));
  const parentEmails = new Set([student.parentEmail, student.linkedParentEmail].map(cleanEmail).filter(Boolean));
  const exactEmailMatch = (item: StudentRecord) => {
    const itemStudentEmails = [item.email, item.recoveryEmail, item.linkedStudentEmail].map(cleanEmail);
    const itemParentEmails = [item.parentEmail, item.linkedParentEmail].map(cleanEmail);
    return (
      itemStudentEmails.some((email) => email && studentEmails.has(email)) ||
      itemParentEmails.some((email) => email && parentEmails.has(email))
    );
  };
  const directLinkMatch = (item: StudentRecord) => (
    Boolean(student.id && item.id === student.id) ||
    Boolean(student.studentAccountId && (item.studentAccountId === student.studentAccountId || item.id === student.studentAccountId)) ||
    Boolean(student.parentAccountId && item.parentAccountId === student.parentAccountId) ||
    Boolean(student.linkedParentId && (item.linkedParentId === student.linkedParentId || item.parentAccountId === student.linkedParentId)) ||
    exactEmailMatch(item)
  );
  const sameGuardian = (item: StudentRecord) => {
    const phone = suffix8(student.parentPhone);
    const itemPhone = suffix8(item.parentPhone);
    if (phone && itemPhone && phone === itemPhone) return true;
    if (exactEmailMatch(item)) return true;
    return Boolean(
      (student.parentAccountId && item.parentAccountId === student.parentAccountId) ||
      (student.linkedParentId && (item.linkedParentId === student.linkedParentId || item.parentAccountId === student.linkedParentId))
    );
  };
  const nameMatch = (item: StudentRecord) =>
    !isPlaceholder(student.fullName) &&
    !isPlaceholder(item.fullName) &&
    normName.length > 3 &&
    norm(item.fullName) === normName;

  const existing = students.find((item) => branchMatches(item) && directLinkMatch(item)) ||
    students.find((item) => branchMatches(item) && nameMatch(item) && sameGuardian(item));

  const duplicate = existing ? students.find((item) => {
    if (item.id === existing.id) return false;
    if (!branchMatches(item)) return false;
    if (directLinkMatch(item)) return true;
    return nameMatch(item) && sameGuardian(item);
  }) : null;

  const resolvedFullName = (!isPlaceholder(student.fullName) && student.fullName) ||
    (!isPlaceholder(existing?.fullName) && existing?.fullName) ||
    (!isPlaceholder(duplicate?.fullName) && duplicate?.fullName) ||
    student.fullName || 'طالب جديد';

  const photoUrl = student.photoUrl || existing?.photoUrl || duplicate?.photoUrl || undefined;
  const dateOfBirth = student.dateOfBirth || existing?.dateOfBirth || duplicate?.dateOfBirth || undefined;
  const nationalId = student.nationalId || existing?.nationalId || duplicate?.nationalId || undefined;
  const parentName = (!isPlaceholder(student.parentName) && student.parentName) ||
    (!isPlaceholder(existing?.parentName) && existing?.parentName) ||
    (!isPlaceholder(duplicate?.parentName) && duplicate?.parentName) ||
    student.parentName || undefined;
  const parentPhone = student.parentPhone || existing?.parentPhone || duplicate?.parentPhone || undefined;
  const schoolBranch = student.schoolBranch || existing?.schoolBranch || duplicate?.schoolBranch || undefined;
  const studentAccountId = student.studentAccountId || existing?.studentAccountId || duplicate?.studentAccountId || undefined;
  const parentAccountId = student.parentAccountId || existing?.parentAccountId || duplicate?.parentAccountId || undefined;
  const linkedStudentEmail = student.linkedStudentEmail || existing?.linkedStudentEmail || duplicate?.linkedStudentEmail || student.email || existing?.email || undefined;
  const linkedParentId = student.linkedParentId || existing?.linkedParentId || duplicate?.linkedParentId || parentAccountId || undefined;
  const linkedParentEmail = student.linkedParentEmail || existing?.linkedParentEmail || duplicate?.linkedParentEmail || student.parentEmail || existing?.parentEmail || undefined;

  const next: StudentRecord = {
    ...(duplicate || {}),
    ...(existing || {}),
    ...student,
    fullName: resolvedFullName,
    photoUrl,
    dateOfBirth,
    nationalId,
    parentName,
    parentPhone,
    schoolBranch,
    studentAccountId,
    parentAccountId,
    linkedStudentEmail,
    linkedParentId,
    linkedParentEmail,
    email: student.email || existing?.email || duplicate?.email,
    parentEmail: student.parentEmail || existing?.parentEmail || duplicate?.parentEmail,
    media: {
      ...(duplicate?.media || {}),
      ...(existing?.media || {}),
      ...(student.media || {}),
    },
    id: existing?.id ?? student.id ?? duplicate?.id ?? studentAccountId ?? createId('student'),
    createdAt: existing?.createdAt ?? duplicate?.createdAt ?? now,
    updatedAt: now,
  };

  // Remove duplicates from the list (keep only the merged record)
  const cleanedList = students.filter((item) =>
    item.id !== next.id && !(duplicate && item.id === duplicate.id)
  );

  writeList(KEYS.students, [next, ...cleanedList]);
  syncDocToCloud('students', next.id, next);

  // If we found and merged a duplicate, delete it from cloud too
  if (duplicate && duplicate.id !== next.id) {
    void deleteDocFromCloud('students', duplicate.id);
  }
  if (existing && existing.id !== next.id) {
    void deleteDocFromCloud('students', existing.id);
  }

  saveActivity({
    type: 'student',
    refId: next.id,
    title: 'تحديث ملف طالب',
    detail: `${next.fullName} - ${next.grade}`,
  });
  return next;
}

export function updateStudent(studentId: string, updates: Partial<Omit<StudentRecord, 'id' | 'createdAt'>>) {
  const students = getStudents();
  const existing = students.find((item) => item.id === studentId);
  if (!existing) return null;

  const cleanUpdates = { ...updates };
  // Never overwrite an existing photoUrl with an empty string or undefined unless explicitly intended
  if ((cleanUpdates.photoUrl === '' || cleanUpdates.photoUrl === undefined) && existing.photoUrl) {
    cleanUpdates.photoUrl = existing.photoUrl;
  }
  // Never overwrite a real name with a placeholder
  if (cleanUpdates.fullName && (cleanUpdates.fullName.includes('جديد') || cleanUpdates.fullName.includes('الاستبيان') || cleanUpdates.fullName === 'طالب') && existing.fullName && !existing.fullName.includes('جديد')) {
    cleanUpdates.fullName = existing.fullName;
  }

  const next: StudentRecord = {
    ...existing,
    ...cleanUpdates,
    media: {
      ...(existing.media || {}),
      ...(cleanUpdates.media || {}),
    },
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  writeList(KEYS.students, [next, ...students.filter((item) => item.id !== studentId)]);
  syncDocToCloud('students', next.id, next);
  saveActivity({
    type: 'student',
    refId: next.id,
    title: 'تحديث حالة طالب',
    detail: `${next.fullName} - ${next.reviewStatus ?? 'بدون حالة'}${next.assignedProgram ? ` - ${next.assignedProgram}` : ''}`,
  });
  return next;
}

export async function deleteStudent(studentId: string) {
  const students = getStudents();
  const student = students.find((item) => item.id === studentId);
  const normalizeName = (value?: string | null) => (value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
  const cleanPhone = (v?: string | null) => (v || '').replace(/\D/g, '');
  const cleanEmail = (v?: string | null) => (v || '').trim().toLowerCase();

  const targetName = normalizeName(student?.fullName);
  const studentsToDelete = students.filter((item) =>
    item.id === studentId ||
    item.studentAccountId === studentId ||
    item.linkedStudentId === studentId ||
    (targetName && normalizeName(item.fullName) === targetName)
  );
  const studentIdsToDelete = new Set([
    studentId,
    ...studentsToDelete.map((item) => item.id),
    ...studentsToDelete.map((item) => item.studentAccountId || ''),
    ...studentsToDelete.map((item) => item.linkedStudentId || ''),
  ].filter(Boolean));
  const studentNamesToDelete = new Set(studentsToDelete.map((item) => normalizeName(item.fullName)).filter(Boolean));
  const parentAccountIdsToDelete = new Set([
    ...studentsToDelete.map((item) => item.parentAccountId || ''),
    ...studentsToDelete.map((item) => item.linkedParentId || ''),
  ].filter(Boolean));
  const parentNamesToDelete = new Set(studentsToDelete.map((item) => normalizeName(item.parentName)).filter(Boolean));
  const parentPhoneSuffixes = new Set(studentsToDelete.map((item) => cleanPhone(item.parentPhone).slice(-8)).filter(Boolean));
  const parentEmailsToDelete = new Set(studentsToDelete.map((item) => cleanEmail(item.parentEmail)).filter(Boolean));
  const studentEmailsToDelete = new Set([
    ...studentsToDelete.map((item) => cleanEmail(item.email)),
    ...studentsToDelete.map((item) => cleanEmail(item.recoveryEmail)),
    ...studentsToDelete.map((item) => cleanEmail(item.linkedStudentEmail)),
  ].filter(Boolean));

  // 1. Trigger server-side purge (Firestore + Firebase Auth + all 22 collections)
  if (typeof window !== 'undefined') {
    try {
      await fetch('/api/students/purge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ studentId }),
      });
    } catch (e) {
      console.warn('[deleteStudent] Server purge call error:', e);
    }
  }

  // 2. Remove the student and any hidden duplicate records locally and in the cloud
  writeList(KEYS.students, students.filter((item) => !studentIdsToDelete.has(item.id) && !studentNamesToDelete.has(normalizeName(item.fullName))));
  for (const id of studentIdsToDelete) {
    await deleteDocFromCloud('students', id);
  }

  // 3. Remove student accounts AND parent accounts locally and in the cloud
  const accounts = getAccounts();
  const matchingAccounts = accounts.filter((a) => {
    const role = (a.role || '').toLowerCase();
    const isDoctor = role === 'doctor' || cleanEmail(a.email).includes('ismail');
    if (isDoctor) return false; // NEVER delete doctor accounts

    const email = cleanEmail(a.email);
    const phoneSuffix = cleanPhone(a.phone).slice(-8);
    const nameNorm = normalizeName(a.name);

    // Is it the student account?
    const isStudentAcc =
      role === 'student' && (
        studentIdsToDelete.has(a.id) ||
        (!!a.linkedStudentId && studentIdsToDelete.has(a.linkedStudentId)) ||
        (!!email && studentEmailsToDelete.has(email)) ||
        (!!nameNorm && studentNamesToDelete.has(nameNorm))
      );

    // Is it the parent account?
    const isParentAcc =
      role === 'parent' && (
        parentAccountIdsToDelete.has(a.id) ||
        studentIdsToDelete.has(a.id) ||
        (!!a.linkedStudentId && studentIdsToDelete.has(a.linkedStudentId)) ||
        (!!email && parentEmailsToDelete.has(email)) ||
        (!!phoneSuffix && parentPhoneSuffixes.has(phoneSuffix)) ||
        (!!nameNorm && parentNamesToDelete.has(nameNorm))
      );

    return isStudentAcc || isParentAcc || studentIdsToDelete.has(a.id) || parentAccountIdsToDelete.has(a.id);
  });

  for (const acc of matchingAccounts) {
    await deleteDocFromCloud('accounts', acc.id);
  }
  const matchingAccountIds = new Set(matchingAccounts.map((a) => a.id));
  writeList(KEYS.accounts, accounts.filter((a) => !matchingAccountIds.has(a.id)));

  // 4. Remove all their reports
  const reports = readList<ReportRecord>(KEYS.reports);
  const studentReps = reports.filter((item) => (item.studentId && studentIdsToDelete.has(item.studentId)) || studentNamesToDelete.has(normalizeName(item.studentName)));
  for (const r of studentReps) {
    await deleteDocFromCloud('reports', r.id);
  }
  writeList(KEYS.reports, reports.filter((item) => !(item.studentId && studentIdsToDelete.has(item.studentId)) && !studentNamesToDelete.has(normalizeName(item.studentName))));

  // 5. Remove all their messages
  const messages = readList<MessageRecord>(KEYS.messages);
  const studentMsgs = messages.filter((item) => Boolean(item.studentId && studentIdsToDelete.has(item.studentId)));
  for (const m of studentMsgs) {
    await deleteDocFromCloud('messages', m.id);
  }
  writeList(KEYS.messages, messages.filter((item) => !item.studentId || !studentIdsToDelete.has(item.studentId)));

  // 6. Remove all their surveys
  const surveys = readList<SurveySubmission>(KEYS.surveys);
  const studentSurveys = surveys.filter((item) => (item.studentId && studentIdsToDelete.has(item.studentId)) || studentNamesToDelete.has(normalizeName(item.studentName)));
  for (const s of studentSurveys) {
    await deleteDocFromCloud('surveys', s.id);
  }
  writeList(KEYS.surveys, surveys.filter((item) => !(item.studentId && studentIdsToDelete.has(item.studentId)) && !studentNamesToDelete.has(normalizeName(item.studentName))));

  // 7. Clear cloud cache and backoff to ensure fresh reads
  clearCloudCache();
  clearSnapshotBackoff();

  if (student) {
    saveActivity({
      type: 'student',
      refId: studentId,
      title: 'حذف ملف طالب',
      detail: `${student.fullName} - ${student.grade}`,
    });
  }
}

export function getReports(): ReportRecord[] {
  const raw = readList<ReportRecord>(KEYS.reports);
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const normalize = (s?: string | null) => (s || '').trim().toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ').trim();

  const seen = new Map<string, ReportRecord>();
  const duplicateIds: string[] = [];

  for (const r of raw) {
    if (!r || !r.id) continue;
    const studentKey = r.studentId || normalize(r.studentName);
    const typeKey = r.type || r.program;
    const compositeKey = `${studentKey}__${typeKey}`;

    if (!studentKey || !typeKey) {
      seen.set(r.id, r);
      continue;
    }

    const existing = seen.get(compositeKey);
    if (!existing) {
      seen.set(compositeKey, r);
    } else {
      const existingDate = existing.date || '';
      const rDate = r.date || '';
      const existingHasAnswers = Array.isArray(existing.answers) && existing.answers.length > 0;
      const rHasAnswers = Array.isArray(r.answers) && r.answers.length > 0;

      if ((rHasAnswers && !existingHasAnswers) || (rDate >= existingDate && (r.score ?? 0) >= (existing.score ?? 0))) {
        duplicateIds.push(existing.id);
        seen.set(compositeKey, r);
      } else {
        duplicateIds.push(r.id);
      }
    }
  }

  // Auto-prune duplicate report docs from cloud and local cache
  if (duplicateIds.length > 0) {
    const uniqueList = Array.from(seen.values());
    writeList(KEYS.reports, uniqueList);
    for (const dupId of duplicateIds) {
      void deleteDocFromCloud('reports', dupId);
    }
  }

  return Array.from(seen.values());
}

export function saveReport(report: Omit<ReportRecord, 'id' | 'date'> & { id?: string; date?: string }) {
  const reports = getReports();
  const normalize = (s?: string | null) => (s || '').trim().toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ').trim();

  const studentKey = report.studentId || normalize(report.studentName);
  const typeKey = report.type || report.program;

  // Find if a report of the same type/program for this student already exists
  const existing = reports.find((r) => {
    if (report.id && r.id === report.id) return true;
    const rStudentKey = r.studentId || normalize(r.studentName);
    const rTypeKey = r.type || r.program;
    return Boolean(studentKey && rStudentKey && studentKey === rStudentKey && typeKey && rTypeKey && typeKey === rTypeKey);
  });

  const nextId = report.id ?? existing?.id ?? createId('report');

  let parentPhone = report.parentPhone || existing?.parentPhone;
  let parentName = report.parentName || existing?.parentName;
  let parentAccountId = report.parentAccountId || existing?.parentAccountId;
  let parentEmail = report.parentEmail || existing?.parentEmail;

  if (!parentPhone || !parentName || !parentAccountId) {
    try {
      const allSt = [...readList<any>(KEYS.students), ...readList<any>('masar_class_students_v1')];
      const found = allSt.find((s) => s.id === report.studentId || (report.studentName && normalize(s.fullName) === normalize(report.studentName)));
      if (found) {
        parentPhone = parentPhone || found.parentPhone;
        parentName = parentName || found.parentName;
        parentAccountId = parentAccountId || found.parentAccountId || found.linkedParentId;
        parentEmail = parentEmail || found.parentEmail || found.email;
      }
    } catch {}
  }

  const next: ReportRecord = {
    ...existing,
    ...report,
    id: nextId,
    parentPhone,
    parentName,
    parentAccountId,
    parentEmail,
    dispatchedToParent: report.dispatchedToParent ?? (report.status === 'completed' ? true : existing?.dispatchedToParent),
    date: report.date ?? existing?.date ?? new Date().toISOString().slice(0, 10),
  };

  // Filter out any other duplicate records with same student + type
  const duplicatesToDelete = reports.filter((item) => {
    if (item.id === next.id) return false;
    const rStudentKey = item.studentId || normalize(item.studentName);
    const rTypeKey = item.type || item.program;
    return Boolean(studentKey && rStudentKey && studentKey === rStudentKey && typeKey && rTypeKey && typeKey === rTypeKey);
  });

  for (const dup of duplicatesToDelete) {
    void deleteDocFromCloud('reports', dup.id);
  }

  const cleanedReports = reports.filter((item) =>
    item.id !== next.id && !duplicatesToDelete.some((d) => d.id === item.id)
  );

  writeList(KEYS.reports, [next, ...cleanedReports]);
  syncDocToCloud('reports', next.id, next);
  saveActivity({
    type: 'report',
    refId: next.id,
    title: 'حفظ تقرير سريري',
    detail: `${next.studentName} - ${next.program} - ${next.score}%`,
  });
  return next;
}

export function deleteReport(reportId: string) {
  const reports = getReports();
  const report = reports.find((item) => item.id === reportId);
  writeList(KEYS.reports, reports.filter((item) => item.id !== reportId));
  deleteDocFromCloud('reports', reportId);
  if (report) {
    saveActivity({
      type: 'report',
      refId: reportId,
      title: 'حذف تقرير',
      detail: `${report.studentName} - ${report.program}`,
    });
  }
}

export function getSurveys() {
  return readList<SurveySubmission>(KEYS.surveys);
}

export function saveSurvey(survey: Omit<SurveySubmission, 'id' | 'submittedAt'>) {
  const surveys = getSurveys();
  const next: SurveySubmission = {
    ...survey,
    id: createId('survey'),
    submittedAt: new Date().toISOString(),
  };

  writeList(KEYS.surveys, [next, ...surveys]);
  syncDocToCloud('surveys', next.id, next);
  saveActivity({
    type: 'survey',
    refId: next.id,
    title: 'استلام استبيان ولي أمر',
    detail: `${next.studentName} - ${next.grade}`,
  });
  return next;
}

export function getActivities() {
  return readList<ActivityRecord>(KEYS.activity);
}

export function getMessages() {
  return readList<MessageRecord>(KEYS.messages);
}

export function saveMessage(message: Omit<MessageRecord, 'id' | 'createdAt'>) {
  const messages = getMessages();

  let studentName = message.studentName;
  let parentPhone = message.parentPhone;
  let parentName = message.parentName;
  let parentAccountId = message.parentAccountId;

  if (!studentName || !parentPhone || !parentName || !parentAccountId) {
    try {
      const normalize = (s?: string | null) => (s || '').trim().toLowerCase()
        .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
        .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
        .replace(/\s+/g, ' ').trim();
      const allSt = [...readList<any>(KEYS.students), ...readList<any>('masar_class_students_v1')];
      const sNorm = normalize(studentName || message.studentName);
      const found = allSt.find((s) =>
        (message.studentId && (s.id === message.studentId || s.studentAccountId === message.studentId)) ||
        (sNorm && normalize(s.fullName) === sNorm) ||
        (sNorm && normalize(s.fullName).includes(sNorm.split(' ')[0]))
      );
      if (found) {
        studentName = studentName || found.fullName;
        parentPhone = parentPhone || found.parentPhone;
        parentName = parentName || found.parentName;
        parentAccountId = parentAccountId || found.parentAccountId || found.linkedParentId;
      }
    } catch {}
  }

  const next: MessageRecord = {
    ...message,
    studentName,
    parentPhone,
    parentName,
    parentAccountId,
    id: createId('message'),
    createdAt: new Date().toISOString(),
  };

  writeList(KEYS.messages, [next, ...messages]);
  syncDocToCloud('messages', next.id, next);
  saveActivity({
    type: 'account',
    refId: next.studentId,
    title: 'رسالة جديدة',
    detail: `${next.from === 'doctor' ? 'د. إسماعيل' : 'ولي الأمر'}: ${next.body.slice(0, 70)}`,
  });
  return next;
}

// ── Ikhlas Jeddah 1st Grade Class Helpers ──
export function getIkhlasLogs() {
  return readList<IkhlasDailyLogRecord>(KEYS.ikhlasLogs);
}

export function saveIkhlasLog(log: Omit<IkhlasDailyLogRecord, 'id' | 'createdAt'> & { id?: string }) {
  const logs = getIkhlasLogs();
  const existingIdx = log.id ? logs.findIndex((l) => l.id === log.id) : -1;
  
  const next: IkhlasDailyLogRecord = {
    ...log,
    id: log.id || createId('ikhlas_log'),
    createdAt: new Date().toISOString(),
  };

  let updatedList: IkhlasDailyLogRecord[];
  if (existingIdx >= 0) {
    updatedList = [...logs];
    updatedList[existingIdx] = next;
  } else {
    updatedList = [next, ...logs];
  }

  writeList(KEYS.ikhlasLogs, updatedList);
  syncDocToCloud('ikhlasLogs', next.id, next);
  return next;
}

export function getIkhlasPosts() {
  return readList<IkhlasCommunityPost>(KEYS.ikhlasPosts);
}

export function saveIkhlasPost(post: Omit<IkhlasCommunityPost, 'id' | 'createdAt'>) {
  const posts = getIkhlasPosts();
  const next: IkhlasCommunityPost = {
    ...post,
    id: createId('ikhlas_post'),
    createdAt: new Date().toISOString(),
  };

  writeList(KEYS.ikhlasPosts, [next, ...posts]);
  syncDocToCloud('ikhlasPosts', next.id, next);
  saveActivity({
    type: 'account',
    title: `واجب/منشور جديد - فصل د. إسماعيل عيسى: ${next.title}`,
    detail: next.content.slice(0, 80),
  });
  return next;
}

export function clearAllMockData() {
  if (typeof window === 'undefined') return;
  clearCloudCache([
    KEYS.students,
    KEYS.reports,
    KEYS.surveys,
    KEYS.activity,
    KEYS.messages,
    KEYS.ikhlasLogs,
    KEYS.ikhlasPosts,
    'masar.waitlist.v1',
    'masar.ai.threads.v4',
  ]);
  // Mark cleared so firestoreSync won't push stale items back up.
  markDataCleared();
}

export function getSyncSnapshot() {
  const activities = getActivities();
  return {
    students: getStudents().length,
    reports: getReports().length,
    surveys: getSurveys().length,
    activities: activities.length,
    lastSync: activities[0]?.createdAt ?? null,
  };
}
