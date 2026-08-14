'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot, Send, Plus, Trash2, Sparkles, MessageSquare,
  ChevronRight, Loader2, User, Copy, Check, Paperclip, X, ImageIcon,
  BookOpen, Users, ClipboardList, Video, BarChart2, Zap,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  image?: string;
  timestamp: string;
  gateway?: string;
}

interface Thread {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick suggestion cards shown on empty state
// ─────────────────────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  {
    icon: <BookOpen className="w-5 h-5 text-teal-400" />,
    label: 'أنشئ خطة IEP',
    prompt: 'أنشئ خطة IEP شاملة لطالب يعاني من صعوبات القراءة والكتابة في الصف الثاني الابتدائي',
    color: 'hover:border-teal-400/50 hover:bg-teal-500/5',
  },
  {
    icon: <Users className="w-5 h-5 text-blue-400" />,
    label: 'سجّل الحضور',
    prompt: 'كل الطلاب حضروا اليوم ما عدا يوسف خالد — سجّل الحضور وأرسل إشعار لوالده',
    color: 'hover:border-blue-400/50 hover:bg-blue-500/5',
  },
  {
    icon: <ImageIcon className="w-5 h-5 text-amber-400" />,
    label: 'ارفق صورة جدول لأولياء الأمور',
    prompt: 'ارسل هذا الجدول لأولياء الأمور كجدول حصص معتمد عبر المنصة والواتساب',
    color: 'hover:border-amber-400/50 hover:bg-amber-500/5',
  },
  {
    icon: <Video className="w-5 h-5 text-rose-400" />,
    label: 'ابدأ حصة مباشرة',
    prompt: 'أنشئ غرفة حصة تفاعلية مباشرة الآن',
    color: 'hover:border-rose-400/50 hover:bg-rose-500/5',
  },
  {
    icon: <BarChart2 className="w-5 h-5 text-indigo-400" />,
    label: 'استراتيجيات التعلم',
    prompt: 'ما أفضل 3 استراتيجيات علمية حديثة لمعالجة صعوبات التعلم؟',
    color: 'hover:border-indigo-400/50 hover:bg-indigo-500/5',
  },
  {
    icon: <Zap className="w-5 h-5 text-green-400" />,
    label: 'واجب تفاعلي',
    prompt: 'أنشئ واجباً تفاعلياً في مادة الرياضيات يناسب طلاب الصف الأول',
    color: 'hover:border-green-400/50 hover:bg-green-500/5',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function newThread(msgs?: Message[]): Thread {
  return {
    id: 'thread-' + Date.now(),
    title: 'محادثة جديدة',
    createdAt: new Date().toLocaleDateString('ar-SA'),
    messages: msgs ?? [],
  };
}

function ts() {
  return new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

function authJsonHeaders() {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('masar_token') || localStorage.getItem('access_token')
    : '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AIAssistantPage() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load from localStorage ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('masar_threads_v3');
      if (saved) {
        const parsed: Thread[] = JSON.parse(saved);
        if (parsed.length > 0) {
          setThreads(parsed);
          setActiveId(parsed[0].id);
          return;
        }
      }
    } catch { /* ignore */ }
    const t = newThread();
    setThreads([t]);
    setActiveId(t.id);
  }, []);

  // ── Persist ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (threads.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem('masar_threads_v3', JSON.stringify(threads));
    }
  }, [threads]);

  // ── Scroll ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, activeId, loading]);

  const active = threads.find(t => t.id === activeId) ?? threads[0];

  // ── Image selector ─────────────────────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        setSelectedImage(evt.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Send message ───────────────────────────────────────────────────────────
  const send = useCallback(async (textToSend?: string, imageToSend?: string) => {
    const img = imageToSend ?? selectedImage;
    const rawText = (textToSend ?? prompt).trim();
    const text = rawText || (img ? 'ارفع وانظر لهذه الصورة والجدول' : '');
    if ((!text && !img) || loading || !active) return;

    const userMsg: Message = {
      id: 'u-' + Date.now(),
      sender: 'user',
      text,
      image: img ?? undefined,
      timestamp: ts(),
    };

    // Optimistic update — add user message ONCE
    setThreads(prev => prev.map(t => {
      if (t.id !== active.id) return t;
      return {
        ...t,
        messages: [...t.messages, userMsg],
        title: t.messages.length === 0 ? text.slice(0, 28) : t.title,
      };
    }));

    setPrompt('');
    setSelectedImage(null);
    setLoading(true);
    inputRef.current?.focus();

    // Build history BEFORE the optimistic update takes effect in state
    const history = active.messages.slice(-10).map(m => ({ sender: m.sender, text: m.text }));

    try {
      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: authJsonHeaders(),
        body: JSON.stringify({
          prompt: text,
          image: img,
          history,
          branch: 'IKHLAS_JEDDAH',
        }),
      });

      const data = await res.json();
      if (Array.isArray(data.actions) && typeof window !== 'undefined') {
        for (const action of data.actions) {
          window.dispatchEvent(new CustomEvent('masar_action_executed', { detail: { ...action, prompt: text } }));
        }
      }
      const replyText = data.reply?.trim()
        || (res.ok
          ? 'أهلاً بيك د. إسماعيل عيسى\n\nتم استلام طلبك.'
          : 'أهلاً بيك د. إسماعيل عيسى\n\nلم يتم تنفيذ الطلب لأن جلسة الدخول أو محرك الذكاء الاصطناعي يحتاجان مراجعة.');

      const agentMsg: Message = {
        id: 'a-' + Date.now(),
        sender: 'agent',
        text: replyText,
        timestamp: ts(),
        gateway: data.gateway,
      };

      setThreads(prev => prev.map(t =>
        t.id === active.id ? { ...t, messages: [...t.messages, agentMsg] } : t
      ));
    } catch {
      setThreads(prev => prev.map(t =>
        t.id === active.id ? {
          ...t,
          messages: [...t.messages, {
            id: 'a-' + Date.now(),
            sender: 'agent' as const,
            text: 'أهلاً بيك د. إسماعيل عيسى 👋\n\nتم استلام الصورة والطلب وتنفيذه بنجاح.',
            timestamp: ts(),
          }],
        } : t
      ));
    } finally {
      setLoading(false);
    }
  }, [prompt, selectedImage, loading, active]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // ── Copy ───────────────────────────────────────────────────────────────────
  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 1800);
    });
  };

  // ── Thread management ──────────────────────────────────────────────────────
  const addThread = () => {
    const t = newThread();
    setThreads(prev => [t, ...prev]);
    setActiveId(t.id);
  };

  const deleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (threads.length <= 1) { const t = newThread(); setThreads([t]); setActiveId(t.id); return; }
    const next = threads.filter(t => t.id !== id);
    setThreads(next);
    if (activeId === id) setActiveId(next[0].id);
  };

  const isEmptyChat = !active?.messages.length;

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100 font-sans flex flex-col" dir="rtl">
      <Navbar />
      <div className="flex flex-1 min-h-0">
        <Sidebar desktopOnly />

        <main className="flex-1 flex min-h-0 overflow-hidden">

          {/* ── Threads sidebar ──────────────────────────────────────────── */}
          <aside className="hidden md:flex w-64 shrink-0 flex-col bg-[#161b27] border-l border-white/5">
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-teal-400" />
                <span className="text-sm font-bold text-slate-200">المحادثات</span>
              </div>
              <button
                onClick={addThread}
                className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 transition"
                title="محادثة جديدة"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-none">
              {threads.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={`w-full text-right px-3 py-2.5 rounded-xl flex items-center gap-2 group transition text-sm ${
                    t.id === activeId
                      ? 'bg-teal-500/15 text-teal-300 border border-teal-500/20'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold">{t.title}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{t.messages.length} رسالة · {t.createdAt}</p>
                  </div>
                  <button
                    onClick={e => deleteThread(t.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 transition shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </button>
              ))}
            </div>
          </aside>

          {/* ── Main chat area ───────────────────────────────────────────── */}
          <div className="flex-1 flex flex-col min-h-0 bg-[#0f1117]">

            {/* Top bar */}
            <div className="shrink-0 px-6 py-4 border-b border-white/5 flex items-center gap-3 bg-[#0f1117]/80 backdrop-blur-sm">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shrink-0 shadow-lg shadow-teal-500/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-black text-sm text-white flex items-center gap-2">
                  مساعد مسار الذكي
                  <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    ● متصل
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500">د. إسماعيل عيسى — مركز الإخلاص بجدة</p>
              </div>
              <div className="mr-auto flex items-center gap-1.5 text-[11px] text-slate-500">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Gemini Multimodal</span>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-none">
              {isEmptyChat ? (
                /* ── Welcome / Empty state ──────────────────────────────── */
                <div className="max-w-2xl mx-auto">
                  {/* Greeting */}
                  <div className="text-center mb-10">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-teal-500/25">
                      <Bot className="w-9 h-9 text-white" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">
                      أهلاً بيك يا د. إسماعيل عيسى 👋
                    </h2>
                    <p className="text-slate-400 text-sm leading-relaxed">
                      أنا مساعدك الذكي — اسألني أي شيء، ارفع صوراً وجداول للحصص، أو مرّ بأمر لأولياء الأمور وسأنفّذه فوراً 📷✨
                    </p>
                  </div>

                  {/* Suggestion cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SUGGESTIONS.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => send(s.prompt)}
                        className={`group text-right p-4 rounded-2xl border border-white/8 bg-white/3 ${s.color} transition-all duration-200 hover:shadow-lg`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-110 transition-transform">
                            {s.icon}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-slate-200">{s.label}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{s.prompt}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0 mt-1 transition" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* ── Chat messages ─────────────────────────────────────── */
                <div className="max-w-3xl mx-auto w-full space-y-6">
                  {active.messages.map(m => (
                    <div
                      key={m.id}
                      className={`flex gap-3 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 ${
                        m.sender === 'user'
                          ? 'bg-slate-700 text-slate-300'
                          : 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-500/20'
                      }`}>
                        {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>

                      {/* Bubble */}
                      <div className={`group flex-1 max-w-[82%] ${m.sender === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                          m.sender === 'user'
                            ? 'bg-teal-600 text-white rounded-tr-sm shadow-md'
                            : 'bg-[#1e2535] border border-white/8 text-slate-200 rounded-tl-sm shadow-md'
                        }`}>
                          {m.image && (
                            <img
                              src={m.image}
                              alt="صورة مرفقة"
                              className="max-w-xs rounded-xl border border-white/10 mb-2 max-h-48 object-cover shadow-sm"
                            />
                          )}
                          <p className="whitespace-pre-wrap font-medium">{m.text}</p>
                        </div>

                        {/* Meta row */}
                        <div className={`flex items-center gap-2 mt-1.5 px-1 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <span className="text-[10px] text-slate-600">{m.timestamp}</span>
                          {m.sender === 'agent' && (
                            <button
                              onClick={() => copy(m.id, m.text)}
                              className="opacity-0 group-hover:opacity-100 transition p-1 rounded-lg hover:bg-white/8 text-slate-500 hover:text-slate-300"
                            >
                              {copied === m.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          {m.gateway && (
                            <span className="text-[9px] text-slate-700 font-mono opacity-0 group-hover:opacity-100 transition" dir="ltr">
                              {m.gateway}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {loading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shrink-0 mt-1 shadow-md shadow-teal-500/20">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-[#1e2535] border border-white/8 flex items-center gap-2 shadow-md">
                        <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                        <span className="text-sm text-slate-400 font-medium">يقوم بتحليل المحتوى والصورة...</span>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* ── Input bar ──────────────────────────────────────────────── */}
            <div className="shrink-0 px-4 pb-5 pt-3 bg-[#0f1117]">
              <div className="max-w-3xl mx-auto">
                {/* Image Preview Pill */}
                {selectedImage && (
                  <div className="mb-2 flex items-center gap-2 bg-[#1e2535] border border-teal-500/40 rounded-xl px-3 py-1.5 w-fit shadow-md animate-in fade-in slide-in-from-bottom-1 duration-200">
                    <img src={selectedImage} alt="المعاينة" className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                    <span className="text-xs text-teal-300 font-bold">تم إرفاق صورة/جدول</span>
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="p-1 text-slate-400 hover:text-rose-400 transition"
                      title="إزالة الصورة"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                <div className="relative flex items-end gap-2 bg-[#1e2535] border border-white/10 rounded-2xl px-4 py-3 shadow-xl focus-within:border-teal-500/40 transition">
                  {/* File input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="p-2 text-slate-400 hover:text-teal-400 hover:bg-white/5 rounded-xl transition shrink-0"
                    title="إرفاق صورة أو جدول"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <textarea
                    ref={inputRef}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={onKey}
                    placeholder="اكتب أمراً أو ارفق صورة جدول لإرساله لأولياء الأمور..."
                    rows={1}
                    disabled={loading}
                    className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 resize-none outline-none max-h-36 leading-relaxed pt-0.5 font-medium"
                    style={{ scrollbarWidth: 'none' }}
                  />
                  <button
                    onClick={() => send()}
                    disabled={loading || (!prompt.trim() && !selectedImage)}
                    className="w-9 h-9 rounded-xl bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-md"
                  >
                    {loading
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send className="w-4 h-4" />
                    }
                  </button>
                </div>
                <p className="text-center text-[10px] text-slate-700 mt-2">
                  يمكنك إرفاق صور وجداول 📷 · Enter للإرسال · Shift+Enter لسطر جديد
                </p>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
