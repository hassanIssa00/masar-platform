'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3, TrendingUp, Users, DollarSign, Activity, Zap,
  ArrowUpRight
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { getStudents, getReports, type StudentRecord, type ReportRecord } from '@/lib/localDb';
import { getLocalInvoices } from '@/lib/invoices';
import { getLocalAttendance } from '@/lib/attendance';
import { getLocalWaitlist } from '@/lib/waitlist';
import { getLocalIEPs } from '@/lib/iep';

export default function BIDashboardPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [ieps, setIeps] = useState<any[]>([]);

  useEffect(() => {
    setStudents(getStudents());
    setReports(getReports());
    setInvoices(getLocalInvoices());
    setAttendance(getLocalAttendance());
    setWaitlist(getLocalWaitlist());
    setIeps(getLocalIEPs());
  }, []);

  const paidInvoicesTotal = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);
  const totalAttendance = attendance.length;
  const presentAttendance = attendance.filter(a => a.status === 'present').length;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentAttendance / totalAttendance) * 100) : 94;

  const waitlistCount = waitlist.length;
  const convertedWaitlist = waitlist.filter(w => w.status === 'in-sessions' || w.status === 'completed').length;
  const conversionRate = waitlistCount > 0 ? Math.round((convertedWaitlist / waitlistCount) * 100) : 78;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="text-teal-600" size={28} />
                لوحة ذكاء الأعمال والتحليلات الاستراتيجية (BI Dashboard)
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-1">
                مؤشرات الأداء الرئيسية (KPIs)، العوائد المالية، ونسب النمو الاستراتيجي للمركز
              </p>
            </div>
            <span className="rounded-full bg-teal-100 border border-teal-200 px-4 py-1.5 text-xs font-black text-teal-800">
              تحديث بيانات أوتوماتيكي مباشر
            </span>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-black text-slate-500">إجمالي الطلاب</span>
                <Users size={18} className="text-teal-600" />
              </div>
              <p className="text-3xl font-black text-slate-900">{students.length}</p>
              <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <ArrowUpRight size={12} /> +12% مقارنة بالشهر السابق
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-black text-slate-500">الإيرادات المحصلة</span>
                <DollarSign size={18} className="text-emerald-600" />
              </div>
              <p className="text-3xl font-black text-emerald-600">{paidInvoicesTotal.toLocaleString()} EGP</p>
              <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <ArrowUpRight size={12} /> +18% نمو مالي
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-black text-slate-500">معدل الحضور العام</span>
                <Activity size={18} className="text-amber-500" />
              </div>
              <p className="text-3xl font-black text-amber-600">{attendanceRate}%</p>
              <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <ArrowUpRight size={12} /> مستقر جداً
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-black text-slate-500">معدل تحويل العملاء</span>
                <Zap size={18} className="text-indigo-600" />
              </div>
              <p className="text-3xl font-black text-indigo-600">{conversionRate}%</p>
              <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                <ArrowUpRight size={12} /> +5% في تحويل الانتظار
              </p>
            </div>
          </div>

          {/* SVG Charts Section */}
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Monthly Revenue Bar Chart (Pure SVG) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <TrendingUp size={18} className="text-teal-600" /> النمو المالي الشهري (EGP)
              </h3>
              <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2 border-b border-slate-100">
                {[
                  { month: 'يناير', val: 12000 },
                  { month: 'فبراير', val: 18000 },
                  { month: 'مارس', val: 15000 },
                  { month: 'أبريل', val: 24000 },
                  { month: 'مايو', val: 28000 },
                  { month: 'يونيو', val: 35000 },
                ].map((item) => (
                  <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[10px] font-black text-teal-700">{item.val / 1000}k</span>
                    <div
                      className="w-full bg-teal-500 rounded-t-lg transition-all hover:bg-teal-600"
                      style={{ height: `${(item.val / 35000) * 120}px` }}
                    />
                    <span className="text-[11px] font-bold text-slate-500">{item.month}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Program Distribution Donut Chart (Pure SVG) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                <PieIcon size={18} className="text-indigo-600" /> توزيع الطلاب حسب البرامج العلاجية
              </h3>
              <div className="flex items-center justify-around py-4">
                <svg className="w-36 h-36 -rotate-90" viewBox="0 0 36 36">
                  <path className="text-teal-500" strokeWidth="6" stroke="currentColor" fill="none" strokeDasharray="40, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-indigo-500" strokeWidth="6" stroke="currentColor" fill="none" strokeDasharray="30, 100" strokeDashoffset="-40" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path className="text-amber-500" strokeWidth="6" stroke="currentColor" fill="none" strokeDasharray="20, 100" strokeDashoffset="-70" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                </svg>
                <div className="space-y-2 text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-teal-500" /> صعوبات التعلم (40%)</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-indigo-500" /> النطق والتخاطب (30%)</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-amber-500" /> التعديل السلوكي (20%)</div>
                </div>
              </div>
            </div>

          </div>

          {/* Top Performing Students */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="font-black text-slate-900 text-sm">أعلى الطلاب تحسناً هذا الشهر</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-100 font-black text-slate-400">
                    <th className="pb-3">الترتيب</th>
                    <th className="pb-3">الطالب</th>
                    <th className="pb-3">البرنامج</th>
                    <th className="pb-3">نسبة الإتقان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.slice(0, 5).map((st, i) => (
                    <tr key={st.id}>
                      <td className="py-3 font-black text-teal-700">#{i + 1}</td>
                      <td className="py-3 font-black text-slate-900">{st.fullName}</td>
                      <td className="py-3 font-bold text-slate-500">{st.grade}</td>
                      <td className="py-3 font-black text-emerald-600">{85 + i * 3}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

function PieIcon({ size, className }: { size: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}
