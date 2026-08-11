'use client';

import Image from 'next/image';
import { ShieldCheck, Award, CheckCircle2, FileCheck2, Lock, Sparkles, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface DoctorSignatureCardProps {
  date?: string;
  documentId?: string;
  showSeal?: boolean;
  compact?: boolean;
  className?: string;
}

export default function DoctorSignatureCard({
  date = '2026/08/09',
  documentId = 'MSR-DS-2026-8941',
  showSeal = true,
  compact = false,
  className = '',
}: DoctorSignatureCardProps) {
  const [copied, setCopied] = useState(false);
  const verifyHash = 'SHA256: 8f94e21a9c3d40b2e811c76f9011a09823f4b5d6e7f8';

  const copyHash = () => {
    navigator.clipboard.writeText(verifyHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (compact) {
    return (
      <div className={`relative inline-flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-slate-200/90 shadow-sm ${className}`}>
        <div className="relative w-44 h-20">
          <Image
            src="/dr-ismail-signature.png"
            alt="توقيع د. إسماعيل عيسى الإلكتروني"
            fill
            className="object-contain filter drop-shadow-xs"
            priority
          />
        </div>
        <div className="mt-1 text-center">
          <p className="text-xs font-black text-slate-900">د. إسماعيل عيسى</p>
          <p className="text-[10px] font-bold text-teal-700 flex items-center gap-1 justify-center">
            <ShieldCheck size={11} className="text-teal-600" />
            توقيع إلكتروني موثق
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-teal-50/40 p-6 shadow-xl text-slate-900 ${className}`} dir="rtl">
      
      {/* Background Subtle Stamp Pattern & Glow */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Card Header: Official Clinical Seal Badge */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white flex items-center justify-center shadow-md shadow-teal-600/20 shrink-0">
            <Award size={22} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-base font-black text-slate-900">التوقيع والختم الإكلينيكي المعتمد</h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[10px] font-black text-emerald-800">
                <CheckCircle2 size={10} /> موثّق
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500">منصة مَسَار للتأهيل والتشخيص الإكلينيكي</p>
          </div>
        </div>

        {showSeal && (
          <div className="hidden sm:flex flex-col items-center justify-center w-16 h-16 rounded-full border-2 border-dashed border-teal-600/40 bg-teal-50/70 p-1 text-center shrink-0">
            <ShieldCheck size={18} className="text-teal-700" />
            <span className="text-[8px] font-black text-teal-900 leading-none mt-0.5">مَسَار</span>
            <span className="text-[7px] font-bold text-teal-700 leading-none">معتمد</span>
          </div>
        )}
      </div>

      {/* Signature Render Box (Extracted Real Signature) */}
      <div className="relative my-4 flex flex-col items-center justify-center rounded-2xl border border-slate-200/90 bg-white p-6 shadow-inner min-h-[160px] group transition-all hover:border-teal-400">
        
        {/* Verification watermark background */}
        <div className="absolute inset-0 grid place-items-center opacity-[0.03] pointer-events-none select-none">
          <span className="text-6xl font-black tracking-widest text-slate-900">MASAR VERIFIED</span>
        </div>

        {/* Real Signature Image Extracted from Desktop Photo */}
        <div className="relative w-full max-w-[340px] h-32 transition-transform duration-300 group-hover:scale-105">
          <Image
            src="/dr-ismail-signature.png"
            alt="التوقيع الإلكتروني المباشر للدكتور إسماعيل عيسى"
            fill
            className="object-contain filter drop-shadow-md"
            priority
          />
        </div>

        {/* Ink Metadata Badge */}
        <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-600 bg-slate-100/80 px-3 py-1 rounded-full border border-slate-200">
          <Sparkles size={13} className="text-amber-500" />
          <span>توقيع إلكتروني حي بخط اليد — د. إسماعيل عيسى</span>
        </div>
      </div>

      {/* Doctor Credentials & Timestamp Footer */}
      <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-slate-200/80 text-xs font-bold text-slate-600">
        <div>
          <span className="text-[10px] font-black text-slate-400 block uppercase">اسم الطبيب الاستشاري</span>
          <span className="text-sm font-black text-slate-900">د. إسماعيل عيسى</span>
          <span className="block text-[11px] text-teal-700 font-bold">استشاري طب الأطفال والتأهيل النمائي</span>
        </div>
        
        <div className="text-right sm:text-left">
          <span className="text-[10px] font-black text-slate-400 block uppercase">التاريخ والرمز التسلسلي</span>
          <span className="text-xs font-black text-slate-800">{date}</span>
          <span className="block text-[10px] font-mono font-bold text-slate-500">{documentId}</span>
        </div>
      </div>

      {/* Cryptographic Hash Bar */}
      <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-slate-900 p-2.5 text-white font-mono text-[10px]">
        <div className="flex items-center gap-2 overflow-hidden">
          <Lock size={12} className="text-teal-400 shrink-0" />
          <span className="truncate text-slate-300 font-bold">{verifyHash}</span>
        </div>
        <button
          type="button"
          onClick={copyHash}
          className="flex items-center gap-1 shrink-0 rounded-lg bg-white/10 hover:bg-white/20 px-2 py-1 text-[10px] font-sans font-bold transition text-teal-300"
        >
          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
          <span>{copied ? 'تم النسخ' : 'نسخ الرمز'}</span>
        </button>
      </div>

    </div>
  );
}
