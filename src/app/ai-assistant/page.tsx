'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Bot, Check, Copy, FileText, ImageIcon, Loader2, MessageSquareText,
  Paperclip, Plus, Send, Sparkles, Trash2, UserRound, X,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { deleteDocFromCloud, subscribeToCloudCollection, syncDocToCloud } from '@/lib/firestoreSync';

type AiAction = {
  type: string;
  label: string;
  target?: string;
  payload?: Record<string, unknown>;
};

type Message = {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  image?: string;
  actions?: AiAction[];
  gateway?: string;
  timestamp: string;
};

type Thread = {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
};

const STORAGE_KEY = 'masar.ai.threads.v4';
const CLOUD_COLLECTION = 'ai_threads';

const QUICK_COMMANDS = [
  'اكتب خطة IEP مختصرة لطالب صف أول عنده صعوبة في القراءة',
  'جهز رسالة لولي الأمر بخصوص واجب التهجي البسيط',
  'اعمل ملخص علمي عن علاج صعوبات القراءة بطريقة متعددة الحواس',
  'افتح لي التقارير وحدد المطلوب لمراجعة طالب جديد',
  'النهارده يوم ايه؟',
];

function makeThread(): Thread {
  const now = new Date();
  return {
    id: `thread-${now.getTime()}`,
    title: 'محادثة جديدة',
    createdAt: now.toLocaleDateString('ar-SA'),
    messages: [],
  };
}

function nowTime() {
  return new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

function sortThreads(items: Thread[]) {
  return [...items].sort((a, b) => {
    const aLast = a.messages.at(-1)?.id?.replace(/^[ua]-/, '') || a.id.replace(/^thread-/, '');
    const bLast = b.messages.at(-1)?.id?.replace(/^[ua]-/, '') || b.id.replace(/^thread-/, '');
    return Number(bLast) - Number(aLast);
  });
}

function persistThread(thread: Thread) {
  syncDocToCloud(CLOUD_COLLECTION, thread.id, {
    ...thread,
    updatedAt: new Date().toISOString(),
  });
}

export default function AIAssistantPage() {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let firstLoad = true;
    const unsubscribe = subscribeToCloudCollection<Thread>(CLOUD_COLLECTION, 'aiThreads', (items) => {
      const cloudThreads = sortThreads(items.filter((item) => item?.id && Array.isArray(item.messages)));
      if (cloudThreads.length) {
        setThreads(cloudThreads);
        setActiveId((current) => (cloudThreads.some((item) => item.id === current) ? current : cloudThreads[0].id));
      } else if (firstLoad) {
        const first = makeThread();
        setThreads([first]);
        setActiveId(first.id);
        persistThread(first);
      }
      firstLoad = false;
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    try {
      if (threads.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    } catch {}
  }, [threads]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threads, activeId, loading]);

  const active = threads.find((item) => item.id === activeId) ?? threads[0];

  const createNewThread = () => {
    const next = makeThread();
    setThreads((current) => [next, ...current]);
    setActiveId(next.id);
    persistThread(next);
  };

  const deleteThread = (id: string) => {
    deleteDocFromCloud(CLOUD_COLLECTION, id);
    setThreads((current) => {
      const next = current.filter((item) => item.id !== id);
      if (!next.length) {
        const fresh = makeThread();
        setActiveId(fresh.id);
        persistThread(fresh);
        return [fresh];
      }
      if (activeId === id) setActiveId(next[0].id);
      return next;
    });
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (result) => {
      if (result.target?.result) setSelectedImage(result.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  const runAction = (action: AiAction) => {
    if (action.payload && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('masar_ai_action', { detail: action }));
    }
    if (action.target) router.push(action.target);
  };

  const copyMessage = async (message: Message) => {
    await navigator.clipboard.writeText(message.text);
    setCopiedId(message.id);
    setTimeout(() => setCopiedId(null), 1200);
  };

  const send = useCallback(async (overridePrompt?: string) => {
    if (!active || loading) return;
    const text = (overridePrompt ?? prompt).trim();
    if (!text && !selectedImage) return;

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: text || 'حلل الصورة المرفقة',
      image: selectedImage ?? undefined,
      timestamp: nowTime(),
    };

    const history = active.messages.slice(-8).map((item) => ({
      sender: item.sender === 'user' ? 'user' : 'agent',
      text: item.text,
    }));

    const userThread: Thread = {
      ...active,
      title: active.messages.length ? active.title : userMessage.text.slice(0, 34),
      messages: [...active.messages, userMessage],
    };

    setThreads((current) => current.map((thread) => (
      thread.id === active.id
        ? userThread
        : thread
    )));
    persistThread(userThread);
    setPrompt('');
    setSelectedImage(null);
    setLoading(true);

    try {
      const response = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: userMessage.text, image: userMessage.image, history }),
      });
      const data = await response.json();
      const agentMessage: Message = {
        id: `a-${Date.now()}`,
        sender: 'agent',
        text: data.reply || data.error || 'لم يصل رد واضح من المساعد. راجع إعداد مفاتيح Gemini.',
        actions: Array.isArray(data.actions) ? data.actions : [],
        gateway: data.gateway,
        timestamp: nowTime(),
      };
      setThreads((current) => current.map((thread) => (
        thread.id === active.id ? { ...thread, messages: [...thread.messages, agentMessage] } : thread
      )));
      persistThread({ ...userThread, messages: [...userThread.messages, agentMessage] });
    } catch {
      const agentMessage: Message = {
        id: `a-${Date.now()}`,
        sender: 'agent',
        text: 'تعذر الاتصال بمحرك الذكاء الاصطناعي الآن. تأكد من تسجيل الدخول وإعدادات Gemini.',
        timestamp: nowTime(),
      };
      setThreads((current) => current.map((thread) => (
        thread.id === active.id ? { ...thread, messages: [...thread.messages, agentMessage] } : thread
      )));
      persistThread({ ...userThread, messages: [...userThread.messages, agentMessage] });
    } finally {
      setLoading(false);
    }
  }, [active, loading, prompt, selectedImage]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="flex min-h-[calc(100vh-65px)] flex-1 overflow-hidden">
          <aside className="hidden w-72 shrink-0 border-l border-slate-200 bg-white p-3 lg:flex lg:flex-col">
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-teal-50 p-3">
              <div>
                <p className="text-xs font-black text-teal-700">محادثات المساعد</p>
                <p className="text-[11px] font-bold text-slate-500">Gemini + أوامر المنصة</p>
              </div>
              <button
                onClick={createNewThread}
                className="grid h-10 w-10 place-items-center rounded-xl bg-teal-600 text-white shadow-sm"
                title="محادثة جديدة"
              >
                <Plus size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {threads.map((thread) => (
                <button
                  key={thread.id}
                  onClick={() => setActiveId(thread.id)}
                  className={`group w-full rounded-2xl border p-3 text-right transition ${
                    activeId === thread.id
                      ? 'border-teal-200 bg-teal-50 text-teal-950'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-teal-100 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MessageSquareText size={17} className="mt-1 shrink-0 text-teal-600" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{thread.title}</p>
                      <p className="mt-1 text-[11px] font-bold text-slate-400">{thread.messages.length} رسالة · {thread.createdAt}</p>
                    </div>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        deleteThread(thread.id);
                      }}
                      className="rounded-lg p-1 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            <header className="border-b border-slate-200 bg-white px-4 py-4">
              <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-600 text-white shadow-sm">
                    <Bot size={25} />
                  </span>
                  <div>
                    <h1 className="text-xl font-black text-slate-950">مساعد مسار التنفيذي</h1>
                    <p className="text-xs font-bold text-slate-500">اسأل، ارفع صورة، أو اطلب إجراء داخل المنصة.</p>
                  </div>
                </div>
                <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 sm:inline-flex">
                  متصل بجلسة المنصة
                </span>
              </div>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
              <div className="mx-auto max-w-5xl space-y-5">
                {!active?.messages.length && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="grid gap-4 lg:grid-cols-[1fr_0.75fr]">
                      <div>
                        <p className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">
                          <Sparkles size={14} /> مساعد عملي
                        </p>
                        <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950">
                          اكتب المطلوب بوضوح، والمساعد يرد أو يفتح لك المكان المناسب.
                        </h2>
                        <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
                          مناسب للأسئلة العامة، خطط IEP، التقارير، الرسائل، الصور، الجداول، الواجبات، ومراجعة بيانات الطلاب.
                        </p>
                      </div>
                      <div className="grid gap-2">
                        {QUICK_COMMANDS.map((item) => (
                          <button
                            key={item}
                            onClick={() => send(item)}
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right text-xs font-black leading-6 text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {active?.messages.map((message) => (
                  <div key={message.id} className={`flex gap-3 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                    <span className={`mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-2xl ${
                      message.sender === 'user' ? 'bg-slate-200 text-slate-700' : 'bg-teal-600 text-white'
                    }`}>
                      {message.sender === 'user' ? <UserRound size={18} /> : <Bot size={18} />}
                    </span>
                    <div className={`max-w-[82%] ${message.sender === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`rounded-3xl border px-4 py-3 shadow-sm ${
                        message.sender === 'user'
                          ? 'border-teal-200 bg-teal-600 text-white'
                          : 'border-slate-200 bg-white text-slate-800'
                      }`}>
                        {message.image && (
                          <Image
                            src={message.image}
                            alt="صورة مرفقة"
                            width={520}
                            height={320}
                            unoptimized
                            className="mb-3 max-h-56 rounded-2xl border object-cover"
                          />
                        )}
                        <p className="whitespace-pre-wrap text-sm font-bold leading-7">{message.text}</p>
                        {!!message.actions?.length && (
                          <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                            {message.actions.map((action, index) => (
                              <button
                                key={`${action.type}-${index}`}
                                onClick={() => runAction(action)}
                                className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-black text-teal-800 transition hover:bg-teal-100"
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 px-2 text-[10px] font-bold text-slate-400">
                        <span>{message.timestamp}</span>
                        {message.sender === 'agent' && (
                          <button onClick={() => copyMessage(message)} className="flex items-center gap-1 text-slate-500 hover:text-teal-700">
                            {copiedId === message.id ? <Check size={12} /> : <Copy size={12} />}
                            نسخ
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-2xl bg-teal-600 text-white">
                      <Bot size={18} />
                    </span>
                    <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-500 shadow-sm">
                      <Loader2 className="ml-2 inline h-4 w-4 animate-spin text-teal-600" />
                      جاري التفكير وتنفيذ الطلب...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>

            <footer className="border-t border-slate-200 bg-white px-4 py-4">
              <div className="mx-auto max-w-5xl">
                {selectedImage && (
                  <div className="mb-2 flex w-fit items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-3 py-2">
                    <ImageIcon size={16} className="text-teal-700" />
                    <span className="text-xs font-black text-teal-800">صورة مرفقة</span>
                    <button onClick={() => setSelectedImage(null)} className="text-slate-400 hover:text-rose-600">
                      <X size={15} />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2 rounded-3xl border border-slate-200 bg-slate-50 p-2 shadow-sm focus-within:border-teal-300 focus-within:bg-white">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-slate-500 hover:text-teal-700"
                    title="إرفاق صورة"
                  >
                    <Paperclip size={18} />
                  </button>
                  <textarea
                    value={prompt}
                    onChange={(event) => setPrompt(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        send();
                      }
                    }}
                    rows={1}
                    className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-3 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="اكتب أمراً، سؤالاً، أو ارفع صورة جدول..."
                  />
                  <button
                    onClick={() => send()}
                    disabled={loading || (!prompt.trim() && !selectedImage)}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-600 text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
                    title="إرسال"
                  >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  </button>
                </div>
                <p className="mt-2 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-400">
                  <FileText size={13} /> Enter للإرسال، Shift+Enter لسطر جديد
                </p>
              </div>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}
