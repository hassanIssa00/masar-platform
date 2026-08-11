'use client';

import React, { useState } from 'react';
import { ScanFace, Shield, Loader2, AlertTriangle, KeyRound } from 'lucide-react';
import FaceCamera from './FaceCamera';
import { findBestMatch, isFaceEnrolled } from '@/lib/faceAuth';
import { getAccounts, setSession } from '@/lib/localDb';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/analyticsTracker';

interface Props {
  onCancel: () => void;
  onFallback: () => void;
}

type Phase = 'scanning' | 'success' | 'fail' | 'no_enrolled';

export default function FaceLoginModal({ onCancel, onFallback }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('scanning');
  const [failCount, setFailCount] = useState(0);
  const [matchedName, setMatchedName] = useState('');

  const handleDescriptor = (descriptor: Float32Array) => {
    const { userId, distance } = findBestMatch(descriptor);

    if (!userId) {
      const count = failCount + 1;
      setFailCount(count);
      if (count >= 3) {
        // Auto-fallback after 3 failures
        onFallback();
      } else {
        setPhase('fail');
      }
      return;
    }

    // Find the account and log in
    const accounts = getAccounts();
    const account = accounts.find(a => a.id === userId);
    if (!account) { setPhase('fail'); return; }

    setMatchedName(account.name);
    setPhase('success');
    setSession(account);
    trackEvent('login', { userId: account.id, userName: account.name });

    // Redirect based on role
    setTimeout(() => {
      if (account.role === 'doctor' || account.role === 'specialist' || account.role === 'teacher') {
        router.push('/dashboard');
      } else if (account.role === 'student') {
        router.push('/kids');
      } else {
        router.push('/parent');
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md" dir="rtl">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden ring-4 ring-emerald-500/10">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-sm">
              <ScanFace size={22} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">الدخول بالوجه الذكي</h2>
              <p className="text-xs font-bold text-slate-500">انظر للكاميرا وابدأ الدخول تلقائياً</p>
            </div>
          </div>
          {failCount > 0 && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
              {failCount}/3 محاولة
            </span>
          )}
        </div>

        <div className="p-6 space-y-4">

          {phase === 'scanning' && (
            <FaceCamera
              mode="verify"
              onSuccess={handleDescriptor}
              onCancel={onCancel}
              challenge="blink"
            />
          )}

          {phase === 'success' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center animate-pulse shadow-md">
                <Shield size={32} className="text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-slate-500 text-sm font-bold mb-1">مرحباً بعودتك 👋</p>
                <h3 className="text-xl font-black text-slate-900">{matchedName}</h3>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Loader2 size={14} className="text-emerald-600 animate-spin" />
                  <span className="text-sm font-bold text-emerald-600">جاري فتح الحساب...</span>
                </div>
              </div>
            </div>
          )}

          {phase === 'fail' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full bg-red-50 border-2 border-red-500 flex items-center justify-center">
                <AlertTriangle size={28} className="text-red-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-black text-slate-900 mb-1">لم يتم التعرف على الوجه</h3>
                <p className="text-sm font-bold text-slate-500">تأكد من تسجيل وجهك أولاً والإضاءة الجيدة</p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setPhase('scanning')}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 transition shadow-sm"
                >
                  <ScanFace size={16} /> حاول مجدداً
                </button>
                <button
                  onClick={onFallback}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center justify-center gap-1.5 transition border border-slate-200"
                >
                  <KeyRound size={16} /> كلمة المرور
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer cancel controls */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs">
          <button onClick={onCancel} className="font-bold text-slate-500 hover:text-slate-800 transition">
            إلغاء الدخول
          </button>
          <button onClick={onFallback} className="font-bold text-emerald-700 hover:underline">
            استخدام البصمة أو كلمة المرور
          </button>
        </div>

      </div>
    </div>
  );
}
