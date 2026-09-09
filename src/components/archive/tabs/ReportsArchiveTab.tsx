'use client';
import { useState, useMemo } from 'react';
import { Download, Search, CheckCircle, Clock } from 'lucide-react';

interface Props { data: Record<string, unknown>[]; onDownload: (d: Record<string, unknown>[]) => void; }
const PAGE_SIZE = 20;
const typeLabel: Record<string, string> = {
  'initial-assessment': 'تقييم ابتدائي', 'placement': 'تحديد مستوى',
  'survey-analysis': 'تحليل استبيان', 'clinical-analysis': 'تحليل سريري',
  'student-assessment-analysis': 'تحليل تقييم الطالب', 'survey-answers': 'إجابات استبيان',
  'student-assessment-answers': 'إجابات تقييم',
};

export default function ReportsArchiveTab({ data, onDownload }: Props) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((r: any) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (!q) return true;
      return String(r.studentName ?? '').toLowerCase().includes(q) ||
             String(r.program ?? '').toLowerCase().includes(q);
    });
  }, [data, search, typeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const typeKeys = Array.from(new Set(data.map((r: any) => r.type).filter(Boolean)));

  return (
    <div className="p-5" dir="rtl">
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="ابحث باسم الطالب أو المسار..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => { setTypeFilter('all'); setPage(0); }}
            className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black border cursor-pointer transition ${typeFilter === 'all' ? 'bg-sky-500 text-white border-sky-400' : 'bg-white text-slate-600 border-slate-200'}`}>
            الكل ({data.length})
          </button>
          {typeKeys.map(t => (
            <button key={String(t)} onClick={() => { setTypeFilter(String(t)); setPage(0); }}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black border cursor-pointer transition ${typeFilter === t ? 'bg-amber-500 text-white border-amber-400' : 'bg-white text-slate-600 border-slate-200'}`}>
              {typeLabel[String(t)] ?? String(t)}
            </button>
          ))}
        </div>
        <span className="text-xs font-bold text-slate-500">{filtered.length} تقرير</span>
        <button onClick={() => onDownload(filtered)}
          className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Download className="h-3.5 w-3.5" /> تصدير
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['اسم الطالب', 'المسار', 'النوع', 'الدرجة', 'الحالة', 'أُرسل لولي الأمر', 'التاريخ'].map(h => (
                <th key={h} className="px-3 py-3 text-right text-[11px] font-black text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageData.map((r: any, i) => (
              <tr key={r.id ?? i} className="hover:bg-slate-50 transition">
                <td className="px-3 py-3 font-bold text-slate-800">{r.studentName}</td>
                <td className="px-3 py-3 text-slate-600">{r.program}</td>
                <td className="px-3 py-3">
                  <span className="text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-700 px-1.5 py-0.5 rounded-md">
                    {typeLabel[r.type] ?? r.type}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className={`font-black text-sm ${r.score >= 70 ? 'text-emerald-600' : r.score >= 50 ? 'text-amber-600' : 'text-rose-600'}`}>
                    {r.score}%
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${r.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                    {r.status === 'completed' ? 'مكتمل' : 'قيد الانتظار'}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  {r.dispatchedToParent ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] font-black">
                      <CheckCircle className="h-3 w-3" /> أُرسل
                    </span>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-3 text-slate-400">{r.date || r.createdAt?.slice(0, 10) || '—'}</td>
              </tr>
            ))}
            {pageData.length === 0 && <tr><td colSpan={7} className="py-16 text-center text-slate-400 text-sm">لا توجد تقارير</td></tr>}
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
