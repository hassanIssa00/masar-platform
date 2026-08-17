'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Bot, Send, Trash2, Image as ImageIcon, X,
  MessageSquare, Loader2, Plus, Clock, CloudSync, Lightbulb,
} from 'lucide-react';
import { syncDocToCloud, deleteDocFromCloud } from '@/lib/firestoreSync';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageBase64?: string;
  imageMime?: string;
  actions?: AiAction[];
  gateway?: string;
  timestamp: string;
}

type AiAction = {
  type: string;
  label: string;
  target?: string;
  payload?: Record<string, unknown>;
};

interface ChatThread {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: string;
}

const STORAGE_KEY = 'masar_teacher_ai_threads_v2';
const CLOUD_COLLECTION = 'teacher_ai_chats';

function loadThreads(): Record<string, ChatThread> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveThread(thread: ChatThread) {
  if (typeof window === 'undefined') return;
  try {
    const all = loadThreads();
    all[thread.id] = thread;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* storage limit */ }

  syncDocToCloud(CLOUD_COLLECTION, thread.id, thread);
}

function removeThread(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const all = loadThreads();
    delete all[id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* err */ }

  deleteDocFromCloud(CLOUD_COLLECTION, id);
}

const QUICK_PROMPTS = [
  { label: 'إنشاء كويز سريع', prompt: 'أنشئ كويز سريع من 5 أسئلة مع الخيارات والإجابات النموذجية في موضوع:' },
  { label: 'تحضير درس تفاعلي', prompt: 'ساعدني في تحضير درس شامل وتفاعلي مع صياغة الأهداف والأنشطة الصفية لموضوع:' },
  { label: 'رسالة لولي الأمر', prompt: 'اكتب رسالة تربوية رسمية ولطيفة لولي أمر طالب لمتابعة مستواه الدراسي وتأخره' },
  { label: 'خطة علاجية مخصصة', prompt: 'اقترح خطة علاجية مخصصة واستراتيجيات تدريس لطالب يعاني من ضعف القراءة والتركيز' },
  { label: 'تحليل صورة الدرس', prompt: 'حلل صورة الدرس المرفقة ولخص أهم النقاط والتمارين الموجودة فيها' },
  { label: 'أنشطة صفية قصيرة', prompt: 'اقترح 3 أنشطة حركية وتحفيزية قصيرة تجدد طاقة الطلاب داخل الفصل' },
];

function authJsonHeaders() {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('masar_token') || localStorage.getItem('access_token')
    : '';
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function TeacherAIChatTab() {
  const [threads, setThreads] = useState<Record<string, ChatThread>>({});
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/png');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cloudSynced, setCloudSynced] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    const initial = loadThreads();
    setThreads(initial);
    const keys = Object.keys(initial).sort((a,b) => new Date(initial[b].lastUpdated).getTime() - new Date(initial[a].lastUpdated).getTime());
    if (keys.length > 0) {
      setActiveThreadId(keys[0]);
    } else {
      const newId = 'th-' + Date.now();
      const defaultTh: ChatThread = {
        id: newId,
        title: 'محادثة جديدة مع المساعد الذكي',
        messages: [],
        lastUpdated: new Date().toISOString(),
      };
      setThreads({ [newId]: defaultTh });
      setActiveThreadId(newId);
      saveThread(defaultTh);
    }
  }, []);

  // Cloud sync
  useEffect(() => {
    getDocs(collection(db, CLOUD_COLLECTION)).then((snap) => {
      if (!snap.empty) {
        const cloudMap: Record<string, ChatThread> = {};
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data() as ChatThread;
          if (data.id) cloudMap[data.id] = data;
        });
        setThreads(prev => {
          const merged = { ...prev, ...cloudMap };
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
          return merged;
        });
        setCloudSynced(true);
      }
    }).catch(e => console.warn('Cloud sync error:', e));

    const unsub = onSnapshot(collection(db, CLOUD_COLLECTION), (snap) => {
      const cloudMap: Record<string, ChatThread> = {};
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data() as ChatThread;
        if (data.id) cloudMap[data.id] = data;
      });
      if (Object.keys(cloudMap).length > 0) {
        setThreads(prev => {
          const merged = { ...prev, ...cloudMap };
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
          return merged;
        });
        setCloudSynced(true);
      }
    });

    return () => unsub();
  }, []);

  const activeThread = threads[activeThreadId] ?? null;
  const currentMessages = activeThread?.messages ?? [];

  useEffect(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [currentMessages, loading]);

  const handleCreateNewThread = () => {
    const newId = 'th-' + Date.now();
    const newTh: ChatThread = {
      id: newId,
      title: 'محادثة جديدة ' + new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      messages: [],
      lastUpdated: new Date().toISOString(),
    };
    setThreads(prev => ({ [newId]: newTh, ...prev }));
    setActiveThreadId(newId);
    saveThread(newTh);
  };

  const handleDeleteThread = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeThread(id);
    setThreads(prev => {
      const copy = { ...prev };
      delete copy[id];
      const remainingKeys = Object.keys(copy).sort((a,b) => new Date(copy[b].lastUpdated).getTime() - new Date(copy[a].lastUpdated).getTime());
      if (id === activeThreadId) {
        if (remainingKeys.length > 0) {
          setActiveThreadId(remainingKeys[0]);
        } else {
          const brandNewId = 'th-' + Date.now();
          const brandNewTh: ChatThread = { id: brandNewId, title: 'محادثة جديدة', messages: [], lastUpdated: new Date().toISOString() };
          copy[brandNewId] = brandNewTh;
          setActiveThreadId(brandNewId);
          saveThread(brandNewTh);
        }
      }
      return copy;
    });
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const [meta, b64] = result.split('base64,');
      const mime = meta.match(/data:(.*?);/)?.[1] || 'image/png';
      setImageBase64(b64);
      setImageMime(mime);
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearImage = () => {
    setImageBase64(null);
    setImageMime('image/png');
    setImagePreview(null);
  };

  const runAction = (action: AiAction) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('masar_action_executed', { detail: action }));
    if (action.target) window.location.href = action.target;
  };

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim();
    if ((!text && !imageBase64) || loading || !activeThreadId) return;

    const userMsg: ChatMessage = {
      id: 'u-' + Date.now(),
      role: 'user',
      text: text || 'صورة مرفقة للتحليل',
      imageBase64: imageBase64 ?? undefined,
      imageMime: imageMime,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    const currentTh = threads[activeThreadId] ?? {
      id: activeThreadId,
      title: text.slice(0, 30) || 'محادثة جديدة',
      messages: [],
      lastUpdated: '',
    };

    const updatedTitle = currentTh.messages.length === 0 && text ? text.slice(0, 35) : currentTh.title;

    const updatedTh: ChatThread = {
      ...currentTh,
      title: updatedTitle,
      messages: [...currentTh.messages, userMsg],
      lastUpdated: new Date().toISOString(),
    };

    setThreads(prev => ({ ...prev, [activeThreadId]: updatedTh }));
    saveThread(updatedTh);
    setInputText('');
    clearImage();
    setLoading(true);

    const history = currentTh.messages.slice(-10).map(m => ({
      sender: m.role === 'user' ? 'user' : 'agent',
      text: m.text.slice(0, 800),
    }));

    let replyText = '';
    let actions: AiAction[] = [];
    let gateway = '';
    try {
      const body: Record<string, unknown> = {
        prompt: text || 'يرجى تحليل هذه الصورة المرفقة وإفادتي كمساعد تربوي للمعلم بالفصل',
        branch: 'IKHLAS_JEDDAH',
        history,
      };
      if (imageBase64) {
        body.image = { data: imageBase64, mimeType: imageMime };
      }
      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: authJsonHeaders(),
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.actions) && typeof window !== 'undefined') {
          actions = data.actions;
          for (const action of data.actions) {
            window.dispatchEvent(new CustomEvent('masar_action_executed', { detail: { ...action, action: action.type, prompt: text } }));
          }
        }
        replyText = data.reply ?? '';
        gateway = data.gateway ?? '';
      }
    } catch { /* err */ }

    if (!replyText) {
      replyText = 'تعذر الاتصال بالمساعد الآن. تأكد من تسجيل الدخول وإعداد مفاتيح Gemini ثم حاول مرة أخرى.';
    }

    const assistantMsg: ChatMessage = {
      id: 'a-' + Date.now(),
      role: 'assistant',
      text: replyText,
      actions,
      gateway,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    const finalTh: ChatThread = {
      ...updatedTh,
      messages: [...updatedTh.messages, assistantMsg],
      lastUpdated: new Date().toISOString(),
    };

    setThreads(prev => ({ ...prev, [activeThreadId]: finalTh }));
    saveThread(finalTh);
    setLoading(false);
  }, [inputText, imageBase64, imageMime, loading, activeThreadId, threads]);

  const sortedThreads = Object.values(threads).sort((a,b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-md shadow-teal-600/20">
            <Bot size={26} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              المساعد الذكي للمعلم بالفصل
              <span className="rounded-full bg-teal-100 px-3 py-0.5 text-xs font-black text-teal-800 flex items-center gap-1">
                حفظ سحابي دائم
              </span>
            </h1>
            <p className="text-xs font-bold text-slate-500 mt-1">
              مساعدك الشخصي لإعداد الدروس، الكويزات، صياغة الملاحظات، وتحليل صور التمارين والكتب.
            </p>
          </div>
        </div>

        {cloudSynced && (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1 text-xs font-black text-emerald-800">
            <CloudSync size={14} className="text-emerald-600" /> المحادثات محفوظة سحابياً
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Saved Chat Threads History */}
        <div className="lg:col-span-4 space-y-3">
          <button
            onClick={handleCreateNewThread}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-l from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white py-3.5 px-4 rounded-2xl text-xs font-black shadow-md transition active:scale-98"
          >
            <Plus size={16} /> بدء محادثة جديدة
          </button>

          <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm space-y-2">
            <div className="text-[11px] font-black text-slate-400 px-2 py-1 uppercase tracking-wider flex items-center justify-between">
              <span>المحادثات المحفوظة ({sortedThreads.length})</span>
              <Clock size={12} />
            </div>

            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-0.5 scrollbar-thin">
              {sortedThreads.map((th) => {
                const active = th.id === activeThreadId;
                return (
                  <div
                    key={th.id}
                    onClick={() => setActiveThreadId(th.id)}
                    className={`group cursor-pointer rounded-xl border p-3 transition-all duration-200 flex items-center justify-between gap-2 ${
                      active
                        ? 'border-teal-600 bg-teal-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MessageSquare size={16} className={active ? 'text-teal-600 shrink-0' : 'text-slate-400 shrink-0'} />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-900 truncate">{th.title || 'محادثة بدون عنوان'}</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                          {th.messages.length} رسائل · {new Date(th.lastUpdated).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDeleteThread(th.id, e)}
                      className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition p-1 rounded-lg hover:bg-rose-50"
                      title="مسح المحادثة"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Chat Canvas */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-[640px]">
            {/* Quick Prompts Bar */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="text-[11px] font-black text-slate-500 shrink-0 flex items-center gap-1">
                <Lightbulb size={13} className="text-amber-500" /> اقتراحات سريعة:
              </span>
              {QUICK_PROMPTS.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(qp.prompt)}
                  disabled={loading}
                  className="shrink-0 bg-white border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 text-slate-800 text-[11px] font-black px-3 py-1.5 rounded-xl transition shadow-2xs disabled:opacity-50"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* Messages Container */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-slate-50/30">
              {currentMessages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center shadow-sm">
                    <Bot size={36} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">أهلاً د. إسماعيل عيسى</h3>
                    <p className="text-xs font-bold text-slate-500 max-w-md mt-1 leading-relaxed">
                      اطلب إعداد اختبار، كتابة تحضير، صياغة تقرير أو إرسال صورة درس لتحليلها.
                    </p>
                  </div>
                </div>
              )}

              {currentMessages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 font-black text-xs shadow-xs ${
                    m.role === 'user' ? 'bg-slate-900 text-white' : 'bg-teal-600 text-white'
                  }`}>
                    {m.role === 'user' ? 'د.إ' : <Bot size={18} />}
                  </div>

                  <div className={`max-w-[82%] rounded-2xl p-4 text-xs font-bold leading-relaxed shadow-xs space-y-2 ${
                    m.role === 'user'
                      ? 'bg-slate-900 text-white rounded-tr-none'
                      : 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                  }`}>
                    {m.imageBase64 && (
                      <div className="rounded-xl overflow-hidden border border-white/20 max-w-xs">
                        <img src={`data:${m.imageMime};base64,${m.imageBase64}`} alt="المرفق" className="w-full object-cover max-h-48" />
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{m.text}</div>
                    {!!m.actions?.length && (
                      <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3">
                        {m.actions.map((action, index) => (
                          <button
                            key={`${action.type}-${index}`}
                            onClick={() => runAction(action)}
                            className="flex items-center justify-between gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-[11px] font-black text-teal-800 transition hover:bg-teal-100"
                          >
                            <span>{action.label}</span>
                            <ArrowLeft size={14} />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className={`text-[9px] font-mono ${m.role === 'user' ? 'text-slate-400' : 'text-slate-400'} text-left`}>
                      {m.timestamp}
                    </div>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                    <Bot size={18} />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-xs flex items-center gap-2 text-xs font-bold text-teal-800">
                    <Loader2 size={16} className="animate-spin text-teal-600" />
                    جاري التفكير والتوليد للمعلم...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Image Preview Thumbnail */}
            {imagePreview && (
              <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={imagePreview} alt="معاينة" className="w-10 h-10 rounded-lg object-cover border border-slate-300" />
                  <span className="text-xs font-bold text-slate-700">صورة مرفقة جاهزة للإرسال والتحليل</span>
                </div>
                <button onClick={clearImage} className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50">
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-slate-200 flex items-end gap-2">
              <input type="file" ref={fileInputRef} onChange={handleImagePick} accept="image/*" className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-3 rounded-2xl border border-slate-200 text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition shrink-0"
                title="إرفاق صورة درس أو ورقة عمل"
              >
                <ImageIcon size={18} />
              </button>

              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                rows={1}
                placeholder="اطلب أي شيء من مساعدك الذكي بالفصل..."
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-teal-600 focus:outline-none resize-none max-h-24 scrollbar-none"
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
    </div>
  );
}
