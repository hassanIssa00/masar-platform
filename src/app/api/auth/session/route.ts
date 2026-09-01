import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, verifySessionToken } from '@/lib/auth/session.server';
import { getAdminDb } from '@/lib/firebaseAdmin.server';

export const runtime = 'nodejs';

function cleanEmail(value?: unknown) {
  return String(value || '').trim().toLowerCase();
}

function cleanDigits(value?: unknown) {
  return String(value || '').replace(/\D/g, '');
}

function isPlaceholderName(value?: unknown) {
  const name = String(value || '').trim();
  return !name || name.includes('جديد') || name === 'ولي الأمر' || name === 'ولي امر' || name === 'طالب';
}

function hasCompletedStudentProfile(student?: Record<string, unknown> | null) {
  if (!student) return false;
  const fullName = String(student.fullName || student.name || '').trim();
  const grade = String(student.grade || '').trim();
  return !isPlaceholderName(fullName) && Boolean(grade);
}

async function hasReportType(adminDb: NonNullable<ReturnType<typeof getAdminDb>>, student: Record<string, unknown>, types: string[]) {
  const studentId = String(student.id || '').trim();
  const studentName = String(student.fullName || student.name || '').trim();
  const reportsSnap = await adminDb.collection('reports').limit(800).get().catch(() => null);
  if (!reportsSnap) return false;
  return reportsSnap.docs.some((doc) => {
    const data = doc.data();
    return types.includes(String(data.type || '')) && ((studentId && data.studentId === studentId) || (studentName && data.studentName === studentName));
  });
}

async function hasParentSurvey(adminDb: NonNullable<ReturnType<typeof getAdminDb>>, student: Record<string, unknown>, parentEmail?: string, parentPhone?: string) {
  const studentId = String(student.id || '').trim();
  const studentName = String(student.fullName || student.name || '').trim();
  const email = cleanEmail(parentEmail || student.parentEmail || student.linkedParentEmail);
  const phoneSuffix = cleanDigits(parentPhone || student.parentPhone || student.phone).slice(-8);
  const surveySnap = await adminDb.collection('surveys').limit(800).get().catch(() => null);
  const hasSurvey = surveySnap?.docs.some((doc) => {
    const data = doc.data();
    const docPhone = cleanDigits(data.parentPhone || data.phone).slice(-8);
    return (
      (studentId && data.studentId === studentId) ||
      (studentName && data.studentName === studentName) ||
      (email && cleanEmail(data.parentEmail) === email) ||
      (phoneSuffix && docPhone === phoneSuffix)
    );
  });
  if (hasSurvey) return true;
  return hasReportType(adminDb, student, ['survey-answers', 'clinical-analysis']);
}

async function getOnboardingRequired(
  adminDb: NonNullable<ReturnType<typeof getAdminDb>>,
  role: string,
  student: Record<string, unknown> | undefined,
  account: { email?: string; phone?: string; onboardingRequired?: boolean },
) {
  if (role !== 'parent' && role !== 'student') return false;
  if (!student) return true;
  if (!hasCompletedStudentProfile(student)) return true;
  if (role === 'parent') return !(await hasParentSurvey(adminDb, student, account.email, account.phone));
  return !(await hasReportType(adminDb, student, ['student-assessment-answers', 'student-assessment-analysis', 'placement']));
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const account = token ? await verifySessionToken(token) : null;

  if (!account) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let linkedStudentId = account.linkedStudentId;
  let linkedStudentEmail = account.linkedStudentEmail;
  let linkedStudentName = account.linkedStudentName;
  let linkedParentId = account.linkedParentId;
  let linkedParentEmail = account.linkedParentEmail;
  let phone = account.phone;
  let photoUrl = account.photoUrl;
  let onboardingRequired = account.onboardingRequired;

  try {
    const adminDb = getAdminDb();
    if (adminDb && (account.role === 'parent' || account.role === 'student')) {
      const accDoc = await adminDb.collection('accounts').doc(account.id).get();
      const accData = accDoc.exists ? (accDoc.data() as any) : {};
      linkedStudentId = linkedStudentId || accData.linkedStudentId;
      linkedStudentEmail = linkedStudentEmail || accData.linkedStudentEmail;
      linkedStudentName = linkedStudentName || accData.linkedStudentName;
      linkedParentId = linkedParentId || accData.linkedParentId;
      linkedParentEmail = linkedParentEmail || accData.linkedParentEmail;
      phone = phone || accData.phone;
      photoUrl = photoUrl || accData.photoUrl;
      onboardingRequired = onboardingRequired ?? accData.onboardingRequired;

      const email = cleanEmail(account.email);
      const explicitStudentEmail = cleanEmail(linkedStudentEmail);
      const explicitParentEmail = cleanEmail(linkedParentEmail);
      const phoneSuffix = cleanDigits(phone).slice(-8);
      const studentSnap = await adminDb.collection('students').limit(800).get().catch(() => null);
      const matched = studentSnap?.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as any) }))
        .find((st) => {
          if (st.id === linkedStudentId || st.studentAccountId === account.id || st.parentAccountId === account.id || st.linkedParentId === account.id) return true;
          if (explicitStudentEmail && [st.email, st.recoveryEmail, st.linkedStudentEmail].map(cleanEmail).includes(explicitStudentEmail)) return true;
          if (explicitParentEmail && [st.parentEmail, st.linkedParentEmail].map(cleanEmail).includes(explicitParentEmail)) return true;
          if (account.role === 'student' && email && [st.email, st.recoveryEmail, st.linkedStudentEmail].map(cleanEmail).includes(email)) return true;
          if (account.role === 'parent' && email && [st.parentEmail, st.linkedParentEmail].map(cleanEmail).includes(email)) return true;
          const stPhone = cleanDigits(st.parentPhone || st.phone || st.whatsapp);
          return !!phoneSuffix && stPhone.length >= 8 && stPhone.slice(-8) === phoneSuffix;
        });

      if (matched) {
        linkedStudentId = linkedStudentId || matched.id;
        linkedStudentEmail = linkedStudentEmail || matched.linkedStudentEmail || matched.email;
        linkedStudentName = linkedStudentName || matched.fullName || matched.name;
        linkedParentId = linkedParentId || matched.linkedParentId || matched.parentAccountId || (account.role === 'parent' ? account.id : undefined);
        linkedParentEmail = linkedParentEmail || matched.linkedParentEmail || matched.parentEmail || (account.role === 'parent' ? account.email : undefined);
        phone = phone || matched.parentPhone || matched.phone;
        photoUrl = photoUrl || matched.photoUrl;
        onboardingRequired = await getOnboardingRequired(adminDb, account.role, matched, {
          email: account.email,
          phone,
          onboardingRequired,
        });

        await adminDb.collection('accounts').doc(account.id).set(
          {
            linkedStudentId,
            ...(linkedStudentEmail ? { linkedStudentEmail } : {}),
            ...(linkedStudentName ? { linkedStudentName } : {}),
            ...(linkedParentId ? { linkedParentId } : {}),
            ...(linkedParentEmail ? { linkedParentEmail } : {}),
            onboardingRequired,
          },
          { merge: true },
        ).catch(() => {});
      } else {
        onboardingRequired = true;
      }
    }
  } catch {}

  return NextResponse.json({
    ok: true,
    account: {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      schoolBranch: account.schoolBranch,
      phone,
      photoUrl,
      onboardingRequired,
      linkedStudentId,
      linkedStudentEmail,
      linkedStudentName,
      linkedParentId,
      linkedParentEmail,
    },
  });
}
