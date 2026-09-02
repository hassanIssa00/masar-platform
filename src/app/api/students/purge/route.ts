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
    return NextResponse.json({ ok: false, error: 'حذف جميع الطلاب متاح لحساب الدكتور فقط.' }, { status: 401 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: 'لم يتم ضبط Firebase Admin على السيرفر.' }, { status: 503 });
  }

  try {
    const studentsSnap = await adminDb.collection('students').get();
    const studentIds = new Set<string>();
    const studentNames = new Set<string>();
    const accountIds = new Set<string>();
    const emails = new Set<string>();

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

      if (shouldDelete && email !== 'dr.ismail@masar.com' && role !== 'doctor') {
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
        const accountId = String(data.accountId || '').trim();
        const linkedStudentId = String(data.linkedStudentId || '').trim();
        const shouldDelete =
          accountIds.has(doc.id) ||
          accountIds.has(accountId) ||
          studentIds.has(accountId) ||
          studentIds.has(linkedStudentId) ||
          (!!email && emails.has(email));

        if (shouldDelete && email !== 'dr.ismail@masar.com') credentialRefs.push(doc.ref);
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
            return email !== 'dr.ismail@masar.com' && (accountIds.has(user.uid) || studentIds.has(user.uid) || (!!email && emails.has(email)));
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
      deletedStudents,
      deletedScoped,
      deletedAccounts,
      deletedCredentials,
      // Tell the client which localStorage keys to wipe immediately
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
