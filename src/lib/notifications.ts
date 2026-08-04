'use client';

import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';

export type NotificationType = 'survey' | 'report' | 'meeting' | 'message' | 'student' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

const LOCAL_KEY = 'masar.notifications.v1';

function getLocalNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalNotifications(items: AppNotification[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

export async function createNotification(notif: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) {
  const item: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...notif,
    read: false,
    createdAt: new Date().toISOString(),
  };

  // Save to local
  const current = getLocalNotifications();
  saveLocalNotifications([item, ...current].slice(0, 50));

  // Sync to Firestore
  try {
    await addDoc(collection(db, 'notifications'), item);
  } catch (e) {
    console.warn('Failed to sync notification to Firestore:', e);
  }
  return item;
}

export function subscribeToNotifications(cb: (notifs: AppNotification[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  // First give local items instantly
  cb(getLocalNotifications());

  // Listen to Firestore
  const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    if (!snap.empty) {
      const cloudItems = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AppNotification));
      saveLocalNotifications(cloudItems);
      cb(cloudItems);
    }
  }, () => {
    // fallback on error
    cb(getLocalNotifications());
  });
}

export async function markNotificationAsRead(id: string) {
  const current = getLocalNotifications();
  const next = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveLocalNotifications(next);
}

export async function clearAllNotifications() {
  saveLocalNotifications([]);
}
