'use client';

import { readCloudCache, syncDocToCloud, subscribeToCloudCollection, writeCloudCache, deleteDocFromCloud } from './firestoreSync';

export type NotificationType =
  | 'survey'
  | 'report'
  | 'meeting'
  | 'message'
  | 'student'
  | 'system'
  | 'achievement'
  | 'homework'
  | 'assessment';

export type TargetRole = 'doctor' | 'parent' | 'student' | 'all';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
  targetRole?: TargetRole;
  studentId?: string;
  studentName?: string;
  targetUserId?: string;
}

const LOCAL_KEY = 'masar.notifications.v1';

export function getLocalNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  return readCloudCache<AppNotification>(LOCAL_KEY);
}

export function saveLocalNotifications(items: AppNotification[]) {
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
  saveLocalNotifications([item, ...current].slice(0, 60));

  await syncDocToCloud('notifications', item.id, item);
  return item;
}

export function subscribeToNotifications(cb: (notifs: AppNotification[]) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  cb(getLocalNotifications());
  return subscribeToCloudCollection<AppNotification>('notifications', 'notifications', (items) => {
    const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 60);
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
  const current = getLocalNotifications();
  saveLocalNotifications([]);
  await Promise.allSettled(current.map(n => deleteDocFromCloud('notifications', n.id)));
}

export async function clearNotificationsForRole(role: 'doctor' | 'parent' | 'student', studentId?: string) {
  const current = getLocalNotifications();
  const matching = current.filter(n => matchesNotificationRole(n, role, studentId));
  const remaining = current.filter(n => !matchesNotificationRole(n, role, studentId));
  saveLocalNotifications(remaining);
  await Promise.allSettled(matching.map(n => deleteDocFromCloud('notifications', n.id)));
}

/**
 * Filter notifications strictly according to the recipient's role and student link.
 * Doctor NEVER sees parent-targeted praise/certificates ("ابنكم البطل", etc.).
 */
export function matchesNotificationRole(
  n: AppNotification,
  role: 'doctor' | 'parent' | 'student',
  studentId?: string
): boolean {
  // 1. Explicit targetRole check
  if (n.targetRole) {
    if (n.targetRole !== 'all' && n.targetRole !== role) {
      return false;
    }
    // If student/parent notification is bound to a specific student, ensure match
    if ((role === 'parent' || role === 'student') && n.studentId && n.studentId !== 'all') {
      if (studentId && n.studentId !== studentId) {
        return false;
      }
    }
    return true;
  }

  // 2. Legacy fallback heuristics for notifications created without explicit targetRole
  const text = `${n.title || ''} ${n.body || ''} ${n.link || ''}`.toLowerCase();
  const isParentSpecific = /ابنكم|ولي\s*الأمر|ولي\s*أمر|عزيزي ولي|لوحة ولي|school-parent/i.test(text);
  const isDoctorSpecific = /تسليم واجب|سلّم الطالب|حل وتسليم|قام الطالب|استبيان جديد|طلب تسجيل|ikhlas-jeddah/i.test(text);
  const isStudentSpecific = /يا بطل|شهاداتي|بوابة الطالب|school-student/i.test(text);

  if (role === 'doctor') {
    // Dr. Ismail must NEVER see messages directed at parents or encouraging students
    if (isParentSpecific || isStudentSpecific) return false;
    // Show doctor alerts (homework submissions, surveys, parent inquiries)
    return isDoctorSpecific;
  }

  if (role === 'parent') {
    // Parent shouldn't see doctor-only submissions
    if (isDoctorSpecific && !isParentSpecific) return false;
    if (n.studentId && studentId && n.studentId !== 'all' && n.studentId !== studentId) {
      return false;
    }
    return isParentSpecific || !isStudentSpecific;
  }

  if (role === 'student') {
    if (isParentSpecific || (isDoctorSpecific && !isStudentSpecific)) return false;
    if (n.studentId && studentId && n.studentId !== 'all' && n.studentId !== studentId) {
      return false;
    }
    return isStudentSpecific;
  }

  return true;
}
