'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, Brain, FileSearch, Hand, Shapes, ShieldCheck, 
  Sparkles, CheckCircle2, Award, ChevronDown, Trophy, 
  Stethoscope, Activity, Users, Check, Zap, Eye, Star,
  BookOpen, Calculator, Volume2, Target, Cpu, Flame, Layers,
  MoveLeft, ArrowRight, Compass, MousePointerClick, ChevronLeft,
  UserCheck, VolumeX, RotateCcw, ThumbsUp, Play, CheckCircle
} from 'lucide-react';
import BrandMark from '@/components/BrandMark';

// 7 Placement Levels Data
const placementLevels = [
  {
    id: 'general',
    title: 'المستوى العام الشامل',
    gradeText: 'تقييم كشف شامل قبل التسجيل',
    questionsCount: 25,
    duration: '15-20 دقيقة',
    skills: ['القدرات العقلية والذكاء', 'التركيز والقراءة البسيطة', 'الرياضيات والعد المحسوس', 'القدرات الفنية وتتبع الخطوط'],
    description: 'اختبار تشخيصي يقيس الجاهزية العامة للطفل ويحدد مسارات الدعم أو التأسيس المطلوبة.'
  },
  {
    id: 'g1',
    title: 'الصف الأول الابتدائي',
    gradeText: 'تأسيس القراءة والتهجي البسيط',
    questionsCount: 25,
    duration: '15 دقيقة',
    skills: ['التعرف على الأصوات والحروف', 'التهجي من القاموس المفيد', 'الأعداد حتى 20 والجمع المحسوس', 'التمييز البصري والحركي'],
    description: 'تقييم شامل لمهارات القراءة الأوليّة والعد والحركات الفونية المعتمدة على مذكرة التهجي البسيط.'
  },
  {
    id: 'g2',
    title: 'الصف الثاني الابتدائي',
    gradeText: 'تطوير التهجئة والتفكير الرياضي',
    questionsCount: 25,
    duration: '20 دقيقة',
    skills: ['قراءة الكلمات المركبة والمدود', 'الإملاء والتحليل الصوتي', 'الجمع والطرح حتى 100', 'الاستيعاب القرائي المباشر'],
    description: 'قياس قدرة الطفل على الربط بين المقاطع الصوتية وحل المسائل اللفظية البسيطة.'
  },
  {
    id: 'g3',
    title: 'الصف الثالث الابتدائي',
    gradeText: 'الطلاقة القرائية والعمليات الحسابية',
    questionsCount: 25,
    duration: '20 دقيقة',
    skills: ['الطلاقة والفهم القرائي', 'جدول الضرب والمفاهيم الأولية', 'الكتابة المستقلة والتعبير', 'التركيز وحل المشكلات'],
    description: 'فحص مهارات الاستقلال القرائي والقدرة على إجراء العمليات الحسابية الأساسية.'
  },
  {
    id: 'g4',
    title: 'الصف الرابع الابتدائي',
    gradeText: 'اختبار 6 مواد أساسية',
    questionsCount: 30,
    duration: '25-30 دقيقة',
    skills: ['اللغة العربية (5 أسئلة)', 'اللغة الإنجليزية (5 أسئلة)', 'الرياضيات (5 أسئلة)', 'العلوم والاجتماعيات والمعلومات العامة (15 سؤال)'],
    description: 'تقييم أكاديمي متكامل شامل للـ 6 مواد المعيارية للتحقق من المهارات المتقدمة.'
  },
  {
    id: 'g5',
    title: 'الصف الخامس الابتدائي',
    gradeText: 'المستوى الأكاديمي المتقدم',
    questionsCount: 30,
    duration: '30 دقيقة',
    skills: ['قواعد اللغة العربية', 'الرياضيات والكسور', 'العلوم الطبيعية', 'الإنجليزي والمعارف العامة'],
    description: 'قياس جاهزية الطالب للاستيعاب التحليلي والتفكير المنهجي.'
  },
  {
    id: 'g6',
    title: 'الصف السادس الابتدائي',
    gradeText: 'اختبار القبول والجاهزية للمتوسط',
    questionsCount: 30,
    duration: '30 دقيقة',
    skills: ['التحليل اللغوي والنحوي', 'المسائل الحسابية المركبة', 'العلوم والتفكير العلمي', 'القدرات التحليلية الكلية'],
    description: 'اختبار شامل ومتقدم لتقييم المهارات الأكاديمية قبل المرحلة المتوسطة.'
  }
];

const learningTracks = [
  { title: 'تأسيس القراءة والتهجي', icon: BookOpen, desc: 'مبني على مذكرة التهجي البسيط والقاموس المفيد' },
  { title: 'الرياضيات والتفكير المنطقي', icon: Calculator, desc: 'نماذج بصريّة ومحسوسة لحل المسائل وإتقان الأعداد' },
  { title: 'النطق والتخاطب وتعديل اللغة', icon: Volume2, desc: 'دوزنة النطق، مخارج الحروف، وبناء الثروة اللغوية' },
  { title: 'التركيز والانتباه والتأهيل السلوكي', icon: Target, desc: 'أنشطة حسية تفاعلية لزيادة مدة التركيز والتحمل' },
  { title: 'تشخيص وتأهيل صعوبات التعلم', icon: Stethoscope, desc: 'تقارير إكلينيكية متخصصة بدعم فردي مباشر' },
];

const sampleInteractiveQuestions = [
  {
    prompt: 'أكمل الكلمة بالحرف المناسب: بَــ...ــتْ',
    options: ['يْـ', 'تْـ', 'نْـ'],
    correctIndex: 0,
    audioText: 'بَيْتْ',
    explanation: 'ممتاز! مهارة التحليل الصوتي المكتسبة: التمييز بين حرف الياء والتاء وسط الكلمة.'
  },
  {
    prompt: 'ما ناتج جمع النماذج المحسوسة: 5 + 3 = ؟',
    options: ['7', '8', '9'],
    correctIndex: 1,
    audioText: 'خمسة زائد ثلاثة يساوي ثمانية',
    explanation: 'إجابة صحيحة! التفكير الحسابي المحسوس مفعّل بنجاح.'
  },
  {
    prompt: 'ما النمط الصحيح التالي: أزرق، أحمر، أزرق، ...',
    options: ['أحمر', 'أخضر', 'أصفر'],
    correctIndex: 0,
    audioText: 'أحمر',
    explanation: 'رائع! مهارة استكمال الأنماط البصرية والتركيز مرتفعة.'
  }
];

const parentStories = [
  {
    name: 'أم عبد الله (الصف الثاني الابتدائي)',
    track: 'تأسيس التهجي والقرائية',
    before: 'كان يواجه صعوبة في التمييز بين المقاطع الصوتية القصيرة والطويلة.',
    after: 'بعد 3 أسابيع من الخطة العلاجية، أصبح يقرأ الجمل البسيطة بطلاقة وثقة.',
    rating: 5,
  },
  {
    name: 'أبو سارة (الصف الرابع الابتدائي)',
    track: 'الرياضيات والتفكير المنطقي',
    before: 'كان يتوتر عند رؤية المسائل اللفظية ويواجه تشتتاً سريعاً.',
    after: 'ارتفع تركيزه واستيعابه عبر التمثيل البصري المحسوس للمسائل.',
    rating: 5,
  },
  {
    name: 'أم خالد (الصف الأول الابتدائي)',
    track: 'النطق والتخاطب',
    before: 'تأخر لغوي بصرى مع صعوبة في مخارج حروف السين والصاد.',
    after: 'تحسن ملحوظ في النطق مع زيادة حصيلته اللغوية اليومية بنسبة 70%.',
    rating: 5,
  }
];

const labs = [
  {
    title: 'معمل التأسيس القرائي والتهجئة',
    subtitle: 'مبني على مذكرة التهجي البسيط والقاموس المفيد لـ د. إسماعيل',
    image: '/learning/literacy-lab.png',
    tags: ['التحليل الصوتي', 'مخارج الحروف', 'الطلاقة القرائية'],
  },
  {
    title: 'معمل الرياضيات والعد المحسوس',
    subtitle: 'تحويل المفاهيم المجردة إلى أشكال ونماذج تفاعلية ملموسة',
    image: '/learning/math-lab.png',
    tags: ['العد البصري', 'الجمع والطرح', 'حل المسائل'],
  },
  {
    title: 'معمل النطق والتخاطب والتأهيل السلوكي',
    subtitle: 'تدريب حسي بصري وصوتي لتعديل النطق وبناء الانتباه والتركيز',
    image: '/learning/communication-lab.png',
    tags: ['دوزنة الصوت', 'تركيز وانتباه', 'خطة علاجية'],
  }
];

const faqs = [
  {
    q: 'ما المنهجيات والمسارات التي تغطيها المنصة؟',
    a: 'تغطي المنصة مسارات متعددة متكاملة: تأسيس القراءة والكتابة، التفكير الرياضي، النطق والتخاطب، زيادة التركيز والانتباه، وتأهيل صعوبات التعلم، بدعم كامل لجميع الصفوف الدراسية.'
  },
  {
    q: 'هل تظهر أي درجات أو نتائج محبطة للطفل؟',
    a: 'لا نهائياً. حرصاً على نفسية الطفل، تُحفظ جميع الإجابات والتحليلات مباشرة في لوحة تحكم د. إسماعيل عيسى، ويُوجه الطفل لألعاب وتطبيقات تفاعلية تُثبّت مهاراته بدون ضغط.'
  },
  {
    q: 'ما هو التكامل بين مسار ونظام NEXUS EDU للمدارس؟',
    a: 'منصة مسار مخصصة للتقييم الفردي والأسر بإشراف د. إسماعيل، بينما نظام NEXUS EDU يوفر للمدارس محرك Gamification تفاعلي، معلم الذكاء الاصطناعي 24/7، وتحضير الـ QR والجائزة الكبرى.'
  },
  {
    q: 'كيف تضمن المنصة متابعة د. إسماعيل عيسى للحالة؟',
    a: 'تصل نتائج الاستبيانات والإجابات التفصيلية مباشرة إلى لوحة تحكم د. إسماعيل، لتوليد التقرير التشخيصي واعتماد الخطة الفردية المناسبة لصف وعمر الطفل.'
  }
];

export default function Home() {
  const [selectedLevel, setSelectedLevel] = useState(placementLevels[0]);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const [activeStoryIdx, setActiveStoryIdx] = useState(0);

  // Interactive Quiz Demo State
  const [quizStep, setQuizStep] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  const currentQuiz = sampleInteractiveQuestions[quizStep];

  const handleOptionSelect = (idx: number) => {
    setSelectedOption(idx);
    if (idx === currentQuiz.correctIndex) {
      setQuizScore((prev) => prev + 1);
    }
  };

  const playAudio = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const nextQuizQuestion = () => {
    setSelectedOption(null);
    setQuizStep((prev) => (prev + 1) % sampleInteractiveQuestions.length);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden selection:bg-teal-600 selection:text-white" dir="rtl">
      
      {/* 1. HEADER NAVBAR */}
      <header
        className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-xs"
        style={{ animation: 'navbar-slide-down 400ms cubic-bezier(0.16,1,0.3,1) both' }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6 lg:px-8">
          <Link href="/" className="focus-ring rounded-lg shrink-0">
            <BrandMark size="sm" />
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <Link 
              href="https://nexus.masarplatform.org" 
              className="shimmer hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-gradient-to-r from-slate-950 via-cyan-950 to-teal-950 px-3.5 py-2 text-xs font-black text-white shadow-md transition-all duration-300 hover:scale-105 active:scale-95 shrink-0"
            >
              <Trophy size={14} className="text-amber-400 shrink-0" />
              <span>بوابة NEXUS للمدارس</span>
            </Link>

            <Link 
              href="/auth/login" 
              className="focus-ring rounded-xl border border-slate-300 bg-white px-3 sm:px-4 py-2 text-xs font-black text-slate-700 hover:bg-teal-50 hover:border-teal-300 hover:text-teal-800 transition-all active:scale-95 shadow-xs shrink-0"
            >
              دخول
            </Link>
          </div>
        </div>
      </header>

      <main>
        
        {/* 2. HERO SECTION — ANIMATED */}
        <section className="relative isolate overflow-hidden bg-gradient-to-b from-teal-50/90 via-slate-50 to-white pt-8 pb-16 lg:pt-14 lg:pb-24">
          
          {/* Animated Glow Orbs */}
          <div
            className="absolute top-10 right-10 -z-10 h-96 w-96 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(20,184,166,0.18) 0%, transparent 70%)',
              filter: 'blur(60px)',
              animation: 'pulse-glow 5s ease-in-out infinite alternate',
            }}
          />
          <div
            className="absolute bottom-10 left-10 -z-10 h-96 w-96 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(56,189,248,0.14) 0%, transparent 70%)',
              filter: 'blur(60px)',
              animation: 'pulse-glow 7s 2s ease-in-out infinite alternate',
            }}
          />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 items-center lg:grid-cols-[1.1fr_0.9fr]">
              
              {/* Left Column: Animated Headline */}
              <div className="space-y-5 text-right">
                
                {/* Animated Pills */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 motion-fade-up" style={{ animationDelay: '0ms' }}>
                  <div className="shimmer inline-flex items-center gap-1.5 rounded-full border border-teal-300 bg-teal-600 px-3.5 py-1 text-xs font-black text-white shadow-md">
                    <Sparkles size={14} />
                    <span>تعليمي • علاجي • خطط فردية</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-black text-teal-900 shadow-xs">
                    <CheckCircle2 size={14} className="text-teal-600" />
                    <span>إشراف د. إسماعيل عيسى</span>
                  </div>
                </div>

                {/* Gradient Headline with staggered animation */}
                <h1 className="text-3xl font-black leading-tight text-slate-900 sm:text-5xl md:text-5xl lg:text-6xl">
                  <span
                    className="block font-black mb-1 motion-fade-up"
                    style={{
                      fontSize: 'inherit',
                      background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 40%, #0284c7 100%)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      animationDelay: '80ms',
                    }}
                  >
                    مَسَار
                  </span>
                  <span className="motion-fade-up block" style={{ animationDelay: '180ms' }}>
                    اكتشف طفلك. طوّر قدراته.{' '}
                  </span>
                  <span
                    className="motion-fade-up"
                    style={{
                      background: 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24)',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      display: 'inline-block',
                      animationDelay: '280ms',
                    }}
                  >
                    غيّر مستقبله.
                  </span>
                </h1>

                <p className="max-w-2xl text-sm font-bold leading-relaxed text-slate-600 sm:text-base md:text-lg motion-fade-up" style={{ animationDelay: '380ms' }}>
                  من كشف المهارات التشخيصي المبسط إلى بناء التفوق الأكاديمي: تأسيس القراءة والكتابة، التفكير الرياضي، النطق والتخاطب، والتركيز بخطة فردية مخصصة لطفلك.
                </p>

                {/* Shimmer CTA */}
                <div className="flex flex-col sm:flex-row gap-3 pt-3 motion-fade-up" style={{ animationDelay: '480ms' }}>
                  <Link 
                    href="/auth/login" 
                    className="shimmer group focus-ring inline-flex items-center justify-center gap-3 rounded-2xl px-10 py-4 text-lg sm:text-xl font-black text-white shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 w-full sm:w-auto"
                    style={{
                      background: 'linear-gradient(135deg, #0f766e 0%, #14b8a6 50%, #0d9488 100%)',
                      boxShadow: '0 8px 32px rgba(15,118,110,0.40), 0 2px 8px rgba(15,23,42,0.15)',
                    }}
                  >
                    <span>تسجيل الدخول الآن</span>
                    <MoveLeft size={22} className="transition-transform duration-300 group-hover:-translate-x-2 shrink-0" />
                  </Link>
                </div>

                {/* Animated Trust Metrics */}
                <div className="pt-4 border-t border-slate-200/80 grid grid-cols-3 gap-3 text-right motion-fade-up" style={{ animationDelay: '560ms' }}>
                  {[
                    { value: '+5,000', label: 'طالب تم تقييمهم', color: 'text-slate-900' },
                    { value: '98%', label: 'نسبة التحسن', color: 'text-teal-600' },
                    { value: '7 صفوف', label: 'اختبارات تشخيصية', color: 'text-sky-600' },
                  ].map((stat, i) => (
                    <div
                      key={stat.label}
                      className="hover-lift rounded-2xl bg-white/90 p-3 border border-slate-200/60 shadow-xs cursor-default"
                    >
                      <p className={`text-xl sm:text-2xl font-black ${stat.color}`}>{stat.value}</p>
                      <p className="text-[11px] font-bold text-slate-500 mt-0.5">{stat.label}</p>
                    </div>
                  ))}
                </div>

              </div>

              {/* Right Column: Image with entrance + hover effects */}
              <div className="relative motion-slide-right" style={{ animationDelay: '300ms' }}>
                <div
                  className="relative rounded-3xl border border-slate-200/90 bg-white p-3 overflow-hidden group"
                  style={{ boxShadow: '0 24px 80px rgba(15,23,42,0.12), 0 4px 16px rgba(15,23,42,0.06)' }}
                >
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100">
                    <Image 
                      src="/dr-ismail-student.jpg" 
                      alt="د. إسماعيل عيسى مع طالبه في جلسة تعليم علاجي تفاعلية" 
                      fill 
                      priority
                      className="object-cover object-center transition duration-700 group-hover:scale-[1.03]" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                    {/* Floating Overlay Badge */}
                    <div
                      className="absolute bottom-4 right-4 left-4 rounded-2xl p-4 border border-white/80 flex items-center justify-between"
                      style={{
                        background: 'rgba(255,255,255,0.95)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        boxShadow: '0 8px 32px rgba(15,23,42,0.2)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-100 text-teal-800 font-bold">
                          <Activity size={20} />
                        </span>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">تفاعل حسي مباشر</p>
                          <p className="text-xs font-black text-slate-900">تفاعلي • تشخيصي • يبني الثقة</p>
                        </div>
                      </div>

                      <Link 
                        href="/auth/login"
                        className="shimmer group/btn rounded-xl px-4 py-2 text-xs font-black text-white hover:scale-105 active:scale-95 transition-all shrink-0 flex items-center gap-1.5"
                        style={{
                          background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
                          boxShadow: '0 4px 12px rgba(15,118,110,0.3)',
                        }}
                      >
                        <span>تسجيل الدخول الآن</span>
                        <ArrowLeft size={13} className="transition-transform duration-300 group-hover/btn:-translate-x-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 3. INTERACTIVE DEMO SECTION */}
        <section className="py-16 border-t border-slate-200 bg-white relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(20,184,166,0.04) 0%, transparent 60%)' }} />
          <div className="relative mx-auto max-w-5xl px-5 lg:px-8 space-y-8">
            
            <div className="flex flex-col items-center justify-center text-center gap-3.5 max-w-3xl mx-auto motion-fade-up">
              <span className="shimmer inline-flex items-center gap-2 rounded-full bg-cyan-100 border border-cyan-200 text-cyan-900 text-xs font-black px-4 py-1.5 shadow-xs">
                <MousePointerClick size={16} className="text-cyan-700" />
                <span>تجربة تفاعلية حية</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-snug">جرب عينة من أسئلة التقييم التفاعلية</h2>
              <p className="text-slate-600 font-bold text-sm max-w-xl mx-auto">
                اضغط على الخيارات المتاحة واستمع للنطق الصوتي لتجربة بيئة الطفل التفاعلية
              </p>
            </div>

            {/* Interactive Demo Quiz Box */}
            <div className="motion-scale-in rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 space-y-6 max-w-3xl mx-auto" style={{ boxShadow: '0 20px 60px rgba(15,23,42,0.10), 0 4px 16px rgba(15,23,42,0.06)', animationDelay: '150ms' }}>
              
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-black text-white">
                    السؤال {quizStep + 1} من {sampleInteractiveQuestions.length}
                  </span>
                  <span className="text-xs font-black text-slate-500">طريقة التقييم التفاعلي</span>
                </div>

                <button
                  onClick={() => playAudio(currentQuiz.audioText)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-black transition cursor-pointer ${
                    isPlayingAudio ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse' : 'bg-white border-slate-200 text-teal-800 hover:bg-teal-50'
                  }`}
                >
                  <Volume2 size={16} />
                  <span>{isPlayingAudio ? 'جاري التشغيل...' : '🔊 استمع للكلمة'}</span>
                </button>
              </div>

              <div className="space-y-4 text-center py-4">
                <h3 className="text-2xl font-black text-slate-900">{currentQuiz.prompt}</h3>
                
                {/* Options */}
                <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-2">
                  {currentQuiz.options.map((opt, idx) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === currentQuiz.correctIndex;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleOptionSelect(idx)}
                        className={`rounded-2xl border-2 py-4 text-lg font-black transition-all duration-300 cursor-pointer ${
                          isSelected
                            ? isCorrect
                              ? 'bg-emerald-500 text-white border-emerald-600 scale-105 shadow-md'
                              : 'bg-rose-500 text-white border-rose-600'
                            : 'bg-white border-slate-200 text-slate-800 hover:border-teal-400 hover:bg-teal-50'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation Feedback */}
                {selectedOption !== null && (
                  <div className={`mt-4 rounded-2xl p-4 text-xs font-black leading-relaxed transition-all duration-300 ${
                    selectedOption === currentQuiz.correctIndex 
                      ? 'bg-emerald-100 text-emerald-950 border border-emerald-300' 
                      : 'bg-rose-100 text-rose-950 border border-rose-300'
                  }`}>
                    {selectedOption === currentQuiz.correctIndex ? '✓ ' : '✗ '}
                    {currentQuiz.explanation}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <span className="text-xs font-bold text-slate-500">
                  نقاط التجربة: <span className="font-black text-teal-700">{quizScore}</span> إجابات صحيحة
                </span>

                <button
                  onClick={nextQuizQuestion}
                  className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-2 text-xs font-black text-white hover:bg-teal-700 transition cursor-pointer"
                >
                  <span>السؤال التالي</span>
                  <MoveLeft size={16} />
                </button>
              </div>

            </div>

          </div>
        </section>

        {/* 4. NEXUS ENTRY BRIDGE SECTION */}
        <section className="py-20 border-t border-slate-200 bg-gradient-to-b from-slate-50 via-teal-50/50 to-white relative overflow-hidden">
          
          <div className="mx-auto max-w-7xl px-5 lg:px-8 space-y-12">
            
            {/* Section Header */}
            <div className="flex flex-col items-center justify-center text-center gap-3.5 max-w-3xl mx-auto motion-fade-up">
              <span className="shimmer inline-flex items-center gap-2 rounded-full border border-teal-300 bg-teal-100 px-4 py-1.5 text-xs font-black text-teal-900 shadow-xs">
                <Trophy size={16} className="text-teal-700" />
                <span>المنظومة المزدوجة المتكاملة</span>
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">
                مسار للتأهيل الفردي × نكسس للمدارس والتنافس
              </h2>
              <p className="text-slate-600 font-bold text-sm sm:text-base leading-relaxed">
                تكامل ذكي على نفس الدومين يجمع بين التقييم التشخيصي الخاص بالأسر، وبيئة المدارس التنافسية المتقدمة.
              </p>
            </div>

            {/* ANIMATED ARROWS BRIDGE CONNECTOR */}
            <div className="relative py-2 text-center motion-scale-in" style={{ animationDelay: '200ms' }}>
              <div className="inline-flex items-center justify-center gap-3 rounded-full border border-teal-200 bg-white px-6 py-2.5 shadow-md">
                <span className="text-xs font-black text-teal-800 flex items-center gap-1">
                  <UserCheck size={16} className="text-teal-600" />
                  <span>منصة مسار (الأسر)</span>
                </span>

                <div className="flex items-center gap-1 text-cyan-600 px-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-500 animate-ping" />
                  <MoveLeft size={20} className="animate-pulse text-cyan-600" />
                  <MoveLeft size={20} className="animate-pulse text-teal-600" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-teal-500 animate-ping" />
                </div>

                <span className="text-xs font-black text-cyan-900 flex items-center gap-1">
                  <Trophy size={16} className="text-amber-500" />
                  <span>بوابة نكسس (المدارس)</span>
                </span>
              </div>
            </div>

            {/* Split System Cards */}
            <div className="grid lg:grid-cols-2 gap-8 items-stretch">
              
              {/* Masar Card */}
              <div className="hover-lift rounded-3xl border border-teal-200/80 bg-white p-6 sm:p-8 space-y-6 relative flex flex-col justify-between motion-fade-up" style={{ animationDelay: '150ms', boxShadow: '0 8px 32px rgba(15,118,110,0.08)' }}>
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-100 text-teal-800 font-black text-base border border-teal-200">
                        1
                      </span>
                      <div>
                        <h3 className="text-xl font-black text-slate-900">منصة مسار (Masar Platform)</h3>
                        <p className="text-xs font-bold text-slate-500">للأسر والأطفال والتقييم الفردي</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-800 border border-teal-200">
                      B2C الأسر
                    </span>
                  </div>

                  <ul className="space-y-3.5 text-xs sm:text-sm font-bold text-slate-700">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 size={18} className="text-teal-600 shrink-0" />
                      <span>تقييم تشخيصي استبياني واختباري محكم 100%.</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 size={18} className="text-teal-600 shrink-0" />
                      <span>متابعة إكلينيكية مباشرة تحت إشراف د. إسماعيل عيسى.</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle2 size={18} className="text-teal-600 shrink-0" />
                      <span>ألعاب وأنشطة حسية موجهة لتثبيت المهارات للطفل.</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Link
                    href="/auth/login"
                    className="group/m inline-flex items-center justify-between w-full px-6 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs sm:text-sm transition shadow-md"
                  >
                    <span>تسجيل الدخول إلى مسار</span>
                    <MoveLeft size={18} className="transition-transform duration-300 group-hover/m:-translate-x-2" />
                  </Link>
                </div>
              </div>

              {/* HIGH-CONCEPT NEXUS ENTRY CARD WITH ANIMATED ARROWS & MOTION */}
              <div className="group rounded-3xl border-2 border-cyan-300/80 bg-gradient-to-br from-white via-cyan-50/70 to-teal-50/80 p-6 sm:p-8 space-y-6 shadow-2xl relative flex flex-col justify-between hover:border-cyan-500 transition-all duration-300 hover:shadow-cyan-500/10">
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-600 text-white font-black text-base shadow-md">
                        2
                      </span>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                          <span>نظام نكسس (NEXUS EDU)</span>
                          <Sparkles size={16} className="text-amber-500 animate-pulse" />
                        </h3>
                        <p className="text-xs font-bold text-slate-500">للمدارس والمسابقات والـ AI</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-900 border border-cyan-300">
                      B2B المدارس
                    </span>
                  </div>

                  <ul className="space-y-3.5 text-xs sm:text-sm font-bold text-slate-700">
                    <li className="flex items-center gap-2.5">
                      <Trophy size={18} className="text-amber-600 shrink-0 animate-bounce" />
                      <span>منافسات جائزة المليون ريال السنوية وقوائم المتصدرين.</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Cpu size={18} className="text-cyan-700 shrink-0" />
                      <span>معلم الذكاء الاصطناعي (AI Tutor) التفاعلي 24/7.</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Zap size={18} className="text-teal-700 shrink-0" />
                      <span>تحضير الـ QR Code التلقائي ولوحات تنقيب المدارس.</span>
                    </li>
                  </ul>
                </div>

                {/* Powerful Motion Action Button with Arrows */}
                <div className="pt-4 border-t border-slate-200/80">
                  <Link
                    href="https://nexus.masarplatform.org"
                    className="relative overflow-hidden inline-flex items-center justify-between w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-slate-950 via-cyan-950 to-teal-950 hover:from-slate-900 hover:to-cyan-900 text-white font-black text-xs sm:text-sm transition-all duration-300 shadow-xl group-hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-2.5 z-10">
                      <Trophy size={18} className="text-amber-400" />
                      <span>دخول بوابة نكسس للمدارس الآن (NEXUS)</span>
                    </div>

                    <div className="flex items-center gap-1 z-10 text-amber-400">
                      <MoveLeft size={20} className="transition-transform duration-300 group-hover:-translate-x-2" />
                    </div>
                  </Link>
                </div>
              </div>

            </div>

            {/* Nexus Mockup Image Section (Light Frame with Real Official Image) */}
            <div className="relative rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden group">
              <div className="relative h-[360px] sm:h-[480px] w-full overflow-hidden bg-slate-900">
                <Image 
                  src="/brand/nexus-school-hero.webp" 
                  alt="نظام نكسس للمدارس والمسابقات" 
                  fill 
                  className="object-cover object-center group-hover:scale-102 transition duration-700" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                
                <div className="absolute bottom-6 right-6 left-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xl font-black text-white">بوابة نكسس التعليمية للمدارس والمسابقات</h4>
                    <p className="text-xs font-bold text-slate-300 mt-1">منظومة متكاملة لجميع أدوار المدرسة: طالب، معلم، ولي أمر، مدير، وموجه</p>
                  </div>
                  <Link
                    href="https://nexus.masarplatform.org"
                    className="group/portal px-6 py-3.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs transition hover:bg-amber-300 shrink-0 shadow-md flex items-center gap-2"
                  >
                    <span>الانتقال للبوابة 🚀</span>
                    <MoveLeft size={16} className="transition-transform duration-300 group-hover/portal:-translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* 5. VISUAL LEARNING LABS SHOWCASE */}
        <section className="py-20 border-t border-slate-200 bg-slate-50 relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-5 lg:px-8 space-y-12">
            
            <div className="flex flex-col items-center justify-center text-center gap-3.5 max-w-3xl mx-auto motion-fade-up">
              <span className="shimmer inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-black shadow-xs">
                <span>بيئة التأهيل البصري والحسي</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-snug">
                معامل تعلم وتدريب مصممة خصيصاً للطفل
              </h2>
              <p className="text-slate-600 font-bold text-sm sm:text-base">
                دمج التقنيات البصرية والحسية لتثبيت المفاهيم وبناء المهارات الأساسية
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {labs.map((lab, labIdx) => (
                <div 
                  key={lab.title} 
                  className="group rounded-3xl border border-slate-200/80 overflow-hidden flex flex-col bg-white motion-fade-up"
                  style={{
                    animationDelay: `${labIdx * 120}ms`,
                    boxShadow: '0 4px 20px rgba(15,23,42,0.08)',
                    transition: 'transform 300ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 300ms ease',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-8px)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 60px rgba(15,23,42,0.14)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(15,23,42,0.08)'; }}
                >
                  <div className="relative h-60 w-full overflow-hidden bg-slate-100">
                    <Image 
                      src={lab.image} 
                      alt={lab.title} 
                      fill 
                      className="object-cover group-hover:scale-105 transition duration-600" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                    {/* Shimmer overlay on hover */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      style={{ background: 'linear-gradient(135deg, rgba(20,184,166,0.12), transparent 50%)' }}
                    />
                  </div>
                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 leading-snug">{lab.title}</h3>
                      <p className="mt-2 text-xs font-bold text-slate-600 leading-relaxed">{lab.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                      {lab.tags.map((tag) => (
                        <span key={tag} className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-black">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* 6. SEVEN PLACEMENT LEVELS INTERACTIVE EXPLORER */}
        <section className="py-20 border-t border-slate-200 bg-white relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-5 lg:px-8 space-y-12">
            
            <div className="flex flex-col items-center justify-center text-center gap-3.5 max-w-3xl mx-auto motion-fade-up">
              <span className="shimmer inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black shadow-xs">
                <span>اختبارات تحديد المستوى الـ 7</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-snug">
                اختر المستوى الدراسي لمعاينة تفاصيل الاختبار
              </h2>
              <p className="text-slate-600 font-bold text-sm sm:text-base">
                اختبارات قبول وقياس دقيقة مصممة لتحديد جاهزية الطفل الأكاديمية لكل صف
              </p>
            </div>

            {/* Level Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none justify-start lg:justify-center motion-fade-up" style={{ animationDelay: '150ms' }}>
              {placementLevels.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition-all duration-200 cursor-pointer ${
                    selectedLevel.id === lvl.id
                      ? 'text-white scale-105'
                      : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-800'
                  }`}
                  style={selectedLevel.id === lvl.id ? {
                    background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
                    boxShadow: '0 6px 20px rgba(15,118,110,0.35)',
                  } : {}}
                >
                  {lvl.title}
                </button>
              ))}
            </div>

            {/* Selected Level Detail Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 sm:p-10 grid lg:grid-cols-12 gap-8 items-center shadow-xl">
              
              <div className="lg:col-span-7 space-y-6 text-right">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-100 border border-teal-200 text-teal-900 text-xs font-black">
                  <span>{selectedLevel.gradeText}</span>
                </div>
                <h3 className="text-3xl font-black text-slate-900">{selectedLevel.title}</h3>
                <p className="text-slate-600 font-bold text-sm leading-relaxed">{selectedLevel.description}</p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <p className="text-xs font-bold text-slate-500">عدد الأسئلة</p>
                    <p className="text-2xl font-black text-teal-700 mt-1">{selectedLevel.questionsCount} سؤالاً</p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                    <p className="text-xs font-bold text-slate-500">المدة الموصى بها</p>
                    <p className="text-2xl font-black text-emerald-700 mt-1">{selectedLevel.duration}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-wider">المهارات المشمولة بالاختبار:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedLevel.skills.map((skill) => (
                      <div key={skill} className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <CheckCircle2 size={16} className="text-teal-600 shrink-0" />
                        <span>{skill}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <Link 
                    href="/auth/register" 
                    className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-teal-600 text-white font-black text-sm shadow-md hover:bg-teal-700 transition"
                  >
                    <span>البدء في اختبار {selectedLevel.title}</span>
                    <ArrowLeft size={16} />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-right shadow-sm">
                <h4 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Award className="text-teal-600" size={20} />
                  <span>طريقة التقييم والتقرير</span>
                </h4>
                <ul className="space-y-3.5 text-xs font-bold text-slate-600 leading-relaxed">
                  <li className="flex items-start gap-2.5">
                    <span className="text-teal-600 font-black">1.</span>
                    <span>تظهر الأسئلة بشكل تفاعلي مدعوم بالصور والأصوات للطفل.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-teal-600 font-black">2.</span>
                    <span>تُحفظ كل إجابة يختارها الطفل في سجل الطالب الخاص به.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-teal-600 font-black">3.</span>
                    <span>يتم إصدار تقرير تحليلي يحدد مستوى التحكم والصعوبات.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="text-teal-600 font-black">4.</span>
                    <span>تصل النتائج تلقائياً للوحة تحكم د. إسماعيل لمتابعتها.</span>
                  </li>
                </ul>
              </div>

            </div>

          </div>
        </section>

        {/* 7. PARENT TESTIMONIAL STORIES */}
        <section className="py-20 border-t border-slate-200 bg-slate-50 relative overflow-hidden">
          <div className="mx-auto max-w-5xl px-5 lg:px-8 space-y-10">
            
            <div className="flex flex-col items-center justify-center text-center gap-3.5 max-w-3xl mx-auto motion-fade-up">
              <span className="shimmer inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-black shadow-xs">
                <span>تجارب وقصص نجاح</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-snug">قصص تحول واقعية للأطفال والطلاب</h2>
            </div>

            {/* Testimonials Grid */}
            <div className="grid md:grid-cols-3 gap-4">
              {parentStories.map((story, idx) => {
                const isActive = activeStoryIdx === idx;
                return (
                  <div
                    key={story.name}
                    onClick={() => setActiveStoryIdx(idx)}
                    className="rounded-3xl border p-6 cursor-pointer flex flex-col justify-between space-y-4 motion-fade-up"
                    style={{
                      animationDelay: `${idx * 100}ms`,
                      transition: 'all 280ms cubic-bezier(0.34,1.56,0.64,1)',
                      transform: isActive ? 'scale(1.03)' : 'scale(1)',
                      background: isActive ? '#ffffff' : 'rgba(255,255,255,0.7)',
                      borderColor: isActive ? '#14b8a6' : '#e2e8f0',
                      boxShadow: isActive
                        ? '0 12px 40px rgba(20,184,166,0.20), 0 0 0 2px rgba(20,184,166,0.15)'
                        : '0 2px 8px rgba(15,23,42,0.06)',
                    }}
                  >
                    <div className="space-y-3 text-right">
                      <div className="flex items-center justify-between">
                        <div className="flex gap-1 text-amber-400">
                          {Array.from({ length: story.rating }).map((_, i) => (
                            <Star key={i} size={14} fill="currentColor" />
                          ))}
                        </div>
                        <span className="text-[10px] font-black text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          {story.track}
                        </span>
                      </div>

                      <h4 className="font-black text-slate-900 text-sm">{story.name}</h4>
                      
                      <div className="space-y-2 text-xs font-bold leading-relaxed">
                        <p className="text-slate-400 line-through">قبل: {story.before}</p>
                        <p className="text-teal-900 font-black">بعد: {story.after}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </section>

        {/* 8. FAQS ACCORDION SECTION */}
        <section className="py-20 border-t border-slate-200 bg-white relative overflow-hidden">
          <div className="mx-auto max-w-4xl px-5 lg:px-8 space-y-10">
            
            <div className="flex flex-col items-center justify-center text-center gap-3.5 max-w-3xl mx-auto motion-fade-up">
              <span className="shimmer inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-black shadow-xs">
                <span>إجابات واستفسارات</span>
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 leading-snug">الأسئلة الشائعة حول المنصة</h2>
            </div>

            <div className="space-y-3 motion-fade-up" style={{ animationDelay: '150ms' }}>
              {faqs.map((faq, idx) => (
                <div 
                  key={idx} 
                  className="rounded-2xl overflow-hidden border transition-all duration-200"
                  style={{
                    borderColor: activeFaq === idx ? '#14b8a6' : '#e2e8f0',
                    background: activeFaq === idx ? 'rgba(20,184,166,0.03)' : '#f8fafc',
                    boxShadow: activeFaq === idx ? '0 4px 16px rgba(20,184,166,0.12)' : '0 1px 4px rgba(15,23,42,0.04)',
                  }}
                >
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full p-5 text-right font-black text-sm text-slate-900 flex items-center justify-between gap-4 cursor-pointer hover:text-teal-800 transition-colors duration-150"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown 
                      size={18} 
                      className={`shrink-0 transition-transform duration-300 ${activeFaq === idx ? 'rotate-180 text-teal-600' : 'text-slate-400'}`} 
                    />
                  </button>
                  <div
                    className="grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{ gridTemplateRows: activeFaq === idx ? '1fr' : '0fr', opacity: activeFaq === idx ? 1 : 0 }}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="px-5 pb-5 text-xs sm:text-sm font-bold text-slate-600 leading-relaxed border-t border-slate-200/60">
                        {faq.a}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* 9. FINAL CTA SECTION */}
        <section className="py-24 border-t border-slate-200 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c4a44 0%, #0f766e 40%, #0284c7 100%)' }}>
          {/* Animated orbs */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-0 right-0 h-80 w-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.25) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'pulse-glow 5s ease-in-out infinite alternate' }} />
            <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.2) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'pulse-glow 7s 2s ease-in-out infinite alternate' }} />
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
          </div>

          <div className="relative mx-auto max-w-5xl px-5 text-center space-y-6">
            <div className="motion-fade-up">
              <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight" style={{ textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
                جاهز للبدء في تقييم وتأسيس طفلك؟
              </h2>
              <p className="mt-4 text-teal-100/90 font-bold text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
                سجل الآن وابدأ اختبار تحديد المستوى للحصول على تقرير تشخيصي فوري وخطة علاجية مخصصة.
              </p>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 motion-fade-up" style={{ animationDelay: '200ms' }}>
              <Link 
                href="/auth/login" 
                className="shimmer group w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base shadow-xl active:scale-95 flex items-center justify-center gap-2 hover:scale-105 transition-all duration-300"
                style={{ background: '#ffffff', color: '#0c4a44', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}
              >
                <span>تسجيل الدخول الآن</span>
                <ArrowLeft size={18} className="transition-transform duration-300 group-hover:-translate-x-1" />
              </Link>
              <Link 
                href="/auth/login" 
                className="w-full sm:w-auto px-8 py-4 rounded-2xl border font-black text-base text-white backdrop-blur transition-all duration-300 active:scale-95 hover:bg-white/20"
                style={{ borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)' }}
              >
                تسجيل الدخول للحساب الحالي
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* SEO-RICH FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-50 py-12 text-xs font-bold text-slate-600">
        <div className="mx-auto max-w-7xl px-5 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-right">
            {/* Col 1: Platform info */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <BrandMark size="sm" />
                <span className="font-black text-slate-900 text-sm">منصة مَسَار التعليمية</span>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                بإشراف د. إسماعيل عيسى — منصة رائدة متخصصة في تشخيص وتطوير قدرات الأطفال، علاج صعوبات التعلم، وبناء الخطط التربوية الفردية (IEP).
              </p>
            </div>

            {/* Col 2: Educational Programs (Internal Links) */}
            <div className="space-y-2.5">
              <h4 className="font-black text-slate-900 text-xs text-teal-800">برامج صعوبات التعلم والتأسيس</h4>
              <ul className="space-y-2 text-[11px]">
                <li>
                  <Link href="/programs/reading" className="hover:text-teal-700 transition">
                    برنامج علاج صعوبات القراءة وتأسيس اللغة
                  </Link>
                </li>
                <li>
                  <Link href="/programs/math" className="hover:text-teal-700 transition">
                    برنامج علاج صعوبات الحساب والرياضيات
                  </Link>
                </li>
                <li>
                  <Link href="/programs/learning-difficulties" className="hover:text-teal-700 transition">
                    برنامج تشخيص وتأهيل صعوبات التعلم
                  </Link>
                </li>
                <li>
                  <Link href="/programs/curricula" className="hover:text-teal-700 transition">
                    المناهج التعليمية والأنشطة التفاعلية
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Diagnostics & Resources */}
            <div className="space-y-2.5">
              <h4 className="font-black text-slate-900 text-xs text-teal-800">التشخيص والمصادر</h4>
              <ul className="space-y-2 text-[11px]">
                <li>
                  <Link href="/assessment" className="hover:text-teal-700 transition">
                    اختبار تقييم وتشخيص مستوى الطفل
                  </Link>
                </li>
                <li>
                  <Link href="/parent-guide" className="hover:text-teal-700 transition">
                    دليل أولياء الأمور للتعامل مع صعوبات التعلم
                  </Link>
                </li>
                <li>
                  <Link href="/resources" className="hover:text-teal-700 transition">
                    المكتبة والمصادر التعليمية
                  </Link>
                </li>
                <li>
                  <Link href="/waitlist" className="hover:text-teal-700 transition">
                    التسجيل في قائمة الانتظار المسبقة
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Links & Privacy */}
            <div className="space-y-2.5">
              <h4 className="font-black text-slate-900 text-xs text-teal-800">روابط المنصة</h4>
              <ul className="space-y-2 text-[11px]">
                <li>
                  <Link href="/auth/login" className="hover:text-teal-700 transition">
                    تسجيل الدخول (Face ID & Password)
                  </Link>
                </li>
                <li>
                  <Link href="/auth/register" className="hover:text-teal-700 transition">
                    إنشاء حساب جديد
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-teal-700 transition">
                    سياسة الخصوصية والأمان
                  </Link>
                </li>
                <li>
                  <a href="/sitemap.xml" className="hover:text-teal-700 transition" target="_blank" rel="noopener">
                    خريطة الموقع (Sitemap XML)
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
            <p>جميع الحقوق محفوظة © {new Date().getFullYear()} — منصة مَسَار بإشراف د. إسماعيل عيسى</p>
            <p className="text-slate-400">مرخصة ومعتمدة للتدريب والتشخيص التربوي</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
