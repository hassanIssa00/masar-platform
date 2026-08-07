'use client';

import { Printer, X, ShieldCheck, CheckCircle2, Award, FileCheck } from 'lucide-react';
import type { ReportRecord } from '@/lib/localDb';
import BrandMark from './BrandMark';

export default function PrintableReportModal({ report, onClose }: { report: ReportRecord; onClose: () => void }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-3 sm:p-6 backdrop-blur-sm grid place-items-center">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden border-4 border-slate-950 ring-4 ring-amber-400/30">

        {/* Toolbar (hidden on print) */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white print:hidden" dir="rtl">
          <div className="flex items-center gap-2">
            <Award className="text-amber-400" size={20} />
            <span className="font-black text-sm">معاينة التقرير الطبي والتحليلي المعتمد (جاهز للطباعة / PDF)</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-5 py-2 text-xs font-black text-slate-950 transition shadow-md cursor-pointer"
            >
              <Printer size={16} /> طباعة التقرير / حفظ PDF
            </button>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Outer Frame Padding Container */}
        <div className="p-4 sm:p-8 bg-slate-100 print:p-0 print:bg-white" dir="rtl" id="printable-area">

          {/* Printable Document Body - ROYAL GOLD DOUBLE BORDER FRAME */}
          <div className="relative rounded-2xl border-4 border-slate-900 bg-white p-6 sm:p-10 shadow-lg ring-1 ring-amber-300 print:border-4 print:border-slate-950 print:p-6">
            
            {/* Decorative Corner Elements */}
            <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-500 pointer-events-none" />
            <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-500 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-500 pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-500 pointer-events-none" />

            {/* Letterhead Header */}
            <div className="flex items-center justify-between border-b-2 border-amber-400 pb-6">
              <div className="flex items-center gap-3">
                <BrandMark size="lg" />
              </div>
              <div className="text-left space-y-1">
                <p className="text-[11px] font-black text-amber-600 uppercase tracking-widest">عيادة التأهيل والتعليم العلاجي المتخصص</p>
                <p className="text-xl font-black text-slate-950">د. إسماعيل عيسى</p>
                <p className="text-xs font-bold text-slate-600">استشاري التعليم العلاجي وتعديل السلوك وصعوبات التعلم</p>
              </div>
            </div>

            {/* Official Report Title Bar */}
            <div className="my-6 rounded-xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 p-4 text-center text-white border-y-2 border-amber-400 flex items-center justify-between">
              <div className="text-right">
                <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest">وثيقة إشرافية معتمدة إلكترونياً · OFFICIAL CLINICAL REPORT</p>
                <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">{report.program || 'تقرير التقييم الشامل والطبي'}</h3>
              </div>
              <div className="hidden sm:flex items-center gap-2 rounded-lg bg-amber-400/20 border border-amber-400/40 px-3 py-1.5 text-xs font-black text-amber-300">
                <FileCheck size={16} />
                <span>مستند رسمي معتمد</span>
              </div>
            </div>

            {/* Report Metadata Badge */}
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 rounded-xl bg-slate-50 p-4 border border-slate-200 text-slate-900">
              <div className="border-l border-slate-200 pl-3">
                <p className="text-[10px] font-black text-slate-500 uppercase">اسم الطالب</p>
                <p className="text-base font-black text-slate-950 mt-0.5">{report.studentName}</p>
              </div>
              <div className="border-l border-slate-200 pl-3">
                <p className="text-[10px] font-black text-slate-500 uppercase">الصف الدراسي</p>
                <p className="text-sm font-black text-slate-950 mt-0.5">{report.grade}</p>
              </div>
              <div className="border-l border-slate-200 pl-3">
                <p className="text-[10px] font-black text-slate-500 uppercase">تاريخ التقرير</p>
                <p className="text-sm font-black text-slate-950 mt-0.5">{report.date}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase">نسبة التقييم الكلي</p>
                <span className="mt-1 inline-block rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-amber-400 border border-amber-400/30">
                  {report.score}% 🌟
                </span>
              </div>
            </div>

            {/* Report Summary */}
            <div className="mt-6 space-y-2">
              <h4 className="text-sm font-black text-slate-950 uppercase tracking-wider border-r-4 border-amber-500 pr-3">
                الخلاصة والتشخيص السريري المعتمد
              </h4>
              <p className="text-sm font-bold text-slate-800 leading-relaxed rounded-xl bg-slate-50 p-4 border border-slate-200">
                {report.summary}
              </p>
            </div>

            {/* Domain Breakdown Table */}
            {report.domains && report.domains.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-black text-slate-950 uppercase tracking-wider border-r-4 border-amber-500 pr-3">
                  تفاصيل المهارات والمجالات النمائية
                </h4>
                <table className="w-full text-right text-sm border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      <th className="p-3 text-xs font-black text-amber-300">المجال / المهارة</th>
                      <th className="p-3 text-xs font-black text-amber-300">نسبة الأداء</th>
                      <th className="p-3 text-xs font-black text-amber-300">ملاحظة الأخصائي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {report.domains.map((d, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="p-3 font-black text-slate-900">{d.name}</td>
                        <td className="p-3 font-black text-indigo-700">{d.score}%</td>
                        <td className="p-3 font-bold text-slate-600 text-xs">{d.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Recommendations */}
            {report.recommendations && report.recommendations.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-black text-slate-950 uppercase tracking-wider border-r-4 border-amber-500 pr-3">
                  التوصيات والخطة العلاجية المقترحة
                </h4>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                  {report.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm font-bold text-slate-800">
                      <CheckCircle2 size={16} className="text-amber-500 mt-0.5 shrink-0" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Signature & Official Seal Footer */}
            <div className="mt-8 pt-6 border-t-2 border-amber-400 flex items-end justify-between">
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <ShieldCheck size={20} className="text-amber-500 shrink-0" />
                <div>
                  <p className="font-black text-slate-800">وثيقة إشرافية موثقة برقم تسلسلي</p>
                  <p className="text-[10px] text-slate-400">منصة مَسَار التعليمية · جميع الحقوق محفوظة</p>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-xs font-black text-slate-700">توقيع واستشارية التعليم العلاجي</p>
                <div className="h-14 w-40 border-2 border-dashed border-amber-400 rounded-xl bg-amber-50/60 grid place-items-center text-slate-900 font-serif font-black italic text-sm shadow-inner">
                  د. إسماعيل عيسى ✍️
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
