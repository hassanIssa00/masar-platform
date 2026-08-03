"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, Brain, FileSearch, Hand, Shapes, ShieldCheck, 
  Sparkles, CheckCircle2, Award, ChevronDown, Trophy, 
  Stethoscope, Activity, Users, Check, Zap, Eye, Star,
  BookOpen, Calculator, Volume2, Target, Cpu, Flame
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden selection:bg-teal-600 selection:text-white" dir="rtl">
      
      {/* 1. HEADER NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 lg:px-8">
          <Link href="/" className="focus-ring rounded-lg">
            <BrandMark size="md" />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link 
              href="https://nexus.masar-platform.org" 
              className="focus-ring rounded-xl border border-cyan-400/40 bg-gradient-to-r from-slate-950 via-cyan-950 to-teal-950 px-4 py-2.5 text-xs sm:text-sm font-black text-white shadow-md hover:from-slate-900 hover:to-cyan-900 transition active:scale-95 flex items-center gap-2"
            >
              <Trophy size={16} className="text-amber-400 animate-bounce" />
              <span>دخول بوابة نكسس للمدارس (NEXUS)</span>
            </Link>

            <Link 
              href="/auth/login" 
              className="focus-ring rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-black text-slate-700 hover:bg-slate-100 transition active:scale-95 shadow-2xs"
            >
              تسجيل الدخول
            </Link>

            <Link 
              href="/auth/register" 
              className="focus-ring rounded-xl bg-teal-600 px-5 py-2.5 text-xs sm:text-sm font-black text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition active:scale-95 flex items-center gap-1.5"
            >
              <span>ابدأ التقييم</span>
              <ArrowLeft size={15} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        
        {/* 2. HERO SECTION WITH IMPACTFUL CATCHING SLOGAN & HIGH-END MOCKUP */}
        <section className="relative isolate overflow-hidden bg-gradient-to-b from-teal-50/90 via-slate-50 to-white pt-12 pb-20 lg:pt-20 lg:pb-32">
          
          {/* Background Glows */}
          <div className="absolute top-10 right-10 -z-10 h-96 w-96 rounded-full bg-teal-200/40 blur-[140px] pointer-events-none" />
          <div className="absolute bottom-10 left-10 -z-10 h-96 w-96 rounded-full bg-cyan-200/40 blur-[140px] pointer-events-none" />

          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-12 items-center lg:grid-cols-[1.1fr_0.9fr]">
              
              {/* Left Column: Hero Text & Slogan */}
              <div className="space-y-6 text-right">
                
                {/* Header Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-teal-300 bg-white px-4 py-1.5 text-xs sm:text-sm font-black text-teal-900 shadow-2xs">
                    <Sparkles size={16} className="text-teal-600 animate-pulse" />
                    <span>إشراف وتأسيس د. إسماعيل عيسى</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300 bg-cyan-50 px-3.5 py-1.5 text-xs font-black text-cyan-900">
                    <CheckCircle2 size={14} className="text-cyan-600" />
                    <span>مسارات تعليمية وتأهيلية متكاملة</span>
                  </div>
                </div>

                {/* Powerful Slogan */}
                <h1 className="text-4xl font-black leading-[1.15] text-slate-900 sm:text-5xl md:text-6xl lg:text-6xl tracking-tight">
                  المنصة الشاملة للتقييم،
                  <br />
                  <span className="bg-gradient-to-r from-teal-700 via-emerald-600 to-cyan-700 bg-clip-text text-transparent">
                    التأهيل، والتعليم التفاعلي.
                  </span>
                </h1>

                <p className="max-w-2xl text-base font-bold leading-relaxed text-slate-600 sm:text-lg md:text-xl">
                  من كشف المهارات التشخيصي المبسط إلى بناء التفوق الأكاديمي: تأسيس القراءة والكتابة، التفكير الرياضي، النطق والتخاطب، والتركيز بخطة فردية مخصصة.
                </p>

                {/* Multi-Tracks Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                  {learningTracks.map(({ title, icon: Icon, desc }) => (
                    <div key={title} className="rounded-2xl border border-teal-100 bg-white p-3.5 shadow-2xs flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 font-bold mt-0.5">
                        <Icon size={18} />
                      </span>
                      <div>
                        <h4 className="font-black text-slate-900 text-xs sm:text-sm">{title}</h4>
                        <p className="text-[11px] font-bold text-slate-500 mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hero Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3.5 pt-4">
                  <Link 
                    href="/auth/register" 
                    className="focus-ring inline-flex min-h-14 items-center justify-center gap-2.5 rounded-2xl bg-teal-600 px-8 py-4 text-base font-black text-white shadow-xl shadow-teal-600/25 hover:bg-teal-700 transition active:scale-95"
                  >
                    <span>ابدأ تقييم تحديد المستوى الآن</span>
                    <ArrowLeft size={18} />
                  </Link>

                  <Link 
                    href="https://nexus.masar-platform.org" 
                    className="focus-ring inline-flex min-h-14 items-center justify-center gap-2.5 rounded-2xl border border-cyan-300 bg-gradient-to-r from-slate-950 via-cyan-950 to-teal-950 px-7 py-4 text-base font-black text-white shadow-lg shadow-slate-950/20 hover:from-slate-900 hover:to-cyan-900 transition active:scale-95"
                  >
                    <Trophy size={18} className="text-amber-400 animate-bounce" />
                    <span>بوابة نكسس للمدارس (NEXUS)</span>
                  </Link>
                </div>

                {/* Trust Metrics Bar */}
                <div className="pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-4 text-right">
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-slate-900">+5,000</p>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">طالب تم تقييمهم</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-teal-600">98%</p>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">نسبة التحسن الأكاديمي</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-cyan-600">7 صفوف</p>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">اختبارات تشخيصية</p>
                  </div>
                </div>

              </div>

              {/* Right Column: Custom High-End Platform Dashboard Mockup */}
              <div className="relative">
                <div className="relative rounded-3xl border border-slate-200/90 bg-white p-3 shadow-2xl overflow-hidden group">
                  <div className="relative h-[420px] sm:h-[480px] w-full rounded-2xl overflow-hidden bg-slate-900">
                    <Image 
                      src="/brand/masar_hero_dashboard.jpg" 
                      alt="لوحة تحكم منصة مسار التعليمية والتأهيلية" 
                      fill 
                      priority
                      className="object-cover group-hover:scale-103 transition duration-700" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

                    {/* Floating Overlay Badge 1 */}
                    <div className="absolute top-4 right-4 rounded-2xl bg-white/95 backdrop-blur-md p-3.5 border border-slate-200 shadow-xl flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-100 text-teal-800 font-bold">
                        <Activity size={20} />
                      </span>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">سجل التقييم التشخيصي</p>
                        <p className="text-xs font-black text-slate-900">مكتمل ومحفوظ لدكتور إسماعيل ✓</p>
                      </div>
                    </div>

                    {/* Floating Overlay Badge 2 */}
                    <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-slate-950/90 backdrop-blur-md p-4 border border-slate-800 text-white flex items-center justify-between">
                      <div>
                        <p className="text-xs font-black text-amber-400 flex items-center gap-1">
                          <Sparkles size={14} />
                          <span>الخطة الفردية المخصصة</span>
                        </p>
                        <p className="text-[11px] font-bold text-slate-300 mt-0.5">تحديث تلقائي بناءً على نتائج الاستبيان والاختبار</p>
                      </div>

                      <Link 
                        href="/auth/register"
                        className="rounded-xl bg-teal-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-teal-400 transition"
                      >
                        معاينة التقييم
                      </Link>
                    </div>

                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 3. NEXUS EDU ENTERPRISE CONCEPT BRIDGING SECTION */}
        <section className="py-20 border-t border-slate-200 bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950 text-white relative overflow-hidden">
          
          {/* Subtle Background Glow */}
          <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none" />

          <div className="mx-auto max-w-7xl px-5 lg:px-8 space-y-12">
            
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-black text-amber-300">
                <Trophy size={16} />
                <span>المنظومة المزدوجة المتكاملة</span>
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
                مسار للتأهيل الفردي × نكسس للمدارس والتنافس
              </h2>
              <p className="text-slate-300 font-bold text-sm sm:text-base leading-relaxed">
                تكامل ذكي على نفس الدومين يجمع بين التقييم التشخيصي الخاص بالأسر، وبيئة المدارس التنافسية المتقدمة.
              </p>
            </div>

            {/* Split System Cards */}
            <div className="grid lg:grid-cols-2 gap-8 items-center">
              
              {/* Masar Card */}
              <div className="rounded-3xl border border-teal-500/30 bg-slate-900/80 p-6 sm:p-8 space-y-5 backdrop-blur">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 font-black">
                      1
                    </span>
                    <div>
                      <h3 className="text-xl font-black text-white">منصة مسار (Masar Platform)</h3>
                      <p className="text-xs font-bold text-slate-400">للأسر والأطفال والتقييم الفردي</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-black text-teal-300 border border-teal-500/20">
                    B2C الأسر
                  </span>
                </div>

                <ul className="space-y-3 text-xs sm:text-sm font-bold text-slate-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
                    <span>تقييم تشخيصي استبياني واختباري محكم 100%.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
                    <span>متابعة إكلينيكية مباشرة تحت إشراف د. إسماعيل عيسى.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
                    <span>ألعاب وأنشطة حسية موجهة لتثبيت المهارات للطفل.</span>
                  </li>
                </ul>

                <div className="pt-3">
                  <Link
                    href="/auth/register"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs sm:text-sm transition"
                  >
                    <span>ابدأ تقييم مسار للأطفال</span>
                    <ArrowLeft size={14} />
                  </Link>
                </div>
              </div>

              {/* Nexus Card */}
              <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-cyan-950 to-slate-900 p-6 sm:p-8 space-y-5 backdrop-blur relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 font-black">
                      2
                    </span>
                    <div>
                      <h3 className="text-xl font-black text-white">نظام نكسس (NEXUS EDU)</h3>
                      <p className="text-xs font-bold text-slate-400">للمدارس والمسابقات والـ AI</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-300 border border-amber-500/20">
                    B2B المدارس
                  </span>
                </div>

                <ul className="space-y-3 text-xs sm:text-sm font-bold text-slate-300">
                  <li className="flex items-center gap-2">
                    <Trophy size={16} className="text-amber-400 shrink-0" />
                    <span>منافسات جائزة المليون ريال السنوية وقوائم المتصدرين.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Cpu size={16} className="text-cyan-400 shrink-0" />
                    <span>معلم الذكاء الاصطناعي (AI Tutor) التفاعلي 24/7.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Zap size={16} className="text-teal-400 shrink-0" />
                    <span>تحضير الـ QR Code التلقائي ولوحات تنقيب المدارس.</span>
                  </li>
                </ul>

                <div className="pt-3">
                  <Link
                    href="https://nexus.masar-platform.org"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg"
                  >
                    <Trophy size={16} />
                    <span>دخول بوابة نكسس للمدارس الان (NEXUS)</span>
                  </Link>
                </div>
              </div>

            </div>

            {/* Nexus Mockup Image Section */}
            <div className="relative rounded-3xl border border-slate-800 bg-slate-900 p-3 shadow-2xl overflow-hidden">
              <div className="relative h-[300px] sm:h-[400px] w-full rounded-2xl overflow-hidden bg-slate-950">
                <Image 
                  src="/brand/nexus_portal_mockup.jpg" 
                  alt="نظام نكسس للمدارس والمسابقات" 
                  fill 
                  className="object-cover opacity-90" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                
                <div className="absolute bottom-6 right-6 left-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xl font-black text-white">بوابة نكسس التعليمية للمدارس</h4>
                    <p className="text-xs font-bold text-slate-300 mt-1">منظومة متكاملة لجميع أدوار المدرسة: طالب، معلم، ولي أمر، مدير، وموجه</p>
                  </div>
                  <Link
                    href="https://nexus.masar-platform.org"
                    className="px-6 py-3 rounded-xl bg-amber-400 text-slate-950 font-black text-xs transition hover:bg-amber-300 shrink-0"
                  >
                    الانتقال للبوابة 🚀
                  </Link>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* 4. VISUAL LEARNING LABS SHOWCASE */}
        <section className="py-20 border-t border-slate-200 bg-slate-50 relative">
          <div className="mx-auto max-w-7xl px-5 lg:px-8 space-y-12">
            
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-black">
                بيئة التأهيل البصري والحسي
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
                معامل تعلم وتدريب مصممة خصيصاً للطفل
              </h2>
              <p className="text-slate-600 font-bold text-sm sm:text-base">
                دمج التقنيات البصرية والحسية لتثبيت المفاهيم وبناء المهارات الأساسية
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {labs.map((lab) => (
                <div 
                  key={lab.title} 
                  className="group rounded-3xl border border-slate-200 overflow-hidden shadow-md hover:shadow-2xl hover:translate-y-[-4px] transition duration-300 flex flex-col bg-white"
                >
                  <div className="relative h-60 w-full overflow-hidden bg-slate-100">
                    <Image 
                      src={lab.image} 
                      alt={lab.title} 
                      fill 
                      className="object-cover group-hover:scale-105 transition duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                  </div>
                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 leading-snug">{lab.title}</h3>
                      <p className="mt-2 text-xs font-bold text-slate-600 leading-relaxed">{lab.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                      {lab.tags.map((tag) => (
                        <span key={tag} className="px-2.5 py-1 rounded-lg bg-teal-100/70 border border-teal-200 text-teal-900 text-[11px] font-black">
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

        {/* 5. SEVEN PLACEMENT LEVELS INTERACTIVE EXPLORER */}
        <section className="py-20 border-t border-slate-200 bg-white relative">
          <div className="mx-auto max-w-7xl px-5 lg:px-8 space-y-12">
            
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black">
                اختبارات تحديد المستوى الـ 7
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
                اختر المستوى الدراسي لمعاينة تفاصيل الاختبار
              </h2>
              <p className="text-slate-600 font-bold text-sm sm:text-base">
                اختبارات قبول وقياس دقيقة مصممة لتحديد جاهزية الطفل الأكاديمية لكل صف
              </p>
            </div>

            {/* Level Selector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none justify-start lg:justify-center">
              {placementLevels.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition cursor-pointer ${
                    selectedLevel.id === lvl.id
                      ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/25 scale-105'
                      : 'bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200'
                  }`}
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

        {/* 6. FAQS ACCORDION SECTION */}
        <section className="py-20 border-t border-slate-200 bg-slate-50 relative">
          <div className="mx-auto max-w-4xl px-5 lg:px-8 space-y-10">
            
            <div className="text-center space-y-4">
              <span className="px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-black">
                إجابات واستفسارات
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">الأسئلة الشائعة حول المنصة</h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div 
                  key={idx} 
                  className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition shadow-2xs"
                >
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full p-5 text-right font-black text-base text-slate-900 flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown 
                      size={18} 
                      className={`text-teal-600 transition-transform duration-300 ${activeFaq === idx ? 'rotate-180' : ''}`} 
                    />
                  </button>
                  {activeFaq === idx && (
                    <div className="p-5 pt-0 text-xs sm:text-sm font-bold text-slate-600 leading-relaxed border-t border-slate-200/60">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* 7. FINAL CTA SECTION */}
        <section className="py-20 border-t border-slate-200 bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white relative overflow-hidden">
          <div className="mx-auto max-w-5xl px-5 text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
              جاهز للبدء في تقييم وتأسيس طفلك؟
            </h2>
            <p className="text-teal-100 font-bold text-sm sm:text-lg max-w-2xl mx-auto">
              سجل الآن وابدأ اختبار تحديد المستوى للحصول على تقرير تشخيصي فوري وخطة علاجية مخصصة.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/auth/register" 
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-slate-100 text-teal-950 font-black text-base shadow-xl transition active:scale-95"
              >
                إنشاء حساب جديد وابدأ التقييم
              </Link>
              <Link 
                href="/auth/login" 
                className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/30 bg-white/10 hover:bg-white/20 text-white font-black text-base backdrop-blur transition active:scale-95"
              >
                تسجيل الدخول للحساب الحالي
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs font-bold text-slate-500">
        <div className="mx-auto max-w-7xl px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>جميع الحقوق محفوظة © {new Date().getFullYear()} - منصة مسار التأهيل د. إسماعيل عيسى</p>
          <div className="flex items-center gap-4 text-slate-600">
            <Link href="/auth/login" className="hover:text-slate-900 transition">تسجيل الدخول</Link>
            <span>•</span>
            <Link href="/auth/register" className="hover:text-slate-900 transition">التسجيل</Link>
            <span>•</span>
            <Link href="https://nexus.masar-platform.org" className="hover:text-slate-900 transition">نظام NEXUS</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
