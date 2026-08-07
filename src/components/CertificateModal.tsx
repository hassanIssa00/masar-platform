'use client';

import { Award, Printer, ShieldCheck, Sparkles, X, CheckCircle2, QrCode } from 'lucide-react';
import BrandMark from './BrandMark';

export interface CertificateData {
  studentName: string;
  programTitle: string;
  completionDate: string;
  score: number;
  certNumber?: string;
  doctorName?: string;
}

/* ─── Gold Corner Ornament ─── */
function GoldCorner({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const styles: Record<string, React.CSSProperties> = {
    'top-right': { top: 12, right: 12 },
    'top-left': { top: 12, left: 12, transform: 'scaleX(-1)' },
    'bottom-right': { bottom: 12, right: 12, transform: 'scaleY(-1)' },
    'bottom-left': { bottom: 12, left: 12, transform: 'scale(-1)' },
  };

  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      style={{ position: 'absolute', zIndex: 10, ...styles[position] }}
    >
      <path d="M4 4H28V8H8V28H4V4Z" fill="url(#gold-grad-corner)" />
      <path d="M12 12H24V14H14V24H12V12Z" fill="url(#gold-grad-corner)" />
      <circle cx="6" cy="6" r="3" fill="#d97706" />
      <circle cx="20" cy="6" r="2" fill="#f59e0b" />
      <circle cx="6" cy="20" r="2" fill="#f59e0b" />
    </svg>
  );
}

/* ─── Metallic Gold Seal Badge ─── */
function MetallicGoldSeal({ text, subtext }: { text: string; subtext: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div
        style={{
          width: 86,
          height: 86,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #fef08a 0%, #f59e0b 45%, #b45309 80%, #78350f 100%)',
          border: '3px solid #fef08a',
          boxShadow: '0 0 0 2px #b45309, 0 0 16px rgba(245, 158, 11, 0.4), 0 8px 20px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div style={{ position: 'absolute', width: 74, height: 74, borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,0.7)' }} />
        <span style={{ color: '#fff', fontSize: 20, fontWeight: 900, textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>👑</span>
        <span style={{ color: '#ffffff', fontSize: 10, fontWeight: 900, letterSpacing: 0.5, textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>{text}</span>
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 8, fontWeight: 700 }}>{subtext}</span>
      </div>
      <span style={{ fontSize: 9, color: '#92400e', fontWeight: 800 }}>ختم التميز الذهبي</span>
    </div>
  );
}

export default function CertificateModal({ data, onClose }: { data: CertificateData; onClose: () => void }) {
  const handlePrint = () => {
    window.print();
  };

  const certNo = data.certNumber || `CERT-2026-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const docName = data.doctorName || 'أ.د. إسماعيل عيسى';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 p-3 sm:p-6 backdrop-blur-md grid place-items-center">

      {/* SVG Gradient definitions */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="gold-grad-corner" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="gold-border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d97706" />
            <stop offset="25%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="75%" stopColor="#fef08a" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>
      </svg>

      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-amber-300/40">

        {/* Action Bar (hidden when printing) */}
        <div className="flex items-center justify-between border-b border-amber-200/60 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 px-6 py-4 print:hidden" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Award size={20} />
            </div>
            <div>
              <h2 className="font-black text-white text-base">شهادة التميز والإنجاز الرسمية 👑</h2>
              <p className="text-xs text-amber-200/70 font-semibold">وثيقة ملكية معتمدة ومختومة بختمَي مسار ونيكسس</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-5 py-2.5 text-xs font-black text-slate-950 transition shadow-lg shadow-amber-500/20 active:scale-95"
            >
              <Printer size={16} /> طباعة الشهادة الفاخرة / PDF
            </button>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 📜 PRINTABLE ROYAL CERTIFICATE PAGE 📜 */}
        <div className="p-4 sm:p-8 bg-slate-950 print:p-0">
          <div
            id="printable-certificate"
            className="relative overflow-hidden rounded-2xl print:rounded-none bg-gradient-to-b from-[#fffef9] via-[#fffdf0] to-[#fffef7] p-8 sm:p-12 text-slate-900 text-center transition-all shadow-2xl"
            style={{
              border: '12px double #d97706',
              outline: '2px solid #fef08a',
              outlineOffset: '-6px',
              fontFamily: 'Georgia, serif',
            }}
            dir="rtl"
          >
            {/* 4 Gold Ornaments */}
            <GoldCorner position="top-right" />
            <GoldCorner position="top-left" />
            <GoldCorner position="bottom-right" />
            <GoldCorner position="bottom-left" />

            {/* Background Guilloche Texture */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(245, 158, 11, 0.05) 0%, transparent 70%)',
                pointerEvents: 'none',
              }}
            />

            {/* ══ HEADER BAR ══ */}
            <div className="relative z-10 flex items-center justify-between border-b-2 border-amber-200/80 pb-6 mb-6">
              <div className="flex items-center gap-3">
                <BrandMark size="md" />
                <div className="text-right">
                  <div className="text-sm font-black text-indigo-950 tracking-tight">مَسَار · MASAR</div>
                  <div className="text-[10px] font-bold text-amber-700">منصة التأهيل والتعليم الذكي</div>
                </div>
              </div>

              {/* Center Royal Crest */}
              <div className="hidden sm:flex flex-col items-center">
                <div className="flex items-center gap-2 text-amber-600">
                  <span className="text-lg">🌿</span>
                  <span className="text-xs font-black tracking-widest text-amber-800 uppercase">OFFICIAL CERTIFICATE OF EXCELLENCE</span>
                  <span className="text-lg">🌿</span>
                </div>
              </div>

              <div className="text-left text-[11px] font-bold text-slate-600 bg-amber-50/80 border border-amber-200/80 px-4 py-2 rounded-xl">
                <p className="font-black text-indigo-950">{certNo}</p>
                <p className="text-[10px] text-slate-500">التاريخ: {data.completionDate}</p>
              </div>
            </div>

            {/* ══ TITLE & CREST ══ */}
            <div className="relative z-10 space-y-3 py-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 px-6 py-2 text-xs font-black text-amber-900 border-2 border-amber-300 shadow-xs">
                <Sparkles size={16} className="text-amber-600" />
                <span>شهادة إنجاز واجتياز رسمي وتكريم استثنائي</span>
                <Sparkles size={16} className="text-amber-600" />
              </div>

              <h1 className="text-2xl sm:text-4xl font-black text-indigo-950 tracking-tight pt-2" style={{ fontFamily: 'Arial, sans-serif' }}>
                شهادة إنجاز واجتياز برنامج علاجي
              </h1>

              <p className="text-sm sm:text-base font-bold text-slate-600 max-w-xl mx-auto leading-relaxed">
                تشهد منصة مَسَار للتأهيل والتعليم الذكي وتحت الإشراف الاستشاري لـ <strong className="text-indigo-950 font-black">{docName}</strong> بأن البطل المتميز:
              </p>
            </div>

            {/* ══ STUDENT NAME PLAQUE ══ */}
            <div className="relative z-10 py-4 my-2">
              <div className="inline-block max-w-2xl w-full rounded-2xl bg-gradient-to-r from-emerald-950 via-teal-900 to-indigo-950 p-1 shadow-xl border-2 border-amber-300">
                <div className="rounded-xl bg-gradient-to-r from-emerald-900 via-teal-800 to-indigo-900 py-4 px-8 border border-amber-400/40">
                  <h2 className="text-3xl sm:text-5xl font-black text-amber-300 tracking-wide drop-shadow-md" style={{ fontFamily: 'Georgia, serif' }}>
                    {data.studentName}
                  </h2>
                </div>
              </div>
            </div>

            {/* ══ DETAILS ══ */}
            <div className="relative z-10 max-w-2xl mx-auto space-y-4 py-2">
              <p className="text-base sm:text-lg font-bold text-slate-700 leading-relaxed">
                قد أتمّ بنجاح واقتدار فائقين كافة متطلبات الجلسات العلاجية والتمارين النمائية المخصصة في:
              </p>

              <div className="inline-block rounded-2xl bg-amber-100/90 border-2 border-amber-300 px-6 py-3 shadow-xs">
                <p className="text-lg sm:text-2xl font-black text-indigo-950" style={{ fontFamily: 'Arial, sans-serif' }}>
                  {data.programTitle}
                </p>
              </div>

              <div className="flex items-center justify-center gap-6 pt-2">
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-black text-emerald-800">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>مستوى الإتقان التراكمي: <strong className="text-sm text-emerald-950 font-black">{data.score}%</strong></span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-200 px-4 py-2 text-xs font-black text-blue-800">
                  <ShieldCheck size={16} className="text-blue-600" />
                  <span>الحالة: معتمد رسمياً ✓</span>
                </div>
              </div>
            </div>

            {/* ══ FOOTER SIGNATURES & SEALS ══ */}
            <div className="relative z-10 pt-8 mt-6 border-t-2 border-amber-200/80 grid grid-cols-3 items-end gap-4 text-xs">

              {/* Seal 1: Masar & Gold Seal */}
              <div className="flex flex-col items-center gap-1">
                <MetallicGoldSeal text="مسار" subtext="اعتماد 2026" />
              </div>

              {/* Center: Doctor Signature */}
              <div className="flex flex-col items-center gap-1 bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-slate-500">التوقيع والاعتماد الرسمي</span>
                <div className="h-12 w-44 border-b-2 border-amber-600 flex items-end justify-center pb-1">
                  <span className="font-serif italic text-base font-bold text-indigo-950 tracking-wider">
                    {docName}
                  </span>
                </div>
                <p className="font-black text-slate-900 text-sm mt-1">{docName}</p>
                <p className="text-[10px] font-bold text-slate-500 text-center">استشاري التربية الخاصة وتأهيل صعوبات التعلم</p>
              </div>

              {/* Seal 2: Nexus & Verification */}
              <div className="flex flex-col items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div
                    style={{
                      width: 76,
                      height: 76,
                      borderRadius: '50%',
                      background: 'radial-gradient(circle at 35% 30%, #93c5fd 0%, #1e3a5f 70%, #0f172a 100%)',
                      border: '3px solid #93c5fd',
                      boxShadow: '0 0 0 2px #1e3a5f, 0 6px 16px rgba(30, 58, 95, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 900, letterSpacing: 1 }}>نيكسس</span>
                    <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 8, fontWeight: 700 }}>NEXUS</span>
                  </div>
                  <span style={{ fontSize: 9, color: '#1e3a5f', fontWeight: 800 }}>ختم الاعتماد الأكاديمي</span>
                </div>
              </div>

            </div>

            {/* Bottom Security Note */}
            <div className="relative z-10 mt-6 border-t border-amber-200/50 pt-3 text-[10px] font-bold text-slate-400 flex items-center justify-between">
              <span>هذه الشهادة صادر رسمياً عبر منصة مسار ونيكسس للتعليم الذكي © 2026</span>
              <span className="font-mono text-slate-500">{certNo}</span>
            </div>

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
            width: 100% !important;
            height: 100% !important;
            padding: 18mm 20mm !important;
            background: #fffef7 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          @page { size: A4 landscape; margin: 0; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
