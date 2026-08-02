'use client';

export type UserRole = 'doctor' | 'parent' | 'specialist' | 'teacher';

export type AccountRecord = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  createdAt: string;
};

export type StudentRecord = {
  id: string;
  fullName: string;
  nationalId?: string;
  dateOfBirth?: string;
  grade: string;
  parentName?: string;
  parentPhone?: string;
  photoUrl?: string;
  source: 'student-wizard' | 'survey' | 'import';
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
  type: 'initial-assessment' | 'placement' | 'survey-analysis';
  summary: string;
  recommendations: string[];
  answers: Array<{ question: string; answer: string }>;
  domains: Array<{ name: string; score: number; note: string }>;
};

export type SurveySubmission = {
  id: string;
  studentId?: string;
  studentName: string;
  grade: string;
  parentPhone?: string;
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

const KEYS = {
  accounts: 'masar.accounts.v1',
  students: 'masar.students.v1',
  reports: 'masar.reports.v1',
  surveys: 'masar.surveys.v1',
  session: 'masar.session.v1',
  activity: 'masar.activity.v1',
};

function readList<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeList<T>(key: string, value: T[]) {
  localStorage.setItem(key, JSON.stringify(value));
}

function saveActivity(activity: Omit<ActivityRecord, 'id' | 'createdAt'>) {
  const activities = getActivities();
  const next: ActivityRecord = {
    ...activity,
    id: createId('activity'),
    createdAt: new Date().toISOString(),
  };

  writeList(KEYS.activity, [next, ...activities].slice(0, 80));
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

export function saveAccount(account: Omit<AccountRecord, 'id' | 'createdAt'>) {
  const accounts = getAccounts();
  const cleanEmail = account.email.trim().toLowerCase();
  const existing = accounts.find((item) => item.email.toLowerCase() === cleanEmail);
  const next: AccountRecord = {
    ...existing,
    ...account,
    email: cleanEmail,
    id: existing?.id ?? createId('account'),
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  writeList(KEYS.accounts, [next, ...accounts.filter((item) => item.id !== next.id)]);
  saveActivity({
    type: 'account',
    refId: next.id,
    title: 'تحديث حساب مستخدم',
    detail: `${next.name} - ${next.role}`,
  });
  return next;
}

export function setSession(account: Pick<AccountRecord, 'id' | 'name' | 'email' | 'role'>) {
  localStorage.setItem(KEYS.session, JSON.stringify(account));
  localStorage.setItem('masar-user', JSON.stringify(account));
  localStorage.setItem('masar_logged_in', 'true');
  localStorage.setItem('user_role', account.role);
  localStorage.setItem('user_name', account.name);
}

export function getSession() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(KEYS.session);
    return raw ? (JSON.parse(raw) as Pick<AccountRecord, 'id' | 'name' | 'email' | 'role'>) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(KEYS.session);
  localStorage.removeItem('masar-user');
  localStorage.removeItem('masar_logged_in');
  localStorage.removeItem('user_role');
  localStorage.removeItem('user_name');
}

export function getStudents() {
  return readList<StudentRecord>(KEYS.students);
}

export function saveStudent(student: Omit<StudentRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
  const students = getStudents();
  const now = new Date().toISOString();
  const next: StudentRecord = {
    ...student,
    id: student.id ?? createId('student'),
    createdAt: students.find((item) => item.id === student.id)?.createdAt ?? now,
    updatedAt: now,
  };

  writeList(KEYS.students, [next, ...students.filter((item) => item.id !== next.id)]);
  saveActivity({
    type: 'student',
    refId: next.id,
    title: 'تحديث ملف طالب',
    detail: `${next.fullName} - ${next.grade}`,
  });
  return next;
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
  saveActivity({
    type: 'report',
    refId: next.id,
    title: 'حفظ تقرير سريري',
    detail: `${next.studentName} - ${next.program} - ${next.score}%`,
  });
  return next;
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
