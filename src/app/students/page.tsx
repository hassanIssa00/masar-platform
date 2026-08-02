'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpenCheck, FileText, MessageSquareText, UserRound, UsersRound } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { curriculumPrograms } from '@/data/curriculum';
import { getReports, getStudents, ReportRecord, StudentRecord, updateStudent } from '@/lib/localDb';

export default function StudentsControlPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');

  const refresh = () => {
    const nextStudents = getStudents();
    setStudents(nextStudents);
    setReports(getReports());
    setSelectedId((current) => current || nextStudents[0]?.id || '');
  };

  useEffect(() => {
    const timeout = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const selectedStudent = students.find((student) => student.id === selectedId) ?? students[0] ?? null;
  const studentReports = useMemo(
    () => reports.filter((report) => selectedStudent && (report.studentId === selectedStudent.id || report.studentName === selectedStudent.fullName)),
    [reports, selectedStudent],
  );
  const reportSlots = getReportSlots(studentReports);
  const assignedProgram = curriculumPrograms.find((program) => program.slug === selectedStudent?.assignedProgram);

  const approveProgram = (slug: string) => {
    if (!selectedStudent) return;
    const program = curriculumPrograms.find((item) => item.slug === slug);
    updateStudent(selectedStudent.id, {
      assignedProgram: slug,
      assignedBy: 'د. إسماعيل عيسى',
      assignedAt: new Date().toISOString(),
      reviewStatus: 'program-assigned',
    });
    refresh();
    setMessage(`تم اعتماد ${program?.shortTitle ?? 'المسار'} للطالب ${selectedStudent.fullName}.`);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-sm font-black text-teal-800">إدارة الطلاب</p>
                <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">كل طالب، ملفه، تقاريره، ومساره في مكان واحد</h1>
                <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-600">
                  اضغط على صورة أو اسم الطالب لفتح ملفه، ثم راجع التقارير الثلاثة واعتمد المسار المناسب.
                </p>
              </div>
              <Link href="/student/new" className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white">
                تسجيل طالب جديد
              </Link>
            </div>
          </header>

          {students.length === 0 ? (
            <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <UsersRound className="mx-auto text-slate-500" size={40} />
              <h2 className="mt-4 text-2xl font-black text-slate-950">لا يوجد طلاب محفوظون</h2>
              <p className="mt-2 text-sm font-bold text-slate-600">سجل أول طالب وسيظهر هنا ملفه والتقارير الخاصة به.</p>
            </section>
          ) : (
            <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
              <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-24 xl:self-start">
                <h2 className="px-2 text-xl font-black text-slate-950">قائمة الطلاب</h2>
                <div className="mt-4 grid gap-3">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedId(student.id)}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-right transition ${selectedStudent?.id === student.id ? 'border-teal-700 bg-teal-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                    >
                      <Avatar student={student} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate font-black text-slate-950">{student.fullName}</span>
                        <span className="mt-1 block text-xs font-bold text-slate-500">{student.grade}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </aside>

              {selectedStudent && (
                <div className="space-y-6">
                  <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
                      <div className="grid place-items-center bg-slate-950 p-6">
                        <Avatar student={selectedStudent} size="lg" />
                      </div>
                      <div className="p-5 md:p-7">
                        <p className="text-sm font-black text-teal-800">ملف الطالب</p>
                        <h2 className="mt-2 text-3xl font-black text-slate-950">{selectedStudent.fullName}</h2>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <Info label="الصف" value={selectedStudent.grade} />
                          <Info label="رقم الهوية / الإقامة" value={selectedStudent.nationalId} />
                          <Info label="تاريخ الميلاد" value={selectedStudent.dateOfBirth} />
                          <Info label="ولي الأمر" value={selectedStudent.parentName} />
                          <Info label="هاتف ولي الأمر" value={selectedStudent.parentPhone} />
                          <Info label="حالة الملف" value={getStatusLabel(selectedStudent)} />
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                      <BookOpenCheck className="text-teal-700" size={24} />
                      <div>
                        <p className="text-sm font-black text-slate-500">قرار المسار</p>
                        <h2 className="text-xl font-black text-slate-950">
                          {assignedProgram ? `المسار المعتمد: ${assignedProgram.shortTitle}` : 'لم يتم اعتماد مسار بعد'}
                        </h2>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {curriculumPrograms.map((program) => (
                        <button
                          key={program.slug}
                          onClick={() => approveProgram(program.slug)}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-right transition hover:border-teal-300 hover:bg-teal-50"
                        >
                          <span className="mb-3 block h-2 rounded-full" style={{ backgroundColor: program.color }} />
                          <span className="block font-black text-slate-950">{program.shortTitle}</span>
                          <span className="mt-1 block text-xs font-bold leading-6 text-slate-500">{program.duration}</span>
                        </button>
                      ))}
                    </div>
                    {message && <p className="mt-4 rounded-lg bg-teal-50 p-3 text-sm font-black text-teal-900">{message}</p>}
                  </section>

                  <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-slate-500">ملفات PDF المطلوبة</p>
                        <h2 className="text-xl font-black text-slate-950">تقارير الطالب الثلاثة</h2>
                      </div>
                      <Link href={`/messages?student=${selectedStudent.id}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-700">
                        <MessageSquareText size={17} />
                        مراسلة ولي الأمر
                      </Link>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {reportSlots.map((slot) => (
                        <article key={slot.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                          <FileText className={slot.report ? 'text-teal-700' : 'text-slate-400'} size={24} />
                          <h3 className="mt-3 font-black text-slate-950">{slot.title}</h3>
                          <p className="mt-2 min-h-12 text-xs font-bold leading-6 text-slate-500">{slot.description}</p>
                          {slot.report ? (
                            <Link href={`/reports?report=${slot.report.id}`} className="mt-4 inline-flex w-full justify-center rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white">
                              فتح PDF
                            </Link>
                          ) : (
                            <span className="mt-4 inline-flex w-full justify-center rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-400 ring-1 ring-slate-200">
                              لم يكتمل بعد
                            </span>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function Avatar({ student, size }: { student: StudentRecord; size: 'sm' | 'lg' }) {
  const className = size === 'lg' ? 'h-40 w-40 text-5xl' : 'h-14 w-14 text-xl';
  if (student.photoUrl) {
    return (
      <span
        role="img"
        aria-label={student.fullName}
        className={`${className} shrink-0 rounded-lg bg-cover bg-center ring-2 ring-white/20`}
        style={{ backgroundImage: `url(${student.photoUrl})` }}
      />
    );
  }
  return (
    <span className={`${className} grid shrink-0 place-items-center rounded-lg bg-slate-100 font-black text-slate-700`}>
      <UserRound size={size === 'lg' ? 58 : 24} />
    </span>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-black text-slate-950">{value || 'غير مسجل'}</p>
    </div>
  );
}

function getStatusLabel(student: StudentRecord) {
  if (student.reviewStatus === 'program-assigned') return 'تم اعتماد المسار';
  if (student.reviewStatus === 'awaiting-survey') return 'بانتظار الاستبيان';
  return 'قيد مراجعة د. إسماعيل';
}

function getReportSlots(reports: ReportRecord[]) {
  return [
    {
      title: 'PDF إجابات ولي الأمر',
      description: 'كل إجابات الاستبيان الخام منفصلة عن التحليل.',
      report: reports.find((report) => report.type === 'survey-answers'),
    },
    {
      title: 'PDF إجابات الطالب',
      description: 'إجابات اختبار الطالب المباشر سؤالاً بسؤال.',
      report: reports.find((report) => report.type === 'student-assessment-answers'),
    },
    {
      title: 'PDF التقرير التحليلي',
      description: 'تحليل المجالات، الأولويات، والخطة المقترحة لاعتماد المسار.',
      report: reports.find((report) => report.type === 'student-assessment-analysis') ?? reports.find((report) => report.type === 'clinical-analysis'),
    },
  ];
}
