import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { requireRole } from '@/lib/auth/authorization';
import { getAdminDb } from '@/lib/firebaseAdmin.server';

type Branch = 'MASAR' | 'IKHLAS_JEDDAH';

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function createTempPassword(prefix: string) {
  const partA = crypto.randomUUID().slice(0, 4).toUpperCase();
  const partB = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${partA}-${partB}`;
}

function createPlatformEmail(kind: 'student' | 'parent', branch: Branch) {
  const branchSlug = branch === 'MASAR' ? 'masar' : 'ikhlas';
  const token = crypto.randomUUID().slice(0, 8);
  return `${kind}.${branchSlug}.${token}@masarplatform.org`;
}

function credentialLookupId(value: string) {
  return `lookup_${value.trim().toLowerCase().replace(/[^a-z0-9._+-]+/g, '_').slice(0, 140)}`;
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, ['doctor', 'specialist', 'teacher']);
  if (!auth.authorized) {
    return NextResponse.json({ ok: false, error: 'غير مصرح بتوليد الحسابات.' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const branch: Branch = body.branch === 'IKHLAS_JEDDAH' ? 'IKHLAS_JEDDAH' : 'MASAR';
  const grade = typeof body.grade === 'string' && body.grade.trim() ? body.grade.trim() : 'غير محدد';

  const studentEmail = createPlatformEmail('student', branch);
  const parentEmail = createPlatformEmail('parent', branch);
  const studentPassword = createTempPassword('STU');
  const parentPassword = createTempPassword('PAR');
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
    createdAt: now,
  };

  const [studentPasswordHash, parentPasswordHash] = await Promise.all([
    bcrypt.hash(studentPassword, 10),
    bcrypt.hash(parentPassword, 10),
  ]);

  const studentCredential = {
      accountId: studentAccount.id,
      email: studentEmail,
      passwordHash: studentPasswordHash,
      createdAt: now,
      createdBy: auth.user?.id,
  };
  const parentCredential = {
      accountId: parentAccount.id,
      email: parentEmail,
      passwordHash: parentPasswordHash,
      createdAt: now,
      createdBy: auth.user?.id,
  };

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Firebase Admin غير مفعل على السيرفر. أضف FIREBASE_SERVICE_ACCOUNT_KEY أو FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY/FIREBASE_PROJECT_ID في Vercel ثم أعد النشر.',
      },
      { status: 500 },
    );
  }

  await Promise.all([
    adminDb.collection('accounts').doc(studentAccount.id).set(studentAccount, { merge: true }),
    adminDb.collection('accounts').doc(parentAccount.id).set(parentAccount, { merge: true }),
    adminDb.collection('account_credentials').doc(studentAccount.id).set(studentCredential, { merge: true }),
    adminDb.collection('account_credentials').doc(parentAccount.id).set(parentCredential, { merge: true }),
    adminDb.collection('account_credentials').doc(credentialLookupId(studentEmail)).set(studentCredential, { merge: true }),
    adminDb.collection('account_credentials').doc(credentialLookupId(parentEmail)).set(parentCredential, { merge: true }),
  ]);

  return NextResponse.json({
    ok: true,
    studentAccount,
    parentAccount,
    studentPassword,
    parentPassword,
  });
}
