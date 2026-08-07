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

/* ─── LAUREL BRANCH ─────────────────────────────────────────── */
function GoldenLaurelBranch({ side }: { side: 'left' | 'right' }) {
  return (
    <svg width="44" height="80" viewBox="0 0 44 80" fill="none" className="shrink-0"
      style={{ transform: side === 'right' ? 'scaleX(-1)' : undefined }}>
      <path d="M22 5 Q18 28 15 60 Q13 70 17 76" stroke="#c49a28" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
      <path d="M21 8 Q9 4 7 14 Q13 22 21 16Z" fill="#d4a820"/>
      <path d="M20 19 Q8 16 7 26 Q13 33 20 27Z" fill="#c49a28"/>
      <path d="M19 30 Q8 28 7 38 Q13 44 19 38Z" fill="#d4a820"/>
      <path d="M18 42 Q7 40 8 50 Q14 55 18 49Z" fill="#c49a28"/>
      <path d="M17 54 Q7 52 8 62 Q14 67 18 60Z" fill="#d4a820"/>
      <path d="M23 12 Q35 7 37 17 Q31 25 23 19Z" fill="#e5c040"/>
      <path d="M22 23 Q34 19 36 29 Q30 36 22 30Z" fill="#d4a820"/>
      <path d="M21 35 Q33 32 35 42 Q29 48 21 42Z" fill="#e5c040"/>
      <path d="M20 47 Q31 44 33 53 Q28 58 20 52Z" fill="#d4a820"/>
      <path d="M18 59 Q29 57 30 65 Q26 70 19 64Z" fill="#c49a28"/>
      <circle cx="16" cy="74" r="3.5" fill="#d4a820"/>
      <circle cx="16" cy="74" r="2" fill="#e8c040"/>
    </svg>
  );
}

/* ─── TOP RIBBON BADGE ───────────────────────────────────────── */
function TopTrophyRibbonBadge({ isAr }: { isAr: boolean }) {
  return (
    <div style={{ position: 'relative', width: 290, height: 82, marginTop: -14,
      filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.30))', flexShrink: 0 }}>
      <svg width="290" height="82" viewBox="0 0 290 82" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
        <defs>
          <linearGradient id="rw" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5d060"/><stop offset="45%" stopColor="#d9a030"/><stop offset="100%" stopColor="#9a6210"/>
          </linearGradient>
          <linearGradient id="sg" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0d5a44"/><stop offset="100%" stopColor="#042e20"/>
          </linearGradient>
          <linearGradient id="sb" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5d060"/><stop offset="100%" stopColor="#b07820"/>
          </linearGradient>
        </defs>
        {/* Left wing */}
        <path d="M0 17 L74 17 L61 41 L74 65 L0 65 L15 41 Z" fill="url(#rw)"/>
        <path d="M0 17 L15 41 L0 65Z" fill="#7a4e0e" opacity="0.4"/>
        {/* Right wing */}
        <path d="M290 17 L216 17 L229 41 L216 65 L290 65 L275 41 Z" fill="url(#rw)"/>
        <path d="M290 17 L275 41 L290 65Z" fill="#7a4e0e" opacity="0.4"/>
        {/* Gold border shield */}
        <path d="M70 3 L220 3 Q234 3 237 15 L246 49 Q239 78 145 82 Q51 78 44 49 L53 15 Q56 3 70 3Z" fill="url(#sb)"/>
        {/* Green shield */}
        <path d="M71 7 L219 7 Q231 7 234 17 L242 49 Q236 74 145 78 Q54 74 48 49 L56 17 Q59 7 71 7Z" fill="url(#sg)"/>
      </svg>
      {/* Overlay content */}
      <div style={{ position: 'absolute', top: 8, left: 72, right: 72, bottom: 8,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
        pointerEvents: 'none' }} dir="rtl">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', width: '100%' }}>
          <svg width="26" height="24" viewBox="0 0 32 30" fill="none">
            <path d="M8 2H24V14C24 20 20 24 16 25C12 24 8 20 8 14Z" fill="#e8c040" stroke="#a07010" strokeWidth="0.8"/>
            <path d="M5 4H8V13C5 13 2.5 11 2.5 8C2.5 5.5 3.8 4 5 4Z" fill="#e8c040" stroke="#a07010" strokeWidth="0.8"/>
            <path d="M27 4H24V13C27 13 29.5 11 29.5 8C29.5 5.5 28.2 4 27 4Z" fill="#e8c040" stroke="#a07010" strokeWidth="0.8"/>
            <rect x="13" y="25" width="6" height="2.5" rx="0.5" fill="#e8c040" stroke="#a07010" strokeWidth="0.8"/>
            <rect x="10" y="27.5" width="12" height="2" rx="1" fill="#e8c040" stroke="#a07010" strokeWidth="0.8"/>
            <path d="M11 5Q13 3 14 6" stroke="#fff5a0" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: 'white', lineHeight: 1.2, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
              {isAr ? 'شهادة إنجاز واجتياز' : 'Certificate of Achievement'}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#fde68a', lineHeight: 1.2, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
              {isAr ? 'تقدير رفيع المستوى' : 'High Honor Distinction'}
            </div>
          </div>
        </div>
        <div style={{ color: '#f5d060', fontSize: 12, letterSpacing: 3, textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>★★★★★</div>
      </div>
    </div>
  );
}

/* ─── ACADEMIC SEAL ICON ─────────────────────────────────────── */
function AcademicSealIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18.5" stroke="#06392c" strokeWidth="1.4" fill="none"/>
      <circle cx="20" cy="20" r="14" stroke="#06392c" strokeWidth="0.7" fill="none"/>
      <polygon points="20,10 33,16.5 20,23 7,16.5" fill="#06392c"/>
      <path d="M14 19V27Q20 30.5 26 27V19" fill="#06392c"/>
      <line x1="33" y1="16.5" x2="33" y2="24.5" stroke="#06392c" strokeWidth="1.8" strokeLinecap="round"/>
      <circle cx="33" cy="26" r="1.7" fill="#06392c"/>
    </svg>
  );
}

/* ─── OFFICIAL SEAL ICON ─────────────────────────────────────── */
function OfficialSealIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <circle cx="20" cy="20" r="18.5" stroke="#06392c" strokeWidth="1.4" fill="none"/>
      <circle cx="20" cy="20" r="14" stroke="#06392c" strokeWidth="0.7" fill="none"/>
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => {
        const r = (deg * Math.PI) / 180;
        return <line key={i} x1={20+9*Math.cos(r)} y1={20+9*Math.sin(r)} x2={20+13.5*Math.cos(r)} y2={20+13.5*Math.sin(r)} stroke="#06392c" strokeWidth="0.9"/>;
      })}
      <circle cx="20" cy="20" r="8" stroke="#06392c" strokeWidth="0.7" fill="none"/>
      <path d="M15 20L19 24L26 16" stroke="#06392c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

/* ─── BOTTOM GOLD MEDAL ──────────────────────────────────────── */
function BottomGoldMedal() {
  return (
    <svg width="38" height="44" viewBox="0 0 38 44" fill="none">
      <defs>
        <linearGradient id="mgl" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d060"/><stop offset="55%" stopColor="#d9a030"/><stop offset="100%" stopColor="#9a6210"/>
        </linearGradient>
      </defs>
      <path d="M12 26L7 42L15 38L19 42L17 26Z" fill="#b07820"/>
      <path d="M26 26L31 42L23 38L19 42L21 26Z" fill="#b07820"/>
      <circle cx="19" cy="16" r="15" fill="url(#mgl)"/>
      <circle cx="19" cy="16" r="12.5" fill="none" stroke="#fff" strokeWidth="1.4"/>
      <circle cx="19" cy="16" r="9.5" fill="none" stroke="#b07820" strokeWidth="0.7" strokeDasharray="2 2"/>
      <path d="M8 18Q8 12 12 14Q11 18 8 18Z" fill="#06392c"/>
      <path d="M8 21Q8 16 12 17Q11 21 8 21Z" fill="#06392c"/>
      <path d="M30 18Q30 12 26 14Q27 18 30 18Z" fill="#06392c"/>
      <path d="M30 21Q30 16 26 17Q27 21 30 21Z" fill="#06392c"/>
      <path d="M13 16L17 20.5L25 12" stroke="#06392c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────── */
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
    win.document.write(`<!DOCTYPE html><html dir="${isAr?'rtl':'ltr'}"><head><meta charset="UTF-8"/>
      <style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
      body{font-family:Arial,sans-serif;}@page{size:A4 landscape;margin:0;}
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
    return 'Comprehensive Rehabilitation Program';
  };

  /* shared inline style for the 3 footer cards */
  const cardStyle: React.CSSProperties = {
    background: '#e8e2cc',
    border: '1.5px solid #b8b090',
    borderRadius: 14,
    padding: '12px 8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 7,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-3 backdrop-blur-md">
      <div className="w-full max-w-4xl rounded-3xl bg-slate-950 shadow-2xl overflow-hidden border border-emerald-900/40">

        {/* TOOLBAR */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-emerald-900/50 print:hidden" dir="rtl">
          <span className="text-sm font-black text-white">🏆 شهادة التميز والاعتماد الرسمي</span>
          <div className="flex items-center gap-2.5">
            <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs font-bold">
              <button onClick={() => setLang('ar')} className={`px-3 py-1.5 rounded-md transition ${isAr?'bg-[#06392c] text-white':'text-slate-400 hover:text-white'}`}>🇸🇦 عربي</button>
              <button onClick={() => setLang('en')} className={`px-3 py-1.5 rounded-md transition ${!isAr?'bg-[#06392c] text-white':'text-slate-400 hover:text-white'}`}>🇬🇧 English</button>
            </div>
            <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 px-4 py-2 text-xs font-black text-slate-950 transition">
              <Printer size={14}/> طباعة PDF
            </button>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition">
              <X size={16}/>
            </button>
          </div>
        </div>

        {/* CERTIFICATE */}
        <div style={{ padding: 8, background: '#0f172a' }}>
          <div
            id="printable-certificate"
            dir={isAr ? 'rtl' : 'ltr'}
            style={{
              background: '#ede8d0',
              border: '3px solid #06392c',
              borderRadius: 18,
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Corner decor */}
            <svg width="180" height="180" viewBox="0 0 180 180" fill="none"
              style={{ position:'absolute', top:0, right:0, opacity:0.18, pointerEvents:'none' }}>
              <circle cx="180" cy="0" r="165" stroke="#06392c" strokeWidth="1" strokeDasharray="5 4"/>
              <circle cx="180" cy="0" r="125" stroke="#06392c" strokeWidth="0.7"/>
              <circle cx="180" cy="0" r="85"  stroke="#06392c" strokeWidth="0.9" strokeDasharray="3 4"/>
            </svg>
            <svg width="180" height="180" viewBox="0 0 180 180" fill="none"
              style={{ position:'absolute', bottom:0, left:0, opacity:0.18, pointerEvents:'none' }}>
              <circle cx="0" cy="180" r="165" stroke="#06392c" strokeWidth="1" strokeDasharray="5 4"/>
              <circle cx="0" cy="180" r="125" stroke="#06392c" strokeWidth="0.7"/>
              <circle cx="0" cy="180" r="85"  stroke="#06392c" strokeWidth="0.9" strokeDasharray="3 4"/>
            </svg>

            {/* ── HEADER ── */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
              padding:'18px 24px 0 24px', position:'relative', zIndex:1 }}>

              {/* RIGHT (RTL first): Certified box */}
              <div style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(255,255,255,0.50)',
                border:'1px solid #b0a880', borderRadius:10, padding:'7px 10px', minWidth:130 }}>
                <div style={{ background:'#06392c', borderRadius:7, width:28, height:28,
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <ShieldCheck size={15} color="white"/>
                </div>
                <div style={{ textAlign:'right', lineHeight:1.4 }}>
                  <div style={{ fontSize:10.5, fontWeight:900, color:'#06392c' }}>{isAr?'شهادة معتمدة':'Certified'}</div>
                  <div style={{ fontSize:8.5, fontFamily:'monospace', color:'#666' }}>{certNo}</div>
                  <div style={{ fontSize:8.5, color:'#888' }}>{isAr?'التاريخ:':'Date:'} {data.completionDate}</div>
                </div>
              </div>

              {/* CENTER: Badge */}
              <TopTrophyRibbonBadge isAr={isAr}/>

              {/* LEFT (RTL last): Logo */}
              <div style={{ display:'flex', alignItems:'center' }}>
                <BrandMark size="sm" showText={true}/>
              </div>
            </div>

            {/* ── BODY ── */}
            <div style={{ padding:'10px 24px 6px', textAlign:'center', display:'flex',
              flexDirection:'column', alignItems:'center', gap:5, position:'relative', zIndex:1 }}>

              <h1 style={{ fontSize:30, fontWeight:900, color:'#06392c', margin:0,
                fontFamily:'Georgia, serif', lineHeight:1.2 }}>
                {isAr ? 'شهادة إنجاز واجتياز برنامج علاجي' : 'CERTIFICATE OF COMPLETION'}
              </h1>

              <p style={{ fontSize:11.5, fontWeight:700, color:'#555', margin:0 }}>
                {isAr ? 'تشهد منصة مسار للتأهيل والتعليم الذكي وتحت إشراف الاستشاري'
                       : 'This certifies under the supervision of Consultant'}
              </p>

              <p style={{ fontSize:19, fontWeight:900, color:'#06392c', margin:0, fontFamily:'Georgia, serif' }}>
                {data.doctorName || (isAr ? 'أ.د. إسماعيل عيسى' : 'Prof. Dr. Ismail Issa')}
              </p>

              <p style={{ fontSize:11, fontWeight:700, color:'#666', margin:0 }}>
                {isAr ? 'بأن البطل/ة' : 'that the student'}
              </p>

              {/* Student name + laurel */}
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <GoldenLaurelBranch side="left"/>
                <div>
                  {!isAr && editingEnName ? (
                    <div style={{ display:'flex', alignItems:'center', gap:8, borderBottom:'2px solid #d9a238' }}>
                      <input autoFocus value={nameEn} onChange={e=>setNameEn(e.target.value)}
                        onKeyDown={e=>e.key==='Enter'&&setEditingEnName(false)}
                        placeholder="Student English name..."
                        style={{ background:'transparent', fontSize:36, fontWeight:900, color:'#06392c',
                          border:'none', outline:'none', textAlign:'center', fontFamily:'Georgia, serif', width:300 }}/>
                      <button onClick={()=>setEditingEnName(false)} style={{ color:'#06392c', cursor:'pointer', background:'none', border:'none' }}>
                        <Check size={18}/>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <h2 style={{ fontSize:38, fontWeight:900, color:'#06392c', margin:0,
                        fontFamily:'Georgia, serif', lineHeight:1 }}>
                        {displayName}
                      </h2>
                      {!isAr && (
                        <button onClick={()=>setEditingEnName(true)}
                          style={{ color:'#aaa', cursor:'pointer', background:'none', border:'none' }} className="print:hidden">
                          <Pencil size={13}/>
                        </button>
                      )}
                    </div>
                  )}
                  {/* Gold divider with diamond */}
                  <div style={{ position:'relative', marginTop:6, height:2, display:'flex', alignItems:'center' }}>
                    <div style={{ width:'100%', height:2, background:'linear-gradient(to right, transparent, #d9a238 20%, #d9a238 80%, transparent)' }}/>
                    <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%) rotate(45deg)', width:9, height:9, background:'#d9a238' }}/>
                  </div>
                </div>
                <GoldenLaurelBranch side="right"/>
              </div>

              {!isAr && !nameEn && !editingEnName && (
                <p style={{ fontSize:9.5, color:'#a07030', margin:0 }} className="print:hidden">✏️ Click pencil to enter English name</p>
              )}

              {/* Program */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5, width:'100%', marginTop:2 }}>
                <p style={{ fontSize:11.5, fontWeight:700, color:'#555', margin:0 }}>
                  {isAr ? 'قد أتم بنجاح واقتدار لكافة متطلبات الجلسات العلاجية والتحليلية النهائية المتخصصة في:'
                         : 'Has successfully completed all specialized therapeutic & analytical session requirements in:'}
                </p>
                <div style={{ background:'rgba(255,255,255,0.65)', border:'1.5px solid #aea882', borderRadius:9, padding:'7px 24px' }}>
                  <span style={{ fontSize:16, fontWeight:900, color:'#06392c' }}>
                    {isAr ? data.programTitle : englishProgramTitle(data.programTitle)}
                  </span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11.5, fontWeight:700, color:'#444' }}>
                  <span>{isAr ? 'وحقق نسبة إنجاز تراكمية قدرها' : 'Achieved a cumulative completion rate of'}</span>
                  <span style={{ background:'#06392c', color:'white', fontFamily:'monospace', fontWeight:900,
                    fontSize:12, padding:'3px 12px', borderRadius:7 }}>
                    {isAr ? `%${data.score}` : `${data.score}%`}
                  </span>
                  <span>{isAr ? 'مع الالتزام التام بالجلسات الفردية والمنزلية.' : 'with full commitment to individual & home sessions.'}</span>
                </div>
              </div>
            </div>

            {/* ── FOOTER CARDS ──
                dir=rtl → 1st child shows RIGHT, 3rd child shows LEFT
                Visual:  [Official RIGHT] [Doctor CENTER] [Academic LEFT]
            ── */}
            <div style={{ padding:'6px 18px 12px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
              gap:10, position:'relative', zIndex:1 }} dir="rtl">

              {/* Card 1 → RIGHT: Official Seal */}
              <div style={cardStyle} dir="rtl">
                <OfficialSealIcon/>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:11.5, fontWeight:900, color:'#06392c' }}>
                    {isAr ? 'الختم الرسمي المعتمد' : 'Official Certified Seal'}
                  </div>
                  <div style={{ fontSize:9, fontWeight:700, color:'#777', marginTop:2 }}>
                    {isAr ? 'منصة مسار التعليمية' : 'Masar Educational Platform'}
                  </div>
                </div>
                <div style={{ background:'#d8cfaa', border:'1px solid #aaa080', borderRadius:20,
                  padding:'3px 12px', fontSize:10, fontWeight:700, color:'#06392c' }}>
                  {isAr ? 'ختم منصة مسار' : 'Masar Platform Seal'}
                </div>
              </div>

              {/* Card 2 → CENTER: Doctor */}
              <div style={cardStyle} dir="rtl">
                <div style={{ fontSize:9.5, fontWeight:700, color:'#888' }}>
                  {isAr ? 'يعتمد هذه الشهادة' : 'Certified by'}
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:17, fontWeight:900, color:'#06392c', fontFamily:'Georgia, serif' }}>
                    {data.doctorName || (isAr ? 'أ.د. إسماعيل عيسى' : 'Prof. Dr. Ismail Issa')}
                  </div>
                  <div style={{ fontSize:9, fontWeight:700, color:'#777', marginTop:2, lineHeight:1.3 }}>
                    {isAr ? 'استشاري التربية الخاصة وتأهيل صعوبات التعلم'
                           : 'Special Education & Learning Difficulties Consultant'}
                  </div>
                </div>
                <div style={{ borderBottom:'1.5px solid #c49a28', paddingBottom:3, paddingLeft:10, paddingRight:10 }}>
                  <span style={{ fontFamily:'Georgia, cursive', fontStyle:'italic', fontSize:13,
                    color:'#c49a28', fontWeight:700 }}>أ.د. إسماعيل عيسى</span>
                </div>
                <div style={{ background:'#ead898', border:'1px solid #d4a030', borderRadius:20,
                  padding:'3px 11px', fontSize:9.5, fontWeight:700, color:'#7a5010' }}>
                  {isAr ? 'التوقيع والاعتماد المعتمد' : 'Authorized Signature'}
                </div>
              </div>

              {/* Card 3 → LEFT: Academic Seal */}
              <div style={cardStyle} dir="rtl">
                <AcademicSealIcon/>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:11.5, fontWeight:900, color:'#06392c' }}>
                    {isAr ? 'الختم الأكاديمي' : 'Academic Seal'}
                  </div>
                  <div style={{ fontSize:9, fontWeight:700, color:'#777', marginTop:2 }}>
                    {isAr ? 'منصة مسار للتأهيل والتعليم الذكي' : 'Smart Rehabilitation Platform'}
                  </div>
                </div>
                <div style={{ background:'#d8cfaa', border:'1px solid #aaa080', borderRadius:20,
                  padding:'3px 12px', fontSize:10, fontWeight:700, color:'#06392c' }}>
                  {isAr ? 'ختم منصة تأسيس' : 'Tasis Platform Seal'}
                </div>
              </div>

            </div>

            {/* ── BOTTOM BAR ──
                dir=rtl → 1st child shows RIGHT (medal+text), last shows LEFT (QR)
            ── */}
            <div style={{ background:'#06392c', padding:'9px 18px', display:'flex', alignItems:'center',
              justifyContent:'space-between', borderRadius:'0 0 15px 15px', position:'relative', zIndex:1 }}
              dir="rtl">

              {/* RIGHT: text + medal */}
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:10.5, fontWeight:900, color:'white', lineHeight:1.3 }}>
                    {isAr ? 'شهادة صادرة رسمياً وموثقة' : 'Officially Issued Certificate'}
                  </div>
                  <div style={{ fontSize:9, color:'#86c8a0', lineHeight:1.3 }}>
                    {isAr ? 'عبر منصة مسار للتأهيل والتعليم الذكي' : 'via Masar Smart Platform'}
                  </div>
                </div>
                <BottomGoldMedal/>
              </div>

              {/* CENTER: serial */}
              <div style={{ display:'flex', alignItems:'center', gap:5, fontFamily:'monospace',
                fontSize:11.5, fontWeight:700, color:'white' }}>
                <ShieldCheck size={14} color="rgba(255,255,255,0.8)"/>
                <span>{certNo}</span>
              </div>

              {/* LEFT: QR + text */}
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:10.5, fontWeight:900, color:'white', lineHeight:1.3 }}>
                    {isAr ? 'تحقق من صحة الشهادة' : 'Verify Certificate'}
                  </div>
                  <div style={{ fontSize:9, color:'#86c8a0', lineHeight:1.3 }}>
                    {isAr ? 'امسح الكود للتحقق' : 'Scan Code to Verify'}
                  </div>
                </div>
                <div style={{ background:'white', borderRadius:7, padding:4,
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <QrCode size={26} color="#06392c"/>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
