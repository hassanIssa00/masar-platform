'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Video, VideoOff, Mic, MicOff, Monitor, PhoneOff, Copy,
  Trash2, CalendarClock, PenTool, Radio, User,
  ShieldCheck, AlertTriangle, Users, Eraser, RotateCcw,
  VolumeX, UserX, MessageSquare
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { getSession, getStudents, StudentRecord } from '@/lib/localDb';

/* ─────────────── Types ─────────────── */
type MeetingRecord = {
  id: string;
  targetId: string;
  targetName: string;
  roomCode: string;
  title: string;
  date: string;
  time: string;
  link: string;
  type: 'internal' | 'zoom';
  notes: string;
};

type Participant = {
  id: string;
  name: string;
  role: 'doctor' | 'student' | 'parent';
  micMuted: boolean;
  videoOff: boolean;
};

const KEY = 'masar.meetings.v1';

const targetOptions = [
  { id: 'class_g1', name: 'فصل الصف الأول الابتدائي (جميع الطلاب)' },
  { id: 'class_g2', name: 'فصل الصف الثاني الابتدائي (جميع الطلاب)' },
  { id: 'class_g3', name: 'فصل الصف الثالث الابتدائي (جميع الطلاب)' },
  { id: 'class_g4', name: 'فصل الصف الرابع الابتدائي (جميع الطلاب)' },
  { id: 'class_g5', name: 'فصل الصف الخامس الابتدائي (جميع الطلاب)' },
  { id: 'class_g6', name: 'فصل الصف السادس الابتدائي (جميع الطلاب)' },
  { id: 'course_general', name: 'دورة تدريبية / ورشة عمل (كافة الحضور)' },
  { id: 'all_students', name: 'جميع الطلاب وأولياء الأمور المسجلين' },
];

/* ─────────────── LocalStorage Helpers ─────────────── */
function readMeetings(): MeetingRecord[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as MeetingRecord[]; }
  catch { return []; }
}
function writeMeetings(meetings: MeetingRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(meetings));
}

/* ─────────────── Page Entry ─────────────── */
export default function MeetingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <MeetingsContent />
    </Suspense>
  );
}

/* ─────────────── Main Content ─────────────── */
function MeetingsContent() {
  const searchParams = useSearchParams();
  const roomParam   = searchParams.get('room');
  const roleParam   = searchParams.get('role'); // 'student' | 'doctor' | null

  const [students, setStudents]           = useState<StudentRecord[]>([]);
  const [meetings, setMeetings]           = useState<MeetingRecord[]>([]);
  const [isHost, setIsHost]               = useState<boolean>(true);  // default true until session loads
  const [sessionLoaded, setSessionLoaded] = useState(false);

  /* ── Video call state ── */
  const [activeCallRoom, setActiveCallRoom] = useState<MeetingRecord | null>(null);
  const [micOn, setMicOn]     = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [screenShare, setScreenShare]     = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  /* ── WebRTC ── */
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState(false);

  /* ── Participants & Chat ── */
  const [participants, setParticipants] = useState<Participant[]>([
    { id: 'dr_1',  name: 'د. إسماعيل عيسى (المضيف)',        role: 'doctor',  micMuted: false, videoOff: false },
    { id: 'p_1',   name: 'الطالب / ولي الأمر (متصل)',       role: 'student', micMuted: false, videoOff: false },
  ]);

  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'د. إسماعيل عيسى', text: 'أهلاً بكم في غرفة البث المباشر. يمكنكم الآن الكتابة وسماعي.', time: '10:00 ص' }
  ]);
  const [newChatText, setNewChatText] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  /* ── Scheduling form ── */
  const [form, setForm] = useState({
    targetId: '',
    title: 'جلسة تأهيل ومتابعة مباشرة',
    date: new Date().toISOString().slice(0, 10),
    time: '10:00',
    type: 'internal' as 'internal' | 'zoom',
    zoomUrl: '',
    notes: '',
  });

  /* ─────────────── Session / Role detection ─────────────── */
  useEffect(() => {
    // URL param 'role=student' → attendee regardless of localStorage
    if (roleParam === 'student') {
      setIsHost(false);
    } else if (roleParam === 'doctor') {
      setIsHost(true);
    } else {
      // Fall back to localStorage session
      const session = getSession();
      if (session?.role === 'parent' || session?.role === 'specialist') {
        setIsHost(false);
      } else {
        setIsHost(true); // doctor / teacher / default
      }
    }
    setSessionLoaded(true);
  }, [roleParam]);

  /* ─────────────── WebRTC: start camera when call opens ─────────────── */
  useEffect(() => {
    if (!activeCallRoom) {
      // Stop stream when leaving room
      if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        setMediaStream(null);
      }
      setCameraError(null);
      return;
    }

    let cancelled = false;
    setCameraLoading(true);
    setCameraError(null);

    (async () => {
      try {
        // Check if we're on http (not https / localhost) — warn the user
        const isSecure = typeof window !== 'undefined' &&
          (window.location.protocol === 'https:' || window.location.hostname === 'localhost');

        if (!isSecure) {
          setCameraError('تحتاج إلى فتح الصفحة عبر HTTPS لتشغيل الكاميرا والصوت في المتصفح.');
          setCameraLoading(false);
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: true,
        });

        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        setMediaStream(stream);
        setCameraLoading(false);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          // Some browsers need a small delay before play
          localVideoRef.current.play().catch(() => {});
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setCameraLoading(false);
        if (err instanceof DOMException) {
          if (err.name === 'NotAllowedError') {
            setCameraError('رُفض إذن الكاميرا. يرجى النقر على أيقونة القفل في شريط العنوان والسماح بالكاميرا والميكروفون.');
          } else if (err.name === 'NotFoundError') {
            setCameraError('لم يتم العثور على كاميرا أو ميكروفون متصل بالجهاز.');
          } else {
            setCameraError(`خطأ في الكاميرا: ${err.message}`);
          }
        } else {
          setCameraError('لا يمكن تشغيل الكاميرا. تأكد من منح الإذن.');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [activeCallRoom]);

  /* Sync video track enable/disable with button state */
  useEffect(() => {
    mediaStream?.getVideoTracks().forEach(t => { t.enabled = videoOn; });
    if (localVideoRef.current && mediaStream) {
      localVideoRef.current.srcObject = mediaStream;
    }
  }, [videoOn, mediaStream]);

  /* Sync audio track enable/disable with button state */
  useEffect(() => {
    mediaStream?.getAudioTracks().forEach(t => { t.enabled = micOn; });
  }, [micOn, mediaStream]);

  /* ─────────────── Data bootstrap ─────────────── */
  useEffect(() => {
    const run = () => {
      const nextStudents = getStudents();
      setStudents(nextStudents);

      let existing = readMeetings();
      if (existing.length === 0) {
        const demo1: MeetingRecord = {
          id: 'meeting_demo_1',
          targetId: nextStudents[0]?.id || 'class_g1',
          targetName: nextStudents[0]?.fullName || 'فصل الصف الأول الابتدائي',
          roomCode: 'MASAR-ROOM-8802',
          title: 'جلسة تأسيس قرائي ونطق مباشر',
          date: new Date().toISOString().slice(0, 10),
          time: '11:00',
          type: 'internal',
          link: `${typeof window !== 'undefined' ? window.location.origin : ''}/meetings?room=MASAR-ROOM-8802&role=student`,
          notes: 'تقييم وتدريب على المخارج الصوتية والقاموس المفيد.',
        };
        const demo2: MeetingRecord = {
          id: 'meeting_demo_2',
          targetId: 'all_students',
          targetName: 'جميع الطلاب وأولياء الأمور',
          roomCode: 'ZOOM-892-1049',
          title: 'لقاء Zoom المباشر مع د. إسماعيل عيسى',
          date: new Date().toISOString().slice(0, 10),
          time: '08:00 م',
          type: 'zoom',
          link: 'https://zoom.us/j/99988877766',
          notes: 'لقاء استشاري مفتوح والإجابة على تساؤلات أولياء الأمور عبر زوم.',
        };
        writeMeetings([demo1, demo2]);
        existing = [demo1, demo2];
      }
      setMeetings(existing);
      setForm(f => ({ ...f, targetId: f.targetId || (nextStudents[0]?.id || targetOptions[0].id) }));

      // Auto-open room if ?room= is in URL
      if (roomParam) {
        const match = existing.find(m => m.roomCode === roomParam);
        setActiveCallRoom(match ?? {
          id: `meeting_url_${Date.now()}`,
          targetId: 'all_students',
          targetName: 'غرفة البث المباشر',
          roomCode: roomParam,
          title: 'جلسة مباشرة',
          date: new Date().toISOString().slice(0, 10),
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          type: 'internal',
          link: typeof window !== 'undefined' ? window.location.href : '',
          notes: '',
        });
      }
    };
    window.setTimeout(run, 0);
  }, [roomParam]);

  /* ─────────────── Helpers ─────────────── */
  const getTargetLabel = (id: string) =>
    students.find(s => s.id === id)?.fullName ??
    targetOptions.find(o => o.id === id)?.name ??
    'جمهور الجلسة';

  const saveMeeting = () => {
    if (!form.targetId || !form.date || !form.time) return;
    const roomCode = `MASAR-ROOM-${Math.floor(1000 + Math.random() * 9000)}`;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    // Student link has role=student — doctor opens without that param
    const studentLink = `${origin}/meetings?room=${roomCode}&role=student`;

    const next: MeetingRecord = {
      id: `meeting_${Date.now()}`,
      targetId: form.targetId,
      targetName: getTargetLabel(form.targetId),
      roomCode,
      title: form.title,
      date: form.date,
      time: form.time,
      type: form.type,
      link: form.type === 'internal' ? studentLink : (form.zoomUrl || studentLink),
      notes: form.notes,
    };

    const updated = [next, ...meetings];
    writeMeetings(updated);
    setMeetings(updated);
    setForm(f => ({ ...f, zoomUrl: '', notes: '' }));
    flash('تم جدولة واعتماد الجلسة بنجاح! 🎉');
  };

  const deleteMeeting = (id: string) => {
    const updated = meetings.filter(m => m.id !== id);
    writeMeetings(updated);
    setMeetings(updated);
    setConfirmDeleteId(null);
    flash('تم حذف الجلسة بنجاح.');
  };

  const copyInvite = async (meeting: MeetingRecord) => {
    const studentUrl = meeting.link.includes('role=student')
      ? meeting.link
      : `${meeting.link}${meeting.link.includes('?') ? '&' : '?'}role=student`;

    const text = [
      `🎥 ${meeting.title}`,
      `المستهدف: ${meeting.targetName}`,
      `الموعد: ${meeting.date} الساعة ${meeting.time}`,
      `رابط الانضمام للطلاب:\n${studentUrl}`,
      meeting.notes ? `ملاحظات: ${meeting.notes}` : '',
    ].filter(Boolean).join('\n');

    await navigator.clipboard.writeText(text);
    flash('تم نسخ رابط الدعوة الخاص بالطلاب والحضور ✅');
  };

  const flash = (msg: string) => {
    setCopyMessage(msg);
    window.setTimeout(() => setCopyMessage(''), 4000);
  };

  const sendChatMessage = () => {
    if (!newChatText.trim()) return;
    setChatMessages(prev => [
      ...prev,
      {
        sender: isHost ? 'د. إسماعيل عيسى' : 'الطالب / ولي الأمر',
        text: newChatText.trim(),
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setNewChatText('');
  };

  /* ─── Host participant controls ─── */
  const toggleMic   = (id: string) => isHost && setParticipants(p => p.map(x => x.id === id ? { ...x, micMuted: !x.micMuted } : x));
  const toggleVideo = (id: string) => isHost && setParticipants(p => p.map(x => x.id === id ? { ...x, videoOff: !x.videoOff } : x));
  const kickUser    = (id: string) => isHost && setParticipants(p => p.filter(x => x.id !== id));
  const muteAll     = ()           => isHost && setParticipants(p => p.map(x => x.role !== 'doctor' ? { ...x, micMuted: true } : x));

  if (!sessionLoaded) return null; // Avoid role flash

  /* ─────────────── RENDER ─────────────── */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 font-sans" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">

          {/* ── Page Header ── */}
          <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black text-teal-700 uppercase tracking-widest">نظام الجلسات والتواصل المباشر</p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-950">
                  {isHost ? 'لوحة إدارة الاجتماعات المباشرة' : 'غرفة البث التفاعلي المباشر'}
                </h1>
                <p className="mt-1.5 max-w-2xl text-xs sm:text-sm font-bold text-slate-500">
                  {isHost
                    ? 'إنشاء الجلسات وإرسال الدعوات وإدارة الحضور والسبورة التفاعلية والتحكم الكامل بالغرفة.'
                    : 'انضمام مباشر لجلسة التأهيل مع د. إسماعيل عيسى بالصوت والصورة والسبورة التفاعلية.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 self-start">
                {isHost && (
                  <button
                    onClick={() => {
                      const instantMeeting: MeetingRecord = {
                        id: `instant_${Date.now()}`,
                        targetId: 'all_students',
                        targetName: 'غرفة بث مباشر فورية',
                        roomCode: `MASAR-LIVE-${Math.floor(1000 + Math.random() * 9000)}`,
                        title: 'جلسة بث مباشر تفاعلية فورية',
                        date: new Date().toISOString().slice(0, 10),
                        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
                        type: 'internal',
                        link: `${typeof window !== 'undefined' ? window.location.origin : ''}/meetings?room=MASAR-LIVE-NOW&role=student`,
                        notes: 'بث مباشر فوري مفتوح لجميع الحضور.',
                      };
                      setActiveCallRoom(instantMeeting);
                    }}
                    className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-xs font-black text-white hover:bg-teal-700 transition shadow-sm cursor-pointer active:scale-95"
                  >
                    <Video size={16} />
                    <span>🚀 بدء بث فوري الآن</span>
                  </button>
                )}
                <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-black text-teal-800">
                  <Radio size={15} className="animate-pulse text-teal-500" />
                  {isHost ? 'وضع المضيف (د. إسماعيل)' : 'وضع الطالب / الحضور'}
                </span>
              </div>
            </div>
          </header>

          {/* ════════════════════════════════════════════
              ACTIVE LIVE CALL STUDIO — LIGHT THEME
          ════════════════════════════════════════════ */}
          {activeCallRoom && (
            <div className="mb-8 overflow-hidden rounded-3xl border-2 border-teal-500 bg-white shadow-xl">

              {/* Call Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-l from-teal-50 to-white px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <div>
                    <h2 className="font-black text-slate-900 text-base">{activeCallRoom.title}</h2>
                    <p className="text-xs font-bold text-teal-600">
                      {activeCallRoom.targetName} · رمز الغرفة: <span className="font-black text-slate-700">{activeCallRoom.roomCode}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isHost && (
                    <button onClick={muteAll} className="flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-black text-amber-800 hover:bg-amber-100 transition">
                      <VolumeX size={15} className="text-amber-600" /> كتم جميع الطلاب
                    </button>
                  )}
                  <button
                    onClick={() => setShowWhiteboard(!showWhiteboard)}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition border ${
                      showWhiteboard ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-teal-700 border-teal-300 hover:bg-teal-50'
                    }`}
                  >
                    <PenTool size={15} /> السبورة التفاعلية
                  </button>
                  <button
                    onClick={() => { setActiveCallRoom(null); setShowWhiteboard(false); }}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-4 py-2 text-xs font-black text-white hover:bg-rose-600 transition"
                  >
                    <PhoneOff size={15} /> {isHost ? 'إنهاء الجلسة' : 'مغادرة'}
                  </button>
                </div>
              </div>

              {/* Call Body */}
              <div className="grid lg:grid-cols-12 min-h-[500px]">

                {/* Video / Whiteboard Section */}
                <div className="lg:col-span-8 p-4 space-y-4 bg-slate-50">

                  {showWhiteboard ? (
                    <InteractiveWhiteboard roomCode={activeCallRoom.roomCode} />
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4 h-[380px]">

                      {/* Local Video */}
                      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-900 shadow-inner">
                        {/* Video element always mounted so the ref is available */}
                        <video
                          ref={localVideoRef}
                          autoPlay
                          playsInline
                          muted
                          className={`absolute inset-0 h-full w-full object-cover ${videoOn && !cameraError ? 'opacity-100' : 'opacity-0'} transform -scale-x-100`}
                        />

                        {/* Overlay when no video */}
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
                                <p className="text-xs font-black text-amber-200">⚠️ {cameraError}</p>
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

                        {/* Label */}
                        <div className="absolute top-3 right-3 z-10 rounded-full bg-black/50 backdrop-blur px-3 py-1 text-[11px] font-black text-white">
                          {isHost ? 'د. إسماعيل عيسى — المضيف' : 'كاميرتك المحلية'}
                        </div>
                        <div className="absolute bottom-3 left-3 z-10 flex gap-1.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${micOn ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {micOn ? '🎙 صوت' : '🔇 كتوم'}
                          </span>
                        </div>
                      </div>

                      {/* Remote Video Placeholder */}
                      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-teal-800 to-slate-800 shadow-inner">
                        <div className="absolute inset-0 grid place-items-center text-center p-4">
                          <div className="space-y-3">
                            <div className="h-16 w-16 rounded-full bg-teal-400/20 border-2 border-teal-400/40 grid place-items-center mx-auto">
                              <User size={36} className="text-teal-300" />
                            </div>
                            <p className="text-xs font-black text-white">
                              {isHost ? activeCallRoom.targetName : 'د. إسماعيل عيسى'}
                            </p>
                            <p className="text-[11px] font-bold text-teal-200">
                              {isHost ? 'بث الطلاب والحضور' : 'استشاري المنصة'}
                            </p>
                            <span className="inline-block rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                              متصل ✓
                            </span>
                          </div>
                        </div>
                        <div className="absolute top-3 right-3 rounded-full bg-black/50 backdrop-blur px-3 py-1 text-[11px] font-black text-white">
                          {isHost ? 'الطلاب والحضور' : 'المضيف'}
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Controls Bar */}
                  <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <CallButton active={micOn}    onClick={() => setMicOn(!micOn)}       title={micOn    ? 'كتم الصوت'    : 'تشغيل الصوت'}>
                      {micOn    ? <Mic size={20} />    : <MicOff size={20} />}
                    </CallButton>
                    <CallButton active={videoOn}  onClick={() => setVideoOn(!videoOn)}   title={videoOn  ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}>
                      {videoOn  ? <Video size={20} />  : <VideoOff size={20} />}
                    </CallButton>
                    <CallButton active={screenShare} onClick={() => setScreenShare(!screenShare)} title="مشاركة الشاشة">
                      <Monitor size={20} />
                    </CallButton>
                    <button
                      onClick={() => { setActiveCallRoom(null); setShowWhiteboard(false); }}
                      className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-xs font-black text-white hover:bg-rose-600 transition"
                    >
                      <PhoneOff size={18} /> مغادرة
                    </button>
                  </div>

                </div>

                {/* Sidebar: Participants + Chat */}
                <div className="lg:col-span-4 border-r border-slate-100 bg-white p-4 flex flex-col gap-4">

                  {/* Participants */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h3 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                        <Users size={15} className="text-teal-600" /> الحضور ({participants.length})
                      </h3>
                      {isHost && (
                        <span className="text-[10px] font-black text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 border border-amber-200">
                          تحكّم الدكتور
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {participants.map(p => (
                        <div key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                          <div>
                            <p className="text-xs font-black text-slate-900">{p.name}</p>
                            <p className="text-[10px] font-bold text-slate-400">
                              {p.role === 'doctor' ? 'مضيف / استشاري' : 'طالب مشارك'}
                            </p>
                          </div>
                          {/* Host controls only for non-doctor */}
                          {isHost && p.role !== 'doctor' && (
                            <div className="flex gap-1">
                              <button onClick={() => toggleMic(p.id)}
                                className={`p-1.5 rounded-lg border text-xs transition ${p.micMuted ? 'bg-rose-50 text-rose-500 border-rose-200' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
                                title={p.micMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
                              >
                                {p.micMuted ? <MicOff size={13} /> : <Mic size={13} />}
                              </button>
                              <button onClick={() => toggleVideo(p.id)}
                                className={`p-1.5 rounded-lg border text-xs transition ${p.videoOff ? 'bg-rose-50 text-rose-500 border-rose-200' : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'}`}
                                title={p.videoOff ? 'تشغيل الكاميرا' : 'إيقاف الكاميرا'}
                              >
                                {p.videoOff ? <VideoOff size={13} /> : <Video size={13} />}
                              </button>
                              <button onClick={() => kickUser(p.id)}
                                className="p-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100 transition"
                                title="طرد من الجلسة"
                              >
                                <UserX size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chat */}
                  <div className="flex-1 flex flex-col gap-2 border-t border-slate-100 pt-3">
                    <h3 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <MessageSquare size={15} className="text-teal-600" /> محادثة الجلسة
                    </h3>
                    <div className="flex-1 space-y-2 max-h-44 overflow-y-auto">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                          <p className="text-[10px] font-black text-teal-700">
                            {msg.sender} <span className="text-slate-400 font-bold">· {msg.time}</span>
                          </p>
                          <p className="mt-0.5 text-xs font-bold text-slate-800">{msg.text}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <input
                        type="text"
                        value={newChatText}
                        onChange={e => setNewChatText(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                        placeholder="اكتب رسالة..."
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-teal-500"
                      />
                      <button onClick={sendChatMessage}
                        className="rounded-xl bg-teal-600 px-3.5 py-2 text-xs font-black text-white hover:bg-teal-700 transition"
                      >
                        إرسال
                      </button>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}

          {/* ════════════════════════════════════════════
              SCHEDULE MANAGEMENT (Doctor) / MEETINGS LIST (Student)
          ════════════════════════════════════════════ */}
          {isHost ? (
            <section className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">

              {/* Schedule Form */}
              <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24 xl:self-start space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                    <Video size={20} />
                  </span>
                  <div>
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider">إنشاء موعد جديد</p>
                    <h2 className="text-base font-black text-slate-950">بيانات الجلسة المباشرة</h2>
                  </div>
                </div>

                <div className="space-y-3 text-right">
                  <FormLabel label="الجهة أو الحضور المستهدف">
                    <select value={form.targetId} onChange={e => setForm({ ...form, targetId: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-black text-slate-900 outline-none focus:border-teal-600"
                    >
                      <optgroup label="── طالب فردي ──">
                        {students.map(s => <option key={s.id} value={s.id}>{s.fullName} ({s.grade})</option>)}
                      </optgroup>
                      <optgroup label="── فصول ودورات ──">
                        {targetOptions.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </optgroup>
                    </select>
                  </FormLabel>

                  <FormLabel label="نوع الاجتماع">
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as 'internal' | 'zoom' })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-black text-slate-900 outline-none focus:border-teal-600"
                    >
                      <option value="internal">🎥 غرفة البث المباشر الخاصة بالمنصة</option>
                      <option value="zoom">🔗 رابط Zoom خارجي</option>
                    </select>
                  </FormLabel>

                  <Field label="عنوان الجلسة" value={form.title} onChange={v => setForm({ ...form, title: v })} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="التاريخ" type="date" value={form.date} onChange={v => setForm({ ...form, date: v })} />
                    <Field label="الوقت"   type="time" value={form.time} onChange={v => setForm({ ...form, time: v })} />
                  </div>
                  {form.type === 'zoom' && (
                    <Field label="رابط Zoom" value={form.zoomUrl} onChange={v => setForm({ ...form, zoomUrl: v })} placeholder="https://zoom.us/j/..." />
                  )}
                  <FormLabel label="ملاحظات">
                    <textarea
                      value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                      placeholder="تعليمات الجلسة أو المهارات المراد تدريبها..."
                      className="min-h-[72px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600"
                    />
                  </FormLabel>
                  <button onClick={saveMeeting}
                    className="w-full rounded-xl bg-teal-600 py-3 text-xs font-black text-white hover:bg-teal-700 transition shadow-md shadow-teal-600/20 active:scale-95"
                  >
                    جدولة واعتمد الجلسة
                  </button>
                </div>
              </aside>

              {/* Meetings List */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <CalendarClock size={22} className="text-teal-600" />
                  <h2 className="text-lg font-black text-slate-950">الجلسات المجدولة</h2>
                </div>

                {copyMessage && (
                  <div className="rounded-xl bg-teal-50 border border-teal-200 p-3 text-xs font-black text-teal-800">
                    {copyMessage}
                  </div>
                )}

                <div className="grid gap-3">
                  {meetings.length > 0 ? meetings.map(m => (
                    <article key={m.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:border-teal-300 hover:bg-white transition">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="rounded-full bg-teal-100 border border-teal-200 px-2.5 py-0.5 text-[10px] font-black text-teal-800">
                              {m.type === 'internal' ? '🎥 غرفة المنصة' : '🔗 Zoom'}
                            </span>
                            <code className="text-[10px] font-black text-slate-400">{m.roomCode}</code>
                          </div>
                          <h3 className="text-sm font-black text-slate-950">{m.title}</h3>
                          <p className="text-xs font-bold text-slate-500">
                            المستهدف: <span className="text-slate-800 font-black">{m.targetName}</span> · {m.date} — {m.time}
                          </p>
                          {m.notes && <p className="text-xs font-bold text-slate-400">ملاحظة: {m.notes}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => copyInvite(m)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 transition"
                          >
                            <Copy size={14} /> نسخ الدعوة
                          </button>
                          {m.type === 'zoom' ? (
                            <a
                              href={m.link && m.link.startsWith('http') ? m.link : 'https://zoom.us/join'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 transition shadow-sm"
                            >
                              <Video size={14} /> فتح اجتماع Zoom 🚀
                            </a>
                          ) : (
                            <button onClick={() => setActiveCallRoom(m)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-black text-white hover:bg-teal-700 transition shadow-sm"
                            >
                              <Video size={14} /> بدء الجلسة كالمضيف
                            </button>
                          )}
                          <button onClick={() => setConfirmDeleteId(m.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-600 hover:bg-rose-100 transition"
                          >
                            <Trash2 size={14} /> حذف
                          </button>
                        </div>
                      </div>
                    </article>
                  )) : (
                    <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-xs font-bold text-slate-400">
                      لا توجد جلسات بعد. أنشئ أول جلسة مباشرة.
                    </p>
                  )}
                </div>
              </div>

            </section>
          ) : (
            /* ── Student / Attendee View ── */
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <CalendarClock size={22} className="text-teal-600" />
                <h2 className="text-xl font-black text-slate-950">الجلسات المتاحة لك</h2>
              </div>
              <div className="grid gap-3">
                {meetings.map(m => (
                  <article key={m.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${m.type === 'zoom' ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'bg-teal-100 text-teal-800 border border-teal-200'}`}>
                        {m.type === 'zoom' ? '🔗 اجتماع Zoom' : '🎥 غرفة المنصة المباشرة'}
                      </span>
                      <h3 className="text-base font-black text-slate-950 mt-1">{m.title}</h3>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">{m.date} — الساعة {m.time}</p>
                    </div>
                    {m.type === 'zoom' ? (
                      <a
                        href={m.link && m.link.startsWith('http') ? m.link : 'https://zoom.us/join'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-black text-white hover:bg-blue-700 transition shadow-sm shrink-0 inline-flex items-center gap-1.5"
                      >
                        <Video size={15} /> الانضمام عبر Zoom 🚀
                      </a>
                    ) : (
                      <button onClick={() => setActiveCallRoom(m)}
                        className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-black text-white hover:bg-teal-700 transition shadow-sm shrink-0 inline-flex items-center gap-1.5"
                      >
                        <Video size={15} /> الانضمام للجلسة
                      </button>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}

        </main>
      </div>

      {/* ── Delete Confirm Modal ── */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-800/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-right space-y-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={26} className="text-rose-500 shrink-0" />
              <h3 className="text-lg font-black text-slate-900">تأكيد حذف الجلسة</h3>
            </div>
            <p className="text-xs font-bold text-slate-500">هل أنت متأكد من حذف هذه الجلسة؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-100 rounded-xl transition">إلغاء</button>
              <button onClick={() => deleteMeeting(confirmDeleteId!)} className="rounded-xl bg-rose-500 px-5 py-2.5 text-xs font-black text-white hover:bg-rose-600 transition shadow-sm">تأكيد الحذف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Interactive Whiteboard ─────────────── */
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

  const stroke = (fromX: number, fromY: number, toX: number, toY: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const sc = tool === 'eraser' ? '#ffffff' : color;
    const lw = tool === 'eraser' ? 24 : 4;
    ctx.strokeStyle = sc; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(toX, toY); ctx.stroke();
    channelRef.current?.postMessage({ type: 'draw', color: sc, lw, fx: fromX, fy: fromY, tx: toX, ty: toY });
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
          <PenTool size={15} /> السبورة التفاعلية الحية (مزامنة فورية)
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
            {(['pen', 'eraser'] as const).map(t => (
              <button key={t} onClick={() => setTool(t)}
                className={`px-3 py-1 rounded-lg text-xs font-black transition ${tool === t ? 'bg-teal-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
              >
                {t === 'pen' ? 'قلم' : <span className="flex items-center gap-1"><Eraser size={13} /> ممحاة</span>}
              </button>
            ))}
          </div>
          {tool === 'pen' && (
            <div className="flex gap-1.5 items-center">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`h-6 w-6 rounded-full transition ${color === c ? 'ring-2 ring-offset-1 ring-slate-500 scale-125' : ''}`}
                />
              ))}
            </div>
          )}
          <button onClick={clearAll}
            className="flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-600 hover:bg-rose-100 transition"
          >
            <RotateCcw size={13} /> مسح الكل
          </button>
        </div>
      </div>

      <div className="relative h-[320px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
        <canvas
          ref={canvasRef}
          width={900}
          height={320}
          onMouseDown={onStart} onMouseMove={onMove} onMouseUp={onEnd} onMouseLeave={onEnd}
          onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd}
          className="h-full w-full cursor-crosshair touch-none"
        />
      </div>
    </div>
  );
}

/* ─────────────── Reusable UI Atoms ─────────────── */
function CallButton({ active, onClick, title, children }: { active: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button onClick={onClick} title={title}
      className={`grid h-11 w-11 place-items-center rounded-xl border transition ${
        active ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200' : 'bg-rose-500 text-white border-rose-500 hover:bg-rose-600'
      }`}
    >
      {children}
    </button>
  );
}

function FormLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <FormLabel label={label}>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600"
      />
    </FormLabel>
  );
}
