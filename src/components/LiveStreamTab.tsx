'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Radio, Video, VideoOff, Mic, MicOff, ScreenShare, StopCircle,
  Play, Download, Eye, Clock, MessageSquare, Send, Sparkles,
  CheckCircle, AlertCircle, RefreshCw, UserCheck, ShieldAlert
} from 'lucide-react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  VideoTrack,
} from '@livekit/components-react';

interface LiveSession {
  id: string;
  title: string;
  description: string;
  hostName: string;
  status: 'LIVE' | 'RECORDED';
  startedAt: string;
  endedAt?: string;
  views: number;
  recordedVideoUrl?: string;
  comments: Array<{ id: string; sender: string; text: string; time: string }>;
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
    ]
  }
];

export default function LiveStreamTab({ isHost = true }: { isHost?: boolean }) {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [activeSession, setActiveSession] = useState<LiveSession | null>(null);
  const [token, setToken] = useState<string>('');
  const [wsUrl, setWsUrl] = useState<string>('');
  const [loadingToken, setLoadingToken] = useState(false);

  // New Stream Form
  const [streamTitle, setStreamTitle] = useState('البث المباشر — الصف الأول الابتدائي (مدرسة الإخلاص)');
  const [streamDesc, setStreamDesc] = useState('حصّة علاجية وتفاعلية مباشرة لمتابعة أبطال الصف الأول مع د. إسماعيل عيسى');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Local Media Recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);

  // Chat input
  const [chatMessage, setChatMessage] = useState('');
  const [selectedRecordedSession, setSelectedRecordedSession] = useState<LiveSession | null>(null);

  // Load sessions from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSessions(JSON.parse(saved));
      } else {
        setSessions(DEFAULT_SESSIONS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SESSIONS));
      }
    } catch {
      setSessions(DEFAULT_SESSIONS);
    }
  }, []);

  // Sync to localStorage
  const saveSessions = (updated: LiveSession[]) => {
    setSessions(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save sessions:', e);
    }
  };

  // Find if there's an ongoing LIVE stream
  const currentLive = sessions.find(s => s.status === 'LIVE');

  // Fetch LiveKit Token
  const fetchToken = async (roomName: string, username: string, hostFlag: boolean) => {
    setLoadingToken(true);
    try {
      const res = await fetch(`/api/livekit/token?room=${encodeURIComponent(roomName)}&username=${encodeURIComponent(username)}&isHost=${hostFlag}`);
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setWsUrl(data.wsUrl);
      }
    } catch (err) {
      console.error('Failed to fetch token:', err);
    } finally {
      setLoadingToken(false);
    }
  };

  // Handle Admin Start Stream
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
      comments: []
    };

    const updated = [newSession, ...sessions.filter(s => s.status !== 'LIVE')];
    saveSessions(updated);
    setActiveSession(newSession);
    setIsBroadcasting(true);

    // Fetch host token for room
    await fetchToken(newId, 'د. إسماعيل عيسى (الأدمن)', true);

    // Start local screen/cam recorder fallback for saving replay
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedBlobUrl(videoUrl);

        // Update session to RECORDED with videoUrl
        const finalSessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        const target = finalSessions.find((s: LiveSession) => s.id === newId);
        if (target) {
          target.status = 'RECORDED';
          target.endedAt = new Date().toISOString();
          target.recordedVideoUrl = videoUrl;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(finalSessions));
          setSessions(finalSessions);
        }
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
    } catch (err) {
      console.warn('Local recording not available or permissions denied:', err);
    }
  };

  // Handle Join Live Stream (for students & parents)
  const handleJoinLive = async () => {
    if (!currentLive) return;
    setActiveSession(currentLive);
    // Increment view count
    const updated = sessions.map(s => s.id === currentLive.id ? { ...s, views: s.views + 1 } : s);
    saveSessions(updated);

    await fetchToken(currentLive.id, 'طالب / ولي أمر', false);
  };

  // Handle End Stream (Admin)
  const handleEndStream = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // If recorder wasn't running, just set status RECORDED
      const updated = sessions.map(s => s.status === 'LIVE' ? {
        ...s,
        status: 'RECORDED' as const,
        endedAt: new Date().toISOString(),
        recordedVideoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
      } : s);
      saveSessions(updated);
    }

    setIsBroadcasting(false);
    setActiveSession(null);
    setToken('');
  };

  // Send Chat Comment
  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !activeSession) return;

    const newComment = {
      id: `c-${Date.now()}`,
      sender: isHost ? 'د. إسماعيل عيسى' : 'ولي الأمر',
      text: chatMessage,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    const updated = sessions.map(s => {
      if (s.id === activeSession.id) {
        return { ...s, comments: [...s.comments, newComment] };
      }
      return s;
    });

    saveSessions(updated);
    setActiveSession(prev => prev ? { ...prev, comments: [...prev.comments, newComment] } : null);
    setChatMessage('');
  };

  return (
    <div className="space-y-6 text-slate-900" dir="rtl">
      
      {/* ── HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 text-white shadow-xl border border-teal-500/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-300 border border-emerald-500/30">
                <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
                غرفة البث المباشر والتسجيلات — مدرسة الإخلاص
              </span>
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-300 border border-amber-500/30">
                الصف الأول الابتدائي
              </span>
            </div>
            <h2 className="mt-2 text-2xl md:text-3xl font-black text-white">
              البث المباشر التفاعلي والمحفوظ 🎥
            </h2>
            <p className="mt-1 text-sm font-semibold text-teal-100/80">
              بث مباشر حي مع د. إسماعيل عيسى — يمكن للطلاب وأولياء الأمور المشاهدة لايف أو الاستماع للتسجيلات المحفوظة في أي وقت.
            </p>
          </div>

          {/* Action Badge */}
          {currentLive ? (
            <div className="flex flex-col items-end gap-2">
              <span className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-black text-white shadow-lg animate-bounce">
                <span className="h-2.5 w-2.5 rounded-full bg-white animate-ping" />
                🔴 بث مباشر يعمل الآن!
              </span>
              {!isBroadcasting && (
                <button
                  onClick={handleJoinLive}
                  disabled={loadingToken}
                  className="flex items-center gap-2 rounded-xl bg-teal-400 hover:bg-teal-300 px-5 py-2.5 text-sm font-black text-slate-950 shadow-lg transition active:scale-95"
                >
                  <Eye className="h-4 w-4" />
                  دخول البث المباشر الآن
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-teal-200 border border-white/15 backdrop-blur-md">
              <Clock className="h-4 w-4 text-teal-300" />
              لا يوجد بث مباشر الآن — يمكنك تصفح الجلسات المحفوظة
            </div>
          )}
        </div>
      </div>

      {/* ── ADMIN CONTROL PANEL (For Admin/Doctor) ── */}
      {isHost && !isBroadcasting && (
        <div className="rounded-2xl border-2 border-dashed border-teal-500/30 bg-teal-50/50 p-6 shadow-sm">
          <div className="flex items-center gap-2 text-teal-900 font-black text-lg mb-3">
            <Video className="h-5 w-5 text-teal-600" />
            <h3>لوحة بدء البث المباشر (د. إسماعيل عيسى)</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">عنوان البث المباشر</label>
              <input
                type="text"
                value={streamTitle}
                onChange={(e) => setStreamTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-teal-600 focus:outline-none shadow-xs"
                placeholder="أدخل عنوان الحصّة أو الجلسة..."
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">الوصف والتفاصيل</label>
              <textarea
                value={streamDesc}
                onChange={(e) => setStreamDesc(e.target.value)}
                rows={2}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-teal-600 focus:outline-none shadow-xs"
                placeholder="وصف مختصر لموضوع البث..."
              />
            </div>

            <button
              onClick={handleStartStream}
              disabled={loadingToken || !streamTitle.trim()}
              className="flex items-center justify-center gap-2 w-full md:w-auto rounded-xl bg-emerald-600 hover:bg-emerald-700 px-7 py-3 text-sm font-black text-white shadow-lg transition active:scale-95 disabled:opacity-50"
            >
              <Radio className="h-5 w-5 text-emerald-200 animate-pulse" />
              ابدأ البث المباشر الفوري الآن 🔴
            </button>
          </div>
        </div>
      )}

      {/* ── LIVE BROADCAST PLAYER (ACTIVE ROOM) ── */}
      {activeSession && token && wsUrl && (
        <div className="rounded-2xl border border-slate-200 bg-slate-950 text-white overflow-hidden shadow-2xl space-y-0">
          
          {/* Top Room Bar */}
          <div className="flex items-center justify-between bg-slate-900 px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <div>
                <h3 className="font-black text-base text-white">{activeSession.title}</h3>
                <p className="text-xs font-bold text-teal-400">بواسطة: {activeSession.hostName}</p>
              </div>
            </div>

            {isHost && (
              <button
                onClick={handleEndStream}
                className="flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-black text-white transition active:scale-95 shadow-md"
              >
                <StopCircle className="h-4 w-4" />
                إنهاء البث وتكويش التسجيل ⏹️
              </button>
            )}
          </div>

          {/* Grid Layout: Video + Live Chat */}
          <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[450px]">
            
            {/* Main Video Stream Container */}
            <div className="lg:col-span-2 bg-black flex flex-col justify-between p-3 relative">
              <LiveKitRoom
                video={isHost}
                audio={isHost}
                token={token}
                serverUrl={wsUrl}
                data-lk-theme="default"
                style={{ height: '400px' }}
              >
                <VideoConference />
                <RoomAudioRenderer />
              </LiveKitRoom>
            </div>

            {/* Live Interactive Chat */}
            <div className="bg-slate-900 border-t lg:border-t-0 lg:border-r border-slate-800 flex flex-col justify-between p-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="font-black text-sm text-slate-200 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-teal-400" />
                    الدردشة التفاعلية المباشرة
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    {activeSession.comments.length} تعليق
                  </span>
                </div>

                {/* Messages List */}
                <div className="mt-3 space-y-2.5 max-h-[300px] overflow-y-auto pr-1 text-xs">
                  {activeSession.comments.length === 0 ? (
                    <p className="text-center text-slate-500 py-8 font-bold">
                      لا توجد تعليقات حتى الآن. كن أول من يرسل سؤالاً! 💬
                    </p>
                  ) : (
                    activeSession.comments.map(c => (
                      <div key={c.id} className="rounded-xl bg-slate-800/80 p-2.5 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-teal-300">{c.sender}</span>
                          <span className="text-[10px] text-slate-400">{c.time}</span>
                        </div>
                        <p className="text-slate-200 font-semibold leading-relaxed">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendComment} className="mt-3 pt-3 border-t border-slate-800 flex gap-2">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  placeholder="اكتب سؤالاً أو تعليقاً..."
                  className="flex-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-bold text-white focus:border-teal-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-teal-600 hover:bg-teal-500 px-3.5 py-2 text-xs font-black text-white transition"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── RECORDED SESSIONS / REPLAYS SECTION ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Video className="h-5 w-5 text-teal-700" />
            <h3 className="text-lg font-black text-slate-900">أرشيف الجلسات والحصص المحفوظة 📹</h3>
          </div>
          <span className="text-xs font-extrabold text-slate-500">
            متاحة دائمًا للطلاب وأولياء الأمور
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
                    <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {session.views} مشاهدة
                    </span>
                  </div>

                  <h4 className="font-black text-base text-slate-900 leading-snug">
                    {session.title}
                  </h4>
                  <p className="mt-1 text-xs font-bold text-slate-600 line-clamp-2">
                    {session.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500">
                    تقديم: {session.hostName}
                  </span>
                  <button
                    onClick={() => setSelectedRecordedSession(session)}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-black text-white transition active:scale-95 shadow-xs"
                  >
                    <Play className="h-3.5 w-3.5 fill-current text-teal-400" />
                    مشاهدة الحصّة المحفوظة
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── RECORDED VIDEO PLAYER MODAL ── */}
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
                className="rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-300"
              >
                إغلاق ✖
              </button>
            </div>

            {/* Video Player */}
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
