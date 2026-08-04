'use client';

import { Printer, X, Download, ShieldCheck, CheckCircle2 } from 'lucide-react';
import type { ReportRecord } from '@/lib/localDb';
import BrandMark from './BrandMark';

export default function PrintableReportModal({ report, onClose }: { report: ReportRecord; onClose: () => void }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 sm:p-6 backdrop-blur-xs grid place-items-center">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200">

        {/* Toolbar (hidden on print) */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-4 print:hidden" dir="rtl">
          <div className="flex items-center gap-2">
            <span className="font-black text-slate-800 text-sm">معاينة التقرير الطبي للطباعة (PDF)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-black text-white hover:bg-teal-700 transition shadow-sm"
            >
              <Printer size={15} /> طباعة / حفظ PDF
            </button>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-600 transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-12 text-slate-900 bg-white space-y-8 print:p-0 print:space-y-6" dir="rtl" id="printable-area">

          {/* Letterhead Header */}
          <div className="flex items-center justify-between border-b-2 border-teal-700 pb-6">
            <div className="flex items-center gap-3">
              <BrandMark size="lg" />
            </div>
            <div className="text-left space-y-1">
              <p className="text-xs font-black text-teal-800 uppercase tracking-widest">عيادة التأهيل والتعليم العلاجي</p>
              <p className="text-lg font-black text-slate-900">د. إسماعيل عيسى</p>
              <p className="text-xs font-bold text-slate-500">استشاري التعليم العلاجي وصعوبات التعلم</p>
            </div>
          </div>

          {/* Report Metadata Badge */}
          <div className="flex items-center justify-between rounded-2xl bg-teal-50 p-5 border border-teal-200">
            <div>
              <p className="text-xs font-black text-teal-700 uppercase">اسم الطالب</p>
              <p className="text-xl font-black text-slate-900 mt-0.5">{report.studentName}</p>
              <p className="text-xs font-bold text-slate-500">{report.grade}</p>
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-teal-700 uppercase">تاريخ التقرير</p>
              <p className="text-sm font-black text-slate-900 mt-0.5">{report.date}</p>
              <span className="mt-1 inline-block rounded-full bg-teal-700 px-3 py-1 text-xs font-black text-white">
                درجة التقييم: {report.score}%
              </span>
            </div>
          </div>

          {/* Report Summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider border-r-4 border-teal-600 pr-3">
              الخلاصة والتشخيص السريري
            </h4>
            <p className="text-sm font-bold text-slate-700 leading-relaxed rounded-xl bg-slate-50 p-4 border border-slate-200">
              {report.summary}
            </p>
          </div>

          {/* Domain Breakdown Table */}
          {report.domains && report.domains.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider border-r-4 border-teal-600 pr-3">
                تفاصيل المهارات والمجالات السلوكية
              </h4>
              <table className="w-full text-right text-sm border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-xs font-black text-slate-700">المجال / المهارة</th>
                    <th className="p-3 text-xs font-black text-slate-700">الدرجة</th>
                    <th className="p-3 text-xs font-black text-slate-700">ملاحظة الأخصائي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {report.domains.map((d, i) => (
                    <tr key={i}>
                      <td className="p-3 font-black text-slate-900">{d.name}</td>
                      <td className="p-3 font-black text-teal-700">{d.score}%</td>
                      <td className="p-3 font-bold text-slate-600 text-xs">{d.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations && report.recommendations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider border-r-4 border-teal-600 pr-3">
                التوصيات والخطة العلاجية المقترحة
              </h4>
              <ul className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm font-bold text-slate-800">
                    <CheckCircle2 size={16} className="text-teal-600 mt-0.5 shrink-0" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Signature & Medical Stamp Footer */}
          <div className="pt-8 border-t border-slate-200 flex items-end justify-between">
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <ShieldCheck size={18} className="text-teal-600" />
              <span>تقرير معتمد إلكترونياً من منصة مسار التفاعلية</span>
            </div>
            <div className="text-center space-y-2">
              <p className="text-xs font-black text-slate-600">توقيع واستشارية العلاج</p>
              <div className="h-12 w-36 border border-dashed border-teal-300 rounded-xl bg-teal-50/50 grid place-items-center text-teal-700 font-serif italic text-xs">
                د. إسماعيل عيسى
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
