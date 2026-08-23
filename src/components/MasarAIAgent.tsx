'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Bot, Loader2, Send, Trash2, X } from 'lucide-react';

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
  timestamp: string;
  gateway?: string;
  actions?: AiAction[];
};

function authJsonHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}

function timeLabel() {
  return new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}

export default function MasarAIAgent({ branch = 'IKHLAS_JEDDAH' }: { branch?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'agent',
      text: 'أهلاً د. إسماعيل. اكتب طلبك مباشرة أو اطلب فتح قسم معين، وسأرد أو أجهز لك الإجراء المناسب.',
      timestamp: timeLabel(),
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const scrollTimer = setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 120);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(focusTimer);
    };
  }, [messages, isOpen]);

  const runAction = useCallback((action: AiAction) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('masar_action_executed', { detail: action }));
    if (action.target) window.location.href = action.target;
  }, []);

  const sendMessage = useCallback(async (textToSend?: string) => {
    const inputPrompt = (textToSend || prompt).trim();
    if (!inputPrompt || loading) return;

    const userMsg: Message = {
      id: 'u-' + Date.now(),
      sender: 'user',
      text: inputPrompt,
      timestamp: timeLabel(),
    };

    const history = messages
      .filter((m) => m.id !== 'init')
      .slice(-10)
      .map((m) => ({ sender: m.sender, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setPrompt('');
    setLoading(true);

    let assistant: Message = {
      id: 'a-' + Date.now(),
      sender: 'agent',
      text: 'تعذر تنفيذ الطلب الآن. جرب صياغة الطلب مرة أخرى، أو افتح القسم المناسب من القائمة وأكمل الإجراء يدوياً.',
      timestamp: timeLabel(),
      gateway: '',
    };

    try {
      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: authJsonHeaders(),
        credentials: 'include',
        body: JSON.stringify({ prompt: inputPrompt, branch, history }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        assistant = {
          id: 'a-' + Date.now(),
          sender: 'agent',
          text: data.reply || 'تم استلام الطلب، لكن لم يصل رد واضح. اكتب التفاصيل الناقصة وسأحاول مرة أخرى.',
          actions: Array.isArray(data.actions) ? data.actions : [],
          gateway: data.gateway,
          timestamp: timeLabel(),
        };
      } else if (data?.error) {
        assistant.text = String(data.error);
      }
    } catch {
      // Keep the honest offline message above.
    }

    setMessages((prev) => [...prev, assistant]);
    setLoading(false);
  }, [branch, loading, messages, prompt]);

  const clearChat = () => {
    setMessages([{
      id: 'init-' + Date.now(),
      sender: 'agent',
      text: 'تم مسح المحادثة. اكتب طلبك التالي بوضوح وسأتعامل معه مباشرة.',
      timestamp: timeLabel(),
    }]);
  };

  const quickPrompts = [
    'افتح إدارة الطلاب',
    'جهز مسودة خطة IEP لطالب يحتاج دعم قراءة',
    'اكتب رسالة متابعة قصيرة لولي الأمر',
    'حلل أول تقرير يحتاج مراجعة',
  ];

  return (
    <div className="fixed bottom-6 left-6 z-50 font-sans" dir="rtl">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 rounded-2xl border border-teal-200 bg-white px-5 py-3.5 text-slate-950 shadow-xl shadow-slate-900/10 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-2xl"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-600 text-white">
            <Bot className="h-5 w-5" />
          </span>
          <span className="text-right">
            <span className="block text-sm font-black leading-tight">مساعد مسار</span>
            <span className="block text-[11px] font-bold text-slate-500">أوامر وتنفيذ داخل المنصة</span>
          </span>
        </button>
      )}

      {isOpen && (
        <div className="flex h-[580px] w-[min(440px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-600 text-white">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-950">مساعد مسار التنفيذي</h3>
                <p className="text-[11px] font-bold text-slate-500">متصل بواجهات المنصة والصور</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-rose-600"
                title="مسح المحادثة"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                title="إغلاق"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-slate-50 px-3 py-2">
            {quickPrompts.map((item) => (
              <button
                key={item}
                onClick={() => sendMessage(item)}
                disabled={loading}
                className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 disabled:opacity-50"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/50 p-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[88%] rounded-3xl border px-4 py-3 text-sm font-bold leading-7 shadow-sm ${
                  m.sender === 'user'
                    ? 'rounded-br-md border-teal-600 bg-teal-600 text-white'
                    : 'rounded-bl-md border-slate-200 bg-white text-slate-800'
                }`}>
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {!!m.actions?.length && (
                    <div className="mt-3 grid gap-2 border-t border-slate-100 pt-3">
                      {m.actions.map((action, index) => (
                        <button
                          key={`${action.type}-${index}`}
                          onClick={() => runAction(action)}
                          className="flex items-center justify-between gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-black text-teal-800 transition hover:bg-teal-100"
                        >
                          <span>{action.label}</span>
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <span className="mt-1 px-2 text-[10px] font-bold text-slate-400">{m.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-start">
                <div className="flex items-center gap-2 rounded-3xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-500 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
                  جاري معالجة الطلب...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
            className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
          >
            <input
              ref={inputRef}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="اكتب أمراً أو سؤالاً..."
              disabled={loading}
              className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-600 text-white transition hover:bg-teal-700 disabled:opacity-40"
              title="إرسال"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
