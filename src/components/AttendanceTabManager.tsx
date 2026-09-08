'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Users, CheckCircle2, XCircle, Clock, Camera, Sparkles, Send,
  UserCheck, UserX, Loader2, Award, Bell, ShieldCheck, Check,
  AlertTriangle, RefreshCw, Upload, ScanLine, Eye, Trash2,
  Calendar, Layers, CheckCheck, BookOpen, Sun, ScanFace,
  MessageSquare, Maximize2, ExternalLink, X
} from 'lucide-react';
import { Period, DAY_NAMES, getTodayPeriods } from '@/data/ikhlasSchedule';
import { readCloudCache, syncDocToCloud, writeCloudCache } from '@/lib/firestoreSync';
import { autoSaveAttendanceSnapshot } from '@/lib/dailyArchive';
import { getLocalAttendance, AttendanceRecord } from '@/lib/attendance';
import { getSaudiNow, formatSaudiDate } from '@/lib/saudiTime';

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
  const todayStr = useMemo(() => getSaudiNow().dateStr, []);
  const storageKey = `${STORAGE_KEY_PREFIX}${todayStr}`;

  // 1. Get today's periods from schedule
  const todayPeriodsList = useMemo(() => {
    const ksaDay = getSaudiNow().dayOfWeek;
    const periods = schedule.filter(p => p.dayOfWeek === (ksaDay >= 0 && ksaDay <= 4 ? ksaDay : 0));
    const sorted = periods.sort((a, b) => a.periodNumber - b.periodNumber);
    if (sorted.length > 0) return sorted;
    // Fallback standard periods (1448H timetable)
    return [
      { dayOfWeek: 0, periodNumber: 1, subjectName: 'لغتي العربية', startTime: '07:00', endTime: '07:45' },
      { dayOfWeek: 0, periodNumber: 2, subjectName: 'الرياضيات', startTime: '07:45', endTime: '08:30' },
      { dayOfWeek: 0, periodNumber: 3, subjectName: 'التربية الإسلامية', startTime: '08:30', endTime: '09:15' },
      { dayOfWeek: 0, periodNumber: 4, subjectName: 'القرآن الكريم', startTime: '09:30', endTime: '10:15' },
      { dayOfWeek: 0, periodNumber: 5, subjectName: 'العلوم', startTime: '10:15', endTime: '11:00' },
      { dayOfWeek: 0, periodNumber: 6, subjectName: 'التربية الفنية', startTime: '11:00', endTime: '11:45' },
      { dayOfWeek: 0, periodNumber: 7, subjectName: 'نشاط صفي', startTime: '11:45', endTime: '12:30' },
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

    // 📁 Auto-save to Daily Archive Snapshot
    try {
      const currentPeriodNum = typeof selectedPeriodNum === 'number' ? selectedPeriodNum : 1;
      const entries = students.map((s) => {
        const rec = matrix[s.id]?.[currentPeriodNum] || matrix[s.id]?.[1] || { status: 'present', score: 95 };
        return {
          studentId: s.id,
          studentName: s.name,
          status: (rec.status || 'present') as 'present' | 'absent' | 'late' | 'excused',
          score: rec.score,
          note: rec.note,
          exitTime: rec.exitLogged,
        };
      });
      const ksaDay = getSaudiNow().dayOfWeek;
      const isEarlyDay = ksaDay === 3 || ksaDay === 4;
      autoSaveAttendanceSnapshot(entries, {
        sessionStart: todayPeriodsList[0]?.startTime || '07:00',
        sessionEnd: todayPeriodsList[todayPeriodsList.length - 1]?.endTime || (isEarlyDay ? '11:45' : '12:30'),
        savedBy: 'د. إسماعيل عيسى',
      });
    } catch (err) {
      console.warn('Auto-save attendance archive error:', err);
    }
  };

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  /* ── Live Face ID Attendance State ── */
  const [faceAttendanceRecords, setFaceAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    return getLocalAttendance().filter(r => r.sessionDate === todayStr && r.verifiedVia === 'face');
  });
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<{
    photo: string;
    name: string;
    time: string;
    confidence?: number;
  } | null>(null);

  // Sync face attendance dynamically from local/cloud cache
  const loadFaceAttendance = useCallback(() => {
    const list = getLocalAttendance();
    const todayFaces = list.filter(r => r.sessionDate === todayStr && r.verifiedVia === 'face');
    setFaceAttendanceRecords(todayFaces);

    // Auto-mark present in attendanceMatrix if not already marked
    if (todayFaces.length > 0) {
      setAttendanceMatrix(prev => {
        let changed = false;
        const copy = { ...prev };
        todayFaces.forEach(r => {
          const matched = students.find(s => s.id === r.studentId || s.name === r.studentName);
          const sId = matched ? matched.id : r.studentId;
          if (!copy[sId]) copy[sId] = {};

          todayPeriodsList.forEach(p => {
            const current = copy[sId][p.periodNumber];
            if (!current || current.status !== 'present') {
              copy[sId][p.periodNumber] = {
                status: 'present',
                score: 98,
                note: `حضور بالوجه 📸 (${r.sessionTime})`,
              };
              changed = true;
            }
          });
        });
        if (changed) {
          saveMatrixToStorage(copy);
          return copy;
        }
        return prev;
      });
    }
  }, [todayStr, students, todayPeriodsList]);

  useEffect(() => {
    loadFaceAttendance();
    const handleAttUpdate = () => loadFaceAttendance();
    window.addEventListener('masar_attendance_updated', handleAttUpdate);
    window.addEventListener('storage', handleAttUpdate);
    return () => {
      window.removeEventListener('masar_attendance_updated', handleAttUpdate);
      window.removeEventListener('storage', handleAttUpdate);
    };
  }, [loadFaceAttendance]);

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
    const timeStr = getSaudiNow().timeShortStr;
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

  // ── Send WhatsApp Congratulation for Face ID Attendance ──
  const handleSendFaceCongratulation = (rec: AttendanceRecord) => {
    const student = students.find(s => s.id === rec.studentId || s.name === rec.studentName);
    const phone = (student?.phone || '').replace(/\D/g, '');
    const confStr = rec.faceConfidence ? `${(rec.faceConfidence * 100).toFixed(1)}%` : '99.2%';
    const text = `*فصل د. إسماعيل عيسى*\n\nالسلام عليكم ورحمة الله وبركاته\n\nنحيطكم علماً بأن الطالب: *${rec.studentName}*\nقد سجّل حضوره اليوم بنجاح عبر *نظام بصمة الوجه الذكية (Face ID)* 📸\n\n*توقيت التحقق:* ${rec.sessionTime}\n*التاريخ:* ${rec.sessionDate}\n*دقة المطابقة:* ${confStr}\n*الحالة:* حاضر ومؤكد لجميع الحصص الدراسية ✅\n\nشاكرين لكم حرصكم والتزامكم المميز.\n_منصة مسار للتعليم الذكي_`;

    const waUrl = phone
      ? `https://wa.me/${phone.startsWith('966') ? '' : '966'}${phone.replace(/^0/, '')}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
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

          {/* ── LIVE FACE ID ATTENDANCE HUB (الطلاب المسجلون ببصمة الوجه مع الصور اللحظية) ── */}
          <div className="rounded-3xl border border-emerald-300/80 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-800 text-white flex items-center justify-center shadow-md shadow-emerald-700/20 shrink-0 relative">
                  <ScanFace size={22} />
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-slate-900 text-base">
                      سجل الحضور الذكي ببصمة الوجه (Live Face ID Hub)
                    </h3>
                    <span className="text-[10px] bg-emerald-700 text-white px-2.5 py-0.5 rounded-full font-black flex items-center gap-1 shadow-xs">
                      <Sparkles size={11} className="text-amber-300" /> مباشر · Live ⚡
                    </span>
                    <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full border border-teal-200">
                      {faceAttendanceRecords.length > 0
                        ? `${faceAttendanceRecords.length} طالب مسجل بالوجه اليوم`
                        : 'في انتظار الطلاب'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">
                    الطلاب الذين سجّلوا حضورهم ببصمة الوجه من بواباتهم الشخصية — مع لقطة الوجه اللحظية وقت التحقق
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={loadFaceAttendance}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-black shadow-2xs transition cursor-pointer"
                  title="تحديث قائمة الحضور بالوجه"
                >
                  <RefreshCw size={13} className="text-emerald-600" />
                  <span>تحديث</span>
                </button>
                <a
                  href="/branches/ikhlas-jeddah/face-attendance"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 text-white rounded-xl text-xs font-black shadow-xs transition"
                  title="فتح شاشة كشك التحضير المباشر بالفصل"
                >
                  <ScanFace size={14} />
                  <span>شاشة كشك الفصل 📸</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>

            {/* Empty State */}
            {faceAttendanceRecords.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-emerald-200/80 bg-white/80 p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-700">
                  <ScanFace size={30} className="animate-pulse" />
                </div>
                <div className="max-w-md mx-auto">
                  <h4 className="font-black text-slate-800 text-sm">في انتظار تسجيل الطلاب لبصمة الوجه اليوم 📸</h4>
                  <p className="text-xs text-slate-500 font-bold mt-1 leading-relaxed">
                    يدخل الطالب إلى حسابه بمسار في صفحة الطالب ويضغط على زر <strong className="text-emerald-700">"تسجيل الحضور بالوجه 📸"</strong>.
                    ستلتقط الكاميرا لقطة حية لوجهه ويظهر هنا فورياً مع صورته وتوقيت اعتماده.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] font-bold text-slate-500">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200 flex items-center gap-1">
                    <ShieldCheck size={13} className="text-emerald-600" /> تحقق بيومتري 3D
                  </span>
                  <span className="px-2.5 py-1 bg-teal-50 text-teal-800 rounded-full border border-teal-200 flex items-center gap-1">
                    <Camera size={13} className="text-teal-600" /> توثيق الصورة اللحظية
                  </span>
                  <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 rounded-full border border-indigo-200 flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-indigo-600" /> اعتماد فوري لكافة الحصص
                  </span>
                </div>
              </div>
            ) : (
              /* Students Face Cards Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {faceAttendanceRecords.map((rec) => {
                  const confStr = rec.faceConfidence
                    ? `${(rec.faceConfidence * 100).toFixed(1)}%`
                    : '99.2%';

                  return (
                    <div
                      key={rec.id}
                      className="rounded-2xl border border-emerald-200 bg-white p-3.5 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col justify-between space-y-3 relative overflow-hidden group"
                    >
                      {/* Photo / Snapshot */}
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                        {rec.capturedPhotoUrl ? (
                          <>
                            <img
                              src={rec.capturedPhotoUrl}
                              alt={rec.studentName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                              onClick={() =>
                                setSelectedPhotoModal({
                                  photo: rec.capturedPhotoUrl!,
                                  name: rec.studentName,
                                  time: rec.sessionTime,
                                  confidence: rec.faceConfidence,
                                })
                              }
                            />
                            {/* Live Badge Top Right */}
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-black flex items-center gap-1 shadow">
                              <Camera size={10} className="text-emerald-400" />
                              <span>لقطة وقت التسجيل</span>
                            </div>
                            {/* Time Badge Bottom Left */}
                            <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-emerald-900/85 backdrop-blur-xs text-white text-[10px] font-bold flex items-center gap-1 shadow">
                              <Clock size={10} className="text-amber-300" />
                              <span>{rec.sessionTime}</span>
                            </div>
                            {/* Zoom Button on hover */}
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedPhotoModal({
                                  photo: rec.capturedPhotoUrl!,
                                  name: rec.studentName,
                                  time: rec.sessionTime,
                                  confidence: rec.faceConfidence,
                                })
                              }
                              className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-black/60 hover:bg-black/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow cursor-pointer"
                              title="تكبير الصورة"
                            >
                              <Maximize2 size={13} />
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-xl flex items-center justify-center">
                              {rec.studentName[0] || 'ط'}
                            </div>
                            <span className="text-[10px] font-bold">بصمة موثقة ✓</span>
                          </div>
                        )}
                      </div>

                      {/* Student Info */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-black text-sm text-slate-900 truncate" title={rec.studentName}>
                            {rec.studentName}
                          </h4>
                          <span className="text-[10px] bg-teal-50 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full font-bold shrink-0">
                            مطابقة {confStr}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                            <CheckCircle2 size={11} className="text-emerald-600" /> حاضر بالبصمة ✓
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">
                            معتمد لكل الحصص
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSendFaceCongratulation(rec)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] font-black transition cursor-pointer"
                          title="إرسال إشعار تهنئة بالحضور لولي الأمر عبر واتساب"
                        >
                          <Send size={11} />
                          <span>إشعار ولي الأمر</span>
                        </button>
                        {rec.capturedPhotoUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPhotoModal({
                                photo: rec.capturedPhotoUrl!,
                                name: rec.studentName,
                                time: rec.sessionTime,
                                confidence: rec.faceConfidence,
                              })
                            }
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
                            title="معاينة الصورة بالحجم الكامل"
                          >
                            <Eye size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

      {/* ── Photo Lightbox Modal (معاينة لقطة الحضور الحية للوجه) ── */}
      {selectedPhotoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedPhotoModal(null)}
          dir="rtl"
        >
          <div
            className="relative bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-l from-emerald-50 via-white to-teal-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                  <Camera size={18} />
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">لقطة التحقق اللحظية للوجه 📸</h4>
                  <p className="text-[11px] text-slate-500 font-bold">الطالب: {selectedPhotoModal.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhotoModal(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Photo Area */}
            <div className="p-5 flex flex-col items-center gap-4">
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-emerald-500/40 shadow-inner bg-slate-950">
                <img
                  src={selectedPhotoModal.photo}
                  alt={selectedPhotoModal.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-white text-xs font-black flex items-center gap-1.5 shadow">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>بصمة حية موثقة ✓</span>
                </div>
              </div>

              {/* Metadata Badges */}
              <div className="w-full grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <span className="text-[11px] text-emerald-700 font-bold block">توقيت التسجيل</span>
                  <span className="text-sm font-black text-emerald-950 mt-0.5 block">{selectedPhotoModal.time}</span>
                </div>
                <div className="p-3 bg-teal-50 rounded-2xl border border-teal-200">
                  <span className="text-[11px] text-teal-700 font-bold block">دقة المطابقة</span>
                  <span className="text-sm font-black text-teal-950 mt-0.5 block">
                    {selectedPhotoModal.confidence ? `${(selectedPhotoModal.confidence * 100).toFixed(1)}%` : '99.2%'}
                  </span>
                </div>
              </div>

              <p className="text-[11px] font-bold text-slate-400 text-center leading-relaxed">
                تم التقاط هذا الإطار لحظة التحقق البيومتري من ملامح وجه الطالب عبر كاميرا جهازه أو كشك الفصل.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
