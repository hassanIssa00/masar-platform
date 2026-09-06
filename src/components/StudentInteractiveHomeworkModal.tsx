'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Highlighter,
  Loader2,
  PenLine,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  Camera,
  FileText,
  Mic,
  Square,
  Upload,
  Trophy,
  Award,
  HelpCircle,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  parseHomeworkCurriculum,
  getCurriculumPageImageUrl,
  type ParsedCurriculumHw,
} from '@/lib/curriculumHomeworkHelper';
import { readCloudCache, syncDocToCloud, writeCloudCache } from '@/lib/firestoreSync';
import { saveStudentHomeworkLog } from '@/lib/classDb';
import { updateHomeworkStatus, HomeworkRecord } from '@/lib/homework';
import { createNotification } from '@/lib/notifications';
import { saveMessage } from '@/lib/cloudStore';

interface Props {
  hw: HomeworkRecord;
  studentId: string;
  studentName: string;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const DRAWINGS_KEY = 'masar.curriculumDrawings.v1';

type Tool = 'pen' | 'highlighter' | 'eraser';

const COLOR_PALETTE = [
  { name: 'أسود', value: '#0f172a' },
  { name: 'أزرق', value: '#1d4ed8' },
  { name: 'أحمر', value: '#dc2626' },
  { name: 'أخضر', value: '#059669' },
  { name: 'بنفسجي', value: '#7c3aed' },
  { name: 'ذهبي', value: '#d97706' },
];

export default function StudentInteractiveHomeworkModal({
  hw,
  studentId,
  studentName,
  onClose,
  onSubmitSuccess,
}: Props) {
  const parsed: ParsedCurriculumHw | null = parseHomeworkCurriculum(hw);

  // If not a curriculum pages homework, fallback to classic submission (text/image/audio)
  const isCurriculumHw = Boolean(parsed);
  const isQuizHw = hw.type === 'QUIZ' || Boolean(hw.questions && hw.questions.length > 0);
  const quizQuestions = hw.questions || [];

  // Quiz Solver State
  const [quizIndex, setQuizIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>(() => {
    return hw.submissionAnswers?.answers || {};
  });
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(
    Boolean(hw.status === 'submitted' || hw.status === 'reviewed' || hw.submissionAnswers)
  );
  const [quizResult, setQuizResult] = useState<{ score: number; total: number; correct: number } | null>(() => {
    if (hw.submissionAnswers?.score !== undefined) {
      return {
        score: Number(hw.submissionAnswers.score),
        total: Number(hw.submissionAnswers.totalQuestions || quizQuestions.length || 5),
        correct: Number(hw.submissionAnswers.correctCount || 0),
      };
    }
    if (typeof (hw as any).grade === 'string' && (hw as any).grade.includes('/10')) {
      const parsedScore = parseInt((hw as any).grade.split('/')[0], 10);
      if (!isNaN(parsedScore)) {
        return {
          score: parsedScore,
          total: quizQuestions.length || 5,
          correct: Math.round((parsedScore / 10) * (quizQuestions.length || 5)),
        };
      }
    }
    return null;
  });

  const [currentPage, setCurrentPage] = useState<number>(parsed?.fromPage || 1);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState<string>('#1d4ed8');
  const [brushSize, setBrushSize] = useState<number>(4);
  const [zoom, setZoom] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');

  // Classic submission fallback state
  const [subTab, setSubTab] = useState<'text' | 'image' | 'audio'>('text');
  const [textAnswer, setTextAnswer] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Drawing persistence helper
  const getDrawingKey = (pageNum: number) => `${studentId || 'student'}_${parsed?.subjectSlug || 'curriculum'}_p${pageNum}`;

  // Redraw saved drawing on page change
  useEffect(() => {
    if (!isCurriculumHw) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allDrawings = readCloudCache<any>(DRAWINGS_KEY);
    const key = getDrawingKey(currentPage);
    const saved = allDrawings.find((d: any) => d.id === key || (d.studentId === studentId && d.subjectSlug === parsed?.subjectSlug && Number(d.page) === Number(currentPage)));

    if (saved && saved.dataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = saved.dataUrl;
    }
  }, [currentPage, isCurriculumHw, studentId, parsed?.subjectSlug]);

  // Coordinate mapper for canvas
  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pt = getCoords(e);
    lastPointRef.current = pt;
    if (!pt) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 4;
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = brushSize * 3.5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = brushSize;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, (ctx.lineWidth || 4) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const pt = getCoords(e);
    const last = lastPointRef.current;
    if (!pt || !last) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 4;
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = brushSize * 3.5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = brushSize;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();

    lastPointRef.current = pt;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    saveCurrentPageDrawing();
  };

  const saveCurrentPageDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas || !parsed) return;
    const dataUrl = canvas.toDataURL('image/png');
    const key = getDrawingKey(currentPage);
    const now = new Date().toISOString();

    const record = {
      id: key,
      studentId,
      studentName,
      subjectSlug: parsed.subjectSlug,
      page: currentPage,
      dataUrl,
      updatedAt: now,
    };

    const current = readCloudCache<any>(DRAWINGS_KEY);
    const updated = [record, ...current.filter((d: any) => d.id !== key)];
    writeCloudCache(DRAWINGS_KEY, updated);
    void syncDocToCloud('curriculum_drawings', key, record);

    setSavedNotice('تم حفظ الحل تلقائياً ✓');
    setTimeout(() => setSavedNotice(''), 2500);
  };

  const handleClearPage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !parsed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const key = getDrawingKey(currentPage);
    const current = readCloudCache<any>(DRAWINGS_KEY);
    const updated = current.filter((d: any) => d.id !== key);
    writeCloudCache(DRAWINGS_KEY, updated);
  };

  const getQuestionText = (q: any): string => q?.text || q?.question || '';
  const getQuestionOptions = (q: any): string[] => (Array.isArray(q?.options) ? q.options : []);
  const getCorrectAnswerIndex = (q: any): number => {
    if (typeof q?.correctAnswerIndex === 'number') return q.correctAnswerIndex;
    if (typeof q?.correctAnswer === 'string' && Array.isArray(q?.options)) {
      const idx = q.options.findIndex(
        (o: string) =>
          o.trim() === q.correctAnswer.trim() ||
          o.includes(q.correctAnswer) ||
          q.correctAnswer.includes(o)
      );
      if (idx >= 0) return idx;
    }
    return 0;
  };

  // Submit solved quiz to Dr. Ismail and update records
  const handleSubmitQuiz = async () => {
    if (quizQuestions.length === 0) return;
    const answeredCount = Object.keys(selectedAnswers).length;
    if (answeredCount < quizQuestions.length) {
      const confirmSubmit = window.confirm(`لقد أجبت على ${answeredCount} من أصل ${quizQuestions.length} أسئلة. هل ترغب في تسليم الكويز الآن؟`);
      if (!confirmSubmit) return;
    }

    setIsSubmitting(true);
    try {
      let correct = 0;
      quizQuestions.forEach((q, idx) => {
        const correctIdx = getCorrectAnswerIndex(q);
        if (selectedAnswers[idx] === correctIdx) {
          correct++;
        }
      });
      const total = quizQuestions.length;
      const score = Math.round((correct / (total || 1)) * 10);
      const submittedAt = new Date().toISOString();
      const gradeStr = `${score}/10`;

      // 1. Mark status as submitted
      updateHomeworkStatus(hw.id, 'submitted', `تم حل الكويز بنتيجة ${gradeStr}`, {
        grade: score,
        quizScore: score,
        correctCount: correct,
        totalQuestions: total,
        answers: selectedAnswers,
      });

      // 2. Save to homework log
      saveStudentHomeworkLog({
        id: hw.id,
        studentId,
        studentName,
        title: hw.title,
        subject: parsed?.subjectTitle || (hw as any).subject || 'كويز تفاعلي',
        subjectSlug: parsed?.subjectSlug,
        fromPage: parsed?.fromPage,
        toPage: parsed?.toPage,
        dueDate: hw.dueDate,
        status: 'submitted',
        submittedAt,
        type: 'QUIZ',
        questions: quizQuestions,
        grade: score,
        teacherFeedback: score >= 9 ? 'ممتاز جداً! إجابات نموذجية بارك الله فيك 🌟' : score >= 7 ? 'أحسنت! نتيجة جيدة جداً، استمر في التقدم 👍' : 'جهد طيب يا بطل، راجع الأسئلة مع المعلم لمزيد من الإتقان 💪',
        submissionAnswers: {
          answers: selectedAnswers,
          score,
          totalQuestions: total,
          correctCount: correct,
        },
      });

      // 3. Update curriculum assignments cache and cloud sync
      try {
        const currAssignments = readCloudCache<any>('masar.curriculumAssignments.v1');
        const updatedCurr = currAssignments.map((a: any) => {
          if (a.id === hw.id || (a.studentId === studentId && a.subjectSlug === parsed?.subjectSlug && Number(a.fromPage) === Number(parsed?.fromPage))) {
            return {
              ...a,
              status: 'submitted',
              submittedAt,
              grade: score,
              submissionAnswers: { answers: selectedAnswers, score, totalQuestions: total, correctCount: correct },
            };
          }
          return a;
        });
        writeCloudCache('masar.curriculumAssignments.v1', updatedCurr);
        void syncDocToCloud('curriculum_assignments', hw.id, {
          id: hw.id,
          studentId,
          studentName,
          subjectSlug: parsed?.subjectSlug,
          fromPage: parsed?.fromPage,
          toPage: parsed?.toPage,
          status: 'submitted',
          submittedAt,
          grade: score,
          type: 'QUIZ',
          questions: quizQuestions,
          submissionAnswers: { answers: selectedAnswers, score, totalQuestions: total, correctCount: correct },
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('masar:cloud-cache-update', { detail: { key: 'masar.curriculumAssignments.v1', id: hw.id } }));
        }
      } catch (e) {
        console.error('Error syncing quiz assignment status:', e);
      }

      // 4. Notify Doctor
      void createNotification({
        type: 'homework',
        title: `🎯 نتيجة كويز: ${studentName}`,
        body: `أكمل الطالب البطل ${studentName} حل كويز "${hw.title}" وحصل على درجة ${gradeStr} (${correct} إجابات صحيحة من ${total})!`,
        link: `/branches/ikhlas-jeddah`,
        targetRole: 'doctor',
        studentId,
        studentName,
      });

      // 5. Confirmation Notification to Parent
      void createNotification({
        type: 'homework',
        title: `🎯 نتيجة كويز ابنكم: ${studentName}`,
        body: `أكمل بطلنا ${studentName} حل كويز "${hw.title}" بنجاح وحصل على ${gradeStr}! بارك الله فيه 🎉`,
        link: `/school-parent?tab=homework`,
        targetRole: 'parent',
        studentId,
        studentName,
      });

      // 6. Send Message to Doctor
      saveMessage({
        studentId,
        from: 'student',
        to: 'doctor',
        body: `🎯 قام الطالب (${studentName}) بحل كويز (${hw.title}) وحصل على درجة ${gradeStr} (${correct} إجابات صحيحة من أصل ${total}).`,
        read: false,
      });

      setQuizResult({ score, total, correct });
      setQuizSubmitted(true);
      setSubmittedSuccess(true);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تسليم الكويز.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit solved homework to Dr. Ismail
  const handleSubmitHomework = async () => {
    setIsSubmitting(true);
    try {
      if (isCurriculumHw && parsed) {
        saveCurrentPageDrawing();

        const submittedAt = new Date().toISOString();

        // 1. Mark status as submitted with Universal ID
        updateHomeworkStatus(hw.id, 'submitted', 'تم الحل بالقلم التفاعلي على صفحات الكتاب');

        // 2. Save to homework log with Universal ID and full curriculum metadata
        saveStudentHomeworkLog({
          id: hw.id,
          studentId,
          studentName,
          title: hw.title,
          subject: parsed.subjectTitle,
          subjectSlug: parsed.subjectSlug,
          fromPage: parsed.fromPage,
          toPage: parsed.toPage,
          dueDate: hw.dueDate,
          status: 'submitted',
          submittedAt,
          teacherFeedback: 'تم التسليم من الطالب وجاري مراجعة الحل.',
        });

        // 3. Update curriculum assignments cache and cloud sync
        try {
          const currAssignments = readCloudCache<any>('masar.curriculumAssignments.v1');
          const updatedCurr = currAssignments.map((a: any) => {
            if (a.id === hw.id || (a.studentId === studentId && a.subjectSlug === parsed.subjectSlug && Number(a.fromPage) === Number(parsed.fromPage))) {
              return { ...a, status: 'submitted', submittedAt };
            }
            return a;
          });
          writeCloudCache('masar.curriculumAssignments.v1', updatedCurr);
          void syncDocToCloud('curriculum_assignments', hw.id, {
            id: hw.id,
            studentId,
            studentName,
            subjectSlug: parsed.subjectSlug,
            fromPage: parsed.fromPage,
            toPage: parsed.toPage,
            status: 'submitted',
            submittedAt,
          });
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('masar:cloud-cache-update', { detail: { key: 'masar.curriculumAssignments.v1', id: hw.id } }));
          }
        } catch (e) {
          console.error('Error syncing curriculum assignment status:', e);
        }

        // 4. Notify Doctor
        void createNotification({
          type: 'homework',
          title: `📬 تسليم واجب جديد: ${studentName}`,
          body: `قام الطالب البطل ${studentName} بحل وتسليم واجب ${parsed.subjectTitle} (ص ${parsed.fromPage}–${parsed.toPage}) على الكتاب التفاعلي.`,
          link: `/branches/ikhlas-jeddah`,
          targetRole: 'doctor',
          studentId,
          studentName,
        });

        // 5. Confirmation Notification to Parent
        void createNotification({
          type: 'homework',
          title: `✅ تم تسليم واجب: ${parsed.subjectTitle}`,
          body: `قام ابنكم البطل ${studentName} بحل وتسليم واجب ${parsed.subjectTitle} (ص ${parsed.fromPage}–${parsed.toPage}) بنجاح!`,
          link: `/school-parent?tab=homework`,
          targetRole: 'parent',
          studentId,
          studentName,
        });

        // 6. Send Message to Doctor
        saveMessage({
          studentId,
          from: 'student',
          to: 'doctor',
          body: `✍️ قام الطالب (${studentName}) بحل واجب مادة (${parsed.subjectTitle}) صفحات ${parsed.fromPage} إلى ${parsed.toPage} وتسليمه للمراجعة والتصحيح.`,
          read: false,
        });
      } else {
        // Classic submission
        const submittedAt = new Date().toISOString();
        const answerPayload = textAnswer || imagePreview || audioURL || 'تم التسليم';
        updateHomeworkStatus(hw.id, 'submitted', answerPayload);

        saveStudentHomeworkLog({
          id: hw.id,
          studentId,
          studentName,
          title: hw.title,
          subject: 'الواجب المنزلي',
          dueDate: hw.dueDate,
          status: 'submitted',
          submittedAt,
          submissionAnswers: { text: textAnswer, image: imagePreview, audio: audioURL },
        });

        // Notify Doctor
        void createNotification({
          type: 'homework',
          title: `📬 تسليم واجب: ${studentName}`,
          body: `سلّم الطالب ${studentName} واجب: ${hw.title}`,
          link: `/branches/ikhlas-jeddah`,
          targetRole: 'doctor',
          studentId,
          studentName,
        });

        // Confirmation to Parent
        void createNotification({
          type: 'homework',
          title: `✅ تم تسليم الواجب: ${hw.title}`,
          body: `سلّم ابنكم البطل ${studentName} واجب: ${hw.title} بنجاح!`,
          link: `/school-parent?tab=homework`,
          targetRole: 'parent',
          studentId,
          studentName,
        });
      }

      setSubmittedSuccess(true);
      setTimeout(() => {
        onSubmitSuccess();
      }, 2500);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تسليم الواجب.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center bg-slate-950 sm:bg-slate-950/85 sm:backdrop-blur-md sm:p-4 overflow-hidden" dir="rtl">
      <div className="w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-4xl bg-white sm:rounded-3xl shadow-2xl sm:border sm:border-slate-200 flex flex-col overflow-hidden animate-scale-in">
        
        {/* ── TOP HEADER ── */}
        <div className="px-4 py-3 bg-gradient-to-l from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-teal-800/40 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-teal-600/30 border border-teal-400/40 flex items-center justify-center text-lg shrink-0">
              {isQuizHw ? '🎯' : '✏️'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] sm:text-xs bg-teal-500/20 text-teal-300 font-black px-2 py-0.5 rounded-md border border-teal-400/30 shrink-0">
                  {isQuizHw ? 'كويز تفاعلي ذكي' : (parsed?.subjectTitle || 'واجب مدرسي')}
                </span>
                {parsed && !isQuizHw && (
                  <span className="text-[10px] sm:text-xs text-amber-300 font-black truncate">
                    صفحات: {parsed.fromPage} – {parsed.toPage}
                  </span>
                )}
                {isQuizHw && quizQuestions.length > 0 && (
                  <span className="text-[10px] sm:text-xs text-amber-300 font-black truncate">
                    {quizQuestions.length} أسئلة
                  </span>
                )}
              </div>
              <h3 className="font-black text-xs sm:text-sm text-white mt-0.5 truncate">{hw.title}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer shrink-0"
            title="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── QUIZ RUNNER OR HOMEWORK SOLVER ── */}
        {isQuizHw ? (
          /* ── INTERACTIVE QUIZ RUNNER ── */
          <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
            {quizSubmitted && quizResult ? (
              /* Results & Review Screen */
              <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto w-full">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm text-center space-y-3">
                  <div className="w-20 h-20 rounded-full bg-amber-100 border-2 border-amber-300 text-amber-600 flex items-center justify-center text-4xl mx-auto shadow-inner animate-bounce">
                    🏆
                  </div>
                  <h3 className="text-xl font-black text-slate-900">
                    {quizResult.score >= 9 ? 'ما شاء الله! ممتاز ومتألق يا بطل 🌟' : quizResult.score >= 7 ? 'أحسنت! نتيجة رائعة ومتميزة 👏' : 'عمل جيد يا بطل! واصل التدريب 💪'}
                  </h3>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800">
                    <span className="text-xs font-bold">الدرجة النهائية:</span>
                    <span className="text-2xl font-black text-emerald-600">{quizResult.score} / 10</span>
                  </div>
                  <p className="text-xs font-bold text-slate-500">
                    أجبت بشكل صحيح على {quizResult.correct} من أصل {quizResult.total} أسئلة · تم إرسال نتيجتك وحلك فوراً لدكتور إسماعيل عيسى وولي أمرك ✅
                  </p>
                </div>

                {/* Question by question review */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-600 px-1">مراجعة الإجابات والحلول النموذجية:</h4>
                  {quizQuestions.map((q, qIdx) => {
                    const studentChoice = selectedAnswers[qIdx];
                    const correctIdx = getCorrectAnswerIndex(q);
                    const isCorrect = studentChoice === correctIdx;
                    const qText = getQuestionText(q);
                    const qOptions = getQuestionOptions(q);
                    return (
                      <div
                        key={q.id || qIdx}
                        className={`p-4 rounded-2xl border transition bg-white ${
                          isCorrect ? 'border-emerald-200 shadow-xs' : 'border-rose-200 shadow-xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-black text-slate-800">سؤال {qIdx + 1}</span>
                          <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                            isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {isCorrect ? 'إجابة صحيحة ✅' : 'إجابة خاطئة ❌'}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-bold text-slate-900 mb-3">{qText}</p>
                        <div className="space-y-1.5">
                          {qOptions.map((opt, optIdx) => {
                            const isThisCorrect = optIdx === correctIdx;
                            const isThisSelected = studentChoice === optIdx;
                            return (
                              <div
                                key={optIdx}
                                className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold border ${
                                  isThisCorrect
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                    : isThisSelected
                                    ? 'bg-rose-50 border-rose-300 text-rose-900'
                                    : 'bg-slate-50 border-slate-100 text-slate-600'
                                }`}
                              >
                                <span>{['أ', 'ب', 'ج', 'د'][optIdx] || optIdx + 1}. {opt}</span>
                                {isThisCorrect && <span className="text-[10px] text-emerald-700 font-black">الإجابة النموذجية ⭐</span>}
                                {!isThisCorrect && isThisSelected && <span className="text-[10px] text-rose-700 font-black">إجابتك ❌</span>}
                              </div>
                            );
                          })}
                        </div>
                        {q.explanation && (
                          <div className="mt-2.5 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-800">
                            💡 {q.explanation}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => onSubmitSuccess()}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer shadow-md"
                >
                  إغلاق والعودة للبوابة
                </button>
              </div>
            ) : (
              /* Active Quiz Question Runner */
              <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 max-w-2xl mx-auto w-full">
                <div className="space-y-5">
                  {/* Stepper Tabs */}
                  <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-1">
                    {quizQuestions.map((_, idx) => {
                      const isAnswered = selectedAnswers[idx] !== undefined;
                      const isCurrent = idx === quizIndex;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setQuizIndex(idx)}
                          className={`flex-1 min-w-[40px] py-2 px-1 rounded-xl text-xs font-black transition cursor-pointer text-center ${
                            isCurrent
                              ? 'bg-teal-700 text-white shadow-md ring-2 ring-teal-400'
                              : isAnswered
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {idx + 1} {isAnswered && !isCurrent && '✓'}
                        </button>
                      );
                    })}
                  </div>

                  {/* Question Box */}
                  {quizQuestions[quizIndex] && (
                    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs bg-teal-50 border border-teal-200 text-teal-800 font-black px-3 py-1 rounded-full">
                          السؤال {quizIndex + 1} من {quizQuestions.length}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {selectedAnswers[quizIndex] !== undefined ? '✅ تم اختيار إجابة' : '⏳ بانتظار إجابتك'}
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-black text-slate-900 leading-relaxed">
                        {getQuestionText(quizQuestions[quizIndex])}
                      </h3>

                      {/* Options */}
                      <div className="space-y-2.5 pt-2">
                        {getQuestionOptions(quizQuestions[quizIndex]).map((opt, optIdx) => {
                          const isSelected = selectedAnswers[quizIndex] === optIdx;
                          return (
                            <button
                              key={optIdx}
                              type="button"
                              onClick={() => {
                                setSelectedAnswers((prev) => ({ ...prev, [quizIndex]: optIdx }));
                              }}
                              className={`w-full text-right p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm font-bold transition flex items-center justify-between gap-3 cursor-pointer ${
                                isSelected
                                  ? 'bg-teal-50 border-teal-600 text-teal-950 ring-2 ring-teal-500 shadow-sm'
                                  : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-teal-300 hover:bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                                  isSelected ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-700'
                                }`}>
                                  {['أ', 'ب', 'ج', 'د'][optIdx] || optIdx + 1}
                                </span>
                                <span>{opt}</span>
                              </div>
                              {isSelected && <span className="text-teal-600 font-black text-sm">✓</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-200 mt-4">
                  <button
                    type="button"
                    disabled={quizIndex === 0}
                    onClick={() => setQuizIndex((i) => Math.max(0, i - 1))}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black hover:bg-slate-50 transition disabled:opacity-30 cursor-pointer"
                  >
                    السابق
                  </button>

                  <div className="text-[11px] font-bold text-slate-500">
                    أجبت على {Object.keys(selectedAnswers).length} من {quizQuestions.length}
                  </div>

                  {quizIndex < quizQuestions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setQuizIndex((i) => Math.min(quizQuestions.length - 1, i + 1))}
                      className="px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-black transition cursor-pointer"
                    >
                      التالي
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleSubmitQuiz}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                      <span>تسليم الكويز الآن 🚀</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : submittedSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 bg-emerald-50">
            <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-600 flex items-center justify-center text-4xl mx-auto animate-bounce shadow-md">
              🎉
            </div>
            <h3 className="text-xl font-black text-emerald-950">
              أحسنت يا بطل! تم تسليم الواجب بنجاح! 🚀
            </h3>
            <p className="text-xs sm:text-sm font-bold text-emerald-800 max-w-sm mx-auto leading-relaxed">
              وصل حلك وتعديلاتك على الكتاب إلى د. إسماعيل عيسى، وسيتم مراجعته ورصد درجتك قريباً بإذن الله!
            </p>
          </div>
        ) : isCurriculumHw && parsed ? (
          /* ── INTERACTIVE WORKBOOK SOLVER ── */
          <>
            {/* Toolbar: Tools, Colors, Clear, Zoom */}
            <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 text-xs shrink-0 flex-wrap sm:flex-nowrap">
              {/* Tools: Pen, Highlighter, Eraser */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
                <button
                  type="button"
                  onClick={() => setTool('pen')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-black transition cursor-pointer ${
                    tool === 'pen' ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title="قلم الكتابة"
                >
                  <PenLine size={14} /> <span className="hidden xs:inline text-[11px]">قلم</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTool('highlighter')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-black transition cursor-pointer ${
                    tool === 'highlighter' ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title="قلم التحديد الأصفر"
                >
                  <Highlighter size={14} /> <span className="hidden xs:inline text-[11px]">تحديد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTool('eraser')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-black transition cursor-pointer ${
                    tool === 'eraser' ? 'bg-rose-500 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                  title="الممحاة"
                >
                  <Eraser size={14} /> <span className="hidden xs:inline text-[11px]">ممحاة</span>
                </button>
              </div>

              {/* Color Palette */}
              {tool !== 'eraser' && (
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs shrink-0">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      style={{ backgroundColor: c.value }}
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full transition-all cursor-pointer ${
                        color === c.value ? 'ring-2 ring-offset-2 ring-teal-600 scale-110 shadow-xs' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              )}

              {/* Clear Page & Zoom Controls */}
              <div className="flex items-center gap-1.5 shrink-0 mr-auto">
                <button
                  type="button"
                  onClick={handleClearPage}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300 transition text-[11px] font-bold shadow-2xs cursor-pointer"
                  title="مسح إجابات هذه الصفحة"
                >
                  <RotateCcw size={13} />
                  <span className="hidden md:inline">مسح</span>
                </button>

                <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <button onClick={() => setZoom((z) => Math.min(180, z + 15))} className="p-1.5 hover:bg-slate-100 text-slate-700 transition" title="تكبير">
                    <ZoomIn size={13} />
                  </button>
                  <span className="text-[10px] font-mono px-1.5 text-slate-600">{zoom}%</span>
                  <button onClick={() => setZoom((z) => Math.max(70, z - 15))} className="p-1.5 hover:bg-slate-100 text-slate-700 transition" title="تصغير">
                    <ZoomOut size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Page Navigator: Touch-friendly Previous / Next and Direct Jump Chips */}
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 select-none shrink-0">
              {/* Previous Page Button */}
              <button
                type="button"
                onClick={() => {
                  const idx = parsed.pagesList.indexOf(currentPage);
                  if (idx > 0) setCurrentPage(parsed.pagesList[idx - 1]);
                }}
                disabled={parsed.pagesList.indexOf(currentPage) === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-black hover:bg-teal-50 hover:border-teal-400 transition disabled:opacity-30 disabled:pointer-events-none shadow-2xs active:scale-95 cursor-pointer shrink-0"
              >
                <ChevronRight size={15} />
                <span>السابق</span>
              </button>

              {/* Direct Jump Chips */}
              <div className="flex items-center gap-1 overflow-x-auto px-1 py-0.5 max-w-[180px] xs:max-w-xs sm:max-w-md justify-center">
                {parsed.pagesList.map((pageNum) => {
                  const isSelected = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 border ${
                        isSelected
                          ? 'bg-teal-700 border-teal-800 text-white shadow-xs scale-105'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-teal-50'
                      }`}
                    >
                      ص {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page Button */}
              <button
                type="button"
                onClick={() => {
                  const idx = parsed.pagesList.indexOf(currentPage);
                  if (idx < parsed.pagesList.length - 1) setCurrentPage(parsed.pagesList[idx + 1]);
                }}
                disabled={parsed.pagesList.indexOf(currentPage) === parsed.pagesList.length - 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-black hover:bg-teal-50 hover:border-teal-400 transition disabled:opacity-30 disabled:pointer-events-none shadow-2xs active:scale-95 cursor-pointer shrink-0"
              >
                <span>التالي</span>
                <ChevronLeft size={15} />
              </button>
            </div>

            {/* Interactive Canvas Area */}
            <div className="flex-1 overflow-auto bg-slate-900 p-2 sm:p-6 flex items-center justify-center select-none relative min-h-[350px]">
              {savedNotice && (
                <div className="absolute top-3 z-30 bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-lg animate-fade-in border border-emerald-400">
                  {savedNotice}
                </div>
              )}

              <div
                className="relative rounded-2xl shadow-2xl overflow-hidden bg-white border-2 sm:border-4 border-slate-700 touch-none mx-auto"
                style={{
                  width: `${Math.round(620 * (zoom / 100))}px`,
                  maxWidth: '100%',
                }}
              >
                {/* Book Page Image */}
                <img
                  src={getCurriculumPageImageUrl(parsed.subjectSlug, currentPage)}
                  alt={`صفحة ${currentPage}`}
                  className="w-full h-auto object-contain block select-none pointer-events-none"
                />

                {/* Drawing Canvas Overlay */}
                <canvas
                  ref={canvasRef}
                  width={1200}
                  height={1700}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="absolute inset-0 w-full h-full cursor-crosshair z-10"
                />

                <div className="absolute top-2.5 left-2.5 z-20 bg-slate-950/85 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-black border border-white/20 shadow-md">
                  {parsed.subjectTitle} · ص {currentPage} (اكتب وحل بالقلم مباشرة)
                </div>
              </div>
            </div>

            {/* Submit Bar (Clean Sticky Full-width on Mobile) */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
              <span className="text-[11px] sm:text-xs font-bold text-slate-600 text-center sm:text-right">
                ✏️ يمكنك الحل في كل صفحة، وسيتم حفظ وتجميع كافة إجاباتك وإرسالها لدكتور إسماعيل فوراً.
              </span>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitHomework}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white px-7 py-3 text-xs sm:text-sm font-black transition shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                <span>إرسال وتسليم الواجب لدكتور إسماعيل 🚀</span>
              </button>
            </div>
          </>
        ) : (
          /* ── CLASSIC SUBMISSION FALLBACK ── */
          <div className="p-6 space-y-5">
            <div className="flex border-b border-slate-200 pb-2 gap-2">
              {(['text', 'image'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSubTab(tab)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
                    subTab === tab ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab === 'text' ? 'كتابة نص' : 'إرفاق صورة'}
                </button>
              ))}
            </div>

            {subTab === 'text' ? (
              <textarea
                rows={5}
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="اكتب إجابتك هنا يا بطل..."
                className="w-full p-4 rounded-2xl border border-slate-300 text-xs font-bold focus:border-teal-500 focus:outline-none"
              />
            ) : (
              <div className="p-8 border-2 border-dashed border-slate-300 rounded-2xl text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const reader = new FileReader();
                      reader.onloadend = () => setImagePreview(reader.result as string);
                      reader.readAsDataURL(f);
                    }
                  }}
                  className="hidden"
                  id="img-upload"
                />
                <label htmlFor="img-upload" className="cursor-pointer text-xs font-bold text-teal-700">
                  اضغط هنا لاختيار صورة من جهازك 📷
                </label>
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="mt-4 max-h-48 mx-auto rounded-xl" />
                )}
              </div>
            )}

            <button
              type="button"
              disabled={isSubmitting || (!textAnswer && !imagePreview)}
              onClick={handleSubmitHomework}
              className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? 'جاري الإرسال...' : 'إرسال الواجب للمعلم 🚀'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
