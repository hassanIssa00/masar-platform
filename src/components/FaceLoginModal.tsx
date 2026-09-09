'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ScanFace, Shield, Loader2, AlertTriangle, KeyRound, RefreshCw } from 'lucide-react';
import FaceCamera from './FaceCamera';
import { isFaceEnrolled } from '@/lib/faceAuth';
import { AccountRecord, getAccounts, setSession } from '@/lib/cloudStore';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/analyticsTracker';

interface Props {
  onCancel: () => void;
  onFallback: () => void;
}

type Phase = 'scanning' | 'verifying' | 'success' | 'fail' | 'no_enrolled';

export default function FaceLoginModal({ onCancel, onFallback }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('scanning');
  const [failCount, setFailCount] = useState(0);
  const [matchedName, setMatchedName] = useState('');
  const [activeAccount, setActiveAccount] = useState<AccountRecord | null>(null);
  const activeAccountRef = useRef<AccountRecord | null>(null);
  const cloudCheckingRef = useRef(false);

  // ── Pre-warm local biometric template cache & AI models immediately on modal open ──────────
  useEffect(() => {
    let isMounted = true;
    (async () => {
      // Warm up AI neural models in background
      import('@/lib/faceAuth').then(({ initFaceAuth }) => initFaceAuth().catch(() => {}));

      try {
        const res = await fetch('/api/auth/face?templates=1');
        if (!res.ok) return;
        const data = await res.json();
        if (isMounted && data?.ok && Array.isArray(data.templates) && data.templates.length > 0) {
          const { writeCloudCache } = await import('@/lib/firestoreSync');
          writeCloudCache('masar.face.v2', data.templates);
          const { getAllFaceRecords } = await import('@/lib/faceAuth');
          getAllFaceRecords();
        }
      } catch (err) {
        console.warn('Face pre-warm error:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  /** Continuous background matching function - runs while live camera streams */
  const handleLiveVerify = async (embedding: number[]): Promise<{ ok: boolean; name?: string }> => {
    let resolvedAccount: AccountRecord | null = null;
    let matchedUserId: string | null = null;

    // 1. Instant local biometric matching (0.005ms on client CPU)
    try {
      const { findBestFaceMatch } = await import('@/lib/faceAuth');
      const match = findBestFaceMatch(embedding);
      if (match?.record) {
        matchedUserId = match.record.userId || match.record.accountId || match.record.studentId || null;

        const allAccounts = getAccounts();
        const allStudents = (await import('@/lib/cloudStore')).getStudents();
        const classStudents = (await import('@/lib/classDb')).getClassStudents();

        const isParentRecord = match.record.userRole === 'parent';
        const isStudentRecord = match.record.userRole === 'student';

        // Target account ID
        const targetId = isParentRecord
          ? (match.record.accountId || match.record.userId)
          : (match.record.studentId || match.record.userId || match.record.accountId);

        const foundAcc = allAccounts.find(
          a => (targetId && a.id === targetId) ||
               (match.record?.userEmail && a.email?.toLowerCase() === match.record.userEmail.toLowerCase())
        );

        // Explicit Role Decision:
        const isStudent = isStudentRecord || (!isParentRecord && foundAcc?.role === 'student');

        const sid = match.record.studentId || foundAcc?.linkedStudentId || undefined;
        const matchedClassStudent = classStudents.find(cs => sid && (cs.id === sid || cs.studentAccountId === sid));
        const matchedGeneralStudent = allStudents.find(s => sid && (s.id === sid || s.studentAccountId === sid));

        // Accurate branch determination:
        let branch: 'MASAR' | 'IKHLAS_JEDDAH' = 'MASAR';
        if (
          match.record.schoolBranch === 'IKHLAS_JEDDAH' ||
          foundAcc?.schoolBranch === 'IKHLAS_JEDDAH' ||
          Boolean(matchedClassStudent)
        ) {
          branch = 'IKHLAS_JEDDAH';
        } else {
          branch = 'MASAR';
        }

        if (isStudent) {
          const studentId = sid || targetId || 'student';
          const studentName = match.record.userName || matchedClassStudent?.fullName || matchedGeneralStudent?.fullName || foundAcc?.name || (branch === 'IKHLAS_JEDDAH' ? 'طالب فصل د. إسماعيل' : 'طالب مسار');
          resolvedAccount = {
            id: studentId,
            name: studentName,
            email: foundAcc?.email || match.record.userEmail || `${studentId}@masarplatform.org`,
            role: 'student',
            schoolBranch: branch,
            linkedStudentId: studentId,
          } as AccountRecord;
        } else {
          // Parent account:
          const pId = match.record.accountId || match.record.userId || foundAcc?.id || 'user';
          const pName = match.record.userName || foundAcc?.name || 'ولي أمر';
          const pEmail = foundAcc?.email || match.record.userEmail || `${pId}@masarplatform.org`;
          const pLinkedSid = sid || foundAcc?.linkedStudentId || undefined;

          resolvedAccount = {
            id: pId,
            name: pName,
            email: pEmail,
            role: 'parent',
            schoolBranch: branch,
            linkedStudentId: pLinkedSid,
            phone: foundAcc?.phone,
          } as AccountRecord;
        }
      }
    } catch {}

    // 2. If locally matched, immediately register session in background and return ok!
    if (resolvedAccount) {
      activeAccountRef.current = resolvedAccount;
      setActiveAccount(resolvedAccount);
      setMatchedName(resolvedAccount.name);

      // Issue server session token asynchronously
      fetch('/api/auth/face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ embedding, verifiedUserId: matchedUserId }),
      }).catch(() => {});

      return { ok: true, name: resolvedAccount.name };
    }

    // 3. Cloud fallback check if local cache was empty or still downloading
    if (!cloudCheckingRef.current) {
      cloudCheckingRef.current = true;
      try {
        const res = await fetch('/api/auth/face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ embedding }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok && data.account) {
          resolvedAccount = data.account as AccountRecord;
          activeAccountRef.current = resolvedAccount;
          setActiveAccount(resolvedAccount);
          setMatchedName(resolvedAccount.name);
          cloudCheckingRef.current = false;
          return { ok: true, name: resolvedAccount.name };
        }
      } catch {}
      cloudCheckingRef.current = false;
    }

    return { ok: false };
  };

  /** Triggered once FaceCamera confirms success on the live video feed */
  const handleVerifiedSuccess = () => {
    const account = activeAccountRef.current || activeAccount;
    setPhase('success');

    if (account) {
      setSession(account, false, false);
      trackEvent('login', { userId: account.id, userName: account.name });

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('masar_last_login_provider', 'face');
          localStorage.setItem(`masar_face_enrolled_${account.id}`, 'true');
          localStorage.setItem(`masar_face_prompt_seen_${account.id}`, '1');
          const sid = account.linkedStudentId;
          if (sid) {
            localStorage.setItem(`masar_face_enrolled_${sid}`, 'true');
            localStorage.setItem(`masar_face_prompt_seen_${sid}`, '1');
          }
        } catch {}
      }

      setTimeout(() => {
        const role = account.role;
        const branch = (account as any).schoolBranch || 'MASAR';
        let target = '/dashboard';
        if (role === 'doctor' || role === 'specialist' || role === 'teacher') {
          target = '/dashboard';
        } else if (role === 'student') {
          const studentId = account.linkedStudentId || account.id;
          const sParam = studentId ? `?student=${encodeURIComponent(studentId)}` : '';
          target = `/school-student${sParam}`;
        } else {
          const studentId = account.linkedStudentId;
          const sParam = studentId ? `?student=${encodeURIComponent(studentId)}` : '';
          target = branch === 'IKHLAS_JEDDAH' ? `/school-parent${sParam}` : `/parent${sParam}`;
        }

        router.push(target);
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.location.pathname !== target.split('?')[0]) {
            window.location.href = target;
          }
        }, 300);
      }, 80);
    } else {
      setTimeout(() => {
        router.push('/dashboard');
      }, 80);
    }
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
              <p className="text-xs font-bold text-slate-500">انظر للكاميرا ليتم التحقق تلقائياً</p>
            </div>
          </div>
          {failCount > 0 && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
              {failCount}/3 محاولة
            </span>
          )}
        </div>

        <div className="p-6 space-y-4">

          {phase === 'no_enrolled' && (
            <div className="flex flex-col items-center gap-4 py-5">
              <div className="w-14 h-14 rounded-full bg-amber-50 border-2 border-amber-400 flex items-center justify-center">
                <AlertTriangle size={28} className="text-amber-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-black text-slate-900 mb-1">لم يتم تسجيل أي وجه بعد</h3>
                <p className="text-sm font-bold text-slate-500 leading-7">
                  سجّل الدخول بكلمة المرور أولاً، ثم فعّل Face ID من صفحة الحساب.
                </p>
              </div>
              <button
                onClick={onFallback}
                className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-black flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <KeyRound size={16} /> الدخول بكلمة المرور
              </button>
            </div>
          )}

          {phase === 'scanning' && (
            <FaceCamera
              mode="verify"
              onVerify={handleLiveVerify}
              onSuccess={handleVerifiedSuccess}
              onFail={() => {
                setFailCount(c => c + 1);
                setPhase('fail');
              }}
              onCancel={onCancel}
            />
          )}

          {phase === 'verifying' && (
            <div className="flex flex-col items-center justify-center gap-4 py-10">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-emerald-500/20 border-t-emerald-600 animate-spin flex items-center justify-center" />
                <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                  <ScanFace size={32} className="animate-pulse" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900">جاري التحقق والمطابقة...</h3>
                <p className="text-xs font-bold text-slate-500 max-w-xs leading-relaxed">
                  يتم تحليل ومطابقة البصمة البيومترية مع السجلات السحابية 🔒
                </p>
              </div>
            </div>
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
                <h3 className="text-lg font-black text-slate-900 mb-1">لم نتمكن من التعرف على الوجه</h3>
                <p className="text-sm font-bold text-slate-500 max-w-xs leading-relaxed">
                  لم نجد أي حساب مسجل يطابق ملامح هذا الوجه. إذا لم تكن قد سجّلت بصمة وجهك بعد، يرجى الدخول بكلمة المرور أولاً وربط بصمة وجهك من صفحة الحساب.
                </p>
              </div>
              <div className="flex gap-3 w-full pt-2">
                <button
                  onClick={() => setPhase('scanning')}
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 transition shadow-sm"
                >
                  <RefreshCw size={15} /> إعادة المحاولة
                </button>
                <button
                  onClick={onFallback}
                  className="flex-1 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-black flex items-center justify-center gap-1.5 transition border border-slate-900 shadow-sm"
                >
                  <KeyRound size={16} /> كلمة المرور
                </button>
              </div>
            </div>
          )}

        </div>

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs">
          <button onClick={onCancel} className="font-bold text-slate-500 hover:text-slate-800 transition">
            إلغاء الدخول
          </button>
          <button onClick={onFallback} className="font-bold text-emerald-700 hover:underline">
            استخدام كلمة المرور
          </button>
        </div>

      </div>
    </div>
  );
}
