import type { NextConfig } from "next";

// ─────────────────────────────────────────────────────────────────────────────
// Content Security Policy — Masar Platform
// ─────────────────────────────────────────────────────────────────────────────
//
// Directives are derived from the actual external services used by the app:
//
//   Firebase (Firestore, Auth, App Check, Storage):
//     connect-src: *.googleapis.com, *.firebaseio.com, *.firebasedatabase.app,
//                  firebasestorage.googleapis.com, identitytoolkit.googleapis.com,
//                  securetoken.googleapis.com, www.googleapis.com
//
//   Firebase App Check (reCAPTCHA v3 token fetch + app check token endpoint):
//     script-src:  www.google.com, www.gstatic.com
//     frame-src:   www.google.com                     (reCAPTCHA invisible frame)
//     connect-src: firebaseappcheck.googleapis.com
//
//   LiveKit (WebRTC video/audio — server at wss://masarplatform-73wpzvkh.livekit.cloud):
//     connect-src: *.livekit.cloud, wss://masarplatform-73wpzvkh.livekit.cloud
//     media-src:   blob:                              (WebRTC MediaStream blobs)
//
//   Gemini AI (server-side only via /api/ai route — NOT called from browser):
//     — No browser-side connect-src needed; API key never leaves the server.
//
//   ElevenLabs TTS (server-side only via /api/tts route — NOT called from browser):
//     — No browser-side connect-src needed; API key never leaves the server.
//
//   Pollinations AI (server-side gateway — proxied through /api/ai):
//     — No browser-side connect-src needed.
//
//   Google Fonts (Cairo typeface used in printable reports):
//     style-src:   fonts.googleapis.com
//     font-src:    fonts.gstatic.com
//
//   face-api.js models (served from /public/models — same origin):
//     — Covered by default-src 'self'. No external CDN needed.
//
// NOTE on 'unsafe-inline':
//   Next.js App Router injects inline styles and scripts for hydration.
//   Removing 'unsafe-inline' without nonce/hash support breaks the app.
//   The correct long-term fix is to add CSP nonce support via middleware.
//   This is documented as a future hardening task.
//
// NOTE on camera permission:
//   Face ID (/auth/login, /admin) uses navigator.mediaDevices.getUserMedia.
//   camera=(self) permits camera only on same-origin pages. It is NOT disabled.
//
// ─────────────────────────────────────────────────────────────────────────────

const CSP_DIRECTIVES = [
  // Fallback for unspecified directives
  "default-src 'self'",

  // Scripts: same origin + Next.js inline hydration + reCAPTCHA
  // 'unsafe-eval' is required by face-api.js (TensorFlow.js backend uses eval for WASM)
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com",

  // Styles: same origin + inline (Next.js) + Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

  // Fonts: same origin + Google Fonts CDN
  "font-src 'self' data: https://fonts.gstatic.com",

  // Images: same origin + data URIs (base64 avatars) + any HTTPS source
  // (student profile images may come from various HTTPS sources)
  "img-src 'self' data: blob: https:",

  // Media: blob: URIs required for WebRTC MediaStream (LiveKit camera/mic)
  "media-src 'self' blob:",

  // Workers: blob: required for face-api.js/TensorFlow.js Web Workers
  "worker-src 'self' blob:",

  // Fetch/XHR connections — all external services used by browser-side code:
  [
    "connect-src 'self'",
    // Firebase Firestore / Realtime Database
    "https://*.googleapis.com",
    "https://*.firebaseio.com",
    "https://*.firebasedatabase.app",
    "wss://*.firebaseio.com",
    // Firebase Auth
    "https://identitytoolkit.googleapis.com",
    "https://securetoken.googleapis.com",
    // Firebase Storage
    "https://firebasestorage.googleapis.com",
    // Firebase App Check (token fetch)
    "https://firebaseappcheck.googleapis.com",
    // Firebase Installations
    "https://firebaseinstallations.googleapis.com",
    // reCAPTCHA v3 score endpoint
    "https://www.google.com",
    // LiveKit WebRTC signaling (WebSocket + HTTPS)
    "https://*.livekit.cloud",
    "wss://masarplatform-73wpzvkh.livekit.cloud",
    // STUN/TURN for WebRTC (LiveKit managed — no additional domains needed)
  ].join(" "),

  // Frames: reCAPTCHA v3 uses google.com iframe; Firebase Auth popup uses firebaseapp.com iframe
  "frame-src https://www.google.com https://*.firebaseapp.com https://accounts.google.com",

  // Disallow embedding this app in any external frame
  "frame-ancestors 'none'",

  // Restrict <base> tag hijacking
  "base-uri 'self'",

  // Restrict form targets (allow Google OAuth and Firebase Auth)
  "form-action 'self' https://accounts.google.com https://*.firebaseapp.com",

  // Block mixed content (HTTP resources on HTTPS page)
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000, // 30 days image cache
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // ── Clickjacking / framing ────────────────────────────────────────
          // frame-ancestors 'none' in CSP is the modern equivalent; X-Frame-Options
          // is kept for legacy browser compatibility (pre-CSP2 browsers).
          { key: 'X-Frame-Options', value: 'DENY' },

          // ── MIME sniffing ──────────────────────────────────────────────────
          { key: 'X-Content-Type-Options', value: 'nosniff' },

          // ── Referrer ───────────────────────────────────────────────────────
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },

          // ── Legacy XSS filter (IE/old Edge) ───────────────────────────────
          { key: 'X-XSS-Protection', value: '1; mode=block' },

          // ── HSTS ──────────────────────────────────────────────────────────
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },

          // ── Content Security Policy ────────────────────────────────────────
          { key: 'Content-Security-Policy', value: CSP_DIRECTIVES },



          // ── Permissions Policy ─────────────────────────────────────────────
          // camera=(self)    — Face ID requires camera on same-origin pages only
          // microphone=()    — App does not use microphone (LiveKit audio handled
          //                    by the LiveKit SDK; does NOT require this header)
          // geolocation=()   — Not used by the application
          // payment=()       — No payment APIs used
          // usb=()           — Not used
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()' },
        ],
      },
      {
        source: '/learning/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/brand/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
