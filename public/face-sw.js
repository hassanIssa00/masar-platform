/**
 * face-sw.js — Service Worker: Cache face-api Models (WebGL, No WASM)
 * ─────────────────────────────────────────────────────────────────────
 * يحفظ موديلات @vladmandic/face-api في CacheStorage.
 * من المرة الثانية: تُقرأ من الـ cache في أقل من 50ms.
 * إجمالي الملفات: ~6.5MB (بدل 14.7MB مع MediaPipe)
 */

const CACHE_NAME = 'face-ai-v2';

const FACE_ASSETS = [
  '/face-models/tiny_face_detector_model-weights_manifest.json',
  '/face-models/tiny_face_detector_model.bin',
  '/face-models/face_landmark_68_model-weights_manifest.json',
  '/face-models/face_landmark_68_model.bin',
  '/face-models/face_recognition_model-weights_manifest.json',
  '/face-models/face_recognition_model.bin',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(FACE_ASSETS).catch(() => {})
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isFaceAsset = FACE_ASSETS.some((asset) => url.includes(asset));
  if (!isFaceAsset) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (response.ok) cache.put(event.request, response.clone());
        return response;
      } catch {
        return new Response('Face model not available', { status: 503 });
      }
    })
  );
});
