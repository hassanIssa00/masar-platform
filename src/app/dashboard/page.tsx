'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, Calendar, FileText, Activity, ArrowLeft, Heart,
  ShieldAlert, UserRoundPlus, ClipboardCheck, Stamp, Bot, BarChart3, ClipboardList, Building2
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import SyncStatus from '@/components/SyncStatus';
import { getStudents, getReports, getSession, hydrateSessionFromServer, StudentRecord, ReportRecord } from '@/lib/localDb';
import { pullCloudDataToLocal, subscribeToCloudUpdates } from '@/lib/firestoreSync';
import { useRouter } from 'next/navigation';

const DASHBOARD_SYNC_KEYS = ['students', 'reports', 'surveys', 'calendarSessions'] as const;

export default function Dashboard() {
  const router = useRouter();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadDashboard = async () => {
      const session = getSession() ?? await hydrateSessionFromServer();
      if (cancelled) return;
      if (!session) {
        router.replace('/login');
        return;
      }
      if (session.role === 'parent') {
        router.replace('/parent');
        return;
      }
      if (session.role === 'student') {
        router.replace('/school-student');
        return;
      }
      setAuthorized(true);
      setStudents(getStudents());
      setReports(getReports());
      pullCloudDataToLocal([...DASHBOARD_SYNC_KEYS])
        .then(() => {
          if (cancelled) return;
          setStudents(getStudents());
          setReports(getReports());
        })
        .catch(() => {});
    };
    void loadDashboard();
    const unsubscribe = subscribeToCloudUpdates(() => {
      setStudents(getStudents());
      setReports(getReports());
    }, [...DASHBOARD_SYNC_KEYS]);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router]);

  if (!authorized) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-bold">جاري التحقق من الصلاحيات...</div>;
  }

  const stats = [
    { label: 'طلاب محفوظون', value: students.length, note: 'ابدأ بإضافة أول طالب', icon: Users },
    { label: 'جلسات اليوم', value: 0, note: 'لم يتم إنشاء جدول جلسات بعد', icon: Calendar },
    { label: 'تقارير مكتملة', value: reports.length, note: '0 استبيان محفوظ', icon: FileText },
    { label: 'متوسط الأداء', value: '0%', note: 'لا توجد درجات بعد', icon: Activity },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">

          {/* 🌟 Doctor Welcome Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-6 md:p-8 text-white shadow-xl border border-teal-800/40">
            <div className="absolute -left-10 -bottom-10 w-60 h-60 bg-teal-500/10 rounded-full blur-3xl" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-amber-400/80 shadow-lg shrink-0 bg-slate-800">
                  <img
                    src="/dr-ismail.jpg"
                    alt="د. إسماعيل عيسى"
                    className="w-full h-full object-contain bg-slate-900"
                  />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-black text-amber-300 border border-amber-400/30">
                    مرحباً بك في منصة مسار 🌟
                  </span>
                  <h1 className="mt-1 text-2xl md:text-3xl font-black tracking-tight text-white">
                    د. إسماعيل عيسى
                  </h1>
                  <p className="text-xs md:text-sm font-bold text-teal-100 opacity-90 mt-0.5">
                    استشاري التعليم الحديث وصعوبات التعلم
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-teal-100">
                      <Users size={12} className="text-teal-300" />
                      {students.length} طالب مسجل
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-teal-100">
                      <Heart size={12} className="text-rose-400" />
                      {reports.length} تقرير مكتمل
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Access Switcher for Dr. Ismail */}
            <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center gap-2">
              <span className="text-xs font-black text-amber-300 ml-2">تنقل سريع للدكتور:</span>
              <Link href="/dashboard" className="bg-white/20 hover:bg-white/30 text-white text-xs font-black px-3 py-1.5 rounded-xl transition flex items-center gap-1.5">
                اللوحة الرئيسية
              </Link>
              <Link href="/signature" className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 shadow-md hover:scale-105">
                <Stamp size={14} /> التوقيع والختم الإلكتروني
              </Link>
              <Link href="/branches/ikhlas-jeddah" className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5">
                فصل د. إسماعيل عيسى
              </Link>
              <Link href="/ai-assistant" className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5">
                مساعد مسار الذكي
              </Link>
              <Link href="/bi-dashboard" className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5">
                التحليلات BI
              </Link>
              <Link href="/iep" className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5">
                خطط IEP
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Link href="/student/new" className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition px-3 py-2.5 text-xs font-black text-white">
                <UserRoundPlus size={14} />
                إضافة طالب
              </Link>
              <Link href="/assessment" className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition px-3 py-2.5 text-xs font-black text-white">
                <ClipboardCheck size={14} />
                اختبار مستوى
              </Link>
              <Link href="/parents" className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition px-3 py-2.5 text-xs font-black text-white">
                <FileText size={14} />
                إرسال تقارير
              </Link>
            </div>
          </div>

          <SyncStatus />

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map(({ label, value, note, icon: Icon }) => (
              <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-500">{label}</p>
                    <p className="mt-3 text-4xl font-black text-slate-950">{value}</p>
                  </div>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-50 text-teal-800">
                    <Icon size={22} />
                  </span>
                </div>
                <p className="mt-3 text-sm font-bold leading-6 text-slate-600">{note}</p>
              </article>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-slate-500">حالات تحتاج متابعة</p>
                  <h2 className="text-xl font-black text-slate-950">أولوية الجلسة التالية</h2>
                </div>
                <Link href="/reports" className="inline-flex items-center gap-1 text-sm font-black text-teal-800">
                  التقارير
                  <ArrowLeft size={15} />
                </Link>
              </div>

              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <p className="font-black text-slate-900">لا توجد حالات محفوظة بعد</p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  الداشبورد لا يعرض بيانات وهمية. أضف طالباً أو استبياناً وسيظهر هنا تلقائياً.
                </p>
                <Link
                  href="/student/new"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-xs font-black text-white hover:bg-teal-800 transition"
                >
                  إضافة أول طالب
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">ملخص التشغيل</h2>
              <p className="text-xs font-bold text-slate-500">البيانات هنا تأتي من Firestore مباشرة وتظهر لأي جهاز مسجل بصلاحية الإدارة.</p>
              <div className="mt-4 grid gap-3">
                <Link href="/students" className="flex items-center justify-between rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm font-black text-teal-950 hover:bg-teal-100 transition">
                  <span>إدارة الطلاب والحسابات</span>
                  <ArrowLeft size={16} />
                </Link>
                <Link href="/reports" className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-black text-slate-950 hover:bg-slate-100 transition">
                  <span>مراجعة التقارير والاعتماد</span>
                  <ArrowLeft size={16} />
                </Link>
                <Link href="/platform-settings?tab=users&focus=account-generator" className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-black text-amber-950 hover:bg-amber-100 transition">
                  <span>توليد حسابات سحابية</span>
                  <ArrowLeft size={16} />
                </Link>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}
