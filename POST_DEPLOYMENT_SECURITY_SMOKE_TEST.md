# 🧪 POST-DEPLOYMENT SECURITY SMOKE TEST PLAN

**Target Application:** Masar Educational Platform (`https://masarplatform.org`)  
**Scope:** Post-Deployment Non-Destructive Production Verification  
**Date:** 2026-08-11  

---

## 1. Authentication Smoke Tests

- [ ] **Invalid Login Rejection:**
  - Action: Send `POST /api/auth/login` with payload `{ "identifier": "invalid@masar.com", "password": "WrongPassword123" }`.
  - Expected: HTTP 401 response with `{ "ok": false, "reason": "password", "error": "بيانات الدخول غير صحيحة" }`. No account enumeration.
- [ ] **Valid Session Cookie Issuance:**
  - Action: Log in with valid credentials.
  - Expected: Response sets `masar_session` HTTP cookie with attributes `HttpOnly; Secure; SameSite=Lax; Path=/`.
- [ ] **Session Invalidation on Logout:**
  - Action: Click logout button or clear session cookie.
  - Expected: `masar_session` cookie deleted (`Max-Age=0`). Subsequent request to `/dashboard` redirects to `/auth/login`.

---

## 2. Authorization & BOLA Smoke Tests

- [ ] **Unauthenticated Portal Access Block:**
  - Action: Open incognito browser window and navigate directly to `/platform-settings`.
  - Expected: Server middleware intercepts request and issues HTTP 307 redirect to `/auth/login?redirect=/platform-settings`.
- [ ] **Student Role Boundary Enforcement:**
  - Action: Log in as a Student account and navigate to `/platform-settings`.
  - Expected: Access denied or redirected to `/dashboard`.

---

## 3. LiveKit WebRTC Security Smoke Tests

- [ ] **Unauthenticated Token Denial:**
  - Action: Send unauthenticated `GET /api/livekit/token?room=ikhlas-jeddah-grade1`.
  - Expected: HTTP 401 response `{ "error": "Authentication required" }`.
- [ ] **Host Privilege Elevation Block:**
  - Action: Log in as a Student account and send `GET /api/livekit/token?room=ikhlas-jeddah-grade1&isHost=true`.
  - Expected: HTTP 200 response with JWT token, but decoding JWT payload confirms `canPublish: false` (client `isHost` flag completely ignored).
- [ ] **Authorized Teacher Token Issuance:**
  - Action: Log in as assigned Teacher and send `GET /api/livekit/token?room=ikhlas-jeddah-grade1`.
  - Expected: HTTP 200 response with JWT token, decoding payload confirms `canPublish: true`.

---

## 4. Firestore Rules Cloud Verification

- [ ] **Accounts Collection Client Denial:**
  - Action: From browser console, execute `getDocs(collection(db, 'accounts'))`.
  - Expected: Promise rejection with `FirebaseError: Missing or insufficient permissions.`
- [ ] **Credentials Collection Client Denial:**
  - Action: From browser console, execute `getDocs(collection(db, 'credentials'))`.
  - Expected: Promise rejection with `FirebaseError: Missing or insufficient permissions.`
- [ ] **Face Records Collection Client Denial:**
  - Action: From browser console, execute `getDocs(collection(db, 'faceRecords'))`.
  - Expected: Promise rejection with `FirebaseError: Missing or insufficient permissions.`

---

## 5. Rate Limiting Smoke Tests

- [ ] **Rate Limit Trigger & Header Check:**
  - Action: Issue 21 consecutive `POST /api/ai/execute` requests within 60 seconds from a single user session.
  - Expected: Request 21 returns HTTP 429 response `{ "success": false, "error": "Rate limit exceeded..." }` with header `Retry-After: 60`.

---

## 6. Client Bundle & Network Secret Inspection

- [ ] **No Exposed Secrets in Network Logs:**
  - Action: Open DevTools Network tab and search all response bodies for `LIVEKIT_API_SECRET`, `GEMINI_API_KEY`, `ELEVENLABS_API_KEY`, or `SESSION_SECRET`.
  - Expected: Zero occurrences.
- [ ] **No Exposed Secrets in DOM / Storage:**
  - Action: Inspect `localStorage` and `sessionStorage`.
  - Expected: No plaintext passwords or API keys stored.
