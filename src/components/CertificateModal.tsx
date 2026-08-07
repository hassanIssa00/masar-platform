'use client';

import { useState } from 'react';
import { Award, Printer, X, ShieldCheck, Pencil, Check, Trophy, GraduationCap, QrCode } from 'lucide-react';
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

/* ─── Golden Laurel Wreath (Left & Right) ─── */
function LaurelWreath({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      width="44"
      height="80"
      viewBox="0 0 44 80"
      fill="none"
      className="text-amber-500 shrink-0 select-none"
      style={{ transform: side === 'right' ? 'scaleX(-1)' : undefined }}
    >
      <path d="M14 10C18 18 20 30 16 42C12 54 6 66 10 76" stroke="url(#gold-leaf-grad)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 12C12 10 5 12 3 17C5 22 12 22 16 17Z" fill="url(#gold-leaf-grad)" />
      <path d="M18 26C12 24 6 27 5 33C8 36 15 35 18 29Z" fill="url(#gold-leaf-grad)" />
      <path d="M17 40C11 39 5 43 5 49C9 52 15 50 17 44Z" fill="url(#gold-leaf-grad)" />
      <path d="M14 54C8 54 4 60 5 66C9 67 14 64 15 58Z" fill="url(#gold-leaf-grad)" />
      <path d="M22 18C26 15 32 16 34 21C33 26 26 27 22 23Z" fill="url(#gold-leaf-grad)" opacity="0.8" />
      <path d="M24 32C28 29 34 31 35 36C33 41 27 41 24 36Z" fill="url(#gold-leaf-grad)" opacity="0.8" />
      <path d="M22 46C26 44 32 47 32 52C29 56 24 55 22 50Z" fill="url(#gold-leaf-grad)" opacity="0.8" />
      <defs>
        <linearGradient id="gold-leaf-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function CertificateModal({ data, onClose }: { data: CertificateData; onClose: () => void }) {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [editingEnName, setEditingEnName] = useState(false);
  const [nameEn, setNameEn] = useState(data.studentNameEn || '');

  const isAr = lang === 'ar';
  const certNo = data.certNumber || `CERT-2026-NSR-${Math.random().toString().slice(2, 7)}`;
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
        <title>${isAr ? 'شهادة إنجاز واجتياز' : 'Certificate of Completion'}</title>
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
      <div className="w-full max-w-5xl rounded-3xl bg-slate-950 shadow-2xl overflow-hidden border border-emerald-800/40">

        {/* ══ TOP ACTION TOOLBAR ══ */}
        <div className="flex items-center justify-between border-b border-emerald-900/60 bg-slate-950 px-6 py-4 print:hidden" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#06392c] text-emerald-400 border border-emerald-600/40">
              <Award size={20} />
            </div>
            <div>
              <span className="font-black text-white text-base block">شهادة التميز والاعتماد الرسمي 🏆</span>
              <span className="text-[11px] font-bold text-emerald-400/80">التصميم المعياري الجديد لمنصة مسار ونيكسس</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-black">
              <button
                onClick={() => setLang('ar')}
                className={`px-3.5 py-1.5 rounded-lg transition ${isAr ? 'bg-[#06392c] text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >🇸🇦 عربي</button>
              <button
                onClick={() => setLang('en')}
                className={`px-3.5 py-1.5 rounded-lg transition ${!isAr ? 'bg-[#06392c] text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >🇬🇧 English</button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-5 py-2.5 text-xs font-black text-slate-950 transition shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Printer size={15} /> {isAr ? 'طباعة الشهادة PDF' : 'Print PDF Certificate'}
            </button>

            {/* Close Button */}
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ══ PRINTABLE CERTIFICATE CONTAINER (EXACT MATCH TO DESIGN MOCKUP) ══ */}
        <div className="bg-slate-900 p-3 sm:p-5 print:p-0">
          <div
            id="printable-certificate"
            dir={isAr ? 'rtl' : 'ltr'}
            className="relative bg-[#fdfdfd] rounded-3xl overflow-hidden border-2 border-[#06392c] shadow-2xl flex flex-col justify-between"
            style={{
              backgroundImage: 'radial-gradient(circle at 10% 10%, rgba(6, 57, 44, 0.03) 0%, transparent 50%), radial-gradient(circle at 90% 90%, rgba(217, 119, 6, 0.03) 0%, transparent 50%)',
            }}
          >

            {/* Background Guilloche Waves SVG (Corner Flourishes) */}
            <svg width="240" height="240" viewBox="0 0 240 240" fill="none" className="absolute top-0 right-0 pointer-events-none opacity-20 text-[#06392c]">
              <circle cx="240" cy="0" r="220" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="240" cy="0" r="180" stroke="currentColor" strokeWidth="1" />
              <circle cx="240" cy="0" r="140" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
            </svg>

            <svg width="240" height="240" viewBox="0 0 240 240" fill="none" className="absolute bottom-0 left-0 pointer-events-none opacity-20 text-[#06392c]">
              <circle cx="0" cy="240" r="220" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="0" cy="240" r="180" stroke="currentColor" strokeWidth="1" />
              <circle cx="0" cy="240" r="140" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
            </svg>

            {/* ══ HEADER SECTION ══ */}
            <div className="relative z-10 px-8 pt-6 flex items-start justify-between">

              {/* 1. TOP LEFT: CERTIFIED SERIAL BOX */}
              <div className="flex items-center gap-3 bg-[#f4f7f5] border border-slate-200/90 px-4 py-2.5 rounded-2xl shadow-2xs">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#06392c] text-white">
                  <ShieldCheck size={18} />
                </div>
                <div className={`text-[11px] font-bold text-slate-700 leading-tight ${isAr ? 'text-right' : 'text-left'}`}>
                  <p className="font-black text-slate-900">{isAr ? 'شهادة معتمدة' : 'Verified Certificate'}</p>
                  <p className="font-mono text-[10px] text-slate-500">{certNo}</p>
                  <p className="text-[10px] text-slate-400">{isAr ? 'التاريخ:' : 'Date:'} {data.completionDate}</p>
                </div>
              </div>

              {/* 2. TOP CENTER: SHIELD TROPHY RIBBON BADGE */}
              <div className="flex flex-col items-center -mt-6">
                <div className="bg-[#06392c] text-white px-8 py-3 rounded-b-3xl border-b-4 border-amber-400 shadow-lg flex flex-col items-center text-center">
                  <div className="flex items-center gap-2">
                    <Trophy size={18} className="text-amber-300" />
                    <span className="text-sm font-black text-white tracking-wide">
                      {isAr ? 'شهادة إنجاز واجتياز' : 'Certificate of Achievement'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-200/90 mt-0.5">
                    {isAr ? 'تقدير رفيع المستوى' : 'High Honor Distinction'}
                  </span>
                  <div className="flex items-center gap-1 text-amber-400 text-[10px] mt-1">
                    ★★★★★
                  </div>
                </div>
              </div>

              {/* 3. TOP RIGHT: PLATFORM BRANDMARK */}
              <div className="flex items-center gap-3">
                <BrandMark size="md" showText={true} />
              </div>

            </div>

            {/* ══ MAIN BODY CONTENT ══ */}
            <div className="relative z-10 px-8 py-4 space-y-4 text-center">

              {/* MAIN HEADING */}
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl font-black text-[#06392c] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                  {isAr ? 'شهادة إنجاز واجتياز برنامج علاجي' : 'CERTIFICATE OF COMPLETION'}
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-600 max-w-xl mx-auto leading-relaxed">
                  {isAr ? (
                    <>تشهد منصة مسار للتأهيل والتعليم الذكي وتحت إشراف الاستشاري <br />
                    <strong className="text-base font-black text-[#06392c]">{data.doctorName || 'أ.د. إسماعيل عيسى'}</strong><br />
                    <span className="text-xs text-slate-500 font-bold">بأن البطل/ة</span></>
                  ) : (
                    <>This certifies that under the supervision of Consultant <br />
                    <strong className="text-base font-black text-[#06392c]">{data.doctorName || 'Prof. Dr. Ismail Issa'}</strong><br />
                    <span className="text-xs text-slate-500 font-bold">that the student</span></>
                  )}
                </p>
              </div>

              {/* STUDENT NAME (FLANKED BY GOLDEN LAUREL WREATHS) */}
              <div className="flex items-center justify-center gap-4 py-1">
                <LaurelWreath side="left" />

                <div className="relative">
                  {!isAr && editingEnName ? (
                    <div className="flex items-center gap-2 border-b-2 border-amber-500 pb-1">
                      <input
                        autoFocus
                        value={nameEn}
                        onChange={(e) => setNameEn(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingEnName(false)}
                        placeholder="Student English name..."
                        className="bg-transparent text-[#06392c] text-3xl sm:text-4xl font-black text-center outline-none tracking-wide w-80 placeholder:text-[#06392c]/30"
                        style={{ fontFamily: 'Georgia, serif' }}
                      />
                      <button onClick={() => setEditingEnName(false)} className="text-emerald-700 hover:text-emerald-900 print:hidden shrink-0">
                        <Check size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h2 className="text-3xl sm:text-5xl font-black text-[#06392c] tracking-wide" style={{ fontFamily: 'Georgia, serif' }}>
                        {displayName}
                      </h2>
                      {!isAr && (
                        <button onClick={() => setEditingEnName(true)} title="Edit English name" className="text-slate-400 hover:text-[#06392c] print:hidden shrink-0">
                          <Pencil size={15} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Underline Rule with Gold Diamond */}
                  <div className="relative mt-2 flex items-center justify-center">
                    <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                    <div className="absolute w-2.5 h-2.5 rotate-45 bg-amber-500 border border-amber-300" />
                  </div>
                </div>

                <LaurelWreath side="right" />
              </div>

              {!isAr && !nameEn && !editingEnName && (
                <p className="text-[10px] text-amber-700/70 print:hidden -mt-2">
                  ✏️ Click the pencil icon to enter the English name
                </p>
              )}

              {/* PROGRAM TITLE & SCORE ROW */}
              <div className="space-y-2.5 pt-1">
                <p className="text-xs font-bold text-slate-600">
                  {isAr ? 'قد أتم بنجاح واقتدار لكافة متطلبات الجلسات العلاجية والتحليلية النهائية المتخصصة في:' : 'Has successfully completed all specialized therapeutic & analytical session requirements in:'}
                </p>

                {/* Program Plaque Card */}
                <div className="inline-block rounded-2xl bg-[#eaefe9] px-8 py-3 border border-slate-200/90 shadow-2xs">
                  <p className="text-lg sm:text-xl font-black text-[#06392c]">
                    {isAr ? data.programTitle : englishProgramTitle(data.programTitle)}
                  </p>
                </div>

                {/* Score Pill Row */}
                <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-700 pt-1">
                  <span>{isAr ? 'وحقق نسبة إنجاز تراكمية قدرها' : 'Achieved a cumulative completion rate of'}</span>
                  <span className="rounded-xl bg-[#06392c] px-4 py-1 font-mono text-sm font-black text-amber-300 border border-emerald-600/40 shadow-2xs">
                    %{data.score}
                  </span>
                  <span>{isAr ? 'مع الالتزام التام بالجلسات الفردية والمنزلية.' : 'with full commitment to individual & home sessions.'}</span>
                </div>
              </div>

            </div>

            {/* ══ FOOTER SECTION: 3 EQUAL CARDS ══ */}
            <div className="relative z-10 px-8 pb-4 pt-2">
              <div className="grid grid-cols-3 gap-4 text-center">

                {/* CARD 1 (RIGHT IN AR): OFFICIAL CERTIFIED SEAL */}
                <div className="rounded-2xl bg-[#f4f7f5] border border-slate-200/90 p-4 space-y-1.5 shadow-2xs flex flex-col justify-between items-center">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-[#06392c]">
                    <Award size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#06392c]">{isAr ? 'الختم الرسمي المعتمد' : 'Official Certified Seal'}</p>
                    <p className="text-[10px] font-bold text-slate-500">{isAr ? 'منصة مسار التعليمية' : 'Masar Educational Platform'}</p>
                  </div>
                  <span className="rounded-full bg-[#dce4dd] px-3.5 py-1 text-[10px] font-black text-[#06392c]">
                    {isAr ? 'ختم منصة مسار' : 'Masar Platform Seal'}
                  </span>
                </div>

                {/* CARD 2 (CENTER): DOCTOR SIGNATURE & APPROVAL */}
                <div className="rounded-2xl bg-[#f4f7f5] border border-slate-200/90 p-4 space-y-1 shadow-2xs flex flex-col justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500">{isAr ? 'يعتمد هذه الشهادة' : 'Certified by'}</span>
                  <div>
                    <h3 className="text-base font-black text-[#06392c]" style={{ fontFamily: 'Georgia, serif' }}>
                      {data.doctorName || (isAr ? 'أ.د. إسماعيل عيسى' : 'Prof. Dr. Ismail Issa')}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-500">
                      {isAr ? 'استشاري التربية الخاصة وتأهيل صعوبات التعلم' : 'Special Education & Learning Difficulties Consultant'}
                    </p>
                  </div>
                  {/* Handwritten Signature SVG */}
                  <div className="h-6 flex items-center justify-center font-serif italic text-sm font-bold text-[#06392c] border-b border-amber-500/50 px-4">
                    أ.د. إسماعيل عيسى
                  </div>
                  <span className="rounded-full bg-[#e8decb] px-3.5 py-1 text-[10px] font-black text-[#5c441c]">
                    {isAr ? 'التوقيع والاعتماد المعتمد' : 'Official Authorized Signature'}
                  </span>
                </div>

                {/* CARD 3 (LEFT IN AR): ACADEMIC SEAL */}
                <div className="rounded-2xl bg-[#f4f7f5] border border-slate-200/90 p-4 space-y-1.5 shadow-2xs flex flex-col justify-between items-center">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-900">
                    <GraduationCap size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-[#06392c]">{isAr ? 'الختم الأكاديمي' : 'Academic Seal'}</p>
                    <p className="text-[10px] font-bold text-slate-500">{isAr ? 'منصة مسار للتأهيل والتعليم الذكي' : 'Smart Rehabilitation Platform'}</p>
                  </div>
                  <span className="rounded-full bg-[#dce4dd] px-3.5 py-1 text-[10px] font-black text-[#06392c]">
                    {isAr ? 'ختم منصة نيكسس' : 'Nexus Platform Seal'}
                  </span>
                </div>

              </div>
            </div>

            {/* ══ BOTTOM DARK EMERALD VERIFICATION BAR ══ */}
            <div className="relative z-10 bg-[#06392c] text-white px-8 py-3 flex items-center justify-between text-xs border-t border-emerald-900">
              
              {/* QR Verification Left */}
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-amber-300">
                  <QrCode size={18} />
                </div>
                <div className={`text-[10px] font-bold leading-tight ${isAr ? 'text-right' : 'text-left'}`}>
                  <p className="font-black text-amber-300">{isAr ? 'تحقق من صحة الشهادة' : 'Verify Certificate'}</p>
                  <p className="text-slate-300">{isAr ? 'امسح الكود للتحقق' : 'Scan Code to Verify'}</p>
                </div>
              </div>

              {/* Center Serial Shield Badge */}
              <div className="flex items-center gap-1.5 bg-white/10 px-4 py-1.5 rounded-full border border-white/20 font-mono text-[11px] font-bold text-amber-300">
                <ShieldCheck size={14} className="text-amber-400" />
                <span>{certNo}</span>
              </div>

              {/* Right Verification text */}
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-200">
                <span>{isAr ? 'شهادة صادرة رسمياً وموثقة عبر منصة مسار للتأهيل والتعليم الذكي' : 'Official Certificate verified & issued by Masar Platform'}</span>
                <div className="grid h-6 w-6 place-items-center rounded-full bg-amber-400 text-[#06392c] font-black text-xs">
                  ✓
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
