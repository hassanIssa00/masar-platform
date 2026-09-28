'use client';

import React, { useRef } from 'react';
import Image from 'next/image';
import { Trophy, Printer, Share2, X, Award, ShieldCheck, CheckCircle2, Star, Sparkles } from 'lucide-react';
import BrandMark from './BrandMark';

export interface StudentCertificateProps {
  isOpen: boolean;
  onClose: () => void;
  certificate: {
    id?: string;
    studentName: string;
    studentPhoto?: string;
    grade?: string;
    trackTitle?: string;
    score?: number;
    ratingText?: string;
    date?: string;
    certNumber?: string;
    notes?: string;
    supervisorName?: string;
    supervisorRole?: string;
  };
}

export default function StudentCertificateModal({ isOpen, onClose, certificate }: StudentCertificateProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const {
    studentName = 'اسم الطالب',
    studentPhoto,
    grade = 'الصف الدراسي',
    trackTitle = 'التفوق والتميز الأكاديمي العام',
    score = 98,
    ratingText = 'ممتاز مع مرتبة الشرف 🏆',
    date = new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' }),
    certNumber = `NEXUS-CERT-${Date.now().toString().slice(-6)}`,
    notes = 'تقديراً لاجتهاده المتميز وتفوقه المستمر وإتقانه المهارات المعتمدة بأعلى معايير التميز.',
    supervisorName = 'د. إسماعيل عيسى',
    supervisorRole = 'استشاري التعليم والتأهيل وصعوبات التعلم',
  } = certificate;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://nexus-platform.org';
  const verifyUrl = `${origin}/verify/${certNumber}?student=${encodeURIComponent(studentName)}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(verifyUrl)}`;

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join('\n');

    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <title>شهادة تفوق - ${studentName} - منصة نكسس</title>
  ${styles}
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body {
      width: 297mm;
      height: 210mm;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #ffffff;
      font-family: 'Cairo', Arial, sans-serif;
    }
    .cert-print-container {
      width: 297mm;
      height: 210mm;
      padding: 7mm;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
    }
    .cert-frame {
      width: 100% !important;
      height: 100% !important;
      border: 3.5mm double #0f766e !important;
      border-radius: 4mm !important;
      box-shadow: inset 0 0 0 1mm #b45309, inset 0 0 0 2.5mm #ffffff !important;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="cert-print-container">
    <div class="cert-frame">${content}</div>
  </div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  </script>
</body>
</html>`);
    win.document.close();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `شهادة تفوق الطالب: ${studentName}`,
          text: `يسرنا مشاركة شهادة تفوق الطالب (${studentName}) من منصة نِكْسَس التعليمية بإشراف ${supervisorName}.`,
          url: verifyUrl,
        });
      } catch {}
    } else {
      navigator.clipboard?.writeText(verifyUrl);
      alert('تم نسخ رابط توثيق الشهادة للحافظة!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-3xl bg-slate-900 border border-teal-500/30 shadow-2xl overflow-hidden flex flex-col my-auto" dir="rtl">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2 text-white">
            <Trophy className="h-5 w-5 text-amber-400" />
            <span className="text-sm font-black">شهادة التفوق والاعتماد الأكاديمي الرقمية</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-black text-xs px-4 py-2 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Printer size={15} />
              <span>طباعة PDF 🖨️</span>
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs px-3 py-2 transition cursor-pointer"
            >
              <Share2 size={14} />
              <span className="hidden sm:inline">مشاركة</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xl bg-white/10 hover:bg-rose-500/80 hover:text-white text-slate-300 p-2 transition cursor-pointer"
              title="إغلاق"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Certificate Display Canvas */}
        <div className="p-4 sm:p-8 bg-slate-950/50 flex items-center justify-center overflow-x-auto">
          <div
            ref={printRef}
            className="w-full max-w-4xl bg-white text-slate-900 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden border-4 border-teal-800"
            style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(20, 184, 166, 0.03) 0%, transparent 70%)',
            }}
          >
            {/* Guilloche Corner SVG Decorations */}
            <div className="absolute top-0 right-0 w-28 h-28 pointer-events-none opacity-20">
              <svg viewBox="0 0 100 100" fill="none" className="w-full h-full text-teal-800">
                <circle cx="100" cy="0" r="90" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
                <circle cx="100" cy="0" r="70" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="100" cy="0" r="50" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
              </svg>
            </div>
            <div className="absolute bottom-0 left-0 w-28 h-28 pointer-events-none opacity-20">
              <svg viewBox="0 0 100 100" fill="none" className="w-full h-full text-teal-800">
                <circle cx="0" cy="100" r="90" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" />
                <circle cx="0" cy="100" r="70" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="0" cy="100" r="50" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
              </svg>
            </div>

            {/* Header: BrandMark + Certification Seal info */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-5">
              <BrandMark size="md" showText={true} />
              <div className="flex items-center gap-3 bg-teal-50/70 border border-teal-200/80 px-4 py-2 rounded-2xl">
                <div className="w-8 h-8 rounded-xl bg-teal-800 text-white flex items-center justify-center shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-black text-teal-950">شهادة تفوق موثقة رسمياً</div>
                  <div className="text-[10px] font-mono font-bold text-slate-500">{certNumber}</div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="text-center py-6 sm:py-8 space-y-4">
              <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black">
                <Sparkles size={13} className="text-amber-500" />
                <span>شهادة تميز وتفوق أكاديمي</span>
              </span>

              <h1 className="text-2xl sm:text-4xl font-black text-teal-950 font-serif tracking-tight">
                شهـــــادة شـكـــــر وتـقـــــدير
              </h1>

              <p className="text-xs sm:text-sm font-bold text-slate-600 max-w-xl mx-auto">
                تمنح منصة <strong className="text-teal-800">نِكْسَس للتعليم والتأهيل الذكي</strong> بإشراف الاستشاري <strong className="text-slate-900">{supervisorName}</strong> هذه الشهادة للطالب البطل:
              </p>

              {/* Student Name with Golden Laurels & Photo */}
              <div className="flex items-center justify-center gap-4 py-2">
                {/* Student Photo */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-4 border-amber-400 ring-4 ring-teal-100 shadow-lg shrink-0 bg-slate-100">
                  {studentPhoto ? (
                    <Image
                      src={studentPhoto}
                      alt={studentName}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-700 to-emerald-800 text-white font-black text-2xl">
                      {studentName.slice(0, 1)}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <h2 className="text-2xl sm:text-4xl font-black text-teal-900 leading-tight">
                    {studentName}
                  </h2>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1">
                    {grade}
                  </p>
                </div>
              </div>

              {/* Achievement Track Banner */}
              <div className="max-w-2xl mx-auto rounded-2xl bg-teal-50/80 border border-teal-200/90 p-4 space-y-2">
                <p className="text-xs font-bold text-slate-600">نظير تميزه وتفوقه في المسار الأكاديمي:</p>
                <p className="text-base sm:text-lg font-black text-teal-950">{trackTitle}</p>
                
                <div className="flex items-center justify-center gap-3 pt-1 flex-wrap">
                  <span className="text-xs font-bold text-slate-600">وحصوله على تقدير:</span>
                  <span className="bg-amber-400 text-slate-950 text-xs font-black px-3 py-1 rounded-full shadow-xs">
                    {ratingText}
                  </span>
                  <span className="text-xs font-bold text-slate-600">بنسبة تفوق:</span>
                  <span className="bg-teal-800 text-white font-mono font-black text-xs px-3 py-1 rounded-lg">
                    %{score}
                  </span>
                </div>
              </div>

              {notes && (
                <p className="text-xs font-bold text-slate-500 max-w-lg mx-auto italic">
                  &ldquo;{notes}&rdquo;
                </p>
              )}
            </div>

            {/* Footer: Signatures + Digital Stamp + Scannable QR */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
              
              {/* Supervisor Signature */}
              <div className="text-right space-y-1">
                <p className="text-[11px] font-bold text-slate-500">يعتمد رسمياً:</p>
                <h3 className="text-lg font-black text-slate-900">{supervisorName}</h3>
                <p className="text-[11px] font-bold text-slate-500">{supervisorRole}</p>
                <div className="h-0.5 w-32 bg-slate-300 mt-2" />
              </div>

              {/* Official Stamp */}
              <div className="relative w-28 h-28 rounded-full border-2 border-dashed border-teal-800 flex flex-col items-center justify-center p-2 text-center rotate-[-6deg] bg-teal-50/30">
                <Award size={24} className="text-teal-800 mb-1" />
                <span className="text-[9px] font-black text-teal-950 leading-tight">الختم الرقمي المعتمد</span>
                <span className="text-[8px] font-bold text-teal-800">منصة نِكْسَس</span>
                <span className="text-[7px] font-mono text-slate-500 mt-0.5">{date}</span>
              </div>

              {/* Scannable Verification QR */}
              <a
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl hover:bg-teal-50 transition cursor-pointer"
                title="امسح الرمز للتحقق من صحة الشهادة"
              >
                <img
                  src={qrUrl}
                  alt="QR Verification"
                  className="w-16 h-16 rounded-xl border border-slate-200 bg-white"
                />
                <div className="text-right">
                  <div className="text-[10px] font-black text-slate-800">رمز التحقق الرقمي</div>
                  <div className="text-[9px] text-slate-500">امسح الكاميرا للتوثيق</div>
                  <div className="text-[8px] text-teal-700 font-bold mt-1">تحقق مباشر ↗</div>
                </div>
              </a>

            </div>

            {/* Bottom Credit Line */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold">
              <span>منصة نِكْسَس للتعليم والتأهيل الذكي © {new Date().getFullYear()}</span>
              <span>تاريخ الإصدار: {date}</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
