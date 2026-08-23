'use client';

import { Suspense, useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ClipboardCheck, Volume2, Sparkles, ChevronDown, Mic, Square, RotateCcw } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import Navbar from '@/components/Navbar';
import { placementAssessments, PlacementGradeKey, PlacementQuestion } from '@/data/placementAssessments';
import { buildPlacementRecommendations, buildPlacementSummary, enrichDomains, getDecisionFromScore } from '@/data/assessmentModel';
import { getStudents, saveReport, saveStudent, StudentRecord, updateStudent } from '@/lib/localDb';
import { speakWithMasarVoice } from '@/lib/voicePackage';

type ResponseRecord = {
  question: PlacementQuestion;
  answer: string;
  correct: boolean;
  answered: boolean;
};

type MediaAnswer = {
  type: 'audio' | 'image';
  dataUrl: string;
  label: string;
};

function ShapeCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-24 min-w-24 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex h-12 items-center justify-center">{children}</div>
      <span className="text-sm font-black text-slate-800">{label}</span>
    </div>
  );
}

function Dot({ className = 'bg-teal-600' }: { className?: string }) {
  return <span className={`block h-7 w-7 rounded-full ${className}`} />;
}

function PlacementVisual({ visual }: { visual: string }) {
  if (!visual.startsWith('draw:')) {
    return <span>{visual}</span>;
  }

  const token = visual.replace('draw:', '');
  const circle = <div className="h-12 w-12 rounded-full border-4 border-blue-600 bg-blue-50" />;
  const square = <div className="h-12 w-12 rounded-xl border-4 border-emerald-700 bg-emerald-50" />;
  const triangle = (
    <div className="h-0 w-0 border-x-[28px] border-b-[50px] border-x-transparent border-b-amber-500" />
  );

  switch (token) {
    case 'pattern-red-blue':
      return (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Dot className="bg-red-500" /><Dot className="bg-blue-600" /><Dot className="bg-red-500" /><Dot className="bg-blue-600" />
          <span className="grid h-10 w-10 place-items-center rounded-full border-2 border-dashed border-slate-400 text-xl font-black">؟</span>
        </div>
      );
    case 'squares-circle':
      return <div className="flex flex-wrap items-center justify-center gap-4">{square}{square}{circle}{square}</div>;
    case 'clock-book-cup':
      return (
        <div className="flex flex-wrap justify-center gap-4">
          <ShapeCard label="ساعة"><div className="relative h-14 w-14 rounded-full border-4 border-slate-800"><span className="absolute left-1/2 top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-full rounded bg-slate-800" /><span className="absolute left-1/2 top-1/2 h-1 w-5 -translate-y-1/2 rounded bg-slate-800" /></div></ShapeCard>
          <ShapeCard label="كتاب"><div className="h-14 w-12 rounded-md border-4 border-blue-700 bg-blue-50" /></ShapeCard>
          <ShapeCard label="كوب"><div className="h-12 w-12 rounded-b-2xl border-4 border-amber-700 bg-amber-50" /></ShapeCard>
        </div>
      );
    case 'size-small-medium-big':
      return <div className="flex items-end justify-center gap-5"><Dot /><span className="block h-10 w-10 rounded-full bg-teal-600" /><span className="block h-16 w-16 rounded-full bg-teal-600" /></div>;
    case 'left-arrow':
      return <div className="text-7xl font-black text-slate-950">←</div>;
    case 'letter-alef-lion':
      return <ShapeCard label="أسد"><span className="text-7xl font-black text-teal-800">أ</span></ShapeCard>;
    case 'letter-ba-door':
      return <ShapeCard label="باب"><span className="text-7xl font-black text-teal-800">ب</span></ShapeCard>;
    case 'qalam-missing':
      return <div className="rounded-2xl border-2 border-dashed border-teal-400 bg-white px-10 py-6 text-7xl font-black text-slate-950">ق _ م</div>;
    case 'book-card':
      return <ShapeCard label="كتاب"><div className="h-16 w-20 rounded-lg border-4 border-blue-700 bg-blue-50"><div className="mx-auto h-full w-1 bg-blue-700" /></div></ShapeCard>;
    case 'qaf-pair':
      return <div className="flex flex-wrap justify-center gap-4"><ShapeCard label="قلم"><span className="text-6xl font-black text-teal-800">ق</span></ShapeCard><ShapeCard label="قمر"><span className="text-6xl font-black text-teal-800">ق</span></ShapeCard></div>;
    case 'milk-card':
      return <ShapeCard label="لبن"><span className="text-6xl font-black text-teal-800">ن</span></ShapeCard>;
    case 'letter-ta-card':
      return <div className="rounded-2xl border-2 border-slate-200 bg-white px-12 py-6 text-8xl font-black text-teal-800">ت</div>;
    case 'five-dots':
      return <div className="flex flex-wrap justify-center gap-4">{[1, 2, 3, 4, 5].map((n) => <Dot key={n} />)}</div>;
    case 'number-line-4':
      return <div className="flex items-center justify-center gap-3 text-4xl font-black text-slate-950"><span>1</span><span>2</span><span>3</span><span className="rounded-xl bg-blue-700 px-4 py-2 text-white">4</span><span>؟</span></div>;
    case 'two-plus-three':
      return <div className="flex items-center justify-center gap-4"><div className="flex gap-2"><Dot /></div><div className="flex gap-2"><Dot /></div><span className="text-5xl font-black">+</span><div className="flex gap-2">{[1, 2, 3].map((n) => <Dot key={n} className="bg-amber-500" />)}</div></div>;
    case 'eight-vs-three':
      return <div className="grid gap-4 sm:grid-cols-2"><ShapeCard label="مجموعة 8"><div className="grid grid-cols-4 gap-1">{Array.from({ length: 8 }).map((_, i) => <span key={i} className="h-4 w-4 rounded-full bg-blue-600" />)}</div></ShapeCard><ShapeCard label="مجموعة 3"><div className="flex gap-1">{Array.from({ length: 3 }).map((_, i) => <span key={i} className="h-4 w-4 rounded-full bg-amber-500" />)}</div></ShapeCard></div>;
    case 'four-minus-one':
      return <div className="flex items-center justify-center gap-3">{[1, 2, 3].map((n) => <span key={n} className="h-20 w-4 rounded bg-slate-800" />)}<span className="h-20 w-4 rotate-12 rounded bg-slate-300 line-through opacity-70" /></div>;
    case 'two-vs-seven':
      return <div className="flex items-center justify-center gap-8 text-6xl font-black"><span className="text-teal-700">2</span><span className="text-slate-300">/</span><span className="text-rose-600">7</span></div>;
    case 'triangle-square-circle':
      return <div className="flex flex-wrap items-center justify-center gap-5">{triangle}{square}{circle}</div>;
    case 'straight-line':
      return <div className="flex items-center justify-center gap-3"><Dot className="bg-slate-900" /><span className="block h-2 w-40 rounded bg-teal-700" /><Dot className="bg-slate-900" /></div>;
    case 'square-card':
      return square;
    case 'match-triangle':
      return <div className="flex flex-wrap items-center justify-center gap-6"><ShapeCard label="النموذج">{triangle}</ShapeCard><ShapeCard label="اختر مثله">{triangle}</ShapeCard></div>;
    case 'path-options':
      return <div className="flex items-center justify-center gap-5"><span className="block h-2 w-32 rounded bg-teal-700" /><span className="block h-16 w-24 rounded-[50%] border-4 border-slate-300" /></div>;
    case 'window-shape':
      return <div className="grid h-20 w-20 grid-cols-2 grid-rows-2 gap-1 rounded-xl border-4 border-teal-800 bg-teal-50 p-2">{[1, 2, 3, 4].map((n) => <span key={n} className="bg-white" />)}</div>;
    case 'first-second-third':
      return <div className="flex items-center justify-center gap-3 text-2xl font-black"><span className="rounded-xl bg-teal-50 px-4 py-3 text-teal-800">أول</span><span>←</span><span className="rounded-xl bg-blue-50 px-4 py-3 text-blue-800">ثاني</span><span>←</span><span className="rounded-xl bg-amber-50 px-4 py-3 text-amber-800">ثالث</span></div>;
    case 'dotted-lines':
      return <div className="space-y-5 text-4xl font-black tracking-[0.35em] text-slate-500"><div>•—•—•—•—•—•</div><div>•—•—•—•—•—•</div></div>;
    case 'vertical-line-model':
      return <div className="flex h-28 items-center justify-center"><span className="block h-24 w-2 rounded-full bg-slate-900" /></div>;
    case 'circle-model':
      return <div className="h-24 w-24 rounded-full border-4 border-slate-900" />;
    case 'color-red':
      return <ShapeCard label="أحمر"><Dot className="h-16 w-16 bg-red-500" /></ShapeCard>;
    case 'color-blue':
      return <ShapeCard label="أزرق"><Dot className="h-16 w-16 bg-blue-600" /></ShapeCard>;
    case 'color-green':
      return <ShapeCard label="أخضر"><Dot className="h-16 w-16 bg-emerald-600" /></ShapeCard>;
    case 'color-yellow':
      return <ShapeCard label="أصفر"><Dot className="h-16 w-16 bg-amber-400" /></ShapeCard>;
    default:
      return <span>{visual}</span>;
  }
}

function DrawingPad({
  value,
  onSave,
}: {
  value?: string;
  onSave: (dataUrl: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const pointFromEvent = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  };

  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const point = pointFromEvent(event);
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const stop = () => {
    if (!drawingRef.current || !canvasRef.current) return;
    drawingRef.current = false;
    onSave(canvasRef.current.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onSave('');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !value) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = value;
  }, [value]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <canvas
        ref={canvasRef}
        width={900}
        height={360}
        className="h-56 w-full touch-none rounded-xl border border-dashed border-slate-300 bg-[linear-gradient(#f8fafc_1px,transparent_1px),linear-gradient(90deg,#f8fafc_1px,transparent_1px)] bg-[size:24px_24px]"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={stop}
        onPointerCancel={stop}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-500">اكتب أو ارسم داخل المساحة ثم ارفع القلم ليتم الحفظ.</p>
        <button type="button" onClick={clear} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">
          <RotateCcw size={14} />
          مسح
        </button>
      </div>
    </div>
  );
}

export default function PlacementAssessmentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <PlacementAssessmentContent />
    </Suspense>
  );
}

function PlacementAssessmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get('student');
  const [gradeKey, setGradeKey] = useState<PlacementGradeKey>('general');
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [allStudents, setAllStudents] = useState<StudentRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [mediaAnswers, setMediaAnswers] = useState<Record<string, MediaAnswer>>({});
  const [recordingQuestionId, setRecordingQuestionId] = useState('');
  const [recordingError, setRecordingError] = useState('');
  const [finished, setFinished] = useState(false);
  const [savedReportId, setSavedReportId] = useState('');
  const [savedStudentId, setSavedStudentId] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const assessment = placementAssessments.find((item) => item.key === gradeKey) ?? placementAssessments[0];
  const current = assessment.questions[index];
  const currentResponseType = current.responseType ?? (current.options.length ? 'choice' : 'text');
  const selected = answers[current.id];
  const scoredQuestions = assessment.questions.filter((question) => question.countsForScore !== false);
  const isManualAssessment = assessment.questions.some((question) => ['oral', 'drawing', 'text'].includes(question.responseType ?? ''));
  const responses: ResponseRecord[] = assessment.questions.map((question) => {
    const answer = answers[question.id] ?? '';
    const hasMedia = Boolean(mediaAnswers[question.id]?.dataUrl);
    const answered = Boolean(answer.trim()) || hasMedia;
    const correct = question.countsForScore === false
      ? answered
      : question.correct
        ? answer === question.correct
        : answered;
    return { question, answer, correct, answered };
  });
  const answeredCount = responses.filter((response) => response.answered).length;
  const correctCount = responses.filter((response) => response.question.countsForScore !== false && response.correct).length;
  const score = scoredQuestions.length ? Math.round((correctCount / scoredQuestions.length) * 100) : 0;
  const progress = Math.round((answeredCount / assessment.questions.length) * 100);
  const decision = getDecisionFromScore(score);

  useEffect(() => {
    const studentId = searchParams.get('student');
    const timeout = window.setTimeout(() => {
      const existingStudent = studentId ? getStudents().find((item) => item.id === studentId) : null;
      if (existingStudent) {
        setStudent(existingStudent);
        setStudentName(existingStudent.fullName);
        setGradeKey(getGradeKeyFromStudentGrade(existingStudent.grade));
        return;
      }

      if (studentId) {
        setStudent({
          id: studentId,
          fullName: 'طالب الاختبار',
          grade: 'عام',
          reviewStatus: 'awaiting-doctor-review',
          source: 'student-wizard',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      const fromUrl = searchParams.get('level') as PlacementGradeKey | null;
      const next = placementAssessments.some((item) => item.key === fromUrl)
        ? fromUrl
        : null;

      if (next) {
        setGradeKey(next);
      }

      // Load all registered students for the picker
      setAllStudents(getStudents());
    }, 0);
  }, [searchParams, router]);

  const isStudentFlow = Boolean(studentIdParam);

  useEffect(() => {
    if (!finished) return;

    const timeout = window.setTimeout(() => {
      // Route directly to the student's profile page in Masar
      const targetStudentId = savedStudentId || student?.id || studentIdParam || '';
      if (targetStudentId) {
        router.push(`/student/${targetStudentId}`);
      } else {
        router.push('/students');
      }
    }, 1400);

    return () => window.clearTimeout(timeout);
  }, [finished, isStudentFlow, router, savedStudentId, student?.id, studentIdParam]);

  const domains = useMemo(() => {
    const grouped = new Map<string, ResponseRecord[]>();
    responses
      .filter((response) => response.question.countsForScore !== false)
      .forEach((response) => {
      const key = response.question.categoryLabel;
      grouped.set(key, [...(grouped.get(key) ?? []), response]);
    });

    const baseDomains = Array.from(grouped.entries()).map(([name, items]) => {
      const domainScore = Math.round((items.filter((item) => item.correct).length / items.length) * 100);
      return {
        name,
        score: domainScore,
        note: isManualAssessment
          ? `${items.filter((item) => item.answered).length} من ${items.length} بنود موثقة للمراجعة`
          : `${items.filter((item) => item.correct).length} من ${items.length} إجابات صحيحة`,
      };
    });
    return enrichDomains(baseDomains);
  }, [isManualAssessment, responses]);
  const recommendedProgram = getRecommendedProgram(domains);

  const speak = (text: string) => void speakWithMasarVoice(text, { lang: /[a-zA-Z]/.test(text) ? 'en-US' : 'ar-SA', rate: 0.84 });

  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    setShowExplanation(false);
  }, [index, gradeKey]);

  const choose = (answer: string) => {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [current.id]: answer }));
    setShowExplanation(true);
  };

  const saveTypedAnswer = (answer: string) => {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [current.id]: answer }));
    if (answer.trim()) setShowExplanation(true);
  };

  const saveDrawingAnswer = (dataUrl: string) => {
    setMediaAnswers((currentMedia) => {
      const next = { ...currentMedia };
      if (dataUrl) {
        next[current.id] = { type: 'image', dataUrl, label: current.prompt };
      } else {
        delete next[current.id];
      }
      return next;
    });
    setAnswers((currentAnswers) => {
      const next = { ...currentAnswers };
      if (dataUrl) {
        next[current.id] = 'رسم محفوظ للمراجعة';
      } else {
        delete next[current.id];
      }
      return next;
    });
    if (dataUrl) setShowExplanation(true);
  };

  const startRecording = async () => {
    if (recordingQuestionId) return;
    setRecordingError('');

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordingError('المتصفح الحالي لا يدعم تسجيل الصوت. افتح الصفحة من Chrome أو Edge واسمح بالمايكروفون.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      setRecordingQuestionId(current.id);

      recorder.ondataavailable = (event) => {
        if (event.data.size) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : '';
          if (dataUrl) {
            setMediaAnswers((currentMedia) => ({
              ...currentMedia,
              [current.id]: { type: 'audio', dataUrl, label: current.prompt },
            }));
            setAnswers((currentAnswers) => ({ ...currentAnswers, [current.id]: 'تسجيل صوتي محفوظ للمراجعة' }));
            setShowExplanation(true);
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
        setRecordingQuestionId('');
      };

      recorder.start();
    } catch {
      setRecordingQuestionId('');
      setRecordingError('لم يتم السماح بالمايكروفون. اسمح للتسجيل من المتصفح ثم حاول مرة أخرى.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const resetForGrade = (key: PlacementGradeKey) => {
    setGradeKey(key);
    setIndex(0);
    setAnswers({});
    setMediaAnswers({});
    setRecordingQuestionId('');
    setRecordingError('');
    setFinished(false);
    setSavedReportId('');
    setSavedStudentId('');
  };

  const finish = () => {
    const fallbackStudent: StudentRecord = {
      id: studentIdParam ?? 'student_assessment',
      fullName: studentName.trim() || 'طالب الاختبار',
      grade: assessment.shortTitle,
      reviewStatus: 'awaiting-doctor-review',
      source: 'student-wizard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const savedStudent = student
      ? updateStudent(student.id, {
        fullName: studentName.trim() || student.fullName,
        grade: student.grade,
        reviewStatus: 'awaiting-doctor-review',
      }) ?? student
      : isStudentFlow
        ? saveStudent(fallbackStudent)
      : saveStudent({
        fullName: studentName.trim() || 'طالب اختبار تحديد مستوى',
        grade: assessment.shortTitle,
        reviewStatus: 'awaiting-doctor-review',
        source: 'student-wizard',
      });

    saveReport({
      studentId: savedStudent.id,
      studentName: savedStudent.fullName,
      grade: savedStudent.grade || assessment.shortTitle,
      program: 'إجابات اختبار الطالب التفصيلية',
      programColor: '#334155',
      score: Math.round((answeredCount / assessment.questions.length) * 100),
      status: 'pending',
      type: 'student-assessment-answers',
      summary: 'تقرير إجابات تفصيلي يحتوي على إجابات الطالب في اختبار تحديد المستوى المباشر، مخصص لمراجعة د. إسماعيل قبل اعتماد المسار.',
      recommendations: [
        'مراجعة الأسئلة غير الصحيحة بجانب إجابات ولي الأمر في الاستبيان.',
        'ملاحظة سرعة الاستجابة واحتياج الطالب للصوت أو الصورة قبل اعتماد المسار.',
      ],
      answers: responses.map((response) => ({
        question: `${response.question.categoryLabel}: ${response.question.prompt}`,
        answer: [
          response.answer || 'لم يجب',
          response.question.correct ? `الإجابة الصحيحة: ${response.question.correct}` : '',
          response.question.expectedResponse ? `النموذج المتوقع: ${response.question.expectedResponse}` : '',
          mediaAnswers[response.question.id] ? `مرفق: ${mediaAnswers[response.question.id].type === 'audio' ? 'تسجيل صوتي' : 'رسم/كتابة يدوية'}` : '',
          response.question.countsForScore === false ? 'بند ملاحظة لا يدخل في الدرجة' : response.correct ? (isManualAssessment ? 'موثق للمراجعة' : 'صحيح') : 'يحتاج مراجعة',
          `المهارة: ${response.question.skill}`,
        ].filter(Boolean).join(' | '),
      })),
      domains,
      media: mediaAnswers,
    });

    const report = saveReport({
      studentId: savedStudent.id,
      studentName: savedStudent.fullName,
      grade: savedStudent.grade || assessment.shortTitle,
      program: isStudentFlow ? 'تحليل اختبار الطالب المباشر' : 'اختبار قبول وتحديد مستوى',
      programColor: '#2563eb',
      score,
      status: isStudentFlow ? 'pending' : 'completed',
      type: isStudentFlow ? 'student-assessment-analysis' : 'placement',
      summary: buildPlacementSummary({
        assessmentTitle: assessment.title,
        score,
        domains,
        correctCount,
        total: scoredQuestions.length,
      }),
      recommendations: buildPlacementRecommendations(score, domains),
      answers: [],
      domains,
    });

    setSavedReportId(report.id);
    setSavedStudentId(savedStudent.id);
    setFinished(true);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      {isStudentFlow ? (
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
            <BrandMark size="sm" />
            <div className="rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-800">
              اختبار الطالب محفوظ للدكتور فقط
            </div>
          </div>
        </header>
      ) : (
        <Navbar />
      )}
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <header className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black text-blue-700">{isStudentFlow ? 'اختبار الطالب بعد استبيان ولي الأمر' : 'اختبارات القبول وتحديد المستوى'}</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">{isStudentFlow ? 'اختبار مهارات الطالب' : '7 اختبارات مختلفة بتقرير تحليلي كامل'}</h1>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-600">
                {isStudentFlow
                  ? 'ركّز في السؤال الحالي، واختر الإجابة المناسبة لك بدون عرض درجات أو تشخيص داخل تجربة الطالب.'
                  : 'اختر المستوى، أدخل بيانات الطالب، أجب على الأسئلة، وسيتم حفظ تقرير كامل بالإجابات والتحليل داخل صفحة التقارير.'}
              </p>
            </div>
            {!isStudentFlow && <Link href="/reports" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">
              فتح التقارير
              <ArrowLeft size={17} />
            </Link>}
          </div>
        </header>

        {!isStudentFlow && (
          <section className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {placementAssessments.map((item) => (
              <button
                key={item.key}
                onClick={() => resetForGrade(item.key)}
                className={`shrink-0 rounded-xl border px-4 py-3 text-sm font-black transition-all cursor-pointer shadow-2xs ${
                  gradeKey === item.key ? 'border-blue-700 bg-blue-700 text-white ring-2 ring-blue-300' : 'border-slate-200 bg-white text-slate-700 hover:bg-blue-50/60'
                }`}
              >
                {item.shortTitle}
              </button>
            ))}
          </section>
        )}

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            {/* ── Student Picker (Doctor mode only) ─────────── */}
            {!isStudentFlow && (
              <div className="mb-6 rounded-xl bg-blue-50 border border-blue-100 p-4">
                <p className="mb-3 text-sm font-black text-blue-800">📋 اختر الطالب أولاً</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {/* Dropdown: pick from registered students */}
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-black text-slate-600">اختر من قائمة الطلاب المسجلين</span>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedStudentId(id);
                        if (id) {
                          const s = allStudents.find((st) => st.id === id);
                          if (s) {
                            setStudent(s);
                            setStudentName(s.fullName);
                            const gk = getGradeKeyFromStudentGrade(s.grade);
                            resetForGrade(gk);
                          }
                        } else {
                          setStudent(null);
                          setStudentName('');
                        }
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-700 cursor-pointer"
                    >
                      <option value="">— أو أدخل اسم طالب جديد —</option>
                      {allStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName} {s.grade ? `— ${s.grade}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  {/* Grade picker */}
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-black text-slate-600">تغيير الاختبار / الصف</span>
                    <select
                      value={gradeKey}
                      onChange={(e) => resetForGrade(e.target.value as PlacementGradeKey)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-blue-700 cursor-pointer"
                    >
                      {placementAssessments.map((item) => (
                        <option key={item.key} value={item.key}>{item.shortTitle}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}

            <div className="mb-5 grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">اسم الطالب</span>
                <input value={studentName} onChange={(event) => setStudentName(event.target.value)} readOnly={isStudentFlow} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-700 read-only:text-slate-500" placeholder="اسم الطالب" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">العمر</span>
                <input value={studentAge} onChange={(event) => setStudentAge(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-700" placeholder="مثال: 8" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">المستوى الحالي</span>
                {isStudentFlow ? (
                  <div className="w-full rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm font-black text-blue-950 shadow-2xs">
                    {assessment.shortTitle}
                  </div>
                ) : (
                  <select
                    value={gradeKey}
                    onChange={(e) => resetForGrade(e.target.value as PlacementGradeKey)}
                    className="w-full rounded-lg border border-blue-300 bg-blue-50/70 px-4 py-3 text-sm font-black text-blue-950 outline-none focus:border-blue-700 cursor-pointer shadow-2xs"
                  >
                    {placementAssessments.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.shortTitle}
                      </option>
                    ))}
                  </select>
                )}
              </label>
            </div>

            {!finished ? (
              <article>
                <div className="mb-5 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${progress}%` }} />
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-black text-blue-700">{current.categoryLabel} · سؤال {index + 1} من {assessment.questions.length}</p>
                      <h2 className="mt-3 text-2xl font-black leading-10 text-slate-950">{current.prompt}</h2>
                      <p className="mt-2 text-sm font-bold text-slate-500">المهارة: {current.skill}</p>
                    </div>
                    <button onClick={() => speak(current.prompt)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100">
                      <Volume2 size={17} />
                      اسمع السؤال
                    </button>
                  </div>

                  <div className="mt-5 grid min-h-36 place-items-center rounded-2xl bg-white p-6 text-center text-5xl font-black text-slate-950 ring-1 ring-slate-200">
                    <PlacementVisual visual={current.visual} />
                  </div>
                </div>

                {currentResponseType === 'choice' || currentResponseType === 'observation' ? (
                  <div className="mt-5 grid gap-3 md:grid-cols-2">
                    {current.options.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => choose(option)}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          choose(option);
                        }}
                        className={`min-h-16 rounded-lg border px-4 py-4 text-right text-base font-black transition ${
                          selected === option
                            ? 'border-blue-700 bg-blue-50 text-blue-950 ring-2 ring-blue-200'
                            : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                ) : null}

                {currentResponseType === 'text' ? (
                  <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
                    <label className="block">
                      <span className="mb-2 block text-sm font-black text-slate-700">اكتب الإجابة هنا</span>
                      <textarea
                        value={selected ?? ''}
                        onChange={(event) => saveTypedAnswer(event.target.value)}
                        className="min-h-32 w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-2xl font-black leading-10 text-slate-950 outline-none focus:border-blue-700"
                        placeholder="اكتب هنا..."
                      />
                    </label>
                    {current.expectedResponse && (
                      <p className="mt-2 text-xs font-bold text-slate-500">النموذج المطلوب للدكتور: {current.expectedResponse}</p>
                    )}
                  </div>
                ) : null}

                {currentResponseType === 'drawing' ? (
                  <div className="mt-5">
                    <DrawingPad value={mediaAnswers[current.id]?.dataUrl} onSave={saveDrawingAnswer} />
                  </div>
                ) : null}

                {currentResponseType === 'oral' ? (
                  <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-950">سجّل إجابة الطالب الصوتية</p>
                        <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                          اضغط بدء التسجيل، ثم اطلب من الطالب الإجابة أو التكرار، وبعدها اضغط إيقاف.
                        </p>
                      </div>
                      {recordingQuestionId === current.id ? (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-5 py-3 text-sm font-black text-white shadow-sm"
                        >
                          <Square size={16} />
                          إيقاف التسجيل
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startRecording}
                          disabled={Boolean(recordingQuestionId)}
                          className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white shadow-sm disabled:opacity-50"
                        >
                          <Mic size={16} />
                          بدء التسجيل
                        </button>
                      )}
                    </div>
                    {recordingQuestionId === current.id && (
                      <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-800">
                        التسجيل يعمل الآن...
                      </div>
                    )}
                    {recordingError && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-black text-amber-900">
                        {recordingError}
                      </div>
                    )}
                    {mediaAnswers[current.id]?.type === 'audio' && (
                      <div className="mt-4 rounded-xl bg-slate-50 p-3">
                        <audio controls className="w-full" src={mediaAnswers[current.id].dataUrl} />
                        <p className="mt-2 text-xs font-bold text-emerald-700">تم حفظ التسجيل في تقرير الطالب.</p>
                      </div>
                    )}
                  </div>
                ) : null}

                {selected && (
                  <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50/70 p-4 transition-all shadow-xs">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowExplanation(!showExplanation)}
                        className="flex items-center gap-2 text-sm font-black text-blue-900 hover:text-blue-950 cursor-pointer"
                      >
                        <Sparkles size={16} className="text-blue-600 animate-pulse" />
                        <span>{showExplanation ? 'إخفاء التفسير والتحليل' : 'فتح التفسير والتحليل الشارح للاستجابة'}</span>
                        <ChevronDown size={16} className={`transition-transform duration-300 ${showExplanation ? 'rotate-180' : ''}`} />
                      </button>
                      <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-900 border border-emerald-300">
                        تم تسجيل الإجابة ✓
                      </span>
                    </div>

                    {showExplanation && (
                      <div className="mt-3 border-t border-blue-200/80 pt-3 text-sm font-bold leading-7 text-slate-800 animate-fadeIn">
                        <p className="text-xs font-black text-blue-700">التفسير الإكلينيكي والمهارات المستهدفة:</p>
                        <p className="mt-1 text-sm font-bold text-slate-800">{current.explanation}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
                  <button onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0} className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 disabled:opacity-40">
                    السابق
                  </button>
                  {index < assessment.questions.length - 1 ? (
                    <button onClick={() => setIndex(index + 1)} disabled={!responses[index]?.answered} className="rounded-lg bg-blue-700 px-6 py-3 text-sm font-black text-white disabled:opacity-40">
                      التالي
                    </button>
                  ) : (
                    <button onClick={finish} disabled={answeredCount < assessment.questions.length} className="rounded-lg bg-teal-700 px-6 py-3 text-sm font-black text-white disabled:opacity-40">
                      إنهاء وحفظ التقرير
                    </button>
                  )}
                </div>
              </article>
            ) : (
              <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
                <CheckCircle2 className="mx-auto text-emerald-700" size={42} />
                <h2 className="mt-4 text-2xl font-black text-slate-950">{isStudentFlow ? 'أحسنت، تم حفظ إجاباتك' : 'تم حفظ اختبار تحديد المستوى'}</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-700">
                  {isStudentFlow
                    ? 'تم إرسال إجاباتك وتقرير التحليل إلى د. إسماعيل. سيتم فتح صفحة الطالب والألعاب الآن حتى يراجع الدكتور الملف ويعتمد المسار المناسب.'
                    : `النتيجة ${score}%، القرار: ${decision.label}. تم حفظ التقرير داخل لوحة د. إسماعيل وصفحة التقارير.`}
                </p>
                <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                  {!isStudentFlow && <Link href={`/reports?report=${savedReportId}`} className="inline-flex rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white">
                    عرض التقرير الموثق
                  </Link>}
                  <Link href={isStudentFlow ? `/student/${savedStudentId || student?.id || studentIdParam || ''}` : recommendedProgram.href} className="inline-flex rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white">
                    {isStudentFlow ? 'فتح صفحة الطالب في مسار' : `فتح ${recommendedProgram.label}`}
                  </Link>
                </div>
                {!isStudentFlow && <p className="mt-3 text-xs font-bold text-slate-500">رقم التقرير: {savedReportId}</p>}
              </article>
            )}
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-32 lg:self-start">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-800">
                <ClipboardCheck size={22} />
              </span>
              <div>
                <p className="text-xs font-black text-slate-500">ملخص مباشر</p>
                <h2 className="font-black text-slate-950">{assessment.shortTitle}</h2>
              </div>
            </div>
            {isStudentFlow ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-lg bg-slate-950 p-5 text-center text-white">
                  <p className="text-4xl font-black">{answeredCount}</p>
                  <p className="mt-2 text-sm font-bold text-white/70">من {assessment.questions.length} سؤال</p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-sm font-black leading-7 text-emerald-950">
                    الإجابات محفوظة للدكتور فقط. ركز في السؤال الحالي، ولا توجد درجة ظاهرة داخل تجربة الطالب.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-5 rounded-lg bg-slate-950 p-5 text-center text-white">
                  <p className="text-5xl font-black">{score}%</p>
                  <p className="mt-2 text-sm font-bold text-white/70">{correctCount} من {scoredQuestions.length}</p>
                </div>
                <div className="mt-5 space-y-3">
                  {domains.map((domain) => (
                    <div key={domain.name} className="rounded-lg bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-black text-slate-950">{domain.name}</h3>
                        <span className="text-xs font-black text-blue-800">{domain.score}%</span>
                      </div>
                      <p className="mt-1 text-xs font-bold leading-6 text-slate-600">{domain.note}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}

function getRecommendedProgram(domains: Array<{ name: string; score: number }>) {
  const weakest = [...domains].sort((first, second) => first.score - second.score)[0]?.name ?? '';

  if (weakest.includes('رياض')) {
    return { href: '/programs/math', label: 'برنامج الرياضيات المحسوسة' };
  }

  if (weakest.includes('العربية') || weakest.includes('الإنجليزية')) {
    return { href: '/programs/reading', label: 'برنامج القراءة والكتابة' };
  }

  return { href: '/programs/learning-difficulties', label: 'برنامج صعوبات التعلم والخطة الفردية' };
}

function getGradeKeyFromStudentGrade(grade: string): PlacementGradeKey {
  if (!grade) return 'general';
  const g = grade.trim();
  if (g.includes('روضة') || g.includes('تمهيدي') || g.toUpperCase().includes('KG')) return 'kg';
  if (g.includes('الأول') || g.includes('الاول') || g.includes('1')) return 'g1';
  if (g.includes('الثاني') || g.includes('2')) return 'g2';
  if (g.includes('الثالث') || g.includes('3')) return 'g3';
  if (g.includes('الرابع') || g.includes('4')) return 'g4';
  if (g.includes('الخامس') || g.includes('5')) return 'g5';
  if (g.includes('السادس') || g.includes('6')) return 'g6';
  return 'general';
}
