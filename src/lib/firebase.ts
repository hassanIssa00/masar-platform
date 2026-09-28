// ─────────────────────────────────────────────────────────────────────────────
// Firebase Client Initialization — Masar Platform
// ─────────────────────────────────────────────────────────────────────────────
//
// Security layers (in order of enforcement):
//   1. Firebase App Check (reCAPTCHA v3) — blocks non-browser/bot callers
//   2. Firebase Auth + HttpOnly session cookie — authenticates human users
//   3. Firestore Security Rules — enforce per-document ownership/role checks
//
// App Check notes:
//   - Requires NEXT_PUBLIC_RECAPTCHA_SITE_KEY environment variable.
//   - In development (NODE_ENV !== 'production'), the App Check debug token is
//     used automatically when NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN is set.
//   - Production enforcement (reject requests without a valid App Check token)
//     must be toggled ON manually in Firebase Console → App Check → Enforce.
//   - App Check is an ADDITIONAL layer. Firestore Rules are the primary and
//     non-bypassable security boundary; do not weaken them.
//   - The Firebase Web API key (apiKey field) is intentionally public client
//     configuration. It is safe to include in client-side code as long as:
//       a) Firestore Security Rules are strict (enforced server-side by Google)
//       b) The API key has HTTP referrer + API restrictions in GCP Console
//       c) App Check is enforced (prevents scripted abuse of the public key)
//
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
} from 'firebase/auth';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  getToken as getAppCheckToken,
} from 'firebase/app-check';

// ─── Firebase Project Configuration ──────────────────────────────────────────
// These values are public client-side identifiers (not secrets).
// Restrict the API key in GCP Console to HTTP referrers:
//   masarplatform.org/*, *.masarplatform.org/*
// and limit to the APIs actually used:
//   Identity Toolkit, Cloud Firestore, Firebase Installations, reCAPTCHA Enterprise
function getFirebaseAuthDomain() {
  const configured = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  if (configured) return configured;

  return "masar-platform-8e642.firebaseapp.com";
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAP2z3lctzFGPQfRKNEKc_Sv-JOG-m0_Vk",
  authDomain: getFirebaseAuthDomain(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "masar-platform-8e642",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "masar-platform-8e642.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "813912614592",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:813912614592:web:ceec71da4e3a6141eaef25",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-JV7WERZER8",
};

// ─── Singleton Firebase App ───────────────────────────────────────────────────
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// ─── Firestore Client ─────────────────────────────────────────────────────────
export const db = getFirestore(app);

// ─── Firebase Auth ────────────────────────────────────────────────────────────
export const auth = getAuth(app);

// ─── Google Auth Provider ─────────────────────────────────────────────────────
export const googleProvider = new GoogleAuthProvider();
// Request email and profile scopes (default), plus locale hint for Arabic UI
googleProvider.setCustomParameters({ prompt: 'select_account', hl: 'ar' });

// ─── Apple Auth Provider ──────────────────────────────────────────────────────
export const appleProvider = new OAuthProvider('apple.com');
appleProvider.addScope('email');
appleProvider.addScope('name');
appleProvider.setCustomParameters({ locale: 'ar' });

// ─── Microsoft Auth Provider ──────────────────────────────────────────────────
export const microsoftProvider = new OAuthProvider('microsoft.com');
microsoftProvider.addScope('email');
microsoftProvider.addScope('profile');
microsoftProvider.setCustomParameters({ prompt: 'select_account', mkt: 'ar' });

// ─── Firebase App Check (reCAPTCHA v3) ───────────────────────────────────────
//
// Initialization runs only in the browser environment (not during SSR/build).
// App Check is NOT enforced automatically; enforcement must be toggled in the
// Firebase Console manually after verifying the app works correctly.
//
// Required environment variables:
//   NEXT_PUBLIC_RECAPTCHA_SITE_KEY  — reCAPTCHA v3 site key from
//                                     https://www.google.com/recaptcha/admin
//                                     Register masarplatform.org as a v3 site.
//   NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN (optional) — debug token for local dev.
//                                     Generate from Firebase Console → App Check → Apps.
//                                     Never commit this value to version control.
//
let appCheckInitialized = false;

export function initAppCheck(): void {
  // Guard: only runs in browser, only once, only when key is configured
  if (typeof window === 'undefined') return;
  if (appCheckInitialized) return;

  const appCheckEnabled = process.env.NEXT_PUBLIC_ENABLE_APP_CHECK === 'true';
  if (!appCheckEnabled) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[AppCheck] Disabled. Set NEXT_PUBLIC_ENABLE_APP_CHECK=true to enable it.');
    }
    return;
  }

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (!siteKey) {
    if (process.env.NODE_ENV === 'production') {
      // Log warning in production — App Check is not protecting the app.
      console.warn(
        '[AppCheck] NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set. ' +
        'Firebase App Check is disabled. Set the key in Vercel environment variables ' +
        'and enable enforcement in Firebase Console → App Check.'
      );
    }
    // In development: silently skip. Dev flows use the local emulator or
    // the Firebase App Check debug token if NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN is set.
    return;
  }

  try {
    // In development, allow the App Check debug token if configured.
    // The debug token is generated in Firebase Console and must be added
    // to NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN (local .env.local only — never commit).
    if (
      process.env.NODE_ENV !== 'production' &&
      process.env.NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN
    ) {
      // @ts-expect-error — FIREBASE_APPCHECK_DEBUG_TOKEN is a special global
      // recognized by the Firebase SDK to activate debug mode
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NEXT_PUBLIC_APP_CHECK_DEBUG_TOKEN;
    }

    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      // isTokenAutoRefreshEnabled: true refreshes the App Check token in the
      // background, preventing token expiry during long sessions.
      isTokenAutoRefreshEnabled: true,
    });

    appCheckInitialized = true;

    if (process.env.NODE_ENV !== 'production') {
      console.info('[AppCheck] Firebase App Check initialized (reCAPTCHA v3).');
    }
  } catch (err) {
    // App Check initialization failure must NOT crash the app — Firestore
    // Security Rules remain the primary enforcement layer. Log and continue.
    console.error('[AppCheck] Initialization failed:', err);
  }
}

// ─── Re-export for convenience ───────────────────────────────────────────────
export { app, getAppCheckToken };
