'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Users, Send, FileText, Video, Phone, MessageSquare,
  CheckCircle2, Sparkles, User, Search, Copy, ShieldCheck,
  Mail, ExternalLink, MessageCircle
} from 'lucide-react';
import { getClassParents, getClassStudents, ClassParentRecord,
  getStudentHomeworkLogs, getStudentNotes, getStudentCertificateLogs } from '@/lib/classDb';
import { saveMessage, saveReport, saveActivity } from '@/lib/cloudStore';
import { createNotification } from '@/lib/notifications';

export default function ClassroomParentsTab() {
  const [parents, setParents] = useState<ClassParentRecord[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [zoomUrlInput, setZoomUrlInput] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [reportLoading, setReportLoading] = useState(false);

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

    const students = getClassStudents();
    const linkedStudent = students.find(s => s.fullName === selectedParent.studentName);
    const sid = linkedStudent?.id || selectedParent.id;

    saveMessage({
      studentId: sid,
      from: 'doctor',
      to: 'parent',
      body: messageBody.trim(),
      read: false,
    });

    void createNotification({
      type: 'message',
      title: `رسالة وتوجيه جديد من د. إسماعيل عيسى`,
      body: messageBody.trim().slice(0, 100),
      link: `/school-parent?tab=community`,
    });

    setActionSuccess(`تم إرسال الرسالة إلى حساب ومنصة ولي الأمر (${selectedParent.name}) بنجاح ✨`);
    setMessageBody('');
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handleSendZoomLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoomUrlInput.trim() || !selectedParent) return;

    const students = getClassStudents();
    const linkedStudent = students.find(s => s.fullName === selectedParent.studentName);
    const sid = linkedStudent?.id || selectedParent.id;

    const zoomMsg = `📹 *رابط الجلسة المباشرة / Zoom*\nعزيزي ولي أمر الطالب *${selectedParent.studentName}* 👋\nيسر د. إسماعيل عيسى دعوتكم لحضور الجلسة التفاعلية المباشرة عبر الرابط التالي:\n🔗 ${zoomUrlInput.trim()}`;

    saveMessage({
      studentId: sid,
      from: 'doctor',
      to: 'parent',
      body: zoomMsg,
      read: false,
    });

    void createNotification({
      type: 'meeting',
      title: `📹 دعوة لجلسة تفاعلية مباشرة مع د. إسماعيل`,
      body: `اضغط للدخول إلى رابط الجلسة المباشرة لـ ${selectedParent.studentName}`,
      link: zoomUrlInput.trim(),
    });

    setActionSuccess(`تم إرسال رابط البث المباشر / الجلسة لـ (${selectedParent.name}) عبر المنصة بنجاح 📹`);
    setZoomUrlInput('');
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handleSendFullReport = async (channel: 'platform' | 'whatsapp' | 'both' = 'platform') => {
    if (!selectedParent) return;
    setReportLoading(true);
    // Find the linked student id from class students list
    const students = getClassStudents();
    const linkedStudent = students.find(s => s.fullName === selectedParent.studentName);
    const sid = linkedStudent?.id ?? selectedParent.id;
    const hwLogs = sid ? getStudentHomeworkLogs(sid) : [];
    const notes  = sid ? getStudentNotes(sid) : [];
    const certs  = sid ? getStudentCertificateLogs(sid) : [];

    const phone = selectedParent.phone.replace(/\D/g, '');
    const wap   = phone.startsWith('966') ? phone : '966' + phone.replace(/^0/, '');
    const day   = new Date().toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });

    let m = `*فصل د. إسماعيل عيسى — مسار التعليمي*\n`;
    m += `📋 *تقرير شامل للطالب: ${selectedParent.studentName}*\n`;
    m += `📅 *التاريخ:* ${day}\n`;
    m += `👨‍👩‍👦 *ولي الأمر:* ${selectedParent.name}\n\n`;

    if (hwLogs.length) {
      m += `📚 *الواجبات والمهام (${hwLogs.length}):*\n`;
      hwLogs.slice(0, 6).forEach(h => {
        const ic = h.status === 'submitted' ? '✅' : h.status === 'late' ? '⏰' : '❌';
        m += `${ic} ${h.title} — ${h.subject}${h.grade !== undefined ? ` (${h.grade}/10)` : ''}\n`;
      });
      m += '\n';
    } else { m += `📚 *الواجبات:* لا توجد سجلات واجبات متأخرة\n\n`; }

    if (notes.length) {
      m += `📝 *ملاحظات المعلم د. إسماعيل (${notes.length}):*\n`;
      notes.slice(0, 3).forEach(n => { m += `• ${n.text}\n`; });
      m += '\n';
    }

    if (certs.length) {
      m += `🏆 *الشهادات والإنجازات المعتمدة:*\n`;
      certs.forEach(c => { m += `🎖️ ${c.title} — ${c.completionDate}\n`; });
      m += '\n';
    }

    m += `🌟 نسعد دائماً بمتابعتكم ودعمكم لأبطالنا الصغار!\n_منصة مسار للتعليم الذكي_`;

    // 1. Send to Platform (In-app chat + notification + official report record)
    if (channel === 'platform' || channel === 'both') {
      saveMessage({
        studentId: sid,
        from: 'doctor',
        to: 'parent',
        body: m,
        read: false,
      });

      saveReport({
        studentId: sid,
        studentName: selectedParent.studentName,
        grade: linkedStudent?.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
        program: 'التقرير الشامل لفصل د. إسماعيل عيسى',
        programColor: 'bg-emerald-600',
        date: new Date().toISOString().slice(0, 10),
        score: 100,
        status: 'completed',
        type: 'clinical-analysis',
        summary: m,
        recommendations: notes.length ? notes.map(n => n.text) : ['الاستمرار في المتابعة وتشجيع الطالب.'],
        answers: [],
        domains: [
          { name: 'الواجبات والمهام', score: hwLogs.length ? 95 : 100, note: `${hwLogs.length} واجبات مسجلة` },
          { name: 'السلوك والمشاركة', score: 98, note: 'تفاعل إيجابي مستمر' },
          { name: 'الشهادات والإنجازات', score: certs.length ? 100 : 90, note: `${certs.length} شهادات تميز` },
        ],
      });

      await createNotification({
        type: 'report',
        title: `📋 تقرير شامل جديد للطالب: ${selectedParent.studentName}`,
        body: `تم إصدار التقرير الشامل من قِبَل د. إسماعيل عيسى، متاح الآن في حسابك.`,
        link: `/school-parent?tab=report`,
      });

      saveActivity({
        type: 'student',
        title: `📋 إرسال تقرير شامل للطالب ${selectedParent.studentName}`,
        detail: `تم إرسال التقرير الشامل مباشرة إلى منصة وحساب ولي الأمر.`,
      });
    }

    // 2. Send via WhatsApp
    if (channel === 'whatsapp' || channel === 'both') {
      window.open(`https://wa.me/${wap}?text=${encodeURIComponent(m)}`, '_blank');
    }

    setReportLoading(false);

    if (channel === 'platform') {
      setActionSuccess(`✅ تم إرسال التقرير الشامل بنجاح إلى منصة وحساب ولي الأمر (${selectedParent.name})! 📱`);
    } else if (channel === 'whatsapp') {
      setActionSuccess(`✅ تم فتح واتساب لإرسال التقرير الشامل للطالب ${selectedParent.studentName} 💬`);
    } else {
      setActionSuccess(`✅ تم إرسال التقرير الشامل للمنصة وفُتح واتساب بنجاح! 🚀`);
    }

    setTimeout(() => setActionSuccess(''), 5000);
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
                فصل د. إسماعيل عيسى
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

              {/* Full Student Report Sender */}
              <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <FileText size={18} className="text-emerald-600" />
                    إرسال تقرير شامل للطالب
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
                      واجبات + ملاحظات + شهادات
                    </span>
                  </h3>
                </div>

                <p className="text-xs font-bold text-slate-600 leading-relaxed">
                  يتم توليد تقرير شامل ومتكامل للطالب <strong>{selectedParent.studentName}</strong> من سجلات الفصل وإرساله مباشرة إلى <strong>منصة وحساب ولي الأمر</strong> أو عبر <strong>الواتساب</strong>.
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {/* Send to Parent Platform */}
                  <button
                    onClick={() => handleSendFullReport('platform')}
                    disabled={reportLoading}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-black text-white transition shadow-sm cursor-pointer disabled:opacity-60"
                    title="إرسال التقرير إلى حساب وبوابة ولي الأمر في المنصة مباشرة"
                  >
                    <Send size={14} />
                    <span>إرسال لمنصة ولي الأمر 📱</span>
                  </button>

                  {/* Send via WhatsApp */}
                  <button
                    onClick={() => handleSendFullReport('whatsapp')}
                    disabled={reportLoading}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-black text-white transition shadow-sm cursor-pointer disabled:opacity-60"
                    title="فتح وإرسال التقرير عبر الواتساب"
                  >
                    <MessageCircle size={15} />
                    <span>إرسال عبر واتساب 💬</span>
                  </button>

                  {/* Send to Both */}
                  <button
                    onClick={() => handleSendFullReport('both')}
                    disabled={reportLoading}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-black text-white transition shadow-sm cursor-pointer disabled:opacity-60"
                    title="إرسال التقرير للمنصة والواتساب معاً في نفس اللحظة"
                  >
                    <Sparkles size={14} className="text-amber-400" />
                    <span>إرسال للمنصة + واتساب معاً 🚀</span>
                  </button>
                </div>
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
