'use client';

import React, { useState, useEffect } from 'react';
import { ScanFace, Check, Camera, RefreshCw, Trash2, ShieldCheck, Sparkles, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { isFaceEnrolled, removeFaceEnrollment } from '@/lib/faceAuth';

const FaceEnrollModal = dynamic(() => import('@/components/FaceEnrollModal'), { ssr: false });

interface Props {
  userId: string;
  accountId?: string;
  studentId?: string;
  userName: string;
  userRole: 'student' | 'parent';
  schoolBranch?: 'MASAR' | 'IKHLAS_JEDDAH';
  userEmail?: string;
  className?: string;
}

export default function FaceIdAccountWidget({
  userId,
  accountId,
  studentId,
  userName,
  userRole,
  schoolBranch = 'MASAR',
  userEmail,
  className = '',
}: Props) {
  const [enrolled, setEnrolled] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const roleLabel = userRole === 'parent' ? 'ولي الأمر' : 'الطالب';

  useEffect(() => {
    let active = true;
    if (!userId) {
      setChecking(false);
      return;
    }

    const checkStatus = async () => {
      // 1. Check local storage
      const localCheck = isFaceEnrolled(userId) || (accountId ? isFaceEnrolled(accountId) : false);
      if (localCheck && active) {
        setEnrolled(true);
        setChecking(false);
        return;
      }

      // 2. Check cloud
      try {
        const res = await fetch(`/api/auth/face?userId=${encodeURIComponent(userId)}`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (active && data?.enrolled) {
            setEnrolled(true);
            if (typeof window !== 'undefined') {
              localStorage.setItem(`masar_face_enrolled_${userId}`, 'true');
            }
          }
        }
      } catch {}

      if (active) setChecking(false);
    };

    void checkStatus();
    return () => {
      active = false;
    };
  }, [userId, accountId]);

  const handleEnrollSuccess = () => {
    setShowModal(false);
    setEnrolled(true);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`masar_face_enrolled_${userId}`, 'true');
        if (accountId) localStorage.setItem(`masar_face_enrolled_${accountId}`, 'true');
        localStorage.setItem(`masar_face_prompt_seen_${userId}`, '1');
      } catch {}
    }
    setToastMsg(`🎉 تم تسجيل بصمة وجه ${roleLabel} بنجاح! يمكنك الآن الدخول بلمح البصر.`);
    setTimeout(() => setToastMsg(''), 5000);
  };

  const handleDelete = () => {
    removeFaceEnrollment(userId);
    if (accountId && accountId !== userId) removeFaceEnrollment(accountId);
    setEnrolled(false);
    setShowDeleteConfirm(false);
    setToastMsg('تم حذف بصمة الوجه بنجاح.');
    setTimeout(() => setToastMsg(''), 4000);
  };

  if (!userId) return null;

  return (
    <>
      <div
        className={`rounded-3xl p-4 sm:p-5 border transition-all duration-200 shadow-sm relative overflow-hidden ${
          enrolled
            ? 'bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 border-emerald-500/30 text-white'
            : 'bg-gradient-to-r from-teal-900 via-emerald-900 to-slate-900 border-teal-600/40 text-white'
        } ${className}`}
        dir="rtl"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                enrolled
                  ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                  : 'bg-white/10 border border-white/20 text-white animate-pulse'
              }`}
            >
              <ScanFace size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-white">
                  بصمة الوجه الذكية ({roleLabel}: {userName || 'الحساب'})
                </h3>
                {checking ? (
                  <Loader2 size={13} className="animate-spin text-slate-400" />
                ) : (
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                      enrolled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                        : 'bg-amber-400/20 text-amber-300 border-amber-400/30'
                    }`}
                  >
                    {enrolled ? 'مفعلة ✓' : 'دخول فوري ⚡'}
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-emerald-100/80 mt-0.5">
                {enrolled
                  ? `بصمة وجه ${roleLabel} مفعلة ومربوطة بهذا الحساب. يمكنك الدخول للمنصة مباشرة عبر الكاميرا دون كلمة مرور.`
                  : `سجّل ملامح وجهك الآن لتبدأ تسجيل الدخول الفوري لحسابك كـ ${roleLabel} بمجرد النظر للكاميرا.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {enrolled ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black transition flex items-center gap-1.5 border border-white/15 cursor-pointer active:scale-95"
                >
                  <RefreshCw size={13} />
                  <span>تحديث البصمة</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-400/20 transition cursor-pointer active:scale-95"
                  title="حذف بصمة الوجه"
                >
                  <Trash2 size={15} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-black shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Camera size={15} />
                <span>سجّل بصمة وجهك الآن 📸</span>
              </button>
            )}
          </div>
        </div>

        {/* Success / Info Toast */}
        {toastMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-xs font-black text-emerald-200 animate-fade-in">
            {toastMsg}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4" dir="rtl">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-rose-500/40 p-6 text-white space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <Trash2 size={24} />
            </div>
            <div>
              <h4 className="font-black text-base">هل أنت متأكد من حذف بصمة الوجه؟</h4>
              <p className="text-xs font-bold text-slate-400 mt-1">
                سيتم إلغاء تفعيل الدخول بالوجه لحساب {roleLabel} ({userName})، وسيتعين عليك استخدام كلمة المرور لتسجيل الدخول.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black transition cursor-pointer"
              >
                تأكيد الحذف
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Face Modal */}
      {showModal && (
        <FaceEnrollModal
          userId={userId}
          accountId={accountId || userId}
          studentId={studentId || (userRole === 'student' ? userId : undefined)}
          userName={userName}
          userRole={userRole}
          userEmail={userEmail}
          schoolBranch={schoolBranch}
          onSuccess={handleEnrollSuccess}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
}
