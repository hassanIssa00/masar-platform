# 🛡️ AUTHORIZATION MATRIX — MASAR EDUCATIONAL PLATFORM

**Target Application:** Masar Educational Platform (`https://masarplatform.org`)  
**Date:** August 11, 2026  
**Status:** Implemented in Checkpoint 2  

---

## 1. Role Permission Matrix

| Resource / Action | Anonymous | Student | Parent | Teacher | Specialist | Doctor / Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Landing Page / Public Programs** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Login / Register (`/auth/*`)** | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **Doctor Dashboard (`/dashboard`)** | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Allowed |
| **Platform Settings (`/platform-settings`)** | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Allowed |
| **Data Purge / System Config** | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Allowed |
| **Student Profiles (`/student/[id]`)** | ❌ Denied | 🔒 Self Only | 🔒 Child Only | 🔒 Class Only | 🔒 Class Only | ✅ Allowed |
| **Clinical Reports (`/reports/*`)** | ❌ Denied | 🔒 Self Only | 🔒 Child Only | 🔒 Class Only | 🔒 Class Only | ✅ Allowed |
| **Attendance Logs (`/attendance`)** | ❌ Denied | 🔒 Self Only | 🔒 Child Only | ✅ Allowed | ✅ Allowed | ✅ Allowed |
| **School Student Portal (`/school-student`)**| ❌ Denied | ✅ Allowed | ❌ Denied | ❌ Denied | ❌ Denied | ✅ Allowed |
| **School Parent Portal (`/school-parent`)**| ❌ Denied | ❌ Denied | ✅ Allowed | ❌ Denied | ❌ Denied | ✅ Allowed |
| **Messages / Communications (`/messages`)**| ❌ Denied | 🔒 Self Only | 🔒 Linked Only| 🔒 Class Only | 🔒 Class Only | ✅ Allowed |

---

## 2. Object-Level Authorization Rules (BOLA / IDOR Protection)

1. **Student Records (`studentId`):**
   - `doctor`: Unrestricted read/write/delete.
   - `teacher` / `specialist`: Allowed read/update ONLY if student is assigned to their branch/class.
   - `parent`: Allowed read ONLY if `student.parentPhone` or `student.parentName` links to the authenticated parent's session.
   - `student`: Allowed read ONLY for their own record (`student.fullName === session.name`).
   - `anonymous`: Denied.

2. **Clinical Reports (`reportId`):**
   - `doctor`: Unrestricted read/create/delete.
   - `teacher` / `specialist`: Allowed read/create ONLY for students in their assigned program.
   - `parent`: Allowed read ONLY if the report belongs to their linked child.
   - `student`: Allowed read ONLY if the report belongs to them.
   - `anonymous`: Denied.

3. **Administrative System Actions:**
   - `doctor`: Allowed.
   - All other roles / anonymous: Denied (HTTP 403 Forbidden).
