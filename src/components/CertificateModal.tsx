'use client';

import { useState } from 'react';
import { Award, Printer, X, CheckCircle2, ShieldCheck, Pencil, Check } from 'lucide-react';
import BrandMark from './BrandMark';

export interface CertificateData {
  studentName: string;
  studentNameEn?: string;
  programTitle: string;
  completionDate: string;
  score: number;
  certNumber?: string;
  doctorName?: string;
}

export default function CertificateModal({ data, onClose }: { data: CertificateData; onClose: () => void }) {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [editingEnName, setEditingEnName] = useState(false);
  const [nameEn, setNameEn] = useState(data.studentNameEn || '');

  const isAr = lang === 'ar';
  const certNo = data.certNumber || `CERT-2026-${data.studentName.replace(/\s/g, '').slice(0, 4).toUpperCase()}-MSR`;
  const displayName = isAr ? data.studentName : (nameEn || data.studentName);

  const englishProgramTitle = (title: string) => {
    if (title.includes('قراءة') || title.includes('فونيك')) return 'Reading & Phonological Awareness Intervention';
    if (title.includes('رياضيات') || title.includes('حساب')) return 'Dyscalculia & Math Remediation Program';
    if (title.includes('تخاطب') || title.includes('نطق')) return 'Speech & Language Therapy Program';
    if (title.includes('توحد')) return 'Autism Spectrum Rehabilitation Program';
    if (title.includes('كتابة') || title.includes('ديسغرافيا')) return 'Dysgraphia & Writing Skills Program';
    return 'Comprehensive Learning Difficulties Rehabilitation Program';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-3 sm:p-6 backdrop-blur-md flex items-center justify-center">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden">

        {/* ══ TOP TOOLBAR ══ */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-950 px-5 py-3.5 print:hidden" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-400/20 text-amber-400">
              <Award size={18} />
            </div>
            <span className="font-black text-white text-sm">شهادة التميز والإنجاز الرسمية</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <div className="flex rounded-lg bg-slate-800 p-0.5 border border-slate-700 text-xs font-black">
              <button
                onClick={() => setLang('ar')}
                className={`px-3 py-1.5 rounded-md transition ${isAr ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >🇸🇦 عربي</button>
              <button
                onClick={() => setLang('en')}
                className={`px-3 py-1.5 rounded-md transition ${!isAr ? 'bg-amber-400 text-slate-950' : 'text-slate-400 hover:text-white'}`}
              >🇬🇧 English</button>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-2 text-xs font-black text-slate-950 transition"
            >
              <Printer size={14} /> {isAr ? 'طباعة PDF' : 'Print PDF'}
            </button>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 hover:bg-white/20 text-white">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ══ CERTIFICATE PAPER ══ */}
        <div className="bg-slate-100 p-4 print:p-0">
          <div
            id="printable-certificate"
            dir={isAr ? 'rtl' : 'ltr'}
            className="relative bg-white rounded-xl overflow-hidden"
            style={{ border: '8px double #b45309' }}
          >
            {/* Gold stripe at top */}
            <div className="h-2 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600" />

            {/* Main Content */}
            <div className="px-8 py-6 space-y-5">

              {/* ── LETTERHEAD ── */}
              <div className="flex items-center justify-between border-b-2 border-amber-200 pb-4">
                <div className="flex items-center gap-3">
                  <BrandMark size="md" />
                  <div>
                    <div className="font-black text-indigo-950 text-sm tracking-tight">MASAR · مَسَار</div>
                    <div className="text-[10px] font-bold text-amber-700">{isAr ? 'منصة التأهيل والتعليم الذكي' : 'Smart Rehabilitation & Education Platform'}</div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] font-black text-amber-700 tracking-widest uppercase">
                    {isAr ? '— شهادة رسمية معتمدة —' : '— Official Certificate of Excellence —'}
                  </div>
                </div>
                <div className={`text-[10px] font-bold text-slate-500 ${isAr ? 'text-left' : 'text-right'} bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg`}>
                  <div className="font-black text-slate-800 font-mono text-[11px]">{certNo}</div>
                  <div>{isAr ? 'التاريخ:' : 'Date:'} {data.completionDate}</div>
                </div>
              </div>

              {/* ── MAIN TITLE ── */}
              <div className="text-center space-y-1.5">
                <div className="inline-flex items-center gap-2 text-[11px] font-black text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-4 py-1">
                  ✦ {isAr ? 'شهادة إنجاز واجتياز برنامج علاجي' : 'Certificate of Completion & Achievement'} ✦
                </div>
                <p className="text-xs font-bold text-slate-500 max-w-lg mx-auto">
                  {isAr
                    ? <>تُشهد منصة مَسَار وتحت إشراف <strong className="text-indigo-950">{data.doctorName || 'أ.د. إسماعيل عيسى'}</strong> بأن الطالب/ة:</>
                    : <>This certifies that under the supervision of <strong className="text-indigo-950">Prof. Dr. Ismail Issa</strong>, the following student:</>
                  }
                </p>
              </div>

              {/* ── STUDENT NAME ── */}
              <div className="flex justify-center">
                <div className="inline-block rounded-xl bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 px-10 py-3 shadow-lg border-2 border-amber-400">
                  {!isAr && editingEnName ? (
                    <div className="flex items-center gap-2">
                      <input
                        autoFocus
                        value={nameEn}
                        onChange={(e) => setNameEn(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingEnName(false)}
                        placeholder="Student English name..."
                        className="bg-transparent border-b-2 border-amber-400 text-amber-300 text-2xl font-black text-center outline-none tracking-wide w-72 placeholder:text-amber-300/40"
                        style={{ fontFamily: 'Georgia, serif' }}
                      />
                      <button onClick={() => setEditingEnName(false)} className="text-amber-300 hover:text-white print:hidden shrink-0">
                        <Check size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl sm:text-3xl font-black text-amber-300 tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
                        {displayName}
                      </h2>
                      {!isAr && (
                        <button onClick={() => setEditingEnName(true)} className="text-amber-400/50 hover:text-amber-300 print:hidden shrink-0">
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {!isAr && !nameEn && !editingEnName && (
                <p className="text-center text-[10px] text-amber-600/70 print:hidden -mt-3">
                  ✏️ Click <Pencil size={10} className="inline" /> to enter the English name
                </p>
              )}

              {/* ── PROGRAM & MASTERY ── */}
              <div className="text-center space-y-2.5">
                <p className="text-xs font-bold text-slate-600">
                  {isAr
                    ? 'قد أتمَّ بنجاح واقتدار كافة متطلبات الجلسات العلاجية والتمارين النمائية في:'
                    : 'Has successfully completed all therapeutic sessions and developmental requirements in:'}
                </p>
                <div className="inline-block rounded-lg bg-amber-50 border-2 border-amber-300 px-6 py-2">
                  <p className="text-lg font-black text-indigo-950">
                    {isAr ? data.programTitle : englishProgramTitle(data.programTitle)}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 pt-0.5 text-xs font-black">
                  <span className="flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-emerald-800">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    {isAr ? 'نسبة الإتقان:' : 'Mastery Score:'} <strong>{data.score}%</strong>
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg bg-teal-50 border border-teal-200 px-3 py-1.5 text-teal-800">
                    <ShieldCheck size={14} className="text-teal-600" />
                    {isAr ? 'معتمد رسمياً ✓' : 'Officially Verified ✓'}
                  </span>
                </div>
              </div>

              {/* ── FOOTER: SEALS & SIGNATURE ── like the report modal ── */}
              <div className="pt-5 border-t-2 border-slate-200 flex items-end justify-between gap-4">

                {/* LEFT: MASAR Seal (same style as PrintableReportModal) */}
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <div className="rounded-lg border-2 border-dashed border-teal-400 p-3 bg-teal-50 text-center">
                    <BrandMark size="md" showText={false} />
                    <p className="mt-1 text-[10px] font-black text-teal-800">{isAr ? 'الختم الرقمي المعتمد' : 'Digital Certified Seal'}</p>
                    <p className="text-[9px] font-bold text-teal-600">مَسَار · MASAR</p>
                  </div>
                  <p className="text-[10px] font-black text-slate-500">{isAr ? 'ختم منصة مسار' : 'Masar Platform Seal'}</p>
                </div>

                {/* CENTER: Doctor Signature (same style as PrintableReportModal) */}
                <div className="flex-1 text-center space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-500">{isAr ? 'يعتمد هذا الإنجاز رسمياً من:' : 'This achievement is officially certified by:'}</p>
                  <h3 className="text-xl font-black text-indigo-950" style={{ fontFamily: 'Georgia, serif' }}>
                    {data.doctorName || (isAr ? 'أ.د. إسماعيل عيسى' : 'Prof. Dr. Ismail Issa')}
                  </h3>
                  <p className="text-[11px] font-bold text-slate-600">
                    {isAr ? 'استشاري التربية الخاصة وتأهيل صعوبات التعلم' : 'Special Education & Learning Difficulties Consultant'}
                  </p>
                  <div className="mt-2 h-px w-48 bg-slate-300 mx-auto" />
                  <p className="text-[10px] font-bold text-slate-400">{isAr ? 'التوقيع المعتمد' : 'Authorized Signature'}</p>
                </div>

                {/* RIGHT: NEXUS Seal */}
                <div className="flex flex-col items-center gap-1.5 text-center">
                  <div className="rounded-lg border-2 border-dashed border-indigo-400 p-3 bg-indigo-50 text-center">
                    <div className="h-10 w-10 mx-auto rounded-full bg-gradient-to-br from-indigo-600 to-slate-900 flex items-center justify-center">
                      <span className="text-white text-[10px] font-black">NXS</span>
                    </div>
                    <p className="mt-1 text-[10px] font-black text-indigo-800">{isAr ? 'الختم الأكاديمي' : 'Academic Seal'}</p>
                    <p className="text-[9px] font-bold text-indigo-600">NEXUS · نيكسس</p>
                  </div>
                  <p className="text-[10px] font-black text-slate-500">{isAr ? 'ختم منصة نيكسس' : 'Nexus Accreditation Seal'}</p>
                </div>

              </div>

              {/* ── BOTTOM VERIFICATION BAR ── */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[9px] font-bold text-slate-400">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={11} className="text-teal-600" />
                  {isAr ? 'وثيقة صادرة رسمياً عبر منصة مسار ونيكسس للتعليم الذكي © 2026' : 'Official document issued by Masar & Nexus Smart Education Platforms © 2026'}
                </span>
                <span className="font-mono text-slate-500">{certNo}</span>
              </div>

            </div>

            {/* Gold stripe at bottom */}
            <div className="h-2 bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600" />
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
            width: 297mm !important;
            height: 210mm !important;
            margin: 0 !important;
            padding: 10mm 14mm !important;
            background: #fff !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          @page { size: A4 landscape; margin: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
