'use client';
import { useState, useMemo } from 'react';
import { Download, Search, ScanFace, UserCheck } from 'lucide-react';

interface Props {
  data: Record<string, unknown>[];
  classStudents: Record<string, unknown>[];
  onDownload: (d: Record<string, unknown>[]) => void;
  faceRecords: Record<string, unknown>[];
}

const PAGE_SIZE = 20;

export default function StudentsArchiveTab({ data, classStudents, onDownload, faceRecords }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const merged = useMemo(() => {
    const seen = new Set<string>();
    const all = [...data, ...classStudents];
    return all.filter((s: any) => {
      if (!s.id) return true;
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [data, classStudents]);

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

  const branchLabel: Record<string, string> = {
    MASAR: 'مسار', IKHLAS_JEDDAH: 'الإخلاص جدة',
  };

  return (
    <div className="p-5" dir="rtl">
      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="ابحث بالاسم أو الإيميل أو الهوية..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none" />
        </div>
        <span className="text-xs font-bold text-slate-500">{filtered.length} طالب</span>
        <button onClick={() => onDownload(filtered)}
          className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Download className="h-3.5 w-3.5" /> تصدير JSON
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['الاسم', 'الصف', 'الإيميل', 'رقم الهوية', 'الفرع', 'بصمة الوجه', 'المسار', 'تاريخ الإضافة'].map(h => (
                <th key={h} className="px-3 py-3 text-right text-[11px] font-black text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageData.map((s: any, i) => {
              const hasFace = faceSet.has(s.id) || faceSet.has(s.studentAccountId);
              return (
                <tr key={s.id ?? i} className="hover:bg-slate-50 transition">
                  <td className="px-3 py-3 font-bold text-slate-800 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {s.photoUrl && <img src={s.photoUrl} className="h-7 w-7 rounded-lg object-cover border border-slate-200" alt="" />}
                      <div>
                        <div>{s.fullName}</div>
                        {s.fullNameEn && <div className="text-[10px] text-slate-400">{s.fullNameEn}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{s.grade}</td>
                  <td className="px-3 py-3 text-slate-500 max-w-36 truncate">{s.email || s.linkedStudentEmail || '—'}</td>
                  <td className="px-3 py-3 font-mono text-slate-600">{s.nationalId || '—'}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${s.schoolBranch === 'IKHLAS_JEDDAH' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-sky-50 text-sky-700 border-sky-200'}`}>
                      {branchLabel[String(s.schoolBranch ?? '')] || s.schoolBranch || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {hasFace ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md">
                        <ScanFace className="h-3 w-3" /> مسجّلة
                      </span>
                    ) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-slate-600 max-w-32 truncate">{s.assignedProgram || (s.assignedPrograms?.[0]) || '—'}</td>
                  <td className="px-3 py-3 text-slate-400">{s.createdAt?.slice(0, 10) || '—'}</td>
                </tr>
              );
            })}
            {pageData.length === 0 && (
              <tr><td colSpan={8} className="py-16 text-center text-slate-400 text-sm">لا توجد نتائج</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40 cursor-pointer hover:border-sky-300">السابق</button>
          <span className="text-xs text-slate-500">{page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40 cursor-pointer hover:border-sky-300">التالي</button>
        </div>
      )}
    </div>
  );
}
