'use client';

import { useState, useRef } from 'react';
import {
  Users, CheckCircle2, XCircle, Clock, Camera, Sparkles, Send,
  UserCheck, UserX, Loader2, Award, Bell, ShieldCheck, Check,
  AlertTriangle, RefreshCw
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
}

interface AttendanceRecord {
  status: 'present' | 'absent' | 'late';
  score: number;
  exitLogged?: string;
}

interface Props {
  students: Student[];
  onSaveAttendance: (attendanceMap: Record<string, AttendanceRecord>) => Promise<void>;
}

export default function AttendanceTabManager({ students, onSaveAttendance }: Props) {
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>(() => {
    const init: Record<string, AttendanceRecord> = {};
    students.forEach(s => {
      init[s.id] = { status: 'present', score: 95 };
    });
    return init;
  });

  const [exitLogs, setExitLogs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  /* AI Camera Scan Simulation */
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiScanDone, setAiScanDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAiPhotoScan = () => {
    setIsAiScanning(true);
    setTimeout(() => {
      const updated: Record<string, AttendanceRecord> = {};
      students.forEach((s, idx) => {
        const isPresent = idx !== 1 && idx !== 4; // demo logic
        updated[s.id] = {
          status: isPresent ? 'present' : (idx === 4 ? 'late' : 'absent'),
          score: isPresent ? 95 : 0,
        };
      });
      setAttendance(updated);
      setIsAiScanning(false);
      setAiScanDone(true);
      setTimeout(() => setAiScanDone(false), 4000);
    }, 1800);
  };

  const handleStatusChange = (sId: string, status: 'present' | 'absent' | 'late') => {
    setAttendance(prev => ({
      ...prev,
      [sId]: {
        ...prev[sId],
        status,
        score: status === 'absent' ? 0 : (prev[sId]?.score || 90),
      }
    }));
  };

  const handleScoreChange = (sId: string, score: number) => {
    setAttendance(prev => ({
      ...prev,
      [sId]: {
        ...prev[sId],
        score,
      }
    }));
  };

  const handleLogExit = (sId: string, name: string) => {
    const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    setExitLogs(prev => ({ ...prev, [sId]: timeStr }));
    alert(`✅ تم توثيق خروج الطالب (${name}) الساعة ${timeStr} بنجاح!`);
  };

  const handleSendWhatsAppAlert = (s: Student) => {
    const record = attendance[s.id] ?? { status: 'present' };
    const statusText = record.status === 'absent' ? 'غائب اليوم' : 'متأخر عن موعد الحصة';
    const text = `تنبيه من مدارس الإخلاص الأهلية بجدة 🏫%0Aنحيطكم علماً بأن الطالب (${encodeURIComponent(s.name)}) ممرج في كشف الحضور كـ (${statusText}). نرجو التواصل مع إدارة المدرسة للإفادة.`;
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveAttendance(attendance);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendance).filter(a => a.status === 'present').length;
  const absentCount = Object.values(attendance).filter(a => a.status === 'absent').length;
  const lateCount = Object.values(attendance).filter(a => a.status === 'late').length;

  return (
    <div className="space-y-6 text-slate-900" dir="rtl">

      {/* ── BANNER HEADER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06392c] via-[#0b4d3c] to-[#04291e] p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-6 w-6 text-amber-400" />
              <span className="font-black text-emerald-200 text-sm">منصة مَسَار · كشف الحضور والانضباط الذكي</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">كشف الحضور والتأخر والتوثيق اليومي 📋</h2>
            <p className="mt-1 text-sm font-semibold text-emerald-100/90">
              توثيق الحضور والغياب، التقييم الصفي، رصد أوقات الخروج، والتحليل التلقائي بصورة الفصل بالذكاء الاصطناعي.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 px-6 py-3 rounded-2xl text-xs font-black transition shadow-lg active:scale-95 shrink-0 border border-amber-300/60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {savedSuccess ? '✅ تم حفظ الكشف وإرسال التنبيهات!' : 'حفظ الكشف وإرسال الإشعارات 🚀'}
          </button>
        </div>
      </div>

      {/* ── METRICS SUMMARY CARDS ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <span className="text-2xl font-black text-emerald-700 font-mono">{presentCount}</span>
          <span className="text-xs font-bold text-emerald-800 block mt-1">✅ حاضر بالصف</span>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
          <span className="text-2xl font-black text-rose-700 font-mono">{absentCount}</span>
          <span className="text-xs font-bold text-rose-800 block mt-1">❌ غائب اليوم</span>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
          <span className="text-2xl font-black text-amber-700 font-mono">{lateCount}</span>
          <span className="text-xs font-bold text-amber-800 block mt-1">⏰ متأخر</span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
          <span className="text-2xl font-black text-slate-800 font-mono">{students.length}</span>
          <span className="text-xs font-bold text-slate-600 block mt-1">إجمالي الطلاب</span>
        </div>
      </div>

      {/* ── AI FACIAL SCAN CARD ── */}
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-sm shrink-0">
              <Camera size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                كشف الحضور التلقائي بصورة الفصل (AI Vision Scan) 🤖
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                التقط صورة للطلاب بالصف وسيقوم الذكاء الاصطناعي برصد الحضور والغياب تلقائياً!
              </p>
            </div>
          </div>

          <button
            onClick={handleAiPhotoScan}
            disabled={isAiScanning}
            className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 text-xs font-black transition shadow-sm active:scale-95 shrink-0"
          >
            {isAiScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-amber-300" />}
            {isAiScanning ? 'جاري فحص الصورة بالـ AI...' : 'التقاط صوَر الفصل ورصد الحضور 📸'}
          </button>
        </div>

        {aiScanDone && (
          <div className="p-3 bg-emerald-100/90 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-black flex items-center gap-2">
            <CheckCircle2 size={16} /> تم الكشف التلقائي بنجاح! تم تحديث حالة الحضور لجميع الطلاب بالجدول أدناه.
          </div>
        )}
      </div>

      {/* ── STUDENT ATTENDANCE CARDS LIST ── */}
      <div className="space-y-3">
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" /> كشف الطلاب وتوثيق الأداء الصفي
        </h3>

        <div className="grid grid-cols-1 gap-3">
          {students.map((student) => {
            const record = attendance[student.id] || { status: 'present', score: 90 };
            const exited = exitLogs[student.id];

            return (
              <div
                key={student.id}
                className={`rounded-2xl border bg-white p-4 shadow-sm transition space-y-3 ${
                  record.status === 'present'
                    ? 'border-slate-200'
                    : record.status === 'absent'
                    ? 'border-rose-200 bg-rose-50/20'
                    : 'border-amber-200 bg-amber-50/20'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                  {/* Student Avatar & Name */}
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black border shadow-xs ${
                        record.status === 'present'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : record.status === 'absent'
                          ? 'bg-rose-50 border-rose-300 text-rose-800'
                          : 'bg-amber-50 border-amber-300 text-amber-800'
                      }`}
                    >
                      {student.name[0]}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-slate-900">{student.name}</h4>
                      {exited && (
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full inline-block mt-0.5">
                          خرج الساعة {exited} 🕒
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status Toggle Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStatusChange(student.id, 'present')}
                      className={`text-xs px-3.5 py-1.5 rounded-xl font-black border transition ${
                        record.status === 'present'
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      ✅ حاضر
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.id, 'absent')}
                      className={`text-xs px-3.5 py-1.5 rounded-xl font-black border transition ${
                        record.status === 'absent'
                          ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      ❌ غائب
                    </button>
                    <button
                      onClick={() => handleStatusChange(student.id, 'late')}
                      className={`text-xs px-3.5 py-1.5 rounded-xl font-black border transition ${
                        record.status === 'late'
                          ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      ⏰ متأخر
                    </button>
                  </div>
                </div>

                {/* Score & Extra Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                  {/* Score Slider */}
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-500">تقييم الأداء الصفي:</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={record.score}
                      onChange={e => handleScoreChange(student.id, Number(e.target.value))}
                      className="w-28 accent-emerald-600 cursor-pointer"
                    />
                    <span className="font-black text-emerald-800 font-mono w-10 text-right">{record.score}%</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleLogExit(student.id, student.name)}
                      className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-xl font-bold transition text-xs"
                    >
                      <Clock size={13} /> توثيق وقت الخروج
                    </button>
                    <button
                      onClick={() => handleSendWhatsAppAlert(student)}
                      className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold transition text-xs"
                    >
                      <Bell size={13} /> تنبيه WhatsApp 📱
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
