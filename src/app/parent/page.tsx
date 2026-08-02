'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardCheck, FileText, Home, UserRoundPlus } from 'lucide-react';
import Navbar from '@/components/Navbar';
import SyncStatus from '@/components/SyncStatus';
import { getReports, getSession, getStudents, getSurveys, ReportRecord, StudentRecord, SurveySubmission } from '@/lib/localDb';

export default function ParentDashboard() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [surveys, setSurveys] = useState<SurveySubmission[]>([]);
  const [parentName, setParentName] = useState('ولي الأمر');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  useEffect(() => {
    queueMicrotask(() => {
      const nextStudents = getStudents();
      setStudents(nextStudents);
      setReports(getReports());
      setSurveys(getSurveys());
      setParentName(getSession()?.name ?? 'ولي الأمر');
      setSelectedStudentId(nextStudents[0]?.id ?? '');
    });
  }, []);

  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? students[0];
  const studentReports = useMemo(
    () => reports.filter((report) => !selectedStudent || report.studentId === selectedStudent.id || report.studentName === selectedStudent.fullName),
    [reports, selectedStudent],
  );
  const latestReport = studentReports[0];
  const latestSurvey = surveys.find((survey) => !selectedStudent || survey.studentId === selectedStudent.id || survey.studentName === selectedStudent.fullName);

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-black text-teal-800">بوابة ولي الأمر</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">متابعة الطالب من نفس تقارير الدكتور</h1>
              <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-600">
                أهلاً {parentName}. هذه الصفحة تعرض البيانات الفعلية المحفوظة في المنصة: الاختبار، التقرير، توصيات المنزل، وحالة المتابعة.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/auth/login" className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">تبديل الحساب</Link>
              <Link href="/assessment" className="rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white hover:bg-teal-800">بدء اختبار جديد</Link>
            </div>
          </div>
        </header>

        <SyncStatus />

        {students.length === 0 ? (
          <section className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <UserRoundPlus className="mx-auto text-slate-500" size={36} />
            <h2 className="mt-4 text-2xl font-black text-slate-950">لا يوجد طالب محفوظ بعد</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-slate-600">
              بعد تسجيل الطالب أو إنهاء اختبار تحديد المستوى ستظهر هنا الخطة والتوصيات المنزلية تلقائياً.
            </p>
            <Link href="/assessment" className="mt-5 inline-flex rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white">
              إجراء اختبار تحديد المستوى
            </Link>
          </section>
        ) : (
          <section className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black text-slate-950">الأبناء المسجلون</h2>
              <div className="mt-4 grid gap-3">
                {students.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`rounded-lg border p-4 text-right transition ${selectedStudent?.id === student.id ? 'border-teal-700 bg-teal-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  >
                    <p className="font-black text-slate-950">{student.fullName}</p>
                    <p className="mt-1 text-sm font-bold text-slate-500">{student.grade}</p>
                  </button>
                ))}
              </div>
            </aside>

            <div className="grid gap-6">
              <section className="grid gap-4 md:grid-cols-3">
                {[
                  { label: 'آخر نتيجة', value: latestReport ? `${latestReport.score}%` : 'لم يبدأ', icon: ClipboardCheck },
                  { label: 'التقارير', value: String(studentReports.length), icon: FileText },
                  { label: 'الاستبيانات', value: latestSurvey ? 'مستلم' : 'غير مستلم', icon: Home },
                ].map(({ label, value, icon: Icon }) => (
                  <article key={label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <Icon className="text-teal-700" size={22} />
                    <p className="mt-4 text-sm font-black text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
                  </article>
                ))}
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-black text-teal-800">آخر تقرير علاجي</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">{latestReport ? latestReport.program : 'لم يتم إصدار تقرير بعد'}</h2>
                  </div>
                  {latestReport && (
                    <Link href={`/reports?report=${latestReport.id}`} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white">
                      فتح التقرير
                      <ArrowLeft size={16} />
                    </Link>
                  )}
                </div>
                <p className="mt-4 text-sm font-bold leading-8 text-slate-600">
                  {latestReport ? latestReport.summary : 'أكمل اختبار تحديد المستوى حتى تظهر الخطة العلاجية والتقرير الرسمي هنا.'}
                </p>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">واجب المنزل لهذا الأسبوع</h2>
                <div className="mt-4 grid gap-3">
                  {(latestReport?.recommendations.slice(0, 4) ?? ['ابدأ باختبار تحديد المستوى لتوليد توصيات منزلية مخصصة.']).map((item) => (
                    <p key={item} className="rounded-lg bg-slate-50 p-4 text-sm font-bold leading-7 text-slate-700">{item}</p>
                  ))}
                </div>
              </section>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
