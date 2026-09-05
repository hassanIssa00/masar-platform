'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Radio, Video, StopCircle, Play, Eye, Clock,
  MessageSquare, Send, CheckCircle, Copy, Trash2,
  Mic, MicOff, VideoOff, MonitorPlay, Link,
  Users, UserCheck, UserX, AlertCircle, History,
  FileText, Check, ShieldAlert, Sparkles
} from 'lucide-react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useRemoteParticipants,
} from '@livekit/components-react';
import { readCloudCache, syncDocToCloud, writeCloudCache } from '@/lib/firestoreSync';
import VoiceRecorderButton, { MessageAudio } from '@/components/VoiceRecorderButton';

export interface LiveAttendeeRecord {
  id: string;
  name: string;
  role?: string;
  joinedAt: string;
  leftAt?: string;
  isActive: boolean;
}

export interface LiveActivityEvent {
  id: string;
  name: string;
  type: 'join' | 'leave';
  time: string;
}

export interface LiveSession {
  id: string;
  title: string;
  description: string;
  hostName: string;
  status: 'LIVE' | 'RECORDED';
  startedAt: string;
  endedAt?: string;
  views: number;
  recordedVideoUrl?: string;
  comments: Array<{ id: string; sender: string; text: string; time: string; audioDataUrl?: string }>;
  attendees?: LiveAttendeeRecord[];
  activityLog?: LiveActivityEvent[];
}

const STORAGE_KEY = 'ikhlas_live_sessions_v1';
const DEFAULT_SESSIONS: LiveSession[] = [
  {
    id: 'rec-1',
    title: 'جلسة تأسيس الرياضيات وصعوبات التعلم — الحساب التفاعلي',
    description: 'حصّة مسجلة شاملة لتطوير مهارات الأرقام والعد السريع لبطل الصف الأول.',
    hostName: 'د. إسماعيل عيسى',
    status: 'RECORDED',
    startedAt: '2026-08-07T10:00:00.000Z',
    endedAt: '2026-08-07T10:45:00.000Z',
    views: 42,
    recordedVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    comments: [
      { id: 'c1', sender: 'ولي أمر علي', text: 'ما شاء الله الشرح ممتع وجزيل الشكر دكتور إسماعيل', time: '10:15' },
      { id: 'c2', sender: 'أم يوسف', text: 'تمت المتابعة والتطبيق العملي في البيت', time: '10:30' }
    ],
    attendees: [
      { id: 'att-1', name: 'أحمد فارس عبدالله', role: 'طالب', joinedAt: '10:00 ص', leftAt: '10:45 ص', isActive: false },
      { id: 'att-2', name: 'ولي أمر علي الحامد', role: 'ولي أمر', joinedAt: '10:05 ص', leftAt: '10:42 ص', isActive: false },
      { id: 'att-3', name: 'أم يوسف الشريف', role: 'ولي أمر', joinedAt: '10:08 ص', leftAt: '10:45 ص', isActive: false },
    ],
    activityLog: [
      { id: 'l1', name: 'أحمد فارس عبدالله', type: 'join', time: '10:00:15 ص' },
      { id: 'l2', name: 'ولي أمر علي الحامد', type: 'join', time: '10:05:22 ص' },
      { id: 'l3', name: 'أم يوسف الشريف', type: 'join', time: '10:08:10 ص' },
      { id: 'l4', name: 'ولي أمر علي الحامد', type: 'leave', time: '10:42:00 ص' },
      { id: 'l5', name: 'أحمد فارس عبدالله', type: 'leave', time: '10:45:00 ص' },
    ]
  }
];

/**
 * Real-time tracker component placed inside <LiveKitRoom>.
 * Listens to remote participant joins and departures and updates parent state.
 */
function LiveRoomTracker({
  onParticipantsUpdate,
  onActivityLog
}: {
  onParticipantsUpdate: (participants: { id: string; name: string; joinedAt: string }[]) => void;
  onActivityLog: (log: LiveActivityEvent) => void;
}) {
  const remoteParticipants = useRemoteParticipants();
  const prevParticipantsRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const currentMap = new Map<string, string>();
    const list: { id: string; name: string; joinedAt: string }[] = [];

    remoteParticipants.forEach(p => {
      const pName = p.name || p.identity || 'زائر';
      currentMap.set(p.identity, pName);
      list.push({
        id: p.identity,
        name: pName,
        joinedAt: new Date(p.joinedAt || Date.now()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      });

      // New participant joined
      if (!prevParticipantsRef.current.has(p.identity)) {
        onActivityLog({
          id: `log-join-${Date.now()}-${p.identity}`,
          name: pName,
          type: 'join',
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
      }
    });

    // Participant left
    prevParticipantsRef.current.forEach((name, id) => {
      if (!currentMap.has(id)) {
        onActivityLog({
          id: `log-leave-${Date.now()}-${id}`,
          name,
          type: 'leave',
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
      }
    });

    prevParticipantsRef.current = currentMap;
    onParticipantsUpdate(list);
  }, [remoteParticipants, onParticipantsUpdate, onActivityLog]);

  return null;
}

export default function LiveStreamTab({ isHost = true }: { isHost?: boolean }) {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [token, setToken] = useState<string>('');
  const [wsUrl, setWsUrl] = useState<string>('');
  const [loadingToken, setLoadingToken] = useState(false);
  const [streamTitle, setStreamTitle] = useState('البث المباشر — الصف الأول الابتدائي (فصل د. إسماعيل عيسى)');
  const [streamDesc, setStreamDesc] = useState('حصّة علاجية وتفاعلية مباشرة لمتابعة أبطال الصف الأول مع د. إسماعيل عيسى');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [selectedRecordedSession, setSelectedRecordedSession] = useState<LiveSession | null>(null);
  const [attendanceReportSession, setAttendanceReportSession] = useState<LiveSession | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Live attendees & activity logs in real-time
  const [activeControlTab, setActiveControlTab] = useState<'attendees' | 'activity' | 'chat'>('attendees');
  const [liveAttendees, setLiveAttendees] = useState<LiveAttendeeRecord[]>([]);
  const [activityLogs, setActivityLogs] = useState<LiveActivityEvent[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  /* ─ Load sessions & cleanup zombie live sessions ─ */
  useEffect(() => {
    const cached = readCloudCache<LiveSession>(STORAGE_KEY);
    const rawSessions = cached.length ? cached : DEFAULT_SESSIONS;

    // Sanitize: If a session is marked LIVE, but it started more than 3 hours ago, auto-close it
    const now = Date.now();
    const sanitized = rawSessions.map(s => {
      if (s.status === 'LIVE') {
        const start = new Date(s.startedAt).getTime();
        if (isNaN(start) || (now - start > 3 * 3600 * 1000)) {
          return { ...s, status: 'RECORDED' as const, endedAt: new Date().toISOString() };
        }
      }
      return s;
    });

    setSessions(sanitized);
    writeCloudCache(STORAGE_KEY, sanitized);
  }, []);

  const saveSessions = (updated: LiveSession[]) => {
    setSessions(updated);
    writeCloudCache(STORAGE_KEY, updated);
    updated.forEach((session) => {
      void syncDocToCloud('live_sessions', session.id, session);
    });
  };

  // Only consider truly live if it's currently active in session or started recently
  const currentLive = useMemo(() => {
    return sessions.find(s => s.status === 'LIVE');
  }, [sessions]);

  /* ─ Generate share link ─ */
  const getShareLink = (roomId: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://masarplatform.org';
    return `${origin}/live?room=${encodeURIComponent(roomId)}`;
  };

  const handleCopyLink = (roomId: string) => {
    navigator.clipboard.writeText(getShareLink(roomId));
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  /* ─ Fetch LiveKit Token ─ */
  const fetchToken = async (roomName: string, username: string, hostFlag: boolean) => {
    setLoadingToken(true);
    try {
      const res = await fetch(`/api/livekit/token?room=${encodeURIComponent(roomName)}`);
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setWsUrl(data.wsUrl);
        return true;
      } else {
        alert(`تعذر بدء الاتصال بالبث: ${data.error || 'خطأ في المصادقة'}`);
        return false;
      }
    } catch (err) {
      console.error('Failed to fetch token:', err);
      alert('خطأ في الاتصال بالخادم. يرجى التأكد من تشغيل الإنترنت والمحاولة مجدداً.');
      return false;
    } finally {
      setLoadingToken(false);
    }
  };

  /* ─ Participant updates from LiveKit ─ */
  const handleParticipantsUpdate = (participants: { id: string; name: string; joinedAt: string }[]) => {
    setLiveAttendees(prev => {
      const currentIds = new Set(participants.map(p => p.id));
      const nextMap = new Map<string, LiveAttendeeRecord>();

      // Keep existing history, mark as active/inactive
      prev.forEach(item => {
        nextMap.set(item.id, {
          ...item,
          isActive: currentIds.has(item.id),
          leftAt: currentIds.has(item.id) ? undefined : item.leftAt || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        });
      });

      // Add new participants
      participants.forEach(p => {
        const isParent = p.name.includes('ولي') || p.name.includes('أم') || p.name.includes('أبو');
        const role = isParent ? 'ولي أمر' : 'طالب';
        if (!nextMap.has(p.id)) {
          nextMap.set(p.id, {
            id: p.id,
            name: p.name,
            role,
            joinedAt: p.joinedAt,
            isActive: true,
          });
        } else {
          const existing = nextMap.get(p.id)!;
          existing.isActive = true;
          existing.leftAt = undefined;
        }
      });

      return Array.from(nextMap.values());
    });
  };

  const handleActivityLog = (log: LiveActivityEvent) => {
    setActivityLogs(prev => [log, ...prev].slice(0, 100));
  };

  /* ─ Start Stream ─ */
  const handleStartStream = async () => {
    if (!streamTitle.trim()) return;
    const newId = `live-${Date.now()}`;
    const newSession: LiveSession = {
      id: newId,
      title: streamTitle,
      description: streamDesc,
      hostName: 'د. إسماعيل عيسى',
      status: 'LIVE',
      startedAt: new Date().toISOString(),
      views: 1,
      comments: [],
      attendees: [],
      activityLog: [
        {
          id: `init-${Date.now()}`,
          name: 'د. إسماعيل عيسى (المضيف)',
          type: 'join',
          time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        }
      ]
    };

    const tokenOk = await fetchToken(newId, 'د. إسماعيل عيسى (الأدمن)', true);
    if (!tokenOk) return;

    saveSessions([newSession, ...sessions.filter(s => s.status !== 'LIVE')]);
    setActiveSession(newSession);
    setIsBroadcasting(true);
    setLiveAttendees([]);
    setActivityLogs(newSession.activityLog || []);

    /* local MediaRecorder fallback for replay */
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        const finalSessions: LiveSession[] = readCloudCache<LiveSession>(STORAGE_KEY);
        const target = finalSessions.find(s => s.id === newId);
        if (target) {
          target.status = 'RECORDED';
          target.endedAt = new Date().toISOString();
          target.recordedVideoUrl = videoUrl;
          target.attendees = liveAttendees;
          target.activityLog = activityLogs;
          writeCloudCache(STORAGE_KEY, finalSessions);
          void syncDocToCloud('live_sessions', target.id, target);
          setSessions(finalSessions);
        }
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.warn('Local recording unavailable:', err);
    }
  };

  /* ─ Join Live (viewer) ─ */
  const handleJoinLive = async () => {
    if (!currentLive) return;
    setActiveSession(currentLive);
    saveSessions(sessions.map(s => s.id === currentLive.id ? { ...s, views: s.views + 1 } : s));
    await fetchToken(currentLive.id, 'د. إسماعيل عيسى', isHost);
    setIsBroadcasting(true);
  };

  /* ─ Force End Stale Live Session ─ */
  const handleForceEndStaleLive = (id: string) => {
    saveSessions(sessions.map(s => s.id === id ? {
      ...s,
      status: 'RECORDED' as const,
      endedAt: new Date().toISOString()
    } : s));
    setIsBroadcasting(false);
    setActiveSession(null);
  };

  /* ─ End Stream ─ */
  const handleEndStream = () => {
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());

    const finalAttendees = liveAttendees.map(a => ({ ...a, isActive: false, leftAt: a.leftAt || new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }));

    const updated = sessions.map(s => s.status === 'LIVE' ? {
      ...s,
      status: 'RECORDED' as const,
      endedAt: new Date().toISOString(),
      attendees: finalAttendees,
      activityLog: activityLogs,
      recordedVideoUrl: s.recordedVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
    } : s);

    saveSessions(updated);
    setIsBroadcasting(false);
    setActiveSession(null);
    setToken('');
    setWsUrl('');
    alert('✅ تم إنهاء البث المباشر بنجاح وحفظ سجل الحضور والمشاركات في الأرشيف!');
  };

  /* ─ Delete recorded session ─ */
  const handleDeleteSession = (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه الجلسة المسجلة؟')) return;
    saveSessions(sessions.filter(s => s.id !== id));
    if (selectedRecordedSession?.id === id) setSelectedRecordedSession(null);
  };

  /* ─ Chat ─ */
  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !activeSession) return;
    const newComment = {
      id: `c-${Date.now()}`,
      sender: isHost ? 'د. إسماعيل عيسى' : 'ولي الأمر',
      text: chatMessage,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };
    const updated = sessions.map(s => s.id === activeSession.id ? { ...s, comments: [...s.comments, newComment] } : s);
    saveSessions(updated);
    setActiveSession(prev => prev ? { ...prev, comments: [...prev.comments, newComment] } : null);
    setChatMessage('');
  };

  const handleSendAudioComment = async (audioDataUrl: string) => {
    if (!activeSession) return;
    const newComment = {
      id: `c-${Date.now()}`,
      sender: isHost ? 'د. إسماعيل عيسى' : 'ولي الأمر',
      text: 'رسالة صوتية',
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      audioDataUrl,
    };
    const updated = sessions.map(s => s.id === activeSession.id ? { ...s, comments: [...s.comments, newComment] } : s);
    saveSessions(updated);
    setActiveSession(prev => prev ? { ...prev, comments: [...prev.comments, newComment] } : null);
  };

  const activeCount = liveAttendees.filter(a => a.isActive).length;

  /* ══ RENDER ══ */
  return (
    <div className="space-y-6 text-slate-900" dir="rtl">

      {/* ── HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 text-white shadow-xl border border-teal-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-300 border border-emerald-500/30">
                <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
                غرفة البث المباشر والتسجيلات — فصل د. إسماعيل عيسى
              </span>
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-300 border border-amber-500/30">
                الصف الأول الابتدائي
              </span>
            </div>
            <h2 className="mt-2 text-2xl md:text-3xl font-black text-white">البث المباشر التفاعلي وغرفة التحكم 🎥</h2>
            <p className="mt-1 text-sm font-semibold text-teal-100/80">
              بث حي ومباشر مع د. إسماعيل عيسى — متابعة لحظية للحضور، معرفة من انضم ومن غادر، وسجل تفاعلي كامل.
            </p>
          </div>

          {/* Status Indicator & Quick Actions */}
          {isBroadcasting && activeSession ? (
            <div className="flex flex-col items-end gap-2">
              <span className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white shadow-lg animate-pulse">
                <span className="h-2.5 w-2.5 rounded-full bg-white animate-ping" />
                🔴 بثك المباشر يعمل الآن!
              </span>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {activeCount} متواجدون الآن
                </span>
                <button
                  onClick={() => handleCopyLink(activeSession.id)}
                  className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3.5 py-1.5 text-xs font-black text-white transition"
                >
                  {copiedLink ? <CheckCircle className="h-3.5 w-3.5 text-green-400" /> : <Link className="h-3.5 w-3.5" />}
                  {copiedLink ? 'تم نسخ الرابط!' : 'نسخ رابط المشاهدة'}
                </button>
              </div>
            </div>
          ) : currentLive ? (
            /* There is a live session in db that is not actively broadcasting on this tab */
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3.5 py-1.5 text-xs font-black">
                  <AlertCircle className="h-4 w-4" />
                  جلسة بث مسجلة كنشطة
                </span>
                <button
                  onClick={handleJoinLive}
                  disabled={loadingToken}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 text-xs font-black transition active:scale-95 shadow-md"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  استئناف والتحكم
                </button>
                <button
                  onClick={() => handleForceEndStaleLive(currentLive.id)}
                  className="flex items-center gap-1.5 rounded-xl bg-red-600/80 hover:bg-red-600 text-white px-3 py-1.5 text-xs font-black transition active:scale-95"
                >
                  <StopCircle className="h-3.5 w-3.5" />
                  إنهاء الجلسة
                </button>
              </div>
              <button
                onClick={() => handleCopyLink(currentLive.id)}
                className="flex items-center gap-1.5 text-[11px] font-bold text-teal-200 hover:text-white transition"
              >
                <Link className="h-3 w-3" />
                نسخ رابط المشاهدة للطلاب وأولياء الأمور
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-teal-200 border border-white/15 backdrop-blur-md">
              <Clock className="h-4 w-4 text-teal-300" />
              ⚪ البث المباشر متوقف حالياً — اضغط بالأسفل لبدء بث جديد
            </div>
          )}
        </div>
      </div>

      {/* ── DOCTOR START STREAM PANEL (Shown when NOT broadcasting) ── */}
      {isHost && !isBroadcasting && (
        <div className="rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2 text-emerald-950 font-black text-lg">
              <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <h3>لوحة بدء البث المباشر والتحكم (د. إسماعيل عيسى)</h3>
                <p className="text-xs font-bold text-slate-500">ابدأ البث مع الطلاب وراقب الحضور والدخول والخروج في الوقت الفعلي</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800 bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-200">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              يدعم رصد الحضور اللحظي التلقائي
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">عنوان البث المباشر</label>
              <input
                type="text"
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                placeholder="مثال: البث المباشر — مراجعة وتأسيس لغتي والرياضيات"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-teal-600 focus:outline-none shadow-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">الوصف والتفاصيل الموجهة للطلاب وأولياء الأمور</label>
              <textarea
                value={streamDesc}
                onChange={(e) => setStreamDesc(e.target.value)}
                rows={2}
                placeholder="اكتب نبذة عن أهداف الجلسة وما سيتم تناوله اليوم..."
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-teal-600 focus:outline-none shadow-xs"
              />
            </div>
            <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
              <button
                onClick={handleStartStream}
                disabled={loadingToken || !streamTitle.trim()}
                className="flex items-center justify-center gap-2 w-full md:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 px-8 py-3.5 text-sm font-black text-white shadow-lg transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Radio className="h-5 w-5 text-emerald-200 animate-pulse" />
                {loadingToken ? 'جاري فتح غرفة البث…' : 'ابدأ البث المباشر الفوري الآن 🔴'}
              </button>

              <div className="text-xs font-bold text-slate-500">
                🔒 رابط البث المباشر المخصص للفصل: <span className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded">masarplatform.org/live</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ACTIVE DOCTOR COMMAND CENTER (Shown when broadcasting) ── */}
      {isBroadcasting && activeSession && token && wsUrl && (
        <div className="rounded-3xl border border-slate-800 bg-slate-950 text-white overflow-hidden shadow-2xl space-y-0">

          {/* Top Control Bar */}
          <div className="flex items-center justify-between bg-slate-900 px-6 py-4 border-b border-slate-800 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-3.5 w-3.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
              </span>
              <div>
                <h3 className="font-black text-base md:text-lg text-white">{activeSession.title}</h3>
                <p className="text-xs font-bold text-teal-400 flex items-center gap-2">
                  <span>بواسطة: {activeSession.hostName}</span>
                  <span>·</span>
                  <span className="text-slate-400">بدأ: {new Date(activeSession.startedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Copy link */}
              <button
                onClick={() => handleCopyLink(activeSession.id)}
                className="flex items-center gap-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 px-3.5 py-2 text-xs font-black text-white transition cursor-pointer"
              >
                {copiedLink ? <CheckCircle className="h-4 w-4 text-green-300" /> : <Copy className="h-4 w-4" />}
                {copiedLink ? 'تم النسخ!' : 'نسخ رابط المشاهدة لأولياء الأمور'}
              </button>

              {/* End Stream Button */}
              {isHost && (
                <button
                  onClick={handleEndStream}
                  className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-5 py-2 text-xs font-black text-white transition active:scale-95 shadow-lg cursor-pointer"
                >
                  <StopCircle className="h-4 w-4" />
                  إنهاء البث وحفظ التقرير ⏹️
                </button>
              )}
            </div>
          </div>

          {/* Live Link Notice */}
          <div className="bg-slate-900/70 px-6 py-2 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-teal-400">🔗 رابط المشاهدة المباشر:</span>
              <code className="bg-slate-800 text-teal-200 px-3 py-1 rounded-lg font-mono select-all text-[11px]">
                {getShareLink(activeSession.id)}
              </code>
            </div>
            <div className="text-amber-400 text-[11px] font-bold">
              يستطيع الطلاب وأولياء الأمور الدخول فوراً عبر الرابط ومتابعة الشرح
            </div>
          </div>

          {/* Main Broadcast Grid: 2 Cols (Video + Attendee Control Center) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">

            {/* Col 1: Video Broadcast Screen (7 Cols) */}
            <div className="lg:col-span-7 bg-black flex flex-col relative border-b lg:border-b-0 lg:border-l border-slate-800">
              <LiveKitRoom
                video={isHost}
                audio={isHost}
                token={token}
                serverUrl={wsUrl}
                data-lk-theme="default"
                style={{ height: '100%', minHeight: '480px', '--lk-bg': '#000000' } as React.CSSProperties}
              >
                <VideoConference />
                <RoomAudioRenderer />
                {/* Real-time Attendee & Activity Log Tracker Hook */}
                <LiveRoomTracker
                  onParticipantsUpdate={handleParticipantsUpdate}
                  onActivityLog={handleActivityLog}
                />
              </LiveKitRoom>
            </div>

            {/* Col 2: Doctor Live Management Center (5 Cols) */}
            <div className="lg:col-span-5 bg-slate-900 flex flex-col min-h-[480px]">

              {/* Navigation Tabs for Doctor Control */}
              <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950 text-xs font-black">
                <button
                  onClick={() => setActiveControlTab('attendees')}
                  className={`py-3 px-2 flex items-center justify-center gap-1.5 transition cursor-pointer border-b-2 ${
                    activeControlTab === 'attendees'
                      ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  المتواجدون الآن ({activeCount})
                </button>

                <button
                  onClick={() => setActiveControlTab('activity')}
                  className={`py-3 px-2 flex items-center justify-center gap-1.5 transition cursor-pointer border-b-2 ${
                    activeControlTab === 'activity'
                      ? 'border-teal-500 text-teal-400 bg-slate-900'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <History className="h-4 w-4" />
                  سجل الحركة ({activityLogs.length})
                </button>

                <button
                  onClick={() => setActiveControlTab('chat')}
                  className={`py-3 px-2 flex items-center justify-center gap-1.5 transition cursor-pointer border-b-2 ${
                    activeControlTab === 'chat'
                      ? 'border-amber-500 text-amber-400 bg-slate-900'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="h-4 w-4" />
                  الدردشة ({activeSession.comments.length})
                </button>
              </div>

              {/* ── TAB 1: ACTIVE ATTENDEES (المتواجدون الآن) ── */}
              {activeControlTab === 'attendees' && (
                <div className="flex-1 flex flex-col p-4 space-y-3 overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 pb-2 border-b border-slate-800">
                    <span className="flex items-center gap-1.5 text-slate-200">
                      <UserCheck className="h-4 w-4 text-emerald-400" />
                      قائمة الحضور والمشاهدين الحقيقيين
                    </span>
                    <span className="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800 text-[11px] font-mono font-black">
                      {activeCount} متصل
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ maxHeight: 380 }}>
                    {liveAttendees.length === 0 ? (
                      <div className="text-center py-12 space-y-2">
                        <Users className="h-10 w-10 text-slate-600 mx-auto animate-pulse" />
                        <p className="text-xs font-bold text-slate-400">بانتظار انضمام الطلاب وأولياء الأمور للبث…</p>
                        <p className="text-[11px] text-slate-500">شارك الرابط مع أولياء الأمور وسيظهر اسم كل من يدخل هنا فوراً.</p>
                      </div>
                    ) : (
                      liveAttendees.map((att) => (
                        <div
                          key={att.id}
                          className={`p-3 rounded-xl border transition flex items-center justify-between ${
                            att.isActive
                              ? 'bg-slate-800/90 border-emerald-500/40 text-white'
                              : 'bg-slate-850/50 border-slate-800 text-slate-400 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="relative flex h-2.5 w-2.5">
                              {att.isActive ? (
                                <>
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </>
                              ) : (
                                <span className="inline-flex rounded-full h-2.5 w-2.5 bg-slate-500"></span>
                              )}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-xs text-white">{att.name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                                  att.role === 'ولي أمر' ? 'bg-amber-500/20 text-amber-300' : 'bg-teal-500/20 text-teal-300'
                                }`}>
                                  {att.role || 'طالب'}
                                </span>
                              </div>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                انضم: {att.joinedAt} {att.leftAt ? `· غادر: ${att.leftAt}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="text-left">
                            <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${
                              att.isActive
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}>
                              {att.isActive ? 'يشاهد الآن 🟢' : 'غادر البث ⚪'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB 2: ACTIVITY LOG (سجل الدخول والخروج اللحظي) ── */}
              {activeControlTab === 'activity' && (
                <div className="flex-1 flex flex-col p-4 space-y-3 overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-400 pb-2 border-b border-slate-800">
                    <span className="flex items-center gap-1.5 text-slate-200">
                      <History className="h-4 w-4 text-teal-400" />
                      سجل الدخول والمغادرة اللحظي بالثواني
                    </span>
                    <span className="text-[11px] text-slate-500">تحديث فوري تلقائي</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ maxHeight: 380 }}>
                    {activityLogs.length === 0 ? (
                      <p className="text-center text-slate-500 py-12 text-xs font-bold">لا توجد حركات تسجيل دخول أو خروج بعد.</p>
                    ) : (
                      activityLogs.map((log) => (
                        <div
                          key={log.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                            log.type === 'join'
                              ? 'bg-emerald-950/40 border-emerald-800/40 text-emerald-200'
                              : 'bg-rose-950/40 border-rose-800/40 text-rose-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {log.type === 'join' ? (
                              <UserCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                            ) : (
                              <UserX className="h-4 w-4 text-rose-400 shrink-0" />
                            )}
                            <div>
                              <span className="font-black text-white">{log.name}</span>
                              <span className="text-[11px] font-bold opacity-80 mr-1.5">
                                {log.type === 'join' ? 'انضم للبث المباشر' : 'غادر البث المباشر'}
                              </span>
                            </div>
                          </div>
                          <span className="font-mono text-[11px] opacity-75 font-bold">{log.time}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* ── TAB 3: LIVE CHAT (الدردشة التفاعلية) ── */}
              {activeControlTab === 'chat' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ maxHeight: 340 }}>
                    {activeSession.comments.length === 0 ? (
                      <p className="text-center text-slate-500 py-12 font-bold text-xs">لا توجد تعليقات بعد. اكتب سؤالاً أو استفساراً! 💬</p>
                    ) : (
                      activeSession.comments.map(c => (
                        <div key={c.id} className="rounded-xl bg-slate-800/80 p-2.5 border border-slate-700/50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-xs text-teal-300">{c.sender}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{c.time}</span>
                          </div>
                          <p className="text-slate-200 text-xs font-semibold leading-relaxed">{c.text}</p>
                          <MessageAudio src={c.audioDataUrl} />
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={handleSendComment} className="p-3 border-t border-slate-800 flex gap-2 bg-slate-950">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="اكتب رسالة أو تعليقاً في البث..."
                      className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-bold text-white focus:border-teal-500 focus:outline-none"
                    />
                    <VoiceRecorderButton onRecorded={handleSendAudioComment} className="[&>span]:hidden" />
                    <button type="submit" className="rounded-xl bg-teal-600 hover:bg-teal-500 px-3.5 py-2 text-xs font-black text-white transition cursor-pointer">
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── RECORDED SESSIONS ARCHIVE ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <MonitorPlay className="h-5 w-5 text-teal-700" />
            <h3 className="text-lg font-black text-slate-900">أرشيف الجلسات والحصص المحفوظة 📹</h3>
          </div>
          <span className="text-xs font-extrabold text-slate-500">
            سجل الجلسات السابقة مع إمكانية مراجعة تقرير حضور كل جلسة
          </span>
        </div>

        {sessions.filter(s => s.status === 'RECORDED').length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 font-bold">
            لا توجد حصص مسجلة سابقة حتى الآن.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.filter(s => s.status === 'RECORDED').map(session => (
              <div
                key={session.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1 text-[11px] font-black text-teal-800 border border-teal-200">
                      <CheckCircle className="h-3 w-3 text-teal-600" />
                      مُسجّلة ومحفوظة
                    </span>
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1 font-mono">
                      <Eye className="h-3.5 w-3.5" />
                      {session.views} مشاهدة
                    </span>
                  </div>
                  <h4 className="font-black text-base text-slate-900 leading-snug">{session.title}</h4>
                  <p className="mt-1 text-xs font-bold text-slate-600 line-clamp-2">{session.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500">تقديم: {session.hostName}</span>
                  <div className="flex items-center gap-2">
                    {/* View Attendance Report Button */}
                    <button
                      type="button"
                      onClick={() => setAttendanceReportSession(session)}
                      className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 transition active:scale-95 cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-teal-700" />
                      تقرير الحضور ({session.attendees?.length || 0})
                    </button>

                    {/* Delete button */}
                    {isHost && (
                      <button
                        type="button"
                        onClick={() => handleDeleteSession(session.id)}
                        className="flex items-center gap-1 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 text-xs font-black text-red-700 transition active:scale-95 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                        حذف
                      </button>
                    )}

                    {/* Play recording */}
                    <button
                      type="button"
                      onClick={() => setSelectedRecordedSession(session)}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-1.5 text-xs font-black text-white transition active:scale-95 shadow-xs cursor-pointer"
                    >
                      <Play className="h-3 w-3 fill-current text-teal-400" />
                      مشاهدة
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ATTENDANCE REPORT MODAL ── */}
      {attendanceReportSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 text-slate-900 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">تقرير حضور الجلسة: {attendanceReportSession.title}</h3>
                  <p className="text-xs font-bold text-slate-500">
                    تاريخ الجلسة: {new Date(attendanceReportSession.startedAt).toLocaleDateString('ar-EG')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAttendanceReportSession(null)}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 cursor-pointer"
              >
                إغلاق ✖
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[11px] font-bold text-slate-500">إجمالي الحضور</span>
                  <p className="text-lg font-black text-slate-900 mt-0.5">{attendanceReportSession.attendees?.length || 0}</p>
                </div>
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-center">
                  <span className="text-[11px] font-bold text-emerald-700">عدد التعليقات</span>
                  <p className="text-lg font-black text-emerald-800 mt-0.5">{attendanceReportSession.comments?.length || 0}</p>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-center col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-amber-700">المشاهدات</span>
                  <p className="text-lg font-black text-amber-800 mt-0.5">{attendanceReportSession.views || 1}</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden mt-3">
                <div className="bg-slate-100 px-4 py-2 text-xs font-black text-slate-700">
                  سجل الحضور المسجل بالجلسة
                </div>
                {(!attendanceReportSession.attendees || attendanceReportSession.attendees.length === 0) ? (
                  <p className="text-center py-6 text-xs font-bold text-slate-400">لا توجد سجلات حضور محفوظة لهذه الجلسة.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {attendanceReportSession.attendees.map((att, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-emerald-600" />
                          <div>
                            <span className="font-black text-slate-900">{att.name}</span>
                            <span className="text-[10px] font-bold text-slate-500 mr-2">({att.role || 'طالب'})</span>
                          </div>
                        </div>
                        <div className="text-left font-mono text-[11px] text-slate-600">
                          وقت الدخول: {att.joinedAt} {att.leftAt ? `· الانصراف: ${att.leftAt}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {attendanceReportSession.activityLog && attendanceReportSession.activityLog.length > 0 && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden mt-3">
                  <div className="bg-slate-100 px-4 py-2 text-xs font-black text-slate-700">
                    سجل الحركات (دخول وخروج بالثواني)
                  </div>
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {attendanceReportSession.activityLog.map((log) => (
                      <div key={log.id} className="p-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          {log.type === 'join' ? (
                            <span className="text-emerald-600 font-bold">🟢 انضم:</span>
                          ) : (
                            <span className="text-rose-600 font-bold">🔴 غادر:</span>
                          )}
                          <span className="font-black text-slate-800">{log.name}</span>
                        </div>
                        <span className="font-mono text-[11px] text-slate-500">{log.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VIDEO PLAYER MODAL ── */}
      {selectedRecordedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-900 p-6 text-white shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="font-black text-lg text-white">{selectedRecordedSession.title}</h3>
                <p className="text-xs font-bold text-teal-400">بواسطة: {selectedRecordedSession.hostName}</p>
              </div>
              <button
                onClick={() => setSelectedRecordedSession(null)}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300 cursor-pointer"
              >
                إغلاق ✖
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-black border border-slate-800">
              <video
                src={selectedRecordedSession.recordedVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'}
                controls
                autoPlay
                className="w-full max-h-[420px] object-contain"
              />
            </div>
            <p className="text-xs font-semibold text-slate-300 leading-relaxed bg-slate-800/50 p-3 rounded-xl">
              {selectedRecordedSession.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
