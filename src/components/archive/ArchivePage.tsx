'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Archive, Users, FileText, ClipboardList, BookOpen, Award,
  MessageSquareText, CalendarCheck, Activity, HardDrive, ScanFace,
  Download, RefreshCw, Search, ChevronDown, User, UserCheck,
  Building2, Shield, Database, Fingerprint, Clock, Mail,
  Phone, Globe, BarChart3
} from 'lucide-react';
import {
  createPlatformSnapshot, readAllCollections, buildAllPersonProfiles,
  downloadSnapshot, downloadPersonProfile, downloadCollection,
  saveSnapshotMeta, getSavedSnapshots,
  type PlatformSnapshot, type PersonArchiveProfile
} from '@/lib/archiveSnapshot';

// ── Sub-tab imports ───────────────────────────────────────────────────────────
import StudentsArchiveTab from './tabs/StudentsArchiveTab';
import AccountsArchiveTab from './tabs/AccountsArchiveTab';
import ReportsArchiveTab from './tabs/ReportsArchiveTab';
import SurveysArchiveTab from './tabs/SurveysArchiveTab';
import HomeworkArchiveTab from './tabs/HomeworkArchiveTab';
import CertificatesArchiveTab from './tabs/CertificatesArchiveTab';
import MessagesArchiveTab from './tabs/MessagesArchiveTab';
import AttendanceArchiveTab from './tabs/AttendanceArchiveTab';
import ActivityArchiveTab from './tabs/ActivityArchiveTab';
import FaceRecordsArchiveTab from './tabs/FaceRecordsArchiveTab';
import PersonProfileModal from './PersonProfileModal';
import SnapshotsTab from './tabs/SnapshotsTab';
// Phase 2A
import IEPArchiveTab from './tabs/IEPArchiveTab';
import SessionRecordsArchiveTab from './tabs/SessionRecordsArchiveTab';
import InvoicesArchiveTab from './tabs/InvoicesArchiveTab';
import ConsentsArchiveTab from './tabs/ConsentsArchiveTab';
import GamificationArchiveTab from './tabs/GamificationArchiveTab';

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'persons',     label: 'الملفات الشخصية',   icon: Users,          color: 'sky' },
  { id: 'students',    label: 'الطلاب',             icon: UserCheck,      color: 'emerald' },
  { id: 'accounts',   label: 'الحسابات',            icon: Shield,         color: 'violet' },
  { id: 'reports',    label: 'التقارير',            icon: FileText,       color: 'amber' },
  { id: 'surveys',    label: 'الاستبيانات',         icon: ClipboardList,  color: 'teal' },
  { id: 'homework',   label: 'الواجبات',            icon: BookOpen,       color: 'orange' },
  { id: 'certs',      label: 'الشهادات',            icon: Award,          color: 'yellow' },
  { id: 'messages',   label: 'الرسائل',             icon: MessageSquareText, color: 'rose' },
  { id: 'attendance', label: 'الحضور',              icon: CalendarCheck,  color: 'green' },
  { id: 'face',       label: 'بصمات الوجه',         icon: ScanFace,       color: 'indigo' },
  { id: 'activity',   label: 'سجل النشاط',          icon: Activity,       color: 'pink' },
  // Phase 2A
  { id: 'iep',        label: 'خطط IEP',             icon: BarChart3,      color: 'teal' },
  { id: 'sessions',   label: 'سجلات الجلسات',       icon: CalendarCheck,  color: 'cyan' },
  { id: 'invoices',   label: 'الفواتير',            icon: Database,       color: 'emerald' },
  { id: 'consents',   label: 'الموافقات القانونية',  icon: Shield,         color: 'violet' },
  { id: 'gamify',     label: 'النقاط والشارات',      icon: BarChart3,      color: 'amber' },
  { id: 'snapshots',  label: 'النسخ الاحتياطية',    icon: HardDrive,      color: 'slate' },
] as const;

type TabId = typeof TABS[number]['id'];

// ─── Main ArchivePage component ───────────────────────────────────────────────

export default function ArchivePage() {
  const [activeTab, setActiveTab] = useState<TabId>('persons');
  const [snapshot, setSnapshot] = useState<PlatformSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<PersonArchiveProfile | null>(null);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('');

  // ── Load data ────────────────────────────────────────────────────────────
  const loadData = () => {
    setLoading(true);
    try {
      const snap = createPlatformSnapshot();
      setSnapshot(snap);
      setLastRefreshed(new Date().toLocaleTimeString('ar-SA'));
    } catch (e) {
      console.error('[Archive] Failed to load:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // ── Create & download full backup ────────────────────────────────────────
  const handleCreateSnapshot = () => {
    if (!snapshot) return;
    setCreatingSnapshot(true);
    try {
      saveSnapshotMeta(snapshot);
      downloadSnapshot(snapshot);
    } finally {
      setCreatingSnapshot(false);
    }
  };

  // ── Filtered profiles for global search ─────────────────────────────────
  const filteredProfiles = useMemo(() => {
    if (!snapshot) return [];
    const q = globalSearch.trim().toLowerCase();
    if (!q) return snapshot.personProfiles;
    return snapshot.personProfiles.filter((p) =>
      p.fullName.toLowerCase().includes(q) ||
      p.fullNameEn?.toLowerCase().includes(q) ||
      p.emails.some((e) => e.includes(q)) ||
      p.phone?.includes(q) ||
      p.nationalId?.includes(q)
    );
  }, [snapshot, globalSearch]);

  const stats = snapshot?.stats;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6" dir="rtl">

      {/* ── Header ── */}
      <div className="mb-6 rounded-2xl bg-gradient-to-l from-slate-800 to-slate-900 p-5 shadow-xl border border-slate-700">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-sky-500 shadow-lg">
              <Archive className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wide">🗄️ الأرشيف الشامل</h1>
              <p className="text-sm text-slate-400 font-medium">
                كل حرف في المنصة — محفوظ ومؤرشف
                {lastRefreshed && <span className="mr-2 text-slate-500">• آخر تحديث: {lastRefreshed}</span>}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 px-4 py-2.5 text-sm font-bold text-white transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </button>
            <button
              onClick={handleCreateSnapshot}
              disabled={creatingSnapshot || !snapshot}
              className="flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 border border-sky-400 px-4 py-2.5 text-sm font-black text-white transition cursor-pointer disabled:opacity-50 shadow-sm"
            >
              <Download className="h-4 w-4" />
              {creatingSnapshot ? 'جاري التصدير...' : '📸 نسخة احتياطية كاملة'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Bar ── */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: 'الطلاب',      value: stats.totalStudents,    icon: UserCheck,      color: 'emerald' },
            { label: 'الحسابات',    value: stats.totalAccounts,    icon: Shield,         color: 'violet' },
            { label: 'التقارير',    value: stats.totalReports,     icon: FileText,       color: 'amber' },
            { label: 'الاستبيانات', value: stats.totalSurveys,     icon: ClipboardList,  color: 'teal' },
            { label: 'بصمات الوجه', value: stats.totalFaceRecords, icon: ScanFace,       color: 'indigo' },
            { label: 'الحضور',      value: stats.totalAttendance,  icon: CalendarCheck,  color: 'green' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className={`rounded-2xl bg-white border border-${color}-100 p-4 shadow-sm flex items-center gap-3`}
            >
              <div className={`grid h-9 w-9 place-items-center rounded-xl bg-${color}-50 border border-${color}-200`}>
                <Icon className={`h-4 w-4 text-${color}-600`} />
              </div>
              <div>
                <p className={`text-xl font-black text-${color}-700`}>{value.toLocaleString('ar-EG')}</p>
                <p className="text-xs font-bold text-slate-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Global Search ── */}
      <div className="mb-4 relative">
        <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          placeholder="🔍 ابحث بالاسم أو الإيميل أو رقم الهوية أو الهاتف..."
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pr-10 pl-4 text-sm font-medium text-slate-700 placeholder-slate-400 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          dir="rtl"
        />
      </div>

      {/* ── Tabs ── */}
      <div className="mb-4 flex gap-1.5 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition border cursor-pointer ${
              activeTab === id
                ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-600'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-full border-4 border-sky-200 border-t-sky-500 animate-spin" />
            <p className="text-sm font-bold text-slate-500">جاري تحميل الأرشيف...</p>
          </div>
        </div>
      ) : !snapshot ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-slate-500">لا توجد بيانات متاحة</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
          {activeTab === 'persons' && (
            <PersonsTab
              profiles={filteredProfiles}
              onSelectProfile={setSelectedProfile}
            />
          )}
          {activeTab === 'students' && (
            <StudentsArchiveTab
              data={snapshot.students}
              classStudents={snapshot.classStudents}
              onDownload={(d: Record<string, unknown>[]) => downloadCollection('students', d)}
              faceRecords={snapshot.faceRecords}
            />
          )}
          {activeTab === 'accounts' && (
            <AccountsArchiveTab
              data={snapshot.accounts}
              onDownload={(d: Record<string, unknown>[]) => downloadCollection('accounts', d)}
              faceRecords={snapshot.faceRecords}
            />
          )}
          {activeTab === 'reports' && (
            <ReportsArchiveTab
              data={snapshot.reports}
              onDownload={(d: Record<string, unknown>[]) => downloadCollection('reports', d)}
            />
          )}
          {activeTab === 'surveys' && (
            <SurveysArchiveTab
              data={snapshot.surveys}
              onDownload={(d: Record<string, unknown>[]) => downloadCollection('surveys', d)}
            />
          )}
          {activeTab === 'homework' && (
            <HomeworkArchiveTab
              data={snapshot.homeworkLogs}
              onDownload={(d: Record<string, unknown>[]) => downloadCollection('homework', d)}
            />
          )}
          {activeTab === 'certs' && (
            <CertificatesArchiveTab
              data={snapshot.certificateLogs}
              onDownload={(d: Record<string, unknown>[]) => downloadCollection('certificates', d)}
            />
          )}
          {activeTab === 'messages' && (
            <MessagesArchiveTab
              data={snapshot.messages}
              onDownload={(d: Record<string, unknown>[]) => downloadCollection('messages', d)}
            />
          )}
          {activeTab === 'attendance' && (
            <AttendanceArchiveTab
              data={snapshot.attendance}
              ikhlasLogs={snapshot.ikhlasLogs}
              onDownload={(d: Record<string, unknown>[]) => downloadCollection('attendance', d)}
            />
          )}
          {activeTab === 'face' && (
            <FaceRecordsArchiveTab
              data={snapshot.faceRecords}
              onDownload={(d: Record<string, unknown>[]) => downloadCollection('face-records', d)}
            />
          )}
          {activeTab === 'activity' && (
            <ActivityArchiveTab
              data={snapshot.activities}
              onDownload={(d: Record<string, unknown>[]) => downloadCollection('activity', d)}
            />
          )}
          {activeTab === 'iep' && (
            <IEPArchiveTab
              data={snapshot.iepRecords}
              onDownload={(d: Record<string, unknown>[]) => downloadCollection('iep-records', d)}
            />
          )}
          {activeTab === 'sessions' && (
            <SessionRecordsArchiveTab
              data={snapshot.sessionRecords}
              onDownload={(d: Record<string, unknown>[]) => downloadCollection('session-records', d)}
            />
          )}
          {activeTab === 'invoices' && (
            <InvoicesArchiveTab
              data={snapshot.invoices}
              onDownload={(d: Record<string, unknown>[]) => downloadCollection('invoices', d)}
            />
          )}
          {activeTab === 'consents' && (
            <ConsentsArchiveTab
              data={snapshot.consents}
              onDownload={(d: Record<string, unknown>[]) => downloadCollection('consents', d)}
            />
          )}
          {activeTab === 'gamify' && (
            <GamificationArchiveTab
              points={snapshot.points}
              pointTransactions={snapshot.pointTransactions}
              onDownload={(d: Record<string, unknown>[]) => downloadCollection('gamification', d)}
            />
          )}
          {activeTab === 'snapshots' && (
            <SnapshotsTab
              currentSnapshot={snapshot}
              onCreateNew={handleCreateSnapshot}
            />
          )}
        </div>
      )}

      {/* ── Person Profile Modal ── */}
      {selectedProfile && (
        <PersonProfileModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
          onDownload={() => downloadPersonProfile(selectedProfile)}
        />
      )}
    </div>
  );
}

// ─── Persons Tab — الملفات الشخصية ────────────────────────────────────────────

function PersonsTab({
  profiles,
  onSelectProfile,
}: {
  profiles: PersonArchiveProfile[];
  onSelectProfile: (p: PersonArchiveProfile) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'student' | 'parent' | 'staff'>('all');

  const filtered = useMemo(() => {
    if (filter === 'all') return profiles;
    if (filter === 'staff') return profiles.filter((p) => ['doctor', 'specialist', 'teacher'].includes(p.type));
    return profiles.filter((p) => p.type === filter);
  }, [profiles, filter]);

  const typeLabel: Record<string, string> = {
    student: 'طالب', parent: 'ولي أمر', doctor: 'طبيب/معالج',
    specialist: 'أخصائي', teacher: 'معلم',
  };

  const typeColor: Record<string, string> = {
    student: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    parent: 'bg-violet-100 text-violet-700 border-violet-200',
    doctor: 'bg-sky-100 text-sky-700 border-sky-200',
    specialist: 'bg-amber-100 text-amber-700 border-amber-200',
    teacher: 'bg-teal-100 text-teal-700 border-teal-200',
  };

  return (
    <div className="p-5">
      {/* Filter Pills */}
      <div className="mb-5 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-black text-slate-500 ml-2">تصفية:</span>
        {([['all', 'الكل'], ['student', 'الطلاب'], ['parent', 'أولياء الأمور'], ['staff', 'الطاقم']] as const).map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`rounded-lg px-3 py-1.5 text-xs font-black border transition cursor-pointer ${
              filter === val ? 'bg-sky-500 text-white border-sky-400' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-sky-200'
            }`}
          >
            {lbl} ({val === 'all' ? profiles.length : val === 'staff' ? profiles.filter(p => ['doctor','specialist','teacher'].includes(p.type)).length : profiles.filter(p => p.type === val).length})
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((profile) => (
          <button
            key={profile.archiveId}
            onClick={() => onSelectProfile(profile)}
            className="text-right rounded-2xl border border-slate-200 bg-slate-50 hover:border-sky-300 hover:bg-sky-50 p-4 transition-all group cursor-pointer"
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <div className="shrink-0 h-11 w-11 rounded-xl overflow-hidden border border-slate-200 bg-white shadow-xs">
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt={profile.fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-slate-400">
                    <User className="h-5 w-5" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                {/* Name + Type */}
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-black text-slate-800 text-sm truncate">{profile.fullName}</span>
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${typeColor[profile.type] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {typeLabel[profile.type] ?? profile.type}
                  </span>
                </div>

                {/* Email */}
                {profile.emails[0] && (
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{profile.emails[0]}</span>
                  </div>
                )}

                {/* Stats row */}
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.faceEnrolled && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-md">
                      <ScanFace className="h-2.5 w-2.5" /> بصمة وجه
                    </span>
                  )}
                  {profile.type === 'student' && (
                    <>
                      {(profile.student?.reports.length ?? 0) > 0 && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                          {profile.student!.reports.length} تقرير
                        </span>
                      )}
                      {(profile.student?.homeworkLogs.length ?? 0) > 0 && (
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-md">
                          {profile.student!.homeworkLogs.length} واجب
                        </span>
                      )}
                    </>
                  )}
                  {profile.lastLoginAt && (
                    <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                      <Clock className="h-2.5 w-2.5" />
                      {new Date(profile.lastLoginAt).toLocaleDateString('ar-SA')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-slate-400">
            <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold">لا توجد ملفات شخصية</p>
          </div>
        )}
      </div>
    </div>
  );
}
