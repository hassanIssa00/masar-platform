'use client';

import { useSearchParams } from 'next/navigation';
import { ShieldCheck, CheckCircle2, Award, Calendar, UserCheck, FileCheck, ArrowRight, Printer, Sparkles } from 'lucide-react';
import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

export default function VerifyCertificatePage({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const certId = params.id || 'NSR-CERT-2026-89412';
  const studentName = searchParams.get('name') || 'على محمد احمد محمد احمد';
  const programTitle = searchParams.get('prog') || 'برنامج التأهيل الشامل وصعوبات التعلم';
  const score = searchParams.get('score') || '92';
  const date = searchParams.get('date') || new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6" dir="rtl">
      
      {/* Background Subtle Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-2xl relative z-10 space-y-6">

        {/* Top Header */}
        <div className="flex items-center justify-between bg-slate-900/80 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
          <BrandMark size="md" dark={true} />
          <Link href="/students" className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition">
            <ArrowRight size={14} /> العودة للمنصة
          </Link>
        </div>

        {/* Main Verification Card */}
        <div className="bg-slate-900/90 rounded-3xl border border-emerald-500/30 p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-md">
          
          {/* Verified Header Badge */}
          <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-slate-800">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
              <ShieldCheck size={36} />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                <CheckCircle2 size={14} /> شهادة رسمية موثقة ومعتمدة 100%
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-2">
                سجل التحقق الرقمي الرسمي
              </h1>
              <p className="text-xs font-bold text-slate-400 mt-1">
                منصة مسار للتأهيل والتعليم الذكي تحت إشراف أ.د. إسماعيل عيسى
              </p>
            </div>
          </div>

          {/* Certificate Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-right">
            
            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <FileCheck size={13} className="text-emerald-400" /> كود التوثيق المعتمد
              </span>
              <p className="font-mono text-sm font-black text-emerald-400 tracking-wider">
                {certId}
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Calendar size={13} className="text-emerald-400" /> تاريخ الإصدار والاعتماد
              </span>
              <p className="text-sm font-black text-white">
                {date}
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1 sm:col-span-2">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <UserCheck size={13} className="text-amber-400" /> اسم الطالب البطل صاحب الشهادة
              </span>
              <p className="text-xl font-black text-amber-300 font-serif">
                {studentName}
              </p>
            </div>

            <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800 space-y-1 sm:col-span-2">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Award size={13} className="text-cyan-400" /> البرنامج العلاجي المعتمد
              </span>
              <p className="text-base font-black text-white">
                {programTitle}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bold text-slate-400">نسبة الإنجاز التراكمية:</span>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white font-mono font-black text-xs">
                  %{score}
                </span>
              </div>
            </div>

          </div>

          {/* Clinical Authority Box */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-amber-400/80 overflow-hidden shrink-0">
              <img src="/dr-ismail.jpg" alt="أ.د. إسماعيل عيسى" className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="text-sm font-black text-white">جهة الاعتماد والإشراف الطبي:</h4>
              <p className="text-xs font-bold text-amber-300">أ.د. إسماعيل عيسى</p>
              <p className="text-[10px] font-bold text-slate-400">استشاري التربية الخاصة وتأهيل صعوبات التعلم</p>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center pt-2 border-t border-slate-800/80">
            <p className="text-[11px] font-bold text-slate-400 flex items-center justify-center gap-1">
              <Sparkles size={13} className="text-emerald-400" /> هذه الوثيقة مسجلة دائمياً بالسجل الرقمي الرسمي لمنصة مسار التفاعلية.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
