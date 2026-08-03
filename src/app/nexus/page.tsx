'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Trophy, Sparkles, Award, QrCode, Brain, Users, BarChart3, 
  ArrowLeft, Flame, Star, CheckCircle2, ShieldCheck, Zap, Layers 
} from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import Navbar from '@/components/Navbar';

const leaderboards = [
  { rank: 1, name: 'عبد الرحمن العتيبي', school: 'مدرسة المسار النموذجية', points: '14,850 XP', level: 'المستوى 18', prizeEligible: true },
  { rank: 2, name: 'سارة أحمد الشهري', school: 'مناهج الفكر الأهلية', points: '13,920 XP', level: 'المستوى 17', prizeEligible: true },
  { rank: 3, name: 'عمر خالد الدوسري', school: 'مدرسة الرواد الرقمية', points: '12,410 XP', level: 'المستوى 16', prizeEligible: true },
  { rank: 4, name: 'فاطمة محمود علي', school: 'مدارس المستقبل الذكية', points: '11,800 XP', level: 'المستوى 15', prizeEligible: true },
  { rank: 5, name: 'يوسف أحمد محمد', school: 'منصة مسار التعليمية', points: '10,950 XP', level: 'المستوى 14', prizeEligible: true },
];

const nexusModules = [
  {
    title: 'نظام الجائزة الكبرى (جائزة المليون)',
    desc: 'مكافأة سنوية تنافسية تصل إلى 1,000,000 ريال للطلاب والمدارس الأكثر تحصيلاً وتفاعلاً.',
    icon: Trophy,
    color: 'from-amber-500 to-yellow-600',
    badge: '1,000,000 SAR',
  },
  {
    title: 'المعلم الذكي والمساعد بالذكاء الاصطناعي (AI Tutor)',
    desc: 'مساعد دراسي تفاعلي 24/7 يجيب على أسئلة الطالب، يشرح الدروس الصعبة، ويعدل الخطة تلقائياً.',
    icon: Brain,
    color: 'from-cyan-600 to-teal-600',
    badge: 'GPT-4 Educational',
  },
  {
    title: 'نظام التحضير الذكي عبر الـ QR Code',
    desc: 'تسجيل الحضور الفعلي والافتراضي تلقائياً عبر مسح الكود، وربطه مباشرةً بنقاط الـ XP.',
    icon: QrCode,
    color: 'from-emerald-600 to-teal-700',
    badge: 'Automated Attendance',
  },
  {
    title: 'لوحة تحكم وتنقيب المدارس (Smart Analytics)',
    desc: 'تحليلات دقيقة للمعلمين والإدارات لمتابعة مستويات الحضور، التحصيل، ومؤشرات الضعف مبكراً.',
    icon: BarChart3,
    color: 'from-indigo-600 to-blue-700',
    badge: 'B2B Enterprise',
  },
];

export default function NexusPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'ai' | 'qr'>('overview');
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiChat, setAiChat] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([
    { role: 'ai', text: 'أهلاً بك في معلم نكسس الذكي! كيف يمكنني مساعدتك اليوم في فهم درس أو حل مسألة؟' }
  ]);

  const handleAiAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim()) return;

    const userMsg = aiQuestion;
    setAiChat((prev) => [...prev, { role: 'user', text: userMsg }]);
    setAiQuestion('');

    setTimeout(() => {
      setAiChat((prev) => [
        ...prev,
        { 
          role: 'ai', 
          text: `بناءً على منهجك الحالي في منصة مسار ونظام NEXUS: إجابة تساؤلك عن "${userMsg}" هي خطوة ممتازة. يمكنك تطبيق طريقة التمثيل البصري والمحسوس لتبسيط المفهموم!` 
        }
      ]);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-cyan-500 selection:text-slate-950" dir="rtl">
      
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 lg:px-8">
          <Link href="/">
            <BrandMark size="md" dark />
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-black text-cyan-400">
              <Zap size={14} className="text-amber-400 animate-pulse" />
              <span>NEXUS EDU Engine Active</span>
            </span>

            <Link
              href="/"
              className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-black text-slate-300 hover:bg-slate-800 transition"
            >
              <ArrowLeft size={16} />
              <span>العودة لمنصة مسار الرئيسية</span>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO BANNER */}
      <section className="relative overflow-hidden border-b border-slate-800 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 py-16 lg:py-24">
        <div className="absolute top-0 right-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 h-96 w-96 rounded-full bg-teal-500/10 blur-[140px] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 lg:px-8 text-center">
          
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs sm:text-sm font-black text-amber-400 mb-6">
            <Trophy size={18} className="animate-bounce" />
            <span>نظام نكسس المدمج لتعليم المدارس والجائزة الكبرى (NEXUS EDU)</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
            الدمج بين <span className="bg-gradient-to-r from-teal-400 via-cyan-300 to-amber-300 bg-clip-text text-transparent">تأهيل مسار</span> و <span className="bg-gradient-to-r from-amber-400 to-yellow-200 bg-clip-text text-transparent">محرك نكسس التفاعلي</span>
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-sm sm:text-base md:text-xl font-bold leading-relaxed text-slate-400">
            منظومة تعليمية متكاملة تجمع بين التشخيص العلاجي لـ د. إسماعيل عيسى، وبين التحفيز بالذكاء الاصطناعي وجائزة المليون للمدارس والطلاب.
          </p>

          {/* Quick Stats Grid */}
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
              <p className="text-2xl sm:text-3xl font-black text-amber-400">1,000,000</p>
              <p className="text-xs font-bold text-slate-400 mt-1">ريال جائزة التنافس السنوية</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
              <p className="text-2xl sm:text-3xl font-black text-cyan-400">24 / 7</p>
              <p className="text-xs font-bold text-slate-400 mt-1">معلم الذكاء الاصطناعي</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
              <p className="text-2xl sm:text-3xl font-black text-teal-400">100%</p>
              <p className="text-xs font-bold text-slate-400 mt-1">تحضير آلي كود QR</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur">
              <p className="text-2xl sm:text-3xl font-black text-indigo-400">B2B + B2C</p>
              <p className="text-xs font-bold text-slate-400 mt-1">تكامل المدارس والأسر</p>
            </div>
          </div>

        </div>
      </section>

      {/* MAIN MODULES INTERACTIVE CONSOLE */}
      <main className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {[
            { id: 'overview', label: 'المميزات العامة', icon: Layers },
            { id: 'leaderboard', label: 'لوحة التنافس والمراكز', icon: Trophy },
            { id: 'ai', label: 'المعلم الذكي (AI Tutor)', icon: Brain },
            { id: 'qr', label: 'نظام الحضور والـ QR', icon: QrCode },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 rounded-xl px-5 py-3 text-xs sm:text-sm font-black transition cursor-pointer ${
                  active
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 scale-105'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <section className="grid gap-6 md:grid-cols-2">
            {nexusModules.map((mod) => {
              const Icon = mod.icon;
              return (
                <div 
                  key={mod.title}
                  className="rounded-3xl border border-slate-800 bg-slate-900/50 p-6 sm:p-8 shadow-xl hover:border-slate-700 transition space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr ${mod.color} text-white shadow-md`}>
                      <Icon size={24} />
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs font-black text-cyan-300">
                      {mod.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-black text-white">{mod.title}</h3>
                  <p className="text-sm font-bold leading-relaxed text-slate-400">{mod.desc}</p>
                </div>
              );
            })}
          </section>
        )}

        {/* TAB 2: LEADERBOARD */}
        {activeTab === 'leaderboard' && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-6">
              <div>
                <h3 className="text-2xl font-black text-white flex items-center gap-2">
                  <Trophy className="text-amber-400" size={24} />
                  <span>قائمة المتصدرين الوطنية لجائزة نكسس</span>
                </h3>
                <p className="text-xs sm:text-sm font-bold text-slate-400 mt-1">
                  تُحتسب النقاط آلياً بناءً على الحضور، إنجاز المهام، وتقييمات د. إسماعيل
                </p>
              </div>

              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2 text-xs font-black text-amber-400">
                الموسم الحالي: 2026
              </div>
            </div>

            <div className="space-y-3">
              {leaderboards.map((item) => (
                <div 
                  key={item.rank}
                  className={`flex items-center justify-between rounded-2xl border p-4 transition ${
                    item.rank === 1 
                      ? 'border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-slate-900 to-slate-900' 
                      : 'border-slate-800 bg-slate-950/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`grid h-9 w-9 place-items-center rounded-xl font-black text-sm ${
                      item.rank === 1 ? 'bg-amber-400 text-slate-950' : item.rank === 2 ? 'bg-slate-300 text-slate-950' : 'bg-amber-700/50 text-amber-200'
                    }`}>
                      #{item.rank}
                    </span>

                    <div>
                      <p className="font-black text-white text-sm sm:text-base">{item.name}</p>
                      <p className="text-xs font-bold text-slate-400">{item.school}</p>
                    </div>
                  </div>

                  <div className="text-left">
                    <p className="font-black text-cyan-400 text-sm sm:text-base">{item.points}</p>
                    <p className="text-[10px] font-bold text-slate-500">{item.level}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 3: AI TUTOR */}
        {activeTab === 'ai' && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 shadow-2xl">
            <div className="border-b border-slate-800 pb-4 mb-6">
              <h3 className="text-2xl font-black text-white flex items-center gap-2">
                <Brain className="text-cyan-400" size={24} />
                <span>المعلم الذكي المباشر (NEXUS AI Tutor)</span>
              </h3>
              <p className="text-xs sm:text-sm font-bold text-slate-400 mt-1">
                يجيب على أسئلة الطالب فوراً بأسلوب مبسط ومناسب لمرحلته الدراسية
              </p>
            </div>

            {/* Chat Box */}
            <div className="space-y-4 max-h-80 overflow-y-auto p-4 rounded-2xl bg-slate-950 border border-slate-800 mb-4">
              {aiChat.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-md rounded-2xl p-4 text-xs sm:text-sm font-bold leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-cyan-600 text-white rounded-tr-none' 
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Question Input */}
            <form onSubmit={handleAiAsk} className="flex gap-2">
              <input
                type="text"
                value={aiQuestion}
                onChange={(e) => setAiQuestion(e.target.value)}
                placeholder="اسأل المعلم الذكي عن أي كلمة، مسألة رياضيات، أو مفهوم..."
                className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs sm:text-sm font-bold text-white outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                className="rounded-xl bg-cyan-500 px-6 py-3 text-xs sm:text-sm font-black text-slate-950 hover:bg-cyan-400 transition cursor-pointer"
              >
                إرسال
              </button>
            </form>
          </section>
        )}

        {/* TAB 4: QR ATTENDANCE */}
        {activeTab === 'qr' && (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl text-center space-y-6 max-w-2xl mx-auto">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-teal-500/10 text-teal-400 border border-teal-500/30">
              <QrCode size={40} />
            </div>

            <div>
              <h3 className="text-2xl font-black text-white">نظام التحضير الذكي (NEXUS QR)</h3>
              <p className="mt-2 text-xs sm:text-sm font-bold text-slate-400 leading-relaxed">
                يقوم الطالب أو ولي الأمر بممسحة كود التقييم أو الحضور اليومي لتسجيل التفاعل آلياً وإضافة نقاط الـ XP مباشرة لحسابه.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-950 p-6 border border-slate-800 inline-block mx-auto">
              <div className="h-40 w-40 mx-auto grid place-items-center rounded-xl bg-white p-2">
                {/* QR Visual */}
                <div className="grid grid-cols-4 gap-1 w-full h-full p-2 bg-slate-900 rounded-lg">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className={`rounded-sm ${i % 3 === 0 ? 'bg-teal-400' : i % 2 === 0 ? 'bg-cyan-300' : 'bg-slate-700'}`} />
                  ))}
                </div>
              </div>
              <p className="text-[10px] font-black text-slate-500 mt-3">كود التفاعل اليومي المعتمد</p>
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
