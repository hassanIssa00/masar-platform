'use client';

import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
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

  const syncCollection = async <T>(collectionName: string, localKey: string) => {
    try {
      const snap = await getDocs(collection(db, collectionName));
      if (!snap.empty) {
        const cloudItems: T[] = snap.docs.map((docSnap) => docSnap.data() as T);
        // Merge cloud items into local storage
        const rawLocal = localStorage.getItem(localKey);
        const localItems: any[] = rawLocal ? JSON.parse(rawLocal) : [];
        
        const mergedMap = new Map<string, any>();
        localItems.forEach((item) => {
          if (item.id || item.accountId) mergedMap.set(item.id || item.accountId, item);
        });
        cloudItems.forEach((item: any) => {
          if (item.id || item.accountId) mergedMap.set(item.id || item.accountId, item);
        });

        const finalMerged = Array.from(mergedMap.values());
        writeLocal(localKey, finalMerged);
        
        // Push any local items missing in cloud up to cloud
        localItems.forEach((item) => {
          const id = item.id || item.accountId;
          if (id) syncDocToCloud(collectionName, id, item);
        });
      } else {
        // Cloud is empty, push existing local items up
        const rawLocal = localStorage.getItem(localKey);
        const localItems: any[] = rawLocal ? JSON.parse(rawLocal) : [];
        localItems.forEach((item) => {
          const id = item.id || item.accountId;
          if (id) syncDocToCloud(collectionName, id, item);
        });
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
    syncCollection<any>('credentials', KEYS.credentials),
  ]);
}

// Realtime listeners setup
export function subscribeToCloudUpdates(onUpdate?: () => void) {
  if (typeof window === 'undefined') return () => {};

  const unsubscribes: (() => void)[] = [];

  const setupListener = (collectionName: string, localKey: string) => {
    try {
      const unsub = onSnapshot(collection(db, collectionName), (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map((d) => d.data());
          writeLocal(localKey, items);
          if (onUpdate) onUpdate();
        }
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

  return () => {
    unsubscribes.forEach((unsub) => unsub());
  };
}
