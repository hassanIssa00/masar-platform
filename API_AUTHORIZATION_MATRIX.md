# 🛡️ API AUTHORIZATION MATRIX — MASAR EDUCATIONAL PLATFORM

**Target Application:** Masar Educational Platform (`https://masarplatform.org`)  
**Date:** August 11, 2026  
**Status:** Implemented in Checkpoint 2  

---

## Endpoint Security & Authorization Enforcement

| Method | Endpoint | Auth Required | Minimum Role | Object-Level Authorization Check | Risk Classification |
| :--- | :--- | :---: | :---: | :--- | :---: |
| POST | `/api/auth/login` | ❌ Public | Anyone | Rate-limited per IP; bcrypt verification | Low |
| GET | `/api/livekit/token` | ✅ Required | Student / Teacher / Doctor | Room validation; Host grant strictly for Doctor/Teacher | High (Guarded) |
| POST | `/api/ai/execute` | ✅ Required | Any Auth User | Rate-limited per User; Session verified | Medium (Guarded) |
| POST | `/api/tts` | ✅ Required | Any Auth User | Rate-limited per User; Session verified | Low (Guarded) |
| GET | `/platform-settings` | ✅ Required | Doctor / Admin | Admin permission check in Middleware & Route | Critical (Guarded) |
| GET | `/dashboard` | ✅ Required | Doctor / Admin | Doctor role check in Middleware | High (Guarded) |
| GET | `/student/[id]` | ✅ Required | Student / Parent / Teacher / Doctor | Ownership check (Self / Linked Child / Class) | High (Guarded) |
| GET | `/reports/[id]` | ✅ Required | Student / Parent / Teacher / Doctor | Ownership check (Self / Linked Child / Author) | High (Guarded) |
