'use client';
import { useState, useMemo } from 'react';
import { Download, Search, MessageSquareText, Table2 } from 'lucide-react';

interface Props { data: Record<string, unknown>[]; onDownload: (d: Record<string, unknown>[]) => void; }
const PAGE_SIZE = 20;

export default function MessagesArchiveTab({ data, onDownload }: Props) {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'table' | 'chat'>('table');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((m: any) =>
      String(m.studentName ?? '').toLowerCase().includes(q) ||
      String(m.body ?? '').toLowerCase().includes(q) ||
      String(m.parentName ?? '').toLowerCase().includes(q)
    );
  }, [data, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const fromLabel: Record<string, string> = { doctor: '🩺 د. إسماعيل', parent: '👨‍👩‍👧 ولي الأمر', student: '🎓 الطالب' };

  return (
    <div className="p-5" dir="rtl">
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="ابحث بالطالب أو نص الرسالة..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none" />
        </div>
        <div className="flex gap-1.5">
          {(['table', 'chat'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-black border cursor-pointer transition ${view === v ? 'bg-rose-500 text-white border-rose-400' : 'bg-white text-slate-600 border-slate-200'}`}>
              {v === 'table' ? '📋 جدول' : '💬 محادثات'}
            </button>
          ))}
        </div>
        <span className="text-xs font-bold text-slate-500">{filtered.length} رسالة</span>
        <button onClick={() => onDownload(filtered)}
          className="flex items-center gap-1.5 rounded-xl bg-rose-500 hover:bg-rose-400 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Download className="h-3.5 w-3.5" /> تصدير
        </button>
      </div>

      {view === 'table' ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['من', 'إلى', 'الطالب المعني', 'نص الرسالة', 'التاريخ'].map(h => (
                  <th key={h} className="px-3 py-3 text-right text-[11px] font-black text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageData.map((m: any, i) => (
                <tr key={m.id ?? i} className="hover:bg-slate-50 transition">
                  <td className="px-3 py-3 font-bold text-slate-700 whitespace-nowrap">{fromLabel[m.from] ?? m.from}</td>
                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">{fromLabel[m.to] ?? m.to}</td>
                  <td className="px-3 py-3 text-slate-700">{m.studentName || '—'}</td>
                  <td className="px-3 py-3 text-slate-600 max-w-64">
                    <p className="truncate">{String(m.body ?? '').slice(0, 100)}</p>
                    {m.audioDataUrl && <span className="text-[10px] text-indigo-500 font-bold">🎙️ رسالة صوتية</span>}
                  </td>
                  <td className="px-3 py-3 text-slate-400 whitespace-nowrap">{m.createdAt?.slice(0, 10) || '—'}</td>
                </tr>
              ))}
              {pageData.length === 0 && <tr><td colSpan={5} className="py-16 text-center text-slate-400 text-sm">لا توجد رسائل</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {pageData.map((m: any, i) => (
            <div key={m.id ?? i} className={`flex ${m.from === 'doctor' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-sm rounded-2xl px-4 py-3 shadow-xs ${m.from === 'doctor' ? 'bg-sky-500 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'}`}>
                <p className="text-xs font-black mb-1 opacity-70">{fromLabel[m.from] ?? m.from}</p>
                <p className="text-sm leading-relaxed">{m.body}</p>
                {m.audioDataUrl && <p className="text-[11px] mt-1 opacity-60">🎙️ رسالة صوتية مُرفقة</p>}
                <p className={`text-[10px] mt-1.5 text-left opacity-60`}>{m.createdAt?.slice(0, 10)}</p>
              </div>
            </div>
          ))}
          {pageData.length === 0 && <div className="py-16 text-center text-slate-400 text-sm">لا توجد رسائل</div>}
        </div>
      )}

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
