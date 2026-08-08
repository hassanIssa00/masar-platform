'use client';

import { useState } from 'react';
import {
  Award, Send, Users, CheckCircle2, AlertCircle, FileText,
  Printer, Sparkles, Star, TrendingUp, BookOpen, Clock,
  MessageSquare, User, Eye, ChevronDown, ChevronUp, Share2,
  Check, PhoneCall, ShieldCheck
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  phone?: string;
}

interface Props {
  students: Student[];
  homeworkCount: number;
  photosCount: number;
}

/* ── Individual Student Mock Performance Data Generator ── */
const MOCK_STUDENT_METRICS: Record<string, {
  attendanceRate: number;
  homeworkRate: number;
  behaviorScore: number;
  overallGrade: string;
  teacherNotes: string;
  recommendation: string;
}> = {
  'default': {
    attendanceRate: 98,
    homeworkRate: 95,
    behaviorScore: 96,
    overallGrade: 'ممتاز مع مرتبة الشرف 🏆',
    teacherNotes: 'طالب متفوق ومثابر، يشارك بفاعلية عالية في الحصص التفاعلية، ويظهر دقة وسرعة في إنجاز الواجبات والأوراق الإثرائية.',
    recommendation: 'يُنصح بمواصلة تشجيعه على القراءة الإثرائية اليومية لمدة 15 دقيقة في المنزل للحفاظ على التميز اللغوي.',
  }
};

export default function StudentReportsManagerTab({ students, homeworkCount, photosCount }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [batchSending, setBatchSending] = useState(false);
  const [batchSent, setBatchSent] = useState(false);

  /* Community Posts State */
  const [postBody, setPostBody] = useState('');
  const [postType, setPostType] = useState<'ANNOUNCEMENT' | 'GENERAL'>('ANNOUNCEMENT');
  const [posts, setPosts] = useState<{ id: string; type: string; body: string; createdAt: string }[]>([
    {
      id: 'POST-1',
      type: 'ANNOUNCEMENT',
      body: '📢 أولياء الأمور الكرام: يرجى العلم بأنه تم رفع الجدول الدراسي المحدث وتحديث كشوف الواجبات الأسبوعية.',
      createdAt: new Date().toISOString()
    }
  ]);

  const handleCreatePost = () => {
    if (!postBody.trim()) return;
    setPosts(prev => [{
      id: `POST-${Date.now()}`,
      type: postType,
      body: postBody,
      createdAt: new Date().toISOString()
    }, ...prev]);
    setPostBody('');
  };

  const handleSendBatchReports = () => {
    setBatchSending(true);
    setTimeout(() => {
      setBatchSending(false);
      setBatchSent(true);
      setTimeout(() => setBatchSent(false), 5000);
    }, 1500);
  };

  const getStudentMetrics = (sId: string) => {
    return MOCK_STUDENT_METRICS[sId] || MOCK_STUDENT_METRICS['default'];
  };

  const generateWhatsAppReportLink = (s: Student) => {
    const metrics = getStudentMetrics(s.id);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const text =
      `📋 *التقرير الأكاديمي الشامل لولي الأمر — منصة مَسَار*%0A%0A` +
      `👤 *الطالب:* ${encodeURIComponent(s.name)}%0A` +
      `🏫 *المدرسة:* مدارس الإخلاص الأهلية بجدة%0A` +
      `🏆 *التقدير العام:* ${encodeURIComponent(metrics.overallGrade)}%0A%0A` +
      `📊 *مؤشرات الأداء الأسبوعي:*%0A` +
      `• نسبة الحضور والانضباط: ${metrics.attendanceRate}%%0A` +
      `• إنجاز الواجبات الإلكترونية: ${metrics.homeworkRate}%%0A` +
      `• التفاعل والسلوك الصفي: ${metrics.behaviorScore}%%0A%0A` +
      `📝 *ملاحظات المعلم والاستشاري:*%0A` +
      `"${encodeURIComponent(metrics.teacherNotes)}"%0A%0A` +
      `🔗 *استعراض التقرير الموثق كاملاً عبر المنصة:*%0A` +
      `${encodeURIComponent(origin + '/students')}`;

    return `https://wa.me/?text=${text}`;
  };

  return (
    <div className="space-y-6 text-slate-900" dir="rtl">

      {/* ── EXECUTIVE BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06392c] via-[#094d3c] to-[#04291e] p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-6 w-6 text-amber-400" />
              <span className="font-black text-emerald-200 text-sm">منصة مَسَار · منظومة التقارير الشاملة وإشعارات أولياء الأمور</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">التقارير الأكاديمية والملف الشخصي لكل طالب 📊📱</h2>
            <p className="mt-1 text-sm font-semibold text-emerald-100/90">
              ملف أكاديمي موثق لكل طالب، تقارير أداء تفاعلية مدعومة بالذكاء الاصطناعي، وإمكانية الإرسال المباشر للآباء عبر WhatsApp.
            </p>
          </div>

          <button
            onClick={handleSendBatchReports}
            disabled={batchSending}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 px-5 py-3 rounded-2xl text-xs font-black transition shadow-lg active:scale-95 shrink-0 border border-amber-300/60"
          >
            {batchSending ? <Sparkles className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {batchSent ? '✅ تم الإرسال للجميع!' : 'إرسال التقارير لجميع أولياء الأمور 🚀'}
          </button>
        </div>
      </div>

      {/* ── CLASS PERFORMANCE METRICS SUMMARY ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-center">
          <span className="text-2xl font-black text-emerald-800 font-mono">{students.length}</span>
          <span className="text-xs font-bold text-emerald-700 block mt-1">طلاب الفصل المكرمين</span>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-center">
          <span className="text-2xl font-black text-blue-800 font-mono">98%</span>
          <span className="text-xs font-bold text-blue-700 block mt-1">متوسط الانضباط والحضور</span>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-center">
          <span className="text-2xl font-black text-amber-800 font-mono">{homeworkCount}</span>
          <span className="text-xs font-bold text-amber-700 block mt-1">واجبات إلكترونية منجزة</span>
        </div>
        <div className="rounded-2xl border border-purple-200 bg-purple-50/80 p-4 text-center">
          <span className="text-2xl font-black text-purple-800 font-mono">96%</span>
          <span className="text-xs font-bold text-purple-700 block mt-1">معدل التقييم الأكاديمي</span>
        </div>
      </div>

      {/* ── INDIVIDUAL STUDENT PROFILES LIST ── */}
      <div className="space-y-4">
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" /> الملف الأكاديمي الشامل لكل طالب بالصف ({students.length})
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {students.map((student) => {
            const metrics = getStudentMetrics(student.id);

            return (
              <div
                key={student.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
              >
                {/* Student Info Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center text-lg font-black shadow-xs">
                      {student.name[0]}
                    </div>
                    <div>
                      <h4 className="font-black text-base text-slate-900">{student.name}</h4>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-block mt-0.5">
                        {metrics.overallGrade}
                      </span>
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded-md border">
                    ID: {student.id}
                  </span>
                </div>

                {/* Progress Gauges Grid */}
                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                  <div>
                    <span className="text-xs font-black text-slate-900 font-mono">{metrics.attendanceRate}%</span>
                    <span className="text-[10px] font-bold text-slate-500 block">الحضور</span>
                  </div>
                  <div>
                    <span className="text-xs font-black text-emerald-700 font-mono">{metrics.homeworkRate}%</span>
                    <span className="text-[10px] font-bold text-slate-500 block">الواجبات</span>
                  </div>
                  <div>
                    <span className="text-xs font-black text-purple-700 font-mono">{metrics.behaviorScore}%</span>
                    <span className="text-[10px] font-bold text-slate-500 block">الأداء والتفاعل</span>
                  </div>
                </div>

                {/* Teacher Note Preview */}
                <p className="text-xs font-medium text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  💬 "{metrics.teacherNotes}"
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setSelectedStudent(student);
                      setShowReportModal(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-2.5 rounded-xl text-xs font-black transition shadow-xs"
                  >
                    <Eye size={14} /> استعراض التقرير الشامل 🔍
                  </button>

                  <a
                    href={generateWhatsAppReportLink(student)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 rounded-xl text-xs font-black transition shadow-xs"
                    title="إرسال التقرير لولي الأمر عبر WhatsApp"
                  >
                    <Send size={14} /> إرسال للآباء 📱
                  </a>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* ── COMMUNITY ANNOUNCEMENTS BOARD ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="font-black text-slate-900 flex items-center gap-2 text-base">
          <MessageSquare className="w-5 h-5 text-blue-600" /> نشر في مجتمع أولياء الأمور
        </h3>

        <div className="flex gap-2">
          {(['ANNOUNCEMENT', 'GENERAL'] as const).map(t => (
            <button
              key={t}
              onClick={() => setPostType(t)}
              className={`text-xs px-4 py-1.5 rounded-xl font-bold border transition-all ${
                postType === t ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              {t === 'ANNOUNCEMENT' ? '📢 إعلان رسمي' : '💬 منشور عام'}
            </button>
          ))}
        </div>

        <textarea
          placeholder="اكتب إعلاناً أو رسالة عامة تظهر في حسابات أولياء الأمور..."
          value={postBody}
          onChange={e => setPostBody(e.target.value)}
          rows={3}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 transition resize-none"
        />

        <button
          onClick={handleCreatePost}
          disabled={!postBody.trim()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-50 shadow-sm"
        >
          <Send className="w-4 h-4" /> نشر الرسالة لأولياء الأمور 🚀
        </button>

        {/* Existing Announcements List */}
        <div className="space-y-2 pt-2">
          {posts.map(p => (
            <div key={p.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-blue-100 text-blue-800 font-black px-2.5 py-0.5 rounded-full">
                  {p.type === 'ANNOUNCEMENT' ? '📢 إعلان رسمي' : '💬 منشور عام'}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {new Date(p.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 leading-relaxed pt-1">{p.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── INDIVIDUAL STUDENT REPORT MODAL ── */}
      {showReportModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto" dir="rtl">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-xl font-black flex items-center justify-center">
                  {selectedStudent.name[0]}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">التقرير الأكاديمي الشامل — {selectedStudent.name}</h3>
                  <p className="text-xs text-slate-500 font-bold">مدارس الإخلاص الأهلية بجدة · الفصل الدراسي الأول</p>
                </div>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-700 font-black text-lg">
                ✕
              </button>
            </div>

            {/* Metrics */}
            {(() => {
              const metrics = getStudentMetrics(selectedStudent.id);
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                      <span className="text-xl font-black text-emerald-800 font-mono">{metrics.attendanceRate}%</span>
                      <span className="text-xs font-bold text-emerald-700 block mt-0.5">الانضباط والحضور</span>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
                      <span className="text-xl font-black text-blue-800 font-mono">{metrics.homeworkRate}%</span>
                      <span className="text-xs font-bold text-blue-700 block mt-0.5">حل الواجبات</span>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3">
                      <span className="text-xl font-black text-purple-800 font-mono">{metrics.behaviorScore}%</span>
                      <span className="text-xs font-bold text-purple-700 block mt-0.5">الأداء والسلوك</span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                    <span className="text-xs font-black text-slate-900 block">💬 ملاحظات المعلم والاستشاري:</span>
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">{metrics.teacherNotes}</p>
                  </div>

                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2">
                    <span className="text-xs font-black text-amber-900 block">💡 توصيات لولي الأمر في المنزل:</span>
                    <p className="text-xs font-medium text-amber-800 leading-relaxed">{metrics.recommendation}</p>
                  </div>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100">
              <a
                href={generateWhatsAppReportLink(selectedStudent)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-black transition shadow-sm"
              >
                <Send size={16} /> إرسال التقرير لولي الأمر عبر WhatsApp 📱
              </a>

              <button
                onClick={() => window.print()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl text-xs font-black transition shadow-sm"
              >
                <Printer size={16} /> طباعة PDF 🖨️
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
