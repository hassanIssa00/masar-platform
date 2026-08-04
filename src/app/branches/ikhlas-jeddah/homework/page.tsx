'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BookOpen, Plus, Send, CheckCircle, Clock,
  ArrowRight, FileText, Award, User, Loader2, Sparkles
} from 'lucide-react';

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

export default function IkhlasHomeworkPage() {
  const [homeworkList, setHomeworkList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Homework state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'TEXT' | 'MULTIPLE_CHOICE'>('TEXT');
  const [options, setOptions] = useState(['أ', 'ب', 'ج', 'د']);
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Grading modal state
  const [selectedHw, setSelectedHw] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [gradingSubId, setGradingSubId] = useState<string | null>(null);

  const fetchHomework = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/school/homework?branch=${BRANCH}`, { headers: authHeaders() });
      if (r.ok) setHomeworkList(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHomework(); }, [fetchHomework]);

  const createHomework = async () => {
    if (!title || !description || !dueDate) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/school/homework`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          branch: BRANCH, title, description, type,
          dueDate, options: type === 'MULTIPLE_CHOICE' ? options.filter(Boolean) : undefined,
        }),
      });
      if (r.ok) {
        setTitle(''); setDescription(''); setDueDate('');
        await fetchHomework();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openGradingModal = async (hw: any) => {
    setSelectedHw(hw);
    const r = await fetch(`${API}/school/homework/${hw.id}/submissions`, { headers: authHeaders() });
    if (r.ok) setSubmissions(await r.json());
  };

  const saveGrade = async (submissionId: string) => {
    setGradingSubId(submissionId);
    const score = grades[submissionId] ?? 100;
    const notes = feedbacks[submissionId] ?? 'ممتاز كالعادة 🌟';
    await fetch(`${API}/school/homework/submissions/${submissionId}/grade?grade=${score}&feedback=${encodeURIComponent(notes)}`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    alert('✅ تم تصحيح إجابة الطالب وحفظ الدرجة!');
    setGradingSubId(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-4 sm:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <Link href="/branches/ikhlas-jeddah"
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-slate-300">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              📚 إدارة الواجبات الإلكترونية وتصحيح الإجابات
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              مدارس الإخلاص الأهلية بجدة — إرسال الواجبات اليومية ومتابعة إجابات الطلاب وتصحيحها
            </p>
          </div>
        </div>

        {/* Create Homework Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-indigo-400" /> إضافة واجب إلكتروني جديد
          </h2>

          <input placeholder="عنوان الواجب (مثال: واجب كتاب لغتي ص 15)" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition" />

          <textarea placeholder="وصف وتفاصيل الواجب والتعليمات المطلوب إنجازها..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition resize-none" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex gap-2">
              {(['TEXT', 'MULTIPLE_CHOICE'] as const).map((t) => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${type === t ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-white/20 text-slate-400'}`}>
                  {t === 'TEXT' ? '✍️ إجابة نصية' : '🔤 اختيار متعدد'}
                </button>
              ))}
            </div>

            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="bg-slate-900/90 border border-white/20 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-indigo-500 transition" />
          </div>

          {type === 'MULTIPLE_CHOICE' && (
            <div className="grid grid-cols-2 gap-2">
              {options.map((opt, i) => (
                <input key={i} placeholder={`الخيار ${i + 1}`} value={opt}
                  onChange={(e) => { const copy = [...options]; copy[i] = e.target.value; setOptions(copy); }}
                  className="bg-slate-900/90 border border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-indigo-500" />
              ))}
            </div>
          )}

          <button onClick={createHomework} disabled={submitting || !title || !description || !dueDate}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-sm px-6 py-2.5 rounded-xl shadow-lg transition-all disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            نشر الواجب لجميع الطلاب 🚀
          </button>
        </div>

        {/* Existing Homework List */}
        <div className="space-y-3">
          <h2 className="text-base font-black text-white">الواجبات الحالية في المنصة</h2>
          {loading && <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-400 mx-auto" /></div>}
          
          {homeworkList.map((hw) => (
            <div key={hw.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-black text-white text-base">{hw.title}</p>
                <p className="text-xs text-slate-400 mt-1">{hw.description}</p>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                  <span>⏰ تاريخ التسليم: {new Date(hw.dueDate).toLocaleDateString('ar-SA')}</span>
                  <span>عدد الإجابات: {hw.submissions?.length ?? 0}</span>
                </div>
              </div>
              
              <button onClick={() => openGradingModal(hw)}
                className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/30 text-indigo-300 text-xs px-4 py-2 rounded-xl font-bold transition-all">
                <FileText className="w-4 h-4" /> إجابات الطلاب والتصحيح
              </button>
            </div>
          ))}
          {!loading && !homeworkList.length && <p className="text-slate-500 text-center py-8">لا توجد واجبات مضافة بعد 📚</p>}
        </div>

        {/* Grading Submissions Modal */}
        {selectedHw && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/20 rounded-3xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto" dir="rtl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-black text-white text-lg">تصحيح إجابات: {selectedHw.title}</h3>
                <button onClick={() => setSelectedHw(null)} className="text-slate-400 hover:text-white text-sm font-bold">إغلاق ✕</button>
              </div>

              <div className="space-y-3">
                {submissions.map((sub) => (
                  <div key={sub.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                        <User className="w-4 h-4" /> {sub.student?.name ?? 'طالب'}
                      </p>
                      <span className="text-xs text-slate-500">{new Date(sub.submittedAt).toLocaleString('ar-SA')}</span>
                    </div>

                    <div className="bg-slate-950/60 p-3 rounded-xl border border-white/10 text-xs text-white">
                      <p className="text-slate-400 font-bold mb-1">الإجابة المرسلة:</p>
                      <p>{sub.answer}</p>
                    </div>

                    {/* Grading Controls */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-slate-400">الدرجة:</span>
                        <input type="number" min={0} max={100} defaultValue={sub.grade ?? 100}
                          onChange={(e) => setGrades({ ...grades, [sub.id]: Number(e.target.value) })}
                          className="w-16 bg-slate-950 border border-white/20 rounded-xl px-2 py-1 text-xs text-white text-center font-bold" />
                        <span className="text-xs text-indigo-400 font-bold">%</span>
                      </div>

                      <input placeholder="ملاحظة أو تشجيع للطالب..." defaultValue={sub.feedback ?? ''}
                        onChange={(e) => setFeedbacks({ ...feedbacks, [sub.id]: e.target.value })}
                        className="flex-1 bg-slate-950 border border-white/20 rounded-xl px-3 py-1 text-xs text-white" />

                      <button onClick={() => saveGrade(sub.id)} disabled={gradingSubId === sub.id}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold transition">
                        {gradingSubId === sub.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'حفظ الدرجة ✅'}
                      </button>
                    </div>
                  </div>
                ))}
                {!submissions.length && <p className="text-slate-500 text-center py-6">لم يرسل أي طالب إجابته بعد</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
