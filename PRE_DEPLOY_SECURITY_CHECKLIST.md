# 📋 PRE-DEPLOYMENT SECURITY CHECKLIST

**Target Project:** issa-genesis-web (Masar Educational Platform)  
**Document Status:** Required Manual Actions Prior to Production Launch  
**Date:** 2026-08-11  

---

## ⚠️ CRITICAL NOTICE
**Do NOT deploy to production (`vercel deploy --prod` or `firebase deploy`) until all items below are completed and verified by the Security Lead.**

---

## Step 1: Secret Key Rotation (Vendor Dashboards)

Execute the manual secret rotation process described in `SECRET_ROTATION_REQUIRED.md`:

- [ ] **LiveKit Cloud Dashboard:**
  - Generate a new `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`.
  - Revoke the old keys identified during Phase 2 verification.
- [ ] **Google AI Studio (Gemini):**
  - Generate a new `GEMINI_API_KEY`.
  - Revoke the 12 legacy keys identified in Phase 2 verification.
- [ ] **ElevenLabs Dashboard:**
  - Regenerate `ELEVENLABS_API_KEY`.
- [ ] **Session Signing Key:**
  - Generate a strong random 256-bit hex string for `SESSION_SECRET` (e.g. `openssl rand -hex 32`).

---

## Step 2: Vercel Production Environment Setup

In the Vercel Dashboard (`Settings` → `Environment Variables`), configure the following variables for the `Production` target environment:

- [ ] Set `SESSION_SECRET`
- [ ] Set `LIVEKIT_API_KEY`
- [ ] Set `LIVEKIT_API_SECRET`
- [ ] Set `GEMINI_API_KEY`
- [ ] Set `ELEVENLABS_API_KEY`
- [ ] Set `ELEVENLABS_VOICE_ID`
- [ ] Set `UPSTASH_REDIS_REST_URL`
- [ ] Set `UPSTASH_REDIS_REST_TOKEN`
- [ ] Set `NEXT_PUBLIC_LIVEKIT_URL`
- [ ] Set `NEXT_PUBLIC_FIREBASE_*` (all client config keys)

> **Important:** Verify that `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. In production mode, rate limiting **hard-fails (blocks requests)** if Redis variables are missing.

---

## Step 3: Firebase Firestore Security Rules Deployment

Deploy the isolated production `firestore.rules` file to Firebase Cloud:

```bash
# Login to Firebase CLI
npx firebase login

# Select target project
npx firebase use masar-genesis-prod

# Deploy Firestore Security Rules ONLY
npx firebase deploy --only firestore:rules
```

- [ ] Confirm `firestore.rules` deployed successfully in Firebase Console (`Firestore Database` → `Rules`).
- [ ] Run isolated rule assertion test against live project or emulator:
  ```bash
  npx tsx scripts/test-firestore-rules.ts
  ```

---

## Step 4: Final Pre-Flight Automated Verification

Run local verification commands:

```bash
# 1. Verify TypeScript (0 errors expected)
npx tsc --noEmit

# 2. Verify Rate Limiting unit tests (5/5 PASS expected)
npx tsx scripts/test-rate-limits.ts

# 3. Verify Firestore rules tests (17/17 PASS expected)
npx tsx scripts/test-firestore-rules.ts

# 4. Verify Dependency vulnerabilities (0 expected)
npm audit

# 5. Verify Production Build (59 pages compiled successfully)
npm run build
```

- [ ] TypeScript: PASS (0 errors)
- [ ] Rate Limit Tests: 5 / 5 PASS
- [ ] Firestore Rules Tests: 17 / 17 PASS
- [ ] npm audit: 0 Vulnerabilities
- [ ] Production Build: PASS

---

## Step 5: Post-Deployment Smoke Test (Staging / Canary)

After initial staging deployment:

- [ ] Attempt navigation to `/platform-settings` without login cookie — confirm HTTP 307 redirect to `/auth/login`.
- [ ] Attempt API call to `/api/livekit/token` without auth cookie — confirm HTTP 401 response.
- [ ] Attempt API call to `/api/ai/execute` with 21 requests in 60s — confirm HTTP 429 response with `Retry-After` header.
- [ ] Verify browser console network tab contains no exposed `LIVEKIT_API_SECRET` or `GEMINI_API_KEY`.
