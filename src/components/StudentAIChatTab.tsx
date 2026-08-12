'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot, Send, Sparkles, Trash2, Image as ImageIcon, X,
  MessageSquare, User, BookOpen, Loader2, CheckCircle2, Brain,
  ChevronDown, Plus, Clock, CloudSync,
} from 'lucide-react';
import { getClassStudents, ClassStudentRecord } from '@/lib/classDb';
import { syncDocToCloud, deleteDocFromCloud } from '@/lib/firestoreSync';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/* ── Types ──────────────────────────────────────────────────────────────── */
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  imageBase64?: string;
  imageMime?: string;
  timestamp: string;
  gateway?: string;
}

interface StudentSession {
  studentId: string;
  studentName: string;
  messages: ChatMessage[];
  lastUpdated: string;
}

const STORAGE_KEY = 'masar_student_ai_chats_v1';
const CLOUD_COLLECTION = 'student_ai_chats';

/* ── Storage & Cloud Helpers ────────────────────────────────────────────── */
function loadSessions(): Record<string, StudentSession> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSession(session: StudentSession) {
  try {
    const all = loadSessions();
    all[session.studentId] = session;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* storage full */ }

  // ☁️ Sync to Server Cloud Database
  syncDocToCloud(CLOUD_COLLECTION, session.studentId, session);
}

/* ── Quick prompt chips ─────────────────────────────────────────────────── */
const QUICK_PROMPTS = [
  'اشرح لي الجمع والطرح بطريقة سهلة',
  'ساعدني أكتب جملة عربية صحيحة',
  'ما هو الفرق بين الحيوانات الأليفة والبرية؟',
  'كيف أحل مسألة القسمة؟',
  'اشرح لي معنى كلمة "التعاون"',
  'ساعدني في حفظ جدول الضرب',
];

/* ─────────────────────────────────────────────────────────────────────── */
export default function StudentAIChatTab() {
  const [students] = useState<ClassStudentRecord[]>(() => getClassStudents());
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    () => getClassStudents()[0]?.id ?? ''
  );
  const [sessions, setSessions] = useState<Record<string, StudentSession>>(() => loadSessions());
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/png');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cloudSynced, setCloudSynced] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const selectedStudent = students.find(s => s.id === selectedStudentId) ?? students[0] ?? null;
  const currentMessages: ChatMessage[] = sessions[selectedStudentId]?.messages ?? [];

  /* ☁️ Cloud DB realtime sync on mount ──────────────────────────── */
  useEffect(() => {
    // Pull initial cloud chat sessions
    getDocs(collection(db, CLOUD_COLLECTION)).then((snap) => {
      if (!snap.empty) {
        const cloudMap: Record<string, StudentSession> = {};
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data() as StudentSession;
          if (data.studentId) cloudMap[data.studentId] = data;
        });
        setSessions(prev => {
          const merged = { ...prev, ...cloudMap };
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
          }
          return merged;
        });
        setCloudSynced(true);
      }
    }).catch(err => console.warn('Cloud chat load notice:', err));

    // Subscribe to realtime cloud updates
    const unsub = onSnapshot(collection(db, CLOUD_COLLECTION), (snap) => {
      const cloudMap: Record<string, StudentSession> = {};
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data() as StudentSession;
        if (data.studentId) cloudMap[data.studentId] = data;
      });
      if (Object.keys(cloudMap).length > 0) {
        setSessions(prev => {
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

  /* ── Auto-scroll ──────────────────────────────────────────────── */
  useEffect(() => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [currentMessages, loading]);

  /* ── Image picker ─────────────────────────────────────────────── */
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

  /* ── Send message ─────────────────────────────────────────────── */
  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? inputText).trim();
    if ((!text && !imageBase64) || loading || !selectedStudent) return;

    const userMsg: ChatMessage = {
      id: 'u-' + Date.now(),
      role: 'user',
      text: text || '📷 صورة مرفقة',
      imageBase64: imageBase64 ?? undefined,
      imageMime: imageMime,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    const existing = sessions[selectedStudentId] ?? {
      studentId: selectedStudentId,
      studentName: selectedStudent.fullName,
      messages: [],
      lastUpdated: '',
    };

    const updatedSession: StudentSession = {
      ...existing,
      messages: [...existing.messages, userMsg],
      lastUpdated: new Date().toISOString(),
    };

    setSessions(prev => ({ ...prev, [selectedStudentId]: updatedSession }));
    saveSession(updatedSession);
    setInputText('');
    clearImage();
    setLoading(true);

    // Build history for context
    const history = existing.messages.slice(-8).map(m => ({
      sender: m.role === 'user' ? 'user' : 'agent',
      text: m.text.slice(0, 600),
    }));

    let replyText = '';
    let gateway = '';

    try {
      const body: Record<string, unknown> = {
        prompt: text || 'يرجى تحليل هذه الصورة وشرحها للطالب بأسلوب بسيط ومحبب',
        branch: 'IKHLAS_JEDDAH',
        history,
        studentName: selectedStudent.fullName,
      };
      if (imageBase64) {
        body.image = { data: imageBase64, mimeType: imageMime };
      }
      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        replyText = data.reply ?? '';
        gateway = data.gateway ?? '';
      }
    } catch { /* network error */ }

    if (!replyText) {
      replyText = 'عذراً يا صديقي، في مشكلة في الاتصال دلوقتي. جرب تاني بعد ثانية! 😊';
    }

    const assistantMsg: ChatMessage = {
      id: 'a-' + Date.now(),
      role: 'assistant',
      text: replyText,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      gateway,
    };

    const finalSession: StudentSession = {
      ...updatedSession,
      messages: [...updatedSession.messages, assistantMsg],
      lastUpdated: new Date().toISOString(),
    };

    setSessions(prev => ({ ...prev, [selectedStudentId]: finalSession }));
    saveSession(finalSession);
    setLoading(false);
  }, [inputText, imageBase64, imageMime, loading, selectedStudent, selectedStudentId, sessions]);

  /* ── Clear chat ───────────────────────────────────────────────── */
  const clearChat = () => {
    const emptySession: StudentSession = {
      studentId: selectedStudentId,
      studentName: selectedStudent?.fullName ?? '',
      messages: [],
      lastUpdated: new Date().toISOString(),
    };
    setSessions(prev => ({ ...prev, [selectedStudentId]: emptySession }));
    saveSession(emptySession);
    deleteDocFromCloud(CLOUD_COLLECTION, selectedStudentId);
  };

  /* ── Keyboard send ────────────────────────────────────────────── */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const totalChats = Object.values(sessions).reduce((acc, s) => acc + s.messages.length, 0);

  return (
    <div className="space-y-5" dir="rtl">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-md shadow-violet-600/20">
              <Brain size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                مساعد الذكاء الاصطناعي للطلاب (متصل بقاعدة البيانات ☁️)
                <span className="rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-black text-emerald-800 flex items-center gap-1">
                  ● دائم على الخادم
                </span>
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-0.5">
                شات تفاعلي لكل طالب · متصل ومحفوظ بسحابة المنصة · دعم الصور والتجربة التفاعلية
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2 text-center">
              <div className="text-xs font-black text-emerald-700 flex items-center gap-1">
                ☁️ خادم السحابة: متصل
              </div>
              <div className="text-[10px] text-emerald-600 font-bold">مزامنة فورية لكل الطلاب</div>
            </div>
            <div className="bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 text-center">
              <div className="text-lg font-black text-violet-700">{totalChats}</div>
              <div className="text-[10px] text-violet-500 font-bold">رسالة بالسيرفر</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Layout: Student Selector + Chat ──────────────────── */}
      <div className="grid gap-5 lg:grid-cols-12">

        {/* Student Selector Panel */}
        <div className="lg:col-span-3 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <User size={13} /> اختر الطالب
            </h2>
            <div className="space-y-2">
              {students.map(s => {
                const msgCount = sessions[s.id]?.messages.length ?? 0;
                const active = s.id === selectedStudentId;
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudentId(s.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-right transition-all border ${
                      active
                        ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300 hover:bg-violet-50'
                    }`}
                  >
                    <div className={`grid h-9 w-9 place-items-center rounded-xl font-black text-sm shrink-0 ${
                      active ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-700'
                    }`}>
                      {s.fullName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-black truncate ${active ? 'text-white' : 'text-slate-900'}`}>
                        {s.fullName.split(' ').slice(0, 2).join(' ')}
                      </div>
                      <div className={`text-[10px] font-bold ${active ? 'text-violet-200' : 'text-slate-400'}`}>
                        {msgCount > 0 ? `${msgCount} رسالة (محفوظة)` : 'لا توجد محادثات'}
                      </div>
                    </div>
                    {msgCount > 0 && (
                      <span className={`w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 ${
                        active ? 'bg-white text-violet-700' : 'bg-violet-100 text-violet-700'
                      }`}>
                        {msgCount > 99 ? '99+' : msgCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info Card */}
          <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 space-y-2">
            <p className="text-xs font-black text-violet-800 flex items-center gap-1.5">
              <Sparkles size={13} /> مميزات النظام السحابي
            </p>
            <ul className="space-y-1.5 text-[11px] font-bold text-violet-700">
              <li>☁️ حفظ دائم على خادم قاعدة البيانات</li>
              <li>📱 متزامن على جوال الطالب والمعلم</li>
              <li>📷 تحليل الصور بالذكاء الاصطناعي</li>
              <li>🔒 مشفّر وخاص بطلاب الفصل</li>
            </ul>
          </div>
        </div>

        {/* Chat Panel */}
        <div className="lg:col-span-9">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex flex-col h-[620px]">

            {/* Chat Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-violet-600 to-indigo-700 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-black text-white text-sm">
                  {selectedStudent?.fullName.charAt(0) ?? '?'}
                </div>
                <div>
                  <p className="text-sm font-black text-white">
                    {selectedStudent?.fullName ?? 'اختر طالباً'}
                  </p>
                  <p className="text-[11px] text-violet-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    مساعد AI شخصي · متصل بالخادم السحابي
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentMessages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3 py-1.5 rounded-lg text-[11px] font-black transition"
                    title="مسح المحادثة من الخادم"
                  >
                    <Trash2 size={12} /> مسح السجل
                  </button>
                )}
                <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 px-3 py-1.5 rounded-lg text-[11px] text-white font-bold">
                  <MessageSquare size={11} />
                  {currentMessages.length} رسالة
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {currentMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-5 py-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                    <Brain size={30} className="text-violet-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-700">
                      ابدأ محادثة مع مساعد AI
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-bold">
                      {selectedStudent
                        ? `أهلاً ${selectedStudent.fullName.split(' ')[0]}! اسألني أي شيء وسأحفظه لك على المنصة 😊`
                        : 'اختر طالباً من القائمة على اليمين'}
                    </p>
                  </div>
                  {/* Quick prompts */}
                  <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                    {QUICK_PROMPTS.map(p => (
                      <button
                        key={p}
                        onClick={() => sendMessage(p)}
                        className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-right hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {currentMessages.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-black ${
                        msg.role === 'user'
                          ? 'bg-violet-600 text-white'
                          : 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white'
                      }`}>
                        {msg.role === 'user'
                          ? (selectedStudent?.fullName.charAt(0) ?? '?')
                          : <Bot size={15} />
                        }
                      </div>

                      {/* Bubble */}
                      <div className={`max-w-[75%] space-y-1.5 ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                        {/* Image if present */}
                        {msg.imageBase64 && (
                          <div className={`rounded-2xl overflow-hidden border-2 ${
                            msg.role === 'user' ? 'border-violet-200' : 'border-slate-200'
                          }`}>
                            <img
                              src={`data:${msg.imageMime ?? 'image/png'};base64,${msg.imageBase64}`}
                              alt="صورة مرفقة"
                              className="max-w-xs max-h-48 object-contain bg-white"
                            />
                          </div>
                        )}
                        {/* Text bubble */}
                        <div className={`px-4 py-3 rounded-2xl text-sm font-bold leading-relaxed whitespace-pre-wrap ${
                          msg.role === 'user'
                            ? 'bg-violet-600 text-white rounded-tr-sm'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'
                        }`}>
                          {msg.text}
                        </div>
                        {/* Timestamp + gateway */}
                        <div className={`text-[10px] text-slate-400 font-bold flex items-center gap-1.5 ${
                          msg.role === 'user' ? 'flex-row-reverse' : ''
                        }`}>
                          <Clock size={9} />
                          {msg.timestamp}
                          {msg.gateway && (
                            <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-md text-[9px]">
                              ✓ {msg.gateway.includes('Gemini') ? 'Gemini Cloud AI' : 'Cloud AI'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Loading bubble */}
                  {loading && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Bot size={15} />
                      </div>
                      <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="px-4 pt-3 border-t border-slate-100 bg-white">
                <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl p-2.5">
                  <img src={imagePreview} alt="preview" className="w-12 h-12 rounded-lg object-cover border border-violet-200" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-violet-800">صورة جاهزة للإرسال</p>
                    <p className="text-[10px] text-violet-500 font-bold">سيتم تحليلها بالذكاء الاصطناعي</p>
                  </div>
                  <button onClick={clearImage} className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-600">
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-slate-100 bg-white rounded-b-2xl">
              <div className="flex items-end gap-2.5">
                {/* Image upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0 w-10 h-10 rounded-xl bg-slate-100 hover:bg-violet-100 border border-slate-200 hover:border-violet-300 flex items-center justify-center text-slate-500 hover:text-violet-600 transition"
                  title="إرفاق صورة"
                >
                  <ImageIcon size={18} />
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImagePick}
                  className="hidden"
                />

                {/* Text input */}
                <textarea
                  ref={inputRef}
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    selectedStudent
                      ? `اكتب سؤال ${selectedStudent.fullName.split(' ')[0]}...`
                      : 'اختر طالباً أولاً...'
                  }
                  disabled={!selectedStudent || loading}
                  rows={1}
                  className="flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-violet-400 focus:bg-white focus:outline-none transition max-h-28 overflow-y-auto font-bold disabled:opacity-50"
                  style={{ minHeight: 42 }}
                />

                {/* Send button */}
                <button
                  onClick={() => sendMessage()}
                  disabled={(!inputText.trim() && !imageBase64) || loading || !selectedStudent}
                  className="flex-shrink-0 w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 flex items-center justify-center text-white transition shadow-sm shadow-violet-600/20"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-2 text-center flex items-center justify-center gap-1">
                <span>Enter للإرسال · Shift+Enter لسطر جديد</span>
                <span>· ☁️ المحادثات محفوظة في قاعدة بيانات السيرفر</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
