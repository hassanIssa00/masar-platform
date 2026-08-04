'use client';

import { useEffect } from 'react';
import { pullCloudDataToLocal, subscribeToCloudUpdates } from '@/lib/firestoreSync';

export default function CloudSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 1. Initial Cloud Sync on page load
    pullCloudDataToLocal().catch(console.error);

    // 2. Real-time background sync listener
    const unsubscribe = subscribeToCloudUpdates();

    return () => {
      unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
