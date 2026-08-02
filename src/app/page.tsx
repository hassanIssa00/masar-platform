"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, Brain, Eye, FileSearch, Hand, LockKeyhole, Shapes, ShieldCheck, 
  Volume2, Sparkles, CheckCircle2, Award, Users, BookOpen, ChevronDown, 
  Play, Activity, HelpCircle, Star, ArrowUpRight, GraduationCap
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
    description: 'تقييم شامل لمهارات القراءة الأوليّة والعد والحركات الفونية.'
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
  { title: 'تأسيس الصفوف الأولية', desc: 'منهج منظم للقراءة والتهجي والرياضيات من الصف 1 حتى 6.', icon: GraduationCap },
  { title: 'علاج صعوبات التعلم', desc: 'خطط موجهة لعلاج عسر القراءة (الديسليكسيا) وعسر الحساب.', icon: Brain },
  { title: 'النطق والتخاطب', desc: 'تمارين صوتية وبصرية محسوسة لتصحيح مخارج الحروف.', icon: Volume2 },
  { title: 'التشخيص والخطة العلاجية', desc: 'تقرير إكلينيكي فوري لكل طالب بناءً على نتائجه.', icon: FileSearch }
];

const faqs = [
  {
    q: 'كيف يعمل اختبار تحديد المستوى؟',
    a: 'يقوم الطالب أو ولي الأمر بتسجيل الدخول واختيار الصف الدراسي، ليتم فتح اختبار تفاعلي مخصص (25 أو 30 سؤالاً). يتم تسجل إجابات الطفل بدقة وتوليد تقرير تحليلي فوري لـ د. إسماعيل عيسى.'
  },
  {
    q: 'هل يتم الاحتفاظ بإجابات الطالب؟',
    a: 'نعم! النظام لا يحفظ فقط الدرجة النهائية، بل يسجل كل إجابة اختارها الطفل بالتفصيل ليتسنى للمعالج تحليل مكامن القوة وصعوبات التعلم بدقة.'
  },
  {
    q: 'هل الألعاب والتمارين ترفيهية أم دراسية؟',
    a: 'الألعاب المصممة على المنصة هي ألعاب تفاعلية حقيقية (حسية وبصرية) تُنمي التركيز والذكاء وتُثبّت المهارات دون تكرار أو ملل.'
  },
  {
    q: 'كيف يمكن للدكتور إسماعيل متابعة حالة طفلي؟',
    a: 'تظهر نتائج واستبيانات كل طالب مباشرة في لوحة تحكم د. إسماعيل عيسى، حيث يتم تصنيف الطلاب وحفظ خططهم العلاجية بشكل دائم.'
  }
];

export default function Home() {
  const [selectedLevel, setSelectedLevel] = useState(placementLevels[0]);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-teal-400 selection:text-slate-950" dir="rtl">
      
      {/* Top Background Glow Elements */}
      <div className="fixed top-0 right-1/4 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[160px] pointer-events-none z-0" />
      <div className="fixed bottom-10 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[160px] pointer-events-none z-0" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <BrandMark size="md" dark />
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#services" className="text-sm font-bold text-slate-300 hover:text-white transition">المجالات العلاجية</a>
            <a href="#placement" className="text-sm font-bold text-slate-300 hover:text-white transition">اختبارات المستوى</a>
            <a href="#methodology" className="text-sm font-bold text-slate-300 hover:text-white transition">المنهجية</a>
            <a href="#faqs" className="text-sm font-bold text-slate-300 hover:text-white transition">الأسئلة الشائعة</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link 
              href="/auth/login" 
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs sm:text-sm font-black text-white backdrop-blur hover:bg-white/10 transition active:scale-95"
            >
              تسجيل الدخول
            </Link>
            <Link 
              href="/auth/register" 
              className="rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 px-5 py-2.5 text-xs sm:text-sm font-black text-slate-950 shadow-lg shadow-teal-500/20 hover:brightness-110 transition active:scale-95 flex items-center gap-1.5"
            >
              <span>ابدأ التقييم الآن</span>
              <ArrowLeft size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        
        {/* HERO SECTION */}
        <section className="relative pt-12 pb-20 lg:pt-20 lg:pb-32 overflow-hidden">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              
              {/* Left Main Content (8 Cols) */}
              <div className="lg:col-span-7 space-y-8 text-center lg:text-right">
                
                {/* Doctor Badge */}
                <div className="inline-flex items-center gap-2.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-4 py-2 text-xs sm:text-sm font-black text-teal-300 backdrop-blur">
                  <Sparkles size={16} className="text-teal-400 animate-pulse" />
                  <span>بإشراف الخبير د. إسماعيل عيسى</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                  <span>منصة التأهيل الأولى عربياً</span>
                </div>

                {/* Main Heading */}
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.15] text-white tracking-tight">
                  تأسيس التعليم <br className="hidden sm:block" />
                  وعلاج <span className="bg-gradient-to-r from-teal-300 via-emerald-300 to-cyan-200 bg-clip-text text-transparent">صعوبات التعلم</span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-lg md:text-xl font-bold leading-relaxed text-slate-300 max-w-2xl mx-auto lg:mx-0">
                  منظومة تشخيص وتأهيل ذكية تبدأ بـ <span className="text-teal-300 underline underline-offset-4 font-black">اختبار قياس دقيق</span> وتستمر بخطة علاجية فردية موجهة للقراءة، الكتابة، الرياضيات، والتخاطب.
                </p>

                {/* Service Tags */}
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-2">
                  {['تأسيس الصفوف (1 - 6)', 'عسر القراءة والديسليكسيا', 'اضطرابات النطق', 'التقارير الإكلينيكية'].map((tag) => (
                    <span key={tag} className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-slate-300 backdrop-blur">
                      ✓ {tag}
                    </span>
                  ))}
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                  <Link 
                    href="/auth/register" 
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300 text-slate-950 font-black text-base shadow-xl shadow-teal-500/25 hover:scale-[1.02] active:scale-95 transition flex items-center justify-center gap-2 group"
                  >
                    <span>دخول الطالب / لبدء الاختبار</span>
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                  </Link>

                  <Link 
                    href="/auth/login" 
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 text-white font-black text-base backdrop-blur transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    <LockKeyhole size={18} className="text-teal-400" />
                    <span>دخول د. إسماعيل (الأدمن)</span>
                  </Link>
                </div>

                {/* Stats Counters */}
                <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10 max-w-xl mx-auto lg:mx-0">
                  <div className="text-center lg:text-right">
                    <p className="text-2xl sm:text-3xl font-black text-teal-300">7 مستويات</p>
                    <p className="text-xs font-bold text-slate-400 mt-1">اختبارات تشخيصية</p>
                  </div>
                  <div className="text-center lg:text-right">
                    <p className="text-2xl sm:text-3xl font-black text-emerald-300">100%</p>
                    <p className="text-xs font-bold text-slate-400 mt-1">تقارير إكلينيكية حقيقية</p>
                  </div>
                  <div className="text-center lg:text-right">
                    <p className="text-2xl sm:text-3xl font-black text-cyan-300">تفاعلي</p>
                    <p className="text-xs font-bold text-slate-400 mt-1">ألعاب حسية وتدريبية</p>
                  </div>
                </div>

              </div>

              {/* Right Side Visual Showcase (5 Cols) */}
              <div className="lg:col-span-5 relative">
                <div className="relative rounded-3xl border border-white/15 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl space-y-6">
                  
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-400/20 text-teal-300 font-black">
                        🧠
                      </span>
                      <div>
                        <h3 className="font-black text-white text-base">نظام التقييم الذكي</h3>
                        <p className="text-xs text-slate-400 font-bold">مسار التأهيل - د. إسماعيل عيسى</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                      مباشر 🟢
                    </span>
                  </div>

                  {/* Feature Box 1 */}
                  <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-teal-300">الخطوة 1: تحديد المستوى</span>
                      <span className="text-xs text-slate-400 font-bold">25 - 30 سؤالاً</span>
                    </div>
                    <p className="text-xs font-bold text-slate-300 leading-relaxed">
                      اختبارات تفاعلية تشمل القراءة، الرياضيات، والمهارات الذهنية لكل مرحلة.
                    </p>
                  </div>

                  {/* Feature Box 2 */}
                  <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-300">الخطوة 2: حفظ كافة الإجابات</span>
                      <span className="text-xs text-slate-400 font-bold">دقة إكلينيكية</span>
                    </div>
                    <p className="text-xs font-bold text-slate-300 leading-relaxed">
                      النظام يحفظ خيارات الطالب بالتفصيل لإصدار تقرير تحليلي دقيق.
                    </p>
                  </div>

                  {/* Feature Box 3 */}
                  <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-cyan-300">الخطوة 3: التقرير والتدخل</span>
                      <span className="text-xs text-slate-400 font-bold">خطة فردية</span>
                    </div>
                    <p className="text-xs font-bold text-slate-300 leading-relaxed">
                      توليد تقرير كامل في لوحة تحكم المعالج مع التوجيه للألعاب والتمارين.
                    </p>
                  </div>

                  <Link 
                    href="/auth/register" 
                    className="block text-center w-full py-3.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-black text-sm transition"
                  >
                    تجربة التقييم الآن 👈
                  </Link>

                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SERVICES & THERAPY AREAS */}
        <section id="services" className="py-20 border-t border-white/10 bg-slate-900/50 relative">
          <div className="mx-auto max-w-7xl px-5 lg:px-8 space-y-12">
            
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-black">
                المجالات والخدمات العلاجية
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                حلول متكاملة لتأسيس الأطفال وعلاج صعوبات التعلم
              </h2>
              <p className="text-slate-400 font-bold text-sm sm:text-base">
                برامج علمية مدروسة تدمج التقييم التشخيصي بالتمارين الحسية والبصرية
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {therapyAreas.map(({ title, desc, icon: Icon }) => (
                <div 
                  key={title} 
                  className="bg-slate-950/80 border border-white/10 hover:border-teal-500/40 rounded-3xl p-6 space-y-4 hover:translate-y-[-4px] transition duration-300 group"
                >
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-teal-400/10 text-teal-300 group-hover:bg-teal-400 group-hover:text-slate-950 transition">
                    <Icon size={28} />
                  </span>
                  <h3 className="text-xl font-black text-white">{title}</h3>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* INTERACTIVE PLACEMENT LEVELS (7 LEVELS) */}
        <section id="placement" className="py-20 border-t border-white/10 bg-slate-950 relative">
          <div className="mx-auto max-w-7xl px-5 lg:px-8 space-y-12">
            
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-black">
                اختبارات تحديد المستوى الـ 7
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                اختر المستوى الدراسي لمعاينة تفاصيل الاختبار
              </h2>
              <p className="text-slate-400 font-bold text-sm sm:text-base">
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
                      ? 'bg-teal-400 text-slate-950 shadow-lg shadow-teal-400/20'
                      : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {lvl.title}
                </button>
              ))}
            </div>

            {/* Active Level Detail Box */}
            <div className="bg-slate-900/90 border border-white/15 rounded-3xl p-6 sm:p-10 grid lg:grid-cols-12 gap-8 items-center backdrop-blur-xl">
              
              <div className="lg:col-span-7 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-400/20 text-teal-300 text-xs font-black">
                  <span>{selectedLevel.gradeText}</span>
                </div>
                <h3 className="text-3xl font-black text-white">{selectedLevel.title}</h3>
                <p className="text-slate-300 font-bold text-sm leading-relaxed">{selectedLevel.description}</p>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-white/10">
                    <p className="text-xs font-bold text-slate-400">عدد الأسئلة</p>
                    <p className="text-2xl font-black text-teal-300 mt-1">{selectedLevel.questionsCount} سؤالاً</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-white/10">
                    <p className="text-xs font-bold text-slate-400">المدة الموصى بها</p>
                    <p className="text-2xl font-black text-emerald-300 mt-1">{selectedLevel.duration}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wider">المهارات المشمولة بالاختبار:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedLevel.skills.map((skill) => (
                      <div key={skill} className="flex items-center gap-2 text-xs font-bold text-slate-200">
                        <CheckCircle2 size={16} className="text-teal-400 shrink-0" />
                        <span>{skill}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <Link 
                    href="/auth/register" 
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 font-black text-sm shadow-lg hover:scale-105 transition"
                  >
                    <span>البدء في اختبار {selectedLevel.title}</span>
                    <ArrowLeft size={16} />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 bg-slate-950/90 border border-white/10 rounded-2xl p-6 space-y-4">
                <h4 className="font-black text-white text-base flex items-center gap-2">
                  <Award className="text-teal-400" size={20} />
                  <span>طريقة التقييم والتقرير</span>
                </h4>
                <ul className="space-y-3 text-xs font-bold text-slate-300 leading-relaxed">
                  <li className="flex items-start gap-2">
                    <span className="text-teal-400">1.</span>
                    <span>تظهر الأسئلة بشكل تفاعلي مدعوم بالصور والأصوات للطفل.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-400">2.</span>
                    <span>تُحفظ كل إجابة يختارها الطفل في سجل الطالب الخاص به.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-400">3.</span>
                    <span>يتم إصدار تقرير تحليلي يحدد مستوى التحكم والصعوبات.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-teal-400">4.</span>
                    <span>تصل النتائج تلقائياً للوحة تحكم د. إسماعيل لمتابعتها.</span>
                  </li>
                </ul>
              </div>

            </div>

          </div>
        </section>

        {/* METHODOLOGY SECTION */}
        <section id="methodology" className="py-20 border-t border-white/10 bg-slate-900/60 relative">
          <div className="mx-auto max-w-7xl px-5 lg:px-8 space-y-12">
            
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <span className="px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-black">
                منهجية د. إسماعيل عيسى
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white">
                4 خطوات علمية موجهة لضمان التقدم الأكاديمي
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { step: '01', title: 'التقييم التشخيصي', desc: 'قياس القدرات الأوليّة وحصر صعوبات القراءة أو الحساب.' },
                { step: '02', title: 'التقرير والتحليل', desc: 'إصدار تقرير إكلينيكي مفصل بالنتائج والإجابات.' },
                { step: '03', title: 'الخطة العلاجية', desc: 'تخصيص منهج التأسيس والتمارين المتدرجة لكل طالب.' },
                { step: '04', title: 'التدريب التفاعلي', desc: 'ألعاب حسية وبصرية بدون تكرار أو إجهاد للطفل.' }
              ].map(({ step, title, desc }) => (
                <div key={step} className="bg-slate-950/80 border border-white/10 p-6 rounded-3xl space-y-3 relative overflow-hidden">
                  <span className="text-5xl font-black text-white/10 absolute top-4 left-4">{step}</span>
                  <h3 className="text-xl font-black text-teal-300 relative z-10">{title}</h3>
                  <p className="text-xs font-bold text-slate-400 leading-relaxed relative z-10">{desc}</p>
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* FAQS SECTION */}
        <section id="faqs" className="py-20 border-t border-white/10 bg-slate-950 relative">
          <div className="mx-auto max-w-4xl px-5 lg:px-8 space-y-10">
            
            <div className="text-center space-y-4">
              <span className="px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-black">
                إجابات واستفسارات
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white">الأسئلة الشائعة حول المنصة</h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div 
                  key={idx} 
                  className="bg-slate-900/80 border border-white/10 rounded-2xl overflow-hidden transition"
                >
                  <button
                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                    className="w-full p-5 text-right font-black text-base text-white flex items-center justify-between gap-4"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown 
                      size={18} 
                      className={`text-teal-400 transition-transform duration-300 ${activeFaq === idx ? 'rotate-180' : ''}`} 
                    />
                  </button>
                  {activeFaq === idx && (
                    <div className="p-5 pt-0 text-xs sm:text-sm font-bold text-slate-300 leading-relaxed border-t border-white/5">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>

          </div>
        </section>

        {/* FINAL CALL TO ACTION */}
        <section className="py-20 border-t border-white/10 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 relative overflow-hidden">
          <div className="mx-auto max-w-5xl px-5 text-center space-y-6">
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
              جاهز للبدء في تقييم وتأسيس طفلك؟
            </h2>
            <p className="text-slate-300 font-bold text-sm sm:text-lg max-w-2xl mx-auto">
              سجل الآن وابدأ اختبار تحديد المستوى للحصول على تقرير تشخيصي فوري وخطة علاجية مخصصة.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/auth/register" 
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-black text-base shadow-xl shadow-teal-500/25 transition active:scale-95"
              >
                إنشاء حساب جديد وابدأ التقييم
              </Link>
              <Link 
                href="/auth/login" 
                className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/15 text-white font-black text-base backdrop-blur transition active:scale-95"
              >
                تسجيل الدخول للحساب الحالي
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-slate-950 py-8 text-center text-xs font-bold text-slate-500">
        <div className="mx-auto max-w-7xl px-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>جميع الحقوق محفوظة © {new Date().getFullYear()} - منصة مسار التأهيل د. إسماعيل عيسى</p>
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/auth/login" className="hover:text-white transition">تسجيل الدخول</Link>
            <span>•</span>
            <Link href="/auth/register" className="hover:text-white transition">التسجيل</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
