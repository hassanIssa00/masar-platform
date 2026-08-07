'use client';

import { useState } from 'react';
import { Printer, X, ShieldCheck, Pencil, Check, GraduationCap, QrCode } from 'lucide-react';
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

/* ── Golden Laurel Branch ── */
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

/* ── Top Trophy Ribbon Badge (Exact match to uploaded image) ── */
function TopTrophyRibbonBadge({ isAr }: { isAr: boolean }) {
  return (
    <div className="relative flex flex-col items-center -mt-6 select-none drop-shadow-md">
      <svg
        width="320"
        height="88"
        viewBox="0 0 320 88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="block"
      >
        <defs>
          <linearGradient id="gold-ribbon-wing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e5bc5c" />
            <stop offset="50%" stopColor="#d9a238" />
            <stop offset="100%" stopColor="#b47a1e" />
          </linearGradient>
          <linearGradient id="dark-emerald-shield" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#084234" />
            <stop offset="100%" stopColor="#04261d" />
          </linearGradient>
        </defs>

        {/* Left Gold Ribbon Wing Notch */}
        <path d="M 12 18 L 52 18 L 36 40 L 52 62 L 12 62 L 26 40 Z" fill="url(#gold-ribbon-wing)" />

        {/* Right Gold Ribbon Wing Notch */}
        <path d="M 308 18 L 268 18 L 284 40 L 268 62 L 308 62 L 294 40 Z" fill="url(#gold-ribbon-wing)" />

        {/* Gold Border for Main Shield */}
        <path
          d="M 42 10 C 42 10, 160 8, 278 10 C 288 10, 293 18, 288 28 L 268 66 C 259 80, 175 88, 160 88 C 145 88, 61 80, 52 66 L 32 28 C 27 18, 32 10, 42 10 Z"
          fill="#d9a238"
        />

        {/* Inner Dark Green Shield */}
        <path
          d="M 44 12 C 44 12, 160 10, 276 12 C 285 12, 290 19, 286 28 L 266 64 C 257 78, 174 86, 160 86 C 146 86, 63 78, 54 64 L 34 28 C 30 19, 35 12, 44 12 Z"
          fill="url(#dark-emerald-shield)"
        />
      </svg>

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-between pt-3.5 pb-2.5 px-12 pointer-events-none">
        <div className="flex items-center gap-3" dir={isAr ? 'rtl' : 'ltr'}>
          {/* Outlined Gold Trophy Icon */}
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#d9a238" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 drop-shadow-xs">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>

          {/* Title & Subtitle */}
          <div className={`text-center leading-tight ${isAr ? 'text-right' : 'text-left'}`}>
            <h3 className="text-base sm:text-lg font-black text-white tracking-wide drop-shadow-xs">
              {isAr ? 'شهادة إنجاز واجتياز' : 'Certificate of Achievement'}
            </h3>
            <p className="text-[11px] font-bold text-amber-200/90 mt-0.5">
              {isAr ? 'تقدير رُفيع المستوى' : 'High Honor Distinction'}
            </p>
          </div>
        </div>

        {/* 5 Gold Stars at bottom center */}
        <div className="flex items-center justify-center gap-1.5 text-[#d9a238] text-xs font-bold -mt-0.5">
          ★ ★ ★ ★ ★
        </div>
      </div>
    </div>
  );
}

/* ── Gold Award Ribbon Seal Icon (Outlined Line-Art for Card 1) ── */
function OutlinedAwardRibbonIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#06392c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
      <circle cx="12" cy="8" r="3" stroke="#06392c" strokeWidth="1" strokeDasharray="2 2" />
    </svg>
  );
}

/* ── Gold Rosette Medal (Bottom Right Verification Bar) ── */
function GoldRosetteMedal() {
  return (
    <svg width="34" height="40" viewBox="0 0 34 40" fill="none" className="shrink-0">
      {/* Ribbon Tails */}
      <path d="M11 26L7 38L13 35L16 38L14 26Z" fill="#b47a1e" />
      <path d="M23 26L27 38L21 35L18 38L20 26Z" fill="#b47a1e" />
      {/* Rosette Circle */}
      <circle cx="17" cy="16" r="14" fill="url(#gold-rosette-grad)" stroke="#ffffff" strokeWidth="1.5" />
      <circle cx="17" cy="16" r="11" stroke="#b47a1e" strokeWidth="1" strokeDasharray="2 2" />
      {/* Center Icon */}
      <path d="M12 16L15 19L22 12" stroke="#06392c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <defs>
        <linearGradient id="gold-rosette-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5c86b" />
          <stop offset="50%" stopColor="#d9a238" />
          <stop offset="100%" stopColor="#b47a1e" />
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

        {/* ══ ACTION TOOLBAR (Hidden when printed) ══ */}
        <div className="flex items-center justify-between border-b border-emerald-900/60 bg-slate-950 px-6 py-3.5 print:hidden" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#06392c] text-emerald-400 border border-emerald-600/40">
              <OutlinedAwardRibbonIcon />
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

              {/* Top Center: Trophy Ribbon Shield Banner Badge */}
              <TopTrophyRibbonBadge isAr={isAr} />

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

            {/* ══ 3. FOOTER SECTION: 3 EQUAL LIGHT CARDS (EXACT MATCH TO SCREENSHOT) ══ */}
            <div className="relative z-10 px-8 pb-4 pt-2">
              <div className="grid grid-cols-3 gap-4 text-center items-stretch">

                {/* CARD 1 (RIGHT IN AR): OFFICIAL CERTIFIED SEAL */}
                <div className="rounded-2xl bg-[#f4f7f5] border border-slate-300/80 p-4 space-y-2 flex flex-col justify-between items-center shadow-2xs">
                  <OutlinedAwardRibbonIcon />
                  <div>
                    <p className="text-sm font-black text-[#06392c]">{isAr ? 'الختم الرسمي المعتمد' : 'Official Certified Seal'}</p>
                    <p className="text-[10px] font-bold text-slate-500">{isAr ? 'منصة مسار التعليمية' : 'Masar Educational Platform'}</p>
                  </div>
                  <span className="rounded-full bg-[#dce3de] px-4 py-1 text-xs font-black text-[#06392c]">
                    {isAr ? 'ختم منصة مسار' : 'Masar Platform Seal'}
                  </span>
                </div>

                {/* CARD 2 (CENTER): DOCTOR SIGNATURE & APPROVAL */}
                <div className="rounded-2xl bg-[#f4f7f5] border border-slate-300/80 p-4 space-y-1.5 flex flex-col justify-between items-center shadow-2xs">
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
                  <span className="rounded-full bg-[#e6d8be] px-4 py-1 text-xs font-black text-[#6d511f]">
                    {isAr ? 'التوقيع والاعتماد المعتمد' : 'Authorized Signature'}
                  </span>
                </div>

                {/* CARD 3 (LEFT IN AR): ACADEMIC SEAL */}
                <div className="rounded-2xl bg-[#f4f7f5] border border-slate-300/80 p-4 space-y-2 flex flex-col justify-between items-center shadow-2xs">
                  <div className="grid h-10 w-10 place-items-center text-[#06392c]">
                    <GraduationCap size={28} strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-[#06392c]">{isAr ? 'الختم الأكاديمي' : 'Academic Seal'}</p>
                    <p className="text-[10px] font-bold text-slate-500">{isAr ? 'منصة مسار للتأهيل والتعليم الذكي' : 'Smart Rehabilitation Platform'}</p>
                  </div>
                  <span className="rounded-full bg-[#dce3de] px-4 py-1 text-xs font-black text-[#06392c]">
                    {isAr ? 'ختم منصة تأسيس' : 'Nexus Platform Seal'}
                  </span>
                </div>

              </div>
            </div>

            {/* ══ 4. BOTTOM DARK EMERALD VERIFICATION BAR (EXACT MATCH TO SCREENSHOT) ══ */}
            <div className="relative z-10 bg-[#06392c] text-white px-8 py-3.5 flex items-center justify-between text-xs rounded-b-[24px]">
              
              {/* QR Verification Left */}
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white p-1 shadow-xs">
                  <QrCode size={26} className="text-[#06392c]" />
                </div>
                <div className={`text-[11px] font-bold leading-tight ${isAr ? 'text-right' : 'text-left'}`}>
                  <p className="font-black text-white">{isAr ? 'تحقق من صحة الشهادة' : 'Verify Certificate'}</p>
                  <p className="text-slate-300 text-[10px]">{isAr ? 'امسح الكود للتحقق' : 'Scan Code to Verify'}</p>
                </div>
              </div>

              {/* Center Serial Shield Badge */}
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full font-mono text-xs font-bold text-white">
                <ShieldCheck size={18} className="text-white" />
                <span>{certNo}</span>
              </div>

              {/* Right Verification text & Gold Rosette Medal */}
              <div className="flex items-center gap-3 text-xs font-bold text-slate-100">
                <span>{isAr ? 'شهادة صادرة رسمياً وموثقة عبر منصة مسار للتأهيل والتعليم الذكي' : 'Official Certificate verified & issued by Masar Platform'}</span>
                <GoldRosetteMedal />
              </div>

            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
