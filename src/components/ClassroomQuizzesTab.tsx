'use client';

import React, { useState, useEffect } from 'react';
import {
  HelpCircle, Plus, Sparkles, CheckCircle2, Clock, Play,
  Award, Trash2, ChevronRight, Check, X, FileText, BarChart2,
  BookOpen, Lightbulb, AlertCircle, RefreshCw, Trophy
} from 'lucide-react';
import { syncDocToCloud, deleteDocFromCloud } from '@/lib/firestoreSync';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface QuizQuestion {
  id: string;
  questionText: string;
  type: 'multiple-choice' | 'true-false';
  options: string[];
  correctAnswer: number; // 0-indexed option index
  points: number;
}

export interface ClassQuiz {
  id: string;
  title: string;
  subject: string;
  durationMinutes: number;
  totalPoints: number;
  questions: QuizQuestion[];
  createdAt: string;
  submissionsCount: number;
}

const STORAGE_KEY = 'masar_class_quizzes_v1';
const CLOUD_COLLECTION = 'classroom_quizzes';

function authJsonHeaders() {
  if (typeof window === 'undefined') return { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('masar_token') ?? localStorage.getItem('access_token');
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function buildLocalQuizQuestions(subject: string): QuizQuestion[] {
  const common = {
    'لغتي العربية': [
      ['اختر الكلمة التي تبدأ بحرف اللام:', ['قلم', 'لعبة', 'بيت', 'شمس'], 1],
      ['أي الجمل التالية جملة مفيدة؟', ['الطالب يقرأ الدرس.', 'في إلى من', 'كتاب فوق', 'أحمر سريع'], 0],
      ['الكلمة التي تحتوي على مد بالألف هي:', ['باب', 'كتب', 'درس', 'قلم'], 0],
    ],
    'الرياضيات': [
      ['كم ناتج 5 + 3؟', ['6', '7', '8', '9'], 2],
      ['أي عدد أكبر من 12؟', ['9', '10', '13', '11'], 2],
      ['اختر الشكل الذي له ثلاثة أضلاع.', ['الدائرة', 'المربع', 'المثلث', 'المستطيل'], 2],
    ],
    'القرآن الكريم': [
      ['ما التصرف المناسب عند قراءة القرآن؟', ['الإنصات والاحترام', 'اللعب', 'رفع الصوت بلا حاجة', 'ترك المصحف مفتوحاً'], 0],
      ['تبدأ البسملة بقول:', ['الحمد لله', 'بسم الله الرحمن الرحيم', 'الله أكبر', 'سبحان الله'], 1],
      ['قراءة القرآن تحتاج إلى:', ['تأن ووضوح', 'عجلة', 'إهمال', 'انشغال'], 0],
    ],
    'العلوم': [
      ['أي مما يلي يحتاجه النبات لينمو؟', ['الضوء والماء', 'الظلام فقط', 'الحجارة فقط', 'الصوت'], 0],
      ['الحواس تساعدنا على:', ['معرفة الأشياء حولنا', 'النوم فقط', 'الكتابة فقط', 'الجري فقط'], 0],
      ['الماء يكون في الحالة السائلة غالباً عند:', ['درجة حرارة عادية', 'تجمد شديد', 'غليان دائم', 'بدون وعاء'], 0],
    ],
    'التربية الإسلامية': [
      ['من آداب المسلم:', ['الصدق', 'الكذب', 'إيذاء الآخرين', 'إهمال الصلاة'], 0],
      ['نقول قبل الأكل:', ['بسم الله', 'تصبح على خير', 'مع السلامة', 'لا شيء'], 0],
      ['التعاون يعني:', ['مساعدة الآخرين في الخير', 'ترك الفريق', 'إخفاء الأدوات', 'رفض المشاركة'], 0],
    ],
  } as Record<string, Array<[string, string[], number]>>;

  const source = common[subject] ?? common['لغتي العربية'];
  return source.map(([questionText, options, correctAnswer], index) => ({
    id: `bq-${Date.now()}-${index + 1}`,
    questionText,
    type: 'multiple-choice',
    options,
    correctAnswer,
    points: 5,
  }));
}

function parseQuizFromAi(reply: string, subject: string): { title: string; questions: QuizQuestion[] } | null {
  const jsonMatch = reply.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      title?: string;
      questions?: Array<{
        questionText?: string;
        text?: string;
        options?: string[];
        correctAnswer?: number | string;
        type?: 'multiple-choice' | 'true-false';
        points?: number;
      }>;
    };

    const questions = parsed.questions
      ?.filter((q) => (q.questionText || q.text) && Array.isArray(q.options) && q.options.length >= 2)
      .slice(0, 8)
      .map((q, index) => {
        const correctIndex = typeof q.correctAnswer === 'number'
          ? q.correctAnswer
          : Math.max(0, q.options!.findIndex((option) => option === q.correctAnswer));
        return {
          id: `bq-${Date.now()}-${index + 1}`,
          questionText: String(q.questionText || q.text),
          type: q.type === 'true-false' ? 'true-false' : 'multiple-choice',
          options: q.options!.slice(0, 4),
          correctAnswer: correctIndex >= 0 ? correctIndex : 0,
          points: Number(q.points) || 5,
        } satisfies QuizQuestion;
      }) ?? [];

    if (!questions.length) return null;
    return {
      title: parsed.title || `كويز ${subject} التفاعلي`,
      questions,
    };
  } catch {
    return null;
  }
}

const SAMPLE_QUIZZES: ClassQuiz[] = [
  {
    id: 'quiz-001',
    title: 'كويز لغتي العربية: حروف الجر والكلمة والجملة 📖',
    subject: 'لغتي العربية',
    durationMinutes: 10,
    totalPoints: 20,
    createdAt: '2026-08-10',
    submissionsCount: 4,
    questions: [
      {
        id: 'q1',
        questionText: 'اختر حرف الجر المناسب: ذهب الطالب ..... المدرسة صباحاً.',
        type: 'multiple-choice',
        options: ['عن', 'إلى', 'على', 'في'],
        correctAnswer: 1,
        points: 5,
      },
      {
        id: 'q2',
        questionText: 'الكلمة التي تبدأ بـ (الـ) القمرية هي:',
        type: 'multiple-choice',
        options: ['الشمس', 'السماء', 'القمر', 'الذهب'],
        correctAnswer: 2,
        points: 5,
      },
      {
        id: 'q3',
        questionText: 'الجملة الإسمية هي الجملة التي تبدأ بـ فعل.',
        type: 'true-false',
        options: ['صح', 'خطأ'],
        correctAnswer: 1,
        points: 5,
      },
      {
        id: 'q4',
        questionText: 'جمع كلمة (طالب) هو:',
        type: 'multiple-choice',
        options: ['طالبان', 'طلاب', 'طالبات', 'طلبة'],
        correctAnswer: 1,
        points: 5,
      },
    ],
  },
  {
    id: 'quiz-002',
    title: 'كويز الرياضيات السريع: جدول الضرب والقسمة 📐',
    subject: 'الرياضيات',
    durationMinutes: 15,
    totalPoints: 20,
    createdAt: '2026-08-11',
    submissionsCount: 2,
    questions: [
      {
        id: 'q1',
        questionText: 'حاصل ضرب 7 × 8 يساوي:',
        type: 'multiple-choice',
        options: ['48', '54', '56', '64'],
        correctAnswer: 2,
        points: 5,
      },
      {
        id: 'q2',
        questionText: 'حاصل قسمة 36 ÷ 6 يساوي:',
        type: 'multiple-choice',
        options: ['5', '6', '7', '8'],
        correctAnswer: 1,
        points: 5,
      },
      {
        id: 'q3',
        questionText: 'أي الأعداد التالية يعتبر عدداً زوجياً؟',
        type: 'multiple-choice',
        options: ['13', '21', '28', '35'],
        correctAnswer: 2,
        points: 5,
      },
      {
        id: 'q4',
        questionText: 'مجموع زوايا المثلث يساوي 180 درجة.',
        type: 'true-false',
        options: ['صح', 'خطأ'],
        correctAnswer: 0,
        points: 5,
      },
    ],
  },
];

function loadLocalQuizzes(): ClassQuiz[] {
  if (typeof window === 'undefined') return SAMPLE_QUIZZES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : SAMPLE_QUIZZES;
  } catch { return SAMPLE_QUIZZES; }
}

function saveQuizStore(quiz: ClassQuiz, currentList: ClassQuiz[]): ClassQuiz[] {
  const updated = [quiz, ...currentList.filter(q => q.id !== quiz.id)];
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  // ☁️ Sync to Server Database Cloud
  syncDocToCloud(CLOUD_COLLECTION, quiz.id, quiz);
  return updated;
}

export default function ClassroomQuizzesTab() {
  const [quizzes, setQuizzes] = useState<ClassQuiz[]>(() => loadLocalQuizzes());
  const [activeQuiz, setActiveQuiz] = useState<ClassQuiz | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Live Test Runner State
  const [testMode, setTestMode] = useState<ClassQuiz | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [testFinished, setTestFinished] = useState(false);
  const [calculatedScore, setCalculatedScore] = useState(0);

  // New Quiz Builder Form State
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('لغتي العربية');
  const [newDuration, setNewDuration] = useState(10);
  const [builderQuestions, setBuilderQuestions] = useState<QuizQuestion[]>([
    {
      id: 'bq-1',
      questionText: 'اكتب نص السؤال الأول هنا...',
      type: 'multiple-choice',
      options: ['الخيار 1', 'الخيار 2', 'الخيار 3', 'الخيار 4'],
      correctAnswer: 0,
      points: 5,
    },
  ]);

  // AI Quiz Generator state
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  /* ☁️ Cloud Sync on Mount ─────────────────────────────────────── */
  useEffect(() => {
    getDocs(collection(db, CLOUD_COLLECTION)).then((snap) => {
      if (!snap.empty) {
        const cloudItems = snap.docs.map(d => d.data() as ClassQuiz);
        setQuizzes(prev => {
          const merged = [...cloudItems, ...prev].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
          return merged;
        });
      } else {
        // Seed cloud with sample quizzes if cloud empty
        SAMPLE_QUIZZES.forEach(q => syncDocToCloud(CLOUD_COLLECTION, q.id, q));
      }
    }).catch(e => console.warn('Quizzes cloud fetch note:', e));

    const unsub = onSnapshot(collection(db, CLOUD_COLLECTION), (snap) => {
      if (!snap.empty) {
        const cloudItems = snap.docs.map(d => d.data() as ClassQuiz);
        setQuizzes(cloudItems);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudItems));
        }
      }
    });

    return () => unsub();
  }, []);

  const handleGenerateAIQuiz = async () => {
    setIsGeneratingAI(true);
    try {
      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: authJsonHeaders(),
        body: JSON.stringify({
          prompt: `أنشئ كويز تفاعلي قصير لمادة ${newSubject} للصف الأول أو الثاني الابتدائي. أرجع JSON فقط بهذا الشكل:
{"title":"عنوان الكويز","questions":[{"questionText":"نص السؤال","type":"multiple-choice","options":["اختيار 1","اختيار 2","اختيار 3","اختيار 4"],"correctAnswer":0,"points":5}]}`,
          branch: 'IKHLAS_JEDDAH',
          history: [],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const parsedQuiz = parseQuizFromAi(String(data.reply ?? ''), newSubject);
        if (parsedQuiz) {
          setNewTitle(parsedQuiz.title);
          setBuilderQuestions(parsedQuiz.questions);
          setIsGeneratingAI(false);
          return;
        }
      }
    } catch { /* fallback */ }

    setNewTitle(`كويز ${newSubject} التفاعلي`);
    setBuilderQuestions(buildLocalQuizQuestions(newSubject));
    setIsGeneratingAI(false);
  };

  const handleSaveQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const totalPts = builderQuestions.reduce((acc, q) => acc + q.points, 0);
    const created: ClassQuiz = {
      id: `quiz-${Date.now()}`,
      title: newTitle.trim(),
      subject: newSubject,
      durationMinutes: newDuration,
      totalPoints: totalPts || 20,
      questions: builderQuestions,
      createdAt: new Date().toISOString().slice(0, 10),
      submissionsCount: 0,
    };

    const updated = saveQuizStore(created, quizzes);
    setQuizzes(updated);
    setShowCreateModal(false);
    setNewTitle('');
    setBuilderQuestions([
      {
        id: `bq-${Date.now()}`,
        questionText: 'اكتب نص السؤال هنا...',
        type: 'multiple-choice',
        options: ['الخيار 1', 'الخيار 2', 'الخيار 3', 'الخيار 4'],
        correctAnswer: 0,
        points: 5,
      },
    ]);
  };

  const handleDeleteQuiz = (id: string) => {
    const updated = quizzes.filter(q => q.id !== id);
    setQuizzes(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    deleteDocFromCloud(CLOUD_COLLECTION, id);
    if (activeQuiz?.id === id) setActiveQuiz(null);
  };

  const startTest = (quiz: ClassQuiz) => {
    setTestMode(quiz);
    setCurrentQIndex(0);
    setUserAnswers({});
    setTestFinished(false);
    setCalculatedScore(0);
  };

  const handleSelectAnswer = (qId: string, optionIndex: number) => {
    setUserAnswers(prev => ({ ...prev, [qId]: optionIndex }));
  };

  const handleFinishTest = () => {
    if (!testMode) return;
    let earned = 0;
    testMode.questions.forEach((q) => {
      if (userAnswers[q.id] === q.correctAnswer) {
        earned += q.points;
      }
    });
    setCalculatedScore(earned);
    setTestFinished(true);

    // Update submissions count in cloud
    const updatedQuiz = { ...testMode, submissionsCount: testMode.submissionsCount + 1 };
    saveQuizStore(updatedQuiz, quizzes);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <HelpCircle size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              الكويزات والاختبارات التفاعلية (متصلة بالسيرفر ☁️)
              <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-black text-indigo-800">
                AI + السحابة
              </span>
            </h1>
            <p className="text-xs font-bold text-slate-500 mt-1">
              إضافة وتوليد الكويزات بـ AI · متصلة بالسيرفر وقاعدة بيانات المنصة · تجربة طلابية تفاعلية
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition shrink-0"
        >
          <Plus size={18} />
          إنشاء كويز جديد
        </button>
      </div>

      {/* Main Grid: Quiz List vs Details/Runner */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Col: Quizzes List */}
        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            <BookOpen size={18} className="text-indigo-600" />
            الكويزات المعتمدة بالفصل ({quizzes.length})
          </h2>

          <div className="space-y-3">
            {quizzes.map((quiz) => {
              const active = activeQuiz?.id === quiz.id;
              return (
                <div
                  key={quiz.id}
                  onClick={() => setActiveQuiz(quiz)}
                  className={`cursor-pointer rounded-2xl border p-5 transition-all duration-200 ${
                    active
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="inline-block rounded-md bg-indigo-100 px-2.5 py-0.5 text-[10px] font-black text-indigo-800">
                        {quiz.subject}
                      </span>
                      <h3 className="text-sm font-black text-slate-900 leading-snug">{quiz.title}</h3>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteQuiz(quiz.id); }}
                      className="text-slate-400 hover:text-rose-600 p-1 transition"
                      title="حذف الكويز"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock size={14} className="text-slate-400" />
                        {quiz.durationMinutes} دقائق
                      </span>
                      <span className="flex items-center gap-1">
                        <Award size={14} className="text-amber-500" />
                        {quiz.totalPoints} درجة
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); startTest(quiz); }}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-black text-white shadow-sm hover:bg-emerald-700 transition"
                    >
                      <Play size={12} />
                      تجربة الكويز
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col: Details View or Test Runner */}
        <div className="lg:col-span-7">
          {testMode ? (
            /* Test Runner Card */
            <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm space-y-6">
              {!testFinished ? (
                <>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-xs font-bold text-indigo-600">{testMode.subject}</span>
                      <h2 className="text-base font-black text-slate-900">{testMode.title}</h2>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">
                      <Clock size={14} className="text-slate-500" />
                      السؤال {currentQIndex + 1} من {testMode.questions.length}
                    </div>
                  </div>

                  {/* Question Content */}
                  {(() => {
                    const q = testMode.questions[currentQIndex];
                    if (!q) return null;
                    const selectedOpt = userAnswers[q.id];

                    return (
                      <div className="space-y-4">
                        <div className="rounded-2xl bg-indigo-50/60 border border-indigo-100 p-4">
                          <h3 className="text-sm font-black text-slate-900 leading-relaxed">
                            {currentQIndex + 1}. {q.questionText}
                          </h3>
                        </div>

                        <div className="space-y-2">
                          {q.options.map((opt, idx) => {
                            const isSelected = selectedOpt === idx;
                            return (
                              <button
                                key={idx}
                                onClick={() => handleSelectAnswer(q.id, idx)}
                                className={`w-full flex items-center justify-between rounded-xl border p-4 text-right text-xs font-black transition ${
                                  isSelected
                                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                                    : 'border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                              >
                                <span>{opt}</span>
                                <div
                                  className={`grid h-5 w-5 place-items-center rounded-full border ${
                                    isSelected ? 'border-white bg-white text-indigo-600' : 'border-slate-300'
                                  }`}
                                >
                                  {isSelected && <Check size={12} />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Navigation Footer */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                    <button
                      disabled={currentQIndex === 0}
                      onClick={() => setCurrentQIndex((p) => p - 1)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                    >
                      السابق
                    </button>

                    {currentQIndex < testMode.questions.length - 1 ? (
                      <button
                        onClick={() => setCurrentQIndex((p) => p + 1)}
                        className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-black text-white hover:bg-indigo-700 transition"
                      >
                        التالي
                        <ChevronRight size={14} />
                      </button>
                    ) : (
                      <button
                        onClick={handleFinishTest}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-6 py-2 text-xs font-black text-white shadow-md hover:bg-emerald-700 transition"
                      >
                        <CheckCircle2 size={16} />
                        إنهاء وتسليم الاختبار
                      </button>
                    )}
                  </div>
                </>
              ) : (
                /* Test Result Banner */
                <div className="text-center py-8 space-y-4">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600 shadow-md">
                    <Trophy size={32} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">أحسنت! تم تسليم الكويز بنجاح 🌟</h2>
                    <p className="text-xs font-bold text-slate-500 mt-1">نتيجة التجربة التفاعلية لـ {testMode.title}</p>
                  </div>

                  <div className="mx-auto max-w-xs rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                    <span className="text-xs font-bold text-emerald-800">درجة الاختبار التقديرية</span>
                    <div className="text-3xl font-black text-emerald-600 mt-1">
                      {calculatedScore} / {testMode.totalPoints}
                    </div>
                  </div>

                  <button
                    onClick={() => setTestMode(null)}
                    className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-black text-white hover:bg-slate-800 transition"
                  >
                    العودة لقائمة الكويزات
                  </button>
                </div>
              )}
            </div>
          ) : activeQuiz ? (
            /* Selected Quiz Details View */
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold text-indigo-600">{activeQuiz.subject}</span>
                  <h2 className="text-lg font-black text-slate-900">{activeQuiz.title}</h2>
                </div>
                <button
                  onClick={() => startTest(activeQuiz)}
                  className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-md hover:bg-emerald-700 transition"
                >
                  <Play size={14} />
                  بدء تجربة الكويز
                </button>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                  الأسئلة المدرجة ({activeQuiz.questions.length})
                </h3>

                {activeQuiz.questions.map((q, idx) => (
                  <div key={q.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2">
                    <div className="flex items-center justify-between text-xs font-black text-slate-900">
                      <span>{idx + 1}. {q.questionText}</span>
                      <span className="text-amber-600">{q.points} درجات</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, oIdx) => (
                        <div
                          key={oIdx}
                          className={`rounded-xl border px-3 py-2 text-[11px] font-bold ${
                            oIdx === q.correctAnswer
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                              : 'border-slate-200 bg-white text-slate-600'
                          }`}
                        >
                          {opt} {oIdx === q.correctAnswer && '✓ (الصحيحة)'}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Empty State */
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-12 text-center space-y-3">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600">
                <HelpCircle size={24} />
              </div>
              <h3 className="text-sm font-black text-slate-900">اختر كويز لمراجعة تفاصيله أو تجريبه</h3>
              <p className="text-xs font-bold text-slate-500">
                يمكنك أيضاً إنشاء كويز جديد ومولد بالكامل بالذكاء الاصطناعي بضغطة زر.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create New Quiz */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto" dir="rtl">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Plus size={18} className="text-indigo-600" />
                إنشاء كويز تفاعلي جديد
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* AI Generator Action Box */}
            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-4 flex items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-600" />
                  توليد الكويز آلياً بالذكاء الاصطناعي
                </h4>
                <p className="text-[11px] font-bold text-indigo-700 mt-0.5">
                  يقوم AI بصياغة الأسئلة والإجابات النموذجية لمادة {newSubject} فوراً.
                </p>
              </div>
              <button
                type="button"
                onClick={handleGenerateAIQuiz}
                disabled={isGeneratingAI}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-black text-white hover:bg-indigo-700 transition shrink-0 shadow-sm disabled:opacity-50"
              >
                {isGeneratingAI ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                توليد بـ AI
              </button>
            </div>

            <form onSubmit={handleSaveQuiz} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1">عنوان الكويز</label>
                <input
                  type="text"
                  placeholder="مثال: كويز لغتي العربية: الحروف والكلمات 📖"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 focus:border-indigo-600 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1">المادة</label>
                  <select
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="لغتي العربية">لغتي العربية</option>
                    <option value="الرياضيات">الرياضيات</option>
                    <option value="القرآن الكريم">القرآن الكريم</option>
                    <option value="العلوم">العلوم</option>
                    <option value="التربية الإسلامية">التربية الإسلامية</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 mb-1">مدة الكويز (بالدقائق)</label>
                  <input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 p-3 focus:border-indigo-600 focus:outline-none"
                    min={1}
                    max={60}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-indigo-600 py-3 font-black text-white hover:bg-indigo-700 transition"
                >
                  حفظ الكويز واعتماده بالسيرفر ☁️
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
