'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { saveCredential } from '@/lib/auth';
import { saveAccount, setSession } from '@/lib/localDb';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const account = saveAccount({
      name,
      email,
      phone,
      role: 'parent',
    });

    setSession(account);
    saveCredential(account, password);
    router.push('/student/new');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(20,184,166,0.24),transparent_30%),radial-gradient(circle_at_15%_70%,rgba(37,99,235,0.18),transparent_32%)]" />

      <main className="relative w-full max-w-lg rounded-lg border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
        <div className="text-center">
          <Link href="/" className="mx-auto inline-flex justify-center">
            <BrandMark size="lg" showText={false} />
          </Link>
          <h1 className="mt-5 text-3xl font-black text-slate-950">إنشاء حساب جديد</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">إنشاء حساب ولي أمر لمتابعة بيانات الطفل والاستبيان.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <Field label="الاسم الكامل" value={name} onChange={setName} placeholder="الاسم الثلاثي" />
          <Field label="البريد الإلكتروني" value={email} onChange={setEmail} placeholder="name@example.com" type="email" />
          <Field label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="01000000000" type="tel" />
          <Field label="كلمة المرور" value={password} onChange={setPassword} placeholder="اكتب كلمة المرور" type="password" />

          <div className="rounded-lg bg-teal-50 p-4 text-sm font-bold leading-7 text-teal-950">
            هذه الصفحة مخصصة لولي الأمر فقط. حسابات الدكتور والأخصائي لا تُنشأ من التسجيل العام.
          </div>

          <button type="submit" disabled={loading} className="focus-ring flex w-full min-h-14 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 font-black text-white hover:bg-teal-800 disabled:opacity-60">
            <UserPlus size={18} />
            {loading ? 'جاري تجهيز ملف ولي الأمر...' : 'تسجيل وإنشاء جلسة'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-bold text-slate-600">
          لديك حساب بالفعل؟{' '}
          <Link href="/auth/login" className="font-black text-teal-800 hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </main>
      {loading && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/82 text-white backdrop-blur-md">
          <div className="motion-scale-in rounded-lg border border-white/15 bg-white/10 p-7 text-center shadow-2xl">
            <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-teal-300" />
            <p className="mt-4 text-lg font-black">جاري نقلك لتسجيل بيانات الطفل</p>
            <p className="mt-1 text-sm font-bold text-white/70">لحظات بسيطة ونكمل المسار بشكل منظم.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700"
        placeholder={placeholder}
        required
      />
    </label>
  );
}
