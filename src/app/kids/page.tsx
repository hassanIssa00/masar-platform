'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  BookOpen,
  Brain,
  Car,
  ClipboardList,
  Crosshair,
  Gamepad2,
  KeyRound,
  LogOut,
  Music2,
  Palette,
  Play,
  Route,
  ShieldCheck,
  Star,
  Trophy,
  UserRound,
} from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { curriculumPrograms } from '@/data/curriculum';
import { games } from '@/data/games';
import { clearSession, getReports, getSession, getStudents, ReportRecord, StudentRecord } from '@/lib/localDb';
import { saveCredential } from '@/lib/auth';

export default function KidsDashboard() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <KidsDashboardContent />
    </Suspense>
  );
}

function KidsDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [session, setSessionState] = useState<ReturnType<typeof getSession>>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const currentSession = getSession();
      if (currentSession?.role === 'doctor' || currentSession?.role === 'specialist' || currentSession?.role === 'teacher') {
        router.push('/dashboard');
        return;
      }

      const studentId = searchParams.get('student') ?? localStorage.getItem('masar.current-student-id');
      const currentStudent = getStudents().find((item) => item.id === studentId) ?? null;
      setStudent(currentStudent);
      setReports(studentId ? getReports().filter((report) => report.studentId === studentId) : []);
      setSessionState(currentSession);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [router, searchParams]);

  const assignedSlugs = useMemo(() => {
    if (!student) return [];
    return student.assignedPrograms || (student.assignedProgram ? [student.assignedProgram] : []);
  }, [student]);

  const assignedProgramsList = useMemo(() => {
    return curriculumPrograms.filter((program) => assignedSlugs.includes(program.slug));
  }, [assignedSlugs]);

  const status = getReviewStatus(student, assignedProgramsList.length > 0);
  const visibleReports = useMemo(
    () =>
      reports
        .filter((report) => ['survey-answers', 'clinical-analysis', 'student-assessment-answers', 'student-assessment-analysis'].includes(report.type))
        .slice(0, 4),
    [reports],
  );

  const updatePassword = () => {
    if (!session) {
      setPasswordMessage('سجل الدخول أولا لتغيير كلمة المرور.');
      return;
    }

    if (newPassword.trim().length < 6) {
      setPasswordMessage('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف.');
      return;
    }

    saveCredential(
      {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
        createdAt: new Date().toISOString(),
      },
      newPassword,
    );
    setNewPassword('');
    setPasswordMessage('تم تحديث كلمة المرور لهذا الحساب المحلي.');
  };

  const logout = () => {
    clearSession();
    router.push('/auth/login');
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-[1480px] gap-5 px-4 py-4 lg:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <BrandMark size="sm" />

          <div className="mt-6 rounded-lg bg-slate-950 p-4 text-white">
            <div className="flex items-center gap-3">
              <StudentAvatar student={student} />
              <div className="min-w-0">
                <p className="truncate text-lg font-black">{student?.fullName ?? 'طالب مسار'}</p>
                <p className="mt-1 text-xs font-bold text-white/65">{student?.grade ?? 'الصف غير محدد'}</p>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-white/8 p-3">
              <p className="text-xs font-black text-white/60">حالة الملف</p>
              <p className="mt-1 text-sm font-black">{status.label}</p>
              {assignedProgramsList.length > 0 && (
                <p className="mt-1 text-xs font-bold text-teal-300">
                  تم اعتماد ({assignedProgramsList.length}) مسارات تعليمية 🎓
                </p>
              )}
            </div>
          </div>

          <nav className="mt-5 grid gap-2">
            <SideLink href="#student-program" icon={<BookOpen size={18} />} label={`المسارات المعتمدة (${assignedProgramsList.length})`} />
            <SideLink href="#student-games" icon={<Gamepad2 size={18} />} label="الألعاب التفاعلية" />
            <SideLink href="#student-profile" icon={<UserRound size={18} />} label="بيانات الطالب" />
            <SideLink href="#student-reports" icon={<ClipboardList size={18} />} label="حالة التقارير" />
          </nav>

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black text-slate-500">الحساب الحالي</p>
            <p className="mt-1 truncate text-sm font-black text-slate-900">{session?.name ?? 'جلسة محلية'}</p>
            <p className="mt-1 truncate text-xs font-bold text-slate-500">{session?.email ?? 'لم يتم تسجيل بريد'}</p>
          </div>

          <button onClick={logout} className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
            <LogOut size={17} />
            تسجيل الخروج
          </button>
        </aside>

        <main className="min-w-0 space-y-5 pb-8">
          <header className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="p-5 md:p-7">
                <p className="text-sm font-black text-teal-800">صفحة الطالب</p>
                <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 md:text-5xl">
                  أهلا {student?.fullName ?? 'بك'}، ملفك جاهز للمراجعة
                </h1>
                <p className="mt-4 max-w-3xl text-sm font-bold leading-8 text-slate-600">
                  هنا تظهر بيانات الطالب والألعاب الآمنة وحالة المسارات المعتمدة. نتائج الاستبيان واختبار الطالب محفوظة لد. إسماعيل ولا تظهر كتشخيص داخل تجربة الطالب.
                </p>
                <div className={`mt-5 rounded-lg border p-4 ${status.className}`}>
                  <p className="text-sm font-black">{status.description}</p>
                </div>
              </div>
              {/* Student Photo & Profile Card */}
              <div className="grid min-h-48 place-items-center bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 p-6 text-white text-center border-r lg:border-r-0 lg:border-l border-slate-800">
                <div className="flex flex-col items-center gap-3">
                  {student?.photoUrl ? (
                    <div
                      className="h-28 w-28 rounded-2xl bg-cover bg-center ring-4 ring-teal-500/40 shadow-xl border-2 border-white/20"
                      style={{ backgroundImage: `url(${student.photoUrl})` }}
                    />
                  ) : (
                    <div className="grid h-28 w-28 place-items-center rounded-2xl bg-teal-800/80 text-teal-200 ring-4 ring-teal-500/30 border-2 border-teal-400/40 shadow-xl">
                      <UserRound size={56} />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-black text-white">{student?.fullName || 'اسم الطالب'}</p>
                    <p className="mt-0.5 text-xs font-bold text-teal-300">{student?.grade || 'الصف الدراسي'}</p>
                    <span className="mt-2 inline-block rounded-full bg-white/10 px-3 py-1 text-[10px] font-black text-white/80 ring-1 ring-white/15">
                      صورة الطالب المعتمدة 📸
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* ══ ASSIGNED PROGRAMS SECTION ══ */}
          <section id="student-program" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber-50 text-amber-700">
                  <ShieldCheck size={24} />
                </span>
                <div>
                  <p className="text-xs font-black text-slate-500">المسارات العلاجية المعتمدة من د. إسماعيل</p>
                  <h2 className="text-xl font-black text-slate-950">
                    {assignedProgramsList.length > 0
                      ? `المسارات المعتمدة لك (${assignedProgramsList.length})`
                      : 'لم يتم اعتماد مسار بعد'}
                  </h2>
                </div>
              </div>
            </div>

            {assignedProgramsList.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {assignedProgramsList.map((program) => (
                  <div
                    key={program.slug}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4 shadow-2xs hover:border-teal-600 transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-teal-100 text-teal-900 px-3 py-1 text-xs font-black">
                          مسار معتمد ✓
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {program.modules.length} وحدات تدريبية
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-slate-950">{program.title}</h3>
                      <p className="text-xs font-bold text-slate-600 leading-relaxed">{program.promise}</p>
                    </div>

                    <Link
                      href={`/programs/${program.slug}`}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 py-3 px-4 text-xs font-black text-white hover:bg-teal-800 transition shadow-sm"
                    >
                      <BookOpen size={16} />
                      <span>فتح المنهج الدراسي الكامل لمسار {program.shortTitle}</span>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-5 text-center text-amber-900 font-bold text-sm">
                في انتظار مراجعة د. إسماعيل عيسى واعتماد المسارات والبرامج المناسبة لطالك.
              </div>
            )}
          </section>

          {/* ══ STUDENT PROFILE & SECURITY SECTION ══ */}
          <section id="student-profile" className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-teal-50 text-teal-800">
                  <UserRound size={22} />
                </span>
                <div>
                  <p className="text-xs font-black text-slate-500">ملف الطالب</p>
                  <h2 className="text-xl font-black text-slate-950">البيانات الأساسية</h2>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <InfoItem label="اسم الطالب" value={student?.fullName} />
                <InfoItem label="الصف / المسار" value={student?.grade} />
                <InfoItem label="رقم الهوية / الإقامة" value={student?.nationalId} />
                <InfoItem label="تاريخ الميلاد" value={formatDate(student?.dateOfBirth)} />
                <InfoItem label="اسم ولي الأمر" value={student?.parentName} />
                <InfoItem label="هاتف ولي الأمر" value={student?.parentPhone} />
              </div>
              <div className="mt-3 rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-500">ملاحظات أولية</p>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-700">{student?.notes || 'لا توجد ملاحظات مسجلة.'}</p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-800">
                  <KeyRound size={22} />
                </span>
                <div>
                  <p className="text-xs font-black text-slate-500">الأمان</p>
                  <h2 className="text-xl font-black text-slate-950">بيانات الحساب</h2>
                </div>
              </div>
              <div className="space-y-3">
                <InfoItem label="اسم الحساب" value={session?.name} />
                <InfoItem label="البريد المستخدم" value={session?.email} />
                <label className="block">
                  <span className="mb-2 block text-xs font-black text-slate-500">كلمة مرور جديدة</span>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700"
                    placeholder="اكتب كلمة مرور جديدة"
                  />
                </label>
                <button onClick={updatePassword} className="w-full rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800">
                  تحديث كلمة المرور
                </button>
                {passwordMessage && <p className="text-xs font-black leading-6 text-teal-800">{passwordMessage}</p>}
              </div>
            </div>
          </section>

          <section id="student-reports" className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-indigo-50 text-indigo-800">
                <ClipboardList size={22} />
              </span>
              <div>
                <p className="text-xs font-black text-slate-500">حالة التقارير</p>
                <h2 className="text-xl font-black text-slate-950">ما تم إرساله للدكتور</h2>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {visibleReports.length ? (
                visibleReports.map((report) => (
                  <div key={report.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-black text-slate-950">{report.program}</p>
                    <p className="mt-2 text-xs font-bold text-slate-500">تاريخ الحفظ: {formatDate(report.date)}</p>
                    <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-black text-teal-800">
                      {report.status === 'completed' ? 'تمت المراجعة' : 'قيد مراجعة د. إسماعيل'}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-600">لم يتم حفظ تقارير لهذا الطالب بعد.</p>
              )}
            </div>
          </section>

          <section id="student-games">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-black text-teal-800">الألعاب</p>
                <h2 className="text-2xl font-black text-slate-950">تدريب آمن بدون تشخيص ظاهر</h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {games.map((game) => (
                <Link
                  key={game.slug}
                  href={`/games/${game.slug}?student=${student?.id ?? ''}`}
                  className="group overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className="relative min-h-44 overflow-hidden p-5 text-white" style={{ background: `linear-gradient(135deg, ${game.color}, #020617)` }}>
                    <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(90deg,rgba(255,255,255,.22)_1px,transparent_1px),linear-gradient(rgba(255,255,255,.22)_1px,transparent_1px)] [background-size:22px_22px]" />
                    <div className="absolute -bottom-10 -left-8 h-32 w-32 rounded-[28px] bg-white/12 rotate-12" />
                    <div className="relative z-10 flex items-start justify-between gap-3">
                      <span className="grid h-14 w-14 place-items-center rounded-lg bg-white text-slate-950 shadow-lg">
                        {getGameIcon(game.kind)}
                      </span>
                      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white ring-1 ring-white/20">مهمة قصيرة</span>
                    </div>
                    <div className="relative z-10 mt-8">{renderGamePreview(game.kind)}</div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-black text-slate-950">{game.title}</h3>
                        <p className="mt-2 min-h-12 text-sm font-bold leading-6 text-slate-600">{game.description}</p>
                      </div>
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-white transition group-hover:scale-110" style={{ backgroundColor: game.color }}>
                        <Play size={20} fill="currentColor" />
                      </span>
                    </div>
                    <div className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-3">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-500">
                        <Trophy size={15} />
                        المهارة
                      </div>
                      <p className="mt-1 text-sm font-black text-slate-800">{game.skill}</p>
                      <div className="h-2 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full transition-all duration-500 group-hover:w-full" style={{ width: '62%', backgroundColor: game.color }} />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function getGameIcon(kind: string) {
  if (kind === 'memory') return <Brain size={26} />;
  if (kind === 'racer') return <Car size={26} />;
  if (kind === 'collector') return <Star size={26} />;
  if (kind === 'paint') return <Palette size={26} />;
  if (kind === 'snake') return <Route size={26} />;
  if (kind === 'piano') return <Music2 size={26} />;
  return <Crosshair size={26} />;
}

function renderGamePreview(kind: string) {
  if (kind === 'memory') {
    return (
      <div className="grid max-w-48 grid-cols-4 gap-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <span key={index} className="aspect-square rounded-md bg-white/85 shadow-sm transition group-hover:-translate-y-1" />
        ))}
      </div>
    );
  }

  if (kind === 'racer') {
    return (
      <div className="relative h-20 max-w-48 overflow-hidden rounded-lg bg-black/25 ring-1 ring-white/20">
        <span className="absolute inset-y-0 right-1/3 border-r-2 border-dashed border-white/35" />
        <span className="absolute inset-y-0 right-2/3 border-r-2 border-dashed border-white/35" />
        <span className="absolute bottom-3 right-1/2 h-9 w-8 translate-x-1/2 rounded-md bg-white shadow-lg" />
      </div>
    );
  }

  if (kind === 'piano') {
    return (
      <div className="flex h-20 max-w-56 items-end gap-1 rounded-lg bg-white/95 p-2">
        {Array.from({ length: 7 }).map((_, index) => (
          <span key={index} className="h-full flex-1 rounded-b bg-slate-100 shadow-sm" />
        ))}
      </div>
    );
  }

  if (kind === 'paint') {
    return (
      <div className="relative h-20 max-w-56 rounded-lg bg-white/95">
        <span className="absolute right-5 top-5 h-3 w-28 rotate-[-8deg] rounded-full bg-current opacity-70" />
        <span className="absolute bottom-5 left-8 h-4 w-20 rotate-12 rounded-full bg-current opacity-50" />
      </div>
    );
  }

  return (
    <div className="relative h-20 max-w-56">
      <span className="absolute right-2 top-2 h-10 w-10 rounded-full bg-white shadow-lg" />
      <span className="absolute left-16 top-7 h-8 w-8 rounded-full bg-white/75 shadow-lg" />
      <span className="absolute bottom-1 right-24 h-12 w-12 rounded-full bg-white/90 shadow-lg" />
    </div>
  );
}

function StudentAvatar({ student }: { student: StudentRecord | null }) {
  if (student?.photoUrl) {
    return (
      <span
        aria-label={student.fullName}
        role="img"
        className="h-14 w-14 shrink-0 rounded-lg bg-cover bg-center ring-2 ring-white/20"
        style={{ backgroundImage: `url(${student.photoUrl})` }}
      />
    );
  }

  return (
    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-white text-xl font-black text-slate-950">
      {(student?.fullName ?? 'ط').trim().slice(0, 1)}
    </span>
  );
}

function SideLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <a href={href} className="inline-flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
      <span className="text-teal-700">{icon}</span>
      {label}
    </a>
  );
}

function InfoItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-black text-slate-900">{value || 'غير مسجل'}</p>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ar-SA');
}

function getReviewStatus(student: StudentRecord | null, hasProgram: boolean) {
  if (hasProgram || student?.reviewStatus === 'program-assigned') {
    return {
      label: 'تم اعتماد المسار',
      description: 'د. إسماعيل اعتمد مسارا تعليميا لهذا الطالب، ويمكن فتحه من صفحة الطالب.',
      className: 'border-teal-100 bg-teal-50 text-teal-950',
    };
  }

  if (student?.reviewStatus === 'awaiting-survey') {
    return {
      label: 'بانتظار استكمال الاستبيان',
      description: 'يجب استكمال استبيان ولي الأمر ثم اختبار الطالب قبل اعتماد أي مسار.',
      className: 'border-amber-100 bg-amber-50 text-amber-900',
    };
  }

  return {
    label: 'قيد مراجعة الدكتور',
    description: 'تم إرسال ملف الطالب وتقاريره لد. إسماعيل، والطالب يستخدم الألعاب فقط حتى اعتماد المسار.',
    className: 'border-blue-100 bg-blue-50 text-blue-950',
  };
}
