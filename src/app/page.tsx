"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, Brain, FileSearch, Hand, LockKeyhole, Shapes, ShieldCheck, 
  Sparkles, CheckCircle2, Award, ChevronDown, GraduationCap, Volume2, Star
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

const therapyAreas = [
  'قراءة وتهجئة', 'كتابة وإملاء', 'رياضيات محسوسة', 'نطق وتخاطب', 'انتباه وسلوك', 'تشخيص الحالات الصعبة'
];

const methods = [
  { title: 'تعليم صريح ومنظم', body: 'خطوات قصيرة متدرجة: نموذج، تدريب، قياس، ثم انتقال بثقة.', icon: Brain },
  { title: 'مدخل متعدد الحواس', body: 'دمج الصوت، الصورة، اللمس، والحركة لتثبيت المهارة بدون ملل.', icon: Hand },
  { title: 'تمثيل بصري ومحسوس', body: 'الاعتماد على النماذج المحسوسة في القراءة والرياضيات قبل الرمز المجرد.', icon: Shapes },
  { title: 'قياس قبل القرار', body: 'التقرير الإكلينيكي هو ما يحدد مسار الطفل العلاجي، وليس الانطباع العام.', icon: FileSearch }
];

const labs = [
  {
    title: 'معمل التأسيس القرائي والتهجئة',
    subtitle: 'مبني على مذكرة التهجي البسيط والقاموس المفيد',
    image: '/learning/literacy-lab.png',
    tags: ['التحليل الصوتي', 'مخارج الحروف', 'الطلاقة القرائية']
  },
  {
    title: 'معمل الرياضيات والعد المحسوس',
    subtitle: 'تحويل المفاهيم المجردة إلى أشكال ونماذج تفاعلية',
    image: '/learning/math-lab.png',
    tags: ['العد البصري', 'الجمع والطرح', 'حل المسائل']
  },
  {
    title: 'معمل النطق والتخاطب والتأهيل السلوكي',
    subtitle: 'تدريب حسي بصري وصوتي لتعديل النطق وبناء الانتباه',
    image: '/learning/communication-lab.png',
    tags: ['دوزنة الصوت', 'تركيز وانتباه', 'خطة علاجية']
  }
];

const faqs = [
  {
    q: 'كيف يعمل اختبار تحديد المستوى على المنصة؟',
    a: 'عند تسجيل الطالب أو ولي الأمر، يتم التوجيه لاختبار تحديد المستوى التفاعلي (25 أو 30 سؤالاً بحسب الصف). تُحفظ كافة إجابات الطفل بدقة لتوليد تقرير تحليلي فوري لـ د. إسماعيل عيسى.'
  },
  {
    q: 'هل تُحفظ إجابات الطفل بالتفصيل أم الدرجة فقط؟',
    a: 'تُسجل وتُحفظ كافة خيارات وإجابات الطفل التفصيلية في لوحة تحكم د. إسماعيل، ليتسنى تحديد مكامن القوة وصعوبات التعلم بدقة وتخصيص الخطة العلاجية.'
  },
  {
    q: 'هل الألعاب والتمارين ترفيهية أم دراسية؟',
    a: 'الألعاب المصممة على المنصة هي ألعاب تفاعلية حسية وبصرية حقيقية (شديدة الجاذبية للأطفال) تُنمي التركيز والذكاء وتُثبّت المهارات دون تكرار أو إجهاد.'
  },
  {
    q: 'كيف يمكن للدكتور إسماعيل متابعة تقارير طفلي؟',
    a: 'تصل جميع نتائج الاستبيانات والاختبارات مباشرة إلى لوحة تحكم د. إسماعيل عيسى، حيث تظهر الملفات باسم كل طالب مع كامل التحليل والخطة المقترحة.'
  }
];

export default function Home() {
  const [selectedLevel, setSelectedLevel] = useState(placementLevels[0]);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden selection:bg-teal-600 selection:text-white" dir="rtl">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md transition-all shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Link href="/" className="focus-ring rounded-lg">
            <BrandMark size="md" />
          </Link>
          <div className="flex items-center gap-3">
            <Link 
              href="/auth/login" 
              className="focus-ring rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition active:scale-95 shadow-sm"
            >
              تسجيل الدخول
            </Link>
            <Link 
              href="/auth/register" 
              className="focus-ring rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition active:scale-95 flex items-center gap-1.5"
            >
              <span>ابدأ التقييم الآن</span>
              <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        
        {/* HERO SECTION WITH LIGHT BACKGROUND & SLIGHT IMAGE OVERLAY */}
        <section className="relative isolate overflow-hidden bg-gradient-to-b from-teal-50/70 via-white to-slate-50 pt-16 pb-20 lg:pt-24 lg:pb-32">
          
          {/* Subtle background drift image with light overlay */}
          <div className="absolute inset-0 z-0 pointer-events-none opacity-25">
            <Image 
              src="/learning/communication-lab.png" 
              alt="معمل التأهيل والتعلم د. إسماعيل عيسى" 
              fill 
              priority 
              sizes="100vw" 
              className="hero-image-drift object-cover" 
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-slate-50/95 via-white/90 to-teal-50/80 z-0 pointer-events-none" />

          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
            
            {/* Left Main Hero Text */}
            <div className="motion-fade-up space-y-6 text-right">
              
              <div className="inline-flex items-center gap-2.5 rounded-full border border-teal-200 bg-teal-50/90 px-4 py-2 text-xs sm:text-sm font-black text-teal-800 shadow-sm backdrop-blur">
                <Sparkles size={16} className="text-teal-600 animate-pulse" />
                <span>بإشراف الخبير د. إسماعيل عيسى</span>
                <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                <span>منصة مسار التأهيل الأولى</span>
              </div>

              <h1 className="text-4xl font-black leading-[1.15] text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl tracking-tight">
                علاج صعوبات التعلم.
                <br />
                <span className="bg-gradient-to-r from-teal-700 via-emerald-600 to-cyan-700 bg-clip-text text-transparent">
                  بطريقة تقيس ثم تعالج.
                </span>
              </h1>

              <p className="max-w-2xl text-base font-bold leading-relaxed text-slate-600 sm:text-lg md:text-2xl md:leading-[1.4]">
                قراءة، كتابة، رياضيات، نطق، وتخاطب. بخطة علاجية فردية مبنية على تقييم تشخيصي دقيق لكل طالب.
              </p>

              {/* Therapy Badges */}
              <div className="flex flex-wrap gap-2 pt-2">
                {therapyAreas.map((area) => (
                  <span key={area} className="rounded-xl border border-teal-100 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-black text-teal-950 shadow-sm">
                    ✓ {area}
                  </span>
                ))}
              </div>

              {/* Hero Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link 
                  href="/auth/register" 
                  className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-teal-600 px-8 py-4 text-base font-black text-white shadow-lg shadow-teal-600/25 hover:bg-teal-700 transition active:scale-95"
                >
                  <span>ابدأ تقييم تحديد المستوى</span>
                  <ArrowLeft size={18} />
                </Link>
              </div>

            </div>

            {/* Right Side Method Console Panel */}
            <div className="motion-slide-left hidden lg:block">
              <div className="landing-console rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl space-y-5 backdrop-blur">
                
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-xs font-black text-teal-700 uppercase tracking-wider">MASAR Method</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-900">أساليب علاج حديثة ومعتمدة</h2>
                  </div>
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200">
                    <ShieldCheck size={26} />
                  </span>
                </div>

                <div className="grid gap-3">
                  {methods.map(({ title, body, icon: Icon }) => (
                    <article key={title} className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 hover:border-teal-500/40 transition">
                      <div className="flex items-start gap-3.5">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-100 text-teal-800 mt-0.5 font-bold">
                          <Icon size={20} />
                        </span>
                        <div>
                          <h3 className="font-black text-slate-900 text-sm sm:text-base">{title}</h3>
                          <p className="mt-1 text-xs font-bold leading-relaxed text-slate-600">{body}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* VISUAL LEARNING LABS SHOWCASE */}
        <section className="py-20 border-t border-slate-200 bg-white relative">
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
                  className="group rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-md hover:shadow-xl hover:border-teal-500/40 hover:translate-y-[-4px] transition duration-300 flex flex-col"
                >
                  <div className="relative h-56 w-full overflow-hidden bg-slate-100">
                    <Image 
                      src={lab.image} 
                      alt={lab.title} 
                      fill 
                      className="object-cover group-hover:scale-105 transition duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                  </div>
                  <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-black text-slate-900 leading-snug">{lab.title}</h3>
                      <p className="mt-2 text-xs font-bold text-slate-600 leading-relaxed">{lab.subtitle}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                      {lab.tags.map((tag) => (
                        <span key={tag} className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-bold">
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

        {/* 7 PLACEMENT LEVELS SELECTOR */}
        <section className="py-20 border-t border-slate-200 bg-slate-50 relative">
          <div className="mx-auto max-w-7xl px-5 lg:px-8 space-y-12">
            
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black">
                اختبارات تحديد المستوى الـ 7
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
                اختر المستوى الدراسي لمعاينة تفاصيل الاختبار
              </h2>
              <p className="text-slate-600 font-bold text-sm sm:text-base">
                اختبارات قبول وقياس دقيقة مصممة لتحديد جاهزية الطفل الأكاديمية
              </p>
            </div>

            {/* Level Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-none justify-start lg:justify-center">
              {placementLevels.map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setSelectedLevel(lvl)}
                  className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-black whitespace-nowrap transition ${
                    selectedLevel.id === lvl.id
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {lvl.title}
                </button>
              ))}
            </div>

            {/* Selected Level Detail Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 grid lg:grid-cols-12 gap-8 items-center shadow-lg">
              
              <div className="lg:col-span-7 space-y-6 text-right">
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-black">
                  <span>{selectedLevel.gradeText}</span>
                </div>
                <h3 className="text-3xl font-black text-slate-900">{selectedLevel.title}</h3>
                <p className="text-slate-600 font-bold text-sm leading-relaxed">{selectedLevel.description}</p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-500">عدد الأسئلة</p>
                    <p className="text-2xl font-black text-teal-700 mt-1">{selectedLevel.questionsCount} سؤالاً</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
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

              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 text-right">
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

        {/* FAQS SECTION */}
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
                    className="w-full p-5 text-right font-black text-base text-slate-900 flex items-center justify-between gap-4"
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

        {/* FINAL CALL TO ACTION */}
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
          </div>
        </div>
      </footer>

    </div>
  );
}
