'use client';
import { useState, useMemo } from 'react';
import { Download, Search, CheckCircle, ScanFace } from 'lucide-react';

interface Props {
  data: Record<string, unknown>[];
  ikhlasLogs: Record<string, unknown>[];
  onDownload: (d: Record<string, unknown>[]) => void;
}
const PAGE_SIZE = 20;
const statusColor: Record<string, string> = {
  present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  absent:  'bg-rose-50 text-rose-700 border-rose-200',
  late:    'bg-amber-50 text-amber-700 border-amber-200',
  excused: 'bg-sky-50 text-sky-700 border-sky-200',
};
const statusLabel: Record<string, string> = { present: '✅ حاضر', absent: '❌ غائب', late: '⏰ متأخر', excused: '🔵 معذور' };

export default function AttendanceArchiveTab({ data, ikhlasLogs, onDownload }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);

  const merged = useMemo(() => {
    const seen = new Set<string>();
    const all = [...data, ...ikhlasLogs.map((l: any) => ({ ...l, _source: 'ikhlas' }))];
    return all.filter((r: any) => {
      const key = r.id;
      if (key && seen.has(key)) return false;
      if (key) seen.add(key);
      return true;
    });
  }, [data, ikhlasLogs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return merged.filter((r: any) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return String(r.studentName ?? '').toLowerCase().includes(q) ||
             String(r.sessionDate ?? r.date ?? '').includes(q);
    });
  }, [merged, search, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: filtered.length,
    present: filtered.filter((r: any) => r.status === 'present').length,
    absent: filtered.filter((r: any) => r.status === 'absent').length,
    late: filtered.filter((r: any) => r.status === 'late').length,
  }), [filtered]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="p-5" dir="rtl">
      {/* Stats Bar */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        {[
          { label: 'الإجمالي', value: stats.total, color: 'bg-slate-50 border-slate-200 text-slate-700' },
          { label: 'حاضر', value: stats.present, color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { label: 'غائب', value: stats.absent, color: 'bg-rose-50 border-rose-200 text-rose-700' },
          { label: 'متأخر', value: stats.late, color: 'bg-amber-50 border-amber-200 text-amber-700' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl border ${color} p-3 text-center`}>
            <p className="text-xl font-black">{value}</p>
            <p className="text-[11px] font-bold opacity-70">{label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="ابحث باسم الطالب أو التاريخ..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'present', 'absent', 'late', 'excused'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(0); }}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black border cursor-pointer transition ${statusFilter === s ? 'bg-green-500 text-white border-green-400' : 'bg-white text-slate-600 border-slate-200'}`}>
              {s === 'all' ? 'الكل' : statusLabel[s] ?? s}
            </button>
          ))}
        </div>
        <button onClick={() => onDownload(filtered)}
          className="flex items-center gap-1.5 rounded-xl bg-green-500 hover:bg-green-400 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Download className="h-3.5 w-3.5" /> تصدير
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['الطالب', 'التاريخ', 'الوقت', 'الحالة', 'طريقة التحقق', 'الحصة', 'المادة', 'أُبلغ ولي الأمر'].map(h => (
                <th key={h} className="px-3 py-3 text-right text-[11px] font-black text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageData.map((r: any, i) => (
              <tr key={r.id ?? i} className="hover:bg-slate-50 transition">
                <td className="px-3 py-3 font-bold text-slate-800">{r.studentName}</td>
                <td className="px-3 py-3 text-slate-600">{r.sessionDate || r.date || '—'}</td>
                <td className="px-3 py-3 text-slate-500">{r.sessionTime || r.exitTime || '—'}</td>
                <td className="px-3 py-3">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${statusColor[r.status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {statusLabel[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-3 py-3">
                  {r.verifiedVia === 'face' ? (
                    <span className="inline-flex items-center gap-1 text-indigo-600 text-[10px] font-black">
                      <ScanFace className="h-3 w-3" /> Face ID
                    </span>
                  ) : <span className="text-slate-500">{r.verifiedVia || '—'}</span>}
                </td>
                <td className="px-3 py-3 text-slate-500">{r.periodName || (r.periodNumber ? `حصة ${r.periodNumber}` : '—')}</td>
                <td className="px-3 py-3 text-slate-600">{r.subjectName || '—'}</td>
                <td className="px-3 py-3 text-center">
                  {r.parentNotified ? <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" /> : <span className="text-slate-300">—</span>}
                </td>
              </tr>
            ))}
            {pageData.length === 0 && <tr><td colSpan={8} className="py-16 text-center text-slate-400 text-sm">لا توجد سجلات حضور</td></tr>}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40 cursor-pointer">السابق</button>
          <span className="text-xs text-slate-500">{page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40 cursor-pointer">التالي</button>
        </div>
      )}
    </div>
  );
}
