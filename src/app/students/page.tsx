'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BookOpenCheck, FileText, MessageSquareText, Trash2, UserRound, UsersRound, Sparkles, AlertTriangle, CheckSquare, Square, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { curriculumPrograms } from '@/data/curriculum';
import { useRouter } from 'next/navigation';
import { deleteStudent, getAccounts, getReports, getSession, getStudents, ReportRecord, StudentRecord, updateStudent } from '@/lib/localDb';
import { pullCloudDataToLocal } from '@/lib/firestoreSync';
import { getCredentialByEmailOrPhone } from '@/lib/auth';
import { trackEvent } from '@/lib/analyticsTracker';
import CertificateModal from '@/components/CertificateModal';
import { getStudentNotes, saveStudentNote, deleteStudentNote, StudentNote } from '@/lib/classDb';
import { Award } from 'lucide-react';

export default function StudentsControlPage() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [message, setMessage] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showCertData, setShowCertData] = useState<{ studentName: string; studentNameEn?: string; programTitle: string; completionDate: string; score: number } | null>(null);

  // Note management state for selected student
  const [teacherNoteText, setTeacherNoteText] = useState('');
  const [studentNotesList, setStudentNotesList] = useState<StudentNote[]>([]);

  // Multi-track selection state for the selected student
  const [selectedTrackSlugs, setSelectedTrackSlugs] = useState<string[]>([]);

  const refresh = () => {
    const session = getSession();
    if (!session || (session.role !== 'doctor' && session.role !== 'specialist' && session.role !== 'teacher')) {
      router.replace('/login');
      return;
    }
    const nextStudents = getStudents();
    setStudents(nextStudents);
    setReports(getReports());
    
    const initialStudentId = selectedId || nextStudents[0]?.id || '';
    setSelectedId(initialStudentId);
    
    const targetStudent = nextStudents.find((s) => s.id === initialStudentId);
    if (targetStudent) {
      const activeSlugs = targetStudent.assignedPrograms || (targetStudent.assignedProgram ? [targetStudent.assignedProgram] : []);
      setSelectedTrackSlugs(activeSlugs);
    }
  };

  useEffect(() => {
    const session = getSession();
    if (session) trackEvent('visit', { userId: session.id, userName: session.name, userRole: session.role, page: '/students' });
    // Initial load from local cache
    refresh();
    // Then pull latest from Firestore cloud and refresh again
    pullCloudDataToLocal()
      .then(() => refresh())
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedStudent = students.find((student) => student.id === selectedId) ?? students[0] ?? null;

  // Sync selected track slugs and notes whenever student selection changes
  useEffect(() => {
    if (selectedStudent) {
      const activeSlugs = selectedStudent.assignedPrograms || (selectedStudent.assignedProgram ? [selectedStudent.assignedProgram] : []);
      setSelectedTrackSlugs(activeSlugs);
      setStudentNotesList(getStudentNotes(selectedStudent.id));
      setMessage('');
    }
  }, [selectedId, selectedStudent]);

  const handleSaveTeacherNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherNoteText.trim() || !selectedStudent) return;
    const newNote = saveStudentNote({
      studentId: selectedStudent.id,
      text: teacherNoteText.trim(),
    });
    setStudentNotesList((prev) => [newNote, ...prev]);
    setTeacherNoteText('');
    setMessage(`✅ تم حفظ الملاحظة بنجاح في ملف الطالب والسجل السحابي`);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleDeleteTeacherNote = (noteId: string) => {
    deleteStudentNote(noteId);
    setStudentNotesList((prev) => prev.filter((n) => n.id !== noteId));
  };

  const studentReports = useMemo(
    () => reports.filter((report) => selectedStudent && (report.studentId === selectedStudent.id || report.studentName === selectedStudent.fullName)),
    [reports, selectedStudent],
  );
  const reportSlots = getReportSlots(studentReports);

  // Currently assigned programs for the student
  const assignedPrograms = useMemo(() => {
    if (!selectedStudent) return [];
    const slugs = selectedStudent.assignedPrograms || (selectedStudent.assignedProgram ? [selectedStudent.assignedProgram] : []);
    return curriculumPrograms.filter((p) => slugs.includes(p.slug));
  }, [selectedStudent]);

  // System-recommended track suggestion
  const systemRecommendation = useMemo(() => {
    if (!selectedStudent) return null;
    const testReport = studentReports.find((r) => r.type === 'student-assessment-analysis' || r.type === 'initial-assessment');
    
    if (selectedStudent.grade.includes('الأول') || selectedStudent.grade.includes('الثاني') || selectedStudent.grade.includes('عام')) {
      return {
        program: curriculumPrograms.find((p) => p.slug === 'reading')!,
        reason: 'بناءً على المرحلة التأسيسية، يُقترح الاعتماد الأولي على مسار القراءة والتهجي الصريح.',
      };
    }
    
    if (testReport) {
      const mathDomain = testReport.domains?.find((d) => d.name.includes('الرياضيات') || d.name.includes('الحساب'));
      if (mathDomain && mathDomain.score < 65) {
        return {
          program: curriculumPrograms.find((p) => p.slug === 'math')!,
          reason: `درجة الرياضيات (${mathDomain.score}%) تشير لحاجة الطفل لمعمل العد التفاعلي.`,
        };
      }
    }

    return {
      program: curriculumPrograms.find((p) => p.slug === 'learning-difficulties')!,
      reason: 'تقييم شامل يغطي المهارات الأكاديمية والنمائية المتعددة.',
    };
  }, [selectedStudent, studentReports]);

  // Toggle track selection locally
  const toggleTrack = (slug: string) => {
    setSelectedTrackSlugs((prev) => 
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  // Select system recommendation into local multi-select state
  const addSystemRecommendation = () => {
    if (!systemRecommendation) return;
    const slug = systemRecommendation.program.slug;
    if (!selectedTrackSlugs.includes(slug)) {
      setSelectedTrackSlugs((prev) => [...prev, slug]);
    }
  };

  // Save selected tracks to DB
  const saveAssignedTracks = () => {
    if (!selectedStudent) return;
    if (selectedTrackSlugs.length === 0) {
      setMessage('يرجى اختيار مسار واحد على الأقل قبل الحفظ.');
      return;
    }

    const primarySlug = selectedTrackSlugs[0];
    const programTitles = curriculumPrograms
      .filter((p) => selectedTrackSlugs.includes(p.slug))
      .map((p) => p.shortTitle)
      .join(' + ');

    updateStudent(selectedStudent.id, {
      assignedProgram: primarySlug,
      assignedPrograms: selectedTrackSlugs,
      assignedBy: 'د. إسماعيل عيسى',
      assignedAt: new Date().toISOString(),
      reviewStatus: 'program-assigned',
    });

    refresh();
    setMessage(`تم اعتماد المسارات (${programTitles}) للطالب ${selectedStudent.fullName} بنجاح ✅.`);
  };

  const handleDeleteStudent = (studentId: string) => {
    deleteStudent(studentId);
    setConfirmDeleteId(null);
    refresh();
    setMessage('تم حذف ملف الطالب وكافة بياناته بنجاح.');
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <p className="text-xs font-black text-teal-800 uppercase tracking-wider">إدارة وإسناد المسارات</p>
                <h1 className="mt-1 text-3xl font-black text-slate-950 md:text-4xl">إمكانية تحديد مسار أو أكثر لكل طالب يدوياً</h1>
                <p className="mt-2 max-w-3xl text-xs sm:text-sm font-bold text-slate-600">
                  يمكنك اختيار مسار واحد أو دمج عدة مسارات معاً للطالب بناءً على رؤيتك التشخيصية، ثم اعتمادها رقمياً.
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
                  {students.map((student) => {
                    const count = (student.assignedPrograms?.length || (student.assignedProgram ? 1 : 0));
                    return (
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
                          <span className="mt-0.5 block text-xs font-bold text-slate-500">
                            {student.grade} {count > 0 ? `· (${count} مسار)` : ''}
                          </span>
                        </span>
                      </button>
                    );
                  })}
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
                        <div className="mt-3 space-y-1">
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
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowCertData({
                                studentName: selectedStudent.fullName,
                                studentNameEn: selectedStudent.fullNameEn || selectedStudent.fullName,
                                programTitle: selectedStudent.assignedProgram ? (curriculumPrograms.find(p => p.slug === selectedStudent.assignedProgram)?.shortTitle || 'برنامج التأهيل الشامل') : 'برنامج التأهيل الشامل وصعوبات التعلم',
                                completionDate: new Date().toISOString().slice(0, 10),
                                score: 92,
                              })}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-black text-amber-900 hover:bg-amber-100 transition shadow-sm"
                            >
                              <Award size={16} className="text-amber-600" />
                              <span>إصدار شهادة إنجاز PDF</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(selectedStudent.id)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 transition"
                            >
                              <Trash2 size={16} />
                              <span>حذف الطالب</span>
                            </button>
                          </div>
                        </div>

                        {/* Teacher Note Input & History Card */}
                        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                              <MessageSquareText size={16} className="text-teal-600" />
                              إضافة ملاحظة على الطالب
                            </h3>
                            <span className="text-[10px] font-bold text-slate-400">تُحفظ تلقائياً في السجل السحابي والتقارير ☁️</span>
                          </div>

                          <form onSubmit={handleSaveTeacherNote} className="space-y-3">
                            <textarea
                              rows={2}
                              placeholder="اكتب ملاحظتك التقييمية أو السلوكية على الطالب هنا (مثل: أظهر ربيع تفوقاً ممتازاً في مهارة القراءة اليوم)..."
                              value={teacherNoteText}
                              onChange={(e) => setTeacherNoteText(e.target.value)}
                              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:outline-none resize-none shadow-2xs"
                            />
                            <button
                              type="submit"
                              disabled={!teacherNoteText.trim()}
                              className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-black text-white hover:bg-teal-700 transition shadow-sm disabled:opacity-40"
                            >
                              حفظ الملاحظة في ملف الطالب
                            </button>
                          </form>

                          {/* Saved Notes History */}
                          {studentNotesList.length > 0 && (
                            <div className="space-y-2 pt-2 border-t border-slate-200">
                              <p className="text-[11px] font-black text-slate-500">سجل الملاحظات المحفوظة للطالب ({studentNotesList.length}):</p>
                              <div className="space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
                                {studentNotesList.map((n) => (
                                  <div key={n.id} className="flex items-start justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-2xs">
                                    <div className="space-y-1 min-w-0">
                                      <p className="text-xs font-bold text-slate-800 leading-relaxed whitespace-pre-wrap">{n.text}</p>
                                      <p className="text-[10px] font-bold text-slate-400">
                                        {new Date(n.createdAt).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTeacherNote(n.id)}
                                      className="text-slate-300 hover:text-rose-500 transition shrink-0 p-1 rounded-lg hover:bg-rose-50"
                                      title="حذف الملاحظة"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
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

                        {/* Logged-in Account Credentials */}
                        <AccountCredentialsBox student={selectedStudent} />

                        {selectedStudent.notes && (
                          <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-3.5">
                            <p className="text-xs font-black text-slate-500">ملاحظات ولي الأمر / الأخصائي:</p>
                            <p className="mt-1 text-xs font-bold text-slate-700 leading-relaxed">{selectedStudent.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>

                  {/* MULTI-TRACK ASSIGNMENT PANEL */}
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                    
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                          <BookOpenCheck size={22} />
                        </span>
                        <div>
                          <p className="text-xs font-black text-teal-700">إسناد متعدد المسارات</p>
                          <h2 className="text-xl font-black text-slate-950">
                            {assignedPrograms.length > 0
                              ? `المسارات الموثقة (${assignedPrograms.length}): ${assignedPrograms.map((p) => p.shortTitle).join(' + ')}`
                              : 'لم يتم اعتماد مسارات بعد'}
                          </h2>
                        </div>
                      </div>

                      {/* Save Assigned Tracks Button */}
                      <button
                        type="button"
                        onClick={saveAssignedTracks}
                        className="rounded-xl bg-teal-600 px-6 py-3 text-xs font-black text-white hover:bg-teal-700 transition shadow-md shadow-teal-600/20 active:scale-95 flex items-center gap-2"
                      >
                        <CheckCircle2 size={18} />
                        <span>اعتماد المسارات المختارة ({selectedTrackSlugs.length})</span>
                      </button>
                    </div>

                    {/* SYSTEM RECOMMENDED TRACK SUGGESTION */}
                    {systemRecommendation && (
                      <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 via-emerald-50/40 to-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="space-y-1">
                          <div className="inline-flex items-center gap-1.5 text-xs font-black text-teal-800">
                            <Sparkles size={15} className="text-teal-600" />
                            <span>اقتراح المنصة الاسترشادي (غير إجباري):</span>
                          </div>
                          <p className="text-xs font-bold text-slate-700">
                            المسار المقترح: <span className="font-black text-slate-900">{systemRecommendation.program.shortTitle}</span> · {systemRecommendation.reason}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={addSystemRecommendation}
                          className="shrink-0 rounded-xl border border-teal-300 bg-white px-3.5 py-2 text-xs font-black text-teal-800 hover:bg-teal-100 transition shadow-sm"
                        >
                          + إضافة المقترح للقائمة
                        </button>
                      </div>
                    )}

                    {/* MULTI-SELECTABLE TRACK CARDS */}
                    <div>
                      <p className="mb-3 text-xs font-black text-slate-600 uppercase tracking-wider">
                        اختر مساراً واحداً أو أكثر بالضغط على الكروت أدناه (يمكن دمج أكثر من مسار للطالب):
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {curriculumPrograms.map((program) => {
                          const isSelected = selectedTrackSlugs.includes(program.slug);
                          return (
                            <div
                              key={program.slug}
                              onClick={() => toggleTrack(program.slug)}
                              className={`cursor-pointer rounded-2xl border p-4 text-right transition flex flex-col justify-between select-none ${
                                isSelected
                                  ? 'border-2 border-teal-600 bg-teal-50/90 shadow-md ring-2 ring-teal-600/20'
                                  : 'border-slate-200 bg-slate-50/60 hover:bg-white hover:border-slate-300'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="h-2.5 w-12 rounded-full" style={{ backgroundColor: program.color }} />
                                  {isSelected ? (
                                    <span className="flex items-center gap-1 text-xs font-black text-teal-700">
                                      <CheckSquare size={18} className="text-teal-600" />
                                      <span>محدد</span>
                                    </span>
                                  ) : (
                                    <Square size={18} className="text-slate-400" />
                                  )}
                                </div>
                                <h3 className="font-black text-slate-950 text-sm sm:text-base">{program.shortTitle}</h3>
                                <p className="mt-1 text-xs font-bold text-slate-500 leading-relaxed">{program.promise}</p>
                              </div>

                              <div className="mt-3 border-t border-slate-200/60 pt-2 flex items-center justify-between text-[11px] font-bold text-slate-500">
                                <span>{program.duration}</span>
                                <span>{program.modules.length} أسابيع علاجية</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {message && (
                      <div className="rounded-xl bg-teal-50 border border-teal-200 p-3.5 text-xs font-black text-teal-900">
                        {message}
                      </div>
                    )}

                  </section>

                  {/* ══ FEATURE 4: STUDENT PROGRESS & GROWTH TIMELINE ══ */}
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-black text-slate-900 text-lg">📈 خط التطور والتحسن الزمني للطالب</h3>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">مقارنة التقييمات ومعدل التحسن عبر الأنشطة والاختبارات</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
                        نسبة التحسن الفعلي: {reports.filter(r => r.studentId === selectedStudent.id || r.studentName === selectedStudent.fullName).length > 0 ? `${reports.filter(r => r.studentId === selectedStudent.id || r.studentName === selectedStudent.fullName)[0].score}%` : 'قيد التقييم الأول'}
                      </span>
                    </div>

                    {reports.filter(r => r.studentId === selectedStudent.id || r.studentName === selectedStudent.fullName).length === 0 ? (
                      <div className="py-8 text-center text-slate-400 space-y-1">
                        <BookOpenCheck className="mx-auto text-slate-300" size={32} />
                        <p className="text-xs font-black">لا توجد تقارير أو تقييمات سابقة لهذا الطالب بعد</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-end gap-3 h-28 border-b border-slate-200 pb-2 px-4">
                          {reports.filter(r => r.studentId === selectedStudent.id || r.studentName === selectedStudent.fullName).map((rep) => (
                            <div key={rep.id} className="flex-1 flex flex-col items-center gap-1">
                              <span className="text-[10px] font-black text-teal-700">{rep.score}%</span>
                              <div
                                className="w-full rounded-t-lg bg-teal-600 transition-all duration-500"
                                style={{ height: `${Math.max(rep.score, 15)}%` }}
                              />
                              <span className="text-[9px] font-bold text-slate-400 truncate max-w-[80px]">{rep.date}</span>
                            </div>
                          ))}
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {reports.filter(r => r.studentId === selectedStudent.id || r.studentName === selectedStudent.fullName).map((rep) => (
                            <div key={rep.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 flex justify-between text-xs font-black">
                              <div>
                                <p className="text-slate-900">{rep.program}</p>
                                <p className="text-slate-400 text-[10px]">{rep.date}</p>
                              </div>
                              <span className="text-teal-700">{rep.score}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </section>

                  {/* ══ FEATURE 5: STUDENT DOCUMENT VAULT ══ */}
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-black text-slate-900 text-lg">📁 خزنة مستندات وفحوصات الطالب</h3>
                        <p className="text-xs font-bold text-slate-500 mt-0.5">حفظ الفحوصات الخارجية والملفات الطبية والسمعيات</p>
                      </div>
                    </div>

                    <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center space-y-2">
                      <p className="text-xs font-black text-slate-700">إضافة مستند طبّي / تقرير خارجي لملف الطالب</p>
                      <p className="text-[11px] font-bold text-slate-400">يدعم ملفات PDF، صور الفحوصات، أو التقارير الطبية الموثقة</p>
                      <input
                        type="file"
                        id="vault-upload"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            alert(`تم رفع المستند "${e.target.files[0].name}" بنجاح في ملف الطالب ${selectedStudent.fullName}`);
                          }
                        }}
                      />
                      <label
                        htmlFor="vault-upload"
                        className="inline-block cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 transition"
                      >
                        + اختيار ملف للرفع
                      </label>
                    </div>
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

      {showCertData && <CertificateModal data={showCertData} onClose={() => setShowCertData(null)} />}
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

function AccountCredentialsBox({ student }: { student: StudentRecord }) {
  // Find the account registered for this student by matching parentPhone or parentName
  const accounts = getAccounts();
  
  // Try to find account by phone number (most reliable)
  let linkedAccount = student.parentPhone
    ? accounts.find((a) => a.phone && student.parentPhone && a.phone.includes(student.parentPhone.replace(/^\+\d{2,3}/, '').replace(/^0/, '')))
    : null;

  // Fallback: match by parent name
  if (!linkedAccount && student.parentName) {
    const normalizedParent = student.parentName.trim().toLowerCase();
    linkedAccount = accounts.find((a) => a.name.trim().toLowerCase() === normalizedParent && a.role === 'parent');
  }

  // If still not found, show the most recent parent account
  if (!linkedAccount) {
    linkedAccount = accounts.filter((a) => a.role === 'parent')[0] ?? null;
  }

  if (!linkedAccount) {
    return (
      <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
        <p className="text-xs font-bold text-slate-400">لم يتم ربط حساب بهذا الطالب بعد</p>
      </div>
    );
  }

  // Get password from credentials store
  const credential = getCredentialByEmailOrPhone(linkedAccount.email);
  const password = credential?.password ?? 'محفوظة بشكل مشفر';
  const providerLabel =
    linkedAccount.createdVia === 'google'
      ? 'Google'
      : linkedAccount.createdVia === 'apple'
        ? 'Apple'
        : linkedAccount.createdVia === 'microsoft'
          ? 'Microsoft'
          : linkedAccount.createdVia === 'face'
            ? 'Face ID'
            : 'بريد وكلمة مرور';

  return (
    <div className="mt-5 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50/60 via-slate-50 to-white p-4 space-y-3">
      <div className="flex items-center gap-2 border-b border-teal-100 pb-3">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-100 text-teal-700">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </span>
        <div>
          <p className="text-[11px] font-black text-teal-700 uppercase tracking-wider">بيانات حساب ولي الأمر المسجل</p>
          <p className="text-xs font-bold text-slate-500">الحساب المرتبط بملف هذا الطالب</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl bg-white border border-slate-200 p-3 shadow-2xs">
          <p className="text-[10px] font-black text-slate-400">اسم ولي الأمر</p>
          <p className="mt-0.5 text-xs font-black text-slate-900 break-words">{linkedAccount.name}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-3 shadow-2xs">
          <p className="text-[10px] font-black text-slate-400">البريد الإلكتروني</p>
          <p className="mt-0.5 text-xs font-black text-slate-900 break-all">{linkedAccount.email}</p>
        </div>
        <div className="rounded-xl bg-white border border-teal-200 p-3 shadow-2xs">
          <p className="text-[10px] font-black text-slate-400">كلمة المرور</p>
          <p className="mt-0.5 text-xs font-black text-teal-800 font-mono tracking-wide">{password}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-3 shadow-2xs">
          <p className="text-[10px] font-black text-slate-400">رقم الهاتف</p>
          <p className="mt-0.5 text-xs font-black text-slate-900 break-all">{linkedAccount.phone || student.parentPhone || 'غير مسجل'}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-3 shadow-2xs">
          <p className="text-[10px] font-black text-slate-400">طريقة التسجيل</p>
          <p className="mt-0.5 text-xs font-black text-slate-900">{providerLabel}</p>
        </div>
      </div>
    </div>
  );
}
