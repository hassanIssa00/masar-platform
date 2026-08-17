'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LogIn,
  ShieldCheck,
  UserRound,
  ScanFace,
  Mail,
  X,
  Loader2,
} from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { authenticate, signInWithGoogle, handleGoogleRedirectResult, signInWithApple, signInWithMicrosoft, sendPasswordReset } from '@/lib/auth';
import { getReports, getStudents, setSession } from '@/lib/localDb';
import { trackEvent } from '@/lib/analyticsTracker';
import dynamic from 'next/dynamic';
const FaceLoginModal = dynamic(() => import('@/components/FaceLoginModal'), { ssr: false });

// Google icon SVG (official brand colors)
function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// Apple icon SVG
function AppleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.96.99-3.11-.97.04-2.14.65-2.83 1.46-.62.72-1.16 1.88-1.01 3.01 1.08.08 2.18-.54 2.85-1.36z" />
    </svg>
  );
}

// Microsoft icon SVG
function MicrosoftIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotTempPassword, setForgotTempPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [faceLoginOpen, setFaceLoginOpen] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);

  useEffect(() => {
    trackEvent('visit', { page: '/login' });

    // Check if coming back from Google redirect
    handleGoogleRedirectResult('parent').then((result) => {
      if (result && result.ok) {
        setSession(result.account, false);
        redirectAfterLogin(result.account);
      } else if (result?.reason) {
        setLoginError(result.reason);
      }
    });

    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('masar_remember_email');
      if (savedEmail) {
        queueMicrotask(() => setEmail(savedEmail));
      }
      localStorage.removeItem('masar_remember_pass');
    }
  }, []);

  // ─── Redirect helper based on account role/branch ───────────────────────────
  function redirectAfterLogin(account: { role: string; schoolBranch?: string; id: string; name: string; email: string; providerId?: string }) {
    const branch =
      account.schoolBranch ??
      (typeof window !== 'undefined' ? (localStorage.getItem('masar_school_branch') ?? 'MASAR') : 'MASAR');

    if (typeof window !== 'undefined' && account.schoolBranch) {
      localStorage.setItem('masar_school_branch', account.schoolBranch);
    }

    trackEvent('login', { userId: account.id, userName: account.name, userRole: account.role });

    let targetUrl = '/dashboard';
    if (account.role === 'doctor' || account.role === 'specialist' || account.role === 'teacher') {
      if (typeof window !== 'undefined') localStorage.setItem('masar_active_mode', 'parent');
      targetUrl = '/dashboard';
    } else if (account.role === 'student') {
      if (typeof window !== 'undefined') localStorage.setItem('masar_active_mode', 'student');
      if (branch === 'IKHLAS_JEDDAH') {
        const allStudents = getStudents();
        const linked = allStudents.find(
          (s) => s.fullName === account.name || s.parentPhone === account.email,
        );
        const needsSetup =
          !linked?.dateOfBirth &&
          (typeof window !== 'undefined'
            ? !localStorage.getItem('school_student_setup_done')
            : true);
        targetUrl = needsSetup ? '/school-student/setup' : '/school-student';
      } else {
        const linked = getStudents().find((s) => s.fullName === account.name || s.parentPhone === account.email);
        const hasStudentTest = linked
          ? getReports().some(
              (report) =>
                (report.studentId === linked.id || report.studentName === linked.fullName) &&
                (report.type === 'student-assessment-analysis' || report.type === 'student-assessment-answers'),
            )
          : false;
        if (typeof window !== 'undefined' && linked) {
          localStorage.setItem('masar.current-student-id', linked.id);
          localStorage.setItem('masar_active_student_id', linked.id);
        }
        targetUrl = linked && hasStudentTest ? `/student/${linked.id}` : '/student/new?flow=student';
      }
    } else {
      if (typeof window !== 'undefined') localStorage.setItem('masar_active_mode', 'parent');
      if (branch === 'IKHLAS_JEDDAH') {
        targetUrl = '/school-parent';
      } else {
        const students = getStudents();
        targetUrl = account.providerId === 'generated' || students.length === 0 ? '/student/new?flow=parent' : '/parent';
      }
    }

    if (typeof window !== 'undefined') {
      window.location.href = targetUrl;
    } else {
      router.push(targetUrl);
    }
  }

  // ─── Email/Password Login ────────────────────────────────────────────────────
  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');
    setLoginMessage('');

    if (password.trim().length < 6) {
      setLoginError('كلمة المرور يجب ألا تقل عن 6 أحرف.');
      return;
    }

    // Call server-side authentication API (sets HttpOnly masar_session cookie)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: email, password, rememberMe }),
      });

      if (res.status === 429) {
        setLoginError('محاولات دخول كثيرة جداً. يرجى المحاولة بعد قليل.');
        return;
      }

      const data = await res.json();

      if (res.ok && data.ok && data.account) {
        if (rememberMe) {
          localStorage.setItem('masar_remember_email', email);
        } else {
          localStorage.removeItem('masar_remember_email');
        }
        localStorage.removeItem('masar_remember_pass');
        setLoginMessage('تم تسجيل دخولك بنجاح! جاري التوجيه إلى حسابك...');
        setSession(data.account, rememberMe);
        setTimeout(() => {
          redirectAfterLogin(data.account);
        }, 600);
        return;
      }

      // API returned error
      if (data.error) {
        setLoginError(data.error);
        return;
      }
    } catch (_) {}

    // Fallback local auth check
    const result = authenticate(email, password);

    if (result.ok) {
      if (rememberMe) {
        localStorage.setItem('masar_remember_email', email);
      } else {
        localStorage.removeItem('masar_remember_email');
      }
      localStorage.removeItem('masar_remember_pass');
      setLoginMessage('تم تسجيل دخولك بنجاح! جاري التوجيه إلى حسابك...');
      setSession(result.account, rememberMe);
      setTimeout(() => {
        redirectAfterLogin(result.account);
      }, 600);
      return;
    }

    setLoginError(
      result.reason === 'missing'
        ? 'الحساب غير موجود. يُرجى التحقق من البريد الإلكتروني أو التواصل مع الإدارة.'
        : 'كلمة المرور غير صحيحة. يُرجى المحاولة مجدداً أو استعادة كلمة المرور.',
    );
    trackEvent('login_failed', { userName: email });
  };

  // ─── Google Sign-In ──────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setLoginError('');

    const result = await signInWithGoogle('parent');

    setGoogleLoading(false);

    if (result.ok) {
      setSession(result.account);
      trackEvent('login_google', { userId: result.account.id, isNew: result.isNew });
      redirectAfterLogin(result.account);
    } else if (result.reason) {
      setLoginError(result.reason);
    }
  };

  // ─── Apple Sign-In ───────────────────────────────────────────────────────────
  const handleAppleLogin = async () => {
    setAppleLoading(true);
    setLoginError('');

    const result = await signInWithApple('parent');

    setAppleLoading(false);

    if (result.ok) {
      setSession(result.account);
      trackEvent('login_apple', { userId: result.account.id, isNew: result.isNew });
      redirectAfterLogin(result.account);
    } else if (result.reason) {
      setLoginError(result.reason);
    }
  };

  // ─── Microsoft Sign-In ───────────────────────────────────────────────────────
  const handleMicrosoftLogin = async () => {
    setMsLoading(true);
    setLoginError('');

    const result = await signInWithMicrosoft('parent');

    setMsLoading(false);

    if (result.ok) {
      setSession(result.account);
      trackEvent('login_microsoft', { userId: result.account.id, isNew: result.isNew });
      redirectAfterLogin(result.account);
    } else if (result.reason) {
      setLoginError(result.reason);
    }
  };

  // ─── Forgot Password ─────────────────────────────────────────────────────────
  const handleForgotPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setForgotError('');
    setForgotLoading(true);

    const result = await sendPasswordReset(forgotEmail);
    setForgotLoading(false);

    if (result.ok) {
      setForgotTempPassword(result.temporaryPassword || '');
      setForgotSent(true);
    } else {
      setForgotError(result.reason);
    }
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setForgotEmail('');
    setForgotError('');
    setForgotSent(false);
    setForgotTempPassword('');
    setForgotLoading(false);
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-teal-50/80 via-slate-50 to-emerald-50/70 p-4 text-slate-900"
      dir="rtl"
    >
      {/* Background Soft Glows */}
      <div className="fixed top-10 right-10 w-96 h-96 bg-teal-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-emerald-200/30 rounded-full blur-[120px] pointer-events-none" />

      <main className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-[0.95fr_1.05fr]">
        {/* Left Side Info Panel */}
        <section className="hidden bg-gradient-to-br from-teal-50 via-emerald-50/80 to-slate-50 border-l border-slate-200 p-8 text-slate-900 lg:flex lg:flex-col lg:justify-between">
          <Link href="/" className="inline-flex items-center gap-3">
            <BrandMark size="md" hideNexus={true} />
          </Link>

          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-100/70 px-3.5 py-1.5 text-xs font-black text-teal-800">
              بوابة تشغيل المنصة
            </span>

            <h1 className="text-3xl font-black leading-tight text-slate-900">
              بوابة آمنة لكل حساب
            </h1>

            <p className="text-sm font-bold leading-relaxed text-slate-600">
              سجّل دخولك ببريدك الإلكتروني أو حساب جوجل للوصول إلى لوحة التشغيل والتقارير الإكلينيكية أو متابعة بيانات الطالب واختبارات المستوى.
            </p>

            <div className="grid gap-3 pt-2">
              {[
                'تسجيل دخول سريع بحساب جوجل',
                'تحقق فوري من الحساب وكلمة المرور',
                'دخول آمن ومباشر بنظام المشتركين',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3.5 text-xs sm:text-sm font-bold text-slate-800 border border-slate-200/80 shadow-sm"
                >
                  <CheckCircle2 size={18} className="text-teal-600 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200/80 pt-4 text-xs font-bold text-slate-500">
            منصة مسار التأهيل © {new Date().getFullYear()} - د. إسماعيل عيسى
          </div>
        </section>

        {/* Right Side Form Panel */}
        <section className="p-6 sm:p-10 flex flex-col justify-center">
          <div className="text-center">
            <Link href="/" className="mb-4 inline-flex justify-center">
              <BrandMark size="lg" showText={false} hideNexus={true} />
            </Link>
            <h1 className="text-3xl font-black text-slate-900">تسجيل الدخول</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">مرحبًا بك في منصة د. إسماعيل عيسى</p>
          </div>

          {/* ── Social Sign-In Buttons ── */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              id="btn-google-login"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-black text-sm transition-all shadow-sm border border-slate-300 active:scale-95 disabled:opacity-60"
            >
              {googleLoading ? (
                <Loader2 size={18} className="animate-spin text-slate-500" />
              ) : (
                <GoogleIcon size={18} />
              )}
              <span>{googleLoading ? 'جارٍ...' : 'حساب Google'}</span>
            </button>

            <button
              type="button"
              id="btn-apple-login"
              onClick={handleAppleLogin}
              disabled={appleLoading}
              className="w-full flex items-center justify-center gap-2.5 py-3 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-sm transition-all shadow-sm border border-slate-800 active:scale-95 disabled:opacity-60"
            >
              {appleLoading ? (
                <Loader2 size={18} className="animate-spin text-white" />
              ) : (
                <AppleIcon size={18} />
              )}
              <span>{appleLoading ? 'جارٍ...' : 'حساب Apple'}</span>
            </button>
          </div>

          {/* Face ID Login Button */}
          <button
            type="button"
            onClick={() => setFaceLoginOpen(true)}
            className="w-full mt-3 flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-black text-sm transition-all shadow-sm border border-emerald-300 group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition">
              <ScanFace size={18} />
            </div>
            <span>الدخول بالوجه — Face ID</span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200/60 px-2.5 py-0.5 rounded-full border border-emerald-300">
              🔒 آمن 100%
            </span>
          </button>

          <div className="relative my-5 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <span className="relative bg-white px-3 text-[10px] font-black text-slate-400">
              أو ادخل بالبريد الإلكتروني
            </span>
          </div>

          {loginMessage && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-bold text-emerald-800">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
              <span>{loginMessage}</span>
            </div>
          )}

          {loginError && (
            <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-bold text-rose-700">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-right">
            <label className="block">
              <span className="mb-2 block text-xs sm:text-sm font-black text-slate-700">
                البريد الإلكتروني أو رقم الهاتف
              </span>
              <input
                id="input-login-email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="text"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-600 focus:bg-white transition"
                placeholder="name@example.com أو 05xxxxxxxx"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs sm:text-sm font-black text-slate-700">كلمة المرور</span>
              <span className="flex rounded-xl border border-slate-200 bg-slate-50 focus-within:border-teal-600 focus-within:bg-white transition">
                <input
                  id="input-login-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-bold text-slate-900 outline-none"
                  placeholder="اكتب كلمة المرور"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="grid w-12 place-items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
              <label className="flex items-center gap-2 font-bold text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-teal-600 rounded w-4 h-4 cursor-pointer"
                />
                تذكرني على هذا الجهاز
              </label>
              <button
                type="button"
                id="btn-forgot-password"
                onClick={() => { setForgotOpen(true); setForgotEmail(email); }}
                className="font-black text-teal-700 hover:underline"
              >
                نسيت كلمة المرور؟
              </button>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              className="focus-ring flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 font-black text-white hover:bg-teal-700 transition shadow-md shadow-teal-600/20 active:scale-95"
            >
              <LogIn size={18} />
              تسجيل الدخول
            </button>
          </form>

          <p className="mt-6 text-center text-xs sm:text-sm font-bold text-slate-600">
            ليس لديك حساب؟{' '}
            <Link href="/auth/register" className="font-black text-teal-700 hover:underline">
              إنشاء حساب جديد
            </Link>
          </p>
        </section>
      </main>

      {/* ── Face ID Login Modal ── */}
      {faceLoginOpen && (
        <FaceLoginModal
          onCancel={() => setFaceLoginOpen(false)}
          onFallback={() => setFaceLoginOpen(false)}
        />
      )}

      {/* ── Forgot Password Modal (Real Firebase Reset) ── */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 text-right">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-black text-teal-700">استعادة الحساب</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">نسيت كلمة المرور؟</h2>
              </div>
              <button
                type="button"
                onClick={closeForgot}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Success State */}
            {forgotSent ? (
              <div className="text-center py-4 space-y-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center">
                  <Mail size={32} className="text-teal-600" />
                </div>
                <div>
                  <p className="text-lg font-black text-slate-900">
                    {forgotTempPassword ? 'تم إنشاء كلمة مرور مؤقتة' : 'تم إرسال الرابط'}
                  </p>
                  <p className="mt-2 text-sm font-bold text-slate-500 leading-relaxed">
                    {forgotTempPassword ? (
                      <>
                        هذا الحساب مولد داخل منصة مسار. استخدم كلمة المرور المؤقتة التالية ثم غيّرها بعد الدخول:
                        <span className="mt-3 block rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 font-mono text-base font-black text-teal-800" dir="ltr">
                          {forgotTempPassword}
                        </span>
                      </>
                    ) : (
                      <>
                        تحقق من بريدك الإلكتروني{' '}
                        <span className="font-black text-teal-700">{forgotEmail}</span>
                        {' '}وستجد رسالة فيها رابط لإعادة تعيين كلمة المرور.
                        <br />
                        <span className="text-xs text-slate-400 mt-1 block">
                          الرابط صالح لمدة ساعة واحدة فقط.
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs font-bold text-amber-800 text-right">
                  {forgotTempPassword ? 'هذه الكلمة تظهر هنا مرة واحدة فقط.' : 'لم تجد الرسالة؟ تحقق من مجلد Spam أو Junk'}
                </div>
                <button
                  type="button"
                  onClick={closeForgot}
                  className="w-full mt-2 rounded-xl bg-teal-600 px-4 py-3 font-black text-white hover:bg-teal-700 transition"
                >
                  {forgotTempPassword ? 'حسناً، سأدخل بالكلمة المؤقتة' : 'حسناً، سأتحقق من بريدي'}
                </button>
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <p className="text-sm font-bold text-slate-600 leading-relaxed">
                  أدخل بريدك الإلكتروني وسنرسل لك رابطاً آمناً لإعادة تعيين كلمة المرور فوراً.
                </p>

                {forgotError && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-bold text-rose-700">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <label className="block">
                  <span className="mb-2 block text-xs font-black text-slate-700">البريد الإلكتروني</span>
                  <div className="relative">
                    <Mail size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="input-forgot-email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      type="email"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-600 focus:bg-white transition"
                      placeholder="name@example.com"
                      required
                      autoFocus
                    />
                  </div>
                </label>

                <button
                  id="btn-send-reset"
                  type="submit"
                  disabled={forgotLoading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-black text-white hover:bg-teal-700 transition disabled:opacity-60"
                >
                  {forgotLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <KeyRound size={18} />
                  )}
                  {forgotLoading ? 'جارٍ الإرسال...' : 'إرسال رابط الاستعادة'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
