'use client';
import { useState, useMemo } from 'react';
import { Download, Search, Trophy, Star, Zap } from 'lucide-react';

interface Props {
  points: Record<string, unknown>[];
  pointTransactions: Record<string, unknown>[];
  onDownload: (d: Record<string, unknown>[]) => void;
}
const PAGE_SIZE = 20;

const BADGES: Record<string, { name: string; icon: string; color: string }> = {
  'first-session': { name: 'بداية الرحلة', icon: '🌟', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  'week-streak':   { name: 'أسبوع متميز', icon: '🔥', color: 'bg-orange-50 text-orange-800 border-orange-200' },
  'goal-achiever': { name: 'محقق الأهداف', icon: '🎯', color: 'bg-teal-50 text-teal-800 border-teal-200' },
  'reading-star':  { name: 'نجم القراءة', icon: '📖', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  'speech-hero':   { name: 'بطل النطق', icon: '🎙️', color: 'bg-purple-50 text-purple-800 border-purple-200' },
  'homework-king': { name: 'ملك الواجبات', icon: '👑', color: 'bg-rose-50 text-rose-800 border-rose-200' },
  'champion':      { name: 'بطل مسار', icon: '🏆', color: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
};

const levelColor: Record<number, string> = {
  1: 'text-slate-600', 2: 'text-blue-600', 3: 'text-teal-600', 4: 'text-indigo-600', 5: 'text-amber-600',
};

export default function GamificationArchiveTab({ points, pointTransactions, onDownload }: Props) {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'leaderboard' | 'transactions'>('leaderboard');
  const [page, setPage] = useState(0);

  const filteredPoints = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...points].sort((a: any, b: any) => (Number(b.totalPoints) || 0) - (Number(a.totalPoints) || 0));
    if (!q) return sorted;
    return sorted.filter((p: any) => String(p.studentName ?? '').toLowerCase().includes(q));
  }, [points, search]);

  const filteredTx = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pointTransactions;
    return pointTransactions.filter((t: any) => String(t.studentName ?? '').toLowerCase().includes(q));
  }, [pointTransactions, search]);

  const currentData = view === 'leaderboard' ? filteredPoints : filteredTx;
  const totalPages = Math.ceil(currentData.length / PAGE_SIZE);
  const pageData = currentData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="p-5" dir="rtl">
      <div className="mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
            placeholder="ابحث باسم الطالب..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-9 pl-3 text-sm placeholder-slate-400 focus:border-sky-400 focus:outline-none" />
        </div>
        <div className="flex gap-1.5">
          {(['leaderboard', 'transactions'] as const).map(v => (
            <button key={v} onClick={() => { setView(v); setPage(0); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-black border cursor-pointer transition ${view === v ? 'bg-amber-500 text-white border-amber-400' : 'bg-white text-slate-600 border-slate-200'}`}>
              {v === 'leaderboard' ? '🏆 المتصدرون' : '⚡ المعاملات'}
            </button>
          ))}
        </div>
        <button onClick={() => onDownload(view === 'leaderboard' ? filteredPoints : filteredTx)}
          className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-3 py-2.5 text-xs font-black text-white cursor-pointer transition">
          <Download className="h-3.5 w-3.5" /> تصدير
        </button>
      </div>

      {view === 'leaderboard' ? (
        <div className="space-y-3">
          {(pageData as any[]).map((p: any, i) => {
            const rank = page * PAGE_SIZE + i + 1;
            const badges: string[] = Array.isArray(p.badges) ? p.badges : [];
            return (
              <div key={p.studentId ?? i}
                className={`rounded-2xl border p-4 flex items-center gap-4 ${rank === 1 ? 'bg-amber-50 border-amber-200' : rank === 2 ? 'bg-slate-50 border-slate-200' : rank === 3 ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
                {/* Rank */}
                <div className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center font-black text-lg ${rank <= 3 ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-800">{p.studentName}</span>
                    <span className={`text-xs font-black ${levelColor[p.level] ?? 'text-slate-600'}`}>
                      Lv.{p.level}
                    </span>
                  </div>
                  {badges.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {badges.map((b: string) => {
                        const badge = BADGES[b];
                        return badge ? (
                          <span key={b} className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${badge.color}`}>
                            {badge.icon} {badge.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-black text-amber-600">{(p.totalPoints ?? 0).toLocaleString('ar-SA')}</p>
                  <p className="text-[11px] text-slate-400">نقطة</p>
                  {p.streak > 0 && (
                    <p className="text-[11px] text-orange-500 font-bold mt-0.5">🔥 {p.streak} يوم متواصل</p>
                  )}
                </div>
              </div>
            );
          })}
          {pageData.length === 0 && (
            <div className="py-16 text-center text-slate-400">
              <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-bold">لا توجد بيانات نقاط</p>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['الطالب', 'النقاط', 'السبب', 'التاريخ'].map(h => (
                  <th key={h} className="px-3 py-3 text-right text-[11px] font-black text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(pageData as any[]).map((t: any, i) => (
                <tr key={t.id ?? i} className="hover:bg-slate-50 transition">
                  <td className="px-3 py-3 font-bold text-slate-800">{t.studentName}</td>
                  <td className="px-3 py-3">
                    <span className={`font-black text-sm flex items-center gap-1 ${t.points > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      <Zap className="h-3.5 w-3.5" />
                      {t.points > 0 ? '+' : ''}{t.points}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{t.reason}</td>
                  <td className="px-3 py-3 text-slate-400">{t.createdAt?.slice(0, 10) || '—'}</td>
                </tr>
              ))}
              {pageData.length === 0 && <tr><td colSpan={4} className="py-16 text-center text-slate-400 text-sm">لا توجد معاملات نقاط</td></tr>}
            </tbody>
          </table>
        </div>
      )}

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
