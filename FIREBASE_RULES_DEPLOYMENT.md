# Firebase Security Rules Deployment & Custom Claims Guide

**Target Firebase Project:** Masar Educational Platform (`masar-platform-8e642`)  
**Rules Specification File:** [`firestore.rules`](file:///c:/Users/hassa/Desktop/ismail%20edu/issa-genesis-web/firestore.rules)  
**Config File:** [`firebase.json`](file:///c:/Users/hassa/Desktop/ismail%20edu/issa-genesis-web/firebase.json)  
**Security Suite:** `scripts/test-firestore-rules.ts`

---

## 1. Firebase Storage Status: NOT USED

- **Source Evidence:** Zero imports of `firebase/storage` across all `.ts` and `.tsx` files in `src/`.
- **Initialization:** No `getStorage()` call exists in [`firebase.ts`](file:///c:/Users/hassa/Desktop/ismail%20edu/issa-genesis-web/src/lib/firebase.ts) or anywhere in the codebase.
- **Upload Calls:** No file upload functions (`uploadBytes`, `uploadBytesResumable`, `put`) or storage ref builders (`ref()`) exist.
- **Image Handling:** All media references rely on static asset paths (`/public`) or external HTTPS links.
- **Conclusion:** Firebase Storage is **NOT USED** by the application. Separate Storage Rules are not required.

---

## 2. Firebase Auth Custom Claims Architecture

- **Status:** **PARTIALLY IMPLEMENTED**
- **Current Authentication:** Application API routes and pages use signed server JWT session cookies (`masar_session`).
- **Firestore Rules Integration:** `firestore.rules` relies on `request.auth.token.role` (and email fallback `request.auth.token.email == 'dr.ismail@masar.com'`).
- **Required Provisioning Step:** When provisioning Firebase Auth users for client SDK Firestore access, run Firebase Admin SDK to populate custom user claims:

```typescript
import * as admin from 'firebase-admin';

// Provision role into Firebase Auth custom claims
export async function setAccountRoleClaim(uid: string, role: 'doctor' | 'teacher' | 'parent' | 'student') {
  await admin.auth().setCustomUserClaims(uid, { role });
}
```

---

## 3. Local Verification via Security Assertion Suite

Run the isolated rules assertion test suite:

```bash
npx tsx scripts/test-firestore-rules.ts
```

Output verifies:
- Top-level default deny fallback (`allow read, write: if false;`)
- Absence of blanket permissive rules (`allow read, write: if true;`)
- Direct client write DENIED for `accounts`, `faceRecords`, `credentials`
- Role & Ownership helper functions (`isDoctor()`, `isTeacher()`, `isOwner()`, `isLinkedParent()`)
- Field immutability protection (`protectedFieldsUnchanged()`)
- Complete coverage across all 25 collections.

---

## 4. Production Deployment Steps (Manual Execution Only)

When ready to deploy the updated Security Rules to production:

```bash
# 1. Select the target production Firebase project
firebase use --add

# 2. Deploy ONLY the Firestore rules file
firebase deploy --only firestore:rules
```

---

## 5. Rollback Procedure

If any rule issue is detected post-deployment:
1. Open the [Firebase Console -> Firestore Database -> Rules](https://console.firebase.google.com/).
2. Click **Rules History**.
3. Select the previous release and click **Release**.
