'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send, Lock, Unlock, Pin, Trash2, Search, Users, Image as ImageIcon,
  Mic, Paperclip, CheckCheck, Smile, Volume2, ShieldCheck, Crown,
  User, Phone, MessageCircle, AlertCircle, Sparkles, X, ChevronDown,
  Download, RefreshCw, MessageSquare, Flame, Check, MoreVertical
} from 'lucide-react';
import { getClassParents, type ClassParentRecord } from '@/lib/classDb';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { syncDocToCloud } from '@/lib/firestoreSync';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'parent' | 'system';
  studentName?: string;
  text: string;
  imageUrl?: string;
  audioUrl?: string;
  createdAt: string;
  isPinned?: boolean;
  isAnnouncement?: boolean;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  reactions?: Record<string, number>; // emoji -> count
}

interface ChatSettings {
  isLocked: boolean; // if true, only admin (Dr. Ismail) can post
  pinnedMessageId?: string | null;
  slowModeSeconds: number; // 0 = no limit
}

const STORAGE_CHAT_KEY = 'masar_parents_community_chat_v2';
const STORAGE_SETTINGS_KEY = 'masar_parents_chat_settings_v2';
const FIRESTORE_CHAT_DOC = 'IKHLAS_PARENTS_GROUP';

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-init-1',
    senderId: 'dr-ismail',
    senderName: 'د. إسماعيل عيسى',
    senderRole: 'admin',
    text: 'السلام عليكم ورحمة الله وبركاته، أهلاً ومرحباً بجميع أولياء أمور طلابنا الأعزاء في فصل 1/1 بمدارس الإخلاص الأهلية بجدة 🏫✨\nهذا الملتقى مخصص لمتابعة اليوم الدراسي، استفساراتكم، والتواصل المستمر من أجل تفوق أبنائنا بإذن الله.',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    isPinned: true,
    isAnnouncement: true,
    reactions: { '❤️': 4, '👏': 3, '🤲': 5 },
  },
  {
    id: 'msg-init-2',
    senderId: 'parent-001',
    senderName: 'أ. إبراهيم محمد موافي',
    senderRole: 'parent',
    studentName: 'انس موافي',
    text: 'وعليكم السلام ورحمة الله وبركاته يا دكتور. شكراً جزيلاً لاهتمامكم وحرصكم الدائم على متابعة أنس وباقي زملائه 🙏🌹',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    reactions: { '👍': 3 },
  },
  {
    id: 'msg-init-3',
    senderId: 'dr-ismail',
    senderName: 'د. إسماعيل عيسى',
    senderRole: 'admin',
    text: 'تنويه هام لأولياء الأمور الكرام:\nتم رفع واجب جديد في مادة (لغتي العربية) من الصفحة 15 إلى 20، يرجى تشجيع الطلاب على حل الواجب وإرساله للتصحيح التلقائي.',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    isAnnouncement: true,
    reactions: { '👍': 5, '🌟': 2 },
  },
];

const DEFAULT_SETTINGS: ChatSettings = {
  isLocked: false,
  pinnedMessageId: 'msg-init-1',
  slowModeSeconds: 0,
};

export default function ParentsCommunityChatTab() {
  const [parents, setParents] = useState<ClassParentRecord[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_CHAT_KEY);
        if (raw) return JSON.parse(raw);
      } catch { /* noop */ }
    }
    return INITIAL_MESSAGES;
  });

  const [settings, setSettings] = useState<ChatSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
        if (raw) return JSON.parse(raw);
      } catch { /* noop */ }
    }
    return DEFAULT_SETTINGS;
  });

  // Current active posting identity (Admin Dr. Ismail vs one of the parents for testing)
  const [activeIdentity, setActiveIdentity] = useState<{
    id: string;
    name: string;
    role: 'admin' | 'parent';
    studentName?: string;
  }>({
    id: 'dr-ismail',
    name: 'د. إسماعيل عيسى',
    role: 'admin',
  });

  const [inputText, setInputText] = useState('');
  const [isAnnouncementMode, setIsAnnouncementMode] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showMembersDrawer, setShowMembersDrawer] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load parents list
  useEffect(() => {
    const pList = getClassParents();
    setParents(pList);
  }, []);

  // Sync to localStorage & cloud helper
  const persistMessages = (newMessages: ChatMessage[]) => {
    setMessages(newMessages);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(newMessages));
      } catch { /* noop */ }
      syncDocToCloud('parents_community_chat', FIRESTORE_CHAT_DOC, {
        updatedAt: new Date().toISOString(),
        messages: newMessages,
      });
    }
  };

  const persistSettings = (newSettings: ChatSettings) => {
    setSettings(newSettings);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(newSettings));
      } catch { /* noop */ }
      syncDocToCloud('parents_chat_settings', FIRESTORE_CHAT_DOC, {
        updatedAt: new Date().toISOString(),
        settings: newSettings,
      });
    }
  };

  // Realtime Cloud Listener
  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = onSnapshot(collection(db, 'parents_community_chat'), (snap) => {
        const docSnap = snap.docs.find(d => d.id === FIRESTORE_CHAT_DOC);
        if (docSnap) {
          const data = docSnap.data();
          if (data && Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(data.messages);
            try {
              localStorage.setItem(STORAGE_CHAT_KEY, JSON.stringify(data.messages));
            } catch { /* noop */ }
          }
        }
      });
    } catch (e) {
      console.warn('Firestore chat listener note:', e);
    }
    return () => unsub();
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, attachedImage]);

  // ── Send Message Handler ──
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachedImage) return;

    // Check lock permission: if locked and sender is not admin, deny
    if (settings.isLocked && activeIdentity.role !== 'admin') {
      alert('🔒 الشات مغلق حالياً من قِبل المشرف د. إسماعيل عيسى.');
      return;
    }

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: activeIdentity.id,
      senderName: activeIdentity.name,
      senderRole: activeIdentity.role,
      studentName: activeIdentity.studentName,
      text: inputText.trim(),
      imageUrl: attachedImage || undefined,
      isAnnouncement: activeIdentity.role === 'admin' && isAnnouncementMode,
      createdAt: new Date().toISOString(),
      replyTo: replyingTo ? {
        id: replyingTo.id,
        senderName: replyingTo.senderName,
        text: replyingTo.text.slice(0, 70),
      } : undefined,
      reactions: {},
    };

    const updated = [...messages, newMsg];
    persistMessages(updated);

    setInputText('');
    setAttachedImage(null);
    setReplyingTo(null);
    setIsAnnouncementMode(false);
  };

  // ── Admin: Toggle Chat Lock ──
  const handleToggleLock = () => {
    const newLockState = !settings.isLocked;
    const systemNotice: ChatMessage = {
      id: `sys-${Date.now()}`,
      senderId: 'system',
      senderName: 'النظام',
      senderRole: 'system',
      text: newLockState
        ? 'قام د. إسماعيل عيسى بإغلاق الشات — المشاركات مقتصرة على المشرف فقط للتعاميم الموثقة.'
        : '🔓 قام د. إسماعيل عيسى بفتح الشات — نرحب بمشاركات واستفسارات أولياء الأمور الكرام.',
      createdAt: new Date().toISOString(),
    };

    persistSettings({ ...settings, isLocked: newLockState });
    persistMessages([...messages, systemNotice]);
  };

  // ── Admin: Pin / Unpin Message ──
  const handleTogglePin = (msgId: string) => {
    const isCurrentlyPinned = settings.pinnedMessageId === msgId;
    const newPinnedId = isCurrentlyPinned ? null : msgId;
    persistSettings({ ...settings, pinnedMessageId: newPinnedId });
    const updated = messages.map(m => ({
      ...m,
      isPinned: m.id === newPinnedId,
    }));
    persistMessages(updated);
  };

  // ── Admin: Delete Message ──
  const handleDeleteMessage = (msgId: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الرسالة من الشات؟')) {
      const updated = messages.filter(m => m.id !== msgId);
      persistMessages(updated);
    }
  };

  // ── Add Emoji Reaction ──
  const handleAddReaction = (msgId: string, emoji: string) => {
    const updated = messages.map(m => {
      if (m.id === msgId) {
        const reactions = { ...(m.reactions || {}) };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      }
      return m;
    });
    persistMessages(updated);
  };

  // ── Handle Image Attachment Upload ──
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAttachedImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Filter messages by search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(m =>
      m.text.toLowerCase().includes(q) ||
      m.senderName.toLowerCase().includes(q) ||
      (m.studentName && m.studentName.toLowerCase().includes(q))
    );
  }, [messages, searchQuery]);

  const pinnedMessage = messages.find(m => m.id === settings.pinnedMessageId) || null;

  return (
    <div className="space-y-4 text-slate-900" dir="rtl">

      {/* ── TOP EXECUTIVE BANNER & ADMIN CONTROL BAR ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06392c] via-[#0b4d3c] to-[#04291e] p-5 sm:p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-xs px-3 py-1 rounded-full font-black flex items-center gap-1.5 backdrop-blur-md">
                <Users size={14} className="text-amber-400" />
                ملتقى أولياء أمور فصل 1/1
              </span>
              <span className={`text-xs px-3 py-1 rounded-full font-black flex items-center gap-1.5 border backdrop-blur-md ${
                settings.isLocked
                  ? 'bg-rose-500/20 border-rose-400/30 text-rose-200'
                  : 'bg-emerald-500/20 border-emerald-400/30 text-emerald-200'
              }`}>
                {settings.isLocked ? <><Lock size={12} /> الشات مغلق للمشاركات</> : <><Unlock size={12} /> الشات مفتوح للجميع</>}
              </span>
              <span className="text-xs text-emerald-300 font-bold bg-white/10 px-2.5 py-1 rounded-full">
                {parents.length + 1} عضو متصل 🟢
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              شات ومجتمع أولياء الأمور 💬
            </h2>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-emerald-100/90">
              قناة التواصل الموثقة المباشرة بين د. إسماعيل عيسى وأولياء أمور طلاب الفصل.
            </p>
          </div>

          {/* Admin Action Buttons for Dr. Ismail */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleToggleLock}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition shadow-lg active:scale-95 border cursor-pointer ${
                settings.isLocked
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 text-slate-950 border-emerald-300'
                  : 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 text-white border-rose-400'
              }`}
              title="التحكم في صلاحية إرسال الرسائل لجميع أولياء الأمور"
            >
              {settings.isLocked ? (
                <><Unlock size={15} /> فتح الشات للجميع 🔓</>
              ) : (
                <><Lock size={15} /> قفل الشات (تعاميم فقط) 🔒</>
              )}
            </button>

            <button
              onClick={() => setShowMembersDrawer(!showMembersDrawer)}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3.5 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer backdrop-blur-md"
            >
              <Users size={15} className="text-amber-300" />
              الأعضاء ({parents.length})
            </button>

            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-2xl text-xs font-bold transition cursor-pointer"
              title="بحث في الرسائل"
            >
              <Search size={15} />
            </button>
          </div>
        </div>

        {/* Identity Switcher Bar (Allows Dr. Ismail to switch between his Admin badge and Parents for testing) */}
        <div className="mt-4 pt-3 border-t border-emerald-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-200 font-bold">
            <ShieldCheck size={14} className="text-amber-400" />
            <span>الإرسال حالياً بصفتك:</span>
            <span className="bg-white/15 px-2.5 py-1 rounded-lg font-black text-white border border-white/20">
              {activeIdentity.role === 'admin' ? '👑 د. إسماعيل عيسى (المشرف العام)' : `👨‍👧 ${activeIdentity.name} (ولي أمر)`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-emerald-300">تبديل الهوية للتجربة:</span>
            <select
              value={activeIdentity.id}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'dr-ismail') {
                  setActiveIdentity({ id: 'dr-ismail', name: 'د. إسماعيل عيسى', role: 'admin' });
                } else {
                  const p = parents.find(p => p.id === val);
                  if (p) {
                    setActiveIdentity({ id: p.id, name: p.name, role: 'parent', studentName: p.studentName });
                  }
                }
              }}
              className="bg-emerald-950/80 border border-emerald-600/60 text-white text-[11px] font-black rounded-xl px-3 py-1 focus:outline-none cursor-pointer"
            >
              <option value="dr-ismail">👑 د. إسماعيل عيسى (المشرف العام)</option>
              {parents.map(p => (
                <option key={p.id} value={p.id}>👨‍👧 {p.name} (والد {p.studentName})</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── SEARCH BAR (IF OPEN) ── */}
      {showSearch && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث عن رسالة أو اسم ولي أمر أو كلمة في المحادثة..."
            className="w-full text-xs font-bold text-slate-800 focus:outline-none placeholder:text-slate-400"
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-600">
              مسح
            </button>
          )}
          <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="p-1 text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── MAIN CHAT CONTAINER ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* ── CHAT FEED AREA (3 COLS) ── */}
        <div className="lg:col-span-3 rounded-3xl border border-slate-200 bg-white shadow-lg flex flex-col h-[650px] overflow-hidden">

          {/* ── PINNED MESSAGE BANNER ── */}
          {pinnedMessage && (
            <div className="bg-gradient-to-r from-amber-50 via-amber-100/70 to-emerald-50 border-b border-amber-200 p-3 px-4 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Pin size={15} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-black text-amber-900">تعميم مثبت من {pinnedMessage.senderName}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 truncate max-w-md">
                    {pinnedMessage.text}
                  </p>
                </div>
              </div>

              {activeIdentity.role === 'admin' && (
                <button
                  onClick={() => handleTogglePin(pinnedMessage.id)}
                  className="text-[11px] font-bold text-amber-800 hover:text-amber-950 px-2 py-1 rounded-lg hover:bg-amber-200/60 transition shrink-0 cursor-pointer"
                  title="إلغاء التثبيت"
                >
                  إلغاء التثبيت ✕
                </button>
              )}
            </div>
          )}

          {/* ── MESSAGES SCROLLABLE LIST ── */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
            {filteredMessages.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <MessageSquare size={36} className="text-slate-300 mx-auto" />
                <p className="text-xs font-black text-slate-500">لا توجد رسائل مطابقة لبحثك</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isAdmin = msg.senderRole === 'admin';
                const isSystem = msg.senderRole === 'system';
                const isMe = msg.senderId === activeIdentity.id;

                // ── System Event Message ──
                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <div className="bg-slate-200/80 border border-slate-300/80 text-slate-700 text-[11px] font-bold px-4 py-1.5 rounded-full text-center max-w-md shadow-xs flex items-center gap-1.5">
                        <span>🔔</span>
                        <span>{msg.text}</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col group ${isMe ? 'items-start' : 'items-end'}`}
                  >
                    {/* Message Bubble Container */}
                    <div
                      className={`relative max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 shadow-sm transition-all ${
                        isAdmin
                          ? 'bg-gradient-to-br from-[#06392c] to-[#0a4e3c] text-white border-2 border-emerald-700/50 shadow-emerald-950/10'
                          : isMe
                          ? 'bg-emerald-700 text-white border border-emerald-800'
                          : 'bg-white text-slate-900 border border-slate-200'
                      }`}
                    >
                      {/* Sender Header */}
                      <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-white/15">
                        <div className="flex items-center gap-2">
                          {isAdmin ? (
                            <div className="flex items-center gap-1 bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-lg text-[10px] font-black border border-amber-400/40">
                              <Crown size={12} className="text-amber-400" />
                              <span>المشرف العام</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg text-[10px] font-black">
                              <User size={11} className="text-emerald-700" />
                              <span>ولي أمر {msg.studentName ? `(${msg.studentName})` : ''}</span>
                            </div>
                          )}
                          <span className={`text-xs font-black ${isAdmin ? 'text-amber-300' : isMe ? 'text-white' : 'text-slate-900'}`}>
                            {msg.senderName}
                          </span>
                        </div>

                        {/* Message Timestamp */}
                        <span className={`text-[10px] font-mono font-semibold ${isAdmin || isMe ? 'text-emerald-200/80' : 'text-slate-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Replying To Preview (if any) */}
                      {msg.replyTo && (
                        <div className={`text-[11px] rounded-xl p-2 mb-2 border-r-4 ${
                          isAdmin || isMe
                            ? 'bg-white/10 border-amber-400 text-emerald-100'
                            : 'bg-slate-100 border-emerald-600 text-slate-700'
                        }`}>
                          <span className="font-black block">{msg.replyTo.senderName}</span>
                          <span className="truncate block opacity-80">{msg.replyTo.text}</span>
                        </div>
                      )}

                      {/* Announcement Highlight Badge */}
                      {msg.isAnnouncement && (
                        <div className="bg-amber-400/20 border border-amber-400/30 text-amber-200 text-[11px] font-black px-2.5 py-1 rounded-xl mb-2 flex items-center gap-1.5">
                          <Flame size={13} className="text-amber-400 animate-pulse" />
                          <span>تعميم موثق من إدارة الفصل</span>
                        </div>
                      )}

                      {/* Attached Image (if any) */}
                      {msg.imageUrl && (
                        <div className="mb-2 rounded-2xl overflow-hidden border border-white/20">
                          <img
                            src={msg.imageUrl}
                            alt="صورة مرفقة"
                            className="w-full max-h-64 object-cover hover:scale-101 transition cursor-pointer"
                            onClick={() => window.open(msg.imageUrl, '_blank')}
                          />
                        </div>
                      )}

                      {/* Message Text */}
                      <p className="text-xs sm:text-sm font-semibold leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>

                      {/* Reactions & Actions Row */}
                      <div className="mt-2.5 pt-1.5 flex items-center justify-between gap-2 flex-wrap text-[11px]">
                        {/* Existing Reactions */}
                        <div className="flex items-center gap-1 flex-wrap">
                          {msg.reactions && Object.entries(msg.reactions).map(([emoji, count]) => (
                            <span
                              key={emoji}
                              onClick={() => handleAddReaction(msg.id, emoji)}
                              className={`px-2 py-0.5 rounded-full text-xs font-black border transition cursor-pointer active:scale-90 ${
                                isAdmin || isMe
                                  ? 'bg-white/15 border-white/25 text-white hover:bg-white/25'
                                  : 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                              }`}
                            >
                              {emoji} {count}
                            </span>
                          ))}
                        </div>

                        {/* Quick Reaction & Reply Toolbar */}
                        <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition">
                          {['👍', '❤️', '🤲', '👏'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => handleAddReaction(msg.id, emoji)}
                              className="p-1 hover:scale-125 transition text-xs cursor-pointer"
                              title={`تفاعل بـ ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}

                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="p-1 text-[11px] font-bold hover:underline cursor-pointer opacity-80 hover:opacity-100"
                            title="رد على هذه الرسالة"
                          >
                            رد ↩️
                          </button>

                          {/* Admin Tools: Pin / Delete */}
                          {activeIdentity.role === 'admin' && (
                            <>
                              <button
                                onClick={() => handleTogglePin(msg.id)}
                                className="p-1 hover:scale-110 transition cursor-pointer text-amber-300"
                                title={msg.isPinned ? 'إلغاء التثبيت' : 'تثبيت الرسالة بالأعلى'}
                              >
                                <Pin size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1 hover:scale-110 transition cursor-pointer text-rose-300"
                                title="حذف الرسالة"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── INPUT / COMPOSER AREA ── */}
          <div className="p-3 bg-white border-t border-slate-200">

            {/* Replying Banner Preview */}
            {replyingTo && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl p-2 px-3 mb-2 text-xs font-bold text-emerald-900 animate-in fade-in">
                <div className="flex items-center gap-2 truncate">
                  <span>↩️ الرد على ({replyingTo.senderName}):</span>
                  <span className="text-slate-600 truncate max-w-xs">{replyingTo.text}</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-700">
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Attached Image Preview */}
            {attachedImage && (
              <div className="relative inline-block mb-2 rounded-xl overflow-hidden border border-emerald-300 shadow-sm">
                <img src={attachedImage} alt="معاينة المرفق" className="h-20 w-20 object-cover" />
                <button
                  onClick={() => setAttachedImage(null)}
                  className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-0.5 hover:bg-rose-700"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Lock Notice for Parents if locked */}
            {settings.isLocked && activeIdentity.role !== 'admin' ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-center text-xs font-black text-rose-800 flex items-center justify-center gap-2">
                <Lock size={16} />
                <span>الشات مغلق حالياً من قِبل المشرف د. إسماعيل عيسى. يمكنك متابعة التعاميم والإعلانات فقط.</span>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="space-y-2">

                {/* Admin options bar (Official announcement checkbox) */}
                {activeIdentity.role === 'admin' && (
                  <div className="flex items-center justify-between px-1">
                    <label className="flex items-center gap-2 text-xs font-black text-emerald-900 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isAnnouncementMode}
                        onChange={e => setIsAnnouncementMode(e.target.checked)}
                        className="accent-emerald-700 rounded w-4 h-4"
                      />
                      <span>إرسال كتعميم مميز ومثبت</span>
                    </label>

                    {settings.isLocked && (
                      <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        👑 ميزة المشرف: الإرسال متاح لك أثناء إغلاق الشات
                      </span>
                    )}
                  </div>
                )}

                {/* Text input + Buttons */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 focus-within:border-emerald-500 rounded-2xl p-2 px-3 shadow-xs">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 text-slate-500 hover:text-emerald-700 rounded-xl hover:bg-white transition cursor-pointer"
                    title="إرفاق صورة"
                  >
                    <ImageIcon size={18} />
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    placeholder={
                      activeIdentity.role === 'admin'
                        ? 'اكتب رسالة أو تعميماً لأولياء الأمور...'
                        : 'اكتب استفسارك أو مشاركتك في ملتقى الفصل...'
                    }
                    className="flex-1 bg-transparent text-xs sm:text-sm font-bold text-slate-900 focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
                  />

                  {/* Quick Emoji Bar */}
                  <div className="hidden sm:flex items-center gap-1">
                    {['🌹', '👏', '🤲', '📚'].map(em => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setInputText(prev => prev + em)}
                        className="p-1 text-sm hover:scale-125 transition cursor-pointer"
                      >
                        {em}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={!inputText.trim() && !attachedImage}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition shadow-sm cursor-pointer ${
                      inputText.trim() || attachedImage
                        ? 'bg-emerald-800 hover:bg-emerald-700 text-white active:scale-95'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Send size={14} />
                    <span>إرسال</span>
                  </button>
                </div>
              </form>
            )}

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />
          </div>

        </div>

        {/* ── PARENTS DIRECTORY / MEMBERS DRAWER (1 COL) ── */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-lg p-5 flex flex-col h-[650px] overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <Users size={16} className="text-emerald-700" />
              أولياء أمور الفصل ({parents.length})
            </h3>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" title="متصل الآن" />
          </div>

          {/* Admin Profile Box */}
          <div className="my-3 p-3 rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-800 text-white shadow-xs space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-sm">
                👑
              </div>
              <div>
                <p className="font-black text-xs text-amber-300">المشرف العام والمعلم المسؤول</p>
                <h4 className="font-black text-sm text-white">د. إسماعيل عيسى</h4>
              </div>
            </div>
            <p className="text-[10px] text-emerald-200 font-bold pt-1">
              تأسيس الصفوف الأولية، النطق والتخاطب، وصعوبات التعلم
            </p>
          </div>

          {/* Parents List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
              أولياء الأمور المسجلون:
            </p>
            {parents.map((p) => {
              const cleanPhone = (p.phone || '').replace(/\D/g, '');
              const waUrl = cleanPhone
                ? `https://wa.me/966${cleanPhone.replace(/^0/, '')}?text=${encodeURIComponent(`السلام عليكم أ. ${p.name}، من منصة مسار بخصوص الطالب (${p.studentName})`)}`
                : null;

              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/40 p-3 transition space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-900 flex items-center justify-center text-xs font-black">
                        {p.name[0]}
                      </div>
                      <div>
                        <h5 className="font-black text-xs text-slate-900">{p.name}</h5>
                        <p className="text-[10px] text-emerald-700 font-bold">
                          والد الطالب: {p.studentName}
                        </p>
                      </div>
                    </div>

                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl transition"
                        title="محادثة واتساب مباشرة"
                      >
                        <MessageCircle size={14} />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-200/60">
                    <span>{p.phone}</span>
                    <span className="text-emerald-600 font-bold">نشط بالملتقى ✓</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Broadcast WhatsApp to All Parents */}
          <div className="pt-3 border-t border-slate-100">
            <button
              onClick={() => {
                const text = encodeURIComponent(
                  '🏫 مدارس الإخلاص الأهلية بجدة\nالسلام عليكم ورحمة الله، تم نشر رسائل وتعاميم جديدة في ملتقى أولياء الأمور على منصة مسار، نرجو التكرم بالاطلاع.'
                );
                window.open(`https://wa.me/?text=${text}`, '_blank');
              }}
              className="w-full flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-900 py-2.5 rounded-xl text-xs font-black transition cursor-pointer"
            >
              <MessageCircle size={14} className="text-emerald-700" />
              <span>إرسال تنبيه واتساب جماعي للجميع 📱</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
