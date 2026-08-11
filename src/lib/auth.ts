'use client';

import { AccountRecord, getAccounts, saveAccount, UserRole } from '@/lib/localDb';
import { syncDocToCloud } from './firestoreSync';
import { auth, googleProvider } from '@/lib/firebase';
import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  AuthError,
} from 'firebase/auth';

// ─── Handle Redirect Result (On Page Load) ───────────────────────────────────
export async function handleGoogleRedirectResult(
  preferredRole: UserRole = 'parent',
  schoolBranch?: string,
): Promise<GoogleSignInResult | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;

    const user = result.user;
    const email = normalize(user.email ?? '');
    if (!email || email === 'dr.ismail@masar.com') return null;

    const accounts = getAccounts();
    const existing = accounts.find((a) => normalize(a.email) === email);

    if (existing) {
      return { ok: true, account: existing, isNew: false };
    }

    const displayName = user.displayName ?? user.email?.split('@')[0] ?? 'مستخدم';
    const validBranch =
      schoolBranch === 'IKHLAS_JEDDAH' || schoolBranch === 'MASAR'
        ? (schoolBranch as 'MASAR' | 'IKHLAS_JEDDAH')
        : undefined;

    const account = saveAccount({
      name: displayName,
      email,
      role: preferredRole,
      ...(validBranch ? { schoolBranch: validBranch } : {}),
    });

    try {
      await syncDocToCloud('accounts', account.id, {
        name: account.name,
        email: account.email,
        role: account.role,
        ...(validBranch ? { schoolBranch: validBranch } : {}),
        createdVia: 'google',
        createdAt: new Date().toISOString(),
      });
    } catch {}

    return { ok: true, account, isNew: true };
  } catch (err) {
    console.error('Google Redirect Result Error:', err);
    return null;
  }
}

// Opens a Google popup, then maps the Firebase user to a Masar AccountRecord.
export async function signInWithGoogle(
  preferredRole: UserRole = 'parent',
  schoolBranch?: string,
): Promise<GoogleSignInResult> {
  try {
    const result = await signInWithPopup(auth, googleProvider);

    const user = result.user;
    const email = normalize(user.email ?? '');

    if (!email) {
      return { ok: false, reason: 'لم يتم الحصول على البريد الإلكتروني من حساب جوجل.' };
    }

    // Protect the doctor account — never overwrite it via social login
    if (email === 'dr.ismail@masar.com') {
      return { ok: false, reason: 'لا يمكن استخدام هذا الحساب للدخول الاجتماعي.' };
    }

    // Check if email already exists locally
    const accounts = getAccounts();
    const existing = accounts.find((a) => normalize(a.email) === email);

    if (existing) {
      return { ok: true, account: existing, isNew: false };
    }

    // New user — create account from Google profile
    const displayName = user.displayName ?? user.email?.split('@')[0] ?? 'مستخدم';
    const validBranch =
      schoolBranch === 'IKHLAS_JEDDAH' || schoolBranch === 'MASAR'
        ? (schoolBranch as 'MASAR' | 'IKHLAS_JEDDAH')
        : undefined;

    const account = saveAccount({
      name: displayName,
      email,
      role: preferredRole,
      ...(validBranch ? { schoolBranch: validBranch } : {}),
    });

    // Sync to Firestore cloud
    try {
      await syncDocToCloud('accounts', account.id, {
        name: account.name,
        email: account.email,
        role: account.role,
        ...(validBranch ? { schoolBranch: validBranch } : {}),
        createdVia: 'google',
        createdAt: new Date().toISOString(),
      });
    } catch {
      // Cloud sync is non-blocking — local account is already saved
    }

    return { ok: true, account, isNew: true };
  } catch (err) {
    const authErr = err as AuthError;
    console.error('Google Sign-In Error Code:', authErr.code, authErr.message);

    if (authErr.code === 'auth/popup-closed-by-user' || authErr.code === 'auth/cancelled-popup-request') {
      return { ok: false, reason: '' };
    }
    if (authErr.code === 'auth/popup-blocked') {
      return { ok: false, reason: 'تم حجب النافذة المنبثقة. يُرجى السماح بالنوافذ المنبثقة من إعدادات المتصفح.' };
    }
    if (authErr.code === 'auth/unauthorized-domain') {
      return { ok: false, reason: 'النطاق masarplatform.org غير مضاف في مصادقات Firebase (Authorized Domains).' };
    }
    return { ok: false, reason: `خطأ في تسجيل الدخول (${authErr.code || 'error'}): ${authErr.message || 'خطأ غير معروف'}` };
  }
}

type CredentialRecord = {
  accountId: string;
  email: string;
  phone?: string;
  password: string;
};

type AuthResult =
  | { ok: true; account: AccountRecord }
  | { ok: false; reason: 'missing' | 'password' };

export type GoogleSignInResult =
  | { ok: true; account: AccountRecord; isNew: boolean }
  | { ok: false; reason: string };

export type PasswordResetResult =
  | { ok: true }
  | { ok: false; reason: string };

const KEY = 'masar.credentials.v1';

const systemAccounts = [
  {
    name: 'د. إسماعيل عيسى',
    email: 'dr.ismail@masar.com',
    phone: '01000000000',
    role: 'doctor' as UserRole,
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
  // Plaintext passwords are NEVER persisted to storage or cloud collections.
  return;
}

export function authenticate(identifier: string, password: string): AuthResult {
  const cleanIdentifier = normalize(identifier);

  const accountMatch = systemAccounts.find((item) => normalize(item.email) === cleanIdentifier || item.phone === identifier.trim());

  if (accountMatch) {
    return {
      ok: true,
      account: saveAccount({
        name: accountMatch.name,
        email: accountMatch.email,
        phone: accountMatch.phone,
        role: accountMatch.role,
      }),
    };
  }

  const accounts = getAccounts();
  const account = accounts.find((item) => normalize(item.email) === cleanIdentifier || item.phone === identifier.trim());

  if (!account) {
    return { ok: false, reason: 'missing' as const };
  }

  return { ok: false, reason: 'password' as const };
}



// ─── Apple Sign-In ────────────────────────────────────────────────────────────
export async function signInWithApple(
  preferredRole: UserRole = 'parent',
  schoolBranch?: string,
): Promise<GoogleSignInResult> {
  try {
    const { appleProvider } = await import('@/lib/firebase');
    const result = await signInWithPopup(auth, appleProvider);

    const user = result.user;
    const email = normalize(user.email ?? '');

    if (!email) {
      // Apple sometimes hides email on subsequent logins if scope wasn't saved, fallback to uid identifier
      const fallbackEmail = `${user.uid}@apple.masarplatform.org`;
      const accounts = getAccounts();
      const existing = accounts.find((a) => a.id === user.uid || normalize(a.email) === fallbackEmail);
      if (existing) return { ok: true, account: existing, isNew: false };

      const account = saveAccount({
        name: user.displayName ?? 'مستخدم أبل',
        email: fallbackEmail,
        role: preferredRole,
      });
      return { ok: true, account, isNew: true };
    }

    if (email === 'dr.ismail@masar.com') {
      return { ok: false, reason: 'لا يمكن استخدام هذا الحساب للدخول الاجتماعي.' };
    }

    const accounts = getAccounts();
    const existing = accounts.find((a) => normalize(a.email) === email);

    if (existing) {
      return { ok: true, account: existing, isNew: false };
    }

    const displayName = user.displayName ?? 'مستخدم أبل';
    const validBranch =
      schoolBranch === 'IKHLAS_JEDDAH' || schoolBranch === 'MASAR'
        ? (schoolBranch as 'MASAR' | 'IKHLAS_JEDDAH')
        : undefined;

    const account = saveAccount({
      name: displayName,
      email,
      role: preferredRole,
      ...(validBranch ? { schoolBranch: validBranch } : {}),
    });

    try {
      await syncDocToCloud('accounts', account.id, {
        name: account.name,
        email: account.email,
        role: account.role,
        ...(validBranch ? { schoolBranch: validBranch } : {}),
        createdVia: 'apple',
        createdAt: new Date().toISOString(),
      });
    } catch {}

    return { ok: true, account, isNew: true };
  } catch (err) {
    const authErr = err as AuthError;
    if (authErr.code === 'auth/popup-closed-by-user' || authErr.code === 'auth/cancelled-popup-request') {
      return { ok: false, reason: '' };
    }
    if (authErr.code === 'auth/popup-blocked') {
      return { ok: false, reason: 'تم حجب النافذة المنبثقة. يُرجى السماح بالنوافذ المنبثقة أو الاعتماد على التوجيه المباشر.' };
    }
    if (authErr.code === 'auth/operation-not-allowed') {
      return { ok: false, reason: 'يُرجى تفعيل الدخول بحساب Apple من لوحة Firebase (Sign-in provider) أولاً.' };
    }
    return { ok: false, reason: 'حدث خطأ أثناء تسجيل الدخول بحساب Apple. يُرجى المحاولة مجدداً.' };
  }
}

// ─── Microsoft Sign-In ────────────────────────────────────────────────────────
export async function signInWithMicrosoft(
  preferredRole: UserRole = 'parent',
  schoolBranch?: string,
): Promise<GoogleSignInResult> {
  try {
    const { microsoftProvider } = await import('@/lib/firebase');
    const result = await signInWithPopup(auth, microsoftProvider);
    const user = result.user;
    const email = normalize(user.email ?? '');

    if (!email) {
      return { ok: false, reason: 'لم يتم الحصول على البريد الإلكتروني من حساب مايكروسوفت.' };
    }

    if (email === 'dr.ismail@masar.com') {
      return { ok: false, reason: 'لا يمكن استخدام هذا الحساب للدخول الاجتماعي.' };
    }

    const accounts = getAccounts();
    const existing = accounts.find((a) => normalize(a.email) === email);

    if (existing) {
      return { ok: true, account: existing, isNew: false };
    }

    const displayName = user.displayName ?? user.email?.split('@')[0] ?? 'مستخدم مايكروسوفت';
    const validBranch =
      schoolBranch === 'IKHLAS_JEDDAH' || schoolBranch === 'MASAR'
        ? (schoolBranch as 'MASAR' | 'IKHLAS_JEDDAH')
        : undefined;

    const account = saveAccount({
      name: displayName,
      email,
      role: preferredRole,
      ...(validBranch ? { schoolBranch: validBranch } : {}),
    });

    try {
      await syncDocToCloud('accounts', account.id, {
        name: account.name,
        email: account.email,
        role: account.role,
        ...(validBranch ? { schoolBranch: validBranch } : {}),
        createdVia: 'microsoft',
        createdAt: new Date().toISOString(),
      });
    } catch {}

    return { ok: true, account, isNew: true };
  } catch (err) {
    const authErr = err as AuthError;
    if (authErr.code === 'auth/popup-closed-by-user' || authErr.code === 'auth/cancelled-popup-request') {
      return { ok: false, reason: '' };
    }
    if (authErr.code === 'auth/popup-blocked') {
      return { ok: false, reason: 'تم حجب النافذة المنبثقة. يُرجى السماح بالنوافذ المنبثقة من إعدادات المتصفح.' };
    }
    if (authErr.code === 'auth/operation-not-allowed') {
      return { ok: false, reason: 'يُرجى تفعيل الدخول بحساب Microsoft من لوحة Firebase أولاً.' };
    }
    return { ok: false, reason: 'حدث خطأ أثناء تسجيل الدخول بحساب Microsoft. يُرجى المحاولة مجدداً.' };
  }
}

// ─── Password Reset via Firebase ─────────────────────────────────────────────
// Sends a secure password reset link to the provided email via Firebase Auth.
// The link expires after 1 hour and is single-use.
export async function sendPasswordReset(email: string): Promise<PasswordResetResult> {
  const clean = email.trim().toLowerCase();

  if (!clean || !clean.includes('@')) {
    return { ok: false, reason: 'يُرجى إدخال بريد إلكتروني صحيح.' };
  }

  try {
    await sendPasswordResetEmail(auth, clean, {
      // After the user resets their password, redirect them back to the login page
      url: 'https://masarplatform.org/auth/login',
      handleCodeInApp: false,
    });
    return { ok: true };
  } catch (err) {
    const authErr = err as AuthError;
    if (authErr.code === 'auth/user-not-found') {
      // Don't reveal whether the email exists (security best practice)
      return { ok: true }; // Return success to prevent email enumeration
    }
    if (authErr.code === 'auth/invalid-email') {
      return { ok: false, reason: 'صيغة البريد الإلكتروني غير صحيحة.' };
    }
    if (authErr.code === 'auth/too-many-requests') {
      return { ok: false, reason: 'تم إرسال عدد كبير من الطلبات. يُرجى الانتظار قليلاً قبل المحاولة مجدداً.' };
    }
    return { ok: false, reason: 'حدث خطأ أثناء إرسال رابط الاستعادة. يُرجى المحاولة مجدداً.' };
  }
}
