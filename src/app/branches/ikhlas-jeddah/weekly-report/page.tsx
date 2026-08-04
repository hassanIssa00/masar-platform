'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { BarChart3, Send, CheckCircle, ArrowRight, Star, Loader2, FileText, User } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BRANCH = 'IKHLAS_JEDDAH';

function authHeaders() {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('masar_token') ?? localStorage.getItem('access_token'))
    : null;
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const CLASS_STUDENTS = [
  { id: 's1', name: 'أحمد محمد علي إبراهيم' },
  { id: 's2', name: 'يوسف خالد عبد العزيز السهلي' },
  { id: 's3', name: 'عمر سعد محمد الغامدي' },
  { id: 's4', name: 'عبد الرحمن فهد علي القحطاني' },
  { id: 's5', name: 'محمد عبد الله أحمد الزهراني' },
  { id: 's6', name: 'سلطان ناصر محمد العتيبي' },
  { id: 's7', name: 'فيصل بندر عبد الرحمن الشمري' },
];

export default function IkhlasWeeklyReportPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState('أسبوع ممتاز والطلاب أظهروا تفوقاً رائعاً في القراءة والرياضيات 🌟');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/school/weekly-reports?branch=${BRANCH}`, { headers: authHeaders() });
      if (r.ok) setReports(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  const dispatchWeeklyReports = async () => {
    setSubmitting(true);
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 4);

    try {
      await Promise.all(
        CLASS_STUDENTS.map((student) =>
          fetch(`${API}/school/weekly-reports`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              branch: BRANCH,
              studentName: student.name,
              studentId: student.id,
              weekStart: weekStart.toISOString().slice(0, 10),
              weekEnd: weekEnd.toISOString().slice(0, 10),
              attendanceDays: 5,
              avgPerformance: 94,
              homeworkDone: 5,
              homeworkTotal: 5,
              teacherNotes,
            }),
          })
        )
      );
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 4000);
      await fetchReports();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 text-white p-4 sm:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <Link href="/branches/ikhlas-jeddah"
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-slate-300">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              📊 إعداد وتوليد التقارير الأسبوعية للآباء
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              مدارس الإخلاص الأهلية بجدة — ملخص كشف الحضور، الأداء، الواجبات المنجزة وملاحظات المعلم
            </p>
          </div>
        </div>

        {/* Report Dispatcher Box */}
        <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-black text-amber-300 flex items-center gap-2">
            <Star className="w-5 h-5" /> إرسال التقرير الأسبوعي لجميع أولياء الأمور
          </h2>

          <textarea placeholder="ملاحظات المعلم العامة للأسبوع..." value={teacherNotes} onChange={(e) => setTeacherNotes(e.target.value)} rows={3}
            className="w-full bg-slate-900/90 border border-amber-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-amber-400 transition resize-none" />

          <button onClick={dispatchWeeklyReports} disabled={submitting || sentSuccess}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all shadow-lg ${
              sentSuccess ? 'bg-emerald-600 text-white' : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white disabled:opacity-50'
            }`}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : sentSuccess ? <CheckCircle className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            {sentSuccess ? 'تم إرسال التقرير الأسبوعي لكل الآباء بنجاح! ✅' : 'إرسال التقرير الشامل لجميع أولياء الأمور 🚀'}
          </button>
        </div>

        {/* Existing Reports */}
        <div className="space-y-3">
          <h2 className="text-base font-black text-white">التقارير الأسبوعية المرسلة سابقاً</h2>
          {loading && <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-amber-400 mx-auto" /></div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reports.map((rep) => (
              <div key={rep.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <p className="font-black text-white text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-400" /> {rep.studentName}
                  </p>
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                    {rep.weekStart} – {rep.weekEnd}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-950 p-2 rounded-xl">
                    <p className="font-black text-blue-400">{rep.attendanceDays}/5</p>
                    <p className="text-[10px] text-slate-500">الحضور</p>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl">
                    <p className="font-black text-emerald-400">{rep.avgPerformance}%</p>
                    <p className="text-[10px] text-slate-500">الأداء</p>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-xl">
                    <p className="font-black text-amber-400">{rep.homeworkDone}/{rep.homeworkTotal}</p>
                    <p className="text-[10px] text-slate-500">الواجبات</p>
                  </div>
                </div>

                {rep.teacherNotes && (
                  <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-white/5">
                    💬 {rep.teacherNotes}
                  </p>
                )}
              </div>
            ))}
          </div>
          {!loading && !reports.length && <p className="text-slate-500 text-center py-8">لا توجد تقارير أسبوعية مضافة بعد 📊</p>}
        </div>
      </div>
    </div>
  );
}
