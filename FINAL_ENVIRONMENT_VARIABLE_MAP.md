# 🗺️ FINAL ENVIRONMENT VARIABLE MAP & CODE AUDIT

**Project:** issa-genesis-web (Masar Educational Platform)  
**Verification Date:** 2026-08-11  
**Audit Scope:** Complete repository source scan for `process.env` references  

---

## 1. Verified Source-Referenced Variables

| Variable | Referenced In | Required Production | Server Only | Purpose & Implementation Details |
| :--- | :--- | :---: | :---: | :--- |
| `SESSION_SECRET` | `src/lib/auth/session.server.ts:19` | **YES** | **YES** | Cryptographic HMAC-SHA256 secret key for signing session JWT cookies. |
| `LIVEKIT_API_KEY` | `src/app/api/livekit/token/route.ts:54` | **YES** | **YES** | LiveKit WebRTC project API Key for token generation. |
| `LIVEKIT_API_SECRET` | `src/app/api/livekit/token/route.ts:55` | **YES** | **YES** | LiveKit WebRTC project API Secret for token JWT signing. |
| `GEMINI_API_KEY` | `src/lib/ai/gemini.server.ts:37` | **YES** (Primary) | **YES** | Google Gemini AI API key for AI assistant backend execution. |
| `GEMINI_API_KEYS` | `src/lib/ai/gemini.server.ts:37` | Optional | **YES** | Optional comma-separated list of Gemini API keys for quota rotation. |
| `ELEVENLABS_API_KEY` | `src/app/api/tts/route.ts:33` | **YES** | **YES** | ElevenLabs Text-to-Speech synthesis API key. |
| `ELEVENLABS_VOICE_ID` | `src/app/api/tts/route.ts:34` | **YES** | **YES** | ElevenLabs voice identifier for Arabic speech generation. |
| `ELEVENLABS_MODEL_ID` | `src/app/api/tts/route.ts:80` | Optional | **YES** | Optional ElevenLabs model ID (defaults to `eleven_multilingual_v2`). |
| `UPSTASH_REDIS_REST_URL` | `src/lib/rateLimit.ts:173` | **YES** (Primary) | **YES** | Upstash Redis REST API URL for distributed rate limiting. |
| `UPSTASH_REDIS_REST_TOKEN` | `src/lib/rateLimit.ts:174` | **YES** (Primary) | **YES** | Upstash Redis REST API Bearer token. |
| `KV_REST_API_URL` | `src/lib/rateLimit.ts:173` | Optional (Alias) | **YES** | Vercel KV REST API URL fallback alias. |
| `KV_REST_API_TOKEN` | `src/lib/rateLimit.ts:174` | Optional (Alias) | **YES** | Vercel KV REST API Bearer token fallback alias. |
| `MSEMAX_API_URL` | `src/app/api/ai/execute/route.ts:7,124` | Optional | **YES** | Optional local/custom LLM endpoint URL. |
| `MSEMAX_API_KEY` | `src/app/api/ai/execute/route.ts:126` | Optional | **YES** | Optional local/custom LLM authorization key. |
| `NEXT_PUBLIC_LIVEKIT_URL` | `src/app/api/livekit/token/route.ts:56` | **YES** | No (Client & Server) | Public WebSocket URL for LiveKit server (`wss://...`). |
| `NEXT_PUBLIC_API_URL` | `src/app/page.tsx:19` + UI pages | Optional | No (Client & Server) | Optional base URL override for frontend API calls. |
| `ENABLE_DEMO_ACCOUNTS` | `src/lib/auth/session.server.ts:149` | Optional | **YES** | Production safety guard to disable hardcoded demo accounts when set to `false`. |

---

## 2. Variables Listed in Checklists NOT Used in Current Code

The following Firebase client configuration variables were listed in general checklists but are **NOT USED BY CURRENT CODE**:

- `NEXT_PUBLIC_FIREBASE_API_KEY`: **NOT USED BY CURRENT CODE** (Hardcoded in `src/lib/firebase.ts`)
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: **NOT USED BY CURRENT CODE** (Hardcoded in `src/lib/firebase.ts`)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: **NOT USED BY CURRENT CODE** (Hardcoded in `src/lib/firebase.ts`)
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: **NOT USED BY CURRENT CODE** (Hardcoded in `src/lib/firebase.ts`)
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: **NOT USED BY CURRENT CODE** (Hardcoded in `src/lib/firebase.ts`)
- `NEXT_PUBLIC_FIREBASE_APP_ID`: **NOT USED BY CURRENT CODE** (Hardcoded in `src/lib/firebase.ts`)

> **Note:** Hardcoded Firebase client configuration in `src/lib/firebase.ts` contains standard public Web SDK identifiers (`AIzaSyAP2z31...`), which are non-secret client identifiers according to Google Firebase security architecture.
