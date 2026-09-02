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
  curriculumAssignments: 'masar.curriculumAssignments.v1',
  curriculumDrawings: 'masar.curriculumDrawings.v1',
  curriculumQuizzes: 'masar_curriculum_quizzes_v1',
  quizSubmissions: 'masar_quiz_submissions_v1',
  classroomQuizzes: 'masar_class_quizzes_v1',
  smartSchedules: 'masar_smart_schedule_v1',
  scheduleNotificationLogs: 'masar_notification_logs_v1',
  liveSessions: 'ikhlas_live_sessions_v1',
  periodAttendance: 'masar_period_attendance_v2_',
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
  studentLearningActivity: 'masar.studentLearningActivity.v1',
  simpleSpellingAssignments: 'masar.simpleSpellingAssignments.v1',
  simpleSpellingDrawings: 'masar.simpleSpellingDrawings.v1',
  dailyAttendanceArchive: 'masar.daily_attendance_archive.v1',
  dailyHomeworkArchive: 'masar.daily_homework_archive.v1',
  dailyQuizArchive: 'masar.daily_quiz_archive.v1',
  meetingChats: 'masar.meeting_chats.v1',
};

type CloudPayload = unknown;
const memoryCache = new Map<string, unknown[]>();
const SERVER_SNAPSHOT_POLL_MS = 60_000;
let serverSnapshotBackoffUntil = 0;
const CLOUD_COLLECTIONS = [
  ['accounts', 'accounts'],
  ['students', 'students'],
  ['reports', 'reports'],
  ['surveys', 'surveys'],
  ['activity', 'activities'],
  ['messages', 'messages'],
  ['ikhlasLogs', 'ikhlasLogs'],
  ['ikhlasPosts', 'ikhlasPosts'],
  ['calendarSessions', 'calendar_sessions'],
  ['faceRecords', 'faceRecords'],
  ['notifications', 'notifications'],
  ['attendance', 'attendance'],
  ['assessmentTemplates', 'assessment_templates'],
  ['assessmentResults', 'assessment_results'],
  ['iepRecords', 'iep_records'],
  ['consents', 'consents'],
  ['resources', 'resources'],
  ['sessionRecords', 'session_records'],
  ['classStudents', 'class_students'],
  ['studentNotes', 'student_notes'],
  ['studentHomeworkLogs', 'student_homework_logs'],
  ['studentCertLogs', 'student_cert_logs'],
  ['curriculumFiles', 'curriculum_files'],
  ['curriculumAssignments', 'curriculum_assignments'],
  ['curriculumDrawings', 'curriculum_drawings'],
  ['curriculumQuizzes', 'curriculum_quizzes'],
  ['quizSubmissions', 'quiz_submissions'],
  ['classroomQuizzes', 'classroom_quizzes'],
  ['smartSchedules', 'smart_schedules'],
  ['scheduleNotificationLogs', 'schedule_notification_logs'],
  ['liveSessions', 'live_sessions'],
  ['periodAttendance', 'period_attendance'],
  ['parentsCommunityChat', 'parents_community_chat'],
  ['parentsChatSettings', 'parents_chat_settings'],
  ['aiThreads', 'ai_threads'],
  ['teacherAiThreads', 'teacher_ai_chats'],
  ['branches', 'branches'],
  ['homework', 'homework'],
  ['invoices', 'invoices'],
  ['waitlist', 'waitlist'],
  ['points', 'student_points'],
  ['pointTransactions', 'point_transactions'],
  ['platformAnalytics', 'platform_analytics'],
  ['studentLearningActivity', 'student_learning_activity'],
  ['simpleSpellingAssignments', 'simple_spelling_assignments'],
  ['simpleSpellingDrawings', 'simple_spelling_drawings'],
  ['dailyAttendanceArchive', 'daily_attendance_archive'],
  ['dailyHomeworkArchive', 'daily_homework_archive'],
  ['dailyQuizArchive', 'daily_quiz_archive'],
  ['meetingChats', 'meeting_chats'],
] as const satisfies Array<[keyof typeof KEYS, string]>;

function selectedCollections(collectionKeys?: Array<keyof typeof KEYS>) {
  if (!collectionKeys?.length) return CLOUD_COLLECTIONS;
  const selected = new Set(collectionKeys);
  return CLOUD_COLLECTIONS.filter(([key]) => selected.has(key));
}

function hasCloudAuthSession() {
  return typeof window !== 'undefined' && Boolean(auth.currentUser);
}

export function readCloudCache<T>(key: string): T[] {
  const inMemory = memoryCache.get(key) as T[] | undefined;
  if (inMemory !== undefined) return inMemory;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          memoryCache.set(key, parsed);
          return parsed as T[];
        }
      }
    } catch {}
  }
  return [];
}

export function writeCloudCache<T>(key: string, data: T[]) {
  memoryCache.set(key, data);
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
  window.dispatchEvent(new CustomEvent('masar:cloud-cache-update', { detail: { key } }));
}

export function clearCloudCache(keys?: string[]) {
  if (keys?.length) {
    keys.forEach((key) => {
      memoryCache.delete(key);
      if (typeof window !== 'undefined') {
        try { localStorage.removeItem(key); } catch {}
      }
    });
  } else {
    memoryCache.clear();
    if (typeof window !== 'undefined') {
      try {
        Object.values(KEYS).forEach((k) => {
          try { localStorage.removeItem(k); } catch {}
        });
      } catch {}
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('masar:cloud-cache-update', { detail: { cleared: true } }));
  }
}

function writeLocal<T>(key: string, data: T[]) {
  writeCloudCache(key, data);
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

export function clearSnapshotBackoff() {
  serverSnapshotBackoffUntil = 0;
}

const inFlightSnapshots = new Map<string, Promise<boolean>>();

export async function pullServerSnapshotToLocal(collectionKeys?: Array<keyof typeof KEYS>) {
  if (typeof window === 'undefined') return false;
  if (Date.now() < serverSnapshotBackoffUntil) return false;

  const keyParam = collectionKeys?.length
    ? [...collectionKeys].sort().join(',')
    : 'ALL';

  if (inFlightSnapshots.has(keyParam)) {
    return inFlightSnapshots.get(keyParam)!;
  }

  const fetchPromise = (async () => {
    try {
      const params = collectionKeys?.length
        ? `?collections=${encodeURIComponent(collectionKeys.join(','))}`
        : '';
      const res = await fetch(`/api/data/snapshot${params}`, {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });

      if (!res.ok) return false;

      const payload = await res.json();
      if (!payload?.ok || !payload.data) return false;
      if (typeof payload.retryAfterMs === 'number' && payload.retryAfterMs > 0) {
        serverSnapshotBackoffUntil = Date.now() + payload.retryAfterMs;
      }

      const failedKeys = new Set<string>(
        Array.isArray(payload.failedCollections)
          ? payload.failedCollections.map((item: { key?: string }) => item.key).filter(Boolean)
          : [],
      );

      Object.entries(KEYS).forEach(([payloadKey, localKey]) => {
        if (failedKeys.has(payloadKey)) return;
        const items = payload.data[payloadKey];
        if (Array.isArray(items)) {
          writeLocal(localKey, items);
        }
      });

      return true;
    } catch (error) {
      console.error('Server snapshot sync failed:', error);
      serverSnapshotBackoffUntil = Date.now() + 10_000;
      return false;
    } finally {
      inFlightSnapshots.delete(keyParam);
    }
  })();

  inFlightSnapshots.set(keyParam, fetchPromise);
  return fetchPromise;
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

// Initial full sync from Firestore Cloud to the in-memory browser cache.
export async function pullCloudDataToLocal(collectionKeys?: Array<keyof typeof KEYS>) {
  if (typeof window === 'undefined') return;
  const serverSynced = await pullServerSnapshotToLocal(collectionKeys);
  if (serverSynced) return;
  if (!hasCloudAuthSession()) return;

  const syncCollection = async <T>(collectionName: string, localKey: string) => {
    try {
      const snap = await getDocs(collection(db, collectionName));

      if (!snap.empty) {
        // Cloud is the source of truth. The client cache only keeps the current screen responsive.
        const cloudItems: T[] = snap.docs.map((docSnap) => docSnap.data() as T);
        writeLocal(localKey, cloudItems);
      } else {
        writeLocal(localKey, []);
      }
    } catch (e) {
      console.error(`Sync error for ${collectionName}:`, e);
    }
  };

  await Promise.allSettled(
    selectedCollections(collectionKeys).map(([key, collectionName]) =>
      syncCollection<CloudPayload>(collectionName, KEYS[key]),
    ),
  );
}

// Realtime listeners — always mirrors cloud state into the in-memory cache.
export function subscribeToCloudUpdates(onUpdate?: () => void, collectionKeys?: Array<keyof typeof KEYS>) {
  if (typeof window === 'undefined') return () => {};
  if (!hasCloudAuthSession()) {
    let disposed = false;
    const tick = async () => {
      const synced = await pullServerSnapshotToLocal(collectionKeys);
      if (synced && onUpdate && !disposed) onUpdate();
    };
    tick();
    const interval = window.setInterval(tick, SERVER_SNAPSHOT_POLL_MS);
    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }

  const unsubscribes: (() => void)[] = [];

  const setupListener = (collectionName: string, localKey: string) => {
    try {
      const unsub = onSnapshot(collection(db, collectionName), (snap) => {
        // Always write what cloud says (even an empty array) so the client cache stays in sync.
        const items = snap.docs.map((d) => d.data());
        writeLocal(localKey, items);
        if (onUpdate) onUpdate();
      });
      unsubscribes.push(unsub);
    } catch (e) {
      console.error(`Listener setup failed for ${collectionName}:`, e);
    }
  };

  selectedCollections(collectionKeys).forEach(([key, collectionName]) => {
    setupListener(collectionName, KEYS[key]);
  });

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
      await pullServerSnapshotToLocal([localKey]);
      if (!disposed) onItems(readCloudCache<T>(KEYS[localKey]));
    };
    emit();
    const interval = window.setInterval(emit, SERVER_SNAPSHOT_POLL_MS);
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
        onItems(readCloudCache<T>(KEYS[localKey]));
      },
    );
    return unsub;
  } catch (error) {
    console.error(`Listener setup failed for ${collectionName}:`, error);
    onItems(readCloudCache<T>(KEYS[localKey]));
    return () => {};
  }
}
