'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ScanFace, Users, RefreshCw, ChevronRight, ShieldCheck, ShieldOff, Clock } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { getSession, hydrateSessionFromServer } from '@/lib/cloudStore';

type FaceRecord = {
  docId: string;
  userId?: string;
  accountId?: string;
  studentId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  schoolBranch?: string;
  enrolledAt?: string;
};

function roleBadge(role?: string) {
  const map: Record<string, { label: string; color: string }> = {
    doctor:     { label: 'دكتور',          color: 'bg-purple-100 text-purple-800 border-purple-200' },
    specialist: { label: 'أخصائي',         color: 'bg-blue-100 text-blue-800 border-blue-200' },
    teacher:    { label: 'معلم',           color: 'bg-amber-100 text-amber-800 border-amber-200' },
    parent:     { label: 'ولي أمر',        color: 'bg-teal-100 text-teal-800 border-teal-200' },
    student:    { label: 'طالب',           color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  };
  const m = role ? map[role] : null;
  return m ? (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black ${m.color}`}>
      {m.label}
    </span>
  ) : null;
}

function branchBadge(branch?: string) {
  if (!branch) return null;
  const isIkhlas = branch === 'IKHLAS_JEDDAH';
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black ${isIkhlas ? 'bg-indigo-100 text-indigo-800 border-indigo-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {isIkhlas ? '🏫 فصل د. إسماعيل' : '🌐 مسار'}
    </span>
  );
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16).replace('T', ' ');
  }
}

export default function FaceIdPage() {
  const router = useRouter();
  const [records, setRecords] = useState<FaceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/face-records', { credentials: 'include' });
      if (!res.ok) throw new Error('فشل في جلب السجلات');
      const json = await res.json();
      setRecords(json.records || []);
    } catch (e: any) {
      setError(e?.message || 'خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const session = getSession() ?? await hydrateSessionFromServer();
      if (cancelled) return;
      if (!session) { router.replace('/login'); return; }
      if (session.role !== 'doctor' && session.role !== 'specialist' && session.role !== 'teacher') {
        router.replace('/dashboard');
        return;
      }
      await load();
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = records.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      r.userName?.toLowerCase().includes(q) ||
      r.userEmail?.toLowerCase().includes(q) ||
      r.userId?.toLowerCase().includes(q) ||
      r.studentId?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">

          {/* Header */}
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/dashboard" className="text-xs font-black text-slate-500 hover:text-slate-700 flex items-center gap-1">
                  الرئيسية <ChevronRight size={12} className="rotate-180" />
                </Link>
                <span className="text-xs font-black text-slate-400">Face ID</span>
              </div>
              <h1 className="text-3xl font-black text-slate-950 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg">
                  <ScanFace size={22} />
                </span>
                سجلات البصمة — Face ID
              </h1>
              <p className="mt-1 text-sm font-bold text-slate-500">
                جميع المستخدمين الذين سجّلوا بصمة وجههم في المنصة
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-black text-teal-700 hover:bg-teal-100 transition disabled:opacity-50"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              تحديث
            </button>
          </header>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'إجمالي المسجلين',  value: records.length,                                          icon: Users,        color: 'text-teal-700 bg-teal-50 border-teal-200' },
              { label: 'طلاب',              value: records.filter(r => r.userRole === 'student').length,  icon: ScanFace,     color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
              { label: 'أولياء أمور',       value: records.filter(r => r.userRole === 'parent').length,   icon: ShieldCheck,  color: 'text-blue-700 bg-blue-50 border-blue-200' },
              { label: 'فصل د. إسماعيل',   value: records.filter(r => r.schoolBranch === 'IKHLAS_JEDDAH').length, icon: ShieldCheck, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`rounded-2xl border p-4 flex items-center gap-3 ${color}`}>
                <Icon size={20} />
                <div>
                  <p className="text-2xl font-black">{value}</p>
                  <p className="text-xs font-bold opacity-80">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search */}
          <input
            type="search"
            placeholder="بحث باسم أو بريد أو معرّف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />

          {/* Content */}
          {loading ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-16 shadow-sm">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
              <p className="mt-4 text-sm font-black text-slate-500">جاري جلب سجلات البصمة من Firestore...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
              <ShieldOff size={32} className="mx-auto text-rose-400 mb-3" />
              <p className="text-sm font-black text-rose-800">{error}</p>
              <button onClick={load} className="mt-4 rounded-xl bg-rose-600 text-white px-5 py-2 text-sm font-black hover:bg-rose-700 transition">إعادة المحاولة</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center shadow-sm">
              <ScanFace size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-lg font-black text-slate-700">
                {search ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد أحد مسجّل بالبصمة حتى الآن'}
              </p>
              <p className="mt-1 text-sm font-bold text-slate-400">
                {search ? 'جرّب بحثًا مختلفًا' : 'سيظهر هنا كل من يُسجّل بصمة وجهه من صفحة الطالب أو الداشبورد.'}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm" dir="rtl">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="px-5 py-3 text-right text-xs font-black text-slate-500">#</th>
                      <th className="px-5 py-3 text-right text-xs font-black text-slate-500">الاسم</th>
                      <th className="px-5 py-3 text-right text-xs font-black text-slate-500">البريد</th>
                      <th className="px-5 py-3 text-right text-xs font-black text-slate-500">الدور</th>
                      <th className="px-5 py-3 text-right text-xs font-black text-slate-500">الفرع</th>
                      <th className="px-5 py-3 text-right text-xs font-black text-slate-500">تاريخ التسجيل</th>
                      <th className="px-5 py-3 text-right text-xs font-black text-slate-500">المعرّف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, idx) => (
                      <tr
                        key={r.docId}
                        className="border-b border-slate-50 hover:bg-slate-50/60 transition"
                      >
                        <td className="px-5 py-3.5 text-xs font-black text-slate-400">{idx + 1}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                              <ScanFace size={15} />
                            </span>
                            <span className="font-black text-slate-950 text-sm">{r.userName || '—'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-xs font-bold text-slate-500 max-w-[180px] truncate">{r.userEmail || '—'}</td>
                        <td className="px-5 py-3.5">{roleBadge(r.userRole)}</td>
                        <td className="px-5 py-3.5">{branchBadge(r.schoolBranch)}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                            <Clock size={11} />
                            {formatDate(r.enrolledAt)}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-[10px] font-mono text-slate-400 max-w-[120px] truncate" title={r.userId}>
                          {r.userId?.slice(0, 12)}…
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
                <p className="text-xs font-black text-slate-500">
                  إجمالي: <span className="text-teal-700">{filtered.length}</span> مستخدم مسجّل بالبصمة
                  {search && ` (من أصل ${records.length})`}
                </p>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
