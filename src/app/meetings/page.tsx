'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Video, VideoOff, Mic, MicOff, Monitor, PhoneOff, Copy,
  Trash2, CalendarClock, PenTool, Radio, User,
  ShieldCheck, AlertTriangle, Users, Eraser, RotateCcw,
  VolumeX, UserX, MessageSquare, Plus,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { getSession, getStudents, StudentRecord } from '@/lib/localDb';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot, collection, addDoc, getDoc } from 'firebase/firestore';

/* ═══════════════ TYPES ═══════════════ */
type MeetingRecord = {
  id: string;
  roomCode: string;
  hostToken: string;   // secret UUID — only doctor has this
  title: string;
  targetName: string;
  date: string;
  time: string;
  type: 'internal' | 'zoom';
  zoomUrl?: string;
  notes: string;
  createdAt: number;
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

/* ═══════════════ HELPERS ═══════════════ */
function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* ═══════════════ PAGE ENTRY ═══════════════ */
export default function MeetingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <MeetingsContent />
    </Suspense>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT — decides: management panel vs call studio
═══════════════════════════════════════════════════════════ */
function MeetingsContent() {
  const sp          = useSearchParams();
  const roomParam   = sp.get('room');   // ?room=MASAR-ROOM-xxxx
  const tokenParam  = sp.get('t');      // ?t=<hostToken>  (doctor only)

  const [ready,     setReady]    = useState(false);
  const [isDoctor,  setIsDoctor] = useState(false);  // logged-in as doctor
  const [isHost,    setIsHost]   = useState(false);  // host role in this call
  const [meetings,  setMeetings] = useState<MeetingRecord[]>([]);
  const [students,  setStudents] = useState<StudentRecord[]>([]);
  const [inCall,    setInCall]   = useState<{ roomCode: string; title: string } | null>(null);
  const [copyMsg,   setCopyMsg]  = useState('');
  const [origin,    setOrigin]   = useState('');
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
    setIsDoctor(session?.role === 'doctor');
    setMeetings(readMeetings());
    setStudents(getStudents());

    if (roomParam) {
      /* ── Joining a room from a shared link ── */
      if (tokenParam) {
        // Verify host token against Firestore (secure, cross-device)
        getDoc(doc(db, 'masar_rooms', roomParam))
          .then((snap) => {
            const data = snap.data();
            const validHost = data?.hostToken === tokenParam;
            setIsHost(validHost);
            setInCall({ roomCode: roomParam, title: data?.title || 'جلسة مباشرة' });
          })
          .catch(() => {
            setIsHost(false);
            setInCall({ roomCode: roomParam, title: 'جلسة مباشرة' });
          })
          .finally(() => setReady(true));
      } else {
        // No token → always guest
        setIsHost(false);
        setInCall({ roomCode: roomParam, title: 'جلسة مباشرة' });
        setReady(true);
      }
    } else {
      setReady(true);
    }
  }, [roomParam, tokenParam]);

  const flash = (msg: string) => {
    setCopyMsg(msg);
    setTimeout(() => setCopyMsg(''), 4000);
  };

  /* ── Doctor creates a meeting ── */
  const createMeeting = () => {
    if (!form.title) return;
    const roomCode  = `MASAR-${makeId().slice(0, 8).toUpperCase()}`;
    const hostToken = makeId();

    // Store host token in Firestore so it can be verified from any device
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

  /* ── Copy guest link (no token — anyone can join as guest) ── */
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

  /* ── Doctor opens room as host (using their secret host token) ── */
  const openAsHost = (m: MeetingRecord) => {
    setIsHost(true);
    setInCall({ roomCode: m.roomCode, title: m.title });
  };

  /* ── Instant meeting ── */
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
    setInCall({ roomCode, title: meeting.title });
  };

  if (!ready) return null;

  /* ══════════════════════════
     IN CALL — full video studio
  ══════════════════════════ */
  if (inCall) {
    return (
      <CallStudio
        roomCode={inCall.roomCode}
        title={inCall.title}
        isHost={isHost}
        guestLink={`${origin}/meetings?room=${inCall.roomCode}`}
        onLeave={() => { setInCall(null); setIsHost(false); }}
      />
    );
  }

  /* ══════════════════════════
     GUEST WITH NO ROOM — info page
  ══════════════════════════ */
  if (!isDoctor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-900 to-slate-900 flex items-center justify-center p-4" dir="rtl">
        <div className="text-center p-10 rounded-3xl bg-white shadow-2xl border border-slate-200 max-w-md w-full">
          <div className="h-20 w-20 rounded-full bg-teal-50 border-4 border-teal-200 grid place-items-center mx-auto mb-5">
            <Video size={40} className="text-teal-600" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">منصة مسار</h1>
          <p className="text-lg font-black text-teal-700 mt-1">الجلسات التفاعلية المباشرة</p>
          <p className="text-sm font-bold text-slate-500 mt-3 leading-relaxed">
            للانضمام لجلسة مباشرة، استخدم الرابط الخاص الذي أرسله لك د. إسماعيل عيسى عبر واتساب أو رسالة المنصة.
          </p>
        </div>
      </div>
    );
  }

  /* ══════════════════════════
     DOCTOR MANAGEMENT PANEL
  ══════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">

          {/* Header */}
          <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                  className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-black text-white hover:bg-teal-700 transition shadow-sm active:scale-95">
                  <Video size={16} /> 🚀 بدء بث فوري الآن
                </button>
                <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 border border-teal-200 px-4 py-2 text-xs font-black text-teal-800">
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

            {/* ── Schedule Form ── */}
            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 xl:sticky xl:top-24 xl:self-start">
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

            {/* ── Meetings List ── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <CalendarClock size={22} className="text-teal-600" />
                <h2 className="text-lg font-black text-slate-950">الجلسات المجدولة</h2>
              </div>

              {meetings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center">
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

                          {/* Guest link preview */}
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
   CALL STUDIO — WebRTC P2P with Firestore signaling
   Host controls: mute all, mute one, kick
   Everyone: camera, mic, screen share, chat, whiteboard
═══════════════════════════════════════════════════════════ */
function CallStudio({ roomCode, title, isHost, guestLink, onLeave }: {
  roomCode: string;
  title: string;
  isHost: boolean;
  guestLink: string;
  onLeave: () => void;
}) {
  const localVideoRef   = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef  = useRef<HTMLVideoElement | null>(null);
  const pcRef           = useRef<RTCPeerConnection | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const myId            = useRef(makeId());
  const myName          = isHost ? 'د. إسماعيل عيسى (المضيف)' : 'ضيف';
  const onLeaveRef      = useRef(onLeave);
  onLeaveRef.current    = onLeave;

  const [localStream,   setLocalStream]   = useState<MediaStream | null>(null);
  const [hasRemote,     setHasRemote]     = useState(false);
  const [micOn,         setMicOn]         = useState(true);
  const [videoOn,       setVideoOn]       = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [cameraError,   setCameraError]   = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [participants,  setParticipants]  = useState<Array<{ id: string; name: string }>>([]);
  const [chatMessages,  setChatMessages]  = useState<Array<{ name: string; text: string; time: string }>>([]);
  const [chatInput,     setChatInput]     = useState('');
  const [linkCopied,    setLinkCopied]    = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  /* ── Start camera on mount ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    if (!isSecure) { setCameraError('تحتاج HTTPS لتشغيل الكاميرا والمايك.'); return; }

    let cancelled = false;
    setCameraLoading(true);

    navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: true,
    }).then((stream) => {
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
      setLocalStream(stream);
      setCameraLoading(false);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
    }).catch((err) => {
      if (cancelled) return;
      setCameraLoading(false);
      if (err.name === 'NotAllowedError') {
        setCameraError('رُفض إذن الكاميرا. اسمح بالكاميرا والمايك من المتصفح.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('لا توجد كاميرا أو مايك متصل بالجهاز.');
      } else {
        setCameraError('خطأ في الكاميرا: ' + err.message);
      }
    });

    return () => { cancelled = true; };
  }, []);

  /* ── WebRTC P2P + Firestore signaling ── */
  useEffect(() => {
    if (!localStream) return;

    const pc = new RTCPeerConnection(RTC);
    pcRef.current = pc;
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setHasRemote(true);
      }
    };

    const roomRef       = doc(db, 'masar_rooms', roomCode);
    const callerCands   = collection(roomRef, 'callerCandidates');
    const calleeCands   = collection(roomRef, 'calleeCandidates');
    const unsubs: Array<() => void> = [];

    if (isHost) {
      // HOST: create offer → listen for answer + callee ICE
      pc.onicecandidate = (e) => {
        if (e.candidate) addDoc(callerCands, e.candidate.toJSON()).catch(() => {});
      };
      pc.createOffer().then((offer) => {
        pc.setLocalDescription(offer);
        setDoc(roomRef, { offer: { type: offer.type, sdp: offer.sdp } }, { merge: true });
      }).catch(() => {});

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

    } else {
      // GUEST: wait for offer → create answer → listen for caller ICE
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

    /* ── Participant presence ── */
    const myDocRef = doc(db, 'masar_rooms', roomCode, 'participants', myId.current);
    setDoc(myDocRef, { name: myName, role: isHost ? 'host' : 'guest', joinedAt: Date.now(), kicked: false }).catch(() => {});

    // Host: watch all participants
    if (isHost) {
      unsubs.push(onSnapshot(collection(db, 'masar_rooms', roomCode, 'participants'), (snap) => {
        const ps = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as { name: string; kicked?: boolean }) }))
          .filter((p) => !p.kicked);
        setParticipants(ps);
      }));
    }

    // Guest: watch own doc for kick/force-mute commands
    if (!isHost) {
      unsubs.push(onSnapshot(myDocRef, (snap) => {
        const d = snap.data();
        if (!d) return;
        if (d.kicked) { onLeaveRef.current(); return; }
        if (typeof d.forceMuted === 'boolean') {
          localStream?.getAudioTracks().forEach((t) => { t.enabled = !d.forceMuted; });
          setMicOn(!d.forceMuted);
        }
      }));
    }

    /* ── Chat listener ── */
    unsubs.push(onSnapshot(collection(db, 'masar_rooms', roomCode, 'chat'), (snap) => {
      const msgs = snap.docs
        .map((d) => d.data() as { name: string; text: string; time: string; ts: number })
        .sort((a, b) => a.ts - b.ts);
      setChatMessages(msgs.map(({ name, text, time }) => ({ name, text, time })));
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }));

    return () => {
      unsubs.forEach((u) => u());
      pc.close();
      pcRef.current = null;
    };
  }, [localStream, isHost, roomCode, myName]);

  /* ── Controls ── */
  const toggleMic = () => {
    if (!localStream) return;
    const next = !micOn;
    localStream.getAudioTracks().forEach((t) => { t.enabled = next; });
    setMicOn(next);
  };

  const toggleVideo = () => {
    if (!localStream) return;
    const next = !videoOn;
    localStream.getVideoTracks().forEach((t) => { t.enabled = next; });
    setVideoOn(next);
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  };

  const toggleScreenShare = async () => {
    if (!pcRef.current || !localStream) return;
    if (screenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      const camTrack = localStream.getVideoTracks()[0];
      if (camTrack) {
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        await sender?.replaceTrack(camTrack).catch(() => {});
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
      setScreenSharing(false);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];
        const sender = pcRef.current.getSenders().find((s) => s.track?.kind === 'video');
        await sender?.replaceTrack(screenTrack).catch(() => {});
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = new MediaStream([screenTrack]);
        }
        screenTrack.onended = async () => {
          const camTrack = localStream.getVideoTracks()[0];
          if (camTrack) {
            const s = pcRef.current?.getSenders().find((s) => s.track?.kind === 'video');
            await s?.replaceTrack(camTrack).catch(() => {});
          }
          if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
          screenStreamRef.current = null;
          setScreenSharing(false);
        };
        setScreenSharing(true);
      } catch { /* user cancelled */ }
    }
  };

  /* ── Host: mute one participant ── */
  const muteParticipant = (pid: string) => {
    if (!isHost) return;
    setDoc(doc(db, 'masar_rooms', roomCode, 'participants', pid), { forceMuted: true, micMuted: true }, { merge: true }).catch(() => {});
  };

  /* ── Host: kick one participant ── */
  const kickParticipant = (pid: string) => {
    if (!isHost) return;
    setDoc(doc(db, 'masar_rooms', roomCode, 'participants', pid), { kicked: true }, { merge: true }).catch(() => {});
  };

  /* ── Host: mute everyone ── */
  const muteAll = () => {
    if (!isHost) return;
    participants.forEach((p) => {
      if (p.id !== myId.current) muteParticipant(p.id);
    });
  };

  /* ── Send chat ── */
  const sendChat = () => {
    if (!chatInput.trim()) return;
    addDoc(collection(db, 'masar_rooms', roomCode, 'chat'), {
      name: myName,
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      ts: Date.now(),
    }).catch(() => {});
    setChatInput('');
  };

  /* ── Copy guest link (host only, shown in call banner) ── */
  const copyGuestLink = async () => {
    await navigator.clipboard.writeText(guestLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  /* ── Leave ── */
  const handleLeave = () => {
    localStream?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    onLeaveRef.current();
  };

  /* ═════════════ RENDER ═════════════ */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950" dir="rtl">
      <Navbar />
      <div className="flex">
        {isHost && <Sidebar desktopOnly />}
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">

          {/* Call Banner */}
          <div className="overflow-hidden rounded-3xl border-2 border-teal-500 bg-white shadow-xl">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-l from-teal-50 to-white px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-rose-500 animate-ping shrink-0" />
                <div>
                  <h1 className="font-black text-slate-900 text-base">{title}</h1>
                  <p className="text-xs font-bold text-teal-600">
                    رمز الغرفة: <span className="font-black text-slate-700">{roomCode}</span>
                    {isHost && <span className="mr-2 text-amber-600 font-black">· أنت المضيف</span>}
                    {!isHost && <span className="mr-2 text-slate-400 font-bold">· وضع الضيف</span>}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isHost && (
                  <>
                    <button onClick={copyGuestLink}
                      className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition border ${linkCopied ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-teal-700 border-teal-300 hover:bg-teal-50'}`}>
                      <Copy size={13} /> {linkCopied ? 'تم النسخ ✅' : 'نسخ رابط الضيف'}
                    </button>
                    <button onClick={muteAll}
                      className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-black text-amber-800 hover:bg-amber-100 transition">
                      <VolumeX size={13} /> كتم الجميع
                    </button>
                  </>
                )}
                <button onClick={() => setShowWhiteboard(!showWhiteboard)}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition border ${showWhiteboard ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-teal-700 border-teal-300 hover:bg-teal-50'}`}>
                  <PenTool size={14} /> السبورة
                </button>
                <button onClick={handleLeave}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-black text-white hover:bg-rose-600 transition">
                  <PhoneOff size={14} /> {isHost ? 'إنهاء الجلسة' : 'مغادرة'}
                </button>
              </div>
            </div>

            {/* Call Body */}
            <div className="grid lg:grid-cols-12 min-h-[520px]">

              {/* ── Video / Whiteboard ── */}
              <div className="lg:col-span-8 p-4 space-y-4 bg-slate-50">

                {showWhiteboard ? (
                  <InteractiveWhiteboard roomCode={roomCode} />
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4 min-h-[360px]">

                    {/* Local Video */}
                    <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-900 shadow-inner min-h-[240px]">
                      <video
                        ref={localVideoRef}
                        autoPlay playsInline muted
                        className={`absolute inset-0 h-full w-full object-cover ${videoOn && !cameraError ? 'opacity-100' : 'opacity-0'} ${!screenSharing ? 'scale-x-[-1]' : ''}`}
                      />
                      {(!videoOn || cameraError || cameraLoading) && (
                        <div className="absolute inset-0 grid place-items-center bg-slate-800 p-4 text-center">
                          {cameraLoading && (
                            <div className="space-y-2">
                              <div className="h-10 w-10 rounded-full border-4 border-teal-400 border-t-transparent animate-spin mx-auto" />
                              <p className="text-xs font-black text-slate-200">جاري فتح الكاميرا...</p>
                            </div>
                          )}
                          {!cameraLoading && cameraError && (
                            <div className="space-y-2">
                              <ShieldCheck size={44} className="mx-auto text-amber-400" />
                              <p className="text-xs font-black text-amber-200 max-w-[200px]">⚠️ {cameraError}</p>
                            </div>
                          )}
                          {!cameraLoading && !cameraError && !videoOn && (
                            <div className="space-y-2">
                              <VideoOff size={44} className="mx-auto text-slate-400" />
                              <p className="text-xs font-black text-slate-300">الكاميرا متوقفة</p>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="absolute top-3 right-3 z-10 rounded-full bg-black/50 backdrop-blur px-3 py-1 text-[11px] font-black text-white">
                        {isHost ? 'د. إسماعيل عيسى (أنت)' : 'كاميرتك'}
                      </div>
                      {screenSharing && (
                        <div className="absolute top-3 left-3 z-10 rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-black text-white">📺 شاشة</div>
                      )}
                      <div className="absolute bottom-3 left-3 z-10">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${micOn ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                          {micOn ? '🎙' : '🔇'}
                        </span>
                      </div>
                    </div>

                    {/* Remote Video */}
                    <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-900 shadow-inner min-h-[240px]">
                      <video
                        ref={remoteVideoRef}
                        autoPlay playsInline
                        className={`absolute inset-0 h-full w-full object-cover ${hasRemote ? 'opacity-100' : 'opacity-0'}`}
                      />
                      {!hasRemote && (
                        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-teal-900 to-slate-900 p-4 text-center">
                          <div className="space-y-3">
                            <div className="h-16 w-16 rounded-full bg-teal-400/20 border-2 border-teal-400/40 grid place-items-center mx-auto animate-pulse">
                              <User size={36} className="text-teal-300" />
                            </div>
                            <p className="text-xs font-black text-white">
                              {isHost ? 'في انتظار انضمام المشارك...' : 'في انتظار الدكتور...'}
                            </p>
                            {isHost && (
                              <button onClick={copyGuestLink}
                                className="inline-flex items-center gap-1.5 rounded-full bg-teal-600/80 px-3 py-1.5 text-[10px] font-black text-white hover:bg-teal-600 transition">
                                <Copy size={11} /> انسخ رابط الضيف وأرسله
                              </button>
                            )}
                            {!isHost && (
                              <span className="inline-block rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-[10px] font-black text-emerald-300">
                                متصل بالغرفة ✓
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="absolute top-3 right-3 z-10 rounded-full bg-black/50 backdrop-blur px-3 py-1 text-[11px] font-black text-white">
                        {isHost ? 'المشارك' : 'د. إسماعيل عيسى'}
                      </div>
                    </div>
                  </div>
                )}

                {/* Controls Bar */}
                <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <CtrlBtn active={micOn} onClick={toggleMic} title={micOn ? 'كتم المايك' : 'تشغيل المايك'}>
                    {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                  </CtrlBtn>
                  <CtrlBtn active={videoOn} onClick={toggleVideo} title={videoOn ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}>
                    {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
                  </CtrlBtn>
                  <CtrlBtn active={!screenSharing} onClick={toggleScreenShare} title={screenSharing ? 'إيقاف مشاركة الشاشة' : 'مشاركة الشاشة'}>
                    <Monitor size={20} />
                  </CtrlBtn>
                  <button onClick={handleLeave}
                    className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-xs font-black text-white hover:bg-rose-600 transition">
                    <PhoneOff size={18} /> مغادرة
                  </button>
                </div>
              </div>

              {/* ── Participants + Chat Panel ── */}
              <div className="lg:col-span-4 border-r border-slate-100 bg-white p-4 flex flex-col gap-4">

                {/* Participants (host only) */}
                {isHost && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <Users size={14} className="text-teal-600" /> الحضور ({participants.length})
                      </h3>
                      <span className="text-[10px] font-black text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 border border-amber-200">تحكّم المضيف</span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {participants.length === 0 && (
                        <p className="text-[10px] font-bold text-slate-400 text-center py-3">في انتظار الحضور...</p>
                      )}
                      {participants.map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                          <p className="text-xs font-black text-slate-900 truncate">{p.name}</p>
                          {p.id !== myId.current && (
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => muteParticipant(p.id)}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 transition"
                                title="كتم المايك">
                                <MicOff size={12} />
                              </button>
                              <button onClick={() => kickParticipant(p.id)}
                                className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100 transition"
                                title="طرد من الجلسة">
                                <UserX size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chat */}
                <div className="flex-1 flex flex-col gap-2 border-t border-slate-100 pt-3 min-h-0">
                  <h3 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-teal-600" /> محادثة الجلسة
                  </h3>
                  <div className="flex-1 space-y-2 max-h-64 overflow-y-auto">
                    {chatMessages.length === 0 && (
                      <p className="text-[10px] font-bold text-slate-400 text-center py-3">لا توجد رسائل بعد</p>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                        <p className="text-[10px] font-black text-teal-700">
                          {msg.name} <span className="text-slate-400 font-bold">· {msg.time}</span>
                        </p>
                        <p className="mt-0.5 text-xs font-bold text-slate-800">{msg.text}</p>
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>
                  <div className="flex gap-2 mt-auto">
                    <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                      placeholder="اكتب رسالة..."
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-teal-500" />
                    <button onClick={sendChat}
                      className="rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-black text-white hover:bg-teal-700 transition">إرسال</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* ═══════════════ INTERACTIVE WHITEBOARD ═══════════════ */
function InteractiveWhiteboard({ roomCode }: { roomCode: string }) {
  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor]     = useState('#0f766e');
  const [tool, setTool]       = useState<'pen' | 'eraser'>('pen');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel(`masar_wb_${roomCode}`);
      channelRef.current = bc;
      bc.onmessage = (e) => {
        const { type: t, ...d } = e.data;
        const c2 = canvasRef.current?.getContext('2d');
        if (!c2) return;
        if (t === 'draw') {
          c2.strokeStyle = d.color; c2.lineWidth = d.lw;
          c2.lineCap = 'round'; c2.lineJoin = 'round';
          c2.beginPath(); c2.moveTo(d.fx, d.fy); c2.lineTo(d.tx, d.ty); c2.stroke();
        } else if (t === 'clear') {
          c2.fillStyle = '#fff'; c2.fillRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        }
      };
      return () => bc.close();
    }
  }, [roomCode]);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const r = canvas.getBoundingClientRect();
    const cx = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const cy = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return { x: cx - r.left, y: cy - r.top };
  };

  const stroke = (fx: number, fy: number, tx: number, ty: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const sc = tool === 'eraser' ? '#ffffff' : color;
    const lw = tool === 'eraser' ? 24 : 4;
    ctx.strokeStyle = sc; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
    channelRef.current?.postMessage({ type: 'draw', color: sc, lw, fx, fy, tx, ty });
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
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    channelRef.current?.postMessage({ type: 'clear' });
  };

  const COLORS = ['#000000', '#0f766e', '#dc2626', '#2563eb', '#7c3aed', '#d97706'];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <span className="text-xs font-black text-teal-700 flex items-center gap-1.5">
          <PenTool size={15} /> السبورة التفاعلية
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
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
                  className={`h-6 w-6 rounded-full transition ${color === c ? 'ring-2 ring-offset-1 ring-slate-500 scale-125' : ''}`} />
              ))}
            </div>
          )}
          <button onClick={clearAll}
            className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-600 hover:bg-rose-100 transition">
            <RotateCcw size={13} /> مسح الكل
          </button>
        </div>
      </div>
      <div className="relative h-[320px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
        <canvas ref={canvasRef} width={900} height={320}
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
