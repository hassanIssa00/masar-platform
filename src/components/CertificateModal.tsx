// Updated: 2026-08-12 - Real Dr. Ismail Stamp in Certificate
'use client';

import { useState, useRef, useEffect } from 'react';
import { Printer, X, ShieldCheck, Pencil, Check } from 'lucide-react';
import BrandMark from './BrandMark';

// ── Load signature image as transparent PNG (same as signature/page.tsx) ─────
async function loadTransparentSignature(src: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(''); return; }
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
          if (brightness > 175) {
            data[i+3] = 0;
          } else {
            data[i] = 15; data[i+1] = 23; data[i+2] = 42;
            data[i+3] = Math.min(255, Math.round((255 - brightness) * 2.2));
          }
        }
        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch { resolve(''); }
    };
    img.onerror = () => resolve('');
    img.src = src;
  });
}

// ── Ring decorative dots for stamp ───────────────────────────────────────────
function ringDots(cx: number, cy: number, r: number, count: number, ink: string) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    return (
      <circle key={i}
        cx={cx + Math.cos(a) * r} cy={cy + Math.sin(a) * r}
        r={i % 6 === 0 ? 2.0 : 1.0} fill={ink} />
    );
  });
}

// ── Compact Dr. Ismail Stamp (matches signature page design) ─────────────────
function DrIsmailStamp({ sigB64, isAr, dateStr }: { sigB64: string; isAr: boolean; dateStr: string }) {
  const SZ = 160;
  const CX = SZ / 2;
  const CY = SZ / 2;
  const INK = '#0f172a';
  const RO = 76;
  const RI = 68;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={SZ} height={SZ} viewBox={`0 0 ${SZ} ${SZ}`}>
      <circle cx={CX} cy={CY} r={RO} fill="none" stroke={INK} strokeWidth="2.5" />
      {ringDots(CX, CY, (RO + RI) / 2, 60, INK)}
      <circle cx={CX} cy={CY} r={RI} fill="white" stroke={INK} strokeWidth="1.2" />

      {/* Top label */}
      <text x={CX} y={CY - 44} textAnchor="middle"
        fontFamily="Cairo, Amiri, Arial" fontSize="6.5" fontWeight="bold" fill={INK}
        direction={isAr ? 'rtl' : 'ltr'}>
        {isAr ? 'الختم الرسمي المعتمد' : 'OFFICIAL APPROVED STAMP'}
      </text>

      {/* Name */}
      <text x={CX} y={CY - 30} textAnchor="middle"
        fontFamily="Cairo, Amiri, Arial" fontSize="10.5" fontWeight="900" fill={INK}
        direction={isAr ? 'rtl' : 'ltr'}>
        {isAr ? 'د. إسماعيل عيسى' : 'DR. ISMAIL ISSA'}
      </text>

      {/* Decorative stars + divider */}
      <text x={CX - 38} y={CY - 21} textAnchor="middle" fontSize="6" fill={INK}>✦</text>
      <text x={CX + 38} y={CY - 21} textAnchor="middle" fontSize="6" fill={INK}>✦</text>
      <line x1={CX - 56} y1={CY - 17} x2={CX + 56} y2={CY - 17} stroke={INK} strokeWidth="0.8" />

      {/* Signature image */}
      {sigB64 && (
        <image href={sigB64} x={CX - 56} y={CY - 16} width="112" height="34"
          preserveAspectRatio="xMidYMid meet" />
      )}
      {!sigB64 && (
        <text x={CX} y={CY + 6} textAnchor="middle"
          fontFamily="Cairo, Amiri, Arial" fontSize="6" fill={INK} opacity="0.4">
          {isAr ? 'التوقيع' : 'Signature'}
        </text>
      )}

      <line x1={CX - 56} y1={CY + 20} x2={CX + 56} y2={CY + 20} stroke={INK} strokeWidth="0.8" />

      {/* Date */}
      <text x={CX} y={CY + 32} textAnchor="middle"
        fontFamily="Cairo, Amiri, Arial" fontSize="7.5" fontWeight="900" fill={INK}
        letterSpacing="0.5">
        {dateStr}
      </text>

      {/* Bottom label */}
      <text x={CX} y={CY + 44} textAnchor="middle"
        fontFamily="Cairo, Amiri, Arial" fontSize="5" fontWeight="bold" fill={INK}>
        {isAr ? 'منصة مسار · التعليم العلاجي' : 'MASAR PLATFORM · JEDDAH'}
      </text>
    </svg>
  );
}

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

/* ─── LUXURY EMBOSSED ACADEMIC SEAL ──────────────────────────── */
function AcademicSealIcon() {
  return (
    <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <defs>
          <linearGradient id="gold-seal-1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#d9a238" />
            <stop offset="100%" stopColor="#854d0e" />
          </linearGradient>
        </defs>
        {/* Outer Serrated Ring */}
        <path
          d="M28 2L31 6L36 4.5L37.5 9.5L42.5 9.5L42.5 14.5L47.5 16L45.5 21L49.5 24L46.5 28L49.5 32L45.5 35L47.5 40L42.5 41.5L42.5 46.5L37.5 46.5L36 51.5L31 50L28 54L25 50L20 51.5L18.5 46.5L13.5 46.5L13.5 41.5L8.5 40L10.5 35L6.5 32L9.5 28L6.5 24L10.5 21L8.5 16L13.5 14.5L13.5 9.5L18.5 9.5L20 4.5L25 6Z"
          fill="url(#gold-seal-1)"
          stroke="#06392c"
          strokeWidth="1"
        />
        <circle cx="28" cy="28" r="19" fill="#ffffff" stroke="#06392c" strokeWidth="1.2" />
        <circle cx="28" cy="28" r="16.5" fill="none" stroke="#d9a238" strokeWidth="0.8" strokeDasharray="2 2" />
      </svg>
      <img
        src="/brand/masar-logo.png"
        alt="ختم مسار"
        className="absolute w-8 h-8 object-contain"
      />
    </div>
  );
}

/* ─── LUXURY EMBOSSED OFFICIAL SEAL ──────────────────────────── */
function OfficialSealIcon() {
  return (
    <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
        <defs>
          <linearGradient id="gold-seal-2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#d9a238" />
            <stop offset="100%" stopColor="#854d0e" />
          </linearGradient>
        </defs>
        {/* Outer Serrated Ring */}
        <path
          d="M28 2L31 6L36 4.5L37.5 9.5L42.5 9.5L42.5 14.5L47.5 16L45.5 21L49.5 24L46.5 28L49.5 32L45.5 35L47.5 40L42.5 41.5L42.5 46.5L37.5 46.5L36 51.5L31 50L28 54L25 50L20 51.5L18.5 46.5L13.5 46.5L13.5 41.5L8.5 40L10.5 35L6.5 32L9.5 28L6.5 24L10.5 21L8.5 16L13.5 14.5L13.5 9.5L18.5 9.5L20 4.5L25 6Z"
          fill="url(#gold-seal-2)"
          stroke="#06392c"
          strokeWidth="1"
        />
        <circle cx="28" cy="28" r="19" fill="#ffffff" stroke="#06392c" strokeWidth="1.2" />
        <circle cx="28" cy="28" r="16.5" fill="none" stroke="#d9a238" strokeWidth="0.8" strokeDasharray="2 2" />
      </svg>
      <img
        src="/brand/masar-logo.png"
        alt="ختم مسار"
        className="absolute w-8 h-8 object-contain"
      />
    </div>
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
  const [sigB64, setSigB64] = useState('');

  const isAr = lang === 'ar';
  const certNo = data.certNumber || `NSR-CERT-2026-${Math.random().toString().slice(2, 7)}`;
  const displayName = isAr ? data.studentName : (nameEn || data.studentName);

  const certRef = useRef<HTMLDivElement>(null);

  // Load Dr. Ismail's transparent signature
  useEffect(() => {
    loadTransparentSignature('/dr-ismail-signature.jpg').then((b64) => {
      if (b64) { setSigB64(b64); }
      else { loadTransparentSignature('/dr-ismail-signature.png').then(setSigB64); }
    });
  }, []);

  // Build today's date string for stamp
  const stampDate = (() => {
    try {
      const now = new Date();
      if (isAr) {
        const d = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric' }).format(now).replace(/[^\d٠-٩]/g, '');
        const m = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { month: 'numeric' }).format(now).replace(/[^\d٠-٩]/g, '');
        const y = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { year: 'numeric' }).format(now).replace(/[^\d٠-٩]/g, '');
        return `${d} / ${m} / ${y} هـ`;
      } else {
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear());
        return `${day} / ${month} / ${year} AD`;
      }
    } catch { return data.completionDate; }
  })();

  const handlePrint = () => {
    window.print();
  };


  const englishProgramTitle = (t: string) => {
    if (t.includes('قراءة') || t.includes('فونيك')) return 'Reading & Phonological Awareness Program';
    if (t.includes('رياضيات') || t.includes('حساب')) return 'Math & Dyscalculia Remediation Program';
    if (t.includes('تخاطب') || t.includes('نطق')) return 'Speech & Language Therapy Program';
    if (t.includes('توحد')) return 'Autism Spectrum Rehabilitation Program';
    return 'Comprehensive Rehabilitation Program';
  };

  /* shared luxury inline style for the 3 footer cards */
  const cardStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1.5px solid #d1d5db',
    borderRadius: 18,
    padding: '16px 14px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 155,
    boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-3 backdrop-blur-md print-modal-overlay">
      <div className="w-full max-w-4xl rounded-3xl bg-slate-950 shadow-2xl overflow-hidden border border-emerald-900/40 print-modal-wrapper">

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
            ref={certRef}
            id="printable-certificate"
            dir={isAr ? 'rtl' : 'ltr'}
            style={{
              background: '#ffffff',
              border: '3px solid #06392c',
              borderRadius: 20,
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Corner decor */}
            <svg width="200" height="200" viewBox="0 0 200 200" fill="none"
              style={{ position:'absolute', top:0, right:0, opacity:0.12, pointerEvents:'none' }}>
              <circle cx="200" cy="0" r="185" stroke="#06392c" strokeWidth="1" strokeDasharray="5 4"/>
              <circle cx="200" cy="0" r="145" stroke="#06392c" strokeWidth="0.7"/>
              <circle cx="200" cy="0" r="105" stroke="#06392c" strokeWidth="0.9" strokeDasharray="3 4"/>
            </svg>
            <svg width="200" height="200" viewBox="0 0 200 200" fill="none"
              style={{ position:'absolute', bottom:0, left:0, opacity:0.12, pointerEvents:'none' }}>
              <circle cx="0" cy="200" r="185" stroke="#06392c" strokeWidth="1" strokeDasharray="5 4"/>
              <circle cx="0" cy="200" r="145" stroke="#06392c" strokeWidth="0.7"/>
              <circle cx="0" cy="200" r="105" stroke="#06392c" strokeWidth="0.9" strokeDasharray="3 4"/>
            </svg>

            {/* ── HEADER ── */}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between',
              padding:'20px 28px 0 28px', position:'relative', zIndex:1, width: '100%' }}
              dir={isAr ? 'rtl' : 'ltr'}
            >

              {/* FIRST (RTL→RIGHT / LTR→LEFT): Logo */}
              <div style={{ display:'flex', alignItems:'center' }}>
                <BrandMark size="md" showText={true} isEn={!isAr}/>
              </div>

              {/* CENTER: Badge — temporarily hidden */}
              {/* <TopTrophyRibbonBadge isAr={isAr}/> */}

              {/* LAST (RTL→LEFT / LTR→RIGHT): Certified box */}
              <div style={{ display:'flex', alignItems:'center', gap:8, background:'#ffffff',
                border:'1.5px solid #e2e8e4', borderRadius:14, padding:'8px 12px', minWidth:140, boxShadow:'0 2px 6px rgba(0,0,0,0.03)' }}>
                <div style={{ background:'#06392c', borderRadius:10, width:30, height:30,
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <ShieldCheck size={16} color="white"/>
                </div>
                <div style={{ textAlign: isAr ? 'right' : 'left', lineHeight:1.3 }}>
                  <div style={{ fontSize:11, fontWeight:900, color:'#06392c' }}>{isAr?'شهادة معتمدة':'Certified'}</div>
                  <div style={{ fontSize:9, fontFamily:'monospace', color:'#666' }}>{certNo}</div>
                  <div style={{ fontSize:9, color:'#888' }}>{isAr?'التاريخ:':'Date:'} {data.completionDate}</div>
                </div>
              </div>

            </div>

            {/* ── BODY ── */}
            <div style={{ padding:'12px 28px 8px', textAlign:'center', display:'flex',
              flexDirection:'column', alignItems:'center', gap:6, position:'relative', zIndex:1 }}>

              <h1 style={{ fontSize:32, fontWeight:900, color:'#06392c', margin:0,
                fontFamily:'Georgia, serif', lineHeight:1.2 }}>
                {isAr ? 'شهادة إنجاز واجتياز برنامج علاجي' : 'CERTIFICATE OF COMPLETION'}
              </h1>

              <p style={{ fontSize:12, fontWeight:700, color:'#555', margin:0 }}>
                {isAr ? 'تشهد منصة مسار للتأهيل والتعليم الذكي وتحت إشراف الاستشاري'
                       : 'This certifies under the supervision of Consultant'}
              </p>

              <p style={{ fontSize:20, fontWeight:900, color:'#06392c', margin:0, fontFamily:'Georgia, serif' }}>
                {data.doctorName || (isAr ? 'د. إسماعيل عيسى' : 'Dr. Ismail Issa')}
              </p>

              <p style={{ fontSize:11.5, fontWeight:700, color:'#666', margin:0 }}>
                {isAr ? 'بأن البطل/ة' : 'that the student'}
              </p>

              {/* Student name + laurel */}
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <GoldenLaurelBranch side="left"/>
                <div>
                  {!isAr && editingEnName ? (
                    <div style={{ display:'flex', alignItems:'center', gap:8, borderBottom:'2px solid #d9a238' }}>
                      <input autoFocus value={nameEn} onChange={e=>setNameEn(e.target.value)}
                        onKeyDown={e=>e.key==='Enter'&&setEditingEnName(false)}
                        placeholder="Student English name..."
                        style={{ background:'transparent', fontSize:38, fontWeight:900, color:'#06392c',
                          border:'none', outline:'none', textAlign:'center', fontFamily:'Georgia, serif', width:320 }}/>
                      <button onClick={()=>setEditingEnName(false)} style={{ color:'#06392c', cursor:'pointer', background:'none', border:'none' }}>
                        <Check size={18}/>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <h2 style={{ fontSize:40, fontWeight:900, color:'#06392c', margin:0,
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
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:6, width:'100%', marginTop:2 }}>
                <p style={{ fontSize:12, fontWeight:700, color:'#555', margin:0 }}>
                  {isAr ? 'قد أتم بنجاح واقتدار لكافة متطلبات الجلسات العلاجية والتحليلية النهائية المتخصصة في:'
                         : 'Has successfully completed all specialized therapeutic & analytical session requirements in:'}
                </p>
                <div style={{ background:'#e3eae4', border:'1.5px solid #c4d4c8', borderRadius:14, padding:'8px 28px' }}>
                  <span style={{ fontSize:17, fontWeight:900, color:'#06392c' }}>
                    {isAr ? data.programTitle : englishProgramTitle(data.programTitle)}
                  </span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, fontWeight:700, color:'#444', flexWrap:'wrap', justifyContent:'center' }}>
                  <span>{isAr ? 'وحقق نسبة إنجاز تراكمية' : 'Achieved a cumulative completion rate'}</span>
                  <span style={{
                    background: data.score >= 90 ? '#d4a820' : data.score >= 80 ? '#06392c' : '#3b82f6',
                    color: 'white',
                    fontWeight: 900,
                    fontSize: 12,
                    padding: '2px 12px',
                    borderRadius: 20,
                    border: `1.5px solid ${data.score >= 90 ? '#9a6210' : data.score >= 80 ? '#042e20' : '#1d4ed8'}`,
                    letterSpacing: '0.5px',
                  }}>
                    {isAr
                      ? (data.score >= 90 ? 'بدرجة ممتاز' : data.score >= 80 ? 'بدرجة جيد جداً' : data.score >= 70 ? 'بدرجة جيد' : 'بدرجة مقبول')
                      : (data.score >= 90 ? 'Distinction' : data.score >= 80 ? 'Very Good' : 'Good')}
                  </span>
                  <span>{isAr ? 'قدرها' : 'of'}</span>
                  <span style={{ background:'#06392c', color:'white', fontFamily:'monospace', fontWeight:900,
                    fontSize:13, padding:'3px 14px', borderRadius:8 }}>
                    {isAr ? `%${data.score}` : `${data.score}%`}
                  </span>
                  <span>{isAr ? 'مع الالتزام التام بالجلسات الفردية والمنزلية.' : 'with full commitment to individual & home sessions.'}</span>
                </div>
              </div>
            </div>

            {/* ── OFFICIAL REPORT FOOTER (PERFECT SYMMETRY WITH STAMP & SIGNATURE) ── */}
            <div style={{ padding: '14px 28px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa', position: 'relative', zIndex: 1 }} dir={isAr ? 'rtl' : 'ltr'}>

              {/* Doctor Approval & Handwritten Signature */}
              <div style={{ textAlign: isAr ? 'right' : 'left', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>
                  {isAr ? 'يعتمد:' : 'Certified by:'}
                </span>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: 'Georgia, serif' }}>
                  {data.doctorName || (isAr ? 'د. إسماعيل عيسى' : 'Dr. Ismail Issa')}
                </h3>
                <p style={{ fontSize: 10.5, fontWeight: 700, color: '#64748b', margin: 0 }}>
                  {isAr ? 'استشاري التربية الخاصة وتأهيل صعوبات التعلم' : 'Special Education & Learning Disabilities Consultant'}
                </p>

                {/* Handwritten Signature Image & Line */}
                <div style={{ position: 'relative', width: 220, marginTop: 4 }}>
                  <img
                    src="/dr-ismail-signature.png"
                    alt="التوقيع المعتمد"
                    style={{
                      height: 48,
                      objectFit: 'contain',
                      marginBottom: -12,
                      marginLeft: isAr ? '0' : 'auto',
                      marginRight: isAr ? 'auto' : '0',
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))'
                    }}
                  />
                  <div style={{ borderBottom: '1.5px solid #94a3b8', width: '100%', paddingTop: 4, display: 'flex', justifyContent: isAr ? 'flex-start' : 'flex-end' }}>
                    <span style={{ fontSize: 9.5, fontWeight: 900, color: '#64748b' }}>
                      {isAr ? 'التوقيع المعتمد' : 'Authorized Signature'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Official Circular Stamp (Arabic or English) */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <DrIsmailStamp sigB64={sigB64} isAr={isAr} dateStr={stampDate} />
                <div style={{ fontSize: 9, fontFamily: 'monospace', fontWeight: 900, color: '#64748b', letterSpacing: '0.5px' }}>
                  {certNo}
                </div>
              </div>

            </div>

            {/* ── BOTTOM BAR ──
                dir=rtl → 1st child shows RIGHT (medal+text), last shows LEFT (QR)
            ── */}
            <div style={{ background:'#06392c', padding:'10px 22px', display:'flex', alignItems:'center',
              justifyContent:'space-between', borderRadius:'0 0 16px 16px', position:'relative', zIndex:1 }}
              dir="rtl">

              {/* RIGHT: text + medal */}
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

              {/* CENTER: serial */}
              <div style={{ display:'flex', alignItems:'center', gap:6, fontFamily:'monospace',
                fontSize:12, fontWeight:700, color:'white' }}>
                <ShieldCheck size={15} color="rgba(255,255,255,0.8)"/>
                <span>{certNo}</span>
              </div>

              {/* LEFT: Real Scannable QR Code + text */}
              {(() => {
                const origin = typeof window !== 'undefined' ? window.location.origin : 'https://masar-platform.com';
                const verifyUrl = `${origin}/verify/${certNo}?name=${encodeURIComponent(displayName)}&prog=${encodeURIComponent(data.programTitle)}&score=${data.score}&date=${encodeURIComponent(data.completionDate)}`;
                const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(verifyUrl)}`;

                return (
                  <a
                    href={verifyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}
                    title={isAr ? 'اضغط أو امسح للتحقق الرقمي من صحة الشهادة' : 'Click or scan to verify certificate'}
                  >
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, fontWeight: 900, color: 'white', lineHeight: 1.3 }}>
                        {isAr ? 'تحقق من صحة الشهادة' : 'Verify Certificate'}
                      </div>
                      <div style={{ fontSize: 9.5, color: '#a8d4b8', lineHeight: 1.3 }}>
                        {isAr ? 'امسح الكود للتحقق' : 'Scan Code to Verify'}
                      </div>
                    </div>
                    <div style={{ background: 'white', borderRadius: 8, padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38 }}>
                      <img
                        src={qrImageUrl}
                        alt="QR Verification Code"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  </a>
                );
              })()}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
