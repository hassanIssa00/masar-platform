'use client';

import { useState } from 'react';
import { Award, Printer, X, ShieldCheck, Pencil, Check, Sparkles, Medal } from 'lucide-react';
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
    if (title.includes('رياضيات') || title.includes('حساب')) return 'Diagnostic Dyscalculia & Math Remediation Program';
    if (title.includes('تخاطب') || title.includes('نطق')) return 'Speech & Language Therapy Program';
    if (title.includes('توحد')) return 'Autism Spectrum Rehabilitation Program';
    if (title.includes('كتابة') || title.includes('ديسغرافيا')) return 'Dysgraphia & Writing Skills Program';
    return 'Comprehensive Learning Difficulties Rehabilitation Program';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 p-3 sm:p-6 backdrop-blur-md flex items-center justify-center">
      <div className="w-full max-w-4xl rounded-3xl bg-slate-950 shadow-2xl overflow-hidden border border-amber-500/40">

        {/* ══ TOP TOOLBAR ══ */}
        <div className="flex items-center justify-between border-b border-amber-500/30 bg-slate-950 px-6 py-4 print:hidden" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-md">
              <Award size={20} />
            </div>
            <div>
              <span className="font-black text-white text-base block">شهادة التميز والاعتماد الرسمي الملكي 👑</span>
              <span className="text-[11px] font-bold text-amber-300/80">وثيقة رسمية رفيعة المستوى صادرة عن منصتي مسار ونيكسس</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-black">
              <button
                onClick={() => setLang('ar')}
                className={`px-3.5 py-1.5 rounded-lg transition ${isAr ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >🇸🇦 عربي</button>
              <button
                onClick={() => setLang('en')}
                className={`px-3.5 py-1.5 rounded-lg transition ${!isAr ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'}`}
              >🇬🇧 English</button>
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:brightness-110 px-5 py-2 text-xs font-black text-slate-950 transition shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Printer size={15} /> {isAr ? 'طباعة شهادة فاخرة PDF' : 'Print PDF Certificate'}
            </button>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ══ CERTIFICATE PAPER WITH ROYAL GOLD METALLIC FRAME ══ */}
        <div className="bg-slate-900 p-4 sm:p-6 print:p-0">
          <div
            id="printable-certificate"
            dir={isAr ? 'rtl' : 'ltr'}
            className="relative bg-gradient-to-b from-[#fffdf5] via-[#fffef9] to-[#fffdf2] rounded-2xl overflow-hidden p-2 shadow-2xl"
            style={{
              border: '6px solid #b45309',
              outline: '3px solid #fef08a',
              outlineOffset: '-6px',
            }}
          >
            {/* INNER BOLD ACCENT FRAME LINE */}
            <div className="rounded-xl border-2 border-amber-500/80 p-6 sm:p-8 relative">

              {/* Corner Fleuron Ornaments */}
              <div className="absolute top-2 right-3 text-amber-700 text-sm font-black select-none">❖ ✦ ❖</div>
              <div className="absolute top-2 left-3 text-amber-700 text-sm font-black select-none">❖ ✦ ❖</div>
              <div className="absolute bottom-2 right-3 text-amber-700 text-sm font-black select-none">❖ ✦ ❖</div>
              <div className="absolute bottom-2 left-3 text-amber-700 text-sm font-black select-none">❖ ✦ ❖</div>

              {/* ── LETTERHEAD ── */}
              <div className="flex items-center justify-between border-b-2 border-amber-300/80 pb-5">
                <div className="flex items-center gap-3">
                  <BrandMark size="md" showText={true} />
                </div>
                <div className="text-center">
                  <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-950 tracking-widest bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 border-2 border-amber-400 px-5 py-1.5 rounded-full shadow-xs">
                    <Sparkles size={14} className="text-amber-700" />
                    <span>{isAr ? 'شهادة إنجاز واستحقاق تقديري رفيعة المستوى' : 'Official Certificate of Academic Excellence'}</span>
                    <Sparkles size={14} className="text-amber-700" />
                  </div>
                </div>
                <div className={`text-[11px] font-bold text-slate-600 ${isAr ? 'text-left' : 'text-right'} bg-amber-50 border-2 border-amber-200 px-4 py-1.5 rounded-xl shadow-2xs`}>
                  <div className="font-black text-indigo-950 font-mono text-xs">{certNo}</div>
                  <div className="text-[10px] text-amber-800 font-bold">{isAr ? 'التاريخ:' : 'Date:'} {data.completionDate}</div>
                </div>
              </div>

              {/* ── MAIN TITLE & CREST ── */}
              <div className="text-center space-y-2 py-2">
                <div className="inline-block">
                  <h1 className="text-3xl sm:text-5xl font-black text-indigo-950 tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                    {isAr ? 'شهادة إنجاز واجتياز برنامج علاجي' : 'CERTIFICATE OF COMPLETION'}
                  </h1>
                  <div className="h-1 w-3/4 mx-auto bg-gradient-to-r from-transparent via-amber-500 to-transparent mt-2 rounded-full" />
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-700 max-w-xl mx-auto leading-relaxed pt-1">
                  {isAr
                    ? <>تُشهد منصة مَسَار للتأهيل والتعليم الذكي وتحت الإشراف الاستشاري المباشر لـ <strong className="text-indigo-950 font-black">{data.doctorName || 'أ.د. إسماعيل عيسى'}</strong> بأن البطل/ة:</>
                    : <>This is to certify that under the direct supervision of <strong className="text-indigo-950 font-black">Prof. Dr. Ismail Issa</strong>, the student:</>
                  }
                </p>
              </div>

              {/* ── STUDENT NAME ROYAL HONOR PLAQUE ── */}
              <div className="py-3 text-center">
                <div className="inline-block relative max-w-2xl w-full">
                  <div className="relative rounded-2xl bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 p-5 border-4 border-amber-400 shadow-md">

                    {/* Corner Flourish Brackets */}
                    <div className="absolute top-2 right-3 text-amber-600 text-sm font-black">✦</div>
                    <div className="absolute top-2 left-3 text-amber-600 text-sm font-black">✦</div>
                    <div className="absolute bottom-2 right-3 text-amber-600 text-sm font-black">✦</div>
                    <div className="absolute bottom-2 left-3 text-amber-600 text-sm font-black">✦</div>

                    {!isAr && editingEnName ? (
                      <div className="flex items-center justify-center gap-2 border-b-2 border-amber-500 pb-1">
                        <input
                          autoFocus
                          value={nameEn}
                          onChange={(e) => setNameEn(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingEnName(false)}
                          placeholder="Student English name..."
                          className="bg-transparent text-amber-950 text-3xl sm:text-5xl font-black text-center outline-none tracking-wide w-96 placeholder:text-amber-900/30"
                          style={{ fontFamily: 'Georgia, serif' }}
                        />
                        <button onClick={() => setEditingEnName(false)} className="text-amber-800 hover:text-amber-950 print:hidden shrink-0">
                          <Check size={22} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        <span className="text-amber-600 text-xl hidden sm:inline">👑</span>
                        <h2 className="text-3xl sm:text-5xl font-black text-amber-950 tracking-wide drop-shadow-xs" style={{ fontFamily: 'Georgia, serif' }}>
                          {displayName}
                        </h2>
                        <span className="text-amber-600 text-xl hidden sm:inline">👑</span>
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
                <div className="inline-block rounded-2xl bg-amber-100/80 border-2 border-amber-400 px-8 py-3 shadow-xs">
                  <p className="text-lg sm:text-2xl font-black text-indigo-950">
                    {isAr ? data.programTitle : englishProgramTitle(data.programTitle)}
                  </p>
                </div>
                <p className="text-xs sm:text-sm font-bold text-slate-700">
                  {isAr
                    ? <>وحقق نسبة إتقان تراكمية قدرها <strong className="text-emerald-800 font-black text-lg bg-emerald-100 border border-emerald-300 px-3 py-0.5 rounded-lg">{data.score}%</strong> مع التزام تام بالجلسات الفردية والمنزلية.</>
                    : <>Achieved a cumulative mastery score of <strong className="text-emerald-800 font-black text-lg bg-emerald-100 border border-emerald-300 px-3 py-0.5 rounded-lg">{data.score}%</strong> with full commitment to individual and home sessions.</>
                  }
                </p>
              </div>

              {/* ── FOOTER: SYMMETRICAL DUAL FOIL SEALS + DOCTOR SIGNATURE ── */}
              <div className="pt-6 mt-4 border-t-2 border-amber-300/80 grid grid-cols-3 items-end gap-4 text-center">

                {/* COL 1: MASAR SEAL */}
                <div className="flex flex-col items-center gap-1">
                  <div className="rounded-2xl border-2 border-dashed border-teal-600 p-3 bg-teal-50/90 w-36 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/masar-logo.png" alt="مسار" className="h-11 w-11 mx-auto object-contain" />
                    <p className="mt-1 text-[11px] font-black text-teal-900">{isAr ? 'الختم الرقمي المعتمد' : 'Digital Certified Seal'}</p>
                    <p className="text-[9px] font-bold text-teal-700">مَسَار · MASAR</p>
                  </div>
                  <p className="text-[10px] font-black text-teal-900 mt-1">{isAr ? 'ختم منصة مسار' : 'Masar Platform Seal'}</p>
                </div>

                {/* COL 2: DOCTOR SIGNATURE (CENTERED) */}
                <div className="flex flex-col items-center justify-center space-y-1 bg-gradient-to-b from-amber-50 to-amber-100/60 border-2 border-amber-300 rounded-2xl p-4 shadow-2xs">
                  <p className="text-[10px] font-bold text-slate-600">{isAr ? 'يعتمد هذا الإنجاز رسمياً من:' : 'Officially certified by:'}</p>
                  <h3 className="text-xl font-black text-indigo-950" style={{ fontFamily: 'Georgia, serif' }}>
                    {data.doctorName || (isAr ? 'أ.د. إسماعيل عيسى' : 'Prof. Dr. Ismail Issa')}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-700">
                    {isAr ? 'استشاري التربية الخاصة وتأهيل صعوبات التعلم' : 'Special Education & Learning Disabilities Consultant'}
                  </p>
                  <div className="mt-2 h-0.5 w-44 bg-amber-400" />
                  <p className="text-[9px] font-bold text-slate-500">{isAr ? 'التوقيع والاعتماد المعتمد' : 'Authorized Signature'}</p>
                </div>

                {/* COL 3: NEXUS SEAL */}
                <div className="flex flex-col items-center gap-1">
                  <div className="rounded-2xl border-2 border-dashed border-indigo-600 p-3 bg-indigo-50/90 w-36 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/nexus-logo-new.webp" alt="نيكسس" className="h-11 w-11 mx-auto object-contain" />
                    <p className="mt-1 text-[11px] font-black text-indigo-900">{isAr ? 'الختم الأكاديمي' : 'Academic Seal'}</p>
                    <p className="text-[9px] font-bold text-indigo-700">NEXUS · نيكسس</p>
                  </div>
                  <p className="text-[10px] font-black text-indigo-900 mt-1">{isAr ? 'ختم منصة نيكسس' : 'Nexus Platform Seal'}</p>
                </div>

              </div>

              {/* ── BOTTOM VERIFICATION LINE ── */}
              <div className="flex items-center justify-between border-t border-amber-300/60 pt-3 text-[10px] font-bold text-slate-500">
                <span className="flex items-center gap-1">
                  <ShieldCheck size={13} className="text-teal-700" />
                  {isAr ? 'وثيقة صادرة رسمياً وموثقة عبر منصتي مسار ونيكسس للتعليم الذكي © 2026' : 'Official document verified & issued by Masar & Nexus Smart Platforms © 2026'}
                </span>
                <span className="font-mono font-black text-slate-700">{certNo}</span>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
