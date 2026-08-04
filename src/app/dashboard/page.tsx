'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarClock, ClipboardCheck, FileText, Gamepad2, Gauge, Heart, Star, Target, TrendingUp, UserRoundPlus } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import SyncStatus from '@/components/SyncStatus';
import { curriculumPrograms } from '@/data/curriculum';
import { useRouter } from 'next/navigation';
import { ActivityRecord, getActivities, getReports, getSession, getStudents, getSurveys, ReportRecord, StudentRecord } from '@/lib/localDb';
import { trackEvent } from '@/lib/analyticsTracker';

export default function DashboardPage() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [surveysCount, setSurveysCount] = useState(0);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== 'doctor') {
      router.replace('/login');
      return;
    }
    queueMicrotask(() => {
      setStudents(getStudents());
      setReports(getReports());
      setActivities(getActivities());
      setSurveysCount(getSurveys().length);
    });
    // Track dashboard visit
    trackEvent('visit', { userId: session.id, userName: session.name, userRole: session.role, page: '/dashboard' });
  }, [router]);

  const averageScore = useMemo(() => {
    if (reports.length === 0) return 0;
    return Math.round(reports.reduce((total, report) => total + report.score, 0) / reports.length);
  }, [reports]);

  const stats = [
    { label: 'طلاب محفوظون', value: String(students.length), note: students.length ? 'من بياناتك الفعلية' : 'ابدأ بإضافة أول طالب', icon: Gauge },
    { label: 'جلسات اليوم', value: '0', note: 'لم يتم إنشاء جدول جلسات بعد', icon: CalendarClock },
    { label: 'تقارير مكتملة', value: String(reports.length), note: `${surveysCount} استبيان محفوظ`, icon: ClipboardCheck },
    { label: 'متوسط الأداء', value: reports.length ? `${averageScore}%` : '0%', note: reports.length ? 'محسوب من التقارير المحفوظة' : 'لا توجد درجات بعد', icon: TrendingUp },
  ];

  const latestReports = reports.slice(0, 5);

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <div className="flex" dir="rtl">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-4 py-5 lg:px-8">

          {/* ✨ WELCOME HERO — Dr. Ismail */}
          <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-l from-teal-700 via-teal-800 to-slate-900 p-5 shadow-xl text-white" dir="rtl">
            <div className="flex items-center gap-4">
              {/* Avatar placeholder */}
              <div className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden ring-2 ring-white/30 shadow-lg bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center">
                <span className="text-2xl font-black text-white">د</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-teal-300 tracking-wider">مرحباً بك في منصة مَسَار 👋</p>
                <h1 className="mt-0.5 text-xl font-black text-white leading-snug">د. إسماعيل عيسى</h1>
                <p className="mt-1 text-xs font-bold text-teal-200/80">استشاري التعليم العلاجي وصعوبات التعلم</p>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
                <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-teal-100">
                  <Star size={12} className="text-amber-400" />
                  {students.length} طالب مسجل
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-teal-100">
                  <Heart size={12} className="text-rose-400" />
                  {reports.length} تقرير مكتمل
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Link href="/student/new" className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition px-3 py-2.5 text-xs font-black text-white">
                <UserRoundPlus size={14} />
                إضافة طالب
              </Link>
              <Link href="/assessment" className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition px-3 py-2.5 text-xs font-black text-white">
                <ClipboardCheck size={14} />
                اختبار مستوى
              </Link>
              <Link href="/parents" className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition px-3 py-2.5 text-xs font-black text-white">
                <FileText size={14} />
                إرسال تقارير
              </Link>
            </div>
          </div>

          <SyncStatus />

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, note, icon: Icon }) => (
              <article key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-500">{label}</p>
                    <p className="mt-3 text-4xl font-black text-slate-950">{value}</p>
                  </div>
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-teal-50 text-teal-800">
                    <Icon size={22} />
                  </span>
                </div>
                <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{note}</p>
              </article>
            ))}
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-slate-500">حالات تحتاج متابعة</p>
                  <h2 className="text-xl font-black text-slate-950">أولوية الجلسة التالية</h2>
                </div>
                <Link href="/reports" className="inline-flex items-center gap-1 text-sm font-black text-teal-800">
                  التقارير
                  <ArrowLeft size={15} />
                </Link>
              </div>

              <div className="grid gap-3 md:hidden">
                {latestReports.map((report) => (
                  <StudentRowCard key={report.id} report={report} />
                ))}
              </div>

              {latestReports.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <p className="font-black text-slate-950">لا توجد حالات محفوظة بعد</p>
                  <p className="mt-2 text-sm font-bold leading-7 text-slate-600">الداشبورد لا يعرض بيانات وهمية. أضف طالبًا أو استبيانًا وسيظهر هنا تلقائيًا.</p>
                  <Link href="/student/new" className="mt-4 inline-flex rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white">
                    إضافة أول طالب
                  </Link>
                </div>
              ) : (
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[760px] text-right">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-black text-slate-500">
                      <th className="py-3">الطالب</th>
                      <th className="py-3">المسار</th>
                      <th className="py-3">أولوية التدخل</th>
                      <th className="py-3">القرار</th>
                      <th className="py-3">التقدم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestReports.map((report) => (
                      <tr key={report.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-4">
                          <p className="font-black text-slate-950">{report.studentName}</p>
                          <p className="text-sm font-bold text-slate-500">{report.grade}</p>
                        </td>
                        <td className="py-4 text-sm font-bold text-slate-800">{report.program}</td>
                        <td className="py-4 text-sm font-bold text-slate-600">{report.summary}</td>
                        <td className="py-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{report.status === 'completed' ? 'مكتمل' : 'قيد المراجعة'}</span>
                        </td>
                        <td className="py-4">
                          <Progress value={report.score} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white">
                  <Target size={20} />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-500">سجل النشاط</p>
                  <h2 className="text-xl font-black text-slate-950">آخر عمليات المنصة</h2>
                </div>
              </div>
              {activities.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
                  <p className="font-black text-slate-950">لا توجد عمليات محفوظة بعد</p>
                  <p className="mt-2 text-sm font-bold leading-7 text-slate-600">كل طالب أو تقرير أو استبيان جديد سيظهر هنا تلقائياً.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {activities.slice(0, 5).map((activity) => (
                    <article key={activity.id} className="rounded-lg bg-slate-50 p-3">
                      <p className="text-sm font-black text-slate-950">{activity.title}</p>
                      <p className="mt-1 text-xs font-bold leading-6 text-slate-600">{activity.detail}</p>
                      <p className="mt-2 text-[11px] font-bold text-slate-400">{new Date(activity.createdAt).toLocaleString('ar-SA')}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-black text-slate-500">مكتبة المسارات</p>
                <h2 className="text-xl font-black text-slate-950">كل مسار مرتبط باختبار وتدريب وتقرير</h2>
              </div>
              <FileText className="text-slate-400" size={22} />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {curriculumPrograms.map((program) => (
                <Link key={program.slug} href={`/programs/${program.slug}`} className="rounded-lg border border-slate-200 p-4 transition hover:bg-slate-50">
                  <span className="mb-3 block h-2 rounded-full" style={{ backgroundColor: program.color }} />
                  <h3 className="font-black text-slate-950">{program.shortTitle}</h3>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{program.modules.length} مراحل، {program.measures.length} مؤشرات قياس</p>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function StudentRowCard({ report }: { report: ReportRecord }) {
  return (
    <article className="rounded-lg bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-950">{report.studentName}</h3>
          <p className="text-sm font-bold text-slate-500">{report.grade} · {report.program}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700 ring-1 ring-slate-200">{report.score}%</span>
      </div>
      <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{report.summary}</p>
      <div className="mt-3">
        <Progress value={report.score} />
      </div>
    </article>
  );
}

function Progress({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-full min-w-28 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-teal-700" style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-sm font-black text-slate-700">{value}%</span>
    </div>
  );
}
