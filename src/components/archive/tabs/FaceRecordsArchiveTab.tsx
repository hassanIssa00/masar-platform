'use client';
import { useState, useMemo, useCallback } from 'react';
import { Download, Search, ScanFace, Fingerprint, Trash2, AlertTriangle } from 'lucide-react';
import { deleteFaceRecord } from '@/lib/archiveDelete';

interface Props {
  data: Record<string, unknown>[];
  onDownload: (d: Record<string, unknown>[]) => void;
  onRefresh?: () => void;
}
const PAGE_SIZE = 20;
const roleLabel: Record<string, string> = {
  doctor: '🩺 معالج', parent: '👨‍👩‍👧 ولي أمر',
  specialist: '🧑‍⚕️ أخصائي', teacher: '👩‍🏫 معلم', student: '🎓 طالب',
};

export default function FaceRecordsArchiveTab({ data, onDownload, onRefresh }: Props) {
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
    return localData.filter((f: any) =>
      String(f.userName ?? '').toLowerCase().includes(q) ||
      String(f.userEmail ?? '').toLowerCase().includes(q) ||
      String(f.userRole ?? '').toLowerCase().includes(q) ||
      String(f.schoolBranch ?? '').toLowerCase().includes(q)
    );
  }, [localData, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const getEmbeddingCount = (f: any): number => {
    let count = 0;
    if (Array.isArray(f.embeddings)) count += f.embeddings.length;
    if (f.poses && typeof f.poses === 'object') count += Object.keys(f.poses).length;
    if (count === 0 && Array.isArray(f.embedding) && f.embedding.length > 0) count = 1;
    return count;
  };

  const handleDelete = useCallback(async (item: Record<string, unknown>) => {
    const id = String(item.userId || item.accountId || (item as any).id || '');
    if (!id) { setFeedback({ ok: false, msg: 'لا يمكن حذف بصمة بدون معرف' }); return; }
    setDeletingId(id);
    const res = await deleteFaceRecord(id);
    setDeletingId(null);
    setDeleteConfirm(null);
    if (res.success) {
      setLocalData(prev => prev.filter((f: any) => f.userId !== id && f.accountId !== id && f.id !== id));
      setFeedback({ ok: true, msg: '✅ تم حذف بصمة الوجه بنجاح' });
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
                <p className="font-black text-slate-900">تأكيد حذف بصمة الوجه</p>
                <p className="text-xs text-slate-500 mt-0.5">سيتم إلغاء تسجيل البصمة لهذا المستخدم</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-4">
              هل أنت متأكد من حذف بصمة الوجه للمستخدم <strong>{String((deleteConfirm as any).userName || '—')}</strong>؟
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

      {/* Warning banner */}
      <div className="mb-4 rounded-xl bg-indigo-50 border border-indigo-200 p-3.5 flex items-start gap-2.5">
        <Fingerprint className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-black text-indigo-800">بيانات بيومترية حساسة</p>
          <p className="text-[11px] text-indigo-600 mt-0.5">
            يُعرض هنا عدد المتجهات البيومترية فقط — المتجهات الفعلية لا تُعرض في الواجهة لأسباب أمنية.
            عند التصدير ستحتوي ملفات JSON على البيانات الكاملة.
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="ابحث بالاسم أو الإيميل أو الدور..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none" />
        </div>
        <span className="text-xs font-bold text-slate-500">{filtered.length} بصمة وجه</span>
        <button onClick={() => onDownload(filtered)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Download className="h-3.5 w-3.5" /> تصدير (بيانات كاملة)
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pageData.map((f: any, i) => {
          const embCount = getEmbeddingCount(f);
          const fId = String(f.userId || f.accountId || f.id || i);
          return (
            <div key={fId} className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-xs relative">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-500 shadow-sm shrink-0">
                  <ScanFace className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800 text-sm truncate">{f.userName || 'مجهول'}</p>
                  {f.userEmail && <p className="text-[11px] text-slate-500 truncate">{f.userEmail}</p>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {f.userRole && (
                      <span className="text-[10px] font-black bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md">
                        {roleLabel[f.userRole] ?? f.userRole}
                      </span>
                    )}
                    {f.schoolBranch && (
                      <span className="text-[10px] font-bold bg-sky-50 border border-sky-200 text-sky-700 px-1.5 py-0.5 rounded-md">{f.schoolBranch}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setDeleteConfirm(f)}
                  title="حذف البصمة"
                  disabled={deletingId === fId}
                  className="rounded-lg bg-white/80 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Biometric count badge */}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Fingerprint className="h-4 w-4 text-indigo-500" />
                  <span className="text-xs font-black text-indigo-700">{embCount} متجه بيومتري</span>
                </div>
                {f.enrolledAt && (
                  <span className="text-[10px] text-slate-400">{String(f.enrolledAt).slice(0, 10)}</span>
                )}
              </div>

              {/* Visual bar */}
              <div className="mt-2 h-1.5 rounded-full bg-indigo-100 overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, embCount * 20)}%` }} />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {embCount >= 5 ? '✅ تسجيل ممتاز' : embCount >= 3 ? '🟡 تسجيل متوسط' : '🔴 تسجيل ضعيف'}
              </p>
            </div>
          );
        })}
        {pageData.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400">
            <ScanFace className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold">لا توجد بصمات وجه مسجّلة</p>
          </div>
        )}
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
