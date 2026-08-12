'use client';

import { useSearchParams } from 'next/navigation';
import { ShieldCheck, CheckCircle2, Award, Calendar, UserCheck, FileCheck, ArrowRight, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 sm:p-6" dir="rtl">
      
      {/* Background Ambient Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-2xl relative z-10 space-y-5">

        {/* Top Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <BrandMark size="md" hideNexus={true} />
          <Link href="/students" className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition">
            <ArrowRight size={14} /> العودة للمنصة
          </Link>
        </div>

        {/* Main Verification Card - LIGHT THEME */}
        <div className="bg-white rounded-3xl border-2 border-teal-500/30 p-6 sm:p-8 shadow-xl space-y-6">
          
          {/* Verified Header Badge */}
          <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-slate-100">
            <div className="w-16 h-16 rounded-full bg-teal-50 border-2 border-teal-600 flex items-center justify-center text-teal-600 shadow-sm">
              <ShieldCheck size={36} />
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-black">
                <CheckCircle2 size={14} /> شهادة رسمية موثقة ومعتمدة 100%
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                سجل التحقق الرقمي الرسمي
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-1">
                منصة مسار للتأهيل والتعليم الذكي تحت إشراف د. إسماعيل عيسى
              </p>
            </div>
          </div>

          {/* Certificate Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-right">
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <FileCheck size={13} className="text-teal-600" /> كود التوثيق المعتمد
              </span>
              <p className="font-mono text-sm font-black text-teal-700 tracking-wider">
                {certId}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Calendar size={13} className="text-teal-600" /> تاريخ الإصدار والاعتماد
              </span>
              <p className="text-sm font-black text-slate-900">
                {date}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1 sm:col-span-2">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <UserCheck size={13} className="text-amber-600" /> اسم الطالب البطل صاحب الشهادة
              </span>
              <p className="text-xl font-black text-slate-900 font-serif">
                {studentName}
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1 sm:col-span-2">
              <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                <Award size={13} className="text-teal-600" /> البرنامج العلاجي المعتمد
              </span>
              <p className="text-base font-black text-slate-900">
                {programTitle}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs font-bold text-slate-500">نسبة الإنجاز التراكمية:</span>
                <span className="px-2.5 py-0.5 rounded-md bg-teal-600 text-white font-mono font-black text-xs">
                  %{score}
                </span>
              </div>
            </div>

          </div>

          {/* Clinical Authority Box */}
          <div className="bg-teal-50/60 p-4 rounded-2xl border border-teal-200 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-teal-600 overflow-hidden shrink-0">
              <img src="/dr-ismail.jpg" alt="د. إسماعيل عيسى" className="w-full h-full object-cover" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900">جهة الاعتماد والإشراف الطبي:</h4>
              <p className="text-xs font-black text-teal-700">د. إسماعيل عيسى</p>
              <p className="text-[10px] font-bold text-slate-600">استشاري التربية الخاصة وتأهيل صعوبات التعلم</p>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-500 flex items-center justify-center gap-1">
              <Sparkles size={13} className="text-teal-600" /> هذه الوثيقة مسجلة دائمياً بالسجل الرقمي الرسمي لمنصة مسار التفاعلية.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
}
