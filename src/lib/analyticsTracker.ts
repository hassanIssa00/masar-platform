'use client';

import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';

export type AnalyticsEventType = 'visit' | 'login' | 'register' | 'logout';

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
  createdAt: string; // ISO string
}

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

export async function trackEvent(
  type: AnalyticsEventType,
  extra?: { userId?: string; userName?: string; userRole?: string }
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
    // silent fail — analytics should never break the app
    console.warn('Analytics track failed:', e);
  }
}

export interface AnalyticsSummary {
  totalVisits: number;
  totalLogins: number;
  totalRegistrations: number;
  todayVisits: number;
  todayLogins: number;
  todayRegistrations: number;
  deviceBreakdown: { mobile: number; tablet: number; desktop: number };
  osBreakdown: Record<string, number>;
  browserBreakdown: Record<string, number>;
  recentEvents: AnalyticsEvent[];
  hourlyLogins: number[]; // 24 values, one per hour
}

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const snap = await getDocs(
    query(collection(db, 'platform_analytics'), orderBy('createdAt', 'desc'), limit(500))
  );
  const events: AnalyticsEvent[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AnalyticsEvent));

  const today = todayStart();
  const todayEvents = events.filter((e) => e.createdAt >= today);

  const deviceBreakdown = { mobile: 0, tablet: 0, desktop: 0 };
  const osBreakdown: Record<string, number> = {};
  const browserBreakdown: Record<string, number> = {};
  const hourlyLogins = new Array(24).fill(0);

  events.forEach((e) => {
    deviceBreakdown[e.device] = (deviceBreakdown[e.device] || 0) + 1;
    osBreakdown[e.os] = (osBreakdown[e.os] || 0) + 1;
    browserBreakdown[e.browser] = (browserBreakdown[e.browser] || 0) + 1;
    if (e.type === 'login') {
      const hour = new Date(e.createdAt).getHours();
      hourlyLogins[hour]++;
    }
  });

  return {
    totalVisits: events.filter((e) => e.type === 'visit').length,
    totalLogins: events.filter((e) => e.type === 'login').length,
    totalRegistrations: events.filter((e) => e.type === 'register').length,
    todayVisits: todayEvents.filter((e) => e.type === 'visit').length,
    todayLogins: todayEvents.filter((e) => e.type === 'login').length,
    todayRegistrations: todayEvents.filter((e) => e.type === 'register').length,
    deviceBreakdown,
    osBreakdown,
    browserBreakdown,
    recentEvents: events.slice(0, 30),
    hourlyLogins,
  };
}
