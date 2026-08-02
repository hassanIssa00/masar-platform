'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BrandMark from '@/components/BrandMark';

export default function Navbar() {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    queueMicrotask(() => {
      setUserName(localStorage.getItem('user_name') ?? '');
    });
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/92 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 lg:px-8">
        <Link href="/" className="focus-ring flex min-w-0 items-center gap-3 rounded-lg">
          <BrandMark size="sm" />
        </Link>

        <div className="min-w-0 rounded-lg bg-slate-50 px-4 py-2 text-left ring-1 ring-slate-200">
          <p className="truncate text-xs font-black text-slate-500">حساب التشغيل</p>
          <p className="truncate text-sm font-black text-slate-950">{userName || 'غير مسجل'}</p>
        </div>
      </div>
    </nav>
  );
}
