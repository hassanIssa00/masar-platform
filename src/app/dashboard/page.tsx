'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarClock, ClipboardCheck, FileText, Gauge, Target, TrendingUp, UserRoundPlus } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { curriculumPrograms } from '@/data/curriculum';
import { getReports, getStudents, getSurveys, ReportRecord, StudentRecord } from '@/lib/localDb';

export default function DashboardPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [surveysCount, setSurveysCount] = useState(0);

  useEffect(() => {
    queueMicrotask(() => {
      setStudents(getStudents());
      setReports(getReports());
      setSurveysCount(getSurveys().length);
    });
  }, []);

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
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-black text-teal-800">مركز التشغيل العلاجي</p>
                <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">قرارات مبنية على قياس، لا على الانطباع</h1>
                <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-600">
                  تابع الطلاب حسب المهارة الحالية، دقة الأداء، نوع المساعدة، وقرار الجلسة التالية. الواجهة مصممة للاستخدام اليومي السريع على المكتب والموبايل.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link href="/student/new" className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                  <UserRoundPlus size={17} />
                  إضافة طالب
                </Link>
                <Link href="/student/new" className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50">
                  <ClipboardCheck size={17} />
                  اختبار سريع
                </Link>
              </div>
            </div>
          </header>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                  <p className="text-sm font-black text-slate-500">جلسات اليوم</p>
                  <h2 className="text-xl font-black text-slate-950">هدف واحد لكل جلسة</h2>
                </div>
              </div>
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
                <p className="font-black text-slate-950">لا توجد جلسات مجدولة اليوم</p>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-600">عند إضافة نظام الجلسات الحقيقي سيظهر هنا هدف الجلسة والوقت والطالب.</p>
              </div>
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
