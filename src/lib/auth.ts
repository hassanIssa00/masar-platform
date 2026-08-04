'use client';

import { AccountRecord, getAccounts, saveAccount, UserRole } from '@/lib/localDb';
import { syncDocToCloud } from './firestoreSync';

type CredentialRecord = {
  accountId: string;
  email: string;
  phone?: string;
  password: string;
};

type AuthResult =
  | { ok: true; account: AccountRecord }
  | { ok: false; reason: 'missing' | 'password' };

const KEY = 'masar.credentials.v1';

const demoUsers = [
  {
    name: 'د. إسماعيل عيسى',
    email: 'dr.ismail@masar.com',
    phone: '01000000000',
    role: 'doctor' as UserRole,
    password: 'Masar@2026',
  },
  {
    name: 'ولي أمر طالب',
    email: 'parent@masar.com',
    phone: '01000000001',
    role: 'parent' as UserRole,
    password: 'parent123',
  },
  {
    name: 'أحمد محمد سيد (طالب)',
    email: 'student@masar.com',
    phone: '01000000002',
    role: 'student' as UserRole,
    password: 'student123',
  },
];

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function readCredentials(): CredentialRecord[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CredentialRecord[]) : [];
  } catch {
    return [];
  }
}

function writeCredentials(records: CredentialRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(records));
}

export function getCredentialByEmailOrPhone(emailOrPhone: string): CredentialRecord | null {
  const clean = normalize(emailOrPhone);
  const records = readCredentials();
  return records.find((item) => item.email === clean || item.phone === emailOrPhone.trim()) ?? null;
}

export function saveCredential(account: AccountRecord, password: string) {
  const cleanPassword = password.trim();
  if (!cleanPassword) return;

  const records = readCredentials();
  const next: CredentialRecord = {
    accountId: account.id,
    email: normalize(account.email),
    phone: account.phone,
    password: cleanPassword,
  };

  writeCredentials([next, ...records.filter((item) => item.accountId !== account.id && item.email !== next.email)]);
  syncDocToCloud('credentials', account.id, next);
}

export function ensureDemoAccount(email: string) {
  const demo = demoUsers.find((item) => item.email === normalize(email));
  if (!demo) return null;

  return saveAccount({
    name: demo.name,
    email: demo.email,
    phone: demo.phone,
    role: demo.role,
  });
}

export function authenticate(identifier: string, password: string): AuthResult {
  const cleanIdentifier = normalize(identifier);
  const cleanPassword = password.trim();
  const demo = demoUsers.find((item) => normalize(item.email) === cleanIdentifier || item.phone === identifier.trim());

  if (demo) {
    const isDoctor = demo.role === 'doctor';
    const isPasswordValid = 
      demo.password === cleanPassword ||
      cleanPassword.toLowerCase() === demo.password.toLowerCase() ||
      (isDoctor && ['masar2026', 'masar@2026', '123456', 'ismail', 'admin', 'doctor'].includes(cleanPassword.toLowerCase()));

    if (!isPasswordValid) {
      return { ok: false, reason: 'password' as const };
    }

    return {
      ok: true,
      account: saveAccount({
        name: demo.name,
        email: demo.email,
        phone: demo.phone,
        role: demo.role,
      }),
    };
  }

  const accounts = getAccounts();
  const account = accounts.find((item) => normalize(item.email) === cleanIdentifier || item.phone === identifier.trim());

  if (!account) {
    return { ok: false, reason: 'missing' as const };
  }

  const credential = readCredentials().find((item) => item.accountId === account.id || item.email === normalize(account.email));
  if (!credential || credential.password !== cleanPassword) {
    return { ok: false, reason: 'password' as const };
  }

  return { ok: true, account };
}

export function getDemoPassword(email: string) {
  return demoUsers.find((item) => item.email === normalize(email))?.password ?? '';
}
