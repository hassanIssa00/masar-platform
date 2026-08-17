import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { requireRole } from '@/lib/auth/authorization';

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

  await Promise.all([
    setDoc(doc(db, 'accounts', studentAccount.id), studentAccount),
    setDoc(doc(db, 'accounts', parentAccount.id), parentAccount),
    setDoc(doc(db, 'account_credentials', studentAccount.id), {
      accountId: studentAccount.id,
      email: studentEmail,
      passwordHash: studentPasswordHash,
      createdAt: now,
      createdBy: auth.user?.id,
    }),
    setDoc(doc(db, 'account_credentials', parentAccount.id), {
      accountId: parentAccount.id,
      email: parentEmail,
      passwordHash: parentPasswordHash,
      createdAt: now,
      createdBy: auth.user?.id,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    studentAccount,
    parentAccount,
    studentPassword,
    parentPassword,
  });
}
