'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AccountGeneratorPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/platform-settings?tab=users&focus=account-generator');
  }, [router]);

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-800" dir="rtl">
      <div className="flex items-center gap-3 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <Loader2 className="animate-spin text-teal-600" size={24} />
        <span className="text-sm font-black">جاري الانتقال لمولد الحسابات في إعدادات المنصة...</span>
      </div>
    </div>
  );
}



