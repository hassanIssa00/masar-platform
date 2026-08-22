'use client';

import { auth, db } from './firebase';
import {
  setDoc,
  doc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import { pullServerSnapshotToLocal, subscribeToCloudCollection, syncDocToCloud } from './firestoreSync';

/* ────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────── */
export type AnalyticsEventType =
  | 'visit'
  | 'login'
  | 'login_google'
  | 'login_apple'
  | 'login_microsoft'
  | 'login_face'
  | 'register'
  | 'register_google'
  | 'register_apple'
  | 'register_microsoft'
  | 'logout'
  | 'login_failed';

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

const LOCAL_ANALYTICS_KEY = 'masar.analytics.v1';

function hasCloudAuthSession() {
  return typeof window !== 'undefined' && Boolean(auth.currentUser);
}

/* ────────────────────────────────────────────────
   HELPERS & SEED EVENTS
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
  return 'Windows';
}

function detectBrowser(ua: string): string {
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome/i.test(ua) && !/chromium/i.test(ua)) return 'Chrome';
  if (/firefox/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua) && !/chrome/i.test(ua)) return 'Safari';
  if (/opera|opr/i.test(ua)) return 'Opera';
  return 'Chrome';
}

function getLocalEvents(): AnalyticsEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_ANALYTICS_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsEvent[]) : [];
  } catch {
    return [];
  }
}

function saveLocalEvent(ev: AnalyticsEvent) {
  if (typeof window === 'undefined') return;
  try {
    const list = getLocalEvents();
    const updated = [ev, ...list.filter((x) => x.id !== ev.id)].slice(0, 500);
    localStorage.setItem(LOCAL_ANALYTICS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('masar_analytics_event', { detail: ev }));
  } catch {}
}

async function syncAnalyticsEvent(event: AnalyticsEvent) {
  try {
    const res = await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(event),
    });
    if (res.ok) return;
  } catch {}
  await syncDocToCloud('platform_analytics', event.id || `evt_${Date.now()}`, event);
}

function getActiveSessionUser(): { id?: string; name?: string; role?: string } {
  if (typeof window === 'undefined') return {};
  try {
    const sessionRaw = localStorage.getItem('masar.session.v1') || localStorage.getItem('masar_user');
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      return {
        id: parsed.id || parsed.email,
        name: parsed.name || parsed.fullName,
        role: parsed.role,
      };
    }
    const name = localStorage.getItem('user_name');
    const role = localStorage.getItem('user_role');
    if (name || role) return { name: name || undefined, role: role || undefined };
  } catch {}
  return {};
}

function generateSeedEvents(): AnalyticsEvent[] {
  return [];
}

/* ────────────────────────────────────────────────
   TRACK EVENT
──────────────────────────────────────────────── */
export async function trackEvent(
  type: AnalyticsEventType,
  extra?: { userId?: string; userName?: string; userRole?: string; page?: string; isNew?: boolean }
) {
  if (typeof window === 'undefined') return;
  try {
    const ua = navigator.userAgent;
    const width = window.screen.width || 1280;
    const activeUser = getActiveSessionUser();

    const event: AnalyticsEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      userId: extra?.userId || activeUser.id || 'guest',
      userName: extra?.userName || activeUser.name || 'د. إسماعيل عيسى',
      userRole: extra?.userRole || activeUser.role || 'doctor',
      device: detectDevice(width),
      os: detectOS(ua),
      browser: detectBrowser(ua),
      screenWidth: width,
      page: extra?.page || window.location.pathname,
      createdAt: new Date().toISOString(),
    };

    saveLocalEvent(event);
    await syncAnalyticsEvent(event);
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
  const getCombined = (cloudEvts: AnalyticsEvent[] = []) => {
    const local = getLocalEvents();
    const seed = generateSeedEvents();
    const map = new Map<string, AnalyticsEvent>();

    [...cloudEvts, ...local, ...seed].forEach((e) => {
      const key = e.id || `${e.type}_${e.createdAt}_${e.userName}`;
      if (!map.has(key)) map.set(key, e);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  };

  // Initial call with local + seed
  callback(getCombined([]));

  // Listen to window custom events
  const handleLocalUpdate = () => {
    callback(getCombined([]));
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('masar_analytics_event', handleLocalUpdate);
  }

  const unsubCloud = subscribeToCloudCollection<AnalyticsEvent>(
    'platform_analytics',
    'platformAnalytics',
    (items) => callback(getCombined(items.slice(0, 50))),
  );

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('masar_analytics_event', handleLocalUpdate);
    }
    unsubCloud();
  };
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
  await pullServerSnapshotToLocal();
  const localEvents = getLocalEvents();
  const seedEvents = generateSeedEvents();

  const map = new Map<string, AnalyticsEvent>();
  [...localEvents, ...seedEvents].forEach((e) => {
    const key = e.id || `${e.type}_${e.createdAt}_${e.userName}`;
    if (!map.has(key)) map.set(key, e);
  });

  const events = Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const today = todayStart();
  const todayEvents = events.filter((e) => e.createdAt >= today);

  // Weekly trend
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
      if (e.type.startsWith('login')) weeklyMap[day].logins++;
    }
  });
  const weeklyTrend = Object.entries(weeklyMap).map(([date, v]) => ({ date, ...v }));

  const deviceBreakdown = { mobile: 0, tablet: 0, desktop: 0 };
  const osBreakdown: Record<string, number> = {};
  const browserBreakdown: Record<string, number> = {};
  const hourlyLogins = new Array(24).fill(0);

  events.forEach((e) => {
    if (e.device && deviceBreakdown[e.device] !== undefined) {
      deviceBreakdown[e.device]++;
    }
    if (e.os) osBreakdown[e.os] = (osBreakdown[e.os] || 0) + 1;
    if (e.browser) browserBreakdown[e.browser] = (browserBreakdown[e.browser] || 0) + 1;
    if (e.type.startsWith('login') && e.createdAt) {
      hourlyLogins[new Date(e.createdAt).getHours()]++;
    }
  });

  const loginEvents = events.filter((e) => e.type.startsWith('login') && e.type !== 'login_failed');
  const failedEvents = events.filter((e) => e.type === 'login_failed');
  const regEvents = events.filter((e) => e.type.startsWith('register'));
  const visitEvents = events.filter((e) => e.type === 'visit');

  return {
    totalVisits: visitEvents.length,
    totalLogins: loginEvents.length,
    totalRegistrations: regEvents.length,
    totalFailedLogins: failedEvents.length,
    todayVisits: todayEvents.filter((e) => e.type === 'visit').length,
    todayLogins: todayEvents.filter((e) => e.type.startsWith('login') && e.type !== 'login_failed').length,
    todayRegistrations: todayEvents.filter((e) => e.type.startsWith('register')).length,
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
export async function getPlatformConfig(): Promise<PlatformConfig> {
  try {
    if (!hasCloudAuthSession()) return DEFAULT_CONFIG;
    const snap = await getDoc(doc(db, 'platform_config', 'main'));
    if (snap.exists()) return snap.data() as PlatformConfig;
    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function savePlatformConfig(config: Partial<PlatformConfig>) {
  if (!hasCloudAuthSession()) return;
  await setDoc(doc(db, 'platform_config', 'main'), {
    ...DEFAULT_CONFIG,
    ...config,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export function subscribeToPlatformConfig(cb: (cfg: PlatformConfig) => void): () => void {
  if (!hasCloudAuthSession()) {
    cb(DEFAULT_CONFIG);
    return () => {};
  }

  return onSnapshot(doc(db, 'platform_config', 'main'), (snap) => {
    if (snap.exists()) cb(snap.data() as PlatformConfig);
    else cb(DEFAULT_CONFIG);
  });
}
