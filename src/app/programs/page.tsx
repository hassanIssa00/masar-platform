'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowLeft, BookOpen, ClipboardCheck, Clock, FolderOpen, GraduationCap, Layers3, Route, Sparkles, Target } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { curriculumPrograms } from '@/data/curriculum';

export default function ProgramsPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="grid gap-6 p-6 lg:grid-cols-[1fr_340px] lg:p-8">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-xs font-black text-teal-800">
                  <Route size={16} />
                  المسارات العلاجية
                </p>
                <h1 className="mt-4 text-3xl font-black leading-tight text-slate-950 md:text-5xl">
                  مكتبة المسارات المعتمدة داخل منصة مسار
                </h1>
                <p className="mt-4 max-w-3xl text-sm font-bold leading-8 text-slate-600">
                  كل مسار هنا مرتبط بتقييم، خطة تدريب، مؤشرات تقدم، وصفحة تنفيذ مستقلة يفتحها الدكتور للطالب عند اعتماد البرنامج المناسب.
                </p>
              </div>

              <div className="rounded-2xl border border-teal-100 bg-teal-50 p-5">
                <p className="text-sm font-black text-teal-900">قرار الفتح</p>
                <p className="mt-2 text-sm font-bold leading-7 text-teal-800">
                  المسار لا يظهر للطالب كتشخيص. يظهر فقط كتدريب أو ألعاب بعد اعتماد د. إسماعيل عيسى.
                </p>
                <Link
                  href="/students"
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-black text-white hover:bg-teal-800 transition"
                >
                  اعتماد مسار لطالب
                  <ArrowLeft size={16} />
                </Link>
              </div>
            </div>
          </header>

          {/* ══ المناهج التعليمية FEATURED SECTION ══ */}
          <Link
            href="/programs/curricula"
            className="mt-6 group flex flex-col md:flex-row items-start md:items-center justify-between gap-5 rounded-3xl border-2 border-indigo-200 bg-gradient-to-l from-indigo-950 via-blue-900 to-slate-900 p-6 text-white shadow-xl hover:border-amber-400/50 transition-all lg:p-7"
          >
            <div className="flex items-center gap-5">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-amber-400/20 ring-2 ring-amber-400/40 shadow-sm">
                <FolderOpen size={28} className="text-amber-300" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-0.5 text-[11px] font-black text-amber-300 ring-1 ring-amber-400/30">
                    <Sparkles size={12} />
                    مناهج الصف الأول الابتدائي 1448هـ · 7 مواد رسمية
                  </span>
                </div>
                <h2 className="text-2xl font-black leading-tight md:text-3xl">مجلد المناهج التعليمية التفاعلية</h2>
                <p className="mt-1.5 max-w-2xl text-sm font-bold leading-7 text-slate-300">
                  جميع الكتب المدرسية الرسمية (لغتي، رياضيات، إسلامية، علوم، إنجليزي، مهارات حياتية، تربية فنية) مدمجة بنظام الكتابة التفاعلية وإسناد الواجبات مثل التهجي البسيط تماماً.
                </p>
              </div>
            </div>
            <div className="shrink-0 inline-flex items-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-indigo-950 px-6 py-3.5 text-sm font-black shadow-md group-hover:shadow-amber-400/30 transition-all">
              <GraduationCap size={18} />
              فتح المناهج التعليمية
              <ArrowLeft size={16} />
            </div>
          </Link>

          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {curriculumPrograms.map((program) => (
              <article key={program.slug} className="flex min-h-[320px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white"
                    style={{ backgroundColor: program.color }}
                  >
                    <Layers3 size={20} />
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                    {program.level}
                  </span>
                </div>

                <div className="mt-4 flex-1">
                  <p className="text-xs font-black text-teal-800">{program.tag}</p>
                  <h2 className="mt-2 text-xl font-black leading-8 text-slate-950">{program.shortTitle}</h2>
                  <p className="mt-3 text-sm font-bold leading-7 text-slate-600">{program.promise}</p>
                </div>

                <div className="mt-5 grid gap-2">
                  <InfoLine icon={<Clock size={15} />} label="المدة" value={program.duration} />
                  <InfoLine icon={<Target size={15} />} label="القياس" value={program.measures.slice(0, 2).join('، ')} />
                  <InfoLine icon={<ClipboardCheck size={15} />} label="المخرجات" value={program.outcomes.slice(0, 2).join('، ')} />
                </div>

                <Link
                  href={`/programs/${program.slug}`}
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-teal-800"
                >
                  فتح المسار
                  <ArrowLeft size={16} />
                </Link>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}

function InfoLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3">
      <span className="mt-0.5 text-teal-700">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-black text-slate-400">{label}</p>
        <p className="mt-0.5 line-clamp-2 text-xs font-bold leading-6 text-slate-700">{value}</p>
      </div>
    </div>
  );
}
