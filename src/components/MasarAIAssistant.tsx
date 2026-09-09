'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Bot, Send, Trash2, Image as ImageIcon, X,
  MessageSquare, Loader2, Plus, Clock, Sparkles,
  Copy, Check, ArrowLeft, Volume2, ShieldCheck,
  Calendar, CheckCircle2
} from 'lucide-react';
import {
  deleteDocFromCloud,
  readCloudCache,
  subscribeToCloudCollection,
  syncDocToCloud,
  writeCloudCache,
} from '@/lib/firestoreSync';

export interface AiAction {
  type: string;
  label: string;
  target?: string;
  payload?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageBase64?: string;
  imageMime?: string;
  actions?: AiAction[];
  gateway?: string;
  timestamp: string;
}

export interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: string;
}

const STORAGE_KEY = 'masar.ai.threads.v5';
const CLOUD_COLLECTION = 'ai_threads';
const EMPTY_MESSAGES: ChatMessage[] = [];

const QUICK_ACTIONS = [
  { label: '📊 مين غاب النهارده؟', prompt: 'مين غاب النهارده؟ اعرض لي كشف الغياب والحضور اللحظي للفصل' },
  { label: '🎯 إنشاء كويز سريع', prompt: 'أنشئ كويز سريع من 5 أسئلة مع الخيارات والإجابة الصحيحة في الوعي الصوتي وحروف المد' },
  { label: '📚 تحضير درس تفاعلي', prompt: 'حضرلي درس تفاعلي متكامل مع الأهداف السلوكية واستراتيجيات صعوبات التعلم' },
  { label: '📱 رسالة لأهل الغائبين', prompt: 'اكتب رسالة واتساب تربوية ولطيفة لأولياء أمور الطلاب الغائبين اليوم' },
  { label: '📋 خطة فردية IEP', prompt: 'جهز مسودة خطة تربوية فردية IEP لطالب يحتاج تقوية في التهجي والقراءة' },
  { label: '📅 تاريخ ووقت اليوم', prompt: 'النهارده يوم ايه؟ وما هو التاريخ والوقت الآن؟' },
];

function loadLocalThreads(): Record<string, ChatThread> {
  try {
    const cached = readCloudCache<ChatThread>(STORAGE_KEY);
    if (Array.isArray(cached) && cached.length > 0) {
      return Object.fromEntries(cached.map((t) => [t.id, t]));
    }
  } catch { /* ignore */ }
  return {};
}

function persistThreads(threads: Record<string, ChatThread>) {
  try {
    writeCloudCache(STORAGE_KEY, Object.values(threads));
  } catch { /* storage full */ }
}

interface MasarAIAssistantProps {
  mode?: 'full' | 'embedded';
  branch?: string;
}

export default function MasarAIAssistant({
  mode = 'full',
  branch = 'IKHLAS_JEDDAH',
}: MasarAIAssistantProps) {
  const router = useRouter();
  const [threads, setThreads] = useState<Record<string, ChatThread>>({});
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/png');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize Threads
  useEffect(() => {
    const initial = loadLocalThreads();
    const sortedKeys = Object.keys(initial).sort(
      (a, b) => new Date(initial[b].lastUpdated).getTime() - new Date(initial[a].lastUpdated).getTime()
    );

    if (sortedKeys.length > 0) {
      setThreads(initial);
      setActiveThreadId(sortedKeys[0]);
    } else {
      const defaultId = `thread_${Date.now()}`;
      const defaultThread: ChatThread = {
        id: defaultId,
        title: 'محادثة المساعد الذكي',
        messages: [],
        lastUpdated: new Date().toISOString(),
      };
      setThreads({ [defaultId]: defaultThread });
      setActiveThreadId(defaultId);
      persistThreads({ [defaultId]: defaultThread });
      syncDocToCloud(CLOUD_COLLECTION, defaultId, defaultThread);
    }
  }, []);

  // Cloud Sync
  useEffect(() => {
    const unsub = subscribeToCloudCollection<ChatThread>(CLOUD_COLLECTION, 'aiThreads', (items) => {
      if (Array.isArray(items) && items.length > 0) {
        const cloudMap: Record<string, ChatThread> = {};
        items.forEach((item) => {
          if (item?.id) cloudMap[item.id] = item;
        });
        setThreads((prev) => {
          const merged = { ...prev, ...cloudMap };
          persistThreads(merged);
          return merged;
        });
      }
    });

    return () => unsub();
  }, []);

  const activeThread = threads[activeThreadId] ?? null;
  const currentMessages = activeThread?.messages ?? EMPTY_MESSAGES;

  // Auto Scroll
  useEffect(() => {
    const timer = setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [currentMessages, loading]);

  const handleCreateNewThread = () => {
    const newId = `thread_${Date.now()}`;
    const newThread: ChatThread = {
      id: newId,
      title: `محادثة جديدة ${new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}`,
      messages: [],
      lastUpdated: new Date().toISOString(),
    };

    setThreads((prev) => {
      const updated = { [newId]: newThread, ...prev };
      persistThreads(updated);
      return updated;
    });
    setActiveThreadId(newId);
    syncDocToCloud(CLOUD_COLLECTION, newId, newThread);
  };

  const handleDeleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteDocFromCloud(CLOUD_COLLECTION, id);

    setThreads((prev) => {
      const updated = { ...prev };
      delete updated[id];
      persistThreads(updated);

      const remainingKeys = Object.keys(updated).sort(
        (a, b) => new Date(updated[b].lastUpdated).getTime() - new Date(updated[a].lastUpdated).getTime()
      );

      if (id === activeThreadId) {
        if (remainingKeys.length > 0) {
          setActiveThreadId(remainingKeys[0]);
        } else {
          const freshId = `thread_${Date.now()}`;
          const freshThread: ChatThread = {
            id: freshId,
            title: 'محادثة جديدة',
            messages: [],
            lastUpdated: new Date().toISOString(),
          };
          updated[freshId] = freshThread;
          setActiveThreadId(freshId);
          persistThreads(updated);
          syncDocToCloud(CLOUD_COLLECTION, freshId, freshThread);
        }
      }
      return updated;
    });
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (result) {
        const [meta, b64] = result.split('base64,');
        const mime = meta.match(/data:(.*?);/)?.[1] || 'image/png';
        setImageBase64(b64);
        setImageMime(mime);
        setImagePreview(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearImage = () => {
    setImageBase64(null);
    setImageMime('image/png');
    setImagePreview(null);
  };

  const copyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch { /* ignore */ }
  };

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#`_~\[\]]/g, '');
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = 'ar-SA';
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  };

  const runAction = (action: AiAction) => {
    if (typeof window !== 'undefined' && action.payload) {
      window.dispatchEvent(new CustomEvent('masar_ai_action', { detail: action }));
    }
    if (action.target) {
      router.push(action.target);
    }
  };

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim();
    if ((!text && !imageBase64) || loading || !activeThreadId) return;

    const timeLabel = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: text || 'يرجى تحليل هذه الصورة المرفقة',
      imageBase64: imageBase64 ?? undefined,
      imageMime: imageMime,
      timestamp: timeLabel,
    };

    const currentTh = threads[activeThreadId] ?? {
      id: activeThreadId,
      title: text.slice(0, 32) || 'محادثة جديدة',
      messages: [],
      lastUpdated: '',
    };

    const updatedTitle = currentTh.messages.length === 0 && text ? text.slice(0, 36) : currentTh.title;
    const threadWithUserMsg: ChatThread = {
      ...currentTh,
      title: updatedTitle,
      messages: [...currentTh.messages, userMsg],
      lastUpdated: new Date().toISOString(),
    };

    setThreads((prev) => {
      const updated = { ...prev, [activeThreadId]: threadWithUserMsg };
      persistThreads(updated);
      return updated;
    });

    setInputText('');
    clearImage();
    setLoading(true);

    const history = currentTh.messages.slice(-8).map((m) => ({
      sender: m.role === 'user' ? 'user' : 'agent',
      text: m.text.slice(0, 1000),
    }));

    let replyText = '';
    let actions: AiAction[] = [];
    let gateway = '';

    try {
      const body: Record<string, unknown> = {
        prompt: text || 'تحليل الصورة المرفقة واستخراج توجيهات تعليمية لد. إسماعيل عيسى',
        branch,
        history,
      };

      if (imageBase64) {
        body.image = { data: imageBase64, mimeType: imageMime };
      }

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        replyText = data.reply || '';
        actions = Array.isArray(data.actions) ? data.actions : [];
        gateway = data.gateway || '';
      } else {
        const err = await res.json().catch(() => ({}));
        replyText = err?.error || 'تعذر الاتصال بالمساعد الذكي الآن. يرجى التحقق من الاتصال بالإنترنت.';
      }
    } catch {
      replyText = 'حدث خطأ في الاتصال بالخادم. يرجى إعادة المحاولة بعد ثوانٍ.';
    }

    const assistantMsg: ChatMessage = {
      id: `a_${Date.now()}`,
      role: 'assistant',
      text: replyText,
      actions,
      gateway,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    const finalThread: ChatThread = {
      ...threadWithUserMsg,
      messages: [...threadWithUserMsg.messages, assistantMsg],
      lastUpdated: new Date().toISOString(),
    };

    setThreads((prev) => {
      const updated = { ...prev, [activeThreadId]: finalThread };
      persistThreads(updated);
      return updated;
    });

    syncDocToCloud(CLOUD_COLLECTION, activeThreadId, finalThread);
    setLoading(false);
  }, [activeThreadId, branch, imageBase64, imageMime, inputText, loading, threads]);

  const sortedThreads = Object.values(threads).sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  );

  return (
    <div className="flex flex-col h-full w-full" dir="rtl">
      {/* Top Banner */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-teal-700/20">
            <Bot size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">المساعد الذكي التنفيذي</h2>
              <span className="bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles size={11} className="text-teal-600" /> مخصص لد. إسماعيل عيسى
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              مربوط لحظياً بكشف الحضور البيومتري، بنك الاختبارات، والخطط الفردية IEP.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl">
            <CheckCircle2 size={14} className="text-emerald-600" />
            <span>متصل ببيانات الفصل الحية</span>
          </div>
          <button
            onClick={handleCreateNewThread}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-3.5 py-2 rounded-xl transition shadow-xs"
          >
            <Plus size={15} />
            <span>محادثة جديدة</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar History (Desktop) */}
        <aside className="w-64 border-l border-slate-200 bg-slate-50/50 p-3 flex flex-col shrink-0 hidden md:flex">
          <div className="text-[11px] font-black text-slate-400 px-2 mb-2 flex items-center justify-between">
            <span>سجل المحادثات ({sortedThreads.length})</span>
            <Clock size={13} />
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {sortedThreads.map((t) => {
              const isActive = t.id === activeThreadId;
              return (
                <div
                  key={t.id}
                  onClick={() => setActiveThreadId(t.id)}
                  className={`group cursor-pointer rounded-xl p-2.5 transition flex items-center justify-between gap-2 border text-right ${
                    isActive
                      ? 'bg-teal-50 border-teal-300 text-teal-950 shadow-2xs font-black'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 font-bold'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MessageSquare size={14} className={isActive ? 'text-teal-600 shrink-0' : 'text-slate-400 shrink-0'} />
                    <span className="text-xs truncate">{t.title || 'محادثة'}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteThread(t.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 p-1 rounded-md transition"
                    title="حذف"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-200 text-[10px] font-bold text-slate-400 text-center flex items-center justify-center gap-1">
            <ShieldCheck size={12} className="text-emerald-600" />
            <span>محادثاتك محفوظة ومشفرة</span>
          </div>
        </aside>

        {/* Chat Canvas */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* Quick Prompts Shelf */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
            <span className="text-[11px] font-black text-slate-500 shrink-0 flex items-center gap-1">
              <Sparkles size={12} className="text-amber-500" /> أوامر سريعة:
            </span>
            {QUICK_ACTIONS.map((action, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(action.prompt)}
                disabled={loading}
                className="shrink-0 bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl transition shadow-2xs disabled:opacity-50"
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-slate-50/20">
            {currentMessages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shadow-sm">
                  <Bot size={34} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800">مرحباً بك يا د. إسماعيل عيسى</h3>
                  <p className="text-xs font-bold text-slate-500 max-w-md mt-1 leading-relaxed">
                    اسألني عن حضور وغياب طلابك اليوم، أو اطلب كويز سريع، تحضير درس، أو صياغة رسائل لأولياء الأمور.
                  </p>
                </div>
              </div>
            )}

            {currentMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black text-xs shadow-2xs ${
                  msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-teal-600 text-white'
                }`}>
                  {msg.role === 'user' ? 'د.إ' : <Bot size={17} />}
                </div>

                <div className={`max-w-[85%] md:max-w-[78%] rounded-2xl p-4 text-xs font-bold leading-relaxed shadow-2xs space-y-2.5 ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white rounded-tr-none'
                    : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                }`}>
                  {msg.imageBase64 && (
                    <div className="rounded-xl overflow-hidden border border-slate-200 max-w-xs">
                      <Image
                        src={`data:${msg.imageMime};base64,${msg.imageBase64}`}
                        alt="صورة مرفقة"
                        width={300}
                        height={200}
                        unoptimized
                        className="w-full object-cover max-h-48"
                      />
                    </div>
                  )}

                  <div className="whitespace-pre-wrap font-sans text-xs md:text-sm leading-6 md:leading-7">
                    {msg.text}
                  </div>

                  {!!msg.actions?.length && (
                    <div className="mt-3 grid gap-1.5 border-t border-slate-100 pt-2.5">
                      {msg.actions.map((act, index) => (
                        <button
                          key={index}
                          onClick={() => runAction(act)}
                          className="flex items-center justify-between gap-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-900 text-xs font-black px-3 py-2 rounded-xl transition"
                        >
                          <span>{act.label}</span>
                          <ArrowLeft size={13} />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className={`flex items-center justify-between text-[10px] font-mono pt-1 ${
                    msg.role === 'user' ? 'text-slate-400' : 'text-slate-400'
                  }`}>
                    <span>{msg.timestamp}</span>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2">
                        {msg.gateway && (
                          <span className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-[9px] font-sans">
                            {msg.gateway}
                          </span>
                        )}
                        <button
                          onClick={() => speakText(msg.text)}
                          className="text-slate-400 hover:text-teal-700 transition"
                          title="قراءة صوتية"
                        >
                          <Volume2 size={13} />
                        </button>
                        <button
                          onClick={() => copyText(msg.id, msg.text)}
                          className="flex items-center gap-0.5 text-slate-400 hover:text-teal-700 transition"
                          title="نسخ النص"
                        >
                          {copiedId === msg.id ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <Bot size={17} />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3.5 shadow-2xs flex items-center gap-2.5 text-xs font-bold text-teal-900">
                  <Loader2 size={16} className="animate-spin text-teal-600" />
                  <span>المساعد الذكي يفحص بيانات الفصل ويجهز الرد...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Image Preview Thumbnail */}
          {imagePreview && (
            <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <Image
                  src={imagePreview}
                  alt="معاينة"
                  width={40}
                  height={40}
                  unoptimized
                  className="w-10 h-10 rounded-lg object-cover border border-slate-300"
                />
                <span className="text-xs font-bold text-slate-700">صورة مرفقة للتحليل</span>
              </div>
              <button onClick={clearImage} className="text-rose-500 hover:text-rose-700 p-1">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 md:p-4 bg-white border-t border-slate-200 flex items-end gap-2 shrink-0">
            <input type="file" ref={fileInputRef} onChange={handleImagePick} accept="image/*" className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 rounded-2xl border border-slate-200 text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition shrink-0"
              title="إرفاق صورة درس أو جدول"
            >
              <ImageIcon size={18} />
            </button>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
              placeholder="اطلب كشف الغياب، كويز سريع، تحضير درس، أو ارفع صورة..."
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-xs md:text-sm font-bold text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:outline-none resize-none max-h-24 scrollbar-none"
            />

            <button
              onClick={() => sendMessage()}
              disabled={loading || (!inputText.trim() && !imageBase64)}
              className="bg-gradient-to-l from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white p-3 rounded-2xl font-black transition shadow-sm disabled:opacity-40 shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}