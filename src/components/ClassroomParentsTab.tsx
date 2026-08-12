'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Users, Send, FileText, Video, Phone, MessageSquare,
  CheckCircle2, Sparkles, User, Search, Copy, ShieldCheck,
  Mail, ExternalLink, MessageCircle
} from 'lucide-react';
import { getClassParents, getClassStudents, ClassParentRecord } from '@/lib/classDb';

export default function ClassroomParentsTab() {
  const [parents, setParents] = useState<ClassParentRecord[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [zoomUrlInput, setZoomUrlInput] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  const refresh = () => {
    const list = getClassParents();
    setParents(list);
    if (list.length > 0 && !selectedParentId) {
      setSelectedParentId(list[0].id);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const filteredParents = useMemo(() => {
    if (!searchQuery.trim()) return parents;
    const q = searchQuery.toLowerCase();
    return parents.filter(
      (p) => p.name.toLowerCase().includes(q) || p.studentName.toLowerCase().includes(q) || p.phone.includes(q),
    );
  }, [parents, searchQuery]);

  const selectedParent = parents.find((p) => p.id === selectedParentId) ?? parents[0] ?? null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageBody.trim() || !selectedParent) return;
    setActionSuccess(`تم إرسال الرسالة إلى ولي الأمر (${selectedParent.name}) بنجاح ✨`);
    setMessageBody('');
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handleSendZoomLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoomUrlInput.trim() || !selectedParent) return;
    setActionSuccess(`تم إرسال رابط البث المباشر / الجلسة لـ (${selectedParent.name}) بنجاح 📹`);
    setZoomUrlInput('');
    setTimeout(() => setActionSuccess(''), 4000);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              إدارة أولياء أمور الفصل
              <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-black text-indigo-800">
                فصل الإخلاص بجدة
              </span>
            </h1>
            <p className="text-xs font-bold text-slate-500 mt-1">
              متابعة حسابات أولياء الأمور المرتبطة بطلاب الفصل · التواصل المباشر · إرسال التقارير وروابط الجلسات
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-black text-emerald-900 flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-600 shrink-0" />
          {actionSuccess}
        </div>
      )}

      {/* Main Grid: Left Parents List / Right Control Dashboard */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Parents List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="بحث باسم ولي الأمر أو الطفل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none"
              />
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            </div>

            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-0.5 scrollbar-thin">
              {filteredParents.map((p) => {
                const active = p.id === selectedParentId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedParentId(p.id)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                      active
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-10 w-10 place-items-center rounded-xl font-black text-sm ${
                            active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900">{p.name}</h3>
                          <p className="text-[11px] font-bold text-slate-500">طالب الفصل: {p.studentName}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        {p.phone}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredParents.length === 0 && (
                <div className="p-8 text-center text-xs font-bold text-slate-400">
                  لا يوجد أولياء أمور مطابقون للبحث
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Parent Control Panel */}
        <div className="lg:col-span-8 space-y-6">
          {selectedParent ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              {/* Selected Parent Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white font-black text-xl shadow-lg shadow-indigo-600/20">
                    {selectedParent.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      {selectedParent.name}
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
                        <CheckCircle2 size={12} /> حساب موثق بالفصل
                      </span>
                    </h2>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      مرتبط بالطفل: <span className="text-indigo-950 font-black">{selectedParent.studentName}</span>
                    </p>
                  </div>
                </div>

                {/* Direct WhatsApp Action Link */}
                <a
                  href={`https://wa.me/966${selectedParent.phone.replace(/^0/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700 transition shadow-sm"
                >
                  <MessageCircle size={16} />
                  تواصل عبر الواتساب
                </a>
              </div>

              {/* Account Credentials Summary Grid */}
              <div className="grid gap-4 sm:grid-cols-2 text-xs">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <span className="text-slate-400 font-bold block">رقم الجوال المسجل:</span>
                  <div className="flex items-center justify-between font-mono font-black text-slate-900 text-sm">
                    <span>{selectedParent.phone}</span>
                    <button
                      onClick={() => copyToClipboard(selectedParent.phone, 'phone')}
                      className="text-indigo-600 text-xs font-sans hover:underline flex items-center gap-1"
                    >
                      <Copy size={13} />
                      {copiedKey === 'phone' ? 'تم النسخ' : 'نسخ'}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  <span className="text-slate-400 font-bold block">البريد الإلكتروني للرمز:</span>
                  <div className="flex items-center justify-between font-mono font-black text-slate-900 text-xs">
                    <span className="truncate max-w-[180px]">{selectedParent.email}</span>
                    <button
                      onClick={() => copyToClipboard(selectedParent.email, 'email')}
                      className="text-indigo-600 text-xs font-sans hover:underline flex items-center gap-1"
                    >
                      <Copy size={13} />
                      {copiedKey === 'email' ? 'تم النسخ' : 'نسخ'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Direct Communication Panel */}
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Send size={18} className="text-indigo-600" />
                  إرسال رسالة مباشرة لولي الأمر بالفصل
                </h3>

                <form onSubmit={handleSendMessage} className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder="اكتب التوجيه أو الرسالة التي ستظهر في حساب ولي الأمر مباشرة..."
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-700 px-5 py-2.5 text-xs font-black text-white hover:bg-indigo-800 transition shadow-sm"
                  >
                    إرسال التوجيه الآن
                  </button>
                </form>
              </div>

              {/* Send Zoom/Live Session Link Panel */}
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Video size={18} className="text-purple-600" />
                  إرسال رابط الجلسة المباشرة / Zoom لولي الأمر
                </h3>

                <form onSubmit={handleSendZoomLink} className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://zoom.us/j/1234567890"
                    value={zoomUrlInput}
                    onChange={(e) => setZoomUrlInput(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-purple-700 px-5 py-2.5 text-xs font-black text-white hover:bg-purple-800 transition shadow-sm shrink-0"
                  >
                    مشاركة رابط الجلسة
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400 font-bold">
              اختر ولي أمر من القائمة لعرض بياناته والتواصل معه
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
