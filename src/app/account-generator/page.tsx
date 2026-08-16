'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export default function AccountGeneratorRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/platform-settings?tab=users&focus=account-generator');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="grid min-h-[calc(100vh-72px)] flex-1 place-items-center p-6">
          <div className="rounded-2xl border border-teal-200 bg-white p-8 text-center shadow-sm">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-teal-50 text-teal-700">
              <KeyRound size={24} />
            </span>
            <h1 className="mt-4 text-xl font-black text-slate-900">فتح مولد الحسابات</h1>
            <p className="mt-2 text-sm font-bold text-slate-500">
              يتم فتح تبويب المستخدمين مباشرة، وفيه توليد حساب الطالب وولي الأمر وربطهما.
            </p>
            <Loader2 className="mx-auto mt-5 animate-spin text-teal-700" size={26} />
          </div>
        </main>
      </div>
    </div>
  );
}
