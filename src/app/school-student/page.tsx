import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, BookOpen, Video, CheckCircle, ChevronLeft,
  Loader2, Star, User, LogOut
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
  const [openHw, setOpenHw] = useState<any>(null);
  const [myAnswer, setMyAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string[]>([]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 text-white" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-teal-900/80 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-black text-white">🎒 بوابة الطالب</h1>
            <p className="text-xs text-teal-300">مدارس الإخلاص الأهلية — فصل 1/1</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-teal-600/40 border border-teal-500/40 flex items-center justify-center">
              <User className="w-5 h-5 text-teal-300" />
            </div>

            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="flex items-center gap-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 bg-slate-900/50">
        {([
          { key: 'schedule' as Tab, label: '📅 جدول اليوم', icon: Clock },
          { key: 'homework' as Tab, label: '📚 الواجبات', icon: BookOpen },
          { key: 'meetings' as Tab, label: '📹 الاجتماعات', icon: Video },
        ]).map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${tab === t.key ? 'text-teal-400 border-teal-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
          </div>
        )}

        {/* جدول اليوم */}
        {!loading && tab === 'schedule' && (
          <div className="space-y-3">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal-400" /> جدول اليوم — {todayName}
            </h2>
            {!dashboard?.todaySchedule?.length && (
              <div className="text-center py-12">
                <p className="text-4xl mb-2">🌙</p>
                <p className="text-slate-400">اليوم إجازة — استمتع بوقتك!</p>
              </div>
            )}
            {dashboard?.todaySchedule?.map((p: any) => {
              const colorClass = SUBJECT_COLORS[p.subjectName] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30';
              return (
                <div key={p.periodNumber} className={`flex items-center gap-3 p-3.5 rounded-xl border ${colorClass}`}>
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black">{p.periodNumber}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm">{p.subjectName}</p>
                    {p.teacherName && <p className="text-xs opacity-60">{p.teacherName}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold opacity-80">{p.startTime}</p>
                    <p className="text-xs opacity-50">{p.endTime}</p>
                  </div>
                </div>
              );
            })}

            {/* واجبات معلقة */}
            {!!dashboard?.pendingHomework?.length && (
              <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                <p className="text-xs font-black text-amber-400 mb-2">⚠️ {dashboard.pendingHomework.length} واجبات غير مكتملة</p>
                {dashboard.pendingHomework.slice(0, 2).map((hw: any) => (
                  <div key={hw.id} className="flex items-center justify-between py-1">
                    <span className="text-xs text-white">{hw.title}</span>
                    <button onClick={() => { setOpenHw(hw); setTab('homework'); }}
                      className="text-xs bg-amber-600/30 text-amber-400 px-2 py-0.5 rounded-lg hover:bg-amber-600/50 transition">
                      حلّها الآن
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
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                <button onClick={() => { setOpenHw(null); setMyAnswer(''); }}
                  className="text-xs text-slate-400 flex items-center gap-1 hover:text-slate-300 transition">
                  <ChevronLeft className="w-3 h-3" /> رجوع
                </button>
                <div>
                  <h3 className="font-black text-white text-xl">{openHw.title}</h3>
                  <p className="text-sm text-slate-400 mt-1">{openHw.description}</p>
                  <p className="text-xs text-amber-400 mt-1">⏰ آخر موعد: {new Date(openHw.dueDate).toLocaleDateString('ar-SA')}</p>
                </div>
                {openHw.type === 'MULTIPLE_CHOICE' ? (
                  <div className="space-y-2">
                    {(openHw.options as string[]).map((opt: string, i: number) => (
                      <button key={i} onClick={() => setMyAnswer(opt)}
                        className={`w-full text-right p-4 rounded-xl border text-sm font-bold transition-all ${myAnswer === opt ? 'bg-teal-500 border-teal-500 text-white scale-[1.01]' : 'border-white/20 text-slate-300 hover:border-teal-500/50 hover:bg-teal-500/10'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea placeholder="اكتب إجابتك هنا..." value={myAnswer} onChange={(e) => setMyAnswer(e.target.value)} rows={5}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 outline-none focus:border-teal-500 transition resize-none" />
                )}
                <button disabled={!myAnswer || submitting || submitted.includes(openHw.id)} onClick={submitAnswer}
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white py-3.5 rounded-xl font-black text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {submitted.includes(openHw.id) ? 'تم الإرسال بنجاح! ✅' : 'إرسال الإجابة للمعلم'}
                </button>
              </div>
            ) : (
              <>
                {!!dashboard?.pendingHomework?.length && (
                  <>
                    <h2 className="text-sm font-black text-amber-400">⏳ واجبات مطلوبة</h2>
                    {dashboard.pendingHomework.map((hw: any) => (
                      <div key={hw.id} className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 cursor-pointer hover:border-amber-500/60 transition"
                        onClick={() => setOpenHw(hw)}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-black text-white">{hw.title}</p>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{hw.description}</p>
                            <p className="text-xs text-amber-400 mt-1">⏰ {new Date(hw.dueDate).toLocaleDateString('ar-SA')}</p>
                          </div>
                          <span className="text-xs bg-amber-500 text-white px-2 py-1 rounded-full font-bold shrink-0">حلّه الآن</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {!!dashboard?.submittedHomework?.length && (
                  <>
                    <h2 className="text-sm font-black text-green-400 mt-4">✅ واجبات مكتملة</h2>
                    {dashboard.submittedHomework.map((sub: any) => (
                      <div key={sub.id} className="bg-green-500/5 border border-green-500/20 rounded-2xl p-3 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm text-white">{sub.homework?.title}</p>
                          <p className="text-xs text-slate-500">{new Date(sub.submittedAt).toLocaleDateString('ar-SA')}</p>
                        </div>
                        <div className="text-right">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                          {sub.grade !== null && sub.grade !== undefined && (
                            <p className="text-xs text-green-400 font-black mt-0.5">{sub.grade}%</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {!dashboard?.pendingHomework?.length && !dashboard?.submittedHomework?.length && (
                  <div className="text-center py-12">
                    <Star className="w-10 h-10 text-teal-400 mx-auto mb-3" />
                    <p className="text-slate-400">لا توجد واجبات الآن — أحسنت! 🌟</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* الاجتماعات */}
        {!loading && tab === 'meetings' && (
          <div className="space-y-3">
            <h2 className="text-base font-black text-white">📹 الاجتماعات القادمة</h2>
            {dashboard?.upcomingMeetings?.map((m: any) => (
              <div key={m.id} className="bg-white/5 border border-green-500/20 rounded-2xl p-4 space-y-2">
                <p className="font-black text-white text-base">{m.title}</p>
                <p className="text-xs text-slate-400">{new Date(m.scheduledAt).toLocaleString('ar-SA')} — {m.duration} دقيقة</p>
                {m.notes && <p className="text-xs text-slate-400">📝 {m.notes}</p>}
                <a href={m.meetingUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded-xl font-black transition-all">
                  <Video className="w-4 h-4" /> انضم الآن
                </a>
              </div>
            ))}
            {!dashboard?.upcomingMeetings?.length && (
              <div className="text-center py-12">
                <Video className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">لا توجد اجتماعات قادمة</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
