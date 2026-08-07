'use client';

import { useState } from 'react';
import { Award, Printer, ShieldCheck, Sparkles, X, CheckCircle2, Globe } from 'lucide-react';
import BrandMark from './BrandMark';

export interface CertificateData {
  studentName: string;
  programTitle: string;
  completionDate: string;
  score: number;
  certNumber?: string;
  doctorName?: string;
}

export default function CertificateModal({ data, onClose }: { data: CertificateData; onClose: () => void }) {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  const handlePrint = () => {
    window.print();
  };

  const certNo = data.certNumber || `CERT-2026-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const isAr = lang === 'ar';

  // Translation helpers
  const englishProgramTitle = (title: string) => {
    if (title.includes('قراءة')) return 'Comprehensive Reading & Phonology Intervention Program';
    if (title.includes('رياضيات') || title.includes('حساب')) return 'Diagnostic Dyscalculia & Math Remediation Program';
    if (title.includes('تخاطب') || title.includes('نطق')) return 'Speech & Language Therapy Program';
    if (title.includes('توحد')) return 'Autism Spectrum Developmental Rehabilitation Program';
    return 'Comprehensive Learning Difficulties Intervention Program';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-3 sm:p-6 backdrop-blur-md grid place-items-center">

      <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-amber-300/40">

        {/* ══ ACTION BAR WITH LANGUAGE TOGGLE ══ */}
        <div className="flex items-center justify-between border-b border-amber-200/60 bg-slate-950 px-6 py-4 print:hidden" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30">
              <Award size={20} />
            </div>
            <div>
              <h2 className="font-black text-white text-sm sm:text-base">
                {isAr ? 'شهادة التميز والإنجاز الرسمية 👑' : 'Official Certificate of Excellence 👑'}
              </h2>
              <p className="text-[11px] text-amber-200/70 font-semibold">
                {isAr ? 'وثيقة معتمدة ومختومة بختمَي مسار ونيكسس' : 'Official Verified Document by Masar & Nexus Platforms'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Toggle */}
            <div className="flex items-center rounded-xl bg-slate-800 p-1 border border-slate-700">
              <button
                onClick={() => setLang('ar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition ${
                  isAr ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>🇸🇦</span> العربية
              </button>
              <button
                onClick={() => setLang('en')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition ${
                  !isAr ? 'bg-amber-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>🇬🇧</span> English
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-5 py-2 text-xs font-black text-slate-950 transition shadow-lg active:scale-95"
            >
              <Printer size={15} /> {isAr ? 'طباعة PDF' : 'Print PDF'}
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ══ CERTIFICATE PAPER CONTAINER ══ */}
        <div className="p-3 sm:p-6 bg-slate-900 print:p-0">
          <div
            id="printable-certificate"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#fffefc] via-[#fffdf7] to-[#fffef8] p-6 sm:p-10 text-slate-900 transition-all shadow-2xl"
            style={{
              border: '10px double #b45309',
              outline: '2px solid #fef08a',
              outlineOffset: '-5px',
            }}
            dir={isAr ? 'rtl' : 'ltr'}
          >

            {/* Gold Corner Accents (CSS based for perfect alignment) */}
            <div className="absolute top-3 right-3 w-8 h-8 border-t-4 border-r-4 border-amber-500 pointer-events-none" />
            <div className="absolute top-3 left-3 w-8 h-8 border-t-4 border-l-4 border-amber-500 pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-4 border-r-4 border-amber-500 pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-4 border-l-4 border-amber-500 pointer-events-none" />

            {/* ── HEADER ROW ── */}
            <div className="flex items-center justify-between border-b-2 border-amber-200 pb-5 mb-5">
              {/* Logo Side */}
              <div className="flex items-center gap-3">
                <BrandMark size="md" />
                <div>
                  <div className="text-sm font-black text-indigo-950 tracking-tight">MASAR · مَسَار</div>
                  <div className="text-[10px] font-bold text-amber-700">
                    {isAr ? 'منصة التأهيل والتعليم الذكي' : 'Smart Rehabilitation & Education'}
                  </div>
                </div>
              </div>

              {/* Center Title */}
              <div className="text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-4 py-1 text-[11px] font-black text-amber-900 border border-amber-300">
                  <Sparkles size={13} className="text-amber-600" />
                  {isAr ? 'وثيقة رسمية معتمدة' : 'Official Verified Certificate'}
                  <Sparkles size={13} className="text-amber-600" />
                </span>
              </div>

              {/* Serial & Date */}
              <div className={`text-[11px] font-bold text-slate-600 bg-amber-50/80 border border-amber-200 px-3.5 py-1.5 rounded-xl ${isAr ? 'text-left' : 'text-right'}`}>
                <p className="font-black text-indigo-950 font-mono">{certNo}</p>
                <p className="text-[10px] text-slate-500">{isAr ? 'التاريخ:' : 'Date:'} {data.completionDate}</p>
              </div>
            </div>

            {/* ── MAIN CERTIFICATE TITLE ── */}
            <div className="text-center space-y-2 py-2">
              <h1 className="text-2xl sm:text-3xl font-black text-indigo-950 tracking-tight" style={{ fontFamily: isAr ? 'Arial, sans-serif' : 'Georgia, serif' }}>
                {isAr ? 'شهادة إنجاز واجتياز برنامج علاجي' : 'CERTIFICATE OF COMPLETION'}
              </h1>
              <p className="text-xs sm:text-sm font-bold text-slate-600 max-w-xl mx-auto leading-relaxed">
                {isAr ? (
                  <>تشهد منصة مَسَار للتأهيل والتعليم الذكي وتحت إشراف <strong className="text-indigo-950 font-black">أ.د. إسماعيل عيسى</strong> بأن الطالب/ة المتميز/ة:</>
                ) : (
                  <>This is to certify that under the expert supervision of <strong className="text-indigo-950 font-black">Prof. Dr. Ismail Issa</strong>, the student:</>
                )}
              </p>
            </div>

            {/* ── STUDENT NAME BOX ── */}
            <div className="py-3 text-center">
              <div className="inline-block max-w-xl w-full rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-1 shadow-lg border-2 border-amber-400">
                <div className="rounded-xl bg-gradient-to-r from-slate-950 via-indigo-900 to-slate-950 py-3.5 px-6 border border-amber-300/30">
                  <h2 className="text-2xl sm:text-4xl font-black text-amber-300 tracking-wide" style={{ fontFamily: isAr ? 'Georgia, serif' : 'Georgia, serif' }}>
                    {data.studentName}
                  </h2>
                </div>
              </div>
            </div>

            {/* ── PROGRAM & MASTERY DETAILS ── */}
            <div className="text-center max-w-xl mx-auto space-y-3 py-2">
              <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
                {isAr ? 'قد أتمّ بنجاح واقتدار كافة متطلبات الجلسات العلاجية والتمارين النمائية المخصصة في:' : 'Has successfully completed all therapeutic sessions and developmental requirements in:'}
              </p>

              <div className="inline-block rounded-xl bg-amber-100/80 border-2 border-amber-300 px-5 py-2.5 shadow-xs">
                <p className="text-base sm:text-xl font-black text-indigo-950">
                  {isAr ? data.programTitle : englishProgramTitle(data.programTitle)}
                </p>
              </div>

              <div className="flex items-center justify-center gap-4 pt-1">
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-black text-emerald-800">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>{isAr ? 'نسبة الإتقان:' : 'Mastery Score:'} <strong className="text-sm text-emerald-950 font-black">{data.score}%</strong></span>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200 px-3.5 py-1.5 text-xs font-black text-blue-800">
                  <ShieldCheck size={15} className="text-blue-600" />
                  <span>{isAr ? 'الحالة: معتمد رسمياً ✓' : 'Status: Officially Verified ✓'}</span>
                </div>
              </div>
            </div>

            {/* ── FOOTER: DUAL SEALS & SIGNATURE ── */}
            <div className="pt-6 mt-4 border-t-2 border-amber-200 grid grid-cols-3 items-end gap-3 text-center">

              {/* MASAR Seal */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-emerald-400 via-teal-600 to-teal-900 border-2 border-amber-300 flex flex-col items-center justify-center shadow-md text-white">
                  <span className="text-[11px] sm:text-xs font-black tracking-wider">مَسَار</span>
                  <span className="text-[8px] font-bold text-teal-200">MASAR</span>
                </div>
                <span className="text-[10px] font-black text-teal-800">{isAr ? 'ختم منصة مسار' : 'Masar Platform Seal'}</span>
              </div>

              {/* Doctor Signature */}
              <div className="flex flex-col items-center gap-1 bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-500">{isAr ? 'توقيع واعتماد الاستشاري' : 'Consultant Signature'}</span>
                <div className="h-9 w-36 border-b-2 border-indigo-950 flex items-end justify-center pb-0.5">
                  <span className="font-serif italic text-xs sm:text-sm font-bold text-indigo-950">
                    {data.doctorName || 'أ.د. إسماعيل عيسى'}
                  </span>
                </div>
                <p className="font-black text-slate-900 text-xs mt-0.5">{data.doctorName || 'أ.د. إسماعيل عيسى'}</p>
                <p className="text-[9px] font-bold text-slate-500 text-center">
                  {isAr ? 'استشاري التربية الخاصة وتأهيل صعوبات التعلم' : 'Special Education & Learning Disabilities Consultant'}
                </p>
              </div>

              {/* NEXUS Seal */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-400 via-indigo-700 to-slate-900 border-2 border-amber-300 flex flex-col items-center justify-center shadow-md text-white">
                  <span className="text-[11px] sm:text-xs font-black tracking-wider">نيكسس</span>
                  <span className="text-[8px] font-bold text-blue-200">NEXUS</span>
                </div>
                <span className="text-[10px] font-black text-indigo-900">{isAr ? 'ختم منصة نيكسس' : 'Nexus Accreditation Seal'}</span>
              </div>

            </div>

            {/* Bottom Verification Line */}
            <div className="mt-4 border-t border-amber-200/60 pt-2 text-[9px] font-bold text-slate-400 flex items-center justify-between">
              <span>{isAr ? 'شهادة صادر رسمياً عبر منصة مسار ونيكسس للتعليم الذكي © 2026' : 'Official Certificate issued by Masar & Nexus Platforms © 2026'}</span>
              <span className="font-mono text-slate-500">{certNo}</span>
            </div>

          </div>
        </div>

      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-certificate, #printable-certificate * { visibility: visible !important; }
          #printable-certificate {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100% !important;
            padding: 15mm 18mm !important;
            background: #fffdf7 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          @page { size: A4 landscape; margin: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
