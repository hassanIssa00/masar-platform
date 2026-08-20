'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, BarChart3, CheckCircle2,
  ChevronLeft, Database, Download, Eye, Globe, Globe2,
  Laptop, Loader2, Lock, LogIn, Monitor, RefreshCw,
  Settings2, Shield, ShieldAlert, Smartphone, Tablet,
  Trash2, TrendingUp, Upload, UserCheck, UserMinus,
  UserPlus, Users, Wifi, XCircle, ToggleLeft, ToggleRight,
  Calendar, Clock, Activity as ActivityIcon, Copy,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  fetchAnalyticsSummary, subscribeToRecentEvents,
  getPlatformConfig, savePlatformConfig,
  trackEvent,
  type AnalyticsSummary, type AnalyticsEvent, type PlatformConfig, DEFAULT_CONFIG,
} from '@/lib/analyticsTracker';
import { getAccounts, getStudents, getReports, getSurveys, saveAccount, type AccountRecord } from '@/lib/localDb';
import { deleteDocFromCloud, pullServerSnapshotToLocal } from '@/lib/firestoreSync';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/* ── Seed accounts (only doctor admin account) ── */
const SEED_ACCOUNTS: AccountRecord[] = [
  {
    id: 'acc_doc_main',
    name: 'د. إسماعيل عيسى',
    email: 'ismail@masarplatform.com',
    phone: '+966500000001',
    role: 'doctor',
    schoolBranch: 'MASAR',
    createdAt: new Date().toISOString(),
  },
];

async function loadAllAccounts(): Promise<AccountRecord[]> {
  await pullServerSnapshotToLocal();

  // 1. Local storage accounts
  const localAccounts = getAccounts();

  // 2. Try Firestore accounts
  let cloudAccounts: AccountRecord[] = [];
  try {
    type QSnap = Awaited<ReturnType<typeof getDocs>>;
    const snapResult = await Promise.race([
      getDocs(collection(db, 'accounts')).then((s) => s as QSnap),
      new Promise<null>((r) => setTimeout(() => r(null), 1500)),
    ]);
    if (snapResult && typeof snapResult === 'object' && 'docs' in snapResult) {
      cloudAccounts = snapResult.docs.map(
        (d) => ({ id: d.id, ...(d.data() as Omit<AccountRecord, 'id'>) }) as AccountRecord
      );
    }
  } catch {}


  // 3. Merge: cloud + local + seed (deduplicate by email)
  const map = new Map<string, AccountRecord>();
  [...SEED_ACCOUNTS, ...localAccounts, ...cloudAccounts].forEach((a) => {
    const key = a.email?.toLowerCase() || a.id;
    if (!map.has(key)) map.set(key, a);
    else {
      // prefer cloud/local over seed
      if (a.id !== map.get(key)?.id) map.set(key, a);
    }
  });

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/* ══════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════ */
function pct(val: number, total: number) {
  if (!total) return 0;
  return Math.round((val / total) * 100);
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ar-SA', {
    hour: '2-digit', minute: '2-digit',
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
}

const EVENT_LABEL: Record<string, string> = {
  visit: 'زيارة صفحة', login: 'تسجيل دخول',
  register: 'تسجيل جديد', logout: 'خروج', login_failed: 'دخول فاشل',
};
const EVENT_COLOR: Record<string, string> = {
  visit: 'bg-sky-100 text-sky-700', login: 'bg-emerald-100 text-emerald-700',
  register: 'bg-violet-100 text-violet-700', logout: 'bg-slate-100 text-slate-500',
  login_failed: 'bg-rose-100 text-rose-700',
};
const ROLE_LABEL: Record<string, string> = {
  doctor: 'دكتور', parent: 'ولي أمر', specialist: 'أخصائي',
  student: 'طالب', teacher: 'معلم',
};
const DEVICE_ICON: Record<string, React.ElementType> = {
  mobile: Smartphone, tablet: Tablet, desktop: Monitor,
};
const DEVICE_LABEL: Record<string, string> = {
  mobile: 'موبايل', tablet: 'تابلت', desktop: 'كمبيوتر',
};

const GENERATOR_GRADE_OPTIONS = [
  'الصف الأول الابتدائي',
  'الصف الثاني الابتدائي',
  'الصف الثالث الابتدائي',
  'الصف الرابع الابتدائي',
  'الصف الخامس الابتدائي',
  'الصف السادس الابتدائي',
  'الروضة / التمهيدي',
  'صعوبات التعلم',
  'برنامج التهجي البسيط',
  'فصل د. إسماعيل عيسى',
];

/* ══════════════════════════════════════════════
   COUNTING ANIMATION
══════════════════════════════════════════════ */
function useCountUp(target: number, duration = 900) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!target) { setVal(0); return; }
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return val;
}

/* ══════════════════════════════════════════════
   SVG AREA CHART — Weekly Trend
══════════════════════════════════════════════ */
function WeeklyChart({ data }: { data: { date: string; visits: number; logins: number }[] }) {
  const W = 560, H = 120, PAD = 8;
  const maxVal = Math.max(...data.map((d) => Math.max(d.visits, d.logins)), 1);

  const toX = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const toY = (v: number) => H - PAD - (v / maxVal) * (H - PAD * 2);

  const polyline = (key: 'visits' | 'logins') =>
    data.map((d, i) => `${toX(i)},${toY(d[key])}`).join(' ');

  const area = (key: 'visits' | 'logins') =>
    `M ${toX(0)},${H} L ${data.map((d, i) => `${toX(i)},${toY(d[key])}`).join(' L ')} L ${toX(data.length - 1)},${H} Z`;

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grid lines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={PAD + f * (H - PAD * 2)} y2={PAD + f * (H - PAD * 2)}
            stroke="#e2e8f0" strokeWidth="1" />
        ))}
        {/* areas */}
        <path d={area('visits')} fill="url(#gv)" />
        <path d={area('logins')} fill="url(#gl)" />
        {/* lines */}
        <polyline points={polyline('visits')} fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinejoin="round" />
        <polyline points={polyline('logins')} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" />
        {/* dots + date labels */}
        {data.map((d, i) => (
          <g key={i}>
            <circle cx={toX(i)} cy={toY(d.visits)} r="3.5" fill="#0ea5e9" />
            <circle cx={toX(i)} cy={toY(d.logins)} r="3.5" fill="#10b981" />
            <text x={toX(i)} y={H - 1} textAnchor="middle" fontSize="9" fill="#94a3b8">{formatDate(d.date)}</text>
          </g>
        ))}
      </svg>
      <div className="flex items-center justify-center gap-6 mt-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <span className="inline-block h-2 w-6 rounded bg-sky-400" /> زيارات
        </span>
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
          <span className="inline-block h-2 w-6 rounded bg-emerald-400" /> دخول
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   SVG DONUT CHART — Device Breakdown
══════════════════════════════════════════════ */
function DonutChart({ mobile, tablet, desktop }: { mobile: number; tablet: number; desktop: number }) {
  const total = mobile + tablet + desktop || 1;
  const segments = [
    { label: 'موبايل', val: mobile, color: '#8b5cf6' },
    { label: 'تابلت', val: tablet, color: '#f59e0b' },
    { label: 'كمبيوتر', val: desktop, color: '#14b8a6' },
  ];
  const R = 48, CX = 64, CY = 64, stroke = 22;
  let cumAngle = -Math.PI / 2;

  return (
    <div className="flex items-center gap-6">
      <svg width="128" height="128" viewBox="0 0 128 128">
        {segments.map((seg) => {
          const frac = seg.val / total;
          const angle = frac * 2 * Math.PI;
          const x1 = CX + R * Math.cos(cumAngle);
          const y1 = CY + R * Math.sin(cumAngle);
          cumAngle += angle;
          const x2 = CX + R * Math.cos(cumAngle);
          const y2 = CY + R * Math.sin(cumAngle);
          const large = angle > Math.PI ? 1 : 0;
          return (
            <path
              key={seg.label}
              d={`M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`}
              fill={seg.color}
              opacity={0.85}
            />
          );
        })}
        <circle cx={CX} cy={CY} r={R - stroke} fill="white" />
        <text x={CX} y={CY + 5} textAnchor="middle" fontSize="14" fontWeight="900" fill="#0f172a">
          {total}
        </text>
      </svg>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="text-xs font-bold text-slate-600">{seg.label}</span>
            <span className="text-xs font-black text-slate-900">{seg.val}</span>
            <span className="text-xs text-slate-400">({pct(seg.val, total)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   HOURLY BAR CHART
══════════════════════════════════════════════ */
function HourlyBar({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <div className="space-y-1.5">
      <div className="flex items-end gap-px h-16">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <div
              title={`${i}:00 — ${v} دخول`}
              className="w-full rounded-sm transition-all duration-700"
              style={{
                height: `${Math.max(pct(v, max), v ? 8 : 0)}%`,
                background: v ? `hsl(168 ${40 + pct(v, max) * 0.6}% 45%)` : '#e2e8f0',
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] font-bold text-slate-400 px-0.5">
        <span>12ص</span><span>3ص</span><span>6ص</span><span>9ص</span>
        <span>12م</span><span>3م</span><span>6م</span><span>9م</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   STAT CARD with count-up
══════════════════════════════════════════════ */
function StatCard({ label, value, today, icon: Icon, color, todayLabel = 'اليوم' }: {
  label: string; value: number; today?: number;
  icon: React.ElementType; color: string; todayLabel?: string;
}) {
  const animated = useCountUp(value);
  const animatedToday = useCountUp(today ?? 0);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className={`absolute -top-6 -left-6 h-24 w-24 rounded-full opacity-10 ${color}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p className="mt-1.5 text-4xl font-black text-slate-900 tabular-nums">{animated.toLocaleString()}</p>
          {today !== undefined && (
            <p className="mt-1 text-xs font-black text-slate-500">
              <span className="text-emerald-600">+{animatedToday}</span> {todayLabel}
            </p>
          )}
        </div>
        <span className={`grid h-12 w-12 place-items-center rounded-2xl text-white shadow-sm ${color}`}>
          <Icon size={22} />
        </span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PROGRESS BAR
══════════════════════════════════════════════ */
function ProgressBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const p = pct(value, total);
  return (
    <div>
      <div className="mb-1 flex justify-between">
        <span className="text-xs font-black text-slate-700">{label}</span>
        <span className="text-xs font-black text-slate-400">{value} ({p}%)</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   TOGGLE SWITCH
══════════════════════════════════════════════ */
function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void;
  label: string; description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
      <div>
        <p className="text-sm font-black text-slate-800">{label}</p>
        {description && <p className="text-xs font-bold text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        dir="ltr"
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 transition-colors duration-200 ${
          checked ? 'bg-teal-600 justify-end' : 'bg-slate-300 justify-start'
        }`}
      >
        <span className="h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200" />
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════
   TABS
══════════════════════════════════════════════ */
type Tab = 'overview' | 'users' | 'config' | 'security' | 'data';

type GeneratedAccountBundle = {
  studentEmail: string;
  studentPassword: string;
  parentEmail: string;
  parentPassword: string;
  branch: 'MASAR' | 'IKHLAS_JEDDAH';
  grade: string;
};

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'نظرة عامة', icon: BarChart3 },
  { id: 'users', label: 'المستخدمون', icon: Users },
  { id: 'config', label: 'إعدادات المنصة', icon: Settings2 },
  { id: 'security', label: 'الأمان', icon: Shield },
  { id: 'data', label: 'إدارة البيانات', icon: Database },
];

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function PlatformSettingsPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [liveEvents, setLiveEvents] = useState<AnalyticsEvent[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [config, setConfig] = useState<PlatformConfig>(DEFAULT_CONFIG);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [clearStatus, setClearStatus] = useState<Record<string, 'idle' | 'loading' | 'done'>>({});
  const [exportStatus, setExportStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [generatorBranch, setGeneratorBranch] = useState<'MASAR' | 'IKHLAS_JEDDAH'>('MASAR');
  const [generatorGrade, setGeneratorGrade] = useState(GENERATOR_GRADE_OPTIONS[0]);
  const [generatedBundle, setGeneratedBundle] = useState<GeneratedAccountBundle | null>(null);
  const [generatorError, setGeneratorError] = useState('');
  const unsubRef = useRef<(() => void) | null>(null);

  /* ── Load data ─────────────────────────── */
  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const [sum, cfg, allAccs] = await Promise.all([
        fetchAnalyticsSummary(),
        getPlatformConfig(),
        loadAllAccounts(),
      ]);
      setSummary(sum);
      setConfig(cfg);
      setAccounts(allAccs);
    } catch (e) {
      console.warn('Error loading platform settings:', e);
      // Fallback: at minimum show seed accounts
      setAccounts(SEED_ACCOUNTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    if (requestedTab === 'users') setTab('users');
    loadSummary();
    // Track this visit
    trackEvent('visit', { page: '/platform-settings' });
    // Realtime feed
    unsubRef.current = subscribeToRecentEvents(setLiveEvents);
    return () => { unsubRef.current?.(); };
  }, [loadSummary]);

  /* ── Save config ───────────────────────── */
  const handleSaveConfig = async () => {
    setConfigSaving(true);
    await savePlatformConfig(config);
    setConfigSaving(false);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
  };

  /* ── Export JSON ───────────────────────── */
  const handleExport = async () => {
    setExportStatus('loading');
    const students = getStudents();
    const reports = getReports();
    const surveys = getSurveys();
    const blob = new Blob([JSON.stringify({ students, reports, surveys, accounts, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `masar-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
    setExportStatus('done');
    setTimeout(() => setExportStatus('idle'), 3000);
  };

  /* ── Clear collection ──────────────────── */
  const handleClear = async (colName: string) => {
    setClearStatus((s) => ({ ...s, [colName]: 'loading' }));
    const snap = await getDocs(collection(db, colName));
    for (const d of snap.docs) await deleteDoc(doc(db, colName, d.id));
    // Also clear localStorage keys
    const keyMap: Record<string, string> = {
      students: 'masar.students.v1', reports: 'masar.reports.v1',
      surveys: 'masar.surveys.v1', activities: 'masar.activity.v1',
      messages: 'masar.messages.v1', platform_analytics: '',
    };
    if (keyMap[colName]) localStorage.removeItem(keyMap[colName]);
    setClearStatus((s) => ({ ...s, [colName]: 'done' }));
    setTimeout(() => setClearStatus((s) => ({ ...s, [colName]: 'idle' })), 3000);
    await loadSummary();
  };

  const handleGenerateAccounts = async () => {
    setGeneratorError('');

    try {
      const res = await fetch('/api/accounts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ branch: generatorBranch, grade: generatorGrade }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setGeneratorError(data.error || 'تعذر توليد الحسابات على السحابة. راجع إعداد Firebase Admin في السيرفر.');
        return;
      }

      saveAccount(data.studentAccount);
      saveAccount(data.parentAccount);

      setGeneratedBundle({
        branch: generatorBranch,
        grade: generatorGrade,
        studentEmail: data.studentAccount.email,
        studentPassword: data.studentPassword,
        parentEmail: data.parentAccount.email,
        parentPassword: data.parentPassword,
      });
      await loadSummary();
    } catch {
      setGeneratorError('تعذر الاتصال بالسيرفر أثناء توليد الحسابات. لم يتم إنشاء حساب محلي غير متزامن.');
    }
  };

  const copyGeneratedBundle = async () => {
    if (!generatedBundle) return;
    const text = [
      'بيانات دخول حسابات منصة مسار',
      `النظام: ${generatedBundle.branch === 'MASAR' ? 'منصة مسار' : 'فصل د. إسماعيل عيسى'}`,
      `الصف/المسار المبدئي: ${generatedBundle.grade}`,
      `حساب الطالب: ${generatedBundle.studentEmail}`,
      `كلمة مرور الطالب: ${generatedBundle.studentPassword}`,
      `حساب ولي الأمر: ${generatedBundle.parentEmail}`,
      `كلمة مرور ولي الأمر: ${generatedBundle.parentPassword}`,
    ].join('\n');
    await navigator.clipboard.writeText(text);
  };

  const filteredAccounts = roleFilter === 'all'
    ? accounts
    : accounts.filter((a) => a.role === roleFilter);

  const SECURITY_TYPES = new Set(['login', 'login_google', 'login_apple', 'login_microsoft', 'login_face', 'login_failed', 'logout']);
  const securityEvents = liveEvents.filter((e) => SECURITY_TYPES.has(e.type));

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* ── Header ─────────────────────────── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-slate-100">
              <div>
                <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-600 text-white">
                    <Settings2 size={18} />
                  </span>
                  إعدادات المنصة
                </h1>
                <p className="text-xs font-bold text-slate-400 mt-0.5">لوحة تحكم شاملة — إحصائيات · مستخدمون · إعدادات · أمان · بيانات</p>
              </div>
              <button onClick={loadSummary} disabled={loading}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50 transition shadow-xs disabled:opacity-50">
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                تحديث
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 whitespace-nowrap px-4 py-2 text-sm font-black border-b-2 transition-colors duration-200 ${
                    tab === t.id
                      ? 'border-teal-600 text-teal-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}>
                  <t.icon size={16} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">

            {loading && (
              <div className="grid place-items-center py-24">
                <Loader2 className="animate-spin text-teal-600" size={36} />
                <p className="mt-3 text-sm font-black text-slate-500">جاري تحميل البيانات...</p>
              </div>
            )}

            {/* ════════════════════════════════
                TAB: OVERVIEW
            ════════════════════════════════ */}
            {!loading && tab === 'overview' && summary && (
              <div className="space-y-6">

                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="إجمالي الزيارات" value={summary.totalVisits} today={summary.todayVisits} icon={Eye} color="bg-sky-500" />
                  <StatCard label="تسجيل الدخول" value={summary.totalLogins} today={summary.todayLogins} icon={LogIn} color="bg-emerald-600" />
                  <StatCard label="حسابات مسجلة" value={accounts.length} today={summary.todayRegistrations} icon={UserPlus} color="bg-violet-600" />
                  <StatCard label="محاولات فاشلة" value={summary.totalFailedLogins} icon={ShieldAlert} color="bg-rose-500" />
                </div>

                {/* Weekly + Donut */}
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <p className="font-black text-slate-800 mb-4 flex items-center gap-2">
                      <TrendingUp size={18} className="text-sky-500" /> اتجاه آخر 7 أيام
                    </p>
                    <WeeklyChart data={summary.weeklyTrend} />
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <p className="font-black text-slate-800 mb-4 flex items-center gap-2">
                      <Smartphone size={18} className="text-violet-500" /> توزيع الأجهزة
                    </p>
                    <DonutChart {...summary.deviceBreakdown} />
                  </div>
                </div>

                {/* Hourly + OS + Browser */}
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <p className="font-black text-slate-800 mb-4 flex items-center gap-2">
                      <Clock size={18} className="text-teal-600" /> الدخول بالساعة (اليوم)
                    </p>
                    <HourlyBar data={summary.hourlyLogins} />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <p className="font-black text-slate-800 mb-4 flex items-center gap-2">
                      <Laptop size={18} className="text-amber-500" /> أنظمة التشغيل
                    </p>
                    <div className="space-y-3">
                      {Object.entries(summary.osBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([os, count]) => (
                        <ProgressBar key={os} label={os} value={count}
                          total={Object.values(summary.osBreakdown).reduce((a, b) => a + b, 0)}
                          color="bg-amber-400" />
                      ))}
                      {Object.keys(summary.osBreakdown).length === 0 && (
                        <p className="text-xs text-slate-400 font-bold">لا توجد بيانات بعد</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                    <p className="font-black text-slate-800 mb-4 flex items-center gap-2">
                      <Globe2 size={18} className="text-sky-500" /> المتصفحات
                    </p>
                    <div className="space-y-3">
                      {Object.entries(summary.browserBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([br, count]) => (
                        <ProgressBar key={br} label={br} value={count}
                          total={Object.values(summary.browserBreakdown).reduce((a, b) => a + b, 0)}
                          color="bg-sky-400" />
                      ))}
                      {Object.keys(summary.browserBreakdown).length === 0 && (
                        <p className="text-xs text-slate-400 font-bold">لا توجد بيانات بعد</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Live Events Feed */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-black text-slate-800 flex items-center gap-2">
                      <ActivityIcon size={18} className="text-indigo-500" />
                      سجل الأحداث المباشر
                      <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    </p>
                    <span className="text-xs font-bold text-slate-400">{liveEvents.length} حدث</span>
                  </div>
                  {liveEvents.length === 0 ? (
                    <div className="py-10 text-center">
                      <Wifi className="mx-auto mb-2 text-slate-200" size={36} />
                      <p className="text-sm font-black text-slate-400">في انتظار الأحداث...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-sm min-w-[600px]">
                        <thead>
                          <tr className="border-b border-slate-100">
                            {['الحدث', 'المستخدم', 'الدور', 'الجهاز', 'النظام', 'المتصفح', 'الوقت'].map((h) => (
                              <th key={h} className="pb-2.5 text-[11px] font-black text-slate-400">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {liveEvents.map((ev, i) => {
                            const DevIcon = DEVICE_ICON[ev.device] ?? Monitor;
                            return (
                              <tr key={ev.id ?? i} className="hover:bg-slate-50 transition">
                                <td className="py-2.5">
                                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${EVENT_COLOR[ev.type] ?? 'bg-slate-100 text-slate-500'}`}>
                                    {EVENT_LABEL[ev.type] ?? ev.type}
                                  </span>
                                </td>
                                <td className="py-2.5 text-xs font-black text-slate-700">{ev.userName || '—'}</td>
                                <td className="py-2.5 text-xs font-bold text-slate-500">{ev.userRole ? ROLE_LABEL[ev.userRole] : '—'}</td>
                                <td className="py-2.5">
                                  <div className="flex items-center gap-1 text-xs font-bold text-slate-600">
                                    <DevIcon size={13} /> {DEVICE_LABEL[ev.device]}
                                  </div>
                                </td>
                                <td className="py-2.5 text-xs font-bold text-slate-500">{ev.os}</td>
                                <td className="py-2.5 text-xs font-bold text-slate-500">{ev.browser}</td>
                                <td className="py-2.5 text-[11px] text-slate-400 whitespace-nowrap">{formatDateTime(ev.createdAt)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════════════════════════════
                TAB: USERS
            ════════════════════════════════ */}
            {!loading && tab === 'users' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-teal-200 bg-white p-5 shadow-xs">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-slate-900 flex items-center gap-2">
                        <UserCheck size={18} className="text-teal-600" />
                        مولد حسابات الطالب وولي الأمر
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        ينشئ حساب طالب وحساب ولي أمر بكلمات مرور مؤقتة، ويضيف الطالب للفرع الصحيح.
                      </p>
                    </div>
                    {generatedBundle && (
                      <button
                        onClick={copyGeneratedBundle}
                        className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-black text-teal-800 hover:bg-teal-100 transition"
                      >
                        <Copy size={14} /> نسخ بيانات آخر حساب
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-black text-slate-500">النظام</span>
                      <select
                        value={generatorBranch}
                        onChange={(e) => setGeneratorBranch(e.target.value as 'MASAR' | 'IKHLAS_JEDDAH')}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-black text-slate-800 outline-none focus:border-teal-500"
                      >
                        <option value="MASAR">منصة مسار</option>
                        <option value="IKHLAS_JEDDAH">فصل د. إسماعيل عيسى</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-black text-slate-500">الصف</span>
                      <select
                        value={generatorGrade}
                        onChange={(e) => setGeneratorGrade(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-teal-500"
                      >
                        {GENERATOR_GRADE_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold leading-6 text-slate-600">
                      سيتم توليد حساب طالب وحساب ولي أمر بدون أسماء. عند أول دخول يملأ كل مستخدم بياناته بنفسه.
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleGenerateAccounts}
                      className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-teal-700 transition"
                    >
                      <UserPlus size={16} /> توليد حسابين وربطهما
                    </button>
                    <p className="text-xs font-bold text-slate-500">
                      أول دخول للحسابات المولدة يمر على نفس مسار استكمال البيانات. استخدم البريد المولد نفسه في صفحة "نسيت كلمة المرور" عند الحاجة.
                    </p>
                  </div>

                  {generatorError && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-black leading-6 text-rose-700">
                      {generatorError}
                    </div>
                  )}

                  {generatedBundle && (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                        <p className="text-xs font-black text-sky-800">حساب الطالب</p>
                        <p className="mt-2 font-mono text-sm font-black text-slate-900" dir="ltr">{generatedBundle.studentEmail}</p>
                        <p className="mt-1 font-mono text-sm font-black text-sky-800" dir="ltr">{generatedBundle.studentPassword}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-xs font-black text-emerald-800">حساب ولي الأمر</p>
                        <p className="mt-2 font-mono text-sm font-black text-slate-900" dir="ltr">{generatedBundle.parentEmail}</p>
                        <p className="mt-1 font-mono text-sm font-black text-emerald-800" dir="ltr">{generatedBundle.parentPassword}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* filter bar */}
                <div className="flex flex-wrap items-center gap-2">
                  {['all', 'doctor', 'parent', 'specialist', 'student', 'teacher'].map((r) => (
                    <button key={r} onClick={() => setRoleFilter(r)}
                      className={`rounded-xl px-4 py-1.5 text-xs font-black transition border ${
                        roleFilter === r
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
                      }`}>
                      {r === 'all' ? 'الكل' : ROLE_LABEL[r]}
                    </button>
                  ))}
                  <span className="mr-auto text-xs font-bold text-slate-400">{filteredAccounts.length} حساب</span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  {filteredAccounts.length === 0 ? (
                    <div className="py-16 text-center">
                      <Users className="mx-auto mb-2 text-slate-200" size={36} />
                      <p className="text-sm font-black text-slate-400">لا توجد حسابات</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            {['الاسم', 'البريد الإلكتروني', 'الدور', 'تاريخ التسجيل', 'إجراءات'].map((h) => (
                              <th key={h} className="px-4 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredAccounts.map((acc) => (
                            <tr key={acc.id} className="hover:bg-slate-50 transition">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700 text-sm font-black shrink-0">
                                    {acc.name?.[0] ?? '?'}
                                  </span>
                                  <span className="font-black text-slate-800">{acc.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-xs font-bold text-slate-500">{acc.email}</td>
                              <td className="px-4 py-3">
                                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                                  acc.role === 'doctor' ? 'bg-teal-100 text-teal-700' :
                                  acc.role === 'parent' ? 'bg-sky-100 text-sky-700' :
                                  acc.role === 'specialist' ? 'bg-violet-100 text-violet-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {ROLE_LABEL[acc.role] ?? acc.role}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                                {acc.createdAt ? formatDateTime(acc.createdAt) : '—'}
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  onClick={async () => {
                                    if (!confirm(`هل تريد حذف حساب "${acc.name}"؟`)) return;
                                    await deleteDocFromCloud('accounts', acc.id);
                                    setAccounts((prev) => prev.filter((a) => a.id !== acc.id));
                                  }}
                                  className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] font-black text-rose-700 hover:bg-rose-100 transition"
                                >
                                  <UserMinus size={12} /> حذف
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════════════════════════════
                TAB: CONFIG
            ════════════════════════════════ */}
            {!loading && tab === 'config' && (
              <div className="grid gap-4 lg:grid-cols-2">

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-1">
                  <p className="font-black text-slate-800 mb-3">🔧 التحكم في الميزات</p>
                  <Toggle checked={!config.maintenanceMode} label="المنصة مفعّلة" description="إيقاف التشغيل يضع المنصة في وضع الصيانة"
                    onChange={(v) => setConfig((c) => ({ ...c, maintenanceMode: !v }))} />
                  <Toggle checked={config.allowRegistrations} label="السماح بالتسجيل الجديد" description="إيقافه يمنع إنشاء حسابات جديدة"
                    onChange={(v) => setConfig((c) => ({ ...c, allowRegistrations: v }))} />
                  <Toggle checked={config.whiteboardEnabled} label="السبورة التفاعلية"
                    onChange={(v) => setConfig((c) => ({ ...c, whiteboardEnabled: v }))} />
                  <Toggle checked={config.gamesEnabled} label="ألعاب الطلاب"
                    onChange={(v) => setConfig((c) => ({ ...c, gamesEnabled: v }))} />
                  <Toggle checked={config.surveysEnabled} label="الاستبيانات"
                    onChange={(v) => setConfig((c) => ({ ...c, surveysEnabled: v }))} />
                  <Toggle checked={config.reportsEnabled} label="التقارير السريرية"
                    onChange={(v) => setConfig((c) => ({ ...c, reportsEnabled: v }))} />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
                  <p className="font-black text-slate-800 mb-3">⚙️ الإعدادات الرقمية</p>

                  <div>
                    <label className="text-xs font-black text-slate-600 mb-1 block">الحد الأقصى للطلاب لكل دكتور</label>
                    <input type="number" min={1} max={500} value={config.maxStudentsPerDoctor}
                      onChange={(e) => setConfig((c) => ({ ...c, maxStudentsPerDoctor: +e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition" />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-600 mb-1 block">مهلة انتهاء الجلسة (دقيقة)</label>
                    <input type="number" min={5} max={480} value={config.sessionTimeoutMinutes}
                      onChange={(e) => setConfig((c) => ({ ...c, sessionTimeoutMinutes: +e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition" />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-600 mb-1 block">رسالة الترحيب</label>
                    <textarea rows={3} value={config.welcomeMessage}
                      onChange={(e) => setConfig((c) => ({ ...c, welcomeMessage: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 resize-none transition" />
                  </div>
                </div>

                <div className="lg:col-span-2 flex justify-end">
                  <button onClick={handleSaveConfig} disabled={configSaving}
                    className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-black text-white hover:bg-teal-700 transition shadow-sm disabled:opacity-60">
                    {configSaving ? <Loader2 size={16} className="animate-spin" /> : configSaved ? <CheckCircle2 size={16} /> : <Settings2 size={16} />}
                    {configSaving ? 'جاري الحفظ...' : configSaved ? 'تم الحفظ ✓' : 'حفظ الإعدادات'}
                  </button>
                </div>
              </div>
            )}

            {/* ════════════════════════════════
                TAB: SECURITY
            ════════════════════════════════ */}
            {!loading && tab === 'security' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-2xl border bg-white p-4 shadow-xs text-center">
                    <p className="text-3xl font-black text-emerald-600">{liveEvents.filter(e => e.type === 'login').length}</p>
                    <p className="text-xs font-black text-slate-500 mt-1">دخول ناجح</p>
                  </div>
                  <div className="rounded-2xl border bg-white p-4 shadow-xs text-center">
                    <p className="text-3xl font-black text-rose-600">{liveEvents.filter(e => e.type === 'login_failed').length}</p>
                    <p className="text-xs font-black text-slate-500 mt-1">دخول فاشل</p>
                  </div>
                  <div className="rounded-2xl border bg-white p-4 shadow-xs text-center">
                    <p className="text-3xl font-black text-slate-700">{liveEvents.filter(e => e.type === 'logout').length}</p>
                    <p className="text-xs font-black text-slate-500 mt-1">خروج</p>
                  </div>
                  <div className="rounded-2xl border bg-white p-4 shadow-xs text-center">
                    <p className="text-3xl font-black text-violet-600">{[...new Set(liveEvents.filter(e => e.userId).map(e => e.userId))].length}</p>
                    <p className="text-xs font-black text-slate-500 mt-1">مستخدم فريد</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Lock size={18} className="text-rose-500" /> سجل أحداث الأمان
                  </p>
                  {securityEvents.length === 0 ? (
                    <div className="py-12 text-center">
                      <Shield className="mx-auto mb-2 text-slate-200" size={32} />
                      <p className="text-sm font-black text-slate-400">لا توجد أحداث أمان مسجلة بعد</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {securityEvents.map((ev, i) => (
                        <div key={ev.id ?? i} className={`flex items-center gap-3 rounded-xl p-3 border ${
                          ev.type === 'login_failed' ? 'border-rose-200 bg-rose-50' :
                          ev.type === 'login' ? 'border-emerald-100 bg-emerald-50' :
                          'border-slate-100 bg-slate-50'
                        }`}>
                          {ev.type === 'login_failed'
                            ? <XCircle size={18} className="text-rose-500 shrink-0" />
                            : ev.type === 'login'
                            ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                            : <LogIn size={18} className="text-slate-400 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-slate-800">
                              {EVENT_LABEL[ev.type]} {ev.userName ? `— ${ev.userName}` : ''}
                            </p>
                            <p className="text-[11px] font-bold text-slate-400">
                              {ev.device === 'mobile' ? '📱' : ev.device === 'tablet' ? '📟' : '💻'} {ev.os} · {ev.browser}
                            </p>
                          </div>
                          <span className="text-[11px] text-slate-400 shrink-0">{formatDateTime(ev.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ════════════════════════════════
                TAB: DATA
            ════════════════════════════════ */}
            {!loading && tab === 'data' && (
              <div className="space-y-4">
                {/* Export */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="font-black text-slate-800 mb-1 flex items-center gap-2">
                    <Download size={18} className="text-emerald-600" /> تصدير البيانات
                  </p>
                  <p className="text-xs font-bold text-slate-400 mb-4">تنزيل نسخة JSON من كل البيانات (طلاب، تقارير، استبيانات، حسابات)</p>
                  <button onClick={handleExport} disabled={exportStatus === 'loading'}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-black text-white hover:bg-emerald-700 transition shadow-xs disabled:opacity-60">
                    {exportStatus === 'loading' ? <Loader2 size={15} className="animate-spin" /> :
                     exportStatus === 'done' ? <CheckCircle2 size={15} /> : <Download size={15} />}
                    {exportStatus === 'loading' ? 'جاري التصدير...' :
                     exportStatus === 'done' ? 'تم التنزيل ✓' : 'تصدير كل البيانات (JSON)'}
                  </button>
                </div>

                {/* Clear by collection */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <p className="font-black text-slate-800 mb-1 flex items-center gap-2">
                    <Trash2 size={18} className="text-rose-500" /> مسح البيانات
                  </p>
                  <p className="text-xs font-bold text-slate-400 mb-4">احذف مجموعة محددة من بيانات Firestore</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                      { col: 'students', label: 'الطلاب', color: 'bg-sky-50 border-sky-200 text-sky-700' },
                      { col: 'reports', label: 'التقارير', color: 'bg-violet-50 border-violet-200 text-violet-700' },
                      { col: 'surveys', label: 'الاستبيانات', color: 'bg-amber-50 border-amber-200 text-amber-700' },
                      { col: 'activities', label: 'سجل النشاط', color: 'bg-slate-50 border-slate-200 text-slate-600' },
                      { col: 'messages', label: 'الرسائل', color: 'bg-teal-50 border-teal-200 text-teal-700' },
                      { col: 'platform_analytics', label: 'إحصائيات المنصة', color: 'bg-rose-50 border-rose-200 text-rose-700' },
                    ].map(({ col, label, color }) => (
                      <div key={col} className={`rounded-xl border p-4 ${color}`}>
                        <p className="text-sm font-black mb-3">{label}</p>
                        <button
                          onClick={() => {
                            if (confirm(`هل أنت متأكد من مسح "${label}" نهائياً؟`)) handleClear(col);
                          }}
                          disabled={clearStatus[col] === 'loading'}
                          className="flex items-center gap-1.5 rounded-lg border border-current bg-white/60 px-3 py-1.5 text-xs font-black transition hover:bg-white/90 disabled:opacity-50">
                          {clearStatus[col] === 'loading' ? <Loader2 size={12} className="animate-spin" /> :
                           clearStatus[col] === 'done' ? <CheckCircle2 size={12} /> : <Trash2 size={12} />}
                          {clearStatus[col] === 'loading' ? 'جاري المسح...' :
                           clearStatus[col] === 'done' ? 'تم المسح ✓' : 'مسح نهائي'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warning */}
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex gap-3">
                  <AlertTriangle size={20} className="text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-rose-800">تحذير: المسح نهائي ولا يمكن التراجع عنه</p>
                    <p className="text-xs font-bold text-rose-600 mt-0.5">يُنصح بتصدير نسخة احتياطية قبل أي عملية مسح</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
