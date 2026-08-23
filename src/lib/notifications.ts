'use client';

import { readCloudCache, syncDocToCloud, subscribeToCloudCollection, writeCloudCache } from './firestoreSync';

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
  return readCloudCache<AppNotification>(LOCAL_KEY);
}

function saveLocalNotifications(items: AppNotification[]) {
  if (typeof window === 'undefined') return;
  writeCloudCache(LOCAL_KEY, items);
}

export async function createNotification(notif: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) {
  const item: AppNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...notif,
    read: false,
    createdAt: new Date().toISOString(),
  };

  const current = getLocalNotifications();
  saveLocalNotifications([item, ...current].slice(0, 50));

  await syncDocToCloud('notifications', item.id, item);
  return item;
}

export function subscribeToNotifications(cb: (notifs: AppNotification[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  cb(getLocalNotifications());
  return subscribeToCloudCollection<AppNotification>('notifications', 'notifications', (items) => {
    const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
    saveLocalNotifications(sorted);
    cb(sorted);
  });
}

export async function markNotificationAsRead(id: string) {
  const current = getLocalNotifications();
  const next = current.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveLocalNotifications(next);
  const item = next.find((n) => n.id === id);
  if (item) await syncDocToCloud('notifications', id, item);
}

export async function clearAllNotifications() {
  saveLocalNotifications([]);
}
