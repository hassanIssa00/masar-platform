'use client';

import { useState, useCallback } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Star,
} from 'lucide-react';
import { CurriculumSubject } from '@/data/curriculaData';

// Unit badge colours (cycling)
const UNIT_COLORS = [
  'bg-emerald-100 text-emerald-800 border-emerald-200',
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
];

export default function QuranReadOnlyViewer({
  curriculum,
}: {
  curriculum: CurriculumSubject;
}) {
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalPages = curriculum.pageCount;
  const pdfUrl = `/resources/curricula/${curriculum.slug}/juz-amma.pdf`;

  // Build the iframe src with page anchor
  const iframeSrc = `${pdfUrl}#page=${page}&toolbar=0&navpanes=0&scrollbar=0&view=FitH`;

  const goToPage = useCallback(
    (n: number) => {
      const clamped = Math.max(1, Math.min(totalPages, n));
      setPage(clamped);
      setPageInput(String(clamped));
    },
    [totalPages],
  );

  const handlePageInput = (v: string) => {
    setPageInput(v);
    const n = parseInt(v, 10);
    if (!isNaN(n)) goToPage(n);
  };

  const clampZoom = (v: number) => Math.max(60, Math.min(200, v));

  // Active unit label
  const activeUnit = curriculum.units.find(
    (u) => page >= u.fromPage && page <= u.toPage,
  );

  return (
    <div
      className={`flex flex-col gap-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-white p-4 overflow-auto' : ''}`}
      dir="rtl"
    >
      {/* ── Header ── */}
      <div
        className="rounded-3xl p-5 text-white shadow-lg relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${curriculum.color} 0%, #065f46 100%)` }}
      >
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-black mb-2"
              style={{ color: curriculum.accent }}
            >
              <Star size={12} />
              {curriculum.badge}
            </span>
            <h1 className="text-2xl md:text-3xl font-black">{curriculum.title}</h1>
            <p className="text-sm font-bold text-white/80 mt-1">{curriculum.subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="bg-white/20 px-3 py-1.5 rounded-xl">{curriculum.grade}</span>
            <span className="bg-white/20 px-3 py-1.5 rounded-xl">{curriculum.year}</span>
            <span className="bg-white/20 px-3 py-1.5 rounded-xl">{totalPages} صفحة</span>
          </div>
        </div>
      </div>

      {/* ── Units Strip ── */}
      <div className="flex flex-wrap gap-2">
        {curriculum.units.map((unit, i) => (
          <button
            key={unit.title}
            onClick={() => goToPage(unit.fromPage)}
            className={`rounded-xl border px-3 py-1.5 text-[11px] font-black transition hover:opacity-80 ${
              UNIT_COLORS[i % UNIT_COLORS.length]
            } ${activeUnit?.title === unit.title ? 'ring-2 ring-offset-1 ring-current' : ''}`}
          >
            {unit.title}
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs">
        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
          >
            <ChevronRight size={18} />
          </button>

          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => handlePageInput(e.target.value)}
              className="w-12 bg-transparent text-center text-sm font-black text-slate-900 outline-none"
            />
            <span className="text-xs font-bold text-slate-400">/ {totalPages}</span>
          </div>

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 disabled:opacity-40 transition"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Active unit badge */}
        {activeUnit && (
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-black text-emerald-800">
            <BookOpen size={12} />
            {activeUnit.title}
          </span>
        )}

        {/* Zoom + Fullscreen */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => clampZoom(z - 10))}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
            title="تصغير"
          >
            <ZoomOut size={16} />
          </button>
          <span className="min-w-[42px] text-center text-xs font-black text-slate-600">{zoom}%</span>
          <button
            onClick={() => setZoom((z) => clampZoom(z + 10))}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition"
            title="تكبير"
          >
            <ZoomIn size={16} />
          </button>
          <button
            onClick={() => setIsFullscreen((f) => !f)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
            title={isFullscreen ? 'خروج من ملء الشاشة' : 'ملء الشاشة'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* ── Read-Only PDF Viewer ── */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-sm">
        {/* Read-only notice */}
        <div className="flex items-center gap-2 border-b border-slate-200 bg-amber-50 px-4 py-2">
          <span className="text-sm">📖</span>
          <p className="text-[11px] font-black text-amber-800">
            وضع العرض فقط — القرآن الكريم يُعرض للقراءة والمتابعة دون إمكانية الكتابة عليه
          </p>
        </div>

        {/* PDF iframe — fills width, no toolbar */}
        <div
          className="relative flex items-center justify-center bg-slate-200"
          style={{ minHeight: '75vh' }}
        >
          <iframe
            key={`${curriculum.slug}-p${page}-z${zoom}`}
            src={iframeSrc}
            title={`${curriculum.title} - صفحة ${page}`}
            className="rounded-b-3xl border-0"
            style={{
              width: `${zoom}%`,
              minWidth: '320px',
              height: '75vh',
              display: 'block',
              margin: '0 auto',
            }}
            loading="lazy"
          />
        </div>
      </div>

      {/* ── Quick Page Jump Grid ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <p className="mb-3 text-xs font-black text-slate-500">انتقل سريعاً إلى وحدة:</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {curriculum.units.map((unit, i) => (
            <button
              key={unit.title}
              onClick={() => goToPage(unit.fromPage)}
              className={`rounded-xl border p-2.5 text-right transition hover:scale-[1.02] ${UNIT_COLORS[i % UNIT_COLORS.length]}`}
            >
              <p className="text-[10px] font-black leading-4">{unit.title}</p>
              <p className="mt-1 text-[10px] font-bold opacity-70">
                ص {unit.fromPage} – {unit.toPage}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
