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
    const demoPass = type === 'doctor' ? 'masar2026' : 'parent123';
    setEmail(demoEmail);
    setPassword(demoPass);
    setLoginError('');
    setLoginMessage('تم تعبئة بيانات الدخول. اضغط تسجيل الدخول للمتابعة.');
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-teal-50/80 via-slate-50 to-emerald-50/70 p-4 text-slate-900 font-sans" dir="rtl">
      
      {/* Background Soft Glows */}
      <div className="fixed top-10 right-10 w-96 h-96 bg-teal-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-emerald-200/30 rounded-full blur-[120px] pointer-events-none" />

      <main className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl lg:grid-cols-[0.95fr_1.05fr]">
        
        {/* Left Side Info Panel - Pure Bright Light Theme */}
        <section className="hidden bg-gradient-to-br from-teal-50 via-emerald-50/80 to-slate-50 border-l border-slate-200 p-8 text-slate-900 lg:flex lg:flex-col lg:justify-between">
          <Link href="/" className="inline-flex items-center gap-3">
            <BrandMark size="md" />
          </Link>

          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-100/70 px-3.5 py-1.5 text-xs font-black text-teal-800">
              بوابة تشغيل المنصة
            </span>
            
            <h1 className="text-3xl font-black leading-tight text-slate-900">
              دخول مباشر لكل حساب بدون تعقيد
            </h1>

            <p className="text-sm font-bold leading-relaxed text-slate-600">
              حساب الدكتور يدخل لوحة التشغيل والتقارير الإكلينيكية، وحساب ولي الأمر يدخل لمتابعة بيانات الطالب واختبارات المستوى.
            </p>

            <div className="grid gap-3 pt-2">
              {[
                'جلسة محفوظة محلياً بأمان',
                'تحقق فوري من الحساب وكلمة المرور',
                'دخول آمن ومباشر بنظام المشتركين'
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white p-3.5 text-xs sm:text-sm font-bold text-slate-800 border border-slate-200/80 shadow-sm">
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
              <BrandMark size="lg" showText={false} />
            </Link>
            <h1 className="text-3xl font-black text-slate-900">تسجيل الدخول</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">مرحبًا بك في منصة د. إسماعيل عيسى</p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 text-right">
            <button
              type="button"
              onClick={loginAsDoctor}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-2.5 text-xs font-black text-teal-900 hover:bg-teal-100 transition shadow-2xs cursor-pointer"
            >
              <ShieldCheck size={16} className="text-teal-600" />
              <span>دخول مباشر د. إسماعيل</span>
            </button>

            <button
              type="button"
              onClick={loginAsParent}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-800 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
            >
              <UserRound size={16} className="text-slate-600" />
              <span>دخول كـ ولي أمر</span>
            </button>
          </div>

          {(loginError || loginMessage) && (
            <div className={`mt-4 flex items-start gap-3 rounded-2xl p-4 text-xs sm:text-sm font-bold leading-relaxed ${
              loginError ? 'bg-rose-50 text-rose-900 border border-rose-200' : 'bg-teal-50 text-teal-950 border border-teal-200'
            }`}>
              {loginError ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
              <span>{loginError || loginMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-4 text-right">
            <label className="block">
              <span className="mb-2 block text-xs sm:text-sm font-black text-slate-700">البريد الإلكتروني أو رقم الهاتف</span>
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="text"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-600 focus:bg-white transition"
                placeholder="dr.ismail@masar.com"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs sm:text-sm font-black text-slate-700">كلمة المرور</span>
              <span className="flex rounded-xl border border-slate-200 bg-slate-50 focus-within:border-teal-600 focus-within:bg-white transition">
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? 'text' : 'password'}
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-bold text-slate-900 outline-none"
                  placeholder="اكتب كلمة المرور"
                  required
                />
                <button type="button" onClick={() => setShowPassword((current) => !current)} className="grid w-12 place-items-center text-slate-400 hover:text-slate-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>

            <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
              <label className="flex items-center gap-2 font-bold text-slate-600">
                <input type="checkbox" className="accent-teal-600 rounded" />
                تذكرني
              </label>
              <button type="button" onClick={() => setForgotOpen(true)} className="font-black text-teal-700 hover:underline">
                نسيت كلمة المرور؟
              </button>
            </div>

            <button 
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

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <form onSubmit={handleOtp} className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 text-right">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black text-teal-700">استعادة كلمة المرور</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">رمز تحقق محلي</h2>
              </div>
              <button type="button" onClick={() => setForgotOpen(false)} className="rounded-xl px-3 py-1.5 text-xs font-black text-slate-500 hover:bg-slate-100">
                إغلاق
              </button>
            </div>

            {message && <p className="mt-4 rounded-xl bg-teal-50 border border-teal-200 p-3 text-xs font-bold leading-relaxed text-teal-900">{message}</p>}

            <label className="mt-5 block">
              <span className="mb-2 block text-xs font-black text-slate-700">
                {otpStep === 1 ? 'البريد أو الهاتف' : otpStep === 2 ? 'رمز التحقق' : 'كلمة المرور الجديدة'}
              </span>
              <input
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                type={otpStep === 3 ? 'password' : 'text'}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-600 focus:bg-white"
                placeholder={otpStep === 2 ? '4829' : ''}
                required
              />
            </label>

            <button type="submit" className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-black text-white hover:bg-teal-700 transition">
              <KeyRound size={18} />
              {otpStep === 1 ? 'إرسال الرمز' : otpStep === 2 ? 'تأكيد الرمز' : 'حفظ كلمة المرور'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
