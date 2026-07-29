'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ClipboardCheck, Printer, Target } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { decisionRules, getDecisionFromScore } from '@/data/assessmentModel';

const reports = [
  {
    id: 'r001',
    studentName: 'عمر خالد',
    grade: 'الصف الثالث',
    program: 'القراءة والكتابة',
    programColor: '#1f6f63',
    date: '2024-07-15',
    summary: 'يُعاني الطالب من صعوبات في التمييز بين الحروف المتشابهة وقراءة الكلمات المركّبة. يُوصى ببرنامج الوعي الصوتي متعدد الحواس.',
    status: 'completed',
    score: 65,
  },
  {
    id: 'r002',
    studentName: 'لينا محمد',
    grade: 'الصف الأول',
    program: 'طيف التوحد',
    programColor: '#2d708f',
    date: '2024-07-10',
    summary: 'تُظهر الطالبة تحسناً في مهارات التواصل البصري. لا تزال تحتاج دعماً في المهارات الاجتماعية والروتين البصري.',
    status: 'completed',
    score: 72,
  },
  {
    id: 'r003',
    studentName: 'ياسين علي',
    grade: 'الصف الرابع',
    program: 'التخاطب والنطق',
    programColor: '#63508f',
    date: '2024-07-08',
    summary: 'يُعاني الطالب من تأتأة عند بداية الجمل وصعوبة في نطق حرفي ص وض. يستجيب لتمارين التنفس وإيقاع الكلام.',
    status: 'pending',
    score: 58,
  },
  {
    id: 'r004',
    studentName: 'سارة أحمد',
    grade: 'الصف الثاني',
    program: 'الرياضيات',
    programColor: '#a6532c',
    date: '2024-07-05',
    summary: 'تُواجه الطالبة صعوبة في إدراك مفهوم الأرقام وربطها بالكميات. أداء جيد في الأشكال الهندسية.',
    status: 'completed',
    score: 70,
  },
];

const filters = ['all', 'القراءة', 'الرياضيات', 'التخاطب', 'طيف التوحد'];

export default function ReportsPage() {
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const filtered = useMemo(() => (filter === 'all' ? reports : reports.filter((report) => report.program.includes(filter))), [filter]);
  const selected = reports.find((report) => report.id === selectedId);

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#15803d';
    if (score >= 50) return '#b7791f';
    return '#b91c1c';
  };

  if (selected) {
    const decision = getDecisionFromScore(selected.score);

    return (
      <div className="min-h-screen bg-[var(--background)] text-slate-950">
        <Navbar />
        <div className="flex">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
            <button onClick={() => setSelectedId(null)} className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
              <ArrowRight size={17} />
              العودة إلى التقارير
            </button>

            <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-200 bg-slate-950 p-6 text-white">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="text-3xl font-black">تقرير تقييم شامل</h1>
                    <p className="mt-2 text-sm font-bold text-white/70">منصة مسار التأهيل للتعليم وعلاج صعوبات التعلم</p>
                  </div>
                  <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/10 px-5 py-3 text-sm font-black text-white ring-1 ring-white/20">
                    <Printer size={17} />
                    طباعة / PDF
                  </button>
                </div>
              </header>

              <div className="p-5 md:p-7">
                <div className="grid gap-3 md:grid-cols-4">
                  {[
                    ['اسم الطالب', selected.studentName],
                    ['الصف الدراسي', selected.grade],
                    ['البرنامج', selected.program],
                    ['تاريخ التقرير', selected.date],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 p-4">
                      <p className="text-xs font-black text-slate-500">{label}</p>
                      <p className="mt-2 font-black text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>

                <section className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-lg bg-slate-50 p-5">
                    <h2 className="text-lg font-black text-slate-950">الدرجة الكلية للتقييم</h2>
                    <p className="mt-3 text-5xl font-black" style={{ color: getScoreColor(selected.score) }}>{selected.score}%</p>
                    <p className="mt-2 text-sm font-bold text-slate-600">{selected.score >= 75 ? 'مستوى جيد' : selected.score >= 50 ? 'يحتاج متابعة' : 'يحتاج تدخلاً فورياً'}</p>
                  </div>
                  <div className="rounded-lg border border-teal-100 bg-teal-50 p-5">
                    <div className="flex items-start gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-lg bg-white text-teal-800 ring-1 ring-teal-100">
                        <Target size={21} />
                      </span>
                      <div>
                        <p className="text-xs font-black text-teal-800">قاعدة القرار</p>
                        <h2 className="mt-1 text-xl font-black text-slate-950">{decision.label}</h2>
                      </div>
                    </div>
                    <p className="mt-4 text-sm font-bold leading-7 text-slate-700">{decision.action}</p>
                    <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-teal-900 ring-1 ring-teal-100">{decision.range}</p>
                  </div>
                </section>

                <section className="mt-6">
                  <h2 className="text-xl font-black text-slate-950">ملخص التقييم</h2>
                  <p className="mt-3 rounded-lg border border-slate-200 bg-white p-5 text-sm font-bold leading-8 text-slate-700">{selected.summary}</p>
                </section>

                <section className="mt-6">
                  <h2 className="text-xl font-black text-slate-950">التوصيات والخطة العلاجية</h2>
                  <div className="mt-3 grid gap-3">
                    {[
                      'البدء بتدخل قصير ومحدد حسب مجال الضعف الأعلى أثراً.',
                      'تخصيص واجب منزلي لا يتجاوز 10 دقائق يومياً.',
                      'إعادة التقييم بعد 6 أسابيع لقياس التقدم.',
                    ].map((item, index) => (
                      <p key={item} className="rounded-lg bg-emerald-50 p-4 text-sm font-bold leading-7 text-emerald-900">{index + 1}. {item}</p>
                    ))}
                  </div>
                </section>

                <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white">
                      <ClipboardCheck size={20} />
                    </span>
                    <div>
                      <p className="text-sm font-black text-slate-500">سلم اتخاذ القرار</p>
                      <h2 className="text-xl font-black text-slate-950">متى نعيد التدريس ومتى ننتقل؟</h2>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {decisionRules.map((rule) => (
                      <article key={rule.label} className="rounded-lg bg-slate-50 p-4">
                        <p className="text-xs font-black text-teal-800">{rule.range}</p>
                        <h3 className="mt-2 font-black text-slate-950">{rule.label}</h3>
                        <p className="mt-2 text-xs font-bold leading-6 text-slate-600">{rule.action}</p>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            </article>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-teal-800">التقارير الشاملة</p>
                <h1 className="mt-2 text-3xl font-black text-slate-950">عرض وطباعة تقارير التقييم</h1>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-600">نفس فلاتر وتقارير النظام الأصلية، بتصميم أوضح للموبايل والديسكتوب.</p>
              </div>
              <Link href="/student/new" className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">إنشاء تقرير جديد</Link>
            </div>
          </header>

          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {filters.map((item) => (
              <button key={item} onClick={() => setFilter(item)} className={`shrink-0 rounded-lg border px-5 py-3 text-sm font-black transition ${filter === item ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                {item === 'all' ? 'الكل' : item}
              </button>
            ))}
          </div>

          <section className="grid gap-4 md:grid-cols-2">
            {filtered.map((report) => {
              const decision = getDecisionFromScore(report.score);

              return (
                <article key={report.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="h-2" style={{ backgroundColor: report.programColor }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-black text-slate-950">{report.studentName}</h2>
                        <p className="mt-1 text-sm font-bold text-slate-500">{report.grade} · {report.date}</p>
                      </div>
                      <p className="text-3xl font-black" style={{ color: getScoreColor(report.score) }}>{report.score}%</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-block rounded-full px-3 py-1 text-xs font-black text-white" style={{ backgroundColor: report.programColor }}>{report.program}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{decision.label}</span>
                    </div>
                    <p className="mt-4 line-clamp-2 text-sm font-bold leading-7 text-slate-600">{report.summary}</p>
                    <div className="mt-5 flex gap-3">
                      <button onClick={() => setSelectedId(report.id)} className="flex-1 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800">عرض التقرير الكامل</button>
                      <button onClick={() => window.print()} className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-700"><Printer size={17} /></button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </main>
      </div>
    </div>
  );
}
