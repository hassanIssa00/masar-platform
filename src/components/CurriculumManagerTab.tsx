'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  BookOpen, Upload, Trash2, Plus, Sparkles, Send, Eye,
  FileText, Image as ImageIcon, Loader2, CheckCircle2, X,
  ChevronDown, ChevronUp, GraduationCap, RefreshCw, ClipboardList,
  AlertCircle, Bell, Check
} from 'lucide-react';
import {
  CURRICULUM_SUBJECTS,
  getCurriculumFiles,
  saveCurriculumFile,
  deleteCurriculumFile,
  getAllQuizzes,
  saveQuiz,
  createQuizId,
  type CurriculumFile,
  type GeneratedQuiz,
  type QuizQuestion,
  type SubjectGrade,
} from '@/lib/curriculumDb';

interface Student {
  id: string;
  name: string;
  phone?: string;
}

interface Props {
  students?: Student[];
  onNavigateToCorrection?: () => void;
}

const GRADE_LABELS: Record<SubjectGrade, string> = {
  grade1: 'الصف الأول الابتدائي',
  grade2: 'الصف الثاني الابتدائي',
};

export default function CurriculumManagerTab({ students = [], onNavigateToCorrection }: Props) {
  const [activeGrade, setActiveGrade] = useState<SubjectGrade>('grade1');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [files, setFiles] = useState<CurriculumFile[]>(() => getCurriculumFiles());
  const [quizzes, setQuizzes] = useState<GeneratedQuiz[]>(() => getAllQuizzes());
  const [uploadingSubject, setUploadingSubject] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<string | null>(null);

  // Quiz Builder State
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderSubjectId, setBuilderSubjectId] = useState('');
  const [builderFileId, setBuilderFileId] = useState('');
  const [builderPageFrom, setBuilderPageFrom] = useState(1);
  const [builderPageTo, setBuilderPageTo] = useState(10);
  const [builderQType, setBuilderQType] = useState<'multiple_choice' | 'true_false' | 'fill_blank'>('multiple_choice');
  const [builderQCount, setBuilderQCount] = useState(10);
  const [builderTitle, setBuilderTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[]>([]);
  const [sendingQuiz, setSendingQuiz] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSubjectRef = useRef<string>('');

  const refreshFiles = () => setFiles(getCurriculumFiles());
  const refreshQuizzes = () => setQuizzes(getAllQuizzes());

  // ── Upload handler ──────────────────────────────────────────────────────────
  const handleFileUpload = useCallback(async (rawFile: File, subjectId: string) => {
    if (!rawFile) return;
    setUploadingSubject(subjectId);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split('base64,')[1] || '';
      const sizeKb = Math.round(rawFile.size / 1024);

      saveCurriculumFile({
        subjectId,
        name: rawFile.name.replace(/\.[^/.]+$/, ''),
        mimeType: rawFile.type as any,
        base64Data: base64,
        sizeKb,
      });

      refreshFiles();
      setUploadingSubject(null);
    };
    reader.readAsDataURL(rawFile);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, subjectId: string) => {
    e.preventDefault();
    setIsDragOver(null);
    const f = e.dataTransfer.files[0];
    if (f) handleFileUpload(f, subjectId);
  }, [handleFileUpload]);

  // ── Quiz generation ─────────────────────────────────────────────────────────
  const handleGenerateQuiz = async () => {
    const subject = CURRICULUM_SUBJECTS.find(s => s.id === builderSubjectId);
    const file = files.find(f => f.id === builderFileId);
    if (!subject || !file) return;

    setGenerating(true);
    setGeneratedQuestions([]);

    try {
      const res = await fetch('/api/curriculum/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: subject.name,
          gradeLabel: GRADE_LABELS[subject.grade],
          fileBase64: file.base64Data,
          fileMimeType: file.mimeType,
          pageFrom: builderPageFrom,
          pageTo: builderPageTo,
          questionType: builderQType,
          questionCount: builderQCount,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.questions)) {
        setGeneratedQuestions(data.questions);
      } else {
        alert('❌ تعذر توليد الأسئلة: ' + (data.error || 'خطأ غير معروف'));
      }
    } catch (err: any) {
      alert('❌ خطأ في الاتصال بالذكاء الاصطناعي: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── Send quiz to students ────────────────────────────────────────────────────
  const handleSendQuiz = async () => {
    if (!generatedQuestions.length || !builderSubjectId) return;
    setSendingQuiz(true);

    const subject = CURRICULUM_SUBJECTS.find(s => s.id === builderSubjectId);
    const quizTitle = builderTitle || `واجب ${subject?.name} — صفحات ${builderPageFrom}-${builderPageTo}`;

    const quiz: GeneratedQuiz = {
      id: createQuizId(),
      subjectId: builderSubjectId,
      fileId: builderFileId,
      title: quizTitle,
      pageFrom: builderPageFrom,
      pageTo: builderPageTo,
      questionType: builderQType,
      questions: generatedQuestions,
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      status: 'sent',
    };

    saveQuiz(quiz);
    refreshQuizzes();

    // Send WhatsApp notifications to parents
    if (students.length > 0) {
      const whatsappText = `📚 *مدارس الإخلاص الأهلية بجدة*\n\nمساء الخير 👋\n\nتم إرسال واجب جديد لنجلكم:\n📖 *المادة:* ${subject?.name}\n📄 *الصفحات:* ${builderPageFrom} - ${builderPageTo}\n❓ *عدد الأسئلة:* ${generatedQuestions.length} سؤال\n\n_منصة مسار التعليمية_`;

      students.forEach(s => {
        if (s.phone) {
          const phone = s.phone.replace(/\D/g, '');
          const waUrl = `https://wa.me/966${phone.replace(/^0/, '')}?text=${encodeURIComponent(whatsappText)}`;
          window.open(waUrl, '_blank');
        }
      });
    }

    setSendingQuiz(false);
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      setBuilderOpen(false);
      setGeneratedQuestions([]);
      setBuilderTitle('');
    }, 2500);
  };

  const subjectsForGrade = CURRICULUM_SUBJECTS.filter(s => s.grade === activeGrade);
  const sentQuizzes = quizzes.filter(q => q.status !== 'draft');

  return (
    <div className="space-y-6 text-slate-900" dir="rtl">

      {/* ── BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06392c] via-[#0b4d3c] to-[#04291e] p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="h-6 w-6 text-amber-400" />
              <span className="font-black text-emerald-200 text-sm">منصة مَسَار · إدارة المناهج الدراسية</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">إدارة المناهج وتوليد الواجبات الذكي 📚</h2>
            <p className="mt-1.5 text-sm font-semibold text-emerald-100/90">
              ارفع ملفات المناهج (PDF / صور) لكل مادة — الذكاء الاصطناعي يقرأ كل حرف ويولد واجبات ذكية من أي صفحات محددة.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setBuilderOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 px-5 py-2.5 rounded-2xl text-xs font-black transition shadow-lg active:scale-95 border border-amber-300/60 cursor-pointer"
            >
              <Sparkles size={15} /> إنشاء واجب ذكي من المنهج 🤖
            </button>
            {onNavigateToCorrection && (
              <button
                onClick={onNavigateToCorrection}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer"
              >
                <ClipboardList size={15} /> تصحيح الواجبات
              </button>
            )}
          </div>
        </div>

        {/* Stats bar */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'ملفات مرفوعة', value: files.length, icon: '📄' },
            { label: 'واجبات مُرسلة', value: sentQuizzes.length, icon: '📝' },
            { label: 'مواد دراسية', value: CURRICULUM_SUBJECTS.length / 2, icon: '📚' },
          ].map(stat => (
            <div key={stat.label} className="bg-white/10 backdrop-blur-md rounded-2xl p-3 text-center border border-white/15">
              <div className="text-xl font-black text-white">{stat.value}</div>
              <div className="text-[11px] font-bold text-emerald-200 mt-0.5">{stat.icon} {stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── GRADE TABS ── */}
      <div className="flex gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        {(['grade1', 'grade2'] as SubjectGrade[]).map(grade => (
          <button
            key={grade}
            onClick={() => setActiveGrade(grade)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeGrade === grade
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            🏫 {GRADE_LABELS[grade]}
          </button>
        ))}
      </div>

      {/* ── SUBJECTS LIST ── */}
      <div className="space-y-3">
        {subjectsForGrade.map(subject => {
          const subjectFiles = files.filter(f => f.subjectId === subject.id);
          const isExpanded = expandedSubject === subject.id;
          const isUploading = uploadingSubject === subject.id;

          return (
            <div
              key={subject.id}
              className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-all ${
                isExpanded ? 'border-emerald-300 shadow-md' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Subject Header */}
              <button
                onClick={() => setExpandedSubject(isExpanded ? null : subject.id)}
                className="w-full flex items-center justify-between p-4 text-right cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl ${subject.color} border border-slate-200 flex items-center justify-center text-xl shrink-0`}>
                    {subject.icon}
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">{subject.name}</h3>
                    <p className="text-xs text-slate-500 font-bold mt-0.5">
                      {subjectFiles.length > 0 ? `${subjectFiles.length} ملف مرفوع` : 'لا توجد ملفات بعد'}
                      {subjectFiles.length > 0 && ' — جاهز للتوليد ✅'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {subjectFiles.length > 0 && (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black border border-emerald-200">
                      {subjectFiles.length} ملف
                    </span>
                  )}
                  {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="border-t border-slate-100 p-4 space-y-4">

                  {/* Existing Files */}
                  {subjectFiles.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-black text-slate-600 flex items-center gap-1.5">
                        <FileText size={13} /> الملفات المرفوعة
                      </h4>
                      {subjectFiles.map(file => (
                        <div key={file.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">
                              {file.mimeType === 'application/pdf' ? '📄' : '🖼️'}
                            </span>
                            <div>
                              <p className="font-black text-xs text-slate-900">{file.name}</p>
                              <p className="text-[11px] text-slate-500 font-bold">
                                {file.mimeType === 'application/pdf' ? 'PDF' : 'صورة'}
                                {file.sizeKb && ` · ${file.sizeKb} KB`}
                                {' · '}
                                {new Date(file.uploadedAt).toLocaleDateString('ar-SA')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setBuilderSubjectId(subject.id);
                                setBuilderFileId(file.id);
                                setBuilderOpen(true);
                              }}
                              className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 px-2.5 py-1.5 rounded-lg text-[11px] font-black transition cursor-pointer"
                            >
                              <Sparkles size={12} /> أنشئ واجب
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`هل تريد حذف الملف "${file.name}"؟`)) {
                                  deleteCurriculumFile(file.id);
                                  refreshFiles();
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(subject.id); }}
                    onDragLeave={() => setIsDragOver(null)}
                    onDrop={(e) => handleDrop(e, subject.id)}
                    onClick={() => {
                      uploadSubjectRef.current = subject.id;
                      fileInputRef.current?.click();
                    }}
                    className={`rounded-2xl border-2 border-dashed transition-all cursor-pointer p-6 text-center ${
                      isDragOver === subject.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/30 bg-slate-50/60'
                    }`}
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 size={28} className="text-emerald-600 animate-spin" />
                        <p className="text-xs font-black text-emerald-700">جاري رفع الملف...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload size={24} className="text-slate-400" />
                        <p className="text-xs font-black text-slate-700">
                          اسحب ملف المنهج هنا أو اضغط للرفع
                        </p>
                        <p className="text-[11px] text-slate-400 font-semibold">PDF · PNG · JPG · WEBP</p>
                      </div>
                    )}
                  </div>

                  {/* Quick Create Quiz Button */}
                  {subjectFiles.length > 0 && (
                    <button
                      onClick={() => {
                        setBuilderSubjectId(subject.id);
                        setBuilderFileId(subjectFiles[0].id);
                        setBuilderOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-black transition cursor-pointer"
                    >
                      <Sparkles size={14} className="text-amber-300" />
                      إنشاء واجب ذكي من منهج {subject.name}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── SENT QUIZZES LIST ── */}
      {sentQuizzes.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 space-y-3">
          <h3 className="font-black text-slate-900 flex items-center gap-2">
            <ClipboardList size={18} className="text-emerald-700" />
            الواجبات المرسلة ({sentQuizzes.length})
          </h3>
          <div className="space-y-2">
            {sentQuizzes.slice(0, 10).map(quiz => {
              const subject = CURRICULUM_SUBJECTS.find(s => s.id === quiz.subjectId);
              return (
                <div key={quiz.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{subject?.icon || '📝'}</span>
                    <div>
                      <p className="font-black text-xs text-slate-900">{quiz.title}</p>
                      <p className="text-[11px] text-slate-500 font-bold">
                        {subject?.name} · {quiz.questions.length} سؤال ·
                        أُرسل {new Date(quiz.sentAt || quiz.createdAt).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black border border-emerald-200">
                    ✅ مُرسَل
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFileUpload(f, uploadSubjectRef.current);
          e.target.value = '';
        }}
      />

      {/* ════════════════════════ QUIZ BUILDER MODAL ════════════════════════ */}
      {builderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !generating && !sendingQuiz && setBuilderOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200">

            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-900 to-emerald-800 rounded-t-3xl p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-black text-lg flex items-center gap-2">
                    <Sparkles size={20} className="text-amber-400" />
                    {generatedQuestions.length > 0 ? 'مراجعة وإرسال الواجب' : 'إنشاء واجب ذكي من المنهج'}
                  </h3>
                  <p className="text-emerald-200 text-xs mt-1 font-semibold">
                    الذكاء الاصطناعي سيقرأ الملف ويولد الأسئلة تلقائياً
                  </p>
                </div>
                <button
                  onClick={() => { if (!generating && !sendingQuiz) { setBuilderOpen(false); setGeneratedQuestions([]); } }}
                  className="p-2 rounded-xl hover:bg-white/10 text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {generatedQuestions.length === 0 ? (
                /* ── CONFIGURATION FORM ── */
                <>
                  {/* Subject Selector */}
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1.5">المادة الدراسية</label>
                    <select
                      value={builderSubjectId}
                      onChange={e => { setBuilderSubjectId(e.target.value); setBuilderFileId(''); }}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">— اختر المادة —</option>
                      {(['grade1', 'grade2'] as SubjectGrade[]).map(grade => (
                        <optgroup key={grade} label={GRADE_LABELS[grade]}>
                          {CURRICULUM_SUBJECTS.filter(s => s.grade === grade).map(s => (
                            <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  {/* File Selector */}
                  {builderSubjectId && (
                    <div>
                      <label className="text-xs font-black text-slate-700 block mb-1.5">ملف المنهج</label>
                      {files.filter(f => f.subjectId === builderSubjectId).length === 0 ? (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs font-bold text-amber-800">
                          <AlertCircle size={16} />
                          لم يتم رفع ملفات لهذه المادة بعد — ارفع ملف المنهج أولاً
                        </div>
                      ) : (
                        <select
                          value={builderFileId}
                          onChange={e => setBuilderFileId(e.target.value)}
                          className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                        >
                          <option value="">— اختر الملف —</option>
                          {files.filter(f => f.subjectId === builderSubjectId).map(f => (
                            <option key={f.id} value={f.id}>{f.name} ({f.sizeKb} KB)</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Page Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-black text-slate-700 block mb-1.5">من صفحة</label>
                      <input
                        type="number"
                        min={1}
                        value={builderPageFrom}
                        onChange={e => setBuilderPageFrom(Number(e.target.value))}
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-700 block mb-1.5">إلى صفحة</label>
                      <input
                        type="number"
                        min={builderPageFrom}
                        value={builderPageTo}
                        onChange={e => setBuilderPageTo(Number(e.target.value))}
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Question Type + Count */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-black text-slate-700 block mb-1.5">نوع الأسئلة</label>
                      <select
                        value={builderQType}
                        onChange={e => setBuilderQType(e.target.value as any)}
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="multiple_choice">🔘 اختيار متعدد</option>
                        <option value="true_false">✅ صواب وخطأ</option>
                        <option value="fill_blank">✏️ إكمال الفراغات</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-700 block mb-1.5">عدد الأسئلة</label>
                      <select
                        value={builderQCount}
                        onChange={e => setBuilderQCount(Number(e.target.value))}
                        className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        {[5, 8, 10, 12, 15, 20].map(n => (
                          <option key={n} value={n}>{n} سؤال</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Quiz Title */}
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1.5">عنوان الواجب (اختياري)</label>
                    <input
                      type="text"
                      value={builderTitle}
                      onChange={e => setBuilderTitle(e.target.value)}
                      placeholder="مثال: واجب لغتي — الدرس الثالث"
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-emerald-500 placeholder:text-slate-400 placeholder:font-normal"
                    />
                  </div>

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerateQuiz}
                    disabled={generating || !builderSubjectId || !builderFileId}
                    className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-black transition cursor-pointer ${
                      generating || !builderSubjectId || !builderFileId
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 text-white shadow-lg'
                    }`}
                  >
                    {generating ? (
                      <><Loader2 size={18} className="animate-spin" /> الذكاء الاصطناعي يقرأ المنهج ويولد الأسئلة...</>
                    ) : (
                      <><Sparkles size={18} className="text-amber-300" /> توليد الواجب بالذكاء الاصطناعي 🤖</>
                    )}
                  </button>
                </>
              ) : (
                /* ── GENERATED QUESTIONS REVIEW ── */
                <>
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-emerald-700" />
                      <span className="font-black text-sm text-emerald-900">
                        تم توليد {generatedQuestions.length} سؤال بنجاح! ✨
                      </span>
                    </div>
                    <button
                      onClick={() => { setGeneratedQuestions([]); }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw size={13} /> إعادة التوليد
                    </button>
                  </div>

                  {/* Quiz Title Input */}
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1.5">عنوان الواجب</label>
                    <input
                      type="text"
                      value={builderTitle}
                      onChange={e => setBuilderTitle(e.target.value)}
                      placeholder={`واجب ${CURRICULUM_SUBJECTS.find(s => s.id === builderSubjectId)?.name} — صفحات ${builderPageFrom}-${builderPageTo}`}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Questions Preview */}
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {generatedQuestions.map((q, idx) => (
                      <div key={q.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                        <div className="flex items-start gap-2">
                          <span className="w-6 h-6 rounded-lg bg-emerald-800 text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-xs font-bold text-slate-900">{q.text}</p>
                        </div>
                        {q.options && (
                          <div className="grid grid-cols-2 gap-1.5 mr-8">
                            {q.options.map((opt, oi) => (
                              <span
                                key={oi}
                                className={`text-[11px] font-bold px-2 py-1 rounded-lg ${
                                  opt === q.correctAnswer
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : 'bg-white text-slate-600 border border-slate-200'
                                }`}
                              >
                                {opt === q.correctAnswer ? '✅ ' : ''}{opt}
                              </span>
                            ))}
                          </div>
                        )}
                        {!q.options && (
                          <p className="text-[11px] font-bold text-emerald-700 mr-8">
                            ✅ الإجابة: {q.correctAnswer}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Students notification info */}
                  <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                    <Bell size={16} className="text-blue-600 shrink-0" />
                    <p className="text-xs font-bold text-blue-800">
                      سيتم إرسال إشعار واتساب لأولياء أمور {students.length} طالب تلقائياً عند الإرسال
                    </p>
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleSendQuiz}
                    disabled={sendingQuiz || sentSuccess}
                    className={`w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-sm font-black transition cursor-pointer shadow-lg ${
                      sentSuccess
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-slate-950 active:scale-95'
                    }`}
                  >
                    {sendingQuiz ? (
                      <><Loader2 size={18} className="animate-spin" /> جاري الإرسال...</>
                    ) : sentSuccess ? (
                      <><Check size={18} /> تم إرسال الواجب للطلاب بنجاح! ✅</>
                    ) : (
                      <><Send size={18} /> إرسال الواجب للطلاب + WhatsApp لأولياء الأمور 📱</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
