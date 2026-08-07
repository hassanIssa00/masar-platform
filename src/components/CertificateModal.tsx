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

/* ═══════════════════════════════════════════════════════════════
   GOLDEN LAUREL BRANCH SVG
   Exact match: tall gold laurel with berries at base
═══════════════════════════════════════════════════════════════ */
function GoldenLaurelBranch({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      width="48"
      height="86"
      viewBox="0 0 48 86"
      fill="none"
      className="shrink-0 select-none"
      style={{ transform: side === 'right' ? 'scaleX(-1)' : undefined }}
    >
      {/* Main stem */}
      <path d="M24 6 Q20 30 16 64 Q14 74 18 80" stroke="#c49a28" strokeWidth="2" strokeLinecap="round" fill="none"/>
      {/* Left leaves (on stem's left side) */}
      <path d="M23 9 Q10 5 7 16 Q13 24 23 18Z" fill="#d4a820"/>
      <path d="M22 21 Q9 18 7 28 Q13 36 22 30Z" fill="#c49a28"/>
      <path d="M21 33 Q8 31 7 41 Q13 48 21 42Z" fill="#d4a820"/>
      <path d="M20 46 Q8 44 8 54 Q14 60 20 54Z" fill="#c49a28"/>
      <path d="M18 59 Q7 57 8 66 Q14 71 19 65Z" fill="#d4a820"/>
      {/* Right leaves (on stem's right side) */}
      <path d="M25 13 Q38 8 40 19 Q34 27 25 21Z" fill="#e5c040"/>
      <path d="M24 25 Q37 21 39 32 Q33 39 24 33Z" fill="#d4a820"/>
      <path d="M23 37 Q36 34 38 44 Q32 51 23 45Z" fill="#e5c040"/>
      <path d="M22 50 Q34 47 35 57 Q30 63 22 57Z" fill="#d4a820"/>
      <path d="M20 62 Q31 60 32 69 Q27 74 21 68Z" fill="#c49a28"/>
      {/* Berry cluster at base */}
      <circle cx="17" cy="78" r="4" fill="#d4a820"/>
      <circle cx="17" cy="78" r="2.2" fill="#e8c040"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   TOP RIBBON BADGE SVG
   Exact match: dark green shield + gold ribbon wings with V-notch
   Trophy icon on right (RTL), text center, 5 gold stars bottom
═══════════════════════════════════════════════════════════════ */
function TopTrophyRibbonBadge({ isAr }: { isAr: boolean }) {
  return (
    <div
      className="relative select-none flex items-center justify-center"
      style={{ marginTop: '-20px', width: '360px', height: '96px', filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.28))' }}
    >
      <svg
        width="360"
        height="96"
        viewBox="0 0 360 96"
        fill="none"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="gw" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5d060"/>
            <stop offset="40%" stopColor="#d9a030"/>
            <stop offset="100%" stopColor="#9a6a10"/>
          </linearGradient>
          <linearGradient id="gs" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0d5a44"/>
            <stop offset="100%" stopColor="#042e20"/>
          </linearGradient>
          <linearGradient id="gb" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5d060"/>
            <stop offset="100%" stopColor="#b07820"/>
          </linearGradient>
        </defs>

        {/* LEFT GOLD RIBBON WING — extends from x=0 to x=92, V-notch at x=80 */}
        <path d="M0 20 L92 20 L78 48 L92 76 L0 76 L16 48 Z" fill="url(#gw)"/>
        {/* fold shadow on far left edge */}
        <path d="M0 20 L16 48 L0 76Z" fill="#8a5a10" opacity="0.35"/>

        {/* RIGHT GOLD RIBBON WING — extends from x=268 to x=360, V-notch at x=282 */}
        <path d="M360 20 L268 20 L282 48 L268 76 L360 76 L344 48 Z" fill="url(#gw)"/>
        {/* fold shadow on far right edge */}
        <path d="M360 20 L344 48 L360 76Z" fill="#8a5a10" opacity="0.35"/>

        {/* GOLD BORDER SHIELD */}
        <path
          d="M88 4 L272 4 Q290 4 294 18 L306 58 Q298 92 180 96 Q62 92 54 58 L66 18 Q70 4 88 4Z"
          fill="url(#gb)"
        />
        {/* INNER DARK GREEN SHIELD */}
        <path
          d="M90 8 L270 8 Q286 8 290 20 L301 58 Q294 88 180 92 Q66 88 59 58 L70 20 Q74 8 90 8Z"
          fill="url(#gs)"
        />
      </svg>

      {/* Content layer over the SVG */}
      <div
        className="absolute flex flex-col items-center justify-between pointer-events-none"
        style={{ top: 8, left: 90, right: 90, bottom: 8 }}
        dir="rtl"
      >
        {/* Row: Trophy + Two lines of text */}
        <div className="flex items-center gap-2.5 w-full justify-center">
          {/* Gold Trophy SVG */}
          <svg width="32" height="30" viewBox="0 0 32 30" fill="none">
            <path d="M8 2H24V14C24 20 20 24 16 25C12 24 8 20 8 14Z" fill="#e8c040" stroke="#b08010" strokeWidth="0.7"/>
            <path d="M5 4H8V13C5 13 2 11 2 8C2 5.5 3.5 4 5 4Z" fill="#e8c040" stroke="#b08010" strokeWidth="0.7"/>
            <path d="M27 4H24V13C27 13 30 11 30 8C30 5.5 28.5 4 27 4Z" fill="#e8c040" stroke="#b08010" strokeWidth="0.7"/>
            <rect x="13" y="25" width="6" height="2.5" rx="0.5" fill="#e8c040" stroke="#b08010" strokeWidth="0.7"/>
            <rect x="10" y="27.5" width="12" height="2" rx="1" fill="#e8c040" stroke="#b08010" strokeWidth="0.7"/>
            <path d="M11 5Q13 3 14 6" stroke="#fff5a0" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <div className="text-center leading-snug">
            <div className="font-black text-white" style={{ fontSize: '15px', lineHeight: 1.2, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
              {isAr ? 'شهادة إنجاز واجتياز' : 'Certificate of Achievement'}
            </div>
            <div className="font-bold text-amber-200" style={{ fontSize: '11px', lineHeight: 1.2, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
              {isAr ? 'تقدير رفيع المستوى' : 'High Honor Distinction'}
            </div>
          </div>
        </div>
        {/* 5 Gold Stars */}
        <div className="flex gap-1" style={{ color: '#f5d060', fontSize: '13px', letterSpacing: '2px', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
          ★★★★★
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ACADEMIC SEAL ICON — graduation cap inside double circle
═══════════════════════════════════════════════════════════════ */
function AcademicSealIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
      <circle cx="21" cy="21" r="19.5" stroke="#06392c" strokeWidth="1.4" fill="none"/>
      <circle cx="21" cy="21" r="15" stroke="#06392c" strokeWidth="0.8" fill="none"/>
      {/* cap board */}
      <polygon points="21,11 34,17 21,23 8,17" fill="#06392c"/>
      {/* gown */}
      <path d="M15 19.5V27Q21 31 27 27V19.5" fill="#06392c"/>
      {/* tassel string */}
      <line x1="34" y1="17" x2="34" y2="25" stroke="#06392c" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="34" cy="26.5" r="1.8" fill="#06392c"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   OFFICIAL SEAL ICON — rosette medal inside double circle  
═══════════════════════════════════════════════════════════════ */
function OfficialSealIcon() {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
      <circle cx="21" cy="21" r="19.5" stroke="#06392c" strokeWidth="1.4" fill="none"/>
      <circle cx="21" cy="21" r="14.5" stroke="#06392c" strokeWidth="0.8" fill="none"/>
      {/* sunburst lines */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
        const r = Math.PI / 180 * deg;
        return (
          <line
            key={i}
            x1={21 + 9 * Math.cos(r)} y1={21 + 9 * Math.sin(r)}
            x2={21 + 14 * Math.cos(r)} y2={21 + 14 * Math.sin(r)}
            stroke="#06392c" strokeWidth="0.9"
          />
        );
      })}
      <circle cx="21" cy="21" r="8.5" stroke="#06392c" strokeWidth="0.8" fill="none"/>
      {/* checkmark */}
      <path d="M15.5 21L19.5 25L26.5 16.5" stroke="#06392c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   BOTTOM BAR GOLD MEDAL — ribbon + circle with laurel + check
═══════════════════════════════════════════════════════════════ */
function BottomGoldMedal() {
  return (
    <svg width="40" height="46" viewBox="0 0 40 46" fill="none">
      <defs>
        <linearGradient id="mg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d060"/>
          <stop offset="60%" stopColor="#d9a030"/>
          <stop offset="100%" stopColor="#9a6a10"/>
        </linearGradient>
      </defs>
      {/* ribbon tails */}
      <path d="M13 27L8 44L16 40L20 44L18 27Z" fill="#b07820"/>
      <path d="M27 27L32 44L24 40L20 44L22 27Z" fill="#b07820"/>
      {/* medal circle */}
      <circle cx="20" cy="17" r="16" fill="url(#mg)"/>
      <circle cx="20" cy="17" r="13" fill="none" stroke="#fff" strokeWidth="1.5"/>
      <circle cx="20" cy="17" r="10" fill="none" stroke="#b07820" strokeWidth="0.8" strokeDasharray="2 2"/>
      {/* laurel left */}
      <path d="M9 19Q9 13 13 15Q12 19 9 19Z" fill="#06392c"/>
      <path d="M9 22Q9 17 13 18Q12 22 9 22Z" fill="#06392c"/>
      {/* laurel right */}
      <path d="M31 19Q31 13 27 15Q28 19 31 19Z" fill="#06392c"/>
      <path d="M31 22Q31 17 27 18Q28 22 31 22Z" fill="#06392c"/>
      {/* check */}
      <path d="M14 17L18 21L26 13" stroke="#06392c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
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
      <title>شهادة إنجاز</title>
      <style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
      body{font-family:Arial,sans-serif;background:#fff;}
      @page{size:A4 landscape;margin:0;}
      @media print{html,body{width:297mm;height:210mm;}}</style>
      </head><body>${el.outerHTML}</body></html>`);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 600);
  };

  const englishProgramTitle = (t: string) => {
    if (t.includes('قراءة') || t.includes('فونيك')) return 'Reading & Phonological Awareness Program';
    if (t.includes('رياضيات') || t.includes('حساب')) return 'Math & Dyscalculia Remediation Program';
    if (t.includes('تخاطب') || t.includes('نطق')) return 'Speech & Language Therapy Program';
    if (t.includes('توحد')) return 'Autism Spectrum Rehabilitation Program';
    return 'Comprehensive Learning Difficulties Rehabilitation Program';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-3 sm:p-5 backdrop-blur-md">
      <div className="w-full max-w-4xl rounded-3xl bg-slate-950 shadow-2xl overflow-hidden border border-emerald-900/40">

        {/* ── TOOLBAR ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-emerald-900/50 print:hidden" dir="rtl">
          <span className="text-sm font-black text-white">🏆 شهادة التميز والاعتماد الرسمي</span>
          <div className="flex items-center gap-2.5">
            {/* Lang toggle */}
            <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs font-bold">
              <button onClick={() => setLang('ar')} className={`px-3 py-1.5 rounded-md transition ${isAr ? 'bg-[#06392c] text-white' : 'text-slate-400 hover:text-white'}`}>🇸🇦 عربي</button>
              <button onClick={() => setLang('en')} className={`px-3 py-1.5 rounded-md transition ${!isAr ? 'bg-[#06392c] text-white' : 'text-slate-400 hover:text-white'}`}>🇬🇧 English</button>
            </div>
            <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 px-4 py-2 text-xs font-black text-slate-950 transition">
              <Printer size={14}/> طباعة PDF
            </button>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition">
              <X size={16}/>
            </button>
          </div>
        </div>

        {/* ── CERTIFICATE WRAPPER ── */}
        <div className="p-2.5 print:p-0" style={{ background: '#1e293b' }}>
          <div
            id="printable-certificate"
            dir={isAr ? 'rtl' : 'ltr'}
            style={{
              background: '#eee8d2',
              border: '3px solid #06392c',
              borderRadius: '20px',
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Corner guilloche decorations */}
            <svg width="200" height="200" viewBox="0 0 200 200" fill="none" style={{ position:'absolute', top:0, right:0, opacity:0.15, pointerEvents:'none' }}>
              <circle cx="200" cy="0" r="180" stroke="#06392c" strokeWidth="1.2" strokeDasharray="5 4"/>
              <circle cx="200" cy="0" r="140" stroke="#06392c" strokeWidth="0.8"/>
              <circle cx="200" cy="0" r="100" stroke="#06392c" strokeWidth="1" strokeDasharray="3 4"/>
            </svg>
            <svg width="200" height="200" viewBox="0 0 200 200" fill="none" style={{ position:'absolute', bottom:0, left:0, opacity:0.15, pointerEvents:'none' }}>
              <circle cx="0" cy="200" r="180" stroke="#06392c" strokeWidth="1.2" strokeDasharray="5 4"/>
              <circle cx="0" cy="200" r="140" stroke="#06392c" strokeWidth="0.8"/>
              <circle cx="0" cy="200" r="100" stroke="#06392c" strokeWidth="1" strokeDasharray="3 4"/>
            </svg>

            {/* ══ HEADER ROW ══ */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'20px 28px 0 28px' }}>

              {/* RIGHT (first in RTL) — Certified box */}
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.55)', border:'1px solid #b8b09a', borderRadius:12, padding:'8px 12px', minWidth:140 }}>
                <div style={{ background:'#06392c', borderRadius:8, width:32, height:32, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <ShieldCheck size={17} color="white"/>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:11, fontWeight:900, color:'#06392c' }}>{isAr ? 'شهادة معتمدة' : 'Certified'}</div>
                  <div style={{ fontSize:9, fontFamily:'monospace', color:'#666' }}>{certNo}</div>
                  <div style={{ fontSize:9, color:'#888' }}>{isAr ? 'التاريخ:' : 'Date:'} {data.completionDate}</div>
                </div>
              </div>

              {/* CENTER — Trophy badge */}
              <TopTrophyRibbonBadge isAr={isAr}/>

              {/* LEFT (last in RTL) — Logos */}
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <BrandMark size="md" showText={true}/>
              </div>
            </div>

            {/* ══ BODY ══ */}
            <div style={{ padding:'12px 28px 8px', textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>

              {/* Main title */}
              <h1 style={{ fontSize:34, fontWeight:900, color:'#06392c', margin:0, fontFamily:'Georgia, serif', lineHeight:1.2 }}>
                {isAr ? 'شهادة إنجاز واجتياز برنامج علاجي' : 'CERTIFICATE OF COMPLETION'}
              </h1>

              {/* Subtitle */}
              <p style={{ fontSize:12, fontWeight:700, color:'#444', margin:0 }}>
                {isAr ? 'تشهد منصة مسار للتأهيل والتعليم الذكي وتحت إشراف الاستشاري' : 'This certifies under the supervision of Consultant'}
              </p>

              {/* Doctor name */}
              <p style={{ fontSize:20, fontWeight:900, color:'#06392c', margin:0, fontFamily:'Georgia, serif' }}>
                {data.doctorName || (isAr ? 'أ.د. إسماعيل عيسى' : 'Prof. Dr. Ismail Issa')}
              </p>

              <p style={{ fontSize:11, fontWeight:700, color:'#666', margin:0 }}>
                {isAr ? 'بأن البطل/ة' : 'that the student'}
              </p>

              {/* Student Name with Laurel Branches */}
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <GoldenLaurelBranch side="left"/>

                <div>
                  {!isAr && editingEnName ? (
                    <div style={{ display:'flex', alignItems:'center', gap:8, borderBottom:'2px solid #d9a238' }}>
                      <input
                        autoFocus
                        value={nameEn}
                        onChange={e => setNameEn(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && setEditingEnName(false)}
                        placeholder="Student English name..."
                        style={{ background:'transparent', fontSize:40, fontWeight:900, color:'#06392c', border:'none', outline:'none', textAlign:'center', fontFamily:'Georgia, serif', width:320 }}
                      />
                      <button onClick={() => setEditingEnName(false)} style={{ color:'#06392c', cursor:'pointer', background:'none', border:'none' }}>
                        <Check size={20}/>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <h2 style={{ fontSize:42, fontWeight:900, color:'#06392c', margin:0, fontFamily:'Georgia, serif', lineHeight:1 }}>
                        {displayName}
                      </h2>
                      {!isAr && (
                        <button onClick={() => setEditingEnName(true)} style={{ color:'#aaa', cursor:'pointer', background:'none', border:'none' }} className="print:hidden">
                          <Pencil size={14}/>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Gold line with center diamond */}
                  <div style={{ position:'relative', marginTop:8, height:2, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ width:'100%', height:2, background:'linear-gradient(to right, transparent, #d9a238 20%, #d9a238 80%, transparent)' }}/>
                    <div style={{ position:'absolute', width:10, height:10, background:'#d9a238', transform:'rotate(45deg)' }}/>
                  </div>
                </div>

                <GoldenLaurelBranch side="right"/>
              </div>

              {!isAr && !nameEn && !editingEnName && (
                <p style={{ fontSize:10, color:'#a07030', margin:0 }} className="print:hidden">✏️ Click pencil to enter English name</p>
              )}

              {/* Program section */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, width:'100%', marginTop:2 }}>
                <p style={{ fontSize:11.5, fontWeight:700, color:'#555', margin:0 }}>
                  {isAr ? 'قد أتم بنجاح واقتدار لكافة متطلبات الجلسات العلاجية والتحليلية النهائية المتخصصة في:' : 'Has successfully completed all specialized therapeutic & analytical session requirements in:'}
                </p>
                {/* Program box */}
                <div style={{ background:'rgba(255,255,255,0.7)', border:'1.5px solid #b0aa90', borderRadius:10, padding:'8px 28px' }}>
                  <span style={{ fontSize:17, fontWeight:900, color:'#06392c' }}>
                    {isAr ? data.programTitle : englishProgramTitle(data.programTitle)}
                  </span>
                </div>
                {/* Score row */}
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11.5, fontWeight:700, color:'#444' }}>
                  <span>{isAr ? 'وحقق نسبة إنجاز تراكمية قدرها' : 'Achieved a cumulative completion rate of'}</span>
                  <span style={{ background:'#06392c', color:'white', fontFamily:'monospace', fontWeight:900, fontSize:13, padding:'3px 14px', borderRadius:8 }}>
                    {isAr ? `%${data.score}` : `${data.score}%`}
                  </span>
                  <span>{isAr ? 'مع الالتزام التام بالجلسات الفردية والمنزلية.' : 'with full commitment to individual & home sessions.'}</span>
                </div>
              </div>
            </div>

            {/* ══ FOOTER CARDS (3 equal) ══
                RTL visual order: [Official Seal RIGHT] [Doctor CENTER] [Academic LEFT]
                In RTL HTML: first child = RIGHT, last child = LEFT
            ══ */}
            <div style={{ padding:'6px 20px 12px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }} dir="rtl">

              {/* CARD 1 → appears on RIGHT in RTL: Official Seal */}
              <div style={{ background:'#f2edd8', border:'1.5px solid #c4bb9a', borderRadius:16, padding:'14px 10px', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }} dir="rtl">
                <OfficialSealIcon/>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:12, fontWeight:900, color:'#06392c' }}>{isAr ? 'الختم الرسمي المعتمد' : 'Official Certified Seal'}</div>
                  <div style={{ fontSize:9.5, fontWeight:700, color:'#777', marginTop:2 }}>{isAr ? 'منصة مسار التعليمية' : 'Masar Educational Platform'}</div>
                </div>
                <div style={{ background:'#e4dfc8', border:'1px solid #b0aa88', borderRadius:20, padding:'3px 14px', fontSize:10.5, fontWeight:700, color:'#06392c' }}>
                  {isAr ? 'ختم منصة مسار' : 'Masar Platform Seal'}
                </div>
              </div>

              {/* CARD 2 → CENTER: Doctor Signature */}
              <div style={{ background:'#f2edd8', border:'1.5px solid #c4bb9a', borderRadius:16, padding:'12px 10px', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }} dir="rtl">
                <div style={{ fontSize:10, fontWeight:700, color:'#888' }}>{isAr ? 'يعتمد هذه الشهادة' : 'Certified by'}</div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:18, fontWeight:900, color:'#06392c', fontFamily:'Georgia, serif' }}>
                    {data.doctorName || (isAr ? 'أ.د. إسماعيل عيسى' : 'Prof. Dr. Ismail Issa')}
                  </div>
                  <div style={{ fontSize:9.5, fontWeight:700, color:'#777', marginTop:2, lineHeight:1.3 }}>
                    {isAr ? 'استشاري التربية الخاصة وتأهيل صعوبات التعلم' : 'Special Education & Learning Difficulties Consultant'}
                  </div>
                </div>
                {/* Handwritten signature */}
                <div style={{ borderBottom:'1.5px solid #c49a28', paddingBottom:3, paddingLeft:12, paddingRight:12 }}>
                  <span style={{ fontFamily:'Georgia, cursive', fontStyle:'italic', fontSize:14, color:'#c49a28', fontWeight:700 }}>
                    أ.د. إسماعيل عيسى
                  </span>
                </div>
                <div style={{ background:'#f0dca0', border:'1px solid #d4a030', borderRadius:20, padding:'3px 12px', fontSize:10, fontWeight:700, color:'#7a5010' }}>
                  {isAr ? 'التوقيع والاعتماد المعتمد' : 'Authorized Signature'}
                </div>
              </div>

              {/* CARD 3 → appears on LEFT in RTL: Academic Seal */}
              <div style={{ background:'#f2edd8', border:'1.5px solid #c4bb9a', borderRadius:16, padding:'14px 10px', display:'flex', flexDirection:'column', alignItems:'center', gap:8 }} dir="rtl">
                <AcademicSealIcon/>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:12, fontWeight:900, color:'#06392c' }}>{isAr ? 'الختم الأكاديمي' : 'Academic Seal'}</div>
                  <div style={{ fontSize:9.5, fontWeight:700, color:'#777', marginTop:2 }}>{isAr ? 'منصة مسار للتأهيل والتعليم الذكي' : 'Smart Rehabilitation Platform'}</div>
                </div>
                <div style={{ background:'#e4dfc8', border:'1px solid #b0aa88', borderRadius:20, padding:'3px 14px', fontSize:10.5, fontWeight:700, color:'#06392c' }}>
                  {isAr ? 'ختم منصة تأسيس' : 'Tasis Platform Seal'}
                </div>
              </div>

            </div>

            {/* ══ BOTTOM DARK GREEN VERIFICATION BAR ══
                RTL visual order: [text+medal RIGHT] [serial CENTER] [QR LEFT]
            ══ */}
            <div
              style={{ background:'#06392c', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', borderRadius:'0 0 17px 17px' }}
              dir="rtl"
            >
              {/* FIRST in RTL → RIGHT: text + medal */}
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:11, fontWeight:900, color:'white', lineHeight:1.3 }}>
                    {isAr ? 'شهادة صادرة رسمياً وموثقة' : 'Officially Issued Certificate'}
                  </div>
                  <div style={{ fontSize:9.5, color:'#a8d4b8', lineHeight:1.3 }}>
                    {isAr ? 'عبر منصة مسار للتأهيل والتعليم الذكي' : 'via Masar Smart Platform'}
                  </div>
                </div>
                <BottomGoldMedal/>
              </div>

              {/* CENTER: serial number */}
              <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'monospace', fontSize:12, fontWeight:700, color:'white' }}>
                <ShieldCheck size={15} color="white" opacity={0.8}/>
                <span>{certNo}</span>
              </div>

              {/* LAST in RTL → LEFT: QR + text */}
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:11, fontWeight:900, color:'white', lineHeight:1.3 }}>
                    {isAr ? 'تحقق من صحة الشهادة' : 'Verify Certificate'}
                  </div>
                  <div style={{ fontSize:9.5, color:'#a8d4b8', lineHeight:1.3 }}>
                    {isAr ? 'امسح الكود للتحقق' : 'Scan Code to Verify'}
                  </div>
                </div>
                <div style={{ background:'white', borderRadius:8, padding:5, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <QrCode size={28} color="#06392c"/>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
