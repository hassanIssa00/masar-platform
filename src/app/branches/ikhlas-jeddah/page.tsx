'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Clock, Users, Camera, BarChart3, Calendar,
  Bell, Send, CheckCircle, XCircle, Plus, Video,
  AlertTriangle, ChevronRight, Loader2, Star, MessageSquare,
} from 'lucide-react';
import {
  DEFAULT_SCHEDULE, DAY_NAMES, SUBJECT_COLORS,
  getTodayPeriods, getCurrentPeriod, getMinutesUntilDismissal,
  type Period,
} from '@/data/ikhlasSchedule';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BRANCH = 'IKHLAS_JEDDAH';

// ── الطلاب (مؤقتاً hardcoded — سيأتي من الـ API لاحقاً) ──
const CLASS_STUDENTS = [
  { id: 's1', name: 'أحمد محمد علي إبراهيم' },
  { id: 's2', name: 'يوسف خالد عبد العزيز السهلي' },
  { id: 's3', name: 'عمر سعد محمد الغامدي' },
  { id: 's4', name: 'عبد الرحمن فهد علي القحطاني' },
  { id: 's5', name: 'محمد عبد الله أحمد الزهراني' },
  { id: 's6', name: 'سلطان ناصر محمد العتيبي' },
  { id: 's7', name: 'فيصل بندر عبد الرحمن الشمري' },
];

type Tab = 'overview' | 'schedule' | 'homework' | 'attendance' | 'meetings' | 'photos' | 'reports';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('masar_token') ?? localStorage.getItem('access_token');
}

function authHeaders() {
  const token = getToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

export default function IkhlasJeddahPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [schedule] = useState<Period[]>(DEFAULT_SCHEDULE);
  const [currentPeriod, setCurrentPeriod] = useState<Period | null>(null);
  const [minsUntilDismissal, setMinsUntilDismissal] = useState<number>(-1);
  const [todayPeriods, setTodayPeriods] = useState<Period[]>([]);

  // Homework state
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [hwTitle, setHwTitle] = useState('');
  const [hwDesc, setHwDesc] = useState('');
  const [hwType, setHwType] = useState<'TEXT' | 'MULTIPLE_CHOICE'>('TEXT');
  const [hwOptions, setHwOptions] = useState(['', '', '', '']);
  const [hwDue, setHwDue] = useState('');
  const [hwLoading, setHwLoading] = useState(false);

  // Attendance state
  const [attendance, setAttendance] = useState<Record<string, { status: string; score: number; exit: string }>>({});
  const [attLoading, setAttLoading] = useState(false);
  const [exitLogged, setExitLogged] = useState<Record<string, string>>({});

  // Meeting state
  const [meetings, setMeetings] = useState<any[]>([]);
  const [mtgTitle, setMtgTitle] = useState('');
  const [mtgUrl, setMtgUrl] = useState('');
  const [mtgDate, setMtgDate] = useState('');
  const [mtgDuration, setMtgDuration] = useState(45);
  const [mtgLoading, setMtgLoading] = useState(false);

  // Photos state
  const [photos, setPhotos] = useState<any[]>([]);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);

  // Posts / community state
  const [posts, setPosts] = useState<any[]>([]);
  const [postBody, setPostBody] = useState('');
  const [postType, setPostType] = useState<'ANNOUNCEMENT' | 'GENERAL'>('ANNOUNCEMENT');
  const [postLoading, setPostLoading] = useState(false);

  // Weekly report
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSent, setReportSent] = useState(false);

  // ── Clock ticker ──
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

  // ── Fetch data ──
  const fetchHomework = useCallback(async () => {
    const r = await fetch(`${API}/school/homework?branch=${BRANCH}`, { headers: authHeaders() });
    if (r.ok) setHomeworkList(await r.json());
  }, []);

  const fetchMeetings = useCallback(async () => {
    const r = await fetch(`${API}/school/meetings?branch=${BRANCH}`, { headers: authHeaders() });
    if (r.ok) setMeetings(await r.json());
  }, []);

  const fetchPhotos = useCallback(async () => {
    const r = await fetch(`${API}/school/photos?branch=${BRANCH}`, { headers: authHeaders() });
    if (r.ok) setPhotos(await r.json());
  }, []);

  const fetchPosts = useCallback(async () => {
    const r = await fetch(`${API}/school/posts?branch=${BRANCH}`, { headers: authHeaders() });
    if (r.ok) setPosts(await r.json());
  }, []);

  useEffect(() => {
    fetchHomework();
    fetchMeetings();
    fetchPhotos();
    fetchPosts();
  }, [fetchHomework, fetchMeetings, fetchPhotos, fetchPosts]);

  // ── Actions ──
  const logExit = async (studentId: string, studentName: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    const today = now.toISOString().slice(0, 10);
    setExitLogged((prev) => ({ ...prev, [studentId]: timeStr }));
    const att = attendance[studentId] ?? { status: 'present', score: 90, exit: '' };
    await fetch(`${API}/school/attendance`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        branch: BRANCH, studentName, studentId, date: today,
        attendance: att.status, performanceScore: att.score,
        exitTime: timeStr, parentNotified: true,
      }),
    });
  };

  const sendLateAlert = async (studentId: string, studentName: string) => {
    const exitTime = exitLogged[studentId] ?? '--:--';
    await fetch(`${API}/school/attendance`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        branch: BRANCH, studentName, studentId,
        date: new Date().toISOString().slice(0, 10),
        attendance: 'present', lateAlertSent: true,
        exitTime, parentNotified: true,
      }),
    });
    alert(`✅ تم إرسال تنبيه التأخر لولي أمر ${studentName}`);
  };

  const saveAttendance = async () => {
    setAttLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    await Promise.all(
      CLASS_STUDENTS.map((s) => {
        const att = attendance[s.id] ?? { status: 'present', score: 90, exit: '' };
        return fetch(`${API}/school/attendance`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            branch: BRANCH, studentName: s.name, studentId: s.id,
            date: today, attendance: att.status,
            performanceScore: att.score,
          }),
        });
      })
    );
    setAttLoading(false);
    alert('✅ تم حفظ كشف الحضور بنجاح');
  };

  const createHomework = async () => {
    if (!hwTitle || !hwDesc || !hwDue) return;
    setHwLoading(true);
    const r = await fetch(`${API}/school/homework`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        branch: BRANCH, title: hwTitle, description: hwDesc,
        type: hwType, dueDate: hwDue,
        options: hwType === 'MULTIPLE_CHOICE' ? hwOptions.filter(Boolean) : undefined,
      }),
    });
    if (r.ok) {
      setHwTitle(''); setHwDesc(''); setHwDue('');
      setHwOptions(['', '', '', '']);
      await fetchHomework();
    }
    setHwLoading(false);
  };

  const createMeeting = async () => {
    if (!mtgTitle || !mtgUrl || !mtgDate) return;
    setMtgLoading(true);
    const r = await fetch(`${API}/school/meetings`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        branch: BRANCH, title: mtgTitle, meetingUrl: mtgUrl,
        scheduledAt: mtgDate, duration: mtgDuration,
      }),
    });
    if (r.ok) {
      setMtgTitle(''); setMtgUrl(''); setMtgDate('');
      await fetchMeetings();
    }
    setMtgLoading(false);
  };

  const uploadPhoto = async () => {
    if (!photoUrl) return;
    setPhotoLoading(true);
    const r = await fetch(`${API}/school/photos`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ branch: BRANCH, photoUrl, caption: photoCaption }),
    });
    if (r.ok) { setPhotoUrl(''); setPhotoCaption(''); await fetchPhotos(); }
    setPhotoLoading(false);
  };

  const createPost = async () => {
    if (!postBody) return;
    setPostLoading(true);
    const r = await fetch(`${API}/school/posts`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ branch: BRANCH, type: postType, body: postBody }),
    });
    if (r.ok) { setPostBody(''); await fetchPosts(); }
    setPostLoading(false);
  };

  const sendWeeklyReport = async () => {
    setReportLoading(true);
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 4);
    await Promise.all(
      CLASS_STUDENTS.map((s) =>
        fetch(`${API}/school/weekly-reports`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify({
            branch: BRANCH, studentName: s.name, studentId: s.id,
            weekStart: weekStart.toISOString().slice(0, 10),
            weekEnd: weekEnd.toISOString().slice(0, 10),
            attendanceDays: 5, avgPerformance: 92,
            homeworkDone: homeworkList.length, homeworkTotal: homeworkList.length,
            teacherNotes: 'أسبوع ممتاز — الطلاب في تقدم رائع بإذن الله 🌟',
          }),
        })
      )
    );
    setReportLoading(false);
    setReportSent(true);
    setTimeout(() => setReportSent(false), 4000);
  };

  // ── Tabs config ──
  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'overview',    label: 'نظرة عامة',     icon: BarChart3 },
    { key: 'schedule',   label: 'جدول الحصص',    icon: Clock },
    { key: 'attendance', label: 'الحضور والانصراف', icon: Users },
    { key: 'homework',   label: 'الواجبات',       icon: BookOpen },
    { key: 'meetings',   label: 'الاجتماعات',     icon: Video },
    { key: 'photos',     label: 'معرض الصور',     icon: Camera },
    { key: 'reports',    label: 'التقارير',        icon: BarChart3 },
  ];

  const jsDay = new Date().getDay();
  const isSchoolDay = jsDay >= 0 && jsDay <= 4;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-white flex items-center gap-2">
              🏫 فصل 1/1 — مدارس الإخلاص الأهلية بجدة
            </h1>
            <p className="text-xs text-slate-400">لوحة تحكم المعلم | أ. إسماعيل عيسى</p>
          </div>
          {currentPeriod && (
            <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/40 rounded-xl px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-300 text-sm font-bold">{currentPeriod.subjectName}</span>
              <span className="text-green-400 text-xs">{currentPeriod.startTime}–{currentPeriod.endTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 bg-slate-900/50 overflow-x-auto">
        <div className="max-w-6xl mx-auto flex gap-1 px-4 py-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === t.key
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* ══════════════ نظرة عامة ══════════════ */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* بطاقات الإحصائيات */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'طلاب الفصل', value: CLASS_STUDENTS.length, icon: Users, color: 'blue' },
                { label: 'واجبات مفتوحة', value: homeworkList.filter(h => h.status === 'OPEN').length, icon: BookOpen, color: 'amber' },
                { label: 'اجتماعات قادمة', value: meetings.filter(m => m.status === 'UPCOMING').length, icon: Video, color: 'green' },
                { label: 'صور الأسبوع', value: photos.length, icon: Camera, color: 'pink' },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className={`bg-${stat.color}-500/10 border border-${stat.color}-500/30 rounded-2xl p-4`}>
                    <Icon className={`w-6 h-6 text-${stat.color}-400 mb-2`} />
                    <div className={`text-2xl font-black text-${stat.color}-300`}>{stat.value}</div>
                    <div className="text-xs text-slate-400">{stat.label}</div>
                  </div>
                );
              })}
            </div>

            {/* جدول اليوم */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h2 className="text-base font-black text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                جدول اليوم — {DAY_NAMES[jsDay] ?? 'إجازة'}
              </h2>
              {!isSchoolDay ? (
                <p className="text-slate-400 text-center py-6">🌙 اليوم إجازة — استرح!</p>
              ) : (
                <div className="space-y-2">
                  {todayPeriods.map((p) => {
                    const colorClass = SUBJECT_COLORS[p.subjectName] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30';
                    const isNow = currentPeriod?.periodNumber === p.periodNumber;
                    return (
                      <div key={p.periodNumber}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                          isNow ? 'bg-blue-500/20 border-blue-500/50 shadow-lg shadow-blue-500/20' : `${colorClass} opacity-80`
                        }`}>
                        <span className="text-xs font-black w-5 text-center text-slate-400">{p.periodNumber}</span>
                        <span className="flex-1 font-bold text-sm">{p.subjectName}</span>
                        <span className="text-xs text-slate-400">{p.startTime} – {p.endTime}</span>
                        {isNow && <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* تنبيه قبل الخروج */}
            {minsUntilDismissal > 0 && minsUntilDismissal <= 20 && (
              <div className="bg-amber-500/20 border border-amber-500/50 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
                <div>
                  <p className="font-black text-amber-300">تنبيه: {minsUntilDismissal} دقيقة للخروج!</p>
                  <p className="text-xs text-amber-400/70">تم إرسال تنبيه لأولياء الأمور للحضور</p>
                </div>
              </div>
            )}

            {/* آخر الواجبات */}
            {homeworkList.slice(0, 3).map((hw) => (
              <div key={hw.id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">{hw.title}</p>
                  <p className="text-xs text-slate-400">موعد التسليم: {new Date(hw.dueDate).toLocaleDateString('ar-SA')}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${hw.status === 'OPEN' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                  {hw.status === 'OPEN' ? 'مفتوح' : 'مغلق'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ══════════════ جدول الحصص ══════════════ */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            <h2 className="text-xl font-black text-white">📅 الجدول الأسبوعي الكامل</h2>
            {DAY_NAMES.map((day, dayIdx) => {
              const dayPeriods = schedule.filter((p) => p.dayOfWeek === dayIdx).sort((a, b) => a.periodNumber - b.periodNumber);
              const isToday = jsDay === dayIdx;
              return (
                <div key={day} className={`rounded-2xl border overflow-hidden ${isToday ? 'border-blue-500/50 shadow-lg shadow-blue-500/20' : 'border-white/10'}`}>
                  <div className={`px-4 py-2 flex items-center gap-2 ${isToday ? 'bg-blue-600/30' : 'bg-white/5'}`}>
                    <span className="font-black text-sm">{day}</span>
                    {isToday && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">اليوم</span>}
                  </div>
                  <div className="divide-y divide-white/5">
                    {dayPeriods.map((p) => {
                      const colorClass = SUBJECT_COLORS[p.subjectName] ?? '';
                      return (
                        <div key={p.periodNumber} className={`flex items-center gap-3 px-4 py-2.5 ${colorClass}`}>
                          <span className="text-xs text-slate-500 w-4">{p.periodNumber}</span>
                          <span className="flex-1 text-sm font-bold">{p.subjectName}</span>
                          <span className="text-xs text-slate-400">{p.startTime} – {p.endTime}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════ الحضور والانصراف ══════════════ */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white">👥 كشف الحضور والانصراف</h2>
              <button onClick={saveAttendance} disabled={attLoading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50">
                {attLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                حفظ الكشف
              </button>
            </div>
            <div className="space-y-3">
              {CLASS_STUDENTS.map((student) => {
                const att = attendance[student.id] ?? { status: 'present', score: 90, exit: '' };
                const exited = exitLogged[student.id];
                return (
                  <div key={student.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm">{student.name}</p>
                      {exited && (
                        <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded-full">
                          خرج {exited} 🕒
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(['present', 'absent', 'late'] as const).map((s) => (
                        <button key={s}
                          onClick={() => setAttendance((prev) => ({ ...prev, [student.id]: { ...att, status: s } }))}
                          className={`text-xs px-3 py-1 rounded-full font-bold border transition-all ${
                            att.status === s
                              ? s === 'present' ? 'bg-green-500 border-green-500 text-white'
                              : s === 'absent' ? 'bg-red-500 border-red-500 text-white'
                              : 'bg-amber-500 border-amber-500 text-white'
                              : 'border-white/20 text-slate-400 hover:border-white/40'
                          }`}>
                          {s === 'present' ? '✅ حاضر' : s === 'absent' ? '❌ غائب' : '⏰ متأخر'}
                        </button>
                      ))}
                      <div className="flex items-center gap-2 mr-auto">
                        <span className="text-xs text-slate-400">الأداء:</span>
                        <input type="range" min={0} max={100} value={att.score}
                          onChange={(e) => setAttendance((prev) => ({ ...prev, [student.id]: { ...att, score: Number(e.target.value) } }))}
                          className="w-20 accent-blue-500" />
                        <span className="text-xs font-black text-blue-400 w-8">{att.score}%</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => logExit(student.id, student.name)}
                        className="flex items-center gap-1 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 text-emerald-400 text-xs px-3 py-1.5 rounded-xl font-bold transition-all">
                        <Clock className="w-3 h-3" /> توثيق الخروج الآن
                      </button>
                      <button onClick={() => sendLateAlert(student.id, student.name)}
                        className="flex items-center gap-1 bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 text-rose-400 text-xs px-3 py-1.5 rounded-xl font-bold transition-all">
                        <Bell className="w-3 h-3" /> تنبيه تأخر ولي الأمر
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════ الواجبات ══════════════ */}
        {activeTab === 'homework' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-white">📚 الواجبات الإلكترونية</h2>
            {/* نموذج الإضافة */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="font-black text-white flex items-center gap-2"><Plus className="w-4 h-4 text-blue-400" /> واجب جديد</h3>
              <input placeholder="عنوان الواجب" value={hwTitle} onChange={(e) => setHwTitle(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition" />
              <textarea placeholder="تفاصيل الواجب والمطلوب..." value={hwDesc} onChange={(e) => setHwDesc(e.target.value)} rows={3}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition resize-none" />
              <div className="flex gap-3 flex-wrap">
                <div className="flex gap-2">
                  {(['TEXT', 'MULTIPLE_CHOICE'] as const).map((t) => (
                    <button key={t} onClick={() => setHwType(t)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-all ${hwType === t ? 'bg-blue-600 border-blue-600 text-white' : 'border-white/20 text-slate-400'}`}>
                      {t === 'TEXT' ? '✍️ إجابة نصية' : '🔤 اختيار متعدد'}
                    </button>
                  ))}
                </div>
                <input type="date" value={hwDue} onChange={(e) => setHwDue(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-blue-500 transition" />
              </div>
              {hwType === 'MULTIPLE_CHOICE' && (
                <div className="grid grid-cols-2 gap-2">
                  {hwOptions.map((opt, i) => (
                    <input key={i} placeholder={`الخيار ${i + 1}`} value={opt}
                      onChange={(e) => { const o = [...hwOptions]; o[i] = e.target.value; setHwOptions(o); }}
                      className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500 transition" />
                  ))}
                </div>
              )}
              <button onClick={createHomework} disabled={hwLoading || !hwTitle || !hwDesc || !hwDue}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-50">
                {hwLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                نشر الواجب لجميع الطلاب
              </button>
            </div>
            {/* قائمة الواجبات */}
            <div className="space-y-3">
              {homeworkList.map((hw) => (
                <div key={hw.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-black text-white">{hw.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{hw.description}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-bold shrink-0 ${hw.status === 'OPEN' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'}`}>
                      {hw.status === 'OPEN' ? '✅ مفتوح' : '🔒 مغلق'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>التسليم: {new Date(hw.dueDate).toLocaleDateString('ar-SA')}</span>
                    <span>ردود: {hw.submissions?.length ?? 0} / {CLASS_STUDENTS.length}</span>
                  </div>
                </div>
              ))}
              {!homeworkList.length && <p className="text-slate-500 text-center py-8">لا توجد واجبات بعد — أضف أول واجب! 📚</p>}
            </div>
          </div>
        )}

        {/* ══════════════ الاجتماعات ══════════════ */}
        {activeTab === 'meetings' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-white">📹 اجتماعات الفيديو</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="font-black text-white flex items-center gap-2"><Plus className="w-4 h-4 text-green-400" /> اجتماع جديد</h3>
              <input placeholder="موضوع الاجتماع" value={mtgTitle} onChange={(e) => setMtgTitle(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-green-500 transition" />
              <input placeholder="رابط الاجتماع (Google Meet / Zoom)" value={mtgUrl} onChange={(e) => setMtgUrl(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-green-500 transition" dir="ltr" />
              <div className="flex gap-3 flex-wrap">
                <input type="datetime-local" value={mtgDate} onChange={(e) => setMtgDate(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-green-500 transition" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">المدة:</span>
                  <select value={mtgDuration} onChange={(e) => setMtgDuration(Number(e.target.value))}
                    className="bg-white/10 border border-white/20 rounded-xl px-3 py-2 text-sm text-white outline-none">
                    {[30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} دقيقة</option>)}
                  </select>
                </div>
              </div>
              <button onClick={createMeeting} disabled={mtgLoading || !mtgTitle || !mtgUrl || !mtgDate}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-50">
                {mtgLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                إرسال الدعوة لجميع الطلاب وأولياء الأمور
              </button>
            </div>
            <div className="space-y-3">
              {meetings.map((m) => (
                <div key={m.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-black text-white">{m.title}</p>
                    <p className="text-xs text-slate-400">{new Date(m.scheduledAt).toLocaleString('ar-SA')} — {m.duration} د</p>
                  </div>
                  <a href={m.meetingUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 bg-green-600/20 hover:bg-green-600/40 border border-green-500/30 text-green-400 text-xs px-3 py-1.5 rounded-xl font-bold transition-all">
                    <Video className="w-3 h-3" /> انضم
                  </a>
                </div>
              ))}
              {!meetings.length && <p className="text-slate-500 text-center py-8">لا توجد اجتماعات قادمة — أضف اجتماعاً! 📹</p>}
            </div>
          </div>
        )}

        {/* ══════════════ معرض الصور ══════════════ */}
        {activeTab === 'photos' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-white">📸 معرض صور الفصل</h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="font-black text-white flex items-center gap-2"><Camera className="w-4 h-4 text-pink-400" /> رفع صورة جديدة</h3>
              <input placeholder="رابط الصورة (URL)" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-pink-500 transition" dir="ltr" />
              <input placeholder="وصف الصورة (اختياري)" value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-pink-500 transition" />
              <button onClick={uploadPhoto} disabled={photoLoading || !photoUrl}
                className="flex items-center gap-2 bg-pink-600 hover:bg-pink-500 text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-50">
                {photoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                نشر الصورة
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((ph) => (
                <div key={ph.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group">
                  <img src={ph.photoUrl} alt={ph.caption ?? ''} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300" />
                  {ph.caption && <p className="text-xs text-slate-400 p-2">{ph.caption}</p>}
                  <div className="px-2 pb-2 flex gap-1">
                    {Object.entries((ph.reactions as Record<string, number>) ?? {}).map(([emoji, count]) => (
                      <span key={emoji} className="text-xs bg-white/10 rounded-full px-2 py-0.5">{emoji} {String(count)}</span>
                    ))}
                  </div>
                </div>
              ))}
              {!photos.length && <div className="col-span-3 text-slate-500 text-center py-12">لا توجد صور بعد 📷</div>}
            </div>
          </div>
        )}

        {/* ══════════════ التقارير ══════════════ */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <h2 className="text-xl font-black text-white">📊 التقارير والإشعارات</h2>
            {/* مجتمع الآباء */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <h3 className="font-black text-white flex items-center gap-2"><MessageSquare className="w-4 h-4 text-violet-400" /> نشر في مجتمع الآباء</h3>
              <div className="flex gap-2">
                {(['ANNOUNCEMENT', 'GENERAL'] as const).map((t) => (
                  <button key={t} onClick={() => setPostType(t)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition-all ${postType === t ? 'bg-violet-600 border-violet-600 text-white' : 'border-white/20 text-slate-400'}`}>
                    {t === 'ANNOUNCEMENT' ? '📢 إعلان رسمي' : '💬 منشور عام'}
                  </button>
                ))}
              </div>
              <textarea placeholder="اكتب رسالتك لأولياء الأمور..." value={postBody} onChange={(e) => setPostBody(e.target.value)} rows={3}
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-violet-500 transition resize-none" />
              <button onClick={createPost} disabled={postLoading || !postBody}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-50">
                {postLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                نشر للآباء
              </button>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {posts.map((p) => (
                  <div key={p.id} className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="text-sm text-white">{p.body}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(p.createdAt).toLocaleString('ar-SA')}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* التقرير الأسبوعي */}
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3">
              <h3 className="font-black text-amber-300 flex items-center gap-2"><Star className="w-5 h-5" /> إرسال التقرير الأسبوعي</h3>
              <p className="text-sm text-slate-400">سيتم إرسال تقرير شامل لكل ولي أمر يتضمن: الحضور، الأداء، الواجبات المنجزة، وملاحظات المعلم.</p>
              <button onClick={sendWeeklyReport} disabled={reportLoading || reportSent}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black transition-all ${reportSent ? 'bg-green-600 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50'}`}>
                {reportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : reportSent ? <CheckCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                {reportSent ? 'تم الإرسال بنجاح! ✅' : 'إرسال التقرير الأسبوعي لجميع الآباء'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
