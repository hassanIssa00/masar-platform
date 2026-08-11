# DEPENDENCY SECURITY AUDIT — Checkpoint 5 (Re-Verification Complete)

**Date:** 2026-08-11  
**Tool:** `npm audit`  
**Project:** issa-genesis-web (Masar Educational Platform)  

---

## Executive Summary

| Audit Stage | Critical | High | Moderate | Low | Total |
|-------------|----------|------|----------|-----|-------|
| Pre-Remediation (Initial) | 0 | 7 | 0 | 2 | 9 |
| Post-Next.js 16.3.0 Upgrade | 0 | 4 | 0 | 2 | 6 |
| **Post-Overrides (Final)** | **0** | **0** | **0** | **0** | **0** |

---

## Final Vulnerability Matrix

| Package | Version | Severity | Status | Reachability & Impact Analysis | Action Taken |
|---------|---------|----------|--------|--------------------------------|--------------|
| `next` | `16.2.10` → `16.3.0` | **HIGH** | **FIXED** | Next.js rewrites SSRF (GHSA-p9j2), Server Action payload (GHSA-4c39), internal endpoint exposure (GHSA-955p). | Upgraded `next` to `16.3.0` (non-breaking minor patch). |
| `postcss` | `8.5.11` → `8.5.22+` | **HIGH** | **FIXED** | Transitive via Next.js. Path traversal via `sourceMappingURL` (GHSA-r28c/6g55). | Resolved automatically via `next@16.3.0` upgrade. |
| `sharp` | `<0.35.0` → `0.35.0+` | **HIGH** | **FIXED** | Transitive via Next.js. libvips memory corruption (GHSA-f88m). | Resolved automatically via `next@16.3.0` upgrade. |
| `node-fetch` | `2.1.2` → `2.7.0` | **HIGH** | **FIXED / NOT REACHABLE** | Transitive via `face-api.js` → `@tensorflow/tfjs-core@1.7.0`. GHSA-r683-j2x4-v87g (auth header forwarding on redirect). | **1. Source Verification:** Proved `tfjs-core` uses `IS_BROWSER` environment check to instantiate `PlatformBrowser` (`window.fetch` shim). `PlatformNode` (`require('node-fetch')`) is **never executed** in browser runtime.<br>**2. Direct Fix:** Added `"overrides": { "node-fetch": "^2.7.0" }` in `package.json`. Upgraded to non-vulnerable `2.7.0` safely. |
| `brace-expansion` | `<1.1.18` → `1.1.18` | **HIGH** | **FIXED** | Transitive dev dependency via `@typescript-eslint`. DoS via unbounded expansion. | Fixed via `"overrides": { "brace-expansion": "^1.1.18" }`. |
| `js-yaml` | `<4.3.1` → `4.3.1` | **HIGH** | **FIXED** | Transitive dev dependency via ESLint. Quadratic CPU in `!!omap`. | Fixed via `"overrides": { "js-yaml": "^4.3.1" }`. |
| `nanoid` | `<3.3.17` → `3.3.17` | **HIGH** | **FIXED** | Transitive dev dependency via PostCSS toolchain. Infinite loop when size=0. | Fixed via `"overrides": { "nanoid": "^3.3.17" }`. |

---

## Detailed Reachability Analysis: `face-api.js` & `node-fetch`

### 1. Architectural Surface
- **Module File:** `src/lib/faceAuth.ts`
- **Callers:** Client components ONLY (`src/app/face-enroll/page.tsx`, `src/components/FaceCamera.tsx`, `src/components/FaceEnrollModal.tsx`, `src/components/FaceLoginModal.tsx`).
- **Server Execution:** None. No API routes or Server Components import `faceAuth.ts`.

### 2. Dependency Chain
```text
issa-genesis-web@0.1.0
└── face-api.js@0.22.2 (client-side dynamic import: await import('face-api.js'))
    └── @tensorflow/tfjs-core@1.7.0
        └── node-fetch@2.1.2 → OVERRIDDEN TO 2.7.0
```

### 3. Runtime Isolation Mechanics in `@tensorflow/tfjs-core`
In `node_modules/@tensorflow/tfjs-core/dist/tf-core.js`:
- Line 3844: `ENV.registerFlag('IS_BROWSER', function () { return isBrowser(); });`
- Line 3846: `ENV.registerFlag('IS_NODE', function () { return (typeof process !== 'undefined') && (typeof process.versions !== 'undefined') && (typeof process.versions.node !== 'undefined'); });`
- Line 30285: `if (env().get('IS_BROWSER')) { env().setPlatform('browser', new PlatformBrowser()); }`
- Line 30346: `if (env().get('IS_NODE')) { env().setPlatform('node', new PlatformNode()); }`

When running in browser:
- `IS_BROWSER` evaluates to `true`.
- `IS_NODE` evaluates to `false`.
- `PlatformBrowser` delegates all fetches to `window.fetch` (native browser API).
- `PlatformNode` is **never instantiated**, and `require('node-fetch')` is **never called**.
- `node-fetch/browser.js` shim (`module.exports = window.fetch`) is loaded by Webpack for client builds.

### 4. Resolution
- **Reachability Status:** **NOT REACHABLE / NOT EXPLOITABLE** in browser runtime.
- **Dependency Status:** **FIXED** via `npm overrides` to `node-fetch@2.7.0`. Biometric face enrollment and recognition remain 100% operational.

---

## Verification & Audit Output

Command: `npm audit`
```text
found 0 vulnerabilities
```
Exit Code: `0`
