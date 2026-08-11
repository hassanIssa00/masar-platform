'use client';

import { useEffect } from 'react';
import { Printer, X, ShieldCheck, CheckCircle2, Award, FileCheck } from 'lucide-react';
import type { ReportRecord } from '@/lib/localDb';
import BrandMark from './BrandMark';

// ── Hijri date helper ─────────────────────────────────────────────────────────
function getTodayHijri(): string {
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  } catch {
    return new Date().toLocaleDateString('ar-SA');
  }
}

export default function PrintableReportModal({ report, onClose }: { report: ReportRecord; onClose: () => void }) {
  const hijriDate = getTodayHijri();

  useEffect(() => {
    const timer = setTimeout(() => handlePrint(), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = () => {
    const printContents = document.getElementById('printable-area')?.innerHTML;
    if (!printContents) return;

    const win = window.open('', '_blank', 'width=900,height=1200');
    if (!win) {
      // Fallback: direct window print
      window.print();
      return;
    }

    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>تقرير ${report.studentName || 'الطالب'} - منصة مسار</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700;800;900&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;font-family:'Cairo',Arial,sans-serif;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    body{margin:0;padding:20px;background:#fff;color:#0f172a;direction:rtl}
    @page{size:A4 portrait;margin:10mm}
    .print-hidden{display:none!important}
    img{max-width:100%;display:block}
    table{width:100%;border-collapse:collapse}
    th,td{padding:8px 12px;text-align:right}
    thead{background:#0f172a;color:#fff}
    thead th{color:#fbbf24;font-weight:900;font-size:11px}
    tbody tr:nth-child(even){background:#f8fafc}
    /* ── Layout Helpers ── */
    .flex{display:flex}.items-center{align-items:center}.justify-between{justify-content:space-between}
    .gap-2{gap:8px}.gap-3{gap:12px}.gap-4{gap:16px}
    .grid{display:grid}.grid-cols-4{grid-template-columns:repeat(4,1fr)}.grid-cols-2{grid-template-columns:repeat(2,1fr)}
    .border-b{border-bottom:1px solid #e2e8f0}.border-t{border-top:1px solid #e2e8f0}
    .border-b-2{border-bottom:2px solid #fbbf24}.border-t-2{border-top:2px solid #fbbf24}
    .pb-6{padding-bottom:24px}.mb-6{margin-bottom:24px}.mt-6{margin-top:24px}.mt-8{margin-top:32px}.pt-6{padding-top:24px}
    .p-4{padding:16px}.p-6{padding:24px}.p-3{padding:12px}.px-3{padding-left:12px;padding-right:12px}
    .py-1{padding-top:4px;padding-bottom:4px}
    .rounded-xl{border-radius:12px}.rounded-full{border-radius:9999px}.rounded-2xl{border-radius:16px}
    .bg-slate-50{background:#f8fafc}.bg-white{background:#fff}.bg-slate-900{background:#0f172a}
    .bg-amber-400{background:#fbbf24}.bg-indigo-950{background:#1e1b4b}
    .border{border:1px solid #e2e8f0}.border-slate-200{border-color:#e2e8f0}.border-amber-400{border-color:#fbbf24}
    .border-r-4{border-right:4px solid #f59e0b}.pr-3{padding-right:12px}
    .text-xs{font-size:11px}.text-sm{font-size:13px}.text-base{font-size:15px}.text-xl{font-size:20px}.text-lg{font-size:18px}
    .text-\[10px\]{font-size:10px}.text-\[11px\]{font-size:11px}
    .font-black{font-weight:900}.font-bold{font-weight:700}.font-mono{font-family:monospace}
    .text-slate-950{color:#020617}.text-slate-900{color:#0f172a}.text-slate-800{color:#1e293b}
    .text-slate-700{color:#334155}.text-slate-600{color:#475569}.text-slate-500{color:#64748b}.text-slate-400{color:#94a3b8}
    .text-amber-600{color:#d97706}.text-amber-400{color:#fbbf24}.text-amber-300{color:#fcd34d}
    .text-white{color:#fff}.text-indigo-700{color:#4338ca}
    .uppercase{text-transform:uppercase}.tracking-widest{letter-spacing:0.15em}.leading-relaxed{line-height:1.625}
    .shrink-0{flex-shrink:0}.overflow-hidden{overflow:hidden}
    .space-y-2>*+*{margin-top:8px}.space-y-3>*+*{margin-top:12px}
    /* signature */
    .sig-box{border:1px solid #e2e8f0;border-radius:12px;padding:12px;text-align:center;min-width:220px}
    .sig-img{height:72px;object-fit:contain;margin:0 auto}
    .hijri-date{font-family:'Cairo',sans-serif;font-size:12px;font-weight:900;color:#0f172a;margin-top:4px}
  </style>
</head>
<body>
<div style="direction:rtl;text-align:right">
  ${printContents}
</div>
<script>
  window.onload = function(){
    setTimeout(function(){ window.print(); window.close(); }, 600);
  };
</script>
</body>
</html>`);
    win.document.close();
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

          {/* Printable Document Body */}
          <div className="relative rounded-2xl border-4 border-slate-900 bg-white p-6 sm:p-10 shadow-lg ring-1 ring-amber-300">

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
                <p className="text-[11px] font-black text-amber-600 uppercase tracking-widest">مركز التأهيل والتعليم العلاجي المتخصص</p>
                <p className="text-xl font-black text-slate-950">د. إسماعيل عيسى</p>
                <p className="text-xs font-bold text-slate-600">استشاري التعليم العلاجي وتعديل السلوك وصعوبات التعلم</p>
              </div>
            </div>

            {/* Official Report Title Bar */}
            <div className="my-6 rounded-xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 p-4 text-center text-white border-y-2 border-amber-400 flex items-center justify-between">
              <div className="text-right">
                <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest">وثيقة إشرافية معتمدة إلكترونياً · OFFICIAL ASSESSMENT REPORT</p>
                <h3 className="text-lg sm:text-xl font-black text-white mt-0.5">{report.program || 'تقرير التقييم الشامل والتحليلي'}</h3>
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
                الخلاصة والتشخيص المعتمد
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

            {/* ── Signature & Official Seal Footer ── */}
            <div className="mt-8 pt-6 border-t-2 border-amber-400 flex items-end justify-between">
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <ShieldCheck size={20} className="text-amber-500 shrink-0" />
                <div>
                  <p className="font-black text-slate-800">وثيقة إشرافية موثقة برقم تسلسلي</p>
                  <p className="text-[10px] text-slate-400">منصة مَسَار التعليمية · جميع الحقوق محفوظة</p>
                </div>
              </div>

              {/* Doctor Signature Block with Hijri Date */}
              <div className="flex flex-col items-center gap-1 border border-slate-200 rounded-2xl p-4 bg-slate-50 min-w-[200px]">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">توقيع الاستشاري المعتمد</p>
                {/* Signature image */}
                <div className="relative h-16 w-44 my-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/dr-ismail-signature.png"
                    alt="توقيع د. إسماعيل عيسى"
                    className="sig-img w-full h-full object-contain"
                    style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
                  />
                </div>
                {/* Hijri Date — embedded as part of the signature block */}
                <p className="text-[11px] font-black text-slate-900 font-mono tracking-wide">
                  {hijriDate}
                </p>
                <p className="text-[11px] font-black text-slate-900">د. إسماعيل عيسى</p>
                <p className="text-[9px] font-bold text-teal-700 flex items-center gap-1">
                  <ShieldCheck size={10} /> توقيع إلكتروني موثق
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
