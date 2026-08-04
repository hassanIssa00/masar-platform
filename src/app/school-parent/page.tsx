'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, BookOpen, Video, MessageSquare, Camera,
  BarChart3, Bell, CheckCircle, Star, ChevronLeft,
  Home, User, Loader2, Heart, Sparkles, AlertTriangle, LogOut
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

type Tab = 'home' | 'schedule' | 'homework' | 'meetings' | 'community' | 'photos' | 'report';

export default function SchoolParentPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('home');
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState<string>('');
  const [reactionSent, setReactionSent] = useState<Record<string, boolean>>({});

  // الواجب
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
          setParentName(parsed.name || parsed);
        } catch {
          setParentName(storedName);
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

  const studentId = typeof window !== 'undefined'
    ? (localStorage.getItem('school_student_id') ?? 'demo-student')
    : 'demo-student';

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/school/parent-dashboard?branch=${BRANCH}&studentId=${studentId}`, { headers: authHeaders() });
      if (r.ok) setDashboard(await r.json());
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const reactPhoto = async (photoId: string, emoji: string) => {
    await fetch(`${API}/school/photos/${photoId}/react`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ emoji }),
    });
    setReactionSent((prev) => ({ ...prev, [photoId]: true }));
    await fetchDashboard();
  };

  const jsDay = new Date().getDay();
  const todayName = jsDay >= 0 && jsDay <= 4 ? DAY_NAMES[jsDay] : 'إجازة';

  const tabs = [
    { key: 'home' as Tab,      label: 'الرئيسية',  icon: Home },
    { key: 'schedule' as Tab,  label: 'الجدول',    icon: Clock },
    { key: 'homework' as Tab,  label: 'الواجبات',  icon: BookOpen },
    { key: 'meetings' as Tab,  label: 'الاجتماعات',icon: Video },
    { key: 'community' as Tab, label: 'المجتمع',   icon: MessageSquare },
    { key: 'photos' as Tab,    label: 'الصور',     icon: Camera },
    { key: 'report' as Tab,    label: 'التقارير',  icon: BarChart3 },
  ];

  const displayName = parentName ? `أهلاً بك أ. ${parentName} 👋` : 'أهلاً بك يا ولي الأمر 👋';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      {/* Header - White Elegant Theme */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
              {displayName}
            </h1>
            <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              مدارس الإخلاص الأهلية بجدة — متابعة فصل 1/1
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-inner">
              <User className="w-5 h-5 text-emerald-700" />
            </div>
            
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-2xl text-xs font-black transition-all shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Nav - Light Mode Glass */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl">
        <div className="max-w-2xl mx-auto grid grid-cols-7 gap-0.5 px-1 py-2">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex flex-col items-center gap-1 py-1.5 rounded-xl transition-all ${
                  active ? 'text-emerald-700 bg-emerald-50 font-black shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}>
                <Icon className={`w-4 h-4 ${active ? 'text-emerald-700 stroke-[2.5]' : ''}`} />
                <span className="text-[10px]">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        )}

        {/* ══════════════ الرئيسية ══════════════ */}
        {!loading && tab === 'home' && (
          <div className="space-y-4">
            {/* تنبيه تأخر استلام الطفل العاجل */}
            {dashboard?.todayLog?.lateAlertSent && (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-4.5 flex items-center gap-3.5 animate-pulse shadow-md shadow-rose-100">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-200 flex items-center justify-center shrink-0">
                  <Bell className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-black text-rose-900">🚨 تنبيه عاجل من إدارة المدرسة!</p>
                  <p className="text-xs text-rose-700 mt-0.5 font-bold">
                    نود تذكيركم بأن اليوم الدراسي قد انتهى، يرجى الحضور فوراً لاستلام الطفل من بوابة المدرسة.
                  </p>
                </div>
              </div>
            )}

            {/* وقت الخروج الموثق بالدقيقة */}
            {dashboard?.todayLog?.exitTime && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4.5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-emerald-700" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-emerald-800 font-bold">توقيت خروج ابنك الموثق اليوم 🕒</p>
                  <p className="text-3xl font-black text-emerald-900 mt-0.5">{dashboard.todayLog.exitTime}</p>
                </div>
                <CheckCircle className="w-7 h-7 text-emerald-600 shrink-0" />
              </div>
            )}

            {/* تقييم الأداء اليومي */}
            {dashboard?.todayLog && (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-slate-700">📊 تقييم أداء ابنك اليومي في الفصل</p>
                  <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                    {dashboard.todayLog.attendance === 'present' ? '✅ حاضر' : dashboard.todayLog.attendance === 'absent' ? '❌ غائب' : '⏰ متأخر'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                      style={{ width: `${dashboard.todayLog.performanceScore}%` }} />
                  </div>
                  <span className="text-xl font-black text-emerald-700">{dashboard.todayLog.performanceScore}%</span>
                </div>
              </div>
            )}

            {/* واجبات مطلوبة */}
            {dashboard?.openHomework?.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-amber-900 font-black flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-amber-600" /> {dashboard.openHomework.length} واجبات إلكترونية مطلوبة
                  </p>
                  <button onClick={() => setTab('homework')} className="text-xs text-amber-700 font-bold hover:underline flex items-center gap-0.5">
                    عرض الكل <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {dashboard.openHomework.slice(0, 2).map((hw: any) => (
                    <div key={hw.id} className="bg-white border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{hw.title}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                        تسليم: {new Date(hw.dueDate).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* اجتماع فيديو قادم */}
            {dashboard?.upcomingMeetings?.[0] && (
              <div className="bg-blue-50 border border-blue-200 rounded-3xl p-5 shadow-sm space-y-2">
                <p className="text-xs text-blue-900 font-black flex items-center gap-1.5"><Video className="w-4 h-4 text-blue-600" /> اجتماع ميتنج قادم</p>
                <p className="text-sm font-black text-slate-900">{dashboard.upcomingMeetings[0].title}</p>
                <p className="text-xs text-slate-600">{new Date(dashboard.upcomingMeetings[0].scheduledAt).toLocaleString('ar-SA')}</p>
                <a href={dashboard.upcomingMeetings[0].meetingUrl} target="_blank" rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-xl font-black transition-all shadow-sm">
                  <Video className="w-3.5 h-3.5" /> انضمام للاجتماع المباشر
                </a>
              </div>
            )}

            {/* التقرير الأسبوعي */}
            {dashboard?.latestWeeklyReport && (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                <p className="text-xs text-slate-800 font-black flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500 fill-amber-500" /> التقرير الأسبوعي الشامل</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <p className="text-lg font-black text-emerald-700">{dashboard.latestWeeklyReport.attendanceDays}/5</p>
                    <p className="text-[10px] text-slate-500 font-bold">أيام الحضور</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <p className="text-lg font-black text-blue-700">{dashboard.latestWeeklyReport.avgPerformance}%</p>
                    <p className="text-[10px] text-slate-500 font-bold">متوسط الأداء</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <p className="text-lg font-black text-amber-600">{dashboard.latestWeeklyReport.homeworkDone}/{dashboard.latestWeeklyReport.homeworkTotal}</p>
                    <p className="text-[10px] text-slate-500 font-bold">الواجبات</p>
                  </div>
                </div>
                {dashboard.latestWeeklyReport.teacherNotes && (
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    💬 <span className="font-bold">ملاحظات المعلم:</span> {dashboard.latestWeeklyReport.teacherNotes}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ جدول الحصص ══════════════ */}
        {!loading && tab === 'schedule' && (
          <div className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" /> جدول حصص اليوم — {todayName}
            </h2>
            {dashboard?.todaySchedule?.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500">
                🌙 اليوم إجازة رسمية
              </div>
            )}
            {dashboard?.todaySchedule?.map((p: any) => {
              const colorClass = SUBJECT_COLORS[p.subjectName] ?? 'bg-slate-100 text-slate-800 border-slate-200';
              return (
                <div key={p.periodNumber} className={`flex items-center gap-3.5 p-3.5 rounded-2xl border ${colorClass} shadow-sm`}>
                  <div className="w-8 h-8 rounded-xl bg-white/80 border border-slate-200 flex items-center justify-center shrink-0">
                    <span className="text-xs font-black">{p.periodNumber}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-sm">{p.subjectName}</p>
                  </div>
                  <span className="text-xs font-bold opacity-80">{p.startTime} – {p.endTime}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════ الواجبات ══════════════ */}
        {!loading && tab === 'homework' && (
          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" /> الواجبات الإلكترونية
            </h2>

            {openHw ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
                <button onClick={() => { setOpenHw(null); setMyAnswer(''); }} className="text-xs text-slate-500 font-bold flex items-center gap-1 hover:text-slate-800">
                  <ChevronLeft className="w-3.5 h-3.5" /> رجوع للقائمة
                </button>
                <div>
                  <h3 className="font-black text-slate-900 text-lg">{openHw.title}</h3>
                  <p className="text-xs text-slate-600 mt-1">{openHw.description}</p>
                </div>
                {openHw.type === 'MULTIPLE_CHOICE' ? (
                  <div className="space-y-2">
                    {(openHw.options as string[]).map((opt: string, i: number) => (
                      <button key={i} onClick={() => setMyAnswer(opt)}
                        className={`w-full text-right p-3.5 rounded-2xl border text-xs font-bold transition-all ${
                          myAnswer === opt ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-800 hover:border-emerald-300'
                        }`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea placeholder="اكتب إجابتك هنا..." value={myAnswer} onChange={(e) => setMyAnswer(e.target.value)} rows={4}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 transition resize-none" />
                )}
                <button disabled={!myAnswer || submitting || submitted.includes(openHw.id)}
                  onClick={async () => {
                    setSubmitting(true);
                    await fetch(`${API}/school/homework/${openHw.id}/submit`, {
                      method: 'POST', headers: authHeaders(),
                      body: JSON.stringify({ answer: myAnswer }),
                    });
                    setSubmitted((prev) => [...prev, openHw.id]);
                    setSubmitting(false);
                    setOpenHw(null);
                    setMyAnswer('');
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-2xl font-black text-xs transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-md">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {submitted.includes(openHw.id) ? 'تم الإرسال بنجاح! ✅' : 'إرسال الإجابة للمعلم'}
                </button>
              </div>
            ) : (
              <>
                {dashboard?.openHomework?.map((hw: any) => {
                  const done = submitted.includes(hw.id);
                  return (
                    <div key={hw.id} onClick={() => !done && setOpenHw(hw)}
                      className={`bg-white border rounded-3xl p-4 transition-all cursor-pointer shadow-sm ${
                        done ? 'border-emerald-200 bg-emerald-50/50 opacity-70' : 'border-slate-200 hover:border-emerald-400'
                      }`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-sm text-slate-900">{hw.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5">{hw.description}</p>
                          <p className="text-[10px] text-amber-700 font-bold mt-1.5">⏰ التسليم: {new Date(hw.dueDate).toLocaleDateString('ar-SA')}</p>
                        </div>
                        {done ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                          <span className="text-xs bg-emerald-600 text-white font-bold px-3 py-1 rounded-full shrink-0">حلّ الواجب</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!dashboard?.openHomework?.length && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500">
                    ✅ لا توجد واجبات مطلوبة حالياً
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════ الاجتماعات ══════════════ */}
        {!loading && tab === 'meetings' && (
          <div className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Video className="w-4 h-4 text-emerald-600" /> اجتماعات الفيديو
            </h2>
            {dashboard?.upcomingMeetings?.map((m: any) => (
              <div key={m.id} className="bg-white border border-slate-200 rounded-3xl p-4.5 space-y-2 shadow-sm">
                <p className="font-black text-slate-900 text-base">{m.title}</p>
                <p className="text-xs text-slate-600">{new Date(m.scheduledAt).toLocaleString('ar-SA')} ({m.duration} دقيقة)</p>
                <a href={m.meetingUrl} target="_blank" rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-xl font-black transition-all shadow-sm">
                  <Video className="w-3.5 h-3.5" /> الانضمام للغرفة الان
                </a>
              </div>
            ))}
            {!dashboard?.upcomingMeetings?.length && (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500">
                لا توجد اجتماعات قادمة
              </div>
            )}
          </div>
        )}

        {/* ══════════════ المجتمع ══════════════ */}
        {!loading && tab === 'community' && (
          <div className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" /> مجتمع وتنبيهات الآباء
            </h2>
            {dashboard?.communityPosts?.map((p: any) => (
              <div key={p.id} className={`bg-white border rounded-3xl p-4.5 shadow-sm space-y-2 ${p.pinned ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'}`}>
                {p.pinned && <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full inline-block">📌 إعلان مثبّت</span>}
                <p className="text-xs text-slate-900 font-bold leading-relaxed">{p.body}</p>
                <p className="text-[10px] text-slate-400">{new Date(p.createdAt).toLocaleString('ar-SA')}</p>
              </div>
            ))}
            {!dashboard?.communityPosts?.length && (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500">
                لا توجد منشورات بعد
              </div>
            )}
          </div>
        )}

        {/* ══════════════ الصور ══════════════ */}
        {!loading && tab === 'photos' && (
          <div className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" /> صور الفصل اليومية
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {dashboard?.recentPhotos?.map((ph: any) => (
                <div key={ph.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                  <img src={ph.photoUrl} alt={ph.caption ?? ''} className="w-full h-36 object-cover" />
                  {ph.caption && <p className="text-xs text-slate-700 p-2.5 font-bold">{ph.caption}</p>}
                  <div className="p-2 pt-0 flex gap-1.5">
                    {['❤️', '👏', '🌟', '😊'].map((emoji) => (
                      <button key={emoji} onClick={() => reactPhoto(ph.id, emoji)}
                        className="text-sm hover:scale-125 transition-transform">
                        {emoji}
                      </button>
                    ))}
                    {reactionSent[ph.id] && <span className="text-xs text-emerald-600 font-bold">✓</span>}
                  </div>
                </div>
              ))}
              {!dashboard?.recentPhotos?.length && (
                <div className="col-span-2 bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500">
                  لا توجد صور بعد
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ التقارير ══════════════ */}
        {!loading && tab === 'report' && (
          <div className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" /> التقرير الأسبوعي لتقييم طفلك
            </h2>
            {dashboard?.latestWeeklyReport ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-slate-900 text-base">التقرير التراكمي الأسبوعي</h3>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                    {dashboard.latestWeeklyReport.weekStart} — {dashboard.latestWeeklyReport.weekEnd}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <p className="text-xl font-black text-emerald-700">{dashboard.latestWeeklyReport.attendanceDays}/5</p>
                    <p className="text-[10px] text-slate-500 font-bold">أيام الحضور</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <p className="text-xl font-black text-blue-700">{dashboard.latestWeeklyReport.avgPerformance}%</p>
                    <p className="text-[10px] text-slate-500 font-bold">متوسط الأداء</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <p className="text-xl font-black text-amber-600">{dashboard.latestWeeklyReport.homeworkDone}/{dashboard.latestWeeklyReport.homeworkTotal}</p>
                    <p className="text-[10px] text-slate-500 font-bold">الواجبات</p>
                  </div>
                </div>
                {dashboard.latestWeeklyReport.teacherNotes && (
                  <div className="bg-emerald-50/50 border border-emerald-200 p-3.5 rounded-2xl text-xs text-slate-800">
                    <p className="font-black text-emerald-900 mb-1">💬 ملاحظات وتوصيات المعلم:</p>
                    <p>{dashboard.latestWeeklyReport.teacherNotes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500">
                <Star className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="font-bold">لا يوجد تقرير أسبوعي بعد</p>
                <p className="text-xs text-slate-400 mt-1">يتم إصدار التقرير الأسبوعي كل يوم خميس</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
