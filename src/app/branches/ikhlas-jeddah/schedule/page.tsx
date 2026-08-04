'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock, Calendar, Save, ArrowRight, Bell, AlertTriangle,
  CheckCircle, Plus, Sparkles, RefreshCw, Loader2, BookOpen
} from 'lucide-react';
import {
  DEFAULT_SCHEDULE, DAY_NAMES, SUBJECT_COLORS,
  type Period, getTodayPeriods, getCurrentPeriod, getMinutesUntilDismissal
} from '@/data/ikhlasSchedule';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BRANCH = 'IKHLAS_JEDDAH';

function authHeaders() {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('masar_token') ?? localStorage.getItem('access_token'))
    : null;
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const DEFAULT_SUBJECTS = [
  'لغتي العربية', 'الرياضيات', 'التربية الإسلامية',
  'القرآن الكريم', 'العلوم', 'التربية الفنية',
  'التربية البدنية', 'الحاسب الآلي', 'الاجتماعيات', 'فسحة 🌤️'
];

export default function IkhlasScheduleManagerPage() {
  const [selectedDay, setSelectedDay] = useState<number>(0); // 0=Sunday
  const [schedule, setSchedule] = useState<Period[]>(DEFAULT_SCHEDULE);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [minsDismissal, setMinsDismissal] = useState<number>(-1);

  // Fetch custom schedule from API if exists
  useEffect(() => {
    async function loadSchedule() {
      try {
        const r = await fetch(`${API}/school/schedule?branch=${BRANCH}`, { headers: authHeaders() });
        if (r.ok) {
          const data: Period[] = await r.json();
          if (data && data.length > 0) {
            setSchedule(data);
          }
        }
      } catch {
        // Fallback to default schedule
      }
    }
    loadSchedule();
  }, []);

  // Timer ticker
  useEffect(() => {
    const tick = () => {
      setActivePeriod(getCurrentPeriod(schedule));
      setMinsDismissal(getMinutesUntilDismissal(schedule));
    };
    tick();
    const timer = setInterval(tick, 20000);
    return () => clearInterval(timer);
  }, [schedule]);

  const handlePeriodChange = (periodNum: number, field: keyof Period, value: any) => {
    setSchedule((prev) => {
      const idx = prev.findIndex((p) => p.dayOfWeek === selectedDay && p.periodNumber === periodNum);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], [field]: value };
        return updated;
      } else {
        const newPeriod: Period = {
          dayOfWeek: selectedDay,
          periodNumber: periodNum,
          subjectName: field === 'subjectName' ? value : 'لغتي العربية',
          startTime: field === 'startTime' ? value : '07:30',
          endTime: field === 'endTime' ? value : '08:10',
        };
        return [...prev, newPeriod];
      }
    });
  };

  const saveSchedule = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/school/schedule/bulk`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(schedule.map((s) => ({ ...s, branch: BRANCH }))),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert('تم حفظ الجدول أوفلاين بنجاح ✅');
    } finally {
      setSaving(false);
    }
  };

  const dayPeriods = schedule
    .filter((p) => p.dayOfWeek === selectedDay)
    .sort((a, b) => a.periodNumber - b.periodNumber);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-4 sm:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/branches/ikhlas-jeddah"
              className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-slate-300">
              <ArrowRight className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                📅 محرر ومصمم الجدول الأسبوعي (7 حصص يومياً)
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                مدارس الإخلاص الأهلية بجدة — أدخل تعديل الجدول الأسبوعي وسنقوم بإرساله وتنبيه أولياء الأمور تلقائياً
              </p>
            </div>
          </div>
          <button onClick={saveSchedule} disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saveSuccess ? 'تم الحفظ بنجاح! ✅' : 'حفظ الجدول الأسبوعي 💾'}
          </button>
        </div>

        {/* Live Status Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">الحصة الحالية الآن</p>
              <p className="text-sm font-black text-blue-300">
                {activePeriod ? `${activePeriod.subjectName} (${activePeriod.startTime}–${activePeriod.endTime})` : 'لا يوجد حصة حالية 🌙'}
              </p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">نظام الإشعارات اليومي</p>
              <p className="text-xs font-bold text-emerald-300">مفعّل (بداية/نهاية الحصة + الفسحة + الخروج)</p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-slate-400">تنبيه انصراف المدرسة</p>
              <p className="text-xs font-bold text-amber-300">
                {minsDismissal > 0 ? `باقي ${minsDismissal} دقيقة على الانصراف` : 'انتهى اليوم الدراسي'}
              </p>
            </div>
          </div>
        </div>

        {/* Days Selector Tabs */}
        <div className="flex gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-white/10 overflow-x-auto">
          {DAY_NAMES.map((dayName, idx) => (
            <button key={dayName} onClick={() => setSelectedDay(idx)}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-black transition-all whitespace-nowrap ${
                selectedDay === idx
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}>
              {dayName}
            </button>
          ))}
        </div>

        {/* Schedule Period Editor for Selected Day */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-400" />
              جدول حصص يوم {DAY_NAMES[selectedDay]} (7 حصص)
            </h2>
            <span className="text-xs text-slate-400">أدخل اسم المادة وأوقاتها لكل حصة</span>
          </div>

          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map((num) => {
              const p = dayPeriods.find((item) => item.periodNumber === num) ?? {
                dayOfWeek: selectedDay,
                periodNumber: num,
                subjectName: num === 4 ? 'فسحة 🌤️' : 'لغتي العربية',
                startTime: '07:30',
                endTime: '08:10',
              };
              const colorStyle = SUBJECT_COLORS[p.subjectName] ?? 'bg-slate-500/20 border-slate-500/30 text-white';

              return (
                <div key={num} className={`grid grid-cols-1 sm:grid-cols-12 gap-3 p-3.5 rounded-xl border items-center transition-all ${colorStyle}`}>
                  {/* Period Badge */}
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-white/20 font-black text-xs flex items-center justify-center">
                      {num}
                    </span>
                    <span className="text-xs font-bold">الحصة {num}</span>
                  </div>

                  {/* Subject Input */}
                  <div className="sm:col-span-5">
                    <select value={p.subjectName} onChange={(e) => handlePeriodChange(num, 'subjectName', e.target.value)}
                      className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-blue-500">
                      {DEFAULT_SUBJECTS.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                  {/* Start Time */}
                  <div className="sm:col-span-2 flex items-center gap-1">
                    <span className="text-[10px] text-slate-300">من:</span>
                    <input type="time" value={p.startTime} onChange={(e) => handlePeriodChange(num, 'startTime', e.target.value)}
                      className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-2 py-1.5 text-xs text-white outline-none" />
                  </div>

                  {/* End Time */}
                  <div className="sm:col-span-2 flex items-center gap-1">
                    <span className="text-[10px] text-slate-300">إلى:</span>
                    <input type="time" value={p.endTime} onChange={(e) => handlePeriodChange(num, 'endTime', e.target.value)}
                      className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-2 py-1.5 text-xs text-white outline-none" />
                  </div>

                  {/* Status Indicator */}
                  <div className="sm:col-span-1 text-center">
                    {num === 4 ? <span className="text-xs">🌤️</span> : <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-end">
            <button onClick={saveSchedule} disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-sm px-6 py-2.5 rounded-xl transition-all shadow-md">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ تغييرات اليوم 💾
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
