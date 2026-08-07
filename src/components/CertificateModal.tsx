'use client';

import { useState } from 'react';
import { Printer, X, ShieldCheck, Pencil, Check, Trophy, GraduationCap, QrCode, Award } from 'lucide-react';
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

/* ── Golden Laurel Branch (Exact match to image) ── */
function GoldenLaurelBranch({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      width="42"
      height="76"
      viewBox="0 0 42 76"
      fill="none"
      className="shrink-0 select-none"
      style={{ transform: side === 'right' ? 'scaleX(-1)' : undefined }}
    >
      <path
        d="M20 5C24 15 25 28 20 42C15 54 8 62 12 68"
        stroke="#c49235"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M21 7C16 4 9 7 7 12C10 17 17 16 21 11Z" fill="#d9a238" />
      <path d="M22 18C16 15 9 19 8 24C12 27 19 25 22 19Z" fill="#c49235" />
      <path d="M21 30C15 28 9 32 9 37C13 40 19 37 21 32Z" fill="#d9a238" />
      <path d="M18 43C12 42 7 47 8 52C12 54 17 50 18 45Z" fill="#c49235" />
      <path d="M14 55C9 55 5 60 7 64C10 65 14 62 15 57Z" fill="#d9a238" />
      <path d="M25 13C29 9 35 11 36 16C34 21 27 21 23 17Z" fill="#e5b34a" />
      <path d="M26 25C30 22 36 24 37 29C35 34 28 34 24 29Z" fill="#d9a238" />
      <path d="M24 37C28 34 34 37 34 42C31 46 25 45 23 40Z" fill="#c49235" />
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

        {/* ══ ACTION TOOLBAR (Hidden when printed) ══ */}
        <div className="flex items-center justify-between border-b border-emerald-900/60 bg-slate-950 px-6 py-3.5 print:hidden" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#06392c] text-emerald-400 border border-emerald-600/40">
              <Award size={20} />
            </div>
            <div>
              <span className="font-black text-white text-base block">شهادة التميز والاعتماد الرسمي 🏆</span>
              <span className="text-[11px] font-bold text-emerald-400/80">التصميم المعياري الجديد المعتمد لمنصة مسار ونيكسس</span>
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

        {/* ══ PRINTABLE CERTIFICATE CONTAINER (EXACT MATCH TO USER MOCKUP) ══ */}
        <div className="bg-slate-900 p-2 sm:p-4 print:p-0">
          <div
            id="printable-certificate"
            dir={isAr ? 'rtl' : 'ltr'}
            className="relative bg-[#f8faf8] rounded-[28px] overflow-hidden border-2 border-[#06392c] shadow-2xl flex flex-col justify-between"
          >

            {/* Background Guilloche Waves SVG (Exact corner swirls) */}
            <svg width="280" height="280" viewBox="0 0 280 280" fill="none" className="absolute top-0 right-0 pointer-events-none opacity-25 text-[#06392c]">
              <circle cx="280" cy="0" r="260" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="280" cy="0" r="210" stroke="currentColor" strokeWidth="1" />
              <circle cx="280" cy="0" r="160" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
            </svg>

            <svg width="280" height="280" viewBox="0 0 280 280" fill="none" className="absolute bottom-0 left-0 pointer-events-none opacity-25 text-[#06392c]">
              <circle cx="0" cy="280" r="260" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="0" cy="280" r="210" stroke="currentColor" strokeWidth="1" />
              <circle cx="0" cy="280" r="160" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
            </svg>

            {/* ══ 1. HEADER SECTION ══ */}
            <div className="relative z-10 px-8 pt-6 flex items-start justify-between">

              {/* Top Left: Certified Box */}
              <div className="flex items-center gap-3 bg-[#eef2ef] border border-slate-300/80 px-4 py-2 rounded-2xl">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#06392c] text-white">
                  <ShieldCheck size={20} />
                </div>
                <div className={`text-[11px] font-bold text-slate-700 leading-snug ${isAr ? 'text-right' : 'text-left'}`}>
                  <p className="font-black text-slate-900">{isAr ? 'شهادة معتمدة' : 'Verified Certificate'}</p>
                  <p className="font-mono text-[10px] text-slate-500">{certNo}</p>
                  <p className="text-[10px] text-slate-400">{isAr ? 'التاريخ:' : 'Date:'} {data.completionDate}</p>
                </div>
              </div>

              {/* Top Center: Trophy Ribbon Shield Banner */}
              <div className="flex flex-col items-center -mt-6">
                <div className="bg-[#06392c] text-white px-8 py-3.5 rounded-b-[24px] border-b-[3px] border-[#d9a238] shadow-md flex flex-col items-center text-center">
                  <div className="flex items-center gap-2">
                    <Trophy size={19} className="text-[#d9a238]" />
                    <span className="text-sm sm:text-base font-black text-white tracking-wide">
                      {isAr ? 'شهادة إنجاز واجتياز' : 'Certificate of Achievement'}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-200 mt-0.5">
                    {isAr ? 'تقدير رفيع المستوى' : 'High Honor Distinction'}
                  </span>
                  <div className="flex items-center gap-1 text-[#d9a238] text-xs mt-1">
                    ★★★★★
                  </div>
                </div>
              </div>

              {/* Top Right: BrandMark Logo */}
              <div className="flex items-center gap-3">
                <BrandMark size="md" showText={true} />
              </div>

            </div>

            {/* ══ 2. MAIN BODY CONTENT ══ */}
            <div className="relative z-10 px-8 py-4 space-y-4 text-center">

              {/* Main Certificate Title */}
              <div className="space-y-1">
                <h1 className="text-3xl sm:text-4xl font-black text-[#06392c] tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                  {isAr ? 'شهادة إنجاز واجتياز برنامج علاجي' : 'CERTIFICATE OF COMPLETION'}
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-700 max-w-xl mx-auto leading-relaxed">
                  {isAr ? (
                    <>تشهد منصة مسار للتأهيل والتعليم الذكي وتحت إشراف الاستشاري <br />
                    <strong className="text-base sm:text-lg font-black text-[#06392c]">{data.doctorName || 'أ.د. إسماعيل عيسى'}</strong><br />
                    <span className="text-xs text-slate-500 font-bold">بأن البطل/ة</span></>
                  ) : (
                    <>This certifies that under the supervision of Consultant <br />
                    <strong className="text-base sm:text-lg font-black text-[#06392c]">{data.doctorName || 'Prof. Dr. Ismail Issa'}</strong><br />
                    <span className="text-xs text-slate-500 font-bold">that the student</span></>
                  )}
                </p>
              </div>

              {/* Student Name Flanked by Golden Laurel Branches */}
              <div className="flex items-center justify-center gap-4 py-1">
                <GoldenLaurelBranch side="left" />

                <div className="relative">
                  {!isAr && editingEnName ? (
                    <div className="flex items-center gap-2 border-b-2 border-[#d9a238] pb-1">
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

                  {/* Underline Rule with Gold Center Diamond */}
                  <div className="relative mt-2.5 flex items-center justify-center">
                    <div className="h-0.5 w-full bg-[#d9a238]" />
                    <div className="absolute w-2.5 h-2.5 rotate-45 bg-[#d9a238]" />
                  </div>
                </div>

                <GoldenLaurelBranch side="right" />
              </div>

              {!isAr && !nameEn && !editingEnName && (
                <p className="text-[10px] text-amber-700/70 print:hidden -mt-2">
                  ✏️ Click the pencil icon to enter the English name
                </p>
              )}

              {/* Program Title & Score Row */}
              <div className="space-y-2.5 pt-1">
                <p className="text-xs font-bold text-slate-600">
                  {isAr ? 'قد أتم بنجاح واقتدار لكافة متطلبات الجلسات العلاجية والتحليلية النهائية المتخصصة في:' : 'Has successfully completed all specialized therapeutic & analytical session requirements in:'}
                </p>

                {/* Program Plaque Card */}
                <div className="inline-block rounded-2xl bg-[#e2e8e3] px-8 py-3 border border-slate-300/70 shadow-2xs">
                  <p className="text-lg sm:text-xl font-black text-[#06392c]">
                    {isAr ? data.programTitle : englishProgramTitle(data.programTitle)}
                  </p>
                </div>

                {/* Score Pill Row */}
                <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-700 pt-1">
                  <span>{isAr ? 'وحقق نسبة إنجاز تراكمية قدرها' : 'Achieved a cumulative completion rate of'}</span>
                  <span className="rounded-xl bg-[#06392c] px-4 py-1 font-mono text-sm font-black text-white border border-emerald-600/40 shadow-2xs">
                    %{data.score}
                  </span>
                  <span>{isAr ? 'مع الالتزام التام بالجلسات الفردية والمنزلية.' : 'with full commitment to individual & home sessions.'}</span>
                </div>
              </div>

            </div>

            {/* ══ 3. FOOTER SECTION: 3 EQUAL LIGHT CARDS ══ */}
            <div className="relative z-10 px-8 pb-4 pt-2">
              <div className="grid grid-cols-3 gap-4 text-center">

                {/* CARD 1 (RIGHT IN AR): OFFICIAL CERTIFIED SEAL */}
                <div className="rounded-2xl bg-[#eef2ef] border border-slate-300/80 p-4 space-y-2 flex flex-col justify-between items-center">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-[#06392c]">
                    <Award size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#06392c]">{isAr ? 'الختم الرسمي المعتمد' : 'Official Certified Seal'}</p>
                    <p className="text-[10px] font-bold text-slate-500">{isAr ? 'منصة مسار التعليمية' : 'Masar Educational Platform'}</p>
                  </div>
                  <span className="rounded-full bg-[#dce3de] px-4 py-1 text-xs font-bold text-slate-700">
                    {isAr ? 'ختم منصة مسار' : 'Masar Platform Seal'}
                  </span>
                </div>

                {/* CARD 2 (CENTER): DOCTOR SIGNATURE & APPROVAL */}
                <div className="rounded-2xl bg-[#eef2ef] border border-slate-300/80 p-4 space-y-1.5 flex flex-col justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">{isAr ? 'يعتمد هذه الشهادة' : 'Certified by'}</span>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-[#06392c]" style={{ fontFamily: 'Georgia, serif' }}>
                      {data.doctorName || (isAr ? 'أ.د. إسماعيل عيسى' : 'Prof. Dr. Ismail Issa')}
                    </h3>
                    <p className="text-[10px] font-bold text-slate-500">
                      {isAr ? 'استشاري التربية الخاصة وتأهيل صعوبات التعلم' : 'Special Education & Learning Difficulties Consultant'}
                    </p>
                  </div>
                  {/* Handwritten Signature Script */}
                  <div className="h-6 flex items-center justify-center font-serif italic text-sm font-bold text-[#c88d28] px-4 border-b border-[#c88d28]/40">
                    أ.د. إسماعيل عيسى
                  </div>
                  <span className="rounded-full bg-[#e6d8be] px-4 py-1 text-xs font-bold text-[#6d511f]">
                    {isAr ? 'التوقيع والاعتماد المعتمد' : 'Authorized Signature'}
                  </span>
                </div>

                {/* CARD 3 (LEFT IN AR): ACADEMIC SEAL */}
                <div className="rounded-2xl bg-[#eef2ef] border border-slate-300/80 p-4 space-y-2 flex flex-col justify-between items-center">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-indigo-900">
                    <GraduationCap size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#06392c]">{isAr ? 'الختم الأكاديمي' : 'Academic Seal'}</p>
                    <p className="text-[10px] font-bold text-slate-500">{isAr ? 'منصة مسار للتأهيل والتعليم الذكي' : 'Smart Rehabilitation Platform'}</p>
                  </div>
                  <span className="rounded-full bg-[#dce3de] px-4 py-1 text-xs font-bold text-slate-700">
                    {isAr ? 'ختم منصة نيكسس' : 'Nexus Platform Seal'}
                  </span>
                </div>

              </div>
            </div>

            {/* ══ 4. BOTTOM DARK EMERALD VERIFICATION BAR ══ */}
            <div className="relative z-10 bg-[#06392c] text-white px-8 py-3.5 flex items-center justify-between text-xs rounded-b-[24px]">
              
              {/* QR Verification Left */}
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-white border border-white/20">
                  <QrCode size={20} />
                </div>
                <div className={`text-[11px] font-bold leading-tight ${isAr ? 'text-right' : 'text-left'}`}>
                  <p className="font-black text-white">{isAr ? 'تحقق من صحة الشهادة' : 'Verify Certificate'}</p>
                  <p className="text-slate-300 text-[10px]">{isAr ? 'امسح الكود للتحقق' : 'Scan Code to Verify'}</p>
                </div>
              </div>

              {/* Center Serial Shield Badge */}
              <div className="flex items-center gap-1.5 bg-white/10 px-4 py-1.5 rounded-full border border-white/20 font-mono text-xs font-bold text-white">
                <ShieldCheck size={15} className="text-emerald-400" />
                <span>{certNo}</span>
              </div>

              {/* Right Verification text & Badge */}
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                <span>{isAr ? 'شهادة صادرة رسمياً وموثقة عبر منصة مسار للتأهيل والتعليم الذكي' : 'Official Certificate verified & issued by Masar Platform'}</span>
                <div className="grid h-7 w-7 place-items-center rounded-full bg-amber-400 text-[#06392c] font-black text-sm">
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
