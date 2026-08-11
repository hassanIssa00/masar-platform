# 🔑 SECRET ROTATION REQUIRED — MANUAL PLATFORM OWNER ACTIONS

**Target Environment:** Production Deployment (`https://masarplatform.org` / Vercel)  
**Status:** Action Required by Platform Owner  

---

## Required Manual Secret Rotations

The security audit confirmed that legacy API secrets were present in source code fallbacks. Now that code-level fallback fallbacks have been removed, the owner must rotate the following credentials in their administrative consoles:

### 1. LiveKit API Secret & Key Rotation
1. Log into [LiveKit Cloud Console](https://cloud.livekit.io/).
2. Select your project (`masarplatform-73wpzvkh`).
3. Navigate to **Project Settings -> API Keys**.
4. Revoke the existing key (`APIVGMBkUJsJg2A`) and secret.
5. Create a **New API Key and Secret**.
6. Update Vercel Environment Variables:
   - Set `LIVEKIT_API_KEY` to the new Key value.
   - Set `LIVEKIT_API_SECRET` to the new Secret value.

### 2. Google Gemini API Key Rotation
1. Log into [Google AI Studio](https://aistudio.google.com/).
2. Navigate to **API Keys**.
3. Revoke all previously active API keys.
4. Generate new Gemini API key(s).
5. Update Vercel Environment Variables:
   - Set `GEMINI_API_KEYS` to your new key(s) (comma-separated if using multiple keys for load balancing).

### 3. Session Security Secret
1. Generate a strong random string (e.g. `openssl rand -hex 32`).
2. Add to Vercel Environment Variables:
   - Set `SESSION_SECRET` to this random secret value.

---

**Do NOT commit actual secret values to Git repositories or source files.**
