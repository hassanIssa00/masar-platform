'use client';
import { useState, useMemo } from 'react';
import { Download, Search, FileCheck2, ShieldCheck } from 'lucide-react';

interface Props { data: Record<string, unknown>[]; onDownload: (d: Record<string, unknown>[]) => void; }
const PAGE_SIZE = 20;

const consentTypeLabel: Record<string, string> = {
  'general-treatment':     '🏥 موافقة عامة على العلاج',
  'video-recording':       '📹 تصوير وتسجيل الجلسات',
  'data-sharing':          '🔗 مشاركة البيانات مع الفريق',
  'photography':           '📸 التصوير الفوتوغرافي',
  'research-participation':'🔬 المشاركة في الأبحاث',
};
const statusColor: Record<string, string> = {
  signed:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  revoked: 'bg-rose-50 text-rose-700 border-rose-200',
  expired: 'bg-slate-100 text-slate-500 border-slate-200',
};
const statusLabel: Record<string, string> = {
  signed: '✅ موقّعة', pending: '⏳ في انتظار', revoked: '🚫 مسحوبة', expired: '⏰ منتهية',
};

export default function ConsentsArchiveTab({ data, onDownload }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((c: any) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      if (!q) return true;
      return String(c.studentName ?? '').toLowerCase().includes(q) ||
             String(c.parentName ?? '').toLowerCase().includes(q);
    });
  }, [data, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const signedCount = data.filter((c: any) => c.status === 'signed').length;
  const pendingCount = data.filter((c: any) => c.status === 'pending').length;

  return (
    <div className="p-5" dir="rtl">
      {/* Warning */}
      <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2.5">
        <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700 font-medium leading-relaxed">
          <strong className="font-black">وثائق قانونية حساسة</strong> — تحتوي على توقيعات رقمية وموافقات رسمية من أولياء الأمور.
          هذه الوثائق سارية المفعول من الناحية القانونية ويجب التعامل معها بسرية تامة.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        {[
          { label: 'الإجمالي', value: data.length, color: 'slate' },
          { label: 'موقّعة', value: signedCount, color: 'emerald' },
          { label: 'في انتظار', value: pendingCount, color: 'amber' },
          { label: 'منتهية/مسحوبة', value: data.length - signedCount - pendingCount, color: 'rose' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl bg-${color}-50 border border-${color}-200 p-3 text-center`}>
            <p className={`text-xl font-black text-${color}-700`}>{value}</p>
            <p className={`text-[11px] font-bold text-${color}-600`}>{label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="ابحث باسم الطالب أو ولي الأمر..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none" />
        </div>
        <div className="flex gap-1.5">
          {['all', 'signed', 'pending', 'revoked', 'expired'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(0); }}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black border cursor-pointer transition ${statusFilter === s ? 'bg-violet-500 text-white border-violet-400' : 'bg-white text-slate-600 border-slate-200'}`}>
              {s === 'all' ? 'الكل' : statusLabel[s] ?? s}
            </button>
          ))}
        </div>
        <button onClick={() => onDownload(filtered)}
          className="flex items-center gap-1.5 rounded-xl bg-violet-500 hover:bg-violet-400 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Download className="h-3.5 w-3.5" /> تصدير
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['الطالب', 'ولي الأمر', 'الهاتف', 'نوع الموافقة', 'الحالة', 'تاريخ التوقيع', 'تاريخ الانتهاء', 'توقيع رقمي'].map(h => (
                <th key={h} className="px-3 py-3 text-right text-[11px] font-black text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageData.map((c: any, i) => (
              <tr key={c.id ?? i} className="hover:bg-slate-50 transition">
                <td className="px-3 py-3 font-bold text-slate-800">{c.studentName}</td>
                <td className="px-3 py-3 text-slate-700">{c.parentName}</td>
                <td className="px-3 py-3 font-mono text-slate-600">{c.parentPhone}</td>
                <td className="px-3 py-3">
                  <span className="text-[10px] font-bold bg-violet-50 border border-violet-200 text-violet-700 px-1.5 py-0.5 rounded-md">
                    {consentTypeLabel[c.consentType] ?? c.consentType}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${statusColor[c.status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {statusLabel[c.status] ?? c.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-400">{c.signedAt?.slice(0, 10) || '—'}</td>
                <td className="px-3 py-3 text-slate-400">{c.expiresAt?.slice(0, 10) || '—'}</td>
                <td className="px-3 py-3 text-center">
                  {c.digitalSignature ? (
                    <span className="flex items-center gap-1 text-emerald-600 text-[10px] font-black justify-center">
                      <FileCheck2 className="h-3 w-3" /> محفوظ
                    </span>
                  ) : <span className="text-slate-300">—</span>}
                </td>
              </tr>
            ))}
            {pageData.length === 0 && <tr><td colSpan={8} className="py-16 text-center text-slate-400 text-sm">لا توجد موافقات</td></tr>}
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
