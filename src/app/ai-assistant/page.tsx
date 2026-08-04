'use client';

import { useEffect, useState } from 'react';
import {
  Sparkles, Bot, Send, User, BookOpen, Brain, Zap,
  CheckCircle2, AlertTriangle, Lightbulb, RefreshCw, FileText, ChevronRight
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { getStudents, type StudentRecord } from '@/lib/localDb';

interface Recommendation {
  id: string;
  category: 'exercise' | 'behavior' | 'warning' | 'insight';
  title: string;
  description: string;
  actionableStep: string;
  priority: 'high' | 'medium' | 'low';
}

export default function AIAssistantPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLog, setChatLog] = useState<{ sender: 'ai' | 'doctor'; text: string; time: string }[]>([
    {
      sender: 'ai',
      text: 'مرحباً دكتور إسماعيل! أنا مساعد مسار الذكي (AI Assistant). اختر طالباً من القائمة وسأقوم بتحليل مستواه، رصد أنماط الصعوبات، واقتراح الخطة العلاجية والأنشطة الأنسب للجلسة اللحظية.',
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    const allSt = getStudents();
    setStudents(allSt);
    if (allSt.length > 0) {
      setSelectedStudentId(allSt[0].id);
      generateStudentInsights(allSt[0]);
    }
  }, []);

  const generateStudentInsights = (st: StudentRecord) => {
    const recs: Recommendation[] = [
      {
        id: '1',
        category: 'exercise',
        title: 'تمرين تقوية التتبع البصري القفزي',
        description: `بناءً على أداء ${st.fullName} في المنهج، يُنصح بتطبيق تمرين التتبع البصري بين الكلمات المتباعدة لمدة 7 دقائق.`,
        actionableStep: 'استخدم بطاقات الحروف الملونة مع تسليط الضوء على المقاطع الصعبة.',
        priority: 'high',
      },
      {
        id: '2',
        category: 'warning',
        title: 'تنبيه: انخفاض الاستجابة في الجلسات المسائية',
        description: 'رصد الذكاء الاصطناعي تراجع تركيز الطالب بعد الساعة 4 مساءً بنسبة 25%.',
        actionableStep: 'يُفضل جدولة الجلسات القادمة في الفترة الصباحية لضمان أعلى استجابة.',
        priority: 'high',
      },
      {
        id: '3',
        category: 'behavior',
        title: 'تعزيز فوري كل 5 دقائق',
        description: 'إظهار استجابة عالية جداً عند استخدام النجوم البصرية وشارات التميّز.',
        actionableStep: 'تفعيل لوحة التعزيز الرقمية أثناء التمرين الأكاديمي.',
        priority: 'medium',
      },
      {
        id: '4',
        category: 'insight',
        title: 'معدل نمو متسارع في الرياضيات',
        description: `أظهر ${st.fullName} قفزة بنسبة 18% في حل التمارين العددية هذا الأسبوع.`,
        actionableStep: 'الانتقال إلى مستوى الجمع والتجميع المركب.',
        priority: 'low',
      },
    ];
    setRecommendations(recs);
  };

  const handleSelectStudent = (id: string) => {
    setSelectedStudentId(id);
    const st = students.find((s) => s.id === id);
    if (st) {
      generateStudentInsights(st);
      setChatLog((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `تم تحميل ملف الطالب (${st.fullName} - ${st.grade}). كيف يمكنني مساعدتك في خطة جلسة اليوم؟`,
          time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userText = query;
    const now = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    setChatLog((prev) => [...prev, { sender: 'doctor', text: userText, time: now }]);
    setQuery('');
    setLoading(true);

    setTimeout(() => {
      const st = students.find((s) => s.id === selectedStudentId);
      const name = st ? st.fullName : 'الطالب';
      const aiReply = `بناءً على التقييمات التراكمية وسجل أداء ${name}: يُنصح بالتركيز على التكرار الموزع (Spaced Repetition) لمدة 10 دقائق، يليها تمرين دمج المقاطع. أظهرت البيانات أن هذا التسلسل يزيد من استبقاء المعلومات بنسبة 35%.`;
      setChatLog((prev) => [...prev, { sender: 'ai', text: aiReply, time: now }]);
      setLoading(false);
    }, 1000);
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Bot className="text-teal-600" size={28} />
                مساعد الجلسات بالذكاء الاصطناعي (AI Assistant)
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-1">
                توليد اقتراحات علاجية لحظية، تحليل أنماط التعلم، وتصميع ملخص الجلسات تلقائياً
              </p>
            </div>

            {/* Student selector */}
            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-xs">
              <User size={18} className="text-teal-600" />
              <select
                value={selectedStudentId}
                onChange={(e) => handleSelectStudent(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-900 outline-none cursor-pointer"
              >
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    👦 {st.fullName} ({st.grade})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Main Grid: Left AI Chatbot, Right AI Recommendations */}
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Left: Chatbot Interface (2 cols) */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between h-[620px]">
              
              {/* Chat Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-600 text-white">
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm">مستشار الجلسة الذكي</h3>
                    <p className="text-[11px] font-bold text-teal-700">متصل الآن · يحلل أداء {selectedStudent?.fullName || 'الطالب'}</p>
                  </div>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-black text-teal-800 border border-teal-100">
                  نموذج تشخيصي متخصص
                </span>
              </div>

              {/* Chat Messages Log */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4 my-2 pr-1">
                {chatLog.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 ${msg.sender === 'doctor' ? 'flex-row-reverse' : ''}`}
                  >
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl font-black text-xs ${
                      msg.sender === 'doctor' ? 'bg-slate-900 text-white' : 'bg-teal-600 text-white'
                    }`}>
                      {msg.sender === 'doctor' ? 'د' : <Bot size={16} />}
                    </span>
                    <div className={`max-w-md rounded-2xl p-4 text-xs font-bold leading-relaxed shadow-xs ${
                      msg.sender === 'doctor'
                        ? 'bg-slate-900 text-white rounded-tr-none'
                        : 'bg-teal-50/80 border border-teal-100 text-slate-900 rounded-tl-none'
                    }`}>
                      <p>{msg.text}</p>
                      <span className={`block text-[9px] mt-1.5 ${msg.sender === 'doctor' ? 'text-slate-400' : 'text-teal-700 font-black'}`}>
                        {msg.time}
                      </span>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-xs font-black text-teal-600 animate-pulse">
                    <Sparkles size={16} /> جاري تحليل البيانات وتوليد التوصية...
                  </div>
                )}
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-slate-100 pt-3">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`اسأل المساعد الذكي عن أفضل الأنشطة لـ ${selectedStudent?.fullName || 'الطالب'}...`}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none focus:border-teal-600"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || loading}
                  className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-5 py-3 text-xs font-black text-white hover:bg-teal-700 transition disabled:opacity-40 shadow-sm"
                >
                  <Send size={15} /> إرسال
                </button>
              </form>
            </div>

            {/* Right: Realtime AI Insights Cards */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                    <Brain className="text-teal-600" size={18} /> اقتراحات الجلسة الحالية
                  </h3>
                  <span className="text-[11px] font-black text-slate-400">{recommendations.length} اقتراحات</span>
                </div>

                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.id}
                      className={`rounded-2xl p-4 border transition space-y-2 ${
                        rec.category === 'warning'
                          ? 'border-rose-200 bg-rose-50/60'
                          : rec.category === 'exercise'
                          ? 'border-teal-200 bg-teal-50/60'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-slate-900 text-xs">{rec.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                          rec.priority === 'high' ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {rec.priority === 'high' ? 'عالي الأهمية' : 'عادي'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-bold leading-relaxed">{rec.description}</p>
                      <div className="rounded-xl bg-white p-2.5 border border-slate-200/80 text-[11px] font-black text-teal-800">
                        ⚡ خطوة التنفيذ: {rec.actionableStep}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </main>
      </div>
    </div>
  );
}
