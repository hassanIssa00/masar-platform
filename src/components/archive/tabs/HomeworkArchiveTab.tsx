'use client';
import { useState, useMemo, useCallback } from 'react';
import { Download, Search, Trash2, AlertTriangle } from 'lucide-react';
import { deleteArchiveItem } from '@/lib/archiveDelete';

interface Props {
  data: Record<string, unknown>[];
  onDownload: (d: Record<string, unknown>[]) => void;
  onRefresh?: () => void;
}
const PAGE_SIZE = 20;
const statusColor: Record<string, string> = {
  submitted: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  reviewed:  'bg-sky-50 text-sky-700 border-sky-200',
  late:      'bg-rose-50 text-rose-700 border-rose-200',
  assigned:  'bg-amber-50 text-amber-700 border-amber-200',
  missing:   'bg-slate-100 text-slate-500 border-slate-200',
};
const statusLabel: Record<string, string> = {
  submitted: 'مُسلَّم', reviewed: 'مُصحَّح', late: 'متأخر', assigned: 'مُكلَّف', missing: 'مفقود',
};

export default function HomeworkArchiveTab({ data, onDownload, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [localData, setLocalData] = useState<Record<string, unknown>[]>(data);
  const [deleteConfirm, setDeleteConfirm] = useState<Record<string, unknown> | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useMemo(() => setLocalData(data), [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return localData.filter((h: any) => {
      if (statusFilter !== 'all' && h.status !== statusFilter) return false;
      if (!q) return true;
      return String(h.studentName ?? '').toLowerCase().includes(q) ||
             String(h.title ?? '').toLowerCase().includes(q) ||
             String(h.subject ?? '').toLowerCase().includes(q);
    });
  }, [localData, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleDelete = useCallback(async (item: Record<string, unknown>) => {
    const id = String(item.id || '');
    if (!id) { setFeedback({ ok: false, msg: 'لا يمكن حذف واجب بدون معرف' }); return; }
    setDeletingId(id);
    const [r1, r2] = await Promise.all([
      deleteArchiveItem('student_homework_logs', id),
      deleteArchiveItem('homework', id),
    ]);
    setDeletingId(null);
    setDeleteConfirm(null);
    if (r1.success || r2.success) {
      setLocalData(prev => prev.filter((h: any) => h.id !== id));
      setFeedback({ ok: true, msg: '✅ تم حذف الواجب بنجاح' });
    } else {
      setFeedback({ ok: false, msg: '❌ ' + (r1.message || r2.message) });
    }
    setTimeout(() => setFeedback(null), 4000);
    onRefresh?.();
  }, [onRefresh]);

  return (
    <div className="p-5" dir="rtl">
      {feedback && (
        <div className={`mb-3 rounded-xl px-4 py-2.5 text-xs font-black border ${feedback.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {feedback.msg}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" dir="rtl">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="font-black text-slate-900">تأكيد حذف الواجب</p>
                <p className="text-xs text-slate-500 mt-0.5">هذه العملية لا يمكن التراجع عنها</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-4">
              هل أنت متأكد من حذف واجب <strong>{String((deleteConfirm as any).title || '—')}</strong> الخاص بالطالب <strong>{String((deleteConfirm as any).studentName || '—')}</strong>؟
            </p>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteConfirm)} disabled={deletingId !== null}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-sm font-black transition cursor-pointer disabled:opacity-50">
                {deletingId ? 'جاري الحذف...' : '🗑️ حذف نهائياً'}
              </button>
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-slate-200 text-slate-700 py-2.5 rounded-xl text-sm font-black transition hover:bg-slate-50 cursor-pointer">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="ابحث بالطالب أو العنوان أو المادة..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'submitted', 'reviewed', 'assigned', 'late', 'missing'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(0); }}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black border cursor-pointer transition ${statusFilter === s ? 'bg-orange-500 text-white border-orange-400' : 'bg-white text-slate-600 border-slate-200'}`}>
              {s === 'all' ? 'الكل' : statusLabel[s] ?? s}
            </button>
          ))}
        </div>
        <span className="text-xs font-bold text-slate-500">{filtered.length} واجب</span>
        <button onClick={() => onDownload(filtered)}
          className="flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Download className="h-3.5 w-3.5" /> تصدير
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['الطالب', 'العنوان', 'المادة', 'الصفحات', 'الحالة', 'الدرجة', 'تاريخ التسليم', 'تاريخ الإنشاء', 'إجراءات'].map(h => (
                <th key={h} className="px-3 py-3 text-right text-[11px] font-black text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageData.map((h: any, i) => (
              <tr key={h.id ?? i} className="hover:bg-slate-50 transition">
                <td className="px-3 py-3 font-bold text-slate-800">{h.studentName}</td>
                <td className="px-3 py-3 text-slate-700 max-w-40 truncate">{h.title}</td>
                <td className="px-3 py-3 text-slate-600">{h.subject}</td>
                <td className="px-3 py-3 text-slate-500">
                  {h.fromPage && h.toPage ? `${h.fromPage}–${h.toPage}` : h.fromPage || '—'}
                </td>
                <td className="px-3 py-3">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${statusColor[h.status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {statusLabel[h.status] ?? h.status}
                  </span>
                </td>
                <td className="px-3 py-3 font-bold text-slate-700">{h.grade != null ? h.grade : '—'}</td>
                <td className="px-3 py-3 text-slate-400">{h.dueDate?.slice(0, 10) || '—'}</td>
                <td className="px-3 py-3 text-slate-400">{h.createdAt?.slice(0, 10) || '—'}</td>
                <td className="px-3 py-3">
                  <button onClick={() => setDeleteConfirm(h)} title="حذف" disabled={deletingId === String(h.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-2 py-1 text-[10px] font-black text-slate-500 hover:text-rose-600 cursor-pointer transition disabled:opacity-40">
                    <Trash2 className="h-3 w-3" /> حذف
                  </button>
                </td>
              </tr>
            ))}
            {pageData.length === 0 && <tr><td colSpan={9} className="py-16 text-center text-slate-400 text-sm">لا توجد واجبات</td></tr>}
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
