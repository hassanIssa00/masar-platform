'use client';

import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

export type ConsentStatus = 'pending' | 'signed' | 'revoked' | 'expired';

export interface ConsentForm {
  id: string;
  studentId: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  consentType: 'general-treatment' | 'video-recording' | 'data-sharing' | 'photography' | 'research-participation';
  status: ConsentStatus;
  signedAt?: string;
  expiresAt: string;
  ipAddress?: string;
  digitalSignature: string;
  notes: string;
  createdAt: string;
}

const LOCAL_KEY = 'masar.consents.v1';

export function getLocalConsents(): ConsentForm[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]'); } catch { return []; }
}

export async function createConsent(data: Omit<ConsentForm, 'id' | 'createdAt'>): Promise<ConsentForm> {
  const item: ConsentForm = {
    ...data,
    id: `cns_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(LOCAL_KEY, JSON.stringify([item, ...getLocalConsents()]));
  try { await addDoc(collection(db, 'consents'), item); } catch {}
  return item;
}

export function updateConsentStatus(id: string, status: ConsentStatus, signature?: string) {
  const updated = getLocalConsents().map(c =>
    c.id === id ? { ...c, status, digitalSignature: signature || c.digitalSignature, signedAt: status === 'signed' ? new Date().toISOString() : c.signedAt } : c
  );
  localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
}

export function revokeConsent(id: string) {
  updateConsentStatus(id, 'revoked');
}

export const CONSENT_TYPE_LABELS: Record<ConsentForm['consentType'], string> = {
  'general-treatment': 'موافقة عامة على العلاج',
  'video-recording': 'تصوير وتسجيل الجلسات',
  'data-sharing': 'مشاركة البيانات مع الفريق',
  'photography': 'التصوير الفوتوغرافي',
  'research-participation': 'المشاركة في الأبحاث العلمية',
};

export const CONSENT_STATUS_COLORS: Record<ConsentStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  signed: 'bg-emerald-100 text-emerald-800',
  revoked: 'bg-rose-100 text-rose-800',
  expired: 'bg-slate-100 text-slate-600',
};

export const CONSENT_STATUS_LABELS: Record<ConsentStatus, string> = {
  pending: 'في انتظار التوقيع',
  signed: 'موقّعة ومعتمدة ✓',
  revoked: 'تم السحب',
  expired: 'منتهية الصلاحية',
};
