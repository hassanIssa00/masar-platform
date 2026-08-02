'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ClipboardCheck, FileText, Home, MessageSquareText, UserRoundPlus } from 'lucide-react';
import Navbar from '@/components/Navbar';
import SyncStatus from '@/components/SyncStatus';
import { curriculumPrograms } from '@/data/curriculum';
import { getMessages, getReports, getSession, getStudents, MessageRecord, ReportRecord, StudentRecord } from '@/lib/localDb';

export default function ParentDashboard() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [parentName, setParentName] = useState('ولي الأمر');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  useEffect(() => {
    queueMicrotask(() => {
      const nextStudents = getStudents();
      setStudents(nextStudents);
      setReports(getReports());
      setMessages(getMessages());
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
  const studentMessages = messages.filter((message) => selectedStudent && message.studentId === selectedStudent.id).slice(0, 4);
  const assignedProgram = curriculumPrograms.find((program) => program.slug === selectedStudent?.assignedProgram);
  const isUnderDoctorReview = selectedStudent?.reviewStatus === 'awaiting-doctor-review' || latestReport?.status === 'pending';
  const parentReportText = isUnderDoctorReview
    ? 'تم استلام ملف الطالب وإرساله إلى د. إسماعيل. سيتم اعتماد المسار المناسب بعد مراجعة التقرير والإجابات التفصيلية.'
    : latestReport?.summary ?? 'أكمل بيانات الطالب والاستبيان حتى تظهر حالة المتابعة هنا.';

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
              <Link href="/student/new" className="rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white hover:bg-teal-800">إضافة طالب جديد</Link>
            </div>
          </div>
        </header>

        <SyncStatus />

        {students.length === 0 ? (
          <section className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <UserRoundPlus className="mx-auto text-slate-500" size={36} />
            <h2 className="mt-4 text-2xl font-black text-slate-950">لا يوجد طالب محفوظ بعد</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-slate-600">
              أضف بيانات الطفل أولاً، ثم سيظهر استبيان ولي الأمر الشامل ويرسل التقريرين إلى د. إسماعيل للمراجعة.
            </p>
            <Link href="/student/new" className="mt-5 inline-flex rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white">
              إضافة بيانات الطالب
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
                  { label: 'حالة التقرير', value: latestReport ? 'قيد مراجعة الدكتور' : 'لم يبدأ', icon: ClipboardCheck },
                  { label: 'التقارير', value: String(studentReports.length), icon: FileText },
                  { label: 'المسار', value: assignedProgram ? assignedProgram.shortTitle : 'قيد مراجعة الدكتور', icon: Home },
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
                    <p className="text-sm font-black text-teal-800">حالة ملف الطالب</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">
                      {assignedProgram ? `تم اعتماد ${assignedProgram.shortTitle}` : latestReport ? 'قيد مراجعة د. إسماعيل' : 'لم يتم إرسال الاستبيان بعد'}
                    </h2>
                  </div>
                  {latestReport && !isUnderDoctorReview && (
                    <Link href={`/reports?report=${latestReport.id}`} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white">
                      فتح التقرير
                      <ArrowLeft size={16} />
                    </Link>
                  )}
                </div>
                <p className="mt-4 text-sm font-bold leading-8 text-slate-600">
                  {parentReportText}
                </p>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-teal-800">تقارير الطفل</p>
                    <h2 className="text-xl font-black text-slate-950">الملفات التي يرسلها د. إسماعيل</h2>
                  </div>
                  {selectedStudent && (
                    <Link href={`/messages?student=${selectedStudent.id}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">
                      <MessageSquareText size={17} />
                      الرسائل
                    </Link>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {getParentReportSlots(studentReports).map((slot) => (
                    <article key={slot.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <FileText className={slot.report ? 'text-teal-700' : 'text-slate-400'} size={22} />
                      <h3 className="mt-3 font-black text-slate-950">{slot.title}</h3>
                      <p className="mt-2 min-h-12 text-xs font-bold leading-6 text-slate-500">{slot.description}</p>
                      {slot.report ? (
                        <Link href={`/reports?report=${slot.report.id}&mode=parent`} className="mt-4 inline-flex w-full justify-center rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white">
                          فتح التقرير
                        </Link>
                      ) : (
                        <span className="mt-4 inline-flex w-full justify-center rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-400 ring-1 ring-slate-200">
                          لم يرسل بعد
                        </span>
                      )}
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">آخر الرسائل</h2>
                <div className="mt-4 grid gap-3">
                  {studentMessages.length ? studentMessages.map((message) => (
                    <article key={message.id} className="rounded-lg bg-slate-50 p-4">
                      <p className="text-xs font-black text-slate-500">{message.from === 'doctor' ? 'د. إسماعيل' : 'ولي الأمر'}</p>
                      <p className="mt-2 text-sm font-bold leading-7 text-slate-700">{message.body}</p>
                    </article>
                  )) : (
                    <p className="rounded-lg bg-slate-50 p-4 text-sm font-bold text-slate-500">لا توجد رسائل بعد.</p>
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">واجب المنزل لهذا الأسبوع</h2>
                <div className="mt-4 grid gap-3">
                  {(isUnderDoctorReview
                    ? [
                      'اقرأ مع الطفل قصة قصيرة لمدة 5 دقائق بدون تصحيح زائد أو ضغط.',
                      'استخدم لعبة صوتية بسيطة: اسمع الحرف ثم ابحث عن شيء في البيت يبدأ بنفس الصوت.',
                      'سجل ملاحظة واحدة يومياً عن التركيز أو القراءة أو الكتابة لإضافتها في المتابعة.',
                    ]
                    : latestReport?.recommendations.slice(0, 4) ?? ['أضف بيانات الطالب وأكمل الاستبيان حتى تظهر توصيات منزلية مناسبة.']).map((item) => (
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

function getParentReportSlots(reports: ReportRecord[]) {
  return [
    {
      title: 'إجابات ولي الأمر',
      description: 'نسخة الأسئلة والإجابات التي سجلها ولي الأمر.',
      report: reports.find((report) => report.type === 'survey-answers'),
    },
    {
      title: 'إجابات الطالب',
      description: 'نتيجة اختبار الطالب التفصيلية كما راجعها الدكتور.',
      report: reports.find((report) => report.type === 'student-assessment-answers'),
    },
    {
      title: 'التقرير التحليلي',
      description: 'الخطة والملاحظات التي يعتمدها د. إسماعيل.',
      report: reports.find((report) => report.type === 'student-assessment-analysis') ?? reports.find((report) => report.type === 'clinical-analysis'),
    },
  ];
}
