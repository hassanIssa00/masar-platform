# Data Sync And Parent/Student Linking Contract

Last updated: 2026-08-31

## Goal

All student, parent, account, report, survey, and generated-login data must be cloud-backed through Firebase/Vercel APIs. Browser memory/cache is only a short-lived read cache and must never be treated as the source of truth.

Manual and generated password accounts are valid when the cloud `auth_credentials` / `account_credentials` records are written successfully. Firebase Auth user creation can mirror those accounts, but Email/Password provider failures must not block cloud registration when Firestore credentials and the secure app session are available.

## Core IDs

- `accounts/{studentAccountId}` is the student login account.
- `accounts/{parentAccountId}` is the parent login account.
- `students/{studentId}` is the student profile visible in Dr. Ismail dashboards.
- For generated student accounts, `studentId` should equal the student account Firebase UID whenever possible.

## Required Link Fields

Student records should carry:

- `studentAccountId`
- `parentAccountId`
- `linkedStudentId`
- `linkedStudentEmail`
- `linkedStudentName`
- `linkedParentId`
- `linkedParentEmail`
- `schoolBranch`

Account records should carry:

- `linkedStudentId`
- `linkedStudentEmail`
- `linkedStudentName`
- `linkedParentId`
- `linkedParentEmail`
- `schoolBranch`

## Matching Order

Use this order everywhere:

1. Direct IDs: `linkedStudentId`, `studentAccountId`, `parentAccountId`, `linkedParentId`.
2. Explicit generated links: `linkedStudentEmail`, `linkedParentEmail`.
3. Non-generated email matches.
4. Phone suffix matches, only inside the same branch.
5. Arabic-normalized parent/child name matches, only inside the same branch.

## Forbidden Behavior

- Do not choose `allStudents[0]` when resolving ownership.
- Do not link a parent to a placeholder duplicate if a direct generated shell already exists.
- Do not copy a photo/name from an unrelated student account just because the current record is named "طالب جديد".
- Do not silently return success from account generation or registration if Firebase Admin/Firestore write failed.
- Do not fail manual registration only because Firebase Auth Email/Password is disabled when Firestore credentials were saved.
- Do not write durable platform data to `localStorage` or `sessionStorage`.

## Self-Healing

Login and session hydration may self-heal missing links by writing the direct fields back to Firestore. Self-healing must be conservative and must only use direct links, explicit generated emails, same-branch phone, or same-branch normalized names.
