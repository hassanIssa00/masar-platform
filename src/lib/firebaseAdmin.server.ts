import 'server-only';
import { cert, getApps, initializeApp, applicationDefault, type App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function parseServiceAccount() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson);
      if (parsed.private_key) {
        parsed.private_key = String(parsed.private_key).replace(/\\n/g, '\n');
      }
      return cert(parsed);
    } catch (error) {
      console.error('[FirebaseAdmin] Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON:', error);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    return cert({ projectId, clientEmail, privateKey });
  }

  return null;
}

export function hasFirebaseAdminConfig() {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY),
  );
}

function getAdminApp(): App | null {
  try {
    const explicitCredential = parseServiceAccount();
    const canUseApplicationDefault = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT);
    if (!explicitCredential && !canUseApplicationDefault) return null;

    return (
      getApps()[0] ??
      initializeApp({
        credential: explicitCredential ?? applicationDefault(),
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'masar-platform-8e642',
      })
    );
  } catch (error) {
    console.error(
      '[FirebaseAdmin] Admin SDK is not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY/FIREBASE_PROJECT_ID.',
      error,
    );
    return null;
  }
}

export function getAdminDb() {
  try {
    const app = getAdminApp();
    if (!app) return null;

    return getFirestore(app);
  } catch (error) {
    console.error(
      '[FirebaseAdmin] Admin SDK is not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY/FIREBASE_PROJECT_ID.',
      error,
    );
    return null;
  }
}

export async function getAdminAuth() {
  try {
    const app = getAdminApp();
    if (!app) return null;

    const { getAuth } = await import('firebase-admin/auth');
    return getAuth(app);
  } catch (error) {
    console.error(
      '[FirebaseAdmin] Admin Auth is not configured. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY/FIREBASE_PROJECT_ID.',
      error,
    );
    return null;
  }
}
