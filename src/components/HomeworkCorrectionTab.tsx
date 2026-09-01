'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, Clock, Send, Award, BookOpen,
  Sparkles, RefreshCw, UserCheck, AlertCircle, ChevronDown,
  ChevronUp, Check, Bell, MessageSquare, Filter, FileText, CheckCheck
} from 'lucide-react';
import {
  getAllQuizzes,
  getSubmissions,
  saveSubmission,
  autoGradeSubmission,
  CURRICULUM_SUBJECTS,
  type GeneratedQuiz,
  type StudentQuizSubmission,
} from '@/lib/curriculumDb';

interface Student {
  id: string;
  name: string;
  phone?: string;
}

interface Props {
  students?: Student[];
  onNavigateToCurriculum?: () => void;
}

export default function HomeworkCorrectionTab({ students = [], onNavigateToCurriculum }: Props) {
  const [quizzes, setQuizzes] = useState<GeneratedQuiz[]>(() => getAllQuizzes());
  const [submissions, setSubmissions] = useState<StudentQuizSubmission[]>(() => getSubmissions());
  const [selectedQuizId, setSelectedQuizId] = useState<string>('all');
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  const [teacherNotes, setTeacherNotes] = useState<Record<string, string>>({});
  const [isAutoGradingAll, setIsAutoGradingAll] = useState(false);

  const refreshData = () => {
    setQuizzes(getAllQuizzes());
    setSubmissions(getSubmissions());
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Filter submissions
  const filteredSubmissions = selectedQuizId === 'all'
    ? submissions
    : submissions.filter(s => s.quizId === selectedQuizId);

  // Auto-grade a specific submission
  const handleAutoGrade = (sub: StudentQuizSubmission) => {
    const quiz = quizzes.find(q => q.id === sub.quizId);
    if (!quiz) return;
    const graded = autoGradeSubmission(sub, quiz);
    refreshData();
    alert(`✅ تم التصحيح التلقائي للطالب (${sub.studentName}) بنجاح! النتيجة: ${graded.score}%`);
  };

  // Auto-grade ALL ungraded submissions
  const handleGradeAll = () => {
    setIsAutoGradingAll(true);
    let count = 0;
    submissions.forEach(sub => {
      const quiz = quizzes.find(q => q.id === sub.quizId);
      if (quiz && (sub.score === undefined || sub.score === null)) {
        autoGradeSubmission(sub, quiz);
        count++;
      }
    });
    refreshData();
    setIsAutoGradingAll(false);
    alert(`🎉 تم التصحيح التلقائي لجميع الإجابات الواردة (${count} إجابة) بنجاح!`);
  };

  // Save teacher note
  const handleSaveNote = (subId: string) => {
    const sub = submissions.find(s => s.id === subId);
    if (!sub) return;
    const note = teacherNotes[subId];
    saveSubmission({
      ...sub,
      correctionNote: note,
    });
    refreshData();
    alert('✅ تم حفظ ملاحظات د. إسماعيل عيسى على إجابة الطالب!');
  };

  // Send WhatsApp Result Alert to Parent
  const handleSendResultWhatsApp = (sub: StudentQuizSubmission) => {
    const quiz = quizzes.find(q => q.id === sub.quizId);
    const subject = CURRICULUM_SUBJECTS.find(s => s.id === quiz?.subjectId);
    const student = students.find(s => s.id === sub.studentId || s.name === sub.studentName);

    const scoreText = sub.score !== undefined ? `${sub.score}%` : 'قيد المراجعة';
    const noteText = sub.correctionNote ? `\n*ملاحظات د. إسماعيل:* ${sub.correctionNote}` : '';

    const text = `*فصل د. إسماعيل عيسى*\n\nالسلام عليكم ورحمة الله\n\nنحيطكم علماً بنتيجة تصحيح الواجب المدرسي:\n*الطالب:* ${sub.studentName}\n*المادة:* ${subject?.name || 'الواجب المدرسي'}\n*عنوان الواجب:* ${quiz?.title || 'واجب تفاعلي'}\n*الدرجة المستحقة:* ${scoreText}${noteText}\n\nشكراً لاهتمامكم ومتابعتكم المستمرة\n_د. إسماعيل عيسى — منصة مسار_`;

    const phone = (student?.phone || '').replace(/\D/g, '');
    const waUrl = phone
      ? `https://wa.me/966${phone.replace(/^0/, '')}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="space-y-6 text-slate-900" dir="rtl">

      {/* ── BANNER HEADER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06392c] via-[#0b4d3c] to-[#04291e] p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <CheckCheck className="h-6 w-6 text-amber-400" />
              <span className="font-black text-emerald-200 text-sm">منصة مَسَار · لوحة تصحيح الواجبات التلقائية</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">تصحيح الواجبات وتقييم الطلاب 📝</h2>
            <p className="mt-1.5 text-sm font-semibold text-emerald-100/90">
              استقبال إجابات الطلاب للواجبات الصادرة من المناهج، التصحيح التلقائي بالذكاء الاصطناعي، وإرسال النتائج لأولياء الأمور.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleGradeAll}
              disabled={isAutoGradingAll || submissions.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 text-slate-950 px-5 py-2.5 rounded-2xl text-xs font-black transition shadow-lg active:scale-95 border border-amber-300/60 cursor-pointer disabled:opacity-50"
            >
              <Sparkles size={15} /> تصحيح الكل تلقائياً بالـ AI ⚡
            </button>
            {onNavigateToCurriculum && (
              <button
                onClick={onNavigateToCurriculum}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer"
              >
                <BookOpen size={15} /> صفحة المناهج
              </button>
            )}
          </div>
        </div>

        {/* Quick Metrics */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 text-center border border-white/15">
            <div className="text-xl font-black text-white font-mono">{quizzes.length}</div>
            <div className="text-[11px] font-bold text-emerald-200 mt-0.5">📋 إجمالي الواجبات</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 text-center border border-white/15">
            <div className="text-xl font-black text-white font-mono">{submissions.length}</div>
            <div className="text-[11px] font-bold text-emerald-200 mt-0.5">📥 إجابات واردة</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 text-center border border-white/15">
            <div className="text-xl font-black text-white font-mono">
              {submissions.filter(s => s.score !== undefined).length}
            </div>
            <div className="text-[11px] font-bold text-emerald-200 mt-0.5">✅ تم تصحيحها</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 text-center border border-white/15">
            <div className="text-xl font-black text-white font-mono">
              {submissions.length > 0
                ? Math.round(submissions.reduce((acc, curr) => acc + (curr.score || 0), 0) / submissions.length) + '%'
                : '100%'}
            </div>
            <div className="text-[11px] font-bold text-emerald-200 mt-0.5">🎯 متوسط الدرجات</div>
          </div>
        </div>
      </div>

      {/* ── FILTER BY QUIZ ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-emerald-700" />
          <span className="text-xs font-black text-slate-700">تصفية حسب الواجب:</span>
          <select
            value={selectedQuizId}
            onChange={e => setSelectedQuizId(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">جميع الواجبات ({quizzes.length})</option>
            {quizzes.map(q => {
              const subj = CURRICULUM_SUBJECTS.find(s => s.id === q.subjectId);
              return (
                <option key={q.id} value={q.id}>
                  {subj?.icon} {q.title}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshData}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw size={14} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* ── SUBMISSIONS LIST ── */}
      <div className="space-y-4">
        {filteredSubmissions.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto text-2xl">
              📝
            </div>
            <h3 className="font-black text-base text-slate-800">لا توجد إجابات واردة حتى الآن</h3>
            <p className="text-xs text-slate-500 font-semibold max-w-md mx-auto">
              عندما يجيب الطلاب على الواجبات المنشورة من المناهج، ستظهر هنا فوراً للتصحيح التلقائي واعتماد الدرجات.
            </p>
            {onNavigateToCurriculum && (
              <button
                onClick={onNavigateToCurriculum}
                className="mt-2 inline-flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition cursor-pointer shadow-sm"
              >
                <BookOpen size={14} className="text-emerald-200" /> الانتقال لصفحة المناهج والكتب
              </button>
            )}
          </div>
        ) : (
          filteredSubmissions.map(sub => {
            const quiz = quizzes.find(q => q.id === sub.quizId);
            const subject = CURRICULUM_SUBJECTS.find(s => s.id === quiz?.subjectId);
            const isExpanded = expandedSubId === sub.id;
            const isGraded = sub.score !== undefined && sub.score !== null;

            return (
              <div
                key={sub.id}
                className={`rounded-3xl border bg-white shadow-sm overflow-hidden transition-all ${
                  isGraded ? 'border-emerald-200' : 'border-amber-200 bg-amber-50/10'
                }`}
              >
                {/* Submission Header Bar */}
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base border shadow-xs ${
                      isGraded && sub.score! >= 80
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                        : isGraded
                        ? 'bg-amber-100 border-amber-300 text-amber-900'
                        : 'bg-slate-100 border-slate-300 text-slate-700'
                    }`}>
                      {sub.studentName[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm sm:text-base text-slate-900">{sub.studentName}</h4>
                        {isGraded ? (
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono border ${
                            sub.score! >= 85
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : sub.score! >= 60
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}>
                            الدرجة: {sub.score}%
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-black">
                            قيد التصحيح ⏳
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-bold mt-1 flex items-center gap-2 flex-wrap">
                        <span>{subject?.icon} {subject?.name}</span>
                        <span>·</span>
                        <span>{quiz?.title || 'واجب مدرسي'}</span>
                        <span>·</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          {new Date(sub.submittedAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => handleAutoGrade(sub)}
                      className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 px-3 py-2 rounded-xl text-xs font-black transition cursor-pointer"
                      title="إعادة التصحيح التلقائي"
                    >
                      <Sparkles size={13} className="text-amber-500" /> تصحيح AI
                    </button>
                    <button
                      onClick={() => handleSendResultWhatsApp(sub)}
                      className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-sm"
                    >
                      <Bell size={13} /> إشعار الولي WhatsApp 📱
                    </button>
                    <button
                      onClick={() => setExpandedSubId(isExpanded ? null : sub.id)}
                      className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                      title={isExpanded ? 'إخفاء التفاصيل' : 'عرض الأسئلة والإجابات'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Detailed Breakdown */}
                {isExpanded && quiz && (
                  <div className="p-5 bg-slate-50/70 space-y-4">
                    <h5 className="font-black text-xs text-slate-700 flex items-center gap-2">
                      <FileText size={14} className="text-emerald-700" />
                      تفصيل إجابات الطالب سؤالاً بسؤال:
                    </h5>

                    <div className="space-y-3">
                      {quiz.questions.map((q, qIndex) => {
                        const studentAns = sub.answers[q.id];
                        const isCorrect = (studentAns || '').trim().toLowerCase() === (q.correctAnswer || '').trim().toLowerCase();

                        return (
                          <div
                            key={q.id}
                            className={`rounded-2xl border p-4 transition ${
                              isCorrect
                                ? 'bg-emerald-50/60 border-emerald-200'
                                : 'bg-rose-50/60 border-rose-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2.5">
                                <span className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center shrink-0 mt-0.5 ${
                                  isCorrect ? 'bg-emerald-700 text-white' : 'bg-rose-700 text-white'
                                }`}>
                                  {qIndex + 1}
                                </span>
                                <div>
                                  <p className="text-xs font-black text-slate-900">{q.text}</p>
                                  <div className="mt-2 space-y-1 text-xs font-bold">
                                    <p className={`flex items-center gap-1.5 ${isCorrect ? 'text-emerald-800' : 'text-rose-800'}`}>
                                      <span>إجابة الطالب:</span>
                                      <span className="font-black">{studentAns || '(لم يُجب)'}</span>
                                      {isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                    </p>
                                    {!isCorrect && (
                                      <p className="text-emerald-700 flex items-center gap-1.5">
                                        <span>الإجابة النموذجية:</span>
                                        <span className="font-black">{q.correctAnswer}</span>
                                      </p>
                                    )}
                                    {q.explanation && (
                                      <p className="text-[11px] text-slate-500 mt-1 italic">
                                        💡 {q.explanation}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <span className={`px-2.5 py-1 rounded-xl text-[11px] font-black shrink-0 ${
                                isCorrect ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'
                              }`}>
                                {isCorrect ? '✅ صح' : '❌ خطأ'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Dr. Ismail Teacher Feedback Note Box */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                      <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                        <MessageSquare size={14} className="text-emerald-700" />
                        ملاحظات وتوجيهات د. إسماعيل عيسى للطالب والأسرة:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          defaultValue={sub.correctionNote || ''}
                          onChange={e => setTeacherNotes(prev => ({ ...prev, [sub.id]: e.target.value }))}
                          placeholder="مثال: أحسنت يا أنس! رائع في قراءة النص ونحتاج تركيز أكبر في السؤال الثاني 🌟"
                          className="flex-1 border border-slate-300 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 placeholder:font-normal"
                        />
                        <button
                          onClick={() => handleSaveNote(sub.id)}
                          className="bg-emerald-800 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer"
                        >
                          حفظ
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
