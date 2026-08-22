'use client';

import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type {
  AccountRecord,
  StudentRecord,
  ReportRecord,
  SurveySubmission,
  ActivityRecord,
  MessageRecord,
} from './localDb';

const KEYS = {
  accounts: 'masar.accounts.v1',
  students: 'masar.students.v1',
  reports: 'masar.reports.v1',
  surveys: 'masar.surveys.v1',
  activity: 'masar.activity.v1',
  messages: 'masar.messages.v1',
  ikhlasLogs: 'masar.ikhlasLogs.v1',
  ikhlasPosts: 'masar.ikhlasPosts.v1',
  calendarSessions: 'masar.calendar_sessions.v1',
  faceRecords: 'masar.face.v1',
  notifications: 'masar.notifications.v1',
  attendance: 'masar.attendance.v1',
  assessmentTemplates: 'masar.assessmentTemplates.v1',
  assessmentResults: 'masar.assessmentResults.v1',
  iepRecords: 'masar.iep.v1',
  consents: 'masar.consents.v1',
  resources: 'masar.resources.v1',
  sessionRecords: 'masar.sessionRecords.v1',
  classStudents: 'masar_class_students_v1',
  studentNotes: 'masar_student_notes_v1',
  studentHomeworkLogs: 'masar_student_hw_logs_v1',
  studentCertLogs: 'masar_student_cert_logs_v1',
  curriculumFiles: 'masar_curriculum_files_v1',
  curriculumQuizzes: 'masar_curriculum_quizzes_v1',
  quizSubmissions: 'masar_quiz_submissions_v1',
  classroomQuizzes: 'masar_class_quizzes_v1',
  smartSchedules: 'masar_smart_schedule_v1',
  scheduleNotificationLogs: 'masar_notification_logs_v1',
  parentsCommunityChat: 'masar_parents_community_chat_v2',
  parentsChatSettings: 'masar_parents_chat_settings_v2',
  aiThreads: 'masar.ai.threads.v4',
  teacherAiThreads: 'masar_teacher_ai_threads_v2',
  branches: 'masar.branches.v1',
  homework: 'masar.homework.v1',
  invoices: 'masar.invoices.v1',
  waitlist: 'masar.waitlist.v1',
  points: 'masar.points.v1',
  pointTransactions: 'masar.transactions.v1',
  platformAnalytics: 'masar.analytics.v1',
};

type CloudPayload = unknown;

function hasCloudAuthSession() {
  return typeof window !== 'undefined' && Boolean(auth.currentUser);
}

function writeLocal<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage write error', e);
  }
}

async function writeDocThroughServer(collectionName: string, docId: string, data: CloudPayload) {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/data/doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ collectionName, docId, data }),
    });
    return res.ok;
  } catch (error) {
    console.error(`Server write failed for ${collectionName}:`, error);
    return false;
  }
}

async function deleteDocThroughServer(collectionName: string, docId: string) {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/data/doc', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ collectionName, docId }),
    });
    return res.ok;
  } catch (error) {
    console.error(`Server delete failed for ${collectionName}:`, error);
    return false;
  }
}

export async function pullServerSnapshotToLocal() {
  if (typeof window === 'undefined') return false;

  try {
    const res = await fetch('/api/data/snapshot', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    if (!res.ok) return false;
    const payload = await res.json();
    if (!payload?.ok || !payload.data) return false;

    Object.entries(KEYS).forEach(([payloadKey, localKey]) => {
      const items = payload.data[payloadKey];
      if (Array.isArray(items)) {
        writeLocal(localKey, items);
      }
    });

    return true;
  } catch (error) {
    console.error('Server snapshot sync failed:', error);
    return false;
  }
}

// Write helper to Firestore
export async function syncDocToCloud(collectionName: string, docId: string, data: CloudPayload) {
  const serverSaved = await writeDocThroughServer(collectionName, docId, data);
  if (serverSaved) return;
  if (!hasCloudAuthSession()) return;
  try {
    await setDoc(doc(db, collectionName, docId), data as Record<string, unknown>, { merge: true });
  } catch (err) {
    console.error(`Error writing to cloud collection ${collectionName}:`, err);
  }
}

// Delete helper from Firestore
export async function deleteDocFromCloud(collectionName: string, docId: string) {
  const serverDeleted = await deleteDocThroughServer(collectionName, docId);
  if (serverDeleted) return;
  if (!hasCloudAuthSession()) return;
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (err) {
    console.error(`Error deleting from cloud collection ${collectionName}:`, err);
  }
}

// Initial full sync from Firestore Cloud to LocalStorage
export async function pullCloudDataToLocal() {
  if (typeof window === 'undefined') return;
  const serverSynced = await pullServerSnapshotToLocal();
  if (serverSynced) return;
  if (!hasCloudAuthSession()) return;

  const syncCollection = async <T>(collectionName: string, localKey: string) => {
    try {
      const snap = await getDocs(collection(db, collectionName));

      if (!snap.empty) {
        // Cloud is the source of truth. LocalStorage is only a browser cache.
        const cloudItems: T[] = snap.docs.map((docSnap) => docSnap.data() as T);
        writeLocal(localKey, cloudItems);
      } else {
        writeLocal(localKey, []);
      }
    } catch (e) {
      console.error(`Sync error for ${collectionName}:`, e);
    }
  };

  await Promise.allSettled([
    syncCollection<AccountRecord>('accounts', KEYS.accounts),
    syncCollection<StudentRecord>('students', KEYS.students),
    syncCollection<ReportRecord>('reports', KEYS.reports),
    syncCollection<SurveySubmission>('surveys', KEYS.surveys),
    syncCollection<ActivityRecord>('activities', KEYS.activity),
    syncCollection<MessageRecord>('messages', KEYS.messages),
    syncCollection<CloudPayload>('ikhlasLogs', KEYS.ikhlasLogs),
    syncCollection<CloudPayload>('ikhlasPosts', KEYS.ikhlasPosts),
    syncCollection<CloudPayload>('calendar_sessions', KEYS.calendarSessions),
    syncCollection<CloudPayload>('faceRecords', KEYS.faceRecords),
    syncCollection<CloudPayload>('notifications', KEYS.notifications),
    syncCollection<CloudPayload>('attendance', KEYS.attendance),
    syncCollection<CloudPayload>('assessment_templates', KEYS.assessmentTemplates),
    syncCollection<CloudPayload>('assessment_results', KEYS.assessmentResults),
    syncCollection<CloudPayload>('iep_records', KEYS.iepRecords),
    syncCollection<CloudPayload>('consents', KEYS.consents),
    syncCollection<CloudPayload>('resources', KEYS.resources),
    syncCollection<CloudPayload>('session_records', KEYS.sessionRecords),
    syncCollection<CloudPayload>('class_students', KEYS.classStudents),
    syncCollection<CloudPayload>('student_notes', KEYS.studentNotes),
    syncCollection<CloudPayload>('student_homework_logs', KEYS.studentHomeworkLogs),
    syncCollection<CloudPayload>('student_cert_logs', KEYS.studentCertLogs),
    syncCollection<CloudPayload>('curriculum_files', KEYS.curriculumFiles),
    syncCollection<CloudPayload>('curriculum_quizzes', KEYS.curriculumQuizzes),
    syncCollection<CloudPayload>('quiz_submissions', KEYS.quizSubmissions),
    syncCollection<CloudPayload>('classroom_quizzes', KEYS.classroomQuizzes),
    syncCollection<CloudPayload>('smart_schedules', KEYS.smartSchedules),
    syncCollection<CloudPayload>('schedule_notification_logs', KEYS.scheduleNotificationLogs),
    syncCollection<CloudPayload>('parents_community_chat', KEYS.parentsCommunityChat),
    syncCollection<CloudPayload>('parents_chat_settings', KEYS.parentsChatSettings),
    syncCollection<CloudPayload>('ai_threads', KEYS.aiThreads),
    syncCollection<CloudPayload>('teacher_ai_chats', KEYS.teacherAiThreads),
    syncCollection<CloudPayload>('branches', KEYS.branches),
    syncCollection<CloudPayload>('homework', KEYS.homework),
    syncCollection<CloudPayload>('invoices', KEYS.invoices),
    syncCollection<CloudPayload>('waitlist', KEYS.waitlist),
    syncCollection<CloudPayload>('student_points', KEYS.points),
    syncCollection<CloudPayload>('point_transactions', KEYS.pointTransactions),
    syncCollection<CloudPayload>('platform_analytics', KEYS.platformAnalytics),
  ]);
}

// Realtime listeners — always mirrors cloud state into localStorage
export function subscribeToCloudUpdates(onUpdate?: () => void) {
  if (typeof window === 'undefined') return () => {};
  if (!hasCloudAuthSession()) {
    let disposed = false;
    const tick = async () => {
      const synced = await pullServerSnapshotToLocal();
      if (synced && onUpdate && !disposed) onUpdate();
    };
    tick();
    const interval = window.setInterval(tick, 10000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }

  const unsubscribes: (() => void)[] = [];

  const setupListener = (collectionName: string, localKey: string) => {
    try {
      const unsub = onSnapshot(collection(db, collectionName), (snap) => {
        // Always write what cloud says (even an empty array) so localStorage stays in sync
        const items = snap.docs.map((d) => d.data());
        writeLocal(localKey, items);
        if (onUpdate) onUpdate();
      });
      unsubscribes.push(unsub);
    } catch (e) {
      console.error(`Listener setup failed for ${collectionName}:`, e);
    }
  };

  setupListener('students', KEYS.students);
  setupListener('reports', KEYS.reports);
  setupListener('messages', KEYS.messages);
  setupListener('accounts', KEYS.accounts);
  setupListener('surveys', KEYS.surveys);
  setupListener('ikhlasLogs', KEYS.ikhlasLogs);
  setupListener('ikhlasPosts', KEYS.ikhlasPosts);
  setupListener('calendar_sessions', KEYS.calendarSessions);
  setupListener('faceRecords', KEYS.faceRecords);
  setupListener('notifications', KEYS.notifications);
  setupListener('attendance', KEYS.attendance);
  setupListener('assessment_templates', KEYS.assessmentTemplates);
  setupListener('assessment_results', KEYS.assessmentResults);
  setupListener('iep_records', KEYS.iepRecords);
  setupListener('consents', KEYS.consents);
  setupListener('resources', KEYS.resources);
  setupListener('session_records', KEYS.sessionRecords);
  setupListener('class_students', KEYS.classStudents);
  setupListener('student_notes', KEYS.studentNotes);
  setupListener('student_homework_logs', KEYS.studentHomeworkLogs);
  setupListener('student_cert_logs', KEYS.studentCertLogs);
  setupListener('curriculum_files', KEYS.curriculumFiles);
  setupListener('curriculum_quizzes', KEYS.curriculumQuizzes);
  setupListener('quiz_submissions', KEYS.quizSubmissions);
  setupListener('classroom_quizzes', KEYS.classroomQuizzes);
  setupListener('smart_schedules', KEYS.smartSchedules);
  setupListener('schedule_notification_logs', KEYS.scheduleNotificationLogs);
  setupListener('parents_community_chat', KEYS.parentsCommunityChat);
  setupListener('parents_chat_settings', KEYS.parentsChatSettings);
  setupListener('ai_threads', KEYS.aiThreads);
  setupListener('teacher_ai_chats', KEYS.teacherAiThreads);
  setupListener('branches', KEYS.branches);
  setupListener('homework', KEYS.homework);
  setupListener('invoices', KEYS.invoices);
  setupListener('waitlist', KEYS.waitlist);
  setupListener('student_points', KEYS.points);
  setupListener('point_transactions', KEYS.pointTransactions);
  setupListener('platform_analytics', KEYS.platformAnalytics);

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}

export function subscribeToCloudCollection<T>(
  collectionName: string,
  localKey: keyof typeof KEYS,
  onItems: (items: T[]) => void,
) {
  if (typeof window === 'undefined') return () => {};
  if (!hasCloudAuthSession()) {
    let disposed = false;
    const emit = async () => {
      await pullServerSnapshotToLocal();
      try {
        const raw = localStorage.getItem(KEYS[localKey]);
        if (!disposed) onItems(raw ? (JSON.parse(raw) as T[]) : []);
      } catch {
        if (!disposed) onItems([]);
      }
    };
    emit();
    const interval = window.setInterval(emit, 10000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }

  try {
    const unsub = onSnapshot(
      collection(db, collectionName),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as T);
        writeLocal(KEYS[localKey], items);
        onItems(items);
      },
      (error) => {
        console.error(`Cloud listener failed for ${collectionName}:`, error);
        const raw = localStorage.getItem(KEYS[localKey]);
        onItems(raw ? (JSON.parse(raw) as T[]) : []);
      },
    );
    return unsub;
  } catch (error) {
    console.error(`Listener setup failed for ${collectionName}:`, error);
    const raw = localStorage.getItem(KEYS[localKey]);
    onItems(raw ? (JSON.parse(raw) as T[]) : []);
    return () => {};
  }
}
