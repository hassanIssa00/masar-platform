'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Download,
  GraduationCap,
  Layers3,
  PenTool,
  Search,
  Sparkles,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { curriculaList } from '@/data/curriculaData';

export default function CurriculaHubPage() {
  const [search, setSearch] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('all');

  const filtered = curriculaList.filter((c) => {
    const matchesSearch =
      !search ||
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.badge.toLowerCase().includes(search.toLowerCase()) ||
      c.subtitle.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          {/* Top Breadcrumbs */}
          <div className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-500">
            <Link href="/programs" className="hover:text-teal-700">
              المسارات والبرامج
            </Link>
            <ChevronLeft size={14} />
            <span className="font-black text-slate-900">المناهج التعليمية والكتب التفاعلية</span>
          </div>

          {/* Hero Banner */}
          <header className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-l from-slate-950 via-indigo-950 to-blue-900 p-6 text-white shadow-xl lg:p-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3.5 py-1 text-xs font-black text-amber-300 ring-1 ring-amber-400/40">
                    <Sparkles size={14} />
                    المناهج الرسمية المعتمدة 1448هـ
                  </span>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
                    الصف الأول الابتدائي
                  </span>
                </div>
                <h1 className="mt-4 text-3xl font-black md:text-4xl lg:text-5xl">
                  مجلد المناهج التعليمية التفاعلية
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-bold leading-7 text-slate-300">
                  جميع الكتب المدرسية الرسمية مدمجة بنظام التهجي والحل التفاعلي، تتيح الكتابة والرسم بالقلم على الصفحات، وإسناد وتصحيح الواجبات للطلاب مباشرة.
                </p>
              </div>

              <div className="flex flex-col gap-2 rounded-2xl bg-white/10 p-4 backdrop-blur-xs ring-1 ring-white/20 sm:min-w-[240px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white/70">إجمالي المواد</span>
                  <span className="text-xl font-black text-amber-300">{curriculaList.length} مواد</span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <span className="text-xs font-bold text-white/70">إجمالي الصفحات</span>
                  <span className="text-xl font-black text-white">
                    {curriculaList.reduce((acc, c) => acc + c.pageCount, 0)} صفحة
                  </span>
                </div>
              </div>
            </div>
          </header>

          {/* Search and Filters */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[260px]">
              <Search size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث عن مادة أو كتاب دراسي..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-10 pl-4 text-sm font-bold text-slate-900 shadow-xs outline-none focus:border-blue-700"
              />
            </div>
          </div>

          {/* Curricula Grid */}
          <section className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((curriculum) => (
              <article
                key={curriculum.slug}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
              >
                {/* Book Header & Color Strip */}
                <div
                  className="p-5 text-white relative overflow-hidden"
                  style={{ backgroundColor: curriculum.color }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-black backdrop-blur-xs">
                      {curriculum.badge}
                    </span>
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">
                      {curriculum.pageCount} صفحة
                    </span>
                  </div>

                  <h2 className="mt-3 text-2xl font-black tracking-tight">{curriculum.title}</h2>
                  <p className="mt-1 text-xs font-bold text-white/85">{curriculum.subtitle}</p>
                </div>

                {/* Body Content */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <p className="text-xs font-bold leading-6 text-slate-600">
                      {curriculum.promise}
                    </p>

                    {/* Units breakdown preview */}
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-100">
                      <p className="text-[11px] font-black text-slate-500 mb-1.5">أبرز الوحدات والفصول:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {curriculum.units.slice(0, 3).map((u) => (
                          <span
                            key={u.title}
                            className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200"
                          >
                            {u.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex items-center gap-2 pt-3 border-t border-slate-100">
                    <Link
                      href={`/programs/curricula/${curriculum.slug}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white hover:bg-teal-800 transition shadow-xs"
                    >
                      <PenTool size={15} />
                      فتح الكتاب التفاعلي
                      <ArrowLeft size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
}
