'use client';
import { useState, useMemo } from 'react';
import { Download, Search, DollarSign } from 'lucide-react';

interface Props { data: Record<string, unknown>[]; onDownload: (d: Record<string, unknown>[]) => void; }
const PAGE_SIZE = 20;
const statusColor: Record<string, string> = {
  paid:    'bg-emerald-50 text-emerald-700 border-emerald-200',
  unpaid:  'bg-amber-50 text-amber-700 border-amber-200',
  overdue: 'bg-rose-50 text-rose-700 border-rose-200',
};
const statusLabel: Record<string, string> = { paid: '✅ مدفوعة', unpaid: '⏳ غير مدفوعة', overdue: '❌ متأخرة' };

export default function InvoicesArchiveTab({ data, onDownload }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((inv: any) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (!q) return true;
      return String(inv.studentName ?? '').toLowerCase().includes(q) ||
             String(inv.parentName ?? '').toLowerCase().includes(q) ||
             String(inv.invoiceNumber ?? '').toLowerCase().includes(q);
    });
  }, [data, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Summary stats
  const totalPaid    = filtered.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
  const totalUnpaid  = filtered.filter((i: any) => i.status !== 'paid').reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);

  return (
    <div className="p-5" dir="rtl">
      {/* Summary */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
          <p className="text-lg font-black text-emerald-700">{totalPaid.toLocaleString('ar-SA')}</p>
          <p className="text-[11px] font-bold text-emerald-600">إجمالي المدفوع</p>
        </div>
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
          <p className="text-lg font-black text-amber-700">{totalUnpaid.toLocaleString('ar-SA')}</p>
          <p className="text-[11px] font-bold text-amber-600">إجمالي غير المدفوع</p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-center">
          <p className="text-lg font-black text-slate-700">{filtered.length}</p>
          <p className="text-[11px] font-bold text-slate-600">إجمالي الفواتير</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="ابحث بالطالب أو ولي الأمر أو رقم الفاتورة..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none" />
        </div>
        <div className="flex gap-1.5">
          {['all', 'paid', 'unpaid', 'overdue'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(0); }}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black border cursor-pointer transition ${statusFilter === s ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white text-slate-600 border-slate-200'}`}>
              {s === 'all' ? 'الكل' : statusLabel[s] ?? s}
            </button>
          ))}
        </div>
        <button onClick={() => onDownload(filtered)}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Download className="h-3.5 w-3.5" /> تصدير
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['رقم الفاتورة', 'الطالب', 'ولي الأمر', 'المبلغ', 'الوصف', 'الحالة', 'تاريخ الاستحقاق', 'تاريخ الإنشاء'].map(h => (
                <th key={h} className="px-3 py-3 text-right text-[11px] font-black text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageData.map((inv: any, i) => (
              <tr key={inv.id ?? i} className="hover:bg-slate-50 transition">
                <td className="px-3 py-3 font-mono text-[10px] text-slate-500">{inv.invoiceNumber}</td>
                <td className="px-3 py-3 font-bold text-slate-800">{inv.studentName}</td>
                <td className="px-3 py-3 text-slate-600">{inv.parentName}</td>
                <td className="px-3 py-3">
                  <span className="font-black text-emerald-700 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {Number(inv.amount).toLocaleString('ar-SA')} {inv.currency}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-600 max-w-40 truncate">{inv.description}</td>
                <td className="px-3 py-3">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${statusColor[inv.status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {statusLabel[inv.status] ?? inv.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-400">{inv.dueDate?.slice(0, 10) || '—'}</td>
                <td className="px-3 py-3 text-slate-400">{inv.createdAt?.slice(0, 10) || '—'}</td>
              </tr>
            ))}
            {pageData.length === 0 && <tr><td colSpan={8} className="py-16 text-center text-slate-400 text-sm">لا توجد فواتير</td></tr>}
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
