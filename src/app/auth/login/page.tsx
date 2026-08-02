'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, LogIn, ShieldCheck, UserRound } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { authenticate, ensureDemoAccount, getDemoPassword } from '@/lib/auth';
import { getStudents, setSession } from '@/lib/localDb';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [otpStep, setOtpStep] = useState<1 | 2 | 3>(1);
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginMessage, setLoginMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const loginAsDoctor = () => {
    const account = ensureDemoAccount('dr.ismail@masar.com');
    if (!account) return;

    setSession(account);
    router.push('/dashboard');
  };

  const loginAsParent = () => {
    const account = ensureDemoAccount('parent@masar.com');
    if (!account) return;

    setSession(account);
    const hasStudent = getStudents().length > 0;
    router.push(hasStudent ? '/parent' : '/student/new');
  };

  const fillDemo = (type: 'doctor' | 'parent') => {
    const demoEmail = type === 'doctor' ? 'dr.ismail@masar.com' : 'parent@masar.com';
    setEmail(demoEmail);
    setPassword(getDemoPassword(demoEmail));
    setLoginError('');
    setLoginMessage('تم تعبئة بيانات الدخول التجريبية. اضغط دخول للمتابعة.');
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');
    setLoginMessage('');

    if (password.trim().length < 6) {
      setLoginError('كلمة المرور يجب ألا تقل عن 6 أحرف.');
      return;
    }

    const result = authenticate(email, password);

    if (result.ok) {
      setSession(result.account);
      if (result.account.role === 'doctor' || result.account.role === 'specialist' || result.account.role === 'teacher') {
        router.push('/dashboard');
        return;
      }

      router.push(getStudents().length > 0 ? '/parent' : '/student/new');
      return;
    }

    setLoginError(
      result.reason === 'missing'
        ? 'الحساب غير موجود. أنشئ حساب جديد أو استخدم بيانات الدكتور التجريبية.'
        : 'كلمة المرور غير صحيحة. جرّب استعادة كلمة المرور أو زر بيانات الدكتور.',
    );
  };

  const handleOtp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (otpStep === 1) {
      setMessage('تم تجهيز رمز التحقق التجريبي: 4829');
      setOtpStep(2);
      return;
    }

    if (otpStep === 2) {
      if (otp !== '4829') {
        setMessage('رمز التحقق غير صحيح. استخدم 4829 للتجربة المحلية.');
        return;
      }
      setMessage('تم التحقق. أدخل كلمة مرور جديدة ثم احفظ.');
      setOtpStep(3);
      return;
    }

    setMessage('تم حفظ كلمة المرور الجديدة محليًا.');
    setTimeout(() => {
      setForgotOpen(false);
      setOtpStep(1);
      setOtp('');
      setMessage('');
    }, 900);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4 text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(20,184,166,0.18),transparent_32%),radial-gradient(circle_at_80%_70%,rgba(37,99,235,0.16),transparent_30%)]" />

      <main className="relative grid w-full max-w-5xl overflow-hidden rounded-lg border border-white/10 bg-white shadow-2xl lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden bg-slate-950 p-8 text-white lg:flex lg:flex-col lg:justify-between">
          <Link href="/" className="inline-flex items-center gap-3">
            <BrandMark size="md" dark />
          </Link>
          <div>
            <p className="text-sm font-black text-teal-200">بوابة تشغيل المنصة</p>
            <h1 className="mt-3 text-4xl font-black leading-tight">دخول واضح لكل دور قبل رفع النظام على السيرفر</h1>
            <p className="mt-4 text-sm font-bold leading-7 text-white/70">
              حساب الدكتور يدخل لوحة التشغيل والتقارير، وحساب ولي الأمر يدخل لمتابعة بيانات الطالب والاستبيانات بدون خلط صلاحيات.
            </p>
            <div className="mt-6 grid gap-3">
              {['جلسة محفوظة محلياً', 'تحقق من الحساب وكلمة المرور', 'تجربة جاهزة للدكتور وولي الأمر'].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg bg-white/8 px-4 py-3 text-sm font-bold text-white/80 ring-1 ring-white/10">
                  <CheckCircle2 size={17} className="text-teal-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="p-6 sm:p-8">
          <div className="text-center">
            <Link href="/" className="mb-5 inline-flex justify-center">
              <BrandMark size="lg" showText={false} />
            </Link>
            <h1 className="text-3xl font-black text-slate-950">تسجيل الدخول</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">مرحبًا بك في منصة د. إسماعيل عيسى</p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button onClick={loginAsDoctor} className="focus-ring flex min-h-14 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800">
              <ShieldCheck size={18} />
              دخول د. إسماعيل
            </button>
            <button onClick={loginAsParent} className="focus-ring flex min-h-14 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-sm font-black text-white hover:bg-teal-800">
              <UserRound size={18} />
              دخول ولي أمر
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => fillDemo('doctor')} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-700 hover:bg-white">
              تعبئة بيانات الدكتور
            </button>
            <button type="button" onClick={() => fillDemo('parent')} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black text-slate-700 hover:bg-white">
              تعبئة بيانات ولي الأمر
            </button>
          </div>

          {(loginError || loginMessage) && (
            <div className={`mt-5 flex items-start gap-3 rounded-lg p-4 text-sm font-bold leading-7 ${loginError ? 'bg-rose-50 text-rose-900 ring-1 ring-rose-100' : 'bg-teal-50 text-teal-950 ring-1 ring-teal-100'}`}>
              {loginError ? <AlertCircle size={18} className="mt-1 shrink-0" /> : <CheckCircle2 size={18} className="mt-1 shrink-0" />}
              <span>{loginError || loginMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">البريد الإلكتروني أو رقم الهاتف</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="text"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700"
                placeholder="dr.ismail@masar.com"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-black text-slate-700">كلمة المرور</span>
              <span className="flex rounded-lg border border-slate-200 bg-slate-50 focus-within:border-teal-700">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-bold outline-none"
                  placeholder="اكتب كلمة المرور"
                  required
                />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="grid w-12 place-items-center text-slate-500">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
            <div className="flex items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2 font-bold text-slate-600">
                <input type="checkbox" className="accent-teal-700" />
                تذكرني
              </label>
              <button type="button" onClick={() => setForgotOpen(true)} className="font-black text-teal-800 hover:underline">
                نسيت كلمة المرور؟
              </button>
            </div>
            <button type="submit" className="focus-ring flex w-full min-h-14 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 font-black text-white hover:bg-teal-800">
              <LogIn size={18} />
              دخول
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-bold text-slate-600">
            ليس لديك حساب؟{' '}
            <Link href="/auth/register" className="font-black text-teal-800 hover:underline">
              إنشاء حساب جديد
            </Link>
          </p>
        </section>
      </main>

      {forgotOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <form onSubmit={handleOtp} className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black text-teal-800">استعادة كلمة المرور</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">رمز تحقق محلي</h2>
              </div>
              <button type="button" onClick={() => setForgotOpen(false)} className="rounded-lg px-3 py-2 text-sm font-black text-slate-500 hover:bg-slate-100">
                إغلاق
              </button>
            </div>

            {message && <p className="mt-4 rounded-lg bg-teal-50 p-3 text-sm font-bold leading-7 text-teal-950">{message}</p>}

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-black text-slate-700">
                {otpStep === 1 ? 'البريد أو الهاتف' : otpStep === 2 ? 'رمز التحقق' : 'كلمة المرور الجديدة'}
              </span>
              <input
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                type={otpStep === 3 ? 'password' : 'text'}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700"
                placeholder={otpStep === 2 ? '4829' : ''}
                required
              />
            </label>
            <button type="submit" className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 font-black text-white">
              <KeyRound size={18} />
              {otpStep === 1 ? 'إرسال الرمز' : otpStep === 2 ? 'تأكيد الرمز' : 'حفظ كلمة المرور'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
