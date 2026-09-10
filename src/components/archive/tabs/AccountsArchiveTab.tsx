'use client';
import { useState, useMemo, useCallback } from 'react';
import { Download, Search, ScanFace, Printer, Trash2, AlertTriangle } from 'lucide-react';
import { exportAccountPdf } from '@/lib/archivePdfExport';
import { deleteArchiveItem } from '@/lib/archiveDelete';

interface Props {
  data: Record<string, unknown>[];
  onDownload: (d: Record<string, unknown>[]) => void;
  faceRecords: Record<string, unknown>[];
  onRefresh?: () => void;
}

const PAGE_SIZE = 20;
const roleLabel: Record<string, string> = {
  doctor: '🩺 طبيب/معالج', parent: '👨‍👩‍👧 ولي أمر',
  specialist: '🧑‍⚕️ أخصائي', teacher: '👩‍🏫 معلم', student: '🎓 طالب',
};
const roleColor: Record<string, string> = {
  doctor: 'bg-sky-50 text-sky-700 border-sky-200',
  parent: 'bg-violet-50 text-violet-700 border-violet-200',
  specialist: 'bg-amber-50 text-amber-700 border-amber-200',
  teacher: 'bg-teal-50 text-teal-700 border-teal-200',
  student: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function AccountsArchiveTab({ data, onDownload, faceRecords, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [localData, setLocalData] = useState<Record<string, unknown>[]>(data);
  const [deleteConfirm, setDeleteConfirm] = useState<Record<string, unknown> | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  useMemo(() => setLocalData(data), [data]);

  const faceSet = useMemo(() => {
    const ids = new Set<string>();
    faceRecords.forEach((f: any) => { if (f.userId) ids.add(f.userId); if (f.accountId) ids.add(f.accountId); });
    return ids;
  }, [faceRecords]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return localData.filter((a: any) => {
      if (roleFilter !== 'all' && a.role !== roleFilter) return false;
      if (!q) return true;
      return String(a.name ?? '').toLowerCase().includes(q) ||
             String(a.email ?? '').toLowerCase().includes(q) ||
             String(a.phone ?? '').includes(q);
    });
  }, [localData, search, roleFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleDelete = useCallback(async (item: Record<string, unknown>) => {
    const id = String(item.id || '');
    if (!id) { setFeedback({ ok: false, msg: 'لا يمكن حذف حساب بدون معرف' }); return; }
    setDeletingId(id);
    const res = await deleteArchiveItem('accounts', id);
    setDeletingId(null);
    setDeleteConfirm(null);
    if (res.success) {
      setLocalData(prev => prev.filter((a: any) => a.id !== id));
      setFeedback({ ok: true, msg: '✅ تم حذف الحساب بنجاح' });
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
                <p className="font-black text-slate-900">تأكيد حذف الحساب</p>
                <p className="text-xs text-rose-600 font-bold mt-0.5">⚠️ سيُحذف الحساب نهائياً ولا يمكن استرجاعه</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-4">
              هل أنت متأكد من حذف حساب <strong>{String((deleteConfirm as any).name || '—')}</strong>؟
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
            placeholder="ابحث بالاسم أو الإيميل أو الهاتف..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'doctor', 'parent', 'specialist', 'teacher', 'student'].map(r => (
            <button key={r} onClick={() => { setRoleFilter(r); setPage(0); }}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black border transition cursor-pointer ${roleFilter === r ? 'bg-sky-500 text-white border-sky-400' : 'bg-white text-slate-600 border-slate-200 hover:border-sky-200'}`}>
              {r === 'all' ? 'الكل' : roleLabel[r] ?? r}
            </button>
          ))}
        </div>
        <span className="text-xs font-bold text-slate-500">{filtered.length} حساب</span>
        <button onClick={() => onDownload(filtered)}
          className="flex items-center gap-1.5 rounded-xl bg-violet-500 hover:bg-violet-400 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Download className="h-3.5 w-3.5" /> JSON
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['الاسم', 'الدور', 'الإيميل', 'الهاتف', 'طريقة التسجيل', 'الفرع', 'بصمة الوجه', 'آخر دخول', 'تاريخ الإنشاء', 'إجراءات'].map(h => (
                <th key={h} className="px-3 py-3 text-right text-[11px] font-black text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageData.map((a: any, i) => {
              const hasFace = faceSet.has(a.id);
              return (
                <tr key={a.id ?? i} className="hover:bg-slate-50 transition">
                  <td className="px-3 py-3 font-bold text-slate-800 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {a.photoUrl && <img src={a.photoUrl} className="h-7 w-7 rounded-lg object-cover border border-slate-200" alt="" />}
                      {a.name}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${roleColor[a.role] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {roleLabel[a.role] ?? a.role}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-500 max-w-40 truncate">{a.email || '—'}</td>
                  <td className="px-3 py-3 text-slate-600">{a.phone || '—'}</td>
                  <td className="px-3 py-3 text-slate-500">{a.createdVia || '—'}</td>
                  <td className="px-3 py-3 text-slate-500">{a.schoolBranch || '—'}</td>
                  <td className="px-3 py-3 text-center">
                    {hasFace ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md">
                        <ScanFace className="h-3 w-3" /> ✅
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-slate-400">{a.lastLoginAt?.slice(0, 10) || '—'}</td>
                  <td className="px-3 py-3 text-slate-400">{a.createdAt?.slice(0, 10) || '—'}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => exportAccountPdf(a)} title="تصدير PDF"
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 text-[10px] font-black text-rose-700 cursor-pointer transition">
                        <Printer className="h-3 w-3" /> PDF
                      </button>
                      <button onClick={() => setDeleteConfirm(a)} title="حذف" disabled={deletingId === String(a.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-2 py-1 text-[10px] font-black text-slate-500 hover:text-rose-600 cursor-pointer transition disabled:opacity-40">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {pageData.length === 0 && <tr><td colSpan={10} className="py-16 text-center text-slate-400 text-sm">لا توجد حسابات</td></tr>}
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
