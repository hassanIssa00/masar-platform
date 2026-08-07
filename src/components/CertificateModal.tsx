'use client';

import { useState } from 'react';
import { Award, Printer, X, ShieldCheck, Pencil, Check } from 'lucide-react';
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

  const handlePrint = () => {
    const el = document.getElementById('printable-certificate');
    if (!el) return;
    const win = window.open('', '_blank', 'width=1200,height=900');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html dir="${isAr ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8" />
        <title>${isAr ? 'شهادة إنجاز' : 'Certificate of Completion'}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: 'Arial', sans-serif; background: #fff; }
          @page { size: A4 landscape; margin: 0; }
          @media print { html, body { width: 297mm; height: 210mm; } }
        </style>
      </head>
      <body>
        ${el.outerHTML}
      </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  const englishProgramTitle = (title: string) => {
    if (title.includes('قراءة') || title.includes('فونيك')) return 'Reading & Phonological Awareness Intervention Program';
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
            <span className="font-black text-white text-sm">شهادة التميز والإنجاز الرسمية 👑</span>
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
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-2 text-xs font-black text-slate-950 transition"
            >
              <Printer size={14} /> {isAr ? 'طباعة PDF' : 'Print PDF'}
            </button>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-xl bg-white/10 hover:bg-white/20 text-white">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ══ CERTIFICATE PAPER WITH SLEEK EXECUTIVE BORDER ══ */}
        <div className="bg-slate-100 p-4 print:p-0">
          <div
            id="printable-certificate"
            dir={isAr ? 'rtl' : 'ltr'}
            className="relative bg-white rounded-2xl p-2 shadow-sm border-2 border-amber-500"
          >
            {/* Inner Gold Frame */}
            <div className="rounded-xl border border-amber-300/80 p-6 relative bg-gradient-to-b from-[#fffefc] via-white to-[#fffef8]">

              {/* L-Shaped Gold Corner Brackets */}
              <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-600 pointer-events-none" />
              <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-600 pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-600 pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-600 pointer-events-none" />

              {/* Main Content Container */}
              <div className="space-y-6">

                {/* ── LETTERHEAD ── */}
                <div className="flex items-center justify-between border-b-2 border-amber-200/90 pb-4">
                  <div className="flex items-center gap-3">
                    <BrandMark size="md" showText={true} />
                  </div>
                  <div className="text-center">
                    <div className="text-xs font-black text-amber-900 tracking-widest bg-amber-50 border border-amber-200 px-4 py-1 rounded-full shadow-2xs">
                      {isAr ? '🏆 شهادة تميُّز واستحقاق معتمدة 🏆' : '🏆 Official Certified Certificate of Excellence 🏆'}
                    </div>
                  </div>
                  <div className={`text-[11px] font-bold text-slate-600 ${isAr ? 'text-left' : 'text-right'} bg-amber-50/80 border border-amber-200 px-3.5 py-1.5 rounded-xl`}>
                    <div className="font-black text-indigo-950 font-mono">{certNo}</div>
                    <div className="text-[10px] text-slate-500">{isAr ? 'التاريخ:' : 'Date:'} {data.completionDate}</div>
                  </div>
                </div>

                {/* ── MAIN TITLE & SUBTITLE ── */}
                <div className="text-center space-y-2 py-1">
                  <h1 className="text-2xl sm:text-4xl font-black text-indigo-950 tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                    {isAr ? 'شهادة إنجاز واجتياز برنامج علاجي' : 'CERTIFICATE OF COMPLETION'}
                  </h1>
                  <p className="text-xs sm:text-sm font-bold text-slate-600 max-w-xl mx-auto leading-relaxed">
                    {isAr
                      ? <>تُشهد منصة مَسَار للتأهيل والتعليم الذكي وتحت إشراف <strong className="text-indigo-950 font-black">{data.doctorName || 'أ.د. إسماعيل عيسى'}</strong> بأن الطالب/ة المتميز/ة:</>
                      : <>This certifies that under the expert supervision of <strong className="text-indigo-950 font-black">Prof. Dr. Ismail Issa</strong>, the student:</>
                    }
                  </p>
                </div>

                {/* ── STUDENT NAME CREATIVE HONOR PLAQUE ── */}
                <div className="py-2 text-center">
                  <div className="inline-block relative max-w-xl w-full">
                    <div className="relative rounded-2xl bg-gradient-to-r from-amber-100/50 via-amber-50 to-amber-100/50 p-4 border-2 border-amber-300/80 shadow-xs">

                      {/* Corner Flourish Brackets */}
                      <div className="absolute top-1.5 right-2.5 text-amber-500 text-xs font-black">✦</div>
                      <div className="absolute top-1.5 left-2.5 text-amber-500 text-xs font-black">✦</div>
                      <div className="absolute bottom-1.5 right-2.5 text-amber-500 text-xs font-black">✦</div>
                      <div className="absolute bottom-1.5 left-2.5 text-amber-500 text-xs font-black">✦</div>

                      {!isAr && editingEnName ? (
                        <div className="flex items-center justify-center gap-2 border-b-2 border-amber-500 pb-1">
                          <input
                            autoFocus
                            value={nameEn}
                            onChange={(e) => setNameEn(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingEnName(false)}
                            placeholder="Student English name..."
                            className="bg-transparent text-amber-950 text-3xl sm:text-4xl font-black text-center outline-none tracking-wide w-80 placeholder:text-amber-900/30"
                            style={{ fontFamily: 'Georgia, serif' }}
                          />
                          <button onClick={() => setEditingEnName(false)} className="text-amber-700 hover:text-amber-950 print:hidden shrink-0">
                            <Check size={20} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-amber-500 text-lg hidden sm:inline">🌿</span>
                          <h2 className="text-3xl sm:text-5xl font-black text-amber-950 tracking-wide drop-shadow-xs" style={{ fontFamily: 'Georgia, serif' }}>
                            {displayName}
                          </h2>
                          <span className="text-amber-500 text-lg hidden sm:inline">🌿</span>
                          {!isAr && (
                            <button onClick={() => setEditingEnName(true)} title="Edit English name" className="text-amber-700/60 hover:text-amber-950 print:hidden shrink-0">
                              <Pencil size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {!isAr && !nameEn && !editingEnName && (
                    <p className="text-[10px] text-amber-700/70 mt-1.5 print:hidden">
                      ✏️ Click the pencil to enter the English name
                    </p>
                  )}
                </div>

                {/* ── PROGRAM & MASTERY DETAILS ── */}
                <div className="text-center space-y-3 py-1">
                  <p className="text-xs sm:text-sm font-bold text-slate-700 leading-relaxed">
                    {isAr
                      ? 'قد أتمَّ بنجاح واقتدار كافة متطلبات الجلسات العلاجية والتمارين النمائية المخصصة في:'
                      : 'Has successfully completed all therapeutic sessions and developmental requirements in:'}
                  </p>
                  <div className="inline-block rounded-xl bg-amber-100/60 border-2 border-amber-300 px-7 py-2.5 shadow-2xs">
                    <p className="text-base sm:text-xl font-black text-indigo-950">
                      {isAr ? data.programTitle : englishProgramTitle(data.programTitle)}
                    </p>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-600">
                    {isAr
                      ? <>وحقق نسبة إتقان تراكمية قدرها <strong className="text-emerald-700 font-black text-base">{data.score}%</strong> مع التزام تام بالجلسات الفردية والمنزلية.</>
                      : <>Achieved a cumulative mastery score of <strong className="text-emerald-700 font-black text-base">{data.score}%</strong> with full commitment to individual and home sessions.</>
                    }
                  </p>
                </div>

                {/* ── FOOTER: SYMMETRICAL 3-COLUMN LAYOUT (MASAR SEAL - DOCTOR SIGNATURE - NEXUS SEAL) ── */}
                <div className="pt-6 mt-4 border-t-2 border-amber-200/90 grid grid-cols-3 items-end gap-4 text-center">

                  {/* COL 1: MASAR SEAL */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="rounded-xl border-2 border-dashed border-teal-500 p-3 bg-teal-50/80 w-32 shadow-2xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/brand/masar-logo.png" alt="مسار" className="h-10 w-10 mx-auto object-contain" />
                      <p className="mt-1 text-[10px] font-black text-teal-800">{isAr ? 'الختم الرقمي المعتمد' : 'Digital Certified Seal'}</p>
                      <p className="text-[9px] font-bold text-teal-600">مَسَار · MASAR</p>
                    </div>
                    <p className="text-[10px] font-black text-slate-500 mt-0.5">{isAr ? 'ختم منصة مسار' : 'Masar Platform Seal'}</p>
                  </div>

                  {/* COL 2: DOCTOR SIGNATURE (CENTERED) */}
                  <div className="flex flex-col items-center justify-center space-y-1 bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5">
                    <p className="text-[10px] font-bold text-slate-500">{isAr ? 'يعتمد هذا الإنجاز رسمياً من:' : 'Officially certified by:'}</p>
                    <h3 className="text-lg font-black text-indigo-950" style={{ fontFamily: 'Georgia, serif' }}>
                      {data.doctorName || (isAr ? 'أ.د. إسماعيل عيسى' : 'Prof. Dr. Ismail Issa')}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-600">
                      {isAr ? 'استشاري التربية الخاصة وتأهيل صعوبات التعلم' : 'Special Education & Learning Disabilities Consultant'}
                    </p>
                    <div className="mt-2 h-px w-40 bg-amber-300" />
                    <p className="text-[9px] font-bold text-slate-400">{isAr ? 'التوقيع والاعتماد المعتمد' : 'Authorized Signature'}</p>
                  </div>

                  {/* COL 3: NEXUS SEAL */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="rounded-xl border-2 border-dashed border-indigo-500 p-3 bg-indigo-50/80 w-32 shadow-2xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/brand/nexus-logo-new.webp" alt="نيكسس" className="h-10 w-10 mx-auto object-contain" />
                      <p className="mt-1 text-[10px] font-black text-indigo-800">{isAr ? 'الختم الأكاديمي' : 'Academic Seal'}</p>
                      <p className="text-[9px] font-bold text-indigo-600">NEXUS · نيكسس</p>
                    </div>
                    <p className="text-[10px] font-black text-slate-500 mt-0.5">{isAr ? 'ختم منصة نيكسس' : 'Nexus Platform Seal'}</p>
                  </div>

                </div>

                {/* ── BOTTOM VERIFICATION LINE ── */}
                <div className="flex items-center justify-between border-t border-amber-200/60 pt-2 text-[9px] font-bold text-slate-400">
                  <span className="flex items-center gap-1">
                    <ShieldCheck size={11} className="text-teal-600" />
                    {isAr ? 'وثيقة صادرة رسمياً عبر منصة مسار ونيكسس للتعليم الذكي © 2026' : 'Official document issued by Masar & Nexus Smart Education Platforms © 2026'}
                  </span>
                  <span className="font-mono text-slate-500">{certNo}</span>
                </div>

              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
