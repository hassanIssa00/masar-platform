'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  ScanFace, Camera, CheckCircle2, AlertCircle, Clock, Users,
  Sparkles, RefreshCw, Volume2, VolumeX, Maximize2, Minimize2,
  Share2, Printer, Search, Filter, Phone, Check, X, ShieldCheck,
  UserCheck, UserX, AlertTriangle, ArrowRight, BookOpen, Layers,
  MapPin, ExternalLink
} from 'lucide-react';
import {
  initFaceAuth, detectFace, getAllFaceRecords, FaceRecord, isFaceEnrolled, compareBiometricFaces
} from '@/lib/faceAuth';
import {
  getLocalAttendance, markStudentAttendanceViaFace, updateAttendance,
  recordAttendance, AttendanceRecord, getStudentPeriodAttendance,
  resolveActivePeriod, PERIOD_NAMES,
} from '@/lib/attendance';
import { getTodayPeriods, getCurrentPeriod, getSavedSchedule } from '@/data/ikhlasSchedule';
import { getClassStudents, ClassStudentRecord } from '@/lib/classDb';
import { readCloudCache, syncDocToCloud, writeCloudCache } from '@/lib/firestoreSync';
import { getSaudiNow, formatSaudiDate } from '@/lib/saudiTime';



interface RecognizedEvent {
  id: string;
  studentId: string;
  studentName: string;
  time: string;
  similarity: number;
  photoUrl?: string;
  isDuplicate: boolean;
}

export default function ClassroomFaceAttendanceFullPage({
  onBack,
}: {
  onBack?: () => void;
}) {
  const [activeView, setActiveView] = useState<'kiosk' | 'matrix' | 'print'>('kiosk');
  const [students, setStudents] = useState<ClassStudentRecord[]>(() => getClassStudents());
  const [enrolledFaces, setEnrolledFaces] = useState<FaceRecord[]>(() => getAllFaceRecords());
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>(() => getLocalAttendance());
  
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'absent' | 'late'>('all');

  // Scanner states
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const isScanningRef = useRef<boolean>(false);
  const lastRecognizedRef = useRef<Record<string, number>>({}); // cooldown per student
  
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [currentFaceBox, setCurrentFaceBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [recentArrivals, setRecentArrivals] = useState<RecognizedEvent[]>([]);
  const [activePopup, setActivePopup] = useState<RecognizedEvent | null>(null);
  const [kioskPeriodNumber, setKioskPeriodNumber] = useState<number>(() => resolveActivePeriod().periodNumber);

  const todayStr = useMemo(() => getSaudiNow().dateStr, []);
  const todayArabicDate = useMemo(() => {
    return formatSaudiDate(new Date(), {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // Sync students and enrolled faces
  const refreshData = useCallback(() => {
    setStudents(getClassStudents());
    setEnrolledFaces(getAllFaceRecords());
    setTodayAttendance(getLocalAttendance());
  }, []);

  useEffect(() => {
    refreshData();
    const onAttUpdate = () => refreshData();
    window.addEventListener('masar_attendance_updated', onAttUpdate);
    window.addEventListener('storage', onAttUpdate);
    return () => {
      window.removeEventListener('masar_attendance_updated', onAttUpdate);
      window.removeEventListener('storage', onAttUpdate);
    };
  }, [refreshData]);

  // Audio Speech Announcer
  const speakStudentArrival = (name: string, isDuplicate = false) => {
    if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const text = isDuplicate
        ? `عفواً، تم تسجيل حضور الطالب ${name} مسبقاً لهذا اليوم.`
        : `أهلاً بك يا ${name}! تم تسجيل حضورك بنجاح. بارك الله فيك.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ar-SA';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {}
  };

  // Play gentle success chime
  const playChime = () => {
    if (isMuted || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    } catch {}
  };

  // Start Camera
  const startCamera = async () => {
    try {
      setCameraError('');
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      await initFaceAuth();
      setCameraActive(true);
      isScanningRef.current = true;
      startScanningLoop();
    } catch (err: any) {
      console.error('Kiosk camera start error:', err);
      setCameraError('تعذر فتح الكاميرا. يرجى التأكد من توصيل الكاميرا ومنح الإذن للموقع.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    isScanningRef.current = false;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    setCurrentFaceBox(null);
  };

  useEffect(() => {
    if (activeView === 'kiosk') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeView]);

  // Continuous Face Scan Loop
  const startScanningLoop = () => {
    let lastScanTime = 0;
    let lastMatchedId = '';   // consecutive match: two hits in a row = accept instantly
    let consecutiveHits = 0;

    const loop = async (timestamp: number) => {
      if (!isScanningRef.current) return;

      // Scan every 80ms — fast enough to feel instant, safe for GPU
      if (timestamp - lastScanTime > 80 && videoRef.current && videoRef.current.readyState >= 2) {
        lastScanTime = timestamp;
        try {
          const detected = await detectFace(videoRef.current);
          if (detected && detected.box) {
            setCurrentFaceBox(detected.box);
            // Match against class enrolled faces
            const matchResult = await handleFaceDetected(detected.embedding);
            // Consecutive-match fast-path: two frames matching same person → accepted
            if (matchResult) {
              if (matchResult === lastMatchedId) {
                consecutiveHits++;
              } else {
                lastMatchedId = matchResult;
                consecutiveHits = 1;
              }
            } else {
              consecutiveHits = 0;
              lastMatchedId = '';
            }
          } else {
            setCurrentFaceBox(null);
            consecutiveHits = 0;
            lastMatchedId = '';
          }
        } catch (e) {
          console.warn('Scanning loop tick error:', e);
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  // Process Detected Face Embedding — returns matched studentId or null
  const handleFaceDetected = async (embedding: number[]): Promise<string | null> => {
    const allRecords = getAllFaceRecords();
    if (allRecords.length === 0) return null;

    // Match against enrolled faces
    let bestMatch: { record: FaceRecord | null; student: ClassStudentRecord | null; similarity: number } = {
      record: null,
      student: null,
      similarity: 0,
    };

    for (const record of allRecords) {
      const candidates: number[][] = [];
      if (Array.isArray(record.embeddings) && record.embeddings.length > 0) {
        candidates.push(...record.embeddings);
      } else if (Array.isArray(record.embedding) && record.embedding.length > 0) {
        candidates.push(record.embedding);
      }

      let recordBestSim = 0;
      let isRecordMatch = false;
      for (const stored of candidates) {
        const res = compareBiometricFaces(stored, embedding);
        if (res.isMatch && res.similarity > recordBestSim) {
          recordBestSim = res.similarity;
          isRecordMatch = true;
        }
      }

      if (isRecordMatch && recordBestSim > bestMatch.similarity) {
        // Find if this record matches any class student
        const matchedStudent = students.find(s =>
          s.id === record.userId ||
          s.id === record.studentId ||
          s.id === record.accountId ||
          s.fullName.trim() === record.userName?.trim()
        ) || null;

        bestMatch = { record, student: matchedStudent, similarity: recordBestSim };
      }
    }

    // Accept match only if strict biometric verification succeeds
    if (bestMatch.record && bestMatch.similarity >= 0.85) {
      const studentId = bestMatch.student?.id || bestMatch.record?.studentId || bestMatch.record?.userId || '';
      const studentName = bestMatch.student?.fullName || bestMatch.record?.userName || 'طالب';
      const photoUrl = bestMatch.student?.photoUrl;

      const now = Date.now();
      const lastTime = lastRecognizedRef.current[studentId] || 0;

      // 15 seconds cooldown per student to prevent spamming
      if (now - lastTime < 15000) return studentId; // still return id for consecutive tracking
      lastRecognizedRef.current[studentId] = now;

      // Check if student was already marked present for this specific period
      const existingPeriodAtt = getStudentPeriodAttendance(studentId, kioskPeriodNumber, todayStr);
      const isAlreadyPresent = existingPeriodAtt?.status === 'present';

      const timeStr = getSaudiNow().timeStr;

      // Capture live snapshot photo from kiosk camera
      let capturedSnapshot: string | undefined;
      try {
        const v = videoRef.current;
        if (v && v.videoWidth > 0 && v.videoHeight > 0) {
          const snapCanvas = document.createElement('canvas');
          snapCanvas.width = 240;
          snapCanvas.height = 240;
          const ctx = snapCanvas.getContext('2d');
          if (ctx) {
            ctx.translate(240, 0);
            ctx.scale(-1, 1);
            const minDim = Math.min(v.videoWidth, v.videoHeight);
            const sx = (v.videoWidth - minDim) / 2;
            const sy = (v.videoHeight - minDim) / 2;
            ctx.drawImage(v, sx, sy, minDim, minDim, 0, 0, 240, 240);
            capturedSnapshot = snapCanvas.toDataURL('image/jpeg', 0.85);
          }
        }
      } catch (err) {
        console.warn('Kiosk snapshot error:', err);
      }

      if (!isAlreadyPresent) {
        // Record attendance via Face ID for this period
        await markStudentAttendanceViaFace(studentId, studentName, {
          branch: 'IKHLAS_JEDDAH',
          confidence: bestMatch.similarity,
          isClassroom: true,
          capturedPhotoUrl: capturedSnapshot || photoUrl,
          periodNumber: kioskPeriodNumber,
          periodName: PERIOD_NAMES[kioskPeriodNumber] || `الحصة ${kioskPeriodNumber}`,
          kioskVerified: true,
        });

        playChime();
        speakStudentArrival(studentName, false);
      } else {
        speakStudentArrival(studentName, true);
      }

      const eventItem: RecognizedEvent = {
        id: `rec_${now}`,
        studentId,
        studentName,
        time: timeStr,
        similarity: Math.round(bestMatch.similarity * 100),
        photoUrl: capturedSnapshot || photoUrl,
        isDuplicate: isAlreadyPresent,
      };

      setRecentArrivals(prev => [eventItem, ...prev.slice(0, 14)]);
      setActivePopup(eventItem);
      setTimeout(() => setActivePopup(null), 4000);
      refreshData();

      return studentId;
    }

    return null;
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Attendance stats for today
  const stats = useMemo(() => {
    const total = students.length;
    let presentCount = 0;
    let faceVerifiedCount = 0;
    let lateCount = 0;
    let absentCount = 0;

    const todayRecords = todayAttendance.filter(r => r.sessionDate === todayStr);
    const map = new Map<string, AttendanceRecord>();
    todayRecords.forEach(r => map.set(r.studentId, r));

    students.forEach(s => {
      const rec = map.get(s.id);
      if (!rec || rec.status === 'absent') {
        absentCount++;
      } else if (rec.status === 'present') {
        presentCount++;
        if (rec.verifiedVia === 'face') faceVerifiedCount++;
      } else if (rec.status === 'late') {
        lateCount++;
      }
    });

    const rate = total > 0 ? Math.round(((presentCount + lateCount) / total) * 100) : 0;
    return { total, presentCount, faceVerifiedCount, lateCount, absentCount, rate, map };
  }, [students, todayAttendance, todayStr]);

  // Filtered students for matrix
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        if (!s.fullName.toLowerCase().includes(q)) return false;
      }
      const rec = stats.map.get(s.id);
      const status = rec?.status || 'absent';
      if (filterStatus === 'all') return true;
      if (filterStatus === 'present') return status === 'present';
      if (filterStatus === 'absent') return status === 'absent';
      if (filterStatus === 'late') return status === 'late';
      return true;
    });
  }, [students, searchQuery, filterStatus, stats.map]);

  // Quick manual status change
  const handleQuickStatusChange = async (student: ClassStudentRecord, newStatus: 'present' | 'absent' | 'late') => {
    const timeStr = getSaudiNow().timeShortStr;
    const existing = stats.map.get(student.id);

    if (existing) {
      updateAttendance(existing.id, {
        status: newStatus,
        verifiedVia: newStatus === 'present' ? (existing.verifiedVia || 'manual') : undefined,
        notes: newStatus === 'present' ? 'تم التعديل يدوياً من كشف الفصل' : 'غياب مسجل',
      });
    } else {
      await recordAttendance({
        studentId: student.id,
        studentName: student.fullName,
        sessionDate: todayStr,
        sessionTime: timeStr,
        status: newStatus,
        parentNotified: false,
        verifiedVia: 'manual',
        branch: 'IKHLAS_JEDDAH',
        notes: 'تحضير يدوي من كشف الفصل',
      });
    }
    refreshData();
  };

  // WhatsApp Alert for Absent Students
  const sendWhatsAppAlert = (student: ClassStudentRecord) => {
    if (!student.parentPhone) {
      alert('لا يوجد رقم هاتف مسجل لولي أمر هذا الطالب.');
      return;
    }
    const phone = student.parentPhone.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `السلام عليكم ورحمة الله وبركاته،\nالسيد ولي أمر الطالب (${student.fullName}) المحترم،\nنفيدكم بأنه لم يتم تسجيل حضور الطالب اليوم (${todayArabicDate}) في فصل د. إسماعيل عيسى.\nنرجو الاطمئنان عليه وموافاتنا في حال وجود أي عذر. دمتم بخير.`
    );
    window.open(`https://wa.me/${phone.startsWith('966') ? phone : `966${phone.replace(/^0/, '')}`}?text=${msg}`, '_blank');
  };

  // Broadcast WhatsApp to all absent students
  const handleBroadcastAbsentees = () => {
    const absentees = students.filter(s => {
      const rec = stats.map.get(s.id);
      return !rec || rec.status === 'absent';
    });
    if (absentees.length === 0) {
      alert('ما شاء الله! جميع الطلاب حاضرون اليوم ولا يوجد أي غائب 🎉');
      return;
    }
    if (confirm(`يوجد ${absentees.length} طالب غائب اليوم. هل تريد فتح رسائل واتساب لتنبيه أولياء أمورهم؟`)) {
      absentees.forEach((s, idx) => {
        setTimeout(() => sendWhatsAppAlert(s), idx * 600);
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* --- Main Top Bar --- */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              title="العودة"
            >
              <ArrowRight size={20} />
            </button>
          )}
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
            <ScanFace size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg md:text-xl font-black text-slate-900">
                بوابة الحضور البيومتري الذكي (Face ID Hub)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300 animate-pulse">
                مباشر ⚡
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              فصل د. إسماعيل عيسى • {todayArabicDate}
            </p>
          </div>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/60">
            <button
              onClick={() => setActiveView('kiosk')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeView === 'kiosk'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera size={15} />
              <span>الكشك المباشر 📸</span>
            </button>
            <button
              onClick={() => setActiveView('matrix')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeView === 'matrix'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users size={15} />
              <span>كشف ومتابعة الطلاب ({students.length})</span>
            </button>
            <button
              onClick={() => setActiveView('print')}
              className={`px-3 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
                activeView === 'print'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Printer size={15} />
              <span>طباعة الكشف 📄</span>
            </button>
          </div>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2.5 rounded-2xl border transition cursor-pointer ${
              isMuted
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
            title={isMuted ? 'الصوت مكتوم' : 'الترحيب الصوتي مفعّل'}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer"
            title="ملء الشاشة"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
        </div>
      </div>

      {/* ─── Kiosk Official Device Identity Banner ─── */}
      <div className="bg-gradient-to-l from-emerald-50 via-teal-50/60 to-white border border-emerald-200/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
            🏫
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
              <span>كشك الفصل المركزي المعتمد • مدرسة الإخلاص الأهلية للبنين</span>
              <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                جهاز الفصل الرسمي
              </span>
            </h4>
            <p className="text-[11px] font-bold text-slate-600 mt-0.5">
              يمر الطالب أمام الكاميرا لتسجيل حضوره فوراً دون الحاجة لهاتف شخصي أو فحص GPS
            </p>
          </div>
        </div>

        <a
          href="https://maps.app.goo.gl/Y1dmJMTc2V5pYMFn7"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-black text-blue-700 bg-white border border-blue-200 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition shadow-2xs"
        >
          <MapPin size={13} className="text-blue-600" />
          <span>موقع المدرسة المعتمد (21.54974, 39.18139)</span>
          <ExternalLink size={12} />
        </a>
      </div>

      {/* ─── Live Metrics Bar ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">إجمالي الطلاب</span>
            <Users size={18} className="text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">{stats.total}</p>
          <span className="text-[10px] font-bold text-slate-400">طالب مسجل بالفصل</span>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-900">حاضر بالبصمة 📸</span>
            <ScanFace size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-800 mt-2">{stats.faceVerifiedCount}</p>
          <span className="text-[10px] font-bold text-emerald-700">تحقق بيومتري آلي</span>
        </div>

        <div className="bg-teal-50/70 p-4 rounded-2xl border border-teal-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-teal-900">إجمالي الحضور</span>
            <CheckCircle2 size={18} className="text-teal-600" />
          </div>
          <p className="text-2xl font-black text-teal-800 mt-2">{stats.presentCount}</p>
          <span className="text-[10px] font-bold text-teal-700">نسبة {stats.rate}% من الفصل</span>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-900">الغياب اليوم</span>
            <UserX size={18} className="text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-800 mt-2">{stats.absentCount}</p>
          <span className="text-[10px] font-bold text-rose-700">لم يسجلوا بعد</span>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-900">المتأخرون</span>
            <Clock size={18} className="text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-800 mt-2">{stats.lateCount}</p>
          <span className="text-[10px] font-bold text-amber-700">وصول بعد الموعد</span>
        </div>
      </div>

      {/* ============================================================
          VIEW 1: KIOSK LIVE SCANNER
      ============================================================ */}
      {activeView === 'kiosk' && (
        <div className="space-y-4">
          {/* Period Selector Bar for Kiosk */}
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800">
              <Clock size={16} className="text-emerald-600" />
              <span>الحصة المفعّلة لتسجيل كشك الحضور الآن:</span>
              <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full text-xs">
                {PERIOD_NAMES[kioskPeriodNumber] || `الحصة ${kioskPeriodNumber}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[1, 2, 3, 4, 5, 6, 7].map((pNum) => {
                const isSel = kioskPeriodNumber === pNum;
                return (
                  <button
                    key={pNum}
                    type="button"
                    onClick={() => setKioskPeriodNumber(pNum)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                      isSel
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/40'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    حـ{pNum} ({PERIOD_NAMES[pNum]?.replace('الحصة ', '')})
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Video Camera Station */}
          <div className="lg:col-span-8 bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl relative flex flex-col items-center justify-center min-h-[460px] md:min-h-[560px]">
            {cameraError ? (
              <div className="p-8 text-center text-white space-y-4 max-w-md">
                <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-base font-black">تعذر تشغيل الكاميرا</h3>
                <p className="text-xs font-bold text-slate-400">{cameraError}</p>
                <button
                  onClick={startCamera}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition cursor-pointer"
                >
                  إعادة المحاولة 🔄
                </button>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Live Video Feed */}
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                  style={{ maxHeight: '600px' }}
                />

                {/* Biometric Scanning Overlay HUD */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                  {/* Top HUD Bar */}
                  <div className="flex items-center justify-between text-white drop-shadow-md">
                    <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-xs font-black tracking-wider">LIVE SCANNER • 60 FPS</span>
                    </div>
                    <div className="bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold border border-white/10">
                      <span>الطلاب المسجلون: {enrolledFaces.length} بصمة</span>
                    </div>
                  </div>

                  {/* Center Face Target Frame */}
                  <div className="relative flex items-center justify-center my-auto">
                    <div className="w-64 h-72 sm:w-72 sm:h-80 rounded-3xl border-2 border-dashed border-emerald-400/60 relative flex items-center justify-center animate-pulse shadow-2xl shadow-emerald-500/10">
                      {/* Corner Accents */}
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl" />
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl" />
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl" />
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl" />

                      {/* Scanning Laser Line */}
                      <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-scan-laser" />

                      <div className="text-center px-4">
                        <ScanFace size={48} className="mx-auto text-emerald-400/40 mb-2" />
                        <p className="text-xs font-black text-emerald-300 drop-shadow-md">
                          قف أمام الكاميرا للمسح التلقائي
                        </p>
                        <p className="text-[10px] font-bold text-white/70 mt-1">
                          سيتم تسجيل حضورك وإعلان اسمك فورياً
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Guide */}
                  <div className="text-center">
                    <div className="inline-block bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl text-xs font-bold text-white/90 border border-white/10">
                      🌟 أهلاً بأبطال فصل د. إسماعيل عيسى • نظام التحضير الآلي
                    </div>
                  </div>
                </div>

                {/* Floating Real-time Recognition Popup */}
                {activePopup && (
                  <div className="absolute bottom-8 inset-x-6 z-30 flex items-center justify-center pointer-events-none animate-bounce">
                    <div className={`p-4 rounded-3xl shadow-2xl border flex items-center gap-4 max-w-md w-full backdrop-blur-xl ${
                      activePopup.isDuplicate
                        ? 'bg-amber-900/90 border-amber-500 text-white'
                        : 'bg-emerald-900/95 border-emerald-400 text-white'
                    }`}>
                      <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {activePopup.photoUrl ? (
                          <img src={activePopup.photoUrl} alt={activePopup.studentName} className="w-full h-full object-cover" />
                        ) : (
                          <CheckCircle2 size={32} className="text-emerald-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-base truncate">{activePopup.studentName}</h4>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20">
                            {activePopup.similarity}% تطابق
                          </span>
                        </div>
                        <p className="text-xs font-bold opacity-90 mt-0.5">
                          {activePopup.isDuplicate
                            ? `مسجل مسبقاً لهذا اليوم في الساعة ${activePopup.time}`
                            : `تم تسجيل الحضور بنجاح • الساعة ${activePopup.time} 🌟`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Live Arrivals Feed */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">سجل الوصول اللحظي</h3>
                    <p className="text-[10px] font-bold text-slate-400">آخر الطلاب الذين تم التعرف عليهم</p>
                  </div>
                </div>
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {recentArrivals.length} حركة
                </span>
              </div>

              {/* Arrivals Ticker List */}
              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                {recentArrivals.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Clock size={32} className="mx-auto text-slate-300" />
                    <p className="text-xs font-bold">في انتظار مرور الطلاب أمام الكاميرا...</p>
                    <p className="text-[11px]">سيظهر كل طالب هنا فورياً عند وصوله</p>
                  </div>
                ) : (
                  recentArrivals.map((ev) => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
                          {ev.photoUrl ? (
                            <img src={ev.photoUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            ev.studentName.slice(0, 1)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 truncate">{ev.studentName}</p>
                          <p className="text-[10px] font-bold text-slate-400">{ev.time}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                        {ev.similarity}% تطابق
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick absent alert box */}
            <div className="bg-gradient-to-br from-rose-50 to-orange-50 border border-rose-200 rounded-3xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-600" />
                <h4 className="font-black text-xs text-rose-950">إشعار أولياء أمور الغائبين</h4>
              </div>
              <p className="text-[11px] font-bold text-slate-600 leading-relaxed">
                يوجد حالياً <strong className="text-rose-700">{stats.absentCount} طالب</strong> لم يتم رصد حضورهم بعد.
              </p>
              <button
                onClick={handleBroadcastAbsentees}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Phone size={14} />
                <span>إرسال تنبيهات واتساب للغائبين الآن 📱</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ============================================================
          VIEW 2: ATTENDANCE MATRIX & STUDENT LIST
      ============================================================ */}
      {activeView === 'matrix' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-5">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="relative flex-1 max-w-md w-full">
              <Search size={16} className="absolute right-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن طالب بالاسم..."
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end overflow-x-auto pb-1">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                الكل ({students.length})
              </button>
              <button
                onClick={() => setFilterStatus('present')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  filterStatus === 'present'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                حاضر ({stats.presentCount})
              </button>
              <button
                onClick={() => setFilterStatus('absent')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  filterStatus === 'absent'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                غائب ({stats.absentCount})
              </button>
              <button
                onClick={() => setFilterStatus('late')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  filterStatus === 'late'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                متأخر ({stats.lateCount})
              </button>
            </div>
          </div>

          {/* Students Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="py-3 px-3">#</th>
                  <th className="py-3 px-3">الطالب</th>
                  <th className="py-3 px-3">حالة البصمة</th>
                  <th className="py-3 px-3">حضور اليوم</th>
                  <th className="py-3 px-3">وقت الرصد</th>
                  <th className="py-3 px-3 text-center">تعديل الحالة السريع</th>
                  <th className="py-3 px-3 text-left">ولي الأمر</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((st, idx) => {
                  const rec = stats.map.get(st.id);
                  const status = rec?.status || 'absent';
                  const hasFace = isFaceEnrolled(st.id);

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-3 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-black text-xs shrink-0 overflow-hidden shadow-2xs">
                            {st.photoUrl ? (
                              <img src={st.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              st.fullName.slice(0, 1)
                            )}
                          </div>
                          <div>
                            <p className="font-black text-slate-900">{st.fullName}</p>
                            <p className="text-[10px] font-bold text-slate-400">{st.grade}</p>
                          </div>
                        </div>
                      </td>

                      {/* Face ID Status */}
                      <td className="py-3.5 px-3">
                        {hasFace ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <ShieldCheck size={12} className="text-emerald-600" />
                            <span>بصمة مسجلة 🔒</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <span>غير مسجلة</span>
                          </span>
                        )}
                      </td>

                      {/* Today Status Badge */}
                      <td className="py-3.5 px-3">
                        {status === 'present' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>حاضر {rec?.verifiedVia === 'face' ? '(بالبصمة 📸)' : ''}</span>
                          </span>
                        )}
                        {status === 'absent' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                            <UserX size={13} className="text-rose-600" />
                            <span>غائب ✗</span>
                          </span>
                        )}
                        {status === 'late' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock size={13} className="text-amber-600" />
                            <span>متأخر</span>
                          </span>
                        )}
                      </td>

                      {/* Log Time */}
                      <td className="py-3.5 px-3 font-bold text-slate-600 text-[11px]">
                        {rec?.sessionTime || '—'}
                      </td>

                      {/* Quick Status Buttons */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleQuickStatusChange(st, 'present')}
                            title="تحضير"
                            className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                              status === 'present'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-emerald-100 hover:text-emerald-700'
                            }`}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => handleQuickStatusChange(st, 'late')}
                            title="متأخر"
                            className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                              status === 'late'
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-amber-100 hover:text-amber-700'
                            }`}
                          >
                            <Clock size={14} />
                          </button>
                          <button
                            onClick={() => handleQuickStatusChange(st, 'absent')}
                            title="غياب"
                            className={`p-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                              status === 'absent'
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-700'
                            }`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>

                      {/* Parent & WhatsApp */}
                      <td className="py-3.5 px-3 text-left">
                        {st.parentPhone ? (
                          <button
                            onClick={() => sendWhatsAppAlert(st)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-black transition cursor-pointer"
                            title={`مراسلة ولي الأمر: ${st.parentPhone}`}
                          >
                            <Phone size={12} />
                            <span>واتساب</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold">لا يوجد هاتف</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================
          VIEW 3: PRINTABLE OFFICIAL SHEET
      ============================================================ */}
      {activeView === 'print' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">المملكة العربية السعودية — وزارة التعليم</h2>
              <h3 className="text-base font-bold text-slate-700">كشف الحضور والغياب اليومي الرسمي • فصل د. إسماعيل عيسى</h3>
              <p className="text-xs text-slate-500 mt-1">التاريخ: {todayArabicDate} ({todayStr})</p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
            >
              <Printer size={15} />
              <span>طباعة المستند الآن</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs">
            <div><strong>إجمالي الطلاب:</strong> {stats.total}</div>
            <div><strong>الحاضرون بالبصمة:</strong> {stats.faceVerifiedCount}</div>
            <div><strong>إجمالي الحضور:</strong> {stats.presentCount} ({stats.rate}%)</div>
            <div><strong>الغياب:</strong> {stats.absentCount}</div>
          </div>

          <table className="w-full text-right text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 font-black">
                <th className="p-2 border-l border-slate-300">#</th>
                <th className="p-2 border-l border-slate-300">اسم الطالب</th>
                <th className="p-2 border-l border-slate-300">الحالة اليومية</th>
                <th className="p-2 border-l border-slate-300">طريقة التحقق</th>
                <th className="p-2 border-l border-slate-300">وقت الرصد</th>
                <th className="p-2">توقيع المعلم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {students.map((st, i) => {
                const rec = stats.map.get(st.id);
                const status = rec?.status || 'absent';
                return (
                  <tr key={st.id}>
                    <td className="p-2 border-l border-slate-300">{i + 1}</td>
                    <td className="p-2 border-l border-slate-300 font-black">{st.fullName}</td>
                    <td className="p-2 border-l border-slate-300 font-bold">
                      {status === 'present' ? 'حاضر ✓' : status === 'late' ? 'متأخر ⏱️' : 'غائب ✗'}
                    </td>
                    <td className="p-2 border-l border-slate-300">
                      {rec?.verifiedVia === 'face' ? 'بصمة الوجه (MediaPipe)' : 'يدوي'}
                    </td>
                    <td className="p-2 border-l border-slate-300">{rec?.sessionTime || '—'}</td>
                    <td className="p-2 font-handwriting text-slate-400">د. إسماعيل عيسى</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="pt-6 flex items-center justify-between border-t border-slate-200 text-xs font-bold text-slate-600">
            <div>المعلم المشرف: د. إسماعيل عيسى ✍️</div>
            <div>منصة مسار التعليمية الذكية • MasarPlatform.org</div>
          </div>
        </div>
      )}
    </div>
  );
}
