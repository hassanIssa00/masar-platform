'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, BookOpen, Video, MessageSquare, Camera,
  BarChart3, Bell, CheckCircle, Star, ChevronLeft,
  Home, User, Loader2, Heart, Sparkles, AlertTriangle, LogOut,
  ScanFace, X, GraduationCap, Calendar, Phone, Building2, ShieldCheck,
  Trophy, Medal, Award, Gift
} from 'lucide-react';
import { DAY_NAMES, SUBJECT_COLORS } from '@/data/ikhlasSchedule';
import Image from 'next/image';
import { clearSession, getAccounts, getSession, getStudents, getSurveys, hydrateSessionFromServer, StudentRecord } from '@/lib/cloudStore';
import StudentProfileCard from '@/components/StudentProfileCard';
import StudentAchievementsTab from '@/components/StudentAchievementsTab';
import OverviewScheduleBoard from '@/components/OverviewScheduleBoard';
import { findMatchingStudentForParent } from '@/lib/nameMatching';
import { getLocalHomework } from '@/lib/homework';
import { pullCloudDataToLocal } from '@/lib/firestoreSync';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

function authHeaders() {
  return { 'Content-Type': 'application/json' };
}

type Tab = 'home' | 'achievements' | 'schedule' | 'homework' | 'meetings' | 'community' | 'photos' | 'report';

export default function SchoolParentPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('home');
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState<string>('');
  const [studentRecord, setStudentRecord] = useState<StudentRecord | null>(null);
  const [hasSurvey, setHasSurvey] = useState(true);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [reactionSent, setReactionSent] = useState<Record<string, boolean>>({});
  const [branch, setBranch] = useState<string>('MASAR');

  // الواجب
  const [openHw, setOpenHw] = useState<any>(null);
  const [myAnswer, setMyAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadSchoolParent = async () => {
      // Auth guard
      const session = getSession() ?? await hydrateSessionFromServer();
      if (cancelled) return;
      if (!session) {
        router.replace('/login');
        return;
      }
      if (session.role === 'doctor' || session.role === 'specialist') {
        router.replace('/dashboard');
        return;
      }
      if (session.role === 'student') {
        router.replace('/school-student');
        return;
      }

      // Read branch from session
      const sessionBranch = (session as any)?.schoolBranch || 'MASAR';
      setBranch(sessionBranch);

      // Set parent name from session directly
      setParentName(session.name || 'ولي الأمر');

      // Pull latest data from cloud before searching
      await pullCloudDataToLocal(['students', 'accounts', 'surveys']).catch(() => {});
      if (cancelled) return;

      // Retrieve linked student record
      const allStudents = getStudents();
      const allAccounts = getAccounts();
      const activeId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('student') : null;
      const parentAcc = allAccounts.find((a) => a.id === session.id || a.email === session.email) as any;
      const parentProfile = {
        ...session,
        ...parentAcc,
        id: session.id,
        email: session.email || parentAcc?.email,
        phone: session.phone || parentAcc?.phone,
        schoolBranch: session.schoolBranch || parentAcc?.schoolBranch,
      };
      const linkedStudentId = (session as any)?.linkedStudentId || parentAcc?.linkedStudentId;

      // Priority 1: linkedStudentId from account
      let linked: StudentRecord | null = null;
      if (linkedStudentId) {
        linked = allStudents.find((s) => s.id === linkedStudentId) || null;
      }
      // Priority 2: intelligent patronymic and credentials matching
      if (!linked) {
        linked = findMatchingStudentForParent(parentProfile, allStudents) || null;
      }

      if (activeId) {
        const byUrl = allStudents.find((s) => s.id === activeId) || null;
        const urlOwned = byUrl && (
          byUrl.id === linkedStudentId ||
          byUrl.parentAccountId === session.id ||
          byUrl.linkedParentId === session.id ||
          byUrl.linkedParentEmail === session.email ||
          parentAcc?.linkedStudentId === byUrl.id
        );
        if (urlOwned) {
          linked = byUrl;
        }
      }

      if (linked) {
        setStudentRecord(linked);
        const allSurveys = getSurveys();
        const surveyDone = allSurveys.some(
          (s) => s.studentId === linked?.id ||
          (session?.email && s.parentEmail?.toLowerCase() === session.email.toLowerCase()) ||
          (session?.phone && s.parentPhone === session.phone)
        );
        setHasSurvey(surveyDone);

        // If survey is NOT done, redirect parent to complete the survey first
        if (!surveyDone) {
          router.replace(`/survey?student=${encodeURIComponent(linked.id)}&flow=parent`);
          return;
        }
      } else {
        // No linked student found — redirect to data form to fill student info
        router.replace('/student/new?flow=parent');
        return;
      }
    };
    void loadSchoolParent();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const studentId = studentRecord?.id ?? getSession()?.id ?? 'demo-student';

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/school/parent-dashboard?branch=${branch}&studentId=${studentId}`, { headers: authHeaders() });
      if (r.ok) setDashboard(await r.json());
    } finally {
      setLoading(false);
    }
  }, [studentId, branch]);

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

  const allCombinedHomework = useMemo(() => {
    const local = getLocalHomework();
    const apiHw = dashboard?.openHomework || [];
    const map = new Map<string, any>();
    apiHw.forEach((h: any) => map.set(h.id, h));
    local.forEach((h: any) => {
      if (!map.has(h.id)) {
        map.set(h.id, {
          id: h.id,
          title: h.title,
          description: h.description,
          dueDate: h.dueDate,
          type: 'TEXT',
        });
      }
    });
    return Array.from(map.values());
  }, [dashboard?.openHomework]);

  const childFirstName = (studentRecord?.fullName || 'البطل').trim().split(' ')[0];

  const tabs = [
    { key: 'home' as Tab,          label: 'الرئيسية',  icon: Home },
    { key: 'achievements' as Tab,  label: `إنجازات ${childFirstName} 🏆`, icon: Trophy },
    { key: 'schedule' as Tab,      label: 'الجدول',    icon: Clock },
    { key: 'homework' as Tab,      label: 'الواجبات',  icon: BookOpen },
    { key: 'meetings' as Tab,      label: 'الاجتماعات',icon: Video },
    { key: 'community' as Tab,     label: 'المجتمع',   icon: MessageSquare },
    { key: 'photos' as Tab,        label: 'الصور',     icon: Camera },
    { key: 'report' as Tab,        label: 'التقارير',  icon: BarChart3 },
  ];

  const displayName = parentName ? `أهلاً بك أ. ${parentName} 👋` : 'أهلاً بك يا ولي الأمر 👋';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      {/* Header - White Elegant Theme */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
              {displayName}
            </h1>
            <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              فصل د. إسماعيل عيسى — متابعة الطالب
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Student Info Button (User Icon) */}
            <button
              onClick={() => setShowStudentModal(true)}
              title="عرض بطاقة بيانات ابنك الطالب"
              className="w-10 h-10 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-400/60 flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer ring-2 ring-emerald-500/20"
            >
              <User className="w-5 h-5 text-emerald-700" />
            </button>
            
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-2xl text-xs font-black transition-all shadow-sm active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Floating Bottom Navigation Bar */}
      <div className="fixed bottom-3 left-2 right-2 max-w-3xl mx-auto z-40 bg-white/95 backdrop-blur-xl border-2 border-emerald-500/30 shadow-2xl rounded-3xl p-1.5 ring-4 ring-emerald-500/10">
        <div className="grid grid-cols-8 gap-0.5 sm:gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-black shadow-lg shadow-emerald-600/30 scale-105'
                    : 'text-slate-600 hover:text-slate-900 font-bold hover:bg-slate-100/80'
                }`}>
                <Icon className={`w-4 h-4 ${active ? 'text-white stroke-[2.5]' : 'text-slate-600'}`} />
                <span className="text-[10px] leading-none">{t.label}</span>
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
            {/* Required Parent Survey Banner */}
            {!hasSurvey && studentRecord && (
              <div className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm font-black text-xl">
                    📝
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-950">استبيان ولي الأمر مطلوب ⚠️</h3>
                    <p className="text-xs font-bold text-amber-800 mt-0.5">
                      يرجى استكمال استبيان ولي الأمر عن الطالب (<strong>{studentRecord.fullName}</strong>) لمساعدة د. إسماعيل عيسى في تخصيص الخطة والتقييم.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/survey?student=${studentRecord.id}&flow=parent`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 px-5 py-2.5 text-xs font-black text-white transition shadow-sm shrink-0 active:scale-95"
                >
                  <span>تعبئة الاستبيان الآن</span>
                  <ChevronLeft size={14} />
                </Link>
              </div>
            )}

            {/* Face Biometric Enrollment Banner for Parent */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-5 text-white shadow-xl border border-emerald-700/50 relative overflow-hidden flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-inner">
                  <ScanFace size={24} className="text-emerald-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-white">تسجيل الوجه البيومتري 📷</h3>
                    <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-400/30">دخول سريع</span>
                  </div>
                  <p className="text-xs font-bold text-teal-100 opacity-90 mt-0.5">
                    سجّل ملامح وجهك الآن لتبدأ الدخول المباشر للمنصة بمجرد النظر للكاميرا بدون كلمة مرور
                  </p>
                </div>
              </div>
              <Link
                href="/face-enroll"
                className="shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs px-4 py-3 rounded-2xl shadow-lg transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <span>سجّل وجهك</span>
                <ChevronLeft size={14} />
              </Link>
            </div>

            {/* Child Profile Card */}
            {studentRecord && (
              <StudentProfileCard
                student={{
                  fullName: studentRecord.fullName,
                  grade: studentRecord.grade,
                  photoUrl: studentRecord.photoUrl,
                  parentName: studentRecord.parentName,
                  parentPhone: studentRecord.parentPhone,
                  nationalId: studentRecord.nationalId,
                  dateOfBirth: studentRecord.dateOfBirth,
                  notes: studentRecord.notes,
                }}
                variant="parent"
                showParent={false}
              />
            )}

            {/* Achievements Banner Link */}
            {studentRecord && (
              <div
                onClick={() => setTab('achievements')}
                className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 rounded-3xl p-5 text-slate-950 shadow-lg border-2 border-amber-300 relative overflow-hidden flex items-center justify-between gap-4 cursor-pointer hover:shadow-xl transition active:scale-98"
              >
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-white/30 border border-white/40 flex items-center justify-center shrink-0 shadow-inner text-2xl">
                    🏆
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-950">إنجازات وجوائز البطل {childFirstName} 🏆</h3>
                    <p className="text-xs font-bold text-amber-950 mt-0.5">
                      استعراض شهادات التفوق المعتمدة، الأوسمة، والجوائز من د. إسماعيل عيسى
                    </p>
                  </div>
                </div>
                <div className="shrink-0 bg-slate-950 text-white font-black text-xs px-4 py-2.5 rounded-2xl shadow-md transition flex items-center gap-1.5">
                  <span>عرض الإنجازات</span>
                  <ChevronLeft size={14} />
                </div>
              </div>
            )}

            {/* Daily Schedule Timeline Board for Parent */}
            <div className="pt-1">
              <OverviewScheduleBoard
                variant="parent"
                studentName={studentRecord?.fullName}
                onNavigateTab={(t) => {
                  if (t === 'schedule') setTab('schedule');
                  else setTab(t as Tab);
                }}
              />
            </div>

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
            {allCombinedHomework.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-amber-900 font-black flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-amber-600" /> {allCombinedHomework.length} واجبات إلكترونية مطلوبة
                  </p>
                  <button onClick={() => setTab('homework')} className="text-xs text-amber-700 font-bold hover:underline flex items-center gap-0.5">
                    عرض الكل <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {allCombinedHomework.slice(0, 2).map((hw: any) => (
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

        {/* ══════════════ إنجازات البطل ══════════════ */}
        {!loading && tab === 'achievements' && studentRecord && (
          <StudentAchievementsTab
            studentId={studentRecord.id}
            studentName={studentRecord.fullName}
            grade={studentRecord.grade}
            variant="parent"
          />
        )}

        {/* ══════════════ جدول الحصص ══════════════ */}
        {!loading && tab === 'schedule' && (
          <div className="space-y-4">
            <OverviewScheduleBoard
              variant="parent"
              studentName={studentRecord?.fullName}
              onNavigateTab={(t) => {
                if (t === 'schedule') {
                  // already on schedule
                } else {
                  setTab(t as Tab);
                }
              }}
            />
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
                {allCombinedHomework.map((hw: any) => {
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
                {!allCombinedHomework.length && (
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

      {/* Student Info Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowStudentModal(false)}
              className="absolute top-4 left-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-teal-50 border-4 border-emerald-400/80 shadow-lg flex items-center justify-center mx-auto text-4xl overflow-hidden">
                {studentRecord?.photoUrl ? (
                  studentRecord.photoUrl.startsWith('data:image') ? (
                    <img src={studentRecord.photoUrl} alt={studentRecord.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{studentRecord.photoUrl}</span>
                  )
                ) : (
                  <span>🎓</span>
                )}
              </div>

              <div>
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[11px] font-black px-3 py-1 rounded-full border border-emerald-200">
                  <GraduationCap size={14} className="text-emerald-600" />
                  <span>طالب مقيّد — فصل د. إسماعيل عيسى</span>
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-2">
                  {studentRecord?.fullName || 'الطالب المسجل'}
                </h2>
                <p className="text-xs font-bold text-slate-500 mt-0.5">
                  متابعة وتقييم فصل د. إسماعيل عيسى
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2.5 text-xs font-bold text-slate-700 border-t border-b border-slate-100 py-4">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <GraduationCap size={15} className="text-teal-600" /> الصف الدراسي:
                </span>
                <span className="font-black text-slate-900">{studentRecord?.grade || 'الصف الأول الابتدائي'}</span>
              </div>

              {studentRecord?.dateOfBirth && (
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar size={15} className="text-teal-600" /> تاريخ الميلاد:
                  </span>
                  <span className="font-black text-slate-900">{studentRecord.dateOfBirth}</span>
                </div>
              )}

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Phone size={15} className="text-teal-600" /> هاتف ولي الأمر:
                </span>
                <span className="font-black text-slate-900" dir="ltr">{studentRecord?.parentPhone || 'مسجل بالنظام'}</span>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Building2 size={15} className="text-teal-600" /> الفرع والمدرسة:
                </span>
                <span className="font-black text-emerald-800">فرع الإخلاص — جدة 📍</span>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-teal-600" /> حالة الملف الحيوية:
                </span>
                <span className="font-black text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-md">
                  {studentRecord?.reviewStatus || 'مكتمل ومفعل'}
                </span>
              </div>
            </div>

            {/* Face Enroll Shortcut inside modal */}
            <div className="mt-5 space-y-2">
              <Link
                href="/face-enroll"
                onClick={() => setShowStudentModal(false)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-4 py-3.5 text-xs font-black text-white shadow-lg transition active:scale-95 cursor-pointer"
              >
                <ScanFace size={18} />
                <span>تسجيل / تحديث بصمة الوجه الذكية 📷</span>
              </Link>

              <button
                onClick={() => setShowStudentModal(false)}
                className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition text-center cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
