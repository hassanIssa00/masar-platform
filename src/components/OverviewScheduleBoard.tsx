'use client';

import { useMemo, useState, useEffect } from 'react';
import {
  Clock, Calendar, Sparkles, BookOpen, CheckCircle2,
  ChevronLeft, ArrowRight, Sun, Coffee, Users,
  Layers, AlertTriangle, ExternalLink, ShieldCheck, Check
} from 'lucide-react';
import { Period, DAY_NAMES } from '@/data/ikhlasSchedule';

interface Props {
  schedule: Period[];
  todayPeriods: Period[];
  currentPeriod: Period | null;
  minsUntilDismissal: number;
  jsDay: number;
  onNavigateTab: (tab: any) => void;
}

const SUBJECT_CONFIG: Record<string, { icon: string; bg: string; border: string; text: string; badge: string }> = {
  'لغتي العربية': {
    icon: '📖',
    bg: 'bg-gradient-to-r from-blue-50 to-indigo-50/80',
    border: 'border-blue-200 hover:border-blue-300',
    text: 'text-blue-900',
    badge: 'bg-blue-600 text-white',
  },
  'الرياضيات': {
    icon: '📐',
    bg: 'bg-gradient-to-r from-emerald-50 to-teal-50/80',
    border: 'border-emerald-200 hover:border-emerald-300',
    text: 'text-emerald-900',
    badge: 'bg-emerald-600 text-white',
  },
  'التربية الإسلامية': {
    icon: '🕌',
    bg: 'bg-gradient-to-r from-amber-50 to-yellow-50/80',
    border: 'border-amber-200 hover:border-amber-300',
    text: 'text-amber-900',
    badge: 'bg-amber-600 text-white',
  },
  'القرآن الكريم': {
    icon: '✨',
    bg: 'bg-gradient-to-r from-teal-50 to-emerald-50/80',
    border: 'border-teal-200 hover:border-teal-300',
    text: 'text-teal-900',
    badge: 'bg-teal-600 text-white',
  },
  'العلوم': {
    icon: '🔬',
    bg: 'bg-gradient-to-r from-cyan-50 to-sky-50/80',
    border: 'border-cyan-200 hover:border-cyan-300',
    text: 'text-cyan-900',
    badge: 'bg-cyan-600 text-white',
  },
  'التربية الفنية': {
    icon: '🎨',
    bg: 'bg-gradient-to-r from-pink-50 to-rose-50/80',
    border: 'border-pink-200 hover:border-pink-300',
    text: 'text-pink-900',
    badge: 'bg-pink-600 text-white',
  },
  'التربية البدنية': {
    icon: '🏃',
    bg: 'bg-gradient-to-r from-orange-50 to-amber-50/80',
    border: 'border-orange-200 hover:border-orange-300',
    text: 'text-orange-900',
    badge: 'bg-orange-600 text-white',
  },
  'الحاسب الآلي': {
    icon: '💻',
    bg: 'bg-gradient-to-r from-violet-50 to-purple-50/80',
    border: 'border-violet-200 hover:border-violet-300',
    text: 'text-violet-900',
    badge: 'bg-violet-600 text-white',
  },
  'الاجتماعيات': {
    icon: '🌍',
    bg: 'bg-gradient-to-r from-rose-50 to-pink-50/80',
    border: 'border-rose-200 hover:border-rose-300',
    text: 'text-rose-900',
    badge: 'bg-rose-600 text-white',
  },
  'حياتية': {
    icon: '🌱',
    bg: 'bg-gradient-to-r from-lime-50 to-green-50/80',
    border: 'border-lime-200 hover:border-lime-300',
    text: 'text-lime-900',
    badge: 'bg-lime-600 text-white',
  },
  'نشاط': {
    icon: '⭐',
    bg: 'bg-gradient-to-r from-fuchsia-50 to-purple-50/80',
    border: 'border-fuchsia-200 hover:border-fuchsia-300',
    text: 'text-fuchsia-900',
    badge: 'bg-fuchsia-600 text-white',
  },
};

export default function OverviewScheduleBoard({
  schedule,
  todayPeriods,
  currentPeriod,
  minsUntilDismissal,
  jsDay,
  onNavigateTab,
}: Props) {
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  const isSchoolDay = jsDay >= 0 && jsDay <= 4;
  const isEarlyDay = jsDay === 3 || jsDay === 4; // الأربعاء والخميس

  // Construct the full sequential timeline for today
  const timelineEvents = useMemo(() => {
    if (!isSchoolDay) return [];

    const events: Array<{
      id: string;
      order: number;
      type: 'assembly' | 'period' | 'recess' | 'prayer' | 'dismissal';
      periodNumber?: number;
      name: string;
      startTime: string;
      endTime: string;
      durationMinutes: number;
      icon: string;
      isFree?: boolean;
    }> = [];

    // 1. Morning Assembly
    events.push({
      id: 'assembly',
      order: 0,
      type: 'assembly',
      name: 'طابور الصباح والإذاعة',
      startTime: '06:45',
      endTime: '07:00',
      durationMinutes: 15,
      icon: '🌅',
    });

    // 2. Periods 1 to 3
    const p1 = todayPeriods.find(p => p.periodNumber === 1);
    events.push({
      id: 'p1',
      order: 1,
      type: 'period',
      periodNumber: 1,
      name: p1?.subjectName || 'حصة إثرائية / نشاط صفي',
      isFree: !p1,
      startTime: '07:00',
      endTime: '07:45',
      durationMinutes: 45,
      icon: p1 ? (SUBJECT_CONFIG[p1.subjectName]?.icon || '📖') : '✨',
    });

    const p2 = todayPeriods.find(p => p.periodNumber === 2);
    events.push({
      id: 'p2',
      order: 2,
      type: 'period',
      periodNumber: 2,
      name: p2?.subjectName || 'حصة إثرائية / نشاط صفي',
      isFree: !p2,
      startTime: '07:45',
      endTime: '08:30',
      durationMinutes: 45,
      icon: p2 ? (SUBJECT_CONFIG[p2.subjectName]?.icon || '📖') : '✨',
    });

    const p3 = todayPeriods.find(p => p.periodNumber === 3);
    if (p3 || !isEarlyDay) {
      events.push({
        id: 'p3',
        order: 3,
        type: 'period',
        periodNumber: 3,
        name: p3?.subjectName || 'حصة إثرائية / نشاط صفي',
        isFree: !p3,
        startTime: '08:30',
        endTime: '09:15',
        durationMinutes: 45,
        icon: p3 ? (SUBJECT_CONFIG[p3.subjectName]?.icon || '📖') : '✨',
      });
    }

    // 3. Recess / Break
    events.push({
      id: 'recess',
      order: 3.5,
      type: 'recess',
      name: 'الفسحة المدرسية وتناول الوجبة',
      startTime: '09:15',
      endTime: '09:30',
      durationMinutes: 15,
      icon: '🌤️',
    });

    // 4. Periods 4, 5, 6
    const p4 = todayPeriods.find(p => p.periodNumber === 4);
    events.push({
      id: 'p4',
      order: 4,
      type: 'period',
      periodNumber: 4,
      name: p4?.subjectName || 'حصة إثرائية / نشاط صفي',
      isFree: !p4,
      startTime: '09:30',
      endTime: '10:15',
      durationMinutes: 45,
      icon: p4 ? (SUBJECT_CONFIG[p4.subjectName]?.icon || '📖') : '✨',
    });

    const p5 = todayPeriods.find(p => p.periodNumber === 5);
    events.push({
      id: 'p5',
      order: 5,
      type: 'period',
      periodNumber: 5,
      name: p5?.subjectName || 'حصة إثرائية / نشاط صفي',
      isFree: !p5,
      startTime: '10:15',
      endTime: '11:00',
      durationMinutes: 45,
      icon: p5 ? (SUBJECT_CONFIG[p5.subjectName]?.icon || '📖') : '✨',
    });

    const p6 = todayPeriods.find(p => p.periodNumber === 6);
    events.push({
      id: 'p6',
      order: 6,
      type: 'period',
      periodNumber: 6,
      name: p6?.subjectName || 'حصة إثرائية / نشاط صفي',
      isFree: !p6,
      startTime: '11:00',
      endTime: '11:45',
      durationMinutes: 45,
      icon: p6 ? (SUBJECT_CONFIG[p6.subjectName]?.icon || '📖') : '✨',
    });

    // Period 7 only on Sun, Mon, Tue
    if (!isEarlyDay) {
      const p7 = todayPeriods.find(p => p.periodNumber === 7);
      events.push({
        id: 'p7',
        order: 7,
        type: 'period',
        periodNumber: 7,
        name: p7?.subjectName || 'نشاط صفي وختام اليوم',
        isFree: !p7,
        startTime: '11:45',
        endTime: '12:30',
        durationMinutes: 45,
        icon: p7 ? (SUBJECT_CONFIG[p7.subjectName]?.icon || '📖') : '⭐',
      });

      // Prayer
      events.push({
        id: 'prayer',
        order: 8,
        type: 'prayer',
        name: 'صلاة الظهر جماعة',
        startTime: '12:30',
        endTime: '12:40',
        durationMinutes: 10,
        icon: '🕌',
      });
    }

    // 5. Dismissal
    events.push({
      id: 'dismissal',
      order: 9,
      type: 'dismissal',
      name: isEarlyDay ? 'الانصراف المدرسي (الأربعاء/الخميس)' : 'الانصراف المدرسي وخروج الطلاب',
      startTime: isEarlyDay ? '11:45' : '12:40',
      endTime: isEarlyDay ? '11:45' : '12:40',
      durationMinutes: 0,
      icon: '🚪',
    });

    return events;
  }, [todayPeriods, isSchoolDay, isEarlyDay]);

  // Helper to determine status of event relative to now
  const getEventStatus = (startTime: string, endTime: string) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const nowHhmm = `${hh}:${mm}`;

    if (nowHhmm >= startTime && (nowHhmm < endTime || startTime === endTime)) {
      return 'active';
    } else if (nowHhmm >= endTime) {
      return 'past';
    } else {
      return 'upcoming';
    }
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white shadow-lg overflow-hidden transition-all duration-300">

      {/* ── CARD HEADER ── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 p-5 md:p-6 text-white border-b border-slate-700">
        {/* Glow decoration */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-black text-emerald-300 backdrop-blur-md">
                <Sparkles size={13} className="text-amber-400" />
                الجدول الزمني المعتمد لعام 1448هـ
              </span>
              <span className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300 font-mono">
                <Clock size={12} className="text-emerald-400" /> {currentTimeStr || '09:00 ص'}
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
              <span>🗓️ جدول اليوم — {DAY_NAMES[jsDay] ?? 'يوم دراسي'}</span>
            </h2>

            <p className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <span>مدرسة الإخلاص الأهلية · فصل د. إسماعيل عيسى</span>
              <span className="text-slate-500">|</span>
              <span className="text-amber-300 font-bold">
                {isEarlyDay ? '⚡ موعد الخروج اليوم: 11:45 ص' : '🚪 موعد الخروج اليوم: 12:40 م'}
              </span>
            </p>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => onNavigateTab('schedule')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-2 text-xs font-black text-white transition active:scale-95 cursor-pointer shadow-xs"
            >
              <Layers size={14} className="text-amber-300" />
              <span>جدول الأسبوع كاملاً 📊</span>
            </button>

            <button
              onClick={() => onNavigateTab('attendance')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-black transition active:scale-95 cursor-pointer shadow-md shadow-emerald-900/30"
            >
              <Users size={14} />
              <span>رصد الحضور 📋</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── CARD BODY (TIMELINE VIEW) ── */}
      <div className="p-4 md:p-6 bg-slate-50/50">
        {!isSchoolDay ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
            <span className="text-5xl block animate-bounce">🌙</span>
            <h3 className="text-lg font-black text-slate-800">اليوم إجازة رسمية — عطلة نهاية الأسبوع</h3>
            <p className="text-xs font-bold text-slate-500 max-w-sm mx-auto">
              استمتع بوقتك! يمكنك الاطلاع على جدول الأسبوع أو تحضير الدروس والواجبات للأيام القادمة.
            </p>
            <button
              onClick={() => onNavigateTab('schedule')}
              className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-black hover:bg-slate-800 transition"
            >
              عرض جدول الأسبوع كاملاً 📊
            </button>
          </div>
        ) : (
          <div className="space-y-3">

            {/* List of Timeline Event Cards */}
            <div className="grid gap-2.5">
              {timelineEvents.map((evt) => {
                const status = getEventStatus(evt.startTime, evt.endTime);
                const isActive = status === 'active';
                const isPast = status === 'past';
                const config = SUBJECT_CONFIG[evt.name] || {
                  icon: evt.icon,
                  bg: 'bg-white',
                  border: 'border-slate-200',
                  text: 'text-slate-900',
                  badge: 'bg-slate-700 text-white',
                };

                // Recess special design
                if (evt.type === 'recess') {
                  return (
                    <div
                      key={evt.id}
                      className={`rounded-2xl border-2 transition-all p-3.5 flex items-center justify-between gap-3 ${
                        isActive
                          ? 'border-amber-400 bg-amber-50 shadow-md ring-2 ring-amber-300/60'
                          : isPast
                          ? 'border-amber-200/60 bg-amber-50/40 opacity-75'
                          : 'border-amber-200 bg-amber-50/70 hover:bg-amber-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-200/80 border border-amber-300 flex items-center justify-center text-xl shrink-0 shadow-inner">
                          🌤️
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-amber-950 text-sm md:text-base">الفسحة المدرسية</span>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-amber-300 text-amber-950">15 دقيقة</span>
                            {isActive && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-white" /> جارية الآن
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-bold text-amber-800/80 mt-0.5">استراحة الإفطار والنشاط الترفيهي الصفي</p>
                        </div>
                      </div>

                      <div className="text-left shrink-0 font-mono text-xs md:text-sm font-black text-amber-950 bg-white/80 border border-amber-200 px-3 py-1.5 rounded-xl">
                        {evt.startTime} – {evt.endTime}
                      </div>
                    </div>
                  );
                }

                // Assembly special design
                if (evt.type === 'assembly') {
                  return (
                    <div
                      key={evt.id}
                      className={`rounded-2xl border transition-all p-3 flex items-center justify-between gap-3 ${
                        isActive
                          ? 'border-orange-400 bg-orange-50 shadow-sm ring-2 ring-orange-300/60'
                          : isPast
                          ? 'border-slate-200 bg-slate-50/60 opacity-70'
                          : 'border-orange-200/80 bg-orange-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">🌅</span>
                        <div>
                          <span className="font-black text-slate-800 text-xs md:text-sm">{evt.name}</span>
                          <span className="text-[10px] text-slate-500 mr-2">النشاط الصباحي والتحية</span>
                        </div>
                      </div>
                      <div className="text-left font-mono text-xs font-bold text-slate-700">
                        {evt.startTime} – {evt.endTime}
                      </div>
                    </div>
                  );
                }

                // Prayer or Dismissal
                if (evt.type === 'prayer' || evt.type === 'dismissal') {
                  return (
                    <div
                      key={evt.id}
                      className={`rounded-2xl border p-3 flex items-center justify-between gap-3 ${
                        evt.type === 'dismissal'
                          ? 'bg-slate-900 border-slate-800 text-white shadow-sm'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{evt.icon}</span>
                        <span className="font-black text-xs md:text-sm">{evt.name}</span>
                      </div>
                      <div className="font-mono text-xs font-black opacity-90">
                        {evt.startTime}
                      </div>
                    </div>
                  );
                }

                // Standard Period Card
                return (
                  <div
                    key={evt.id}
                    className={`rounded-2xl border transition-all p-3.5 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isActive
                        ? 'border-emerald-500 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 shadow-md ring-2 ring-emerald-400/80'
                        : isPast
                        ? 'border-slate-200 bg-white/70 opacity-80 hover:opacity-100'
                        : `${config.bg} ${config.border} bg-white shadow-2xs hover:shadow-xs`
                    }`}
                  >
                    {/* Period Left Meta & Subject */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Period Number Badge */}
                      <div
                        className={`w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0 border shadow-xs ${
                          isActive
                            ? 'bg-emerald-600 border-emerald-500 text-white font-black'
                            : 'bg-white border-slate-200 text-slate-800 font-bold'
                        }`}
                      >
                        <span className="text-[10px] leading-tight opacity-75">حصة</span>
                        <span className="text-base font-black leading-tight font-mono">{evt.periodNumber}</span>
                      </div>

                      {/* Subject info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg">{config.icon}</span>
                          <h4 className="font-black text-sm md:text-base text-slate-950 truncate">
                            {evt.name}
                          </h4>

                          {/* Live Status Pill */}
                          {isActive && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-600 text-white animate-pulse shadow-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> جارية الآن 🔴
                            </span>
                          )}

                          {isPast && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                              <Check size={10} className="text-emerald-600" /> مكتملة
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold mt-1">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock size={12} className="text-slate-400" /> {evt.startTime} – {evt.endTime}
                          </span>
                          <span>·</span>
                          <span className="text-slate-600 font-bold">مدة الحصة: 45 دقيقة</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Actions for the Period */}
                    <div className="flex items-center gap-2 shrink-0 sm:self-center">
                      <button
                        onClick={() => onNavigateTab('attendance')}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                        title="رصد الحضور لهذه الحصة"
                      >
                        <Users size={12} />
                        <span>رصد الحضور</span>
                      </button>

                      <button
                        onClick={() => onNavigateTab('curriculum')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition cursor-pointer"
                        title="فتح المنهج والواجبات"
                      >
                        <BookOpen size={12} className="text-amber-600" />
                        <span>المنهج</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Timeline Summary Banner */}
            <div className="mt-4 rounded-2xl bg-white border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-slate-700 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>إجمالي حصص اليوم: <strong className="text-slate-950 font-black">{todayPeriods.length} حصص معتمدة</strong></span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigateTab('schedule')}
                  className="text-emerald-700 hover:text-emerald-900 font-black flex items-center gap-1 transition"
                >
                  <span>عرض الجدول الأسبوعي بالتفصيل</span>
                  <ChevronLeft size={14} />
                </button>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

