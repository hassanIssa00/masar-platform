'use client';

import { useEffect, useState } from 'react';
import { Activity, DatabaseZap, FileText, UserRound } from 'lucide-react';
import { getSyncSnapshot } from '@/lib/localDb';

export default function SyncStatus() {
  const [snapshot, setSnapshot] = useState({ students: 0, reports: 0, surveys: 0, activities: 0, lastSync: null as string | null });

  useEffect(() => {
    queueMicrotask(() => setSnapshot(getSyncSnapshot()));
  }, []);

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
            <p className="text-sm font-black text-teal-900">مزامنة بيانات المنصة</p>
            <p className="mt-1 text-xs font-bold text-teal-800">آخر تحديث: {lastSync}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {items.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-lg bg-white px-3 py-2 text-center ring-1 ring-teal-100">
              <Icon className="mx-auto text-teal-700" size={16} />
              <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
              <p className="text-[11px] font-black text-slate-500">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
