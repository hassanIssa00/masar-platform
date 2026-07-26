'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { LearningStudioProgram } from '@/data/learningStudio';

type LearningStudioProps = {
  program: LearningStudioProgram;
};

export default function LearningStudio({ program }: LearningStudioProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [activityIndex, setActivityIndex] = useState(0);
  const [selected, setSelected] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);
  const stage = program.stages[stageIndex];
  const activity = stage.activities[activityIndex];

  const progress = useMemo(() => {
    const total = program.stages.reduce((sum, item) => sum + item.activities.length, 0);
    const doneBefore = program.stages
      .slice(0, stageIndex)
      .reduce((sum, item) => sum + item.activities.length, 0);
    return Math.round(((doneBefore + activityIndex + (correct > 0 ? 1 : 0)) / total) * 100);
  }, [activityIndex, correct, program.stages, stageIndex]);

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith('ar'));
    if (arabicVoice) utterance.voice = arabicVoice;
    utterance.lang = 'ar-SA';
    utterance.rate = 0.72;
    utterance.pitch = 1;
    utterance.volume = 1;
    window.speechSynthesis.speak(utterance);
  };

  const answer = (value: string) => {
    setSelected(value);
    setAttempts((count) => count + 1);
    const isCorrect = value === activity.correct;
    if (isCorrect) {
      setCorrect((count) => count + 1);
      speak(`إجابة صحيحة. ${activity.target}`);
    } else {
      speak(`حاول مرة أخرى. ${activity.scaffold}`);
    }
  };

  const next = () => {
    setSelected('');
    if (activityIndex < stage.activities.length - 1) {
      setActivityIndex((index) => index + 1);
      return;
    }
    if (stageIndex < program.stages.length - 1) {
      setStageIndex((index) => index + 1);
      setActivityIndex(0);
    }
  };

  const resetActivity = () => {
    setSelected('');
    speak(activity.speak);
  };

  return (
    <main className="min-h-screen" style={{ backgroundColor: program.background }}>
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-4 md:px-8">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 bg-white/85 p-3 shadow-sm backdrop-blur">
          <Link href={`/programs/${program.slug}`} className="rounded-lg px-4 py-2 text-sm font-black text-stone-700 hover:bg-stone-100">
            رجوع للمنهج
          </Link>
          <div className="text-center">
            <p className="text-xs font-black text-stone-500">{program.title}</p>
            <h1 className="text-xl font-black text-stone-950 md:text-3xl">{program.childTitle}</h1>
          </div>
          <div className="rounded-lg bg-stone-950 px-4 py-2 text-sm font-black text-white">{progress}% تقدم</div>
        </header>

        <section className="mt-4 grid flex-1 gap-4 lg:grid-cols-[280px_1fr_320px]">
          <aside className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-sm backdrop-blur">
            <p className="text-xs font-black text-stone-500">الخريطة</p>
            <div className="mt-4 space-y-2">
              {program.stages.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setStageIndex(index);
                    setActivityIndex(0);
                    setSelected('');
                  }}
                  className={`w-full rounded-lg border p-3 text-right transition ${
                    index === stageIndex ? 'border-stone-950 bg-stone-950 text-white' : 'border-black/10 bg-white text-stone-800 hover:bg-stone-50'
                  }`}
                >
                  <span className="block text-xs font-black opacity-70">مرحلة {index + 1}</span>
                  <span className="mt-1 block font-black">{item.title}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-h-[560px] flex-col rounded-lg border border-black/10 bg-white p-5 shadow-sm md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-black/10 pb-5">
              <div>
                <p className="text-sm font-black" style={{ color: program.color }}>
                  {stage.childGoal}
                </p>
                <h2 className="mt-2 text-2xl font-black text-stone-950 md:text-4xl">{activity.title}</h2>
              </div>
              <button
                onClick={() => speak(activity.speak)}
                className="rounded-lg px-5 py-3 text-sm font-black text-white shadow-sm transition hover:brightness-95"
                style={{ backgroundColor: program.color }}
              >
                اسمع بوضوح
              </button>
            </div>

            <div className="grid flex-1 place-items-center py-8">
              <div className="w-full max-w-3xl text-center">
                <p className="text-lg font-bold leading-9 text-stone-700">{activity.prompt}</p>
                <div
                  className="mx-auto mt-6 flex min-h-40 w-full max-w-xl items-center justify-center rounded-lg border-2 border-dashed bg-stone-50 px-6 py-8 text-5xl font-black leading-tight text-stone-950 md:text-7xl"
                  style={{ borderColor: program.color }}
                >
                  {activity.target}
                </div>

                {activity.options && (
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    {activity.options.map((option) => {
                      const isSelected = selected === option;
                      const isCorrect = isSelected && option === activity.correct;
                      const isWrong = isSelected && option !== activity.correct;
                      return (
                        <button
                          key={option}
                          onClick={() => answer(option)}
                          className={`min-h-20 rounded-lg border-2 px-4 py-3 text-2xl font-black transition ${
                            isCorrect
                              ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                              : isWrong
                                ? 'border-red-700 bg-red-50 text-red-800'
                                : 'border-black/10 bg-white text-stone-950 hover:bg-stone-50'
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/10 pt-5">
              <button onClick={resetActivity} className="rounded-lg border border-black/10 bg-white px-5 py-3 text-sm font-black text-stone-800 hover:bg-stone-50">
                إعادة الصوت
              </button>
              <button onClick={next} className="rounded-lg bg-stone-950 px-6 py-3 text-sm font-black text-white hover:bg-stone-800">
                النشاط التالي
              </button>
            </div>
          </section>

          <aside className="rounded-lg border border-black/10 bg-white/85 p-4 shadow-sm backdrop-blur">
            <p className="text-xs font-black text-stone-500">للأخصائي</p>
            <h2 className="mt-2 text-lg font-black text-stone-950">مؤشر الإتقان</h2>
            <p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm font-bold leading-7 text-stone-700">{activity.mastery}</p>
            <h3 className="mt-5 text-sm font-black text-stone-950">لو الطفل تعثر</h3>
            <p className="mt-2 text-sm leading-7 text-stone-600">{activity.scaffold}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric label="محاولات" value={attempts} />
              <Metric label="صحيح" value={correct} />
            </div>
            <div className="mt-5 rounded-lg border border-black/10 bg-white p-3">
              <p className="text-xs font-black text-stone-500">قاعدة التدريس</p>
              <p className="mt-2 text-sm leading-7 text-stone-700">{program.method}</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-stone-950 p-3 text-center text-white">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-bold text-white/70">{label}</p>
    </div>
  );
}
