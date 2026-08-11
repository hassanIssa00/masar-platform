'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Bot, Send, Sparkles, X, Loader2, CheckCircle2, Trash2, ChevronDown } from 'lucide-react';
import { createIEP } from '@/lib/iep';
import { getStudents } from '@/lib/localDb';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  actionTaken?: string;
  timestamp: string;
  gateway?: string;
}

// ── Real Platform Actions (client-side DB) ────────────────────────────────────
// These actually touch localStorage / IEP DB — no fake responses
function tryExecutePlatformAction(prompt: string): { actionTaken?: string } | null {
  const p = prompt.toLowerCase();

  // IEP creation — needs a student
  if ((p.includes('خطة') || p.includes('iep')) && (p.includes('أنشئ') || p.includes('اعمل') || p.includes('ضيف') || p.includes('أضف'))) {
    try {
      const students = getStudents();
      const student = students[0];
      if (student) {
        createIEP({
          studentId: student.id,
          studentName: student.fullName,
          grade: student.grade || 'الصف الأول',
          schoolName: 'مدرسة الإخلاص الأهلية بجدة',
          doctorName: 'د. إسماعيل عيسى',
          startDate: new Date().toISOString().slice(0, 10),
          reviewDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
          strengths: 'الذاكرة البصرية، الاستجابة للتعزيز الفوري',
          challenges: 'صعوبات التعلم النمائية والأكاديمية',
          accommodations: ['وقت إضافي في الاختبارات', 'جلوس في المقدمة', 'تعليمات مبسطة'],
          goals: [{
            id: 'g1_' + Date.now(), domain: 'academic',
            objective: 'قراءة 20 كلمة بدقة 85% في نهاية الفصل.',
            targetDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
            progressNotes: '', status: 'in-progress', baselineScore: 40, currentScore: 40,
          }],
          status: 'active',
        });
        return { actionTaken: `تم إنشاء خطة IEP للطالب ${student.fullName} ✅` };
      } else {
        return { actionTaken: 'لا يوجد طلاب في النظام بعد — أضف طالباً أولاً من صفحة الطلاب' };
      }
    } catch (e) {
      console.error(e);
    }
  }

  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function MasarAIAgent({ branch = 'IKHLAS_JEDDAH' }: { branch?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      sender: 'agent',
      text: 'أهلاً يا د. إسماعيل! 👋\nأنا مساعدك — اسألني أي شيء أو اطلب مني أنفذ حاجة في المنصة مباشرةً.',
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen]);

  const sendMessage = useCallback(async (textToSend?: string) => {
    const inputPrompt = (textToSend || prompt).trim();
    if (!inputPrompt || loading) return;

    const userMsg: Message = {
      id: 'u-' + Date.now(),
      sender: 'user',
      text: inputPrompt,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setPrompt('');
    setLoading(true);

    // Try real platform action first
    const platformAction = tryExecutePlatformAction(inputPrompt);

    const history = messages
      .filter(m => m.id !== 'init')
      .slice(-10)
      .map(m => ({ sender: m.sender, text: m.text }));

    let replyText = '';
    let gateway = '';
    let actionTaken = platformAction?.actionTaken;

    try {
      const res = await fetch('/api/ai/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: inputPrompt, branch, history }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.reply) {
          replyText = data.reply;
          gateway = data.gateway || '';
          if (data.actionTaken && !actionTaken) actionTaken = data.actionTaken;
        }
      }
    } catch { /* network error — use local fallback */ }

    // If API completely failed, use a simple honest reply
    if (!replyText) {
      replyText = 'فيه مشكلة في الاتصال دلوقتي. جرب تاني بعد ثانية.';
      gateway = 'offline';
    }

    setMessages(prev => [...prev, {
      id: 'a-' + Date.now(),
      sender: 'agent',
      text: replyText,
      actionTaken,
      gateway,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    }]);

    setLoading(false);
  }, [prompt, loading, messages, branch]);

  const clearChat = () => {
    setMessages([{
      id: 'init-' + Date.now(),
      sender: 'agent',
      text: 'تم مسح المحادثة. تؤمر؟ 😊',
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    }]);
  };

  const quickPrompts = [
    'كم طالب عندي في النظام؟',
    'اعمل خطة IEP لأول طالب',
    'نصيحة للتعامل مع فرط الحركة',
    'ما هي أحدث طرق تعليم القراءة؟',
    'ابدأ حصة مباشرة',
  ];

  return (
    <div className="fixed bottom-6 left-6 z-50 font-sans" dir="rtl">

      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 bg-gradient-to-br from-teal-600 to-slate-900 hover:from-teal-500 hover:to-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-2xl hover:shadow-teal-500/25 hover:scale-105 transition-all duration-200 border border-teal-400/20"
        >
          <div className="relative shrink-0">
            <Bot className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
          </div>
          <div className="text-right">
            <p className="text-sm font-black leading-tight flex items-center gap-1.5">
              مساعد مسار <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </p>
            <p className="text-[11px] text-teal-200 opacity-90">اسألني أي شيء</p>
          </div>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="w-[400px] sm:w-[440px] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[580px]">

          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 to-teal-900 px-4 py-3.5 text-white flex items-center justify-between border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-teal-300" />
              </div>
              <div>
                <h3 className="text-sm font-black flex items-center gap-2">
                  مساعد مسار
                  <span className="text-[10px] bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 px-2 py-0.5 rounded-full">
                    ● نشط
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">د. إسماعيل عيسى · AI Agent</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition"
                title="مسح المحادثة"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Prompts */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex gap-2 overflow-x-auto scrollbar-none">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(qp)}
                disabled={loading}
                className="text-[11px] bg-white border border-slate-200 hover:border-teal-400 hover:bg-teal-50 text-slate-700 font-bold px-3 py-1.5 rounded-full whitespace-nowrap transition shrink-0 shadow-sm disabled:opacity-50"
              >
                {qp}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40">
            {messages.map(m => (
              <div key={m.id} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[88%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                  m.sender === 'user'
                    ? 'bg-teal-700 text-white rounded-br-sm font-medium'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm'
                }`}>
                  <p className="whitespace-pre-wrap font-medium">{m.text}</p>

                  {m.actionTaken && (
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {m.actionTaken}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {loading && (
              <div className="flex items-start">
                <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2 text-[13px] text-slate-500 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                  <span className="font-medium">بفكر...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-200">
            <form
              onSubmit={e => { e.preventDefault(); sendMessage(); }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="اسأل أي شيء أو اطلب تنفيذ أمر..."
                disabled={loading}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500 focus:bg-white transition-all font-medium"
              />
              <button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="w-11 h-11 rounded-2xl bg-teal-700 hover:bg-teal-600 text-white flex items-center justify-center transition-all disabled:opacity-40 shrink-0 shadow-sm"
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
