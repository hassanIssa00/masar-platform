'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Camera, ClipboardList, Save, UserRound } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import SyncStatus from '@/components/SyncStatus';
import { getAccounts, getReports, getSession, getStudents, getSurveys, hydrateSessionFromServer, saveAccount, saveStudent, setSession, updateStudent, deleteStudent } from '@/lib/cloudStore';
import { pullCloudDataToLocal, syncDocToCloud } from '@/lib/firestoreSync';
import { extractFatherNameFromStudent, findMatchingStudentForParent, isParentChildNameMatch, normalizeArabicText, isStudentNameMatch } from '@/lib/nameMatching';
import { getClassStudents } from '@/lib/classDb';

const gradeOptions = ['الروضة', 'الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس', 'صعوبات التعلم'];
const STUDENT_WIZARD_SYNC_KEYS = ['accounts', 'students', 'reports', 'surveys', 'classStudents'] as const;
const days = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0'));
const months = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
const years = Array.from({ length: 20 }, (_, index) => String(new Date().getFullYear() - 3 - index));

function isGeneratedAlias(emailStr?: string): boolean {
  if (!emailStr) return false;
  const e = emailStr.toLowerCase().trim();
  return e.includes('@masarplatform.org') || e.includes('@masar.com') || e.includes('@ikhlas.') || e.startsWith('student.') || e.startsWith('parent.');
}

/** Derive the father's name from student full name when parentName is missing or incorrectly set to student name */
function deriveParentName(studentFullName?: string, existingParentName?: string, sessionName?: string): string {
  const cleanExisting = existingParentName?.trim();
  // Use existing parent name only if it's valid and NOT identical to the student name
  if (
    cleanExisting &&
    !cleanExisting.includes('جديد') &&
    !cleanExisting.includes('الاستبيان') &&
    cleanExisting !== 'ولي الأمر' &&
    cleanExisting !== 'ولي أمر' &&
    normalizeArabicText(cleanExisting) !== normalizeArabicText(studentFullName)
  ) {
    return cleanExisting;
  }
  // Derive from student name: strip first word (student's own first name) to get father's name
  if (studentFullName) {
    const derived = extractFatherNameFromStudent(studentFullName);
    if (derived && derived.length > 2) return derived;
  }
  // Fall back to session name only if it's valid AND different from student name
  if (sessionName && !sessionName.includes('جديد') && sessionName !== 'ولي الأمر' && sessionName !== 'ولي أمر') {
    if (normalizeArabicText(sessionName) !== normalizeArabicText(studentFullName)) {
      return sessionName;
    }
  }
  return '';
}


export default function NewStudentPage() {
  const router = useRouter();
  const [nextFlow, setNextFlow] = useState<'parent-survey' | 'student-test'>('parent-survey');
  const [existingStudentId, setExistingStudentId] = useState('');
  const [student, setStudent] = useState({
    fullName: '',
    recoveryEmail: '',
    nationalId: '',
    grade: 'الصف الأول',
    parentName: '',
    parentPhone: '',
    photoUrl: '',
    notes: '',
  });
  const [parentAge, setParentAge] = useState('');
  const [childrenCount, setChildrenCount] = useState('');
  const [parentNationalId, setParentNationalId] = useState('');
  const [resolvedStudent, setResolvedStudent] = useState<any>(null);

  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentResolved, setStudentResolved] = useState(false);
  const [session, setSessionState] = useState<any>(null);

  // Pre-fill from registration if a student record already exists
  useEffect(() => {
    const load = async () => {
      await pullCloudDataToLocal([...STUDENT_WIZARD_SYNC_KEYS]).catch(() => {});
      const activeSession = getSession() ?? await hydrateSessionFromServer();
      setSessionState(activeSession);
      const session = activeSession;
      const params = new URLSearchParams(window.location.search);
      const flow = params.get('flow');
      const isStudent = session?.role === 'student' || flow === 'student';
      setNextFlow(isStudent ? 'student-test' : 'parent-survey');

      const requestedStudentId = params.get('student');
      const classStudents = getClassStudents();
      const rawStudents = getStudents();
      const allAccounts = getAccounts();
      const allStudents: any[] = [...rawStudents, ...classStudents];
      const realStudents = allStudents.filter(
        (s) => s.fullName && !s.fullName.includes('جديد') && !s.fullName.includes('الاستبيان') && s.fullName !== 'طالب'
      );

      let found =
        (requestedStudentId ? allStudents.find((s) => s.id === requestedStudentId || s.studentAccountId === requestedStudentId || (s as any).accountId === requestedStudentId) : undefined) ??
        (session?.role === 'student'
          ? allStudents.find((s) =>
              s.id === session.id ||
              s.studentAccountId === session.id ||
              (session.name && isStudentNameMatch(s.fullName, session.name)) ||
              (session.email && (s.email === session.email || s.linkedStudentEmail === session.email)) ||
              (session.phone && s.parentPhone === session.phone),
            )
          : undefined) ??
        (session?.role === 'parent'
          ? (((session as any)?.linkedStudentId ? allStudents.find((s) => s.id === (session as any).linkedStudentId || (s as any).studentAccountId === (session as any).linkedStudentId) : undefined) ||
            ((session as any)?.linkedStudentName ? allStudents.find((s) => isStudentNameMatch(s.fullName, (session as any).linkedStudentName)) : undefined) ||
            ((session as any)?.childName ? allStudents.find((s) => isStudentNameMatch(s.fullName, (session as any).childName)) : undefined) ||
            findMatchingStudentForParent(session, allStudents as any) ||
            allStudents.find((s) => session.phone && s.parentPhone && s.parentPhone.replace(/\D/g, '').includes(session.phone.replace(/\D/g, '').slice(-8))))
          : undefined);

      if (!found && session?.id) {
        const acc = allAccounts.find(a => a.id === session.id || (session.email && a.email === session.email));
        if (acc) {
          const lId = acc.linkedStudentId;
          const lName = acc.linkedStudentName || (acc as any).childName;
          if (lId) found = allStudents.find(s => s.id === lId || s.studentAccountId === lId);
          if (!found && lName) found = allStudents.find(s => isStudentNameMatch(s.fullName, lName));
        }
      }

      if (!found && requestedStudentId) {
        const acc = allAccounts.find(a => a.id === requestedStudentId);
        if (acc) {
          if (acc.linkedStudentId) found = allStudents.find(s => s.id === acc.linkedStudentId);
          if (!found && acc.name) found = allStudents.find(s => isStudentNameMatch(s.fullName, acc.name));
        }
      }

      if (!found && (session?.role === 'parent' || flow === 'parent') && session?.name) {
        found = allStudents.find(s => isParentChildNameMatch(s.fullName, session.name));
      }

      // If still not found in parent flow, connect to the primary real student
      if (!found && (session?.role === 'parent' || flow === 'parent')) {
        if (realStudents.length === 1) {
          found = realStudents[0];
        } else if (classStudents.length === 1 && classStudents[0].fullName && !classStudents[0].fullName.includes('جديد')) {
          found = classStudents[0];
        } else if (realStudents.length > 0) {
          found = realStudents[0];
        }
      }

      if (session?.role === 'parent' || flow === 'parent') {
        const effectiveStudent = (found && !found.fullName?.includes('جديد')) ? found : (realStudents.length > 0 ? realStudents[0] : null);
        const resolvedChildName = effectiveStudent?.fullName || (session as any)?.linkedStudentName || (session as any)?.childName || '';
        const resolvedGrade = effectiveStudent?.grade || (session as any)?.grade || 'الصف الأول الابتدائي';

        if (effectiveStudent) {
          setResolvedStudent(effectiveStudent);
          setExistingStudentId(effectiveStudent.id);
        }
        setStudentResolved(true);

        const cleanParentName = (effectiveStudent ? deriveParentName(effectiveStudent.fullName, effectiveStudent.parentName, session?.name) : '') || session?.name || '';
        setParentAge(String((session as any)?.parentAge || (effectiveStudent as any)?.parentAge || ''));
        setChildrenCount(String((session as any)?.childrenCount || (effectiveStudent as any)?.childrenCount || ''));
        setParentNationalId(String((session as any)?.parentNationalId || (effectiveStudent as any)?.parentNationalId || ''));

        if (effectiveStudent?.dateOfBirth) {
          const parts = effectiveStudent.dateOfBirth.split('-');
          if (parts.length === 3) {
            setBirthYear(parts[0]);
            setBirthMonth(parts[1]);
            setBirthDay(parts[2]);
          }
        }

        setStudent((prev) => ({
          ...prev,
          fullName: effectiveStudent?.fullName || resolvedChildName || prev.fullName,
          parentName: cleanParentName || prev.parentName,
          grade: effectiveStudent?.grade || resolvedGrade,
          recoveryEmail: (!isGeneratedAlias(session?.email) ? session?.email : '') || prev.recoveryEmail,
          parentPhone: session?.phone || (effectiveStudent as any)?.parentPhone || prev.parentPhone,
          photoUrl: (effectiveStudent as any)?.photoUrl || prev.photoUrl,
          notes: (effectiveStudent as any)?.notes || (session as any)?.notes || prev.notes,
          nationalId: (effectiveStudent as any)?.nationalId || prev.nationalId,
        }));
        return;
      }

      if (found && found.fullName && !found.fullName.includes('جديد')) {
        const allReports = getReports();
        const hasReports = allReports.some(
          (r) => r.studentId === found.id || r.studentName === found.fullName
        );

        if (session?.role === 'student') {
          if (hasReports) {
            router.replace(`/school-student?student=${found.id}`);
            return;
          }
        }
      }

      if (found) {
        // found exists but has placeholder name — pre-fill the form
        setExistingStudentId(found.id);
        if (found.dateOfBirth) {
          const parts = found.dateOfBirth.split('-');
          if (parts.length === 3) {
            setBirthYear(parts[0]);
            setBirthMonth(parts[1]);
            setBirthDay(parts[2]);
          }
        }

        const existingRecovery =
          found.recoveryEmail ||
          (!isGeneratedAlias(found.email) ? found.email : '') ||
          (!isGeneratedAlias(session?.email) ? session?.email : '') ||
          '';

        const cleanFullName = (found.fullName && !found.fullName.includes('جديد') && !found.fullName.includes('الاستبيان') && found.fullName !== 'طالب' && found.fullName !== 'الطالب') ? found.fullName : '';
        const cleanParentName = deriveParentName(cleanFullName || found.fullName, found.parentName, session?.name);

        setStudent((prev) => ({
          ...prev,
          fullName: cleanFullName,
          recoveryEmail: existingRecovery || prev.recoveryEmail,
          grade: found.grade || prev.grade,
          parentName: cleanParentName,
          parentPhone: found.parentPhone || session?.phone || prev.parentPhone,
          photoUrl: found.photoUrl || prev.photoUrl,
          notes: found.notes || prev.notes,
          nationalId: found.nationalId || prev.nationalId,
        }));
      }
    };

    void load();
  }, [router]);

  const handleFieldChange = (key: keyof typeof student, value: string) => {
    setStudent((current) => {
      const next = { ...current, [key]: value };
      if (key === 'fullName') {
        const prevFull = current.fullName?.trim() || '';
        const curParent = current.parentName?.trim() || '';
        const oldDerived = extractFatherNameFromStudent(prevFull);
        if (
          !curParent ||
          normalizeArabicText(curParent) === normalizeArabicText(prevFull) ||
          (oldDerived && normalizeArabicText(curParent) === normalizeArabicText(oldDerived))
        ) {
          const newDerived = extractFatherNameFromStudent(value);
          if (newDerived && newDerived.length > 2) {
            next.parentName = newDerived;
          }
        }
      }
      return next;
    });
  };

  const parentLinkedStudentVisible = nextFlow === 'parent-survey' && studentResolved;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    await pullCloudDataToLocal(['students', 'accounts', 'classStudents', 'reports', 'surveys']).catch(() => {});
    const dateOfBirth = birthYear && birthMonth && birthDay ? `${birthYear}-${birthMonth}-${birthDay}` : '';
    const session = getSession();
    const params = new URLSearchParams(window.location.search);
    const requestedStudentId = params.get('student');
    const allStudents: any[] = [...getStudents(), ...getClassStudents()];
    const matchedExisting = existingStudentId ? allStudents.find((s) => s.id === existingStudentId) : null;
    const targetId = existingStudentId || requestedStudentId || (session?.role === 'student' ? session.id : undefined);
    const recoveryEmail = student.recoveryEmail.trim();
    const photoToSave = student.photoUrl || matchedExisting?.photoUrl || undefined;
    const branch = (session as any)?.schoolBranch || matchedExisting?.schoolBranch || 'MASAR';

    let savedStudent: any = null;

    if (nextFlow === 'parent-survey') {
      const parentNameClean = student.parentName.trim() || session?.name || '';
      const parentPhoneClean = student.parentPhone.trim() || session?.phone || '';

      const realStudents = allStudents.filter(
        (s) => s.fullName && !s.fullName.includes('جديد') && !s.fullName.includes('الاستبيان') && s.fullName !== 'طالب'
      );

      const targetStudent =
        (resolvedStudent && !resolvedStudent.fullName?.includes('جديد') ? resolvedStudent : null) ||
        (matchedExisting && !matchedExisting.fullName?.includes('جديد') ? matchedExisting : null) ||
        (existingStudentId ? allStudents.find((s) => s.id === existingStudentId && !s.fullName?.includes('جديد')) : null) ||
        (requestedStudentId ? allStudents.find((s) => s.id === requestedStudentId && !s.fullName?.includes('جديد')) : null) ||
        ((session as any)?.linkedStudentId ? allStudents.find((s) => s.id === (session as any).linkedStudentId && !s.fullName?.includes('جديد')) : null) ||
        findMatchingStudentForParent(session, realStudents as any) ||
        (realStudents.length > 0 ? realStudents[0] : null);

      if (targetStudent) {
        savedStudent = updateStudent(targetStudent.id, {
          fullName: targetStudent.fullName,
          parentName: parentNameClean || targetStudent.parentName,
          parentPhone: parentPhoneClean || targetStudent.parentPhone,
          parentAge: parentAge.trim() || (targetStudent as any).parentAge,
          childrenCount: childrenCount.trim() || (targetStudent as any).childrenCount,
          parentNationalId: parentNationalId.trim() || (targetStudent as any).parentNationalId,
          notes: student.notes.trim() || targetStudent.notes,
          parentEmail: recoveryEmail || targetStudent.parentEmail,
          parentAccountId: session?.role === 'parent' ? session.id : targetStudent.parentAccountId,
          linkedParentId: session?.role === 'parent' ? session.id : targetStudent.linkedParentId,
          linkedParentEmail: session?.role === 'parent' ? session.email : targetStudent.linkedParentEmail || recoveryEmail,
          linkedStudentId: targetStudent.id,
          linkedStudentEmail: targetStudent.linkedStudentEmail || targetStudent.email,
          linkedStudentName: targetStudent.fullName,
          nationalId: targetStudent.nationalId || student.nationalId,
          recoveryEmail: recoveryEmail || targetStudent.recoveryEmail,
          photoUrl: targetStudent.photoUrl || photoToSave,
          dateOfBirth: targetStudent.dateOfBirth || dateOfBirth,
          grade: targetStudent.grade || student.grade || 'الصف الأول',
          schoolBranch: branch,
          reviewStatus: 'awaiting-survey',
        }) ?? targetStudent;
      } else {
        const childNameClean = student.fullName.trim() || (session as any)?.linkedStudentName || (session as any)?.childName || '';
        if (childNameClean && !childNameClean.includes('جديد')) {
          savedStudent = saveStudent({
            id: existingStudentId || requestedStudentId || undefined,
            fullName: childNameClean,
            grade: student.grade || 'الصف الأول',
            nationalId: student.nationalId,
            parentName: parentNameClean,
            parentPhone: parentPhoneClean,
            parentAge: parentAge.trim() || undefined,
            childrenCount: childrenCount.trim() || undefined,
            parentNationalId: parentNationalId.trim() || undefined,
            notes: student.notes.trim() || undefined,
            parentEmail: recoveryEmail || undefined,
            parentAccountId: session?.role === 'parent' ? session.id : undefined,
            linkedParentId: session?.role === 'parent' ? session.id : undefined,
            linkedParentEmail: session?.role === 'parent' ? session.email : recoveryEmail || undefined,
            recoveryEmail: recoveryEmail || undefined,
            photoUrl: photoToSave,
            dateOfBirth,
            schoolBranch: branch,
            reviewStatus: 'awaiting-survey',
            source: branch === 'IKHLAS_JEDDAH' ? 'ikhlas-jeddah' : 'student-wizard',
          });
        }
      }

      // Purge any accidental dummy "طالب جديد" records
      if (savedStudent) {
        const dummyJunk = allStudents.filter(s => s.id !== savedStudent.id && s.fullName && s.fullName.includes('طالب جديد'));
        dummyJunk.forEach(d => {
          deleteStudent(d.id).catch(() => {});
        });
      }
    } else {
      // Student flow
      if (targetId) {
        savedStudent = updateStudent(targetId, {
          fullName: student.fullName.trim() || matchedExisting?.fullName || 'طالب جديد',
          email: recoveryEmail || (!isGeneratedAlias(session?.email) ? session?.email : '') || '',
          recoveryEmail: recoveryEmail || undefined,
          studentAccountId: session?.role === 'student' ? session.id : matchedExisting?.studentAccountId,
          linkedStudentId: targetId || undefined,
          linkedStudentEmail: session?.role === 'student' ? session.email : matchedExisting?.linkedStudentEmail || matchedExisting?.email,
          linkedStudentName: student.fullName.trim() || matchedExisting?.fullName,
          linkedParentId: matchedExisting?.linkedParentId || matchedExisting?.parentAccountId,
          linkedParentEmail: matchedExisting?.linkedParentEmail || matchedExisting?.parentEmail,
          nationalId: student.nationalId,
          dateOfBirth,
          grade: student.grade,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          photoUrl: photoToSave,
          notes: student.notes,
          schoolBranch: branch,
          reviewStatus: 'awaiting-doctor-review',
          source: branch === 'IKHLAS_JEDDAH' ? 'ikhlas-jeddah' : 'student-wizard',
        });
      }

      if (!savedStudent) {
        savedStudent = saveStudent({
          id: targetId,
          fullName: student.fullName.trim() || 'طالب جديد',
          email: recoveryEmail || (!isGeneratedAlias(session?.email) ? session?.email : '') || '',
          recoveryEmail: recoveryEmail || undefined,
          studentAccountId: session?.role === 'student' ? session.id : undefined,
          linkedStudentId: session?.role === 'student' ? session.id : targetId || undefined,
          linkedStudentEmail: session?.role === 'student' ? session.email : undefined,
          linkedStudentName: student.fullName.trim() || 'طالب جديد',
          nationalId: student.nationalId,
          dateOfBirth,
          grade: student.grade,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          photoUrl: photoToSave,
          notes: student.notes,
          schoolBranch: branch,
          reviewStatus: 'awaiting-doctor-review',
          source: branch === 'IKHLAS_JEDDAH' ? 'ikhlas-jeddah' : 'student-wizard',
        });
      }
    }

    await syncDocToCloud('students', savedStudent.id, savedStudent);

    // Update the active user's account and session with proper names, photo, and mark onboarding as DONE
    if (session?.id) {
      const allAccounts = getAccounts();
      const currentAcc = allAccounts.find((a) => a.id === session.id || a.email === session.email);
      const resolvedName = nextFlow === 'student-test'
        ? (student.fullName.trim() || currentAcc?.name || session.name)
        : (student.parentName.trim() || currentAcc?.name || session.name);
      // For parent flow: don't overwrite parent's own photo with child's photo
      const accountPhoto = nextFlow === 'student-test'
        ? (photoToSave || currentAcc?.photoUrl || (session as any).photoUrl)
        : (currentAcc?.photoUrl || (session as any).photoUrl || undefined);
      const updatedAcc = saveAccount({
        ...(currentAcc || session),
        id: session.id,
        name: resolvedName,
        recoveryEmail: recoveryEmail || currentAcc?.recoveryEmail || session.email,
        photoUrl: accountPhoto,
        phone: student.parentPhone || currentAcc?.phone || session.phone,
        parentAge: parentAge.trim() || (currentAcc as any)?.parentAge,
        childrenCount: childrenCount.trim() || (currentAcc as any)?.childrenCount,
        parentNationalId: parentNationalId.trim() || (currentAcc as any)?.parentNationalId,
        parentNotes: student.notes.trim() || (currentAcc as any)?.parentNotes,
        parentProfileComplete: true,
        schoolBranch: branch as any,
        onboardingRequired: false,
        linkedStudentId: savedStudent.id,
        linkedStudentEmail: nextFlow === 'student-test'
          ? (session?.email || savedStudent.linkedStudentEmail || savedStudent.email)
          : (savedStudent.linkedStudentEmail || savedStudent.email),
        linkedStudentName: savedStudent.fullName,
        linkedParentId: nextFlow === 'parent-survey'
          ? session.id
          : (savedStudent.linkedParentId || savedStudent.parentAccountId),
        linkedParentEmail: nextFlow === 'parent-survey'
          ? session.email
          : (savedStudent.linkedParentEmail || savedStudent.parentEmail),
      });
      setSession(updatedAcc);
      await syncDocToCloud('accounts', updatedAcc.id, updatedAcc);
    }

    if (nextFlow === 'student-test') {
      router.push(`/assessment?student=${savedStudent.id}&flow=student`);
    } else {
      // Check if the survey was already completed before redirecting
      const allSurveys = getSurveys();
      const surveyAlreadyDone = allSurveys.some(
        (s) =>
          s.studentId === savedStudent.id ||
          (session?.email && s.parentEmail?.toLowerCase() === session.email.toLowerCase()) ||
          (session?.phone && s.parentPhone === session.phone)
      );
      if (surveyAlreadyDone) {
        // Survey already exists — go straight to dashboard, skip survey
        const branch = (session as any)?.schoolBranch || savedStudent.schoolBranch || 'MASAR';
        router.push(
          branch === 'IKHLAS_JEDDAH'
            ? `/school-parent?student=${savedStudent.id}`
            : `/parent?student=${savedStudent.id}`
        );
      } else {
        router.push(`/survey?student=${savedStudent.id}&flow=parent`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <BrandMark size="sm" />
          <div className="rounded-full bg-teal-50 px-4 py-2 text-xs font-black text-teal-800">
            {nextFlow === 'student-test' ? 'تسجيل بيانات الطالب' : 'تسجيل بيانات ولي الأمر'}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-teal-50 text-teal-800">
              <UserRound size={24} />
            </span>
            <div>
              <p className="text-sm font-black text-teal-800">{nextFlow === 'student-test' ? 'بداية مسار الطالب' : 'بوابة أولياء الأمور'}</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">
                {nextFlow === 'student-test' ? 'تسجيل بيانات الطالب قبل الاختبار' : 'تسجيل بيانات ولي الأمر قبل الاستبيان'}
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-600">
                {nextFlow === 'student-test'
                  ? 'بعد حفظ البيانات ينتقل الطالب مباشرة إلى اختبار مناسب للصف. لا تظهر أي درجة أو تشخيص داخل تجربة الطالب.'
                  : 'بعد حفظ البيانات ينتقل ولي الأمر مباشرة إلى الاستبيان الشامل، ويتم ربط الحساب بملفات الطلاب المسجلة دون عرض افتراضات عن عدد الأبناء.'}
              </p>
            </div>
          </div>
        </header>

        <SyncStatus />

        <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <h2 className="mb-5 text-xl font-black text-slate-950">
              {nextFlow === 'student-test' ? 'بيانات الطالب وولي الأمر' : 'بيانات ولي الأمر (الأب / الأم)'}
            </h2>

            {nextFlow === 'parent-survey' ? (
              <div className="space-y-6">
                {/* Confirmed Linked Student Card */}
                <div className="rounded-2xl border-2 border-emerald-500/20 bg-emerald-50/80 p-4 shadow-2xs">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-2xl shadow-xs shrink-0">
                      🎓
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-black text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        تم التعرف على ملف الابن بنجاح ✓
                      </span>
                      <h3 className="text-base font-black text-slate-900 mt-1 truncate">
                        {student.fullName || resolvedStudent?.fullName || (session as any)?.linkedStudentName || (session as any)?.childName || 'ملف الطالب المرتبط'}
                      </h3>
                      <p className="text-xs font-bold text-slate-600">
                        {student.grade || resolvedStudent?.grade || 'الصف الأول الابتدائي'} • {(session as any)?.schoolBranch === 'IKHLAS_JEDDAH' ? 'فصل د. إسماعيل عيسى' : 'منصة مَسَار التعليمية'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Parent's Own Data Fields */}
                <div className="grid gap-5 md:grid-cols-2">
                  <Field
                    label="اسم ولي الأمر (الأب / الأم)"
                    placeholder="الاسم ثلاثي أو رباعي"
                    value={student.parentName}
                    onChange={(value) => handleFieldChange('parentName', value)}
                    required
                  />

                  <Field
                    label="عمر ولي الأمر (بالسنوات)"
                    type="number"
                    placeholder="مثال: 38"
                    value={parentAge}
                    onChange={(value) => setParentAge(value)}
                    required
                  />

                  <Field
                    label="كم طفل في العائلة؟"
                    type="number"
                    placeholder="مثال: 3"
                    value={childrenCount}
                    onChange={(value) => setChildrenCount(value)}
                    required
                  />

                  <Field
                    label="رقم الهوية الوطنية أو الإقامة لولي الأمر"
                    placeholder="رقم الهوية الوطنية أو الإقامة للأب"
                    value={parentNationalId}
                    onChange={(value) => setParentNationalId(value)}
                    required
                  />

                  <Field
                    label="رقم هاتف ولي الأمر / الواتساب"
                    type="tel"
                    placeholder="05xxxxxxxx أو 01xxxxxxxxx"
                    value={student.parentPhone}
                    onChange={(value) => handleFieldChange('parentPhone', value)}
                    required
                  />

                  <div className="block md:col-span-2">
                    <label className="block">
                      <span className="mb-2 flex items-center justify-between text-sm font-black text-slate-700">
                        <span>البريد الإلكتروني الشخصي لولي الأمر</span>
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                          اختياري / بديل للدخول
                        </span>
                      </span>
                      <input
                        type="email"
                        placeholder="مثال: father@gmail.com"
                        value={student.recoveryEmail}
                        onChange={(event) => handleFieldChange('recoveryEmail', event.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700 focus:bg-white transition placeholder:text-slate-400"
                      />
                    </label>
                  </div>
                </div>

                <label className="mt-5 block">
                  <span className="mb-2 block text-sm font-black text-slate-700">ملاحظات أولية عن الأسرة أو الطفل</span>
                  <textarea
                    value={student.notes}
                    onChange={(event) => handleFieldChange('notes', event.target.value)}
                    className="min-h-28 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700"
                    placeholder="اكتب أي ملاحظات أولية عن الأسرة، نمط معيشة الطفل، أو نقاط تود إبلاغ د. إسماعيل والإدارة بها..."
                  />
                </label>
              </div>
            ) : (
              /* Student Test Flow */
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="اسم الطالب"
                  placeholder="الاسم الرباعي"
                  value={student.fullName}
                  onChange={(value) => handleFieldChange('fullName', value)}
                  required
                />
                <Field
                  label="رقم الهوية / الإقامة"
                  placeholder="رقم الهوية الوطنية أو الإقامة"
                  value={student.nationalId}
                  onChange={(value) => handleFieldChange('nationalId', value)}
                />

                <div className="block">
                  <span className="mb-2 block text-sm font-black text-slate-700">تاريخ الميلاد <span className="font-bold text-slate-400 text-xs">(اختياري)</span></span>
                  <div className="grid grid-cols-3 gap-2">
                    <select value={birthDay} onChange={(event) => setBirthDay(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-teal-700">
                      <option value="">اليوم</option>
                      {days.map((day) => <option key={day} value={day}>{day}</option>)}
                    </select>
                    <select value={birthMonth} onChange={(event) => setBirthMonth(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-teal-700">
                      <option value="">الشهر</option>
                      {months.map((month) => <option key={month} value={month}>{month}</option>)}
                    </select>
                    <select value={birthYear} onChange={(event) => setBirthYear(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-teal-700">
                      <option value="">السنة</option>
                      {years.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-700">الصف أو المسار</span>
                  <select value={student.grade} onChange={(event) => handleFieldChange('grade', event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700">
                    {gradeOptions.map((grade) => <option key={grade}>{grade}</option>)}
                  </select>
                </label>

                <Field label="اسم ولي الأمر" placeholder="الاسم ثلاثي أو رباعي" value={student.parentName} onChange={(value) => handleFieldChange('parentName', value)} required />
                <Field label="هاتف ولي الأمر" type="tel" placeholder="05xxxxxxxx أو 01xxxxxxxxx" value={student.parentPhone} onChange={(value) => handleFieldChange('parentPhone', value)} required />

                <div className="block md:col-span-2">
                  <label className="block">
                    <span className="mb-2 flex items-center justify-between text-sm font-black text-slate-700">
                      <span>البريد الإلكتروني الشخصي (لاسترجاع كلمة المرور)</span>
                      <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                        اختياري / بديل للدخول
                      </span>
                    </span>
                    <input
                      type="email"
                      placeholder="مثال: example@gmail.com"
                      value={student.recoveryEmail}
                      onChange={(event) => handleFieldChange('recoveryEmail', event.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700 focus:bg-white transition placeholder:text-slate-400"
                    />
                  </label>
                  <p className="mt-1.5 text-xs font-bold leading-5 text-slate-500">
                    ضع بريدك الشخصي (Gmail أو Outlook) لاسترجاع كلمة المرور في حال نسيانها، أو لتسجيل الدخول به بديلاً عن اسم المستخدم المولد.
                  </p>
                </div>
                <label className="mt-5 block md:col-span-2">
                  <span className="mb-2 block text-sm font-black text-slate-700">ملاحظات أولية</span>
                  <textarea value={student.notes} onChange={(event) => handleFieldChange('notes', event.target.value)} className="min-h-28 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700" placeholder="مثال: صعوبة قراءة، تشتت، تأخر نطق، حساسية صوت..." />
                </label>
              </div>
            )}
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-32 lg:self-start">
            {nextFlow === 'parent-survey' ? (
              <div className="mb-5 rounded-2xl border border-teal-200 bg-teal-50/70 p-4">
                <p className="text-xs font-black text-teal-800">بيانات ولي الأمر</p>
                <p className="mt-1 text-sm font-black text-slate-900">{student.parentName || (session as any)?.name || 'ولي الأمر'}</p>
                <p className="mt-2 text-xs font-bold leading-6 text-slate-600">
                  الابن المرتبط: <span className="text-slate-900 font-black">{student.fullName || resolvedStudent?.fullName || (session as any)?.linkedStudentName || (session as any)?.childName || 'ملف الطالب المسجل'}</span>
                </p>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center mb-5">
                {student.photoUrl ? (
                  <>
                    <Image src={student.photoUrl} alt="صورة الطالب" width={112} height={112} unoptimized className="mx-auto h-28 w-28 rounded-full object-cover ring-4 ring-teal-200 shadow-md" />
                    <p className="mt-2 text-xs font-black text-teal-700">✅ صورة الطالب محفوظة وموثقة</p>
                    <label className="mt-2 inline-flex cursor-pointer rounded-lg bg-white px-4 py-2 text-xs font-bold text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100 transition shadow-2xs">
                      تغيير الصورة
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const img = document.createElement('img');
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              const maxDim = 240;
                              let w = img.width; let h = img.height;
                              if (w > h) { if (w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; } }
                              else { if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; } }
                              canvas.width = w; canvas.height = h;
                              canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
                              handleFieldChange('photoUrl', canvas.toDataURL('image/jpeg', 0.8));
                            };
                            img.src = String(reader.result);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <Camera className="mx-auto text-slate-400" size={32} />
                    <p className="mt-2 text-xs font-bold text-slate-400">صورة الطالب الشخصية</p>
                    <label className="mt-3 inline-flex cursor-pointer rounded-lg bg-white px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 transition shadow-2xs">
                      رفع صورة الطالب (اختياري)
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const img = document.createElement('img');
                            img.onload = () => {
                              const canvas = document.createElement('canvas');
                              const maxDim = 240;
                              let w = img.width; let h = img.height;
                              if (w > h) { if (w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; } }
                              else { if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; } }
                              canvas.width = w; canvas.height = h;
                              canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
                              handleFieldChange('photoUrl', canvas.toDataURL('image/jpeg', 0.8));
                            };
                            img.src = String(reader.result);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                  </>
                )}
              </div>
            )}

            <div className="rounded-lg bg-teal-50 p-4 text-sm font-bold leading-7 text-teal-950">
              <ClipboardList className="mb-2 text-teal-800" size={22} />
              {nextFlow === 'student-test'
                ? 'الخطوة التالية هي اختبار الطالب المباشر حسب الصف، ثم حفظ الإجابات والتحليل في لوحة د. إسماعيل.'
                : 'الخطوة التالية هي الاستبيان الشامل لتحديد مؤشرات القراءة، الكتابة، الرياضيات، السمع والنطق، التواصل، الانتباه، والسلوك.'}
            </div>
            <button type="submit" disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white hover:bg-teal-800 disabled:opacity-60 cursor-pointer shadow-sm">
              <Save size={17} />
              {loading
                ? nextFlow === 'student-test' ? 'جاري فتح الاختبار...' : 'جاري فتح الاستبيان...'
                : nextFlow === 'student-test' ? 'حفظ وفتح اختبار الطالب' : 'حفظ البيانات والانتقال للاستبيان 📝 ↗'}
            </button>
          </aside>
        </form>

        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
            <div className="motion-scale-in rounded-lg border border-white/15 bg-white/10 p-7 text-center shadow-2xl">
              <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-teal-300" />
              <p className="mt-4 text-lg font-black text-white">تم حفظ البيانات</p>
              <p className="mt-1 text-sm font-bold text-white/70">
                {nextFlow === 'student-test' ? 'جاري فتح اختبار الطالب المناسب للصف.' : 'جاري فتح استبيان ولي الأمر الشامل.'}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
  required = false,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700" placeholder={placeholder} required={required} />
    </label>
  );
}
