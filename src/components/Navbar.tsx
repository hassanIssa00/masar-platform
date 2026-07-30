'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Activity, BarChart3, BookOpen, ClipboardCheck, Gamepad2, LogIn, LogOut, UserPlus } from 'lucide-react';
import { clearSession } from '@/lib/localDb';

const links = [
  { label: 'الرئيسية', href: '/', icon: Activity },
  { label: 'المناهج', href: '/programs/reading', icon: BookOpen },
  { label: 'الاختبارات', href: '/assessment', icon: ClipboardCheck },
  { label: 'الألعاب', href: '/kids', icon: Gamepad2 },
  { label: 'إضافة طالب', href: '/student/new', icon: UserPlus },
  { label: 'التقارير', href: '/reports', icon: BarChart3 },
];

export default function Navbar() {
  const router = useRouter();
  const [userName, setUserName] = useState('');

  useEffect(() => {
    queueMicrotask(() => {
      setUserName(localStorage.getItem('user_name') ?? '');
    });
  }, []);

  const logout = () => {
    clearSession();
    setUserName('');
    router.push('/auth/login');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <Link href="/" className="focus-ring flex min-w-0 items-center gap-3 rounded-lg">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-950 text-sm font-black text-white">م</span>
          <span className="min-w-0">
            <span className="block text-base font-black leading-5 text-slate-950 md:text-xl">منصة مسار التأهيل</span>
            <span className="hidden text-xs font-bold text-slate-500 sm:block">تقييم، تدخل، متابعة تقدم</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 lg:flex">
          {links.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className="focus-ring flex items-center gap-2 rounded-md px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-white hover:text-slate-950">
              <Icon size={16} strokeWidth={2.4} />
              {label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {userName ? (
            <button onClick={logout} className="focus-ring hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-100 sm:flex">
              <LogOut size={16} />
              خروج
            </button>
          ) : (
            <Link href="/auth/login" className="focus-ring hidden items-center gap-2 rounded-lg px-3 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-100 sm:flex">
              <LogIn size={16} />
              دخول
            </Link>
          )}
          <Link href="/student/new" className="focus-ring flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-teal-800">
            <UserPlus size={16} />
            تقييم جديد
          </Link>
        </div>
      </div>

      <div className="border-t border-slate-100 bg-white px-3 py-2 lg:hidden">
        <div className="flex gap-2 overflow-x-auto">
          {links.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} className="flex shrink-0 items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-black text-slate-700">
              <Icon size={14} />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
