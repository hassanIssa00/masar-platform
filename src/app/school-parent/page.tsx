'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock, BookOpen, Video, MessageSquare, Camera,
  BarChart3, Bell, CheckCircle, Star, ChevronLeft,
  Home, User, Loader2,
} from 'lucide-react';
import { DAY_NAMES, SUBJECT_COLORS } from '@/data/ikhlasSchedule';

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
  const [tab, setTab] = useState<Tab>('home');
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [reactionSent, setReactionSent] = useState<Record<string, boolean>>({});

  // للواجب
  const [openHw, setOpenHw] = useState<any>(null);
  const [myAnswer, setMyAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string[]>([]);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-indigo-900/80 backdrop-blur-xl border-b border-white/10 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base font-black text-white flex items-center gap-2">
              👨‍👦 بوابة ولي الأمر
            </h1>
            <p className="text-xs text-indigo-300">مدارس الإخلاص الأهلية — فصل 1/1</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-600/40 border border-indigo-500/40 flex items-center justify-center">
            <User className="w-5 h-5 text-indigo-300" />
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-xl border-t border-white/10">
        <div className="max-w-2xl mx-auto grid grid-cols-7 gap-0.5 px-1 py-1.5">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-all ${tab === t.key ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}>
                <Icon className="w-4 h-4" />
                <span className="text-[9px] font-bold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 pb-24 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
          </div>
        )}

        {!loading && tab === 'home' && (
          <div className="space-y-4">
            {/* وقت الخروج */}
            {dashboard?.todayLog?.exitTime && (
              <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-emerald-400 font-bold">وقت خروج ابنك اليوم</p>
                  <p className="text-2xl font-black text-emerald-300">{dashboard.todayLog.exitTime}</p>
                </div>
                <CheckCircle className="w-6 h-6 text-emerald-400 mr-auto" />
              </div>
            )}

            {/* الأداء اليومي */}
            {dashboard?.todayLog && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-xs text-slate-400 mb-2 font-bold">📊 أداء ابنك اليوم</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                      style={{ width: `${dashboard.todayLog.performanceScore}%` }} />
                  </div>
                  <span className="text-lg font-black text-blue-400">{dashboard.todayLog.performanceScore}%</span>
                </div>
                <p className="text-xs mt-2 text-slate-400">
                  الحضور: {dashboard.todayLog.attendance === 'present' ? '✅ حاضر' : dashboard.todayLog.attendance === 'absent' ? '❌ غائب' : '⏰ متأخر'}
                </p>
              </div>
            )}

            {/* واجبات مفتوحة */}
            {dashboard?.openHomework?.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
                <p className="text-xs text-amber-400 font-black mb-2 flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5" /> {dashboard.openHomework.length} واجبات مطلوبة
                </p>
                {dashboard.openHomework.slice(0, 2).map((hw: any) => (
                  <div key={hw.id} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-white">{hw.title}</span>
                    <span className="text-xs text-amber-400">{new Date(hw.dueDate).toLocaleDateString('ar-SA')}</span>
                  </div>
                ))}
                <button onClick={() => setTab('homework')} className="text-xs text-amber-400 hover:text-amber-300 mt-1 flex items-center gap-1">
                  عرض الكل <ChevronLeft className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* اجتماع قادم */}
            {dashboard?.upcomingMeetings?.[0] && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4">
                <p className="text-xs text-green-400 font-black mb-1 flex items-center gap-1"><Video className="w-3.5 h-3.5" /> اجتماع قادم</p>
                <p className="text-sm font-bold text-white">{dashboard.upcomingMeetings[0].title}</p>
                <p className="text-xs text-slate-400 mb-2">{new Date(dashboard.upcomingMeetings[0].scheduledAt).toLocaleString('ar-SA')}</p>
                <a href={dashboard.upcomingMeetings[0].meetingUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded-xl font-bold transition-all">
                  <Video className="w-3 h-3" /> انضم للاجتماع
                </a>
              </div>
            )}

            {/* آخر تقرير أسبوعي */}
            {dashboard?.latestWeeklyReport && (
              <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/30 rounded-2xl p-4">
                <p className="text-xs text-violet-400 font-black mb-2 flex items-center gap-1"><Star className="w-3.5 h-3.5" /> التقرير الأسبوعي</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-black text-violet-300">{dashboard.latestWeeklyReport.attendanceDays}/5</p>
                    <p className="text-xs text-slate-500">أيام الحضور</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-violet-300">{dashboard.latestWeeklyReport.avgPerformance}%</p>
                    <p className="text-xs text-slate-500">متوسط الأداء</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-violet-300">{dashboard.latestWeeklyReport.homeworkDone}/{dashboard.latestWeeklyReport.homeworkTotal}</p>
                    <p className="text-xs text-slate-500">الواجبات</p>
                  </div>
                </div>
                {dashboard.latestWeeklyReport.teacherNotes && (
                  <p className="text-xs text-slate-400 mt-2 border-t border-white/10 pt-2">
                    💬 {dashboard.latestWeeklyReport.teacherNotes}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {!loading && tab === 'schedule' && (
          <div className="space-y-3">
            <h2 className="text-base font-black text-white">📅 جدول اليوم — {todayName}</h2>
            {dashboard?.todaySchedule?.length === 0 && <p className="text-slate-400 text-center py-8">🌙 اليوم إجازة</p>}
            {dashboard?.todaySchedule?.map((p: any) => {
              const colorClass = SUBJECT_COLORS[p.subjectName] ?? 'bg-slate-500/20 text-slate-300 border-slate-500/30';
              return (
                <div key={p.periodNumber} className={`flex items-center gap-3 p-3 rounded-xl border ${colorClass}`}>
                  <span className="text-xs font-black w-5 text-center opacity-60">{p.periodNumber}</span>
                  <span className="flex-1 font-bold text-sm">{p.subjectName}</span>
                  <span className="text-xs opacity-70">{p.startTime} – {p.endTime}</span>
                </div>
              );
            })}
          </div>
        )}

        {!loading && tab === 'homework' && (
          <div className="space-y-4">
            <h2 className="text-base font-black text-white">📚 الواجبات المطلوبة</h2>
            {openHw ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                <button onClick={() => { setOpenHw(null); setMyAnswer(''); }} className="text-xs text-slate-400 flex items-center gap-1">
                  <ChevronLeft className="w-3 h-3" /> رجوع
                </button>
                <h3 className="font-black text-white text-lg">{openHw.title}</h3>
                <p className="text-sm text-slate-400">{openHw.description}</p>
                {openHw.type === 'MULTIPLE_CHOICE' ? (
                  <div className="space-y-2">
                    {(openHw.options as string[]).map((opt: string, i: number) => (
                      <button key={i} onClick={() => setMyAnswer(opt)}
                        className={`w-full text-right p-3 rounded-xl border text-sm font-bold transition-all ${myAnswer === opt ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-white/20 text-slate-300 hover:border-white/40'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : (
                  <textarea placeholder="اكتب إجابتك هنا..." value={myAnswer} onChange={(e) => setMyAnswer(e.target.value)} rows={4}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-indigo-500 transition resize-none" />
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
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-black transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {submitted.includes(openHw.id) ? 'تم الإرسال ✅' : 'إرسال الإجابة'}
                </button>
              </div>
            ) : (
              <>
                {dashboard?.openHomework?.map((hw: any) => {
                  const done = submitted.includes(hw.id);
                  return (
                    <div key={hw.id} className={`rounded-2xl border p-4 cursor-pointer transition-all ${done ? 'border-green-500/30 bg-green-500/5 opacity-60' : 'border-white/10 bg-white/5 hover:border-indigo-500/50'}`}
                      onClick={() => !done && setOpenHw(hw)}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-black text-white">{hw.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{hw.description}</p>
                          <p className="text-xs text-amber-400 mt-1">⏰ التسليم: {new Date(hw.dueDate).toLocaleDateString('ar-SA')}</p>
                        </div>
                        {done ? (
                          <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                        ) : (
                          <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-1 rounded-full shrink-0 font-bold">ابدأ</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!dashboard?.openHomework?.length && <p className="text-slate-500 text-center py-10">✅ لا توجد واجبات مطلوبة الآن!</p>}
              </>
            )}
          </div>
        )}

        {!loading && tab === 'meetings' && (
          <div className="space-y-3">
            <h2 className="text-base font-black text-white">📹 الاجتماعات</h2>
            {dashboard?.upcomingMeetings?.map((m: any) => (
              <div key={m.id} className="bg-white/5 border border-green-500/20 rounded-2xl p-4">
                <p className="font-black text-white">{m.title}</p>
                <p className="text-xs text-slate-400 mt-1">{new Date(m.scheduledAt).toLocaleString('ar-SA')} — {m.duration} دقيقة</p>
                {m.notes && <p className="text-xs text-slate-400 mt-1">📝 {m.notes}</p>}
                <a href={m.meetingUrl} target="_blank" rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-500 text-white text-sm px-4 py-2 rounded-xl font-black transition-all">
                  <Video className="w-4 h-4" /> الانضمام للاجتماع
                </a>
              </div>
            ))}
            {!dashboard?.upcomingMeetings?.length && <p className="text-slate-500 text-center py-10">لا توجد اجتماعات قادمة</p>}
          </div>
        )}

        {!loading && tab === 'community' && (
          <div className="space-y-3">
            <h2 className="text-base font-black text-white">💬 مجتمع الآباء</h2>
            {dashboard?.communityPosts?.map((p: any) => (
              <div key={p.id} className={`rounded-2xl border p-4 ${p.pinned ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/10 bg-white/5'}`}>
                {p.pinned && <span className="text-xs text-amber-400 font-bold mb-1 block">📌 مثبّت</span>}
                <p className="text-sm text-white">{p.body}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500">{p.author?.name}</span>
                  <span className="text-xs text-slate-600">•</span>
                  <span className="text-xs text-slate-600">{new Date(p.createdAt).toLocaleDateString('ar-SA')}</span>
                </div>
              </div>
            ))}
            {!dashboard?.communityPosts?.length && <p className="text-slate-500 text-center py-10">لا توجد منشورات بعد</p>}
          </div>
        )}

        {!loading && tab === 'photos' && (
          <div className="space-y-4">
            <h2 className="text-base font-black text-white">📸 صور من الفصل</h2>
            <div className="grid grid-cols-2 gap-3">
              {dashboard?.recentPhotos?.map((ph: any) => (
                <div key={ph.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <img src={ph.photoUrl} alt={ph.caption ?? ''} className="w-full h-36 object-cover" />
                  {ph.caption && <p className="text-xs text-slate-400 p-2">{ph.caption}</p>}
                  <div className="px-2 pb-2 flex gap-1 flex-wrap">
                    {['❤️', '👏', '🌟', '😊'].map((emoji) => (
                      <button key={emoji} onClick={() => reactPhoto(ph.id, emoji)}
                        className="text-sm hover:scale-125 transition-transform">
                        {emoji}
                      </button>
                    ))}
                    {reactionSent[ph.id] && <span className="text-xs text-green-400">✓</span>}
                  </div>
                </div>
              ))}
              {!dashboard?.recentPhotos?.length && <div className="col-span-2 text-slate-500 text-center py-10">لا توجد صور بعد</div>}
            </div>
          </div>
        )}

        {!loading && tab === 'report' && (
          <div className="space-y-4">
            <h2 className="text-base font-black text-white">📊 تقارير ابنك</h2>
            {dashboard?.latestWeeklyReport ? (
              <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/30 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-violet-300">التقرير الأسبوعي</h3>
                  <span className="text-xs text-slate-500">
                    {dashboard.latestWeeklyReport.weekStart} — {dashboard.latestWeeklyReport.weekEnd}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: 'أيام الحضور', value: `${dashboard.latestWeeklyReport.attendanceDays}/5`, color: 'text-blue-400' },
                    { label: 'متوسط الأداء', value: `${dashboard.latestWeeklyReport.avgPerformance}%`, color: 'text-green-400' },
                    { label: 'الواجبات', value: `${dashboard.latestWeeklyReport.homeworkDone}/${dashboard.latestWeeklyReport.homeworkTotal}`, color: 'text-amber-400' },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/5 rounded-xl p-3">
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-slate-500 mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                {dashboard.latestWeeklyReport.teacherNotes && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <p className="text-xs text-violet-400 font-bold mb-1">ملاحظات المعلم:</p>
                    <p className="text-sm text-white">{dashboard.latestWeeklyReport.teacherNotes}</p>
                  </div>
                )}
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-xs text-slate-400 font-bold mb-2">أداء اليوم:</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                        style={{ width: `${dashboard.todayLog?.performanceScore ?? 0}%` }} />
                    </div>
                    <span className="text-sm font-black text-violet-400">{dashboard.todayLog?.performanceScore ?? 0}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                <Star className="w-10 h-10 text-violet-400 mx-auto mb-3" />
                <p className="text-slate-400">لا يوجد تقرير أسبوعي بعد</p>
                <p className="text-xs text-slate-600 mt-1">يتم إرساله كل يوم خميس</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
