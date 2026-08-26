'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-white font-sans">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/95 p-8 text-center shadow-2xl space-y-6">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30">
            <AlertTriangle size={32} />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">حدث خطأ غير متوقع</h2>
            <p className="text-xs sm:text-sm font-bold text-slate-400 leading-relaxed">
              يرجى إعادة تحميل الصفحة لتحديث الجلسة والبيانات.
            </p>
          </div>

          <button
            onClick={() => reset()}
            type="button"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 py-3.5 text-xs font-black text-white hover:bg-teal-700 transition shadow-md shadow-teal-600/20 active:scale-95 cursor-pointer"
          >
            <RefreshCw size={16} />
            <span>إعادة تحميل الصفحة</span>
          </button>
        </div>
      </body>
    </html>
  );
}
