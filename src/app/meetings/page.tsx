'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Video, VideoOff, Mic, MicOff, Monitor, PhoneOff, Copy, 
  Trash2, CalendarClock, PenTool, Radio, User, 
  ShieldCheck, AlertTriangle, Users, Eraser, RotateCcw, 
  Volume2, VolumeX, UserX, Lock, ShieldAlert
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { getStudents, StudentRecord } from '@/lib/localDb';

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

function readMeetings(): MeetingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as MeetingRecord[];
  } catch {
    return [];
  }
}

function writeMeetings(meetings: MeetingRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(meetings));
}

export default function MeetingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <MeetingsContent />
    </Suspense>
  );
}

function MeetingsContent() {
  const searchParams = useSearchParams();
  const roomParam = searchParams.get('room');

  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  
  // Active Call Room & Video Streams
  const [activeCallRoom, setActiveCallRoom] = useState<MeetingRecord | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Real Local WebRTC Media Stream
  const doctorVideoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState(false);

  // Participants & Host Control Panel States
  const [participants, setParticipants] = useState<Participant[]>([
    { id: 'dr_1', name: 'د. إسماعيل عيسى (استشاري المنصة)', role: 'doctor', micMuted: false, videoOff: false },
    { id: 'p_1', name: 'ربيع إسماعيل عيسى (طالب المباشر)', role: 'student', micMuted: false, videoOff: false },
    { id: 'p_2', name: 'حسن أحمد (مشارك)', role: 'student', micMuted: true, videoOff: false },
  ]);

  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'د. إسماعيل عيسى', text: 'أهلاً بك في جلسة المتابعة المباشرة على منصة مسار.', time: '10:00 ص' }
  ]);
  const [newChatText, setNewChatText] = useState('');

  const [form, setForm] = useState({
    targetId: '',
    title: 'جلسة تأهيل ومتابعة مباشرة',
    date: new Date().toISOString().slice(0, 10),
    time: '10:00',
    type: 'internal' as 'internal' | 'zoom',
    zoomUrl: '',
    notes: '',
  });
  const [copyMessage, setCopyMessage] = useState('');

  // Setup WebRTC Camera Stream when call becomes active
  useEffect(() => {
    if (!activeCallRoom) {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
        setMediaStream(null);
      }
      return;
    }

    let isMounted = true;
    async function startCamera() {
      try {
        setCameraError(false);
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (isMounted) {
          setMediaStream(stream);
          if (doctorVideoRef.current) {
            doctorVideoRef.current.srcObject = stream;
          }
        }
      } catch (err) {
        console.warn('Camera/Mic permission denied or not available:', err);
        if (isMounted) setCameraError(true);
      }
    }

    startCamera();

    return () => {
      isMounted = false;
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [activeCallRoom]);

  // Handle Video Track Toggle
  useEffect(() => {
    if (mediaStream) {
      mediaStream.getVideoTracks().forEach((track) => {
        track.enabled = videoOn;
      });
    }
  }, [videoOn, mediaStream]);

  // Handle Mic Track Toggle
  useEffect(() => {
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = micOn;
      });
    }
  }, [micOn, mediaStream]);

  const refresh = () => {
    const nextStudents = getStudents();
    setStudents(nextStudents);
    const existing = readMeetings();
    
    // Default demo meeting if empty
    if (existing.length === 0) {
      const demoMeeting: MeetingRecord = {
        id: 'meeting_demo_1',
        targetId: nextStudents[0]?.id || 'class_g1',
        targetName: nextStudents[0]?.fullName || 'فصل الصف الأول الابتدائي',
        roomCode: 'MASAR-ROOM-8802',
        title: 'جلسة تأسيس قرائي ونطق مباشر',
        date: new Date().toISOString().slice(0, 10),
        time: '11:00',
        type: 'internal',
        link: `${typeof window !== 'undefined' ? window.location.origin : ''}/meetings?room=MASAR-ROOM-8802`,
        notes: 'جلسة تقييم وتدريب على المخارج الصوتية والقاموس المفيد.',
      };
      writeMeetings([demoMeeting]);
      setMeetings([demoMeeting]);
    } else {
      setMeetings(existing);
    }

    const defaultTarget = nextStudents[0]?.id || targetOptions[0].id;
    setForm((current) => ({ ...current, targetId: current.targetId || defaultTarget }));

    // Auto-launch room if roomParam exists in URL
    if (roomParam) {
      const match = (existing.length > 0 ? existing : readMeetings()).find((m) => m.roomCode === roomParam);
      if (match) {
        setActiveCallRoom(match);
      } else {
        setActiveCallRoom({
          id: `meeting_url_${Date.now()}`,
          targetId: 'all_students',
          targetName: 'غرفة البث المباشر المفتوحة',
          roomCode: roomParam,
          title: 'جلسة تواصل مباشرة',
          date: new Date().toISOString().slice(0, 10),
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          type: 'internal',
          link: typeof window !== 'undefined' ? window.location.href : '',
          notes: 'انضمام مباشر عبر الرابط',
        });
      }
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const getTargetLabel = (targetId: string) => {
    const foundStudent = students.find((s) => s.id === targetId);
    if (foundStudent) return foundStudent.fullName;
    const foundOption = targetOptions.find((o) => o.id === targetId);
    if (foundOption) return foundOption.name;
    return 'جمهور الجلسة';
  };

  const saveMeeting = () => {
    if (!form.targetId || !form.date || !form.time) return;
    const roomCode = `MASAR-ROOM-${Math.floor(1000 + Math.random() * 9000)}`;
    const internalLink = typeof window !== 'undefined' ? `${window.location.origin}/meetings?room=${roomCode}` : '';
    
    const targetName = getTargetLabel(form.targetId);

    const next: MeetingRecord = {
      id: `meeting_${Date.now()}`,
      targetId: form.targetId,
      targetName,
      roomCode,
      title: form.title,
      date: form.date,
      time: form.time,
      type: form.type,
      link: form.type === 'internal' ? internalLink : (form.zoomUrl || internalLink),
      notes: form.notes,
    };

    const updated = [next, ...meetings];
    writeMeetings(updated);
    setMeetings(updated);
    setForm((current) => ({ ...current, zoomUrl: '', notes: '' }));
    setCopyMessage('تم جدول واعتمد الجلسة بنجاح!');
    setTimeout(() => setCopyMessage(''), 3000);
  };

  const deleteMeeting = (id: string) => {
    const updated = meetings.filter((m) => m.id !== id);
    writeMeetings(updated);
    setMeetings(updated);
    setConfirmDeleteId(null);
    setCopyMessage('تم حذف الجلسة بنجاح.');
    setTimeout(() => setCopyMessage(''), 3000);
  };

  const copyInvite = async (meeting: MeetingRecord) => {
    const text = `🎥 ${meeting.title}\nالمستهدف: ${meeting.targetName}\nالموعد: ${meeting.date} - الساعة ${meeting.time}\nرابط الدخول المباشر للجلسة:\n${meeting.link}\n${meeting.notes ? `ملاحظات الجلسة: ${meeting.notes}` : ''}`;
    await navigator.clipboard.writeText(text);
    setCopyMessage('تم نسخ دعوة الاجتماع ورابط الجلسة المباشر بنجاح!');
    setTimeout(() => setCopyMessage(''), 4000);
  };

  const launchCall = (meeting: MeetingRecord) => {
    setActiveCallRoom(meeting);
  };

  const sendChatMessage = () => {
    if (!newChatText.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { sender: 'د. إسماعيل عيسى', text: newChatText.trim(), time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setNewChatText('');
  };

  // Host Controls by Dr. Ismail
  const toggleParticipantMic = (participantId: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, micMuted: !p.micMuted } : p))
    );
  };

  const toggleParticipantVideo = (participantId: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, videoOff: !p.videoOff } : p))
    );
  };

  const kickParticipant = (participantId: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
  };

  const muteAllParticipants = () => {
    setParticipants((prev) =>
      prev.map((p) => (p.role !== 'doctor' ? { ...p, micMuted: true } : p))
    );
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950 font-sans" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          
          <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black text-teal-800 uppercase tracking-wider">نظام الجلسات والتواصل المباشر</p>
                <h1 className="mt-1 text-3xl font-black text-slate-950 md:text-4xl">غرفة البث المباشر وجدول الاجتماعات</h1>
                <p className="mt-2 max-w-3xl text-xs sm:text-sm font-bold text-slate-600">
                  نظام تواصل مرئي متكامل خاص بالمنصة (Live Studio) للطلاب أو الفصول بالكامل مع سبورة تفاعلية وتحكم كامل للدكتور.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-black text-teal-800">
                <Radio size={16} className="text-teal-600 animate-pulse" />
                <span>نظام الاتصال المباشر مفعل</span>
              </span>
            </div>
          </header>

          {/* ACTIVE LIVE VIDEO CALL STUDIO INTERFACE */}
          {activeCallRoom && (
            <div className="mb-8 overflow-hidden rounded-3xl border-2 border-teal-600 bg-slate-950 text-white shadow-2xl transition">
              
              {/* Call Top Control Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 bg-slate-900/95 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="h-3.5 w-3.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <div>
                    <h2 className="font-black text-white text-base">{activeCallRoom.title}</h2>
                    <p className="text-xs font-bold text-teal-300">
                      المستهدف: {activeCallRoom.targetName} · رمز الغرفة: {activeCallRoom.roomCode}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={muteAllParticipants}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3.5 py-2 text-xs font-black text-slate-200 hover:bg-slate-700 transition border border-white/10"
                    title="كتم الميكروفون عن كافة الطلاب الحضور"
                  >
                    <VolumeX size={16} className="text-amber-400" />
                    <span>كتم جميع الطلاب</span>
                  </button>

                  <button
                    onClick={() => setShowWhiteboard(!showWhiteboard)}
                    className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition ${
                      showWhiteboard ? 'bg-teal-400 text-slate-950' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <PenTool size={16} />
                    <span>السبورة التفاعلية</span>
                  </button>

                  <button
                    onClick={() => setActiveCallRoom(null)}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 transition shadow-sm"
                  >
                    <PhoneOff size={16} />
                    <span>إنهاء الجلسة للجميع</span>
                  </button>
                </div>
              </div>

              {/* Call Main Screen & Grid */}
              <div className="grid lg:grid-cols-12 min-h-[480px]">
                
                {/* Video Streams & Whiteboard Area */}
                <div className="p-4 space-y-4 lg:col-span-8">
                  
                  {showWhiteboard ? (
                    <InteractiveWhiteboard />
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 h-[380px]">
                      
                      {/* Doctor Real Camera Feed / Video Box */}
                      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-white/10 flex flex-col justify-between p-4">
                        <div className="flex justify-between items-center z-10">
                          <span className="rounded-full bg-slate-950/80 backdrop-blur px-3 py-1 text-[11px] font-black text-teal-300">
                            د. إسماعيل عيسى (المضيف)
                          </span>
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        </div>

                        <div className="absolute inset-0 grid place-items-center bg-slate-950">
                          {videoOn && !cameraError ? (
                            <video
                              ref={doctorVideoRef}
                              autoPlay
                              playsInline
                              muted
                              className="h-full w-full object-cover transform -scale-x-100"
                            />
                          ) : (
                            <div className="text-center space-y-2">
                              <ShieldCheck size={56} className="mx-auto text-teal-400 opacity-80" />
                              <p className="text-xs font-black text-slate-300">الكاميرا متوقفة أو غير متاحة في المتصفح</p>
                            </div>
                          )}
                        </div>

                        <div className="z-10 flex items-center justify-between text-xs font-bold text-white/80 bg-slate-950/60 p-2 rounded-xl backdrop-blur">
                          <span>{micOn ? '🎙️ الصوت يعمل' : '🔇 الميكروفون مكتوم'}</span>
                          <span>1080p HD</span>
                        </div>
                      </div>

                      {/* Student Stream Box */}
                      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-white/10 flex flex-col justify-between p-4">
                        <div className="flex justify-between items-center z-10">
                          <span className="rounded-full bg-slate-950/80 backdrop-blur px-3 py-1 text-[11px] font-black text-emerald-300">
                            {activeCallRoom.targetName}
                          </span>
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        </div>

                        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950">
                          <div className="text-center space-y-2">
                            <User size={56} className="mx-auto text-emerald-400 opacity-80" />
                            <p className="text-xs font-black text-slate-300">البث المباشر للمشاركين متصل</p>
                          </div>
                        </div>

                        <div className="z-10 flex items-center justify-between text-xs font-bold text-white/80 bg-slate-950/60 p-2 rounded-xl backdrop-blur">
                          <span>🎙️ صوت الحضور مفعل</span>
                          <span>اتصال ممتاز</span>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Call Bottom Action Toolbar */}
                  <div className="flex items-center justify-center gap-4 rounded-2xl bg-slate-900 p-3 border border-white/10">
                    <button
                      onClick={() => setMicOn(!micOn)}
                      className={`grid h-11 w-11 place-items-center rounded-xl transition ${
                        micOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white'
                      }`}
                      title="الميكروفون"
                    >
                      {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>

                    <button
                      onClick={() => setVideoOn(!videoOn)}
                      className={`grid h-11 w-11 place-items-center rounded-xl transition ${
                        videoOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white'
                      }`}
                      title="الكاميرا"
                    >
                      {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
                    </button>

                    <button
                      onClick={() => setScreenShare(!screenShare)}
                      className={`grid h-11 w-11 place-items-center rounded-xl transition ${
                        screenShare ? 'bg-teal-400 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700'
                      }`}
                      title="مشاركة الشاشة"
                    >
                      <Monitor size={20} />
                    </button>

                    <button
                      onClick={() => setActiveCallRoom(null)}
                      className="flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-2.5 text-xs font-black text-white hover:bg-rose-700 transition"
                    >
                      <PhoneOff size={18} />
                      <span>مغادرة الغرفة</span>
                    </button>
                  </div>

                </div>

                {/* Host Control Panel & Live Chat Side */}
                <div className="lg:col-span-4 border-r border-white/10 bg-slate-900/80 p-4 flex flex-col justify-between space-y-4">
                  
                  {/* Host Control List of Connected Participants */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <h3 className="text-xs font-black text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Users size={16} /> الحضور والتحكّم ({participants.length})
                      </h3>
                      <span className="text-[10px] font-black text-slate-400">لوحة تحكّم د. إسماعيل</span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {participants.map((p) => (
                        <div key={p.id} className="rounded-xl bg-slate-950 p-3 border border-white/10 flex items-center justify-between gap-2 text-right">
                          <div>
                            <p className="text-xs font-black text-white">{p.name}</p>
                            <p className="text-[10px] font-bold text-slate-400">{p.role === 'doctor' ? 'استشاري / المضيف' : 'طالب مشارك'}</p>
                          </div>
                          
                          {p.role !== 'doctor' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => toggleParticipantMic(p.id)}
                                className={`p-1.5 rounded-lg border transition ${
                                  p.micMuted ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-slate-800 text-slate-300 border-white/10'
                                }`}
                                title={p.micMuted ? 'إلغاء كتم الميكروفون' : 'كتم الميكروفون'}
                              >
                                {p.micMuted ? <MicOff size={14} /> : <Mic size={14} />}
                              </button>

                              <button
                                onClick={() => toggleParticipantVideo(p.id)}
                                className={`p-1.5 rounded-lg border transition ${
                                  p.videoOff ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-slate-800 text-slate-300 border-white/10'
                                }`}
                                title={p.videoOff ? 'تشغيل الكاميرا' : 'إيقاف الكاميرا'}
                              >
                                {p.videoOff ? <VideoOff size={14} /> : <Video size={14} />}
                              </button>

                              <button
                                onClick={() => kickParticipant(p.id)}
                                className="p-1.5 rounded-lg bg-rose-600/80 text-white hover:bg-rose-700 transition"
                                title="طرد من الجلسة"
                              >
                                <UserX size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Chat Box */}
                  <div className="space-y-3 pt-2 border-t border-white/10">
                    <h3 className="text-xs font-black text-teal-300 uppercase tracking-wider">محادثة الجلسة</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className="rounded-xl bg-slate-950 p-2.5 border border-white/5 text-right">
                          <p className="text-[10px] font-black text-teal-300">{msg.sender} <span className="text-[9px] text-slate-400 opacity-60">· {msg.time}</span></p>
                          <p className="mt-0.5 text-xs font-bold text-slate-200">{msg.text}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={newChatText}
                        onChange={(e) => setNewChatText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                        placeholder="اكتب رسالة..."
                        className="flex-1 rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs font-bold text-white outline-none focus:border-teal-400"
                      />
                      <button
                        onClick={sendChatMessage}
                        className="rounded-xl bg-teal-400 px-3.5 py-2 text-xs font-black text-slate-950 hover:bg-teal-300 transition"
                      >
                        إرسال
                      </button>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* MAIN MEETINGS MANAGEMENT GRID */}
          <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            
            {/* New Schedule Form */}
            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24 xl:self-start space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  <Video size={20} />
                </span>
                <div>
                  <p className="text-xs font-black text-slate-500">إنشاء موعد جديد</p>
                  <h2 className="text-lg font-black text-slate-950">بيانات الجلسة المباشرة</h2>
                </div>
              </div>

              <div className="space-y-3.5 text-right">
                
                {/* Target Audience Dropdown (Individual Student OR Full Class / Course) */}
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-slate-700">الجهة أو الحضور المستهدف</span>
                  <select 
                    value={form.targetId} 
                    onChange={(event) => setForm({ ...form, targetId: event.target.value })} 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-black text-slate-900 outline-none focus:border-teal-600"
                  >
                    <optgroup label="طالب فردي">
                      {students.map((student) => (
                        <option key={student.id} value={student.id}>{student.fullName} ({student.grade})</option>
                      ))}
                    </optgroup>
                    <optgroup label="فصول دراسية ودورات جماعية">
                      {targetOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-slate-700">نوع نظام الاتصال</span>
                  <select 
                    value={form.type} 
                    onChange={(event) => setForm({ ...form, type: event.target.value as 'internal' | 'zoom' })} 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-black text-slate-900 outline-none focus:border-teal-600"
                  >
                    <option value="internal">🎥 غرفة البث المباشر الخاصة بالمنصة (Masar Native Live)</option>
                    <option value="zoom">🔗 رابط Zoom خارجي</option>
                  </select>
                </label>

                <Field label="عنوان الجلسة" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
                
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="التاريخ" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} />
                  <Field label="الوقت" type="time" value={form.time} onChange={(value) => setForm({ ...form, time: value })} />
                </div>

                {form.type === 'zoom' && (
                  <Field label="رابط Zoom الخارجي" value={form.zoomUrl} onChange={(value) => setForm({ ...form, zoomUrl: value })} placeholder="https://zoom.us/j/..." />
                )}

                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-slate-700">ملاحظات الجلسة والتعليمات</span>
                  <textarea 
                    value={form.notes} 
                    onChange={(event) => setForm({ ...form, notes: event.target.value })} 
                    placeholder="تعليمات الجلسة أو المهارات المراد تدريب الطفل عليها..."
                    className="min-h-20 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600" 
                  />
                </label>

                <button 
                  onClick={saveMeeting} 
                  className="w-full rounded-xl bg-teal-600 px-4 py-3 text-xs font-black text-white hover:bg-teal-700 transition shadow-md shadow-teal-600/20 active:scale-95"
                >
                  جدولة واعتمد الجلسة
                </button>

              </div>
            </aside>

            {/* Saved Scheduled Meetings */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <CalendarClock className="text-teal-700" size={22} />
                <h2 className="text-xl font-black text-slate-950">الجلسات المجدولة والمباشرة</h2>
              </div>

              {copyMessage && (
                <div className="rounded-xl bg-teal-50 border border-teal-200 p-3.5 text-xs font-black text-teal-900">
                  {copyMessage}
                </div>
              )}

              <div className="grid gap-3">
                {meetings.length > 0 ? (
                  meetings.map((meeting) => (
                    <article key={meeting.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:bg-white hover:border-slate-300">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-teal-100 border border-teal-200 px-2.5 py-0.5 text-[10px] font-black text-teal-800">
                              {meeting.type === 'internal' ? '🎥 غرفة المنصة المباشرة' : '🔗 Zoom'}
                            </span>
                            <span className="text-xs font-black text-slate-400">رمز: {meeting.roomCode}</span>
                          </div>
                          <h3 className="text-base font-black text-slate-950">{meeting.title}</h3>
                          <p className="text-xs font-bold text-slate-600">
                            المستهدف: <span className="font-black text-slate-900">{meeting.targetName}</span> · الموعد: {meeting.date} الساعة {meeting.time}
                          </p>
                          {meeting.notes && (
                            <p className="text-xs font-bold text-slate-500 leading-relaxed mt-1">ملاحظة: {meeting.notes}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => copyInvite(meeting)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100 transition"
                          >
                            <Copy size={15} />
                            <span>نسخ الدعوة</span>
                          </button>

                          <button
                            onClick={() => launchCall(meeting)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-black text-white hover:bg-teal-700 transition shadow-sm active:scale-95"
                          >
                            <Video size={16} />
                            <span>دخول الغرفة المباشرة</span>
                          </button>

                          <button
                            onClick={() => setConfirmDeleteId(meeting.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 transition"
                            title="حذف الجلسة"
                          >
                            <Trash2 size={15} />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs font-bold text-slate-500">
                    لا توجد جلسات مجدولة بعد. أنشئ موعد جديد للبدء بالبث المباشر.
                  </p>
                )}
              </div>

            </section>

          </section>

        </main>
      </div>

      {/* Delete Meeting Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-right space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle size={28} />
              <h3 className="text-xl font-black text-slate-900">تأكيد حذف الجلسة المجدولة</h3>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-600 leading-relaxed">
              هل أنت تأكد من حذف هذه الجلسة من جدول المواعيد؟ لن تمكن من استعادتها بعد الحذف.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-xl px-4 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-100 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteId && deleteMeeting(confirmDeleteId)}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-black text-white hover:bg-rose-700 transition shadow-md shadow-rose-600/20"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// REAL HTML5 CANVAS INTERACTIVE WHITEBOARD COMPONENT
function InteractiveWhiteboard() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#0f766e');
  const [lineWidth, setLineWidth] = useState(4);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fill white background on canvas init
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? lineWidth * 4 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  return (
    <div className="rounded-2xl bg-white p-4 text-slate-900 flex flex-col justify-between border border-slate-300 shadow-xl space-y-3">
      
      {/* Whiteboard Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black text-teal-800 flex items-center gap-1.5">
            <PenTool size={16} /> سبورة التدريب التفاعلية الحية
          </span>
        </div>

        {/* Tools & Colors Controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
          
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setTool('pen')}
              className={`px-3 py-1 rounded-lg transition font-black ${tool === 'pen' ? 'bg-teal-600 text-white' : 'text-slate-700'}`}
            >
              قلم
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`px-3 py-1 rounded-lg transition font-black flex items-center gap-1 ${tool === 'eraser' ? 'bg-teal-600 text-white' : 'text-slate-700'}`}
            >
              <Eraser size={14} /> ممحاة
            </button>
          </div>

          {/* Color Palette */}
          {tool === 'pen' && (
            <div className="flex items-center gap-1.5">
              {['#000000', '#0f766e', '#dc2626', '#2563eb', '#16a34a'].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full transition transform ${color === c ? 'scale-125 ring-2 ring-slate-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}

          <button
            onClick={clearCanvas}
            className="flex items-center gap-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 hover:bg-slate-100 transition text-rose-700 font-black"
          >
            <RotateCcw size={14} /> مسح الكل
          </button>

        </div>
      </div>

      {/* HTML5 Canvas Surface */}
      <div className="relative h-[340px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
        <canvas
          ref={canvasRef}
          width={800}
          height={340}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="h-full w-full cursor-crosshair touch-none"
        />
      </div>

    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block text-right">
      <span className="mb-1.5 block text-xs font-black text-slate-700">{label}</span>
      <input 
        type={type} 
        value={value} 
        onChange={(event) => onChange(event.target.value)} 
        placeholder={placeholder} 
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600" 
      />
    </label>
  );
}
