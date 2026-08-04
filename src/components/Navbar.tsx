'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import Sidebar from '@/components/Sidebar';

export default function Navbar() {
  const [userName, setUserName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setUserName(localStorage.getItem('user_name') ?? '');
    });
  }, []);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/92 backdrop-blur-xl" dir="rtl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 lg:px-8">

          <div className="flex items-center gap-2">
            {/* Hamburger — mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100 text-slate-700 transition lg:hidden"
              aria-label="فتح القائمة"
            >
              <Menu size={22} />
            </button>

            <Link href="/" className="focus-ring flex min-w-0 items-center gap-3 rounded-lg">
              <BrandMark size="sm" />
            </Link>
          </div>

          <div className="min-w-0 rounded-lg bg-slate-50 px-4 py-2 text-right ring-1 ring-slate-200">
            <p className="truncate text-xs font-black text-slate-500">حساب التشغيل</p>
            <p className="truncate text-sm font-black text-slate-950">{userName || 'غير مسجل'}</p>
          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Drawer */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
    </>
  );
}
