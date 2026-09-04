'use client';

import { AccountRecord, saveAccount, UserRole } from '@/lib/cloudStore';
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
let oauthPendingMemory:
  | {
      provider: 'google' | 'apple' | 'microsoft';
      preferredRole: UserRole;
      schoolBranch?: 'MASAR' | 'IKHLAS_JEDDAH';
      createdAt: number;
    }
  | null = null;

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

    const fallbackName =
      createdVia === 'apple' ? 'أبل' : createdVia === 'microsoft' ? 'مايكروسوفت' : 'جوجل';
    return await mapFirebaseUserToAccount(result.user, preferredRole, schoolBranch, createdVia, fallbackName);
  } catch (err) {
    console.error('Google Redirect Result Error:', err);
    const authErr = err as AuthError;
    const pending = consumeOAuthPending(preferredRole, schoolBranch);
    if (!pending.provider) return null;
    if (authErr.code === 'auth/internal-error') return null;
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
    return await mapFirebaseUserToAccount(result.user, preferredRole, schoolBranch, 'google', 'جوجل');
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

export type GoogleSignInResult =
  | { ok: true; account: AccountRecord; isNew: boolean }
  | { ok: false; reason: string };

export type PasswordResetResult =
  | { ok: true; mode?: 'firebase' }
  | { ok: false; reason: string };

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
  void OAUTH_PENDING_KEY;
  oauthPendingMemory = {
    provider,
    preferredRole,
    schoolBranch: getValidBranch(schoolBranch),
    createdAt: Date.now(),
  };
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
    const pending = oauthPendingMemory;
    oauthPendingMemory = null;
    if (!pending) {
      return {
        preferredRole: defaultRole,
        schoolBranch: getValidBranch(defaultBranch),
        provider: undefined as string | undefined,
      };
    }

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

  try {
    const idToken = await user.getIdToken();
    const res = await fetch('/api/auth/social', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        idToken,
        providerId: createdVia,
        preferredRole,
        schoolBranch: getValidBranch(schoolBranch),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok || !data.account) {
      return {
        ok: false,
        reason: data?.error || `تعذر اعتماد حساب ${fallbackName} على السيرفر.`,
      };
    }

    const account = saveAccount(data.account);
    return { ok: true, account, isNew: Boolean(data.isNew) };
  } catch {
    return { ok: false, reason: `تعذر الاتصال بالسيرفر لاعتماد حساب ${fallbackName}.` };
  }
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
    return await mapFirebaseUserToAccount(result.user, preferredRole, schoolBranch, 'apple', 'أبل');
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
    return await mapFirebaseUserToAccount(result.user, preferredRole, schoolBranch, 'microsoft', 'مايكروسوفت');
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
      url: 'https://masarplatform.org/auth/login',
      handleCodeInApp: false,
    });
    return { ok: true, mode: 'firebase' };
  } catch (err) {
    const authErr = err as AuthError;
    if (authErr.code === 'auth/user-not-found') {
      return { ok: false, reason: 'هذا البريد غير مسجل في مزود خدمة البريد. يرجى استخدام الاستعادة الفورية برقم الهاتف.' };
    }
    if (authErr.code === 'auth/invalid-email') {
      return { ok: false, reason: 'صيغة البريد الإلكتروني غير صحيحة.' };
    }
    if (authErr.code === 'auth/too-many-requests') {
      return { ok: false, reason: 'تم إرسال عدد كبير من الطلبات. يُرجى الانتظار قليلاً قبل المحاولة مجدداً.' };
    }
    return { ok: false, reason: 'تعذر إرسال الرابط عبر البريد. استخدم الاستعادة الفورية برقم الهاتف أدناه.' };
  }
}
