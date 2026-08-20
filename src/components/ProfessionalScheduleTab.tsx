'use client';

import { useState } from 'react';
import { Clock, Calendar, Printer, Sparkles, BookOpen, Layers, CheckCircle2, AlertCircle, Sun } from 'lucide-react';
import { Period, DAY_NAMES } from '@/data/ikhlasSchedule';

interface Props {
  schedule: Period[];
  currentPeriod: Period | null;
  minsUntilDismissal: number;
  jsDay: number;
  onNavigateToSmartSchedule?: () => void;
}

/* ── Subject Icon & Refined Palette Mapping ── */
const SUBJECT_CONFIG: Record<string, { icon: string; bg: string; text: string; border: string; badge: string }> = {
  'لغتي العربية': {
    icon: '📖',
    bg: 'bg-blue-50/90 hover:bg-blue-100/90',
    text: 'text-blue-900',
    border: 'border-blue-200/80',
    badge: 'bg-blue-100 text-blue-800',
  },
  'الرياضيات': {
    icon: '📐',
    bg: 'bg-emerald-50/90 hover:bg-emerald-100/90',
    text: 'text-emerald-900',
    border: 'border-emerald-200/80',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  'التربية الإسلامية': {
    icon: '🕌',
    bg: 'bg-amber-50/90 hover:bg-amber-100/90',
    text: 'text-amber-900',
    border: 'border-amber-200/80',
    badge: 'bg-amber-100 text-amber-800',
  },
  'القرآن الكريم': {
    icon: '🕋',
    bg: 'bg-teal-50/90 hover:bg-teal-100/90',
    text: 'text-teal-900',
    border: 'border-teal-200/80',
    badge: 'bg-teal-100 text-teal-800',
  },
  'العلوم': {
    icon: '🧪',
    bg: 'bg-cyan-50/90 hover:bg-cyan-100/90',
    text: 'text-cyan-900',
    border: 'border-cyan-200/80',
    badge: 'bg-cyan-100 text-cyan-800',
  },
  'التربية الفنية': {
    icon: '🎨',
    bg: 'bg-pink-50/90 hover:bg-pink-100/90',
    text: 'text-pink-900',
    border: 'border-pink-200/80',
    badge: 'bg-pink-100 text-pink-800',
  },
  'التربية البدنية': {
    icon: '⚽',
    bg: 'bg-orange-50/90 hover:bg-orange-100/90',
    text: 'text-orange-900',
    border: 'border-orange-200/80',
    badge: 'bg-orange-100 text-orange-800',
  },
  'الحاسب الآلي': {
    icon: '💻',
    bg: 'bg-purple-50/90 hover:bg-purple-100/90',
    text: 'text-purple-900',
    border: 'border-purple-200/80',
    badge: 'bg-purple-100 text-purple-800',
  },
  'الاجتماعيات': {
    icon: '🌍',
    bg: 'bg-rose-50/90 hover:bg-rose-100/90',
    text: 'text-rose-900',
    border: 'border-rose-200/80',
    badge: 'bg-rose-100 text-rose-800',
  },
  'فسحة 🌤️': {
    icon: '🌤️',
    bg: 'bg-gradient-to-r from-amber-100/80 via-yellow-100/80 to-amber-100/80',
    text: 'text-amber-950',
    border: 'border-amber-300',
    badge: 'bg-amber-200 text-amber-900',
  },
};

const DEFAULT_SUBJECT_CONFIG = {
  icon: '📚',
  bg: 'bg-slate-50 hover:bg-slate-100',
  text: 'text-slate-900',
  border: 'border-slate-200',
  badge: 'bg-slate-200 text-slate-700',
};

const PERIOD_LABELS: Record<number, string> = {
  1: 'الحصة الأولى',
  2: 'الحصة الثانية',
  3: 'الحصة الثالثة',
  4: 'الحصة الرابعة',
  5: 'الحصة الخامسة',
  6: 'الحصة السادسة',
  7: 'الحصة السابعة',
  8: 'الحصة الثامنة',
};

export default function ProfessionalScheduleTab({
  schedule,
  currentPeriod,
  minsUntilDismissal,
  jsDay,
  onNavigateToSmartSchedule,
}: Props) {
  const [viewMode, setViewMode] = useState<'matrix' | 'cards'>('matrix');
  const [selectedDayFilter, setSelectedDayFilter] = useState<number | 'all'>('all');

  // Dynamically extract period slots & timings from the active schedule
  const dynamicPeriodSlots = (function() {
    const numSet = new Set<number>();
    schedule.forEach((p) => numSet.add(p.periodNumber));
    const sortedNums = Array.from(numSet).sort((a, b) => a - b);
    const nums = sortedNums.length > 0 ? sortedNums : [1, 2, 3, 4, 5, 6, 7];

    const hasExplicitBreak = schedule.some((p) => p.subjectName.includes('فسحة') || p.subjectName.includes('استراحة'));
    const slots: { num: number; start: string; end: string; label: string; isBreak?: boolean }[] = [];

    nums.forEach((num, idx) => {
      const sample = schedule.find((p) => p.periodNumber === num);
      const isBreak = sample?.subjectName.includes('فسحة') || sample?.subjectName.includes('استراحة');

      // If no explicit break exists in schedule and we have 6+ periods, add recess row after period 3
      if (!hasExplicitBreak && idx === 3 && nums.length >= 6) {
        slots.push({
          num: 999,
          start: '09:30',
          end: '09:50',
          label: 'الفسحة المدرسية 🌤️',
          isBreak: true,
        });
      }

      slots.push({
        num,
        start: sample?.startTime || (num === 1 ? '07:30' : '08:10'),
        end: sample?.endTime || (num === 1 ? '08:10' : '08:50'),
        label: isBreak ? 'الفسحة المدرسية 🌤️' : (PERIOD_LABELS[num] || `الحصة ${num}`),
        isBreak,
      });
    });

    return slots;
  })();

  const totalPeriodsCount = schedule.length || 30;
  const dailyPeriodsCount = Math.round(totalPeriodsCount / 5) || 6;

  const handlePrintSchedule = () => {
    const win = window.open('', '_blank', 'width=1200,height=900');
    if (!win) return;

    const origin = typeof window !== 'undefined' ? window.location.origin : '';

    const tableRowsHtml = dynamicPeriodSlots.map(slot => {
      if (slot.isBreak) {
        return `
          <tr style="background:#fef3c7;border-top:2px solid #f59e0b;border-bottom:2px solid #f59e0b;">
            <td style="padding:8px;text-align:center;font-weight:900;color:#78350f;background:#fde68a;font-size:11px;">
              🌤️ الفسحة المدرسية<br/><span style="font-size:9.5px;font-family:monospace;">${slot.start} - ${slot.end}</span>
            </td>
            <td colspan="5" style="padding:8px;text-align:center;font-weight:900;color:#92400e;font-size:11px;">
              ☕ استراحة الفسحة المدرسية وتناول الوجبة والمرح الصفي (20 دقيقة)
            </td>
          </tr>
        `;
      }

      const dayCells = DAY_NAMES.map((dayName, dayIdx) => {
        const item = schedule.find(p => p.dayOfWeek === dayIdx && p.periodNumber === slot.num);
        const subjName = item?.subjectName || '—';
        return `
          <td style="padding:8px;text-align:center;border:1px solid #cbd5e1;background:#ffffff;">
            <div style="font-weight:900;font-size:12px;color:#0f172a;margin-bottom:2px;">${subjName}</div>
            <div style="font-size:9.5px;color:#64748b;font-family:monospace;background:#f8fafc;padding:2px 6px;border-radius:4px;display:inline-block;">
              ${slot.start} - ${slot.end}
            </div>
          </td>
        `;
      }).join('');

      return `
        <tr>
          <td style="padding:8px;text-align:center;font-weight:900;color:#1e293b;background:#f8fafc;border:1px solid #cbd5e1;">
            ${slot.label}<br/><span style="font-size:9.5px;color:#64748b;font-family:monospace;">${slot.start} - ${slot.end}</span>
          </td>
          ${dayCells}
        </tr>
      `;
    }).join('');

    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>جدول الحصص الموثق — فصل د. إسماعيل عيسى</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800;900&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{width:297mm;height:210mm;padding:12mm 15mm;background:#fff;font-family:'Cairo',Arial,sans-serif;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact;display:flex;flex-direction:column;justify-between:space-between;}
  @page{size:A4 landscape;margin:0;}
  @media print{body{width:297mm;height:210mm;padding:10mm 12mm;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}
  .header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #06392c;padding-bottom:10px;margin-bottom:12px;}
  .logo-title{display:flex;align-items:center;gap:12px;}
  .table-grid{width:100%;border-collapse:collapse;margin-bottom:12px;}
  .table-grid th{background:#06392c;color:#fff;padding:8px;font-size:12px;font-weight:900;border:1px solid #06392c;}
  .footer-sig{display:flex;justify-content:space-between;align-items:flex-end;padding-top:10px;border-top:2px dashed #cbd5e1;}
  .stamp-box{border:2px solid #06392c;padding:6px 16px;border-radius:12px;background:#f0fdf4;text-align:center;}
</style>
</head>
<body>
  <div>
    <div class="header">
      <div class="logo-title">
        <div style="width:42px;height:42px;background:#06392c;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:20px;">مـ</div>
        <div>
          <h1 style="font-size:18px;font-weight:900;color:#06392c;">منصة مَسَار للتأهيل والتعليم الذكي</h1>
          <p style="font-size:11px;color:#475569;font-weight:700;">جدول الحصص الأسبوعي الموثق — فصل د. إسماعيل عيسى</p>
        </div>
      </div>
      <div style="text-align:left;">
        <div style="font-size:11px;font-weight:900;color:#06392c;background:#e6f4ea;padding:4px 12px;border-radius:20px;display:inline-block;">موثق رقمياً</div>
        <div style="font-size:10px;color:#64748b;margin-top:3px;">الفصل الدراسي الأول 2026 / 1447 هـ</div>
      </div>
    </div>

    <table class="table-grid">
      <thead>
        <tr>
          <th style="width:140px;">الحصة / الوقت</th>
          <th>الأحد</th>
          <th>الاثنين</th>
          <th>الثلاثاء</th>
          <th>الأربعاء</th>
          <th>الخميس</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
  </div>

  <div class="footer-sig">
    <div>
      <div style="font-size:11px;color:#64748b;font-weight:700;">المملكة العربية السعودية · جدة</div>
      <div style="font-size:11px;color:#06392c;font-weight:900;">فصل د. إسماعيل عيسى · القسم الابتدائي</div>
    </div>

    <div class="stamp-box">
      <div style="font-size:13px;font-weight:900;color:#06392c;">د. إسماعيل عيسى</div>
      <div style="font-size:9.5px;color:#047857;">التأهيل والتعليم الحديث</div>
      <div style="margin-top:4px;">
        <img src="${origin}/dr-ismail-signature.png" alt="توقيع د. إسماعيل عيسى" style="height:38px;object-fit:contain;mix-blend-mode:multiply;margin:0 auto;display:block;"/>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); window.close(); }, 800);
    };
  <\/script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6 text-slate-900" dir="rtl">

      {/* ── TOP EXECUTIVE BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06392c] via-[#094d3c] to-[#04291e] p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">

          {/* Title & Info */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="rounded-lg bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-black text-emerald-200 backdrop-blur-md flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400" /> الجدول الدراسي الرقمي · الفصل الدراسي الأول
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
              جدول الحصص الأسبوعي الموثق
            </h2>
            <p className="mt-1 text-xs lg:text-sm font-semibold text-emerald-100/90">
              فصل د. إسماعيل عيسى · الخطة الأسبوعية الموزعة للحصص الدراسية
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

            {/* Current Live Period */}
            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-3 border border-white/15 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-200 flex items-center gap-1">
                <Clock size={12} className="text-amber-400 animate-pulse" /> الحصة الجارية
              </span>
              <div className="mt-1.5">
                {currentPeriod ? (
                  <div>
                    <span className="text-sm font-black text-white block truncate">{currentPeriod.subjectName}</span>
                    <span className="text-[10px] font-mono text-emerald-300">
                      الحصة {currentPeriod.periodNumber} ({currentPeriod.startTime} - {currentPeriod.endTime})
                    </span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-300">خارج أوقات الحصص ☕</span>
                )}
              </div>
            </div>

            {/* Minutes to Dismissal */}
            <div className="rounded-2xl bg-white/10 backdrop-blur-md p-3 border border-white/15 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-200 flex items-center gap-1">
                <Sun size={12} className="text-amber-400" /> الانصراف المدرسي
              </span>
              <div className="mt-1.5">
                {minsUntilDismissal > 0 ? (
                  <div>
                    <span className="text-sm font-black text-white font-mono">{minsUntilDismissal} دقيقة</span>
                    <span className="text-[10px] font-bold text-emerald-300 block">حتى نهاية اليوم</span>
                  </div>
                ) : (
                  <span className="text-xs font-bold text-slate-300">انتهى اليوم الدراسي ✓</span>
                )}
              </div>
            </div>

            {/* Total Periods */}
            <div className="col-span-2 sm:col-span-1 rounded-2xl bg-white/10 backdrop-blur-md p-3 border border-white/15 flex flex-col justify-between">
              <span className="text-[11px] font-bold text-emerald-200 flex items-center gap-1">
                <BookOpen size={12} className="text-amber-400" /> إجمالي الحصص
              </span>
              <div className="mt-1.5">
                <span className="text-sm font-black text-white font-mono">{totalPeriodsCount} حصة / أسبوع</span>
                <span className="text-[10px] font-bold text-emerald-300 block">{dailyPeriodsCount} حصص يومياً</span>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── CONTROLS & VIEWS BAR ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm print:hidden">

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
              viewMode === 'matrix' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers size={14} /> عرض الجدول الشبكي 📊
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all ${
              viewMode === 'cards' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar size={14} /> عرض بطاقات الأيام 📅
          </button>
        </div>

        {/* Days Filter Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedDayFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              selectedDayFilter === 'all'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            جميع الأيام
          </button>

          {DAY_NAMES.map((dName, idx) => {
            const isToday = jsDay === idx;
            const isSelected = selectedDayFilter === idx;
            return (
              <button
                key={dName}
                onClick={() => setSelectedDayFilter(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : isToday
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {dName}
                {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
              </button>
            );
          })}
        </div>

        {/* Actions Toolbar */}
        <div className="flex items-center gap-2">
          {onNavigateToSmartSchedule && (
            <button
              onClick={onNavigateToSmartSchedule}
              className="flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-2 rounded-xl text-xs font-black transition shadow-xs cursor-pointer"
            >
              <Sparkles size={14} className="text-amber-600" /> تعديل أو رفع جدول 🤖
            </button>
          )}

          {/* Print Button */}
          <button
            onClick={handlePrintSchedule}
            className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black transition shadow-sm active:scale-95 cursor-pointer"
          >
            <Printer size={14} /> طباعة الجدول 🖨️
          </button>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
         MODE 1: PROFESSIONAL MATRIX TABLE (GRID VIEW)
      ════════════════════════════════════════════════════════════════ */}
      {viewMode === 'matrix' && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[750px]">

              {/* TABLE HEADER: DAYS OF THE WEEK */}
              <thead>
                <tr className="bg-slate-900 text-white border-b border-slate-800">
                  <th className="py-4 px-4 text-xs font-black text-slate-300 w-36 text-center border-l border-slate-800">
                    الحصة / الوقت
                  </th>
                  {DAY_NAMES.map((dayName, dayIdx) => {
                    const isToday = jsDay === dayIdx;
                    const isFiltered = selectedDayFilter !== 'all' && selectedDayFilter !== dayIdx;
                    if (isFiltered) return null;

                    return (
                      <th
                        key={dayName}
                        className={`py-4 px-4 text-center border-l border-slate-800 last:border-l-0 ${
                          isToday ? 'bg-emerald-950/90 text-emerald-200' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1.5 font-black text-sm">
                          <span>{dayName}</span>
                          {isToday && (
                            <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                              اليوم
                            </span>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* TABLE BODY: PERIOD ROWS */}
              <tbody className="divide-y divide-slate-200 text-xs">
                {dynamicPeriodSlots.map((periodSlot) => {

                  {/* SPECIAL ROW: RECESS / BREAK TIME */}
                  if (periodSlot.isBreak) {
                    return (
                      <tr key="recess-row" className="bg-amber-50/70 border-y-2 border-amber-300/80">
                        <td className="py-3 px-4 text-center font-black text-amber-950 bg-amber-100/80 border-l border-amber-200">
                          <div className="flex items-center justify-center gap-1 text-xs">
                            <span>🌤️ الفسحة المدرسية</span>
                          </div>
                          <span className="text-[10px] font-mono text-amber-800 font-bold block mt-0.5">
                            {periodSlot.start} - {periodSlot.end}
                          </span>
                        </td>
                        <td
                          colSpan={selectedDayFilter === 'all' ? 5 : 1}
                          className="py-3 px-6 text-center text-xs font-black text-amber-900 tracking-wide"
                        >
                          <div className="flex items-center justify-center gap-3">
                            <span className="h-px bg-amber-300 flex-1" />
                            <span>☕ استراحة الفسحة وتناول الوجبة والمرح المدرسي (20 دقيقة)</span>
                            <span className="h-px bg-amber-300 flex-1" />
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  {/* REGULAR PERIOD ROWS */}
                  return (
                    <tr key={`p-${periodSlot.num}`} className="hover:bg-slate-50/50 transition">

                      {/* Period Label Column */}
                      <td className="py-3.5 px-3 text-center bg-slate-50 font-black text-slate-800 border-l border-slate-200">
                        <div className="font-black text-xs text-slate-900">{periodSlot.label}</div>
                        <span className="text-[10px] font-mono text-slate-500 font-bold block mt-0.5">
                          {periodSlot.start} - {periodSlot.end}
                        </span>
                      </td>

                      {/* Day Columns for this Period */}
                      {DAY_NAMES.map((dayName, dayIdx) => {
                        const isFiltered = selectedDayFilter !== 'all' && selectedDayFilter !== dayIdx;
                        if (isFiltered) return null;

                        const isToday = jsDay === dayIdx;
                        const periodItem = schedule.find(
                          p => p.dayOfWeek === dayIdx && p.periodNumber === periodSlot.num
                        );

                        const isLiveNow = isToday && currentPeriod?.periodNumber === periodSlot.num;
                        const subjectName = periodItem?.subjectName || '';
                        const teacherName = periodItem?.teacherName || '';
                        const cfg = SUBJECT_CONFIG[subjectName] || DEFAULT_SUBJECT_CONFIG;

                        return (
                          <td
                            key={`${dayName}-${periodSlot.num}`}
                            className={`p-2 border-l border-slate-200 last:border-l-0 vertical-top ${
                              isToday ? 'bg-emerald-50/20' : ''
                            }`}
                          >
                            {periodItem ? (
                              <div
                                className={`group relative rounded-2xl p-3 border transition-all duration-200 ${cfg.bg} ${cfg.border} ${
                                  isLiveNow
                                    ? 'ring-2 ring-emerald-500 bg-emerald-100/90 shadow-md scale-[1.02]'
                                    : 'hover:shadow-sm'
                                }`}
                              >
                                {/* Subject Title & Live Badge */}
                                <div className="flex items-start justify-between gap-1 mb-1">
                                  <span className="font-black text-xs text-slate-900 leading-tight">
                                    {cfg.icon} {subjectName}
                                  </span>
                                  {isLiveNow && (
                                    <span className="flex items-center gap-1 text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded-full animate-pulse shadow-sm shrink-0">
                                      🟢
                                    </span>
                                  )}
                                </div>

                                {/* Teacher Name */}
                                {teacherName && (
                                  <div className="text-[10px] font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                                    <span className="opacity-60">👤</span>
                                    <span className="truncate">{teacherName}</span>
                                  </div>
                                )}

                                {/* Period Time & Badge */}
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mt-auto">
                                  <span className="font-mono text-slate-600 bg-white/70 px-1.5 py-0.5 rounded border border-slate-200">
                                    {periodItem.startTime} - {periodItem.endTime}
                                  </span>
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.badge}`}>
                                    {periodItem.periodNumber}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-xl border border-dashed border-slate-200 p-3 text-center text-slate-400 font-bold text-[11px]">
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
         MODE 2: CARDS VIEW (BY DAY)
      ════════════════════════════════════════════════════════════════ */}
      {viewMode === 'cards' && (
        <div className="space-y-5">
          {DAY_NAMES.map((dayName, dayIdx) => {
            const isFiltered = selectedDayFilter !== 'all' && selectedDayFilter !== dayIdx;
            if (isFiltered) return null;

            const dayPeriods = schedule
              .filter(p => p.dayOfWeek === dayIdx)
              .sort((a, b) => a.periodNumber - b.periodNumber);
            const isToday = jsDay === dayIdx;

            return (
              <div
                key={dayName}
                className={`rounded-3xl bg-white border overflow-hidden shadow-sm transition ${
                  isToday ? 'border-emerald-400 shadow-emerald-100 shadow-md ring-1 ring-emerald-300' : 'border-slate-200'
                }`}
              >
                {/* Day Banner Header */}
                <div
                  className={`px-5 py-3.5 flex items-center justify-between border-b ${
                    isToday ? 'bg-gradient-to-r from-emerald-100/90 via-emerald-50 to-emerald-100/90 border-emerald-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className={isToday ? 'text-emerald-700' : 'text-slate-500'} />
                    <span className={`font-black text-base ${isToday ? 'text-emerald-950' : 'text-slate-800'}`}>
                      يوم {dayName}
                    </span>
                    {isToday && (
                      <span className="bg-emerald-700 text-white text-xs px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 shadow-sm">
                        <CheckCircle2 size={12} /> اليوم الحالي
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-500 bg-white/80 border border-slate-200 px-3 py-1 rounded-full">
                    {dayPeriods.length} حصص موثقة
                  </span>
                </div>

                {/* Day Periods Grid */}
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {dayPeriods.map((p) => {
                    const isNow = isToday && currentPeriod?.periodNumber === p.periodNumber;
                    const cfg = SUBJECT_CONFIG[p.subjectName] || DEFAULT_SUBJECT_CONFIG;

                    return (
                      <div
                        key={p.periodNumber}
                        className={`rounded-2xl p-4 border transition-all ${cfg.bg} ${cfg.border} ${
                          isNow ? 'ring-2 ring-emerald-500 bg-emerald-100 shadow-md scale-[1.02]' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-slate-500 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200">
                            الحصة {p.periodNumber}
                          </span>
                          {isNow && (
                            <span className="text-[10px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                              جارية الآن 🟢
                            </span>
                          )}
                        </div>

                        <h4 className="font-black text-sm text-slate-900 mb-2 flex items-center gap-1.5">
                          <span>{cfg.icon}</span> {p.subjectName}
                        </h4>

                        <div className="flex items-center justify-between text-xs text-slate-600 font-mono font-bold pt-2 border-t border-slate-200/60">
                          <span>{p.startTime}</span>
                          <span>إلى</span>
                          <span>{p.endTime}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
