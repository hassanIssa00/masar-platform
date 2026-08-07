'use client';

import React, { useState } from 'react';
import { Shield, ScanFace, CheckCircle2, ChevronRight, Lock, Eye, AlertTriangle } from 'lucide-react';
import FaceCamera from './FaceCamera';
import { enrollFace, unenrollFace } from '@/lib/faceAuth';

interface Props {
  userId: string;
  userName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

type Step = 'intro' | 'consent' | 'camera' | 'done';

export default function FaceEnrollModal({ userId, userName, onSuccess, onCancel }: Props) {
  const [step, setStep] = useState<Step>('intro');
  const [agreed, setAgreed] = useState(false);

  const handleDescriptor = (descriptor: Float32Array) => {
    enrollFace(userId, descriptor);
    setStep('done');
    setTimeout(onSuccess, 1800);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-emerald-900/40 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-600/40 flex items-center justify-center">
            <ScanFace size={20} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">تفعيل الدخول بالوجه</h2>
            <p className="text-xs text-slate-400">تسجيل البيانات البيومترية — مرة واحدة فقط</p>
          </div>
        </div>

        <div className="p-6">

          {/* ── Step 1: Intro ── */}
          {step === 'intro' && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: '🔒', title: 'خصوصية كاملة', desc: 'لا تُحفظ أي صورة' },
                  { icon: '⚡', title: 'دخول فوري', desc: 'بدون كلمة مرور' },
                  { icon: '🛡️', title: 'مشفر محلياً', desc: 'على جهازك فقط' },
                ].map(f => (
                  <div key={f.title} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700 text-center">
                    <span className="text-2xl">{f.icon}</span>
                    <p className="text-xs font-black text-white">{f.title}</p>
                    <p className="text-[10px] text-slate-400">{f.desc}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 text-sm text-slate-300 bg-slate-800/40 rounded-xl p-4 border border-slate-700">
                <p className="font-black text-white mb-2">كيف يعمل النظام؟</p>
                <div className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>الكاميرا تلتقط وجهك وتحوله لـ 128 رقم رياضي فقط</span></div>
                <div className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>الأرقام دي بتتشفّر وتُحفظ على جهازك — مش على أي سيرفر</span></div>
                <div className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>الصورة الأصلية لا تُحفظ أبداً — مستحيل استرجاعها</span></div>
                <div className="flex items-start gap-2"><span className="text-emerald-400 mt-0.5">✓</span><span>كلمة المرور تفضل شغالة كـ Fallback في أي وقت</span></div>
              </div>

              <div className="flex gap-3">
                <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition">
                  إلغاء
                </button>
                <button onClick={() => setStep('consent')} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black flex items-center justify-center gap-1.5 transition">
                  متابعة <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Consent ── */}
          {step === 'consent' && (
            <div className="space-y-5">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  <span className="text-sm font-black text-amber-300">موافقة مطلوبة</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  بتفعيل الدخول بالوجه، أنت توافق على معالجة بياناتك البيومترية محلياً على جهازك
                  لأغراض التحقق من الهوية فقط. يمكنك إلغاء التفعيل في أي وقت من إعداداتك.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-700 bg-slate-800/40 hover:bg-slate-800 transition">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-emerald-500 cursor-pointer"
                />
                <span className="text-sm text-slate-300">
                  أوافق على معالجة بياناتي البيومترية وأفهم أنه يمكنني إلغاء التفعيل في أي وقت
                </span>
              </label>

              <div className="flex gap-3">
                <button onClick={() => setStep('intro')} className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-sm font-bold hover:bg-slate-700 transition">
                  رجوع
                </button>
                <button
                  onClick={() => agreed && setStep('camera')}
                  disabled={!agreed}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-1.5 transition ${agreed ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                >
                  ابدأ التسجيل <ScanFace size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Camera ── */}
          {step === 'camera' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-300 text-center">
                مرحباً <span className="font-black text-white">{userName}</span> — ضع وجهك أمام الكاميرا
              </p>
              <FaceCamera
                mode="enroll"
                onSuccess={handleDescriptor}
                onCancel={() => setStep('intro')}
                challenge="blink"
              />
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === 'done' && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center">
                <CheckCircle2 size={36} className="text-emerald-400" />
              </div>
              <div className="text-center">
                <h3 className="text-xl font-black text-white mb-1">تم التسجيل بنجاح! 🎉</h3>
                <p className="text-sm text-slate-400">يمكنك الآن الدخول بوجهك من شاشة تسجيل الدخول</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
