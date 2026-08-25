'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ClipboardCheck, FileText, Home, MessageSquareText, UserRoundPlus,
  Send, CheckCircle2, Sparkles, MessageSquare, LogOut, ScanFace
} from 'lucide-react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import SyncStatus from '@/components/SyncStatus';
import { curriculumPrograms } from '@/data/curriculum';
import {
  getMessages, getReports, getSession, getStudents, hydrateSessionFromServer, MessageRecord, ReportRecord,
  saveMessage, StudentRecord, clearSession
} from '@/lib/localDb';
import { getLocalHomework, updateHomeworkStatus, HomeworkRecord } from '@/lib/homework';

export default function ParentDashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [parentName, setParentName] = useState('ولي الأمر');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [replyText, setReplyText] = useState('');
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [homeworkList, setHomeworkList] = useState<HomeworkRecord[]>([]);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  useEffect(() => {
    let cancelled = false;
    const loadParentPortal = async () => {
      const session = getSession() ?? await hydrateSessionFromServer();
      if (cancelled) return;

      // Not logged in → send to login
      if (!session) {
        router.replace('/login');
        return;
      }

      // Doctor / Staff → their own dashboard
      if (session.role === 'doctor' || session.role === 'specialist' || session.role === 'teacher') {
        router.push('/dashboard');
        return;
      }

      // Ikhlas-branch parent → redirect to school-parent portal
      if (session.schoolBranch === 'IKHLAS_JEDDAH' && session.role === 'parent') {
        router.replace('/school-parent');
        return;
      }

      const allStudents = getStudents();
      const pPhone = session.phone ? session.phone.replace(/\D/g, '') : '';
      const pName = session.name ? session.name.trim().toLowerCase() : '';
      const activeId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('student') : null;

      let myStudents = allStudents.filter((s) => {
        if (pPhone && s.parentPhone && s.parentPhone.replace(/\D/g, '').includes(pPhone)) return true;
        if (pName && s.parentName && s.parentName.trim().toLowerCase() === pName) return true;
        if (activeId && s.id === activeId) return true;
        return false;
      });

      // Fallback: If no match found by phone/name, but activeId exists, use that single student
      if (myStudents.length === 0 && activeId) {
        myStudents = allStudents.filter((s) => s.id === activeId);
      }

      setStudents(myStudents);
      setReports(getReports());
      setMessages(getMessages());
      setParentName(session.name ?? 'ولي الأمر');

      if (myStudents.length > 0) {
        const targetId = (activeId && myStudents.some(s => s.id === activeId)) ? activeId : myStudents[0].id;
        setSelectedStudentId(targetId);
      }
      setHomeworkList(getLocalHomework());
    };
    void loadParentPortal();
    return () => {
      cancelled = true;
    };
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
      m.body.includes('التقرير الرقمي') ||
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
                متابعة الخطة التعليمية والتقارير الموثقة المباشرة من د. إسماعيل عيسى لطفلك: <span className="font-black text-teal-800">{selectedStudent?.fullName || 'الطفل'}</span>.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link
                href="/face-enroll"
                className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-700 hover:bg-emerald-100 transition shadow-2xs"
              >
                <ScanFace size={16} />
                <span>تسجيل الوجه البيومتري</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700 hover:bg-rose-100 transition shadow-2xs cursor-pointer"
              >
                <LogOut size={16} />
                <span>تسجيل الخروج</span>
              </button>
              {students.length === 0 && (
                <Link href="/student/new" className="rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-black text-white hover:bg-teal-800 transition shadow-sm">إضافة طفل جديد</Link>
              )}
            </div>
          </div>
        </header>

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
            
            {/* Sidebar Student Profile / Selection */}
            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h2 className="text-base font-black text-slate-950">
                {students.length === 1 ? 'طفلي المسجل' : `الأبناء المسجلون (${students.length})`}
              </h2>
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
                      <div className="relative h-10 w-10 shrink-0 rounded-xl overflow-hidden bg-teal-100">
                        {student.photoUrl ? (
                          <Image src={student.photoUrl} alt={student.fullName} fill unoptimized className="object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-teal-800 font-black text-sm">👦</span>
                        )}
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
                  <p className="text-xs font-black text-slate-500">المسارات التعليمية الموثقة</p>
                  <p className="text-lg font-black text-slate-950">
                    {assignedProgramsList.length > 0
                      ? `${assignedProgramsList.length} مسارات موثقة`
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
                        ? `تم تحديد المسارات التعليمية: ${assignedProgramsList.map((p) => p.shortTitle).join(' و ')}`
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
                            مسار موثق ✓
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
                    سيظهر هنا تفاصيل المسارات التعليمية الموثقة فور قيام د. إسماعيل بعرض التقرير وتحديد الخطة المناسبة لطفلك.
                  </p>
                )}
              </section>

              {/* Reports Section: Only displays if Doctor explicitly dispatched them */}
              <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div>
                  <p className="text-xs font-black text-teal-800">تقارير الطفل الموثقة</p>
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
                            فتح التقرير الموثق 📄
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

              {/* Real Homework Section — only shows assignments sent by Dr. Ismail */}
              {(() => {
                const studentHw = homeworkList.filter(
                  (hw) => selectedStudent && (hw.studentId === selectedStudent.id || hw.studentName === selectedStudent.fullName)
                );
                if (studentHw.length === 0) return null;
                return (
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <p className="text-xs font-black text-teal-800">الواجبات المنزلية</p>
                        <h2 className="text-lg font-black text-slate-950 mt-0.5">الواجبات المرسلة من د. إسماعيل ({studentHw.length})</h2>
                      </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {studentHw.map((hw) => (
                        <article key={hw.id} className={`rounded-xl border p-4 space-y-3 flex flex-col justify-between ${
                          hw.status === 'submitted' ? 'border-emerald-200 bg-emerald-50/60'
                          : hw.status === 'reviewed' ? 'border-teal-200 bg-teal-50/60'
                          : 'border-amber-200 bg-amber-50/60'
                        }`}>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] font-black rounded-full px-2 py-0.5 ${
                                hw.status === 'submitted' ? 'bg-emerald-600 text-white'
                                : hw.status === 'reviewed' ? 'bg-teal-700 text-white'
                                : 'bg-amber-500 text-white'
                              }`}>
                                {hw.status === 'assigned' ? '📋 مطلوب' : hw.status === 'submitted' ? '✅ تم الإرسال' : '⭐ تمت المراجعة'}
                              </span>
                              {hw.dueDate && (
                                <span className="text-[10px] font-bold text-slate-500">
                                  التسليم: {new Date(hw.dueDate).toLocaleDateString('ar-EG')}
                                </span>
                              )}
                            </div>
                            <h3 className="font-black text-slate-950 text-sm">{hw.title}</h3>
                            <p className="text-xs font-bold text-slate-600 leading-relaxed">{hw.description}</p>
                            {hw.doctorFeedback && (
                              <div className="rounded-lg bg-white border border-teal-200 p-2.5">
                                <p className="text-[10px] font-black text-teal-700 mb-0.5">ملاحظة الدكتور:</p>
                                <p className="text-xs font-bold text-slate-700">{hw.doctorFeedback}</p>
                              </div>
                            )}
                          </div>
                          {hw.status === 'assigned' && (
                            <button
                              onClick={() => {
                                updateHomeworkStatus(hw.id, 'submitted');
                                setHomeworkList(getLocalHomework());
                              }}
                              className="w-full rounded-xl py-2.5 text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 bg-white border border-amber-300 text-amber-950 hover:bg-amber-100"
                            >
                              <CheckCircle2 size={16} />
                              <span>تحديد كـ "تم الإنجاز"</span>
                            </button>
                          )}
                          {hw.status === 'submitted' && (
                            <div className="rounded-xl bg-emerald-600 text-white text-xs font-black text-center py-2">
                              ✅ تم الإرسال — في انتظار مراجعة الدكتور
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                );
              })()}

            </div>
          </section>
        )}
      </main>
    </div>
  );
}


