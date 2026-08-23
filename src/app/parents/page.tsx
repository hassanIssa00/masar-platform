'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users, Send, FileText, Video, Phone, MessageSquare,
  CheckCircle2, Sparkles, User, Search, Copy, Shield,
  Mail, ExternalLink, MessageCircle
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  getAccounts, getMessages, getReports, getSession, getStudents, hydrateSessionFromServer,
  MessageRecord, ReportRecord, saveMessage, StudentRecord, AccountRecord
} from '@/lib/localDb';
import { pullCloudDataToLocal, subscribeToCloudUpdates } from '@/lib/firestoreSync';

const PARENTS_SYNC_KEYS = ['accounts', 'students', 'reports', 'messages'] as const;

export default function ParentsManagementPage() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [zoomUrlInput, setZoomUrlInput] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [messages, setMessages] = useState<MessageRecord[]>([]);

  // Auth Guard & Data Loading: Only Doctor/Admin can access
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const session = getSession() ?? await hydrateSessionFromServer();
      if (cancelled) return;
      if (!session) {
        router.replace('/login');
        return;
      }
      if (session?.role === 'parent' || session?.role === 'student') {
        router.push('/parent');
        return;
      }

      const allStudents = getStudents();
      const allAccounts = getAccounts();
      const allReports = getReports();
      const allMessages = getMessages();

      setStudents(allStudents);
      setAccounts(allAccounts);
      setReports(allReports);
      setMessages(allMessages);
      if (allStudents.length > 0) {
        setSelectedStudentId((current) => current || allStudents[0].id);
      }
    };

    void load();
    pullCloudDataToLocal([...PARENTS_SYNC_KEYS]).then(() => {
      if (!cancelled) void load();
    }).catch(() => {});
    const unsubscribe = subscribeToCloudUpdates(() => void load(), [...PARENTS_SYNC_KEYS]);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId) ?? students[0] ?? null;

  // Find linked parent account for selected student
  const linkedParentAccount = useMemo(() => {
    if (!selectedStudent) return null;
    let found = selectedStudent.parentPhone
      ? accounts.find((a) => a.phone && selectedStudent.parentPhone && a.phone.includes(selectedStudent.parentPhone.replace(/^\+\d{2,3}/, '').replace(/^0/, '')))
      : null;

    if (!found && selectedStudent.parentName) {
      const parentNameClean = selectedStudent.parentName.trim().toLowerCase();
      found = accounts.find((a) => a.name.trim().toLowerCase() === parentNameClean);
    }

    return found ?? accounts.filter((a) => a.role === 'parent')[0] ?? null;
  }, [selectedStudent, accounts]);

  // Find all student reports (up to 3 types: survey answers, student test, clinical analysis)
  const studentReports = useMemo(() => {
    if (!selectedStudent) return [];
    return reports.filter((r) => r.studentId === selectedStudent.id || r.studentName === selectedStudent.fullName);
  }, [reports, selectedStudent]);

  // Reset selections when student changes
  useEffect(() => {
    setSelectedReportIds(new Set());
  }, [selectedStudentId]);

  const toggleReportId = (id: string) => {
    setSelectedReportIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedReportsToSend = studentReports.filter((r) => selectedReportIds.has(r.id));

  // Find active chat thread for selected student
  const chatThread = useMemo(() => {
    if (!selectedStudent) return [];
    return messages
      .filter((m) => m.studentId === selectedStudent.id || m.studentId === 'student_assessment')
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, selectedStudent]);

  // Search filter
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.trim().toLowerCase();
    return students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        (s.parentName && s.parentName.toLowerCase().includes(q)) ||
        (s.parentPhone && s.parentPhone.includes(q))
    );
  }, [students, searchQuery]);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(''), 4000);
  };

  // Actions
  const sendDirectMessage = () => {
    if (!messageBody.trim() || !selectedStudent) return;
    const newMsg = saveMessage({
      studentId: selectedStudent.id,
      from: 'doctor',
      to: 'parent',
      body: messageBody.trim(),
      read: false,
    });
    setMessageBody('');
    setMessages(getMessages());
    showNotification(`تم إرسال الرسالة بنجاح لولي أمر ${selectedStudent.fullName} ✅`);
  };

  const sendReportNotification = () => {
    if (!selectedStudent || selectedReportsToSend.length === 0) return;
    selectedReportsToSend.forEach((report) => {
      const reportTitle = report.program || 'التقرير التشخيصي المعالج';
      const text = `📋 تم إرسال وتحديد التقرير الرسمي (${reportTitle}) للطالب (${selectedStudent.fullName}). يمكنك الاستطلاع عليه وعلى التوصيات في بوابتك الآن.`;
      saveMessage({
        studentId: selectedStudent.id,
        from: 'doctor',
        to: 'parent',
        body: text,
        read: false,
      });
    });
    setMessages(getMessages());
    const titles = selectedReportsToSend.map((r) => r.program).join('، ');
    showNotification(`تم إرسال (${titles}) إلى بوابة ولي أمر ${selectedStudent.fullName} بنجاح 📄✅`);
    setSelectedReportIds(new Set());
  };

  const sendZoomInvite = () => {
    if (!selectedStudent) return;
    const url = zoomUrlInput.trim() || 'https://zoom.us/j/99988877766';
    const text = `📹 يسعدنا دعوة ولي أمر الطالب (${selectedStudent.fullName}) للحضور في جلسة Zoom المباشرة عبر الرابط التالي:\n${url}`;
    saveMessage({
      studentId: selectedStudent.id,
      from: 'doctor',
      to: 'parent',
      body: text,
      read: false,
    });
    setZoomUrlInput('');
    setMessages(getMessages());
    showNotification(`تم إرسال رابط اجتماع Zoom لولي أمر ${selectedStudent.fullName} بنجاح 📹✅`);
  };

  const parentPhoneClean = selectedStudent?.parentPhone?.replace(/\D/g, '') || '';
  const whatsappUrl = parentPhoneClean ? `https://wa.me/${parentPhoneClean}` : '';

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 space-y-6">

          {/* Header */}
          <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black text-teal-700 uppercase tracking-widest">إدارة وإرسال البيانات لأولياء الأمور</p>
                <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-950">تواصل أسر وأولياء الأمور</h1>
                <p className="mt-1.5 max-w-2xl text-xs sm:text-sm font-bold text-slate-500">
                  لوحة تحكم الاستشاري لإرسال التقارير، والرسائل التشخيصية، ومواعيد اجتماعات Zoom مباشرة لحسابات أولياء الأمور.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-black text-teal-800 self-start">
                <Shield size={16} className="text-teal-600" />
                <span>مركز الإرسال والتواصل (د. إسماعيل)</span>
              </span>
            </div>
          </header>

          {actionSuccess && (
            <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4 text-xs font-black text-teal-900 flex items-center gap-2 shadow-sm animate-fadeIn">
              <CheckCircle2 size={18} className="text-teal-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {students.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
              <Users className="mx-auto text-slate-400" size={48} />
              <h2 className="mt-4 text-2xl font-black text-slate-950">لا يوجد طلاب مسجلون حالياً</h2>
              <p className="mt-2 text-sm font-bold text-slate-500">عند تسجيل طلاب جدد، ستظهر أسرهم وأولياء أمورهم هنا للتواصل وإرسال التقارير.</p>
            </section>
          ) : (
            <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">

              {/* Sidebar List of Students / Parents */}
              <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-24 xl:self-start space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black text-slate-950">قائمة الأسر والطلاب ({students.length})</h2>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search size={16} className="absolute right-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث باسم الطالب أو ولي الأمر أو الهاتف..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pr-9 pl-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600"
                  />
                </div>

                <div className="grid gap-2 max-h-[500px] overflow-y-auto pr-1">
                  {filteredStudents.map((s) => {
                    const isSelected = selectedStudent?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStudentId(s.id)}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-right transition cursor-pointer ${
                          isSelected
                            ? 'border-teal-600 bg-teal-50/90 shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-100 text-teal-800 font-black text-sm">
                          {s.fullName.slice(0, 1)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-black text-slate-950 text-xs sm:text-sm">{s.fullName}</p>
                          <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">
                            👨‍👦 ولي الأمر: {s.parentName || 'غير مسجل'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </aside>

              {/* Main Panel: Selected Parent & Dispatch Center */}
              {selectedStudent && (
                <div className="space-y-6">

                  {/* Parent Profile Card */}
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-600 text-white font-black text-lg shadow-sm">
                          <User size={24} />
                        </span>
                        <div>
                          <p className="text-xs font-black text-teal-700">بيانات حساب ولي الأمر المرتبط</p>
                          <h2 className="text-xl font-black text-slate-950">
                            {selectedStudent.parentName || linkedParentAccount?.name || 'ولي أمر الطالب'}
                          </h2>
                          <p className="text-xs font-bold text-slate-500 mt-0.5">
                            الطفل التابع: <span className="font-black text-slate-800">{selectedStudent.fullName}</span> ({selectedStudent.grade})
                          </p>
                        </div>
                      </div>

                      {/* Direct External Call / WhatsApp buttons */}
                      <div className="flex items-center gap-2">
                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
                          >
                            <MessageCircle size={15} className="text-emerald-600" />
                            <span>واتساب</span>
                          </a>
                        )}
                        {selectedStudent.parentPhone && (
                          <a
                            href={`tel:${selectedStudent.parentPhone}`}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3.5 py-2 text-xs font-black text-blue-800 hover:bg-blue-100 transition shadow-2xs"
                          >
                            <Phone size={15} className="text-blue-600" />
                            <span>اتصال</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Recorded Account Details Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        <p className="text-[10px] font-black text-slate-400">الإيميل المسجل</p>
                        <p className="mt-0.5 text-xs font-black text-slate-900 break-all">
                          {linkedParentAccount?.email || 'غير مسجل'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        <p className="text-[10px] font-black text-slate-400">كلمة المرور</p>
                        <p className="mt-0.5 text-xs font-black text-teal-800">
                          محفوظة بشكل مشفر على السيرفر
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        <p className="text-[10px] font-black text-slate-400">رقم الهاتف</p>
                        <p className="mt-0.5 text-xs font-black text-slate-900">
                          {selectedStudent.parentPhone || linkedParentAccount?.phone || 'غير مسجل'}
                        </p>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        <p className="text-[10px] font-black text-slate-400">حالة ملف الطالب</p>
                        <p className="mt-0.5 text-xs font-black text-teal-700">
                          {selectedStudent.assignedProgram ? 'تم اعتماد المسار' : 'قيد المراجعة والتقييم'}
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* Dispatch Tools: Reports, Messages, Zoom */}
                  <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                    
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-lg font-black text-slate-950 flex items-center gap-2">
                        <Sparkles size={20} className="text-teal-600" />
                        <span>أدوات إرسال البيانات المباشرة لحساب ولي الأمر</span>
                      </h3>
                      <p className="text-xs font-bold text-slate-500 mt-1">
                        أي بيان ترقيه هنا يرسل فوراً إلى حساب ولي الأمر ليظهر له عند تسجيل دخوله في بوابته (`/parent`).
                      </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">

                      {/* Tool 1: Dispatch Selected Report */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-teal-800">
                            <FileText size={20} />
                            <h4 className="font-black text-sm">حدد التقرير المطلوب إرساله لولي الأمر</h4>
                          </div>

                          {studentReports.length > 0 ? (
                            <div className="space-y-2">
                              <label className="block text-[11px] font-black text-slate-500">
                                اختر التقارير التي تريد إرسالها لولي الأمر ({studentReports.length} متاح):
                              </label>
                              <div className="grid gap-2">
                                {studentReports.map((r) => {
                                  const checked = selectedReportIds.has(r.id);
                                  return (
                                    <label
                                      key={r.id}
                                      className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition select-none ${
                                        checked
                                          ? 'border-teal-500 bg-teal-50 shadow-xs'
                                          : 'border-slate-200 bg-white hover:bg-slate-50'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleReportId(r.id)}
                                        className="mt-0.5 h-4 w-4 accent-teal-600 shrink-0 cursor-pointer"
                                      />
                                      <div className="min-w-0">
                                        <p className={`text-[11px] font-black truncate ${ checked ? 'text-teal-900' : 'text-slate-800' }`}>
                                          📄 {r.program}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                                          {r.date} — نتيجة {r.score}%
                                        </p>
                                      </div>
                                      {checked && (
                                        <span className="mr-auto shrink-0 rounded-full bg-teal-600 px-2 py-0.5 text-[9px] font-black text-white">
                                          محدد ✓
                                        </span>
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                              {selectedReportsToSend.length > 0 && (
                                <p className="text-[10px] font-black text-teal-700 bg-teal-50 rounded-xl border border-teal-200 px-3 py-2">
                                  ✅ سيتم إرسال {selectedReportsToSend.length} تقرير/تقارير دفعة واحدة
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs font-bold text-slate-500 leading-relaxed bg-white p-3 rounded-xl border border-slate-200">
                              لا توجد تقارير منشأة لهذا الطالب بعد. أكمل الاستبيان أو الاختبار لتوليد التقارير الثلاثة.
                            </p>
                          )}
                        </div>

                        <button
                          onClick={sendReportNotification}
                          disabled={selectedReportsToSend.length === 0}
                          className="w-full rounded-xl bg-teal-600 py-3 text-xs font-black text-white hover:bg-teal-700 transition disabled:opacity-50 shadow-sm cursor-pointer"
                        >
                          إرسال التقارير المحددة ({selectedReportsToSend.length}) إلى بوابة ولي الأمر 📤
                        </button>
                      </div>

                      {/* Tool 2: Dispatch Zoom Invite */}
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-3 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-blue-800">
                            <Video size={20} />
                            <h4 className="font-black text-sm">إرسال رابط اجتماع Zoom</h4>
                          </div>
                          <p className="text-xs font-bold text-slate-500">أنشئ اجتماع Zoom جديد وأرسل الدعوة المباشرة لولي الأمر لينضم بضغطة واحدة.</p>
                          <input
                            type="text"
                            value={zoomUrlInput}
                            onChange={(e) => setZoomUrlInput(e.target.value)}
                            placeholder="ضع رابط Zoom هنا (مثال: https://zoom.us/j/...)"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-blue-600"
                          />
                        </div>
                        <button
                          onClick={sendZoomInvite}
                          className="w-full rounded-xl bg-blue-600 py-3 text-xs font-black text-white hover:bg-blue-700 transition shadow-sm cursor-pointer"
                        >
                          إرسال دعوة Zoom لولي الأمر 📹
                        </button>
                      </div>

                    </div>

                    {/* Tool 3: Live Interactive Chat Box with Full History */}
                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <MessageSquare size={20} className="text-teal-400" />
                          <div>
                            <h4 className="font-black text-sm">محادثة الشات المباشرة مع ولي الأمر</h4>
                            <p className="text-[11px] font-bold text-slate-400">سجل الرسائل المتبادلة للطالب ({selectedStudent.fullName})</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-teal-900/80 text-teal-300 border border-teal-700 px-3 py-1 text-xs font-black">
                          {chatThread.length} رسالة مسجلة
                        </span>
                      </div>

                      {/* Chat History View */}
                      <div className="min-h-[260px] max-h-[360px] overflow-y-auto p-4 bg-slate-50/80 space-y-3">
                        {chatThread.length > 0 ? (
                          chatThread.map((msg) => {
                            const isDoctor = msg.from === 'doctor';
                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col max-w-[85%] ${
                                  isDoctor ? 'mr-auto items-end' : 'ml-auto items-start'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 mb-1 px-1">
                                  <span className={`text-[10px] font-black ${isDoctor ? 'text-teal-800' : 'text-slate-600'}`}>
                                    {isDoctor ? '👨‍⚕️ د. إسماعيل عيسى' : `👨‍👦 ولي أمر ${selectedStudent.fullName}`}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-400">
                                    {new Date(msg.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div
                                  className={`rounded-2xl p-3.5 text-xs font-bold leading-relaxed shadow-2xs whitespace-pre-wrap ${
                                    isDoctor
                                      ? 'bg-teal-700 text-white rounded-tl-none'
                                      : 'bg-white border border-slate-200 text-slate-900 rounded-tr-none'
                                  }`}
                                >
                                  {msg.body}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="grid place-items-center py-12 text-center text-slate-400">
                            <MessageSquare size={36} className="text-slate-300 mb-2" />
                            <p className="text-xs font-bold">لا توجد رسائل سابقة في هذا الشات.</p>
                            <p className="text-[11px] text-slate-400 mt-1">اكتب رسالتك بالأسفل لتبدأ المحادثة المباشرة مع ولي الأمر.</p>
                          </div>
                        )}
                      </div>

                      {/* Chat Input Bar */}
                      <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
                        <textarea
                          value={messageBody}
                          onChange={(e) => setMessageBody(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendDirectMessage();
                            }
                          }}
                          placeholder="اكتب رسالة لولي الأمر واضغط Enter لإرسالها بالشات..."
                          className="flex-1 min-h-[44px] max-h-[100px] rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600 resize-none"
                        />
                        <button
                          onClick={sendDirectMessage}
                          disabled={!messageBody.trim()}
                          className="rounded-xl bg-teal-700 px-5 py-3 text-xs font-black text-white hover:bg-teal-800 transition disabled:opacity-40 shadow-sm cursor-pointer flex items-center gap-1.5 shrink-0"
                        >
                          <Send size={15} />
                          <span>إرسال</span>
                        </button>
                      </div>
                    </div>

                  </section>

                </div>
              )}

            </section>
          )}

        </main>
      </div>
    </div>
  );
}

