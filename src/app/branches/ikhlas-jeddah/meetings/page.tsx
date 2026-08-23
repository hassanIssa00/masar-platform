'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Video, Plus, Send, ArrowRight, Loader2, Calendar, Clock, ExternalLink } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BRANCH = 'IKHLAS_JEDDAH';

function authHeaders() {
  return { 'Content-Type': 'application/json' };
}

export default function IkhlasMeetingsPage() {
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState(45);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/school/meetings?branch=${BRANCH}`, { headers: authHeaders() });
      if (r.ok) setMeetings(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const createMeeting = async () => {
    if (!title || !meetingUrl || !scheduledAt) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/school/meetings`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          branch: BRANCH, title, meetingUrl,
          scheduledAt, duration, notes: notes || undefined,
        }),
      });
      if (r.ok) {
        setTitle(''); setMeetingUrl(''); setScheduledAt(''); setNotes('');
        await fetchMeetings();
        alert('✅ تم إنشاء رومات الميتنج وإرسال الدعوة لجميع الطلاب وأولياء الأمور!');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 text-white p-4 sm:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <Link href="/branches/ikhlas-jeddah"
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-slate-300">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              📹 اجتماعات الفيديو المباشرة (الميتنج)
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              فصل د. إسماعيل عيسى — تجهيز اجتماعات الفصل وتوجيه رابط الدخول لكل الطلاب والآباء
            </p>
          </div>
        </div>

        {/* Create Meeting Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" /> إعداد اجتماع فيديو جديد
          </h2>

          <input placeholder="عنوان أو موضوع الاجتماع (مثال: لقاء أولياء الأمور الدوري)" value={title} onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition" />

          <input placeholder="رابط الدخول (Google Meet / Zoom URL)" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} dir="ltr"
            className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 transition" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)}
              className="bg-slate-900/90 border border-white/20 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-emerald-500" />

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">المدة المتوقعة:</span>
              <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}
                className="flex-1 bg-slate-900/90 border border-white/20 rounded-xl px-3 py-2 text-sm text-white outline-none">
                {[30, 45, 60, 90].map((d) => <option key={d} value={d}>{d} دقيقة</option>)}
              </select>
            </div>
          </div>

          <textarea placeholder="ملاحظات أو أجندة الاجتماع (اختياري)..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 resize-none" />

          <button onClick={createMeeting} disabled={submitting || !title || !meetingUrl || !scheduledAt}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm px-6 py-2.5 rounded-xl shadow-lg transition-all disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
            إرسال رابط الميتنج لجميع الطلاب وأولياء الأمور 🚀
          </button>
        </div>

        {/* Existing Meetings */}
        <div className="space-y-3">
          <h2 className="text-base font-black text-white">جدول الاجتماعات والقاءات</h2>
          {loading && <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-400 mx-auto" /></div>}
          
          {meetings.map((m) => (
            <div key={m.id} className="bg-white/5 border border-emerald-500/20 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-black text-white text-base">{m.title}</p>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" /> {new Date(m.scheduledAt).toLocaleString('ar-SA')} ({m.duration} دقيقة)
                </p>
                {m.notes && <p className="text-xs text-slate-400 mt-1">📝 {m.notes}</p>}
              </div>

              <a href={m.meetingUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded-xl font-black transition-all shadow-md">
                <ExternalLink className="w-4 h-4" /> انضم للغرفة الان
              </a>
            </div>
          ))}
          {!loading && !meetings.length && <p className="text-slate-500 text-center py-8">لا توجد اجتماعات مضافة بعد 📹</p>}
        </div>
      </div>
    </div>
  );
}
