'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff, Phone, 
  MessageSquare, Users, Settings, MoreVertical, Play,
  Pen, Eraser, Square, Circle, X, Maximize, Clock, User, Send,
  Palette, Download, RefreshCw, AlertCircle, Copy, Check, Dot
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export default function MeetingsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const roomCodeParam = searchParams.get('room');
  const tokenParam = searchParams.get('t');
  
  // Views: 'list' | 'lobby' | 'room' | 'ended'
  const [currentView, setCurrentView] = useState<'list' | 'lobby' | 'room' | 'ended'>('list');
  
  // Lobby state
  const [userName, setUserName] = useState('');
  const [roomCodeInput, setRoomCodeInput] = useState(roomCodeParam || '');
  const [lobbyMediaState, setLobbyMediaState] = useState({ video: true, audio: true });
  
  // Room state
  const [roomState, setRoomState] = useState({
    videoEnabled: true,
    audioEnabled: true,
    screenSharing: false,
    whiteboardOpen: false,
    chatOpen: false,
    participantsOpen: true,
    recording: false,
  });
  
  // Chat state
  const [chatMessage, setChatMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'أحمد محمود', text: 'السلام عليكم ورحمة الله', time: '10:02', isMe: false },
    { id: 2, sender: 'د. إسماعيل', text: 'وعليكم السلام، أهلاً بكم جميعاً. سنبدأ بعد دقيقة.', time: '10:03', isMe: false },
  ]);
  
  // Timer state
  const [duration, setDuration] = useState(0);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const lobbyVideoRef = useRef<HTMLVideoElement>(null);
  
  // Set initial view based on URL params
  useEffect(() => {
    if (roomCodeParam) {
      setCurrentView('lobby');
    }
  }, [roomCodeParam]);

  // Handle local video stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    
    const startVideo = async () => {
      if ((currentView === 'lobby' && lobbyMediaState.video) || (currentView === 'room' && roomState.videoEnabled)) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          if (currentView === 'lobby' && lobbyVideoRef.current) {
            lobbyVideoRef.current.srcObject = stream;
          } else if (currentView === 'room' && videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
        }
      }
    };
    
    startVideo();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [currentView, lobbyMediaState.video, roomState.videoEnabled]);

  // Meeting timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentView === 'room') {
      interval = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentView]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleJoinLobby = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCodeInput.trim()) {
      router.push(`?room=${roomCodeInput}`);
      setCurrentView('lobby');
    }
  };

  const handleJoinRoom = () => {
    if (!userName.trim()) {
      setUserName('طالب');
    }
    setRoomState(prev => ({
      ...prev,
      videoEnabled: lobbyMediaState.video,
      audioEnabled: lobbyMediaState.audio
    }));
    setCurrentView('room');
  };

  const handleEndCall = () => {
    setCurrentView('ended');
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    
    setMessages([...messages, {
      id: Date.now(),
      sender: userName || 'أنت',
      text: chatMessage,
      time: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      isMe: true
    }]);
    setChatMessage('');
  };

  // List View (Navbar + Sidebar)
  if (currentView === 'list') {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto space-y-8">
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">الفصول الافتراضية</h1>
                  <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة وحضور المحاضرات المباشرة</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Join Form */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-4">
                    <Video className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">الانضمام لاجتماع</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">أدخل رمز الغرفة للانضمام إلى الفصل الافتراضي</p>
                  
                  <form onSubmit={handleJoinLobby} className="w-full space-y-3">
                    <input
                      type="text"
                      placeholder="رمز الغرفة (مثال: abc-defg-hij)"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value)}
                      className="w-full px-4 py-3 text-center bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
                      dir="ltr"
                      required
                    />
                    <button 
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-medium transition-colors"
                    >
                      دخول الغرفة
                    </button>
                  </form>
                </div>

                {/* Scheduled Meetings */}
                <div className="md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">المحاضرات المجدولة</h3>
                  
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div key={i} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4 mb-4 sm:mb-0 w-full sm:w-auto">
                          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Clock className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 dark:text-white">مراجعة فيزياء - الوحدة الثالثة</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">د. إسماعيل • اليوم، ٨:٠٠ مساءً</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setRoomCodeInput(`phy-${Math.floor(Math.random()*1000)}`);
                            setCurrentView('lobby');
                          }}
                          className="w-full sm:w-auto px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors"
                        >
                          استعداد
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>
    );
  }

  // Lobby View (Full Screen)
  if (currentView === 'lobby') {
    return (
      <div className="fixed inset-0 bg-[#0a0a0f] text-white flex flex-col" dir="rtl">
        <header className="p-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-2 text-xl font-bold">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span>مسار لايف</span>
          </div>
          <button 
            onClick={() => setCurrentView('list')}
            className="text-gray-400 hover:text-white flex items-center gap-2"
          >
            <span>عودة</span>
            <X className="w-5 h-5" />
          </button>
        </header>
        
        <div className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 gap-12 max-w-7xl mx-auto w-full">
          {/* Camera Preview */}
          <div className="w-full lg:w-2/3 max-w-3xl aspect-video bg-gray-900 rounded-3xl overflow-hidden relative shadow-2xl border border-gray-800">
            {lobbyMediaState.video ? (
              <video 
                ref={lobbyVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center text-4xl text-gray-400 font-bold">
                  {userName ? userName.charAt(0) : <User className="w-16 h-16" />}
                </div>
              </div>
            )}
            
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4">
              <button 
                onClick={() => setLobbyMediaState(p => ({ ...p, audio: !p.audio }))}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  lobbyMediaState.audio ? 'bg-gray-900/60 hover:bg-gray-800 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                } backdrop-blur-sm border border-gray-700`}
              >
                {lobbyMediaState.audio ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>
              <button 
                onClick={() => setLobbyMediaState(p => ({ ...p, video: !p.video }))}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  lobbyMediaState.video ? 'bg-gray-900/60 hover:bg-gray-800 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                } backdrop-blur-sm border border-gray-700`}
              >
                {lobbyMediaState.video ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </button>
            </div>
          </div>
          
          {/* Join Controls */}
          <div className="w-full lg:w-1/3 max-w-md flex flex-col items-center lg:items-start text-center lg:text-right">
            <h2 className="text-3xl font-bold mb-2">هل أنت مستعد للانضمام؟</h2>
            <p className="text-gray-400 mb-8">الغرفة: <span className="font-mono text-white bg-gray-800 px-2 py-1 rounded">{roomCodeInput || 'لا يوجد'}</span></p>
            
            <div className="w-full space-y-4">
              <div className="space-y-2 text-right">
                <label className="text-sm font-medium text-gray-400">اسمك للعرض</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="أدخل اسمك"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-4 text-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              
              <button 
                onClick={handleJoinRoom}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-900/20 transition-all flex items-center justify-center gap-2"
              >
                دخول الغرفة الان
              </button>
              
              <div className="pt-4 text-sm text-gray-500 text-center">
                تأكد من السماح بالوصول للميكروفون والكاميرا قبل الدخول.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Ended View
  if (currentView === 'ended') {
    return (
      <div className="fixed inset-0 bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold mb-4">انتهى الاجتماع</h1>
          <p className="text-gray-400 mb-8">لقد غادرت الفصل الافتراضي بنجاح.</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-800 rounded-2xl p-4">
              <div className="text-sm text-gray-500 mb-1">المدة</div>
              <div className="text-xl font-bold font-mono">{formatTime(duration)}</div>
            </div>
            <div className="bg-gray-800 rounded-2xl p-4">
              <div className="text-sm text-gray-500 mb-1">المشاركون</div>
              <div className="text-xl font-bold">8</div>
            </div>
          </div>
          
          <button 
            onClick={() => setCurrentView('list')}
            className="w-full bg-white text-black hover:bg-gray-200 py-3 rounded-xl font-bold transition-colors"
          >
            العودة للصفحة الرئيسية
          </button>
        </div>
      </div>
    );
  }

  // Active Room View
  return (
    <div className="fixed inset-0 bg-[#0a0a0f] text-white flex flex-col overflow-hidden font-sans" dir="rtl">
      
      {/* Top Bar */}
      <header className="h-16 flex items-center justify-between px-4 lg:px-6 z-40 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0">
        <div className="flex items-center gap-3">
          <div className="bg-red-500 animate-pulse w-2.5 h-2.5 rounded-full shadow-[0_0_8px_#ef4444]"></div>
          <span className="font-bold text-sm bg-black/40 px-3 py-1 rounded-md backdrop-blur-md border border-white/10 tracking-wider">LIVE</span>
          <span className="text-gray-300 font-mono text-sm ml-2 bg-black/40 px-3 py-1 rounded-md backdrop-blur-md border border-white/10">{formatTime(duration)}</span>
        </div>
        
        <div className="flex items-center gap-4 bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10">
          <span className="text-sm font-medium text-gray-300">{roomCodeInput || 'room-123'}</span>
          <div className="w-px h-4 bg-white/20"></div>
          <button className="text-emerald-400 hover:text-emerald-300 transition-colors text-sm font-medium flex items-center gap-1.5">
            <Copy className="w-3.5 h-3.5" /> نسخ الرابط
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden pt-16 pb-20 relative">
        
        {/* Screen Share Banner */}
        {roomState.screenSharing && (
          <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-50 bg-emerald-600/90 backdrop-blur-md px-6 py-2 rounded-full border border-emerald-400/30 flex items-center gap-3 shadow-xl shadow-emerald-900/20 animate-in fade-in slide-in-from-top-4">
            <MonitorUp className="w-4 h-4 text-emerald-100 animate-pulse" />
            <span className="font-medium text-sm">أنت تشارك شاشتك الآن</span>
            <button 
              onClick={() => setRoomState(p => ({ ...p, screenSharing: false }))}
              className="ml-2 bg-black/20 hover:bg-black/40 px-3 py-1 rounded-full text-xs font-bold transition-colors"
            >
              إيقاف
            </button>
          </div>
        )}

        {/* Video Grid Area */}
        <div className={`flex-1 p-4 flex gap-4 transition-all duration-300 ${roomState.chatOpen || roomState.participantsOpen ? 'lg:w-[calc(100%-340px)]' : 'w-full'}`}>
          
          {/* Main Speaker View (or Screen Share/Whiteboard) */}
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex-1 relative rounded-3xl overflow-hidden bg-gray-900 border border-gray-800 shadow-2xl">
              
              {roomState.whiteboardOpen ? (
                <Whiteboard onClose={() => setRoomState(p => ({...p, whiteboardOpen: false}))} />
              ) : roomState.screenSharing ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800 border-2 border-emerald-500/30">
                   <MonitorUp className="w-20 h-20 text-emerald-500/50 mb-4" />
                   <h3 className="text-xl font-bold text-gray-200">شاشتك قيد المشاركة</h3>
                   <p className="text-gray-500 mt-2">يرى الآخرون ما تعرضه على شاشتك.</p>
                </div>
              ) : (
                <>
                  <img src="https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1000&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-cover opacity-80" alt="Speaker" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                  <div className="absolute bottom-6 right-6 flex items-center gap-3">
                    <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl flex items-center gap-2 border border-white/10">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span className="font-bold text-white shadow-sm">د. إسماعيل (المعلم)</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {/* Horizontal Participants Row (Visible when sidebar is closed or small screen) */}
            <div className="h-40 flex gap-4 overflow-x-auto pb-2 snap-x scrollbar-thin scrollbar-thumb-gray-700">
              {/* Me */}
              <div className="relative min-w-[200px] h-full rounded-2xl overflow-hidden bg-gray-800 border border-gray-700 snap-center shrink-0">
                {roomState.videoEnabled ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center text-2xl font-bold text-gray-300">
                      {userName ? userName.charAt(0) : 'أ'}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 border border-white/10">
                  <span className="text-xs font-medium text-gray-200">أنت</span>
                </div>
                {!roomState.audioEnabled && (
                  <div className="absolute top-2 left-2 bg-red-500/80 backdrop-blur-md p-1 rounded-md">
                    <MicOff className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
              
              {/* Other Participants */}
              {[
                { name: 'أحمد محمود', color: 'bg-blue-600', active: false },
                { name: 'سارة خالد', color: 'bg-purple-600', active: true },
                { name: 'محمد علي', color: 'bg-orange-600', active: false },
                { name: 'فاطمة سعد', color: 'bg-pink-600', active: false },
                { name: 'عمر زيد', color: 'bg-indigo-600', active: false }
              ].map((p, i) => (
                <div key={i} className={`relative min-w-[200px] h-full rounded-2xl overflow-hidden bg-gray-800 border snap-center shrink-0 ${p.active ? 'border-emerald-500' : 'border-gray-700'}`}>
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800/80">
                    <div className={`w-16 h-16 ${p.color} rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg`}>
                      {p.name.charAt(0)}
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 border border-white/10">
                    <span className="text-xs font-medium text-gray-200">{p.name}</span>
                  </div>
                  {!p.active && (
                    <div className="absolute top-2 left-2 bg-red-500/80 backdrop-blur-md p-1 rounded-md">
                      <MicOff className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar (Chat & Participants) */}
        {(roomState.chatOpen || roomState.participantsOpen) && (
          <div className="w-[340px] shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col m-4 mr-0 rounded-3xl overflow-hidden shadow-2xl relative z-10 transition-all duration-300">
            
            {/* Tabs */}
            <div className="flex bg-gray-900 border-b border-gray-800 p-2 gap-2">
              <button 
                onClick={() => setRoomState(p => ({ ...p, chatOpen: true, participantsOpen: false }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${roomState.chatOpen ? 'bg-gray-800 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
              >
                <MessageSquare className="w-4 h-4" /> المحادثة
              </button>
              <button 
                onClick={() => setRoomState(p => ({ ...p, chatOpen: false, participantsOpen: true }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${roomState.participantsOpen ? 'bg-gray-800 text-emerald-400' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'}`}
              >
                <Users className="w-4 h-4" /> المشاركون (7)
              </button>
            </div>

            {/* Chat Content */}
            {roomState.chatOpen && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-700">
                  <div className="text-center text-xs text-gray-500 my-4 bg-gray-800/50 py-1 px-3 rounded-full mx-auto w-max border border-gray-800">
                    الرسائل مشفرة ومحفوظة أثناء الجلسة
                  </div>
                  
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.isMe ? 'items-start' : 'items-end'}`}>
                      <span className="text-xs text-gray-500 mb-1 px-1">{msg.sender} • {msg.time}</span>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[85%] ${
                        msg.isMe 
                        ? 'bg-emerald-600 text-white rounded-tr-sm' 
                        : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-sm'
                      }`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="p-4 bg-gray-900 border-t border-gray-800">
                  <form onSubmit={handleSendMessage} className="relative flex items-center">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="اكتب رسالة..."
                      className="w-full bg-gray-800 border border-gray-700 rounded-full pl-12 pr-4 py-3 text-sm text-white focus:ring-1 focus:ring-emerald-500 outline-none"
                    />
                    <button 
                      type="submit"
                      disabled={!chatMessage.trim()}
                      className="absolute left-2 w-8 h-8 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-full flex items-center justify-center transition-colors"
                    >
                      <Send className="w-4 h-4 rtl:-scale-x-100" />
                    </button>
                  </form>
                </div>
              </>
            )}

            {/* Participants Content */}
            {roomState.participantsOpen && (
              <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-700">
                <div className="space-y-1">
                  
                  {/* Host */}
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-800 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img src="https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=100&auto=format&fit=crop" className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500" alt="Host" />
                        <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-4 h-4 rounded-full border-2 border-gray-900 flex items-center justify-center">
                          <Check className="w-2 h-2 text-white" />
                        </div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-200 flex items-center gap-2">د. إسماعيل <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-300 font-normal">مضيف</span></div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      <Mic className="w-4 h-4 text-emerald-400" />
                      <Video className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Me */}
                  <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-800 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-gray-300 font-bold border-2 border-gray-600">
                        {userName ? userName.charAt(0) : 'أ'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-emerald-400">{userName || 'أنت'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      {roomState.audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-red-400" />}
                      {roomState.videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-red-400" />}
                    </div>
                  </div>

                  {/* Others */}
                  {[
                    { name: 'أحمد محمود', color: 'bg-blue-600', mic: false, video: true },
                    { name: 'سارة خالد', color: 'bg-purple-600', mic: true, video: false },
                    { name: 'محمد علي', color: 'bg-orange-600', mic: false, video: false },
                    { name: 'فاطمة سعد', color: 'bg-pink-600', mic: false, video: false },
                    { name: 'عمر زيد', color: 'bg-indigo-600', mic: false, video: false }
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-800 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${p.color} rounded-full flex items-center justify-center text-white font-bold`}>
                          {p.name.charAt(0)}
                        </div>
                        <div className="text-sm font-medium text-gray-300">{p.name}</div>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        {p.mic ? <Mic className="w-4 h-4 text-gray-300" /> : <MicOff className="w-4 h-4 text-red-500/70" />}
                        {p.video ? <Video className="w-4 h-4 text-gray-300" /> : <VideoOff className="w-4 h-4" />}
                      </div>
                    </div>
                  ))}

                </div>
              </div>
            )}
            
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="h-20 bg-gray-900 border-t border-gray-800 flex items-center justify-between px-6 z-40 absolute bottom-0 left-0 right-0">
        
        {/* Left: Info */}
        <div className="flex items-center gap-4 w-1/3">
          <div className="text-sm text-gray-400 font-medium truncate">
            المحاضرة المباشرة: مراجعة الوحدة الثالثة
          </div>
        </div>

        {/* Center: Main Controls */}
        <div className="flex items-center justify-center gap-3 w-1/3">
          <button 
            onClick={() => setRoomState(p => ({ ...p, audioEnabled: !p.audioEnabled }))}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              roomState.audioEnabled 
              ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700' 
              : 'bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50'
            }`}
          >
            {roomState.audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>
          
          <button 
            onClick={() => setRoomState(p => ({ ...p, videoEnabled: !p.videoEnabled }))}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              roomState.videoEnabled 
              ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700' 
              : 'bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50'
            }`}
          >
            {roomState.videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>
          
          <button 
            onClick={() => setRoomState(p => ({ ...p, screenSharing: !p.screenSharing, whiteboardOpen: false }))}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              roomState.screenSharing 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
              : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
            }`}
            title="مشاركة الشاشة"
          >
            {roomState.screenSharing ? <MonitorUp className="w-5 h-5" /> : <MonitorOff className="w-5 h-5 text-gray-400" />}
          </button>

          <button 
            onClick={() => setRoomState(p => ({ ...p, whiteboardOpen: !p.whiteboardOpen, screenSharing: false }))}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              roomState.whiteboardOpen 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
              : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
            }`}
            title="السبورة البيضاء"
          >
            <Pen className="w-5 h-5" />
          </button>

          <button 
            onClick={handleEndCall}
            className="w-16 h-12 rounded-2xl flex items-center justify-center bg-red-600 hover:bg-red-500 text-white transition-all shadow-lg shadow-red-600/20 ml-4"
            title="مغادرة الاجتماع"
          >
            <Phone className="w-5 h-5 rotate-[135deg]" />
          </button>
        </div>

        {/* Right: Side Panel Toggles */}
        <div className="flex items-center justify-end gap-3 w-1/3">
          <button 
            onClick={() => setRoomState(p => ({ 
              ...p, 
              participantsOpen: !p.participantsOpen,
              chatOpen: !p.participantsOpen ? false : p.chatOpen
            }))}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              roomState.participantsOpen ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <Users className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => setRoomState(p => ({ 
              ...p, 
              chatOpen: !p.chatOpen,
              participantsOpen: !p.chatOpen ? false : p.participantsOpen 
            }))}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              roomState.chatOpen ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            {!roomState.chatOpen && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border border-gray-900"></span>
            )}
          </button>
          
          <button className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-800 hover:text-white transition-all">
            <Settings className="w-5 h-5" />
          </button>
        </div>
        
      </div>
    </div>
  );
}

// Whiteboard Component
function Whiteboard({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#10b981'); // Emerald
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [lineWidth, setLineWidth] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = '#ffffff'; // White background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    
    let x, y;
    if ('touches' in e) {
      const rect = canvas.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }
    
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let x, y;
    if ('touches' in e) {
      const rect = canvas.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.nativeEvent.offsetX;
      y = e.nativeEvent.offsetY;
    }

    ctx.lineTo(x, y);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
    ctx.lineWidth = tool === 'eraser' ? 20 : lineWidth;
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

  const colors = ['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b'];

  return (
    <div className="absolute inset-0 bg-white rounded-3xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
      {/* Whiteboard Toolbar */}
      <div className="h-14 bg-gray-50 border-b border-gray-200 flex items-center justify-between px-4 z-10" dir="rtl">
        <div className="flex items-center gap-2">
          <div className="font-bold text-gray-700 flex items-center gap-2">
            <Palette className="w-5 h-5 text-emerald-600" /> السبورة التفاعلية
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white px-4 py-1.5 rounded-full shadow-sm border border-gray-200">
          <button 
            onClick={() => setTool('pen')}
            className={`p-2 rounded-lg transition-colors ${tool === 'pen' ? 'bg-emerald-100 text-emerald-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Pen className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-lg transition-colors ${tool === 'eraser' ? 'bg-emerald-100 text-emerald-600' : 'text-gray-500 hover:bg-gray-100'}`}
          >
            <Eraser className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-200 mx-2"></div>
          
          <div className="flex gap-2">
            {colors.map(c => (
              <button 
                key={c}
                onClick={() => { setColor(c); setTool('pen'); }}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c && tool === 'pen' ? 'scale-125 border-gray-400' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          
          <div className="w-px h-6 bg-gray-200 mx-2"></div>
          
          <button 
            onClick={clearCanvas}
            className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            مسح الكل
          </button>
        </div>
        
        <div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="flex-1 w-full h-full cursor-crosshair touch-none"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseOut={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
    </div>
  );
}
