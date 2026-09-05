import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin.server';
import { createSessionToken, normalizePasswordInput, SESSION_COOKIE_NAME } from '@/lib/auth/session.server';
import type { UserRole } from '@/lib/cloudStore';

export const runtime = 'nodejs';

const ROLES = new Set<UserRole>(['parent', 'student', 'teacher']);

function cleanEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function cleanRole(value: unknown): UserRole {
  return ROLES.has(value as UserRole) ? (value as UserRole) : 'parent';
}

function cleanBranch(value: unknown): 'MASAR' | 'IKHLAS_JEDDAH' {
  return value === 'IKHLAS_JEDDAH' || value === 'MASAR' ? value : 'MASAR';
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
    process.env.NEXT_PUBLIC_SITE_URL || 'https://masarplatform.org/',
    'https://masarplatform.org',
    'https://ismail-edu.vercel.app/',
    '',
  ];

  for (const referer of referers) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (referer) headers.Referer = referer;

      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          password,
          displayName,
          returnSecureToken: true,
        }),
      });

      if (!response.ok) {
        const errData = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
        if (errData?.error?.message === 'EMAIL_EXISTS') {
          return { ok: false, error: 'EMAIL_EXISTS' as const };
        }
        continue;
      }

      const data = (await response.json()) as { localId?: string };
      return { ok: true, localId: data.localId };
    } catch {
      continue;
    }
  }

  return null;
}

function normalizeArabic(text?: string | null): string {
  if (!text) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/^(أ\.|د\.|أستاذ|استاذ|دكتور|دكتوره|الدكتور|الدكتورة|السيد|السيدة|الشيخ|والد الطالب|والد|والدة|أم|ام|أبو|ابو|ولي أمر|ولي امر)\s+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanDigits(phone?: string | null): string {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  const adminDb = getAdminDb();
  let adminAuth = null;
  try {
    adminAuth = await getAdminAuth();
  } catch {}

  if (!adminDb) {
    return NextResponse.json({ ok: false, error: 'Firebase Admin غير مضبوط، لا يمكن إنشاء حساب سحابي الآن.' }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const email = cleanEmail(body.email);
  const password = String(body.password || '');
  const role = cleanRole(body.role);
  const schoolBranch = cleanBranch(body.schoolBranch);
  const name = String(body.name || '').trim() || (role === 'parent' ? 'ولي أمر جديد' : 'طالب جديد');
  const phone = String(body.phone || '').trim();
  const childName = String(body.childName || '').trim();
  const detectedStudentId = String(body.detectedStudentId || '').trim();
  const grade = String(body.grade || '').trim();

  if (!email || !email.includes('@') || password.trim().length < 6) {
    return NextResponse.json({ ok: false, error: 'بيانات التسجيل غير مكتملة أو كلمة المرور قصيرة.' }, { status: 400 });
  }

  if (adminAuth) {
    const existingAuthUser = await adminAuth.getUserByEmail(email).catch(() => null);
    if (existingAuthUser) {
      return NextResponse.json({ ok: false, error: 'هذا البريد مسجل بالفعل. استخدم تسجيل الدخول أو استعادة كلمة المرور.' }, { status: 409 });
    }
  }

  if (adminDb) {
    try {
      const existing = await adminDb.collection('accounts').where('email', '==', email).limit(1).get();
      if (!existing.empty) {
        return NextResponse.json({ ok: false, error: 'هذا البريد مسجل بالفعل. استخدم تسجيل الدخول بدلاً من ذلك.' }, { status: 409 });
      }
    } catch {}
  }

  const now = new Date().toISOString();
  const accountId = `account_${crypto.randomUUID()}`;
  let linkedStudentId: string | undefined = undefined;
  let linkedStudentEmail: string | undefined = undefined;
  let linkedStudentName: string | undefined = undefined;
  let linkedParentId: string | undefined = role === 'parent' ? accountId : undefined;
  let linkedParentEmail: string | undefined = role === 'parent' ? email : undefined;
  let pendingStudentWrite: { docId: string; data: Record<string, unknown> } | null = null;

  // ── Server-side Student Matching and Linking ──
  try {
      const pPhone = cleanDigits(phone);
      const pPhoneSuffix = pPhone.length >= 8 ? pPhone.slice(-8) : '';
      const pEmail = email.trim().toLowerCase();
      const normParentName = normalizeArabic(name);
      const normChildName = normalizeArabic(childName);

      const [studentsSnap, classStudentsSnap] = await Promise.all([
        adminDb.collection('students').limit(300).get().catch(() => ({ docs: [] })),
        adminDb.collection('class_students').limit(300).get().catch(() => ({ docs: [] })),
      ]);
      const allExistingStudents: any[] = [
        ...studentsSnap.docs.map((d: any) => ({ id: d.id, ...d.data(), _col: 'students' })),
        ...classStudentsSnap.docs.map((d: any) => ({ id: d.id, ...d.data(), _col: 'class_students' })),
      ];
      const sameBranch = (st: any) => !st.schoolBranch || !schoolBranch || st.schoolBranch === schoolBranch || st.branch === schoolBranch;

      if (role === 'parent') {
        let matchedStudent = allExistingStudents.find((st) => {
          // 0. Explicit detectedStudentId from client matching
          if (detectedStudentId && (st.id === detectedStudentId || st.studentAccountId === detectedStudentId || st.accountId === detectedStudentId)) {
            return true;
          }
          if (!sameBranch(st)) return false;
          const sPhone = cleanDigits(st.parentPhone || st.phone);
          const sPhoneSuffix = sPhone.length >= 8 ? sPhone.slice(-8) : '';
          const parentEmails = [st.parentEmail, st.linkedParentEmail].map(cleanEmail);
          const studentEmails = [st.email, st.recoveryEmail, st.linkedStudentEmail].map(cleanEmail);
          const sFullNameNorm = normalizeArabic(st.fullName);
          const sParentNameNorm = normalizeArabic(st.parentName);

          // 1. Phone match (last 8 digits)
          if (pPhoneSuffix && sPhoneSuffix && (sPhoneSuffix === pPhoneSuffix || sPhone.includes(pPhoneSuffix) || pPhone.includes(sPhoneSuffix))) {
            return true;
          }
          // 2. Email match
          if (pEmail && parentEmails.includes(pEmail)) {
            return true;
          }
          if (pEmail && !pEmail.includes('generated') && studentEmails.includes(pEmail)) {
            return true;
          }
          // 3. Child name match
          if (normChildName && normChildName.length > 2 && !normChildName.includes('جديد') && (sFullNameNorm === normChildName || sFullNameNorm.includes(normChildName) || normChildName.includes(sFullNameNorm))) {
            return true;
          }
          // 4. Patronymic match (child full name contains parent name or father part matches)
          if (normParentName && normParentName.length > 3 && !normParentName.includes('جديد') && !normParentName.includes('ولي')) {
            if (sParentNameNorm === normParentName) return true;
            if (sFullNameNorm.includes(normParentName)) return true;
          }
          return false;
        });

        // 5. Fallback: If only 1 real student in branch or class roster, link to that student automatically
        if (!matchedStudent) {
          const realBranchStudents = allExistingStudents.filter((st) => sameBranch(st) && st.fullName && !st.fullName.includes('جديد') && !st.fullName.includes('الاستبيان'));
          if (realBranchStudents.length === 1) {
            matchedStudent = realBranchStudents[0];
          }
        }

        if (matchedStudent) {
          linkedStudentId = matchedStudent.id;
          linkedStudentEmail = matchedStudent.linkedStudentEmail || matchedStudent.email;
          linkedStudentName = matchedStudent.fullName || matchedStudent.name || childName;
          linkedParentId = accountId;
          linkedParentEmail = email;
          pendingStudentWrite = {
            docId: matchedStudent.id,
            data: {
              parentName: name && !name.includes('جديد') ? name : (matchedStudent.parentName || name),
              parentPhone: phone || matchedStudent.parentPhone,
              parentEmail: email || matchedStudent.parentEmail,
              parentAccountId: accountId,
              linkedParentId: accountId,
              linkedParentEmail: email,
              ...(linkedStudentEmail ? { linkedStudentEmail } : {}),
              ...(linkedStudentName ? { linkedStudentName } : {}),
              schoolBranch: schoolBranch || matchedStudent.schoolBranch || 'MASAR',
              updatedAt: now,
            },
          };
        } else if (childName && !childName.includes('جديد') && childName.length > 2) {
          // Create new student record for the parent's child only if real child name was entered
          const newStudentId = `student_${crypto.randomUUID()}`;
          const newStudentRecord = {
            id: newStudentId,
            fullName: childName,
            grade: grade || (schoolBranch === 'IKHLAS_JEDDAH' ? 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى' : 'الصف الأول الابتدائي'),
            parentName: name,
            parentPhone: phone,
            parentEmail: email,
            parentAccountId: accountId,
            linkedParentId: accountId,
            linkedParentEmail: email,
            schoolBranch,
            source: schoolBranch === 'IKHLAS_JEDDAH' ? 'ikhlas-jeddah' : 'student-wizard',
            reviewStatus: 'awaiting-survey',
            createdAt: now,
            updatedAt: now,
          };
          pendingStudentWrite = { docId: newStudentId, data: newStudentRecord };
          linkedStudentId = newStudentId;
          linkedStudentName = childName;
        }
      } else if (role === 'student') {
        const normStudentName = normalizeArabic(name);
        let matchedStudent = allExistingStudents.find((st) => {
          if (!sameBranch(st)) return false;
          const sPhone = cleanDigits(st.parentPhone || st.phone);
          const sPhoneSuffix = sPhone.length >= 8 ? sPhone.slice(-8) : '';
          const studentEmails = [st.email, st.recoveryEmail, st.linkedStudentEmail].map(cleanEmail);
          const sFullNameNorm = normalizeArabic(st.fullName);

          if (pEmail && studentEmails.includes(pEmail)) return true;
          if (normStudentName && normStudentName.length > 2 && !normStudentName.includes('جديد') && sFullNameNorm === normStudentName) {
            return true;
          }
          if (pPhoneSuffix && sPhoneSuffix && sPhoneSuffix === pPhoneSuffix) return true;
          return false;
        });

        if (matchedStudent) {
          linkedStudentId = matchedStudent.id;
          linkedStudentEmail = email;
          linkedStudentName = name;
          linkedParentId = matchedStudent.linkedParentId || matchedStudent.parentAccountId;
          linkedParentEmail = matchedStudent.linkedParentEmail || matchedStudent.parentEmail;
          pendingStudentWrite = {
            docId: matchedStudent.id,
            data: {
              fullName: name && !name.includes('جديد') ? name : matchedStudent.fullName,
              email,
              studentAccountId: accountId,
              linkedStudentId: matchedStudent.id,
              linkedStudentEmail: email,
              linkedStudentName: name && !name.includes('جديد') ? name : matchedStudent.fullName,
              schoolBranch: schoolBranch || matchedStudent.schoolBranch || 'MASAR',
              updatedAt: now,
            },
          };
        } else {
          // Create student record with ID matching the student account
          const newStudentRecord = {
            id: accountId,
            fullName: name,
            grade: grade || (schoolBranch === 'IKHLAS_JEDDAH' ? 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى' : 'الصف الأول الابتدائي'),
            email,
            studentAccountId: accountId,
            linkedStudentId: accountId,
            linkedStudentEmail: email,
            linkedStudentName: name,
            parentPhone: phone,
            schoolBranch,
            source: schoolBranch === 'IKHLAS_JEDDAH' ? 'ikhlas-jeddah' : 'student-wizard',
            reviewStatus: 'awaiting-doctor-review',
            createdAt: now,
            updatedAt: now,
          };
          pendingStudentWrite = { docId: accountId, data: newStudentRecord };
          linkedStudentId = accountId;
          linkedStudentEmail = email;
          linkedStudentName = name;
        }
      }
    } catch (err) {
      console.error('[AuthRegister] Student linking lookup error:', err);
      return NextResponse.json({ ok: false, error: 'تعذر ربط ملف الطالب على السحابة. حاول مرة أخرى.' }, { status: 500 });
  }

  const account = {
    id: accountId,
    name,
    email,
    phone,
    role,
    schoolBranch,
    createdVia: 'email' as const,
    providerId: 'password',
    createdAt: now,
    lastLoginAt: now,
    onboardingRequired: role === 'parent' || role === 'student',
    ...(linkedStudentId ? { linkedStudentId } : {}),
    ...(linkedStudentEmail ? { linkedStudentEmail } : {}),
    ...(linkedStudentName ? { linkedStudentName } : {}),
    ...(linkedParentId ? { linkedParentId } : {}),
    ...(linkedParentEmail ? { linkedParentEmail } : {}),
  };
  const passwordHash = await bcrypt.hash(normalizePasswordInput(password), 12);
  const credential = {
    accountId,
    email,
    phone,
    passwordHash,
    ...(linkedStudentId ? { linkedStudentId } : {}),
    ...(linkedStudentEmail ? { linkedStudentEmail } : {}),
    ...(linkedStudentName ? { linkedStudentName } : {}),
    ...(linkedParentId ? { linkedParentId } : {}),
    ...(linkedParentEmail ? { linkedParentEmail } : {}),
    createdAt: now,
    source: 'manual-register',
    authUserCreated: false,
  };

  let authUserCreated = false;
  if (adminAuth) {
    try {
      await adminAuth.createUser({
        uid: accountId,
        email,
        password: normalizePasswordInput(password),
        displayName: name,
      });
      authUserCreated = true;
      credential.authUserCreated = true;
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/email-already-exists') {
        return NextResponse.json({ ok: false, error: 'هذا البريد مسجل بالفعل. استخدم تسجيل الدخول أو استعادة كلمة المرور.' }, { status: 409 });
      }
      console.error('[AuthRegister] Firebase Auth admin creation failed; trying REST fallback:', error);
    }

    if (authUserCreated) {
      await adminAuth.setCustomUserClaims(accountId, {
        role,
        schoolBranch,
        providerId: 'password',
        onboardingRequired: role === 'parent' || role === 'student',
        ...(linkedStudentId ? { linkedStudentId } : {}),
        ...(linkedStudentEmail ? { linkedStudentEmail } : {}),
        ...(linkedStudentName ? { linkedStudentName } : {}),
        ...(linkedParentId ? { linkedParentId } : {}),
        ...(linkedParentEmail ? { linkedParentEmail } : {}),
      }).catch(() => {});
    }
  }

  if (!authUserCreated) {
    const restResult = await createFirebaseUserViaRest(email, normalizePasswordInput(password), name);
    if (restResult?.ok) {
      authUserCreated = true;
      credential.authUserCreated = true;
    } else if (restResult?.error === 'EMAIL_EXISTS') {
      return NextResponse.json({ ok: false, error: 'هذا البريد مسجل بالفعل. استخدم تسجيل الدخول أو استعادة كلمة المرور.' }, { status: 409 });
    }
  }

  try {
    await Promise.all([
      adminDb.collection('accounts').doc(accountId).set(account, { merge: true }),
      ...(pendingStudentWrite
        ? [
            adminDb.collection('students').doc(pendingStudentWrite.docId).set(pendingStudentWrite.data, { merge: true }),
            adminDb.collection('class_students').doc(pendingStudentWrite.docId).set(pendingStudentWrite.data, { merge: true }),
          ]
        : []),
      adminDb.collection('auth_credentials').doc(accountId).set(credential, { merge: true }),
      adminDb.collection('auth_credentials').doc(credentialLookupId(email)).set(credential, { merge: true }),
      adminDb.collection('account_credentials').doc(accountId).set(credential, { merge: true }),
      adminDb.collection('account_credentials').doc(credentialLookupId(email)).set(credential, { merge: true }),
      ...(phone
        ? [
          adminDb.collection('auth_credentials').doc(credentialLookupId(phone)).set(credential, { merge: true }),
          adminDb.collection('account_credentials').doc(credentialLookupId(phone)).set(credential, { merge: true }),
        ]
        : []),
    ]);
  } catch (error) {
    console.error('[AuthRegister] Firestore write failed after auth creation:', error);
    return NextResponse.json({ ok: false, error: 'تعذر حفظ الحساب على السحابة. حاول مرة أخرى.' }, { status: 500 });
  }

  try {
    const { invalidateSnapshotCache } = await import('../../data/snapshot/route');
    invalidateSnapshotCache();
  } catch {}

  const token = await createSessionToken(account);
  if (!token) {
    return NextResponse.json({ ok: false, error: 'تعذر إنشاء جلسة آمنة للحساب.' }, { status: 500 });
  }

  const response = NextResponse.json({ ok: true, account });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
  return response;
}
