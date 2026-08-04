'use client';

import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  setDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  updateDoc,
  deleteDoc,
  where,
} from 'firebase/firestore';

/* ────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────── */
export type AnalyticsEventType = 'visit' | 'login' | 'register' | 'logout' | 'login_failed';

export interface AnalyticsEvent {
  id?: string;
  type: AnalyticsEventType;
  userId?: string;
  userName?: string;
  userRole?: string;
  device: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  screenWidth: number;
  page?: string;
  createdAt: string;
}

export interface PlatformConfig {
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  whiteboardEnabled: boolean;
  gamesEnabled: boolean;
  surveysEnabled: boolean;
  reportsEnabled: boolean;
  maxStudentsPerDoctor: number;
  sessionTimeoutMinutes: number;
  welcomeMessage: string;
  updatedAt: string;
}

export const DEFAULT_CONFIG: PlatformConfig = {
  maintenanceMode: false,
  allowRegistrations: true,
  whiteboardEnabled: true,
  gamesEnabled: true,
  surveysEnabled: true,
  reportsEnabled: true,
  maxStudentsPerDoctor: 50,
  sessionTimeoutMinutes: 60,
  welcomeMessage: 'مرحباً بك في منصة مسار',
  updatedAt: new Date().toISOString(),
};

export interface AnalyticsSummary {
  totalVisits: number;
  totalLogins: number;
  totalRegistrations: number;
  totalFailedLogins: number;
  todayVisits: number;
  todayLogins: number;
  todayRegistrations: number;
  weeklyTrend: { date: string; visits: number; logins: number }[]; // last 7 days
  deviceBreakdown: { mobile: number; tablet: number; desktop: number };
  osBreakdown: Record<string, number>;
  browserBreakdown: Record<string, number>;
  recentEvents: AnalyticsEvent[];
  hourlyLogins: number[]; // 24 values
}

/* ────────────────────────────────────────────────
   DETECTION HELPERS
──────────────────────────────────────────────── */
function detectDevice(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function detectOS(ua: string): string {
  if (/windows/i.test(ua)) return 'Windows';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad/i.test(ua)) return 'iOS';
  if (/mac/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Unknown';
}

function detectBrowser(ua: string): string {
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome/i.test(ua) && !/chromium/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/opera|opr/i.test(ua)) return 'Opera';
  return 'Other';
}

/* ────────────────────────────────────────────────
   TRACK EVENT
──────────────────────────────────────────────── */
export async function trackEvent(
  type: AnalyticsEventType,
  extra?: { userId?: string; userName?: string; userRole?: string; page?: string }
) {
  if (typeof window === 'undefined') return;
  try {
    const ua = navigator.userAgent;
    const width = window.screen.width;
    const event: AnalyticsEvent = {
      type,
      device: detectDevice(width),
      os: detectOS(ua),
      browser: detectBrowser(ua),
      screenWidth: width,
      createdAt: new Date().toISOString(),
      ...(extra || {}),
    };
    await addDoc(collection(db, 'platform_analytics'), event);
  } catch (e) {
    console.warn('Analytics track failed:', e);
  }
}

/* ────────────────────────────────────────────────
   REALTIME SUBSCRIPTION
──────────────────────────────────────────────── */
export function subscribeToRecentEvents(
  callback: (events: AnalyticsEvent[]) => void
): () => void {
  const q = query(
    collection(db, 'platform_analytics'),
    orderBy('createdAt', 'desc'),
    limit(30)
  );
  return onSnapshot(q, (snap) => {
    const events = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AnalyticsEvent));
    callback(events);
  });
}

/* ────────────────────────────────────────────────
   FETCH FULL SUMMARY
──────────────────────────────────────────────── */
function isoDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const snap = await getDocs(
    query(collection(db, 'platform_analytics'), orderBy('createdAt', 'desc'), limit(1000))
  );
  const events: AnalyticsEvent[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AnalyticsEvent));

  const today = todayStart();
  const todayEvents = events.filter((e) => e.createdAt >= today);

  // Weekly trend (last 7 days)
  const weeklyMap: Record<string, { visits: number; logins: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    weeklyMap[isoDateStr(d)] = { visits: 0, logins: 0 };
  }
  events.forEach((e) => {
    const day = e.createdAt.slice(0, 10);
    if (weeklyMap[day]) {
      if (e.type === 'visit') weeklyMap[day].visits++;
      if (e.type === 'login') weeklyMap[day].logins++;
    }
  });
  const weeklyTrend = Object.entries(weeklyMap).map(([date, v]) => ({ date, ...v }));

  const deviceBreakdown = { mobile: 0, tablet: 0, desktop: 0 };
  const osBreakdown: Record<string, number> = {};
  const browserBreakdown: Record<string, number> = {};
  const hourlyLogins = new Array(24).fill(0);

  events.forEach((e) => {
    deviceBreakdown[e.device] = (deviceBreakdown[e.device] || 0) + 1;
    osBreakdown[e.os] = (osBreakdown[e.os] || 0) + 1;
    browserBreakdown[e.browser] = (browserBreakdown[e.browser] || 0) + 1;
    if (e.type === 'login') {
      hourlyLogins[new Date(e.createdAt).getHours()]++;
    }
  });

  return {
    totalVisits: events.filter((e) => e.type === 'visit').length,
    totalLogins: events.filter((e) => e.type === 'login').length,
    totalRegistrations: events.filter((e) => e.type === 'register').length,
    totalFailedLogins: events.filter((e) => e.type === 'login_failed').length,
    todayVisits: todayEvents.filter((e) => e.type === 'visit').length,
    todayLogins: todayEvents.filter((e) => e.type === 'login').length,
    todayRegistrations: todayEvents.filter((e) => e.type === 'register').length,
    weeklyTrend,
    deviceBreakdown,
    osBreakdown,
    browserBreakdown,
    recentEvents: events.slice(0, 50),
    hourlyLogins,
  };
}

/* ────────────────────────────────────────────────
   PLATFORM CONFIG
──────────────────────────────────────────────── */
const CONFIG_DOC = 'platform_config/main';

export async function getPlatformConfig(): Promise<PlatformConfig> {
  try {
    const snap = await getDoc(doc(db, 'platform_config', 'main'));
    if (snap.exists()) return snap.data() as PlatformConfig;
    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function savePlatformConfig(config: Partial<PlatformConfig>) {
  await setDoc(doc(db, 'platform_config', 'main'), {
    ...DEFAULT_CONFIG,
    ...config,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export function subscribeToPlatformConfig(cb: (cfg: PlatformConfig) => void): () => void {
  return onSnapshot(doc(db, 'platform_config', 'main'), (snap) => {
    if (snap.exists()) cb(snap.data() as PlatformConfig);
    else cb(DEFAULT_CONFIG);
  });
}
