import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/authorization';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin.server';
import { invalidateSnapshotCache } from '@/app/api/data/snapshot/route';

export const runtime = 'nodejs';

const STUDENT_SCOPED_COLLECTIONS = [
  'students',
  'reports',
  'surveys',
  'messages',
  'faceRecords',
  'notifications',
  'attendance',
  'assessment_results',
  'iep_records',
  'consents',
  'session_records',
  'class_students',
  'student_notes',
  'student_homework_logs',
  'student_cert_logs',
  'curriculum_assignments',
  'curriculum_drawings',
  'quiz_submissions',
  'student_points',
  'point_transactions',
  'student_learning_activity',
  'simple_spelling_assignments',
  'simple_spelling_drawings',
] as const;

function cleanEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function cleanDigits(phone?: unknown): string {
  return String(phone || '').replace(/\D/g, '');
}

function isDoctorAccount(email?: unknown, role?: unknown): boolean {
  const e = cleanEmail(email);
  const r = String(role || '').trim().toLowerCase();
  return (
    r === 'doctor' ||
    e === 'dr.ismail@masar.com' ||
    e === 'ismail@masarplatform.com' ||
    e.startsWith('dr.ismail@') ||
    e.startsWith('ismail@masar')
  );
}

function normalizeArabic(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesKnownStudent(data: FirebaseFirestore.DocumentData, studentIds: Set<string>, studentNames: Set<string>) {
  const candidates = [
    data.id,
    data.studentId,
    data.linkedStudentId,
    data.studentAccountId,
    data.accountId,
    data.refId,
  ].map((value) => String(value || '').trim());

  if (candidates.some((value) => value && studentIds.has(value))) return true;

  const nameCandidates = [
    data.studentName,
    data.fullName,
    data.name,
    data.childName,
  ].map(normalizeArabic);

  return nameCandidates.some((value) => value && studentNames.has(value));
}

async function deleteDocs(refs: FirebaseFirestore.DocumentReference[]) {
  const adminDb = getAdminDb();
  if (!adminDb || refs.length === 0) return 0;

  let deleted = 0;
  for (let index = 0; index < refs.length; index += 450) {
    const batch = adminDb.batch();
    const chunk = refs.slice(index, index + 450);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
    deleted += chunk.length;
  }
  return deleted;
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['doctor']);
  if (!auth.authorized || !auth.user) {
    return NextResponse.json({ ok: false, error: 'حذف بيانات الطلاب متاح لحساب الدكتور فقط.' }, { status: 401 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: 'لم يتم ضبط Firebase Admin على السيرفر.' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const targetStudentId = typeof body.studentId === 'string' ? body.studentId.trim() : '';
  const targetAccountId = typeof body.accountId === 'string' ? body.accountId.trim() : '';
  const isSingleStudentDelete = Boolean(targetStudentId);
  const isSingleAccountDelete = Boolean(targetAccountId && !targetStudentId);

  try {
    const studentsSnap = await adminDb.collection('students').get();
    const studentIds = new Set<string>();
    const studentNames = new Set<string>();
    const studentEmails = new Set<string>();
    const parentAccountIds = new Set<string>();
    const parentNames = new Set<string>();
    const parentEmails = new Set<string>();
    const parentPhoneSuffixes = new Set<string>();
    const accountIds = new Set<string>();
    const emails = new Set<string>();

    if (isSingleStudentDelete) {
      // ─────────────────────────────────────────────────────────
      //  MODE 1: DELETE A SPECIFIC STUDENT + THEIR FAMILY ACCOUNTS
      // ─────────────────────────────────────────────────────────
      const initialMatches = studentsSnap.docs.filter((doc) => {
        const d = doc.data();
        if (doc.id === targetStudentId || d.id === targetStudentId) return true;
        if (d.studentAccountId === targetStudentId || d.linkedStudentId === targetStudentId) return true;
        return false;
      });

      const initialNames = new Set<string>();
      initialMatches.forEach((doc) => {
        const n = normalizeArabic(doc.data().fullName || doc.data().studentName || doc.data().name);
        if (n) initialNames.add(n);
      });

      // Include target student doc and any duplicate twin records with identical normalized name
      const targetDocs = studentsSnap.docs.filter((doc) => {
        const d = doc.data();
        if (doc.id === targetStudentId || d.id === targetStudentId) return true;
        if (d.studentAccountId === targetStudentId || d.linkedStudentId === targetStudentId) return true;
        const n = normalizeArabic(d.fullName || d.studentName || d.name);
        return Boolean(n && initialNames.has(n));
      });

      targetDocs.forEach((doc) => {
        const data = doc.data();
        studentIds.add(doc.id);
        [data.id, data.studentId, data.linkedStudentId, data.studentAccountId].forEach((v) => {
          const id = String(v || '').trim();
          if (id) {
            studentIds.add(id);
            accountIds.add(id);
          }
        });
        [data.parentAccountId, data.linkedParentId].forEach((v) => {
          const id = String(v || '').trim();
          if (id) {
            parentAccountIds.add(id);
            accountIds.add(id);
          }
        });
        [data.fullName, data.studentName, data.name].forEach((v) => {
          const name = normalizeArabic(v);
          if (name) studentNames.add(name);
        });
        [data.parentName].forEach((v) => {
          const name = normalizeArabic(v);
          if (name) parentNames.add(name);
        });
        [data.email, data.recoveryEmail, data.linkedStudentEmail].forEach((v) => {
          const em = cleanEmail(v);
          if (em) {
            studentEmails.add(em);
            emails.add(em);
          }
        });
        [data.parentEmail, data.linkedParentEmail].forEach((v) => {
          const em = cleanEmail(v);
          if (em) {
            parentEmails.add(em);
            emails.add(em);
          }
        });
        [data.parentPhone, data.phone].forEach((v) => {
          const p = cleanDigits(v);
          if (p && p.length >= 8) parentPhoneSuffixes.add(p.slice(-8));
        });
      });

      // Always ensure the target ID itself is in studentIds
      studentIds.add(targetStudentId);

      // Now query accounts collection to match student account & parent account
      const accountSnap = await adminDb.collection('accounts').get();
      const accountRefsToDelete: FirebaseFirestore.DocumentReference[] = [];

      accountSnap.docs.forEach((doc) => {
        const data = doc.data();
        const email = cleanEmail(data.email);
        const role = String(data.role || '').trim();
        if (isDoctorAccount(email, role)) return;

        const linkedId = String(data.linkedStudentId || data.studentAccountId || '').trim();
        const parentLinkedId = String(data.linkedParentId || data.parentAccountId || '').trim();
        const accName = normalizeArabic(data.name || data.fullName);
        const accPhoneSuffix = cleanDigits(data.phone).slice(-8);

        const isStudentAcc =
          role === 'student' && (
            studentIds.has(doc.id) ||
            accountIds.has(doc.id) ||
            (!!linkedId && studentIds.has(linkedId)) ||
            (!!email && (studentEmails.has(email) || emails.has(email))) ||
            (!!accName && studentNames.has(accName))
          );

        const isParentAcc =
          role === 'parent' && (
            parentAccountIds.has(doc.id) ||
            accountIds.has(doc.id) ||
            (!!linkedId && studentIds.has(linkedId)) ||
            (!!parentLinkedId && parentAccountIds.has(parentLinkedId)) ||
            (!!email && (parentEmails.has(email) || emails.has(email))) ||
            (!!accPhoneSuffix && parentPhoneSuffixes.has(accPhoneSuffix)) ||
            (!!accName && parentNames.has(accName))
          );

        if (isStudentAcc || isParentAcc || studentIds.has(doc.id) || parentAccountIds.has(doc.id)) {
          accountRefsToDelete.push(doc.ref);
          accountIds.add(doc.id);
          if (email) emails.add(email);
        }
      });

      // Scoped collections for this student only
      const scopedRefs: FirebaseFirestore.DocumentReference[] = [];
      for (const collectionName of STUDENT_SCOPED_COLLECTIONS) {
        const snap = await adminDb.collection(collectionName).get();
        snap.docs.forEach((doc) => {
          if (studentIds.has(doc.id) || matchesKnownStudent(doc.data(), studentIds, studentNames)) {
            scopedRefs.push(doc.ref);
          }
        });
      }

      // Credentials collection
      const credentialRefs: FirebaseFirestore.DocumentReference[] = [];
      for (const collectionName of ['auth_credentials', 'account_credentials']) {
        const snap = await adminDb.collection(collectionName).get();
        snap.docs.forEach((doc) => {
          const data = doc.data();
          const email = cleanEmail(data.email);
          if (isDoctorAccount(email)) return;
          const accId = String(data.accountId || '').trim();
          const lkStudentId = String(data.linkedStudentId || '').trim();
          const shouldDelete =
            accountIds.has(doc.id) ||
            accountIds.has(accId) ||
            studentIds.has(accId) ||
            studentIds.has(lkStudentId) ||
            (!!email && emails.has(email));

          if (shouldDelete) credentialRefs.push(doc.ref);
        });
      }

      const deletedScoped = await deleteDocs(scopedRefs);
      const deletedAccounts = await deleteDocs(accountRefsToDelete);
      const deletedCredentials = await deleteDocs(credentialRefs);

      // Clean up Firebase Auth users
      try {
        const adminAuth = await getAdminAuth();
        if (adminAuth) {
          const uidsToDelete = new Set<string>();
          accountIds.forEach((id) => uidsToDelete.add(id));
          studentIds.forEach((id) => uidsToDelete.add(id));

          for (const em of emails) {
            if (isDoctorAccount(em)) continue;
            try {
              const u = await adminAuth.getUserByEmail(em);
              if (u?.uid && !isDoctorAccount(u.email)) {
                uidsToDelete.add(u.uid);
              }
            } catch {}
          }

          const uidsArray = Array.from(uidsToDelete);
          for (let index = 0; index < uidsArray.length; index += 500) {
            await adminAuth.deleteUsers(uidsArray.slice(index, index + 500));
          }
        }
      } catch (error) {
        console.warn('[StudentsPurge] Firebase Auth single student cleanup error:', error);
      }

      invalidateSnapshotCache();
      return NextResponse.json({
        ok: true,
        mode: 'single',
        deletedStudentId: targetStudentId,
        deletedAccounts,
        deletedAccountIds: Array.from(accountIds),
        deletedScoped,
        deletedCredentials,
      });
    }

    if (isSingleAccountDelete) {
      // ─────────────────────────────────────────────────────────
      //  MODE 2: DELETE A SPECIFIC ACCOUNT
      // ─────────────────────────────────────────────────────────
      const accountSnap = await adminDb.collection('accounts').get();
      const targetDoc = accountSnap.docs.find((d) => d.id === targetAccountId);
      if (!targetDoc) {
        return NextResponse.json({ ok: false, error: 'الحساب غير موجود.' }, { status: 404 });
      }

      const targetData = targetDoc.data();
      const targetEmail = cleanEmail(targetData.email);
      if (isDoctorAccount(targetEmail, targetData.role)) {
        return NextResponse.json({ ok: false, error: 'لا يمكن حذف حساب الدكتور المسؤول.' }, { status: 400 });
      }

      const accountRefsToDelete = [targetDoc.ref];
      accountIds.add(targetDoc.id);
      if (targetEmail) emails.add(targetEmail);

      const credentialRefs: FirebaseFirestore.DocumentReference[] = [];
      for (const collectionName of ['auth_credentials', 'account_credentials']) {
        const snap = await adminDb.collection(collectionName).get();
        snap.docs.forEach((doc) => {
          const data = doc.data();
          const email = cleanEmail(data.email);
          const accId = String(data.accountId || '').trim();
          if (doc.id === targetAccountId || accId === targetAccountId || (email && email === targetEmail)) {
            credentialRefs.push(doc.ref);
          }
        });
      }

      await deleteDocs(accountRefsToDelete);
      await deleteDocs(credentialRefs);

      try {
        const adminAuth = await getAdminAuth();
        if (adminAuth) {
          try { await adminAuth.deleteUser(targetAccountId); } catch {}
          if (targetEmail) {
            try {
              const u = await adminAuth.getUserByEmail(targetEmail);
              if (u?.uid) await adminAuth.deleteUser(u.uid);
            } catch {}
          }
        }
      } catch (e) {
        console.warn('[StudentsPurge] Auth cleanup for single account error:', e);
      }

      invalidateSnapshotCache();
      return NextResponse.json({ ok: true, mode: 'single-account', deletedAccountId: targetAccountId });
    }

    // ─────────────────────────────────────────────────────────
    //  MODE 3: DELETE ALL STUDENTS & ALL STUDENT/PARENT ACCOUNTS
    // ─────────────────────────────────────────────────────────
    studentsSnap.docs.forEach((doc) => {
      const data = doc.data();
      studentIds.add(doc.id);
      [data.id, data.studentId, data.linkedStudentId, data.studentAccountId].forEach((value) => {
        const id = String(value || '').trim();
        if (id) {
          studentIds.add(id);
          accountIds.add(id);
        }
      });
      [data.parentAccountId, data.linkedParentId].forEach((value) => {
        const id = String(value || '').trim();
        if (id) accountIds.add(id);
      });
      [data.fullName, data.studentName, data.name].forEach((value) => {
        const name = normalizeArabic(value);
        if (name) studentNames.add(name);
      });
      [data.email, data.recoveryEmail, data.linkedStudentEmail, data.parentEmail, data.linkedParentEmail].forEach((value) => {
        const email = cleanEmail(value);
        if (email) emails.add(email);
      });
    });

    const accountSnap = await adminDb.collection('accounts').get();
    const accountRefsToDelete: FirebaseFirestore.DocumentReference[] = [];
    accountSnap.docs.forEach((doc) => {
      const data = doc.data();
      const email = cleanEmail(data.email);
      const role = String(data.role || '').trim();
      if (isDoctorAccount(email, role)) return; // NEVER delete doctor accounts

      const linkedId = String(data.linkedStudentId || data.studentAccountId || '').trim();
      const parentLinkedId = String(data.linkedParentId || data.parentAccountId || '').trim();
      const shouldDelete =
        role === 'student' ||
        role === 'parent' ||
        accountIds.has(doc.id) ||
        studentIds.has(doc.id) ||
        (!!linkedId && studentIds.has(linkedId)) ||
        (!!parentLinkedId && accountIds.has(parentLinkedId)) ||
        (!!email && emails.has(email));

      if (shouldDelete) {
        accountRefsToDelete.push(doc.ref);
        accountIds.add(doc.id);
        if (email) emails.add(email);
      }
    });

    const scopedRefs: FirebaseFirestore.DocumentReference[] = [];
    for (const collectionName of STUDENT_SCOPED_COLLECTIONS) {
      const snap = await adminDb.collection(collectionName).get();
      snap.docs.forEach((doc) => {
        if (collectionName === 'students' || matchesKnownStudent(doc.data(), studentIds, studentNames)) {
          scopedRefs.push(doc.ref);
        }
      });
    }

    const credentialRefs: FirebaseFirestore.DocumentReference[] = [];
    for (const collectionName of ['auth_credentials', 'account_credentials']) {
      const snap = await adminDb.collection(collectionName).get();
      snap.docs.forEach((doc) => {
        const data = doc.data();
        const email = cleanEmail(data.email);
        if (isDoctorAccount(email)) return;
        const accountId = String(data.accountId || '').trim();
        const linkedStudentId = String(data.linkedStudentId || '').trim();
        const shouldDelete =
          accountIds.has(doc.id) ||
          accountIds.has(accountId) ||
          studentIds.has(accountId) ||
          studentIds.has(linkedStudentId) ||
          (!!email && emails.has(email));

        if (shouldDelete) credentialRefs.push(doc.ref);
      });
    }

    const deletedStudents = studentsSnap.size;
    const deletedScoped = await deleteDocs(scopedRefs);
    const deletedAccounts = await deleteDocs(accountRefsToDelete);
    const deletedCredentials = await deleteDocs(credentialRefs);

    try {
      const adminAuth = await getAdminAuth();
      if (adminAuth) {
        const users = await adminAuth.listUsers(1000);
        const uids = users.users
          .filter((user) => {
            const email = cleanEmail(user.email);
            return !isDoctorAccount(email) && (accountIds.has(user.uid) || studentIds.has(user.uid) || (!!email && emails.has(email)));
          })
          .map((user) => user.uid);

        for (let index = 0; index < uids.length; index += 500) {
          await adminAuth.deleteUsers(uids.slice(index, index + 500));
        }
      }
    } catch (error) {
      console.warn('[StudentsPurge] Firebase Auth cleanup skipped:', error);
    }

    invalidateSnapshotCache();
    return NextResponse.json({
      ok: true,
      mode: 'all',
      deletedStudents,
      deletedScoped,
      deletedAccounts,
      deletedCredentials,
      clientCacheToClear: [
        'masar_class_students_v1',
        'masar.students.v1',
        'masar.accounts.v1',
        'masar.reports.v1',
        'masar.surveys.v1',
        'masar.notifications.v1',
        'masar.attendance.v1',
        'masar.ikhlas_posts.v1',
        'masar_student_notes_v1',
        'masar_student_hw_logs_v1',
        'masar_student_cert_logs_v1',
        'masar.cloud_snapshot',
      ],
    });
  } catch (error) {
    console.error('[StudentsPurge] Failed:', error);
    return NextResponse.json({ ok: false, error: 'تعذر حذف الطلاب من السحابة بالكامل.' }, { status: 500 });
  }
}
