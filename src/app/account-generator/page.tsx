'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  KeyRound,
  UserPlus,
  Copy,
  Check,
  Building2,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Users,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { getAccounts, saveAccount, getSession, hydrateSessionFromServer, AccountRecord } from '@/lib/localDb';
import { pullCloudDataToLocal } from '@/lib/firestoreSync';
import { trackEvent } from '@/lib/analyticsTracker';

const GRADE_OPTIONS = [
  'الصف الأول الابتدائي',
  'الصف الثاني الابتدائي',
  'الصف الثالث الابتدائي',
  'الصف الرابع الابتدائي',
  'الصف الخامس الابتدائي',
  'الصف السادس الابتدائي',
  'الروضة / التمهيدي',
  'مرحلة متوسطة / إعدادية',
  'صعوبات التعلم',
];

type GeneratedAccountBundle = {
  studentEmail: string;
  studentPassword: string;
  parentEmail: string;
  parentPassword: string;
  branch: 'MASAR' | 'IKHLAS_JEDDAH';
  grade: string;
  generatedAt: string;
};

export default function AccountGeneratorPage() {
  const router = useRouter();
  const [branch, setBranch] = useState<'MASAR' | 'IKHLAS_JEDDAH'>('MASAR');
  const [grade, setGrade] = useState(GRADE_OPTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bundle, setBundle] = useState<GeneratedAccountBundle | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const session = getSession() ?? await hydrateSessionFromServer();
      if (!session || (session.role !== 'doctor' && session.role !== 'specialist' && session.role !== 'teacher')) {
        router.replace('/login');
        return;
      }
      if (active) {
        setAccounts(getAccounts());
        trackEvent('visit', { page: '/account-generator' });
      }
    })();

    pullCloudDataToLocal(['accounts'])
      .then(() => {
        if (active) setAccounts(getAccounts());
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [router]);

  const handleGenerate = async () => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/accounts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ branch, grade }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setError(data.error || 'تعذر توليد الحسابات على السيرفر. حدّث الصفحة وحاول مجدداً.');
        setLoading(false);
        return;
      }

      if (data.studentAccount) saveAccount(data.studentAccount);
      if (data.parentAccount) saveAccount(data.parentAccount);

      setBundle({
        branch,
        grade,
        studentEmail: data.studentAccount?.email || '',
        studentPassword: data.studentPassword || '',
        parentEmail: data.parentAccount?.email || '',
        parentPassword: data.parentPassword || '',
        generatedAt: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
      });

      setAccounts(getAccounts());
    } catch {
      setError('تعذر الاتصال بالسيرفر أثناء توليد الحسابات. تحقق من اتصالك وحاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const copyAllBundle = async () => {
    if (!bundle) return;
    const text = [
      '══ بيانات حسابات منصة مسار ══',
      `المؤسسة: ${bundle.branch === 'MASAR' ? 'منصة مسار التعليمية' : 'فصل د. إسماعيل عيسى'}`,
      `الصف الدراسي: ${bundle.grade}`,
      '--------------------------------',
      `🎓 حساب الطالب:`,
      `البريد: ${bundle.studentEmail}`,
      `كلمة المرور: ${bundle.studentPassword}`,
      '--------------------------------',
      `👨‍👩‍👦 حساب ولي الأمر:`,
      `البريد: ${bundle.parentEmail}`,
      `كلمة المرور: ${bundle.parentPassword}`,
      '--------------------------------',
      'رابط تسجيل الدخول: https://masarplatform.org/login',
    ].join('\n');

    await copyText(text, 'all');
  };

  const generatedAccounts = accounts.filter((a) => a.providerId === 'generated' || a.email.includes('@masarplatform.org'));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 font-sans" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
          {/* Header Card */}
          <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
                  <KeyRound size={24} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-teal-50 border border-teal-200 px-3 py-0.5 text-xs font-black text-teal-800">
                      بوابة د. إسماعيل عيسى
                    </span>
                  </div>
                  <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900">
                    مولد الحسابات الفوري
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm font-bold text-slate-500">
                    توليد حسابين مترابطين (طالب + ولي أمر) بكلمات مرور سحابية مؤمنة وفورية بضغطة زر واحدة.
                  </p>
                </div>
              </div>

              <Link
                href="/platform-settings?tab=users"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-100 transition shrink-0"
              >
                <Users size={16} />
                <span>إدارة كافة المستخدمين</span>
              </Link>
            </div>
          </header>

          {/* Generator Form */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Sparkles size={18} className="text-teal-600" />
                <span>خيارات الحسابات الجديدة</span>
              </h2>
              <p className="mt-1 text-xs font-bold text-slate-400">
                اختر الفرع والصف، وسيتم إنشاء حسابين مربوطين سحابياً مباشرة.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Branch Selection */}
              <div className="block space-y-2">
                <span className="block text-xs font-black text-slate-700">المؤسسة / الفرع:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBranch('MASAR')}
                    className={`p-3 rounded-2xl border text-xs font-black text-center transition-all cursor-pointer ${
                      branch === 'MASAR'
                        ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    🎯 منصة مَسَار
                  </button>
                  <button
                    type="button"
                    onClick={() => setBranch('IKHLAS_JEDDAH')}
                    className={`p-3 rounded-2xl border text-xs font-black text-center transition-all cursor-pointer ${
                      branch === 'IKHLAS_JEDDAH'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    فصل د. إسماعيل عيسى
                  </button>
                </div>
              </div>

              {/* Grade Selection */}
              <label className="block space-y-2">
                <span className="block text-xs font-black text-slate-700">الصف / المسار المبدئي:</span>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-xs sm:text-sm font-bold text-slate-900 outline-none focus:border-teal-600 focus:bg-white transition cursor-pointer"
                >
                  {GRADE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
            </div>

            {/* Information Notice */}
            <div className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4 text-xs font-bold leading-6 text-teal-900 flex items-start gap-2.5">
              <ShieldCheck size={18} className="text-teal-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black">ميزة الحسابات المولدة:</p>
                <p className="text-slate-600 mt-0.5">
                  يتم إنشاء الحسابين بدون أسماء مسبقة. عند أول تسجيل دخول للطالب أو ولي الأمر، يفتح النظام تلقائياً صفحة استكمال البيانات ليسجل الاسم ورقم الهاتف والبيانات المناسبة بنفسه.
                </p>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-bold text-rose-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <div>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-2xl bg-teal-600 px-6 py-3.5 text-sm font-black text-white shadow-md shadow-teal-600/20 hover:bg-teal-700 transition active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                <span>{loading ? 'جارٍ توليد وتشفير الحسابين...' : 'توليد حسابين وربطهما فوراً'}</span>
              </button>
            </div>

            {/* Generated Bundle Result Cards */}
            {bundle && (
              <div className="rounded-3xl border-2 border-teal-500/40 bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/60 p-6 space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-teal-200/80 pb-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-700 bg-emerald-100/80 px-3 py-1 rounded-full">
                      <Check size={14} /> تم توليد الحسابين بنجاح ({bundle.generatedAt})
                    </span>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      انسخ بيانات الدخول وأرسلها لولي الأمر أو احتفظ بها.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={copyAllBundle}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white hover:bg-teal-700 transition shadow-sm cursor-pointer shrink-0"
                  >
                    {copiedKey === 'all' ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copiedKey === 'all' ? 'تم نسخ جميع البيانات!' : 'نسخ بيانات الحسابين معاً'}</span>
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Student Account Card */}
                  <div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-black text-sky-800">
                        <GraduationCap size={16} className="text-sky-600" />
                        حساب الطالب
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(`${bundle.studentEmail}\n${bundle.studentPassword}`, 'stu')}
                        className="text-xs font-black text-sky-700 hover:text-sky-900 flex items-center gap-1 p-1 rounded-lg hover:bg-sky-50 transition"
                      >
                        {copiedKey === 'stu' ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedKey === 'stu' ? 'تم النسخ' : 'نسخ'}</span>
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400">البريد الإلكتروني:</span>
                        <p className="mt-0.5 font-mono font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 select-all" dir="ltr">
                          {bundle.studentEmail}
                        </p>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400">كلمة المرور:</span>
                        <p className="mt-0.5 font-mono font-black text-sky-700 bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 select-all" dir="ltr">
                          {bundle.studentPassword}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Parent Account Card */}
                  <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-black text-emerald-800">
                        <HeartHandshake size={16} className="text-emerald-600" />
                        حساب ولي الأمر
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(`${bundle.parentEmail}\n${bundle.parentPassword}`, 'par')}
                        className="text-xs font-black text-emerald-700 hover:text-emerald-900 flex items-center gap-1 p-1 rounded-lg hover:bg-emerald-50 transition"
                      >
                        {copiedKey === 'par' ? <Check size={13} /> : <Copy size={13} />}
                        <span>{copiedKey === 'par' ? 'تم النسخ' : 'نسخ'}</span>
                      </button>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400">البريد الإلكتروني:</span>
                        <p className="mt-0.5 font-mono font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 select-all" dir="ltr">
                          {bundle.parentEmail}
                        </p>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400">كلمة المرور:</span>
                        <p className="mt-0.5 font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 select-all" dir="ltr">
                          {bundle.parentPassword}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Recently Generated Accounts Table */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">سجل الحسابات المولدة حديثاً</h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">
                  جميع الحسابات التي تم إنشاؤها عبر هذا المولد ومحفوظة بالسحابة.
                </p>
              </div>
              <span className="text-xs font-black text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                {generatedAccounts.length} حساب
              </span>
            </div>

            {generatedAccounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-xs font-bold text-slate-400">
                لا توجد حسابات مولدة بعد. اضغط على زر &quot;توليد حسابين وربطهما&quot; أعلاه لإنشاء أول زوج.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black">
                    <tr>
                      <th className="px-4 py-3">النوع</th>
                      <th className="px-4 py-3">البريد الإلكتروني</th>
                      <th className="px-4 py-3">الفرع</th>
                      <th className="px-4 py-3">تاريخ الإنشاء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {generatedAccounts.slice(0, 15).map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                            acc.role === 'student' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {acc.role === 'student' ? 'طالب' : 'ولي أمر'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono select-all text-slate-900" dir="ltr">
                          {acc.email}
                        </td>
                        <td className="px-4 py-3">
                          {acc.schoolBranch === 'IKHLAS_JEDDAH' ? 'فصل د. إسماعيل' : 'منصة مسار'}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {acc.createdAt ? new Date(acc.createdAt).toLocaleDateString('ar-EG') : 'الآن'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

