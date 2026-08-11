# API Security Matrix — Masar Educational Platform

| Method | Endpoint | Auth Requirement | Role Mapping | Room Resolution & Object Auth | Validation | Rate Limit / Guard | Sensitive Output | Risk |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public (Login) | Any | Verifies credentials against bcrypt server database | Email/password format & string validation | Login attempt throttling | Safe (`masar_session` HTTP-Only cookie set, hash stripped) | Low |
| `GET` | `/api/livekit/token` | Enforced (`masar_session`) | Server-derived (`doctor`/`teacher`/`specialist` -> `canPublish: true`; `student`/`parent` -> `canPublish: false`) | Server-authoritative room resolution (`authorizeRoomAccess` in `src/lib/auth/roomAuthorization.ts`) | Room string sanitization & catalog resolution | 4h Token TTL | Short-lived WebRTC JWT (`LIVEKIT_API_SECRET` server-isolated) | Low |
| `POST` | `/api/ai/execute` | Enforced (`masar_session`) | Any Authenticated | N/A | Prompt max 4,000 chars; History max 10 messages (1,000 chars each) | Server gateway fallback | Clean reply & action JSON (No stack traces or API keys) | Low |
| `POST` | `/api/tts` | Enforced (`masar_session`) | Any Authenticated | N/A | Text max 2,000 chars; Stability & Similarity clamped (0.0 - 1.0) | Max 2,000 chars per request | Audio/mpeg stream (Upstream error response sanitized) | Low |

---

## LiveKit Room-Level Authorization Matrix (`/api/livekit/token`)

| User Role | Requested Room | Room Category | Authorized? | Can Publish? | Server Response |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Anonymous** | Any | Any | **No** | **No** | `401 Unauthorized` |
| **Student** | Own Grade (`ikhlas-grade-1`) | `classroom-specific` | **Yes** | **No** | `200 OK` + Token (`canPublish: false`) |
| **Student** | Unregistered Room (`room_001`) | `unregistered` | **No** | **No** | `403 Forbidden` (`Unauthorized room`) |
| **Parent** | Linked Child's Grade | `classroom-specific` | **Yes** | **No** | `200 OK` + Token (`canPublish: false`) |
| **Parent** | Unregistered Room (`room_001`) | `unregistered` | **No** | **No** | `403 Forbidden` (`Unauthorized room`) |
| **Teacher** | Assigned Classroom / Branch | `classroom-specific` | **Yes** | **Yes** | `200 OK` + Token (`canPublish: true`) |
| **Teacher** | Unregistered Room (`room_001`) | `unregistered` | **No** | **No** | `403 Forbidden` (`Unauthorized room`) |
| **Doctor** | Any Registered Room | `all registered` | **Yes** | **Yes** | `200 OK` + Token (`canPublish: true`) |

---

## Endpoint Security Audit Summary

### 1. `/api/auth/login`
- **Authentication**: Public authentication entrypoint.
- **Security Logic**: Verifies password server-side against bcrypt hash using `bcryptjs`. Returns HTTP 401 on bad credentials. Sets HTTP-Only, SameSite=Lax `masar_session` JWT cookie signed with server `SESSION_SECRET`.
- **Information Exposure**: Password hash is stripped before returning user object in response body.

### 2. `/api/livekit/token`
- **Authentication**: Server-side cookie session verification (`requireAuth`). Rejects unauthenticated requests with HTTP 401.
- **Room Resolution & Authorization**: Enforces `authorizeRoomAccess` in `src/lib/auth/roomAuthorization.ts`. Syntactically valid room strings that are NOT registered or assigned return **HTTP 403 Forbidden**.
- **Privilege Minimization**: Client-supplied `isHost` parameter is completely ignored. Host grants (`canPublish`, `canPublishData`) are determined strictly server-side by checking `user.role` and room assignment.
- **Identity Security**: User ID and display name are derived from server session. Client cannot forge identities.
- **Secret Isolation**: `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` remain strictly on the server and are never returned or logged.

### 3. `/api/ai/execute`
- **Authentication**: Server-side cookie session verification (`requireAuth`). Rejects unauthenticated requests with HTTP 401.
- **SSRF Defense**: Client-supplied `baseUrl` and `apiKey` parameters were removed. The server uses only environment-configured API gateways (`process.env.MSEMAX_API_URL`, etc.).
- **Input Validation**: Prompt length capped at 4,000 characters. Conversation history capped at 10 items of 1,000 characters each.
- **Error Handling**: Internal stack traces and upstream model error details are caught and sanitized.

### 4. `/api/tts`
- **Authentication**: Server-side cookie session verification (`requireAuth`). Rejects unauthenticated requests with HTTP 401.
- **Input Validation**: Text limited to 2,000 characters. Numeric parameters (`stability`, `similarityBoost`) are strictly clamped between `0.0` and `1.0`.
- **Secret & Response Isolation**: `ELEVENLABS_API_KEY` remains server-only. Upstream API errors return sanitized HTTP 502/500 responses without leaking keys.
