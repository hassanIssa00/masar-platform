'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  const loginAsDoctor = () => {
    localStorage.setItem(
      'masar-user',
      JSON.stringify({
        id: 'dr-ismail',
        name: 'د. إسماعيل عيسى',
        role: 'specialist',
        email: 'dr.ismail@masar.local',
      }),
    );
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E6FBF] to-[#0A3D7A] p-4">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1E6FBF] mb-2">تسجيل الدخول</h1>
          <p className="text-gray-500">مرحباً بك مجدداً في منصة د. إسماعيل عيسى</p>
        </div>
        <form className="space-y-6">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">البريد الإلكتروني</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E6FBF] focus:border-transparent transition"
              placeholder="name@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">كلمة المرور</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E6FBF] focus:border-transparent transition"
              placeholder="••••••••"
              required
            />
          </div>
          <div className="flex justify-between items-center text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-gray-600">
              <input type="checkbox" className="w-4 h-4 text-[#1E6FBF]" />
              تذكرني
            </label>
            <a href="#" className="text-[#1E6FBF] hover:underline font-semibold">نسيت كلمة المرور؟</a>
          </div>
          <button 
            type="submit" 
            className="w-full bg-[#1E6FBF] hover:bg-[#0A3D7A] text-white font-bold py-3 px-4 rounded-xl shadow-lg transition transform hover:-translate-y-1"
          >
            دخول
          </button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-bold text-gray-400">تجربة محلية</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={loginAsDoctor}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-bold text-white shadow-lg transition hover:bg-slate-800"
        >
          <ShieldCheck size={18} />
          دخول مباشر بحساب د. إسماعيل
          <LogIn size={18} />
        </button>

        <p className="mt-3 text-center text-xs font-semibold leading-6 text-gray-500">
          هذا الزر مخصص للتجربة المحلية عند عدم تشغيل قاعدة البيانات.
        </p>

        <div className="mt-8 text-center text-gray-600">
          ليس لديك حساب؟{' '}
          <Link href="/auth/register" className="text-[#F5A623] font-bold hover:underline">
            إنشاء حساب جديد
          </Link>
        </div>
      </div>
    </div>
  );
}
