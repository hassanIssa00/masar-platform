'use client';

import { useState } from 'react';
import { Headphones, Printer, Volume2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

const letters = [
  ['أ', 'ألف', 'أسد'], ['ب', 'باء', 'بيت'], ['ت', 'تاء', 'تفاح'], ['ث', 'ثاء', 'ثوب'],
  ['ج', 'جيم', 'جمل'], ['ح', 'حاء', 'حصان'], ['خ', 'خاء', 'خبز'], ['د', 'دال', 'دار'],
  ['ذ', 'ذال', 'ذهب'], ['ر', 'راء', 'رمان'], ['ز', 'زاي', 'زرافة'], ['س', 'سين', 'سمكة'],
  ['ش', 'شين', 'شمس'], ['ص', 'صاد', 'صقر'], ['ض', 'ضاد', 'ضوء'], ['ط', 'طاء', 'طائرة'],
  ['ظ', 'ظاء', 'ظرف'], ['ع', 'عين', 'عنب'], ['غ', 'غين', 'غزال'], ['ف', 'فاء', 'فيل'],
  ['ق', 'قاف', 'قمر'], ['ك', 'كاف', 'كتاب'], ['ل', 'لام', 'ليمون'], ['م', 'ميم', 'موز'],
  ['ن', 'نون', 'نجمة'], ['هـ', 'هاء', 'هلال'], ['و', 'واو', 'وردة'], ['ي', 'ياء', 'يد'],
];

const words = [
  ['بَيْت', 'المسكن', ['ب', 'ي', 'ت']],
  ['كِتَاب', 'وعاء العلم', ['ك', 'ت', 'ا', 'ب']],
  ['قَمَر', 'نور الليل', ['ق', 'م', 'ر']],
  ['شَمْس', 'نور النهار', ['ش', 'م', 'س']],
  ['سَمَكَة', 'حيوان مائي', ['س', 'م', 'ك', 'ة']],
  ['وَرْدَة', 'زهرة جميلة', ['و', 'ر', 'د', 'ة']],
] as const;

const sentences = [
  'الْعِلْمُ نُورٌ.',
  'الطِّفْلُ يَقْرَأُ كِتَابًا.',
  'أُحِبُّ أُمِّي وَأَبِي.',
  'رَامِي فَتَحَ بَابَ الدَّارِ.',
];

export default function ReadingProgramPage() {
  const [level, setLevel] = useState<'letters' | 'words' | 'sentences'>('letters');
  const [selectedLetter, setSelectedLetter] = useState(letters[0]);

  const speak = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.75;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-black text-teal-800">برنامج القراءة والكتابة</p>
                <h1 className="mt-2 text-3xl font-black text-slate-950">الحروف، الكلمات، الجمل</h1>
                <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-600">
                  نفس محتوى البرنامج الأصلي مع عرض أوضح: استماع، اختيار، تفكيك الكلمة، وطباعة أوراق العمل.
                </p>
              </div>
              <button onClick={() => window.print()} className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">
                <Printer size={17} />
                طباعة أوراق العمل
              </button>
            </div>
          </header>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              ['letters', 'مستوى أول: الحروف'],
              ['words', 'مستوى ثاني: الكلمات'],
              ['sentences', 'مستوى ثالث: الجمل'],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setLevel(key as typeof level)} className={`focus-ring rounded-lg border px-4 py-3 text-sm font-black transition ${level === key ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                {label}
              </button>
            ))}
          </div>

          {level === 'letters' && (
            <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_340px]">
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 xl:grid-cols-7">
                {letters.map((item) => (
                  <button key={item[0]} onClick={() => setSelectedLetter(item)} className={`focus-ring rounded-lg border bg-white p-4 text-center shadow-sm transition hover:-translate-y-1 ${selectedLetter[0] === item[0] ? 'border-teal-700 ring-2 ring-teal-100' : 'border-slate-200'}`}>
                    <span className="block text-4xl font-black text-slate-950">{item[0]}</span>
                    <span className="mt-2 block text-xs font-black text-slate-500">{item[1]}</span>
                  </button>
                ))}
              </div>
              <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-slate-500">بطاقة الحرف</p>
                <div className="mt-4 rounded-lg bg-slate-50 p-6 text-center">
                  <p className="text-8xl font-black text-teal-800">{selectedLetter[0]}</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{selectedLetter[1]}</h2>
                  <p className="mt-2 text-lg font-bold text-slate-600">مثال: {selectedLetter[2]}</p>
                </div>
                <button onClick={() => speak(`${selectedLetter[1]}. مثال: ${selectedLetter[2]}`)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                  <Volume2 size={17} />
                  استمع للحرف
                </button>
              </aside>
            </section>
          )}

          {level === 'words' && (
            <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {words.map(([word, meaning, parts]) => (
                <article key={word} className="rounded-lg border border-slate-200 bg-white p-5 text-center shadow-sm">
                  <p className="text-4xl font-black text-teal-800">{word}</p>
                  <p className="mt-2 text-sm font-bold text-slate-500">{meaning}</p>
                  <div className="mt-4 flex justify-center gap-2">
                    {parts.map((part, index) => (
                      <span key={`${word}-${part}-${index}`} className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 text-xl font-black text-slate-900">{part}</span>
                    ))}
                  </div>
                  <button onClick={() => speak(word)} className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white">
                    <Headphones size={17} />
                    استمع
                  </button>
                </article>
              ))}
            </section>
          )}

          {level === 'sentences' && (
            <section className="mt-5 grid gap-4">
              {sentences.map((sentence) => (
                <article key={sentence} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-2xl font-black leading-10 text-slate-950">{sentence}</p>
                    <button onClick={() => speak(sentence)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white">
                      <Volume2 size={17} />
                      استمع للجملة
                    </button>
                  </div>
                </article>
              ))}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
