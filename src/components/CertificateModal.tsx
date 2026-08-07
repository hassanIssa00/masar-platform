'use client';

import { useState } from 'react';
import { Printer, X, ShieldCheck, Pencil, Check, QrCode } from 'lucide-react';
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

/* ────────────────────────────────────────────────────────────
   GOLDEN LAUREL BRANCH  (matches screenshot – full/bold leaves)
──────────────────────────────────────────────────────────── */
function GoldenLaurelBranch({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      width="52"
      height="90"
      viewBox="0 0 52 90"
      fill="none"
      className="shrink-0 select-none"
      style={{ transform: side === 'right' ? 'scaleX(-1)' : undefined }}
    >
      {/* Stem */}
      <path d="M26 8 Q22 35 18 70 Q16 78 20 82" stroke="#b8922a" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      {/* Leaves left side of stem */}
      <path d="M25 12 Q12 8 8 18 Q14 26 25 20Z" fill="#d4a017" opacity="0.95"/>
      <path d="M24 24 Q10 20 7 31 Q13 39 24 32Z" fill="#c49025" opacity="0.9"/>
      <path d="M23 37 Q9 34 7 45 Q13 52 23 46Z" fill="#d4a017" opacity="0.85"/>
      <path d="M22 50 Q9 48 8 59 Q14 65 22 58Z" fill="#c49025" opacity="0.8"/>
      <path d="M20 63 Q8 61 8 71 Q14 76 21 70Z" fill="#d4a017" opacity="0.75"/>
      {/* Leaves right side of stem */}
      <path d="M27 16 Q40 11 43 21 Q37 29 27 23Z" fill="#e5b840" opacity="0.95"/>
      <path d="M26 29 Q39 25 42 36 Q36 43 26 37Z" fill="#d4a017" opacity="0.9"/>
      <path d="M25 42 Q38 39 41 49 Q35 56 25 50Z" fill="#e5b840" opacity="0.85"/>
      <path d="M23 55 Q36 52 38 62 Q32 68 23 62Z" fill="#d4a017" opacity="0.8"/>
      <path d="M21 68 Q33 65 34 74 Q28 79 22 73Z" fill="#c49025" opacity="0.75"/>
      {/* Bottom berry/tip */}
      <circle cx="19" cy="82" r="3.5" fill="#d4a017" opacity="0.9"/>
      <circle cx="19" cy="82" r="2" fill="#e5c040" opacity="0.8"/>
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────
   TOP TROPHY RIBBON BADGE  (matches screenshot exactly)
──────────────────────────────────────────────────────────── */
function TopTrophyRibbonBadge({ isAr }: { isAr: boolean }) {
  return (
    <div className="relative flex flex-col items-center -mt-5 select-none" style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))' }}>
      <svg
        width="300"
        height="94"
        viewBox="0 0 300 94"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="rib-gold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0cb6a"/>
            <stop offset="40%" stopColor="#d9a030"/>
            <stop offset="100%" stopColor="#a87020"/>
          </linearGradient>
          <linearGradient id="shield-green" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0c5240"/>
            <stop offset="100%" stopColor="#052e22"/>
          </linearGradient>
          <linearGradient id="shield-border" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f0cb6a"/>
            <stop offset="100%" stopColor="#c09030"/>
          </linearGradient>
        </defs>

        {/* Left gold ribbon tail with V notch */}
        <path d="M 0 22 L 54 22 L 44 47 L 54 72 L 0 72 L 14 47 Z" fill="url(#rib-gold)"/>
        {/* Right gold ribbon tail with V notch */}
        <path d="M 300 22 L 246 22 L 256 47 L 246 72 L 300 72 L 286 47 Z" fill="url(#rib-gold)"/>

        {/* Gold border shield path */}
        <path
          d="M 48 6 L 252 6 Q 268 6 272 20 L 286 62 Q 278 90 150 94 Q 22 90 14 62 L 28 20 Q 32 6 48 6 Z"
          fill="url(#shield-border)"
        />
        {/* Inner dark green shield */}
        <path
          d="M 50 10 L 250 10 Q 264 10 268 22 L 281 62 Q 274 86 150 90 Q 26 86 19 62 L 32 22 Q 36 10 50 10 Z"
          fill="url(#shield-green)"
        />
      </svg>

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col items-center pt-3 pb-2 px-16 pointer-events-none">
        {/* Trophy + Text row */}
        <div className="flex items-center gap-3" dir="rtl">
          {/* Filled Gold Trophy */}
          <svg width="32" height="30" viewBox="0 0 32 30" fill="none">
            <path d="M8 2 H24 V14 C24 20 20 24 16 25 C12 24 8 20 8 14 Z" fill="#d9a238" stroke="#c08020" strokeWidth="0.8"/>
            <path d="M5 4 H8 V12 C5 12 3 10 3 7.5 C3 5.5 4 4 5 4Z" fill="#d9a238" stroke="#c08020" strokeWidth="0.8"/>
            <path d="M27 4 H24 V12 C27 12 29 10 29 7.5 C29 5.5 28 4 27 4Z" fill="#d9a238" stroke="#c08020" strokeWidth="0.8"/>
            <rect x="13" y="25" width="6" height="3" rx="0.5" fill="#d9a238" stroke="#c08020" strokeWidth="0.8"/>
            <rect x="10" y="28" width="12" height="2" rx="1" fill="#d9a238" stroke="#c08020" strokeWidth="0.8"/>
            {/* Shine */}
            <path d="M11 5 Q13 3 14 6" stroke="#f5d060" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
          </svg>
          <div className="text-center">
            <p className="text-white font-black leading-tight" style={{ fontSize: '15px', fontFamily: 'Arial, sans-serif' }}>
              {isAr ? 'شهادة إنجاز واجتياز' : 'Certificate of Achievement'}
            </p>
            <p className="text-amber-200 font-bold leading-tight mt-0.5" style={{ fontSize: '11px' }}>
              {isAr ? 'تقدير رفيع المستوى' : 'High Honor Distinction'}
            </p>
          </div>
        </div>
        {/* 5 Stars */}
        <div className="flex gap-1 mt-1.5" style={{ color: '#f0cb6a', fontSize: '13px' }}>
          ★ ★ ★ ★ ★
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   ACADEMIC SEAL ICON  (graduation cap – matches screenshot)
──────────────────────────────────────────────────────────── */
function AcademicSealIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      {/* Outer circle */}
      <circle cx="20" cy="20" r="18" stroke="#06392c" strokeWidth="1.5" fill="none"/>
      <circle cx="20" cy="20" r="14" stroke="#06392c" strokeWidth="0.8" fill="none"/>
      {/* Graduation cap */}
      <polygon points="20,11 32,17 20,23 8,17" fill="#06392c"/>
      <path d="M14 19 L14 27 Q20 30 26 27 L26 19" fill="#06392c"/>
      <line x1="32" y1="17" x2="32" y2="25" stroke="#06392c" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="32" cy="26" r="1.5" fill="#06392c"/>
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────
   OFFICIAL SEAL ICON  (rosette/ribbon – matches screenshot)
──────────────────────────────────────────────────────────── */
function OfficialSealIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      {/* Outer circle */}
      <circle cx="20" cy="20" r="18" stroke="#06392c" strokeWidth="1.5" fill="none"/>
      <circle cx="20" cy="20" r="13" stroke="#06392c" strokeWidth="0.8" fill="none"/>
      {/* Inner rosette/medal details */}
      <circle cx="20" cy="20" r="9" stroke="#06392c" strokeWidth="1" fill="none"/>
      {/* Star points / sunburst */}
      {[0,45,90,135,180,225,270,315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const x1 = 20 + 9 * Math.cos(rad);
        const y1 = 20 + 9 * Math.sin(rad);
        const x2 = 20 + 13 * Math.cos(rad);
        const y2 = 20 + 13 * Math.sin(rad);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#06392c" strokeWidth="1"/>;
      })}
      {/* checkmark in center */}
      <path d="M15 20 L18.5 23.5 L26 16" stroke="#06392c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────
   BOTTOM BAR GOLD MEDAL  (matches screenshot right side)
──────────────────────────────────────────────────────────── */
function BottomGoldMedal() {
  return (
    <svg width="42" height="48" viewBox="0 0 42 48" fill="none">
      <defs>
        <linearGradient id="med-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d060"/>
          <stop offset="50%" stopColor="#d9a030"/>
          <stop offset="100%" stopColor="#a87020"/>
        </linearGradient>
      </defs>
      {/* Ribbon tails */}
      <path d="M14 28 L9 46 L17 42 L21 46 L19 28Z" fill="#c08020"/>
      <path d="M28 28 L33 46 L25 42 L21 46 L23 28Z" fill="#c08020"/>
      {/* Medal circle */}
      <circle cx="21" cy="18" r="17" fill="url(#med-gold)"/>
      <circle cx="21" cy="18" r="14" fill="none" stroke="#ffffff" strokeWidth="1.5"/>
      <circle cx="21" cy="18" r="11" fill="none" stroke="#c08020" strokeWidth="0.8" strokeDasharray="2 2"/>
      {/* Laurel branches inside medal */}
      <path d="M10 20 Q11 15 15 17 Q13 21 10 20Z" fill="#06392c"/>
      <path d="M10 23 Q10 18 14 19 Q13 23 10 23Z" fill="#06392c"/>
      <path d="M32 20 Q31 15 27 17 Q29 21 32 20Z" fill="#06392c"/>
      <path d="M32 23 Q32 18 28 19 Q29 23 32 23Z" fill="#06392c"/>
      {/* Checkmark */}
      <path d="M15 18 L19 22 L27 14" stroke="#06392c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────────────────────── */
export default function CertificateModal({ data, onClose }: { data: CertificateData; onClose: () => void }) {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [editingEnName, setEditingEnName] = useState(false);
  const [nameEn, setNameEn] = useState(data.studentNameEn || '');

  const isAr = lang === 'ar';
  const certNo = data.certNumber || `NSR-CERT-2026-${Math.random().toString().slice(2, 7)}`;
  const displayName = isAr ? data.studentName : (nameEn || data.studentName);

  const handlePrint = () => {
    const el = document.getElementById('printable-certificate');
    if (!el) return;
    const win = window.open('', '_blank', 'width=1200,height=900');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html dir="${isAr ? 'rtl' : 'ltr'}"><head><meta charset="UTF-8"/>
      <title>${isAr ? 'شهادة إنجاز واجتياز' : 'Certificate of Completion'}</title>
      <style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}body{font-family:'Arial',sans-serif;background:#fff;}@page{size:A4 landscape;margin:0;}@media print{html,body{width:297mm;height:210mm;}}</style>
      </head><body>${el.outerHTML}</body></html>`);
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

        {/* ── TOOLBAR ── */}
        <div className="flex items-center justify-between border-b border-emerald-900/60 bg-slate-950 px-6 py-3.5 print:hidden" dir="rtl">
          <div className="flex items-center gap-3">
            <span className="font-black text-white text-base">شهادة التميز والاعتماد الرسمي 🏆</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-black">
              <button onClick={() => setLang('ar')} className={`px-3.5 py-1.5 rounded-lg transition ${isAr ? 'bg-[#06392c] text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>🇸🇦 عربي</button>
              <button onClick={() => setLang('en')} className={`px-3.5 py-1.5 rounded-lg transition ${!isAr ? 'bg-[#06392c] text-white shadow-md' : 'text-slate-400 hover:text-white'}`}>🇬🇧 English</button>
            </div>
            <button onClick={handlePrint} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-5 py-2.5 text-xs font-black text-slate-950 transition shadow-lg active:scale-95">
              <Printer size={15} /> {isAr ? 'طباعة PDF' : 'Print PDF'}
            </button>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── CERTIFICATE BODY ── */}
        <div className="bg-slate-900 p-2 sm:p-4 print:p-0">
          <div
            id="printable-certificate"
            dir={isAr ? 'rtl' : 'ltr'}
            className="relative overflow-hidden flex flex-col justify-between"
            style={{
              background: '#ede8d5',
              borderRadius: '24px',
              border: '3px solid #06392c',
              minHeight: '580px',
            }}
          >
            {/* Corner guilloche circles */}
            <svg width="220" height="220" viewBox="0 0 220 220" fill="none" className="absolute top-0 right-0 pointer-events-none opacity-20">
              <circle cx="220" cy="0" r="200" stroke="#06392c" strokeWidth="1.2" strokeDasharray="5 4"/>
              <circle cx="220" cy="0" r="160" stroke="#06392c" strokeWidth="0.8"/>
              <circle cx="220" cy="0" r="120" stroke="#06392c" strokeWidth="1" strokeDasharray="3 4"/>
            </svg>
            <svg width="220" height="220" viewBox="0 0 220 220" fill="none" className="absolute bottom-0 left-0 pointer-events-none opacity-20">
              <circle cx="0" cy="220" r="200" stroke="#06392c" strokeWidth="1.2" strokeDasharray="5 4"/>
              <circle cx="0" cy="220" r="160" stroke="#06392c" strokeWidth="0.8"/>
              <circle cx="0" cy="220" r="120" stroke="#06392c" strokeWidth="1" strokeDasharray="3 4"/>
            </svg>

            {/* ── HEADER ── */}
            <div className="relative z-10 px-8 pt-5 flex items-start justify-between">

              {/* Top Right (RTL): Certified Box */}
              <div className="flex items-center gap-2.5 rounded-xl border border-[#06392c]/30 bg-white/60 px-4 py-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#06392c] text-white">
                  <ShieldCheck size={18} />
                </div>
                <div className="text-right leading-snug" dir="rtl">
                  <p className="text-xs font-black text-[#06392c]">{isAr ? 'شهادة معتمدة' : 'Verified Certificate'}</p>
                  <p className="font-mono text-[10px] text-slate-500">{certNo}</p>
                  <p className="text-[10px] text-slate-400">{isAr ? 'التاريخ:' : 'Date:'} {data.completionDate}</p>
                </div>
              </div>

              {/* Top Center: Badge */}
              <TopTrophyRibbonBadge isAr={isAr} />

              {/* Top Left (RTL): Logos */}
              <div className="flex items-center gap-2">
                <BrandMark size="md" showText={true} />
              </div>
            </div>

            {/* ── BODY ── */}
            <div className="relative z-10 px-8 py-3 space-y-3 text-center">
              {/* Main Title */}
              <h1 className="text-3xl sm:text-4xl font-black text-[#06392c]" style={{ fontFamily: 'Georgia, serif' }}>
                {isAr ? 'شهادة إنجاز واجتياز برنامج علاجي' : 'CERTIFICATE OF COMPLETION'}
              </h1>

              {/* Subtitle / Doctor */}
              <p className="text-xs font-bold text-slate-600 leading-relaxed">
                {isAr ? 'تشهد منصة مسار للتأهيل والتعليم الذكي وتحت إشراف الاستشاري' : 'This certifies that under the supervision of Consultant'}
              </p>
              <p className="text-xl font-black text-[#06392c]" style={{ fontFamily: 'Georgia, serif' }}>
                {data.doctorName || (isAr ? 'أ.د. إسماعيل عيسى' : 'Prof. Dr. Ismail Issa')}
              </p>
              <p className="text-[11px] font-bold text-slate-500">
                {isAr ? 'بأن البطل/ة' : 'that the student'}
              </p>

              {/* Student Name with Laurel Branches */}
              <div className="flex items-center justify-center gap-3 py-1">
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
                    <div className="flex items-center gap-2">
                      <h2 className="text-3xl sm:text-5xl font-black text-[#06392c]" style={{ fontFamily: 'Georgia, serif' }}>
                        {displayName}
                      </h2>
                      {!isAr && (
                        <button onClick={() => setEditingEnName(true)} className="text-slate-400 hover:text-[#06392c] print:hidden shrink-0">
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                  )}
                  {/* Gold line with diamond */}
                  <div className="relative mt-2 flex items-center justify-center">
                    <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#d9a238] to-transparent" />
                    <div className="absolute w-2.5 h-2.5 rotate-45 bg-[#d9a238]" />
                  </div>
                </div>

                <GoldenLaurelBranch side="right" />
              </div>

              {!isAr && !nameEn && !editingEnName && (
                <p className="text-[10px] text-amber-700/70 print:hidden -mt-1">✏️ Click pencil to enter English name</p>
              )}

              {/* Program & Score */}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-bold text-slate-600">
                  {isAr ? 'قد أتم بنجاح واقتدار لكافة متطلبات الجلسات العلاجية والتحليلية النهائية المتخصصة في:' : 'Has successfully completed all specialized therapeutic & analytical session requirements in:'}
                </p>
                <div className="inline-block rounded-xl border border-[#06392c]/25 bg-white/70 px-8 py-2.5">
                  <p className="text-base sm:text-lg font-black text-[#06392c]">
                    {isAr ? data.programTitle : englishProgramTitle(data.programTitle)}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-700 pt-0.5">
                  <span>{isAr ? 'وحقق نسبة إنجاز تراكمية قدرها' : 'Achieved a cumulative completion rate of'}</span>
                  <span className="rounded-lg bg-[#06392c] px-4 py-1 font-mono text-sm font-black text-white">
                    {isAr ? `%${data.score}` : `${data.score}%`}
                  </span>
                  <span>{isAr ? 'مع الالتزام التام بالجلسات الفردية والمنزلية.' : 'with full commitment to individual & home sessions.'}</span>
                </div>
              </div>
            </div>

            {/* ── FOOTER CARDS (RTL ORDER: Official=first→RIGHT | Doctor=center | Academic=last→LEFT) ── */}
            <div className="relative z-10 px-8 pb-4 pt-2">
              <div className="grid grid-cols-3 gap-4 text-center" dir="rtl">

                {/* CARD 1 – Official Seal → appears on RIGHT in RTL */}
                <div className="rounded-2xl p-4 flex flex-col items-center gap-2" dir="rtl" style={{ background: '#f5f1e4', border: '1.5px solid #c8bfa0' }}>
                  <OfficialSealIcon />
                  <div>
                    <p className="text-sm font-black text-[#06392c]">{isAr ? 'الختم الرسمي المعتمد' : 'Official Certified Seal'}</p>
                    <p className="text-[10px] font-bold text-slate-500">{isAr ? 'منصة مسار التعليمية' : 'Masar Educational Platform'}</p>
                  </div>
                  <span className="rounded-full px-4 py-1 text-xs font-bold text-[#06392c]" style={{ background: '#e8e0cc', border: '1px solid #b8ad8e' }}>
                    {isAr ? 'ختم منصة مسار' : 'Masar Platform Seal'}
                  </span>
                </div>

                {/* CARD 2 – Doctor Signature (CENTER) */}
                <div className="rounded-2xl p-4 flex flex-col items-center gap-1.5" dir="rtl" style={{ background: '#f5f1e4', border: '1.5px solid #c8bfa0' }}>
                  <span className="text-[11px] font-bold text-slate-500">{isAr ? 'يعتمد هذه الشهادة' : 'Certified by'}</span>
                  <h3 className="text-lg font-black text-[#06392c]" style={{ fontFamily: 'Georgia, serif' }}>
                    {data.doctorName || (isAr ? 'أ.د. إسماعيل عيسى' : 'Prof. Dr. Ismail Issa')}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-500 leading-snug">
                    {isAr ? 'استشاري التربية الخاصة وتأهيل صعوبات التعلم' : 'Special Education & Learning Difficulties Consultant'}
                  </p>
                  {/* Script signature */}
                  <div className="border-b border-[#c88d28]/60 pb-1 px-3">
                    <span className="font-serif italic text-[#c88d28] text-sm font-bold" style={{ fontFamily: 'Georgia, cursive' }}>
                      أ.د. إسماعيل عيسى
                    </span>
                  </div>
                  <span className="rounded-full px-4 py-1 text-xs font-bold text-[#8a6010]" style={{ background: '#f0dda8', border: '1px solid #d9a238' }}>
                    {isAr ? 'التوقيع والاعتماد المعتمد' : 'Authorized Signature'}
                  </span>
                </div>

                {/* CARD 3 – Academic Seal → appears on LEFT in RTL */}
                <div className="rounded-2xl p-4 flex flex-col items-center gap-2" dir="rtl" style={{ background: '#f5f1e4', border: '1.5px solid #c8bfa0' }}>
                  <AcademicSealIcon />
                  <div>
                    <p className="text-sm font-black text-[#06392c]">{isAr ? 'الختم الأكاديمي' : 'Academic Seal'}</p>
                    <p className="text-[10px] font-bold text-slate-500">{isAr ? 'منصة مسار للتأهيل والتعليم الذكي' : 'Smart Rehabilitation Platform'}</p>
                  </div>
                  <span className="rounded-full px-4 py-1 text-xs font-bold text-[#06392c]" style={{ background: '#e8e0cc', border: '1px solid #b8ad8e' }}>
                    {isAr ? 'ختم منصة تأسيس' : 'Tasis Platform Seal'}
                  </span>
                </div>

              </div>
            </div>

            {/* ── BOTTOM DARK GREEN VERIFICATION BAR ── */}
            <div
              className="relative z-10 flex items-center justify-between px-8 py-3 text-white"
              style={{ background: '#06392c', borderRadius: '0 0 20px 20px' }}
              dir="rtl"
            >
              {/* FIRST in RTL → appears on RIGHT: text + gold medal */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[11px] font-black text-white leading-tight">{isAr ? 'شهادة صادرة رسمياً وموثقة' : 'Officially Issued Certificate'}</p>
                  <p className="text-[10px] text-slate-300 leading-tight">{isAr ? 'عبر منصة مسار للتأهيل والتعليم الذكي' : 'via Masar Smart Platform'}</p>
                </div>
                <BottomGoldMedal />
              </div>

              {/* CENTER: Serial number */}
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-white">
                <ShieldCheck size={16} className="text-white/80" />
                <span>{certNo}</span>
              </div>

              {/* LAST in RTL → appears on LEFT: QR code + text */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[11px] font-black text-white leading-tight">{isAr ? 'تحقق من صحة الشهادة' : 'Verify Certificate'}</p>
                  <p className="text-[10px] text-slate-300 leading-tight">{isAr ? 'امسح الكود للتحقق' : 'Scan Code to Verify'}</p>
                </div>
                <div className="rounded-lg bg-white p-1.5">
                  <QrCode size={26} className="text-[#06392c]" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
