'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Camera, ClipboardList, Save, UserRound } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import SyncStatus from '@/components/SyncStatus';
import { getAccounts, getReports, getSession, getStudents, getSurveys, hydrateSessionFromServer, saveAccount, saveStudent, setSession, updateStudent } from '@/lib/localDb';
import { pullCloudDataToLocal, syncDocToCloud } from '@/lib/firestoreSync';
import { findMatchingStudentForParent, isParentChildNameMatch } from '@/lib/nameMatching';

const gradeOptions = ['الروضة', 'الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس', 'صعوبات التعلم'];
const STUDENT_WIZARD_SYNC_KEYS = ['accounts', 'students', 'reports', 'surveys'] as const;
const days = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0'));
const months = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
const years = Array.from({ length: 20 }, (_, index) => String(new Date().getFullYear() - 3 - index));

function isGeneratedAlias(emailStr?: string): boolean {
  if (!emailStr) return false;
  const e = emailStr.toLowerCase().trim();
  return e.includes('@masarplatform.org') || e.includes('@masar.com') || e.includes('@ikhlas.') || e.startsWith('student.') || e.startsWith('parent.');
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
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill from registration if a student record already exists
  useEffect(() => {
    const load = async () => {
      await pullCloudDataToLocal([...STUDENT_WIZARD_SYNC_KEYS]).catch(() => {});
      const session = getSession() ?? await hydrateSessionFromServer();
      const params = new URLSearchParams(window.location.search);
      const flow = params.get('flow');
      const isStudent = session?.role === 'student' || flow === 'student';
      setNextFlow(isStudent ? 'student-test' : 'parent-survey');

      const requestedStudentId = params.get('student');
      const allStudents = getStudents();
      const found =
        allStudents.find((s) => s.id === requestedStudentId) ??
        (session?.role === 'student'
          ? allStudents.find((s) =>
              s.id === session.id ||
              s.fullName === session.name ||
              s.email === session.email ||
              s.parentPhone === session.phone,
            )
          : undefined) ??
        (session?.role === 'parent'
          ? findMatchingStudentForParent(session, allStudents)
          : undefined);

      if (found && found.fullName && !found.fullName.includes('جديد')) {
        const allReports = getReports();
        const hasReports = allReports.some(
          (r) => r.studentId === found.id || r.studentName === found.fullName
        );

        if (session?.role === 'student') {
          if (hasReports) {
            router.replace(`/student/${found.id}`);
            return;
          }
        } else if (session?.role === 'parent') {
          const allSurveys = getSurveys();
          const hasSurvey = allSurveys.some(
            (s) => s.studentId === found.id || (session?.email && s.parentEmail === session.email) || (session?.phone && s.parentPhone === session.phone)
          );
          if (hasSurvey || hasReports) {
            router.replace(`/parent?student=${found.id}`);
            return;
          }
        }
      }

      if (!found) {
        if (session?.role === 'student') {
          setStudent((prev) => ({
            ...prev,
            fullName: session.name || prev.fullName,
            recoveryEmail: (!isGeneratedAlias(session.email) ? session.email : '') || prev.recoveryEmail,
            parentPhone: session.phone || prev.parentPhone,
          }));
        } else if (session?.role === 'parent') {
          setStudent((prev) => ({
            ...prev,
            parentName: (session.name && !session.name.includes('جديد')) ? session.name : prev.parentName,
            recoveryEmail: (!isGeneratedAlias(session.email) ? session.email : '') || prev.recoveryEmail,
            parentPhone: session.phone || prev.parentPhone,
          }));
        }
        return;
      }

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

      setStudent((prev) => ({
        ...prev,
        fullName: found.fullName || prev.fullName,
        recoveryEmail: existingRecovery || prev.recoveryEmail,
        grade: found.grade || prev.grade,
        parentName: found.parentName || (session?.name && !session.name.includes('جديد') ? session.name : '') || prev.parentName,
        parentPhone: found.parentPhone || session?.phone || prev.parentPhone,
        photoUrl: found.photoUrl || prev.photoUrl,
        notes: found.notes || prev.notes,
        nationalId: found.nationalId || prev.nationalId,
      }));
    };

    void load();
  }, [router]);

  const handleFieldChange = (key: keyof typeof student, value: string) => {
    setStudent((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const dateOfBirth = birthYear && birthMonth && birthDay ? `${birthYear}-${birthMonth}-${birthDay}` : '';

    const session = getSession();
    const params = new URLSearchParams(window.location.search);
    const requestedStudentId = params.get('student');
    const allStudents = getStudents();
    const matchedExisting = existingStudentId ? allStudents.find((s) => s.id === existingStudentId) : null;
    const targetId = existingStudentId || requestedStudentId || session?.id || undefined;
    const recoveryEmail = student.recoveryEmail.trim();
    const photoToSave = student.photoUrl || matchedExisting?.photoUrl || undefined;

    let savedStudent: any = null;

    if (nextFlow === 'parent-survey') {
      const parentNameClean = student.parentName.trim();
      const parentPhoneClean = student.parentPhone.trim();

      // Look up any child already registered with matching patronymic name or phone
      const matchedChildren = allStudents.filter((s) => {
        if (parentNameClean && (isParentChildNameMatch(s.fullName, parentNameClean) || isParentChildNameMatch(s.parentName, parentNameClean))) return true;
        if (parentPhoneClean && s.parentPhone && s.parentPhone.replace(/\D/g, '') === parentPhoneClean.replace(/\D/g, '')) return true;
        return false;
      });

      const primaryChild = matchedChildren[0];
      if (primaryChild) {
        savedStudent = updateStudent(primaryChild.id, {
          parentName: parentNameClean,
          parentPhone: parentPhoneClean,
          recoveryEmail: recoveryEmail || primaryChild.recoveryEmail,
          reviewStatus: 'awaiting-survey',
        }) ?? primaryChild;
      } else {
        savedStudent = saveStudent({
          id: targetId,
          fullName: 'طالب من الاستبيان',
          grade: student.grade || 'الصف الأول',
          parentName: parentNameClean,
          parentPhone: parentPhoneClean,
          recoveryEmail: recoveryEmail || undefined,
          notes: student.notes,
          reviewStatus: 'awaiting-survey',
          source: 'student-wizard',
        });
      }
    } else {
      // Student flow
      if (targetId) {
        savedStudent = updateStudent(targetId, {
          fullName: student.fullName.trim() || matchedExisting?.fullName || 'طالب جديد',
          email: recoveryEmail || (!isGeneratedAlias(session?.email) ? session?.email : '') || '',
          recoveryEmail: recoveryEmail || undefined,
          nationalId: student.nationalId,
          dateOfBirth,
          grade: student.grade,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          photoUrl: photoToSave,
          notes: student.notes,
          reviewStatus: 'awaiting-doctor-review',
          source: 'student-wizard',
        });
      }

      if (!savedStudent) {
        savedStudent = saveStudent({
          id: targetId,
          fullName: student.fullName.trim() || 'طالب جديد',
          email: recoveryEmail || (!isGeneratedAlias(session?.email) ? session?.email : '') || '',
          recoveryEmail: recoveryEmail || undefined,
          nationalId: student.nationalId,
          dateOfBirth,
          grade: student.grade,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          photoUrl: photoToSave,
          notes: student.notes,
          reviewStatus: 'awaiting-doctor-review',
          source: 'student-wizard',
        });
      }
    }

    await syncDocToCloud('students', savedStudent.id, savedStudent);

    // Update the active user's account and session with proper names, photo, and mark onboarding as DONE
    if (session?.id) {
      const allAccounts = getAccounts();
      const currentAcc = allAccounts.find((a) => a.id === session.id || a.email === session.email);
      if (currentAcc) {
        const resolvedName = nextFlow === 'student-test'
          ? (student.fullName.trim() || currentAcc.name)
          : (student.parentName.trim() || currentAcc.name);
        const updatedAcc = saveAccount({
          ...currentAcc,
          name: resolvedName,
          recoveryEmail: recoveryEmail || currentAcc.recoveryEmail,
          photoUrl: photoToSave || currentAcc.photoUrl,
          phone: student.parentPhone || currentAcc.phone,
          onboardingRequired: false,
        });
        setSession(updatedAcc);
        await syncDocToCloud('accounts', updatedAcc.id, updatedAcc);

        if (savedStudent.id !== session.id) {
          void syncDocToCloud('accounts', session.id, { onboardingRequired: false, linkedStudentId: savedStudent.id });
        }
      } else {
        void syncDocToCloud('accounts', session.id, { onboardingRequired: false, linkedStudentId: savedStudent.id });
      }
    }

    router.push(nextFlow === 'student-test' ? `/assessment?student=${savedStudent.id}&flow=student` : `/survey?student=${savedStudent.id}&flow=parent`);
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
                  : 'بعد حفظ البيانات ينتقل ولي الأمر مباشرة إلى الاستبيان الشامل. يتعرف النظام تلقائياً على أبنائك المسجلين ويربط بياناتهم وصورهم بحسابك.'}
              </p>
            </div>
          </div>
        </header>

        <SyncStatus />

        <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <h2 className="mb-5 text-xl font-black text-slate-950">
              {nextFlow === 'student-test' ? 'بيانات الطالب وولي الأمر' : 'بيانات ولي الأمر'}
            </h2>
            <div className="grid gap-5 md:grid-cols-2">
              {nextFlow === 'student-test' && (
                <>
                  <Field label="اسم الطالب" placeholder="الاسم الرباعي" value={student.fullName} onChange={(value) => handleFieldChange('fullName', value)} required />
                  <Field label="رقم الهوية / الإقامة" value={student.nationalId} onChange={(value) => handleFieldChange('nationalId', value)} />

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
                </>
              )}

              <Field label="اسم ولي الأمر" placeholder="الاسم ثلاثي أو رباعي" value={student.parentName} onChange={(value) => handleFieldChange('parentName', value)} required />
              <Field label="هاتف ولي الأمر" type="tel" placeholder="05xxxxxxxx أو 01xxxxxxxxx" value={student.parentPhone} onChange={(value) => handleFieldChange('parentPhone', value)} required />
              <Field label="رقم الهوية / الإقامة" placeholder="رقم الهوية الوطنية أو الإقامة" value={student.nationalId} onChange={(value) => handleFieldChange('nationalId', value)} />

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
            </div>
            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-black text-slate-700">ملاحظات أولية</span>
              <textarea value={student.notes} onChange={(event) => handleFieldChange('notes', event.target.value)} className="min-h-28 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700" placeholder="مثال: صعوبة قراءة، تشتت، تأخر نطق، حساسية صوت..." />
            </label>
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-32 lg:self-start">
            {nextFlow === 'student-test' ? (
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
            ) : (
              <div className="rounded-xl border border-teal-200 bg-teal-50/90 p-5 text-right mb-5 shadow-2xs">
                <div className="flex items-center gap-2 mb-2 text-teal-900 font-black text-sm">
                  <span>🔗</span>
                  <h4>مزامنة عائلية ذكية</h4>
                </div>
                <p className="text-xs font-bold leading-6 text-teal-800">
                  يتعرف النظام تلقائياً على أبنائك المسجلين عبر الاسم ورقم الهاتف، ويربط كافة الصور والجداول والتقارير بحسابك تلقائياً دون الحاجة لرفع صورة أو تكرار التسجيل.
                </p>
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
                : nextFlow === 'student-test' ? 'حفظ وفتح اختبار الطالب' : 'حفظ والانتقال للاستبيان'}
            </button>
          </aside>
        </form>
      </main>
      {loading && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/82 text-white backdrop-blur-md">
          <div className="motion-scale-in rounded-lg border border-white/15 bg-white/10 p-7 text-center shadow-2xl">
            <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-teal-300" />
            <p className="mt-4 text-lg font-black">تم حفظ البيانات</p>
            <p className="mt-1 text-sm font-bold text-white/70">
              {nextFlow === 'student-test' ? 'جاري فتح اختبار الطالب المناسب للصف.' : 'جاري فتح استبيان ولي الأمر الشامل.'}
            </p>
          </div>
        </div>
      )}
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
