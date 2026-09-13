'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Ear,
  Eye,
  Brain,
  Users,
  Laptop,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Printer,
  ArrowLeft,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type QuestionType = 'choice3' | 'yesno' | 'ling6' | 'hearing_level';

interface Question {
  id: string;
  text: string;
  type: QuestionType;
}

interface Domain {
  id: string;
  title: string;
  icon: string;
  color: string;
  questions: Question[];
}

type Answers = Record<string, string | string[]>;

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────
const LING6_SOUNDS = ['/آه/', '/أو/', '/إي/', '/ش/', '/س/', '/م/'];

const HEARING_LEVELS = [
  { label: 'طفيف', value: 'mild', score: 2 },
  { label: 'متوسط', value: 'moderate', score: 1.5 },
  { label: 'شديد', value: 'severe', score: 1 },
  { label: 'عميق', value: 'profound', score: 0.5 },
  { label: 'كلي', value: 'total', score: 0 },
];

const DOMAINS: Domain[] = [
  {
    id: 'auditory',
    title: 'السمع والإدراك السمعي',
    icon: 'Ear',
    color: '#0f766e',
    questions: [
      { id: 'a1', text: 'يستجيب للأصوات العالية المفاجئة (التصفيق، قرع الباب)', type: 'choice3' },
      { id: 'a2', text: 'يميز بين الأصوات البيئية المختلفة', type: 'choice3' },
      { id: 'a3', text: 'يلتفت نحو مصدر الصوت عند الاستدعاء', type: 'choice3' },
      { id: 'a4', text: 'يستطيع التعرف على صوت والديه أو معلمه', type: 'choice3' },
      { id: 'a5', text: 'اختبار Ling 6 — حدد الأصوات المكتشفة', type: 'ling6' },
      { id: 'a6', text: 'يميز بين الكلام والضوضاء', type: 'choice3' },
      { id: 'a7', text: 'يستجيب للموسيقى أو الإيقاع', type: 'choice3' },
      { id: 'a8', text: 'درجة الفقدان السمعي المُشخَّصة', type: 'hearing_level' },
    ],
  },
  {
    id: 'communication',
    title: 'التواصل والاستقبال',
    icon: 'Eye',
    color: '#1d4ed8',
    questions: [
      { id: 'c1', text: 'يفهم الإشارات اليدوية الأساسية', type: 'choice3' },
      { id: 'c2', text: 'يقرأ الشفاه لفهم الكلام', type: 'choice3' },
      { id: 'c3', text: 'يفهم التعبيرات الوجهية ولغة الجسد', type: 'choice3' },
      { id: 'c4', text: 'يستجيب للإيماءات والإشارات الطبيعية', type: 'choice3' },
      { id: 'c5', text: 'يفهم الصور والرموز البصرية', type: 'choice3' },
      { id: 'c6', text: 'يفهم التعليمات البسيطة بدون صوت', type: 'choice3' },
      { id: 'c7', text: 'يستخدم التواصل البصري المتبادل (eye contact)', type: 'choice3' },
      { id: 'c8', text: 'يتفاعل مع القصص المصورة', type: 'choice3' },
    ],
  },
  {
    id: 'expressive',
    title: 'التعبير والإنتاج اللغوي',
    icon: 'Brain',
    color: '#7c3aed',
    questions: [
      { id: 'e1', text: 'يستخدم إشارات يدوية للتعبير عن احتياجاته', type: 'choice3' },
      { id: 'e2', text: 'يستخدم التعبير الوجهي المقصود', type: 'choice3' },
      { id: 'e3', text: 'يصدر أصواتاً أو مقاطع صوتية', type: 'choice3' },
      { id: 'e4', text: 'يستطيع نطق بعض الكلمات (مع أو بدون مساعدة)', type: 'choice3' },
      { id: 'e5', text: 'يعبر عن رفضه وموافقته بوضوح', type: 'choice3' },
      { id: 'e6', text: 'يستطيع تسمية الأشياء المألوفة بالإشارة', type: 'choice3' },
      { id: 'e7', text: 'يبادر بالتواصل من تلقاء نفسه', type: 'choice3' },
    ],
  },
  {
    id: 'academic',
    title: 'المهارات الأكاديمية والمعرفية',
    icon: 'Brain',
    color: '#b45309',
    questions: [
      { id: 'ac1', text: 'يتعرف على الحروف الهجائية', type: 'choice3' },
      { id: 'ac2', text: 'يقرأ الكلمات البسيطة', type: 'choice3' },
      { id: 'ac3', text: 'يكتب اسمه أو كلمات بسيطة', type: 'choice3' },
      { id: 'ac4', text: 'يتعرف على الأرقام حتى 10', type: 'choice3' },
      { id: 'ac5', text: 'يستطيع ترتيب تسلسل القصص المصورة', type: 'choice3' },
      { id: 'ac6', text: 'يميز الألوان والأشكال الأساسية', type: 'choice3' },
      { id: 'ac7', text: 'يستطيع التركيز لمدة 5 دقائق على مهمة بصرية', type: 'choice3' },
    ],
  },
  {
    id: 'social',
    title: 'المهارات الاجتماعية والانفعالية',
    icon: 'Users',
    color: '#be185d',
    questions: [
      { id: 's1', text: 'يلعب مع أقرانه بشكل تلقائي', type: 'choice3' },
      { id: 's2', text: 'يبادر بالتواصل مع الآخرين', type: 'choice3' },
      { id: 's3', text: 'يعبر عن مشاعره بشكل واضح', type: 'choice3' },
      { id: 's4', text: 'يستجيب للمدح والتشجيع', type: 'choice3' },
      { id: 's5', text: 'يحافظ على صداقات مع زملائه', type: 'choice3' },
      { id: 's6', text: 'يُظهر الإحباط بشكل مناسب عند عدم الفهم', type: 'choice3' },
    ],
  },
  {
    id: 'assistive',
    title: 'الأجهزة والتقنيات المساعدة',
    icon: 'Laptop',
    color: '#065f46',
    questions: [
      { id: 'at1', text: 'هل يستخدم الطفل سماعة سمعية معينة (Hearing Aid)؟', type: 'yesno' },
      { id: 'at2', text: 'هل يستخدم زرع القوقعة الصناعية (Cochlear Implant)؟', type: 'yesno' },
      { id: 'at3', text: 'هل يتلقى جلسات تأهيل سمعي منتظمة؟', type: 'choice3' },
      { id: 'at4', text: 'هل يتلقى تدريباً رسمياً على لغة الإشارة السعودية؟', type: 'choice3' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getDomainIcon(iconName: string) {
  switch (iconName) {
    case 'Ear': return <Ear size={18} />;
    case 'Eye': return <Eye size={18} />;
    case 'Brain': return <Brain size={18} />;
    case 'Users': return <Users size={18} />;
    case 'Laptop': return <Laptop size={18} />;
    default: return <Brain size={18} />;
  }
}

function getQuestionScore(q: Question, answer: string | string[] | undefined): { score: number; max: number } {
  if (answer === undefined) return { score: 0, max: 0 };

  if (q.type === 'choice3') {
    const max = 2;
    const score = answer === 'yes' ? 2 : answer === 'sometimes' ? 1 : 0;
    return { score, max };
  }
  if (q.type === 'yesno') {
    const max = 2;
    const score = answer === 'yes' ? 2 : 0;
    return { score, max };
  }
  if (q.type === 'ling6') {
    const checked = Array.isArray(answer) ? answer.length : 0;
    return { score: (checked / 6) * 2, max: 2 };
  }
  if (q.type === 'hearing_level') {
    const level = HEARING_LEVELS.find((l) => l.value === answer);
    return { score: level ? level.score : 0, max: 2 };
  }
  return { score: 0, max: 2 };
}

function isDomainComplete(domain: Domain, answers: Answers): boolean {
  return domain.questions.every((q) => answers[q.id] !== undefined);
}

function calcDomainScore(domain: Domain, answers: Answers): number {
  let total = 0;
  let max = 0;
  for (const q of domain.questions) {
    const { score, max: m } = getQuestionScore(q, answers[q.id]);
    total += score;
    max += m;
  }
  if (max === 0) return 0;
  return Math.round((total / max) * 100);
}

function calcTotalScore(answers: Answers): number {
  const domainScores = DOMAINS.map((d) => calcDomainScore(d, answers));
  const avg = domainScores.reduce((s, v) => s + v, 0) / domainScores.length;
  return Math.round(avg);
}

function getTotalAnswered(answers: Answers): number {
  return DOMAINS.flatMap((d) => d.questions).filter((q) => answers[q.id] !== undefined).length;
}

function getTotalQuestions(): number {
  return DOMAINS.flatMap((d) => d.questions).length;
}

function allAnswered(answers: Answers): boolean {
  return getTotalAnswered(answers) === getTotalQuestions();
}

function getRecommendation(score: number): { level: string; text: string; color: string; bg: string } {
  if (score >= 80) {
    return {
      level: 'مستوى ممتاز',
      text: 'يُظهر الطفل قدرات تواصلية جيدة، يُنصح بتعزيز لغة الإشارة والدمج التعليمي',
      color: '#065f46',
      bg: '#d1fae5',
    };
  }
  if (score >= 60) {
    return {
      level: 'مستوى متوسط',
      text: 'يحتاج دعماً مكثفاً في التواصل والتأهيل السمعي والبصري',
      color: '#92400e',
      bg: '#fef3c7',
    };
  }
  if (score >= 40) {
    return {
      level: 'مستوى ضعيف',
      text: 'يحتاج تدخلاً مبكراً شاملاً في جميع مجالات التواصل والتأهيل',
      color: '#9a3412',
      bg: '#ffedd5',
    };
  }
  return {
    level: 'مستوى حرج',
    text: 'التحويل الفوري لفريق متعدد التخصصات (معالج نطق، معلم صم، أخصائي سمعيات) مطلوب',
    color: '#7f1d1d',
    bg: '#fee2e2',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────
function Choice3Input({ questionId, value, onChange }: {
  questionId: string;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const opts = [
    { label: 'نعم', val: 'yes', active: 'bg-emerald-600 text-white border-emerald-600', inactive: 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50' },
    { label: 'أحياناً', val: 'sometimes', active: 'bg-amber-500 text-white border-amber-500', inactive: 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50' },
    { label: 'لا', val: 'no', active: 'bg-red-600 text-white border-red-600', inactive: 'bg-white text-red-700 border-red-300 hover:bg-red-50' },
  ];
  return (
    <div className="flex gap-2">
      {opts.map((o) => (
        <button
          key={o.val}
          onClick={() => onChange(o.val)}
          className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-black transition-all ${value === o.val ? o.active : o.inactive}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function YesNoInput({ value, onChange }: {
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const opts = [
    { label: 'نعم', val: 'yes', active: 'bg-emerald-600 text-white border-emerald-600', inactive: 'bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50' },
    { label: 'لا', val: 'no', active: 'bg-red-600 text-white border-red-600', inactive: 'bg-white text-red-700 border-red-300 hover:bg-red-50' },
  ];
  return (
    <div className="flex gap-3">
      {opts.map((o) => (
        <button
          key={o.val}
          onClick={() => onChange(o.val)}
          className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-black transition-all ${value === o.val ? o.active : o.inactive}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Ling6Input({ value, onChange }: {
  value: string[] | undefined;
  onChange: (v: string[]) => void;
}) {
  const checked: string[] = Array.isArray(value) ? value : [];

  const toggle = (sound: string) => {
    if (checked.includes(sound)) {
      onChange(checked.filter((s) => s !== sound));
    } else {
      onChange([...checked, sound]);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {LING6_SOUNDS.map((sound) => {
        const isChecked = checked.includes(sound);
        return (
          <button
            key={sound}
            onClick={() => toggle(sound)}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-black transition-all ${
              isChecked
                ? 'border-teal-600 bg-teal-600 text-white'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            {isChecked && <CheckCircle2 size={14} />}
            {sound}
          </button>
        );
      })}
    </div>
  );
}

function HearingLevelInput({ value, onChange }: {
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {HEARING_LEVELS.map((level) => (
        <button
          key={level.value}
          onClick={() => onChange(level.value)}
          className={`rounded-xl border-2 py-2.5 text-sm font-black transition-all ${
            value === level.value
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Results Screen
// ─────────────────────────────────────────────────────────────────────────────
function ResultsScreen({ answers, onReset }: { answers: Answers; onReset: () => void }) {
  const total = calcTotalScore(answers);
  const rec = getRecommendation(total);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-600" />
        <h2 className="text-2xl font-black text-slate-900">نتائج تقييم الصم والبكم</h2>
        <p className="mt-1 text-sm font-bold text-slate-500">
          تقييم شامل وفق معايير WHO وDSM-5
        </p>
      </div>

      {/* Total Score */}
      <div
        className="rounded-2xl p-6 text-center shadow-sm"
        style={{ backgroundColor: rec.bg, border: `2px solid ${rec.color}30` }}
      >
        <p className="text-7xl font-black" style={{ color: rec.color }}>{total}%</p>
        <p className="mt-2 text-lg font-black" style={{ color: rec.color }}>{rec.level}</p>
        <p className="mt-2 text-sm font-bold" style={{ color: rec.color }}>{rec.text}</p>
      </div>

      {/* Per-domain scores */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 text-base font-black text-slate-800">النتائج التفصيلية لكل مجال</h3>
        <div className="space-y-4">
          {DOMAINS.map((domain) => {
            const score = calcDomainScore(domain, answers);
            return (
              <div key={domain.id}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white"
                      style={{ backgroundColor: domain.color }}
                    >
                      {getDomainIcon(domain.icon)}
                    </span>
                    <span className="text-sm font-black text-slate-800">{domain.title}</span>
                  </div>
                  <span className="text-sm font-black" style={{ color: domain.color }}>{score}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${score}%`, backgroundColor: domain.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Printer size={16} />
          طباعة التقرير
        </button>
        <button
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <RotateCcw size={16} />
          إعادة التقييم
        </button>
        <Link
          href="/programs/deaf-mute"
          className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-teal-800"
        >
          <ArrowLeft size={16} />
          العودة إلى مسار الصم والبكم
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export default function DeafAssessmentPage() {
  const [activeDomain, setActiveDomain] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [showResults, setShowResults] = useState(false);

  const totalQ = getTotalQuestions();
  const answeredCount = getTotalAnswered(answers);
  const progressPct = Math.round((answeredCount / totalQ) * 100);

  function setAnswer(questionId: string, value: string | string[]) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function handleReset() {
    setAnswers({});
    setActiveDomain(0);
    setShowResults(false);
  }

  const currentDomain = DOMAINS[activeDomain];

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">

          {/* Breadcrumb */}
          <nav className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-500">
            <Link href="/programs" className="hover:text-teal-700 transition-colors">
              المسارات والبرامج
            </Link>
            <span className="text-slate-300">›</span>
            <Link href="/programs/deaf-mute" className="hover:text-teal-700 transition-colors">
              مسار الصم والبكم
            </Link>
            <span className="text-slate-300">›</span>
            <span className="text-teal-700">التقييم الشامل</span>
          </nav>

          {/* Page Header */}
          <header className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-l from-teal-950 via-cyan-900 to-slate-900 p-6 text-white shadow-lg lg:p-8">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-teal-400/20 ring-2 ring-teal-400/40">
                <Ear size={26} className="text-teal-300" />
              </div>
              <div>
                <h1 className="text-2xl font-black md:text-3xl">تقييم الصم والبكم الشامل</h1>
                <p className="mt-1 text-sm font-bold text-slate-300">
                  6 مجالات · {totalQ} سؤال · وفق معايير WHO وDSM-5
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-300">
                <span>الإجابات المكتملة</span>
                <span>{answeredCount} / {totalQ} ({progressPct}%)</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-teal-400 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </header>

          {showResults ? (
            <ResultsScreen answers={answers} onReset={handleReset} />
          ) : (
            <>
              {/* Domain Tabs */}
              <div className="mb-6 flex flex-wrap gap-2">
                {DOMAINS.map((domain, idx) => {
                  const complete = isDomainComplete(domain, answers);
                  const isActive = idx === activeDomain;
                  return (
                    <button
                      key={domain.id}
                      onClick={() => setActiveDomain(idx)}
                      className={`inline-flex items-center gap-2 rounded-xl border-2 px-4 py-2.5 text-xs font-black transition-all ${
                        isActive
                          ? 'text-white shadow-md'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                      style={
                        isActive
                          ? { backgroundColor: domain.color, borderColor: domain.color }
                          : {}
                      }
                    >
                      {getDomainIcon(domain.icon)}
                      <span className="hidden sm:inline">{domain.title}</span>
                      {complete && (
                        <CheckCircle2
                          size={14}
                          className={isActive ? 'text-white/80' : 'text-emerald-600'}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Current Domain Questions */}
              <section>
                <div className="mb-4 flex items-center gap-3">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
                    style={{ backgroundColor: currentDomain.color }}
                  >
                    {getDomainIcon(currentDomain.icon)}
                  </span>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">{currentDomain.title}</h2>
                    <p className="text-xs font-bold text-slate-500">
                      {currentDomain.questions.filter((q) => answers[q.id] !== undefined).length} / {currentDomain.questions.length} سؤال مُجاب
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {currentDomain.questions.map((q, qi) => {
                    const answered = answers[q.id] !== undefined;
                    return (
                      <div
                        key={q.id}
                        className={`rounded-2xl border-2 bg-white p-5 shadow-sm transition-all ${
                          answered ? 'border-emerald-200' : 'border-slate-200'
                        }`}
                      >
                        <div className="mb-3 flex items-start gap-3">
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                            style={{ backgroundColor: currentDomain.color }}
                          >
                            {qi + 1}
                          </span>
                          <p className="text-sm font-bold leading-7 text-slate-800">{q.text}</p>
                          {answered && (
                            <CheckCircle2 size={16} className="ml-auto shrink-0 text-emerald-600" />
                          )}
                        </div>

                        {q.type === 'choice3' && (
                          <Choice3Input
                            questionId={q.id}
                            value={answers[q.id] as string | undefined}
                            onChange={(v) => setAnswer(q.id, v)}
                          />
                        )}
                        {q.type === 'yesno' && (
                          <YesNoInput
                            value={answers[q.id] as string | undefined}
                            onChange={(v) => setAnswer(q.id, v)}
                          />
                        )}
                        {q.type === 'ling6' && (
                          <Ling6Input
                            value={answers[q.id] as string[] | undefined}
                            onChange={(v) => setAnswer(q.id, v)}
                          />
                        )}
                        {q.type === 'hearing_level' && (
                          <HearingLevelInput
                            value={answers[q.id] as string | undefined}
                            onChange={(v) => setAnswer(q.id, v)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Navigation */}
                <div className="mt-6 flex items-center justify-between gap-4">
                  <button
                    onClick={() => setActiveDomain((p) => Math.max(0, p - 1))}
                    disabled={activeDomain === 0}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight size={16} />
                    المجال السابق
                  </button>

                  {allAnswered(answers) ? (
                    <button
                      onClick={() => setShowResults(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3 text-sm font-black text-white shadow-md transition hover:bg-emerald-700"
                    >
                      <CheckCircle2 size={16} />
                      عرض النتائج
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveDomain((p) => Math.min(DOMAINS.length - 1, p + 1))}
                      disabled={activeDomain === DOMAINS.length - 1}
                      className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      المجال التالي
                      <ChevronLeft size={16} />
                    </button>
                  )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
