'use client';

import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { isDataCleared } from './localDb';
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
  credentials: 'masar.credentials.v1',
  ikhlasLogs: 'masar.ikhlasLogs.v1',
  ikhlasPosts: 'masar.ikhlasPosts.v1',
  calendarSessions: 'masar.calendar_sessions.v1',
};

function writeLocal<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('LocalStorage write error', e);
  }
}

// Write helper to Firestore
export async function syncDocToCloud(collectionName: string, docId: string, data: any) {
  try {
    await setDoc(doc(db, collectionName, docId), data, { merge: true });
  } catch (err) {
    console.error(`Error writing to cloud collection ${collectionName}:`, err);
  }
}

// Delete helper from Firestore
export async function deleteDocFromCloud(collectionName: string, docId: string) {
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (err) {
    console.error(`Error deleting from cloud collection ${collectionName}:`, err);
  }
}

// Initial full sync from Firestore Cloud to LocalStorage
export async function pullCloudDataToLocal() {
  if (typeof window === 'undefined') return;

  // If the admin cleared data, NEVER push stale local records back to cloud.
  const dataWasCleared = isDataCleared();

  const syncCollection = async <T>(collectionName: string, localKey: string) => {
    try {
      const snap = await getDocs(collection(db, collectionName));

      if (!snap.empty) {
        // Cloud has real data — pull it into localStorage (cloud is the source of truth)
        const cloudItems: T[] = snap.docs.map((docSnap) => docSnap.data() as T);
        writeLocal(localKey, cloudItems);

        // Only push local-only items up if data has NOT been deliberately cleared
        if (!dataWasCleared) {
          const rawLocal = localStorage.getItem(localKey);
          const localItems: any[] = rawLocal ? JSON.parse(rawLocal) : [];
          localItems.forEach((item) => {
            const id = item.id || item.accountId;
            const inCloud = cloudItems.some((c: any) => (c.id || c.accountId) === id);
            if (id && !inCloud) syncDocToCloud(collectionName, id, item);
          });
        }
      } else {
        // Cloud is empty
        if (dataWasCleared) {
          // Purge was deliberate — wipe localStorage as well so nothing leaks back
          writeLocal(localKey, []);
        } else {
          // Cloud is empty, but no purge flag — push local items up (first-run scenario)
          const rawLocal = localStorage.getItem(localKey);
          const localItems: any[] = rawLocal ? JSON.parse(rawLocal) : [];
          localItems.forEach((item) => {
            const id = item.id || item.accountId;
            if (id) syncDocToCloud(collectionName, id, item);
          });
        }
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
    syncCollection<any>('ikhlasLogs', KEYS.ikhlasLogs),
    syncCollection<any>('ikhlasPosts', KEYS.ikhlasPosts),
    syncCollection<any>('calendar_sessions', KEYS.calendarSessions),
    syncCollection<any>('credentials', KEYS.credentials),
  ]);
}

// Realtime listeners — always mirrors cloud state into localStorage
export function subscribeToCloudUpdates(onUpdate?: () => void) {
  if (typeof window === 'undefined') return () => {};

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

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}
