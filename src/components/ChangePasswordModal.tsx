'use client';

import { useState } from 'react';
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export default function ChangePasswordModal({ isOpen, onClose, userEmail }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.trim().length < 6) {
      setError('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password: newPassword.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setError(data.error || 'تعذر تحديث كلمة المرور على السيرفر.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        setSuccess(false);
        setNewPassword('');
        setConfirmPassword('');
        onClose();
      }, 1500);
    } catch {
      setError('تعذر الاتصال بالسيرفر. يرجى المحاولة مرة أخرى.');
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setError('');
    setSuccess(false);
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 text-right">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center font-black shadow-xs border border-teal-200/60">
              <KeyRound size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900">تغيير كلمة مرور الحساب</h2>
              {userEmail ? (
                <p className="text-xs font-bold text-slate-500 mt-0.5" dir="ltr">{userEmail}</p>
              ) : (
                <p className="text-xs font-bold text-slate-500 mt-0.5">أمان الحساب والخصوصية</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-bold text-rose-700 leading-relaxed">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-base font-black text-slate-900">تم تحديث كلمة المرور بنجاح! ✅</p>
            <p className="text-xs font-bold text-slate-500">تم حفظ كلمة المرور الجديدة في حسابك وتأمينها.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-slate-700">كلمة المرور الجديدة</span>
              <div className="relative flex rounded-xl border border-slate-200 bg-slate-50 focus-within:border-teal-600 focus-within:bg-white transition">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-transparent px-4 py-2.5 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-normal"
                  placeholder="6 أحرف على الأقل"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="grid w-10 place-items-center text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-black text-slate-700">تأكيد كلمة المرور الجديدة</span>
              <div className="relative flex rounded-xl border border-slate-200 bg-slate-50 focus-within:border-teal-600 focus-within:bg-white transition">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-transparent px-4 py-2.5 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400 placeholder:font-normal"
                  placeholder="أعد كتابة كلمة المرور"
                  required
                />
              </div>
            </label>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-xs font-black text-white hover:bg-teal-700 transition shadow-md shadow-teal-600/20 disabled:opacity-60 cursor-pointer"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                <span>{loading ? 'جارٍ الحفظ...' : 'حفظ كلمة المرور الجديدة'}</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-3 text-xs font-black text-slate-700 transition cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
