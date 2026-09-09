'use client';
import { useState, useMemo } from 'react';
import { Download, Search, Award, CheckCircle } from 'lucide-react';

interface Props { data: Record<string, unknown>[]; onDownload: (d: Record<string, unknown>[]) => void; }
const PAGE_SIZE = 20;

export default function CertificatesArchiveTab({ data, onDownload }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((c: any) =>
      String(c.studentName ?? '').toLowerCase().includes(q) ||
      String(c.title ?? '').toLowerCase().includes(q) ||
      String(c.certNumber ?? '').toLowerCase().includes(q)
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="p-5" dir="rtl">
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="ابحث باسم الطالب أو العنوان أو رقم الشهادة..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none" />
        </div>
        <span className="text-xs font-bold text-slate-500">{filtered.length} شهادة</span>
        <button onClick={() => onDownload(filtered)}
          className="flex items-center gap-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Download className="h-3.5 w-3.5" /> تصدير
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['الطالب', 'العنوان', 'البرنامج', 'رقم الشهادة', 'الدرجة', 'أُرسلت لولي الأمر', 'تاريخ الإتمام'].map(h => (
                <th key={h} className="px-3 py-3 text-right text-[11px] font-black text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageData.map((c: any, i) => (
              <tr key={c.id ?? i} className="hover:bg-slate-50 transition">
                <td className="px-3 py-3 font-bold text-slate-800">{c.studentName}</td>
                <td className="px-3 py-3 text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                    {c.title}
                  </div>
                </td>
                <td className="px-3 py-3 text-slate-600">{c.programTitle}</td>
                <td className="px-3 py-3 font-mono text-[10px] text-slate-500">{c.certNumber || '—'}</td>
                <td className="px-3 py-3 font-black text-emerald-600">{c.score != null ? `${c.score}%` : '—'}</td>
                <td className="px-3 py-3 text-center">
                  {c.dispatchedToParent ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] font-black">
                      <CheckCircle className="h-3 w-3" /> أُرسلت
                    </span>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-3 py-3 text-slate-400">{c.completionDate?.slice(0, 10) || c.createdAt?.slice(0, 10) || '—'}</td>
              </tr>
            ))}
            {pageData.length === 0 && <tr><td colSpan={7} className="py-16 text-center text-slate-400 text-sm">لا توجد شهادات</td></tr>}
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
