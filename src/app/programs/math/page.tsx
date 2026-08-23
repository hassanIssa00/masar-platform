'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Check, CheckCircle2, Headphones, Lock, RefreshCw } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { speakWithMasarVoice } from '@/lib/voicePackage';

const numbers = [
  [1, 'وَاحِد'], [2, 'اثْنَان'], [3, 'ثَلَاثَة'], [4, 'أَرْبَعَة'], [5, 'خَمْسَة'],
  [6, 'سِتَّة'], [7, 'سَبْعَة'], [8, 'ثَمَانِيَة'], [9, 'تِسْعَة'], [10, 'عَشَرَة'],
] as const;

const shapes = [
  ['دَائِرَة', 'لا أضلاع'], ['مُثَلَّث', '3 أضلاع'], ['مُرَبَّع', '4 أضلاع متساوية'],
  ['مُسْتَطِيل', '4 أضلاع'], ['مُعَيَّن', '4 أضلاع متساوية'], ['نَجْمَة', '5 نقاط'],
] as const;

const sections = [
  ['guided', 'المسار الموجه'],
  ['numbers', 'الأعداد'],
  ['addition', 'الجمع'],
  ['subtraction', 'الطرح'],
  ['shapes', 'الأشكال'],
  ['compare', 'المقارنات'],
] as const;

type Section = (typeof sections)[number][0];

function genAdd() { return { a: Math.floor(Math.random() * 5) + 1, b: Math.floor(Math.random() * 5) + 1 }; }
function genSub() { const a = Math.floor(Math.random() * 8) + 2; return { a, b: Math.floor(Math.random() * (a - 1)) + 1 }; }

const guidedMath = [
  { title: 'الكمية قبل الرمز', goal: 'يمثل الطالب العدد بقطع محسوسة قبل قراءة الرقم.', task: 'عد 5 قطع ثم اختر الرقم الصحيح.', visual: 5 },
  { title: 'الأكبر والأصغر', goal: 'يقارن الطالب بين كميتين بصريًا ثم يقرأ الرمز.', task: 'قارن بين 7 و3 باستخدام النقاط.', visual: 7 },
  { title: 'تكوين عشرة', goal: 'يبني الطالب العدد من جزأين ويفهم علاقة الجزء بالكل.', task: 'كوّن 10 من 6 و4.', visual: 10 },
  { title: 'الجمع بالمحسوس', goal: 'ينتقل من جمع الأشياء إلى كتابة العملية.', task: 'اجمع 2 + 3 باستخدام النقاط.', visual: 5 },
  { title: 'الطرح كإزالة', goal: 'يفهم الطرح كإزالة كمية وليس حفظ إجراء.', task: 'ابدأ بـ 6 واحذف 2.', visual: 6 },
  { title: 'المسألة اللفظية', goal: 'يقرأ موقفًا سعوديًا بسيطًا من البيت أو المدرسة ويحدد المطلوب.', task: 'مع سالم 4 تمرات وأخذ 2. كم بقي؟', visual: 4 },
];

export default function MathProgramPage() {
  const [section, setSection] = useState<Section>('guided');
  const [openStep, setOpenStep] = useState(0);
  const [add, setAdd] = useState(genAdd());
  const [sub, setSub] = useState(genSub());
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const speak = (text: string) => void speakWithMasarVoice(text, { lang: 'ar-SA', rate: 0.8 });
  const currentGuided = guidedMath[Math.min(openStep, guidedMath.length - 1)];
  const completeStep = () => {
    const next = Math.min(openStep + 1, guidedMath.length - 1);
    setOpenStep(next);
  };

  const check = (correct: number) => setFeedback(Number(answer) === correct ? 'correct' : 'wrong');

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-amber-800">برنامج الرياضيات الحديثة</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">الأعداد، العمليات، الأشكال، المقارنات</h1>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-600">
              نفس أقسام البرنامج الأصلية، لكن بتجربة أوضح للطفل: أرقام كبيرة، تمثيل بصري، تحقق فوري، وصوت.
            </p>
          </header>

          <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
            {sections.map(([key, label]) => (
              <button key={key} onClick={() => { setSection(key); setAnswer(''); setFeedback(null); }} className={`focus-ring shrink-0 rounded-lg border px-5 py-3 text-sm font-black transition ${section === key ? 'border-amber-700 bg-amber-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                {label}
              </button>
            ))}
          </div>

          {section === 'guided' && (
            <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
              <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="relative min-h-52 bg-slate-950 p-6 text-white">
                  <Image src="/learning/math-lab.png" alt="" fill className="object-cover opacity-35" sizes="100vw" />
                  <div className="relative">
                    <p className="text-sm font-black text-amber-200">الدرس المفتوح الآن</p>
                    <h2 className="mt-2 text-3xl font-black">{currentGuided.title}</h2>
                    <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-white/80">{currentGuided.goal}</p>
                  </div>
                </div>
                <div className="p-5 md:p-7">
                  <div className="rounded-lg bg-slate-50 p-5 text-center">
                    <p className="text-sm font-black text-slate-500">مهمة الطالب</p>
                    <h3 className="mt-2 text-2xl font-black text-slate-950">{currentGuided.task}</h3>
                    <div className="mx-auto mt-5 flex max-w-sm flex-wrap justify-center gap-2">
                      {Array.from({ length: currentGuided.visual }).map((_, index) => (
                        <span key={index} className="h-8 w-8 rounded-full bg-teal-700" />
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button onClick={() => speak(`${currentGuided.title}. ${currentGuided.task}`)} className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800">
                      اسمع المهمة
                    </button>
                    <button onClick={completeStep} className="inline-flex items-center gap-2 rounded-lg bg-amber-700 px-6 py-3 text-sm font-black text-white hover:bg-amber-800">
                      <CheckCircle2 size={18} />
                      أتقن الطالب وافتح التالي
                    </button>
                  </div>
                </div>
              </article>

              <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="font-black text-slate-950">خريطة الرياضيات</h3>
                <div className="mt-4 space-y-3">
                  {guidedMath.map((item, index) => {
                    const isOpen = index <= openStep;
                    return (
                      <button key={item.title} disabled={!isOpen} onClick={() => setOpenStep(index)} className={`flex w-full items-center gap-3 rounded-lg p-3 text-right ${isOpen ? 'bg-slate-50 text-slate-950' : 'bg-slate-100 text-slate-400'}`}>
                        {isOpen ? <CheckCircle2 size={18} className="text-amber-700" /> : <Lock size={18} />}
                        <span className="text-sm font-black">{index + 1}. {item.title}</span>
                      </button>
                    );
                  })}
                </div>
              </aside>
            </section>
          )}

          {section === 'numbers' && (
            <section className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {numbers.map(([num, arabic]) => (
                <button key={num} onClick={() => speak(arabic)} className="focus-ring rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1">
                  <span className="block text-6xl font-black text-slate-950">{num}</span>
                  <span className="mt-3 block text-lg font-black text-amber-800">{arabic}</span>
                  <span className="mt-4 flex flex-wrap justify-center gap-1">{Array.from({ length: num }).map((_, i) => <span key={i} className="h-3 w-3 rounded-full bg-teal-700" />)}</span>
                </button>
              ))}
            </section>
          )}

          {section === 'addition' && <Exercise title="اجمع الأرقام التالية" ex={add} sign="+" correct={add.a + add.b} answer={answer} setAnswer={setAnswer} feedback={feedback} check={check} next={() => { setAdd(genAdd()); setAnswer(''); setFeedback(null); }} speak={speak} color="teal" />}
          {section === 'subtraction' && <Exercise title="اطرح الأرقام التالية" ex={sub} sign="-" correct={sub.a - sub.b} answer={answer} setAnswer={setAnswer} feedback={feedback} check={check} next={() => { setSub(genSub()); setAnswer(''); setFeedback(null); }} speak={speak} color="rose" />}

          {section === 'shapes' && (
            <section className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {shapes.map(([name, sides]) => (
                <button key={name} onClick={() => speak(`${name}. ${sides}`)} className="focus-ring rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm hover:bg-slate-50">
                  <div className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-lg bg-slate-100 text-slate-900">
                    <Shape name={name} />
                  </div>
                  <h2 className="text-lg font-black text-slate-950">{name}</h2>
                  <p className="mt-2 text-sm font-bold text-slate-500">{sides}</p>
                </button>
              ))}
            </section>
          )}

          {section === 'compare' && (
            <section className="mt-5 grid gap-4 md:grid-cols-3">
              {[
                [7, 3, '>', 'أكبر من'],
                [4, 9, '<', 'أصغر من'],
                [5, 5, '=', 'يساوي'],
              ].map(([a, b, symbol, label]) => (
                <button key={`${a}-${b}`} onClick={() => speak(`${a} ${label} ${b}`)} className="focus-ring rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
                  <div className="flex items-center justify-center gap-4 text-5xl font-black text-slate-950">
                    <span>{a}</span><span className="text-amber-700">{symbol}</span><span>{b}</span>
                  </div>
                  <p className="mt-4 text-lg font-black text-slate-700">{label}</p>
                </button>
              ))}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function Exercise({ title, ex, sign, correct, answer, setAnswer, feedback, check, next, speak, color }: {
  title: string; ex: { a: number; b: number }; sign: '+' | '-'; correct: number; answer: string; setAnswer: (v: string) => void; feedback: 'correct' | 'wrong' | null; check: (n: number) => void; next: () => void; speak: (t: string) => void; color: 'teal' | 'rose';
}) {
  const main = color === 'teal' ? 'bg-teal-700 hover:bg-teal-800' : 'bg-rose-700 hover:bg-rose-800';
  return (
    <section className="mx-auto mt-6 max-w-3xl rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm md:p-8">
      <h2 className="text-2xl font-black text-slate-950">{title}</h2>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
        <NumberBlock value={ex.a} />
        <span className="text-5xl font-black text-amber-700">{sign}</span>
        <NumberBlock value={ex.b} />
        <span className="text-5xl font-black text-slate-400">=</span>
        <input value={answer} onChange={(e) => { setAnswer(e.target.value); }} type="number" className="h-24 w-28 rounded-lg border-4 border-slate-200 text-center text-5xl font-black outline-none focus:border-teal-700" placeholder="؟" />
      </div>
      {feedback && <p className={`mt-5 text-xl font-black ${feedback === 'correct' ? 'text-emerald-700' : 'text-rose-700'}`}>{feedback === 'correct' ? 'إجابة صحيحة' : 'حاول مرة أخرى'}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button onClick={() => check(correct)} className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-black text-white ${main}`}><Check size={17} /> تحقق</button>
        <button onClick={() => speak(`${ex.a} ${sign === '+' ? 'زائد' : 'ناقص'} ${ex.b} يساوي ${correct}`)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-6 py-3 text-sm font-black text-slate-800"><Headphones size={17} /> اسمع</button>
        <button onClick={next} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-6 py-3 text-sm font-black text-slate-800"><RefreshCw size={17} /> سؤال جديد</button>
      </div>
    </section>
  );
}

function NumberBlock({ value }: { value: number }) {
  return (
    <div>
      <p className="text-7xl font-black text-slate-950">{value}</p>
      <div className="mt-3 flex max-w-36 flex-wrap justify-center gap-1">{Array.from({ length: value }).map((_, i) => <span key={i} className="h-3 w-3 rounded-full bg-teal-700" />)}</div>
    </div>
  );
}

function Shape({ name }: { name: string }) {
  if (name.includes('دَائِرَة')) return <span className="h-12 w-12 rounded-full border-4 border-teal-700" />;
  if (name.includes('مُثَلَّث')) return <span className="h-0 w-0 border-x-[28px] border-b-[48px] border-x-transparent border-b-amber-700" />;
  if (name.includes('مُرَبَّع')) return <span className="h-12 w-12 bg-teal-700" />;
  if (name.includes('مُسْتَطِيل')) return <span className="h-10 w-16 bg-emerald-700" />;
  if (name.includes('مُعَيَّن')) return <span className="h-12 w-12 rotate-45 bg-sky-700" />;
  return <span className="text-5xl font-black text-amber-700">★</span>;
}
