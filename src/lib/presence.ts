'use client';

import { readCloudCache, writeCloudCache, syncDocToCloud } from './firestoreSync';
import { getSession } from './cloudStore';

export interface PresenceInfo {
  text: string;
  isOnline: boolean;
  statusColor: string;
  badgeClass: string;
  dotClass: string;
  title: string;
  rawDate: Date | null;
}

/**
 * Formats a timestamp into clean, user-friendly Arabic relative activity status.
 * e.g. "متصل الآن 🟢", "منذ 15 دقيقة", "اليوم 04:30 م", "أمس 08:15 م", "05/09/2026"
 */
export function formatLastSeen(dateString?: string | null): PresenceInfo {
  if (!dateString) {
    return {
      text: 'لم يسجل دخول بعد',
      isOnline: false,
      statusColor: 'text-slate-400',
      badgeClass: 'bg-slate-100 text-slate-500 border border-slate-200',
      dotClass: 'bg-slate-300',
      title: 'لم يتم تسجيل الدخول بعد',
      rawDate: null,
    };
  }

  const d = new Date(dateString);
  if (isNaN(d.getTime())) {
    return {
      text: 'غير متاح',
      isOnline: false,
      statusColor: 'text-slate-400',
      badgeClass: 'bg-slate-100 text-slate-500 border border-slate-200',
      dotClass: 'bg-slate-300',
      title: 'تاريخ غير صالح',
      rawDate: null,
    };
  }

  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));

  // Within the last 10 minutes -> Online now!
  if (diffMinutes >= 0 && diffMinutes < 10) {
    return {
      text: 'متصل الآن 🟢',
      isOnline: true,
      statusColor: 'text-emerald-600',
      badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs font-black',
      dotClass: 'bg-emerald-500 ring-2 ring-emerald-300 animate-pulse',
      title: `متصل بالمنصة الآن (آخر نشاط منذ ${diffMinutes === 0 ? 'لحظات' : `${diffMinutes} دقيقة`})`,
      rawDate: d,
    };
  }

  // Within the last 60 minutes
  if (diffMinutes >= 10 && diffMinutes < 60) {
    return {
      text: `منذ ${diffMinutes} دقيقة`,
      isOnline: false,
      statusColor: 'text-teal-700',
      badgeClass: 'bg-teal-50 text-teal-800 border border-teal-200 font-bold',
      dotClass: 'bg-teal-400',
      title: `آخر نشاط منذ ${diffMinutes} دقيقة (${d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })})`,
      rawDate: d,
    };
  }

  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const timeStr = d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  if (isToday) {
    return {
      text: `اليوم ${timeStr}`,
      isOnline: false,
      statusColor: 'text-blue-700',
      badgeClass: 'bg-blue-50 text-blue-800 border border-blue-200 font-bold',
      dotClass: 'bg-blue-400',
      title: `آخر ظهور اليوم الساعة ${timeStr}`,
      rawDate: d,
    };
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return {
      text: `أمس ${timeStr}`,
      isOnline: false,
      statusColor: 'text-indigo-700',
      badgeClass: 'bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold',
      dotClass: 'bg-indigo-400',
      title: `آخر ظهور أمس الساعة ${timeStr}`,
      rawDate: d,
    };
  }

  // Older
  const dateStr = d.toLocaleDateString('ar-SA', { month: 'numeric', day: 'numeric' });
  return {
    text: `${dateStr} (${timeStr})`,
    isOnline: false,
    statusColor: 'text-slate-600',
    badgeClass: 'bg-slate-50 text-slate-700 border border-slate-200 font-bold',
    dotClass: 'bg-slate-400',
    title: `آخر ظهور في ${d.toLocaleString('ar-SA')}`,
    rawDate: d,
  };
}

let lastPresencePing = 0;
const PRESENCE_THROTTLE_MS = 3 * 60 * 1000; // Ping at most once every 3 minutes

/**
 * Pings the server presence endpoint to mark the current user (student or parent)
 * as active right now, updating timestamps across accounts, students, and class_students.
 */
export async function recordUserPresence(opts?: { role?: string; studentId?: string }): Promise<void> {
  if (typeof window === 'undefined') return;

  const now = Date.now();
  if (now - lastPresencePing < PRESENCE_THROTTLE_MS) {
    return;
  }
  lastPresencePing = now;

  try {
    const session = getSession();
    const role = opts?.role || session?.role;
    const studentId = opts?.studentId || session?.linkedStudentId;

    void fetch('/api/auth/presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        role,
        studentId,
      }),
    }).catch(() => {});
  } catch {}
}
