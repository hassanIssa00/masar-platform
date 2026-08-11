# 🔑 PRODUCTION ENVIRONMENT SECURITY & VARIABLE SPECIFICATION

**Project:** issa-genesis-web (Masar Educational Platform)  
**Date:** 2026-08-11  

---

## 1. Environment Variable Inventory & Classification

| Variable Name | Sensitivity Classification | Scope | Required in Production? | Description & Purpose |
| :--- | :--- | :--- | :---: | :--- |
| `SESSION_SECRET` | **SENSITIVE** | Server Only | **YES** | Cryptographic secret key used to sign and verify session JWT cookies (HMAC-SHA256). Must be at least 32 random characters. |
| `LIVEKIT_API_KEY` | **SENSITIVE** | Server Only | **YES** | LiveKit cloud project API Key used to issue WebRTC room access tokens. |
| `LIVEKIT_API_SECRET` | **SENSITIVE** | Server Only | **YES** | LiveKit cloud project API Secret used to sign JWT access tokens. Must never be exposed to browser. |
| `GEMINI_API_KEY` | **SENSITIVE** | Server Only | **YES** | Primary Google Gemini AI API key for AI assistant executions. |
| `GEMINI_API_KEYS` | **SENSITIVE** | Server Only | Optional | Optional comma-separated fallback list of Google Gemini AI API keys for quota rotation. |
| `ELEVENLABS_API_KEY` | **SENSITIVE** | Server Only | **YES** | ElevenLabs Text-to-Speech synthesis API key. |
| `ELEVENLABS_VOICE_ID` | SERVER ONLY | Server Only | **YES** | ElevenLabs voice ID for Arabic audio generation. |
| `ELEVENLABS_MODEL_ID` | SERVER ONLY | Server Only | Optional | ElevenLabs model identifier (defaults to `eleven_multilingual_v2`). |
| `UPSTASH_REDIS_REST_URL` | SERVER ONLY | Server Only | **YES** | Upstash Redis or Vercel KV REST API URL for distributed rate limiting across serverless instances. |
| `UPSTASH_REDIS_REST_TOKEN` | **SENSITIVE** | Server Only | **YES** | Upstash Redis or Vercel KV REST API bearer token. |
| `NEXT_PUBLIC_LIVEKIT_URL` | PUBLIC / CLIENT SAFE | Client & Server | **YES** | Public WebSocket URL for LiveKit WebRTC server (`wss://...`). |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | PUBLIC / CLIENT SAFE | Client & Server | **YES** | Firebase project Web API Key for client SDK initialization. |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | PUBLIC / CLIENT SAFE | Client & Server | **YES** | Firebase auth domain (`masar-xxx.firebaseapp.com`). |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | PUBLIC / CLIENT SAFE | Client & Server | **YES** | Firebase Cloud Project ID (`masar-genesis-prod`). |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | PUBLIC / CLIENT SAFE | Client & Server | **YES** | Firebase Storage bucket domain. |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | PUBLIC / CLIENT SAFE | Client & Server | **YES** | Firebase Cloud Messaging Sender ID. |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | PUBLIC / CLIENT SAFE | Client & Server | **YES** | Firebase Web Application ID. |

---

## 2. Server vs Client Isolation Guidelines

1. **Client Exposure Protection:** Variables starting with `NEXT_PUBLIC_` are embedded into client JavaScript bundles at build time. **NEVER** prefix API keys, API secrets, or session tokens with `NEXT_PUBLIC_`.
2. **Server-Only Enforcement:** `src/lib/auth/session.server.ts`, `src/app/api/livekit/token/route.ts`, `src/app/api/ai/execute/route.ts`, `src/app/api/tts/route.ts`, and `src/lib/rateLimit.ts` are guarded by environment checks or `server-only` conventions.
3. **Production Guard Rail:** If `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` are absent in production (`NODE_ENV === 'production'`), the rate limiter **hard-fails (blocks requests)** to prevent unthrottled serverless execution.

---

## 3. Deployment Configuration Checklist

- [ ] Configure all **REQUIRED** environment variables in Vercel Project Settings (`Settings` → `Environment Variables`).
- [ ] Ensure all **SENSITIVE** variables are marked as `Encrypted` in deployment platform.
- [ ] Verify no actual credential string literals are committed to git tracked repository.
