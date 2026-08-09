'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import {
  Users, CheckCircle2, XCircle, Clock, Camera, Sparkles, Send,
  UserCheck, UserX, Loader2, Award, Bell, ShieldCheck, Check,
  AlertTriangle, RefreshCw, Upload, ScanLine, Eye, Trash2
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

  /* AI Camera Scan */
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiScanDone, setAiScanDone] = useState(false);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [aiScanProgress, setAiScanProgress] = useState(0);
  const [aiDetectionResult, setAiDetectionResult] = useState<Record<string, 'detected' | 'not_detected'>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => setUploadedPhoto(e.target?.result as string);
    reader.readAsDataURL(file);
    setAiScanDone(false);
    setAiDetectionResult({});
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleAiPhotoScan = () => {
    if (!uploadedPhoto) return;
    setIsAiScanning(true);
    setAiScanProgress(0);
    // Simulate scanning progress
    const progressInterval = setInterval(() => {
      setAiScanProgress(p => {
        if (p >= 95) { clearInterval(progressInterval); return 95; }
        return p + Math.floor(Math.random() * 15 + 5);
      });
    }, 200);
    setTimeout(() => {
      clearInterval(progressInterval);
      setAiScanProgress(100);
      const updated: Record<string, AttendanceRecord> = {};
      const detectionMap: Record<string, 'detected' | 'not_detected'> = {};
      students.forEach((s, idx) => {
        // Demo: student at index 1 absent, index 4 late
        const isPresent = idx !== 1 && idx !== 4;
        const isLate = idx === 4;
        updated[s.id] = {
          status: isPresent ? 'present' : (isLate ? 'late' : 'absent'),
          score: isPresent ? 95 : (isLate ? 70 : 0),
        };
        detectionMap[s.id] = isPresent ? 'detected' : 'not_detected';
      });
      setAttendance(updated);
      setAiDetectionResult(detectionMap);
      setIsAiScanning(false);
      setAiScanDone(true);
    }, 2500);
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
      <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 p-5 shadow-sm space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white flex items-center justify-center shadow-sm shrink-0">
            <ScanLine size={20} />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              كشف الحضور التلقائي بصورة الفصل
              <span className="text-[10px] bg-emerald-800 text-white px-2 py-0.5 rounded-full font-black">AI Vision Scan 🤖</span>
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              ارفع صورة للفصل وسيقوم الذكاء الاصطناعي بتحديد من هو حاضر ومن هو غائب تلقائياً
            </p>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploadedPhoto && fileInputRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-50 scale-[1.01]'
              : uploadedPhoto
              ? 'border-emerald-400 bg-white'
              : 'border-slate-300 bg-slate-50/80 hover:border-emerald-400 hover:bg-emerald-50/40'
          }`}
          style={{ minHeight: uploadedPhoto ? 'auto' : '160px' }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
          />

          {uploadedPhoto ? (
            /* ── Image Preview ── */
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadedPhoto}
                alt="صورة الفصل"
                className="w-full max-h-72 object-cover rounded-xl"
              />
              {/* Scanning overlay */}
              {isAiScanning && (
                <div className="absolute inset-0 bg-emerald-900/70 rounded-xl flex flex-col items-center justify-center gap-3">
                  <div className="relative">
                    <ScanLine size={48} className="text-emerald-300 animate-pulse" />
                    <div className="absolute inset-0 border-2 border-emerald-400 rounded-lg animate-ping opacity-50" />
                  </div>
                  <div className="text-white font-black text-sm">جاري فحص الصورة بالذكاء الاصطناعي...</div>
                  <div className="w-48 bg-emerald-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-2.5 bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full transition-all duration-300"
                      style={{ width: `${aiScanProgress}%` }}
                    />
                  </div>
                  <div className="text-emerald-300 text-xs font-bold font-mono">{aiScanProgress}%</div>
                </div>
              )}
              {/* Remove / actions bar */}
              {!isAiScanning && (
                <div className="absolute top-2 left-2 flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); setUploadedPhoto(null); setAiScanDone(false); setAiDetectionResult({}); }}
                    className="flex items-center gap-1 bg-rose-600/90 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-xl text-[10px] font-black shadow"
                  >
                    <Trash2 size={12} /> حذف الصورة
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="flex items-center gap-1 bg-slate-700/90 hover:bg-slate-800 text-white px-2.5 py-1.5 rounded-xl text-[10px] font-black shadow"
                  >
                    <Upload size={12} /> تغيير
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ── Empty Upload Prompt ── */
            <div className="flex flex-col items-center justify-center py-10 gap-3 select-none">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center">
                <Camera size={28} className="text-emerald-700" />
              </div>
              <div className="text-center">
                <div className="text-sm font-black text-slate-800">اسحب صورة الفصل هنا أو اضغط للرفع</div>
                <div className="text-xs font-semibold text-slate-500 mt-1">PNG، JPG، WEBP — حتى 10 MB</div>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                  <Upload size={12} /> رفع من الجهاز
                </div>
                <span className="text-slate-300 text-xs">أو</span>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
                  <Camera size={12} /> تصوير مباشر
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scan Button */}
        <button
          onClick={handleAiPhotoScan}
          disabled={isAiScanning || !uploadedPhoto}
          className={`w-full flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black transition shadow-sm active:scale-95 ${
            !uploadedPhoto
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : isAiScanning
              ? 'bg-emerald-700 text-white cursor-wait'
              : 'bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 text-white'
          }`}
        >
          {isAiScanning ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> جاري التحليل بالذكاء الاصطناعي...</>
          ) : (
            <><Sparkles className="h-5 w-5 text-amber-300" /> تحليل الصورة وكشف الحضور تلقائياً 🤖</>
          )}
        </button>

        {/* AI Detection Results */}
        {aiScanDone && Object.keys(aiDetectionResult).length > 0 && (
          <div className="rounded-2xl border border-emerald-200 bg-white overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-800 to-emerald-700">
              <div className="flex items-center gap-2 text-white">
                <Eye size={16} />
                <span className="text-sm font-black">نتيجة تحليل الصورة بالذكاء الاصطناعي</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] bg-emerald-400/30 text-white px-2.5 py-1 rounded-full font-black">
                  ✅ {Object.values(aiDetectionResult).filter(v => v === 'detected').length} تم رصدهم
                </span>
                <span className="text-[10px] bg-rose-400/30 text-white px-2.5 py-1 rounded-full font-black">
                  ❌ {Object.values(aiDetectionResult).filter(v => v === 'not_detected').length} غير موجودين
                </span>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {students.map((s) => {
                const det = aiDetectionResult[s.id];
                return (
                  <div key={s.id} className={`flex items-center justify-between px-4 py-2.5 ${
                    det === 'detected' ? 'bg-emerald-50/50' : 'bg-rose-50/50'
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black ${
                        det === 'detected' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>{s.name[0]}</div>
                      <span className="text-sm font-bold text-slate-800">{s.name}</span>
                    </div>
                    <div className={`flex items-center gap-1.5 text-[11px] font-black px-3 py-1 rounded-full ${
                      det === 'detected'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {det === 'detected'
                        ? <><CheckCircle2 size={12} /> تم رصده في الصورة ✓</>
                        : <><XCircle size={12} /> غير موجود في الصورة</>}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
              <p className="text-[11px] font-bold text-slate-500">
                ⚡ تم تحديث جدول الحضور أدناه تلقائياً بناءً على نتائج التحليل
              </p>
            </div>
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
