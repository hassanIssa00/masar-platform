'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Download, ShieldCheck, ArrowRight,
  CheckCircle2, FileCheck2, Printer, Stamp,
} from 'lucide-react';
import BrandMark from '@/components/BrandMark';

// ── Hijri date ────────────────────────────────────────────────────────────────
function getHijriParts() {
  const now = new Date();
  try {
    const day   = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day:   'numeric' }).format(now);
    const month = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { month: 'numeric' }).format(now);
    const year  = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { year:  'numeric' }).format(now);
    const fullLong = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(now);
    return { day, month, year, fullLong };
  } catch {
    return { day: '1', month: '1', year: '1448', fullLong: '1 محرم 1448' };
  }
}

// ── Convert JPG/PNG signature image to transparent PNG with dark ink strokes ─
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
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const brightness = (r + g + b) / 3;

          if (brightness > 175) {
            // White/light paper background → completely transparent
            data[i + 3] = 0;
          } else {
            // Dark ink stroke → pure sharp dark ink (#0f172a)
            data[i]     = 15;  // R
            data[i + 1] = 23;  // G
            data[i + 2] = 42;  // B
            data[i + 3] = Math.min(255, Math.round((255 - brightness) * 2.2));
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve('');
      }
    };
    img.onerror = () => resolve('');
    img.src = src;
  });
}

// ── Ring decorative dots ──────────────────────────────────────────────────────
function ringDots(cx: number, cy: number, r: number, count: number, ink: string) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    return (
      <circle
        key={i}
        cx={cx + Math.cos(a) * r}
        cy={cy + Math.sin(a) * r}
        r={i % 6 === 0 ? 3.2 : 1.6}
        fill={ink}
      />
    );
  });
}

function getEnglishDates() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());
  const monthName = now.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  return { day, month, year, monthName, fullG: `${day} / ${month} / ${year} AD` };
}

export default function SignaturePage() {
  const [hijri, setHijri]       = useState({ day: '', month: '', year: '', fullLong: '' });
  const [greg, setGreg]         = useState({ day: '', month: '', year: '', monthName: '', fullG: '' });
  const [sigB64, setSigB64]     = useState('');
  const [activeTab, setActiveTab] = useState<'ar' | 'en'>('ar');
  const svgArRef = useRef<SVGSVGElement>(null);
  const svgEnRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    setHijri(getHijriParts());
    setGreg(getEnglishDates());
  }, []);

  useEffect(() => {
    loadTransparentSignature('/dr-ismail-signature.jpg').then((b64) => {
      if (b64) {
        setSigB64(b64);
      } else {
        loadTransparentSignature('/dr-ismail-signature.png').then(setSigB64);
      }
    });
  }, []);

  // ── Download stamp as transparent PNG ──
  const downloadStamp = (lang: 'ar' | 'en' = activeTab) => {
    const svg = lang === 'ar' ? svgArRef.current : svgEnRef.current;
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 440;
    const ctx = canvas.getContext('2d')!;
    const img = new window.Image();
    img.onload = () => {
      ctx.clearRect(0, 0, 440, 440);
      ctx.drawImage(img, 0, 0, 440, 440);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      const dateTag = lang === 'ar' ? `${hijri.day}-${hijri.month}-${hijri.year}AH` : `${greg.day}-${greg.month}-${greg.year}AD`;
      a.download = `Stamp-Dr-Ismail-${lang.toUpperCase()}-${dateTag}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `Stamp-Dr-Ismail-${lang}.svg`;
      a.href = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);
      a.click();
    };
    img.src = url;
  };

  // ── Stamp geometry ──────────────────────────────────────────────────────────
  const SZ  = 440;
  const CX  = SZ / 2;
  const CY  = SZ / 2;
  const INK = '#0f172a';
  const RO  = 208;   // outer circle radius
  const RI  = 190;   // inner circle radius
  const dateStrAr = hijri.day
    ? `${hijri.day}  /  ${hijri.month}  /  ${hijri.year}  هـ`
    : '';
  const dateStrEn = greg.day
    ? `${greg.day}  /  ${greg.month}  /  ${greg.year}  AD`
    : '';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans" dir="rtl">

      {/* ── Navbar (light) ── */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/"><BrandMark size="sm" /></Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
              <Stamp size={13} /> بوابة الختم الإلكتروني الرسمي (عربي / English)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => downloadStamp(activeTab)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-700 text-white font-black text-xs transition active:scale-95 shadow cursor-pointer"
            >
              <Download size={14} /> تحميل الختم ({activeTab === 'ar' ? 'عربي' : 'English'})
            </button>
            <Link href="/dashboard" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition">
              لوحة التحكم <ArrowRight size={13} className="rotate-180" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 sm:py-14">

        {/* Page header */}
        <div className="text-center mb-8 space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-300 bg-teal-50 px-4 py-1.5 text-xs font-black text-teal-700">
            <ShieldCheck size={14} /> منظومة الاعتماد الرقمي الرسمي
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900">الختم الإلكتروني الرسمي المعتمد</h1>
          <p className="text-sm font-bold text-gray-500">
            يتوفر باللغتين العربية والإنجليزية مع تحديث تلقائي يومي للتاريخ
          </p>
        </div>

        {/* ── Language Switcher Tabs ── */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-200 p-1.5 rounded-2xl flex gap-2 border border-gray-300 shadow-inner">
            <button
              onClick={() => setActiveTab('ar')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition cursor-pointer ${
                activeTab === 'ar'
                  ? 'bg-white text-slate-950 shadow-md border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🇸🇦 الختم العربي (Official Arabic)
            </button>
            <button
              onClick={() => setActiveTab('en')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm transition cursor-pointer ${
                activeTab === 'en'
                  ? 'bg-white text-slate-950 shadow-md border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🇬🇧 الختم الإنجليزي (Official English)
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-10 items-start justify-center">

          {/* ── STAMP DISPLAY ── */}
          <div className="flex flex-col items-center gap-5">

            {/* White card holding the stamp */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl p-8 flex items-center justify-center relative">

              {/* ═══ ARABIC STAMP SVG ═══ */}
              <svg
                ref={svgArRef}
                id="stamp-svg-ar"
                xmlns="http://www.w3.org/2000/svg"
                width={SZ}
                height={SZ}
                viewBox={`0 0 ${SZ} ${SZ}`}
                className={activeTab === 'ar' ? 'block' : 'hidden'}
              >
                <circle cx={CX} cy={CY} r={RO} fill="none" stroke={INK} strokeWidth="6" />
                {ringDots(CX, CY, (RO + RI) / 2, 72, INK)}
                <circle cx={CX} cy={CY} r={RI} fill="white" stroke={INK} strokeWidth="3" />

                <text x={CX} y={CY - 124} textAnchor="middle" fontFamily="Cairo, Amiri, Arial" fontSize="14" fontWeight="bold" fill={INK} direction="rtl">
                  الختم الرسمي المعتمد
                </text>
                <text x={CX} y={CY - 94} textAnchor="middle" fontFamily="Cairo, Amiri, Arial" fontSize="22" fontWeight="900" fill={INK} direction="rtl">
                  د. إسماعيل عيسى
                </text>

                <text x={CX - 105} y={CY - 76} textAnchor="middle" fontSize="14" fill={INK}>✦</text>
                <text x={CX + 105} y={CY - 76} textAnchor="middle" fontSize="14" fill={INK}>✦</text>
                <line x1={CX - 150} y1={CY - 70} x2={CX + 150} y2={CY - 70} stroke={INK} strokeWidth="1.5" />

                {sigB64 && (
                  <image href={sigB64} x={CX - 170} y={CY - 68} width="340" height="138" preserveAspectRatio="xMidYMid meet" />
                )}

                <line x1={CX - 150} y1={CY + 70} x2={CX + 150} y2={CY + 70} stroke={INK} strokeWidth="1.5" />

                <text x={CX} y={CY + 104} textAnchor="middle" fontFamily="Cairo, Amiri, Arial" fontSize="24" fontWeight="900" fill={INK} direction="rtl" letterSpacing="1">
                  {dateStrAr}
                </text>
                <text x={CX} y={CY + 130} textAnchor="middle" fontFamily="Cairo, Amiri, Arial" fontSize="12" fill={INK} direction="rtl">
                  منصة مسار · التعليم العلاجي · جدة
                </text>
              </svg>

              {/* ═══ ENGLISH STAMP SVG ═══ */}
              <svg
                ref={svgEnRef}
                id="stamp-svg-en"
                xmlns="http://www.w3.org/2000/svg"
                width={SZ}
                height={SZ}
                viewBox={`0 0 ${SZ} ${SZ}`}
                className={activeTab === 'en' ? 'block' : 'hidden'}
              >
                <circle cx={CX} cy={CY} r={RO} fill="none" stroke={INK} strokeWidth="6" />
                {ringDots(CX, CY, (RO + RI) / 2, 72, INK)}
                <circle cx={CX} cy={CY} r={RI} fill="white" stroke={INK} strokeWidth="3" />

                <text x={CX} y={CY - 124} textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontSize="13" fontWeight="bold" letterSpacing="1.5" fill={INK}>
                  OFFICIAL APPROVED STAMP
                </text>
                <text x={CX} y={CY - 94} textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontSize="21" fontWeight="900" letterSpacing="0.5" fill={INK}>
                  DR. ISMAIL ISSA
                </text>

                <text x={CX - 105} y={CY - 76} textAnchor="middle" fontSize="14" fill={INK}>✦</text>
                <text x={CX + 105} y={CY - 76} textAnchor="middle" fontSize="14" fill={INK}>✦</text>
                <line x1={CX - 150} y1={CY - 70} x2={CX + 150} y2={CY - 70} stroke={INK} strokeWidth="1.5" />

                {sigB64 && (
                  <image href={sigB64} x={CX - 170} y={CY - 68} width="340" height="138" preserveAspectRatio="xMidYMid meet" />
                )}

                <line x1={CX - 150} y1={CY + 70} x2={CX + 150} y2={CY + 70} stroke={INK} strokeWidth="1.5" />

                <text x={CX} y={CY + 104} textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontSize="22" fontWeight="900" letterSpacing="2" fill={INK}>
                  {dateStrEn}
                </text>
                <text x={CX} y={CY + 130} textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontSize="11" fontWeight="bold" letterSpacing="0.8" fill={INK}>
                  MASAR PLATFORM · REMEDIAL EDUCATION · JEDDAH
                </text>
              </svg>

            </div>

            {/* Download button for active tab */}
            <button
              onClick={() => downloadStamp(activeTab)}
              className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm transition shadow-lg active:scale-95 w-full max-w-xs justify-center cursor-pointer"
            >
              <Download size={18} /> تحميل الختم ({activeTab === 'ar' ? 'العربي' : 'الإنجليزي'}) PNG شفاف
            </button>

            <p className="text-xs font-bold text-gray-400 text-center max-w-xs">
              الختم بخلفية شفافة 100% — ضعه فوق أي مستند أو PDF مباشرةً
            </p>
          </div>

          {/* ── INFO PANEL ── */}
          <div className="flex-1 space-y-5 max-w-sm">

            {/* Details card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-black text-gray-900 text-base flex items-center gap-2">
                <CheckCircle2 size={18} className="text-teal-600" /> تفاصيل الختم ({activeTab === 'ar' ? 'العربي' : 'English'})
              </h3>
              <div className="space-y-3 text-sm divide-y divide-gray-100">
                <div className="flex justify-between pb-2">
                  <span className="text-gray-500 font-bold">صاحب الختم</span>
                  <span className="font-black text-gray-900">{activeTab === 'ar' ? 'د. إسماعيل عيسى' : 'DR. ISMAIL ISSA'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500 font-bold">العنوان الأعلى</span>
                  <span className="font-black text-teal-700">{activeTab === 'ar' ? 'الختم الرسمي المعتمد' : 'OFFICIAL APPROVED STAMP'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500 font-bold">تاريخ اليوم الحقيقي</span>
                  <span className="font-black text-slate-800">{activeTab === 'ar' ? `${hijri.fullLong} هـ` : greg.fullG}</span>
                </div>
                <div className="flex justify-between pt-2">
                  <span className="text-gray-500 font-bold">الجهة والتمركز</span>
                  <span className="font-black text-slate-800">{activeTab === 'ar' ? 'منصة مسار · جدة' : 'MASAR PLATFORM · JEDDAH'}</span>
                </div>
              </div>
            </div>

            {/* Auto-update notice */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-emerald-800 text-sm">التحديث التلقائي اليومي</p>
                <p className="text-xs font-bold text-emerald-700 mt-1 leading-relaxed">
                  تاريخ اليوم يتغير تلقائياً كل يوم داخل كلا الختمين (العربي والهجري / الإنجليزي والمايلادي) عند فتح الصفحة.
                </p>
              </div>
            </div>

            {/* Usage guide */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 space-y-3">
              <h4 className="font-black text-blue-800 text-sm flex items-center gap-2">
                <FileCheck2 size={15} /> كيفية استخدام الختم
              </h4>
              <ul className="space-y-2 text-xs font-bold text-blue-700">
                {['حمّل الختم كصورة PNG شفاف', 'الصق الختم على أي تقرير أو مستند PDF', 'التاريخ يتحدث تلقائياً — حمّل من جديد كل يوم', 'التقارير تُطبع مع الختم تلقائياً من صفحة التقارير'].map((t, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-blue-400 shrink-0">•</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Quick links */}
            <Link
              href="/reports"
              className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm py-3.5 transition shadow-md active:scale-95"
            >
              <Printer size={16} /> طباعة التقارير مع الختم
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}

