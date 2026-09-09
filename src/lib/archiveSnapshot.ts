'use client';

/**
 * archiveSnapshot.ts — مستودع الأرشيف الشامل لمنصة مسار
 * ═══════════════════════════════════════════════════════
 * يجمع كل بيانات النظام في مكان واحد ويبني ملفات شخصية كاملة لكل مستخدم.
 * يتعامل مع: طلاب، أولياء أمور، حسابات، تقارير، استبيانات، واجبات،
 *             شهادات، رسائل، سجلات حضور، بصمات وجه، سجل نشاط.
 */

import { readCloudCache } from './firestoreSync';

// ─── نوع الملف الشخصي الشامل لكل شخص ────────────────────────────────────────

export interface PersonArchiveProfile {
  /** معرّف فريد داخل الأرشيف */
  archiveId: string;
  /** نوع الشخص */
  type: 'student' | 'parent' | 'doctor' | 'specialist' | 'teacher';

  // ──── معلومات هوية أساسية ─────
  fullName: string;
  fullNameEn?: string;
  nationalId?: string;
  dateOfBirth?: string;
  gender?: string;
  grade?: string;
  photoUrl?: string;

  // ──── بيانات الاتصال والحساب ─────
  emails: string[];           // كل الإيميلات المرتبطة بالشخص
  phone?: string;
  accountIds: string[];       // كل معرّفات الحسابات
  firebaseUid?: string;
  providerId?: string;
  loginMethods: string[];     // email / google / apple / face / microsoft
  schoolBranch?: string;
  role?: string;

  // ──── بيانات تسجيل الدخول ─────
  createdAt?: string;
  lastLoginAt?: string;
  lastActiveAt?: string;
  registrationSource?: string; // 'student-wizard' | 'survey' | 'import' | 'google' | ...

  // ──── بصمة الوجه ─────
  faceEnrolled: boolean;
  faceEnrolledAt?: string;
  faceEmbeddingsCount?: number;   // عدد المتجهات البيومترية المحفوظة
  faceEmbedding?: number[];       // أول متجه (للعرض — لا تُنقَل خارج النظام)

  // ──── للطالب فقط ─────
  student?: {
    studentRecord: Record<string, unknown>;
    reports: Record<string, unknown>[];
    surveys: Record<string, unknown>[];
    homeworkLogs: Record<string, unknown>[];
    certificates: Record<string, unknown>[];
    attendanceRecords: Record<string, unknown>[];
    ikhlasLogs: Record<string, unknown>[];
    notes: Record<string, unknown>[];
    iepPlans: Record<string, unknown>[];
    assignedPrograms: string[];
  };

  // ──── للوالد فقط ─────
  parent?: {
    accountRecord: Record<string, unknown>;
    linkedStudents: Array<{ id: string; name: string }>;
    messages: Record<string, unknown>[];
    surveys: Record<string, unknown>[];
    consentsSigned: Record<string, unknown>[];
  };

  // ──── للطاقم (doctor/specialist/teacher) ─────
  staff?: {
    accountRecord: Record<string, unknown>;
    reports: Record<string, unknown>[];
    messages: Record<string, unknown>[];
    sessions: Record<string, unknown>[];
  };

  // ──── رسائل مشتركة مع الشخص ─────
  allMessages: Record<string, unknown>[];

  // ──── سجل النشاط المرتبط ─────
  activityLog: Record<string, unknown>[];

  /** تاريخ بناء هذا الملف */
  profileBuiltAt: string;
}

// ─── Snapshot كامل للمنصة ─────────────────────────────────────────────────────

export interface PlatformSnapshot {
  snapshotId: string;
  createdAt: string;
  label?: string;
  stats: {
    totalStudents: number;
    totalAccounts: number;
    totalReports: number;
    totalSurveys: number;
    totalHomeworkLogs: number;
    totalCertificates: number;
    totalAttendance: number;
    totalMessages: number;
    totalIkhlasLogs: number;
    totalActivities: number;
    totalFaceRecords: number;
    // Phase 2A
    totalIepRecords: number;
    totalSessionRecords: number;
    totalInvoices: number;
    totalConsents: number;
    totalWaitlist: number;
    totalPoints: number;
    totalNotifications: number;
    totalAiThreads: number;
  };
  // Raw collections — Phase 1
  students: Record<string, unknown>[];
  accounts: Record<string, unknown>[];
  reports: Record<string, unknown>[];
  surveys: Record<string, unknown>[];
  homeworkLogs: Record<string, unknown>[];
  certificateLogs: Record<string, unknown>[];
  attendance: Record<string, unknown>[];
  ikhlasLogs: Record<string, unknown>[];
  ikhlasPosts: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  activities: Record<string, unknown>[];
  faceRecords: Record<string, unknown>[];
  classStudents: Record<string, unknown>[];
  // Raw collections — Phase 2A
  iepRecords: Record<string, unknown>[];
  sessionRecords: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  consents: Record<string, unknown>[];
  waitlist: Record<string, unknown>[];
  points: Record<string, unknown>[];
  pointTransactions: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  dailyAttendance: Record<string, unknown>[];
  dailyHomework: Record<string, unknown>[];
  dailyQuiz: Record<string, unknown>[];
  aiThreads: Record<string, unknown>[];
  // Compiled per-person profiles
  personProfiles: PersonArchiveProfile[];
}

// ─── قراءة كل مجموعات البيانات ───────────────────────────────────────────────

function readAll<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  return readCloudCache<T>(key);
}

function readFaceRecords(): Record<string, unknown>[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('masar.face.v2');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function readAllCollections() {
  return {
    // ── الأساسية ────────────────────────────────────────────────────────
    students:          readAll<Record<string, unknown>>('masar.students.v1'),
    accounts:          readAll<Record<string, unknown>>('masar.accounts.v1'),
    reports:           readAll<Record<string, unknown>>('masar.reports.v1'),
    surveys:           readAll<Record<string, unknown>>('masar.surveys.v1'),
    activities:        readAll<Record<string, unknown>>('masar.activity.v1'),
    messages:          readAll<Record<string, unknown>>('masar.messages.v1'),
    ikhlasLogs:        readAll<Record<string, unknown>>('masar.ikhlasLogs.v1'),
    ikhlasPosts:       readAll<Record<string, unknown>>('masar.ikhlasPosts.v1'),
    classStudents:     readAll<Record<string, unknown>>('masar_class_students_v1'),
    homeworkLogs:      readAll<Record<string, unknown>>('masar_student_hw_logs_v1'),
    certLogs:          readAll<Record<string, unknown>>('masar_student_cert_logs_v1'),
    attendance:        readAll<Record<string, unknown>>('masar.attendance.v1'),
    faceRecords:       readFaceRecords(),
    // ── المرحلة 2A — Collections مُضافة ─────────────────────────────────
    iepRecords:        readAll<Record<string, unknown>>('masar.iep.v1'),
    sessionRecords:    readAll<Record<string, unknown>>('masar.sessionRecords.v1'),
    invoices:          readAll<Record<string, unknown>>('masar.invoices.v1'),
    consents:          readAll<Record<string, unknown>>('masar.consents.v1'),
    waitlist:          readAll<Record<string, unknown>>('masar.waitlist.v1'),
    points:            readAll<Record<string, unknown>>('masar.points.v1'),
    pointTransactions: readAll<Record<string, unknown>>('masar.transactions.v1'),
    notifications:     readAll<Record<string, unknown>>('masar.notifications.v1'),
    dailyAttendance:   readAll<Record<string, unknown>>('masar.dailyAttendance.v1'),
    dailyHomework:     readAll<Record<string, unknown>>('masar.dailyHomework.v1'),
    dailyQuiz:         readAll<Record<string, unknown>>('masar.dailyQuiz.v1'),
    aiThreads:         readAll<Record<string, unknown>>('masar.ai.threads.v4'),
  };
}

// ─── بناء ملف شخصي لطالب ─────────────────────────────────────────────────────

function buildStudentProfile(
  student: Record<string, unknown>,
  collections: ReturnType<typeof readAllCollections>
): PersonArchiveProfile {
  const sId = String(student.id ?? '');
  const sName = String(student.fullName ?? '');
  const sAccountId = String(student.studentAccountId ?? '');

  // جمع الإيميلات
  const emails = Array.from(new Set([
    student.email, student.recoveryEmail, student.linkedStudentEmail,
  ].filter(Boolean) as string[]));

  // جمع معرّفات الحسابات
  const accountIds = Array.from(new Set([
    sId, sAccountId, student.linkedStudentId,
  ].filter(Boolean) as string[]));

  // بصمة الوجه
  const faceRec = collections.faceRecords.find(
    (f: any) => f.userId === sId || f.accountId === sId || f.studentId === sId ||
                (sAccountId && (f.userId === sAccountId || f.accountId === sAccountId))
  ) as any;

  // التقارير
  const reports = collections.reports.filter(
    (r: any) => r.studentId === sId || r.studentName === sName
  );

  // الاستبيانات
  const surveys = collections.surveys.filter(
    (s: any) => s.studentId === sId || s.studentName === sName
  );

  // الواجبات
  const homeworkLogs = collections.homeworkLogs.filter(
    (h: any) => h.studentId === sId || h.studentName === sName || h.studentAccountId === sId
  );

  // الشهادات
  const certificates = collections.certLogs.filter(
    (c: any) => c.studentId === sId || c.studentName === sName || c.studentAccountId === sId
  );

  // الحضور
  const attendanceRecords = collections.attendance.filter(
    (a: any) => a.studentId === sId || a.studentName === sName
  );

  // سجلات الإخلاص
  const ikhlasLogs = collections.ikhlasLogs.filter(
    (l: any) => l.studentId === sId || l.studentName === sName
  );

  // الرسائل
  const allMessages = collections.messages.filter(
    (m: any) => m.studentId === sId || m.studentName === sName ||
                m.parentAccountId === student.parentAccountId
  );

  // سجل النشاط
  const activityLog = collections.activities.filter(
    (a: any) => a.refId === sId || a.refId === sAccountId
  );

  // حساب ولي الأمر المرتبط
  const parentAcc = collections.accounts.find(
    (a: any) => a.id === student.parentAccountId || a.id === student.linkedParentId ||
                (a.phone && student.parentPhone && String(a.phone).slice(-8) === String(student.parentPhone).slice(-8))
  ) as any;

  return {
    archiveId: `profile_student_${sId}`,
    type: 'student',
    fullName: sName,
    fullNameEn: String(student.fullNameEn ?? ''),
    nationalId: String(student.nationalId ?? ''),
    dateOfBirth: String(student.dateOfBirth ?? ''),
    grade: String(student.grade ?? ''),
    photoUrl: String(student.photoUrl ?? ''),
    emails,
    phone: '',
    accountIds,
    firebaseUid: String(student.firebaseUid ?? ''),
    loginMethods: ['email'],
    schoolBranch: String(student.schoolBranch ?? ''),
    role: 'student',
    createdAt: String(student.createdAt ?? ''),
    lastLoginAt: String(student.studentLastLoginAt ?? student.lastLoginAt ?? ''),
    lastActiveAt: String(student.studentLastActiveAt ?? student.lastActiveAt ?? ''),
    registrationSource: String(student.source ?? ''),
    faceEnrolled: Boolean(faceRec),
    faceEnrolledAt: faceRec?.enrolledAt,
    faceEmbeddingsCount: faceRec
      ? ((faceRec.embeddings?.length ?? 0) + (faceRec.poses ? Object.keys(faceRec.poses).length : 0))
      : 0,
    faceEmbedding: faceRec?.embedding,
    student: {
      studentRecord: student,
      reports,
      surveys,
      homeworkLogs,
      certificates,
      attendanceRecords,
      ikhlasLogs,
      notes: [],
      iepPlans: [],
      assignedPrograms: (student.assignedPrograms as string[]) ?? (student.assignedProgram ? [student.assignedProgram as string] : []),
    },
    parent: parentAcc ? {
      accountRecord: parentAcc,
      linkedStudents: [{ id: sId, name: sName }],
      messages: allMessages,
      surveys,
      consentsSigned: [],
    } : undefined,
    allMessages,
    activityLog,
    profileBuiltAt: new Date().toISOString(),
  };
}

// ─── بناء ملف شخصي لولي أمر أو طاقم ─────────────────────────────────────────

function buildAccountProfile(
  account: Record<string, unknown>,
  collections: ReturnType<typeof readAllCollections>
): PersonArchiveProfile {
  const aId = String(account.id ?? '');
  const aName = String(account.name ?? '');
  const role = String(account.role ?? 'parent') as PersonArchiveProfile['type'];

  const emails = Array.from(new Set([
    account.email, account.recoveryEmail,
  ].filter(Boolean) as string[]));

  // بصمة الوجه
  const faceRec = collections.faceRecords.find(
    (f: any) => f.userId === aId || f.accountId === aId
  ) as any;

  const linkedStudents = collections.students.filter(
    (s: any) => s.parentAccountId === aId || s.linkedParentId === aId ||
                (account.phone && s.parentPhone && String(account.phone).slice(-8) === String(s.parentPhone).slice(-8))
  ).map((s: any) => ({ id: String(s.id), name: String(s.fullName) }));

  const messages = collections.messages.filter(
    (m: any) => m.parentAccountId === aId || m.studentId === aId
  );

  const surveys = collections.surveys.filter(
    (s: any) => s.parentEmail === account.email
  );

  const reports = collections.reports.filter(
    (r: any) => r.generatedById === aId
  );

  const activityLog = collections.activities.filter(
    (a: any) => a.refId === aId
  );

  const loginMethods: string[] = [];
  if (account.createdVia) loginMethods.push(String(account.createdVia));
  if ((account as any).faceEnrolled || faceRec) loginMethods.push('face');

  return {
    archiveId: `profile_${role}_${aId}`,
    type: role === 'parent' ? 'parent' : role === 'doctor' ? 'doctor' : role === 'specialist' ? 'specialist' : 'teacher',
    fullName: aName,
    fullNameEn: '',
    nationalId: String(account.parentNationalId ?? ''),
    emails,
    phone: String(account.phone ?? ''),
    accountIds: [aId],
    firebaseUid: String(account.firebaseUid ?? ''),
    providerId: String(account.providerId ?? ''),
    loginMethods,
    schoolBranch: String(account.schoolBranch ?? ''),
    role: String(account.role ?? ''),
    createdAt: String(account.createdAt ?? ''),
    lastLoginAt: String(account.lastLoginAt ?? ''),
    lastActiveAt: String(account.lastActiveAt ?? ''),
    faceEnrolled: Boolean(faceRec),
    faceEnrolledAt: faceRec?.enrolledAt,
    faceEmbeddingsCount: faceRec
      ? ((faceRec.embeddings?.length ?? 0) + (faceRec.poses ? Object.keys(faceRec.poses).length : 0))
      : 0,
    faceEmbedding: faceRec?.embedding,
    parent: role === 'parent' ? {
      accountRecord: account,
      linkedStudents,
      messages,
      surveys,
      consentsSigned: [],
    } : undefined,
    staff: role !== 'parent' ? {
      accountRecord: account,
      reports,
      messages,
      sessions: [],
    } : undefined,
    allMessages: messages,
    activityLog,
    profileBuiltAt: new Date().toISOString(),
  };
}

// ─── دالة بناء كل الملفات الشخصية ───────────────────────────────────────────

export function buildAllPersonProfiles(
  collections: ReturnType<typeof readAllCollections>
): PersonArchiveProfile[] {
  const profiles: PersonArchiveProfile[] = [];
  const seenIds = new Set<string>();

  // 1. طلاب من الـ students store
  for (const s of collections.students) {
    const pid = String((s as any).id ?? '');
    if (!pid || seenIds.has(`student_${pid}`)) continue;
    seenIds.add(`student_${pid}`);
    profiles.push(buildStudentProfile(s, collections));
  }

  // 2. طلاب الفصل إذا لم يكونوا موجودين
  for (const s of collections.classStudents) {
    const pid = String((s as any).id ?? '');
    if (!pid || seenIds.has(`student_${pid}`)) continue;
    seenIds.add(`student_${pid}`);
    profiles.push(buildStudentProfile(s, collections));
  }

  // 3. الحسابات (أولياء أمور + طاقم)
  for (const a of collections.accounts) {
    const aid = String((a as any).id ?? '');
    const role = String((a as any).role ?? '');
    if (!aid) continue;
    const key = `${role}_${aid}`;
    if (seenIds.has(key)) continue;
    seenIds.add(key);
    profiles.push(buildAccountProfile(a, collections));
  }

  return profiles;
}

// ─── إنشاء Snapshot كامل ─────────────────────────────────────────────────────

export function createPlatformSnapshot(label?: string): PlatformSnapshot {
  const collections = readAllCollections();
  const personProfiles = buildAllPersonProfiles(collections);

  return {
    snapshotId: `snapshot_${Date.now()}`,
    createdAt: new Date().toISOString(),
    label: label ?? `نسخة احتياطية — ${new Date().toLocaleDateString('ar-SA')}`,
    stats: {
      totalStudents: collections.students.length + collections.classStudents.length,
      totalAccounts: collections.accounts.length,
      totalReports: collections.reports.length,
      totalSurveys: collections.surveys.length,
      totalHomeworkLogs: collections.homeworkLogs.length,
      totalCertificates: collections.certLogs.length,
      totalAttendance: collections.attendance.length,
      totalMessages: collections.messages.length,
      totalIkhlasLogs: collections.ikhlasLogs.length,
      totalActivities: collections.activities.length,
      totalFaceRecords: collections.faceRecords.length,
      // Phase 2A
      totalIepRecords: collections.iepRecords.length,
      totalSessionRecords: collections.sessionRecords.length,
      totalInvoices: collections.invoices.length,
      totalConsents: collections.consents.length,
      totalWaitlist: collections.waitlist.length,
      totalPoints: collections.points.length,
      totalNotifications: collections.notifications.length,
      totalAiThreads: collections.aiThreads.length,
    },
    students: collections.students,
    accounts: collections.accounts,
    reports: collections.reports,
    surveys: collections.surveys,
    homeworkLogs: collections.homeworkLogs,
    certificateLogs: collections.certLogs,
    attendance: collections.attendance,
    ikhlasLogs: collections.ikhlasLogs,
    ikhlasPosts: collections.ikhlasPosts,
    messages: collections.messages,
    activities: collections.activities,
    faceRecords: collections.faceRecords,
    classStudents: collections.classStudents,
    // Phase 2A
    iepRecords: collections.iepRecords,
    sessionRecords: collections.sessionRecords,
    invoices: collections.invoices,
    consents: collections.consents,
    waitlist: collections.waitlist,
    points: collections.points,
    pointTransactions: collections.pointTransactions,
    notifications: collections.notifications,
    dailyAttendance: collections.dailyAttendance,
    dailyHomework: collections.dailyHomework,
    dailyQuiz: collections.dailyQuiz,
    aiThreads: collections.aiThreads,
    personProfiles,
  };
}

// ─── حفظ / تحميل Snapshots ───────────────────────────────────────────────────

const SNAPSHOTS_KEY = 'masar.archive.snapshots.v1';
const MAX_SNAPSHOTS = 10;

export function getSavedSnapshots(): Array<{ id: string; createdAt: string; label: string; stats: PlatformSnapshot['stats'] }> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SNAPSHOTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveSnapshotMeta(snapshot: PlatformSnapshot) {
  if (typeof window === 'undefined') return;
  const existing = getSavedSnapshots();
  const meta = {
    id: snapshot.snapshotId,
    createdAt: snapshot.createdAt,
    label: snapshot.label ?? '',
    stats: snapshot.stats,
  };
  const updated = [meta, ...existing].slice(0, MAX_SNAPSHOTS);
  try {
    localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(updated));
  } catch {}
}

/** تنزيل snapshot كـ JSON */
export function downloadSnapshot(snapshot: PlatformSnapshot) {
  if (typeof window === 'undefined') return;
  const blob = new Blob(
    [JSON.stringify(snapshot, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `masar-archive-${snapshot.snapshotId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** تنزيل ملف شخصي فردي */
export function downloadPersonProfile(profile: PersonArchiveProfile) {
  if (typeof window === 'undefined') return;
  const blob = new Blob(
    [JSON.stringify(profile, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `profile-${profile.fullName.replace(/\s+/g, '-')}-${profile.archiveId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** تصدير قسم واحد فقط */
export function downloadCollection(name: string, data: Record<string, unknown>[]) {
  if (typeof window === 'undefined') return;
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `masar-${name}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
