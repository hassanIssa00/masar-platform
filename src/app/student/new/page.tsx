'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const steps = ['بيانات', 'فحص سريع', 'اختيار مسار', 'خطة أول أسبوع'];

const screening = [
  { area: 'قراءة', skill: 'يميز أصوات الحروف قبل شكلها', risk: 'خلط صوتي أو تخمين قراءة' },
  { area: 'كتابة', skill: 'يكتب كلمة بعد تقطيعها أصواتا', risk: 'إملاء بصري بلا قاعدة' },
  { area: 'رياضيات', skill: 'يربط الرقم بكمية محسوسة', risk: 'حفظ رمز دون معنى' },
  { area: 'انتباه', skill: 'ينفذ تعليمات من خطوتين', risk: 'ذاكرة عاملة ضعيفة' },
  { area: 'تخاطب', skill: 'ينطق الصوت داخل كلمة قصيرة', risk: 'صعوبة مخرج أو طلاقة' },
  { area: 'سلوك', skill: 'يطلب مساعدة بدل الانسحاب', risk: 'سلوك هروب من المهمة' },
];

const programChoices = [
  { title: 'القراءة والكتابة', href: '/programs/reading', reason: 'وعي صوتي، مقاطع، إملاء، طلاقة' },
  { title: 'الرياضيات', href: '/programs/math', reason: 'محسوس، مرسوم، رمز، مسائل' },
  { title: 'صعوبات التعلم', href: '/programs/learning-difficulties', reason: 'خطة فردية ومهارات تنفيذية' },
];

export default function NewStudentWizard() {
  const [step, setStep] = useState(0);
  const [selectedRisks, setSelectedRisks] = useState<string[]>(['قراءة', 'انتباه']);

  const recommended = useMemo(() => {
    if (selectedRisks.includes('رياضيات')) return 'الرياضيات';
    if (selectedRisks.includes('تخاطب')) return 'التخاطب والنطق';
    if (selectedRisks.includes('سلوك')) return 'تعديل السلوك';
    return 'القراءة والكتابة';
  }, [selectedRisks]);

  const toggleRisk = (area: string) => {
    setSelectedRisks((items) => (items.includes(area) ? items.filter((item) => item !== area) : [...items, area]));
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <Navbar />
      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6">
          <p className="text-sm font-black text-stone-500">تسكين طالب جديد</p>
          <h1 className="text-3xl font-black text-stone-950">تشخيص قصير ينتج خطة قابلة للتنفيذ</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
            <div className="space-y-2">
              {steps.map((label, index) => (
                <button
                  key={label}
                  onClick={() => setStep(index)}
                  className={`w-full rounded-lg p-3 text-right text-sm font-black transition ${
                    step === index ? 'bg-stone-950 text-white' : 'bg-stone-50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  <span className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/15">{index + 1}</span>
                  {label}
                </button>
              ))}
            </div>
          </aside>

          <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm md:p-7">
            {step === 0 && (
              <div className="grid gap-5 md:grid-cols-2">
                {['اسم الطالب', 'تاريخ الميلاد', 'الصف الدراسي', 'ولي الأمر'].map((label) => (
                  <label key={label} className="block">
                    <span className="mb-2 block text-sm font-black text-stone-700">{label}</span>
                    <input className="w-full rounded-lg border border-black/10 bg-stone-50 px-4 py-3 outline-none focus:border-stone-950" placeholder={label} />
                  </label>
                ))}
              </div>
            )}

            {step === 1 && (
              <div>
                <h2 className="text-2xl font-black text-stone-950">فحص مهارات سريع</h2>
                <p className="mt-2 text-sm leading-7 text-stone-600">اختار المهارات الضعيفة. النظام يقترح مسارا أوليا، والأخصائي يراجع بعد أول جلستين.</p>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {screening.map((item) => (
                    <button
                      key={item.area}
                      onClick={() => toggleRisk(item.area)}
                      className={`rounded-lg border p-4 text-right transition ${
                        selectedRisks.includes(item.area) ? 'border-[#1f6f63] bg-emerald-50' : 'border-black/10 bg-white hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="font-black text-stone-950">{item.area}</h3>
                        <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-black text-white">{selectedRisks.includes(item.area) ? 'مختار' : 'فحص'}</span>
                      </div>
                      <p className="mt-2 text-sm font-bold text-stone-700">{item.skill}</p>
                      <p className="mt-2 text-xs leading-6 text-stone-500">{item.risk}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-2xl font-black text-stone-950">المسار المقترح: {recommended}</h2>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {programChoices.map((program) => (
                    <Link key={program.href} href={program.href} className="rounded-lg border border-black/10 bg-stone-50 p-4 transition hover:bg-white hover:shadow-sm">
                      <h3 className="font-black text-stone-950">{program.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-stone-600">{program.reason}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-2xl font-black text-stone-950">خطة أول أسبوع</h2>
                <div className="mt-5 grid gap-3">
                  {[
                    ['هدف واحد', 'تثبيت مهارة واحدة فقط قبل إضافة مهارة جديدة.'],
                    ['جلسة قصيرة', '5 دقائق تهيئة، 15 دقيقة تدريب، 5 دقائق قياس خروج.'],
                    ['واجب بيت', 'نشاط 7 دقائق يوميا، بدون ضغط أو شرح طويل.'],
                    ['قرار الانتقال', 'الانتقال بعد 80% دقة مع مساعدة قليلة.'],
                  ].map(([title, body]) => (
                    <div key={title} className="rounded-lg bg-stone-50 p-4">
                      <h3 className="font-black text-stone-950">{title}</h3>
                      <p className="mt-1 text-sm leading-7 text-stone-600">{body}</p>
                    </div>
                  ))}
                </div>
                <Link href={`/learn/${recommended === 'الرياضيات' ? 'math' : 'reading'}`} className="mt-6 inline-flex rounded-lg bg-stone-950 px-6 py-3 text-sm font-black text-white hover:bg-stone-800">
                  افتح أول نشاط للطفل
                </Link>
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-black/10 pt-5">
              <button onClick={() => setStep(Math.max(step - 1, 0))} className="rounded-lg border border-black/10 px-5 py-3 text-sm font-black text-stone-700 hover:bg-stone-50">
                السابق
              </button>
              <button onClick={() => setStep(Math.min(step + 1, steps.length - 1))} className="rounded-lg bg-[#1f6f63] px-6 py-3 text-sm font-black text-white hover:bg-[#18584f]">
                التالي
              </button>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
