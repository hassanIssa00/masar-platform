'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpenCheck, FileText, MessageSquareText, Trash2, UserRound, UsersRound, Sparkles, AlertTriangle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { curriculumPrograms } from '@/data/curriculum';
import { deleteStudent, getReports, getStudents, ReportRecord, StudentRecord, updateStudent } from '@/lib/localDb';

export default function StudentsControlPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  // Determine system-recommended track for this student based on test scores and grade
  const systemRecommendation = useMemo(() => {
    if (!selectedStudent) return null;
    const testReport = studentReports.find((r) => r.type === 'student-assessment-analysis' || r.type === 'initial-assessment');
    
    if (selectedStudent.grade.includes('الأول') || selectedStudent.grade.includes('الثاني') || selectedStudent.grade.includes('عام')) {
      return {
        program: curriculumPrograms.find((p) => p.slug === 'reading')!,
        reason: 'بناءً على الصف الدراسي وحاجة الطالب لتأسيس القراءة والتهجي الصريح.',
      };
    }
    
    if (testReport) {
      const mathDomain = testReport.domains?.find((d) => d.name.includes('الرياضيات') || d.name.includes('الحساب'));
      if (mathDomain && mathDomain.score < 65) {
        return {
          program: curriculumPrograms.find((p) => p.slug === 'math')!,
          reason: `الدرجة المنخفضة في الرياضيات (${mathDomain.score}%) تتطلب معمل التفكير الرياضي والعد المحسوس.`,
        };
      }
    }

    return {
      program: curriculumPrograms.find((p) => p.slug === 'learning-difficulties')!,
      reason: 'تقييم شامل يغطي المهارات الأكاديمية والنمائية المتعددة.',
    };
  }, [selectedStudent, studentReports]);

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

  const handleDeleteStudent = (studentId: string) => {
    deleteStudent(studentId);
    setConfirmDeleteId(null);
    refresh();
    setMessage('تم حذف ملف الطالب وكافة بياناته بنجاح.');
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950 font-sans" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-black text-teal-800 uppercase tracking-wider">إدارة الطلاب</p>
                <h1 className="mt-1 text-3xl font-black text-slate-950 md:text-4xl">ملفات الطلاب، تقاريرهم، والمسار العلاجي</h1>
                <p className="mt-2 max-w-3xl text-xs sm:text-sm font-bold text-slate-600">
                  معاينة كافة بيانات حساب ولي الأمر، التوصيات التلقائية للنظام، واعتمد المسار المناسب بضغطة زر.
                </p>
              </div>
              <Link href="/student/new" className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 transition">
                تسجيل طالب جديد
              </Link>
            </div>
          </header>

          {students.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
              <UsersRound className="mx-auto text-slate-400" size={48} />
              <h2 className="mt-4 text-2xl font-black text-slate-950">لا يوجد طلاب محفوظون حالياً</h2>
              <p className="mt-2 text-sm font-bold text-slate-500">سجل أول طالب وسيظهر هنا ملفه والتقارير الخاصة به.</p>
            </section>
          ) : (
            <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
              
              {/* Sidebar list of students */}
              <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-24 xl:self-start">
                <h2 className="px-2 text-lg font-black text-slate-950">قائمة الطلاب ({students.length})</h2>
                <div className="mt-4 grid gap-2.5">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => setSelectedId(student.id)}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-right transition ${
                        selectedStudent?.id === student.id ? 'border-teal-600 bg-teal-50/80 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <Avatar student={student} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-black text-slate-950 text-sm">{student.fullName}</span>
                        <span className="mt-0.5 block text-xs font-bold text-slate-500">{student.grade}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </aside>

              {/* Selected Student Details */}
              {selectedStudent && (
                <div className="space-y-6">
                  
                  {/* Student Main Profile Header */}
                  <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
                      <div className="grid place-items-center bg-slate-900 p-6 text-white text-center">
                        <Avatar student={selectedStudent} size="lg" />
                        <div className="mt-3">
                          <span className="inline-block rounded-full bg-teal-400/20 px-3 py-1 text-xs font-black text-teal-300">
                            {selectedStudent.grade}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                          <div>
                            <p className="text-xs font-black text-teal-700">ملف الطالب الحسابي الكامل</p>
                            <h2 className="mt-1 text-2xl font-black text-slate-950">{selectedStudent.fullName}</h2>
                          </div>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(selectedStudent.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 transition"
                          >
                            <Trash2 size={16} />
                            <span>حذف الطالب</span>
                          </button>
                        </div>

                        {/* All Recorded Account Details */}
                        <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                          <Info label="اسم الطالب" value={selectedStudent.fullName} />
                          <Info label="الصف الدراسي" value={selectedStudent.grade} />
                          <Info label="رقم الهوية / الإقامة" value={selectedStudent.nationalId} />
                          <Info label="تاريخ الميلاد" value={selectedStudent.dateOfBirth} />
                          <Info label="اسم ولي الأمر" value={selectedStudent.parentName} />
                          <Info label="رقم هاتف التواصل" value={selectedStudent.parentPhone} />
                          <Info label="طريقة التسجيل" value={selectedStudent.source === 'survey' ? 'عن طريق الاستبيان' : 'تسجيل أونلاين مباشر'} />
                          <Info label="تاريخ إنشاء الملف" value={new Date(selectedStudent.createdAt).toLocaleDateString('ar-SA')} />
                          <Info label="حالة الملف الحالية" value={getStatusLabel(selectedStudent)} />
                        </div>

                        {selectedStudent.notes && (
                          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                            <p className="text-xs font-black text-slate-500">ملاحظات ولي الأمر / الأخصائي:</p>
                            <p className="mt-1 text-xs font-bold text-slate-700 leading-relaxed">{selectedStudent.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* System Track Recommendation & Track Selector */}
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                    
                    {/* Header */}
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                        <BookOpenCheck size={22} />
                      </span>
                      <div>
                        <p className="text-xs font-black text-teal-700">توجيه واعتماد المسار</p>
                        <h2 className="text-xl font-black text-slate-950">
                          {assignedProgram ? `المسار المعتمد حالياً: ${assignedProgram.shortTitle}` : 'لم يتم اعتماد مسار بعد'}
                        </h2>
                      </div>
                    </div>

                    {/* SYSTEM RECOMMENDED TRACK CARD */}
                    {systemRecommendation && (
                      <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-emerald-50/50 to-white p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 text-xs font-black text-teal-800">
                            <Sparkles size={16} className="text-teal-600" />
                            <span>ترشيح المنصة التلقائي بناءً على البيانات والتأهيل:</span>
                          </div>
                          <h3 className="text-lg font-black text-slate-900">{systemRecommendation.program.shortTitle}</h3>
                          <p className="text-xs font-bold text-slate-600">{systemRecommendation.reason}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => approveProgram(systemRecommendation.program.slug)}
                          className="shrink-0 rounded-xl bg-teal-600 px-5 py-3 text-xs font-black text-white hover:bg-teal-700 transition shadow-sm"
                        >
                          اعتماد المسار المقترح مباشرة
                        </button>
                      </div>
                    )}

                    {/* All Available Programs Selector */}
                    <div>
                      <p className="mb-3 text-xs font-black text-slate-500 uppercase tracking-wider">أو اختر مساراً آخر يدويًا:</p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {curriculumPrograms.map((program) => (
                          <button
                            key={program.slug}
                            onClick={() => approveProgram(program.slug)}
                            className={`rounded-2xl border p-4 text-right transition ${
                              selectedStudent.assignedProgram === program.slug
                                ? 'border-teal-600 bg-teal-50 shadow-sm'
                                : 'border-slate-200 bg-slate-50/70 hover:bg-white hover:border-slate-300'
                            }`}
                          >
                            <span className="mb-2 block h-2 rounded-full" style={{ backgroundColor: program.color }} />
                            <span className="block font-black text-slate-950 text-sm">{program.shortTitle}</span>
                            <span className="mt-1 block text-xs font-bold text-slate-500 leading-relaxed">{program.duration}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {message && (
                      <p className="rounded-xl bg-teal-50 border border-teal-200 p-3.5 text-xs font-black text-teal-900">
                        {message}
                      </p>
                    )}

                  </section>

                  {/* Student PDFs & Reports */}
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <p className="text-xs font-black text-slate-500">ملفات PDF المطلوبة</p>
                        <h2 className="text-xl font-black text-slate-950">تقارير الطالب والنتائج</h2>
                      </div>
                      <Link 
                        href={`/messages?student=${selectedStudent.id}`} 
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 transition"
                      >
                        <MessageSquareText size={16} />
                        <span>مراسلة ولي الأمر</span>
                      </Link>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {reportSlots.map((slot) => (
                        <article key={slot.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between">
                          <div>
                            <FileText className={slot.report ? 'text-teal-600' : 'text-slate-400'} size={24} />
                            <h3 className="mt-3 font-black text-slate-950 text-sm">{slot.title}</h3>
                            <p className="mt-1 text-xs font-bold text-slate-500 leading-relaxed">{slot.description}</p>
                          </div>
                          {slot.report ? (
                            <Link 
                              href={`/reports?report=${slot.report.id}`} 
                              className="mt-4 inline-flex w-full justify-center rounded-xl bg-slate-950 py-2.5 text-xs font-black text-white hover:bg-slate-800 transition"
                            >
                              فتح PDF
                            </Link>
                          ) : (
                            <span className="mt-4 inline-flex w-full justify-center rounded-xl bg-white py-2.5 text-xs font-black text-slate-400 border border-slate-200">
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

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-right space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle size={28} />
              <h3 className="text-xl font-black text-slate-900">تأكيد حذف الطالب</h3>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-600 leading-relaxed">
              هل أنت تأكد من حذف ملف الطالب <span className="font-black text-slate-900">"{selectedStudent?.fullName}"</span> بشكل نهائي؟ ستلغى جميع التقارير والرسائل الخاصة به.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-xl px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-100 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteId && handleDeleteStudent(confirmDeleteId)}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-black text-white hover:bg-rose-700 transition shadow-md shadow-rose-600/20"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function Avatar({ student, size }: { student: StudentRecord; size: 'sm' | 'lg' }) {
  const className = size === 'lg' ? 'h-32 w-32 text-4xl' : 'h-12 w-12 text-lg';
  if (student.photoUrl) {
    return (
      <span
        role="img"
        aria-label={student.fullName}
        className={`${className} shrink-0 rounded-2xl bg-cover bg-center ring-2 ring-white/20`}
        style={{ backgroundImage: `url(${student.photoUrl})` }}
      />
    );
  }
  return (
    <span className={`${className} grid shrink-0 place-items-center rounded-2xl bg-slate-100 font-black text-slate-700`}>
      <UserRound size={size === 'lg' ? 48 : 22} />
    </span>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p className="mt-1 break-words text-xs font-black text-slate-900">{value || 'غير مسجل'}</p>
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
