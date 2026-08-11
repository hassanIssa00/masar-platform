# Firestore Data Model & Collection Inventory — Masar Platform

**Target Database:** Google Cloud Firestore  
**Security Model:** Server-Authoritative / Default-Deny (`allow read, write: if false;`)  
**Firebase Storage:** **NOT USED** (Zero imports of `firebase/storage`, no `getStorage()` call in codebase)  
**Custom Claims Status:** **PARTIALLY IMPLEMENTED** (API uses `masar_session` JWT; Firestore rules use `request.auth.token.role` with Admin SDK claim script ready)

---

## Complete Collection Inventory

| Collection | Purpose | Read By | Created By | Updated By | Deleted By | Client Access | Server Access | Sensitivity Level |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| `accounts` | User profile records (name, email, role, phone, branch) | Doctor / Self | Server API (`/api/auth/login`) | Doctor / Self | Doctor | DENY Direct Write | Full Control (Admin SDK) | **HIGHLY SENSITIVE** |
| `faceRecords` | Encrypted 128-float facial biometric vectors | Server API (`/api/face/*`) | Server API | Server API | Server API | **DENY ALL** | Full Control (Admin SDK) | **HIGHLY SENSITIVE** |
| `reports` | Clinical assessment & diagnostic reports | Doctor / Teacher / Parent (Linked) | Doctor / Teacher | Doctor / Teacher | Doctor | Restricted | Full Control | **HIGHLY SENSITIVE** |
| `iep_records` | Individualized Education Plans (IEP) & goals | Doctor / Teacher / Parent (Linked) | Doctor / Teacher | Doctor / Teacher | Doctor | Restricted | Full Control | **HIGHLY SENSITIVE** |
| `session_records` | Clinical session notes & observations | Doctor / Specialist / Parent (Linked) | Specialist / Doctor | Specialist / Doctor | Doctor | Restricted | Full Control | **HIGHLY SENSITIVE** |
| `consents` | Parental consent & legal authorization forms | Doctor / Parent (Self) | Parent / Doctor | Doctor | Doctor | Restricted | Full Control | **HIGHLY SENSITIVE** |
| `students` | Student demographic & academic profiles | Doctor / Teacher / Parent (Linked) | Doctor / Teacher | Doctor / Teacher | Doctor | Restricted | Full Control | **SENSITIVE** |
| `attendance` | Daily student attendance & absence logs | Doctor / Staff / Parent (Linked) | Staff / Doctor | Staff / Doctor | Doctor | Restricted | Full Control | **SENSITIVE** |
| `homework` | Homework assignments & student submissions | Doctor / Teacher / Student (Enrolled) | Teacher / Doctor | Teacher / Doctor | Doctor | Restricted | Full Control | **SENSITIVE** |
| `invoices` | Billing statements & fee records | Doctor / Parent (Linked) | Doctor / Admin | Doctor / Admin | Doctor | Restricted | Full Control | **SENSITIVE** |
| `messages` | Direct messages between Doctor and Parent | Sender / Recipient | Doctor / Parent | Sender | Doctor | Restricted | Full Control | **SENSITIVE** |
| `surveys` | Parent intake evaluation questionnaires | Doctor / Guest (Create) | Guest / Parent | Doctor | Doctor | Create Only / Restricted | Full Control | **SENSITIVE** |
| `notifications` | In-app alerts for parents & staff | Recipient User | Server / Staff | Recipient (Mark Read) | Recipient / Server | Restricted | Full Control | **SENSITIVE** |
| `assessment_results` | Placement assessment score records | Doctor / Staff / Parent (Linked) | Staff / System | Staff | Doctor | Restricted | Full Control | **SENSITIVE** |
| `branches` | School branch metadata & active counts | Authenticated Users | Doctor | Doctor | Doctor | Read Only | Full Control | **INTERNAL** |
| `point_transactions` | Student gamification points ledger | Student (Self) / Staff | System / Staff | Staff | Doctor | Restricted | Full Control | **INTERNAL** |
| `assessment_templates` | Pre-defined assessment questions | Authenticated Staff | Doctor | Doctor | Doctor | Read Only | Full Control | **INTERNAL** |
| `resources` | Educational files & worksheet metadata | Authenticated Users | Staff / Doctor | Staff / Doctor | Doctor | Restricted Read | Full Control | **INTERNAL** |
| `activities` | Audit trail of platform actions | Doctor | Staff / System | System | Doctor | Deny Direct / Server Write | Full Control | **INTERNAL** |
| `ikhlasLogs` | Daily operational school logs (Ikhlas Branch) | Branch Staff | Branch Staff | Branch Staff | Doctor | Restricted | Full Control | **INTERNAL** |
| `ikhlasPosts` | School community announcements | Authenticated Users | Branch Staff | Branch Staff | Doctor | Read Only | Full Control | **INTERNAL** |
| `calendar_sessions` | Scheduled live classes & meeting entries | Authenticated Users | Staff / Doctor | Staff / Doctor | Doctor | Restricted | Full Control | **INTERNAL** |
| `waitlist` | Public landing page registrations | Doctor | Public Guest | Doctor | Doctor | Create Only | Full Control | **PUBLIC** |
| `platform_analytics` | Platform usage analytics & metrics | Doctor | System | System | Doctor | Deny Direct | Full Control | **INTERNAL** |
| `platform_config` | Main system operational configuration | Doctor | Doctor | Doctor | Doctor | Deny Direct | Full Control | **INTERNAL** |

---

## Security Rules Enforcement Architecture

### 1. Default-Deny Policy
Every collection that does not explicitly declare a match rule is blocked by the top-level fallback:
```javascript
match /{document=**} {
  allow read, write: if false;
}
```

### 2. Client SDK vs. Server Admin SDK Separation
- **Client SDK (`firebase/firestore`)**: Used in client web components. Every client request must pass `firestore.rules` evaluation.
- **Server Admin SDK (`firebase-admin`)**: Used strictly in server API routes (`/api/*`). Admin SDK operations bypass Security Rules. Server route handlers validate user identity (`requireAuth`) and object ownership (`requireOwnership`) **before** invoking database operations.

### 3. Highly Sensitive Collection Protection
- `accounts` and `faceRecords` are completely blocked from client-side direct writes (`allow write: if false;`).
- All account modifications and facial recognition vector comparisons occur strictly inside server-side Node.js API endpoints.
