'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Ear,
  Eye,
  Users,
  ClipboardCheck,
  ArrowLeft,
  BookOpen,
  Sparkles,
  Shield,
  Brain,
  GraduationCap,
  Search,
  Volume2,
  CheckCircle2,
  Hand,
  Lightbulb,
  Heart,
  ChevronDown,
  ChevronUp,
  X,
  FileText
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  PROGRAM_AREAS,
  SIGN_CARDS,
  LING_SOUNDS,
  LIP_PATTERNS,
  IEP_WEEKS,
  SignCard,
  ProgramArea
} from '@/data/deafCurriculumData';

export default function DeafMutePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'signs' | 'lip_reading' | 'auditory' | 'plan' | 'guide'>('overview');
  const [signCategory, setSignCategory] = useState<string>('all');
  const [searchSign, setSearchSign] = useState<string>('');
  const [selectedSign, setSelectedSign] = useState<SignCard | null>(null);
  const [activeProgramModal, setActiveProgramModal] = useState<ProgramArea | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(0);

  // Audio Synth for Ling 6
  const [playingSound, setPlayingSound] = useState<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSynthTone = (freq: number, soundName: string) => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      setPlayingSound(soundName);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = freq > 2000 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.25);

      setTimeout(() => {
        setPlayingSound(null);
      }, 1250);
    } catch {
      setPlayingSound(null);
    }
  };

  // Filtered Sign Cards
  const filteredSigns = SIGN_CARDS.filter((c) => {
    const matchesCategory = signCategory === 'all' || c.category === signCategory;
    const matchesSearch =
      !searchSign ||
      c.word.includes(searchSign) ||
      c.categoryAr.includes(searchSign) ||
      c.handMovement.includes(searchSign);
    return matchesCategory && matchesSearch;
  });

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
            <span className="text-teal-700 font-black">مسار الصم والبكم والتأهيل البصري الإشاري</span>
          </nav>

          {/* Hero Header */}
          <header className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-teal-950 via-cyan-900 to-slate-900 p-8 text-white shadow-xl lg:p-10">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-teal-400/15 blur-3xl" />
              <div className="absolute -bottom-16 left-0 h-56 w-96 rounded-full bg-cyan-400/15 blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-teal-400/20 px-4 py-1.5 text-xs font-black text-teal-300 ring-1 ring-teal-400/30">
                  <Sparkles size={13} />
                  برنامج تأهيلي معتمد وفق معايير IDEA وASHA وWHO الدولية
                </div>

                <h1 className="text-3xl font-black leading-tight md:text-5xl">
                  مسار الصم والبكم والتأهيل البصري الإشاري
                </h1>
                <p className="mt-3 max-w-3xl text-sm font-bold leading-8 text-slate-200">
                  المنظومة التفاعلية الشاملة للطلاب الصم وضعاف السمع: قاموس لغة الإشارة السعودية المصور،
                  مختبر قراءة حركة الشفاه، فحص أصوات لينج السمعي (Ling 6)، وخطة تأهيلية فردية من 12 أسبوعاً للدمج المدرسي التام.
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-black text-slate-200 border border-white/10">
                    <Shield size={14} className="text-teal-300" />
                    مدخل ثنائي بصري (Bimodal-Bilingual)
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-black text-slate-200 border border-white/10">
                    <GraduationCap size={14} className="text-teal-300" />
                    12 أسبوعاً تدريبياً معتمداً
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-black text-slate-200 border border-white/10">
                    <Hand size={14} className="text-teal-300" />
                    +200 إشارة وظيفية
                  </div>
                </div>
              </div>

              {/* Top CTA */}
              <div className="shrink-0 flex flex-col gap-2.5 sm:min-w-[240px]">
                <Link
                  href="/assessment/deaf"
                  className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-teal-400 px-6 py-4 text-sm font-black text-teal-950 shadow-lg transition-all hover:bg-teal-300 hover:shadow-teal-400/30"
                >
                  <ClipboardCheck size={20} />
                  <span>بدء تقييم الصم والبكم الشامل</span>
                  <ArrowLeft size={16} />
                </Link>
                <button
                  onClick={() => setActiveTab('signs')}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 px-6 py-3 text-xs font-black text-white hover:bg-white/20 transition-all border border-white/20"
                >
                  <Hand size={16} />
                  <span>فتح القاموس الإشاري التفاعلي</span>
                </button>
              </div>
            </div>
          </header>

          {/* Navigation Tabs */}
          <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
                activeTab === 'overview'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Lightbulb size={15} />
              <span>المجالات والبرامج (5 برامج)</span>
            </button>

            <button
              onClick={() => setActiveTab('signs')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
                activeTab === 'signs'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Hand size={15} />
              <span>القاموس الإشاري المصور ({SIGN_CARDS.length} إشارة)</span>
            </button>

            <button
              onClick={() => setActiveTab('lip_reading')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
                activeTab === 'lip_reading'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Eye size={15} />
              <span>مختبر قراءة حركة الشفاه</span>
            </button>

            <button
              onClick={() => setActiveTab('auditory')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
                activeTab === 'auditory'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Volume2 size={15} />
              <span>فحص أصوات لينج السمعي (Ling 6)</span>
            </button>

            <button
              onClick={() => setActiveTab('plan')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
                activeTab === 'plan'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <GraduationCap size={15} />
              <span>خطة الـ 12 أسبوعاً التأهيلية (IEP)</span>
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition-all ${
                activeTab === 'guide'
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Users size={15} />
              <span>دليل المعلم والدمج الصفي</span>
            </button>
          </div>

          {/* ===================================================================
              TAB 1: OVERVIEW & PROGRAM CARDS
          =================================================================== */}
          {activeTab === 'overview' && (
            <section className="mt-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900">المجالات والبرامج التأهيلية المتخصصة</h2>
                  <p className="text-xs font-bold text-slate-500 mt-1">
                    اضغط على أي مجال للاطلاع على أهدافه ووحداته التدريبية، أو انتقل للقاموس والمختبر مباشرة.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/assessment/deaf"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-4 py-2 text-xs font-black hover:bg-emerald-700 transition shadow-xs"
                  >
                    <ClipboardCheck size={14} />
                    <span>تقييم الطالب بالمعايير الدولية</span>
                  </Link>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {PROGRAM_AREAS.map((prog) => (
                  <article
                    key={prog.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-teal-300"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <span
                          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white shadow-sm"
                          style={{ backgroundColor: prog.color }}
                        >
                          {prog.id === 'prog_sign' && <Hand size={22} />}
                          {prog.id === 'prog_lip' && <Eye size={22} />}
                          {prog.id === 'prog_audio' && <Ear size={22} />}
                          {prog.id === 'prog_lang' && <BookOpen size={22} />}
                          {prog.id === 'prog_include' && <Users size={22} />}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-700">
                          {prog.badge}
                        </span>
                      </div>

                      <h3 className="mt-4 text-lg font-black text-slate-950">{prog.title}</h3>
                      <p className="mt-2 text-xs font-bold leading-6 text-slate-600">{prog.summary}</p>

                      <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <p className="text-[11px] font-black text-slate-500 mb-1.5">أبرز المهارات المستهدفة:</p>
                        <ul className="space-y-1">
                          {prog.keyGoals.slice(0, 2).map((g, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-[11px] font-bold text-slate-700">
                              <CheckCircle2 size={13} className="text-teal-600 shrink-0 mt-0.5" />
                              <span>{g}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setActiveProgramModal(prog)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-xs font-black text-slate-800 hover:bg-slate-100 transition"
                      >
                        <FileText size={14} />
                        <span>تفاصيل الخطة</span>
                      </button>
                      <button
                        onClick={() => setActiveTab(prog.actionTab)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl text-white py-2.5 px-3 text-xs font-black shadow-xs hover:opacity-95 transition"
                        style={{ backgroundColor: prog.color }}
                      >
                        <span>فتح التدريب</span>
                        <ArrowLeft size={13} />
                      </button>
                    </div>
                  </article>
                ))}

                {/* 6th Card: Assessment Banner */}
                <article className="flex flex-col justify-between rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-900 to-teal-950 p-6 text-white shadow-md">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-sm">
                        <ClipboardCheck size={24} />
                      </span>
                      <span className="rounded-full bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 text-[11px] font-black">
                        معيار دولي معتمد
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-black">اختبار وتقييم الصم والبكم الشامل</h3>
                    <p className="mt-2 text-xs font-bold leading-6 text-emerald-100/90">
                      تقييم سريري متكامل يشمل 6 محاور: الكشف السمعي، قراءة الشفاه، الإنتاج الإشاري، المهارات الأكاديمية، والاندماج الصفي، مع توليد تقرير نتائج فوري.
                    </p>

                    <div className="mt-4 space-y-1.5 text-xs text-emerald-200 font-bold">
                      <p className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>38 مؤشراً تقييمياً دقيقاً</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-400" />
                        <span>تحديد خطة التأهيل الفردية المناسبة تلقائياً</span>
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/assessment/deaf"
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 text-emerald-950 py-3 px-4 text-xs font-black shadow-md hover:bg-emerald-300 transition"
                  >
                    <span>ابدأ الاختبار الآن</span>
                    <ArrowLeft size={14} />
                  </Link>
                </article>
              </div>
            </section>
          )}

          {/* ===================================================================
              TAB 2: INTERACTIVE SAUDI SIGN LANGUAGE DICTIONARY
          =================================================================== */}
          {activeTab === 'signs' && (
            <section className="mt-6 space-y-6">
              <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-teal-950 flex items-center gap-2">
                    <Hand className="text-teal-700" />
                    القاموس الإشاري السعودي التفاعلي
                  </h2>
                  <p className="text-xs font-bold text-teal-800 mt-1 max-w-2xl">
                    تصفح بطاقات الإشارات المعتمدة مع وصف حركي دقيق لموضع اليدين والأصابع، وتعبيرات الوجه المتوافقة، ونصائح التطبيق العملي.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ابحث عن إشارة أو كلمة..."
                      value={searchSign}
                      onChange={(e) => setSearchSign(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2 pr-9 pl-3 text-xs font-bold text-slate-900 outline-none focus:border-teal-600"
                    />
                  </div>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setSignCategory('all')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                    signCategory === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  جميع الإشارات ({SIGN_CARDS.length})
                </button>
                <button
                  onClick={() => setSignCategory('basics')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                    signCategory === 'basics'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  الكلمات الأساسية
                </button>
                <button
                  onClick={() => setSignCategory('daily')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                    signCategory === 'daily'
                      ? 'bg-sky-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  الاحتياجات اليومية
                </button>
                <button
                  onClick={() => setSignCategory('family')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                    signCategory === 'family'
                      ? 'bg-pink-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  الأسرة والعائلة
                </button>
                <button
                  onClick={() => setSignCategory('feelings')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                    signCategory === 'feelings'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  المشاعر والألم
                </button>
                <button
                  onClick={() => setSignCategory('emergency')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                    signCategory === 'emergency'
                      ? 'bg-rose-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  النجدة والأمان ⚠️
                </button>
                <button
                  onClick={() => setSignCategory('alphabet')}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-black transition ${
                    signCategory === 'alphabet'
                      ? 'bg-teal-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  الأبجدية الإصبعية
                </button>
              </div>

              {/* Cards Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredSigns.map((sign) => (
                  <article
                    key={sign.id}
                    onClick={() => setSelectedSign(sign)}
                    className="group cursor-pointer flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:shadow-md hover:border-teal-400 hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="rounded-md px-2 py-0.5 text-[10px] font-black text-white"
                          style={{ backgroundColor: sign.categoryColor }}
                        >
                          {sign.categoryAr}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 group-hover:text-teal-600 transition flex items-center gap-1">
                          <span>تفاصيل</span>
                          <ArrowLeft size={12} />
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div
                          className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white font-black text-lg shadow-sm"
                          style={{ backgroundColor: sign.categoryColor }}
                        >
                          <Hand size={20} />
                        </div>
                        <div>
                          <h3 className="text-base font-black text-slate-900 group-hover:text-teal-700 transition">
                            {sign.word}
                          </h3>
                          <p className="text-[11px] font-bold text-slate-500">لغة الإشارة السعودية</p>
                        </div>
                      </div>

                      <div className="mt-3.5 rounded-xl bg-slate-50 p-3 border border-slate-100">
                        <p className="text-[11px] font-black text-slate-700 leading-5 line-clamp-3">
                          ✋ {sign.handMovement}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span className="flex items-center gap-1">
                        <span>تعبير الوجه:</span>
                        <span className="text-slate-800 truncate max-w-[120px]">{sign.facialExpression}</span>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ===================================================================
              TAB 3: LIP-READING LAB
          =================================================================== */}
          {activeTab === 'lip_reading' && (
            <section className="mt-6 space-y-6">
              <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-blue-950 flex items-center gap-2">
                      <Eye className="text-blue-700" />
                      مختبر القراءة الشفوية وملاحظة مخارج النطق
                    </h2>
                    <p className="text-xs font-bold text-blue-800 mt-1.5 max-w-3xl leading-6">
                      قراءة الشفاه (Speechreading) مهارة بصرية حاسمة تمكّن الطفل الأصم من فهم 60% – 70% من الكلمات المنطوقة
                      عبر تحليل حركة عضلات الفم والأسنان وتعبيرات الوجه المرافقة.
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-3 border border-blue-200 text-center shrink-0">
                    <p className="text-2xl font-black text-blue-700">4</p>
                    <p className="text-[11px] font-bold text-slate-600">مجموعات بصرية أساسية</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {LIP_PATTERNS.map((p, i) => (
                  <article key={i} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span className="rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-black text-blue-800">
                        {p.group}
                      </span>
                      <span className="rounded-md bg-slate-900 text-white px-2 py-0.5 text-xs font-black">
                        {p.letters}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                        <p className="text-xs font-black text-slate-800 mb-1">شكل حركة الفم والشفاه:</p>
                        <p className="text-xs font-bold text-slate-600 leading-6">{p.mouthShape}</p>
                      </div>

                      <div className="rounded-xl bg-blue-50/50 p-3.5 border border-blue-100">
                        <p className="text-xs font-black text-blue-900 mb-1">المؤشر البصري المميز:</p>
                        <p className="text-xs font-bold text-blue-800 leading-6">{p.visualCue}</p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black text-slate-500 mb-2">أمثلة تطبيقية سهلة القراءة:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {p.sampleWords.map((w, wi) => (
                            <span
                              key={wi}
                              className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-black text-slate-800"
                            >
                              {w}
                            </span>
                          ))}
                        </div>
                      </div>

                      <p className="text-[11px] font-bold text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                        💡 نصيحة تدريبية: {p.tips}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ===================================================================
              TAB 4: AUDITORY LING 6 SOUNDS LAB
          =================================================================== */}
          {activeTab === 'auditory' && (
            <section className="mt-6 space-y-6">
              <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-purple-950 flex items-center gap-2">
                    <Ear className="text-purple-700" />
                    فحص أصوات لينج الستة (The Ling 6 Sound Test)
                  </h2>
                  <p className="text-xs font-bold text-purple-800 mt-1.5 max-w-3xl leading-6">
                    المعيار الذهبي الدولي اليومي لفحص أداء المعينة السمعية أو القوقعة الصناعية وتحديد ما إذا كان الطفل
                    يستقبل جميع الترددات الصوتية لكلام الإنسان من 250 هرتز حتى 8000 هرتز.
                  </p>
                </div>
                <div className="shrink-0">
                  <span className="rounded-xl bg-white border border-purple-200 px-3.5 py-2 text-xs font-black text-purple-900 inline-flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-600" />
                    مولد صوتي تفاعلي مدمج
                  </span>
                </div>
              </div>

              {/* Ling Sounds Interactive Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {LING_SOUNDS.map((s, i) => (
                  <article
                    key={i}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between hover:border-purple-300 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-purple-100 text-purple-800 px-2.5 py-0.5 text-[11px] font-black">
                          الصوت {i + 1} من 6
                        </span>
                        <span className="text-[11px] font-black text-slate-500">
                          {s.freqRange}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-black text-slate-900">{s.sound}</h3>
                          <p className="text-xs font-bold text-purple-700">التردد التقريبي: ~{s.approxHz} Hz</p>
                        </div>

                        <button
                          onClick={() => playSynthTone(s.approxHz, s.symbol)}
                          disabled={playingSound === s.symbol}
                          className={`grid h-11 w-11 place-items-center rounded-xl transition shadow-xs ${
                            playingSound === s.symbol
                              ? 'bg-purple-600 text-white animate-pulse'
                              : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200'
                          }`}
                          title="تشغيل النغمة الترددية"
                        >
                          <Volume2 size={20} />
                        </button>
                      </div>

                      <div className="mt-3.5 space-y-2">
                        <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                          <p className="text-[11px] font-bold text-slate-700 leading-5">{s.description}</p>
                        </div>
                        <div className="rounded-xl bg-purple-50/50 p-2.5 border border-purple-100">
                          <p className="text-[11px] font-bold text-purple-900 leading-5">🎯 الأهمية: {s.importance}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
                      <span className="text-slate-500">طريقة الفحص:</span>
                      <span className="text-teal-700 font-black">انطق خلف ظهر الطفل دون رؤية فمك</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* ===================================================================
              TAB 5: 12-WEEK IEP CURRICULUM PLAN
          =================================================================== */}
          {activeTab === 'plan' && (
            <section className="mt-6 space-y-6">
              <div className="rounded-2xl border border-teal-200 bg-teal-50/70 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-teal-950 flex items-center gap-2">
                    <GraduationCap className="text-teal-700" />
                    الخطة التربوية التأهيلية الفردية (12 أسبوعاً معتمداً)
                  </h2>
                  <p className="text-xs font-bold text-teal-800 mt-1.5 max-w-3xl leading-6">
                    برنامج تدريبي مرحلي مدروس ينقل الطفل تدريجياً من الاستجابة البصرية العفوية حتى الإتقان الإشاري والدمج الأكاديمي.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/assessment/deaf"
                    className="rounded-xl bg-teal-700 text-white px-4 py-2.5 text-xs font-black shadow-xs hover:bg-teal-800 transition"
                  >
                    تسكين الطالب بالتقييم
                  </Link>
                </div>
              </div>

              <div className="space-y-3">
                {IEP_WEEKS.map((w, i) => {
                  const isExpanded = expandedWeek === i;
                  return (
                    <div
                      key={i}
                      className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs transition hover:border-teal-300"
                    >
                      <button
                        onClick={() => setExpandedWeek(isExpanded ? null : i)}
                        className="w-full flex items-center justify-between p-5 text-right transition hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-4">
                          <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-800 font-black text-xs shrink-0 border border-teal-200">
                            {i + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-md bg-teal-100 text-teal-800 px-2 py-0.5 text-[10px] font-black">
                                {w.week}
                              </span>
                              <h3 className="text-base font-black text-slate-900">{w.title}</h3>
                            </div>
                            <p className="text-xs font-bold text-slate-500 mt-1 line-clamp-1">{w.goal}</p>
                          </div>
                        </div>

                        <div className="shrink-0 text-slate-400">
                          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-5 pt-0 border-t border-slate-100 bg-slate-50/50 space-y-4">
                          <div>
                            <p className="text-xs font-black text-slate-700 mb-2">الدروس والأنشطة الأسبوعية:</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {w.lessons.map((lesson, li) => (
                                <div
                                  key={li}
                                  className="flex items-start gap-2 bg-white p-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-800"
                                >
                                  <CheckCircle2 size={15} className="text-teal-600 shrink-0 mt-0.5" />
                                  <span>{lesson}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center gap-2">
                            <Sparkles size={16} className="text-emerald-700 shrink-0" />
                            <p className="text-xs font-black text-emerald-900">
                              معيار الإتقان والتقييم: <span className="font-bold">{w.mastery}</span>
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ===================================================================
              TAB 6: TEACHER & CLASSROOM INCLUSION GUIDE
          =================================================================== */}
          {activeTab === 'guide' && (
            <section className="mt-6 space-y-6">
              <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-6">
                <h2 className="text-xl font-black text-rose-950 flex items-center gap-2">
                  <Users className="text-rose-700" />
                  دليل المعلم والأسرة للدمج الصفي والمجتمعي
                </h2>
                <p className="text-xs font-bold text-rose-800 mt-1.5 max-w-3xl leading-6">
                  إرشادات عملية واستراتيجيات مثبتة للمعلمين وأولياء الأمور لتسهيل اندماج الطالب الأصم أو ضعيف السمع
                  داخل الفصل الدراسي العادي وفي المنزل.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-3">
                    <Lightbulb className="text-amber-500" size={18} />
                    داخل الفصل الدراسي
                  </h3>
                  <ul className="space-y-2.5 text-xs font-bold text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 font-black">1.</span>
                      <span>إجلاس الطالب في الصف الأول مباشرة أمام المعلم وفي المنتصف.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 font-black">2.</span>
                      <span>عدم التحدث وظهره للطالب أثناء الكتابة على السبورة لتمكينه من قراءة الشفاه.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 font-black">3.</span>
                      <span>استخدام الوسائل البصرية والبطاقات المصورة لكل مفهوم جديد.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-teal-600 font-black">4.</span>
                      <span>تعيين زميل مساند (Buddy) يساعده في متابعة صفحات الكتب والواجبات.</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-3">
                    <Heart className="text-pink-500" size={18} />
                    في البيئة المنزلية
                  </h3>
                  <ul className="space-y-2.5 text-xs font-bold text-slate-600">
                    <li className="flex items-start gap-2">
                      <span className="text-pink-600 font-black">1.</span>
                      <span>التحدث وجهاً لوجه على مستوى عين الطفل وبإضاءة كافية على الوجه.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-600 font-black">2.</span>
                      <span>تكرار الإشارات اليومية من جميع أفراد الأسرة 15 دقيقة على الأقل يومياً.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-600 font-black">3.</span>
                      <span>استخدام جدول الأنشطة البصري اليومي في غرفة المعيشة وغرفة الطفل.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-pink-600 font-black">4.</span>
                      <span>الاستجابة الفورية لمحاولات الطفل التواصلية وتشجيعه على كل إشارة صحيحة.</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-3">
                    <Shield className="text-blue-500" size={18} />
                    بطاقات التواصل السريع
                  </h3>
                  <p className="text-xs font-bold text-slate-500 mb-3">
                    بطاقات بحجم الجيب يحملها الطالب للتواصل الفوري في المواقف الطارئة:
                  </p>
                  <div className="space-y-2">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs font-black text-slate-800">
                      🧏 "أنا أصم لا أسمع، من فضلك اكتب لي هنا أو استخدم الإشارة."
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs font-black text-slate-800">
                      🆘 "أحتاج إلى مساعدة عاجلة، يرجى الاتصال برقم والدي: ..."
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs font-black text-slate-800">
                      🚻 "أين دورة المياه القريبة؟ من فضلك أشر لي باتجاهها."
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ===================================================================
              MODAL: SIGN DETAIL
          =================================================================== */}
          {selectedSign && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
              <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                <button
                  onClick={() => setSelectedSign(null)}
                  className="absolute left-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white font-black text-lg shadow-sm"
                    style={{ backgroundColor: selectedSign.categoryColor }}
                  >
                    <Hand size={22} />
                  </div>
                  <div>
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-black text-white"
                      style={{ backgroundColor: selectedSign.categoryColor }}
                    >
                      {selectedSign.categoryAr}
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-1">{selectedSign.word}</h3>
                  </div>
                </div>

                <div className="space-y-3.5 text-xs font-bold">
                  <div className="rounded-2xl bg-teal-50 border border-teal-200 p-4">
                    <p className="text-xs font-black text-teal-900 mb-1 flex items-center gap-1.5">
                      <span>✋ شكل وحركة اليدين المعتمدة:</span>
                    </p>
                    <p className="text-xs font-bold text-teal-800 leading-6">{selectedSign.handMovement}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs font-black text-slate-900 mb-1 flex items-center gap-1.5">
                      <span>😊 تعبيرات الوجه ولغة الجسد:</span>
                    </p>
                    <p className="text-xs font-bold text-slate-700 leading-6">{selectedSign.facialExpression}</p>
                  </div>

                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                    <p className="text-xs font-black text-amber-900 mb-1 flex items-center gap-1.5">
                      <span>💡 نصيحة الإتقان:</span>
                    </p>
                    <p className="text-xs font-bold text-amber-800 leading-6">{selectedSign.tip}</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setSelectedSign(null)}
                    className="rounded-xl bg-slate-900 text-white px-5 py-2.5 text-xs font-black hover:bg-slate-800 transition"
                  >
                    إغلاق البطاقة
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              MODAL: PROGRAM DETAIL
          =================================================================== */}
          {activeProgramModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
              <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                <button
                  onClick={() => setActiveProgramModal(null)}
                  className="absolute left-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
                >
                  <X size={18} />
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white font-black text-lg shadow-sm"
                    style={{ backgroundColor: activeProgramModal.color }}
                  >
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <span className="rounded-md bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-black">
                      {activeProgramModal.badge}
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-1">{activeProgramModal.title}</h3>
                  </div>
                </div>

                <p className="text-xs font-bold leading-6 text-slate-600 mb-4">
                  {activeProgramModal.summary}
                </p>

                <div className="space-y-3.5 text-xs font-bold">
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs font-black text-slate-900 mb-1.5">🎯 الهدف التأهيلي العام:</p>
                    <p className="text-xs font-bold text-slate-700 leading-6">{activeProgramModal.target}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <p className="text-xs font-black text-slate-900 mb-2">📌 المهارات والمخرجات التفصيلية:</p>
                    <ul className="space-y-1.5">
                      {activeProgramModal.keyGoals.map((g, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-700">
                          <CheckCircle2 size={14} className="text-teal-600 shrink-0 mt-0.5" />
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="rounded-xl bg-teal-50 border border-teal-200 p-3">
                      <p className="text-lg font-black text-teal-800">{activeProgramModal.lessonsCount} درس</p>
                      <p className="text-[11px] font-bold text-teal-700">تدريب تفاعلي منظم</p>
                    </div>
                    <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                      <p className="text-lg font-black text-blue-800">{activeProgramModal.durationWeeks} أسابيع</p>
                      <p className="text-[11px] font-bold text-blue-700">مدة التنفيذ المقترحة</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => setActiveProgramModal(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:bg-slate-50 transition"
                  >
                    إغلاق
                  </button>
                  <button
                    onClick={() => {
                      const tab = activeProgramModal.actionTab;
                      setActiveProgramModal(null);
                      setActiveTab(tab);
                    }}
                    className="rounded-xl text-white px-5 py-2 text-xs font-black shadow-xs hover:opacity-95 transition"
                    style={{ backgroundColor: activeProgramModal.color }}
                  >
                    الانتقال للتدريب المباشر ⬅️
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom CTA Banner */}
          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-3xl border border-teal-200 bg-gradient-to-r from-teal-900 to-cyan-950 p-6 sm:p-8 text-white shadow-lg sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-teal-400/20 ring-2 ring-teal-400/30">
                <Ear size={26} className="text-teal-300" />
              </div>
              <div>
                <p className="text-lg font-black">جاهز لبدء تقييم الصم والبكم وتسكين الطالب؟</p>
                <p className="mt-1 text-xs font-bold text-teal-200 max-w-xl leading-5">
                  أجب على أسئلة التقييم الـ 38 لتوليد خطة التأهيل الفردية المناسبة تلقائياً وتحديد مستوى السمع والتواصل.
                </p>
              </div>
            </div>
            <Link
              href="/assessment/deaf"
              className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-teal-400 px-7 py-3.5 text-sm font-black text-teal-950 shadow-md transition-all hover:bg-teal-300 hover:shadow-teal-400/30"
            >
              <span>ابدأ التقييم الشامل</span>
              <ArrowLeft size={16} />
            </Link>
          </div>

        </main>
      </div>
    </div>
  );
}
