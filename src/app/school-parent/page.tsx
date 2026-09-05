'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Clock, BookOpen, Video, MessageSquare, Camera,
  BarChart3, Bell, CheckCircle, Star, ChevronLeft,
  Home, User, Loader2, Heart, Sparkles, AlertTriangle, LogOut,
  ScanFace, X, GraduationCap, Calendar, Phone, Building2, ShieldCheck,
  Trophy, Medal, Award, Gift, KeyRound, FileText, ExternalLink, Send, Radio
} from 'lucide-react';
import { DAY_NAMES, SUBJECT_COLORS } from '@/data/ikhlasSchedule';
import Image from 'next/image';
import { clearSession, getAccounts, getMessages, getReports, getSession, getStudents, getSurveys, hydrateSessionFromServer, MessageRecord, ReportRecord, saveMessage, StudentRecord } from '@/lib/cloudStore';
import StudentProfileCard from '@/components/StudentProfileCard';
import StudentAchievementsTab from '@/components/StudentAchievementsTab';
import OverviewScheduleBoard from '@/components/OverviewScheduleBoard';
import { findMatchingStudentForParent, isParentChildNameMatch, normalizeArabicText, isStudentNameMatch } from '@/lib/nameMatching';
import { getLocalHomework } from '@/lib/homework';
import { getClassStudents, getStudentHomeworkLogs } from '@/lib/classDb';
import { pullCloudDataToLocal, subscribeToCloudUpdates, readCloudCache } from '@/lib/firestoreSync';
import NotificationBell from '@/components/NotificationBell';
import ParentHomeworkPagesViewerModal from '@/components/ParentHomeworkPagesViewerModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { recordUserPresence } from '@/lib/presence';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';

function authHeaders() {
  return { 'Content-Type': 'application/json' };
}

type Tab = 'home' | 'achievements' | 'schedule' | 'homework' | 'meetings' | 'community' | 'photos' | 'report';

export default function SchoolParentPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('home');
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState<string>('');
  const [studentRecord, setStudentRecord] = useState<StudentRecord | null>(null);
  const [hasSurvey, setHasSurvey] = useState(true);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [sessionEmail, setSessionEmail] = useState('');
  const [sessionPhone, setSessionPhone] = useState('');
  const [reactionSent, setReactionSent] = useState<Record<string, boolean>>({});
  const [branch, setBranch] = useState<string>('MASAR');

  // الواجب
  const [openHw, setOpenHw] = useState<any>(null);
  const [myAnswer, setMyAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [studentReports, setStudentReports] = useState<ReportRecord[]>([]);
  const [studentMessages, setStudentMessages] = useState<MessageRecord[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replySent, setReplySent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadSchoolParent = async () => {
      // Auth guard
      const session = getSession() ?? await hydrateSessionFromServer();
      if (cancelled) return;
      if (!session) {
        router.replace('/login');
        return;
      }
      if (session.role === 'doctor' || session.role === 'specialist') {
        router.replace('/dashboard');
        return;
      }
      if (session.role === 'student') {
        router.replace('/school-student');
        return;
      }

      // Read branch from session
      const sessionBranch = (session as any)?.schoolBranch || 'MASAR';
      setBranch(sessionBranch);

      // Set parent name from session directly
      setParentName(session.name || 'ولي الأمر');
      if (session.email) setSessionEmail(session.email);
      if (session.phone) setSessionPhone(session.phone);

      // Pull latest data from cloud before searching
      await pullCloudDataToLocal(['students', 'accounts', 'surveys', 'homework', 'notifications', 'ikhlasPosts', 'ikhlasLogs', 'studentCertLogs', 'classStudents', 'studentBadges', 'reports', 'messages', 'studentHomeworkLogs', 'curriculumAssignments'], true).catch(() => {});
      if (cancelled) return;

      // Retrieve linked student record across all available collections
      const allStudents = getStudents();
      const classStudents = getClassStudents();
      const allAccounts = getAccounts();
      const combinedStudents = [...allStudents, ...classStudents];
      const activeId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('student') : null;
      const parentAcc = allAccounts.find((a) => a.id === session.id || a.email === session.email) as any;
      const parentProfile = {
        ...session,
        ...parentAcc,
        id: session.id,
        email: session.email || parentAcc?.email,
        phone: session.phone || parentAcc?.phone,
        schoolBranch: session.schoolBranch || parentAcc?.schoolBranch,
      };
      const linkedStudentId = (session as any)?.linkedStudentId || parentAcc?.linkedStudentId;

      const isPlaceholder = (n?: string | null) =>
        !n || n.includes('جديد') || n.includes('الاستبيان') || n === 'طالب' || n === 'الطالب';

      const realStudents = combinedStudents.filter((s) => !isPlaceholder(s.fullName));
      const pool = realStudents.length > 0 ? realStudents : combinedStudents;

      // 1. By linkedStudentId from account
      let linked: any = null;
      if (linkedStudentId) {
        linked = pool.find((s) => s.id === linkedStudentId || (s as any).studentAccountId === linkedStudentId) || null;
      }
      // 2. By parentAccountId or linkedParentId
      if (!linked && session.id) {
        linked = pool.find((s: any) =>
          s.parentAccountId === session.id ||
          s.linkedParentId === session.id
        ) || null;
      }
      // 3. By parent phone match
      if (!linked && parentProfile.phone) {
        const cleanP = parentProfile.phone.replace(/\D/g, '');
        if (cleanP.length >= 7) {
          const suffix = cleanP.slice(-8);
          linked = pool.find((s: any) => {
            const sPhone = (s.parentPhone || s.phone || '').replace(/\D/g, '');
            return sPhone && sPhone.includes(suffix);
          }) || null;
        }
      }
      // 4. By parent email match
      if (!linked && parentProfile.email) {
        const cleanE = parentProfile.email.trim().toLowerCase();
        linked = pool.find((s: any) => {
          const sEmails = [s.parentEmail, s.linkedParentEmail, s.email, s.recoveryEmail].map(e => (e || '').trim().toLowerCase());
          return sEmails.includes(cleanE);
        }) || null;
      }
      // 5. By patronymic and name matching
      if (!linked) {
        linked = findMatchingStudentForParent(parentProfile, pool as any) || null;
      }
      // 6. By childName or linkedStudentName in parent profile
      if (!linked) {
        const targetChildName = (session as any)?.childName || parentAcc?.childName || (session as any)?.linkedStudentName || parentAcc?.linkedStudentName;
        if (targetChildName && !isPlaceholder(targetChildName)) {
          linked = pool.find((s: any) =>
            s.fullName && isStudentNameMatch(s.fullName, targetChildName)
          ) || null;
        }
      }
      // 7. By parent's name in student full name (e.g. child has father's name)
      if (!linked && session.name && !isPlaceholder(session.name) && session.name !== 'ولي الأمر') {
        linked = pool.find((s: any) =>
          s.fullName && isParentChildNameMatch(s.fullName, session.name)
        ) || null;
      }
      // 8. By activeId from URL query param
      if (activeId) {
        const byUrl = pool.find((s: any) => s.id === activeId || s.studentAccountId === activeId || s.accountId === activeId) || null;
        if (byUrl) linked = byUrl;
      }
      // 9. From reports or messages linked to this parent
      if (!linked) {
        const allReports = getReports();
        const rep = allReports.find(r =>
          (session.id && r.parentAccountId === session.id) ||
          (parentProfile.phone && r.parentPhone && r.parentPhone.endsWith(parentProfile.phone.slice(-8))) ||
          (parentProfile.email && r.parentEmail && r.parentEmail.toLowerCase() === parentProfile.email.toLowerCase())
        );
        if (rep) {
          linked = pool.find(s => s.id === rep.studentId || (s.fullName && rep.studentName && normalizeArabicText(s.fullName) === normalizeArabicText(rep.studentName))) || {
            id: rep.studentId,
            fullName: rep.studentName,
            grade: rep.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
            parentName: session.name || 'ولي الأمر',
            parentPhone: session.phone || parentAcc?.phone || '',
          };
        }
      }

      // 10. Fallback: If class students exist, select the primary real student
      if (!linked && pool.length > 0) {
        linked = pool[0];
      }

      // 11. Cross-reference twin records & accounts for comprehensive data enrichment
      const normName = linked ? normalizeArabicText(linked.fullName || '') : '';
      const twins = linked ? combinedStudents.filter(s => s.id !== linked.id && normalizeArabicText(s.fullName || '') === normName) : [];
      const studentAcc = allAccounts.find(a =>
        a.role === 'student' &&
        ((linked && (a.id === linked.studentAccountId || a.linkedStudentId === linked.id || (a.email && a.email === linked.linkedStudentEmail))) ||
         (normName && a.name && normalizeArabicText(a.name) === normName))
      );

      const resolvedPhoto =
        linked?.photoUrl ||
        twins.find(t => t.photoUrl)?.photoUrl ||
        studentAcc?.photoUrl ||
        (session as any)?.childPhoto ||
        parentAcc?.childPhoto ||
        '';

      const resolvedDob =
        linked?.dateOfBirth ||
        twins.find(t => t.dateOfBirth)?.dateOfBirth ||
        (studentAcc as any)?.dateOfBirth ||
        '';

      const resolvedNationalId =
        linked?.nationalId ||
        twins.find(t => t.nationalId)?.nationalId ||
        (studentAcc as any)?.nationalId ||
        '';

      const resolvedGrade =
        linked?.grade ||
        twins.find(t => t.grade)?.grade ||
        'الصف الأول الابتدائي — فصل د. إسماعيل عيسى';

      const resolvedParentName =
        (linked?.parentName && !isPlaceholder(linked.parentName) ? linked.parentName : '') ||
        twins.find(t => t.parentName && !isPlaceholder(t.parentName))?.parentName ||
        (session.name && !isPlaceholder(session.name) ? session.name : '') ||
        'ولي الأمر';

      const resolvedParentPhone =
        linked?.parentPhone ||
        twins.find(t => t.parentPhone)?.parentPhone ||
        session.phone ||
        parentAcc?.phone ||
        '';

      const resolvedStudent: StudentRecord = linked ? {
        id: linked.id,
        fullName: linked.fullName,
        grade: resolvedGrade,
        photoUrl: resolvedPhoto,
        parentName: resolvedParentName,
        parentPhone: resolvedParentPhone,
        nationalId: resolvedNationalId,
        dateOfBirth: resolvedDob,
        notes: linked.notes || twins.find(t => t.notes)?.notes || '',
        schoolBranch: linked.schoolBranch || sessionBranch,
        reviewStatus: (linked.reviewStatus as any) || 'program-assigned',
        source: (linked.source as any) || 'ikhlas-jeddah',
        studentLastActiveAt: linked.studentLastActiveAt || twins.find(t => t.studentLastActiveAt)?.studentLastActiveAt,
        studentLastLoginAt: linked.studentLastLoginAt || twins.find(t => t.studentLastLoginAt)?.studentLastLoginAt,
        parentLastActiveAt: linked.parentLastActiveAt || twins.find(t => t.parentLastActiveAt)?.parentLastActiveAt,
        parentLastLoginAt: linked.parentLastLoginAt || twins.find(t => t.parentLastLoginAt)?.parentLastLoginAt,
        lastActiveAt: linked.lastActiveAt || twins.find(t => t.lastActiveAt)?.lastActiveAt,
        lastLoginAt: linked.lastLoginAt || twins.find(t => t.lastLoginAt)?.lastLoginAt,
        createdAt: linked.createdAt || new Date().toISOString(),
        updatedAt: linked.updatedAt || new Date().toISOString(),
      } : {
        id: linkedStudentId || `std_${session.id || 'ikhlas'}`,
        fullName: (session as any)?.childName || parentAcc?.childName || (session.name ? `ابن أ. ${session.name.replace(/^(أ\.|أستاذ|الدكتور|د\.)\s*/, '')}` : 'الطالب البطل'),
        grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
        photoUrl: (session as any)?.childPhoto || parentAcc?.childPhoto || '',
        parentName: session.name || 'ولي الأمر',
        parentPhone: session.phone || parentAcc?.phone || '',
        nationalId: '',
        dateOfBirth: '',
        schoolBranch: sessionBranch,
        source: 'ikhlas-jeddah',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reviewStatus: 'program-assigned',
      };

      setStudentRecord(resolvedStudent);
      setHasSurvey(true);

      // Record parent presence on load
      void recordUserPresence({ role: 'parent', studentId: resolvedStudent.id });

      // Load cloud reports and messages for this student
      const resolvedNormName = (resolvedStudent.fullName || '').trim().replace(/\s+/g, ' ');
      const parentPhone = resolvedStudent.parentPhone || session.phone || parentAcc?.phone || '';
      const parentPhoneSuffix = parentPhone.slice(-9);
      const allReports = getReports();
      const allMessages = getMessages();
      const matchesStudent = (r: any) =>
        r.studentId === resolvedStudent.id ||
        r.studentId === linkedStudentId ||
        r.parentAccountId === session.id ||
        (r.studentName && resolvedNormName && (r.studentName.includes(resolvedNormName.split(' ')[0]) || resolvedNormName.includes((r.studentName || '').split(' ')[0]))) ||
        (parentPhoneSuffix && r.parentPhone && r.parentPhone.endsWith(parentPhoneSuffix));
      setStudentReports(
        allReports
          .filter((r) => r.dispatchedToParent === true)
          .filter(matchesStudent)
          .sort((a, b) => ((b.date || b.createdAt || '') > (a.date || a.createdAt || '') ? 1 : -1))
      );
      setStudentMessages(
        allMessages.filter(matchesStudent).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1))
      );
    };
    void loadSchoolParent();
    const presenceInterval = setInterval(() => {
      if (!cancelled) {
        const currentSid = getSession()?.linkedStudentId;
        void recordUserPresence({ role: 'parent', studentId: currentSid });
      }
    }, 4 * 60 * 1000);

    const unsubscribe = subscribeToCloudUpdates(() => {
      if (!cancelled) void loadSchoolParent();
    });
    return () => {
      cancelled = true;
      clearInterval(presenceInterval);
      unsubscribe();
    };
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const studentId = studentRecord?.id ?? getSession()?.id ?? 'demo-student';

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/school/parent-dashboard?branch=${branch}&studentId=${studentId}`, { headers: authHeaders() });
      if (r.ok) setDashboard(await r.json());
    } finally {
      setLoading(false);
    }
  }, [studentId, branch]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const reactPhoto = async (photoId: string, emoji: string) => {
    await fetch(`${API}/school/photos/${photoId}/react`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ emoji }),
    });
    setReactionSent((prev) => ({ ...prev, [photoId]: true }));
    await fetchDashboard();
  };

  const handleSendParentReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !studentRecord) return;
    setReplySending(true);
    try {
      const session = getSession();
      saveMessage({
        studentId: studentRecord.id,
        studentName: studentRecord.fullName,
        parentName: parentName,
        parentPhone: studentRecord.parentPhone,
        parentAccountId: session?.id,
        from: 'parent',
        to: 'doctor',
        body: replyText.trim(),
        read: false,
      });
      setReplyText('');
      setReplySent(true);
      setTimeout(() => setReplySent(false), 3500);

      // Refresh messages
      const allMessages = getMessages();
      const normName = (studentRecord.fullName || '').trim().replace(/\s+/g, ' ');
      const parentPhone = studentRecord.parentPhone || session?.phone || '';
      const parentPhoneSuffix = parentPhone.slice(-9);
      const matchesStudent = (r: any) =>
        r.studentId === studentRecord.id ||
        r.parentAccountId === session?.id ||
        (r.studentName && normName && (r.studentName.includes(normName.split(' ')[0]) || normName.includes((r.studentName || '').split(' ')[0]))) ||
        (parentPhoneSuffix && r.parentPhone && r.parentPhone.endsWith(parentPhoneSuffix));
      setStudentMessages(allMessages.filter(matchesStudent).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)));
    } finally {
      setReplySending(false);
    }
  };

  const jsDay = new Date().getDay();
  const todayName = jsDay >= 0 && jsDay <= 4 ? DAY_NAMES[jsDay] : 'إجازة';

  const allCombinedHomework = useMemo(() => {
    const sid = studentRecord?.id;
    const sName = studentRecord?.fullName ? normalizeArabicText(studentRecord.fullName) : '';
    const classStudentMatches = getClassStudents().filter(cs => {
      if (sid && cs.id === sid) return true;
      if (sName && cs.fullName && isStudentNameMatch(cs.fullName, sName)) return true;
      return false;
    });
    const validStudentIds = new Set<string>([
      ...(sid ? [sid] : []),
      ...classStudentMatches.map(c => c.id),
      'all',
    ]);

    const isHwForThisStudent = (h: any) => {
      if (!h) return false;
      if (h.studentId === 'all') return true;
      if (h.studentId && validStudentIds.has(h.studentId)) return true;
      if (sName && h.studentName && isStudentNameMatch(sName, h.studentName)) return true;
      return false;
    };

    const local = getLocalHomework().filter(isHwForThisStudent);
    const logs = getStudentHomeworkLogs(sid || '', studentRecord?.fullName);
    const currAssignments = readCloudCache<any>('masar.curriculumAssignments.v1').filter(isHwForThisStudent);
    const apiHw = dashboard?.openHomework || [];
    const map = new Map<string, any>();

    // 1. API homework
    apiHw.forEach((h: any) => map.set(h.id, h));

    // 2. Local homework from assignments
    local.forEach((h: any) => {
      if (!map.has(h.id)) {
        map.set(h.id, {
          id: h.id,
          title: h.title,
          description: h.description,
          dueDate: h.dueDate,
          type: 'TEXT',
          fromPage: h.fromPage,
          toPage: h.toPage,
          subjectSlug: h.subjectSlug,
        });
      }
    });

    // 3. Curriculum Assignments from workbook (pages)
    currAssignments.forEach((ca: any) => {
      const hwId = ca.id || `curr_hw_${ca.subjectSlug}_${ca.studentId}`;
      if (!map.has(hwId)) {
        map.set(hwId, {
          id: hwId,
          title: `واجب ${ca.subjectTitle || 'المنهج'} (ص ${ca.fromPage} - ${ca.toPage})`,
          description: `حل التدريبات والأنشطة التفاعلية بالكتاب المدرسي من صفحة (${ca.fromPage}) إلى صفحة (${ca.toPage}).`,
          dueDate: ca.dueDate || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
          type: 'CURRICULUM_PAGES',
          fromPage: ca.fromPage,
          toPage: ca.toPage,
          subjectSlug: ca.subjectSlug,
          subjectTitle: ca.subjectTitle,
        });
      }
    });

    // 4. Homework logs from doctor assignment
    logs.forEach((log) => {
      const existing = Array.from(map.values()).find(
        (x) => x.title === log.title || x.id === log.id
      );
      if (!existing) {
        map.set(log.id, {
          id: log.id,
          title: log.title,
          description: log.teacherFeedback || `واجب مدرسي مكلف من قبل د. إسماعيل عيسى (${log.subject || 'المادة'})`,
          dueDate: log.dueDate || new Date().toISOString().slice(0, 10),
          type: 'TEXT',
        });
      }
    });

    return Array.from(map.values());
  }, [dashboard?.openHomework, studentRecord?.id, studentRecord?.fullName]);

  const childFirstName = (studentRecord?.fullName || 'البطل').trim().split(' ')[0];

  const tabs = [
    { key: 'home' as Tab,          label: 'الرئيسية',  icon: Home },
    { key: 'achievements' as Tab,  label: `إنجازات ${childFirstName} 🏆`, icon: Trophy },
    { key: 'schedule' as Tab,      label: 'الجدول',    icon: Clock },
    { key: 'homework' as Tab,      label: 'الواجبات',  icon: BookOpen },
    { key: 'meetings' as Tab,      label: 'البث واللقاءات', icon: Video },
    { key: 'community' as Tab,     label: 'المجتمع',   icon: MessageSquare },
    { key: 'photos' as Tab,        label: 'الصور',     icon: Camera },
    { key: 'report' as Tab,        label: 'التقارير',  icon: BarChart3 },
  ];

  const displayName = parentName ? `أهلاً بك أ. ${parentName} 👋` : 'أهلاً بك يا ولي الأمر 👋';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" dir="rtl">
      {/* Header - White Elegant Theme */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="shrink-0 transition-transform active:scale-95" title="منصة مسار">
              <span className="relative inline-block w-11 h-11 overflow-hidden rounded-2xl bg-white border border-slate-200/80 ring-2 ring-emerald-500/10 shadow-sm">
                <Image
                  src="/brand/masar-logo.webp"
                  alt="شعار منصة مسار"
                  fill
                  className="object-contain p-1"
                  priority
                />
              </span>
            </Link>
            <div>
              <h1 className="text-lg font-black text-slate-900 flex items-center gap-1.5">
                {displayName}
              </h1>
              <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                فصل د. إسماعيل عيسى — متابعة الطالب
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Live Notifications Bell */}
            <NotificationBell role="parent" studentId={studentRecord?.id || studentId} studentName={studentRecord?.fullName} />

            {/* Change Password Button */}
            <button
              onClick={() => setShowChangePassword(true)}
              title="تغيير كلمة المرور للحساب"
              className="w-10 h-10 rounded-2xl bg-teal-50 hover:bg-teal-100 border-2 border-teal-400/60 flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer ring-2 ring-teal-500/20 text-teal-800"
            >
              <KeyRound className="w-5 h-5" />
            </button>

            {/* Student Info Button (User Icon) */}
            <button
              onClick={() => setShowStudentModal(true)}
              title="عرض بطاقة بيانات ابنك الطالب"
              className="w-10 h-10 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-400/60 flex items-center justify-center shadow-md transition-all active:scale-95 cursor-pointer ring-2 ring-emerald-500/20"
            >
              <User className="w-5 h-5 text-emerald-700" />
            </button>
            
            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-2xl text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Floating Bottom Navigation Bar */}
      <div className="fixed bottom-3 left-2 right-2 max-w-3xl mx-auto z-40 bg-white/95 backdrop-blur-xl border-2 border-emerald-500/30 shadow-2xl rounded-3xl p-1.5 ring-4 ring-emerald-500/10">
        <div className="grid grid-cols-8 gap-0.5 sm:gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-black shadow-lg shadow-emerald-600/30 scale-105'
                    : 'text-slate-600 hover:text-slate-900 font-bold hover:bg-slate-100/80'
                }`}>
                <Icon className={`w-4 h-4 ${active ? 'text-white stroke-[2.5]' : 'text-slate-600'}`} />
                <span className="text-[10px] leading-none">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-28 space-y-5">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        )}

        {/* ══════════════ الرئيسية ══════════════ */}
        {!loading && tab === 'home' && (
          <div className="space-y-4">
            {/* Required Parent Survey Banner */}
            {!hasSurvey && studentRecord && (
              <div className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm font-black text-xl">
                    📝
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-950">استبيان ولي الأمر مطلوب ⚠️</h3>
                    <p className="text-xs font-bold text-amber-800 mt-0.5">
                      يرجى استكمال استبيان ولي الأمر عن الطالب (<strong>{studentRecord.fullName}</strong>) لمساعدة د. إسماعيل عيسى في تخصيص الخطة والتقييم.
                    </p>
                  </div>
                </div>
                <Link
                  href={`/survey?student=${studentRecord.id}&flow=parent`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 px-5 py-2.5 text-xs font-black text-white transition shadow-sm shrink-0 active:scale-95"
                >
                  <span>تعبئة الاستبيان الآن</span>
                  <ChevronLeft size={14} />
                </Link>
              </div>
            )}

            {/* Face Biometric Enrollment Banner for Parent */}
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-5 text-white shadow-xl border border-emerald-700/50 relative overflow-hidden flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0 shadow-inner">
                  <ScanFace size={24} className="text-emerald-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-white">تسجيل الوجه البيومتري 📷</h3>
                    <span className="bg-amber-400/20 text-amber-300 text-[10px] font-black px-2 py-0.5 rounded-md border border-amber-400/30">دخول سريع</span>
                  </div>
                  <p className="text-xs font-bold text-teal-100 opacity-90 mt-0.5">
                    سجّل ملامح وجهك الآن لتبدأ الدخول المباشر للمنصة بمجرد النظر للكاميرا بدون كلمة مرور
                  </p>
                </div>
              </div>
              <Link
                href="/face-enroll"
                className="shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs px-4 py-3 rounded-2xl shadow-lg transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <span>سجّل وجهك</span>
                <ChevronLeft size={14} />
              </Link>
            </div>

            {/* Child Profile Card */}
            <StudentProfileCard
              student={{
                fullName: studentRecord?.fullName || 'الطالب البطل',
                grade: studentRecord?.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
                photoUrl: studentRecord?.photoUrl,
                parentName: studentRecord?.parentName || parentName,
                parentPhone: studentRecord?.parentPhone || sessionPhone || '',
                nationalId: studentRecord?.nationalId,
                dateOfBirth: studentRecord?.dateOfBirth,
                notes: studentRecord?.notes,
                studentLastActiveAt: (studentRecord as any)?.studentLastActiveAt,
                studentLastLoginAt: (studentRecord as any)?.studentLastLoginAt,
                parentLastActiveAt: (studentRecord as any)?.parentLastActiveAt,
                parentLastLoginAt: (studentRecord as any)?.parentLastLoginAt,
                lastActiveAt: (studentRecord as any)?.lastActiveAt,
                lastLoginAt: (studentRecord as any)?.lastLoginAt,
              }}
              variant="parent"
              showParent={true}
              greeting="بيانات طفلي المسجل في فصل د. إسماعيل عيسى 🌟"
            />

            {/* Achievements Banner Link */}
            <div
              onClick={() => setTab('achievements')}
              className="bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 rounded-3xl p-5 text-slate-950 shadow-lg border-2 border-amber-300 relative overflow-hidden flex items-center justify-between gap-4 cursor-pointer hover:shadow-xl transition active:scale-98"
            >
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/30 border border-white/40 flex items-center justify-center shrink-0 shadow-inner text-2xl">
                  🏆
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-950">إنجازات وجوائز البطل {childFirstName} 🏆</h3>
                  <p className="text-xs font-bold text-amber-950 mt-0.5">
                    استعراض شهادات التفوق المعتمدة، الأوسمة، والجوائز من د. إسماعيل عيسى
                  </p>
                </div>
              </div>
              <div className="shrink-0 bg-slate-950 text-white font-black text-xs px-4 py-2.5 rounded-2xl shadow-md transition flex items-center gap-1.5 cursor-pointer">
                <span>عرض الإنجازات</span>
                <ChevronLeft size={14} />
              </div>
            </div>

            {/* Daily Schedule Timeline Board for Parent */}
            <div className="pt-1">
              <OverviewScheduleBoard
                variant="parent"
                studentName={studentRecord?.fullName}
                onNavigateTab={(t) => {
                  if (t === 'schedule') setTab('schedule');
                  else setTab(t as Tab);
                }}
              />
            </div>

            {/* تنبيه تأخر استلام الطفل العاجل */}
            {dashboard?.todayLog?.lateAlertSent && (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-4.5 flex items-center gap-3.5 animate-pulse shadow-md shadow-rose-100">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-200 flex items-center justify-center shrink-0">
                  <Bell className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-black text-rose-900">🚨 تنبيه عاجل من إدارة المدرسة!</p>
                  <p className="text-xs text-rose-700 mt-0.5 font-bold">
                    نود تذكيركم بأن اليوم الدراسي قد انتهى، يرجى الحضور فوراً لاستلام الطفل من بوابة المدرسة.
                  </p>
                </div>
              </div>
            )}

            {/* وقت الخروج الموثق بالدقيقة */}
            {dashboard?.todayLog?.exitTime && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4.5 flex items-center gap-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-200 flex items-center justify-center shrink-0">
                  <Clock className="w-6 h-6 text-emerald-700" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-emerald-800 font-bold">توقيت خروج ابنك الموثق اليوم 🕒</p>
                  <p className="text-3xl font-black text-emerald-900 mt-0.5">{dashboard.todayLog.exitTime}</p>
                </div>
                <CheckCircle className="w-7 h-7 text-emerald-600 shrink-0" />
              </div>
            )}

            {/* تقييم الأداء اليومي */}
            {dashboard?.todayLog && (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-slate-700">📊 تقييم أداء ابنك اليومي في الفصل</p>
                  <span className="text-xs bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                    {dashboard.todayLog.attendance === 'present' ? '✅ حاضر' : dashboard.todayLog.attendance === 'absent' ? '❌ غائب' : '⏰ متأخر'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                      style={{ width: `${dashboard.todayLog.performanceScore}%` }} />
                  </div>
                  <span className="text-xl font-black text-emerald-700">{dashboard.todayLog.performanceScore}%</span>
                </div>
              </div>
            )}

            {/* واجبات مطلوبة */}
            {allCombinedHomework.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-amber-900 font-black flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-amber-600" /> {allCombinedHomework.length} واجبات إلكترونية مطلوبة
                  </p>
                  <button onClick={() => setTab('homework')} className="text-xs text-amber-700 font-bold hover:underline flex items-center gap-0.5">
                    عرض الكل <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {allCombinedHomework.slice(0, 2).map((hw: any) => (
                    <div key={hw.id} className="bg-white border border-amber-200/80 rounded-2xl p-3 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{hw.title}</span>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                        تسليم: {new Date(hw.dueDate).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* اجتماع فيديو قادم */}
            {dashboard?.upcomingMeetings?.[0] && (
              <div className="bg-blue-50 border border-blue-200 rounded-3xl p-5 shadow-sm space-y-2">
                <p className="text-xs text-blue-900 font-black flex items-center gap-1.5"><Video className="w-4 h-4 text-blue-600" /> اجتماع ميتنج قادم</p>
                <p className="text-sm font-black text-slate-900">{dashboard.upcomingMeetings[0].title}</p>
                <p className="text-xs text-slate-600">{new Date(dashboard.upcomingMeetings[0].scheduledAt).toLocaleString('ar-SA')}</p>
                <a href={dashboard.upcomingMeetings[0].meetingUrl} target="_blank" rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-4 py-2 rounded-xl font-black transition-all shadow-sm">
                  <Video className="w-3.5 h-3.5" /> انضمام للاجتماع المباشر
                </a>
              </div>
            )}

            {/* التقرير الأسبوعي */}
            {dashboard?.latestWeeklyReport && (
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
                <p className="text-xs text-slate-800 font-black flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500 fill-amber-500" /> التقرير الأسبوعي الشامل</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <p className="text-lg font-black text-emerald-700">{dashboard.latestWeeklyReport.attendanceDays}/5</p>
                    <p className="text-[10px] text-slate-500 font-bold">أيام الحضور</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <p className="text-lg font-black text-blue-700">{dashboard.latestWeeklyReport.avgPerformance}%</p>
                    <p className="text-[10px] text-slate-500 font-bold">متوسط الأداء</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                    <p className="text-lg font-black text-amber-600">{dashboard.latestWeeklyReport.homeworkDone}/{dashboard.latestWeeklyReport.homeworkTotal}</p>
                    <p className="text-[10px] text-slate-500 font-bold">الواجبات</p>
                  </div>
                </div>
                {dashboard.latestWeeklyReport.teacherNotes && (
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                    💬 <span className="font-bold">ملاحظات المعلم:</span> {dashboard.latestWeeklyReport.teacherNotes}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ إنجازات البطل ══════════════ */}
        {!loading && tab === 'achievements' && (
          <StudentAchievementsTab
            studentId={studentRecord?.id || 'std_default'}
            studentName={studentRecord?.fullName || 'البطل'}
            grade={studentRecord?.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى'}
            variant="parent"
          />
        )}

        {/* ══════════════ جدول الحصص ══════════════ */}
        {!loading && tab === 'schedule' && (
          <div className="space-y-4">
            <OverviewScheduleBoard
              variant="parent"
              studentName={studentRecord?.fullName}
              showFullWeek={true}
              onNavigateTab={(t) => {
                if (t === 'schedule') {
                  // already on schedule
                } else {
                  setTab(t as Tab);
                }
              }}
            />
          </div>
        )}

        {/* ══════════════ الواجبات ══════════════ */}
        {!loading && tab === 'homework' && (
          <div className="space-y-4">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" /> الواجبات الإلكترونية
            </h2>

            <div className="space-y-3">
              {allCombinedHomework.map((hw: any) => {
                const done = submitted.includes(hw.id);
                return (
                  <div
                    key={hw.id}
                    onClick={() => setOpenHw(hw)}
                    className={`bg-white border rounded-3xl p-4 transition-all cursor-pointer shadow-sm ${
                      done ? 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-400' : 'border-slate-200 hover:border-emerald-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-black text-sm text-slate-900">{hw.title}</p>
                          {done && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                              مسلّم
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{hw.description}</p>
                        <p className="text-[10px] text-amber-700 font-bold mt-1.5">
                          ⏰ التسليم: {new Date(hw.dueDate).toLocaleDateString('ar-SA')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenHw(hw);
                        }}
                        className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-black px-3.5 py-1.5 rounded-xl shrink-0 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                        <span>عرض صفحات الواجب 📖</span>
                      </button>
                    </div>
                  </div>
                );
              })}
              {!allCombinedHomework.length && (
                <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500">
                  ✅ لا توجد واجبات مطلوبة حالياً
                </div>
              )}
            </div>

            {/* Parent Homework Pages Viewer Modal */}
            {openHw && (
              <ParentHomeworkPagesViewerModal
                homework={openHw}
                studentId={studentRecord?.id}
                studentName={studentRecord?.fullName}
                onClose={() => setOpenHw(null)}
              />
            )}
          </div>
        )}

        {/* ══════════════ الاجتماعات والبث المباشر ══════════════ */}
        {!loading && tab === 'meetings' && (
          <div className="space-y-5">
            {/* Live Stream Room Card */}
            <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 rounded-3xl p-5 text-white shadow-lg border border-rose-500/40 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-inner text-2xl">
                  📡
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm text-white">البث المباشر لفصل د. إسماعيل عيسى</h3>
                    <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md border border-white/20 animate-pulse flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                      مباشر
                    </span>
                  </div>
                  <p className="text-xs font-bold text-rose-100 opacity-90 mt-0.5">
                    غرفة البث الصوتي والمرئي التفاعلي المباشر مع الدكتور والطلاب في الفصل
                  </p>
                </div>
              </div>
              <Link
                href="/live?room=IKHLAS_JEDDAH"
                className="shrink-0 bg-white text-rose-700 hover:bg-rose-50 font-black text-xs px-5 py-3 rounded-2xl shadow-lg transition flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <Radio className="w-4 h-4 text-rose-600" />
                <span>دخول البث المباشر</span>
              </Link>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-600" /> اجتماعات الفيديو المجدولة
              </h2>
            {dashboard?.upcomingMeetings?.map((m: any) => (
              <div key={m.id} className="bg-white border border-slate-200 rounded-3xl p-4.5 space-y-2 shadow-sm">
                <p className="font-black text-slate-900 text-base">{m.title}</p>
                <p className="text-xs text-slate-600">{new Date(m.scheduledAt).toLocaleString('ar-SA')} ({m.duration} دقيقة)</p>
                <a href={m.meetingUrl} target="_blank" rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-xl font-black transition-all shadow-sm">
                  <Video className="w-3.5 h-3.5" /> الانضمام للغرفة الان
                </a>
              </div>
            ))}
            {!dashboard?.upcomingMeetings?.length && (
              <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500">
                لا توجد اجتماعات قادمة
              </div>
            )}
            </div>
          </div>
        )}

        {/* ══════════════ المجتمع والمحادثة ══════════════ */}
        {!loading && tab === 'community' && (
          <div className="space-y-5">
            {/* رسائل وتوجيهات د. إسماعيل عيسى المباشرة */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-600" /> المحادثة والتوجيهات المباشرة من د. إسماعيل عيسى
                </h2>
                <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {studentMessages.length} رسائل
                </span>
              </div>

              {/* Chat Thread */}
              <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-sm space-y-3">
                {studentMessages.length > 0 ? (
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    {studentMessages.map((m) => {
                      const isDoctor = m.from === 'doctor';
                      return (
                        <div
                          key={m.id}
                          className={`rounded-2xl p-3.5 text-xs transition-all ${
                            isDoctor
                              ? 'bg-emerald-50/80 border border-emerald-200 text-slate-900 mr-0 ml-4'
                              : 'bg-slate-100 border border-slate-200 text-slate-800 ml-0 mr-4'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className={`font-black text-[11px] ${isDoctor ? 'text-emerald-800' : 'text-slate-700'}`}>
                              {isDoctor ? '👨‍⚕️ د. إسماعيل عيسى' : '👤 رد ولي الأمر'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {new Date(m.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap leading-relaxed font-bold">{m.body}</p>
                          {m.audioDataUrl && (
                            <div className="mt-2 pt-2 border-t border-emerald-200/60">
                              <p className="text-[10px] font-black text-emerald-800 mb-1">🎙️ تسجيل صوتي من الدكتور:</p>
                              <audio controls src={m.audioDataUrl} className="w-full h-8" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400">
                    <p className="font-bold text-xs">لا توجد رسائل سابقة مع د. إسماعيل حتى الآن.</p>
                    <p className="text-[11px] text-slate-400 mt-1">يمكنك كتابة رسالتك أو استفسارك وسيقوم د. إسماعيل بالرد عليك مباشرة.</p>
                  </div>
                )}

                {/* Reply Box */}
                <form onSubmit={handleSendParentReply} className="pt-2 border-t border-slate-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="اكتب ردك أو استفسارك للدكتور إسماعيل..."
                      disabled={replySending}
                      className="flex-1 rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition"
                    />
                    <button
                      type="submit"
                      disabled={replySending || !replyText.trim()}
                      className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2.5 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      {replySending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      <span>إرسال</span>
                    </button>
                  </div>
                  {replySent && (
                    <p className="text-[11px] font-bold text-emerald-600 mt-1.5 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> تم إرسال رسالتك إلى د. إسماعيل عيسى بنجاح!
                    </p>
                  )}
                </form>
              </div>
            </div>

            {/* مجتمع وتنبيهات الفصل العامة */}
            <div className="space-y-3 pt-2">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" /> إعلانات الفصل المدرسية
              </h2>
              {dashboard?.communityPosts?.map((p: any) => (
                <div key={p.id} className={`bg-white border rounded-3xl p-4.5 shadow-sm space-y-2 ${p.pinned ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200'}`}>
                  {p.pinned && <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full inline-block">📌 إعلان مثبّت</span>}
                  <p className="text-xs text-slate-900 font-bold leading-relaxed">{p.body}</p>
                  <p className="text-[10px] text-slate-400">{new Date(p.createdAt).toLocaleString('ar-SA')}</p>
                </div>
              ))}
              {!dashboard?.communityPosts?.length && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center text-slate-400 text-xs font-bold">
                  لا توجد إعلانات عامة جديدة بالفصل
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ الصور ══════════════ */}
        {!loading && tab === 'photos' && (
          <div className="space-y-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-600" /> صور الفصل اليومية
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {dashboard?.recentPhotos?.map((ph: any) => (
                <div key={ph.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                  <img src={ph.photoUrl} alt={ph.caption ?? ''} className="w-full h-36 object-cover" />
                  {ph.caption && <p className="text-xs text-slate-700 p-2.5 font-bold">{ph.caption}</p>}
                  <div className="p-2 pt-0 flex gap-1.5">
                    {['❤️', '👏', '🌟', '😊'].map((emoji) => (
                      <button key={emoji} onClick={() => reactPhoto(ph.id, emoji)}
                        className="text-sm hover:scale-125 transition-transform">
                        {emoji}
                      </button>
                    ))}
                    {reactionSent[ph.id] && <span className="text-xs text-emerald-600 font-bold">✓</span>}
                  </div>
                </div>
              ))}
              {!dashboard?.recentPhotos?.length && (
                <div className="col-span-2 bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500">
                  لا توجد صور بعد
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════ التقارير ══════════════ */}
        {!loading && tab === 'report' && (
          <div className="space-y-6">
            {/* التقارير الشاملة والمعتمدة من د. إسماعيل عيسى */}
            {studentReports.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" /> التقارير المعتمدة الصادرة من د. إسماعيل عيسى
                  </h2>
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {studentReports.length} تقارير معتمدة
                  </span>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  {studentReports.map((r) => (
                    <div
                      key={r.id}
                      className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-block">
                            {r.program || 'التقرير الأكاديمي والتشخيصي الشامل'}
                          </span>
                          <h3 className="font-black text-slate-900 text-sm mt-2">{r.studentName}</h3>
                          <p className="text-[11px] text-slate-500 font-bold">{r.grade || 'الصف الأول الابتدائي'}</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold shrink-0 bg-slate-50 px-2 py-1 rounded-lg">
                          {r.date || new Date(r.createdAt || Date.now()).toLocaleDateString('ar-SA')}
                        </span>
                      </div>

                      {r.summary && (
                        <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100 font-medium whitespace-pre-wrap">
                          {r.summary}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                        <span className="font-bold text-slate-600">
                          درجة التقييم: <span className="font-black text-emerald-700 text-sm">{r.score ?? 100}%</span>
                        </span>
                        <Link
                          href={`/reports?report=${r.id}&mode=parent`}
                          className="inline-flex items-center gap-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-xl transition-all shadow-xs"
                        >
                          <ExternalLink size={13} />
                          <span>فتح التقرير المعتمد 📄</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* التقرير الأسبوعي لتقييم طفلك */}
            <div className="space-y-3">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" /> التقرير التراكمي الأسبوعي
              </h2>
              {dashboard?.latestWeeklyReport ? (
                <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-black text-slate-900 text-base">التقرير التراكمي الأسبوعي</h3>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                      {dashboard.latestWeeklyReport.weekStart} — {dashboard.latestWeeklyReport.weekEnd}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                      <p className="text-xl font-black text-emerald-700">{dashboard.latestWeeklyReport.attendanceDays}/5</p>
                      <p className="text-[10px] text-slate-500 font-bold">أيام الحضور</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                      <p className="text-xl font-black text-blue-700">{dashboard.latestWeeklyReport.avgPerformance}%</p>
                      <p className="text-[10px] text-slate-500 font-bold">متوسط الأداء</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl">
                      <p className="text-xl font-black text-amber-600">{dashboard.latestWeeklyReport.homeworkDone}/{dashboard.latestWeeklyReport.homeworkTotal}</p>
                      <p className="text-[10px] text-slate-500 font-bold">الواجبات</p>
                    </div>
                  </div>
                  {dashboard.latestWeeklyReport.teacherNotes && (
                    <div className="bg-emerald-50/50 border border-emerald-200 p-3.5 rounded-2xl text-xs text-slate-800">
                      <p className="font-black text-emerald-900 mb-1">💬 ملاحظات وتوصيات المعلم:</p>
                      <p>{dashboard.latestWeeklyReport.teacherNotes}</p>
                    </div>
                  )}
                </div>
              ) : (
                studentReports.length === 0 && (
                  <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-slate-500">
                    <Star className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <p className="font-bold">لا يوجد تقرير صادر بعد</p>
                    <p className="text-xs text-slate-400 mt-1">يتم إصدار التقارير الدورية والتشخيصية من قِبَل د. إسماعيل عيسى</p>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* Student Info Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowStudentModal(false)}
              className="absolute top-4 left-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-teal-50 border-4 border-emerald-400/80 shadow-lg flex items-center justify-center mx-auto text-4xl overflow-hidden">
                {studentRecord?.photoUrl ? (
                  studentRecord.photoUrl.startsWith('data:image') ? (
                    <img src={studentRecord.photoUrl} alt={studentRecord.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span>{studentRecord.photoUrl}</span>
                  )
                ) : (
                  <span>🎓</span>
                )}
              </div>

              <div>
                <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[11px] font-black px-3 py-1 rounded-full border border-emerald-200">
                  <GraduationCap size={14} className="text-emerald-600" />
                  <span>طالب مقيّد — فصل د. إسماعيل عيسى</span>
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-2">
                  {studentRecord?.fullName || 'الطالب المسجل'}
                </h2>
                <p className="text-xs font-bold text-slate-500 mt-0.5">
                  متابعة وتقييم فصل د. إسماعيل عيسى
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-2.5 text-xs font-bold text-slate-700 border-t border-b border-slate-100 py-4">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <GraduationCap size={15} className="text-teal-600" /> الصف الدراسي:
                </span>
                <span className="font-black text-slate-900">{studentRecord?.grade || 'الصف الأول الابتدائي'}</span>
              </div>

              {studentRecord?.dateOfBirth && (
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar size={15} className="text-teal-600" /> تاريخ الميلاد:
                  </span>
                  <span className="font-black text-slate-900">{studentRecord.dateOfBirth}</span>
                </div>
              )}

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Phone size={15} className="text-teal-600" /> هاتف ولي الأمر:
                </span>
                <span className="font-black text-slate-900" dir="ltr">{studentRecord?.parentPhone || 'مسجل بالنظام'}</span>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Building2 size={15} className="text-teal-600" /> الفرع والمدرسة:
                </span>
                <span className="font-black text-emerald-800">فرع الإخلاص — جدة 📍</span>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck size={15} className="text-teal-600" /> حالة الملف الحيوية:
                </span>
                <span className="font-black text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-md">
                  {studentRecord?.reviewStatus || 'مكتمل ومفعل'}
                </span>
              </div>
            </div>

            {/* Face Enroll Shortcut inside modal */}
            <div className="mt-5 space-y-2">
              <Link
                href="/face-enroll"
                onClick={() => setShowStudentModal(false)}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-4 py-3.5 text-xs font-black text-white shadow-lg transition active:scale-95 cursor-pointer"
              >
                <ScanFace size={18} />
                <span>تسجيل / تحديث بصمة الوجه الذكية 📷</span>
              </Link>

              <button
                onClick={() => setShowStudentModal(false)}
                className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition text-center cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        userEmail={sessionEmail}
      />
    </div>
  );
}
