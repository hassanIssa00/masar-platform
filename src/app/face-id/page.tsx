'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ScanFace, Users, RefreshCw, ChevronRight, ShieldCheck, ShieldOff,
  Clock, Trash2, AlertTriangle, Check, Loader2, X
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { getSession, hydrateSessionFromServer } from '@/lib/cloudStore';
import { removeFaceEnrollment, removeAllFaceEnrollments } from '@/lib/faceAuth';

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

interface ConfirmModalState {
  type: 'single' | 'all' | 'selected';
  targetRecord?: FaceRecord;
  count?: number;
}

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4500);
  };

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/face-records', { credentials: 'include' });
      if (!res.ok) throw new Error('فشل في جلب السجلات');
      const json = await res.json();
      setRecords(json.records || []);
      setSelectedIds(new Set());
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

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length && filtered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(r => r.docId)));
    }
  };

  const toggleSelectOne = (docId: string) => {
    const next = new Set(selectedIds);
    if (next.has(docId)) {
      next.delete(docId);
    } else {
      next.add(docId);
    }
    setSelectedIds(next);
  };

  // Perform deletion
  const executeDelete = async () => {
    if (!confirmModal) return;
    setIsDeleting(true);

    try {
      if (confirmModal.type === 'single' && confirmModal.targetRecord) {
        const target = confirmModal.targetRecord;
        const res = await fetch('/api/auth/face-records', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            docId: target.docId,
            userId: target.userId,
            accountId: target.accountId,
            studentId: target.studentId,
          }),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || 'تعذر حذف سجل البصمة');

        // Cleanup locally
        if (target.userId) removeFaceEnrollment(target.userId);
        if (target.accountId) removeFaceEnrollment(target.accountId);
        if (target.studentId) removeFaceEnrollment(target.studentId);

        setRecords(prev => prev.filter(r => r.docId !== target.docId));
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(target.docId);
          return next;
        });

        showToast(`تم حذف بصمة ${target.userName || 'المستخدم'} بنجاح`);
      } else if (confirmModal.type === 'all') {
        const res = await fetch('/api/auth/face-records', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ all: true }),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || 'تعذر حذف جميع السجلات');

        removeAllFaceEnrollments();
        setRecords([]);
        setSelectedIds(new Set());

        showToast('تم حذف جميع سجلات البصمة من المنصة بنجاح');
      } else if (confirmModal.type === 'selected') {
        const ids = Array.from(selectedIds);
        const selectedRecords = records.filter(r => selectedIds.has(r.docId));

        const res = await fetch('/api/auth/face-records', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ids }),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) throw new Error(json.error || 'تعذر حذف السجلات المحددة');

        // Cleanup local storage
        selectedRecords.forEach(r => {
          if (r.userId) removeFaceEnrollment(r.userId);
          if (r.accountId) removeFaceEnrollment(r.accountId);
          if (r.studentId) removeFaceEnrollment(r.studentId);
        });

        setRecords(prev => prev.filter(r => !selectedIds.has(r.docId)));
        setSelectedIds(new Set());

        showToast(`تم حذف ${ids.length} سجل بنجاح`);
      }
    } catch (err: any) {
      showToast(err?.message || 'حدث خطأ أثناء عملية الحذف', 'error');
    } finally {
      setIsDeleting(false);
      setConfirmModal(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 font-sans" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">

          {/* Floating Toast Notification */}
          {toast && (
            <div
              className={`fixed bottom-6 left-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border text-sm font-black transition-all animate-bounce ${
                toast.type === 'success'
                  ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                  : 'bg-rose-900 text-rose-100 border-rose-700'
              }`}
            >
              {toast.type === 'success' ? <Check size={18} className="text-emerald-400" /> : <AlertTriangle size={18} className="text-rose-400" />}
              <span>{toast.message}</span>
            </div>
          )}

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
                جميع المستخدمين الذين سجّلوا بصمة وجههم في المنصة وإمكانية إدارتها وحذفها
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {records.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmModal({ type: 'all', count: records.length })}
                  disabled={loading || isDeleting}
                  className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-black text-rose-700 hover:bg-rose-100 transition shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  <Trash2 size={15} />
                  <span>حذف جميع السجلات</span>
                </button>
              )}

              <button
                type="button"
                onClick={load}
                disabled={loading || isDeleting}
                className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-black text-teal-700 hover:bg-teal-100 transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                تحديث
              </button>
            </div>
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

          {/* Search & Bulk Action Bar */}
          <div className="space-y-3">
            <input
              type="search"
              placeholder="بحث باسم أو بريد أو معرّف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />

            {/* Bulk Selection Bar */}
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-rose-900 shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-200 text-xs font-black text-rose-800">
                    {selectedIds.size}
                  </span>
                  <span className="text-xs font-black">
                    تم تحديد {selectedIds.size} من أصل {filtered.length} سجل
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 px-2 py-1"
                  >
                    إلغاء التحديد
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmModal({ type: 'selected', count: selectedIds.size })}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-black text-white hover:bg-rose-700 transition shadow-xs cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>حذف السجلات المحددة ({selectedIds.size})</span>
                  </button>
                </div>
              </div>
            )}
          </div>

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
                      <th className="px-4 py-3 text-right">
                        <input
                          type="checkbox"
                          checked={filtered.length > 0 && selectedIds.size === filtered.length}
                          onChange={toggleSelectAll}
                          aria-label="تحديد الكل"
                          className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-black text-slate-500">#</th>
                      <th className="px-5 py-3 text-right text-xs font-black text-slate-500">الاسم</th>
                      <th className="px-5 py-3 text-right text-xs font-black text-slate-500">البريد</th>
                      <th className="px-5 py-3 text-right text-xs font-black text-slate-500">الدور</th>
                      <th className="px-5 py-3 text-right text-xs font-black text-slate-500">الفرع</th>
                      <th className="px-5 py-3 text-right text-xs font-black text-slate-500">تاريخ التسجيل</th>
                      <th className="px-5 py-3 text-right text-xs font-black text-slate-500">المعرّف</th>
                      <th className="px-5 py-3 text-center text-xs font-black text-slate-500">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, idx) => {
                      const isSelected = selectedIds.has(r.docId);
                      return (
                        <tr
                          key={r.docId}
                          className={`border-b border-slate-50 transition ${
                            isSelected ? 'bg-rose-50/40' : 'hover:bg-slate-50/60'
                          }`}
                        >
                          <td className="px-4 py-3.5 text-right">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectOne(r.docId)}
                              aria-label={`تحديد ${r.userName}`}
                              className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3.5 text-xs font-black text-slate-400">{idx + 1}</td>
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
                          <td className="px-5 py-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => setConfirmModal({ type: 'single', targetRecord: r })}
                              title="حذف بصمة الوجه لهذا السجل"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition text-xs font-black cursor-pointer"
                            >
                              <Trash2 size={13} />
                              <span>حذف</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between">
                <p className="text-xs font-black text-slate-500">
                  إجمالي: <span className="text-teal-700">{filtered.length}</span> مستخدم مسجّل بالبصمة
                  {search && ` (من أصل ${records.length})`}
                </p>
                {selectedIds.size > 0 && (
                  <span className="text-xs font-bold text-rose-700">
                    محدد: {selectedIds.size}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {confirmModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in" dir="rtl">
              <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 animate-scale-in">
                
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertTriangle size={24} />
                  </div>
                  <button
                    type="button"
                    onClick={() => !isDeleting && setConfirmModal(null)}
                    disabled={isDeleting}
                    className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition disabled:opacity-40 cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-900">
                    {confirmModal.type === 'all'
                      ? 'حذف جميع سجلات البصمة؟'
                      : confirmModal.type === 'selected'
                        ? `حذف السجلات المحددة (${confirmModal.count})؟`
                        : `حذف بصمة ${confirmModal.targetRecord?.userName || 'المستخدم'}؟`}
                  </h3>
                  <p className="text-sm font-bold text-slate-600 leading-relaxed">
                    {confirmModal.type === 'all' ? (
                      <>
                        تحذير هام: سيتم مسح <strong className="text-rose-600">جميع بصمات الوجه المسجلة ({records.length} سجل)</strong> من قاعدة البيانات والسحابة نهائياً. سيتعين على جميع الطلاب والمستخدمين إعادة تسجيل بصمتهم البيومترية من جديد.
                      </>
                    ) : confirmModal.type === 'selected' ? (
                      <>
                        هل أنت متأكد من حذف <strong className="text-rose-600">{confirmModal.count} سجلات بصمة محددة</strong>؟ سيتم مسح متجهات التعرف على الوجه الخاصة بهم نهائياً.
                      </>
                    ) : (
                      <>
                        سيتم مسح بيانات التعرف على بصمة الوجه للطالب/المستخدم <strong className="text-slate-900">"{confirmModal.targetRecord?.userName || confirmModal.targetRecord?.userId}"</strong> نهائياً. لن يتمكن من تسجيل الدخول أو الحضور بالبصمة حتى يتم إعادة مسح وتسجيل وجهه.
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmModal(null)}
                    disabled={isDeleting}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-black hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={executeDelete}
                    disabled={isDeleting}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-black hover:bg-rose-700 shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>جاري الحذف...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 size={15} />
                        <span>تأكيد الحذف</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
