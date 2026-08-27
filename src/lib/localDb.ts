'use client';

import { clearCloudCache, deleteDocFromCloud, readCloudCache, syncDocToCloud, writeCloudCache } from './firestoreSync';

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
  linkedStudentId?: string;
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
  from: 'doctor' | 'parent';
  to: 'doctor' | 'parent';
  body: string;
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
let activeSession: Pick<AccountRecord, 'id' | 'name' | 'email' | 'role' | 'schoolBranch' | 'phone' | 'linkedStudentId'> | null = null;

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

const SESSION_STORAGE_KEY = 'masar_active_session_cache';

export function setSession(
  account: Pick<AccountRecord, 'id' | 'name' | 'email' | 'role' | 'schoolBranch' | 'phone' | 'linkedStudentId'>,
  rememberMe: boolean = false,
  _writeClientCookie: boolean = false
) {
  void rememberMe;
  void _writeClientCookie;
  activeSession = account as AccountRecord;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(account));
    } catch {}
    window.dispatchEvent(new CustomEvent('masar:session-changed', { detail: account }));
  }
}

export function getSession() {
  if (typeof window === 'undefined') return null;
  if (activeSession) return activeSession;
  try {
    const cached = localStorage.getItem(SESSION_STORAGE_KEY);
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
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!payload?.ok || !payload.account) return null;
    setSession(payload.account);
    return activeSession;
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window !== 'undefined') {
    activeSession = null;
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
    document.cookie = `masar_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    window.dispatchEvent(new CustomEvent('masar:session-changed', { detail: null }));
  }
}

export function getStudents() {
  return readList<StudentRecord>(KEYS.students);
}

export function saveStudent(student: Omit<StudentRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
  const students = getStudents();
  const now = new Date().toISOString();

  // Normalize Arabic text for fuzzy name matching (inline to avoid circular import)
  const norm = (t?: string | null) => (t || '').trim().toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ').trim();

  const normName = norm(student.fullName);
  const normPhone = (student.parentPhone || '').replace(/\D/g, '');

  // Find existing by ID, national ID, or normalized name
  const existing = students.find((item) =>
    (student.id && item.id === student.id) ||
    (student.nationalId && item.nationalId && item.nationalId === student.nationalId) ||
    (normName && normName.length > 3 && norm(item.fullName) === normName)
  );

  // Also find any OTHER duplicate that might exist (different ID, same normalized name or same national ID)
  const duplicate = existing ? students.find((item) =>
    item.id !== existing.id &&
    ((normName && normName.length > 3 && norm(item.fullName) === normName) ||
     (student.nationalId && item.nationalId && item.nationalId === student.nationalId))
  ) : null;

  const photoUrl = student.photoUrl || existing?.photoUrl || duplicate?.photoUrl || undefined;
  const dateOfBirth = student.dateOfBirth || existing?.dateOfBirth || duplicate?.dateOfBirth || undefined;
  const nationalId = student.nationalId || existing?.nationalId || duplicate?.nationalId || undefined;

  const next: StudentRecord = {
    ...(duplicate || {}),
    ...existing,
    ...student,
    photoUrl,
    dateOfBirth,
    nationalId,
    id: existing?.id ?? student.id ?? createId('student'),
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

  const next: StudentRecord = {
    ...existing,
    ...cleanUpdates,
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

export function deleteStudent(studentId: string) {
  const students = getStudents();
  const student = students.find((item) => item.id === studentId);
  // Remove student
  writeList(KEYS.students, students.filter((item) => item.id !== studentId));
  deleteDocFromCloud('students', studentId);
  // Remove all their reports
  const reports = readList<ReportRecord>(KEYS.reports);
  reports.filter((item) => item.studentId === studentId).forEach((r) => deleteDocFromCloud('reports', r.id));
  writeList(KEYS.reports, reports.filter((item) => item.studentId !== studentId));
  // Remove all their messages
  const messages = readList<MessageRecord>(KEYS.messages);
  messages.filter((item) => item.studentId === studentId).forEach((m) => deleteDocFromCloud('messages', m.id));
  writeList(KEYS.messages, messages.filter((item) => item.studentId !== studentId));
  if (student) {
    saveActivity({
      type: 'student',
      refId: studentId,
      title: 'حذف ملف طالب',
      detail: `${student.fullName} - ${student.grade}`,
    });
  }
}

export function getReports() {
  return readList<ReportRecord>(KEYS.reports);
}

export function saveReport(report: Omit<ReportRecord, 'id' | 'date'> & { id?: string; date?: string }) {
  const reports = getReports();
  const next: ReportRecord = {
    ...report,
    id: report.id ?? createId('report'),
    date: report.date ?? new Date().toISOString().slice(0, 10),
  };

  writeList(KEYS.reports, [next, ...reports.filter((item) => item.id !== next.id)]);
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
  const next: MessageRecord = {
    ...message,
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
