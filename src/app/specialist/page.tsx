'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, ArrowLeft, ClipboardCheck, FileText, Target, UsersRound } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import SyncStatus from '@/components/SyncStatus';
import { ActivityRecord, getActivities, getReports, getStudents, ReportRecord, StudentRecord } from '@/lib/localDb';

export default function SpecialistDashboard() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'iep' | 'activity'>('overview');

  useEffect(() => {
    queueMicrotask(() => {
      setStudents(getStudents());
      setReports(getReports());
      setActivities(getActivities());
    });
  }, []);

  const pendingReports = reports.filter((report) => report.status === 'pending');
  const lowScoreReports = reports.filter((report) => report.score < 70);
  const averageScore = useMemo(() => {
    if (!reports.length) return 0;
    return Math.round(reports.reduce((total, report) => total + report.score, 0) / reports.length);
  }, [reports]);

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-black text-teal-800">لوحة الأخصائي</p>
                <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">متابعة الحالات والخطط من نفس قاعدة بيانات المنصة</h1>
                <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-600">
                  تعرض هذه اللوحة الطلاب الحقيقيين، تقاريرهم، أهداف الخطة الفردية، والحالات التي تحتاج مراجعة علاجية.
                </p>
              </div>
              <Link href="/assessment" className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white hover:bg-teal-800">
                بدء تقييم جديد
                <ArrowLeft size={16} />
              </Link>
            </div>
          </header>

          <SyncStatus />

          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {[
              ['overview', 'نظرة عامة'],
              ['students', 'ملفات الطلاب'],
              ['iep', 'أهداف IEP'],
              ['activity', 'سجل النشاط'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`shrink-0 rounded-lg border px-5 py-3 text-sm font-black ${activeTab === key ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'الطلاب', value: students.length, icon: UsersRound, note: 'ملفات محفوظة فعلياً' },
                { label: 'التقارير', value: reports.length, icon: FileText, note: 'تقارير سريرية وتعليمية' },
                { label: 'مراجعة عاجلة', value: lowScoreReports.length, icon: Target, note: 'نتائج أقل من 70%' },
                { label: 'متوسط الأداء', value: `${averageScore}%`, icon: Activity, note: 'من كل التقارير' },
              ].map(({ label, value, icon: Icon, note }) => (
                <article key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <Icon className="text-teal-700" size={22} />
                  <p className="mt-4 text-sm font-black text-slate-500">{label}</p>
                  <p className="mt-2 text-4xl font-black text-slate-950">{value}</p>
                  <p className="mt-2 text-xs font-bold text-slate-500">{note}</p>
                </article>
              ))}
            </section>
          )}

          {activeTab === 'students' && (
            <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">ملفات الطلاب</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[760px] text-right">
                  <thead className="border-b border-slate-200 text-xs font-black text-slate-500">
                    <tr>
                      <th className="py-3">الطالب</th>
                      <th className="py-3">الصف</th>
                      <th className="py-3">آخر تقرير</th>
                      <th className="py-3">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => {
                      const report = reports.find((item) => item.studentId === student.id || item.studentName === student.fullName);
                      return (
                        <tr key={student.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-4 font-black text-slate-950">{student.fullName}</td>
                          <td className="py-4 text-sm font-bold text-slate-600">{student.grade}</td>
                          <td className="py-4 text-sm font-bold text-slate-700">{report ? `${report.program} - ${report.score}%` : 'لا يوجد تقرير'}</td>
                          <td className="py-4">
                            {report ? (
                              <Link href={`/reports?report=${report.id}`} className="text-sm font-black text-teal-800 hover:underline">فتح التقرير</Link>
                            ) : (
                              <Link href="/assessment" className="text-sm font-black text-teal-800 hover:underline">بدء تقييم</Link>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {students.length === 0 && <EmptyState text="لا توجد ملفات طلاب بعد. ابدأ بتقييم أو إضافة طالب." />}
            </section>
          )}

          {activeTab === 'iep' && (
            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              {(reports.length ? reports : pendingReports).map((report) => (
                <article key={report.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-sm font-black text-teal-800">{report.studentName}</p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">{report.program}</h2>
                  <div className="mt-4 grid gap-2">
                    {report.domains.slice(0, 3).map((domain) => (
                      <div key={domain.name} className="rounded-lg bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-slate-950">{domain.name}</p>
                          <span className="text-xs font-black text-teal-800">{domain.score}%</span>
                        </div>
                        <p className="mt-2 text-xs font-bold leading-6 text-slate-600">{domain.note}</p>
                      </div>
                    ))}
                  </div>
                  <Link href={`/reports?report=${report.id}`} className="mt-4 inline-flex rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white">عرض خطة التقرير</Link>
                </article>
              ))}
              {reports.length === 0 && <EmptyState text="ستظهر أهداف IEP تلقائياً بعد حفظ أول تقرير." />}
            </section>
          )}

          {activeTab === 'activity' && (
            <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">سجل النشاط والمزامنة</h2>
              <div className="mt-4 grid gap-3">
                {activities.map((activity) => (
                  <article key={activity.id} className="rounded-lg bg-slate-50 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <h3 className="font-black text-slate-950">{activity.title}</h3>
                      <span className="text-xs font-bold text-slate-500">{new Date(activity.createdAt).toLocaleString('ar-SA')}</span>
                    </div>
                    <p className="mt-2 text-sm font-bold leading-7 text-slate-600">{activity.detail}</p>
                  </article>
                ))}
              </div>
              {activities.length === 0 && <EmptyState text="لا يوجد نشاط محفوظ بعد." />}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <ClipboardCheck className="mx-auto text-slate-500" size={30} />
      <p className="mt-3 text-sm font-bold leading-7 text-slate-600">{text}</p>
    </div>
  );
}
