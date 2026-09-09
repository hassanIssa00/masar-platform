'use client';
import { useState, useMemo } from 'react';
import { Download, Search, Shield, UserCheck, FileText, ClipboardList } from 'lucide-react';

interface Props { data: Record<string, unknown>[]; onDownload: (d: Record<string, unknown>[]) => void; }
const PAGE_SIZE = 30;

const typeIcon: Record<string, React.ReactNode> = {
  account: <Shield className="h-3.5 w-3.5 text-violet-500" />,
  student: <UserCheck className="h-3.5 w-3.5 text-emerald-500" />,
  report:  <FileText className="h-3.5 w-3.5 text-amber-500" />,
  survey:  <ClipboardList className="h-3.5 w-3.5 text-teal-500" />,
};
const typeColor: Record<string, string> = {
  account: 'bg-violet-50 border-violet-200',
  student: 'bg-emerald-50 border-emerald-200',
  report:  'bg-amber-50 border-amber-200',
  survey:  'bg-teal-50 border-teal-200',
};

export default function ActivityArchiveTab({ data, onDownload }: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((a: any) => {
      if (typeFilter !== 'all' && a.type !== typeFilter) return false;
      if (!q) return true;
      return String(a.title ?? '').toLowerCase().includes(q) ||
             String(a.detail ?? '').toLowerCase().includes(q);
    });
  }, [data, search, typeFilter]);

  // Group by date
  const grouped = useMemo(() => {
    const pageSlice = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    const map = new Map<string, typeof pageSlice>();
    for (const a of pageSlice) {
      const date = String((a as any).createdAt ?? '').slice(0, 10) || 'غير محدد';
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(a);
    }
    return map;
  }, [filtered, page]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const dateLabel = (d: string) => d === today ? 'اليوم' : d === yesterday ? 'أمس' : d;

  return (
    <div className="p-5" dir="rtl">
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="ابحث في سجل النشاط..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none" />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'account', 'student', 'report', 'survey'] as const).map(t => (
            <button key={t} onClick={() => { setTypeFilter(t); setPage(0); }}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-black border cursor-pointer transition ${typeFilter === t ? 'bg-pink-500 text-white border-pink-400' : 'bg-white text-slate-600 border-slate-200'}`}>
              {t !== 'all' && typeIcon[t]}
              {t === 'all' ? 'الكل' : t}
            </button>
          ))}
        </div>
        <span className="text-xs font-bold text-slate-500">{filtered.length} إجراء</span>
        <button onClick={() => onDownload(filtered)}
          className="flex items-center gap-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Download className="h-3.5 w-3.5" /> تصدير
        </button>
      </div>

      {/* Timeline */}
      <div className="space-y-5">
        {Array.from(grouped.entries()).map(([date, items]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-black text-slate-500 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1">{dateLabel(date)}</span>
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] text-slate-400">{items.length} إجراء</span>
            </div>
            <div className="space-y-2">
              {items.map((a: any, i) => (
                <div key={a.id ?? i} className={`flex items-start gap-3 rounded-xl border p-3 ${typeColor[a.type] ?? 'bg-slate-50 border-slate-200'}`}>
                  <div className="mt-0.5 shrink-0">{typeIcon[a.type] ?? <div className="h-3.5 w-3.5 rounded-full bg-slate-300" />}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800">{a.title}</p>
                    {a.detail && <p className="text-[11px] text-slate-500 mt-0.5 truncate">{a.detail}</p>}
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{String(a.createdAt ?? '').slice(11, 16)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="py-16 text-center text-slate-400 text-sm">لا يوجد نشاط</div>}
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
