'use client';

import { useEffect } from 'react';
import { pullCloudDataToLocal, subscribeToCloudUpdates } from '@/lib/firestoreSync';
import { initAppCheck } from '@/lib/firebase';

const CORE_SYNC_KEYS = ['accounts', 'students', 'reports', 'surveys', 'messages', 'notifications'] as const;

export default function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 0. Initialize Firebase App Check (reCAPTCHA v3) before any Firestore calls.
    //    Fails gracefully if NEXT_PUBLIC_RECAPTCHA_SITE_KEY is not set — Firestore
    //    Security Rules remain the primary enforcement layer in all cases.
    initAppCheck();

    // 1. Initial Cloud Sync on page load
    pullCloudDataToLocal([...CORE_SYNC_KEYS]).catch(console.error);

    // 2. Real-time background sync listener
    const unsubscribe = subscribeToCloudUpdates(undefined, [...CORE_SYNC_KEYS]);

    return () => {
      unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
