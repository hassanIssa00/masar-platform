'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  LogIn,
  ShieldCheck,
  UserRound,
  ScanFace,
  Loader2,
  KeyRound,
  Mail,
  X,
  Lock,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { signInWithGoogle, handleGoogleRedirectResult, signInWithApple, signInWithMicrosoft } from '@/lib/auth';
import { getAccounts, getReports, getStudents, getSurveys, setSession } from '@/lib/cloudStore';
import { pullCloudDataToLocal } from '@/lib/firestoreSync';
import { trackEvent } from '@/lib/analyticsTracker';
import { findMatchingStudentForParent, normalizeArabicText } from '@/lib/nameMatching';
import dynamic from 'next/dynamic';
const FaceLoginModal = dynamic(() => import('@/components/FaceLoginModal'), { ssr: false });
const LOGIN_SYNC_KEYS = ['accounts', 'students', 'reports', 'surveys'] as const;

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
  const [message, setMessage] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [faceLoginOpen, setFaceLoginOpen] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);

  // ── Forgot Password States ──
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotCode, setForgotCode] = useState('');
  const [receivedOtpHint, setReceivedOtpHint] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    trackEvent('visit', { page: '/login' });

    // Check if coming back from Google redirect
    handleGoogleRedirectResult('parent').then(async (result) => {
      if (result && result.ok) {
        setSession(result.account, false, false);
        await redirectAfterLogin(result.account);
      } else if (result?.reason) {
        setLoginError(result.reason);
      }
    });

    // Check if coming from email reset link (?oobCode=... or mode=resetPassword)
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const oob = searchParams.get('oobCode');
      const mode = searchParams.get('mode');
      if (oob || mode === 'resetPassword') {
        setForgotOpen(true);
        setForgotStep(2);
        if (oob) setForgotCode(oob);
      }
    }
  }, []);

  // ── Forgot Password Handlers ──
  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    const clean = forgotEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@')) {
      setForgotError('يُرجى إدخال بريد إلكتروني صحيح.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotMessage('');

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean }),
      });
      const data = await res.json().catch(() => ({}));
      setForgotLoading(false);

      if (res.ok && data.ok) {
        setForgotStep(2);
        setReceivedOtpHint(data.code || '');
        setForgotMessage('تم إرسال كود التحقق ورابط الاستعادة إلى بريدك الإلكتروني (Gmail) بنجاح.');
      } else {
        setForgotError(data.error || 'تعذر إرسال كود التحقق. يرجى التأكد من كتابة البريد بشكل صحيح.');
      }
    } catch {
      setForgotLoading(false);
      setForgotError('حدث خطأ في الاتصال بالسيرفر. حاول مرة أخرى.');
    }
  };

  const handleConfirmReset = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim().toLowerCase();
    const cleanCode = forgotCode.trim();
    const cleanPass = newPassword.trim();

    if (!cleanCode) {
      setForgotError('يُرجى إدخال كود التحقق المكون من 6 أرقام.');
      return;
    }

    if (cleanPass.length < 6) {
      setForgotError('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف.');
      return;
    }

    if (cleanPass !== confirmPassword.trim()) {
      setForgotError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: cleanEmail,
          code: cleanCode,
          newPassword: cleanPass,
        }),
      });
      const data = await res.json().catch(() => ({}));
      setForgotLoading(false);

      if (res.ok && data.ok && data.account) {
        setForgotStep(3);
        setSession(data.account, true, false);
        setTimeout(async () => {
          setForgotOpen(false);
          await redirectAfterLogin(data.account);
        }, 1200);
      } else {
        setForgotError(data.error || 'فشل تغيير كلمة المرور. تحقق من صحة الكود وحاول ثانية.');
      }
    } catch {
      setForgotLoading(false);
      setForgotError('حدث خطأ في الاتصال بالخادم. حاول مجدداً.');
    }
  };

  const closeForgotModal = () => {
    setForgotOpen(false);
    setForgotStep(1);
    setForgotCode('');
    setReceivedOtpHint('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setForgotMessage('');
    setForgotLoading(false);
  };

  // ─── Redirect helper based on account role/branch ───────────────────────────
  async function redirectAfterLogin(account: { role: string; schoolBranch?: string; id: string; name: string; email: string; providerId?: string; phone?: string; onboardingRequired?: boolean; linkedStudentId?: string }) {
    const branch = account.schoolBranch ?? 'MASAR';

    trackEvent('login', { userId: account.id, userName: account.name, userRole: account.role });

    // Helper: check if a name is a placeholder (not a real filled-in name)
    const isPlaceholder = (n?: string | null) =>
      !n || n.includes('جديد') || n === 'طالب' || n === 'الطالب' || n === 'ولي الأمر' || n === 'ولي أمر' || n === 'ولي أمر جديد';

    let targetUrl = '/dashboard';

    if (account.role === 'doctor' || account.role === 'specialist' || account.role === 'teacher') {
      targetUrl = '/dashboard';

    } else if (account.role === 'student') {
      // ── Student login ──
      // If onboarding is required (profile not complete or no assessment), go to setup
      const studentId = account.linkedStudentId || account.id;
      const sParam = studentId ? `?student=${encodeURIComponent(studentId)}` : '';

      if (account.onboardingRequired || isPlaceholder(account.name)) {
        // Student needs to complete their profile first
        targetUrl = branch === 'IKHLAS_JEDDAH'
          ? `/school-student/setup${sParam}`
          : `/student/new?flow=student${studentId ? `&student=${encodeURIComponent(studentId)}` : ''}`;
      } else {
        // All students go to the interactive student portal (which adapts dynamically to their branch)
        targetUrl = `/school-student${sParam}`;
      }

    } else {
      // ── Parent login ──
      await pullCloudDataToLocal(['students', 'accounts', 'surveys']).catch(() => {});
      const allStudents = getStudents();
      const parentProfile = {
        ...account,
        id: account.id,
        email: account.email,
        phone: account.phone,
        schoolBranch: account.schoolBranch,
      };
      const linkedStudent = account.linkedStudentId
        ? allStudents.find((s) => s.id === account.linkedStudentId)
        : findMatchingStudentForParent(parentProfile, allStudents);

      // Direct parents directly to their dashboard without looping to registration wizard
      const sParam = linkedStudent ? `?student=${encodeURIComponent(linkedStudent.id)}` : '';
      targetUrl = branch === 'IKHLAS_JEDDAH' ? `/school-parent${sParam}` : `/parent${sParam}`;
    }

    if (typeof window !== 'undefined') {
      router.push(targetUrl);
      setTimeout(() => {
        if (window.location.pathname !== targetUrl.split('?')[0]) {
          window.location.href = targetUrl;
        }
      }, 400);
    } else {
      router.push(targetUrl);
    }
  }

  // ─── Email/Password Login ────────────────────────────────────────────────────
  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loginLoading) return;
    setLoginError('');
    setLoginMessage('');

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (cleanPassword.length < 6) {
      setLoginError('كلمة المرور يجب ألا تقل عن 6 أحرف.');
      return;
    }

    // Call server-side authentication API (sets HttpOnly masar_session cookie)
    try {
      setLoginLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: cleanEmail, password: cleanPassword, rememberMe }),
      }).catch(() => null);

      if (res && res.status === 429) {
        setLoginError('محاولات دخول كثيرة جداً. يرجى المحاولة بعد قليل.');
        setLoginLoading(false);
        return;
      }

      const data = res ? await res.json().catch(() => ({})) : {};

      if (res && res.ok && data.ok && data.account) {
        setLoginMessage('تم تسجيل دخولك بنجاح! جاري التوجيه إلى حسابك...');
        setSession(data.account, rememberMe, false);
        await redirectAfterLogin(data.account);
        return;
      }

      // Local fallback for accounts registered in this session/browser
      const allAccounts = getAccounts();
      const localMatched = allAccounts.find(
        (a) =>
          (a.email && a.email.trim().toLowerCase() === cleanEmail.toLowerCase()) ||
          (a.phone && a.phone.replace(/\D/g, '') === cleanEmail.replace(/\D/g, ''))
      );

      if (localMatched) {
        setLoginMessage('تم تسجيل دخولك بنجاح! جاري التوجيه إلى حسابك...');
        setSession(localMatched, rememberMe, false);
        await redirectAfterLogin(localMatched);
        return;
      }

      setLoginError(
        data?.error ||
          (cleanEmail.toLowerCase() === 'dr.ismail@masar.com'
            ? 'بيانات الدخول غير صحيحة. تأكد من نسخ كلمة المرور كاملة بدون حذف أول أو آخر حرف.'
            : 'بيانات الدخول غير صحيحة. يرجى التأكد من البريد وكلمة المرور.'),
      );
      setLoginLoading(false);
      return;
    } catch (_) {
      // Local fallback in case of network disconnect
      const allAccounts = getAccounts();
      const localMatched = allAccounts.find(
        (a) =>
          (a.email && a.email.trim().toLowerCase() === cleanEmail.toLowerCase()) ||
          (a.phone && a.phone.replace(/\D/g, '') === cleanEmail.replace(/\D/g, ''))
      );

      if (localMatched) {
        setLoginMessage('تم تسجيل دخولك بنجاح! جاري التوجيه إلى حسابك...');
        setSession(localMatched, rememberMe, false);
        await redirectAfterLogin(localMatched);
        return;
      }

      setLoginError('تعذر الاتصال بسيرفر تسجيل الدخول. حاول مرة أخرى.');
      setLoginLoading(false);
      return;
    }
  };

  // ─── Google Sign-In ──────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setLoginError('');

    const result = await signInWithGoogle('parent');

    setGoogleLoading(false);

    if (result.ok) {
      setSession(result.account, false, false);
      trackEvent('login_google', { userId: result.account.id, isNew: result.isNew });
      await redirectAfterLogin(result.account);
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
      setSession(result.account, false, false);
      trackEvent('login_apple', { userId: result.account.id, isNew: result.isNew });
      await redirectAfterLogin(result.account);
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
      setSession(result.account, false, false);
      trackEvent('login_microsoft', { userId: result.account.id, isNew: result.isNew });
      await redirectAfterLogin(result.account);
    } else if (result.reason) {
      setLoginError(result.reason);
    }
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
                onClick={() => {
                  setForgotOpen(true);
                  setForgotEmail(email);
                  setForgotStep(1);
                  setForgotCode('');
                  setReceivedOtpHint('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setForgotError('');
                  setForgotMessage('');
                }}
                className="font-black text-teal-700 hover:text-teal-800 hover:underline transition cursor-pointer"
              >
                هل نسيت كلمة السر؟
              </button>
            </div>

            <button
              id="btn-login-submit"
              type="submit"
              disabled={loginLoading}
              className="focus-ring flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 font-black text-white hover:bg-teal-700 transition shadow-md shadow-teal-600/20 active:scale-95"
            >
              {loginLoading ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              {loginLoading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
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

      {/* ── Forgot Password Modal (Full Email + OTP Flow) ── */}
      {forgotOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
          dir="rtl"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 text-right space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900">استعادة كلمة المرور</h2>
                  <p className="text-xs font-bold text-slate-500">
                    {forgotStep === 1
                      ? 'خطوة 1 من 2: إرسال كود التحقق'
                      : forgotStep === 2
                        ? 'خطوة 2 من 2: إدخال الكود وكلمة المرور'
                        : 'تم بنجاح!'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeForgotModal}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Error Message */}
            {forgotError && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-bold text-rose-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-relaxed">{forgotError}</span>
              </div>
            )}

            {/* Success / Status Message */}
            {forgotMessage && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-bold text-emerald-800">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
                <span className="leading-relaxed">{forgotMessage}</span>
              </div>
            )}

            {/* ── STEP 1: Enter Email ── */}
            {forgotStep === 1 && (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <p className="text-xs sm:text-sm font-bold text-slate-600 leading-relaxed">
                  أدخل بريدك الإلكتروني (Gmail) المسجل وسنرسل لك كود التحقق المكون من 6 أرقام ورابط الاستعادة فوراً.
                </p>

                <label className="block">
                  <span className="mb-2 block text-xs font-black text-slate-700">البريد الإلكتروني</span>
                  <div className="relative">
                    <Mail size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="input-forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="name@gmail.com"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-600 focus:bg-white transition"
                      required
                      autoFocus
                    />
                  </div>
                </label>

                <button
                  id="btn-send-reset-code"
                  type="submit"
                  disabled={forgotLoading}
                  className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-black text-white hover:bg-teal-700 transition shadow-md shadow-teal-600/20 active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {forgotLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Mail size={18} />
                  )}
                  <span>{forgotLoading ? 'جارٍ إرسال كود التحقق...' : 'إرسال كود التحقق ✉️'}</span>
                </button>
              </form>
            )}

            {/* ── STEP 2: Enter OTP Code & New Password ── */}
            {forgotStep === 2 && (
              <form onSubmit={handleConfirmReset} className="space-y-4">
                <div className="rounded-2xl bg-teal-50/80 border border-teal-200 p-3 text-xs font-bold text-teal-900 space-y-1.5">
                  <p className="flex items-center gap-1.5 font-black text-teal-950">
                    <Mail size={14} className="text-teal-700" />
                    تم إرسال الكود إلى: <span className="font-mono text-teal-800" dir="ltr">{forgotEmail}</span>
                  </p>
                  <p className="text-[11px] text-teal-700">
                    💡 تفقد صندوق الوارد أو مجلد الرسائل غير المرغوبة (Spam) في Gmail.
                  </p>
                  {receivedOtpHint && (
                    <div className="mt-2 flex items-center justify-between gap-2 bg-white rounded-xl p-2 border border-teal-200">
                      <span className="text-[11px] text-slate-600 font-bold">كود التحقق السريع:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-base font-black tracking-widest text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
                          {receivedOtpHint}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setForgotCode(receivedOtpHint);
                            setCopiedCode(true);
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="px-2.5 py-1 text-[11px] font-black bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition cursor-pointer"
                        >
                          {copiedCode ? 'تمت التعبئة ✅' : 'تعبئة تلقائية'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-black text-slate-700">كود التحقق (6 أرقام)</span>
                  <div className="relative">
                    <Lock size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      id="input-forgot-code"
                      type="text"
                      maxLength={20}
                      value={forgotCode}
                      onChange={(e) => setForgotCode(e.target.value.replace(/\s+/g, ''))}
                      placeholder="XXXXXX"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 py-3 text-center text-lg font-mono font-black tracking-[0.25em] text-slate-900 outline-none focus:border-teal-600 focus:bg-white transition"
                      required
                      autoFocus
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black text-slate-700">كلمة المرور الجديدة</span>
                  <span className="flex rounded-xl border border-slate-200 bg-slate-50 focus-within:border-teal-600 focus-within:bg-white transition">
                    <input
                      id="input-forgot-new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      type={showNewPassword ? 'text' : 'password'}
                      className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm font-bold text-slate-900 outline-none"
                      placeholder="6 أحرف على الأقل"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="grid w-11 place-items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs font-black text-slate-700">تأكيد كلمة المرور الجديدة</span>
                  <span className="flex rounded-xl border border-slate-200 bg-slate-50 focus-within:border-teal-600 focus-within:bg-white transition">
                    <input
                      id="input-forgot-confirm-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm font-bold text-slate-900 outline-none"
                      placeholder="أعد كتابة كلمة المرور"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="grid w-11 place-items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </span>
                </label>

                <button
                  id="btn-confirm-reset-password"
                  type="submit"
                  disabled={forgotLoading}
                  className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-black text-white hover:bg-teal-700 transition shadow-md shadow-teal-600/20 active:scale-95 disabled:opacity-60 cursor-pointer"
                >
                  {forgotLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={18} />
                  )}
                  <span>{forgotLoading ? 'جارٍ الحفظ وتحديث الحساب...' : 'تأكيد وتغيير كلمة المرور 🔐'}</span>
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  >
                    ← تغيير البريد الإلكتروني
                  </button>
                  <button
                    type="button"
                    onClick={handleRequestReset}
                    disabled={forgotLoading}
                    className="font-bold text-teal-700 hover:underline transition cursor-pointer"
                  >
                    إعادة إرسال الكود 🔄
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 3: Success & Redirect ── */}
            {forgotStep === 3 && (
              <div className="py-6 text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-600 animate-bounce">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">تم تغيير كلمة المرور بنجاح! 🎉</h3>
                  <p className="mt-1.5 text-xs sm:text-sm font-bold text-slate-600">
                    تم تحديث كلمة المرور وتسجيل دخولك تلقائياً...
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-xs font-black text-teal-700">
                  <Loader2 size={16} className="animate-spin" />
                  <span>جاري نقلك إلى لوحة التحكم...</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
