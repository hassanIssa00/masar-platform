'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AssessmentBlueprint } from '@/data/assessments';

type AssessmentStudioProps = {
  blueprint: AssessmentBlueprint;
};

type AnswerMap = Record<string, string>;

export default function AssessmentStudio({ blueprint }: AssessmentStudioProps) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const item = blueprint.items[activeIndex];

  const report = useMemo(() => {
    const domainStats = blueprint.domains.map((domain) => {
      const domainItems = blueprint.items.filter((entry) => entry.domain === domain);
      const correct = domainItems.filter((entry) => answers[entry.id] === entry.correct).length;
      const answered = domainItems.filter((entry) => answers[entry.id]).length;
      const score = domainItems.length ? Math.round((correct / domainItems.length) * 100) : 0;
      return { domain, correct, answered, total: domainItems.length, score };
    });
    const totalCorrect = blueprint.items.filter((entry) => answers[entry.id] === entry.correct).length;
    const totalScore = Math.round((totalCorrect / blueprint.items.length) * 100);
    const weakest = [...domainStats].sort((a, b) => a.score - b.score)[0];
    const strongest = [...domainStats].sort((a, b) => b.score - a.score)[0];
    return { domainStats, totalCorrect, totalScore, weakest, strongest };
  }, [answers, blueprint.domains, blueprint.items]);

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith('ar'));
    if (arabicVoice) utterance.voice = arabicVoice;
    utterance.lang = 'ar-SA';
    utterance.rate = 0.72;
    window.speechSynthesis.speak(utterance);
  };

  const choose = (value: string) => {
    setAnswers((current) => ({ ...current, [item.id]: value }));
    speak(value === item.correct ? 'إجابة صحيحة' : 'إجابة غير صحيحة. سنسجلها للتدخل.');
  };

  const finished = Object.keys(answers).length === blueprint.items.length;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[1fr_360px] lg:px-8">
        <section className="rounded-lg border border-black/10 bg-white p-4 shadow-sm md:p-6">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-4">
            <div>
              <p className="text-xs font-black text-stone-500">Assessment Studio</p>
              <h1 className="text-2xl font-black text-stone-950 md:text-4xl">{blueprint.title}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">{blueprint.shortPurpose}</p>
            </div>
            <Link href={`/programs/${blueprint.slug}`} className="rounded-lg border border-black/10 px-4 py-3 text-sm font-black text-stone-800 hover:bg-stone-50">
              الرجوع للمنهج
            </Link>
          </header>

          <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="relative min-h-60 overflow-hidden rounded-lg bg-stone-100 md:min-h-80">
              <Image src={blueprint.image} alt="" fill sizes="(max-width: 768px) 100vw, 45vw" className="object-cover" priority />
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-700">
                  سؤال {activeIndex + 1} من {blueprint.items.length}
                </span>
                <button onClick={() => speak(item.speak)} className="rounded-lg bg-stone-950 px-4 py-3 text-sm font-black text-white hover:bg-stone-800">
                  اسمع السؤال
                </button>
              </div>
              <p className="text-sm font-black text-[#1f6f63]">{item.domain} / {item.skill}</p>
              <h2 className="mt-3 text-2xl font-black leading-tight text-stone-950 md:text-4xl">{item.prompt}</h2>
              <div className="mt-6 grid gap-3">
                {item.options.map((option) => {
                  const selected = answers[item.id] === option;
                  return (
                    <button
                      key={option}
                      onClick={() => choose(option)}
                      className={`rounded-lg border-2 px-4 py-4 text-right text-xl font-black transition ${
                        selected ? 'border-[#1f6f63] bg-emerald-50 text-emerald-900' : 'border-black/10 bg-white text-stone-950 hover:bg-stone-50'
                      }`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <p className="mt-4 rounded-lg bg-stone-50 p-3 text-sm leading-7 text-stone-600">{item.scoringNote}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-4">
            <button onClick={() => setActiveIndex(Math.max(activeIndex - 1, 0))} className="rounded-lg border border-black/10 px-5 py-3 text-sm font-black text-stone-700 hover:bg-stone-50">
              السابق
            </button>
            <button onClick={() => setActiveIndex(Math.min(activeIndex + 1, blueprint.items.length - 1))} className="rounded-lg bg-[#1f6f63] px-6 py-3 text-sm font-black text-white hover:bg-[#18584f]">
              التالي
            </button>
          </div>
        </section>

        <aside className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
          <p className="text-xs font-black text-stone-500">تقرير فوري</p>
          <div className="mt-3 rounded-lg bg-stone-950 p-5 text-center text-white">
            <p className="text-5xl font-black">{report.totalScore}%</p>
            <p className="mt-2 text-sm font-bold text-white/75">الدرجة الحالية</p>
          </div>

          <div className="mt-4 space-y-3">
            {report.domainStats.map((domain) => (
              <div key={domain.domain} className="rounded-lg bg-stone-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black text-stone-950">{domain.domain}</h3>
                  <span className="text-sm font-black text-stone-700">{domain.score}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-[#1f6f63]" style={{ width: `${domain.score}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-black/10 p-4">
            <h2 className="font-black text-stone-950">تحليل التقرير</h2>
            <p className="mt-2 text-sm leading-7 text-stone-600">
              أقوى مجال: {report.strongest?.domain}. أولوية التدخل: {report.weakest?.domain}. يعاد القياس بعد 6 جلسات أو عند وصول الدقة إلى 80%.
            </p>
          </div>

          {finished && (
            <Link href="/reports" className="mt-4 block rounded-lg bg-stone-950 px-5 py-3 text-center text-sm font-black text-white hover:bg-stone-800">
              فتح صفحة التقارير
            </Link>
          )}
        </aside>
      </div>
    </main>
  );
}
