'use client';

import { useEffect, useState } from 'react';
import { Activity, DatabaseZap, FileText, UserRound, Trash2, Loader2 } from 'lucide-react';
import { clearAllMockData, getSyncSnapshot } from '@/lib/cloudStore';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Collections to wipe — accounts excluded to preserve login
const DATA_COLLECTIONS = [
  'students', 'reports', 'surveys', 'activities', 'messages',
  'masar_rooms', 'ikhlasLogs', 'ikhlasPosts', 'waitlist'
];

async function purgeFirestore() {
  for (const colName of DATA_COLLECTIONS) {
    try {
      const snap = await getDocs(collection(db, colName));
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    } catch (e) {
      console.error(`Error purging ${colName}:`, e);
    }
  }
}

import { getSession } from '@/lib/cloudStore';

export default function SyncStatus() {
  const [snapshot, setSnapshot] = useState({ students: 0, reports: 0, surveys: 0, activities: 0, lastSync: null as string | null });
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [isStaff, setIsStaff] = useState(false);

  const refreshSnapshot = () => {
    queueMicrotask(() => setSnapshot(getSyncSnapshot()));
  };

  useEffect(() => {
    const session = getSession();
    const staff = session?.role === 'doctor' || session?.role === 'specialist' || session?.role === 'teacher';
    setIsStaff(staff);
    if (staff) {
      refreshSnapshot();
    }
  }, []);

  if (!isStaff) return null;

  const handleClearAll = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في تصفير وتفريغ جميع سجلات الطلاب والتقارير بالكامل من قاعدة البيانات السحابية؟')) return;
    setStatus('loading');
    try {
      // 1️⃣ Purge from Server Firebase Admin
      await fetch('/api/data/purge', {
        method: 'POST',
        credentials: 'include',
      });
      // 2️⃣ Wipe client-side Firestore directly as fallback
      await purgeFirestore();
      // 3️⃣ Wipe browser cloud cache and reset in-memory data
      clearAllMockData();
      // 4️⃣ Refresh counters and reload
      refreshSnapshot();
      setStatus('done');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e) {
      console.error('Purge error:', e);
      setStatus('idle');
    }
  };

  const lastSync = snapshot.lastSync ? new Date(snapshot.lastSync).toLocaleString('ar-SA') : 'لا توجد عمليات محفوظة بعد';

  const items = [
    { label: 'طلاب', value: snapshot.students, icon: UserRound },
    { label: 'تقارير', value: snapshot.reports, icon: FileText },
    { label: 'استبيانات', value: snapshot.surveys, icon: Activity },
  ];

  return (
    <section className="rounded-lg border border-teal-100 bg-teal-50 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-white text-teal-800 ring-1 ring-teal-100">
            <DatabaseZap size={22} />
          </span>
          <div>
            <p className="text-sm font-black text-teal-900">مزامنة بيانات المنصة الفعليه</p>
            <p className="mt-1 text-xs font-bold text-teal-800">آخر تحديث: {lastSync}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="grid grid-cols-3 gap-2">
            {items.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-lg bg-white px-3 py-2 text-center ring-1 ring-teal-100">
                <Icon className="mx-auto text-teal-700" size={16} />
                <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
                <p className="text-[11px] font-black text-slate-500">{label}</p>
              </div>
            ))}
          </div>

          <button
            onClick={handleClearAll}
            disabled={status === 'loading'}
            className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 transition shadow-xs disabled:opacity-60 disabled:cursor-wait"
            title="تصفير وتفريغ كامل — Firestore + Local"
          >
            {status === 'loading'
              ? <Loader2 size={14} className="animate-spin" />
              : <Trash2 size={14} />
            }
            <span>{status === 'loading' ? 'جاري التصفير...' : 'تصفير وتفريغ النظام'}</span>
          </button>
        </div>
      </div>

      {status === 'done' && (
        <p className="mt-2 text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-300 rounded-lg p-2 text-center">
          ✅ تم تفريغ جميع البيانات من قاعدة البيانات السحابية والمتصفح نهائياً!
        </p>
      )}
    </section>
  );
}
