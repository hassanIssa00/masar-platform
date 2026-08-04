'use client';

import { Award, Printer, ShieldCheck, Sparkles, X } from 'lucide-react';
import BrandMark from './BrandMark';

export interface CertificateData {
  studentName: string;
  programTitle: string;
  completionDate: string;
  score: number;
}

export default function CertificateModal({ data, onClose }: { data: CertificateData; onClose: () => void }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 sm:p-6 backdrop-blur-xs grid place-items-center">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">

        {/* Action Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4 print:hidden" dir="rtl">
          <div className="flex items-center gap-2">
            <Award className="text-amber-500" size={20} />
            <span className="font-black text-slate-800 text-sm">شهادة إنجاز واجتياز برنامج علاجي</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 hover:bg-amber-400 transition shadow-sm"
            >
              <Printer size={15} /> طباعة الشهادة / PDF
            </button>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-600 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Certificate Page */}
        <div className="p-8 sm:p-12 text-slate-900 bg-gradient-to-b from-amber-50/40 via-white to-teal-50/40 border-8 border-double border-amber-300 m-4 rounded-2xl text-center space-y-6" dir="rtl">

          <div className="flex justify-between items-center border-b border-amber-200 pb-4">
            <BrandMark size="md" />
            <div className="text-left text-xs font-black text-slate-500">
              <p>رقم الشهادة: CERT-2026-MASAR</p>
              <p>التاريخ: {data.completionDate}</p>
            </div>
          </div>

          <div className="space-y-2 py-4">
            <span className="inline-block rounded-full bg-amber-100 px-4 py-1.5 text-xs font-black text-amber-800 border border-amber-300">
              🏆 شهادة إنجاز وتميُّز استثنائي
            </span>
            <h1 className="text-3xl font-black text-slate-900 pt-2">منصة مَسَار للتعليم والعلاج الذكي</h1>
            <p className="text-sm font-bold text-slate-600">تشهد المنصة وتحت إشراف أ.د. إسماعيل عيسى بأن البطل:</p>
          </div>

          <div className="py-2">
            <h2 className="text-4xl font-black text-teal-800 underline decoration-amber-400 decoration-4 underline-offset-8">
              {data.studentName}
            </h2>
          </div>

          <div className="max-w-xl mx-auto space-y-2 py-2">
            <p className="text-base font-bold text-slate-700 leading-relaxed">
              قد أتمّ بنجاح واقتدار كافة متطلبات الجلسات العلاجية والتمارين النمائية في:
            </p>
            <p className="text-xl font-black text-indigo-950 bg-amber-100/70 py-2 px-4 rounded-xl border border-amber-200">
              {data.programTitle}
            </p>
            <p className="text-xs font-bold text-slate-500 pt-1">
              وحقق مستوى إتقان تراكمي قدره <span className="font-black text-emerald-700 text-sm">{data.score}%</span> مع التزام عالي بالأداء الفردي والمنزلي.
            </p>
          </div>

          <div className="pt-8 border-t border-amber-200 flex items-center justify-between text-xs">
            <div className="text-center space-y-1">
              <ShieldCheck className="mx-auto text-teal-700" size={24} />
              <p className="font-black text-slate-700">اعتماد المنصة</p>
              <p className="text-[10px] text-slate-400">وثيقة إلكترونية موثقة</p>
            </div>

            <div className="text-center space-y-1">
              <div className="h-12 w-32 border border-dashed border-amber-400 rounded-xl bg-amber-50/80 grid place-items-center text-amber-900 font-serif italic text-xs">
                د. إسماعيل عيسى
              </div>
              <p className="font-black text-slate-800">استشاري التربية الخاصة وتأهيل صعوبات التعلم</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
