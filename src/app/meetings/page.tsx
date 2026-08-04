'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Video, VideoOff, Mic, MicOff, Monitor, PhoneOff, Copy,
  Trash2, CalendarClock, PenTool, Radio, User,
  ShieldCheck, AlertTriangle, Users, Eraser, RotateCcw,
  VolumeX, UserX, MessageSquare, Plus, Sparkles, LogIn, ArrowRight,
  Smartphone
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { getSession, getStudents, StudentRecord } from '@/lib/localDb';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot, collection, addDoc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { trackEvent } from '@/lib/analyticsTracker';

/* ═══════════════ TYPES ═══════════════ */
type MeetingRecord = {
  id: string;
  roomCode: string;
  hostToken: string;
  title: string;
  targetName: string;
  date: string;
  time: string;
  type: 'internal' | 'zoom';
  zoomUrl?: string;
  notes: string;
  createdAt: number;
};

type ParticipantInfo = {
  id: string;
  name: string;
  role: 'host' | 'guest';
  joinedAt: number;
  kicked?: boolean;
  forceMuted?: boolean;
  forceVideoOff?: boolean;
  micOn?: boolean;
  videoOn?: boolean;
};

/* ═══════════════ LOCAL STORAGE HELPERS ═══════════════ */
const LS_KEY = 'masar.rooms.v3';

function readMeetings(): MeetingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || '[]') as MeetingRecord[];
    return raw.filter((m) => !m.id?.startsWith('meeting_demo'));
  } catch { return []; }
}
function writeMeetings(m: MeetingRecord[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(m));
}

/* ═══════════════ WEBRTC CONFIG ═══════════════ */
const RTC: RTCConfiguration = {
  iceServers: [
    { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] },
  ],
};

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ═══════════════ PAGE ENTRY ═══════════════ */
export default function MeetingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 grid place-items-center">
        <div className="h-10 w-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MeetingsContent />
    </Suspense>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT — decides: Management, Guest Join, or Studio
═══════════════════════════════════════════════════════════ */
function MeetingsContent() {
  const sp          = useSearchParams();
  const roomParam   = sp.get('room');   // ?room=MASAR-ROOM-xxxx
  const tokenParam  = sp.get('t');      // ?t=<hostToken>  (doctor only)

  const [ready,         setReady]         = useState(false);
  const [sessionUser,   setSessionUser]   = useState<{ name: string; role: string } | null>(null);
  const [isHost,        setIsHost]        = useState(false);
  const [meetings,      setMeetings]      = useState<MeetingRecord[]>([]);
  const [students,      setStudents]      = useState<StudentRecord[]>([]);
  const [inCall,        setInCall]        = useState<{ roomCode: string; title: string; participantName: string } | null>(null);
  const [guestNameInput, setGuestNameInput] = useState('');
  const [guestJoining,  setGuestJoining]  = useState(false);
  const [roomTitle,     setRoomTitle]     = useState('جلسة تفاعلية مباشرة');
  const [copyMsg,       setCopyMsg]       = useState('');
  const [origin,        setOrigin]        = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    targetName: '',
    title: 'جلسة تأهيل ومتابعة مباشرة',
    date: new Date().toISOString().slice(0, 10),
    time: '10:00',
    type: 'internal' as 'internal' | 'zoom',
    zoomUrl: '',
    notes: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);

    const session = getSession();
    if (session) {
      setSessionUser({ name: session.name || 'مستخدم مسار', role: session.role });
      trackEvent('visit', { userId: session.id, userName: session.name, userRole: session.role, page: '/meetings' });
    } else {
      setSessionUser(null);
    }
    setMeetings(readMeetings());
    setStudents(getStudents());

    if (roomParam) {
      getDoc(doc(db, 'masar_rooms', roomParam))
        .then((snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data?.title) setRoomTitle(data.title);
            if (tokenParam && data?.hostToken === tokenParam) {
              setIsHost(true);
              setInCall({
                roomCode: roomParam,
                title: data?.title || 'جلسة مباشرة',
                participantName: session?.name || 'د. إسماعيل عيسى (المضيف)',
              });
            }
          }
        })
        .catch(() => {})
        .finally(() => setReady(true));

      if (session && !tokenParam) {
        setIsHost(false);
        setInCall({
          roomCode: roomParam,
          title: roomTitle,
          participantName: session.name || 'طالب مسار',
        });
      }
    } else {
      setReady(true);
    }
  }, [roomParam, tokenParam]);

  const flash = (msg: string) => {
    setCopyMsg(msg);
    setTimeout(() => setCopyMsg(''), 4000);
  };

  const createMeeting = () => {
    if (!form.title) return;
    const roomCode  = `MASAR-${makeId().slice(0, 8).toUpperCase()}`;
    const hostToken = makeId();

    setDoc(doc(db, 'masar_rooms', roomCode), {
      hostToken,
      title: form.title,
      targetName: form.targetName || 'جلسة مباشرة',
      createdAt: Date.now(),
    }).catch(() => {});

    const meeting: MeetingRecord = {
      id: `mtg_${Date.now()}`,
      roomCode,
      hostToken,
      title: form.title,
      targetName: form.targetName || 'جلسة مباشرة',
      date: form.date,
      time: form.time,
      type: form.type,
      zoomUrl: form.zoomUrl || undefined,
      notes: form.notes,
      createdAt: Date.now(),
    };

    const updated = [meeting, ...meetings];
    writeMeetings(updated);
    setMeetings(updated);
    setForm((f) => ({ ...f, zoomUrl: '', notes: '', targetName: '' }));
    flash('✅ تم إنشاء الجلسة بنجاح!');
  };

  const deleteMeeting = (id: string) => {
    const updated = meetings.filter((m) => m.id !== id);
    writeMeetings(updated);
    setMeetings(updated);
    setConfirmDeleteId(null);
    flash('تم حذف الجلسة.');
  };

  const copyGuestLink = async (m: MeetingRecord) => {
    const guestLink = `${origin}/meetings?room=${m.roomCode}`;
    const text = [
      `🎥 ${m.title}`,
      `الموعد: ${m.date} الساعة ${m.time}`,
      m.targetName ? `المستهدف: ${m.targetName}` : '',
      ``,
      `رابط الانضمام للجلسة:`,
      guestLink,
    ].filter(Boolean).join('\n');
    await navigator.clipboard.writeText(text);
    flash('✅ تم نسخ رابط الضيف! أرسله للطلاب وأولياء الأمور.');
  };

  const openAsHost = (m: MeetingRecord) => {
    setIsHost(true);
    setInCall({
      roomCode: m.roomCode,
      title: m.title,
      participantName: sessionUser?.name || 'د. إسماعيل عيسى (المضيف)',
    });
  };

  const startInstant = () => {
    const roomCode  = `MASAR-LIVE-${makeId().slice(0, 6).toUpperCase()}`;
    const hostToken = makeId();
    setDoc(doc(db, 'masar_rooms', roomCode), {
      hostToken,
      title: 'جلسة فورية مباشرة',
      targetName: 'جميع الحضور',
      createdAt: Date.now(),
    }).catch(() => {});

    const meeting: MeetingRecord = {
      id: `mtg_${Date.now()}`,
      roomCode,
      hostToken,
      title: 'جلسة فورية مباشرة',
      targetName: 'جميع الحضور',
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      type: 'internal',
      notes: '',
      createdAt: Date.now(),
    };
    const updated = [meeting, ...meetings];
    writeMeetings(updated);
    setMeetings(updated);
    setIsHost(true);
    setInCall({
      roomCode,
      title: meeting.title,
      participantName: sessionUser?.name || 'د. إسماعيل عيسى (المضيف)',
    });
  };

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestNameInput.trim() || !roomParam) return;
    setGuestJoining(true);
    setIsHost(false);
    setInCall({
      roomCode: roomParam,
      title: roomTitle,
      participantName: guestNameInput.trim(),
    });
  };

  if (!ready) return null;

  /* ═══════════════════════════════════════════════════════════
     1. IN CALL STUDIO (Active Call for Host or Guest/Student)
  ═══════════════════════════════════════════════════════════ */
  if (inCall) {
    return (
      <CallStudio
        roomCode={inCall.roomCode}
        title={inCall.title}
        participantName={inCall.participantName}
        isHost={isHost}
        isMasarUser={!!sessionUser}
        guestLink={`${origin}/meetings?room=${inCall.roomCode}`}
        onLeave={() => { setInCall(null); setIsHost(false); }}
      />
    );
  }

  /* ═══════════════════════════════════════════════════════════
     2. GUEST JOIN LANDING PAGE (White / Light Theme)
  ═══════════════════════════════════════════════════════════ */
  if (roomParam && !sessionUser && !tokenParam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/40 to-slate-100 text-slate-900 flex flex-col items-center justify-center p-3 sm:p-6 relative overflow-hidden font-sans" dir="rtl">

        {/* Ambient Glows */}
        <div className="absolute top-10 right-10 w-72 h-72 sm:w-96 sm:h-96 bg-teal-200/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-10 left-10 w-72 h-72 sm:w-96 sm:h-96 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />

        {/* Guest Join Card */}
        <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-teal-50 border border-teal-200 grid place-items-center shadow-sm shrink-0">
                <Video size={24} className="text-teal-600" />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-teal-700 uppercase">منصة مسار الطبية</span>
                <h1 className="text-base sm:text-lg font-black text-slate-950">غرفة الجلسات المباشرة</h1>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> متاح الآن
            </span>
          </div>

          {/* Meeting Title Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-1.5">
            <p className="text-[11px] font-bold text-slate-500">جلسة علاجيّة مباشرة:</p>
            <h2 className="text-sm sm:text-base font-black text-slate-900 leading-snug">{roomTitle}</h2>
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 text-xs font-bold text-teal-700">
              <User size={15} className="text-teal-600 shrink-0" /> د. إسماعيل عيسى (استشاري التخاطب)
            </div>
          </div>

          {/* Guest Name Form */}
          <form onSubmit={handleGuestSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1.5">
                أدخل اسمك الكامل للانضمام للجلسة:
              </label>

              <div className="relative">
                <input
                  type="text"
                  required
                  value={guestNameInput}
                  onChange={(e) => setGuestNameInput(e.target.value)}
                  placeholder="مثال: أحمد المحمد"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-2xl px-4 py-3.5 text-base sm:text-sm font-bold text-slate-900 placeholder-slate-400 outline-none transition shadow-sm"
                />
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Privacy notice */}
            <div className="flex items-start gap-2 bg-teal-50 border border-teal-200 rounded-xl p-3 text-[11px] font-bold text-teal-800 leading-relaxed">
              <ShieldCheck size={16} className="text-teal-600 shrink-0 mt-0.5" />
              <span>تنبيه: المايك والكاميرا مقفولان تلقائياً عند دخولك لحفظ خصوصيتك، ويمكنك تشغيلهما في أي وقت بلمسة زر.</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={guestJoining}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-black py-3.5 sm:py-4 rounded-2xl transition shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 text-sm sm:text-base active:scale-[0.98]"
            >
              {guestJoining ? (
                <span>جاري الانضمام...</span>
              ) : (
                <>
                  <span>الانضمام للجلسة الآن</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Mobile indicator */}
          <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-400 pt-1">
            <Smartphone size={12} className="text-teal-600" />
            <span>متوافق مع جميع الهواتف الذكية والأجهزة</span>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     3. GUEST WITH NO ROOM PARAM & NOT DOCTOR
  ═══════════════════════════════════════════════════════════ */
  if (sessionUser?.role !== 'doctor') {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-950" dir="rtl">
        <Navbar />
        <div className="flex">
          <Sidebar desktopOnly />
          <main className="min-w-0 flex-1 px-4 py-12 lg:px-8">
            <div className="max-w-md mx-auto text-center p-8 rounded-3xl bg-white shadow-xl border border-slate-200">
              <div className="h-16 w-16 rounded-2xl bg-teal-50 border border-teal-200 grid place-items-center mx-auto mb-4 text-teal-600">
                <Video size={32} />
              </div>
              <h1 className="text-xl font-black text-slate-900">منصة مسار الجلسات المباشرة</h1>
              <p className="text-xs font-bold text-slate-500 mt-2 leading-relaxed">
                للانضمام إلى أية جلسة علاجية مباشرة، يرجى الضغط على الرابط الخاص بالجلسة المُنظّمة لك من قِبل الدكتور إسماعيل عيسى.
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════
     4. DOCTOR MANAGEMENT PANEL (Original Masar Platform Style)
  ═══════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">

          {/* Header */}
          <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black text-teal-700 uppercase tracking-widest">نظام الجلسات المباشرة</p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-950">لوحة إدارة الاجتماعات</h1>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  أنشئ جلساتك، اضغط «بدء كالمضيف»، ثم انسخ رابط الضيف وأرسله للطلاب وأولياء الأمور.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 self-start">
                <button onClick={startInstant}
                  className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white hover:bg-teal-700 transition shadow-sm active:scale-95">
                  <Video size={16} /> 🚀 بدء بث فوري الآن
                </button>
                <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 border border-teal-200 px-3.5 py-1.5 text-xs font-black text-teal-800">
                  <Radio size={14} className="animate-pulse text-teal-500" /> د. إسماعيل عيسى (المضيف)
                </span>
              </div>
            </div>
          </header>

          {copyMsg && (
            <div className="mb-4 rounded-xl bg-teal-50 border border-teal-200 p-3 text-xs font-black text-teal-800">
              {copyMsg}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">

            {/* Schedule Form */}
            <aside className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4 xl:sticky xl:top-24 xl:self-start">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700"><Plus size={20} /></span>
                <div>
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">إنشاء جلسة جديدة</p>
                  <h2 className="text-base font-black text-slate-950">بيانات الجلسة</h2>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-black text-slate-700">المستهدف (اسم الطالب أو الفئة)</span>
                  <select value={form.targetName} onChange={(e) => setForm({ ...form, targetName: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-black text-slate-900 outline-none focus:border-teal-600">
                    <option value="">اختر...</option>
                    {students.map((s) => <option key={s.id} value={s.fullName}>{s.fullName} ({s.grade})</option>)}
                    <option value="جميع الطلاب">جميع الطلاب</option>
                    <option value="أولياء الأمور">أولياء الأمور</option>
                    <option value="جلسة تشاورية">جلسة تشاورية</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-black text-slate-700">نوع الجلسة</span>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'internal' | 'zoom' })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-black text-slate-900 outline-none focus:border-teal-600">
                    <option value="internal">🎥 غرفة المنصة المباشرة</option>
                    <option value="zoom">🔗 رابط Zoom خارجي</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-black text-slate-700">عنوان الجلسة</span>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600" />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-black text-slate-700">التاريخ</span>
                    <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-black text-slate-700">الوقت</span>
                    <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600" />
                  </label>
                </div>

                {form.type === 'zoom' && (
                  <label className="block">
                    <span className="mb-1 block text-xs font-black text-slate-700">رابط Zoom</span>
                    <input type="url" value={form.zoomUrl} onChange={(e) => setForm({ ...form, zoomUrl: e.target.value })}
                      placeholder="https://zoom.us/j/..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600" />
                  </label>
                )}

                <label className="block">
                  <span className="mb-1 block text-xs font-black text-slate-700">ملاحظات</span>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    rows={2}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600 resize-none" />
                </label>

                <button onClick={createMeeting}
                  className="w-full rounded-xl bg-teal-600 py-3 text-xs font-black text-white hover:bg-teal-700 transition shadow-md shadow-teal-600/20 active:scale-95">
                  ✅ إنشاء الجلسة واعتمادها
                </button>
              </div>
            </aside>

            {/* Meetings List */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <CalendarClock size={22} className="text-teal-600" />
                <h2 className="text-lg font-black text-slate-950">الجلسات المجدولة</h2>
              </div>

              {meetings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12 text-center">
                  <Video size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-black text-slate-400">لا توجد جلسات بعد. أنشئ أول جلسة من النموذج.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {meetings.map((m) => (
                    <article key={m.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-teal-300 hover:bg-white transition">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="rounded-full bg-teal-100 border border-teal-200 px-2.5 py-0.5 text-[10px] font-black text-teal-800">
                              {m.type === 'internal' ? '🎥 غرفة المنصة' : '🔗 Zoom'}
                            </span>
                            <code className="text-[10px] font-black text-slate-400">{m.roomCode}</code>
                          </div>
                          <h3 className="text-sm font-black text-slate-950">{m.title}</h3>
                          <p className="text-xs font-bold text-slate-500">
                            {m.targetName && <span>المستهدف: <span className="text-slate-800">{m.targetName}</span> · </span>}
                            {m.date} — {m.time}
                          </p>
                          {m.notes && <p className="text-xs font-bold text-slate-400">ملاحظة: {m.notes}</p>}

                          {m.type === 'internal' && origin && (
                            <div className="mt-2 rounded-xl bg-slate-100 border border-slate-200 p-2.5">
                              <p className="text-[10px] font-black text-slate-500 mb-0.5">رابط الضيف (للطلاب / أولياء الأمور):</p>
                              <p className="text-[10px] font-bold text-teal-700 break-all">{origin}/meetings?room={m.roomCode}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 shrink-0">
                          {m.type === 'internal' ? (
                            <>
                              <button onClick={() => copyGuestLink(m)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 transition">
                                <Copy size={13} /> نسخ رابط الضيف
                              </button>
                              <button onClick={() => openAsHost(m)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-black text-white hover:bg-teal-700 transition shadow-sm">
                                <Video size={13} /> بدء كالمضيف 🎙
                              </button>
                            </>
                          ) : (
                            <a href={m.zoomUrl || 'https://zoom.us/join'} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 transition">
                              <Video size={13} /> فتح Zoom 🚀
                            </a>
                          )}
                          <button onClick={() => setConfirmDeleteId(m.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-100 transition">
                            <Trash2 size={13} /> حذف
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Delete Confirm Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-800/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-right space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={26} className="text-rose-500 shrink-0" />
              <h3 className="text-lg font-black text-slate-900">تأكيد حذف الجلسة</h3>
            </div>
            <p className="text-xs font-bold text-slate-500">هل أنت متأكد من حذف هذه الجلسة؟ لا يمكن التراجع.</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-100 rounded-xl transition">إلغاء</button>
              <button onClick={() => deleteMeeting(confirmDeleteId!)}
                className="rounded-xl bg-rose-500 px-5 py-2.5 text-xs font-black text-white hover:bg-rose-600 transition">تأكيد الحذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CALL STUDIO — WebRTC P2P + Realtime Controls + Masar Style
═══════════════════════════════════════════════════════════ */
function CallStudio({ roomCode, title, participantName, isHost, isMasarUser, guestLink, onLeave }: {
  roomCode: string;
  title: string;
  participantName: string;
  isHost: boolean;
  isMasarUser: boolean;
  guestLink: string;
  onLeave: () => void;
}) {
  const localVideoRef   = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef  = useRef<HTMLVideoElement | null>(null);
  const pcRef           = useRef<RTCPeerConnection | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localStreamRef  = useRef<MediaStream | null>(null);  // always holds current stream
  const myId            = useRef(makeId());
  const myName          = participantName || (isHost ? 'د. إسماعيل عيسى (المضيف)' : 'ضيف');
  const onLeaveRef      = useRef(onLeave);
  onLeaveRef.current    = onLeave;

  const [localStream,   setLocalStream]   = useState<MediaStream | null>(null);
  const [hasRemote,     setHasRemote]     = useState(false);
  const [micOn,         setMicOn]         = useState(false);
  const [videoOn,       setVideoOn]       = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  const [activeTab,     setActiveTab]     = useState<'video' | 'chat' | 'participants' | 'whiteboard'>('video');
  const [permStatus,    setPermStatus]    = useState<'idle' | 'loading' | 'granted' | 'denied' | 'nodevice'>('idle');
  const [permError,     setPermError]     = useState<string>('');
  const [participants,  setParticipants]  = useState<ParticipantInfo[]>([]);
  const [chatMessages,  setChatMessages]  = useState<Array<{ name: string; text: string; time: string }>>([]);
  const [chatInput,     setChatInput]     = useState('');
  const [linkCopied,    setLinkCopied]    = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  /* ── Request camera + mic access ── */
  const requestMedia = () => {
    if (typeof window === 'undefined') return;
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setPermStatus('denied');
      setPermError('يتطلب النظام اتصال آمن (HTTPS) لتشغيل الكاميرا والمايك.');
      return;
    }
    setPermStatus('loading');

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        // Start with both mic and video DISABLED — user turns them on manually
        stream.getAudioTracks().forEach((t) => { t.enabled = false; });
        stream.getVideoTracks().forEach((t) => { t.enabled = false; });

        localStreamRef.current = stream;
        setLocalStream(stream);
        setPermStatus('granted');

        // Attach to video element immediately
        requestAnimationFrame(() => {
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play().catch(() => {});
          }
        });
      })
      .catch((err: DOMException) => {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermStatus('denied');
          setPermError('رُفض الإذن. اضغط على أيقونة 🔒 في شريط المتصفح واسمح بالكاميرا والمايك، ثم حاول مجدداً.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setPermStatus('nodevice');
          setPermError('لم يتم العثور على كاميرا أو مايك على هذا الجهاز.');
        } else {
          setPermStatus('denied');
          setPermError('خطأ: ' + err.message);
        }
      });
  };

  /* ── Auto-request on mount ── */
  useEffect(() => {
    requestMedia();
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Keep video element in sync whenever videoOn or stream changes ── */
  useEffect(() => {
    const vid = localVideoRef.current;
    const stream = localStreamRef.current;
    if (!vid || !stream) return;
    if (vid.srcObject !== stream) {
      vid.srcObject = stream;
    }
    if (videoOn) {
      vid.play().catch(() => {});
    }
  }, [videoOn, localStream]);

  /* ── WebRTC P2P signaling ── */
  useEffect(() => {
    if (!localStream) return;

    const pc = new RTCPeerConnection(RTC);
    pcRef.current = pc;

    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream(event.track ? [event.track] : []);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        remoteVideoRef.current.play().catch(() => {});
        setHasRemote(true);
      }
    };

    // Also catch tracks added later
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setHasRemote(true);
      }
    };

    const roomRef     = doc(db, 'masar_rooms', roomCode);
    const callerCands = collection(roomRef, 'callerCandidates');
    const calleeCands = collection(roomRef, 'calleeCandidates');
    const unsubs: Array<() => void> = [];

    if (isHost) {
      // ── Host: wipe stale signaling data first, then create fresh offer ──
      const startHostSignaling = async () => {
        try {
          // Clear old offer/answer so guest gets a fresh one
          await setDoc(roomRef, { offer: null, answer: null }, { merge: true });
          // Delete old ICE candidates
          const [oldCaller, oldCallee] = await Promise.all([
            getDocs(callerCands),
            getDocs(calleeCands),
          ]);
          await Promise.all([
            ...oldCaller.docs.map((d) => deleteDoc(d.ref)),
            ...oldCallee.docs.map((d) => deleteDoc(d.ref)),
          ]);
        } catch { /* ignore cleanup errors */ }

        if (pc.signalingState === 'closed') return;

        pc.onicecandidate = (e) => {
          if (e.candidate) addDoc(callerCands, e.candidate.toJSON()).catch(() => {});
        };

        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await setDoc(roomRef, { offer: { type: offer.type, sdp: offer.sdp } }, { merge: true });
        } catch { /* ignore */ }

        unsubs.push(onSnapshot(roomRef, (snap) => {
          const d = snap.data();
          if (pc.signalingState !== 'closed' && !pc.currentRemoteDescription && d?.answer) {
            pc.setRemoteDescription(new RTCSessionDescription(d.answer)).catch(() => {});
          }
        }));
        unsubs.push(onSnapshot(calleeCands, (snap) => {
          snap.docChanges().forEach((ch) => {
            if (ch.type === 'added') pc.addIceCandidate(new RTCIceCandidate(ch.doc.data())).catch(() => {});
          });
        }));
      };

      startHostSignaling();

    } else {
      // ── Guest: watch for offer and respond ──
      pc.onicecandidate = (e) => {
        if (e.candidate) addDoc(calleeCands, e.candidate.toJSON()).catch(() => {});
      };
      unsubs.push(onSnapshot(roomRef, async (snap) => {
        const d = snap.data();
        if (pc.signalingState !== 'closed' && d?.offer && !pc.currentRemoteDescription) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(d.offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await setDoc(roomRef, { answer: { type: answer.type, sdp: answer.sdp } }, { merge: true });
          } catch { /* ignore */ }
        }
      }));
      unsubs.push(onSnapshot(callerCands, (snap) => {
        snap.docChanges().forEach((ch) => {
          if (ch.type === 'added') pc.addIceCandidate(new RTCIceCandidate(ch.doc.data())).catch(() => {});
        });
      }));
    }

    return () => {
      unsubs.forEach((u) => u());
      pc.close();
      pcRef.current = null;
    };
  }, [localStream, isHost, roomCode, myName]);

  /* ── Presence & Listener ── */
  useEffect(() => {
    const myDocRef = doc(db, 'masar_rooms', roomCode, 'participants', myId.current);
    const roomRef   = doc(db, 'masar_rooms', roomCode);
    const unsubs: Array<() => void> = [];

    setDoc(myDocRef, {
      name: myName, role: isHost ? 'host' : 'guest',
      joinedAt: Date.now(), kicked: false, micOn: false, videoOn: false, forceMuted: false, forceVideoOff: false,
    }, { merge: true }).catch(() => {});

    // Listen to all participants
    unsubs.push(onSnapshot(collection(db, 'masar_rooms', roomCode, 'participants'), (snap) => {
      const ps = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ParticipantInfo, 'id'>) }))
        .filter((p) => !p.kicked);
      setParticipants(ps);
    }));

    // Non-host listens for force mute / force video off / whiteboard sync / kick
    if (!isHost) {
      unsubs.push(onSnapshot(myDocRef, (snap) => {
        const d = snap.data() as ParticipantInfo | undefined;
        if (!d) return;
        if (d.kicked) { onLeaveRef.current(); return; }
        if (d.forceMuted) {
          localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = false; });
          setMicOn(false);
        }
        if (d.forceVideoOff) {
          localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = false; });
          setVideoOn(false);
        }
      }));
    }

    // Room doc listener (for Whiteboard tab sync)
    unsubs.push(onSnapshot(roomRef, (snap) => {
      const d = snap.data();
      if (d && typeof d.whiteboardActive === 'boolean') {
        if (!isHost) {
          setActiveTab(d.whiteboardActive ? 'whiteboard' : 'video');
        }
      }
    }));

    /* ── Chat ── */
    unsubs.push(onSnapshot(collection(db, 'masar_rooms', roomCode, 'chat'), (snap) => {
      const msgs = snap.docs
        .map((d) => d.data() as { name: string; text: string; time: string; ts: number })
        .sort((a, b) => a.ts - b.ts);
      setChatMessages(msgs.map(({ name, text, time }) => ({ name, text, time })));
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }));

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [isHost, roomCode, myName]);

  /* ── Toggle mic ── */
  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (!stream) { requestMedia(); return; }
    const next = !micOn;
    stream.getAudioTracks().forEach((t) => { t.enabled = next; });
    setMicOn(next);
    setDoc(doc(db, 'masar_rooms', roomCode, 'participants', myId.current), { micOn: next }, { merge: true }).catch(() => {});
  };

  /* ── Toggle video ── */
  const toggleVideo = () => {
    const stream = localStreamRef.current;
    if (!stream) { requestMedia(); return; }
    const next = !videoOn;
    stream.getVideoTracks().forEach((t) => { t.enabled = next; });
    setVideoOn(next);
    if (localVideoRef.current) {
      if (localVideoRef.current.srcObject !== stream) {
        localVideoRef.current.srcObject = stream;
      }
      localVideoRef.current.play().catch(() => {});
    }
    setDoc(doc(db, 'masar_rooms', roomCode, 'participants', myId.current), { videoOn: next }, { merge: true }).catch(() => {});
  };

  /* ── Screen share (with robust camera recovery) ── */
  const toggleScreenShare = async () => {
    const pc = pcRef.current;
    const stream = localStreamRef.current;
    if (!pc || !stream) return;

    if (screenSharing) {
      // STOP screen share
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;

      let camTrack = stream.getVideoTracks()[0];
      if (!camTrack || camTrack.readyState === 'ended') {
        try {
          const fresh = await navigator.mediaDevices.getUserMedia({ video: true, audio: micOn });
          fresh.getVideoTracks().forEach((t) => { t.enabled = videoOn; });
          localStreamRef.current = fresh;
          setLocalStream(fresh);
          camTrack = fresh.getVideoTracks()[0];
        } catch { /* fallback */ }
      }

      if (camTrack) {
        camTrack.enabled = videoOn;
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(camTrack).catch(() => {});
      }

      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
        localVideoRef.current.play().catch(() => {});
      }
      setScreenSharing(false);
    } else {
      // START screen share
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(screenTrack).catch(() => {});

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = new MediaStream([screenTrack]);
          localVideoRef.current.play().catch(() => {});
        }

        screenTrack.onended = async () => {
          screenStreamRef.current = null;
          let camTrack = localStreamRef.current?.getVideoTracks()[0];
          if (!camTrack || camTrack.readyState === 'ended') {
            try {
              const fresh = await navigator.mediaDevices.getUserMedia({ video: true, audio: micOn });
              fresh.getVideoTracks().forEach((t) => { t.enabled = videoOn; });
              localStreamRef.current = fresh;
              setLocalStream(fresh);
              camTrack = fresh.getVideoTracks()[0];
            } catch { /* fallback */ }
          }
          if (camTrack && pcRef.current) {
            camTrack.enabled = videoOn;
            const sender2 = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
            await sender2?.replaceTrack(camTrack).catch(() => {});
          }
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
            localVideoRef.current.play().catch(() => {});
          }
          setScreenSharing(false);
        };
        setScreenSharing(true);
      } catch { /* user cancelled */ }
    }
  };

  /* ── Doctor Host Controls ── */
  const toggleMuteParticipant = (pid: string, isCurrentlyMuted?: boolean) => {
    if (!isHost) return;
    const next = !isCurrentlyMuted;
    setDoc(doc(db, 'masar_rooms', roomCode, 'participants', pid), { forceMuted: next, micOn: !next }, { merge: true }).catch(() => {});
  };

  const toggleCameraParticipant = (pid: string, isCurrentlyOff?: boolean) => {
    if (!isHost) return;
    const next = !isCurrentlyOff;
    setDoc(doc(db, 'masar_rooms', roomCode, 'participants', pid), { forceVideoOff: next, videoOn: !next }, { merge: true }).catch(() => {});
  };

  const kickParticipant = (pid: string) => {
    if (!isHost) return;
    setDoc(doc(db, 'masar_rooms', roomCode, 'participants', pid), { kicked: true }, { merge: true }).catch(() => {});
  };

  const muteAll = () => {
    if (!isHost) return;
    participants.forEach((p) => {
      if (p.id !== myId.current) {
        setDoc(doc(db, 'masar_rooms', roomCode, 'participants', p.id), { forceMuted: true, micOn: false }, { merge: true }).catch(() => {});
      }
    });
  };

  const toggleWhiteboardTab = () => {
    const next = activeTab !== 'whiteboard';
    setActiveTab(next ? 'whiteboard' : 'video');
    if (isHost) {
      setDoc(doc(db, 'masar_rooms', roomCode), { whiteboardActive: next }, { merge: true }).catch(() => {});
    }
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    addDoc(collection(db, 'masar_rooms', roomCode, 'chat'), {
      name: myName, text: chatInput.trim(),
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      ts: Date.now(),
    }).catch(() => {});
    setChatInput('');
  };

  const copyGuestLink = async () => {
    await navigator.clipboard.writeText(guestLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  const handleLeave = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    onLeaveRef.current();
  };

  /* ═════════════ RENDER ═════════════ */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 flex flex-col font-sans" dir="rtl">
      {isMasarUser && <Navbar />}
      <div className="flex">
        {isMasarUser && isHost && <Sidebar desktopOnly />}
        <main className="min-w-0 flex-1 p-3 sm:p-6 space-y-4 max-w-7xl mx-auto w-full">

          {/* Permission Banner — shown if denied or loading */}
          {permStatus === 'loading' && (
            <div className="flex items-center gap-3 rounded-2xl bg-teal-50 border border-teal-200 p-4 shadow-sm">
              <div className="h-6 w-6 border-3 border-teal-600 border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-sm font-black text-teal-800">جاري طلب إذن الكاميرا والمايك من المتصفح...</p>
            </div>
          )}
          {(permStatus === 'denied' || permStatus === 'nodevice') && (
            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 shadow-sm">
              <AlertTriangle size={22} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-black text-amber-900">{permError}</p>
                {permStatus === 'denied' && (
                  <button onClick={requestMedia}
                    className="mt-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-black text-white hover:bg-teal-700 transition">
                    إعادة المحاولة مرة أخرى
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Call Container */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-5">

            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                <div>
                  <h1 className="font-black text-slate-950 text-base sm:text-xl">{title}</h1>
                  <p className="text-xs font-bold text-teal-700">
                    رمز الغرفة: <span className="text-slate-900 font-black">{roomCode}</span>
                    {isHost && <span className="mr-2 text-amber-600 font-black">· أنت المضيف (الدكتور)</span>}
                    {!isHost && <span className="mr-2 text-teal-800 font-black">· مرحباً بك {myName}</span>}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isHost && (
                  <>
                    <button onClick={copyGuestLink}
                      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition border ${linkCopied ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-teal-700 border-teal-200 hover:bg-teal-50'}`}>
                      <Copy size={13} /> {linkCopied ? 'تم النسخ ✅' : 'نسخ رابط الضيف'}
                    </button>
                    <button onClick={muteAll}
                      className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-black text-amber-800 hover:bg-amber-100 transition">
                      <VolumeX size={13} /> كتم الجميع
                    </button>
                  </>
                )}
                <button onClick={handleLeave}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-black text-white hover:bg-rose-600 transition shadow-sm">
                  <PhoneOff size={14} /> {isHost ? 'إنهاء الجلسة' : 'مغادرة'}
                </button>
              </div>
            </div>

            {/* MAIN FULL-WIDTH VIDEO / WHITEBOARD STACK */}
            <div className="w-full">

              {activeTab === 'whiteboard' ? (
                <InteractiveWhiteboard roomCode={roomCode} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* ── LOCAL VIDEO (PROMINENT LARGE BOX) ── */}
                  <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-900 min-h-[300px] sm:min-h-[400px] lg:min-h-[460px] flex flex-col justify-center shadow-lg">
                    <video
                      ref={localVideoRef}
                      autoPlay playsInline muted
                      style={{ display: videoOn ? 'block' : 'none' }}
                      className={`absolute inset-0 h-full w-full object-cover ${!screenSharing ? 'scale-x-[-1]' : ''}`}
                    />

                    {/* Overlay when video OFF */}
                    {!videoOn && (
                      <div className="absolute inset-0 grid place-items-center bg-slate-900 p-4 text-center">
                        {permStatus === 'loading' ? (
                          <div className="space-y-2">
                            <div className="h-10 w-10 rounded-full border-4 border-teal-500 border-t-transparent animate-spin mx-auto" />
                            <p className="text-xs font-black text-slate-300">جاري تجهيز الكاميرا...</p>
                          </div>
                        ) : permStatus === 'denied' || permStatus === 'nodevice' ? (
                          <div className="space-y-2 px-2">
                            <AlertTriangle size={36} className="mx-auto text-amber-400" />
                            <p className="text-xs font-bold text-amber-200 leading-snug">لا يوجد وصول للكاميرا</p>
                            <button onClick={requestMedia} className="rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-black text-white hover:bg-teal-700">
                              إعادة المحاولة
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="h-16 w-16 rounded-full bg-slate-800 border border-slate-700 grid place-items-center mx-auto">
                              <VideoOff size={32} className="text-slate-500" />
                            </div>
                            <p className="text-sm font-black text-slate-200">الكاميرا مقفولة</p>
                            <p className="text-xs text-slate-400">اضغط أيقونة الكاميرا بالأسفل لتشغيلها</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="absolute top-3 right-3 z-10 rounded-full bg-black/75 backdrop-blur px-3 py-1 text-xs font-black text-white shadow">
                      {myName} (أنت)
                    </div>
                    {screenSharing && (
                      <div className="absolute top-3 left-3 z-10 rounded-full bg-teal-600 px-2.5 py-1 text-xs font-black text-white shadow">📺 مشاركة الشاشة</div>
                    )}
                    <div className="absolute bottom-3 left-3 z-10">
                      <span className={`rounded-full px-3 py-1 text-xs font-black shadow ${
                        micOn ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}>
                        {micOn ? '🎙 المايك شغال' : '🔇 المايك مكتوم'}
                      </span>
                    </div>
                  </div>

                  {/* ── REMOTE VIDEO (PROMINENT LARGE BOX) ── */}
                  <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-900 min-h-[300px] sm:min-h-[400px] lg:min-h-[460px] flex flex-col justify-center shadow-lg">
                    <video
                      ref={remoteVideoRef}
                      autoPlay playsInline
                      className={`absolute inset-0 h-full w-full object-cover ${hasRemote ? 'opacity-100' : 'opacity-0'}`}
                    />
                    {!hasRemote && (
                      <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-teal-950 via-slate-900 to-slate-950 p-6 text-center">
                        <div className="space-y-3">
                          <div className="h-16 w-16 rounded-full bg-teal-500/20 border border-teal-400/30 grid place-items-center mx-auto animate-pulse">
                            <User size={32} className="text-teal-300" />
                          </div>
                          <p className="text-sm font-black text-white">
                            {isHost ? 'في انتظار انضمام المشارك...' : 'في انتظار فتح بث الدكتور...'}
                          </p>
                          {isHost && (
                            <button onClick={copyGuestLink}
                              className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-4 py-2 text-xs font-black text-white hover:bg-teal-700 shadow-md">
                              <Copy size={12} /> انسخ رابط الضيف
                            </button>
                          )}
                          {!isHost && (
                            <span className="inline-block rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-black text-emerald-300">متصل بالبث ✓</span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 z-10 rounded-full bg-black/75 backdrop-blur px-3 py-1 text-xs font-black text-white shadow">
                      {isHost ? 'المشارك' : 'د. إسماعيل عيسى'}
                    </div>
                  </div>

                </div>
              )}

              {/* ── Control Bar ── */}
              <div className="flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm mt-4">
                <CtrlBtn active={micOn} onClick={toggleMic} title={micOn ? 'كتم المايك' : 'تشغيل المايك'}>
                  {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                </CtrlBtn>
                <CtrlBtn active={videoOn} onClick={toggleVideo} title={videoOn ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}>
                  {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
                </CtrlBtn>
                <CtrlBtn active={!screenSharing} onClick={toggleScreenShare} title={screenSharing ? 'إيقاف الشاشة' : 'مشاركة الشاشة'}>
                  <Monitor size={20} />
                </CtrlBtn>
                <button onClick={toggleWhiteboardTab}
                  className={`flex h-11 items-center gap-2 px-4 rounded-xl border text-xs font-black transition ${
                    activeTab === 'whiteboard' ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}>
                  <PenTool size={18} />
                  <span>السبورة التفاعلية</span>
                </button>
              </div>

            </div>

            {/* ── BOTTOM SECTION: PARTICIPANTS & CHAT SIDE BY SIDE ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 border-t border-slate-100 pt-5">

              {/* PARTICIPANTS CARD */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Users size={16} className="text-teal-600" /> الحضور المتصلين ({participants.length})
                  </h3>
                  {isHost && (
                    <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">تحكّم الدكتور</span>
                  )}
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {participants.length === 0 && (
                    <p className="text-xs font-bold text-slate-400 text-center py-4">جاري الاتصال...</p>
                  )}
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-full bg-teal-50 text-teal-700 border border-teal-200 grid place-items-center text-xs font-black shrink-0">
                          {p.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-900 truncate">{p.name}</p>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mt-0.5">
                            <span>{p.role === 'host' ? '👑 المضيف' : 'مشارك'}</span>
                            <span>· {p.micOn ? '🎙 مايك شغال' : '🔇 مكتوم'}</span>
                            <span>· {p.videoOn ? '📹 كاميرا شغالة' : '📷 كاميرا مقفولة'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Doctor Controls: Mic & Camera & Kick */}
                      {isHost && p.id !== myId.current && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Toggle Mic */}
                          <button onClick={() => toggleMuteParticipant(p.id, p.forceMuted || !p.micOn)}
                            className={`p-2 rounded-xl border transition ${
                              p.forceMuted || !p.micOn
                                ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                                : 'bg-slate-100 border-slate-200 text-emerald-700 hover:bg-slate-200'
                            }`} title={p.forceMuted || !p.micOn ? 'إلغاء كتم المايك' : 'كتم المايك'}>
                            {p.forceMuted || !p.micOn ? <MicOff size={14} /> : <Mic size={14} />}
                          </button>

                          {/* Toggle Camera */}
                          <button onClick={() => toggleCameraParticipant(p.id, p.forceVideoOff || !p.videoOn)}
                            className={`p-2 rounded-xl border transition ${
                              p.forceVideoOff || !p.videoOn
                                ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100'
                                : 'bg-slate-100 border-slate-200 text-teal-700 hover:bg-slate-200'
                            }`} title={p.forceVideoOff || !p.videoOn ? 'إلغاء قفل الكاميرا' : 'قفل الكاميرا'}>
                            {p.forceVideoOff || !p.videoOn ? <VideoOff size={14} /> : <Video size={14} />}
                          </button>

                          {/* Kick */}
                          <button onClick={() => kickParticipant(p.id)}
                            className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition" title="طرد">
                            <UserX size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* CHAT CARD */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col gap-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-200">
                  <MessageSquare size={16} className="text-teal-600" /> محادثة الجلسة
                </h3>
                <div className="flex-1 space-y-2 max-h-56 overflow-y-auto">
                  {chatMessages.length === 0 && (
                    <p className="text-xs font-bold text-slate-400 text-center py-4">لا توجد رسائل بعد</p>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                      <p className="text-[10px] font-black text-teal-700">{msg.name} <span className="text-slate-400">· {msg.time}</span></p>
                      <p className="mt-0.5 text-xs font-bold text-slate-800">{msg.text}</p>
                    </div>
                  ))}
                  <div ref={chatBottomRef} />
                </div>
                <div className="flex gap-2">
                  <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChat()} placeholder="اكتب رسالتك..."
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600" />
                  <button onClick={sendChat}
                    className="rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white hover:bg-teal-700 transition shadow-sm">
                    إرسال
                  </button>
                </div>
              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

/* ═══════════════ INTERACTIVE WHITEBOARD (Firestore Synced) ═══════════════ */
function InteractiveWhiteboard({ roomCode }: { roomCode: string }) {
  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor]     = useState('#0f766e');
  const [tool, setTool]       = useState<'pen' | 'eraser'>('pen');

  const drawLineOnCanvas = (fx: number, fy: number, tx: number, ty: number, strokeColor: string, strokeWidth: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  };

  const clearCanvasLocally = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  useEffect(() => {
    clearCanvasLocally();

    // 1. BroadcastChannel for same-browser tab sync
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(`masar_wb_${roomCode}`);
      channelRef.current = bc;
      bc.onmessage = (e) => {
        const { type: t, ...d } = e.data;
        if (t === 'draw') {
          drawLineOnCanvas(d.fx, d.fy, d.tx, d.ty, d.color, d.lw);
        } else if (t === 'clear') {
          clearCanvasLocally();
        }
      };
    }

    // 2. Firestore network sync for cross-device
    const strokesRef = collection(db, 'masar_rooms', roomCode, 'whiteboard_strokes');
    const unsub = onSnapshot(strokesRef, (snap) => {
      snap.docChanges().forEach((ch) => {
        if (ch.type === 'added') {
          const d = ch.doc.data();
          if (d.clear) {
            clearCanvasLocally();
          } else if (typeof d.fx === 'number') {
            drawLineOnCanvas(d.fx, d.fy, d.tx, d.ty, d.color, d.lw);
          }
        }
      });
    });

    return () => {
      channelRef.current?.close();
      unsub();
    };
  }, [roomCode]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const r = canvas.getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const scaleX = canvas.width / r.width;
    const scaleY = canvas.height / r.height;
    return { x: (cx - r.left) * scaleX, y: (cy - r.top) * scaleY };
  };

  const stroke = (fx: number, fy: number, tx: number, ty: number) => {
    const sc = tool === 'eraser' ? '#ffffff' : color;
    const lw = tool === 'eraser' ? 24 : 4;
    drawLineOnCanvas(fx, fy, tx, ty, sc, lw);

    channelRef.current?.postMessage({ type: 'draw', color: sc, lw, fx, fy, tx, ty });

    addDoc(collection(db, 'masar_rooms', roomCode, 'whiteboard_strokes'), {
      color: sc, lw, fx, fy, tx, ty, ts: Date.now(),
    }).catch(() => {});
  };

  const onStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setDrawing(true);
    lastPosRef.current = getPos(e, canvasRef.current!);
  };

  const onMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!drawing || !lastPosRef.current) return;
    const cur = getPos(e, canvasRef.current!);
    stroke(lastPosRef.current.x, lastPosRef.current.y, cur.x, cur.y);
    lastPosRef.current = cur;
  };

  const onEnd = () => { setDrawing(false); lastPosRef.current = null; };

  const clearAll = () => {
    clearCanvasLocally();
    channelRef.current?.postMessage({ type: 'clear' });
    addDoc(collection(db, 'masar_rooms', roomCode, 'whiteboard_strokes'), {
      clear: true, ts: Date.now(),
    }).catch(() => {});
  };

  const COLORS = ['#000000', '#0f766e', '#dc2626', '#2563eb', '#7c3aed', '#d97706'];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 shadow-sm space-y-3 flex-1 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <span className="text-xs font-black text-teal-700 flex items-center gap-1.5">
          <PenTool size={15} /> السبورة التفاعلية M-Board
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1 border border-slate-200">
            {(['pen', 'eraser'] as const).map((t) => (
              <button key={t} onClick={() => setTool(t)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition ${tool === t ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>
                {t === 'pen' ? 'قلم' : <span className="flex items-center gap-1"><Eraser size={13} /> ممحاة</span>}
              </button>
            ))}
          </div>
          {tool === 'pen' && (
            <div className="flex gap-1.5 items-center">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} style={{ backgroundColor: c }}
                  className={`h-5 w-5 sm:h-6 sm:w-6 rounded-full transition ${color === c ? 'ring-2 ring-offset-1 ring-slate-400 scale-110' : ''}`} />
              ))}
            </div>
          )}
          <button onClick={clearAll}
            className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-600 hover:bg-rose-100 transition">
            <RotateCcw size={13} /> مسح الكل
          </button>
        </div>
      </div>
      <div className="relative flex-1 min-h-[320px] sm:min-h-[420px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
        <canvas ref={canvasRef} width={900} height={450}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
          className="h-full w-full cursor-crosshair touch-none" />
      </div>
    </div>
  );
}

/* ═══════════════ CONTROL BUTTON ═══════════════ */
function CtrlBtn({ active, onClick, title, children }: {
  active: boolean; onClick: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <button onClick={onClick} title={title}
      className={`grid h-11 w-11 place-items-center rounded-xl border transition ${active ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' : 'bg-rose-500 text-white border-rose-500 hover:bg-rose-600'}`}>
      {children}
    </button>
  );
}
