'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ClipboardCheck, FileText, Home, MessageSquareText, UserRoundPlus,
  Send, CheckCircle2, BookOpen, Sparkles, Star, MessageSquare
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import SyncStatus from '@/components/SyncStatus';
import { curriculumPrograms } from '@/data/curriculum';
import { getMessages, getReports, getSession, getStudents, MessageRecord, ReportRecord, saveMessage, StudentRecord } from '@/lib/localDb';

export default function ParentDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [parentName, setParentName] = useState('ولي الأمر');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [replyText, setReplyText] = useState('');
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    queueMicrotask(() => {
      const session = getSession();
      if (session?.role === 'doctor' || session?.role === 'specialist' || session?.role === 'teacher') {
        router.push('/dashboard');
        return;
      }

      const nextStudents = getStudents();
      setStudents(nextStudents);
      setReports(getReports());
      setMessages(getMessages());
      setParentName(getSession()?.name ?? 'ولي الأمر');
      
      const savedStudentId = typeof window !== 'undefined' ? localStorage.getItem('masar_active_student_id') : null;
      if (savedStudentId && nextStudents.some((s) => s.id === savedStudentId)) {
        setSelectedStudentId(savedStudentId);
      } else {
        setSelectedStudentId(nextStudents[0]?.id ?? '');
      }
    });

    const handleStorage = () => {
      const savedStudentId = localStorage.getItem('masar_active_student_id');
      if (savedStudentId) {
        setSelectedStudentId(savedStudentId);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [router]);

  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? students[0];
  
  const studentReports = useMemo(
    () => reports.filter((report) => !selectedStudent || report.studentId === selectedStudent.id || report.studentName === selectedStudent.fullName),
    [reports, selectedStudent],
  );

  const studentMessages = useMemo(
    () => messages
      .filter((message) => selectedStudent && (message.studentId === selectedStudent.id || message.studentId === 'student_assessment'))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages, selectedStudent]
  );

  const assignedSlugs = useMemo(() => {
    if (!selectedStudent) return [];
    return selectedStudent.assignedPrograms || (selectedStudent.assignedProgram ? [selectedStudent.assignedProgram] : []);
  }, [selectedStudent]);

  const assignedProgramsList = useMemo(() => {
    return curriculumPrograms.filter((program) => assignedSlugs.includes(program.slug));
  }, [assignedSlugs]);

  const latestReport = studentReports[0];
  const isUnderDoctorReview = selectedStudent?.reviewStatus === 'awaiting-doctor-review' || latestReport?.status === 'pending';

  // Doctor must explicitly dispatch a report via message for it to show in the parent portal!
  const isReportDispatchedByDoctor = (reportType: string) => {
    return studentMessages.some((m) => m.from === 'doctor' && (
      m.body.includes('تم إرسال وتحديد التقرير') ||
      m.body.includes('التقرير الرسمي') ||
      m.body.includes('تم اعتماد وإرسال التقرير')
    ));
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedStudent) return;
    saveMessage({
      studentId: selectedStudent.id,
      from: 'parent',
      to: 'doctor',
      body: replyText.trim(),
      read: false,
    });
    setReplyText('');
    setMessages(getMessages());
  };

  const toggleTaskCompleted = (taskId: string) => {
    setCompletedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950" dir="rtl">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 space-y-6">
        
        {/* Header: Warm welcome to Parent */}
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1 text-xs font-black text-teal-800 border border-teal-200">
                <Sparkles size={14} className="text-teal-600" />
                <span>بوابة ولي الأمر التفاعلية</span>
              </span>
              <h1 className="mt-2 text-2xl md:text-3xl font-black text-slate-950">
                أهلاً بك أ. {parentName} في منصة مَسَار
              </h1>
              <p className="mt-2 max-w-3xl text-xs md:text-sm font-bold leading-relaxed text-slate-600">
                متابعة الخطة العلاجية والتقارير المعتمدة المباشرة من د. إسماعيل عيسى لطفلك: <span className="font-black text-teal-800">{selectedStudent?.fullName || 'الطفل'}</span>.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/auth/login" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-800 hover:bg-slate-50 transition shadow-2xs">تبديل الحساب</Link>
              <Link href="/student/new" className="rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-black text-white hover:bg-teal-800 transition shadow-sm">إضافة طفل جديد</Link>
            </div>
          </div>
        </header>

        <SyncStatus />

        {students.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <UserRoundPlus className="mx-auto text-slate-400" size={48} />
            <h2 className="mt-4 text-2xl font-black text-slate-950">لا يوجد طالب محفوظ بعد</h2>
            <p className="mx-auto mt-2 max-w-xl text-xs md:text-sm font-bold leading-relaxed text-slate-600">
              أضف بيانات الطفل أولاً، ثم سيظهر استبيان ولي الأمر الشامل لتحديد المستوى وبدء التقييم.
            </p>
            <Link href="/student/new" className="mt-5 inline-flex rounded-xl bg-teal-700 px-5 py-3 text-xs font-black text-white">
              إضافة بيانات الطالب
            </Link>
          </section>
        ) : (
          <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            
            {/* Sidebar Student Selection */}
            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-base font-black text-slate-950">الأبناء المسجلون ({students.length})</h2>
              <div className="grid gap-2">
                {students.map((student) => {
                  const isSelected = selectedStudent?.id === student.id;
                  return (
                    <button
                      key={student.id}
                      onClick={() => setSelectedStudentId(student.id)}
                      className={`flex items-center gap-3 rounded-xl border p-3.5 text-right transition cursor-pointer ${
                        isSelected
                          ? 'border-teal-700 bg-teal-50 shadow-2xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-100 text-teal-800 font-black text-sm">
                        {student.fullName.slice(0, 1)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-950 text-sm truncate">{student.fullName}</p>
                        <p className="mt-0.5 text-xs font-bold text-slate-500 truncate">{student.grade}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <div className="space-y-6">

              {/* Status Overview Cards */}
              <section className="grid gap-4 sm:grid-cols-3">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                  <ClipboardCheck className="text-teal-700" size={24} />
                  <p className="text-xs font-black text-slate-500">حالة التقييم</p>
                  <p className="text-lg font-black text-slate-950">
                    {latestReport ? 'تم الحفظ والتقييم' : 'قيد الانتظار'}
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                  <FileText className="text-blue-700" size={24} />
                  <p className="text-xs font-black text-slate-500">التقارير المتاحة</p>
                  <p className="text-lg font-black text-slate-950">
                    {studentReports.length} تقارير تشخيصية
                  </p>
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                  <Home className="text-amber-700" size={24} />
                  <p className="text-xs font-black text-slate-500">المسارات العلاجية المعتمدة</p>
                  <p className="text-lg font-black text-slate-950">
                    {assignedProgramsList.length > 0
                      ? `${assignedProgramsList.length} مسارات معتمدة`
                      : 'قيد مراجعة د. إسماعيل'}
                  </p>
                </article>
              </section>

              {/* Multi-Track Display Card */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <p className="text-xs font-black text-teal-800">حالة ملف الطالب والمسارات</p>
                    <h2 className="text-lg font-black text-slate-950 mt-0.5">
                      {assignedProgramsList.length > 0
                        ? `تم اعتماد المسارات العلاجية: ${assignedProgramsList.map((p) => p.shortTitle).join(' و ')}`
                        : latestReport
                        ? 'ملف الطالب قيد مراجعة د. إسماعيل عيسى'
                        : 'لم يتم استكمال التقييم بعد'}
                    </h2>
                  </div>
                </div>

                {assignedProgramsList.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {assignedProgramsList.map((program) => (
                      <div key={program.slug} className="rounded-xl border border-teal-200 bg-teal-50/70 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="rounded-full bg-teal-700 text-white px-2.5 py-0.5 text-[10px] font-black">
                            مسار معتمد ✓
                          </span>
                          <span className="text-[11px] font-bold text-slate-500">{program.modules.length} وحدات</span>
                        </div>
                        <h3 className="font-black text-slate-950 text-sm">{program.title}</h3>
                        <p className="text-xs font-bold text-slate-600 leading-relaxed">{program.promise}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-bold leading-relaxed text-slate-600 bg-slate-50 p-4 rounded-xl">
                    سيظهر هنا تفاصيل المسارات العلاجية المعتمدة فور قيام د. إسماعيل بعرض التقرير واعتماد الخطة المناسبة لطالك.
                  </p>
                )}
              </section>

              {/* Reports Section: Only displays if Doctor explicitly dispatched them */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div>
                  <p className="text-xs font-black text-teal-800">تقارير الطفل المعتمدة</p>
                  <h2 className="text-lg font-black text-slate-950 mt-0.5">الملفات والتقارير المرسلة من د. إسماعيل</h2>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    {
                      title: 'إجابات ولي الأمر',
                      description: 'نسخة الأسئلة والإجابات الشاملة التي سجلتها.',
                      report: studentReports.find((r) => r.type === 'survey-answers'),
                    },
                    {
                      title: 'إجابات الطالب',
                      description: 'نتيجة اختبار الطالب التفصيلية كما راجعها الدكتور.',
                      report: studentReports.find((r) => r.type === 'student-assessment-answers'),
                    },
                    {
                      title: 'التقرير التحليلي والخطة',
                      description: 'التقرير النهائي وتوصيات د. إسماعيل عيسى.',
                      report: studentReports.find((r) => r.type === 'student-assessment-analysis' || r.type === 'clinical-analysis'),
                    },
                  ].map((slot) => {
                    const isDispatched = slot.report && isReportDispatchedByDoctor(slot.report.type);
                    return (
                      <article key={slot.title} className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                        <div className="space-y-2">
                          <FileText className={isDispatched ? 'text-teal-700' : 'text-slate-400'} size={24} />
                          <h3 className="font-black text-slate-950 text-sm">{slot.title}</h3>
                          <p className="text-xs font-bold text-slate-500 leading-relaxed min-h-[36px]">{slot.description}</p>
                        </div>

                        {isDispatched ? (
                          <Link
                            href={`/reports?report=${slot.report!.id}&mode=parent`}
                            className="inline-flex w-full justify-center rounded-xl bg-slate-950 py-2.5 text-xs font-black text-white hover:bg-slate-800 transition"
                          >
                            فتح التقرير المعتمد 📄
                          </Link>
                        ) : (
                          <div className="rounded-xl bg-white border border-slate-200 p-2.5 text-center text-xs font-black text-slate-400">
                            لم يرسل بعد من الدكتور
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>

              {/* Live Interactive Chat Box with Dr. Ismail */}
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden space-y-0">
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={20} className="text-teal-400" />
                    <div>
                      <h3 className="font-black text-sm">محادثة الشات المباشرة مع د. إسماعيل عيسى</h3>
                      <p className="text-[11px] font-bold text-slate-400">يمكنك الرد والتواصل المباشر بشأن متابعة الطفل</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-teal-900/80 text-teal-300 border border-teal-700 px-3 py-1 text-xs font-black">
                    {studentMessages.length} رسالة
                  </span>
                </div>

                {/* Chat Message History */}
                <div className="min-h-[260px] max-h-[360px] overflow-y-auto p-4 bg-slate-50 space-y-3">
                  {studentMessages.length > 0 ? (
                    studentMessages.map((msg) => {
                      const isDoctor = msg.from === 'doctor';
                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col max-w-[85%] ${
                            isDoctor ? 'ml-auto items-start' : 'mr-auto items-end'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className={`text-[10px] font-black ${isDoctor ? 'text-teal-800' : 'text-slate-600'}`}>
                              {isDoctor ? '👨‍⚕️ د. إسماعيل عيسى' : `👨‍👦 ولي الأمر (${parentName})`}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400">
                              {new Date(msg.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div
                            className={`rounded-2xl p-3.5 text-xs font-bold leading-relaxed shadow-2xs whitespace-pre-wrap ${
                              isDoctor
                                ? 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                                : 'bg-teal-700 text-white rounded-tr-none'
                            }`}
                          >
                            {msg.body}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="grid place-items-center py-12 text-center text-slate-400">
                      <MessageSquare size={36} className="text-slate-300 mb-2" />
                      <p className="text-xs font-bold">لا توجد رسائل سابقة في الشات بعد.</p>
                      <p className="text-[11px] text-slate-400 mt-1">اكتب ردك بالأسفل ليتواصل د. إسماعيل معك مباشرة.</p>
                    </div>
                  )}
                </div>

                {/* Chat Reply Bar */}
                <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder="اكتب ردك أو استفسارك للدكتور إسماعيل..."
                    className="flex-1 min-h-[44px] max-h-[100px] rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600 resize-none"
                  />
                  <button
                    onClick={handleSendReply}
                    disabled={!replyText.trim()}
                    className="rounded-xl bg-teal-700 px-5 py-3 text-xs font-black text-white hover:bg-teal-800 transition disabled:opacity-40 shadow-sm cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Send size={15} />
                    <span>إرسال الرد</span>
                  </button>
                </div>
              </section>

              {/* Interactive Home Assignments & Story Cards */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <p className="text-xs font-black text-teal-800">التدريب والتطبيق المنزلي</p>
                    <h2 className="text-lg font-black text-slate-950 mt-0.5">واجب المنزل لهذا الأسبوع (مهام تفاعلية)</h2>
                  </div>
                  <span className="rounded-full bg-amber-100 text-amber-900 px-3 py-1 text-xs font-black">
                    مهمة قصيرة 5 دقائق يومياً ⭐
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-3">

                  {/* Task 1: Illustrated Story Task */}
                  <article className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-sky-900">📖 القراءة المصورة</span>
                        <span className="text-[10px] font-bold text-sky-700">5 دقائق</span>
                      </div>
                      <h3 className="font-black text-slate-950 text-sm">قصة الأسد الصغير الشجاع</h3>
                      <p className="text-xs font-bold text-slate-600 leading-relaxed">
                        اقرأ مع الطفل القصة القصيرة المصورة مرة واحدة، ثم اسأله عن بطل القصة وكيف تصرف عند المواجهة.
                      </p>
                    </div>

                    <button
                      onClick={() => toggleTaskCompleted('story_task')}
                      className={`w-full rounded-xl py-2.5 text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        completedTasks['story_task']
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-sky-300 text-sky-950 hover:bg-sky-100'
                      }`}
                    >
                      <CheckCircle2 size={16} />
                      <span>{completedTasks['story_task'] ? 'تم الإنجاز اليوم ✓' : 'تحديد كـ "تم الإنجاز"'}</span>
                    </button>
                  </article>

                  {/* Task 2: Audio & Phonetics Task */}
                  <article className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-purple-900">🎵 التمييز السمعي</span>
                        <span className="text-[10px] font-bold text-purple-700">3 دقائق</span>
                      </div>
                      <h3 className="font-black text-slate-950 text-sm">لعبة الأصوات المنزلية</h3>
                      <p className="text-xs font-bold text-slate-600 leading-relaxed">
                        انطق حرفاً مستهدفاً (مثلاً: حرف "س")، واطلب من الطفل البحث عن شيء بالمنزل يبدأ بنفس الحرف.
                      </p>
                    </div>

                    <button
                      onClick={() => toggleTaskCompleted('audio_task')}
                      className={`w-full rounded-xl py-2.5 text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        completedTasks['audio_task']
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-purple-300 text-purple-950 hover:bg-purple-100'
                      }`}
                    >
                      <CheckCircle2 size={16} />
                      <span>{completedTasks['audio_task'] ? 'تم الإنجاز اليوم ✓' : 'تحديد كـ "تم الإنجاز"'}</span>
                    </button>
                  </article>

                  {/* Task 3: Observation Log */}
                  <article className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-amber-900">📝 الملاحظة اليومية</span>
                        <span className="text-[10px] font-bold text-amber-700">دقيقة واحدة</span>
                      </div>
                      <h3 className="font-black text-slate-950 text-sm">ملاحظة الانتباه والتركيز</h3>
                      <p className="text-xs font-bold text-slate-600 leading-relaxed">
                        سجل ملاحظة بسيطة بالشات لدكتور إسماعيل عن مدى تركيز وقراءة الطفل أثناء الواجب المنزلي اليوم.
                      </p>
                    </div>

                    <button
                      onClick={() => toggleTaskCompleted('note_task')}
                      className={`w-full rounded-xl py-2.5 text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        completedTasks['note_task']
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white border border-amber-300 text-amber-950 hover:bg-amber-100'
                      }`}
                    >
                      <CheckCircle2 size={16} />
                      <span>{completedTasks['note_task'] ? 'تم الإنجاز اليوم ✓' : 'تحديد كـ "تم الإنجاز"'}</span>
                    </button>
                  </article>

                </div>
              </section>

            </div>
          </section>
        )}
      </main>
    </div>
  );
}


