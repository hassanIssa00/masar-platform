'use client';

import { useEffect, useState } from 'react';
import {
  Activity, BarChart3, Globe, Globe2, Laptop, Monitor, RefreshCw,
  Smartphone, Tablet, TrendingUp, Users, UserCheck, UserPlus,
  Clock, LogIn, Eye, Calendar, Wifi
} from 'lucide-react';
import { fetchAnalyticsSummary, type AnalyticsSummary } from '@/lib/analyticsTracker';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

/* ─── helpers ─────────────────────────────────── */
function pct(val: number, total: number) {
  if (!total) return 0;
  return Math.round((val / total) * 100);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('ar-SA', {
    hour: '2-digit', minute: '2-digit',
    day: 'numeric', month: 'short',
  });
}

const EVENT_LABELS: Record<string, string> = {
  visit: 'زيارة',
  login: 'تسجيل دخول',
  register: 'تسجيل جديد',
  logout: 'خروج',
};

const EVENT_COLORS: Record<string, string> = {
  visit: 'bg-sky-100 text-sky-700',
  login: 'bg-teal-100 text-teal-700',
  register: 'bg-violet-100 text-violet-700',
  logout: 'bg-slate-100 text-slate-500',
};

const DEVICE_ICON: Record<string, React.ElementType> = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
};

/* ─── mini bar chart ────────────────────────────── */
function HourlyChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-20 w-full">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
          <div
            className="w-full rounded-t-sm bg-teal-400 transition-all duration-500"
            style={{ height: `${pct(v, max)}%`, minHeight: v ? 4 : 0 }}
            title={`${i}:00 — ${v} دخول`}
          />
        </div>
      ))}
    </div>
  );
}

/* ─── donut-style breakdown bar ──────────────────── */
function BreakdownBar({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  return (
    <div className="space-y-2">
      {/* track */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {items.map((item) => (
          <div
            key={item.label}
            className={`${item.color} transition-all duration-700`}
            style={{ width: `${pct(item.value, total)}%` }}
          />
        ))}
      </div>
      {/* legend */}
      <div className="flex flex-wrap gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs font-black text-slate-600">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${item.color}`} />
            {item.label} ({pct(item.value, total)}%)
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── stat card ─────────────────────────────────── */
function StatCard({
  label, value, sub, icon: Icon, accent
}: { label: string; value: number | string; sub?: string; icon: React.ElementType; accent: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-xs`}>
      <div className={`absolute -top-4 -left-4 h-20 w-20 rounded-full opacity-10 ${accent}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-1 text-3xl font-black text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs font-bold text-slate-500">{sub}</p>}
        </div>
        <span className={`grid h-11 w-11 place-items-center rounded-xl text-white ${accent}`}>
          <Icon size={22} />
        </span>
      </div>
    </div>
  );
}

/* ─── page ───────────────────────────────────────── */
export default function PlatformSettingsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const data = await fetchAnalyticsSummary();
    setSummary(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const deviceItems = summary ? [
    { label: 'موبايل', value: summary.deviceBreakdown.mobile, color: 'bg-violet-500' },
    { label: 'تابلت', value: summary.deviceBreakdown.tablet, color: 'bg-amber-400' },
    { label: 'كمبيوتر', value: summary.deviceBreakdown.desktop, color: 'bg-teal-500' },
  ] : [];

  const topOS = summary
    ? Object.entries(summary.osBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : [];

  const topBrowser = summary
    ? Object.entries(summary.browserBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5)
    : [];

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-black text-slate-900">⚙️ إعدادات المنصة</h1>
              <p className="mt-1 text-sm font-bold text-slate-500">
                إحصائيات حركة المستخدمين والأجهزة في الوقت الفعلي
              </p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              تحديث
            </button>
          </div>

          {loading && (
            <div className="grid place-items-center py-24">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw size={28} className="animate-spin text-teal-600" />
                <p className="text-sm font-black text-slate-500">جاري تحميل الإحصائيات...</p>
              </div>
            </div>
          )}

          {!loading && summary && (
            <div className="space-y-6">

              {/* ── Today vs Total ──────────────────── */}
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Calendar size={14} /> اليوم
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <StatCard label="زيارات اليوم" value={summary.todayVisits} icon={Eye} accent="bg-sky-500" />
                  <StatCard label="دخول اليوم" value={summary.todayLogins} icon={LogIn} accent="bg-teal-600" />
                  <StatCard label="تسجيل اليوم" value={summary.todayRegistrations} icon={UserPlus} accent="bg-violet-600" />
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <TrendingUp size={14} /> إجمالي كل الأوقات
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <StatCard label="إجمالي الزيارات" value={summary.totalVisits} sub="منذ تفعيل التتبع" icon={Globe} accent="bg-sky-400" />
                  <StatCard label="إجمالي الدخول" value={summary.totalLogins} sub="تسجيل دخول" icon={UserCheck} accent="bg-emerald-500" />
                  <StatCard label="إجمالي التسجيلات" value={summary.totalRegistrations} sub="حساب جديد" icon={Users} accent="bg-indigo-500" />
                </div>
              </div>

              {/* ── Device breakdown + Hourly ───────── */}
              <div className="grid gap-4 lg:grid-cols-2">

                {/* Device */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-700">
                      <Smartphone size={18} />
                    </span>
                    <p className="font-black text-slate-800">الأجهزة المستخدمة</p>
                  </div>
                  <BreakdownBar items={deviceItems} />
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {deviceItems.map((item) => {
                      const DevIcon = DEVICE_ICON[item.label === 'موبايل' ? 'mobile' : item.label === 'تابلت' ? 'tablet' : 'desktop'];
                      return (
                        <div key={item.label} className="rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
                          <DevIcon className="mx-auto text-slate-500 mb-1" size={18} />
                          <p className="text-xl font-black text-slate-900">{item.value}</p>
                          <p className="text-[11px] font-bold text-slate-500">{item.label}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Hourly chart */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700">
                      <Clock size={18} />
                    </span>
                    <p className="font-black text-slate-800">تسجيل الدخول بالساعة</p>
                  </div>
                  <HourlyChart data={summary.hourlyLogins} />
                  <div className="mt-2 flex justify-between text-[10px] font-bold text-slate-400">
                    <span>12 ص</span><span>6 ص</span><span>12 م</span><span>6 م</span><span>11 م</span>
                  </div>
                </div>
              </div>

              {/* ── OS + Browser ────────────────────── */}
              <div className="grid gap-4 lg:grid-cols-2">
                {/* OS */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-700">
                      <Laptop size={18} />
                    </span>
                    <p className="font-black text-slate-800">أنظمة التشغيل</p>
                  </div>
                  <div className="space-y-2.5">
                    {topOS.length === 0 && <p className="text-xs text-slate-400 font-bold">لا توجد بيانات بعد</p>}
                    {topOS.map(([os, count]) => {
                      const total = Object.values(summary.osBreakdown).reduce((a, b) => a + b, 0);
                      return (
                        <div key={os}>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-black text-slate-700">{os}</span>
                            <span className="text-xs font-black text-slate-500">{count} ({pct(count, total)}%)</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-amber-400 transition-all duration-700"
                              style={{ width: `${pct(count, total)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Browser */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-50 text-sky-700">
                      <Globe2 size={18} />
                    </span>
                    <p className="font-black text-slate-800">المتصفحات</p>
                  </div>
                  <div className="space-y-2.5">
                    {topBrowser.length === 0 && <p className="text-xs text-slate-400 font-bold">لا توجد بيانات بعد</p>}
                    {topBrowser.map(([browser, count]) => {
                      const total = Object.values(summary.browserBreakdown).reduce((a, b) => a + b, 0);
                      return (
                        <div key={browser}>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs font-black text-slate-700">{browser}</span>
                            <span className="text-xs font-black text-slate-500">{count} ({pct(count, total)}%)</span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-slate-100">
                            <div
                              className="h-2 rounded-full bg-sky-400 transition-all duration-700"
                              style={{ width: `${pct(count, total)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Recent Events ───────────────────── */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <div className="flex items-center gap-2 mb-4">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                    <Activity size={18} />
                  </span>
                  <p className="font-black text-slate-800">آخر الأحداث الفعلية</p>
                </div>
                {summary.recentEvents.length === 0 && (
                  <div className="py-8 text-center">
                    <Wifi className="mx-auto mb-2 text-slate-300" size={32} />
                    <p className="text-sm font-black text-slate-400">لا توجد أحداث مسجلة بعد</p>
                    <p className="text-xs font-bold text-slate-400 mt-1">ستبدأ البيانات تظهر عند أول تسجيل دخول</p>
                  </div>
                )}
                <div className="overflow-x-auto">
                  {summary.recentEvents.length > 0 && (
                    <table className="w-full text-right text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="pb-2 text-xs font-black text-slate-400 pr-0">الحدث</th>
                          <th className="pb-2 text-xs font-black text-slate-400">المستخدم</th>
                          <th className="pb-2 text-xs font-black text-slate-400">الجهاز</th>
                          <th className="pb-2 text-xs font-black text-slate-400">النظام</th>
                          <th className="pb-2 text-xs font-black text-slate-400">المتصفح</th>
                          <th className="pb-2 text-xs font-black text-slate-400">الوقت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {summary.recentEvents.map((ev, i) => {
                          const DevIcon = DEVICE_ICON[ev.device];
                          return (
                            <tr key={ev.id ?? i} className="hover:bg-slate-50 transition">
                              <td className="py-2.5 pr-0">
                                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${EVENT_COLORS[ev.type] ?? 'bg-slate-100 text-slate-500'}`}>
                                  {EVENT_LABELS[ev.type] ?? ev.type}
                                </span>
                              </td>
                              <td className="py-2.5 text-xs font-black text-slate-700">
                                {ev.userName || '—'}
                                {ev.userRole && <span className="mr-1 text-[10px] text-slate-400">({ev.userRole})</span>}
                              </td>
                              <td className="py-2.5">
                                <div className="flex items-center gap-1 text-xs font-bold text-slate-600">
                                  <DevIcon size={13} />
                                  {ev.device === 'mobile' ? 'موبايل' : ev.device === 'tablet' ? 'تابلت' : 'كمبيوتر'}
                                </div>
                              </td>
                              <td className="py-2.5 text-xs font-bold text-slate-500">{ev.os}</td>
                              <td className="py-2.5 text-xs font-bold text-slate-500">{ev.browser}</td>
                              <td className="py-2.5 text-xs font-bold text-slate-400 whitespace-nowrap">{formatTime(ev.createdAt)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}
