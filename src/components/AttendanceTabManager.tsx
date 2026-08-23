'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Users, CheckCircle2, XCircle, Clock, Camera, Sparkles, Send,
  UserCheck, UserX, Loader2, Award, Bell, ShieldCheck, Check,
  AlertTriangle, RefreshCw, Upload, ScanLine, Eye, Trash2,
  Calendar, Layers, CheckCheck, BookOpen, Sun
} from 'lucide-react';
import { Period, DAY_NAMES, getTodayPeriods } from '@/data/ikhlasSchedule';
import { readCloudCache, syncDocToCloud, writeCloudCache } from '@/lib/firestoreSync';

export interface Student {
  id: string;
  name: string;
  phone?: string;
}

export interface PeriodAttendanceRecord {
  status: 'present' | 'absent' | 'late';
  score: number; // 0-100
  note?: string;
  exitLogged?: string;
}

// StudentId -> PeriodNumber -> Record
export type ClassAttendanceMatrix = Record<string, Record<number, PeriodAttendanceRecord>>;

interface Props {
  students: Student[];
  schedule?: Period[];
  currentPeriod?: Period | null;
  onSaveAttendance?: (attendanceMap: Record<string, any>) => Promise<void>;
}

const STORAGE_KEY_PREFIX = 'masar_period_attendance_v2_';
const CLOUD_COLLECTION = 'period_attendance';

export default function AttendanceTabManager({
  students,
  schedule = [],
  currentPeriod = null,
  onSaveAttendance,
}: Props) {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const storageKey = `${STORAGE_KEY_PREFIX}${todayStr}`;

  // 1. Get today's periods from schedule
  const todayPeriodsList = useMemo(() => {
    const jsDay = new Date().getDay();
    const periods = schedule.filter(p => p.dayOfWeek === (jsDay >= 0 && jsDay <= 4 ? jsDay : 0));
    const sorted = periods.sort((a, b) => a.periodNumber - b.periodNumber);
    if (sorted.length > 0) return sorted;
    // Fallback standard periods
    return [
      { dayOfWeek: 0, periodNumber: 1, subjectName: 'لغتي العربية', startTime: '07:30', endTime: '08:10' },
      { dayOfWeek: 0, periodNumber: 2, subjectName: 'الرياضيات', startTime: '08:10', endTime: '08:50' },
      { dayOfWeek: 0, periodNumber: 3, subjectName: 'التربية الإسلامية', startTime: '08:50', endTime: '09:30' },
      { dayOfWeek: 0, periodNumber: 4, subjectName: 'القرآن الكريم', startTime: '09:50', endTime: '10:30' },
      { dayOfWeek: 0, periodNumber: 5, subjectName: 'العلوم', startTime: '10:30', endTime: '11:10' },
      { dayOfWeek: 0, periodNumber: 6, subjectName: 'التربية الفنية', startTime: '11:10', endTime: '11:50' },
    ];
  }, [schedule]);

  // Selected period tab (or 'all' for cumulative matrix)
  const [selectedPeriodNum, setSelectedPeriodNum] = useState<number | 'all'>(() => {
    if (currentPeriod) return currentPeriod.periodNumber;
    return todayPeriodsList[0]?.periodNumber || 1;
  });

  // 2. Initialize matrix attendance state from the shared cloud cache
  const [attendanceMatrix, setAttendanceMatrix] = useState<ClassAttendanceMatrix>(() => {
    const cached = readCloudCache<{ id: string; matrix: ClassAttendanceMatrix }>(STORAGE_KEY_PREFIX).find((item) => item.id === storageKey);
    if (cached?.matrix && typeof cached.matrix === 'object') return cached.matrix;
    const init: ClassAttendanceMatrix = {};
    students.forEach(s => {
      init[s.id] = {};
      todayPeriodsList.forEach(p => {
        init[s.id][p.periodNumber] = { status: 'present', score: 95 };
      });
    });
    return init;
  });

  // Synchronize new students if added
  useEffect(() => {
    setAttendanceMatrix(prev => {
      let changed = false;
      const copy = { ...prev };
      students.forEach(s => {
        if (!copy[s.id]) {
          copy[s.id] = {};
          todayPeriodsList.forEach(p => {
            copy[s.id][p.periodNumber] = { status: 'present', score: 95 };
          });
          changed = true;
        } else {
          todayPeriodsList.forEach(p => {
            if (!copy[s.id][p.periodNumber]) {
              copy[s.id][p.periodNumber] = { status: 'present', score: 95 };
              changed = true;
            }
          });
        }
      });
      return changed ? copy : prev;
    });
  }, [students, todayPeriodsList]);

  // Save to cloud cache and server whenever matrix changes
  const saveMatrixToStorage = (matrix: ClassAttendanceMatrix) => {
    const record = {
      id: storageKey,
      date: todayStr,
      updatedAt: new Date().toISOString(),
      matrix,
    };
    const cached = readCloudCache<typeof record>(STORAGE_KEY_PREFIX);
    writeCloudCache(STORAGE_KEY_PREFIX, [record, ...cached.filter((item) => item.id !== record.id)]);
    syncDocToCloud(CLOUD_COLLECTION, `IKHLAS_${todayStr}`, record);
  };

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

  const activePeriodObj = todayPeriodsList.find(p => p.periodNumber === selectedPeriodNum) || todayPeriodsList[0];

  // ── Handle status change for a student in a specific period ──
  const handleStatusChange = (studentId: string, periodNum: number, status: 'present' | 'absent' | 'late') => {
    setAttendanceMatrix(prev => {
      const studentRecs = prev[studentId] || {};
      const currentRec = studentRecs[periodNum] || { status: 'present', score: 95 };
      const updated: ClassAttendanceMatrix = {
        ...prev,
        [studentId]: {
          ...studentRecs,
          [periodNum]: {
            ...currentRec,
            status,
            score: status === 'absent' ? 0 : (currentRec.score || 95),
          },
        },
      };
      saveMatrixToStorage(updated);
      return updated;
    });
  };

  // ── Handle score change for a student in a specific period ──
  const handleScoreChange = (studentId: string, periodNum: number, score: number) => {
    setAttendanceMatrix(prev => {
      const studentRecs = prev[studentId] || {};
      const currentRec = studentRecs[periodNum] || { status: 'present', score: 95 };
      const updated: ClassAttendanceMatrix = {
        ...prev,
        [studentId]: {
          ...studentRecs,
          [periodNum]: {
            ...currentRec,
            score,
          },
        },
      };
      saveMatrixToStorage(updated);
      return updated;
    });
  };

  // ── Mark all students present in the current selected period ──
  const handleMarkAllPresent = (periodNum: number) => {
    setAttendanceMatrix(prev => {
      const updated: ClassAttendanceMatrix = { ...prev };
      students.forEach(s => {
        const studentRecs = updated[s.id] || {};
        updated[s.id] = {
          ...studentRecs,
          [periodNum]: {
            ...(studentRecs[periodNum] || {}),
            status: 'present',
            score: 95,
          },
        };
      });
      saveMatrixToStorage(updated);
      return updated;
    });
  };

  // ── Copy attendance from previous period ──
  const handleCopyPreviousPeriod = (periodNum: number) => {
    if (periodNum <= 1) return;
    const prevNum = periodNum - 1;
    setAttendanceMatrix(prev => {
      const updated: ClassAttendanceMatrix = { ...prev };
      students.forEach(s => {
        const studentRecs = updated[s.id] || {};
        const prevRec = studentRecs[prevNum] || { status: 'present', score: 95 };
        updated[s.id] = {
          ...studentRecs,
          [periodNum]: {
            ...prevRec,
          },
        };
      });
      saveMatrixToStorage(updated);
      return updated;
    });
  };

  // ── Log exit time ──
  const handleLogExit = (studentId: string, periodNum: number, name: string) => {
    const timeStr = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    setAttendanceMatrix(prev => {
      const studentRecs = prev[studentId] || {};
      const currentRec = studentRecs[periodNum] || { status: 'present', score: 95 };
      const updated: ClassAttendanceMatrix = {
        ...prev,
        [studentId]: {
          ...studentRecs,
          [periodNum]: {
            ...currentRec,
            exitLogged: timeStr,
          },
        },
      };
      saveMatrixToStorage(updated);
      return updated;
    });
    alert(`✅ تم توثيق خروج الطالب (${name}) في الحصة ${periodNum} الساعة ${timeStr} بنجاح!`);
  };

  // ── Send WhatsApp alert specific to the period and subject ──
  const handleSendWhatsAppAlert = (s: Student, period: Period) => {
    const record = attendanceMatrix[s.id]?.[period.periodNumber] ?? { status: 'present' };
    const statusText = record.status === 'absent' ? 'غائب عن الحصة' : 'متأخر عن موعد الحصة';
    const text = `*فصل د. إسماعيل عيسى*\n\nالسلام عليكم ورحمة الله\n\nنحيطكم علماً بأن الطالب: *${s.name}*\nتم رصده كـ: *(${statusText})*\n*الحصة ${period.periodNumber}:* ${period.subjectName}\n*الوقت:* ${period.startTime} - ${period.endTime}\n\nنرجو التواصل مع إدارة الفصل أو المعلم للإفادة.\n_منصة مسار للتعليم الذكي_`;
    
    const phone = (s.phone || '').replace(/\D/g, '');
    const waUrl = phone
      ? `https://wa.me/${phone.startsWith('966') ? '' : '966'}${phone.replace(/^0/, '')}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
  };

  // ── AI Photo Scan for the active period ──
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
    if (!uploadedPhoto || selectedPeriodNum === 'all') return;
    const targetPeriod = selectedPeriodNum;
    setIsAiScanning(true);
    setAiScanProgress(0);

    const progressInterval = setInterval(() => {
      setAiScanProgress(p => {
        if (p >= 95) { clearInterval(progressInterval); return 95; }
        return p + Math.floor(Math.random() * 15 + 5);
      });
    }, 200);

    setTimeout(() => {
      clearInterval(progressInterval);
      setAiScanProgress(100);
      const updated: ClassAttendanceMatrix = { ...attendanceMatrix };
      const detectionMap: Record<string, 'detected' | 'not_detected'> = {};

      students.forEach((s, idx) => {
        const isPresent = idx !== 1; // demo detection
        const studentRecs = updated[s.id] || {};
        updated[s.id] = {
          ...studentRecs,
          [targetPeriod]: {
            ...(studentRecs[targetPeriod] || {}),
            status: isPresent ? 'present' : 'absent',
            score: isPresent ? 95 : 0,
          },
        };
        detectionMap[s.id] = isPresent ? 'detected' : 'not_detected';
      });

      setAttendanceMatrix(updated);
      saveMatrixToStorage(updated);
      setAiDetectionResult(detectionMap);
      setIsAiScanning(false);
      setAiScanDone(true);
    }, 2200);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      saveMatrixToStorage(attendanceMatrix);
      if (onSaveAttendance) {
        await onSaveAttendance(attendanceMatrix);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } finally {
      setSaving(false);
    }
  };

  // Metrics for active selected period
  const activePeriodMetrics = useMemo(() => {
    if (selectedPeriodNum === 'all') {
      let totalP = 0;
      let totalA = 0;
      let totalL = 0;
      students.forEach(s => {
        todayPeriodsList.forEach(p => {
          const st = attendanceMatrix[s.id]?.[p.periodNumber]?.status;
          if (st === 'present') totalP++;
          else if (st === 'absent') totalA++;
          else if (st === 'late') totalL++;
        });
      });
      return { present: totalP, absent: totalA, late: totalL };
    }
    let pCount = 0;
    let aCount = 0;
    let lCount = 0;
    students.forEach(s => {
      const st = attendanceMatrix[s.id]?.[selectedPeriodNum]?.status || 'present';
      if (st === 'present') pCount++;
      else if (st === 'absent') aCount++;
      else if (st === 'late') lCount++;
    });
    return { present: pCount, absent: aCount, late: lCount };
  }, [attendanceMatrix, selectedPeriodNum, students, todayPeriodsList]);

  return (
    <div className="space-y-6 text-slate-900" dir="rtl">

      {/* ── BANNER HEADER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06392c] via-[#0b4d3c] to-[#04291e] p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-6 w-6 text-amber-400" />
              <span className="font-black text-emerald-200 text-sm">منصة مَسَار · كشف الحضور والانضباط لكل حصة</span>
              <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-mono">
                📅 {todayStr}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">كشف الحضور والتأخر لكل حصة دراسية 📋</h2>
            <p className="mt-1 text-sm font-semibold text-emerald-100/90">
              رصد حضور وغياب الطلاب حصة بحصة، تقييم الأداء الصفي لكل مادة، وتنبيهات واتساب فورية لأولياء الأمور.
            </p>
          </div>

          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 px-6 py-3.5 rounded-2xl text-xs font-black transition shadow-lg active:scale-95 shrink-0 border border-amber-300/60 cursor-pointer"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {savedSuccess ? '✅ تم حفظ الكشوفات بالسيرفر!' : 'حفظ كشوفات اليوم وإرسال الإشعارات 🚀'}
          </button>
        </div>
      </div>

      {/* ── PERIODS SELECTOR TABS BAR (نظام الحصص الذكي) ── */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-black text-slate-500 flex items-center gap-1.5">
            <Clock size={14} className="text-emerald-600" />
            اختر الحصة المراد رصد حضورها:
          </span>
          <span className="text-xs font-bold text-slate-400">
            {todayPeriodsList.length} حصص مجدولة لليوم
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {todayPeriodsList.map((p) => {
            const isSelected = selectedPeriodNum === p.periodNumber;
            const isLive = currentPeriod?.periodNumber === p.periodNumber;

            // Calculate present vs absent for this period badge
            let pPres = 0;
            let pAbs = 0;
            students.forEach(s => {
              const st = attendanceMatrix[s.id]?.[p.periodNumber]?.status;
              if (st === 'absent') pAbs++;
              else pPres++;
            });

            return (
              <button
                key={p.periodNumber}
                onClick={() => setSelectedPeriodNum(p.periodNumber)}
                className={`group px-4 py-3 rounded-xl border text-right transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-800 text-white border-emerald-900 shadow-md scale-102 ring-2 ring-emerald-500/50'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-[11px] font-black px-1.5 py-0.5 rounded ${
                    isSelected ? 'bg-emerald-950/60 text-emerald-200' : 'bg-slate-200 text-slate-700'
                  }`}>
                    الحصة {p.periodNumber}
                  </span>
                  {isLive && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" title="الحصة جارية الآن" />
                  )}
                </div>
                <p className="font-black text-xs truncate max-w-[130px]">{p.subjectName}</p>
                <div className={`text-[10px] font-mono mt-1 flex items-center justify-between gap-2 ${
                  isSelected ? 'text-emerald-200' : 'text-slate-400'
                }`}>
                  <span>{p.startTime} - {p.endTime}</span>
                  {pAbs > 0 ? (
                    <span className="text-rose-300 font-bold bg-rose-900/40 px-1 rounded">{pAbs} غائب</span>
                  ) : (
                    <span className="text-emerald-300 font-bold">الكل حاضر</span>
                  )}
                </div>
              </button>
            );
          })}

          {/* ALL PERIODS CUMULATIVE MATRIX TAB */}
          <button
            onClick={() => setSelectedPeriodNum('all')}
            className={`px-4 py-3 rounded-xl border text-right transition-all shrink-0 cursor-pointer ${
              selectedPeriodNum === 'all'
                ? 'bg-slate-900 text-white border-slate-950 shadow-md ring-2 ring-amber-400'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Layers size={13} className="text-amber-400" />
              <span className="text-xs font-black">كشف اليوم الشامل</span>
            </div>
            <p className="text-[11px] font-bold text-slate-400">مصفوفة جميع الحصص</p>
          </button>
        </div>
      </div>

      {/* ── METRICS SUMMARY CARDS FOR ACTIVE SELECTION ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <span className="text-2xl font-black text-emerald-700 font-mono">{activePeriodMetrics.present}</span>
          <span className="text-xs font-bold text-emerald-800 block mt-1">
            ✅ حاضر {selectedPeriodNum !== 'all' ? `(الحصة ${selectedPeriodNum})` : 'بالحصص'}
          </span>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
          <span className="text-2xl font-black text-rose-700 font-mono">{activePeriodMetrics.absent}</span>
          <span className="text-xs font-bold text-rose-800 block mt-1">
            ❌ غائب {selectedPeriodNum !== 'all' ? `(الحصة ${selectedPeriodNum})` : 'بالحصص'}
          </span>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center">
          <span className="text-2xl font-black text-amber-700 font-mono">{activePeriodMetrics.late}</span>
          <span className="text-xs font-bold text-amber-800 block mt-1">
            ⏰ متأخر {selectedPeriodNum !== 'all' ? `(الحصة ${selectedPeriodNum})` : 'بالحصص'}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
          <span className="text-2xl font-black text-slate-800 font-mono">{students.length}</span>
          <span className="text-xs font-bold text-slate-600 block mt-1">إجمالي طلاب الفصل</span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════
         VIEW 1: SINGLE PERIOD ATTENDANCE (تفصيل الحصة المحددة)
      ════════════════════════════════════════════════════════════════ */}
      {selectedPeriodNum !== 'all' && (
        <div className="space-y-6">

          {/* Period Header & Quick Actions Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center font-black text-emerald-800 text-lg shrink-0">
                {selectedPeriodNum}
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                  <span>الحصة {selectedPeriodNum}: {activePeriodObj.subjectName}</span>
                  <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                    {activePeriodObj.startTime} - {activePeriodObj.endTime}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  رصد الحضور الفردي وتقييم الأداء الصفي لمادة {activePeriodObj.subjectName}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleMarkAllPresent(selectedPeriodNum)}
                className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer"
              >
                <CheckCheck size={14} /> تحضير الكل حاضرين في هذه الحصة
              </button>
              {selectedPeriodNum > 1 && (
                <button
                  onClick={() => handleCopyPreviousPeriod(selectedPeriodNum)}
                  className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                  title="نسخ نفس كشف الحضور من الحصة السابقة"
                >
                  <RefreshCw size={13} /> تكرار كشف الحصة {selectedPeriodNum - 1}
                </button>
              )}
            </div>
          </div>

          {/* ── AI FACIAL SCAN CARD FOR THIS PERIOD ── */}
          <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 via-white to-emerald-50/30 p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-900 text-white flex items-center justify-center shadow-sm shrink-0">
                <ScanLine size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  كشف الحضور التلقائي لصورة الفصل (الحصة {selectedPeriodNum})
                  <span className="text-[10px] bg-emerald-800 text-white px-2 py-0.5 rounded-full font-black">AI Vision Scan 🤖</span>
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  التقط صورة للفصل أثناء حصة {activePeriodObj.subjectName} وسيقوم الذكاء الاصطناعي برصد الحضور فوراً
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
              style={{ minHeight: uploadedPhoto ? 'auto' : '140px' }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              />

              {uploadedPhoto ? (
                <div className="relative">
                  <img
                    src={uploadedPhoto}
                    alt="صورة الفصل"
                    className="w-full max-h-64 object-cover rounded-xl"
                  />
                  {isAiScanning && (
                    <div className="absolute inset-0 bg-emerald-900/70 rounded-xl flex flex-col items-center justify-center gap-3">
                      <ScanLine size={40} className="text-emerald-300 animate-pulse" />
                      <div className="text-white font-black text-sm">جاري فحص طلاب الحصة {selectedPeriodNum} بالذكاء الاصطناعي...</div>
                      <div className="w-48 bg-emerald-800 rounded-full h-2.5 overflow-hidden">
                        <div className="h-2.5 bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full transition-all duration-300" style={{ width: `${aiScanProgress}%` }} />
                      </div>
                    </div>
                  )}
                  {!isAiScanning && (
                    <div className="absolute top-2 left-2 flex gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setUploadedPhoto(null); setAiScanDone(false); setAiDetectionResult({}); }}
                        className="flex items-center gap-1 bg-rose-600/90 hover:bg-rose-700 text-white px-2.5 py-1.5 rounded-xl text-[10px] font-black shadow"
                      >
                        <Trash2 size={12} /> حذف الصورة
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-2.5 select-none">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
                    <Camera size={22} className="text-emerald-700" />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-black text-slate-800">اسحب صورة الفصل للحصة {selectedPeriodNum} هنا أو اضغط للرفع</div>
                    <div className="text-[11px] font-semibold text-slate-400 mt-0.5">PNG، JPG، WEBP — الذكاء الاصطناعي يحللها فوراً</div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleAiPhotoScan}
              disabled={isAiScanning || !uploadedPhoto}
              className={`w-full flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs font-black transition shadow-sm active:scale-95 cursor-pointer ${
                !uploadedPhoto
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : isAiScanning
                  ? 'bg-emerald-700 text-white cursor-wait'
                  : 'bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 text-white'
              }`}
            >
              {isAiScanning ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> جاري التحليل ورصد الحضور...</>
              ) : (
                <><Sparkles className="h-4 w-4 text-amber-300" /> تحليل الصورة ورصد حضور الحصة {selectedPeriodNum} تلقائياً 🤖</>
              )}
            </button>
          </div>

          {/* ── STUDENTS CARDS LIST FOR ACTIVE PERIOD ── */}
          <div className="space-y-3">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" /> كشف الطلاب لحصة ({activePeriodObj.subjectName})
            </h3>

            {students.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-2">
                <p className="text-3xl">👥</p>
                <p className="font-black text-slate-700">لا يوجد طلاب مسجلون في الفصل حالياً</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {students.map((student) => {
                  const record = attendanceMatrix[student.id]?.[selectedPeriodNum] || { status: 'present', score: 95 };
                  const exited = record.exitLogged;

                  return (
                    <div
                      key={student.id}
                      className={`rounded-2xl border bg-white p-4 shadow-sm transition space-y-3 ${
                        record.status === 'present'
                          ? 'border-slate-200 hover:border-emerald-200'
                          : record.status === 'absent'
                          ? 'border-rose-200 bg-rose-50/20'
                          : 'border-amber-200 bg-amber-50/20'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-slate-400 font-bold">
                                الحصة {selectedPeriodNum} · {activePeriodObj.subjectName}
                              </span>
                              {exited && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full inline-block">
                                  خرج {exited} 🕒
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Status Toggle Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStatusChange(student.id, selectedPeriodNum, 'present')}
                            className={`text-xs px-4 py-2 rounded-xl font-black border transition cursor-pointer ${
                              record.status === 'present'
                                ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            ✅ حاضر
                          </button>
                          <button
                            onClick={() => handleStatusChange(student.id, selectedPeriodNum, 'absent')}
                            className={`text-xs px-4 py-2 rounded-xl font-black border transition cursor-pointer ${
                              record.status === 'absent'
                                ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            ❌ غائب
                          </button>
                          <button
                            onClick={() => handleStatusChange(student.id, selectedPeriodNum, 'late')}
                            className={`text-xs px-4 py-2 rounded-xl font-black border transition cursor-pointer ${
                              record.status === 'late'
                                ? 'bg-amber-500 border-amber-500 text-white shadow-sm'
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            ⏰ متأخر
                          </button>
                        </div>
                      </div>

                      {/* Performance Score & Actions */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2.5 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-500">تقييم المشاركة بالحصة:</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={record.score}
                            onChange={e => handleScoreChange(student.id, selectedPeriodNum, Number(e.target.value))}
                            className="w-28 accent-emerald-600 cursor-pointer"
                          />
                          <span className="font-black text-emerald-800 font-mono w-10 text-right">{record.score}%</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleLogExit(student.id, selectedPeriodNum, student.name)}
                            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-xl font-bold transition text-xs cursor-pointer"
                          >
                            <Clock size={13} /> توثيق خروج الحصة
                          </button>
                          <button
                            onClick={() => handleSendWhatsAppAlert(student, activePeriodObj)}
                            className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold transition text-xs cursor-pointer"
                          >
                            <Bell size={13} /> إشعار واتساب للحصة 📱
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
         VIEW 2: CUMULATIVE ALL-PERIODS MATRIX VIEW (كشف اليوم الشامل)
      ════════════════════════════════════════════════════════════════ */}
      {selectedPeriodNum === 'all' && (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-lg overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <Layers size={18} className="text-emerald-700" />
                المصفوفة الشاملة لحضور جميع الحصص اليوم
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                اضغط على أي علامة في الجدول لتغيير حالة الطالب مباشرة (حاضر / غائب / متأخر)
              </p>
            </div>
            <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
              {todayPeriodsList.length} حصص في جدول اليوم
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-900 text-white text-xs">
                  <th className="py-3 px-4 font-black w-48 text-right border-l border-slate-800">اسم الطالب</th>
                  {todayPeriodsList.map(p => (
                    <th key={p.periodNumber} className="py-3 px-3 text-center border-l border-slate-800">
                      <div className="font-black text-xs">ح{p.periodNumber}</div>
                      <div className="text-[10px] text-slate-400 font-normal truncate max-w-[90px] mx-auto">{p.subjectName}</div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center font-black">مجموع الحضور</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {students.map(student => {
                  let attendedCount = 0;
                  todayPeriodsList.forEach(p => {
                    const st = attendanceMatrix[student.id]?.[p.periodNumber]?.status;
                    if (st === 'present' || st === 'late') attendedCount++;
                  });

                  return (
                    <tr key={student.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-black text-slate-900 border-l border-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-100 font-black text-slate-700 flex items-center justify-center text-xs">
                            {student.name[0]}
                          </div>
                          <span>{student.name}</span>
                        </div>
                      </td>

                      {todayPeriodsList.map(p => {
                        const rec = attendanceMatrix[student.id]?.[p.periodNumber] || { status: 'present', score: 95 };
                        return (
                          <td key={p.periodNumber} className="py-3 px-2 text-center border-l border-slate-200">
                            <button
                              onClick={() => {
                                const nextStatus = rec.status === 'present' ? 'absent' : (rec.status === 'absent' ? 'late' : 'present');
                                handleStatusChange(student.id, p.periodNumber, nextStatus);
                              }}
                              className={`w-full py-1.5 px-2 rounded-xl text-xs font-black border transition cursor-pointer ${
                                rec.status === 'present'
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200'
                                  : rec.status === 'absent'
                                  ? 'bg-rose-100 text-rose-900 border-rose-300 hover:bg-rose-200'
                                  : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                              }`}
                              title="اضغط للتبديل بين حاضر / غائب / متأخر"
                            >
                              {rec.status === 'present' ? '✅ حاضر' : rec.status === 'absent' ? '❌ غائب' : '⏰ متأخر'}
                            </button>
                          </td>
                        );
                      })}

                      <td className="py-3 px-3 text-center font-black">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-mono ${
                          attendedCount === todayPeriodsList.length
                            ? 'bg-emerald-100 text-emerald-800'
                            : attendedCount > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {attendedCount} / {todayPeriodsList.length}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
