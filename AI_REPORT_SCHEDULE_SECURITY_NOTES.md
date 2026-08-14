# MASAR AI, Reports, Schedule, and Security Notes

Date: 2026-08-14

## What Was Fixed

### 1. Gemini AI Gateway

- Gemini keys are now read only from server environment variables:
  - `GEMINI_API_KEYS`
  - `GEMINI_API_KEY`
  - `GOOGLE_AI_API_KEY`
- Multiple keys can be supplied in one environment variable, separated by comma, semicolon, pipe, or new lines.
- The server rotates across the configured keys and supported Gemini models automatically.
- Real keys must never be committed to Git. Add them in Vercel Project Settings or local `.env.local`.

Security note: the keys that were shared in chat should be considered exposed. Rotate them in Google AI Studio / Google Cloud before production use.

### 2. AI Action Routing

The AI endpoint now returns structured platform actions such as:

- `attendance`
- `homework`
- `iep`
- `schedule`
- `report`
- `message`
- `research`

The UI dispatches these actions to the active platform page so the assistant can open the right operational screen instead of only replying with text.

### 3. Schedule Image Parsing

- `/api/schedule/parse` now requires authentication.
- Requests are rate-limited per user and IP.
- Large image payloads are rejected before model calls.
- Failed parsing returns a clear error instead of silently replacing the uploaded schedule with a default schedule.
- Parsed schedules are saved to the schedule store and Firestore, then reflected in the Ikhlas schedule page until a new schedule is uploaded.

### 4. Printable Reports

- The analytical report header was rebuilt to match the MASAR identity: logo on the right, centered platform identity, and file number/date panel.
- The analysis report now includes deeper domain interpretation, strengths, priority needs, intervention guidance, and monitoring intervals.
- The report footer now prints:
  `جميع الحقوق محفوظة - منصة مَسَار للتأهيل والتعليم الذكي`

### 5. HTTP Security

- Added stricter CSP directives:
  - `object-src 'none'`
  - `manifest-src 'self'`
- Added additional security headers:
  - `X-DNS-Prefetch-Control: off`
  - `X-Frame-Options: SAMEORIGIN`
- AI and schedule parsing endpoints are protected by authentication, validation, and rate limiting.

## Production Checklist

- Set `GEMINI_API_KEYS` in Vercel environment variables.
- Rotate any Gemini keys that were shared outside the secure environment.
- Confirm Firebase Authorized Domains contains:
  - `masarplatform.org`
  - `www.masarplatform.org`
  - `masar-platform-8e642.firebaseapp.com`
- Apple Sign-In still requires Apple Developer configuration inside Firebase:
  - Services ID
  - Team ID
  - Key ID
  - Private Key `.p8`
- Re-run a production smoke test after Vercel deployment:
  - Google login
  - Apple login after Apple configuration
  - Face ID enrollment and login
  - AI assistant prompt with and without image
  - Smart schedule image upload
  - Analytical report print
  - Certificate print
