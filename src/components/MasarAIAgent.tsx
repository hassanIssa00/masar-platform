'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Bot, Send, Sparkles, X, Loader2, CheckCircle2,
  Video, BookOpen, Users, Bell, BarChart3, Settings,
  Zap, ChevronUp, ChevronDown, PlayCircle, MessageSquare
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  actionTaken?: string;
  timestamp: string;
  gateway?: string;
  result?: any;
}

export default function MasarAIAgent({ branch = 'IKHLAS_JEDDAH' }: { branch?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'agent',
      text: 'مرحباً بك! أنا "مساعد مسار الذكي" 🤖. لدي صلاحية كاملة للتحكم في المنصة وتنفيذ الأوامر بالذكاء الاصطناعي (عبر MSEMAX / OpenAI Gateway). كيف يمكنني مساعدتك اليوم؟',
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  /* ⚙️ Custom MSEMAX Gateway Settings */
  const [showSettings, setShowSettings] = useState(false);
  const [msemaxUrl, setMsemaxUrl] = useState('http://localhost:8000/v1');
  const [msemaxKey, setMsemaxKey] = useState('mse-max-key');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendPrompt = async (textToSend?: string) => {
    const inputPrompt = textToSend || prompt;
    if (!inputPrompt.trim() || loading) return;

    const userMsg: Message = {
      id: 'u-' + Date.now(),
      sender: 'user',
      text: inputPrompt,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setPrompt('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/ai/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: inputPrompt,
          branch,
          baseUrl: msemaxUrl,
          apiKey: msemaxKey,
        }),
      });

      if (!res.ok) throw new Error('فشل الاتصال بسيرفر الذكاء الاصطناعي');

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

      setMessages((prev) => [...prev, agentMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          sender: 'agent',
          text: `⚠️ حدث خطأ في معالجة الأمر: ${err.message || 'يرجى التأكد من تشغيل API Gateway'}`,
          timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickCommands = [
    { label: '📝 أنشئ واجب رياضي غداً', prompt: 'قم بإنشاء واجب تفاعلي جديد في مادة الرياضيات وتسليمه غداً' },
    { label: '📸 حضّر جميع الطلاب اليوم', prompt: 'قم بتسجيل جميع الطلاب حاضرين اليوم وتحديث كشف الحضور' },
    { label: '📹 أنشئ غرفة لايف مسار', prompt: 'قم بجدولة اجتماع حصة تفاعلية مباشرة الآن عبر نظام مسار WebRTC' },
    { label: '📢 انشر إعلان هام للآباء', prompt: 'قم بنشر إعلان رسمي هام في مجتمع أولياء الأمور عن مستجدات الفصل' },
    { label: '📊 أرسل التقرير الأسبوعي', prompt: 'قم بتوليد وإرسال التقرير الأسبوعي الشامل لجميع أولياء الأمور' },
  ];

  return (
    <div className="fixed bottom-6 left-6 z-50 font-sans" dir="rtl">
      {/* 🔴 Floating Launcher Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white px-5 py-3.5 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-emerald-400/40"
        >
          <div className="relative">
            <Bot className="w-6 h-6 animate-bounce" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
          </div>
          <div className="text-right">
            <p className="text-xs font-black leading-tight flex items-center gap-1">
              مساعد مسار الذكي <Sparkles className="w-3 h-3 text-amber-300 inline" />
            </p>
            <p className="text-[10px] text-emerald-100 opacity-90">تحكم كامل بالمنصة بالذكاء الاصطناعي</p>
          </div>
        </button>
      )}

      {/* 🟢 Drawer Container */}
      {isOpen && (
        <div className="w-[380px] sm:w-[420px] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[580px] transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-4 text-white flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
                <Bot className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-black flex items-center gap-1.5">
                  مساعد مسار الذكي (MSEMAX Engine)
                  <span className="text-[9px] bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    نشط ●
                  </span>
                </h3>
                <p className="text-[10px] text-slate-300">منظومة تحكم ذاتية تنفّذ الأوامر مباشرة</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors"
                title="إعدادات الـ Gateway (MSEMAX)"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ⚙️ Gateway Settings Modal Drawer */}
          {showSettings && (
            <div className="bg-slate-900 text-slate-200 p-4 border-b border-slate-700 text-xs space-y-3 animate-in fade-in duration-200">
              <p className="font-black text-amber-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4" /> إعدادات ربط MSEMAX / OpenAI API Gateway
              </p>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">رابط الـ API Gateway (Base URL):</label>
                <input
                  value={msemaxUrl}
                  onChange={(e) => setMsemaxUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500 transition"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">مفتاح API Key:</label>
                <input
                  value={msemaxKey}
                  onChange={(e) => setMsemaxKey(e.target.value)}
                  type="password"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500 transition"
                  dir="ltr"
                />
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded-xl text-xs transition-colors"
              >
                حفظ الإعدادات
              </button>
            </div>
          )}

          {/* Quick Command Shortcuts Bar */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 overflow-x-auto flex gap-1.5 scrollbar-none">
            {quickCommands.map((cmd, idx) => (
              <button
                key={idx}
                onClick={() => handleSendPrompt(cmd.prompt)}
                disabled={loading}
                className="text-[11px] bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-slate-700 px-2.5 py-1 rounded-full whitespace-nowrap font-bold transition-all shrink-0 flex items-center gap-1 shadow-2xs"
              >
                {cmd.label}
              </button>
            ))}
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                  }`}
                >
                  <p className="font-medium whitespace-pre-wrap">{m.text}</p>

                  {/* Executed Action Badge */}
                  {m.actionTaken && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold bg-emerald-50/80 p-2 rounded-xl border border-emerald-200/60">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>تم التنفيذ تلقائياً: <strong>{m.actionTaken}</strong></span>
                    </div>
                  )}

                  {/* Gateway Source Tag */}
                  {m.gateway && (
                    <p className="text-[9px] opacity-60 mt-1 text-left" dir="ltr">
                      via {m.gateway}
                    </p>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 p-3 rounded-2xl text-xs text-slate-600 w-fit animate-pulse shadow-2xs">
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                <span>جارٍ معالجة وتدقيق الأمر عبر الذكاء الاصطناعي...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Footer Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200 space-y-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt();
              }}
              className="flex items-center gap-2"
            >
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="اكتب أمراً هنا (مثال: أنشئ واجب تفاعلي غداً)..."
                disabled={loading}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="w-10 h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-all disabled:opacity-50 shrink-0 shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
