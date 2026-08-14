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
  User,
} from 'firebase/auth';

const OAUTH_PENDING_KEY = 'masar.oauth.pending.v1';

// ─── Handle Redirect Result (On Page Load) ───────────────────────────────────
export async function handleGoogleRedirectResult(
  preferredRole: UserRole = 'parent',
  schoolBranch?: string,
): Promise<GoogleSignInResult | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;

    const pending = consumeOAuthPending(preferredRole, schoolBranch);
    preferredRole = pending.preferredRole;
    schoolBranch = pending.schoolBranch;
    const createdVia =
      pending.provider === 'apple' || result.providerId === 'apple.com'
        ? 'apple'
        : pending.provider === 'microsoft' || result.providerId === 'microsoft.com'
          ? 'microsoft'
          : 'google';

    if (createdVia === 'apple' && !normalize(result.user.email ?? '')) {
      return await mapFirebaseUserToAccount(result.user, preferredRole, schoolBranch, 'apple', 'مستخدم أبل');
    }

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
        createdVia,
        createdAt: new Date().toISOString(),
      });
    } catch {}

    return { ok: true, account, isNew: true };
  } catch (err) {
    console.error('Google Redirect Result Error:', err);
    const authErr = err as AuthError;
    const pending = consumeOAuthPending(preferredRole, schoolBranch);
    if (!pending.provider) return null;
    const providerLabel = pending.provider === 'apple' ? 'Apple' : pending.provider === 'microsoft' ? 'Microsoft' : 'Google';
    return { ok: false, reason: oauthErrorMessage(authErr, providerLabel) };
  }
}

// Opens a Google popup, then maps the Firebase user to a Masar AccountRecord.
export async function signInWithGoogle(
  preferredRole: UserRole = 'parent',
  schoolBranch?: string,
): Promise<GoogleSignInResult> {
  try {
    if (shouldUseRedirectFirst()) {
      saveOAuthPending('google', preferredRole, schoolBranch);
      await signInWithRedirect(auth, googleProvider);
      return { ok: false, reason: '' };
    }

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

    if (shouldUseRedirectFallback(authErr.code)) {
      saveOAuthPending('google', preferredRole, schoolBranch);
      await signInWithRedirect(auth, googleProvider);
      return { ok: false, reason: '' };
    }

    const friendlyReason = oauthErrorMessage(authErr, 'Google');
    if (
      friendlyReason ||
      authErr.code === 'auth/popup-closed-by-user' ||
      authErr.code === 'auth/cancelled-popup-request'
    ) {
      return { ok: false, reason: friendlyReason };
    }

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

function getValidBranch(schoolBranch?: string) {
  return schoolBranch === 'IKHLAS_JEDDAH' || schoolBranch === 'MASAR'
    ? (schoolBranch as 'MASAR' | 'IKHLAS_JEDDAH')
    : undefined;
}

function currentHostLabel() {
  if (typeof window === 'undefined') return 'الدومين الحالي';
  return window.location.hostname || 'الدومين الحالي';
}

function shouldUseRedirectFirst() {
  return false;
}

function shouldUseRedirectFallback(code?: string) {
  return code === 'auth/popup-blocked' || code === 'auth/web-storage-unsupported';
}

function saveOAuthPending(
  provider: 'google' | 'apple' | 'microsoft',
  preferredRole: UserRole,
  schoolBranch?: string,
) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      OAUTH_PENDING_KEY,
      JSON.stringify({
        provider,
        preferredRole,
        schoolBranch: getValidBranch(schoolBranch),
        createdAt: Date.now(),
      }),
    );
  } catch {}
}

function consumeOAuthPending(defaultRole: UserRole, defaultBranch?: string) {
  if (typeof window === 'undefined') {
    return {
      preferredRole: defaultRole,
      schoolBranch: getValidBranch(defaultBranch),
      provider: undefined as string | undefined,
    };
  }

  try {
    const raw = sessionStorage.getItem(OAUTH_PENDING_KEY);
    sessionStorage.removeItem(OAUTH_PENDING_KEY);
    if (!raw) {
      return {
        preferredRole: defaultRole,
        schoolBranch: getValidBranch(defaultBranch),
        provider: undefined as string | undefined,
      };
    }

    const pending = JSON.parse(raw) as {
      provider?: string;
      preferredRole?: UserRole;
      schoolBranch?: string;
      createdAt?: number;
    };
    const isFresh = pending.createdAt ? Date.now() - pending.createdAt < 10 * 60 * 1000 : false;

    return {
      preferredRole: isFresh && pending.preferredRole ? pending.preferredRole : defaultRole,
      schoolBranch: getValidBranch(isFresh ? pending.schoolBranch ?? defaultBranch : defaultBranch),
      provider: isFresh ? pending.provider : undefined,
    };
  } catch {
    return {
      preferredRole: defaultRole,
      schoolBranch: getValidBranch(defaultBranch),
      provider: undefined as string | undefined,
    };
  }
}

function oauthErrorMessage(authErr: AuthError, providerLabel: string) {
  if (authErr.code === 'auth/popup-closed-by-user' || authErr.code === 'auth/cancelled-popup-request') {
    return '';
  }

  if (authErr.code === 'auth/unauthorized-domain') {
    return `الدومين الحالي (${currentHostLabel()}) غير مضاف في Firebase Authentication > Settings > Authorized domains.`;
  }

  if (authErr.code === 'auth/operation-not-allowed') {
    return `تسجيل الدخول عبر ${providerLabel} غير مفعل في Firebase Authentication > Sign-in method.`;
  }

  if (authErr.code === 'auth/internal-error') {
    if (providerLabel === 'Apple') {
      return 'تسجيل الدخول بحساب Apple يحتاج استكمال إعداد Apple Developer داخل Firebase: Services ID و Apple Team ID و Key ID و Private key، ثم إضافة Callback URL في Apple Developer Console.';
    }

    return `Firebase رفض تسجيل الدخول عبر ${providerLabel}. راجع تفعيل المزود وإضافة الدومين (${currentHostLabel()}) في Authorized domains.`;
  }

  if (authErr.code === 'auth/invalid-api-key' || authErr.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
    return 'إعدادات Firebase غير صحيحة. راجع إعدادات مشروع Firebase المستخدمة في الواجهة.';
  }

  return `حدث خطأ أثناء تسجيل الدخول عبر ${providerLabel} (${authErr.code || 'error'}).`;
}

async function mapFirebaseUserToAccount(
  user: User,
  preferredRole: UserRole,
  schoolBranch: string | undefined,
  createdVia: 'google' | 'apple' | 'microsoft',
  fallbackName: string,
): Promise<GoogleSignInResult> {
  const email = normalize(user.email ?? '');
  const fallbackEmail = createdVia === 'apple' && !email ? `${user.uid}@apple.masarplatform.org` : '';
  const resolvedEmail = email || fallbackEmail;

  if (!resolvedEmail) {
    return { ok: false, reason: `لم يتم الحصول على البريد الإلكتروني من حساب ${fallbackName}.` };
  }

  if (resolvedEmail === 'dr.ismail@masar.com') {
    return { ok: false, reason: 'لا يمكن استخدام هذا الحساب للدخول الاجتماعي.' };
  }

  const accounts = getAccounts();
  const existing = accounts.find(
    (a) => normalize(a.email) === resolvedEmail || (createdVia === 'apple' && a.id === user.uid),
  );

  if (existing) {
    return { ok: true, account: existing, isNew: false };
  }

  const validBranch = getValidBranch(schoolBranch);
  const account = saveAccount({
    name: user.displayName ?? user.email?.split('@')[0] ?? fallbackName,
    email: resolvedEmail,
    role: preferredRole,
    ...(validBranch ? { schoolBranch: validBranch } : {}),
  });

  try {
    await syncDocToCloud('accounts', account.id, {
      name: account.name,
      email: account.email,
      role: account.role,
      ...(validBranch ? { schoolBranch: validBranch } : {}),
      createdVia,
      firebaseUid: user.uid,
      createdAt: new Date().toISOString(),
    });
  } catch {}

  return { ok: true, account, isNew: true };
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
  if (!password || !password.trim()) return;
  const records = readCredentials();
  const cleanEmail = normalize(account.email);
  const cleanPhone = account.phone ? account.phone.trim() : undefined;

  const existingIndex = records.findIndex(
    (r) => r.email === cleanEmail || r.accountId === account.id || (cleanPhone && r.phone === cleanPhone)
  );

  const newRecord: CredentialRecord = {
    accountId: account.id,
    email: cleanEmail,
    phone: cleanPhone,
    password: password.trim(),
  };

  if (existingIndex >= 0) {
    records[existingIndex] = newRecord;
  } else {
    records.push(newRecord);
  }

  writeCredentials(records);
}

export function authenticate(identifier: string, password: string): AuthResult {
  const cleanIdentifier = normalize(identifier);
  const cleanPassword = password.trim();

  // 1. Doctor / System Accounts check
  const accountMatch = systemAccounts.find(
    (item) => normalize(item.email) === cleanIdentifier || item.phone === identifier.trim()
  );

  if (accountMatch) {
    // Check if there is a saved credential with a custom password for doctor
    const savedCred = getCredentialByEmailOrPhone(cleanIdentifier);
    const validPassword = savedCred ? savedCred.password === cleanPassword : cleanPassword === '123456';

    if (validPassword) {
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
    return { ok: false, reason: 'password' as const };
  }

  // 2. Regular User Accounts check (Parents / Students / Teachers)
  const accounts = getAccounts();
  const account = accounts.find(
    (item) => normalize(item.email) === cleanIdentifier || (item.phone && item.phone.trim() === identifier.trim())
  );

  if (!account) {
    return { ok: false, reason: 'missing' as const };
  }

  // 3. Check saved credential
  const credential = getCredentialByEmailOrPhone(identifier);
  if (credential) {
    if (credential.password === cleanPassword) {
      return { ok: true, account };
    }
    return { ok: false, reason: 'password' as const };
  }

  // 4. Fallback for accounts created during wizard or synced from cloud: if password >= 6 chars, save it & log in
  if (cleanPassword && cleanPassword.length >= 6) {
    saveCredential(account, cleanPassword);
    return { ok: true, account };
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

    if (shouldUseRedirectFirst()) {
      saveOAuthPending('apple', preferredRole, schoolBranch);
      await signInWithRedirect(auth, appleProvider);
      return { ok: false, reason: '' };
    }

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
    if (authErr.code === 'auth/internal-error') {
      return { ok: false, reason: oauthErrorMessage(authErr, 'Apple') };
    }

    if (shouldUseRedirectFallback(authErr.code)) {
      const { appleProvider } = await import('@/lib/firebase');
      saveOAuthPending('apple', preferredRole, schoolBranch);
      await signInWithRedirect(auth, appleProvider);
      return { ok: false, reason: '' };
    }

    const friendlyReason = oauthErrorMessage(authErr, 'Apple');
    if (
      friendlyReason ||
      authErr.code === 'auth/popup-closed-by-user' ||
      authErr.code === 'auth/cancelled-popup-request'
    ) {
      return { ok: false, reason: friendlyReason };
    }

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
