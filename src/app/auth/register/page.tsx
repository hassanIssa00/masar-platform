'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { saveCredential } from '@/lib/auth';
import { saveAccount, setSession, UserRole } from '@/lib/localDb';
import { entryGradeOptions, getAssessmentHref, saveEntryGrade } from '@/lib/placementFlow';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('parent');
  const [entryGrade, setEntryGrade] = useState('g1');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const account = saveAccount({
      name,
      email,
      phone,
      role,
    });

    setSession(account);
    saveCredential(account, password);
    if (role === 'doctor' || role === 'specialist' || role === 'teacher') {
      router.push('/dashboard');
      return;
    }

    saveEntryGrade(entryGrade);
    router.push(getAssessmentHref(entryGrade));
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
          <p className="mt-2 text-sm font-bold text-slate-500">الحساب يتحفظ محليًا ويظهر في تجربة المنصة مباشرة.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <Field label="الاسم الكامل" value={name} onChange={setName} placeholder="الاسم الثلاثي" />
          <Field label="البريد الإلكتروني" value={email} onChange={setEmail} placeholder="name@example.com" type="email" />
          <Field label="رقم الهاتف" value={phone} onChange={setPhone} placeholder="01000000000" type="tel" />
          <Field label="كلمة المرور" value={password} onChange={setPassword} placeholder="اكتب كلمة المرور" type="password" />
          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">الصف أو المسار المطلوب</span>
            <select
              value={entryGrade}
              onChange={(event) => setEntryGrade(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700"
            >
              {entryGradeOptions.map((option) => (
                <option key={option.key} value={option.key}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-black text-slate-700">نوع الحساب</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as UserRole)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700"
            >
              <option value="parent">ولي أمر / طالب</option>
              <option value="specialist">أخصائي</option>
              <option value="teacher">معلم</option>
              <option value="doctor">د. إسماعيل / أدمن</option>
            </select>
          </label>

          <button type="submit" className="focus-ring flex w-full min-h-14 items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 font-black text-white hover:bg-teal-800">
            <UserPlus size={18} />
            تسجيل وإنشاء جلسة
          </button>
        </form>

        <p className="mt-6 text-center text-sm font-bold text-slate-600">
          لديك حساب بالفعل؟{' '}
          <Link href="/auth/login" className="font-black text-teal-800 hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </main>
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
