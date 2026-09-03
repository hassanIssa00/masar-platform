'use client';

import { useEffect } from 'react';
import { initAppCheck } from '@/lib/firebase';

export default function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 0. Initialize Firebase App Check (reCAPTCHA v3) before any Firestore calls.
    initAppCheck();
    // Note: Global bulk sync removed to preserve Firebase quota.
    // Each page now lazily pulls only the specific collections it needs.
  }, []);

  return <>{children}</>;
}
