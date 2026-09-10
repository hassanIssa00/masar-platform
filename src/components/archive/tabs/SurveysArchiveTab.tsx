'use client';
import { useState, useMemo, useCallback } from 'react';
import { Download, Search, Printer, Trash2, AlertTriangle } from 'lucide-react';
import { exportSurveyPdf, exportSurveysCollectionPdf } from '@/lib/archivePdfExport';
import { deleteArchiveItem } from '@/lib/archiveDelete';

interface Props {
  data: Record<string, unknown>[];
  onDownload: (d: Record<string, unknown>[]) => void;
  onRefresh?: () => void;
}
const PAGE_SIZE = 20;

export default function SurveysArchiveTab({ data, onDownload, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [localData, setLocalData] = useState<Record<string, unknown>[]>(data);
  const [deleteConfirm, setDeleteConfirm] = useState<Record<string, unknown> | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useMemo(() => setLocalData(data), [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return localData;
    return localData.filter((s: any) =>
      String(s.studentName ?? '').toLowerCase().includes(q) ||
      String(s.parentName ?? '').toLowerCase().includes(q) ||
      String(s.parentPhone ?? '').includes(q) ||
      String(s.grade ?? '').toLowerCase().includes(q)
    );
  }, [localData, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleDelete = useCallback(async (item: Record<string, unknown>) => {
    const id = String(item.id || '');
    if (!id) { setFeedback({ ok: false, msg: 'لا يمكن حذف عنصر بدون معرف' }); return; }
    setDeletingId(id);
    const res = await deleteArchiveItem('surveys', id);
    setDeletingId(null);
    setDeleteConfirm(null);
    if (res.success) {
      setLocalData(prev => prev.filter((s: any) => s.id !== id));
      setFeedback({ ok: true, msg: '✅ تم حذف الاستبيان بنجاح' });
    } else {
      setFeedback({ ok: false, msg: '❌ ' + res.message });
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
                <p className="font-black text-slate-900">تأكيد الحذف</p>
                <p className="text-xs text-slate-500 mt-0.5">هذه العملية لا يمكن التراجع عنها</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-4">
              هل أنت متأكد من حذف استبيان الطالب <strong>{String((deleteConfirm as any).studentName || '—')}</strong>؟
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
            placeholder="ابحث باسم الطالب أو ولي الأمر..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none" />
        </div>
        <span className="text-xs font-bold text-slate-500">{filtered.length} استبيان</span>
        <button onClick={() => exportSurveysCollectionPdf(filtered)}
          className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Printer className="h-3.5 w-3.5" /> PDF الكل
        </button>
        <button onClick={() => onDownload(filtered)}
          className="flex items-center gap-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Download className="h-3.5 w-3.5" /> JSON
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['اسم الطالب', 'الصف', 'اسم ولي الأمر', 'رقم الجوال', 'إيميل ولي الأمر', 'عدد الإجابات', 'تاريخ الإرسال', 'إجراءات'].map(h => (
                <th key={h} className="px-3 py-3 text-right text-[11px] font-black text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageData.map((s: any, i) => (
              <tr key={s.id ?? i} className="hover:bg-slate-50 transition">
                <td className="px-3 py-3 font-bold text-slate-800">{s.studentName}</td>
                <td className="px-3 py-3 text-slate-600">{s.grade}</td>
                <td className="px-3 py-3 text-slate-600">{s.parentName || '—'}</td>
                <td className="px-3 py-3 font-mono text-slate-600">{s.parentPhone || '—'}</td>
                <td className="px-3 py-3 text-slate-500 max-w-36 truncate">{s.parentEmail || '—'}</td>
                <td className="px-3 py-3 text-center">
                  <span className="font-black text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-2 py-0.5 text-[11px]">
                    {s.answers ? Object.keys(s.answers).length : 0}
                  </span>
                </td>
                <td className="px-3 py-3 text-slate-400">{s.submittedAt?.slice(0, 10) || '—'}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => exportSurveyPdf(s)} title="تصدير PDF"
                      className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 text-[10px] font-black text-rose-700 cursor-pointer transition">
                      <Printer className="h-3 w-3" /> PDF
                    </button>
                    <button onClick={() => setDeleteConfirm(s)} title="حذف" disabled={deletingId === String(s.id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-2 py-1 text-[10px] font-black text-slate-500 hover:text-rose-600 cursor-pointer transition disabled:opacity-40">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pageData.length === 0 && <tr><td colSpan={8} className="py-16 text-center text-slate-400 text-sm">لا توجد استبيانات</td></tr>}
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
