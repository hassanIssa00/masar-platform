'use client';

/**
 * FaceAuthPreloader — Global Background Model Loader
 * ────────────────────────────────────────────────────
 * يبدأ تحميل موديلات التعرف على الوجه في الخلفية
 * فور فتح التطبيق — قبل أن يحتاجها أي مستخدم.
 *
 * النتيجة: عندما يفتح المستخدم الكاميرا، الموديل جاهز 100%
 * وinitFaceAuth() ترجع فوراً بدون أي انتظار.
 */

import { useEffect } from 'react';

// Global flag — so we only preload once across all renders
let preloadStarted = false;

export default function FaceAuthPreloader() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (preloadStarted) return;
    preloadStarted = true;

    // Register Service Worker for caching models
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/face-sw.js', { scope: '/' })
        .catch(() => {/* SW optional — fails silently */});
    }

    // Start loading face models in background
    const timer = setTimeout(() => {
      import('@/lib/faceAuth')
        .then(({ initFaceAuth }) => {
          initFaceAuth().catch(() => {
            preloadStarted = false;
          });
        })
        .catch(() => {
          preloadStarted = false;
        });
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  // Renders nothing — purely a background effect
  return null;
}
