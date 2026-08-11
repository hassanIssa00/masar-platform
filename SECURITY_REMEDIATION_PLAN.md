# 🛡️ SECURITY REMEDIATION PLAN — MASAR EDUCATIONAL PLATFORM (REVISED v2)

**Target Application:** Masar Educational Platform (`https://masarplatform.org`)  
**Repository:** `c:\Users\hassa\Desktop\ismail edu\issa-genesis-web`  
**Date:** August 11, 2026  
**Status:** Architecture Specification Updated (Awaiting Implementation Approval)  

---

## 1. Executive Summary & Required Architectural Corrections

This revised remediation plan replaces all insecure client-side assumptions with a **strict server-authoritative security model**. The browser is treated as entirely untrusted. All authentication, authorization, secret handling, password hashing, and object-level permission checks are moved to the server layer.

---

## 2. Server-Side Password Security & Migration Strategy

### ❌ What Is Forbidden:
- **No Client-Side Hashing:** Passwords will NEVER be hashed via SHA-256 on the client (`password -> SHA-256 -> localStorage` or `password -> SHA-256 -> Firestore` is completely forbidden).
- **No Hardcoded Passwords in Code/Docs:** Plaintext passwords (e.g., `Masar@2026`, `123456`, `admin`) are strictly forbidden in source files, repository documentation, client states, or committed artifacts.
- **No Plaintext Persistence:** Passwords must never be stored in `localStorage`, `sessionStorage`, cookies, client memory, or plaintext Firestore fields.

### ✅ Server Password Architecture:
1. **Transport:** Plaintext password transmitted strictly over HTTPS via POST request body to `/api/auth/login`.
2. **Server Hashing:** Password hashing executed server-side using **`bcrypt`** (or `argon2id` with cost factor 12+).
3. **Storage:** Only the cryptographically secure salted hash string (e.g. `$2b$12$...`) is stored in the backend database.

### 🔄 Safe Password Migration Flow:
```text
Existing User Logs In
         │
         ▼
POST /api/auth/login (HTTPS)
         │
         ▼
Server verifies credentials via legacy check (temporary migration bridge)
         │
         ▼
Server computes bcrypt hash ($2b$12$...)
         │
         ▼
Server stores bcrypt hash in secure backend table / server-only collection
         │
         ▼
Server deletes legacy plaintext credential from storage
```

---

## 3. Server-Authoritative Session & Authentication Architecture

### ❌ What Is Forbidden:
- Relying on `localStorage.user`, `localStorage.role`, `localStorage.isAdmin`, or `masar.session.v1` as security boundaries.
- Trusting client-supplied role parameters in request headers or body.

### ✅ Server Session Architecture:
```text
Browser (Client)
       │
       ▼  POST /api/auth/login
Server Auth Handler (Validates bcrypt hash)
       │
       ▼  Generates signed JWT / Session Token (secret key stored in server env)
HttpOnly + Secure + SameSite=Strict Cookie (`masar_session`)
       │
       ▼  Sent automatically on subsequent HTTPS requests
Next.js Server / API / Middleware
       │
       ▼  Cryptographically verifies cookie signature & extracts user UID + Server Role
Server Authorization Enforcement
```

---

## 4. Multi-Layer Server Authorization & Centralized RBAC

Middleware (`src/middleware.ts`) is used **only** for early routing and page-navigation protection. **Every server API route, server action, database query, file download, and token generator must independently enforce authentication and authorization.**

### Centralized Permission Module (`src/lib/auth/authorization.ts`):
```typescript
import 'server-only';

export async function requireAuth(req: NextRequest): Promise<AuthenticatedUser>;
export async function requireRole(req: NextRequest, allowedRoles: UserRole[]): Promise<AuthenticatedUser>;
export async function requirePermission(req: NextRequest, permission: Permission): Promise<AuthenticatedUser>;
export async function requireOwnership(req: NextRequest, resourceType: string, resourceId: string): Promise<AuthenticatedUser>;
```

---

## 5. Object-Level Authorization (BOLA / IDOR Protection)

Role checks alone are insufficient. The server must verify user-to-object relationships before returning or modifying any entity.

| Endpoint / Operation | Object Parameter | Object-Level Authorization Rule |
| :--- | :--- | :--- |
| `GET /api/student/[id]` | `studentId` | Doctor: Access All. Teacher: Assigned Students Only. Parent: Linked Children Only. Student: Self Only. |
| `GET /api/reports/[id]` | `reportId` | Doctor: Access All. Teacher: Author / Assigned Class. Parent: Linked Child's Report. |
| `GET /api/livekit/token` | `room` | Teacher/Doctor: Assigned Classroom Only. Student: Enrolled Classroom Only (Publish = FALSE). |
| `GET /api/certificates/[id]`| `certificateId` | Doctor/Teacher: Issue/Access. Student/Parent: Self/Child Only. |
| `DELETE /api/student/[id]`| `studentId` | Doctor / Admin Role ONLY. |

---

## 6. Firestore Data Architecture & Collection Rules

### Collection Audit & Access Rules:

| Collection | Client Access | Server Access (Admin SDK) | Rule Definition (`firestore.rules`) |
| :--- | :---: | :---: | :--- |
| `accounts` | **DENY** | Read/Write | `allow read, write: if false;` (Managed via Server API) |
| `credentials` | **DENY & PURGE** | None (Deprecate) | `allow read, write: if false;` |
| `students` | Read Only (Filtered) | Full Control | `allow read: if request.auth != null && (isDoctor() || isAssignedTeacher(resource.id) || isParentOf(resource.id)); allow write: if isDoctor();` |
| `reports` | Read Only (Filtered) | Full Control | `allow read: if request.auth != null && (isDoctor() || isAuthor(resource) || isParentOf(resource.data.studentId)); allow write: if isDoctor() || isTeacher();` |
| `surveys` | Create Only | Full Control | `allow create: if true; allow read, update, delete: if isDoctor();` |
| `faceRecords` | **DENY** | Read/Write | `allow read, write: if false;` (Managed server-side) |

Default Rule Principle: **DENY ALL BY DEFAULT (`allow read, write: if false;`)**.

---

## 7. Secrets Management & Server-Only Boundaries

### Gemini Key Pool Architecture:
- Split Gemini implementation into a server-only module: `src/lib/ai/gemini.server.ts` containing `import 'server-only';`.
- Read keys strictly from `process.env.GEMINI_API_KEYS` (comma-separated string parsed on server startup).
- `NEXT_PUBLIC_*` prefixes will **NEVER** be used for API secrets or Gemini key pools.

### LiveKit Host & Room Authorization:
- Remove client `isHost` query parameter parsing.
- Server extracts caller identity from `masar_session` cookie, verifies ownership of the requested `room`, and sets `canPublish` strictly based on server-verified role (Doctor/Teacher = `canPublish: true`, Student = `canPublish: false`).

---

## 8. Biometric Security Architecture (Vector Matching vs. Encryption)

- **Vector Preservation:** Facial descriptors consist of 128-float vectors required for Euclidean distance calculations. Hashing (SHA-256) destroys spatial vector distance operations and is inappropriate for facial recognition matching.
- **Server-Side Matching Architecture:**
  1. Enrollment: Client extracts descriptor -> Transmits over TLS to `/api/face/enroll`.
  2. Server Encryption: Server encrypts descriptor at rest using AES-256-GCM with a server-held secret key (`FACE_ENCRYPTION_KEY`) before saving to database.
  3. Verification: Client sends current video frame descriptor -> Server decrypts stored vector -> Performs distance calculation server-side -> Returns authenticated session token.
  4. Encryption keys remain 100% on the server.

---

## 9. Distributed Serverless Rate Limiting

- Use `@upstash/ratelimit` with Redis or Vercel KV to provide persistent rate-limiting across distributed serverless edge functions.
- **Endpoint Specific Limits:**
  - `/api/auth/login`: 5 attempts per 15 minutes per IP.
  - `/api/ai/execute`: 20 requests per minute per authenticated user.
  - `/api/livekit/token`: 10 requests per minute per authenticated user.
  - `/api/tts`: 10 requests per minute per authenticated user.

---

## 10. Dependency Upgrade Strategy

- **Audit Specific CVEs:**
  - `next`: Upgrade from `16.2.10` to minimum patched version `16.3.0` to fix Server Action DoS and middleware bypass advisories.
  - `postcss`: Upgrade to `>=8.5.2` (or current safe patch).
  - `sharp`: Upgrade to `>=0.35.0`.
- Do NOT run `npm audit fix --force` blindly. Apply explicit version upgrades in `package.json` and validate with `npm run build`.

---

## 11. Secret Rotation Procedure (`SECRET_ROTATION_REQUIRED.md`)

Create `SECRET_ROTATION_REQUIRED.md` with instructions for manual execution by the platform owner:
1. Revoke existing LiveKit API Key & Secret in LiveKit Cloud Console.
2. Generate new LiveKit API Key & Secret; update `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` in Vercel Environment Variables.
3. Revoke all 12 exposed Gemini API Keys in Google AI Studio.
4. Generate new replacement Gemini API Keys; update `GEMINI_API_KEYS` in Vercel.
5. Trigger manual redeployment on Vercel.

---

## 12. Negative Security Regression Testing Suite

Automated regression tests (`scripts/security-regression-test.ts`) must explicitly assert:
1. **Unauthenticated Admin Access:** `GET /platform-settings` without `masar_session` cookie returns 307 Redirect to `/auth/login`.
2. **Weak Password Rejection:** `POST /api/auth/login` with `dr.ismail@masar.com` and password `123456` returns 401 Unauthorized.
3. **LiveKit Parameter Tampering:** `GET /api/livekit/token?room=ikhlas-grade-1&isHost=true` issued by a Student session returns `canPublish: false`.
4. **BOLA Protection:** Student A requesting `GET /api/student/[studentB_id]` receives 403 Forbidden.
5. **Client Role Tampering:** Requesting API actions with `localStorage.setItem('user_role', 'doctor')` fails server authorization.
6. **Secret Scanning:** Repository bundle search confirms zero instances of `RAW_KEYS_B64` or hardcoded fallback strings.

---

## 13. Target Files to Modify & Create

| Action | Target File | Description |
| :--- | :--- | :--- |
| **[NEW]** | `src/middleware.ts` | Next.js server-side route & session middleware |
| **[NEW]** | `src/lib/auth/authorization.ts` | Centralized server-side RBAC & object authorization (`import 'server-only'`) |
| **[NEW]** | `src/lib/ai/gemini.server.ts` | Server-only Gemini API key pool manager |
| **[NEW]** | `firestore.rules` | Strict `deny by default` Firestore security rules |
| **[NEW]** | `SECRET_ROTATION_REQUIRED.md` | Manual secret rotation instructions for platform owner |
| **[NEW]** | `FIREBASE_RULES_DEPLOYMENT.md` | Firestore deployment guide |
| **[NEW]** | `src/lib/rateLimit.ts` | Distributed serverless rate limiter |
| **[MODIFY]** | `src/app/api/auth/login/route.ts` | Server-side bcrypt login & HttpOnly cookie handler |
| **[MODIFY]** | `src/app/api/livekit/token/route.ts` | Strict server role verification & secret isolation |
| **[MODIFY]** | `src/lib/auth.ts` | Remove password whitelist & plaintext local storage persistence |
| **[MODIFY]** | `src/lib/firestoreSync.ts` | Remove plaintext credential sync to Firestore |
| **[MODIFY]** | `src/lib/faceAuth.ts` | Server-side AES-256 encrypted vector storage |
| **[MODIFY]** | `src/app/api/ai/execute/route.ts` | Rate limiting & session validation |
| **[MODIFY]** | `src/app/api/tts/route.ts` | Rate limiting & session validation |
| **[MODIFY]** | `package.json` | Explicit dependency vulnerability upgrades |

---

## 14. Execution Progress & Checkpoint Status

- **Checkpoint 1 (Authentication Foundation):** COMPLETED & VERIFIED PASS ✅
  - Server-side bcrypt authentication (`/api/auth/login`)
  - Server-verified `masar_session` HTTP-Only cookie
  - Plaintext credentials and backdoor fallback logic purged from source
- **Checkpoint 2 (Authorization + RBAC + Object-Level Authorization):** COMPLETED & VERIFIED PASS ✅
  - Server-side middleware route protection (`src/middleware.ts`)
  - Centralized server authorization primitives (`src/lib/auth/authorization.ts`)
  - Object-level ownership checks (BOLA/IDOR prevention)
- **Checkpoint 3 (LiveKit + API Security):** COMPLETED & RE-VERIFIED PASS ✅
  - `GET /api/livekit/token`: Enforced server-authoritative room resolution (`authorizeRoomAccess` in `src/lib/auth/roomAuthorization.ts`). Syntactically valid room strings that are NOT registered or assigned to the caller return **HTTP 403 Forbidden** (preventing room enumeration attacks). Host privilege (`canPublish`) is restricted to `doctor`/`teacher`/`specialist`, `canPublishData` synced to host role, `roomAdmin`/`roomCreate` omitted. Client `isHost` parameter ignored. `LIVEKIT_API_SECRET` isolated server-side.
  - `POST /api/ai/execute`: Enforced server authentication, SSRF defense (removed client-supplied `baseUrl` and `apiKey`), input prompt size capped to 4,000 characters, history capped to 10 items (1,000 chars max each), error details sanitized.
  - `POST /api/tts`: Enforced server authentication, input text capped to 2,000 characters, `stability` and `similarityBoost` clamped (0.0–1.0), ElevenLabs API key isolated, error details sanitized.
  - `API_SECURITY_MATRIX.md` updated with full room authorization matrix.
- **Checkpoint 4 (Firestore Security):** COMPLETED & RE-VERIFIED PASS ✅
  - Full data model audit completed; created `FIRESTORE_DATA_MODEL.md` documenting all 25 collections, usage, and sensitivity levels.
  - Production `firestore.rules` created implementing default-deny (`allow read, write: if false;`), role-based isolation (`isDoctor()`, `isTeacher()`), ownership checks (`isOwner()`, `isLinkedParent()`), and complete client denial for highly sensitive collections (`accounts`, `faceRecords`, `credentials`).
  - Created `firebase.json` and `FIREBASE_RULES_DEPLOYM- **Checkpoint 5 (Rate Limiting & Dependencies):** COMPLETED & RE-VERIFIED PASS ✅
  - Production Strict Rate Limiter (`src/lib/rateLimit.ts`):
    - Production Mode: HARD FAILS (`failClosed`) if Redis env vars (`UPSTASH_REDIS_REST_URL` / `KV_REST_API_URL`) are absent, preventing silent per-instance degradation across serverless replicas.
    - Development Mode: In-memory sliding window fallback active for local testing.
    - Dual-Key Strategy for Authenticated Endpoints: Primary key = `user_{userId}` (strict quota), Secondary key = `ip_{ip}` (3× quota). Allows shared school NAT networks while preventing multi-account rotation attacks from a single IP.
    - Endpoints Configured:
      - `POST /api/auth/login`: 5 req / 15 min per IP (`failClosed: true`), `Retry-After` header.
      - `POST /api/ai/execute`: 20 req / 60 sec per user (`primary`), 60 req / 60 sec per IP (`secondary`).
      - `POST /api/tts`: 10 req / 60 sec per user (`primary`), 30 req / 60 sec per IP (`secondary`).
      - `GET /api/livekit/token`: 10 req / 60 sec per user (`primary`), 30 req / 60 sec per IP (`secondary`).
  - Executable Rate Limiting Test Suite (`scripts/test-rate-limits.ts`): **5 / 5 PASSED** ✅
  - Dependency Vulnerability Remediation:
    - Upgraded `next` to `16.3.0` (fixed SSRF, PostCSS path traversal, sharp/libvips).
    - Solved `node-fetch` / `face-api.js` vulnerability:
      1. Source-proved `tfjs-core` browser runtime isolation (`IS_BROWSER` selects `window.fetch` shim; `PlatformNode` / `require('node-fetch')` is **never executed**).
      2. Applied `"overrides": { "node-fetch": "^2.7.0" }` in `package.json` to upgrade `node-fetch` to safe 2.7.0 cleanly.
    - Added overrides for tooling dependencies (`brace-expansion`, `js-yaml`, `nanoid`).
    - `npm audit` result: **0 vulnerabilities** (Exit code 0).
  - Executable Firestore Rules Test Suite (`scripts/test-firestore-rules.ts`): **17 / 17 PASSED** ✅
  - Typecheck (`npx tsc --noEmit`): **0 errors** ✅
  - Production Build (`npm run build`): **59 static pages compiled successfully** ✅
- **Checkpoint 6 (Final Regression Audit):** COMPLETED & VERIFIED PASS ✅
  - Comprehensive Security Re-Audit completed across all 15 security domains.
  - Original Vulnerability Reconciliation (`FINAL_SECURITY_AUDIT.md`): All 10 original findings (VULN-01 to VULN-10) confirmed FIXED / MITIGATED with 0 remaining Critical or High unmitigated risks.
  - Security Regression Matrix (`SECURITY_REGRESSION_MATRIX.md`): 14 / 14 security test scenarios PASSED with ZERO regressions.
  - Environment Security Specification (`PRODUCTION_ENVIRONMENT_SECURITY.md`): Enumerated 17 environment variables with sensitivity classification and client vs server isolation requirements.
  - Pre-Deployment Checklist (`PRE_DEPLOY_SECURITY_CHECKLIST.md`): Detailed manual secret rotation, Vercel env configuration, and Firestore rules deployment procedures.
  - Repository Secret & Bundle Scan: Confirmed ZERO server secrets (`LIVEKIT_API_SECRET`, `GEMINI_API_KEY`, `SESSION_SECRET`) present in source code or client JS build bundles.
  - Automated Verifications:
    - Firestore Security Rules Suite (`scripts/test-firestore-rules.ts`): **17 / 17 PASSED** ✅
    - Rate Limiter Test Suite (`scripts/test-rate-limits.ts`): **5 / 5 PASSED** ✅
    - Dependency Security Audit (`npm audit`): **0 Vulnerabilities** (Exit code 0) ✅
    - TypeScript Typecheck (`npx tsc --noEmit`): **0 Errors** ✅
    - Production Build (`npm run build`): **59 Pages Compiled Successfully** ✅
    - ESLint (`npm run lint`): 519 pre-existing legacy frontend issues documented (security-critical files clean).

---

**STATUS: CHECKPOINT 6 COMPLETE — PROGRAM READY FOR MANUAL DEPLOYMENT REVIEW.**


