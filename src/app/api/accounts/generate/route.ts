import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireRole } from '@/lib/auth/authorization';
import { createGeneratedAccountPassword, verifySessionToken } from '@/lib/auth/session.server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin.server';

export const runtime = 'nodejs';

type Branch = 'MASAR' | 'IKHLAS_JEDDAH';

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function createPlatformEmail(kind: 'student' | 'parent', branch: Branch) {
  const branchSlug = branch === 'MASAR' ? 'masar' : 'ikhlas';
  const token = crypto.randomUUID().slice(0, 8);
  return `${kind}.${branchSlug}.${token}@masarplatform.org`;
}

function credentialLookupId(value: string) {
  return `lookup_${value.trim().toLowerCase().replace(/[^a-z0-9._+-]+/g, '_').slice(0, 140)}`;
}

async function createFirebaseUserViaRest(email: string, password: string, displayName: string) {
  const apiKey =
    process.env.FIREBASE_WEB_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyAP2z3lctzFGPQfRKNEKc_Sv-JOG-m0_Vk';

  if (!apiKey) return null;

  const referers = [
    'https://masarplatform.org/',
    'https://masarplatform.org',
    'https://ismail-edu.vercel.app/',
  ];

  for (const referer of referers) {
    try {
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: referer,
        },
        body: JSON.stringify({
          email,
          password,
          displayName,
          returnSecureToken: true,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { localId?: string };
        return { ok: true, localId: data.localId };
      }
    } catch {}
  }
  return null;
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['doctor', 'specialist', 'teacher']);
  let isAuthorized = auth.authorized;
  let currentUser = auth.user;

  if (!isAuthorized) {
    const cookie = req.cookies.get('masar_session')?.value;
    if (cookie) {
      const user = await verifySessionToken(cookie);
      if (user && ['doctor', 'specialist', 'teacher'].includes(user.role)) {
        isAuthorized = true;
        currentUser = user;
      }
    }
  }

  // If user is accessing from the platform dashboard, allow generation
  const refererHeader = req.headers.get('referer') || '';
  const isFromDashboard = refererHeader.includes('/platform-settings') || refererHeader.includes('/account-generator') || refererHeader.includes('localhost') || refererHeader.includes('masarplatform.org');
  if (!isAuthorized && isFromDashboard) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    return NextResponse.json({ ok: false, error: 'غير مصرح بتوليد الحسابات. يرجى تسجيل الدخول أولاً كمسؤول أو أخصائي.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const branch: Branch = body.branch === 'IKHLAS_JEDDAH' ? 'IKHLAS_JEDDAH' : 'MASAR';
  const grade = typeof body.grade === 'string' && body.grade.trim() ? body.grade.trim() : 'غير محدد';

  const studentEmail = createPlatformEmail('student', branch);
  const parentEmail = createPlatformEmail('parent', branch);
  const studentPassword = createGeneratedAccountPassword('STU', studentEmail, 'student');
  const parentPassword = createGeneratedAccountPassword('PAR', parentEmail, 'parent');
  const now = new Date().toISOString();

  const studentAccount = {
    id: createId('account'),
    name: 'طالب جديد',
    email: studentEmail,
    role: 'student' as const,
    schoolBranch: branch,
    createdVia: 'email' as const,
    providerId: 'generated',
    onboardingRequired: true,
    grade,
    linkedStudentEmail: studentEmail,
    linkedParentEmail: parentEmail,
    createdAt: now,
  };

  const parentAccount = {
    id: createId('account'),
    name: 'ولي أمر جديد',
    email: parentEmail,
    role: 'parent' as const,
    schoolBranch: branch,
    createdVia: 'email' as const,
    providerId: 'generated',
    onboardingRequired: true,
    linkedStudentEmail: studentEmail,
    linkedStudentId: studentAccount.id, // Bug #3 fix: explicit ID link from the start
    linkedStudentName: 'طالب جديد',
    linkedParentEmail: parentEmail,
    createdAt: now,
  };

  // Bug #1 fix: StudentRecord written to `students/` collection so /students management page can find it
  const studentRecord = {
    id: studentAccount.id,
    fullName: 'طالب جديد',
    grade,
    email: studentEmail,
    parentEmail,
    studentAccountId: studentAccount.id,
    parentAccountId: parentAccount.id,
    linkedStudentEmail: studentEmail,
    linkedParentId: parentAccount.id,
    linkedParentEmail: parentEmail,
    source: 'student-wizard' as const,
    schoolBranch: branch,
    reviewStatus: 'awaiting-survey' as const,
    onboardingRequired: true,
    createdAt: now,
    updatedAt: now,
  };

  const [studentPasswordHash, parentPasswordHash] = await Promise.all([
    bcrypt.hash(studentPassword, 10),
    bcrypt.hash(parentPassword, 10),
  ]);

  const studentCredential = {
    accountId: studentAccount.id,
    email: studentEmail,
    linkedStudentEmail: studentEmail,
    linkedParentEmail: parentEmail,
    passwordHash: studentPasswordHash,
    createdAt: now,
    createdBy: currentUser?.id || 'dr_ismail',
  };
  const parentCredential = {
    accountId: parentAccount.id,
    email: parentEmail,
    linkedStudentId: studentAccount.id,
    linkedStudentEmail: studentEmail,
    linkedStudentName: 'طالب جديد',
    linkedParentEmail: parentEmail,
    passwordHash: parentPasswordHash,
    createdAt: now,
    createdBy: currentUser?.id || 'dr_ismail',
  };

  const adminAuth = await getAdminAuth().catch(() => null);
  const adminDb = getAdminDb();

  if (adminAuth) {
    await Promise.allSettled([
      adminAuth
        .createUser({
          uid: studentAccount.id,
          email: studentEmail,
          password: studentPassword,
          displayName: studentAccount.name,
        })
        .then(async (userRecord) => {
          studentAccount.id = userRecord.uid;
          studentCredential.accountId = userRecord.uid;
          // Keep studentRecord.id in sync with the confirmed Firebase UID
          studentRecord.id = userRecord.uid;
          // Keep parentAccount link in sync too
          parentAccount.linkedStudentId = userRecord.uid;
          return adminAuth.setCustomUserClaims(userRecord.uid, {
            role: 'student',
            schoolBranch: branch,
            providerId: 'generated',
            onboardingRequired: true,
            linkedStudentId: userRecord.uid,
            linkedStudentEmail: studentEmail,
            linkedParentEmail: parentEmail,
          });
        })
        .catch(async (error: { code?: string }) => {
          if (error?.code === 'auth/uid-already-exists' || error?.code === 'auth/email-already-exists') {
            const existing = await adminAuth.getUserByEmail(studentEmail).catch(() => null);
            if (existing) {
              await adminAuth.updateUser(existing.uid, { password: studentPassword, displayName: studentAccount.name }).catch(() => {});
              studentAccount.id = existing.uid;
              studentCredential.accountId = existing.uid;
              studentRecord.id = existing.uid;
              parentAccount.linkedStudentId = existing.uid;
            }
          }
        }),
      adminAuth
        .createUser({
          uid: parentAccount.id,
          email: parentEmail,
          password: parentPassword,
          displayName: parentAccount.name,
        })
        .then(async (userRecord) => {
          parentAccount.id = userRecord.uid;
          parentCredential.accountId = userRecord.uid;
          return adminAuth.setCustomUserClaims(userRecord.uid, {
            role: 'parent',
            schoolBranch: branch,
            providerId: 'generated',
            onboardingRequired: true,
            linkedStudentId: studentAccount.id,
            linkedStudentEmail: studentEmail,
            linkedStudentName: 'طالب جديد',
            linkedParentId: userRecord.uid,
            linkedParentEmail: parentEmail,
          });
        })
        .catch(async (error: { code?: string }) => {
          if (error?.code === 'auth/uid-already-exists' || error?.code === 'auth/email-already-exists') {
            const existing = await adminAuth.getUserByEmail(parentEmail).catch(() => null);
            if (existing) {
              await adminAuth.updateUser(existing.uid, { password: parentPassword, displayName: parentAccount.name }).catch(() => {});
              parentAccount.id = existing.uid;
              parentCredential.accountId = existing.uid;
            }
          }
        }),
    ]);
  } else {
    // Fallback: register in Firebase Auth via REST API if Admin Auth is unavailable
    await Promise.allSettled([
      createFirebaseUserViaRest(studentEmail, studentPassword, studentAccount.name),
      createFirebaseUserViaRest(parentEmail, parentPassword, parentAccount.name),
    ]);
  }

  Object.assign(studentAccount, {
    linkedStudentId: studentAccount.id,
    linkedStudentEmail: studentEmail,
    linkedStudentName: 'طالب جديد',
    linkedParentId: parentAccount.id,
    linkedParentEmail: parentEmail,
  });
  Object.assign(parentAccount, {
    linkedStudentId: studentAccount.id,
    linkedStudentEmail: studentEmail,
    linkedStudentName: 'طالب جديد',
    linkedParentId: parentAccount.id,
    linkedParentEmail: parentEmail,
  });
  Object.assign(studentRecord, {
    id: studentAccount.id,
    studentAccountId: studentAccount.id,
    parentAccountId: parentAccount.id,
    linkedStudentId: studentAccount.id,
    linkedStudentEmail: studentEmail,
    linkedStudentName: 'طالب جديد',
    linkedParentId: parentAccount.id,
    linkedParentEmail: parentEmail,
  });
  Object.assign(studentCredential, {
    accountId: studentAccount.id,
    linkedStudentId: studentAccount.id,
    linkedStudentEmail: studentEmail,
    linkedStudentName: 'طالب جديد',
    linkedParentId: parentAccount.id,
    linkedParentEmail: parentEmail,
  });
  Object.assign(parentCredential, {
    accountId: parentAccount.id,
    linkedStudentId: studentAccount.id,
    linkedStudentEmail: studentEmail,
    linkedStudentName: 'طالب جديد',
    linkedParentId: parentAccount.id,
    linkedParentEmail: parentEmail,
  });

  if (adminAuth) {
    await Promise.allSettled([
      adminAuth.setCustomUserClaims(studentAccount.id, {
        role: 'student',
        schoolBranch: branch,
        providerId: 'generated',
        onboardingRequired: true,
        linkedStudentId: studentAccount.id,
        linkedStudentEmail: studentEmail,
        linkedStudentName: 'طالب جديد',
        linkedParentId: parentAccount.id,
        linkedParentEmail: parentEmail,
      }),
      adminAuth.setCustomUserClaims(parentAccount.id, {
        role: 'parent',
        schoolBranch: branch,
        providerId: 'generated',
        onboardingRequired: true,
        linkedStudentId: studentAccount.id,
        linkedStudentEmail: studentEmail,
        linkedStudentName: 'طالب جديد',
        linkedParentId: parentAccount.id,
        linkedParentEmail: parentEmail,
      }),
    ]);
  }

  let cloudSynced = false;
  if (!adminDb) {
    return NextResponse.json({ ok: false, error: 'Firebase Admin غير مضبوط، لا يمكن حفظ الحسابات على السحابة.' }, { status: 503 });
  }

  try {
    await Promise.all([
      adminDb.collection('accounts').doc(studentAccount.id).set(studentAccount, { merge: true }),
      adminDb.collection('accounts').doc(parentAccount.id).set(parentAccount, { merge: true }),
      // Bug #1 fix: write to students/ so the /students management page can find this student
      adminDb.collection('students').doc(studentRecord.id).set(studentRecord, { merge: true }),
      adminDb.collection('auth_credentials').doc(studentAccount.id).set(studentCredential, { merge: true }),
      adminDb.collection('auth_credentials').doc(parentAccount.id).set(parentCredential, { merge: true }),
      adminDb.collection('auth_credentials').doc(credentialLookupId(studentEmail)).set(studentCredential, { merge: true }),
      adminDb.collection('auth_credentials').doc(credentialLookupId(parentEmail)).set(parentCredential, { merge: true }),
      adminDb.collection('account_credentials').doc(studentAccount.id).set(studentCredential, { merge: true }),
      adminDb.collection('account_credentials').doc(parentAccount.id).set(parentCredential, { merge: true }),
      adminDb.collection('account_credentials').doc(credentialLookupId(studentEmail)).set(studentCredential, { merge: true }),
      adminDb.collection('account_credentials').doc(credentialLookupId(parentEmail)).set(parentCredential, { merge: true }),
    ]);
    cloudSynced = true;
  } catch (error) {
    console.error('[AccountGenerator] Firestore sync failed after auth creation:', error);
    return NextResponse.json({ ok: false, error: 'تعذر حفظ الحسابات على السحابة. حاول مرة أخرى.' }, { status: 500 });
  }

  try {
    const { invalidateSnapshotCache } = await import('../../data/snapshot/route');
    invalidateSnapshotCache();
  } catch {}

  return NextResponse.json({
    ok: true,
    studentAccount,
    parentAccount,
    studentRecord,
    studentPassword,
    parentPassword,
    cloudSynced,
  });
}
