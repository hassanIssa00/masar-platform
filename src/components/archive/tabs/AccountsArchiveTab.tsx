'use client';
import { useState, useMemo } from 'react';
import { Download, Search, ScanFace, Shield } from 'lucide-react';

interface Props {
  data: Record<string, unknown>[];
  onDownload: (d: Record<string, unknown>[]) => void;
  faceRecords: Record<string, unknown>[];
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

export default function AccountsArchiveTab({ data, onDownload, faceRecords }: Props) {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [page, setPage] = useState(0);

  const faceSet = useMemo(() => {
    const ids = new Set<string>();
    faceRecords.forEach((f: any) => { if (f.userId) ids.add(f.userId); if (f.accountId) ids.add(f.accountId); });
    return ids;
  }, [faceRecords]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((a: any) => {
      if (roleFilter !== 'all' && a.role !== roleFilter) return false;
      if (!q) return true;
      return String(a.name ?? '').toLowerCase().includes(q) ||
             String(a.email ?? '').toLowerCase().includes(q) ||
             String(a.phone ?? '').includes(q);
    });
  }, [data, search, roleFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="p-5" dir="rtl">
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
          <Download className="h-3.5 w-3.5" /> تصدير
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['الاسم', 'الدور', 'الإيميل', 'الهاتف', 'طريقة التسجيل', 'الفرع', 'بصمة الوجه', 'آخر دخول', 'تاريخ الإنشاء'].map(h => (
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
                </tr>
              );
            })}
            {pageData.length === 0 && <tr><td colSpan={9} className="py-16 text-center text-slate-400 text-sm">لا توجد حسابات</td></tr>}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40 cursor-pointer">السابق</button>
          <span className="text-xs text-slate-500">{page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold disabled:opacity-40 cursor-pointer">التالي</button>
        </div>
      )}
    </div>
  );
}
