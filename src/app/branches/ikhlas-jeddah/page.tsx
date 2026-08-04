'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2, Clock, CheckCircle2, AlertTriangle, Send, BookOpen, UserCheck,
  ShieldCheck, Bell, Award, Sparkles, MessageCircle, Calendar, Plus, Share2
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  getStudents, StudentRecord, getIkhlasLogs, saveIkhlasLog,
  getIkhlasPosts, saveIkhlasPost, IkhlasDailyLogRecord, IkhlasCommunityPost
} from '@/lib/localDb';

const MOCK_IKHLAS_STUDENTS = [
  { id: 'ikh_1', name: 'محمد أحمد علي إبراهيم', grade: 'أولى ابتدائي / 1', parentName: 'أحمد علي إبراهيم', phone: '0501234567' },
  { id: 'ikh_2', name: 'يوسف خالد عبد العزيز', grade: 'أولى ابتدائي / 1', parentName: 'خالد عبد العزيز', phone: '0559876543' },
  { id: 'ikh_3', name: 'عمر فيصل سعيد الغامدي', grade: 'أولى ابتدائي / 1', parentName: 'فيصل سعيد الغامدي', phone: '0541122334' },
  { id: 'ikh_4', name: 'عبد الله صالح العتيبي', grade: 'أولى ابتدائي / 1', parentName: 'صالح العتيبي', phone: '0569988776' },
  { id: 'ikh_5', name: 'إبراهيم حسن بن جاسم', grade: 'أولى ابتدائي / 1', parentName: 'حسن بن جاسم', phone: '0533344556' },
  { id: 'ikh_6', name: 'سعود فهد الشمري', grade: 'أولى ابتدائي / 1', parentName: 'فهد الشمري', phone: '0522211445' },
];

export default function IkhlasJeddahClassPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'dismissal' | 'reports' | 'feed' | 'preview'>('dismissal');
  const [logs, setLogs] = useState<IkhlasDailyLogRecord[]>([]);
  const [posts, setPosts] = useState<IkhlasCommunityPost[]>([]);
  const [currentTime, setCurrentTime] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New Post Form State
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'homework' | 'announcement' | 'photo'>('homework');
  const [postDueDate, setPostDueDate] = useState('');

  // Daily Report State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(MOCK_IKHLAS_STUDENTS[0].id);
  const [score, setScore] = useState<number>(95);
  const [summary, setSummary] = useState<string>('تم تدريس مهارات القراءة الجهرية، والتمييز بين المقاطع الصوتية القصيرة والطويلة، وإكمال تمارين الحساب التفاعلية بنجاح.');
  const [attendance, setAttendance] = useState<'present' | 'absent' | 'late'>('present');

  useEffect(() => {
    // Clock tick
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    setCurrentTime(new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    // Load logs & posts
    setLogs(getIkhlasLogs());
    setPosts(getIkhlasPosts());

    return () => clearInterval(timer);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 1. Log Exit Timestamp
  const handleLogExitTime = (studentId: string, studentName: string) => {
    const timeNow = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    const dateToday = new Date().toISOString().split('T')[0];

    const existingLog = logs.find((l) => l.studentId === studentId && l.date === dateToday);

    const updated = saveIkhlasLog({
      id: existingLog?.id,
      studentId,
      studentName,
      date: dateToday,
      attendance: existingLog?.attendance || 'present',
      performanceScore: existingLog?.performanceScore || 95,
      summaryReport: existingLog?.summaryReport || 'حضور وانتظام يومي ممتاز في فصل أولى ابتدائي.',
      exitTime: `${timeNow} م`,
      exitLoggedAt: new Date().toISOString(),
      parentNotified: true,
    });

    setLogs(getIkhlasLogs());
    showToast(`✅ تم توثيق خروج الطالب ${studentName} الساعة ${timeNow} م وإرسال إشعار لولي الأمر!`);
  };

  // 2. Send Late Pickup Alert
  const handleSendLateAlert = (studentName: string, parentPhone: string) => {
    const timeNow = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    const msgText = `السيد ولي أمر الطالب (${studentName})، نود تذكيركم بأن اليوم الدراسي بمدارس الإخلاص الأهلية بجدة قد انتهى في تمام الساعة ${timeNow}م. يرجى الحضور لاستلام طفلك من بوابة المدرسة.`;
    
    // WhatsApp direct link
    const waUrl = `https://wa.me/${parentPhone.replace(/\+/g, '')}?text=${encodeURIComponent(msgText)}`;

    showToast(`🔔 تم إرسال تنبيه تأخر الاستلام لولي أمر ${studentName}!`);
    if (typeof window !== 'undefined') {
      window.open(waUrl, '_blank');
    }
  };

  // 3. Save Daily Report
  const handleSaveDailyReport = (e: React.FormEvent) => {
    e.preventDefault();
    const st = MOCK_IKHLAS_STUDENTS.find((s) => s.id === selectedStudentId);
    if (!st) return;

    const dateToday = new Date().toISOString().split('T')[0];
    const existingLog = logs.find((l) => l.studentId === st.id && l.date === dateToday);

    saveIkhlasLog({
      id: existingLog?.id,
      studentId: st.id,
      studentName: st.name,
      date: dateToday,
      attendance,
      performanceScore: score,
      summaryReport: summary,
      exitTime: existingLog?.exitTime,
      exitLoggedAt: existingLog?.exitLoggedAt,
      parentNotified: true,
    });

    setLogs(getIkhlasLogs());
    showToast(`🎉 تم إرسال التقرير التحليلي اليومي للطالب (${st.name}) بنجاح لولي الأمر!`);
  };

  // 4. Create Community Post / Homework
  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) return;

    saveIkhlasPost({
      title: postTitle,
      content: postContent,
      type: postType,
      dueDate: postDueDate || undefined,
      author: 'الأستاذ (المعلم المسؤول) - مدارس الإخلاص',
    });

    setPosts(getIkhlasPosts());
    setPostTitle('');
    setPostContent('');
    setPostDueDate('');
    showToast('📌 تم نشر التنبيه/الواجب اليومي في مجتمع فصل أولى ابتدائي!');
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />

      <div className="flex" dir="rtl">
        <Sidebar desktopOnly />

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 space-y-6">

          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed top-20 right-6 z-50 rounded-2xl bg-slate-900 p-4 text-white shadow-2xl border border-teal-500/50 flex items-center gap-3 animate-bounce">
              <Sparkles className="text-amber-400 shrink-0" size={20} />
              <p className="text-xs sm:text-sm font-black">{toastMessage}</p>
            </div>
          )}

          {/* HERO BANNER - AL-IKHLAS JEDDAH CLASS */}
          <div className="overflow-hidden rounded-3xl bg-gradient-to-l from-teal-800 via-teal-900 to-slate-950 p-6 sm:p-8 text-white shadow-2xl relative">
            <div className="absolute top-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-teal-500/20 px-3.5 py-1 text-xs font-black text-teal-200 border border-teal-400/30">
                    🇸🇦 مدارس الإخلاص الأهلية بجدة
                  </span>
                  <span className="rounded-full bg-amber-400/20 px-3.5 py-1 text-xs font-black text-amber-300 border border-amber-400/30">
                    فصل أولى ابتدائي (1/1)
                  </span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                  منظومة إدارة الفصل والمتابعة اليومية لأولياء الأمور
                </h1>
                <p className="text-xs sm:text-sm font-bold text-teal-200/90 max-w-2xl">
                  توثيق الحضور والغياب، إرسال تقرير اليوم الدراسي الشامل، توثيق وقت خروج الطفل بالدقيقة، وتنبيهات تأخر استلام الأطفال مع مجتمع الواجبات.
                </p>
              </div>

              {/* Live Clock Card */}
              <div className="shrink-0 rounded-2xl bg-white/10 p-4 border border-white/20 backdrop-blur-md text-center space-y-1">
                <p className="text-[11px] font-black text-teal-300 uppercase tracking-wider">الساعة الحالية بجدة ⏰</p>
                <p className="text-2xl font-black text-white tracking-wider" dir="ltr">{currentTime || '01:45:00 م'}</p>
                <p className="text-[10px] font-bold text-teal-200">توثيق آلي مباشر لوقت خروج الطلاب</p>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-white/10">
              <div className="rounded-xl bg-white/5 p-3 text-center border border-white/10">
                <p className="text-[11px] font-black text-teal-300">طلاب الفصل</p>
                <p className="text-xl font-black text-white mt-0.5">{MOCK_IKHLAS_STUDENTS.length} طالباً</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center border border-white/10">
                <p className="text-[11px] font-black text-teal-300">نسبة الحضور اليوم</p>
                <p className="text-xl font-black text-emerald-400 mt-0.5">100%</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center border border-white/10">
                <p className="text-[11px] font-black text-teal-300">تم توثيق الخروج</p>
                <p className="text-xl font-black text-amber-300 mt-0.5">
                  {logs.filter((l) => l.exitTime).length} طلاب
                </p>
              </div>
              <div className="rounded-xl bg-white/5 p-3 text-center border border-white/10">
                <p className="text-[11px] font-black text-teal-300">متوسط الأداء اليومي</p>
                <p className="text-xl font-black text-cyan-300 mt-0.5">95%</p>
              </div>
            </div>
          </div>

          {/* TAB NAVIGATION */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab('dismissal')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer ${
                activeTab === 'dismissal'
                  ? 'bg-teal-700 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Clock size={16} />
              <span>طابور الانصراف وتوثيق وقت الخروج</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-teal-700 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Award size={16} />
              <span>إرسال التقرير اليومي الشامل</span>
            </button>

            <button
              onClick={() => setActiveTab('feed')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer ${
                activeTab === 'feed'
                  ? 'bg-teal-700 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <BookOpen size={16} />
              <span>مجتمع الفصل والواجبات</span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black transition cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-teal-700 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <MessageCircle size={16} />
              <span>معاينة شاشة ولي الأمر Live</span>
            </button>
          </div>

          {/* TAB 1: DISMISSAL & EXIT TIMESTAMPS */}
          {activeTab === 'dismissal' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-teal-50 border border-teal-200 p-4 rounded-2xl">
                <div>
                  <h3 className="font-black text-teal-900 text-base">طابور انصراف الطلاب - توثيق لحظي ووقت الخروج بالدقيقة</h3>
                  <p className="text-xs font-bold text-teal-700 mt-0.5">
                    عند خروج الطالب من المدرسة، اضغط "توثيق الخروج" ليصل إشعار زمني موثق لولي الأمر فوراً.
                  </p>
                </div>
              </div>

              <div className="grid gap-3">
                {MOCK_IKHLAS_STUDENTS.map((student) => {
                  const studentLog = logs.find((l) => l.studentId === student.id);
                  const exitTime = studentLog?.exitTime;

                  return (
                    <article key={student.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-teal-300 transition">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <h4 className="font-black text-slate-900 text-base">{student.name}</h4>
                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-600">
                              {student.grade}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-500">
                            ولي الأمر: <span className="text-slate-800 font-black">{student.parentName}</span> ({student.phone})
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {/* Exit timestamp display */}
                          {exitTime ? (
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-black text-emerald-800">
                              <CheckCircle2 size={16} className="text-emerald-600" />
                              <span>تم الخروج الساعة: {exitTime}</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleLogExitTime(student.id, student.name)}
                              className="focus-ring flex items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 text-xs font-black transition shadow-sm cursor-pointer active:scale-95"
                            >
                              <Clock size={16} />
                              <span>توثيق خروج الطالب الآن 🕒</span>
                            </button>
                          )}

                          {/* Late pickup alert trigger */}
                          <button
                            onClick={() => handleSendLateAlert(student.name, student.phone)}
                            className="focus-ring flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 px-3.5 py-2.5 text-xs font-black transition shadow-sm cursor-pointer active:scale-95"
                            title="إرسال تذكير عاجل لولي الأمر المتأخر عبر المنصة والواتساب"
                          >
                            <Bell size={16} />
                            <span>تنبيه تأخر ولي الأمر 🔔</span>
                          </button>
                        </div>

                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: DAILY ANALYTICAL REPORT DISPATCHER */}
          {activeTab === 'reports' && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xl space-y-6 max-w-3xl mx-auto">
              <div>
                <h3 className="text-xl font-black text-slate-900">مُرسل التقرير اليومي الأوتوماتيكي لأولياء الأمور</h3>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  إرسال كشف الأداء اليومي والتقييم والمهارات لولي أمر طالب محدد في فصل أولى ابتدائي الإخلاص.
                </p>
              </div>

              <form onSubmit={handleSaveDailyReport} className="space-y-4">
                <label className="block text-right space-y-1.5">
                  <span className="text-xs font-black text-slate-700">اختر الطالب</span>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-600"
                  >
                    {MOCK_IKHLAS_STUDENTS.map((s) => (
                      <option key={s.id} value={s.id}>👦 {s.name} - ولي الأمر: {s.parentName}</option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-right space-y-1.5">
                    <span className="text-xs font-black text-slate-700">حالة الحضور والانتظام</span>
                    <select
                      value={attendance}
                      onChange={(e) => setAttendance(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-600"
                    >
                      <option value="present">✅ حاضر ومنتظم</option>
                      <option value="late">⏰ متأخر</option>
                      <option value="absent">❌ غائب</option>
                    </select>
                  </label>

                  <label className="block text-right space-y-1.5">
                    <span className="text-xs font-black text-slate-700">تقييم أداء الطفل اليومي (%)</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={score}
                      onChange={(e) => setScore(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-600"
                    />
                  </label>
                </div>

                <label className="block text-right space-y-1.5">
                  <span className="text-xs font-black text-slate-700">التقرير اليومي والمهارات المكتسبة اليوم</span>
                  <textarea
                    rows={4}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-900 outline-none focus:border-teal-600 leading-relaxed"
                  />
                </label>

                <button
                  type="submit"
                  className="w-full focus-ring flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3.5 font-black text-white hover:bg-teal-700 transition shadow-md cursor-pointer"
                >
                  <Send size={18} />
                  <span>اعتماد وإرسال التقرير اليومي لولي الأمر</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: CLASS COMMUNITY & HOMEWORK FEED */}
          {activeTab === 'feed' && (
            <div className="grid lg:grid-cols-[1fr_1.3fr] gap-6 items-start">
              
              {/* Post Creation Form */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
                <h3 className="text-lg font-black text-slate-900">نشر واجب أو تنبيه في مجتمع الفصل</h3>
                
                <form onSubmit={handleCreatePost} className="space-y-3">
                  <label className="block text-right space-y-1">
                    <span className="text-xs font-black text-slate-700">نوع المنشور</span>
                    <select
                      value={postType}
                      onChange={(e) => setPostType(e.target.value as any)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600"
                    >
                      <option value="homework">📚 واجب يومي جديد</option>
                      <option value="announcement">📢 إعلان مهم لجميع الأولياء</option>
                      <option value="photo">🖼️ صورة نشاط في الفصل</option>
                    </select>
                  </label>

                  <label className="block text-right space-y-1">
                    <span className="text-xs font-black text-slate-700">عنوان الواجب / التنبيه</span>
                    <input
                      type="text"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="مثال: واجب لغتي - حل ص 45 في المذكرة"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600"
                      required
                    />
                  </label>

                  <label className="block text-right space-y-1">
                    <span className="text-xs font-black text-slate-700">تفاصيل الواجب والتعليمات</span>
                    <textarea
                      rows={3}
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                      placeholder="مثال: قراءة درس (الأسرة) وكتابة الكلمات الثلاثية 3 مرات في الكراسة المنزلية..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-900 outline-none focus:border-teal-600 leading-relaxed"
                      required
                    />
                  </label>

                  <label className="block text-right space-y-1">
                    <span className="text-xs font-black text-slate-700">تاريخ التسليم (اختياري)</span>
                    <input
                      type="date"
                      value={postDueDate}
                      onChange={(e) => setPostDueDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600"
                    />
                  </label>

                  <button
                    type="submit"
                    className="w-full focus-ring flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-black text-white hover:bg-teal-700 transition shadow-sm cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>نشر التنبيه في مجتمع فصل أولى ابتدائي</span>
                  </button>
                </form>
              </div>

              {/* Class Community Feed */}
              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900">حائط مجتمع أولى ابتدائي (مدارس الإخلاص بجدة)</h3>

                {posts.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center space-y-2">
                    <BookOpen size={32} className="mx-auto text-slate-400" />
                    <p className="font-black text-slate-900">لا توجد منشورات حتى الآن</p>
                    <p className="text-xs font-bold text-slate-500">انشر أول واجب أو إعلان وسيظهر هنا وفي حساب أولياء الأمور فوراً.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {posts.map((post) => (
                      <article key={post.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className={`rounded-md px-2.5 py-1 text-[11px] font-black ${
                            post.type === 'homework' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {post.type === 'homework' ? '📚 واجب منزلي' : '📢 إعلان فصل'}
                          </span>
                          <span className="text-[11px] font-bold text-slate-400">
                            {new Date(post.createdAt).toLocaleDateString('ar-SA')}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-black text-slate-900 text-base">{post.title}</h4>
                          <p className="mt-1 text-xs font-bold text-slate-600 leading-relaxed">{post.content}</p>
                        </div>

                        {post.dueDate && (
                          <div className="flex items-center gap-1.5 text-xs font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200 inline-flex">
                            <Calendar size={14} />
                            <span>آخر موعد للتسليم: {post.dueDate}</span>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: LIVE PARENT PORTAL PREVIEW */}
          {activeTab === 'preview' && (
            <div className="max-w-md mx-auto rounded-3xl border-4 border-slate-900 bg-slate-100 p-4 shadow-2xl space-y-4">
              {/* Phone Status Bar Simulation */}
              <div className="flex items-center justify-between text-[11px] font-black text-slate-700 px-2 pb-2 border-b border-slate-300">
                <span>تطبيق مَسَار - ولي الأمر</span>
                <span dir="ltr">01:45 PM</span>
              </div>

              {/* Parent View Simulation */}
              <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-right">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div>
                    <p className="text-[10px] font-black text-teal-700 uppercase">مدارس الإخلاص الأهلية بجدة 🇸🇦</p>
                    <h4 className="font-black text-slate-900 text-sm">الطالب: محمد أحمد علي (فصل 1/1)</h4>
                  </div>
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-1 text-[10px] font-black">
                    حاضر
                  </span>
                </div>

                {/* Exit Time Card */}
                <div className="rounded-xl bg-teal-50 border border-teal-200 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="text-teal-700" size={18} />
                    <div>
                      <p className="text-[10px] font-black text-teal-800">توقيت خروج الطفل اليوم 🕒</p>
                      <p className="text-sm font-black text-teal-950">01:45 م (تم التوثيق من المعلم)</p>
                    </div>
                  </div>
                </div>

                {/* Daily Performance Score */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1">
                  <p className="text-[11px] font-black text-slate-700">تقييم أداء الطفل اليومي</p>
                  <div className="flex items-center justify-between">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 ml-3">
                      <div className="h-full bg-teal-600 rounded-full" style={{ width: '95%' }} />
                    </div>
                    <span className="text-xs font-black text-teal-800">95%</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-500 pt-1 leading-relaxed">
                    تم تدريس مهارات القراءة الجهرية، والتمييز بين المقاطع الصوتية القصيرة والطويلة بنجاح.
                  </p>
                </div>

                {/* Active Late Pickup Alert Preview */}
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-center gap-2 text-amber-900 text-xs font-black">
                  <Bell className="text-amber-600 shrink-0" size={16} />
                  <span>تنبيه: انتهى اليوم الدراسي بجدة، طفلك ينتظر استلامك عند البوابة!</span>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
