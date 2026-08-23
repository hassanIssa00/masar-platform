'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload, Calendar, Clock, Bell, Send, CheckCircle2, AlertCircle,
  Sparkles, Loader2, BookOpen, Users, ChevronRight, Image as ImageIcon,
  X, Play, Pause, RefreshCw, Phone, MessageSquare, Sun, Moon,
  Plus, Trash2, Settings, Eye, ZapIcon, Cloud,
} from 'lucide-react';
import { getClassParents, ClassParentRecord } from '@/lib/classDb';
import { readCloudCache, syncDocToCloud, writeCloudCache } from '@/lib/firestoreSync';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DEFAULT_SCHEDULE, DAY_MAP_NUM_TO_AR } from '@/data/ikhlasSchedule';

/* ── Types ────────────────────────────────────────────────────────────── */
interface ScheduleSlot {
  day: string;
  period: number;
  subject: string;
  startTime: string;
  endTime: string;
  teacher?: string;
  homework?: string;
}

interface NotificationLog {
  id: string;
  parentName: string;
  phone: string;
  studentName: string;
  subject: string;
  message: string;
  sentAt: string;
  type: 'morning' | 'lesson' | 'homework' | 'dismissal' | 'summary';
  status: 'sent' | 'pending' | 'failed';
}

interface ParsedSchedule {
  slots: ScheduleSlot[];
  parsedAt: string;
  imageBase64?: string;
}

const DAY_NAMES_AR: Record<string, string> = {
  'الأحد': 'Sunday',
  'الاثنين': 'Monday',
  'الثلاثاء': 'Tuesday',
  'الأربعاء': 'Wednesday',
  'الخميس': 'Thursday',
};

const STORAGE_KEY_SCHEDULE = 'masar_smart_schedule_v1';
const STORAGE_KEY_LOGS = 'masar_notification_logs_v1';
const CLOUD_SCHEDULE_COLLECTION = 'smart_schedules';
const CLOUD_LOGS_COLLECTION = 'schedule_notification_logs';
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function authJsonHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}

/* ── Helper: get today's day name in Arabic ───────────────────────────── */
function getTodayDayName(): string {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[new Date().getDay()] ?? 'الأحد';
}

/* ── Helper: get current time HH:MM ────────────────────────────────── */
function getCurrentTime(): string {
  return new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

/* ── Build real default schedule ───────────────────────────────────── */
function getDefaultParsedSchedule(): ParsedSchedule {
  return {
    slots: DEFAULT_SCHEDULE.map(p => ({
      day: DAY_MAP_NUM_TO_AR[p.dayOfWeek] || 'الأحد',
      period: p.periodNumber,
      subject: p.subjectName,
      startTime: p.startTime,
      endTime: p.endTime,
    })),
    parsedAt: new Date().toISOString(),
  };
}

/* ── Storage & Cloud Helpers ────────────────────────────────────────── */
function loadSchedule(): ParsedSchedule {
  try {
    const parsed = readCloudCache<ParsedSchedule>(STORAGE_KEY_SCHEDULE)[0];
    if (parsed && Array.isArray(parsed.slots) && parsed.slots.length > 0) {
      const hasRealSubjects = parsed.slots.some((s: any) => s.subject && s.subject !== 'درس حر');
      if (!hasRealSubjects) return getDefaultParsedSchedule();
      return parsed;
    }
    return getDefaultParsedSchedule();
  } catch {
    return getDefaultParsedSchedule();
  }
}

function saveScheduleStore(s: ParsedSchedule) {
  writeCloudCache(STORAGE_KEY_SCHEDULE, [s]);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('masar_schedule_updated'));
  }
  // ☁️ Sync schedule to Server DB Cloud
  syncDocToCloud(CLOUD_SCHEDULE_COLLECTION, 'IKHLAS_JEDDAH_SCHEDULE', s);

  // Sync to NestJS backend API if reachable
  const daysMap: Record<string, number> = { 'الأحد': 0, 'الاثنين': 1, 'الثلاثاء': 2, 'الأربعاء': 3, 'الخميس': 4 };
  const bulkPeriods = s.slots.map(slot => ({
    branch: 'IKHLAS_JEDDAH',
    dayOfWeek: daysMap[slot.day] ?? 0,
    periodNumber: slot.period,
    subjectName: slot.subject,
    startTime: slot.startTime,
    endTime: slot.endTime,
  }));

  fetch(`${API}/school/schedule/bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bulkPeriods),
  }).catch(e => console.warn('Backend API schedule sync note:', e));
}

function loadLogs(): NotificationLog[] {
  try { return readCloudCache<NotificationLog>(STORAGE_KEY_LOGS); }
  catch { return []; }
}

function saveLogs(logs: NotificationLog[]) {
  writeCloudCache(STORAGE_KEY_LOGS, logs.slice(0, 200));
  // ☁️ Sync logs to Server DB Cloud
  logs.slice(0, 50).forEach(log => syncDocToCloud(CLOUD_LOGS_COLLECTION, log.id, log));
}

/* ── Build WhatsApp message ─────────────────────────────────────────── */
function buildLessonMessage(
  parentName: string,
  studentName: string,
  subject: string,
  period: number,
  startTime: string,
  endTime: string,
  homework?: string,
): string {
  const today = new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' });
  let msg = `*فصل د. إسماعيل عيسى | فصل مسار*\n\n`;
  msg += `السلام عليكم ${parentName} 👋\n\n`;
  msg += `📚 *إشعار حصة ابنكم: ${studentName}*\n`;
  msg += `📅 *اليوم:* ${today}\n`;
  msg += `📖 *الحصة ${period}:* ${subject}\n`;
  msg += `⏰ *الوقت:* ${startTime} - ${endTime}\n`;
  if (homework) {
    msg += `\n📝 *الواجب المطلوب:*\n${homework}\n`;
  }
  msg += `\n🌟 نتمنى لابنكم يوماً دراسياً موفقاً!\n`;
  msg += `\n_منصة مسار للتعليم الذكي_`;
  return msg;
}

function buildDailySummaryMessage(
  parentName: string,
  studentName: string,
  subjects: string[],
): string {
  const today = new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' });
  let msg = `*فصل د. إسماعيل عيسى | ملخص اليوم*\n\n`;
  msg += `السلام عليكم ${parentName} 👋\n\n`;
  msg += `📋 *ملخص يوم ${today} لابنكم: ${studentName}*\n\n`;
  msg += `📚 *المواد التي درسها اليوم:*\n`;
  subjects.forEach((s, i) => { msg += `${i + 1}. ${s}\n`; });
  msg += `\n✅ نتمنى أن يكون يومه مثمراً!\n`;
  msg += `_منصة مسار للتعليم الذكي_`;
  return msg;
}

interface Props {
  onNavigateToSchedule?: () => void;
}

export default function SmartScheduleTab({ onNavigateToSchedule }: Props) {
  const [parents] = useState<ClassParentRecord[]>(() => getClassParents());
  const [schedule, setSchedule] = useState<ParsedSchedule | null>(() => loadSchedule());
  const [logs, setLogs] = useState<NotificationLog[]>(() => loadLogs());
  const [activeSection, setActiveSection] = useState<'upload' | 'full-grid' | 'today' | 'logs'>('upload');

  /* Upload & AI Parse */
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState('image/png');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [manualText, setManualText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseSuccess, setParseSuccess] = useState(false);
  const [parseError, setParseError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Today's view */
  const [today] = useState(getTodayDayName);
  const [autoNotifyEnabled, setAutoNotifyEnabled] = useState(false);
  const [sendingNotif, setSendingNotif] = useState(false);
  const [lastSentPeriod, setLastSentPeriod] = useState<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /* ☁️ Cloud DB realtime sync for Schedule & Notification Logs ──────── */
  useEffect(() => {
    // Helper: check if schedule has real subjects (not "درس حر" dummy data)
    const isRealSchedule = (slots: any[]) =>
      Array.isArray(slots) && slots.length > 0 &&
      slots.some(s => {
        const sub = s.subject || s.subjectName;
        return sub && sub !== 'درس حر' && sub !== 'حصة دراسية' && sub.length > 1;
      });

    // 1. Fetch Cloud Schedule (only if it has real data)
    getDocs(collection(db, CLOUD_SCHEDULE_COLLECTION)).then((snap) => {
      if (!snap.empty) {
        const cloudScheduleDoc = snap.docs.find(d => d.id === 'IKHLAS_JEDDAH_SCHEDULE');
        if (cloudScheduleDoc) {
          const data = cloudScheduleDoc.data() as ParsedSchedule;
          if (data?.slots && isRealSchedule(data.slots)) {
            setSchedule(data);
            writeCloudCache(STORAGE_KEY_SCHEDULE, [data]);
          }
        }
      }
    }).catch(e => console.warn('Cloud schedule fetch note:', e));

    // 2. Fetch Cloud Logs
    getDocs(collection(db, CLOUD_LOGS_COLLECTION)).then((snap) => {
      if (!snap.empty) {
        const cloudLogs = snap.docs.map(d => d.data() as NotificationLog);
        setLogs(prev => {
          const merged = [...cloudLogs, ...prev].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
          writeCloudCache(STORAGE_KEY_LOGS, merged);
          return merged;
        });
      }
    }).catch(e => console.warn('Cloud logs fetch note:', e));

    // Realtime listener - only accept real schedules
    const unsub = onSnapshot(collection(db, CLOUD_SCHEDULE_COLLECTION), (snap) => {
      const docSnap = snap.docs.find(d => d.id === 'IKHLAS_JEDDAH_SCHEDULE');
      if (docSnap) {
        const data = docSnap.data() as ParsedSchedule;
        if (data?.slots && isRealSchedule(data.slots)) {
          setSchedule(data);
          writeCloudCache(STORAGE_KEY_SCHEDULE, [data]);
        }
      }
    });

    return () => unsub();
  }, []);

  /* ── Today's slots ───────────────────────────────────────────── */
  const todaySlots = (schedule?.slots ?? []).filter(s => s.day === today);

  /* ── Auto-notification engine ─────────────────────────────────── */
  const checkAndNotify = useCallback(async () => {
    if (!autoNotifyEnabled || !schedule || todaySlots.length === 0) return;

    const now = getCurrentTime();
    for (const slot of todaySlots) {
      if (slot.startTime === now && slot.period !== lastSentPeriod) {
        setLastSentPeriod(slot.period);
        await sendLessonNotifications(slot);
        break;
      }
    }
  }, [autoNotifyEnabled, schedule, todaySlots, lastSentPeriod]);

  useEffect(() => {
    if (autoNotifyEnabled) {
      intervalRef.current = setInterval(checkAndNotify, 60000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoNotifyEnabled, checkAndNotify]);

  /* ── Parse schedule from image via dedicated AI Route ─────────── */
  const parseScheduleFromAI = async () => {
    if (!imageBase64 && !manualText.trim()) return;
    setParsing(true);
    setParseSuccess(false);
    setParseError('');

    try {
      const res = await fetch('/api/schedule/parse', {
        method: 'POST',
        headers: authJsonHeaders(),
        body: JSON.stringify({
          imageBase64,
          imageMime,
          manualText: manualText.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.slots) && data.slots.length > 0) {
          const parsed: ParsedSchedule = {
            slots: data.slots,
            parsedAt: new Date().toISOString(),
            imageBase64: imageBase64 ?? undefined,
          };
          setSchedule(parsed);
          saveScheduleStore(parsed);
          setParseSuccess(true);
          setActiveSection('full-grid');
        } else {
          setParseError(data.error || 'لم يتم استخراج جدول صالح من الصورة. جرّب صورة أوضح أو أدخل البيانات يدوياً.');
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setParseError(data.error || 'تعذر تحليل الجدول. تأكد من تسجيل الدخول ومن وضوح الصورة.');
      }
    } catch (e) {
      console.warn('Schedule parse error:', e);
      setParseError('حدث خطأ في الاتصال أثناء تحليل الجدول. الجدول القديم سيظل ثابتاً بدون تغيير.');
    }
    setParsing(false);
  };

  /* ── Reset to Official 30-period Schedule ───────────────────────── */
  const handleResetToDefaultSchedule = () => {
    const defaultParsed = getDefaultParsedSchedule();
    setSchedule(defaultParsed);
    saveScheduleStore(defaultParsed);
    setParseSuccess(true);
    alert('✅ تم تثبيت واعتماد جدول الحصص الأسبوعي الرسمي (30 حصة) بنجاح بالسيرفر!');
  };

  /* ── Inline Edit Slot Subject ──────────────────────────────────── */
  const handleEditSlot = (day: string, period: number, currentSubject: string) => {
    const newSubject = prompt(`تعديل مادة الحصة ${period} ليوم ${day}:`, currentSubject);
    if (!newSubject || !newSubject.trim() || newSubject === currentSubject) return;

    const currentSlots = schedule?.slots ? [...schedule.slots] : getDefaultParsedSchedule().slots;
    const slotIdx = currentSlots.findIndex(s => s.day === day && s.period === period);

    if (slotIdx >= 0) {
      currentSlots[slotIdx] = { ...currentSlots[slotIdx], subject: newSubject.trim() };
    } else {
      currentSlots.push({
        day,
        period,
        subject: newSubject.trim(),
        startTime: '07:30',
        endTime: '08:10',
      });
    }

    const updated: ParsedSchedule = {
      slots: currentSlots,
      parsedAt: new Date().toISOString(),
    };
    setSchedule(updated);
    saveScheduleStore(updated);
  };

  /* ── Send lesson notifications via WhatsApp ──────────────────── */
  const sendLessonNotifications = async (slot: ScheduleSlot) => {
    setSendingNotif(true);
    const newLogs: NotificationLog[] = [];

    for (const parent of parents) {
      const msg = buildLessonMessage(
        parent.name,
        parent.studentName,
        slot.subject,
        slot.period,
        slot.startTime,
        slot.endTime,
        slot.homework,
      );

      const phone = parent.phone.replace(/\D/g, '');
      const waUrl = `https://wa.me/${phone.startsWith('966') ? '' : '966'}${phone.replace(/^0/, '')}?text=${encodeURIComponent(msg)}`;
      
      newLogs.push({
        id: `notif-${Date.now()}-${parent.studentId}`,
        parentName: parent.name,
        phone: parent.phone,
        studentName: parent.studentName,
        subject: slot.subject,
        message: msg,
        sentAt: new Date().toLocaleString('ar-SA'),
        type: 'lesson',
        status: 'sent',
      });

      // Open WhatsApp in new tab for teacher to send
      setTimeout(() => window.open(waUrl, '_blank'), 300);
    }

    const updatedLogs = [...newLogs, ...logs];
    setLogs(updatedLogs);
    saveLogs(updatedLogs);
    setSendingNotif(false);
  };

  /* ── Send daily summary ──────────────────────────────────────── */
  const sendDailySummary = async () => {
    setSendingNotif(true);
    const subjects = todaySlots.map(s => s.subject);
    const newLogs: NotificationLog[] = [];

    for (const parent of parents) {
      const msg = buildDailySummaryMessage(parent.name, parent.studentName, subjects);
      const phone = parent.phone.replace(/\D/g, '');
      const waUrl = `https://wa.me/${phone.startsWith('966') ? '' : '966'}${phone.replace(/^0/, '')}?text=${encodeURIComponent(msg)}`;

      newLogs.push({
        id: `notif-${Date.now()}-${parent.studentId}`,
        parentName: parent.name,
        phone: parent.phone,
        studentName: parent.studentName,
        subject: subjects.join(' · '),
        message: msg,
        sentAt: new Date().toLocaleString('ar-SA'),
        type: 'summary',
        status: 'sent',
      });

      setTimeout(() => window.open(waUrl, '_blank'), 300);
    }

    const updatedLogs = [...newLogs, ...logs];
    setLogs(updatedLogs);
    saveLogs(updatedLogs);
    setSendingNotif(false);
  };

  /* ── Image pick ─────────────────────────────────────────────── */
  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const [meta, b64] = result.split('base64,');
      const mime = meta.match(/data:(.*?);/)?.[1] || 'image/png';
      setImageBase64(b64);
      setImageMime(mime);
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const notifTypeLabel: Record<string, string> = {
    morning: '🌅 صباحي',
    lesson: '📚 حصة',
    homework: '📝 واجب',
    dismissal: '🏠 انصراف',
    summary: '📋 ملخص',
  };

  const periodNumbers = Array.from(new Set((schedule?.slots ?? []).map((slot) => slot.period)))
    .filter((period) => Number.isFinite(period) && period > 0)
    .sort((a, b) => a - b);
  const visiblePeriods = periodNumbers.length > 0 ? periodNumbers : [1, 2, 3, 4, 5, 6, 7];

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <div className="space-y-5" dir="rtl">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20">
              <Calendar size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                الجدول الذكي + إشعارات الأولياء (متصل بالسيرفر ☁️)
                <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-black text-emerald-800 flex items-center gap-1">
                  ● مزامنة دائمية
                </span>
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-0.5">
                ارفع الجدول · الذكاء الاصطناعي يحلله ويحفظه في قاعدة بيانات السيرفر · إشعارات فورية لأولياء الأمور
              </p>
            </div>
          </div>

          {/* Auto-notify toggle */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all ${
              autoNotifyEnabled
                ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <button
                onClick={() => setAutoNotifyEnabled(!autoNotifyEnabled)}
                className={`relative w-10 h-5.5 rounded-full transition-all duration-200 ${
                  autoNotifyEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
                style={{ height: 22, width: 40 }}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${
                  autoNotifyEnabled ? 'right-0.5' : 'left-0.5'
                }`} />
              </button>
              <span className="text-xs font-black">
                {autoNotifyEnabled ? '✅ الإشعار التلقائي مفعّل' : 'تفعيل الإشعار التلقائي'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section Tabs ─────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'upload', label: 'رفع وتعديل الجدول', icon: Upload },
          { key: 'full-grid', label: `الجدول الأسبوعي المعتمد (${schedule?.slots?.length ?? 30} حصة) 📅`, icon: Calendar },
          { key: 'today', label: `جدول اليوم (${today})`, icon: Sun },
          { key: 'logs', label: `سجل الإشعارات (${logs.length})`, icon: Bell },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveSection(key as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
              activeSection === key
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300 hover:text-amber-700'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ═══ SECTION: Upload & Parse ═══ */}
      {activeSection === 'upload' && (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Image Upload */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ImageIcon size={16} className="text-amber-600" />
              رفع صورة الجدول
            </h2>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-amber-300 rounded-2xl p-8 flex flex-col items-center gap-3 cursor-pointer transition hover:bg-amber-50/50 group"
            >
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="الجدول المرفوع"
                    className="max-h-48 rounded-xl object-contain"
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); setImageBase64(null); setImagePreview(null); }}
                    className="absolute -top-2 -left-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center group-hover:bg-amber-100 transition">
                    <Upload size={24} className="text-amber-500" />
                  </div>
                  <p className="text-sm font-black text-slate-700">اضغط لرفع صورة الجدول</p>
                  <p className="text-xs text-slate-400 font-bold">JPG, PNG, HEIC — الذكاء الاصطناعي سيقرأه ويفهمه فوراً ويحفظه بالسيرفر</p>
                </>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImagePick}
              className="hidden"
            />
          </div>

          {/* Manual Text Entry */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <BookOpen size={16} className="text-amber-600" />
              أو أدخل الجدول يدوياً
            </h2>
            <textarea
              value={manualText}
              onChange={e => setManualText(e.target.value)}
              placeholder={`مثال:\nالأحد:\nالحصة 1: لغتي العربية 7:30-8:10\nالحصة 2: الرياضيات 8:10-8:50\n...`}
              className="w-full h-48 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:bg-white transition resize-none"
            />
          </div>

          {/* AI Parse Button */}
          <div className="lg:col-span-2">
            <button
              onClick={parseScheduleFromAI}
              disabled={parsing || (!imageBase64 && !manualText.trim())}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-l from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white py-4 rounded-2xl text-sm font-black shadow-lg shadow-amber-500/25 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:scale-100 cursor-pointer"
            >
              {parsing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  الذكاء الاصطناعي يحلل الجدول ويحفظه في السيرفر...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  تحليل الجدول بالذكاء الاصطناعي وحفظه بالسيرفر
                </>
              )}
            </button>

            {parseSuccess && (
              <div className="mt-3 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-emerald-700">
                <CheckCircle2 size={16} />
                <span className="text-xs font-black">
                  تم تحليل الجدول بنجاح وحفظه في خادم قاعدة البيانات.
                </span>
              </div>
            )}

            {parseError && (
              <div className="mt-3 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-rose-700">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span className="text-xs font-black leading-6">
                  {parseError}
                </span>
              </div>
            )}

            {schedule && (
              <div className="mt-3 bg-gradient-to-r from-amber-50 to-emerald-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      الجدول الحالي المعتمد بالسيرفر ({schedule.slots.length} حصة)
                      <span className="text-emerald-700 font-bold bg-emerald-100 text-[10px] px-2 py-0.5 rounded-full">
                        ● متصل ودائمي
                      </span>
                    </p>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                      تم الحفظ والتحديث في {new Date(schedule.parsedAt).toLocaleDateString('ar-SA')} — معتمد تلقائياً في جدول الحصص وكشوفات الحضور.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveSection('full-grid')}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shadow-xs"
                    >
                      استعراض الجدول الأسبوعي 📅
                    </button>
                    {onNavigateToSchedule && (
                      <button
                        onClick={onNavigateToSchedule}
                        className="bg-emerald-800 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shadow-xs"
                      >
                        جدول الحصص 🕒
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-amber-200/60">
                  {Object.keys(DAY_NAMES_AR).map(day => {
                    const count = schedule.slots.filter(s => s.day === day).length;
                    return count > 0 ? (
                      <span key={day} className="bg-white/80 border border-amber-200 text-amber-900 text-[11px] font-black px-3 py-1 rounded-lg shadow-2xs">
                        {day}: {count} حصص
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ SECTION: Full Weekly Grid View ═══ */}
      {activeSection === 'full-grid' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-amber-600" />
                الجدول الأسبوعي الكامل المعتمد لفصل 1/1 ({schedule?.slots?.length ?? 30} حصة)
              </h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                يمكنك الضغط على أي حصة لتعديل اسمها مباشرة · محفوظ في السيرفر ومرتبط بجدول الحصص وكشوفات الحضور
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleResetToDefaultSchedule}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-xs flex items-center gap-1.5"
                title="استعادة المواد الرسمية المعتمدة لفصل 1/1"
              >
                <RefreshCw size={13} /> استعادة المواد الرسمية 🔄
              </button>
              {onNavigateToSchedule && (
                <button
                  onClick={onNavigateToSchedule}
                  className="bg-emerald-800 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-sm"
                >
                  فتح صفحة جدول الحصص والطباعة 🖨️
                </button>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-900 text-white text-xs">
                    <th className="py-3 px-4 font-black w-36 text-center border-l border-slate-800">الحصة / الوقت</th>
                    {Object.keys(DAY_NAMES_AR).map(day => (
                      <th key={day} className="py-3 px-3 text-center border-l border-slate-800 last:border-l-0">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {visiblePeriods.map(pNum => {
                    const sampleSlot = schedule?.slots?.find(s => s.period === pNum);
                    const timeRange = sampleSlot ? `${sampleSlot.startTime} - ${sampleSlot.endTime}` : (pNum === 1 ? '07:30 - 08:10' : '');

                    return (
                      <tr key={pNum} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-3 text-center bg-slate-50 font-black text-slate-800 border-l border-slate-200">
                          <div>الحصة {pNum}</div>
                          {timeRange && (
                            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{timeRange}</span>
                          )}
                        </td>
                        {Object.keys(DAY_NAMES_AR).map(day => {
                          const slot = schedule?.slots?.find(s => s.day === day && s.period === pNum);
                          return (
                            <td key={day} className="p-2 border-l border-slate-200 last:border-l-0">
                              {slot ? (
                                <div
                                  onClick={() => handleEditSlot(day, pNum, slot.subject)}
                                  className="rounded-xl bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200 hover:border-amber-400 p-2.5 text-center transition cursor-pointer group"
                                  title="اضغط لتعديل اسم المادة"
                                >
                                <div className="font-black text-xs text-slate-900 group-hover:text-amber-950 leading-tight">{slot.subject}</div>
                                  {slot.teacher && (
                                    <div className="text-[10px] text-slate-500 font-semibold mt-0.5 flex items-center gap-1 justify-center">
                                      <span>👤</span>{slot.teacher}
                                    </div>
                                  )}
                                  <div className="text-[10px] font-mono text-amber-800 font-bold mt-1">
                                    {slot.startTime} - {slot.endTime}
                                  </div>
                                </div>
                              ) : (
                                <div
                                  onClick={() => handleEditSlot(day, pNum, 'حصة دراسية')}
                                  className="text-center text-slate-300 font-bold p-3 hover:bg-slate-100 rounded-xl cursor-pointer"
                                >
                                  + إضافة
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
        </div>
      )}

      {/* ═══ SECTION: Today's Schedule ═══ */}
      {activeSection === 'today' && (
        <div className="space-y-4">
          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={sendDailySummary}
              disabled={sendingNotif || todaySlots.length === 0 || parents.length === 0}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-sm transition disabled:opacity-50"
            >
              {sendingNotif ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              إرسال ملخص اليوم لجميع الأولياء
            </button>
            <button
              onClick={() => setActiveSection('upload')}
              className="flex items-center gap-2 bg-white border border-slate-200 hover:border-amber-300 text-slate-600 hover:text-amber-700 px-4 py-2.5 rounded-xl text-xs font-black transition"
            >
              <RefreshCw size={14} />
              تحديث الجدول
            </button>
          </div>

          {todaySlots.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
              <p className="text-4xl">📅</p>
              <p className="font-black text-slate-700">
                {schedule
                  ? `لا توجد حصص مسجلة ليوم ${today}`
                  : 'لم يتم رفع الجدول بعد — ارفع الجدول من تبويب "رفع الجدول"'
                }
              </p>
              {!schedule && (
                <button
                  onClick={() => setActiveSection('upload')}
                  className="inline-flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-black"
                >
                  <Upload size={13} /> ارفع الجدول الآن
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {todaySlots.map((slot) => (
                <div
                  key={`${slot.day}-${slot.period}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-amber-200 transition"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center font-black text-amber-700 text-sm shrink-0">
                        {slot.period}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{slot.subject}</p>
                        <p className="text-xs font-bold text-slate-500 flex items-center gap-1">
                          <Clock size={10} />
                          {slot.startTime} – {slot.endTime}
                        </p>
                        {slot.homework && (
                          <p className="text-[11px] font-bold text-amber-700 mt-0.5">
                            📝 واجب: {slot.homework}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-slate-400 font-bold hidden md:block">
                        {parents.length} ولي أمر
                      </span>
                      <button
                        onClick={() => sendLessonNotifications(slot)}
                        disabled={sendingNotif || parents.length === 0}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-[11px] font-black transition disabled:opacity-50 shadow-sm"
                      >
                        {sendingNotif ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                        إرسال الإشعار
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Parents quick view */}
          {parents.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Users size={13} /> أولياء الأمور المسجلون ({parents.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {parents.map(p => (
                  <div key={p.id} className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center font-black text-emerald-700 text-xs shrink-0">
                      {p.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-900 truncate">{p.name}</p>
                      <p className="text-[10px] font-bold text-slate-400">ولي أمر: {p.studentName.split(' ').slice(0, 2).join(' ')}</p>
                    </div>
                    <a
                      href={`https://wa.me/966${p.phone.replace(/^0/, '').replace(/\D/g, '')}?text=${encodeURIComponent(`السلام عليكم ${p.name} 👋`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-7 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center text-white transition shrink-0"
                      title="فتح واتساب"
                    >
                      <MessageSquare size={13} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ SECTION: Logs ═══ */}
      {activeSection === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Bell size={16} className="text-amber-600" />
              سجل الإشعارات المرسلة بالسيرفر ({logs.length})
            </h2>
          </div>

          {logs.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
              <p className="text-4xl">🔔</p>
              <p className="font-black text-slate-600">لا توجد إشعارات مرسلة بعد</p>
              <p className="text-xs text-slate-400 font-bold">
                ارسل أول إشعار من تبويب "جدول اليوم"
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map(log => (
                <div key={log.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-amber-200 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs ${
                        log.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {log.status === 'sent' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900">{log.parentName}</span>
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black">
                            {notifTypeLabel[log.type] ?? log.type}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                            log.status === 'sent'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {log.status === 'sent' ? '✓ مرسل (سحابة)' : '⚠ معلق'}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                          ابن: {log.studentName} · {log.subject}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-1">
                          <Clock size={9} /> {log.sentAt}
                        </p>
                      </div>
                    </div>

                    <a
                      href={`https://wa.me/966${log.phone.replace(/^0/, '').replace(/\D/g, '')}?text=${encodeURIComponent(log.message)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-xl text-[11px] font-black hover:bg-emerald-100 transition shrink-0"
                    >
                      <Send size={11} /> إعادة إرسال
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
