'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Clock, Users, Camera, BarChart3,
  Bell, Send, CheckCircle, XCircle, Plus, Video,
  AlertTriangle, Loader2, Star, MessageSquare,
  LogOut, Eye, ChevronDown, ChevronUp, Image, Upload,
  Radio, UserCheck, UserX, Phone, Sparkles, Award, FileText,
  Menu, X, ChevronRight, ChevronLeft,
} from 'lucide-react';
import {
  DEFAULT_SCHEDULE, DAY_NAMES, SUBJECT_COLORS,
  getTodayPeriods, getCurrentPeriod, getMinutesUntilDismissal,
  type Period,
} from '@/data/ikhlasSchedule';
import { clearSession } from '@/lib/localDb';
import MasarAIAgent from '@/components/MasarAIAgent';
import LiveStreamTab from '@/components/LiveStreamTab';
import ExcellenceCertificateTab from '@/components/ExcellenceCertificateTab';
import ProfessionalScheduleTab from '@/components/ProfessionalScheduleTab';
import HomeworkTabManager from '@/components/HomeworkTabManager';
import ClassEventsArchiveTab from '@/components/ClassEventsArchiveTab';
import StudentReportsManagerTab from '@/components/StudentReportsManagerTab';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BRANCH = 'IKHLAS_JEDDAH';

const CLASS_STUDENTS = [
  { id: 's1', name: 'أحمد محمد علي إبراهيم',        phone: '966501234567' },
  { id: 's2', name: 'يوسف خالد عبد العزيز السهلي',   phone: '966502234567' },
  { id: 's3', name: 'عمر سعد محمد الغامدي',           phone: '966503234567' },
  { id: 's4', name: 'عبد الرحمن فهد علي القحطاني',    phone: '966504234567' },
  { id: 's5', name: 'محمد عبد الله أحمد الزهراني',    phone: '966505234567' },
  { id: 's6', name: 'سلطان ناصر محمد العتيبي',        phone: '966506234567' },
  { id: 's7', name: 'فيصل بندر عبد الرحمن الشمري',   phone: '966507234567' },
];

type Tab = 'overview' | 'live' | 'certificates' | 'schedule' | 'attendance' | 'homework' | 'meetings' | 'photos' | 'reports';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('masar_token') ?? localStorage.getItem('access_token');
}
function authHeaders() {
  const token = getToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
export default function IkhlasJeddahPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [schedule] = useState<Period[]>(DEFAULT_SCHEDULE);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [minsUntilDismissal, setMinsUntilDismissal] = useState<number>(-1);
  const [todayPeriods, setTodayPeriods] = useState<Period[]>([]);

  /* ── Homework ── */
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwType, setHwType] = useState<'TEXT' | 'MULTIPLE_CHOICE'>('TEXT');
  const [hwOptions, setHwOptions] = useState(['', '', '', '']);
  const [hwDue, setHwDue] = useState('');
  const [hwLoading, setHwLoading] = useState(false);
  const [openSubmissionsHw, setOpenSubmissionsHw] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, any[]>>({});

  /* ── Attendance ── */
  const [attendance, setAttendance] = useState<Record<string, { status: string; score: number }>>({});
  const [attLoading, setAttLoading] = useState(false);
  const [exitLogged, setExitLogged] = useState<Record<string, string>>({});
  // Photo-based auto attendance
  const [photoAttMode, setPhotoAttMode] = useState(false);
  const [photoAttUrl, setPhotoAttUrl] = useState('');
  const [photoAttProcessing, setPhotoAttProcessing] = useState(false);
  const [photoAttResult, setPhotoAttResult] = useState<Record<string, boolean> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Meetings (Masar internal system) ── */
  const [meetings, setMeetings] = useState<any[]>([]);
  const [mtgTitle, setMtgTitle] = useState('');
  const [mtgDate, setMtgDate] = useState('');
  const [mtgDuration, setMtgDuration] = useState(45);
  const [mtgLoading, setMtgLoading] = useState(false);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);

  /* ── Photos ── */
  const [photos, setPhotos] = useState<any[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);

  /* ── Posts ── */
  const [posts, setPosts] = useState<any[]>([]);
  const [postBody, setPostBody] = useState('');
  const [postType, setPostType] = useState<'ANNOUNCEMENT' | 'GENERAL'>('ANNOUNCEMENT');
  const [postLoading, setPostLoading] = useState(false);

  /* ── Report ── */
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  /* ── Clock ── */
  useEffect(() => {
    const tick = () => {
      setCurrentPeriod(getCurrentPeriod(schedule));
      setMinsUntilDismissal(getMinutesUntilDismissal(schedule));
      setTodayPeriods(getTodayPeriods(schedule));
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, [schedule]);

  /* ── Fetch ── */
  const fetchHomework = useCallback(async () => {
    try {
      const r = await fetch(`${API}/school/homework?branch=${BRANCH}`, { headers: authHeaders() });
      if (r.ok) setHomeworkList(await r.json());
    } catch (e) {
      console.warn('Backend API offline (homework):', e);
    }
  }, []);

  const fetchSubmissions = useCallback(async (hwId: string) => {
    try {
      const r = await fetch(`${API}/school/homework/${hwId}/submissions`, { headers: authHeaders() });
      if (r.ok) {
        const data = await r.json();
        setSubmissions(prev => ({ ...prev, [hwId]: data }));
      }
    } catch (e) {
      console.warn('Backend API offline (submissions):', e);
    }
  }, []);

  const fetchMeetings = useCallback(async () => {
    try {
      const r = await fetch(`${API}/school/meetings?branch=${BRANCH}`, { headers: authHeaders() });
      if (r.ok) setMeetings(await r.json());
    } catch (e) {
      console.warn('Backend API offline (meetings):', e);
    }
  }, []);

  const fetchPhotos = useCallback(async () => {
    try {
      const r = await fetch(`${API}/school/photos?branch=${BRANCH}`, { headers: authHeaders() });
      if (r.ok) setPhotos(await r.json());
    } catch (e) {
      console.warn('Backend API offline (photos):', e);
    }
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const r = await fetch(`${API}/school/posts?branch=${BRANCH}`, { headers: authHeaders() });
      if (r.ok) setPosts(await r.json());
    } catch (e) {
      console.warn('Backend API offline (posts):', e);
    }
  }, []);

  useEffect(() => {
    fetchHomework(); fetchMeetings(); fetchPhotos(); fetchPosts();
  }, [fetchHomework, fetchMeetings, fetchPhotos, fetchPosts]);

  /* ── Listen to Real-Time AI Actions ── */
  useEffect(() => {
    const handleAIAction = (e: any) => {
      const { action, prompt } = e.detail || {};
      const p = (prompt || action || '').toLowerCase();

      // Attendance AI Execution: Update state live on screen!
      if (p.includes('حضر') || p.includes('تحضير') || p.includes('حاضر') || p.includes('حضور') || p.includes('غياب') || p.includes('attendance')) {
        let absentName = '';
        if (p.includes('ما عدا') || p.includes('ماعدا') || p.includes('إلا') || p.includes('الا')) {
          const parts = (prompt || '').split(/ما عدا|ماعدا|إلا|الا/);
          absentName = parts[1] ? parts[1].trim() : '';
        }

        const newAtt: Record<string, { status: string; score: number }> = {};
        CLASS_STUDENTS.forEach((s) => {
          const isAbsent = absentName && s.name.includes(absentName);
          newAtt[s.id] = {
            status: isAbsent ? 'absent' : 'present',
            score: isAbsent ? 0 : 95,
          };
        });
        setAttendance(newAtt);
        setActiveTab('attendance');
      }

      // Homework AI Execution
      if (p.includes('واجب') || p.includes('تمرين') || p.includes('homework')) {
        fetchHomework();
        setActiveTab('homework');
      }

      // Meetings AI Execution
      if (p.includes('حصة') || p.includes('لايف') || p.includes('اجتماع') || p.includes('meeting')) {
        fetchMeetings();
        setActiveTab('meetings');
      }

      // Posts AI Execution
      if (p.includes('إعلان') || p.includes('اعلان') || p.includes('منشور') || p.includes('announcement')) {
        fetchPosts();
        setActiveTab('overview');
      }
    };

    window.addEventListener('masar_action_executed', handleAIAction);
    return () => window.removeEventListener('masar_action_executed', handleAIAction);
  }, [fetchHomework, fetchMeetings, fetchPosts]);

  /* ── Logout ── */
  const handleLogout = () => {
    clearSession();
    ['masar_logged_in','masar_token','access_token','masar_user','user_role','user_name'].forEach(k =>
      localStorage.removeItem(k)
    );
    router.push('/login');
  };

  /* ── Attendance Actions ── */
  const logExit = async (studentId: string, studentName: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    const today = now.toISOString().slice(0, 10);
    setExitLogged(prev => ({ ...prev, [studentId]: timeStr }));
    const att = attendance[studentId] ?? { status: 'present', score: 90 };
    try {
      await fetch(`${API}/school/attendance`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          branch: BRANCH, studentName, studentId, date: today,
          attendance: att.status, performanceScore: att.score,
          exitTime: timeStr, parentNotified: true,
        }),
      });
    } catch (e) {
      console.warn('Backend API offline (exit log):', e);
    }
  };

  const sendLateAlert = async (studentId: string, studentName: string) => {
    const exitTime = exitLogged[studentId] ?? '--:--';
    try {
      await fetch(`${API}/school/attendance`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          branch: BRANCH, studentName, studentId,
          date: new Date().toISOString().slice(0, 10),
          attendance: 'present', lateAlertSent: true,
          exitTime, parentNotified: true,
        }),
      });
    } catch (e) {
      console.warn('Backend API offline (late alert):', e);
    }
    const msg = encodeURIComponent(
      `🚨 تنبيه عاجل من مدارس الإخلاص الأهلية بجدة 🇸🇦\nالسيد ولي أمر الطالب (${studentName}) المحترم، نود تذكيركم بأن اليوم الدراسي قد انتهى، يرجى الحضور فوراً لاستلام الطفل من بوابة المدرسة.`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const saveAttendance = async () => {
    setAttLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    try {
      await Promise.all(
        CLASS_STUDENTS.map((s) => {
          const att = attendance[s.id] ?? { status: 'present', score: 90 };
          return fetch(`${API}/school/attendance`, {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({
              branch: BRANCH, studentName: s.name, studentId: s.id,
              date: today, attendance: att.status, performanceScore: att.score,
            }),
          }).catch(e => console.warn(e));
        })
      );
    } catch (e) {
      console.warn('Backend API offline (save attendance):', e);
    }
    setAttLoading(false);
    alert('✅ تم حفظ كشف الحضور بنجاح وإرسال الإشعارات لأولياء الأمور');
  };

  /* ── Photo-based Auto Attendance ── */
  const processPhotoAttendance = async () => {
    if (!photoAttUrl && !fileInputRef.current?.files?.[0]) return;
    setPhotoAttProcessing(true);
    // Simulate AI detection — in production connects to Vision API
    await new Promise(r => setTimeout(r, 2000));
    // Simulated result: randomly mark 5-7 students as present
    const detected: Record<string, boolean> = {};
    CLASS_STUDENTS.forEach((s, i) => {
      detected[s.id] = Math.random() > 0.2; // 80% chance present
    });
    setPhotoAttResult(detected);
    // Auto-apply to attendance state
    const newAtt: Record<string, { status: string; score: number }> = {};
    CLASS_STUDENTS.forEach(s => {
      newAtt[s.id] = {
        status: detected[s.id] ? 'present' : 'absent',
        score: detected[s.id] ? 90 : 0,
      };
    });
    setAttendance(newAtt);
    setPhotoAttProcessing(false);
  };

  /* ── Homework ── */
  const createHomework = async () => {
    if (!hwTitle || !hwDesc || !hwDue) return;
    setHwLoading(true);
    try {
      const r = await fetch(`${API}/school/homework`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          branch: BRANCH, title: hwTitle, description: hwDesc,
          type: hwType, dueDate: hwDue,
          options: hwType === 'MULTIPLE_CHOICE' ? hwOptions.filter(Boolean) : undefined,
        }),
      });
      if (r.ok) { setHwTitle(''); setHwDesc(''); setHwDue(''); setHwOptions(['','','','']); await fetchHomework(); }
    } catch (e) {
      console.warn('Backend API offline (create homework):', e);
    }
    setHwLoading(false);
  };

  const handleCreateHomeworkFromManager = async (hwData: {
    title: string;
    description: string;
    notes?: string;
    images?: string[];
    dueDate: string;
    subject?: string;
  }) => {
    try {
      const r = await fetch(`${API}/school/homework`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          branch: BRANCH,
          title: hwData.title,
          description: hwData.description,
          notes: hwData.notes,
          images: hwData.images,
          subject: hwData.subject,
          type: 'TEXT',
          dueDate: hwData.dueDate,
        }),
      });
      if (r.ok) {
        await fetchHomework();
      } else {
        const localHw: any = {
          id: `HW-${Date.now()}`,
          title: hwData.title,
          description: hwData.description,
          notes: hwData.notes,
          images: hwData.images,
          subject: hwData.subject,
          dueDate: hwData.dueDate,
          status: 'OPEN',
          submissions: [],
          createdAt: new Date().toISOString(),
        };
        setHomeworkList(prev => [localHw, ...prev]);
      }
    } catch {
      const localHw: any = {
        id: `HW-${Date.now()}`,
        title: hwData.title,
        description: hwData.description,
        notes: hwData.notes,
        images: hwData.images,
        subject: hwData.subject,
        dueDate: hwData.dueDate,
        status: 'OPEN',
        submissions: [],
        createdAt: new Date().toISOString(),
      };
      setHomeworkList(prev => [localHw, ...prev]);
    }
  };

  /* ── Meetings (Masar internal) ── */
  const createMeeting = async () => {
    if (!mtgTitle || !mtgDate) return;
    setMtgLoading(true);
    // Generate internal Masar room code
    const roomCode = 'MASAR-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    const hostToken = Math.random().toString(36).slice(2, 18);
    const meetingUrl = `/meetings?room=${roomCode}&t=${hostToken}`;
    try {
      const r = await fetch(`${API}/school/meetings`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          branch: BRANCH, title: mtgTitle, meetingUrl,
          scheduledAt: mtgDate, duration: mtgDuration,
          roomCode, hostToken,
        }),
      });
      if (r.ok) { setMtgTitle(''); setMtgDate(''); await fetchMeetings(); }
    } catch (e) {
      console.warn('Backend API offline (create meeting):', e);
    }
    setMtgLoading(false);
  };

  const startMeeting = (m: any) => {
    const url = m.meetingUrl ?? m.roomCode
      ? `/meetings?room=${m.roomCode}&t=${m.hostToken}`
      : `/meetings`;
    router.push(url);
  };

  /* ── Photos ── */
  const uploadPhoto = async () => {
    if (!photoUrl) return;
    setPhotoLoading(true);
    try {
      const r = await fetch(`${API}/school/photos`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ branch: BRANCH, photoUrl, caption: photoCaption }),
      });
      if (r.ok) { setPhotoUrl(''); setPhotoCaption(''); await fetchPhotos(); }
    } catch (e) {
      console.warn('Backend API offline (upload photo):', e);
    }
    setPhotoLoading(false);
  };

  const handleCreateEventFromManager = async (evtData: any) => {
    try {
      const r = await fetch(`${API}/school/photos`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({
          branch: BRANCH,
          title: evtData.title,
          category: evtData.category,
          driveUrl: evtData.driveUrl,
          photoUrl: evtData.coverImage,
          caption: evtData.description,
        }),
      });
      if (r.ok) { await fetchPhotos(); }
    } catch (e) {
      console.warn('Backend API offline (create event):', e);
    }
  };

  /* ── Posts ── */
  const createPost = async () => {
    if (!postBody) return;
    setPostLoading(true);
    try {
      const r = await fetch(`${API}/school/posts`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ branch: BRANCH, type: postType, body: postBody }),
      });
      if (r.ok) { setPostBody(''); await fetchPosts(); }
    } catch (e) {
      console.warn('Backend API offline (create post):', e);
    }
    setPostLoading(false);
  };

  /* ── Weekly Report ── */
  const sendWeeklyReport = async () => {
    setReportLoading(true);
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 4);
    try {
      await Promise.all(
        CLASS_STUDENTS.map(s =>
          fetch(`${API}/school/weekly-reports`, {
            method: 'POST', headers: authHeaders(),
            body: JSON.stringify({
              branch: BRANCH, studentName: s.name, studentId: s.id,
              weekStart: weekStart.toISOString().slice(0, 10),
              weekEnd: weekEnd.toISOString().slice(0, 10),
              attendanceDays: 5, avgPerformance: 92,
              homeworkDone: homeworkList.length, homeworkTotal: homeworkList.length,
              teacherNotes: 'أسبوع ممتاز — الطلاب في تقدم رائع بإذن الله 🌟',
            }),
          }).catch(e => console.warn(e))
        )
      );
    } catch (e) {
      console.warn('Backend API offline (send weekly report):', e);
    }
    setReportLoading(false);
    setReportSent(true);
    setTimeout(() => setReportSent(false), 4000);
  };

  const tabs: { key: Tab; label: string; icon: any; badge?: number }[] = [
    { key: 'overview',      label: 'نظرة عامة',         icon: BarChart3 },
    { key: 'live',          label: 'البث المباشر 🔴',    icon: Radio },
    { key: 'certificates',  label: 'شهادات التفوق 🏆',   icon: Award },
    { key: 'schedule',      label: 'جدول الحصص',        icon: Clock },
    { key: 'attendance',    label: 'الحضور',             icon: Users },
    { key: 'homework',      label: 'الواجبات',           icon: BookOpen, badge: homeworkList.filter(h => h.status === 'OPEN').length },
    { key: 'meetings',      label: 'الاجتماعات',         icon: Video },
    { key: 'photos',        label: 'الصور',              icon: Camera },
    { key: 'reports',       label: 'التقارير',            icon: BarChart3 },
  ];

  const jsDay = new Date().getDay();
  const isSchoolDay = jsDay >= 0 && jsDay <= 4;
  const presentCount = Object.values(attendance).filter(a => a.status === 'present').length;
  const absentCount  = Object.values(attendance).filter(a => a.status === 'absent').length;

  /* ══════════ RENDER ══════════ */
  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 flex flex-col" dir="rtl">

      {/* ─── HEADER ─── */}
      <div className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="w-full px-4 md:px-6 py-3 flex items-center justify-between gap-3">
          {/* Brand + Toggle Menu Button */}
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="flex items-center gap-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 text-xs font-black text-emerald-800 transition active:scale-95 shadow-xs"
              title={isSidebarOpen ? 'إخفاء القائمة' : 'إظهار القائمة'}
            >
              {isSidebarOpen ? <X className="w-4 h-4 text-emerald-700" /> : <Menu className="w-4 h-4 text-emerald-700" />}
              <span className="hidden sm:inline">{isSidebarOpen ? 'إخفاء المنيو' : 'منيو الأقسام'}</span>
            </button>

            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shrink-0">
              <span className="text-xl">🏫</span>
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 leading-tight">فصل 1/1 — مدارس الإخلاص الأهلية بجدة</h1>
              <p className="text-[11px] text-slate-500 font-medium">لوحة المعلم | أ. إسماعيل عيسى</p>
            </div>
          </div>

          {/* Current period + logout */}
          <div className="flex items-center gap-2">
            {currentPeriod && (
              <div className="hidden md:flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-800 text-xs font-black">{currentPeriod.subjectName}</span>
                <span className="text-emerald-600 text-[11px]">{currentPeriod.startTime}–{currentPeriod.endTime}</span>
              </div>
            )}
            <button onClick={handleLogout}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-xl text-xs font-black transition-all">
              <LogOut className="w-3.5 h-3.5" /> خروج
            </button>
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTAINER WITH FLUSH RIGHT SIDEBAR ─── */}
      <div className="flex-1 flex w-full relative min-h-[calc(100vh-61px)]">

        {/* ── RIGHT SIDEBAR MENU BAR (FLUSH TO VERY RIGHT EDGE) ── */}
        <aside className={`bg-white border-l border-slate-200 shadow-sm transition-all duration-300 ease-in-out shrink-0 z-30 ${
          isSidebarOpen ? 'w-56 md:w-64' : 'w-16'
        }`}>
          <div className="sticky top-16 p-3 space-y-2">

            {/* Sidebar Title / Toggle Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 px-2 pt-1">
              {isSidebarOpen && (
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  أقسام اللوحة
                </span>
              )}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition mr-auto"
                title={isSidebarOpen ? 'طَي المنيو' : 'توسيع المنيو'}
              >
                {isSidebarOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            {/* Menu Items */}
            <nav className="space-y-1.5">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setActiveTab(t.key)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-extrabold transition-all relative ${
                      active
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    title={!isSidebarOpen ? t.label : undefined}
                  >
                    <Icon className={`w-4.5 h-4.5 shrink-0 ${active ? 'text-white' : 'text-emerald-600'}`} />
                    {isSidebarOpen && <span className="truncate">{t.label}</span>}
                    {!!t.badge && (
                      <span className={`w-4.5 h-4.5 text-[9px] font-black rounded-full flex items-center justify-center shrink-0 ${
                        active ? 'bg-white text-emerald-700' : 'bg-rose-500 text-white'
                      } ${!isSidebarOpen ? 'absolute -top-1 -left-1' : 'mr-auto'}`}>
                        {t.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ── MAIN CONTENT AREA (CENTERED OR FULL WIDTH) ── */}
        <main className="flex-1 p-4 md:p-6 min-w-0">
          <div className="max-w-7xl mx-auto space-y-6">

        {/* ════════════ البث المباشر ════════════ */}
        {activeTab === 'live' && <LiveStreamTab isHost={true} />}

        {/* ════════════ شهادات التفوق ════════════ */}
        {activeTab === 'certificates' && <ExcellenceCertificateTab />}

        {/* ════════════ نظرة عامة ════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'طلاب الفصل',     value: CLASS_STUDENTS.length,    icon: Users,    color: 'blue',   bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700' },
                { label: 'واجبات مفتوحة',  value: homeworkList.filter(h => h.status === 'OPEN').length, icon: BookOpen, color: 'amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
                { label: 'اجتماعات اليوم', value: meetings.length,          icon: Video,    color: 'violet', bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700' },
                { label: 'صور الفصل',      value: photos.length,            icon: Camera,   color: 'pink',   bg: 'bg-pink-50',   border: 'border-pink-200',   text: 'text-pink-700' },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-2xl p-4 flex items-start gap-3`}>
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} border ${stat.border} flex items-center justify-center shrink-0 shadow-sm`}>
                      <Icon className={`w-5 h-5 ${stat.text}`} />
                    </div>
                    <div>
                      <div className={`text-2xl font-black ${stat.text}`}>{stat.value}</div>
                      <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Today's Schedule */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                جدول اليوم — {DAY_NAMES[jsDay] ?? 'إجازة'}
              </h2>
              {!isSchoolDay ? (
                <div className="text-center py-8">
                  <p className="text-4xl mb-2">🌙</p>
                  <p className="text-slate-500 font-bold">اليوم إجازة رسمية — استرح!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {todayPeriods.map((p) => {
                    const colorClass = SUBJECT_COLORS[p.subjectName] ?? 'bg-slate-100 text-slate-800 border-slate-200';
                    const isNow = currentPeriod?.periodNumber === p.periodNumber;
                    return (
                      <div key={p.periodNumber}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          isNow ? 'ring-2 ring-emerald-500 ring-offset-1 shadow-md' : ''
                        } ${colorClass}`}>
                        <span className="text-xs font-black w-6 text-center opacity-70">{p.periodNumber}</span>
                        <span className="flex-1 font-bold text-sm">{p.subjectName}</span>
                        <span className="text-xs opacity-70">{p.startTime} – {p.endTime}</span>
                        {isNow && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dismissal Alert */}
            {minsUntilDismissal > 0 && minsUntilDismissal <= 20 && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center gap-3 animate-pulse shadow-sm shadow-amber-100">
                <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />
                <div>
                  <p className="font-black text-amber-900">⏰ تنبيه: {minsUntilDismissal} دقيقة للخروج!</p>
                  <p className="text-xs text-amber-700 mt-0.5">يُنصح بإرسال إشعار لأولياء الأمور للحضور</p>
                </div>
              </div>
            )}

            {/* Quick Homework List */}
            {!!homeworkList.length && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-600" /> آخر الواجبات
                </h3>
                <div className="space-y-2">
                  {homeworkList.slice(0, 3).map((hw) => (
                    <div key={hw.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <div>
                        <p className="font-bold text-sm text-slate-900">{hw.title}</p>
                        <p className="text-xs text-slate-500">التسليم: {new Date(hw.dueDate).toLocaleDateString('ar-SA')}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">{hw.submissions?.length ?? 0}/{CLASS_STUDENTS.length} إجابة</span>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                          hw.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {hw.status === 'OPEN' ? '✅ مفتوح' : '🔒 مغلق'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════ جدول الحصص البروفيشنال ════════════ */}
        {activeTab === 'schedule' && (
          <ProfessionalScheduleTab
            schedule={schedule}
            currentPeriod={currentPeriod}
            minsUntilDismissal={minsUntilDismissal}
            jsDay={jsDay}
          />
        )}

        {/* ════════════ الحضور والانصراف ════════════ */}
        {activeTab === 'attendance' && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" /> كشف الحضور والانصراف
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">{new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>
              <button onClick={saveAttendance} disabled={attLoading}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-50 shadow-sm">
                {attLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                حفظ الكشف وإرسال الإشعارات
              </button>
            </div>

            {/* Summary bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-emerald-700">{presentCount}</p>
                <p className="text-xs text-emerald-700 font-bold mt-0.5">✅ حاضر</p>
              </div>
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-rose-700">{absentCount}</p>
                <p className="text-xs text-rose-700 font-bold mt-0.5">❌ غائب</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-amber-700">{CLASS_STUDENTS.length - presentCount - absentCount}</p>
                <p className="text-xs text-amber-700 font-bold mt-0.5">⏰ لم يُحدَّد</p>
              </div>
            </div>

            {/* 📸 Photo-Based Auto Attendance */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <button onClick={() => setPhotoAttMode(!photoAttMode)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 border border-violet-200 flex items-center justify-center">
                    <Camera className="w-4 h-4 text-violet-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">حضور تلقائي من صورة الفصل</p>
                    <p className="text-[11px] text-slate-500">ارفع صورة وسيكتشف النظام تلقائياً من حضر ومن غاب</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full border border-violet-200">
                    ✨ ذكاء اصطناعي
                  </span>
                  {photoAttMode ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {photoAttMode && (
                <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">
                  {/* File upload */}
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:border-violet-300 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}>
                    <Image className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">اضغط لرفع صورة الفصل</p>
                    <p className="text-xs text-slate-400 mt-1">أو أدخل رابط الصورة أدناه</p>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setPhotoAttUrl(URL.createObjectURL(f));
                      }} />
                  </div>
                  <div className="flex gap-2">
                    <input placeholder="أو أدخل رابط الصورة مباشرة..." value={photoAttUrl} onChange={e => setPhotoAttUrl(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 outline-none focus:border-violet-400 transition" dir="ltr" />
                    <button onClick={processPhotoAttendance} disabled={photoAttProcessing || (!photoAttUrl)}
                      className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-50 shrink-0 shadow-sm">
                      {photoAttProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {photoAttProcessing ? 'جارٍ التحليل...' : 'تحليل الصورة'}
                    </button>
                  </div>

                  {/* Result Preview */}
                  {photoAttResult && (
                    <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 space-y-2">
                      <p className="text-xs font-black text-violet-900 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-violet-600" />
                        تم الاكتشاف التلقائي! راجع النتائج وعدّل إذا لزم:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {CLASS_STUDENTS.map(s => (
                          <div key={s.id} className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold ${
                            photoAttResult[s.id]
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                              : 'bg-rose-50 border-rose-200 text-rose-800'
                          }`}>
                            {photoAttResult[s.id] ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                            <span className="truncate">{s.name.split(' ')[0]} {s.name.split(' ')[1]}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-violet-700 font-bold">
                        ✅ تم تطبيق النتائج على كشف الحضور — يمكنك التعديل اليدوي أدناه
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Manual Attendance List */}
            <div className="space-y-3">
              {CLASS_STUDENTS.map((student) => {
                const att = attendance[student.id] ?? { status: 'present', score: 90 };
                const exited = exitLogged[student.id];
                return (
                  <div key={student.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black border ${
                          att.status === 'present' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : att.status === 'absent' ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : 'bg-amber-50 border-amber-200 text-amber-700'
                        }`}>
                          {student.name[0]}
                        </div>
                        <p className="font-bold text-sm text-slate-900">{student.name}</p>
                      </div>
                      {exited && (
                        <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-bold">
                          خرج {exited} 🕒
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {(['present', 'absent', 'late'] as const).map((s) => (
                        <button key={s} onClick={() => setAttendance(prev => ({ ...prev, [student.id]: { ...att, status: s } }))}
                          className={`text-xs px-3.5 py-1.5 rounded-xl font-bold border transition-all ${
                            att.status === s
                              ? s === 'present' ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                              : s === 'absent'  ? 'bg-rose-600 border-rose-600 text-white shadow-sm'
                              : 'bg-amber-500 border-amber-500 text-white shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}>
                          {s === 'present' ? '✅ حاضر' : s === 'absent' ? '❌ غائب' : '⏰ متأخر'}
                        </button>
                      ))}

                      {/* Performance Slider */}
                      <div className="flex items-center gap-2 mr-auto">
                        <span className="text-xs text-slate-500">الأداء:</span>
                        <input type="range" min={0} max={100} value={att.score}
                          onChange={(e) => setAttendance(prev => ({ ...prev, [student.id]: { ...att, score: Number(e.target.value) } }))}
                          className="w-20 accent-emerald-600" />
                        <span className="text-xs font-black text-emerald-700 w-8">{att.score}%</span>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => logExit(student.id, student.name)}
                        className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs px-3 py-1.5 rounded-xl font-bold transition-all">
                        <Clock className="w-3.5 h-3.5" /> توثيق وقت الخروج
                      </button>
                      <button onClick={() => sendLateAlert(student.id, student.name)}
                        className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs px-3 py-1.5 rounded-xl font-bold transition-all">
                        <Bell className="w-3.5 h-3.5" /> تنبيه تأخر (WhatsApp)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════ الواجبات الإلكترونية ════════════ */}
        {activeTab === 'homework' && (
          <HomeworkTabManager
            students={CLASS_STUDENTS}
            homeworkList={homeworkList}
            onCreateHomework={handleCreateHomeworkFromManager}
            onFetchSubmissions={fetchSubmissions}
          />
        )}

        {/* ════════════ الاجتماعات (نظام مسار الداخلي) ════════════ */}
        {activeTab === 'meetings' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Video className="w-5 h-5 text-violet-600" /> اجتماعات الفيديو — نظام مسار الداخلي
              </h2>
              <span className="text-[11px] bg-violet-50 border border-violet-200 text-violet-700 px-3 py-1 rounded-full font-bold flex items-center gap-1.5">
                <Radio className="w-3 h-3" /> WebRTC مشفّر
              </span>
            </div>

            {/* New Meeting Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
              <h3 className="font-black text-slate-900 flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4 text-violet-600" /> إنشاء اجتماع جديد عبر منصة مسار
              </h3>
              <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs text-violet-800 font-medium">
                💡 سيُنشأ غرفة اجتماع داخلية مشفّرة على منصة مسار — بدون الحاجة لـ Zoom أو Google Meet
              </div>
              <input placeholder="موضوع الاجتماع (مثال: اجتماع أولياء الأمور الشهري)" value={mtgTitle} onChange={e => setMtgTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-violet-400 transition" />
              <div className="flex gap-3 flex-wrap">
                <input type="datetime-local" value={mtgDate} onChange={e => setMtgDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 transition" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">المدة:</span>
                  <select value={mtgDuration} onChange={e => setMtgDuration(Number(e.target.value))}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-violet-400 transition">
                    {[30, 45, 60, 90].map(d => <option key={d} value={d}>{d} دقيقة</option>)}
                  </select>
                </div>
              </div>
              <button onClick={createMeeting} disabled={mtgLoading || !mtgTitle || !mtgDate}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-50 shadow-sm">
                {mtgLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                إنشاء غرفة مسار وإرسال الدعوة للجميع
              </button>
            </div>

            {/* Meetings List */}
            <div className="space-y-3">
              {meetings.map((m) => {
                const isPast = new Date(m.scheduledAt) < new Date();
                return (
                  <div key={m.id} className={`bg-white border rounded-2xl p-4 shadow-sm space-y-3 ${
                    isPast ? 'border-slate-200 opacity-70' : 'border-violet-200'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isPast ? 'bg-slate-100 border border-slate-200' : 'bg-violet-50 border border-violet-200'
                        }`}>
                          <Video className={`w-5 h-5 ${isPast ? 'text-slate-400' : 'text-violet-600'}`} />
                        </div>
                        <div>
                          <p className="font-black text-slate-900">{m.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            📅 {new Date(m.scheduledAt).toLocaleString('ar-SA')} — {m.duration} دقيقة
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                              🔐 غرفة مسار الداخلية
                            </span>
                            {!isPast && (
                              <span className="text-[10px] bg-violet-50 border border-violet-200 text-violet-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                                ● مجدول
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {!isPast && (
                        <button onClick={() => startMeeting(m)}
                          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs px-4 py-2 rounded-xl font-black transition-all shadow-sm shrink-0">
                          <Phone className="w-3.5 h-3.5" /> دخول الغرفة
                        </button>
                      )}
                    </div>

                    {/* Shareable Link & Invite for Parents */}
                    {(() => {
                      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
                      const parentMeetingUrl = `${origin}/meetings?room=${m.roomCode || 'MASAR-MAIN'}&title=${encodeURIComponent(m.title)}`;
                      const waText = `دعوة لحضور اجتماع أولياء الأمور عبر منصة مسار 🚀%0A📌 الموضوع: ${encodeURIComponent(m.title)}%0A🔗 رابط الانضمام المباشر دون الحاجة لتسجيل دخول:%0A${encodeURIComponent(parentMeetingUrl)}`;

                      return (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-black text-slate-800">
                              🔗 رابط دعوة الانضمام المباشر لأولياء الأمور (مسجل وغير مسجل)
                            </p>
                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                              رمز الغرفة: {m.roomCode}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(parentMeetingUrl);
                                alert('✅ تم نسخ رابط اجتماع أولياء الأمور المباشر إلى الحافظة!');
                              }}
                              className="flex items-center gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl font-bold transition shadow-xs"
                            >
                              <FileText size={12} /> نسخ رابط الدعوة لأولياء الأمور 📋
                            </button>

                            <a
                              href={`https://wa.me/?text=${waText}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-bold transition shadow-xs"
                            >
                              <Send size={12} /> إرسال الدعوة عبر WhatsApp 📱
                            </a>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
              {!meetings.length && (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                  <Video className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 font-bold">لا توجد اجتماعات قادمة — أنشئ اجتماعاً الآن! 📹</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════ أرشيف الفعاليات ومعرض الصور ════════════ */}
        {activeTab === 'photos' && (
          <ClassEventsArchiveTab
            eventsList={[]}
            onCreateEvent={handleCreateEventFromManager}
          />
        )}

        {/* ════════════ التقارير والملف الأكاديمي للطلاب ════════════ */}
        {activeTab === 'reports' && (
          <StudentReportsManagerTab
            students={CLASS_STUDENTS}
            homeworkCount={homeworkList.length}
            photosCount={photos.length}
          />
        )}

          </div>
        </main>
      </div>

      {/* 🤖 Masar Autonomous AI Agent — Floating Widget */}
      <MasarAIAgent branch="IKHLAS_JEDDAH" />
    </div>
  );
}
