'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ScanFace, Shield, Loader2, AlertTriangle, KeyRound, RefreshCw, CheckCircle2, ChevronLeft } from 'lucide-react';
import FaceCamera from './FaceCamera';
import { AccountRecord, getAccounts, setSession } from '@/lib/cloudStore';
import { useRouter } from 'next/navigation';
import { trackEvent } from '@/lib/analyticsTracker';
import type { FaceRecord } from '@/lib/faceAuth';

interface Props {
  onCancel: () => void;
  onFallback: () => void;
  initialRole?: 'all' | 'student' | 'parent';
}

export interface MatchedCandidate {
  account: AccountRecord;
  targetId: string;
  role: 'student' | 'parent';
  name: string;
  roleLabel: string;
  branch: 'MASAR' | 'IKHLAS_JEDDAH';
  targetUrl: string;
  similarity: number;
}

type Phase = 'scanning' | 'verifying' | 'select_account' | 'success' | 'fail' | 'no_enrolled';

export default function FaceLoginModal({ onCancel, onFallback, initialRole = 'all' }: Props) {
  const router = useRouter();
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'parent'>(initialRole);
  const [phase, setPhase] = useState<Phase>('scanning');
  const [failCount, setFailCount] = useState(0);
  const [matchedName, setMatchedName] = useState('');
  const [activeAccount, setActiveAccount] = useState<AccountRecord | null>(null);
  const [targetRedirectUrl, setTargetRedirectUrl] = useState<string>('');
  const [multipleCandidates, setMultipleCandidates] = useState<MatchedCandidate[]>([]);
  
  const activeAccountRef = useRef<AccountRecord | null>(null);
  const targetRedirectUrlRef = useRef<string>('');
  const lastEmbeddingRef = useRef<number[]>([]);
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

  /** Helper to construct a normalized Candidate Account from any FaceRecord */
  const buildCandidate = async (
    record: FaceRecord,
    similarity: number,
    allAccounts: AccountRecord[],
    allStudents: any[],
    classStudents: any[]
  ): Promise<MatchedCandidate> => {
    const isParentRecord = record.userRole === 'parent';
    const isStudentRecord = record.userRole === 'student';

    const targetId = isParentRecord
      ? (record.accountId || record.userId)
      : (record.studentId || record.userId || record.accountId);

    const foundAcc = allAccounts.find(
      a => (targetId && a.id === targetId) ||
           (record.userEmail && a.email?.toLowerCase() === record.userEmail.toLowerCase())
    );

    const isStudent = isStudentRecord || (!isParentRecord && foundAcc?.role === 'student');

    const sid = record.studentId || foundAcc?.linkedStudentId || undefined;
    const matchedClassStudent = classStudents.find(cs => sid && (cs.id === sid || cs.studentAccountId === sid));
    const matchedGeneralStudent = allStudents.find(s => sid && (s.id === sid || s.studentAccountId === sid));

    let branch: 'MASAR' | 'IKHLAS_JEDDAH' = 'MASAR';
    if (
      record.schoolBranch === 'IKHLAS_JEDDAH' ||
      foundAcc?.schoolBranch === 'IKHLAS_JEDDAH' ||
      Boolean(matchedClassStudent)
    ) {
      branch = 'IKHLAS_JEDDAH';
    } else {
      branch = 'MASAR';
    }

    if (isStudent) {
      const studentId = sid || targetId || 'student';
      const studentName = record.userName || matchedClassStudent?.fullName || matchedGeneralStudent?.fullName || foundAcc?.name || (branch === 'IKHLAS_JEDDAH' ? 'طالب فصل د. إسماعيل' : 'طالب مسار');
      const account = {
        id: studentId,
        name: studentName,
        email: foundAcc?.email || record.userEmail || `${studentId}@masarplatform.org`,
        role: 'student',
        schoolBranch: branch,
        linkedStudentId: studentId,
      } as AccountRecord;
      const targetUrl = `/school-student?student=${encodeURIComponent(studentId)}`;
      const roleLabel = branch === 'IKHLAS_JEDDAH' ? 'طالب (فصل د. إسماعيل — جدة)' : 'طالب (مسار التأهيل)';
      return {
        account,
        targetId: studentId,
        role: 'student',
        name: studentName,
        roleLabel,
        branch,
        targetUrl,
        similarity,
      };
    } else {
      const pId = record.accountId || record.userId || foundAcc?.id || 'user';
      const pName = record.userName || foundAcc?.name || 'ولي أمر';
      const pEmail = foundAcc?.email || record.userEmail || `${pId}@masarplatform.org`;
      const pLinkedSid = sid || foundAcc?.linkedStudentId || undefined;
      const account = {
        id: pId,
        name: pName,
        email: pEmail,
        role: 'parent',
        schoolBranch: branch,
        linkedStudentId: pLinkedSid,
        phone: foundAcc?.phone,
      } as AccountRecord;
      const sParam = pLinkedSid ? `?student=${encodeURIComponent(pLinkedSid)}` : '';
      const targetUrl = branch === 'IKHLAS_JEDDAH' ? `/school-parent${sParam}` : `/parent${sParam}`;
      const roleLabel = branch === 'IKHLAS_JEDDAH' ? 'ولي أمر (فصل د. إسماعيل — جدة)' : 'ولي أمر (مسار التأهيل)';
      return {
        account,
        targetId: pId,
        role: 'parent',
        name: pName,
        roleLabel,
        branch,
        targetUrl,
        similarity,
      };
    }
  };

  /** Continuous background matching function - runs while live camera streams */
  const handleLiveVerify = async (embedding: number[]): Promise<{ ok: boolean; name?: string }> => {
    lastEmbeddingRef.current = embedding;

    // 1. Instant local biometric matching
    try {
      const { findAllFaceMatches } = await import('@/lib/faceAuth');
      const matches = findAllFaceMatches(embedding, 0.48, roleFilter);

      if (matches.length > 0) {
        const allAccounts = getAccounts();
        const allStudents = (await import('@/lib/cloudStore')).getStudents();
        const classStudents = (await import('@/lib/classDb')).getClassStudents();

        const candidatePromises = matches.map(m =>
          buildCandidate(m.record, m.similarity, allAccounts, allStudents, classStudents)
        );
        const resolvedCandidates = await Promise.all(candidatePromises);

        // Deduplicate candidates by unique target ID + role
        const uniqueMap = new Map<string, MatchedCandidate>();
        resolvedCandidates.forEach(c => {
          const key = `${c.role}_${c.account.id}`;
          if (!uniqueMap.has(key)) uniqueMap.set(key, c);
        });
        const candidates = Array.from(uniqueMap.values());

        // Check if roleFilter specifically narrows it down
        const filtered = roleFilter === 'all'
          ? candidates
          : candidates.filter(c => c.role === roleFilter);

        // Case A: Exactly 1 candidate account
        if (filtered.length === 1) {
          const chosen = filtered[0];
          activeAccountRef.current = chosen.account;
          targetRedirectUrlRef.current = chosen.targetUrl;
          setActiveAccount(chosen.account);
          setTargetRedirectUrl(chosen.targetUrl);
          setMatchedName(chosen.name);

          // Asynchronously issue session token on server
          fetch('/api/auth/face', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              embedding,
              verifiedUserId: chosen.targetId,
              targetRole: chosen.role,
            }),
          }).catch(() => {});

          return { ok: true, name: chosen.name };
        }

        // Case B: Multiple candidate accounts with different roles (e.g. Student AND Parent)
        if (filtered.length > 1) {
          setMultipleCandidates(filtered);
          setPhase('select_account');
          return { ok: false };
        }
      }
    } catch (e) {
      console.warn('Face local verification error:', e);
    }

    // 2. Cloud fallback check if local cache was empty or still downloading
    if (!cloudCheckingRef.current) {
      cloudCheckingRef.current = true;
      try {
        const res = await fetch('/api/auth/face', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            embedding,
            targetRole: roleFilter !== 'all' ? roleFilter : undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.ok && data.account) {
          const acc = data.account as AccountRecord;
          activeAccountRef.current = acc;
          setActiveAccount(acc);
          setMatchedName(acc.name);

          const role = acc.role;
          const branch = (acc as any).schoolBranch || 'MASAR';
          let target = '/dashboard';
          if (role === 'student') {
            const studentId = acc.linkedStudentId || acc.id;
            target = `/school-student?student=${encodeURIComponent(studentId)}`;
          } else if (role === 'parent') {
            const sid = acc.linkedStudentId;
            const sParam = sid ? `?student=${encodeURIComponent(sid)}` : '';
            target = branch === 'IKHLAS_JEDDAH' ? `/school-parent${sParam}` : `/parent${sParam}`;
          }
          targetRedirectUrlRef.current = target;
          setTargetRedirectUrl(target);

          cloudCheckingRef.current = false;
          return { ok: true, name: acc.name };
        }
      } catch {}
      cloudCheckingRef.current = false;
    }

    return { ok: false };
  };

  /** User chooses an account when face matches multiple profiles */
  const handleSelectCandidate = (cand: MatchedCandidate) => {
    activeAccountRef.current = cand.account;
    targetRedirectUrlRef.current = cand.targetUrl;
    setActiveAccount(cand.account);
    setTargetRedirectUrl(cand.targetUrl);
    setMatchedName(cand.name);

    // Issue server session token asynchronously
    fetch('/api/auth/face', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        embedding: lastEmbeddingRef.current || [],
        verifiedUserId: cand.targetId,
        targetRole: cand.role,
      }),
    }).catch(() => {});

    handleVerifiedSuccess(cand.account, cand.targetUrl);
  };

  /** Triggered once FaceCamera confirms success on the live video feed or user selects account */
  const handleVerifiedSuccess = (accountArg?: AccountRecord, targetUrlArg?: string) => {
    const account = accountArg || activeAccountRef.current || activeAccount;
    const explicitTarget = targetUrlArg || targetRedirectUrlRef.current || targetRedirectUrl;
    setPhase('success');

    if (account) {
      setSession(account, false, false);
      trackEvent('login', { userId: account.id, userName: account.name, userRole: account.role });

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
        let target = explicitTarget;
        if (!target) {
          const role = account.role;
          const branch = (account as any).schoolBranch || 'MASAR';
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
        }

        router.push(target);
        setTimeout(() => {
          if (typeof window !== 'undefined' && window.location.pathname !== target.split('?')[0]) {
            window.location.href = target;
          }
        }, 300);
      }, 100);
    } else {
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md" dir="rtl">
      <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden ring-4 ring-emerald-500/10">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shadow-xs">
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

        {/* Role Filter Tabs */}
        <div className="px-6 pt-3">
          <div className="flex bg-slate-100 p-1 rounded-2xl gap-1 border border-slate-200/80">
            <button
              type="button"
              onClick={() => { setRoleFilter('all'); if (phase === 'select_account') setPhase('scanning'); }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer ${
                roleFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>🌟</span>
              <span>تلقائي (الكل)</span>
            </button>
            <button
              type="button"
              onClick={() => { setRoleFilter('student'); if (phase === 'select_account') setPhase('scanning'); }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer ${
                roleFilter === 'student'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>🎓</span>
              <span>طالب مسار</span>
            </button>
            <button
              type="button"
              onClick={() => { setRoleFilter('parent'); if (phase === 'select_account') setPhase('scanning'); }}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer ${
                roleFilter === 'parent'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>👨‍👧</span>
              <span>ولي أمر</span>
            </button>
          </div>
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
                className="w-full py-3 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-black flex items-center justify-center gap-1.5 transition shadow-xs"
              >
                <KeyRound size={16} /> الدخول بكلمة المرور
              </button>
            </div>
          )}

          {phase === 'scanning' && (
            <FaceCamera
              mode="verify"
              onVerify={handleLiveVerify}
              onSuccess={() => handleVerifiedSuccess()}
              onFail={() => {
                setFailCount(c => c + 1);
                setPhase('fail');
              }}
              onCancel={onCancel}
            />
          )}

          {/* ── Multi-Account Selection View ── */}
          {phase === 'select_account' && (
            <div className="flex flex-col items-center gap-3 py-2 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center shadow-xs">
                <Shield className="w-7 h-7 text-emerald-600" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-base font-black text-slate-900">تم التحقق من بصمة وجهك بنجاح!</h3>
                <p className="text-xs font-bold text-slate-500 leading-relaxed max-w-xs">
                  تم العثور على حسابين مرتبطين بهذه البصمة، اختر الحساب الذي ترغب في الدخول إليه:
                </p>
              </div>

              <div className="w-full space-y-2.5 pt-2">
                {multipleCandidates.map((cand) => (
                  <button
                    key={`${cand.role}_${cand.account.id}`}
                    type="button"
                    onClick={() => handleSelectCandidate(cand)}
                    className="w-full text-right p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between group hover:border-emerald-500 hover:bg-emerald-50/60 bg-slate-50 border-slate-200 shadow-xs cursor-pointer active:scale-98"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl shadow-2xs group-hover:scale-105 transition">
                        {cand.role === 'student' ? '🎓' : '👨‍👧'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 group-hover:text-emerald-950">
                            {cand.name}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            cand.role === 'student'
                              ? 'bg-teal-100 text-teal-800 border border-teal-200'
                              : 'bg-slate-200 text-slate-800'
                          }`}>
                            {cand.role === 'student' ? 'طالب' : 'ولي أمر'}
                          </span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-500 mt-0.5">{cand.roleLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-black text-emerald-700 group-hover:translate-x-[-3px] transition">
                      <span>دخول</span>
                      <ChevronLeft size={16} />
                    </div>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setPhase('scanning')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 mt-2 hover:underline cursor-pointer flex items-center gap-1"
              >
                <RefreshCw size={13} />
                <span>إعادة المسح بالكاميرا</span>
              </button>
            </div>
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
                  className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                >
                  <RefreshCw size={15} /> إعادة المحاولة
                </button>
                <button
                  onClick={onFallback}
                  className="flex-1 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-black flex items-center justify-center gap-1.5 transition border border-slate-900 shadow-xs cursor-pointer"
                >
                  <KeyRound size={16} /> كلمة المرور
                </button>
              </div>
            </div>
          )}

        </div>

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center text-xs">
          <button onClick={onCancel} className="font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer">
            إلغاء الدخول
          </button>
          <button onClick={onFallback} className="font-bold text-emerald-700 hover:underline cursor-pointer">
            استخدام كلمة المرور
          </button>
        </div>

      </div>
    </div>
  );
}
