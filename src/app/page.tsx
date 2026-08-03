"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, Brain, FileSearch, Hand, Shapes, ShieldCheck, 
  Sparkles, CheckCircle2, Award, ChevronDown, Trophy, 
  UserCheck, ClipboardList, Stethoscope, Gamepad2, Activity,
  Users, Check, Zap, Eye, Star, ChevronRight
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

const onboardingSteps = [
  {
    step: '1',
    title: 'إنشاء حساب العائلة',
    icon: UserCheck,
    color: 'from-teal-500 to-emerald-600',
    desc: 'إنشاء حساب ولي الأمر سريعاً برقم الجوال واسم ولي الأمر مع الحفظ الآمن.',
    badge: 'خطوة أولى بسيطة',
  },
  {
    step: '2',
    title: 'تسجيل بيانات الطفل',
    icon: ClipboardList,
    color: 'from-blue-500 to-indigo-600',
    desc: 'تعبئة اسم الطفل، العمر، الصف الدراسي، والملاحظات السلوكية أو التأهيلية الأولية.',
    badge: 'تعبئة آليّة تلقائية',
  },
  {
    step: '3',
    title: 'استبيان ولي الأمر الشامل',
    icon: Activity,
    color: 'from-violet-500 to-purple-600',
    desc: 'أسئلة تفصيلية عن المهارات اللغوية، الاجتماعية، والسلوكية يجيب عنها ولي الأمر.',
    badge: 'تشخيص الوالدين',
  },
  {
    step: '4',
    title: 'اختبار الطفل المباشر',
    icon: Stethoscope,
    color: 'from-amber-500 to-orange-600',
    desc: 'أسئلة تفاعلية مدعومة بالصور والنطق المباشر مخصصة لصف الطفل بدون عرض درجات محبطة.',
    badge: 'تقييم تشخيصي',
  },
  {
    step: '5',
    title: 'التقرير للدكتور والألعاب للطفل',
    icon: Gamepad2,
    color: 'from-emerald-500 to-teal-700',
    desc: 'يرسل التقرير كاملاً لدكتور إسماعيل عيسى، ويُفتح للطالب عالم ألعابه الموجهة لتثبيت المهارات.',
    badge: 'خطة علاجية + ألعاب',
  },
];

const therapyAreas = [
  'قراءة وتهجئة', 'كتابة وإملاء', 'رياضيات محسوسة', 'نطق وتخاطب', 'انتباه وسلوك', 'تشخيص الحالات الصعبة'
];

const methods = [
  { title: 'تعليم صريح ومنظم', body: 'خطوات قصيرة متدرجة: نموذج، تدريب، قياس، ثم انتقال بثقة.', icon: Brain, badge: 'منهجية معتمدة' },
  { title: 'مدخل متعدد الحواس', body: 'دمج الصوت، الصورة، اللمس، والحركة لتثبيت المهارة بدون ملل.', icon: Hand, badge: 'تفاعل حسي' },
  { title: 'تمثيل بصري ومحسوس', body: 'الاعتماد على النماذج المحسوسة في القراءة والرياضيات قبل الرمز المجرد.', icon: Shapes, badge: 'نماذج بصرية' },
  { title: 'قياس قبل القرار', body: 'التقرير الإكلينيكي هو ما يحدد مسار الطفل العلاجي، وليس الانطباع العام.', icon: FileSearch, badge: 'دقة تشخيصية' }
];

const labs = [
  {
    title: 'معمل التأسيس القرائي والتهجئة',
    subtitle: 'مبني على مذكرة التهجي البسيط والقاموس المفيد لـ د. إسماعيل',
    image: '/learning/literacy-lab.png',
    tags: ['التحليل الصوتي', 'مخارج الحروف', 'الطلاقة القرائية'],
    color: 'border-teal-200 bg-teal-50/50',
  },
  {
    title: 'معمل الرياضيات والعد المحسوس',
    subtitle: 'تحويل المفاهيم المجردة إلى أشكال ونماذج تفاعلية ملموسة',
    image: '/learning/math-lab.png',
    tags: ['العد البصري', 'الجمع والطرح', 'حل المسائل'],
    color: 'border-cyan-200 bg-cyan-50/50',
  },
  {
    title: 'معمل النطق والتخاطب والتأهيل السلوكي',
    subtitle: 'تدريب حسي بصري وصوتي لتعديل النطق وبناء الانتباه والتركيز',
    image: '/learning/communication-lab.png',
    tags: ['دوزنة الصوت', 'تركيز وانتباه', 'خطة علاجية'],
    color: 'border-emerald-200 bg-emerald-50/50',
  }
];

const faqs = [
  {
    q: 'كيف يضمن النظام تسلسل الخطوات التسجيل ثم الاستبيان ثم الاختبار؟',
    a: 'النظام يضمن تسلسلاً محكماً 100%: بعد التسجيل ينتقل ولي الأمر فوراً لصفحة بيانات الطالب (/student/new)، ثم إلى استبيان ولي الأمر (/survey)، وبعدها يفتح اختبار تحديد المستوى الخاص بصف الطفل (/assessment) دون تخطي أو تشتيت.'
  },
  {
    q: 'هل تظهر الدرجة أو النتيجة للطفل أثناء الاختبار؟',
    a: 'لا، حرصاً على نفسية الطفل وتجنب وسمه السلبي، لا تظهر أي نتيجة أو درجة للطفل. الإجابات والتحليلات تحفظ وتُرسل مباشرة إلى لوحة تحكم د. إسماعيل عيسى لاعتماد الخطة وتوجيه الطفل لألعابه الخاصة.'
  },
  {
    q: 'ما العلاقة بين منصة مسار ونظام NEXUS EDU المدمج؟',
    a: 'مسار هي المنصة المتخصصة في التقييم والخطط العلاجية الفردية للطفل بإشراف د. إسماعيل، بينما نظام NEXUS EDU يضيف الطبقة التنافسية المتقدمة للمدارس والجائزة الكبرى مع معلم الذكاء الاصطناعي على نفس الدومين.'
  },
  {
    q: 'هل يمكن للدكتور إسماعيل متابعة تقارير طفلي عن بُعد؟',
    a: 'نعم، تصل جميع نتائج الاستبيانات والإجابات التفصيلية مباشرة إلى لوحة تحكم د. إسماعيل عيسى، حيث يتم تحديث حالة التقييم وتوليد التقرير التحليلي والخطة الفردية.'
  }
];

export default function Home() {
  const [selectedLevel, setSelectedLevel] = useState(placementLevels[0]);
  const [activeStep, setActiveStep] = useState(0);
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden selection:bg-teal-600 selection:text-white" dir="rtl">
      
      {/* 1. TOP ANNOUNCEMENT BAR */}
      <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-cyan-950 px-4 py-2.5 text-center text-xs font-black text-white border-b border-teal-800/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-500/20 px-2.5 py-0.5 text-[10px] font-black text-teal-300 border border-teal-500/30">
              جديد 🚀
            </span>
            <span>النسخة المحدثة 2026: تم إدماج نظام NEXUS EDU للمدارس والجائزة الكبرى!</span>
          </div>

          <Link 
            href="https://nexus.masar-platform.org" 
            className="hidden md:inline-flex items-center gap-1 hover:underline text-amber-400 font-bold text-xs"
          >
            <span>انتقل لبوابة المدارس والمسابقات (NEXUS)</span>
            <ArrowLeft size={14} />
          </Link>
        </div>
      </div>

      {/* 2. MAIN HEADER NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 lg:px-8">
          <Link href="/" className="focus-ring rounded-lg">
            <BrandMark size="md" />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link 
              href="https://nexus.masar-platform.org" 
              className="focus-ring rounded-xl border border-cyan-400/40 bg-gradient-to-r from-cyan-600 to-teal-600 px-3.5 py-2 text-xs sm:text-sm font-black text-white shadow-md hover:from-cyan-700 hover:to-teal-700 transition active:scale-95 flex items-center gap-1.5"
            >
              <Trophy size={16} className="text-amber-300" />
              <span className="hidden sm:inline">نظام نكسس للمدارس (NEXUS)</span>
              <span className="sm:hidden">NEXUS</span>
            </Link>

            <Link 
              href="/auth/login" 
              className="focus-ring rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-black text-slate-700 hover:bg-slate-100 transition active:scale-95 shadow-2xs"
            >
              تسجيل الدخول
            </Link>

            <Link 
              href="/auth/register" 
              className="focus-ring rounded-xl bg-teal-600 px-4 py-2 text-xs sm:text-sm font-black text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition active:scale-95 flex items-center gap-1.5"
            >
              <span>ابدأ التقييم</span>
              <ArrowLeft size={15} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        
        {/* 3. HERO SECTION WITH VIBRANT LIGHT GRADIENT & DYNAMIC CARDS */}
        <section className="relative isolate overflow-hidden bg-gradient-to-b from-teal-50/90 via-slate-50 to-white pt-12 pb-20 lg:pt-20 lg:pb-32">
          
          {/* Decorative Background Lighting Blobs */}
          <div className="absolute top-10 right-10 -z-10 h-96 w-96 rounded-full bg-teal-200/50 blur-[130px] pointer-events-none" />
          <div className="absolute bottom-10 left-10 -z-10 h-96 w-96 rounded-full bg-cyan-200/40 blur-[130px] pointer-events-none" />

          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-12 items-center lg:grid-cols-[1.1fr_0.9fr]">
              
              {/* Left Column: Hero Copy & CTA */}
              <div className="space-y-6 text-right">
                
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-teal-300 bg-white px-4 py-1.5 text-xs sm:text-sm font-black text-teal-900 shadow-xs">
                    <Sparkles size={16} className="text-teal-600 animate-pulse" />
                    <span>بإشراف الخبير د. إسماعيل عيسى</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300 bg-cyan-50 px-3 py-1.5 text-xs font-black text-cyan-800">
                    <CheckCircle2 size={14} className="text-cyan-600" />
                    <span>خطة علاجية فردية 100%</span>
                  </div>
                </div>

                <h1 className="text-4xl font-black leading-[1.15] text-slate-900 sm:text-5xl md:text-6xl lg:text-6xl tracking-tight">
                  علاج صعوبات التعلم.
                  <br />
                  <span className="bg-gradient-to-r from-teal-700 via-emerald-600 to-cyan-700 bg-clip-text text-transparent">
                    بطريقة تقيس ثم تعالج.
                  </span>
                </h1>

                <p className="max-w-2xl text-base font-bold leading-relaxed text-slate-600 sm:text-lg md:text-xl">
                  قراءة، كتابة، رياضيات، نطق، وتخاطب. بخطة علاجية فردية مبنية على تقييم تشخيصي دقيق لكل طالب مع متابعة مباشرة من د. إسماعيل.
                </p>

                {/* Therapy Areas Badges Grid */}
                <div className="flex flex-wrap gap-2 pt-1">
                  {therapyAreas.map((area) => (
                    <span key={area} className="rounded-xl border border-teal-200/80 bg-white px-3.5 py-1.5 text-xs font-black text-teal-950 shadow-2xs flex items-center gap-1">
                      <span className="text-teal-600">✓</span>
                      <span>{area}</span>
                    </span>
                  ))}
                </div>

                {/* Main Hero CTA Buttons */}
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
                    className="focus-ring inline-flex min-h-14 items-center justify-center gap-2.5 rounded-2xl border border-cyan-300 bg-gradient-to-r from-slate-900 via-cyan-950 to-teal-950 px-7 py-4 text-base font-black text-white shadow-lg shadow-slate-900/20 hover:from-slate-950 hover:to-cyan-950 transition active:scale-95"
                  >
                    <Trophy size={18} className="text-amber-400 animate-bounce" />
                    <span>دخول نظام نكسس للمدارس (NEXUS)</span>
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
                    <p className="text-xs font-bold text-slate-500 mt-0.5">نسبة التحسن القرائي</p>
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-black text-cyan-600">7 صفوف</p>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">اختبارات تشخيصية</p>
                  </div>
                </div>

              </div>

              {/* Right Column: Interactive Clinical Preview Console */}
              <div className="relative">
                <div className="relative rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-2xl space-y-6">
                  
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-black text-teal-800 border border-teal-200">
                        الخطة الإكلينيكية المعتمدة
                      </span>
                      <h3 className="text-xl font-black text-slate-900 mt-2">منهجية د. إسماعيل عيسى</h3>
                    </div>
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white shadow-md">
                      <ShieldCheck size={26} />
                    </div>
                  </div>

                  {/* Method Cards List */}
                  <div className="space-y-3">
                    {methods.map(({ title, body, icon: Icon, badge }) => (
                      <div 
                        key={title}
                        className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 transition hover:bg-white hover:border-teal-300 hover:shadow-md"
                      >
                        <div className="flex items-start gap-3.5">
                          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-100/80 text-teal-800 font-bold">
                            <Icon size={20} />
                          </span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-black text-slate-900 text-sm">{title}</h4>
                              <span className="text-[10px] font-black text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60">
                                {badge}
                              </span>
                            </div>
                            <p className="mt-1 text-xs font-bold text-slate-600 leading-relaxed">{body}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Live Quick Assessment Action Box */}
                  <div className="rounded-2xl bg-gradient-to-r from-teal-900 to-slate-900 p-4 text-white flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black text-amber-300">جاهز لبدء التقييم لمدخلك الفردي؟</p>
                      <p className="text-[11px] font-bold text-slate-300 mt-0.5">خطوات متسلسلة تلقائياً بدون تعقيد</p>
                    </div>
                    <Link 
                      href="/auth/register"
                      className="rounded-xl bg-teal-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-teal-400 transition shrink-0"
                    >
                      ابدأ الآن
                    </Link>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* 4. FIVE-STEP JOURNEY WALKTHROUGH SECTION */}
        <section className="py-20 border-t border-slate-200 bg-white relative">
          <div className="mx-auto max-w-7xl px-5 lg:px-8 space-y-12">
            
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-black">
                تسلسل الرحلة العلاجية المنظم
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
                كيف تعمل المنصة من التسجيل حتى الخطة العلاجية؟
              </h2>
              <p className="text-slate-600 font-bold text-sm sm:text-base">
                رحلة خماسية متسلسلة تبدأ بتشخيص ولي الأمر والطفل وتتهي بتقرير تحليلي كامل لدكتور إسماعيل
              </p>
            </div>

            {/* Steps Timeline Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {onboardingSteps.map((s, idx) => {
                const Icon = s.icon;
                const isActive = activeStep === idx;
                return (
                  <div
                    key={s.step}
                    onClick={() => setActiveStep(idx)}
                    className={`rounded-3xl border p-5 transition cursor-pointer flex flex-col justify-between space-y-4 ${
                      isActive 
                        ? 'border-teal-500 bg-teal-50/50 shadow-xl ring-2 ring-teal-500/20 translate-y-[-4px]' 
                        : 'border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr ${s.color} text-white font-black shadow-sm`}>
                          <Icon size={20} />
                        </span>
                        <span className="text-xs font-black text-slate-400">الخطوة {s.step}</span>
                      </div>

                      <h3 className="text-base font-black text-slate-900 leading-snug">{s.title}</h3>
                      <p className="text-xs font-bold text-slate-600 leading-relaxed">{s.desc}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="inline-block rounded-md bg-white px-2.5 py-1 text-[10px] font-black text-teal-800 border border-teal-200">
                        {s.badge}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Step Preview Banner */}
            <div className="rounded-3xl border border-teal-200 bg-gradient-to-r from-teal-900 via-slate-900 to-cyan-950 p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
              <div className="space-y-2 text-right">
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                  معاينة الخطوة الحالية: الخطوة {onboardingSteps[activeStep].step}
                </span>
                <h3 className="text-2xl font-black text-white">{onboardingSteps[activeStep].title}</h3>
                <p className="text-xs sm:text-sm font-bold text-slate-300 max-w-2xl leading-relaxed">
                  {onboardingSteps[activeStep].desc}
                </p>
              </div>

              <Link
                href="/auth/register"
                className="px-8 py-4 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-sm transition shadow-lg shrink-0"
              >
                ابدأ الخطوات الآن
              </Link>
            </div>

          </div>
        </section>

        {/* 5. VISUAL LEARNING LABS SHOWCASE */}
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
                  className={`group rounded-3xl border ${lab.color} overflow-hidden shadow-md hover:shadow-2xl hover:translate-y-[-4px] transition duration-300 flex flex-col bg-white`}
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

        {/* 6. SEVEN PLACEMENT LEVELS INTERACTIVE EXPLORER */}
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

        {/* 7. NEXUS EDU ENTERPRISE INTEGRATION BANNER */}
        <section className="py-16 border-t border-slate-200 bg-gradient-to-br from-slate-950 via-cyan-950 to-slate-950 text-white relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-8 space-y-4 text-right">
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-black text-amber-300">
                  <Trophy size={16} />
                  <span>NEXUS EDU Enterprise Engine</span>
                </span>

                <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                  نظام نكسس المدمج للمدارس والمسابقات والجائزة الكبرى
                </h2>

                <p className="text-slate-300 font-bold text-xs sm:text-sm leading-relaxed max-w-3xl">
                  تكامل كامل على نفس الدومين يوفر للمدارس والطلاب محرك Gamification تفاعلي، معلم الذكاء الاصطناعي (AI Tutor) 24/7، تحضير كود QR، ومنافسة الجائزة الكبرى.
                </p>

                <div className="flex flex-wrap gap-3 pt-2">
                  {['1,000,000 SAR الجائزة السنوية', 'AI Tutor 24/7', 'تحضير QR Code', 'لوحة تحكم B2B للمدارس'].map((f) => (
                    <span key={f} className="rounded-xl border border-cyan-500/30 bg-cyan-950/60 px-3.5 py-1.5 text-xs font-black text-cyan-300">
                      ✓ {f}
                    </span>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-4 text-center lg:text-left">
                <Link
                  href="https://nexus.masar-platform.org"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-teal-400 px-8 py-4 text-sm font-black text-slate-950 shadow-xl hover:from-cyan-400 hover:to-teal-300 transition active:scale-95"
                >
                  <Trophy size={18} />
                  <span>دخول بوابة نكسس للمدارس</span>
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* 8. FAQS ACCORDION SECTION */}
        <section className="py-20 border-t border-slate-200 bg-white relative">
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
                  className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden transition"
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

        {/* 9. FINAL CTA SECTION */}
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

      {/* 10. FOOTER */}
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
