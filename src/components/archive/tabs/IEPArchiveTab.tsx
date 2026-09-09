'use client';
import { useState, useMemo } from 'react';
import { Download, Search, Brain, Target, TrendingUp } from 'lucide-react';

interface Props { data: Record<string, unknown>[]; onDownload: (d: Record<string, unknown>[]) => void; }
const PAGE_SIZE = 15;

const domainLabel: Record<string, string> = {
  academic: '📖 أكاديمي', speech: '🗣️ نطق', social: '🤝 اجتماعي',
  motor: '🖐️ حركي', cognitive: '🧠 معرفي', behavioral: '🎯 سلوكي',
};
const statusColor: Record<string, string> = {
  'not-started': 'bg-slate-100 text-slate-600 border-slate-200',
  'in-progress': 'bg-sky-50 text-sky-700 border-sky-200',
  'achieved':    'bg-emerald-50 text-emerald-700 border-emerald-200',
  'discontinued':'bg-rose-50 text-rose-700 border-rose-200',
  'active':      'bg-emerald-50 text-emerald-700 border-emerald-200',
  'draft':       'bg-amber-50 text-amber-700 border-amber-200',
  'completed':   'bg-indigo-50 text-indigo-700 border-indigo-200',
};
const statusLabel: Record<string, string> = {
  'not-started': 'لم يبدأ', 'in-progress': 'جارٍ', 'achieved': 'محقّق',
  'discontinued': 'موقوف', 'active': 'نشط', 'draft': 'مسودة', 'completed': 'مكتمل',
};

export default function IEPArchiveTab({ data, onDownload }: Props) {
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
             String(r.doctorName ?? '').toLowerCase().includes(q);
    });
  }, [data, search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="p-5" dir="rtl">
      {/* Header info */}
      <div className="mb-4 rounded-xl bg-teal-50 border border-teal-200 p-3.5 flex items-start gap-2.5">
        <Brain className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
        <p className="text-xs text-teal-700 font-medium leading-relaxed">
          <strong className="font-black">خطط التدخل الفردي (IEP)</strong> — تحتوي على الأهداف العلاجية لكل طالب
          مع التقدم المُحرَز في كل مجال (أكاديمي، نطق، سلوكي، حركي، معرفي، اجتماعي).
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="ابحث باسم الطالب أو الطبيب..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['all', 'active', 'draft', 'completed'].map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(0); }}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-black border cursor-pointer transition ${statusFilter === s ? 'bg-teal-500 text-white border-teal-400' : 'bg-white text-slate-600 border-slate-200'}`}>
              {s === 'all' ? 'الكل' : statusLabel[s] ?? s} {s === 'all' ? `(${data.length})` : ''}
            </button>
          ))}
        </div>
        <span className="text-xs font-bold text-slate-500">{filtered.length} خطة IEP</span>
        <button onClick={() => onDownload(filtered)}
          className="flex items-center gap-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Download className="h-3.5 w-3.5" /> تصدير
        </button>
      </div>

      <div className="space-y-3">
        {pageData.map((plan: any, i) => {
          const isExpanded = expandedId === (plan.id ?? i);
          const goals: any[] = Array.isArray(plan.goals) ? plan.goals : [];
          const achievedGoals = goals.filter((g: any) => g.status === 'achieved').length;
          return (
            <div key={plan.id ?? i} className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
              {/* Header */}
              <button onClick={() => setExpandedId(isExpanded ? null : (plan.id ?? i))}
                className="w-full flex items-start gap-4 p-4 text-right hover:bg-slate-50 cursor-pointer transition">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500 shrink-0">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-slate-800">{plan.studentName}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${statusColor[plan.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {statusLabel[plan.status] ?? plan.status}
                    </span>
                    {goals.length > 0 && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md">
                        <Target className="h-2.5 w-2.5 inline" /> {achievedGoals}/{goals.length} هدف
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-500">
                    {plan.doctorName && <span>🩺 {plan.doctorName}</span>}
                    {plan.startDate && <span>📅 {plan.startDate}</span>}
                    {plan.reviewDate && <span>🔄 مراجعة: {plan.reviewDate}</span>}
                  </div>
                  {/* Progress bar */}
                  {goals.length > 0 && (
                    <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${Math.round((achievedGoals / goals.length) * 100)}%` }} />
                    </div>
                  )}
                </div>
              </button>

              {/* Expanded goals */}
              {isExpanded && goals.length > 0 && (
                <div className="border-t border-slate-100 p-4 bg-slate-50">
                  {plan.strengths && (
                    <div className="mb-3 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs">
                      <p className="font-black text-emerald-800 mb-1">💪 نقاط القوة</p>
                      <p className="text-emerald-700">{plan.strengths}</p>
                    </div>
                  )}
                  {plan.challenges && (
                    <div className="mb-3 p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs">
                      <p className="font-black text-amber-800 mb-1">🎯 التحديات</p>
                      <p className="text-amber-700">{plan.challenges}</p>
                    </div>
                  )}
                  <p className="text-[11px] font-black text-slate-500 mb-2">الأهداف العلاجية ({goals.length})</p>
                  <div className="space-y-2">
                    {goals.map((g: any, gi: number) => (
                      <div key={gi} className="rounded-xl bg-white border border-slate-200 p-3 text-xs">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-600">
                              {domainLabel[g.domain] ?? g.domain}
                            </span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${statusColor[g.status] ?? 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              {statusLabel[g.status] ?? g.status}
                            </span>
                          </div>
                          {g.currentScore != null && g.baselineScore != null && (
                            <span className="text-emerald-600 font-black text-[11px] shrink-0">
                              <TrendingUp className="h-3 w-3 inline" /> {g.baselineScore}% → {g.currentScore}%
                            </span>
                          )}
                        </div>
                        <p className="text-slate-700 font-medium leading-relaxed">{g.objective}</p>
                        {g.progressNotes && <p className="text-slate-500 mt-1">📝 {g.progressNotes}</p>}
                        {g.targetDate && <p className="text-slate-400 mt-1">🗓️ الهدف: {g.targetDate}</p>}
                      </div>
                    ))}
                  </div>
                  {Array.isArray(plan.accommodations) && plan.accommodations.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[11px] font-black text-slate-500 mb-1.5">التسهيلات والتعديلات</p>
                      <div className="flex flex-wrap gap-1.5">
                        {plan.accommodations.map((a: string, ai: number) => (
                          <span key={ai} className="text-[10px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg px-2.5 py-1">{a}</span>
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
            <Brain className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold">لا توجد خطط IEP</p>
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
