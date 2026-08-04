'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, BookOpen, Video, CheckCircle, ChevronLeft,
  Loader2, Star, User, LogOut, Award, Sparkles
} from 'lucide-react';
import { DAY_NAMES, SUBJECT_COLORS } from '@/data/ikhlasSchedule';
import { clearSession } from '@/lib/localDb';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BRANCH = 'IKHLAS_JEDDAH';

function authHeaders() {
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('masar_token') ?? localStorage.getItem('access_token'))
    : null;
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

type Tab = 'schedule' | 'homework' | 'meetings';

export default function SchoolStudentPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('schedule');
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [studentName, setStudentName] = useState<string>('');
  const [openHw, setOpenHw] = useState<any>(null);
  const [myAnswer, setMyAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('user_name') || localStorage.getItem('masar_user');
      if (storedName) {
        try {
          const parsed = JSON.parse(storedName);
          setStudentName(parsed.name || parsed);
        } catch {
          setStudentName(storedName);
        }
      }
    }
  }, []);

  const handleLogout = () => {
    clearSession();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('masar_logged_in');
      localStorage.removeItem('masar_token');
      localStorage.removeItem('access_token');
      localStorage.removeItem('masar_user');
      localStorage.removeItem('user_role');
      localStorage.removeItem('user_name');
    }
    router.push('/login');
  };

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/school/student-dashboard?branch=${BRANCH}`, { headers: authHeaders() });
      if (r.ok) setDashboard(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const jsDay = new Date().getDay();
  const todayName = jsDay >= 0 && jsDay <= 4 ? DAY_NAMES[jsDay] : 'إجازة';

  const submitAnswer = async () => {
    if (!openHw || !myAnswer) return;
    setSubmitting(true);
    await fetch(`${API}/school/homework/${openHw.id}/submit`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ answer: myAnswer }),
    });
    setSubmitted((prev) => [...prev, openHw.id]);
    setSubmitting(false);
    setOpenHw(null);
    setMyAnswer('');
    await fetchDashboard();
  };

  const nameToDisplay = studentName || dashboard?.studentName || 'أحمد محمد علي';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      {/* Header - White Elegant Theme */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          
          {/* Student Profile Card Badge */}
          <div className="flex items-center gap-3 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/80 p-2 px-3.5 rounded-2xl shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-600 text-white font-black flex items-center justify-center text-lg shadow-sm">
              🎓
            </div>
            <div>
              <p className="text-[11px] font-bold text-teal-800 flex items-center gap-1">
                <span>أهلاً بك يا بطل</span>
                <Sparkles className="w-3 h-3 text-amber-500 fill-amber-500" />
              </p>
              <h1 className="text-sm font-black text-slate-900">{nameToDisplay}</h1>
            </div>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="تسجيل الخروج"
            className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-sm shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>

        </div>
      </div>

      {/* Tabs Nav - Light Mode */}
      <div className="sticky top-[61px] z-20 flex bg-white border-b border-slate-200 shadow-xs">
        {([
          { key: 'schedule' as Tab, label: '📅 جدول اليوم', icon: Clock },
          { key: 'homework' as Tab, label: '📚 الواجبات', icon: BookOpen },
          { key: 'meetings' as Tab, label: '📹 الاجتماعات', icon: Video },
        ]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-xs font-black transition-all border-b-2 ${
              tab === t.key
                ? 'text-teal-700 border-teal-600 bg-teal-50/50'
                : 'text-slate-500 border-transparent hover:text-slate-900'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        )}

        {/* جدول اليوم */}
        {!loading && tab === 'schedule' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" /> جدول الحصص اليومي — {todayName}
              </h2>
              <span className="text-[11px] bg-teal-50 text-teal-800 font-bold px-2.5 py-1 rounded-full border border-teal-200">
                مدارس الإخلاص (فصل 1/1)
              </span>
            </div>

            {!dashboard?.todaySchedule?.length && (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 shadow-sm">
                <p className="text-4xl mb-2">🌙</p>
                <p className="font-bold text-slate-700">اليوم إجازة — استمتع بوقتك يا بطل!</p>
              </div>
            )}

            {dashboard?.todaySchedule?.map((p: any) => {
              const colorClass = SUBJECT_COLORS[p.subjectName] ?? 'bg-slate-100 text-slate-800 border-slate-200';
              return (
                <div key={p.periodNumber} className={`flex items-center gap-3.5 p-3.5 rounded-2xl border ${colorClass} shadow-sm`}>
                  <div className="w-8 h-8 rounded-xl bg-white/80 border border-slate-200 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black text-slate-900">{p.periodNumber}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm">{p.subjectName}</p>
                    {p.teacherName && <p className="text-[11px] opacity-75">{p.teacherName}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold opacity-80">{p.startTime}</p>
                    <p className="text-[10px] opacity-60">{p.endTime}</p>
                  </div>
                </div>
              );
            })}

            {/* واجبات غير مكتملة */}
            {!!dashboard?.pendingHomework?.length && (
              <div className="mt-5 bg-amber-50 border border-amber-200 rounded-3xl p-4.5 shadow-sm space-y-2">
                <p className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> {dashboard.pendingHomework.length} واجبات تنتظر إجابتك!
                </p>
                {dashboard.pendingHomework.slice(0, 2).map((hw: any) => (
                  <div key={hw.id} className="bg-white border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{hw.title}</span>
                    <button onClick={() => { setOpenHw(hw); setTab('homework'); }}
                      className="text-xs bg-amber-600 text-white font-black px-3 py-1 rounded-xl shadow-sm hover:bg-amber-700 transition">
                      حلّها الآن ✍️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* الواجبات */}
        {!loading && tab === 'homework' && (
          <div className="space-y-4">
            {openHw ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
                <button onClick={() => { setOpenHw(null); setMyAnswer(''); }}
                  className="text-xs text-slate-500 font-bold flex items-center gap-1 hover:text-slate-800">
                  <ChevronLeft className="w-3.5 h-3.5" /> رجوع للقائمة
                </button>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">{openHw.title}</h3>
                  <p className="text-xs text-slate-600 mt-1">{openHw.description}</p>
                  <p className="text-[10px] text-amber-700 font-bold mt-1">⏰ آخر موعد: {new Date(openHw.dueDate).toLocaleDateString('ar-SA')}</p>
                </div>
                {openHw.type === 'MULTIPLE_CHOICE' ? (
                  <div className="space-y-2">
                    {(openHw.options as string[]).map((opt: string, i: number) => (
                      <button key={i} onClick={() => setMyAnswer(opt)}
                        className={`w-full text-right p-3.5 rounded-2xl border text-xs font-bold transition-all ${
                          myAnswer === opt ? 'bg-teal-600 border-teal-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-teal-300'
                        }`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea placeholder="اكتب إجابتك هنا يا بطل..." value={myAnswer} onChange={(e) => setMyAnswer(e.target.value)} rows={4}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-500 transition resize-none" />
                )}
                <button disabled={!myAnswer || submitting || submitted.includes(openHw.id)} onClick={submitAnswer}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-2xl font-black text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {submitted.includes(openHw.id) ? 'تم الإرسال بنجاح! ✅' : 'إرسال الإجابة للمعلم'}
                </button>
              </div>
            ) : (
              <>
                {!!dashboard?.pendingHomework?.length && (
                  <>
                    <h2 className="text-xs font-black text-amber-900">⏳ واجبات مطلوبة</h2>
                    {dashboard.pendingHomework.map((hw: any) => (
                      <div key={hw.id} onClick={() => setOpenHw(hw)}
                        className="bg-white border border-amber-200 rounded-3xl p-4 shadow-sm cursor-pointer hover:border-teal-400 transition">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-black text-sm text-slate-900">{hw.title}</p>
                            <p className="text-xs text-slate-600 mt-0.5">{hw.description}</p>
                            <p className="text-[10px] text-amber-700 font-bold mt-1">⏰ {new Date(hw.dueDate).toLocaleDateString('ar-SA')}</p>
                          </div>
                          <span className="text-xs bg-teal-600 text-white font-bold px-3.5 py-1.5 rounded-full shrink-0 shadow-sm">حلّه الآن ✍️</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {!!dashboard?.submittedHomework?.length && (
                  <>
                    <h2 className="text-xs font-black text-emerald-900 mt-4">✅ واجبات مكتملة</h2>
                    {dashboard.submittedHomework.map((sub: any) => (
                      <div key={sub.id} className="bg-emerald-50/50 border border-emerald-200 rounded-3xl p-3.5 flex items-center justify-between shadow-xs">
                        <div>
                          <p className="font-black text-xs text-slate-900">{sub.homework?.title}</p>
                          <p className="text-[10px] text-slate-500">{new Date(sub.submittedAt).toLocaleDateString('ar-SA')}</p>
                        </div>
                        <div className="text-right">
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                          {sub.grade !== null && sub.grade !== undefined && (
                            <p className="text-xs text-emerald-700 font-black mt-0.5">{sub.grade}%</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {!dashboard?.pendingHomework?.length && !dashboard?.submittedHomework?.length && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 shadow-sm">
                    <Star className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">لا توجد واجبات الآن — أحسنت يا بطل! 🌟</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* الاجتماعات */}
        {!loading && tab === 'meetings' && (
          <div className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Video className="w-4 h-4 text-teal-600" /> الاجتماعات القادمة
            </h2>
            {dashboard?.upcomingMeetings?.map((m: any) => (
              <div key={m.id} className="bg-white border border-slate-200 rounded-3xl p-4.5 space-y-2 shadow-sm">
                <p className="font-black text-slate-900 text-base">{m.title}</p>
                <p className="text-xs text-slate-600">{new Date(m.scheduledAt).toLocaleString('ar-SA')} ({m.duration} دقيقة)</p>
                <a href={m.meetingUrl} target="_blank" rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs px-4 py-2 rounded-xl font-black transition-all shadow-sm">
                  <Video className="w-3.5 h-3.5" /> الانضمام الآن
                </a>
              </div>
            ))}
            {!dashboard?.upcomingMeetings?.length && (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500 shadow-sm">
                لا توجد اجتماعات قادمة
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
