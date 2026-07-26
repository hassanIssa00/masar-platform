'use client';

import { useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

const reports = [
  {
    id: 'r-102',
    student: 'أحمد محمود',
    program: 'القراءة والكتابة',
    score: 68,
    decision: 'تدخل مركز',
    strongest: 'فهم جملة قصيرة',
    priority: 'وعي صوتي وفك ترميز',
    next: '6 جلسات وقياس خروج بعد كل جلسة',
    domains: [
      ['وعي صوتي', 50],
      ['فك ترميز', 60],
      ['إملاء', 70],
      ['فهم', 90],
    ],
  },
  {
    id: 'r-118',
    student: 'ليان عبدالله',
    program: 'التواصل والروتين',
    score: 75,
    decision: 'استمرار وتعميم',
    strongest: 'اختيار بصري',
    priority: 'انتظار الدور',
    next: 'تعميم في البيت والمدرسة',
    domains: [
      ['طلب وظيفي', 80],
      ['انتقال', 70],
      ['انتظار', 55],
      ['تنظيم', 95],
    ],
  },
];

export default function ReportsPage() {
  const [selectedId, setSelectedId] = useState(reports[0].id);
  const selected = reports.find((report) => report.id === selectedId)!;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-5 py-8 lg:px-10">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-stone-500">تقارير تحليلية</p>
              <h1 className="text-3xl font-black text-stone-950">قرار تعليمي بعد كل اختبار</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">
                التقرير هنا لا يعرض درجة فقط؛ يفصل المجالات، يحدد أولوية التدخل، ويقترح متى يعاد القياس.
              </p>
            </div>
            <Link href="/assessment/reading" className="rounded-lg bg-stone-950 px-5 py-3 text-sm font-black text-white hover:bg-stone-800">
              إنشاء تقرير من اختبار
            </Link>
          </div>

          <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
            <aside className="rounded-lg border border-black/10 bg-white p-4 shadow-sm">
              <p className="text-xs font-black text-stone-500">آخر التقارير</p>
              <div className="mt-3 space-y-2">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedId(report.id)}
                    className={`w-full rounded-lg border p-4 text-right transition ${
                      selectedId === report.id ? 'border-stone-950 bg-stone-950 text-white' : 'border-black/10 bg-white text-stone-800 hover:bg-stone-50'
                    }`}
                  >
                    <h2 className="font-black">{report.student}</h2>
                    <p className="mt-1 text-sm opacity-75">{report.program}</p>
                  </button>
                ))}
              </div>
            </aside>

            <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm md:p-7">
              <div className="grid gap-4 border-b border-black/10 pb-5 md:grid-cols-4">
                {[
                  ['الطالب', selected.student],
                  ['المسار', selected.program],
                  ['القرار', selected.decision],
                  ['الدرجة', `${selected.score}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-stone-50 p-4">
                    <p className="text-xs font-black text-stone-500">{label}</p>
                    <p className="mt-2 font-black text-stone-950">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
                <div>
                  <h2 className="text-xl font-black text-stone-950">تحليل المجالات</h2>
                  <div className="mt-4 space-y-3">
                    {selected.domains.map(([domain, score]) => (
                      <div key={domain} className="rounded-lg bg-stone-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-black text-stone-950">{domain}</h3>
                          <span className="text-sm font-black text-stone-700">{score}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                          <div className="h-full rounded-full bg-[#1f6f63]" style={{ width: `${score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <Info title="نقطة قوة" body={selected.strongest} />
                  <Info title="أولوية التدخل" body={selected.priority} />
                  <Info title="الخطوة التالية" body={selected.next} />
                  <div className="rounded-lg border border-black/10 p-4">
                    <h3 className="font-black text-stone-950">قاعدة القرار</h3>
                    <p className="mt-2 text-sm leading-7 text-stone-600">
                      أقل من 60%: إعادة تدريس. من 60% إلى 79%: تدريب مركز. 80% أو أكثر: انتقال مع مراجعة متباعدة.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

function Info({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg bg-stone-50 p-4">
      <p className="text-xs font-black text-stone-500">{title}</p>
      <p className="mt-2 text-sm font-bold leading-7 text-stone-800">{body}</p>
    </div>
  );
}
