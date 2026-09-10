'use client';
import { useState, useMemo, useCallback } from 'react';
import { Download, Search, ScanFace, Printer, Trash2, AlertTriangle } from 'lucide-react';
import { exportStudentsCollectionPdf, exportStudentCardPdf } from '@/lib/archivePdfExport';
import { deleteArchiveItem } from '@/lib/archiveDelete';

interface Props {
  data: Record<string, unknown>[];
  classStudents: Record<string, unknown>[];
  onDownload: (d: Record<string, unknown>[]) => void;
  faceRecords: Record<string, unknown>[];
  onRefresh?: () => void;
}

const PAGE_SIZE = 20;

export default function StudentsArchiveTab({ data, classStudents, onDownload, faceRecords, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<Record<string, unknown> | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [localExtra, setLocalExtra] = useState<Set<string>>(new Set());

  const merged = useMemo(() => {
    const seen = new Set<string>();
    const all = [...data, ...classStudents];
    return all.filter((s: any) => {
      if (!s.id) return true;
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    }).filter((s: any) => !localExtra.has(String(s.id || '')));
  }, [data, classStudents, localExtra]);

  const faceSet = useMemo(() => {
    const ids = new Set<string>();
    faceRecords.forEach((f: any) => {
      if (f.userId) ids.add(f.userId);
      if (f.accountId) ids.add(f.accountId);
      if (f.studentId) ids.add(f.studentId);
    });
    return ids;
  }, [faceRecords]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter((s: any) =>
      String(s.fullName ?? '').toLowerCase().includes(q) ||
      String(s.email ?? '').toLowerCase().includes(q) ||
      String(s.nationalId ?? '').includes(q) ||
      String(s.parentName ?? '').toLowerCase().includes(q) ||
      String(s.parentPhone ?? '').includes(q)
    );
  }, [merged, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const branchLabel: Record<string, string> = { MASAR: 'مسار', IKHLAS_JEDDAH: 'الإخلاص جدة' };

  const handleDelete = useCallback(async (item: Record<string, unknown>) => {
    const id = String(item.id || '');
    if (!id) { setFeedback({ ok: false, msg: 'لا يمكن حذف طالب بدون معرف' }); return; }
    setDeletingId(id);
    // Try both collections (students and classStudents)
    const [r1, r2] = await Promise.all([
      deleteArchiveItem('students', id),
      deleteArchiveItem('class_students', id),
    ]);
    setDeletingId(null);
    setDeleteConfirm(null);
    if (r1.success || r2.success) {
      setLocalExtra(prev => new Set([...prev, id]));
      setFeedback({ ok: true, msg: '✅ تم حذف الطالب بنجاح' });
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
                <p className="font-black text-slate-900">تأكيد حذف الطالب</p>
                <p className="text-xs text-slate-500 mt-0.5">هذه العملية لا يمكن التراجع عنها</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 mb-4">
              هل أنت متأكد من حذف ملف الطالب <strong>{String((deleteConfirm as any).fullName || (deleteConfirm as any).name || '—')}</strong>؟
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

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="ابحث بالاسم أو الإيميل أو الهوية..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none" />
        </div>
        <span className="text-xs font-bold text-slate-500">{filtered.length} طالب</span>
        <button onClick={() => exportStudentsCollectionPdf(filtered)}
          className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Printer className="h-3.5 w-3.5" /> PDF الكل
        </button>
        <button onClick={() => onDownload(filtered)}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Download className="h-3.5 w-3.5" /> JSON
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['الاسم', 'الصف', 'الإيميل', 'رقم الهوية', 'الفرع', 'بصمة الوجه', 'المسار', 'تاريخ الإضافة', 'إجراءات'].map(h => (
                <th key={h} className="px-3 py-3 text-right text-[11px] font-black text-slate-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageData.map((s: any, i) => {
              const hasFace = faceSet.has(s.id || '') || faceSet.has(s.userId || '');
              return (
                <tr key={s.id ?? i} className="hover:bg-slate-50 transition">
                  <td className="px-3 py-3 font-bold text-slate-800">{s.fullName || s.name}</td>
                  <td className="px-3 py-3 text-slate-600">{s.grade || '—'}</td>
                  <td className="px-3 py-3 text-slate-500 max-w-40 truncate">{s.email || '—'}</td>
                  <td className="px-3 py-3 text-slate-600 font-mono">{s.nationalId || '—'}</td>
                  <td className="px-3 py-3">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md">
                      {branchLabel[s.schoolBranch] ?? s.schoolBranch ?? '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {hasFace ? (
                      <span className="inline-flex items-center gap-1 text-indigo-600 text-[10px] font-black">
                        <ScanFace className="h-3 w-3" /> مسجلة
                      </span>
                    ) : <span className="text-slate-300 text-[10px]">غير مسجلة</span>}
                  </td>
                  <td className="px-3 py-3 text-slate-500 max-w-28 truncate">{s.assignedProgram || '—'}</td>
                  <td className="px-3 py-3 text-slate-400">{s.createdAt?.slice(0, 10) || '—'}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => exportStudentCardPdf(s)} title="تصدير PDF"
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
              );
            })}
            {pageData.length === 0 && <tr><td colSpan={9} className="py-16 text-center text-slate-400 text-sm">لا يوجد طلاب</td></tr>}
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
