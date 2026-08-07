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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-md" dir="rtl">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-emerald-900/40 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-600/40 flex items-center justify-center">
              <ScanFace size={20} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">الدخول بالوجه</h2>
              <p className="text-xs text-slate-400">انظر للكاميرا وابدأ الدخول تلقائياً</p>
            </div>
          </div>
          {failCount > 0 && (
            <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/30">
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
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center animate-pulse">
                <Shield size={32} className="text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-sm mb-1">مرحباً بعودتك 👋</p>
                <h3 className="text-xl font-black text-white">{matchedName}</h3>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Loader2 size={14} className="text-emerald-400 animate-spin" />
                  <span className="text-sm text-emerald-400">جاري تسجيل الدخول...</span>
                </div>
              </div>
            </div>
          )}

          {phase === 'fail' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-14 h-14 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
                <AlertTriangle size={28} className="text-red-400" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-black text-white mb-1">لم يتم التعرف على الوجه</h3>
                <p className="text-sm text-slate-400">تأكد من الإضاءة الجيدة وحاول مرة أخرى</p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setPhase('scanning')}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black flex items-center justify-center gap-1.5 transition"
                >
                  <ScanFace size={16} /> حاول مجدداً
                </button>
                <button
                  onClick={onFallback}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <KeyRound size={16} /> كلمة المرور
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
