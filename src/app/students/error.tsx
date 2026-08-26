'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';

export default function StudentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Students Page Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white" dir="rtl">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-md space-y-6">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30">
          <AlertTriangle size={32} />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">تعذر تحميل صفحة إدارة الطلاب</h2>
          <p className="text-xs sm:text-sm font-bold text-slate-400 leading-relaxed">
            حدث خطأ أثناء استرجاع بيانات الطلاب والسجلات. يمكنك المحاولة مرة أخرى أو العودة للوحة التحكم.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            type="button"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-xs font-black text-white hover:bg-teal-700 transition shadow-md shadow-teal-600/20 active:scale-95 cursor-pointer"
          >
            <RefreshCw size={16} />
            <span>إعادة المحاولة</span>
          </button>

          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-xs font-black text-slate-200 hover:bg-slate-700 transition cursor-pointer"
          >
            <LayoutDashboard size={16} />
            <span>لوحة التحكم</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
