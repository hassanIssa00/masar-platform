'use client';
import { useState, useMemo } from 'react';
import { Download, Search, ClipboardCheck, Star } from 'lucide-react';

interface Props { data: Record<string, unknown>[]; onDownload: (d: Record<string, unknown>[]) => void; }
const PAGE_SIZE = 15;

const cooperationColor: Record<string, string> = {
  excellent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  good:      'bg-teal-50 text-teal-700 border-teal-200',
  fair:      'bg-amber-50 text-amber-700 border-amber-200',
  poor:      'bg-orange-50 text-orange-700 border-orange-200',
  refused:   'bg-rose-50 text-rose-700 border-rose-200',
};
const cooperationLabel: Record<string, string> = {
  excellent: '🌟 ممتاز', good: '✅ جيد', fair: '🟡 متوسط', poor: '⚠️ ضعيف', refused: '❌ رفض',
};
const statusColor: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  draft:     'bg-amber-50 text-amber-700 border-amber-200',
  reviewed:  'bg-sky-50 text-sky-700 border-sky-200',
};

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <Star key={n} className={`h-3 w-3 ${n <= value ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
  );
}

export default function SessionRecordsArchiveTab({ data, onDownload }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((r: any) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!q) return true;
      return String(r.studentName ?? '').toLowerCase().includes(q) ||
             String(r.conductedBy ?? '').toLowerCase().includes(q);
    });
  }, [data, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="p-5" dir="rtl">
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="ابحث باسم الطالب أو المعالج..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none" />
        </div>
        <div className="flex gap-1.5">
          {['all', 'completed', 'draft', 'reviewed'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(0); }}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black border cursor-pointer transition ${statusFilter === s ? 'bg-cyan-500 text-white border-cyan-400' : 'bg-white text-slate-600 border-slate-200'}`}>
              {s === 'all' ? 'الكل' : statusColor[s] ? (s === 'completed' ? 'مكتملة' : s === 'draft' ? 'مسودة' : 'مُراجَعة') : s}
            </button>
          ))}
        </div>
        <span className="text-xs font-bold text-slate-500">{filtered.length} جلسة</span>
        <button onClick={() => onDownload(filtered)}
          className="flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Download className="h-3.5 w-3.5" /> تصدير
        </button>
      </div>

      <div className="space-y-3">
        {pageData.map((s: any, i) => {
          const isExp = expandedId === (s.id ?? i);
          return (
            <div key={s.id ?? i} className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              <button onClick={() => setExpandedId(isExp ? null : (s.id ?? i))}
                className="w-full flex items-start gap-4 p-4 text-right hover:bg-slate-50 cursor-pointer transition">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-600 shrink-0">
                  <ClipboardCheck className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-slate-800">{s.studentName}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${statusColor[s.status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                      {s.status === 'completed' ? 'مكتملة' : s.status === 'draft' ? 'مسودة' : s.status}
                    </span>
                    {s.cooperation && (
                      <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${cooperationColor[s.cooperation] ?? ''}`}>
                        {cooperationLabel[s.cooperation] ?? s.cooperation}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-500">
                    {s.conductedBy && <span>🩺 {s.conductedBy}</span>}
                    {s.sessionDate && <span>📅 {s.sessionDate}</span>}
                    {s.durationMinutes && <span>⏱️ {s.durationMinutes} دقيقة</span>}
                    {s.branchName && <span>🏢 {s.branchName}</span>}
                  </div>
                  {s.overallPerformance != null && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">الأداء العام:</span>
                      <StarRating value={s.overallPerformance} />
                    </div>
                  )}
                </div>
              </button>

              {isExp && (
                <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3 text-xs">
                  {s.progressNotes && (
                    <div className="p-3 rounded-xl bg-sky-50 border border-sky-100">
                      <p className="font-black text-sky-800 mb-1">📈 ملاحظات التقدم</p>
                      <p className="text-sky-700 leading-relaxed">{s.progressNotes}</p>
                    </div>
                  )}
                  {s.challenges && (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <p className="font-black text-amber-800 mb-1">⚠️ التحديات</p>
                      <p className="text-amber-700 leading-relaxed">{s.challenges}</p>
                    </div>
                  )}
                  {s.nextSessionPlan && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                      <p className="font-black text-emerald-800 mb-1">🎯 خطة الجلسة القادمة</p>
                      <p className="text-emerald-700 leading-relaxed">{s.nextSessionPlan}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'الانتباه', value: s.attentionSpan },
                      { label: 'الدافعية', value: s.motivation },
                      { label: 'الأداء الكلي', value: s.overallPerformance },
                    ].map(({ label, value }) => value != null && (
                      <div key={label} className="rounded-xl bg-white border border-slate-200 p-2.5 text-center">
                        <p className="text-[10px] font-black text-slate-500 mb-1">{label}</p>
                        <StarRating value={value} />
                      </div>
                    ))}
                  </div>
                  {Array.isArray(s.goalsWorkedOn) && s.goalsWorkedOn.length > 0 && (
                    <div>
                      <p className="font-black text-slate-600 mb-1.5">الأهداف المُعمَل عليها</p>
                      <div className="flex flex-wrap gap-1.5">
                        {s.goalsWorkedOn.map((g: string, gi: number) => (
                          <span key={gi} className="bg-teal-50 border border-teal-200 text-teal-700 rounded-lg px-2.5 py-1 text-[10px] font-bold">{g}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(s.goalAchievements) && s.goalAchievements.length > 0 && (
                    <div>
                      <p className="font-black text-slate-600 mb-1.5">نتائج الأهداف</p>
                      <div className="space-y-1.5">
                        {s.goalAchievements.map((g: any, gi: number) => (
                          <div key={gi} className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2">
                            <span className="text-slate-700">{g.goalText}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-black text-sky-600">{g.percentage}%</span>
                              <span className={g.achieved ? 'text-emerald-500' : 'text-slate-300'}>
                                {g.achieved ? '✅' : '⏳'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {pageData.length === 0 && (
          <div className="py-16 text-center text-slate-400">
            <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold">لا توجد سجلات جلسات</p>
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
