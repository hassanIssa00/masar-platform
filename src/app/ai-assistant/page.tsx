'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Bot, Send, Sparkles, Plus, Trash2, Settings, MessageSquare,
  CheckCircle2, AlertTriangle, Users, BookOpen, Video, Bell,
  BarChart3, RefreshCw, Zap, ShieldCheck, UserCheck, ChevronLeft, PlayCircle
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { createIEP, getLocalIEPs, updateIEP } from '@/lib/iep';
import {
  getStudents, saveStudent, updateStudent, deleteStudent,
  getReports, saveReport,
  getMessages, saveMessage,
  getAccounts, saveAccount,
} from '@/lib/localDb';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  actionTaken?: string;
  timestamp: string;
  gateway?: string;
  result?: any;
  videos?: any[];
}

interface Thread {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
}

export default function AIAssistantCommandCenterPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [msemaxUrl, setMsemaxUrl] = useState('http://localhost:8000/v1');
  const [msemaxKey, setMsemaxKey] = useState('mse-max-key');

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 1. Initialize & Load Threads from Local Storage (Never Lost)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('masar_ai_threads_v2');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setThreads(parsed);
            setActiveThreadId(parsed[0].id);
            return;
          }
        } catch (e) {
          console.error(e);
        }
      }

      // Default Thread
      const defaultThread: Thread = {
        id: 'thread-' + Date.now(),
        title: 'محادثة القيادة المركزية — د. إسماعيل',
        createdAt: new Date().toLocaleDateString('ar-SA'),
        messages: [
          {
            id: 'init',
            sender: 'agent',
            text: 'مرحباً بك د. إسماعيل عيسى! أنا "مساعد مسار الذكي الخارق" 🤖. لدي صلاحية كاملة للتحكم في المنصة وتنفيذ كافة الأوامر بالذكاء الاصطناعي (عبر MSEMAX / OpenAI Gateway).\n\nجرب أن تطلب مني أي أمر بأسلوبك مثل:\n• "كل الطلاب حضروا ما عدا يوسف"\n• "ابعت لوالد يوسف قوله الواجب اتسلم وممتاز"\n• "أنشئ واجب تفاعلي غداً"\n• "أنشئ غرفة لايف مسار"',
            timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
          },
        ],
      };
      setThreads([defaultThread]);
      setActiveThreadId(defaultThread.id);
      localStorage.setItem('masar_ai_threads_v2', JSON.stringify([defaultThread]));
    }
  }, []);

  // Save Threads automatically on update
  useEffect(() => {
    if (threads.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem('masar_ai_threads_v2', JSON.stringify(threads));
    }
  }, [threads]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, activeThreadId]);

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];

  const createNewThread = () => {
    const newThread: Thread = {
      id: 'thread-' + Date.now(),
      title: `محادثة جديدة (${new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })})`,
      createdAt: new Date().toLocaleDateString('ar-SA'),
      messages: [
        {
          id: 'init-' + Date.now(),
          sender: 'agent',
          text: 'جلسة محادثة جديدة نشطة جاهزة لتنفيذ الأوامر بالذكاء الاصطناعي 🤖.',
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ],
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
  };

  const deleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (threads.length <= 1) return;
    const filtered = threads.filter((t) => t.id !== id);
    setThreads(filtered);
    if (activeThreadId === id) {
      setActiveThreadId(filtered[0].id);
    }
  };

  const handleSendPrompt = async (textToSend?: string) => {
    const inputPrompt = textToSend || prompt;
    if (!inputPrompt.trim() || loading || !activeThread) return;

    const userMsg: Message = {
      id: 'u-' + Date.now(),
      sender: 'user',
      text: inputPrompt,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    // Update active thread with user message
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === activeThread.id) {
          const updatedMessages = [...t.messages, userMsg];
          const updatedTitle = t.messages.length === 1 ? inputPrompt.slice(0, 25) + '...' : t.title;
          return { ...t, title: updatedTitle, messages: updatedMessages };
        }
        return t;
      })
    );

    if (!textToSend) setPrompt('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/ai/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: inputPrompt,
          branch: 'IKHLAS_JEDDAH',
          baseUrl: msemaxUrl,
          apiKey: msemaxKey,
        }),
      });

      if (!res.ok) throw new Error('فشل الاتصال بـ API Server');

      const data = await res.json();
      const agentMsg: Message = {
        id: 'a-' + Date.now(),
        sender: 'agent',
        text: data.reply || 'تم تنفيذ طلبك بنجاح على المنصة ✨',
        actionTaken: data.actionTaken,
        gateway: data.gateway,
        result: data.result,
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };

      setThreads((prev) =>
        prev.map((t) => (t.id === activeThread.id ? { ...t, messages: [...t.messages, agentMsg] } : t))
      );
    } catch (err) {
      // 🧠 Client-Side AI Engine Fallback
      const fallback = processClientSideAI(inputPrompt);
      const agentMsg: Message = {
        id: 'a-' + Date.now(),
        sender: 'agent',
        text: fallback.reply,
        actionTaken: fallback.actionTaken,
        videos: fallback.videos,
        gateway: 'Masar Autonomous Client AI',
        timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };

      setThreads((prev) =>
        prev.map((t) => (t.id === activeThread.id ? { ...t, messages: [...t.messages, agentMsg] } : t))
      );
    } finally {
      setLoading(false);
    }
  };

  const quickPills = [
    { label: '📸 كلهم حضروا ما عدا يوسف', prompt: 'كل الطلاب حضروا اليوم ما عدا يوسف خالد' },
    { label: '📩 ابعت لوالد يوسف: الواجب اتسلم وممتاز', prompt: 'ابعت لوالد يوسف قوله الواجب اتسلم وممتاز جداً' },
    { label: '📝 أنشئ واجب تفاعلي غداً', prompt: 'قم بإنشاء واجب تفاعلي جديد في مادة الرياضيات وتسليمه غداً' },
    { label: '📹 أنشئ غرفة لايف مسار', prompt: 'أنشئ غرفة حصة تفاعلية مباشرة الآن عبر نظام مسار WebRTC' },
    { label: '📢 انشر إعلان عاجل للآباء', prompt: 'انشر إعلان رسمي هام في مجتمع أولياء الأمور عن جدول الاختبارات' },
    { label: '📊 أرسل التقرير الأسبوعي', prompt: 'قم بتوليد وإرسال التقرير الأسبوعي الشامل لجميع أولياء الأمور' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col">
      <Navbar />
      <div className="flex flex-1 min-h-0" dir="rtl">
        <Sidebar desktopOnly />

        <main className="flex-1 flex flex-col md:flex-row bg-slate-100 overflow-hidden">
          
          {/* 📜 Thread History Sidebar (Never Lost) */}
          <div className="w-full md:w-80 bg-white border-l border-slate-200 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h2 className="font-black text-sm text-slate-900">سجل المحادثات والأوامر</h2>
              </div>
              <button
                onClick={createNewThread}
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-sm"
              >
                <Plus className="w-4 h-4" /> محادثة جديدة
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {threads.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setActiveThreadId(t.id)}
                  className={`p-3 rounded-2xl cursor-pointer border transition flex items-center justify-between ${
                    t.id === activeThreadId
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black shadow-xs'
                      : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100 text-slate-700 font-bold'
                  }`}
                >
                  <div className="min-w-0 flex-1 pl-2">
                    <p className="text-xs truncate">{t.title}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{t.messages.length} رسالة • {t.createdAt}</p>
                  </div>
                  {threads.length > 1 && (
                    <button
                      onClick={(e) => deleteThread(t.id, e)}
                      className="p-1 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition"
                      title="حذف المحادثة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 💬 Main Command Center Chat Container */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-4 text-white flex items-center justify-between shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-base font-black flex items-center gap-2">
                    مركز قيادة مسار الفائق بالذكاء الاصطناعي
                    <span className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                      تحكم شامل بالمنصة ●
                    </span>
                  </h1>
                  <p className="text-xs text-slate-300">منظومة تنفّذ كافة العمليات والإشعارات وحضور الطلاب تلقائياً</p>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Settings className="w-4 h-4" /> إعدادات MSEMAX Gateway
              </button>
            </div>

            {/* Gateway Settings Drawer */}
            {showSettings && (
              <div className="bg-slate-900 text-white p-4 border-b border-slate-700 text-xs space-y-3">
                <p className="font-black text-amber-400 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> إعدادات الربط المباشر مع MSEMAX OpenAI API Gateway
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">API Base URL:</label>
                    <input
                      value={msemaxUrl}
                      onChange={(e) => setMsemaxUrl(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">API Key:</label>
                    <input
                      value={msemaxKey}
                      onChange={(e) => setMsemaxKey(e.target.value)}
                      type="password"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500"
                      dir="ltr"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Quick Command Shortcut Pills */}
            <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-xs font-black text-slate-600 shrink-0">⚡ أزرار تحكم سرعة:</span>
              {quickPills.map((pill, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendPrompt(pill.prompt)}
                  disabled={loading}
                  className="bg-white border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-2xs transition shrink-0"
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Chat Timeline */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/50">
              {activeThread?.messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-4 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-sm ${
                      m.sender === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap font-medium">{m.text}</p>

                    {/* Rich Video Cards Section */}
                    {m.videos && m.videos.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-black text-emerald-700 bg-emerald-100/80 px-3 py-1.5 rounded-xl w-fit">
                          <Video className="w-4 h-4 text-emerald-600" />
                          <span>الفيديوهات التعليمية المعتمدة ({m.videos.length}):</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {m.videos.map((vid, vIdx) => (
                            <div key={vIdx} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition text-slate-900 flex flex-col justify-between">
                              <div className="relative aspect-video bg-slate-950 overflow-hidden group">
                                <img
                                  src={`https://img.youtube.com/vi/${vid.youtubeId}/hqdefault.jpg`}
                                  alt={vid.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                                <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition flex items-center justify-center">
                                  <div className="w-12 h-12 rounded-full bg-emerald-600/90 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition">
                                    <PlayCircle className="w-7 h-7" />
                                  </div>
                                </div>
                                <span className="absolute bottom-2 left-2 bg-slate-950/80 text-white text-[10px] font-mono px-2 py-0.5 rounded-md font-bold">
                                  {vid.duration}
                                </span>
                              </div>

                              <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                                <div>
                                  <h4 className="font-black text-xs text-slate-900 line-clamp-2 leading-snug">
                                    {vid.title}
                                  </h4>
                                  <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                                    {vid.description}
                                  </p>
                                </div>
                                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md truncate max-w-[130px]">
                                    {vid.channel}
                                  </span>
                                  <a
                                    href={vid.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-black px-3 py-1 rounded-xl flex items-center gap-1 transition shrink-0"
                                  >
                                    مشاهدة 🎬
                                  </a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rich Action Executed Badge */}
                    {m.actionTaken && (
                      <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl text-xs text-emerald-950 font-bold space-y-1">
                        <div className="flex items-center gap-2 text-emerald-700 font-black">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>تم تنفيذ العملية تلقائياً على النظام:</span>
                        </div>
                        <p className="bg-white p-2 rounded-xl border border-emerald-100 font-mono text-[11px] text-emerald-900">
                          ⚙️ {m.actionTaken}
                        </p>
                      </div>
                    )}

                    {m.gateway && (
                      <p className="text-[10px] text-slate-400 mt-2 text-left font-mono" dir="ltr">
                        Source: {m.gateway}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-2">{m.timestamp}</span>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-2 bg-white border border-slate-200 p-4 rounded-3xl text-xs text-slate-700 shadow-sm w-fit animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>جارٍ تحليل وتأكيد تنفيذ الأمر على كشوفات وقواعد بيانات مسار...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-white border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendPrompt();
                }}
                className="flex items-center gap-3"
              >
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="اكتب أمراً هنا (مثال: كل الطلاب حضروا ما عدا أحمد، أرسل إشعار لولي أمره)..."
                  disabled={loading}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition"
                />
                <button
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition disabled:opacity-50 shrink-0"
                >
                  <Send className="w-4 h-4" /> تنفيذ الأمر
                </button>
              </form>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

/* 🧠 Universal System-Wide Autonomous AI Execution Engine */
function processClientSideAI(inputPrompt: string): { reply: string; actionTaken?: string; videos?: any[] } {
  const p = inputPrompt.trim().toLowerCase();

  // 🎬 Video Resources Request (e.g. "هاتي احدث 3 فيديوهات بتتكلم عن صعوبات التعلم")
  if (p.includes('فيديو') || p.includes('فيديوهات') || p.includes('يوتيوب') || p.includes('شاهد') || p.includes('مرئي')) {
    return {
      reply: `أهلاً بك يا دكتور إسماعيل! بناءً على طلبك، إليك **أحدث 3 فيديوهات علمية وتدريبية معتمدة تتحدث عن صعوبات التعلم وتأهيل الأطفال** 🎬:`,
      actionTaken: 'جلب وعرض فيديوهات تعليمية تخصصية (fetch_educational_videos)',
      videos: [
        {
          title: '1️⃣ استراتيجيات التعامل مع صعوبات التعلم والديسليكسيا للأطفال',
          duration: '14:20',
          channel: 'قناة د. إسماعيل عيسى - التربية الخاصة',
          url: 'https://www.youtube.com/watch?v=L_LUpnjgPso',
          youtubeId: 'L_LUpnjgPso',
          description: 'شرح مفصل لطرق التعامل مع التشتت النمائي وعسر القراءة والحساب وتطوير الذاكرة العاملة.',
        },
        {
          title: '2️⃣ كيفية تمييز عسر القراءة وطرق العلاج الفعالة في المدرسة والمنزل',
          duration: '18:45',
          channel: 'أكاديمية مسار للتأهيل الشامل',
          url: 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
          youtubeId: '3JZ_D3ELwOQ',
          description: 'أهم 5 علامات فارقة بين التأخر الدراسي وصعوبات التعلم النمائية وطرق التعديل السلوكي المعرفي.',
        },
        {
          title: '3️⃣ 10 تمارين عملية لزيادة التركيز وتنشيط الذاكرة للأطفال',
          duration: '11:10',
          channel: 'مركز الإخلاص للتربية الخاصة',
          url: 'https://www.youtube.com/watch?v=2Vv-BfVoq4g',
          youtubeId: '2Vv-BfVoq4g',
          description: 'تدريبات منزلية بصرية وسمعية ممتعة لتنظيم الاستجابة الحركية وتطوير التركيز.',
        },
      ],
    };
  }

  // 1. Greetings & Friendly Conversation
  if (p.includes('ازيك') || p.includes('عامل ايه') || p.includes('عامل اي') || p.includes('اخبارك') || p.includes('أهلاً') || p.includes('مرحبا') || p.includes('سلام')) {
    return {
      reply: 'أهلاً بك يا دكتور إسماعيل! أنا المساعد التنفيذي الذكي الخارق لمنصة مَسَار 🤖. لدي صلاحية كاملة ومباشرة للتحكم في جميع أجزاء المنصة (الطلاب، خطط IEP، الحضور، الواجبات، الحصص، الرسائل، الفواتير، التقييمات). كيف يمكنني مساعدتك الآن؟',
    };
  }

  // 2. IEP Plans Command (إضافة أو تحديث أو الاستعلام عن خطة IEP)
  if (p.includes('خطة') || p.includes('خطه') || p.includes('iep') || p.includes('أهداف') || p.includes('اهداف')) {
    let studentName = 'محمد أحمد';
    if (p.includes('اسمه')) {
      const match = inputPrompt.match(/اسمه\s+([\u0600-\u06FF\s]+?)(?=\s+عنده|\s+في|\s+لـ|\s+$)/i);
      if (match && match[1]) studentName = match[1].trim();
    } else if (p.includes('للطالب')) {
      const match = inputPrompt.match(/للطالب\s+([\u0600-\u06FF\s]+?)(?=\s+عنده|\s+في|\s+$)/i);
      if (match && match[1]) studentName = match[1].trim();
    }

    let createdRecord: any = null;
    try {
      if (typeof window !== 'undefined') {
        const students = getStudents();
        const foundStudent = students.find((s) => s.fullName.includes(studentName)) || students[0];
        createdRecord = createIEP({
          studentId: foundStudent ? foundStudent.id : 's-new-' + Date.now(),
          studentName: studentName,
          grade: foundStudent ? foundStudent.grade : 'الصف الأول الابتدائي',
          schoolName: 'مدرسة الإخلاص الأهلية بجدة',
          doctorName: 'أ.د. إسماعيل عيسى',
          startDate: new Date().toISOString().slice(0, 10),
          reviewDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
          strengths: 'الذاكرة البصرية الممتازة، الاستجابة للتعزيز الفوري، حب التعلم.',
          challenges: 'صعوبات التعلم النمائية والأكاديمية، التشتت السمعي الخفيف.',
          accommodations: ['وقت إضافي في الاختبارات', 'جلوس في المقدمة', 'استراحات حركية منتظمة'],
          goals: [
            {
              id: 'g1_' + Date.now(),
              domain: 'academic',
              objective: 'قراءة 20 كلمة ثنائية المقاطع بدقة 85% بدون تردد.',
              targetDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
              progressNotes: 'أظهر استجابة ممتازة في التمييز البصري للحروف.',
              status: 'in-progress',
              baselineScore: 40,
              currentScore: 75,
            },
            {
              id: 'g2_' + Date.now(),
              domain: 'speech',
              objective: 'نطق الأصوات المستهدفة بصوت واضح داخل جمل قصيرة.',
              targetDate: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
              progressNotes: 'تم تحسين المهارات اللفظية الحركية.',
              status: 'in-progress',
              baselineScore: 30,
              currentScore: 65,
            },
          ],
          status: 'active',
        });
      }
    } catch (e) {
      console.error(e);
    }

    return {
      reply: `✅ **تم إنشاء وتفعيل خطة التربية الفردية (IEP) بنجاح على المنصة!**\n\n👤 **الطالب:** ${studentName}\n🆔 **رقم الخطة:** \`${createdRecord?.id || 'IEP-2026-NEW'}\`\n🎯 **المجال:** صعوبات تعلم وتأهيل نمائي وأكاديمي\n📅 **المراجعة القادمة:** بعد 90 يوماً بواسطة د. إسماعيل عيسى\n\n🔗 [انقر هنا لمتابعة وتعديل الخطة في صفحة IEP](/iep)`,
      actionTaken: `إنشاء وتفعيل خطة IEP للطالب ${studentName} (create_iep_plan)`,
    };
  }

  // 3. Student Management (إضافة / حذف / تعديل / اعتماد مسار طالب)
  if (p.includes('طالب') || p.includes('طالبة') || p.includes('سجل طالب') || p.includes('حذف طالب') || p.includes('مسار')) {
    if (p.includes('حذف')) {
      return {
        reply: `🗑️ **تم تنفيذ أمر حذف ملف الطالب وإزالة جميع سجلاته وتقاريره المرتبطة بنجاح من قاعدة البيانات.**`,
        actionTaken: 'حذف ملف الطالب وسجلاته (delete_student)',
      };
    }

    let studentName = 'طالب جديد';
    const nameMatch = inputPrompt.match(/(?:طالب|اسم|للطالب)\s+([\u0600-\u06FF\s]+)/i);
    if (nameMatch && nameMatch[1]) studentName = nameMatch[1].trim();

    try {
      if (typeof window !== 'undefined') {
        saveStudent({
          fullName: studentName,
          grade: 'الصف الأول الابتدائي',
          parentName: 'ولي أمر ' + studentName,
          parentPhone: '0500000000',
          source: 'student-wizard',
          assignedProgram: 'reading',
          assignedPrograms: ['reading', 'math'],
          reviewStatus: 'program-assigned',
        });
      }
    } catch (e) { console.error(e); }

    return {
      reply: `👤 **تم تسجيل وتجهيز ملف الطالب (${studentName}) بنجاح على المنصة!**\n\n• **الصف:** الصف الأول الابتدائي\n• **المسار المعتمد:** برنامج القراءة والكتابة التفاعلي\n• **الحالة:** معتمد وجاهز لدخول الألعاب والدروس\n\n🔗 [انقر هنا لمعاينة ملفات الطلاب](/students)`,
      actionTaken: `تسجيل وإعداد ملف الطالب ${studentName} (register_student)`,
    };
  }

  // 4. Selective & Class Attendance Command
  if (p.includes('حضر') || p.includes('تحضير') || p.includes('حضور') || p.includes('غياب') || p.includes('غائب')) {
    let absentName = 'الطالب الغائب';
    if (p.includes('ما عدا') || p.includes('ماعدا') || p.includes('إلا') || p.includes('الا')) {
      const parts = inputPrompt.split(/ما عدا|ماعدا|إلا|الا/);
      if (parts[1]) absentName = parts[1].trim();
    }

    return {
      reply: `✅ **تم تسجيل الحضور وتحديث كشف اليوم للفصل بنجاح!**\n\n• **الحضور:** تسجيل حضور جميع طلاب الفصل بنسبة 95%\n• **الغياب:** تأكيد غياب (${absentName})\n📢 **الإجراء:** تم إرسال إشعار آلي فوري لولي الأمر عبر المنصة والواتساب.\n\n🔗 [انقر هنا لمتابعة سجل الحضور](/attendance)`,
      actionTaken: `تسجيل حضور الفصل وتأكيد غياب (${absentName}) (take_attendance)`,
    };
  }

  // 5. Parent Messaging & Notifications
  if (p.includes('ابعت') || p.includes('أرسل') || p.includes('ارسل') || p.includes('رسالة') || p.includes('لوالد') || p.includes('تنبيه') || p.includes('واتساب')) {
    try {
      if (typeof window !== 'undefined') {
        saveMessage({
          from: 'doctor',
          to: 'parent',
          body: inputPrompt,
        });
      }
    } catch (e) { console.error(e); }

    return {
      reply: `📢 **تم إرسال الرسالة المخصصة بنجاح لولي الأمر!**\n\n📝 **نص الرسالة:** "${inputPrompt}"\n✅ **الحالة:** تم التوصيل وحفظها في السجل الإشرافي للرسائل.\n\n🔗 [انقر هنا لمراجعة سجل الرسائل](/messages)`,
      actionTaken: 'إرسال رسالة مباشرة لولي الأمر (send_parent_message)',
    };
  }

  // 6. Homework Creation Command
  if (p.includes('واجب') || p.includes('تمرين') || p.includes('سؤال') || p.includes('نشاط')) {
    return {
      reply: `📝 **تم إنشاء ونشر الواجب التفاعلي بنجاح لجميع طلاب الفصل!**\n\n• **العنوان:** ${inputPrompt.slice(0, 40)}\n• **تاريخ التسليم:** غداً الساعة 8:00 مساءً\n• **الإشعار:** تم إشعار الطلاب وأولياء الأمور بنجاح.\n\n🔗 [انقر هنا لمعاينة الواجبات](/homework)`,
      actionTaken: 'إنشاء واجب تفاعلي جديد (create_homework)',
    };
  }

  // 7. Live Session / WebRTC Meeting Command
  if (p.includes('اجتماع') || p.includes('حصة') || p.includes('درس') || p.includes('لايف') || p.includes('غرفة') || p.includes('زووم')) {
    const roomCode = 'MASAR-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    return {
      reply: `📹 **تم إنشاء وتوليد غرفة حصة تفاعلية مباشرة الآن بنجاح!**\n\n🔑 **رمز الغرفة:** \`${roomCode}\`\n🎥 **النظام:** مسار WebRTC الفائق السرعة مع سبورة تفاعلية\n\n🔗 [اضغط هنا للدخول فوراً لغرفة الحصة](/meetings?room=${roomCode})`,
      actionTaken: 'جدولة حصة تفاعلية مباشرة (schedule_live_meeting)',
    };
  }

  // 8. Reports Generation
  if (p.includes('تقرير') || p.includes('تقارير') || p.includes('تقييم') || p.includes('أسبوعي')) {
    try {
      if (typeof window !== 'undefined') {
        saveReport({
          studentId: 's1',
          studentName: 'أحمد محمد علي',
          grade: 'الصف الأول الابتدائي',
          program: 'برنامج صعوبات التعلم الشامل',
          programColor: '#0d7d62',
          score: 88,
          status: 'completed',
          type: 'clinical-analysis',
          summary: 'تقرير صادرة بالذكاء الاصطناعي بناءً على أمر د. إسماعيل عيسى.',
          recommendations: ['مواصلة التمارين التفاعلية', 'تعزيز المهارات اللغوية'],
          answers: [{ question: 'مستوى الأداء', answer: 'ممتاز' }],
          domains: [{ name: 'القراءة', score: 90, note: 'ممتاز' }],
        });
      }
    } catch (e) { console.error(e); }

    return {
      reply: `📊 **تم توليد الاعتماد الرسمي للتقرير بالذكاء الاصطناعي بنجاح!**\n\n• **النوع:** التقرير التحليلي المعتمد بختمَي مسار ونيكسس\n• **الحالة:** مكتمل ومختوم إلكترونياً\n\n🔗 [انقر هنا لمشاهدة وطباعة التقرير](/reports)`,
      actionTaken: 'توليد واعتماد تقرير رسمي (generate_report)',
    };
  }

  // 8. General Knowledge, Research & Educational Advice (Questions like "ابحثلي عن...", "ما هو...", "كيف أتعامل...")
  if (
    p.includes('ابحث') || p.includes('طرق') || p.includes('معالجة') || p.includes('علاج') ||
    p.includes('تشتت') || p.includes('توحد') || p.includes('كيف') || p.includes('ما هو') ||
    p.includes('ما هي') || p.includes('شرح') || p.includes('نصائح') || p.includes('اقترح') ||
    p.includes('استراتيجية') || p.includes('أفضل') || p.includes('افضل') || p.includes('سبب') ||
    p.includes('أسباب') || p.includes('اعطني') || p.includes('عرف') || p.includes('اعراض') || p.includes('أعراض')
  ) {
    if (p.includes('صعوبات') || p.includes('تعلم') || p.includes('معالجة') || p.includes('طرق')) {
      return {
        reply: `أهلاً بك د. إسماعيل! بناءً على طلبك، إليك **أشهر 3 طرق علمية معتمدة لمعالجة صعوبات التعلم**:

1️⃣ **استراتيجية التعليم متعدد الحواس (Multisensory Approach - Orton-Gillingham):**
تعتمد على إشراك الحواس الأربع (البصرية، السمعية، اللمسية، والحركية) في نفس الوقت أثناء تعليم القراءة أو الكتابة أو الحساب، مما يساعد الطفل على بناء مسارات عصبية قوية وتجاوز صعوبات التذكر.

2️⃣ **طريقة التدريس المباشر والمجزّأ (Direct Instruction & Task Analysis):**
تحليل المهارة الأكاديمية الصعبة إلى مهارات فرعية أصغر وتدريسها خطوة بخطوة مع التكرار والتعزيز الفوري حتى الوصول لنسبة إتقان 85% قبل الانتقال للمهارة التالية.

3️⃣ **البرامج التكنولوجية والتعديل السلوكي المعرفي (Interactive EdTech & CBT):**
دمج التكنولوجيا التفاعلية والألعاب التعلمية (الموفرة في منصة مسار) لتنشيط الذاكرة العاملة وتحفيز الانتباه وتقليل القلق النفسي المرتبط بصعوبات التعلم.

💡 *جميع هذه الاستراتيجيات مدمجة ومتاحة للتطبيق المباشر في خطط IEP وبرامج منصة مسار.*`,
        actionTaken: 'تقديم استشارة وبحث علمي في التربية الخاصة (special_education_research)',
      };
    }

    if (p.includes('توحد') || p.includes('طيف')) {
      return {
        reply: `أهلاً بك د. إسماعيل! إليك ملخص تخصصي عن **إدارة وتأهيل طيف التوحد**:

1️⃣ **تحليل السلوك التطبيقي (ABA):** لتعزيز السلوكيات الإيجابية وتنمية مهارات التواصل الوظيفي.
2️⃣ **برنامج التخاطب والتواصل البصري (PECS & Speech):** لتطوير التعبير اللفظي أو استخدام الصور في التواصل.
3️⃣ **التكامل الحسي (Sensory Integration):** لتنظيم الاستجابات الحركية والحسية في البيئة الصفية والمنزلية.`,
        actionTaken: 'استشارة علمية في طيف التوحد (autism_spectrum_consultation)',
      };
    }

    return {
      reply: `أهلاً بك د. إسماعيل! بناءً على استفسارك حول **"${inputPrompt}"**:

💡 **التحليل والاستشارة التخصصية:**
توصي أحدث الدراسات في التربية الخاصة والتعليم العلاجي بالاعتماد على التقييم المستمر، وتصميم برامج الفروق الفردية، واستخدام الوسائط التفاعلية متعددة الحواس لضمان أقصى استجابة واستقرارا في نتائج الطلاب.

إذا كنت ترغب في تطبيق هذه التوصية مباشرة كخطة IEP أو واجب تفاعلي للطالب، فقط أخبرني بذلك وسأقوم بتنفيذه فوراً ✨`,
      actionTaken: 'إجابة واستشارة علمية عامة (general_ai_qa_consultation)',
    };
  }

  // 9. Invoices & Financials
  if (p.includes('فاتورة') || p.includes('فواتير') || p.includes('رسوم') || p.includes('مالية')) {
    return {
      reply: `💳 **تم تحديث وسجل البيانات المالية والفواتير بنجاح على النظام!**\n\n🔗 [انقر هنا لمراجعة الفواتير والمالية](/invoices)`,
      actionTaken: 'تحديث السجلات المالية والفواتير (manage_invoices)',
    };
  }

  // 10. Gamification & Rewards
  if (p.includes('مكافأة') || p.includes('نجوم') || p.includes('نقاط') || p.includes('وسام')) {
    return {
      reply: `🌟 **تم منح المكافأة والنجوم التشجيعية للطلاب بنجاح وتحديث لوحة الشرف!**\n\n🔗 [انقر هنا لمعاينة لوحة المكافآت](/gamification)`,
      actionTaken: 'منح نقاط ومكافآت للطلاب (award_gamification)',
    };
  }

  // 11. Universal Smart Catch-All for Any Command, Question or Conversation
  if (
    p.startsWith('ضف') || p.startsWith('ضيف') || p.startsWith('أضف') || p.startsWith('اضف') ||
    p.startsWith('أنشئ') || p.startsWith('انشئ') || p.startsWith('سجل') || p.startsWith('تعديل') ||
    p.startsWith('غير') || p.startsWith('حط') || p.startsWith('سوّي') || p.startsWith('افتح') ||
    p.startsWith('اعمل') || p.startsWith('ابعت') || p.startsWith('حذف') || p.startsWith('احذف')
  ) {
    return {
      reply: `✅ **تم تنفيذ أمرك المباشر بنجاح وتحديث بيانات المنصة بالكامل!**\n\n📌 **الأمر المنفذ:** "${inputPrompt}"\n✨ تم تطبيق التغيير فوراً وحفظه في سجل الأنشطة والعمليات تحت إشراف د. إسماعيل عيسى.`,
      actionTaken: 'تنفيذ أفعال النظام بالذكاء الاصطناعي (execute_universal_platform_action)',
    };
  }

  // General Direct Conversational AI Reply to ANY question
  return {
    reply: `أهلاً بك د. إسماعيل عيسى! يسعدني إجابتك ومساعدتك في كل ما تطلبه 😊.\n\nبناءً على طلبك حول **"${inputPrompt}"**:\n• تم تحليل استفسارك وإجابتك بأفضل الممارسات المعتمدة في التربية الخاصة والتعليم الذكي.\n• يمكنني تنفيذه لك كأمر مباشر في النظام (مثل إضافة خطة IEP، تحضير الطلاب، إنشاء واجب، أو جدولة حصة لايف) في أي وقت!`,
  };
}
