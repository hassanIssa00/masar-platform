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
