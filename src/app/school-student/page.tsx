'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BookOpen, Star, Mic, Camera, FileText, CheckCircle, Award,
  Clock, Video, ChevronRight, Send, Loader2, X, Play, Square,
  Upload, LogOut, ScanFace, Sparkles, Home, GraduationCap,
  Calendar, BookMarked, Trophy, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { DAY_NAMES, SUBJECT_COLORS } from '@/data/ikhlasSchedule';
import { curriculaList } from '@/data/curriculaData';
import { curriculumPrograms } from '@/data/curriculum';
import { games } from '@/data/games';
import { getCurriculumFiles } from '@/lib/curriculumDb';
import {
  clearSession, getSession, getStudents, getAccounts, getReports,
  updateStudent, getIkhlasPosts, hydrateSessionFromServer,
  StudentRecord, AccountRecord
} from '@/lib/cloudStore';
import {
  getClassStudents, ClassStudentRecord,
  getStudentCertificateLogs, StudentCertificateLog,
  getStudentHomeworkLogs,
} from '@/lib/classDb';
import { getLocalHomework, HomeworkRecord } from '@/lib/homework';
import { pullCloudDataToLocal, syncDocToCloud, readCloudCache } from '@/lib/firestoreSync';
import { normalizeArabicText } from '@/lib/nameMatching';
import StudentProfileCard from '@/components/StudentProfileCard';
import OverviewScheduleBoard from '@/components/OverviewScheduleBoard';
import StudentInteractiveHomeworkModal from '@/components/StudentInteractiveHomeworkModal';
import StudentAchievementsTab from '@/components/StudentAchievementsTab';
import NotificationBell from '@/components/NotificationBell';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
const BRANCH = 'IKHLAS_JEDDAH';

type Tab = 'home' | 'homework' | 'schedule' | 'curriculum' | 'certificates';

export default function StudentDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [homeworks, setHomeworks] = useState<HomeworkRecord[]>([]);
  const [certificates, setCertificates] = useState<StudentCertificateLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFullWeek, setShowFullWeek] = useState(false);

  const [studentName, setStudentName] = useState('طالب');
  const [studentPhoto, setStudentPhoto] = useState<string>('');
  const [studentRecord, setStudentRecord] = useState<any>(null);
  const [studentId, setStudentId] = useState<string>('');

  const [selectedHw, setSelectedHw] = useState<HomeworkRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadStudentPortal = async () => {
      await pullCloudDataToLocal(['students', 'accounts', 'homework', 'curriculumAssignments', 'classStudents', 'studentCertLogs', 'studentHomeworkLogs', 'ikhlasPosts']).catch(() => {});
      if (cancelled) return;

      const session = getSession() ?? await hydrateSessionFromServer();
      if (cancelled) return;
      if (!session) { router.replace('/login'); return; }
      if (session.role === 'doctor' || session.role === 'specialist') { router.replace('/dashboard'); return; }
      if (session.role === 'parent') { router.replace('/school-parent'); return; }

      const classStudents = getClassStudents();
      const allStudents = getStudents();
      const allAccounts = getAccounts();
      const combined = [...classStudents, ...allStudents];

      const email = session.email?.trim().toLowerCase() ?? '';
      const phone = (session.phone || '').replace(/\D/g, '');
      const sName = session.name ? normalizeArabicText(session.name) : '';
      const linkedStudentId = (session as any)?.linkedStudentId;

      function isSyntheticOrGeneric(n?: string | null) {
        if (!n) return true;
        const norm = normalizeArabicText(n);
        return norm === 'طالب' || norm === 'الطالب' || norm === 'طالب جديد'
          || norm.includes('الاستبيان') || norm.includes('الاختبار') || norm.includes('طالب من');
      }

      let linked = combined.find((s: any) => {
        if (linkedStudentId && s.id === linkedStudentId) return true;
        if (session.id && s.id === session.id) return true;
        if (session.id && s.studentAccountId === session.id) return true;
        if (email && s.linkedStudentEmail?.trim().toLowerCase() === email) return true;
        if (sName && !isSyntheticOrGeneric(sName) && normalizeArabicText(s.fullName) === sName) return true;
        if (phone && phone.length >= 8 && s.parentPhone && s.parentPhone.replace(/\D/g, '').includes(phone.slice(-8))) return true;
        if (email && ((s.email || '').trim().toLowerCase() === email || (s.recoveryEmail || '').trim().toLowerCase() === email)) return true;
        return false;
      }) || null;

      if (!linked || isSyntheticOrGeneric(linked?.fullName)) {
        const byLinked = linkedStudentId ? allStudents.find((s) => s.id === linkedStudentId) : null;
        if (byLinked) linked = byLinked;
      }

      let finalName = '';
      if (session.name && !isSyntheticOrGeneric(session.name)) finalName = session.name;
      else if (linked?.fullName && !isSyntheticOrGeneric(linked.fullName)) finalName = linked.fullName;
      else finalName = linked?.fullName || session.name || 'طالب';

      if (isSyntheticOrGeneric(finalName)) {
        const sId = linked?.id || linkedStudentId || session.id;
        const sBranch = (linked as any)?.schoolBranch || (session as any)?.schoolBranch || 'MASAR';
        router.replace(sBranch === 'IKHLAS_JEDDAH'
          ? `/school-student/setup${sId ? `?student=${encodeURIComponent(sId)}` : ''}`
          : `/student/new?flow=student${sId ? `&student=${encodeURIComponent(sId)}` : ''}`);
        return;
      }

      let photoUrl = linked?.photoUrl || (session as any)?.photoUrl
        || allStudents.find(s => s.photoUrl && (s.id === linked?.id || s.studentAccountId === session.id))?.photoUrl
        || allAccounts.find(a => a.photoUrl && (a.id === session.id || a.linkedStudentId === linked?.id))?.photoUrl || '';

      if (!photoUrl && linked) {
        const withPhoto = allStudents.find(s => s.photoUrl && normalizeArabicText(s.fullName) === normalizeArabicText(linked.fullName));
        if (withPhoto?.photoUrl) photoUrl = withPhoto.photoUrl;
      }

      if (linked && isSyntheticOrGeneric(linked.fullName) && !isSyntheticOrGeneric(finalName)) {
        const cleaned = updateStudent(linked.id, { fullName: finalName, photoUrl: photoUrl || linked.photoUrl });
        if (cleaned) void syncDocToCloud('students', cleaned.id, cleaned);
      }

      const resolvedId = linked?.id || linkedStudentId || session.id || '';
      setStudentName(finalName);
      setStudentPhoto(photoUrl);
      setStudentId(resolvedId);
      setStudentRecord({
        ...(linked || {}),
        fullName: finalName,
        photoUrl,
        grade: linked?.grade || ((linked as any)?.schoolBranch === 'IKHLAS_JEDDAH' ? 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى' : 'الصف الأول الابتدائي'),
        schoolBranch: (linked as any)?.schoolBranch || (session as any)?.schoolBranch || 'MASAR',
        parentName: linked?.parentName || '',
        parentPhone: linked?.parentPhone || session.phone || '',
        nationalId: linked?.nationalId || (session as any)?.nationalId || '',
        dateOfBirth: linked?.dateOfBirth || '',
        notes: linked?.notes || '',
      });

      // Load homework from Firestore (via local cache pulled above)
      loadHomework(finalName, resolvedId);
      // Load certificates
      loadCertificates(resolvedId, finalName);
      setLoading(false);
    };

    void loadStudentPortal();
    return () => { cancelled = true; };
  }, [router]);

  const loadHomework = useCallback(async (name: string, id: string, forcePull = false) => {
    if (forcePull) {
      await pullCloudDataToLocal(['homework', 'curriculumAssignments', 'ikhlasPosts', 'studentHomeworkLogs']).catch(() => {});
    }
    const allHw = getLocalHomework();
    const logs = id ? getStudentHomeworkLogs(id) : [];

    // Strategy 1: ONLY homework assigned explicitly to this student
    let merged = allHw.filter(hw => {
      if (id && hw.studentId === id) return true;
      if (name && hw.studentName && normalizeArabicText(hw.studentName) === normalizeArabicText(name)) return true;
      return false;
    });

    // Strategy 2: Homework logs from Doctor assignments specifically for this student
    logs.forEach((log) => {
      const existing = merged.find(
        (x) => x.title === log.title || x.id === log.id
      );
      if (!existing) {
        merged = [
          ...merged,
          {
            id: log.id || `hw_log_${Date.now()}`,
            studentId: log.studentId || id,
            studentName: name,
            title: log.title,
            description: log.teacherFeedback || `واجب مكلف من د. إسماعيل عيسى (${log.subject || 'المنهج'})`,
            dueDate: log.dueDate || new Date().toISOString().slice(0, 10),
            status: (log.status === 'submitted' ? 'submitted' : 'assigned') as any,
            createdAt: log.createdAt || new Date().toISOString(),
          } as HomeworkRecord,
        ];
      } else if (log.status === 'submitted') {
        existing.status = 'submitted';
      }
    });

    // Strategy 3: ONLY curriculum assignments explicitly assigned to THIS student
    const currAssignments = readCloudCache<any>('masar.curriculumAssignments.v1');
    const studentCurrAssignments = currAssignments.filter((a: any) =>
      (id && a.studentId === id) ||
      (name && a.studentName && normalizeArabicText(a.studentName) === normalizeArabicText(name))
    );
    const currAsHomework: any[] = studentCurrAssignments.map((a: any) => {
      const matchLog = logs.find(l => l.studentId === a.studentId && l.subject === a.subjectTitle);
      const isSubmitted = matchLog?.status === 'submitted';
      return {
        id: a.id || `assign_${a.subjectSlug}_${a.studentId}`,
        studentId: a.studentId || id,
        studentName: a.studentName || name,
        title: `واجب ${a.subjectTitle || 'المنهج'} (ص ${a.fromPage} - ${a.toPage})`,
        description: `حل التدريبات والأنشطة التفاعلية بالكتاب المدرسي من صفحة (${a.fromPage}) إلى صفحة (${a.toPage}).`,
        dueDate: a.dueDate || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
        status: isSubmitted ? ('submitted' as const) : ('assigned' as const),
        createdAt: a.assignedAt || new Date().toISOString(),
        subjectSlug: a.subjectSlug,
        subjectTitle: a.subjectTitle,
        fromPage: a.fromPage,
        toPage: a.toPage,
      };
    });

    for (const ca of currAsHomework) {
      const existing = merged.find(h => h.id === ca.id || h.title === ca.title);
      if (!existing) {
        merged = [...merged, ca];
      } else {
        (existing as any).subjectSlug = (existing as any).subjectSlug || ca.subjectSlug;
        (existing as any).fromPage = (existing as any).fromPage || ca.fromPage;
        (existing as any).toPage = (existing as any).toPage || ca.toPage;
      }
    }

    setHomeworks(merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  const loadCertificates = useCallback(async (id: string, name: string, forcePull = false) => {
    if (forcePull) {
      await pullCloudDataToLocal(['studentCertLogs']).catch(() => {});
    }
    const allCerts = readCloudCache<StudentCertificateLog>('masar_student_cert_logs_v1');

    // Match strictly by studentId OR by student name only
    const mine = allCerts.filter(c =>
      (id && c.studentId === id) ||
      (name && c.studentName && normalizeArabicText(c.studentName) === normalizeArabicText(name))
    );

    setCertificates(mine.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  const handleLogout = () => { clearSession(); router.push('/login'); };

  const isIkhlas = studentRecord?.schoolBranch === 'IKHLAS_JEDDAH';

  const tabs: Array<{ key: Tab; label: string; icon: any }> = [
    { key: 'home',         label: 'الرئيسية',                                icon: Home },
    { key: 'homework',     label: 'الواجبات',                                icon: BookOpen },
    ...(isIkhlas ? [{ key: 'schedule' as Tab, label: 'الجدول', icon: Clock }] : []),
    { key: 'curriculum',   label: isIkhlas ? 'المناهج' : 'المسار المعتمد',   icon: isIkhlas ? BookMarked : Award },
    { key: 'certificates', label: 'شهاداتي',                                 icon: Trophy },
  ];

  // ── Home Tab ───────────────────────────────────────────────────────────────
  const renderHomeTab = () => (
    <div className="space-y-5">
      {studentRecord && (
        <StudentProfileCard
          student={{
            fullName: studentRecord.fullName || studentName,
            grade: studentRecord.grade,
            photoUrl: studentRecord.photoUrl || studentPhoto,
            parentName: studentRecord.parentName,
            parentPhone: studentRecord.parentPhone,
            nationalId: studentRecord.nationalId,
            dateOfBirth: studentRecord.dateOfBirth,
            notes: studentRecord.notes,
          }}
          greeting="مرحباً بك يا بطل 👋"
          variant="student"
          showParent={true}
        />
      )}

      {/* Quick Homework Preview */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-teal-600" />
            <h3 className="font-black text-sm text-slate-900">الواجبات المطلوبة منك 📋</h3>
          </div>
          <button onClick={() => setActiveTab('homework')} className="text-xs font-black text-teal-700 hover:underline cursor-pointer">
            عرض الكل ({homeworks.length})
          </button>
        </div>
        {homeworks.length === 0 ? (
          <div className="p-4 text-center text-xs font-bold text-slate-400">🎉 رائع! لا توجد واجبات متأخرة اليوم.</div>
        ) : (
          <div className="space-y-2">
            {homeworks.slice(0, 2).map(hw => (
              <div key={hw.id} onClick={() => { setActiveTab('homework'); setSelectedHw(hw); }}
                className="p-3 bg-slate-50 hover:bg-teal-50 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition">
                <div>
                  <h4 className="font-black text-xs text-slate-900">{hw.title}</h4>
                  <p className="text-[10px] font-bold text-slate-500">موعد التسليم: {hw.dueDate}</p>
                </div>
                <span className="bg-teal-100 text-teal-800 text-[10px] font-black px-2.5 py-1 rounded-full">حل الواجب ✍️</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Certificates Quick Preview */}
      {certificates.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-amber-100 pb-3">
            <div className="flex items-center gap-2">
              <Trophy size={18} className="text-amber-600" />
              <h3 className="font-black text-sm text-slate-900">شهاداتي 🏆</h3>
            </div>
            <button onClick={() => setActiveTab('certificates')} className="text-xs font-black text-amber-700 hover:underline cursor-pointer">
              عرض الكل ({certificates.length})
            </button>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white/70 rounded-2xl border border-amber-100">
            <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-xl">🏅</div>
            <div>
              <h4 className="font-black text-xs text-slate-900">{certificates[0].title}</h4>
              <p className="text-[10px] font-bold text-amber-700">{certificates[0].programTitle} • {certificates[0].completionDate}</p>
            </div>
          </div>
        </div>
      )}

      {/* Schedule - Only for Doctor's Class (Ikhlas Jeddah) */}
      {isIkhlas ? (
        <div>
          <OverviewScheduleBoard
            variant="student"
            studentName={studentRecord?.fullName || studentName}
            schoolBranch={studentRecord?.schoolBranch}
            onNavigateTab={(t) => setActiveTab(t as Tab)}
          />
        </div>
      ) : (
        /* Masar Platform Student Cards */
        <div className="space-y-4">
          {/* Quick Approved Track Access */}
          <div className="bg-gradient-to-br from-teal-700 via-emerald-700 to-teal-800 rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
            <div className="absolute -left-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Award size={20} className="text-teal-200" />
                <h3 className="font-black text-sm">مسار الطالب المعتمد 🎯</h3>
              </div>
              <button
                onClick={() => setActiveTab('curriculum')}
                className="text-xs font-black bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full transition cursor-pointer"
              >
                عرض المسار المعتمد ↗
              </button>
            </div>
            <p className="text-xs text-teal-100 font-bold mb-3">
              خطة التأهيل والتعليم الفردي المعتمدة للبطل تحت إشراف د. إسماعيل عيسى.
            </p>
            <div className="bg-white/10 rounded-2xl p-3 border border-white/15 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🌱</span>
                <div>
                  <h4 className="font-black text-xs text-white">
                    {studentRecord?.grade === 'صعوبات التعلم'
                      ? 'برنامج صعوبات التعلم والخطة الفردية'
                      : studentRecord?.assignedProgram
                      ? (curriculumPrograms.find(p => p.slug === studentRecord.assignedProgram)?.title || 'المسار التعليمي المعتمد')
                      : 'المسار التعليمي والتأهيلي الفردي'}
                  </h4>
                  <p className="text-[10px] font-bold text-teal-200">معتمد وموثق لدى منصة مسار الذكية ✓</p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('curriculum')}
                className="text-[11px] font-black bg-white text-teal-900 px-3 py-1.5 rounded-xl shadow-xs hover:bg-teal-50 transition cursor-pointer shrink-0"
              >
                فتح المسار
              </button>
            </div>
          </div>

          {/* Educational Games & Challenges */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-500" />
                <h3 className="font-black text-sm text-slate-900">ألعاب الذكاء وتنمية المهارات 🎮</h3>
              </div>
              <span className="text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full">
                أنشطة تفاعلية
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {games.slice(0, 4).map((g) => (
                <Link
                  key={g.slug}
                  href={`/games/${g.slug}`}
                  className="p-3 bg-slate-50 hover:bg-emerald-50 rounded-2xl border border-slate-100 flex items-center gap-2.5 transition active:scale-95 group"
                >
                  <span className="text-xl">🎯</span>
                  <div className="overflow-hidden">
                    <h4 className="font-black text-xs text-slate-900 group-hover:text-emerald-800 truncate">{g.title}</h4>
                    <p className="text-[10px] font-bold text-slate-500 truncate">{g.skill}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ── Homework Tab ───────────────────────────────────────────────────────────
  const renderHomeworkTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <BookOpen size={18} className="text-teal-600" /> الواجبات المنزلية
        </h2>
        <button onClick={() => loadHomework(studentName, studentId, true)}
          className="flex items-center gap-1 text-xs font-black text-teal-700 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl hover:bg-teal-100 transition cursor-pointer">
          <RefreshCw size={12} /> تحديث
        </button>
      </div>

      {homeworks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm space-y-3">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">🎉</div>
          <h3 className="text-lg font-black text-slate-900">لا توجد واجبات منزلية مطلوبة حالياً</h3>
          <p className="text-xs font-bold text-slate-500 max-w-sm mx-auto leading-relaxed">
            أحسنت يا بطل! لم ينشر معلمك واجبات جديدة بعد. ستظهر الواجبات فور نشرها من معلم الفصل.
          </p>
        </div>
      ) : (
        homeworks.map(hw => (
          <div key={hw.id}
            onClick={() => setSelectedHw(hw)}
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md cursor-pointer hover:border-emerald-200 transition-all">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-teal-50 text-teal-600 rounded-xl"><BookOpen size={18} /></div>
                <div>
                  <h3 className="font-black text-sm text-gray-800">{hw.title}</h3>
                  {hw.description && <p className="text-xs text-gray-500 mt-0.5 max-w-xs">{hw.description}</p>}
                  <p className="text-[10px] font-bold text-slate-400 mt-1">📅 التسليم: {hw.dueDate || 'غير محدد'}</p>
                </div>
              </div>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                hw.status === 'assigned' ? 'bg-amber-100 text-amber-700' :
                hw.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                'bg-emerald-100 text-emerald-700'
              }`}>
                {hw.status === 'assigned' ? '📝 مطلوب' : hw.status === 'submitted' ? '⏳ قيد المراجعة' : '✅ تم'}
              </span>
            </div>
            {hw.status === 'assigned' ? (
              <button onClick={(e) => { e.stopPropagation(); setSelectedHw(hw); }}
                className="mt-2 w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs">
                <Send size={13} /> حل وتسليم الواجب بالكتاب تفاعلياً ✍️
              </button>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); setSelectedHw(hw); }}
                className="mt-2 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition flex items-center justify-center gap-2 cursor-pointer">
                <BookOpen size={13} /> استعراض حلي في الكتاب 👁️
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );

  // ── Schedule Tab ───────────────────────────────────────────────────────────
  const renderScheduleTab = () => (
    <div className="space-y-4">
      <OverviewScheduleBoard
        variant="student"
        studentName={studentRecord?.fullName || studentName}
        schoolBranch={studentRecord?.schoolBranch}
        onNavigateTab={(t) => { if (t !== 'schedule') setActiveTab(t as Tab); }}
        showFullWeek={true}
      />
    </div>
  );

  // ── Curriculum Tab ─────────────────────────────────────────────────────────
  const renderCurriculumTab = () => {
    const uploadedFiles = getCurriculumFiles();

    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-teal-600 to-emerald-700 rounded-3xl p-5 text-white shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <BookMarked size={22} />
            <h2 className="text-base font-black">المناهج التعليمية 📚</h2>
          </div>
          <p className="text-xs text-teal-100 font-bold">
            {studentRecord?.schoolBranch === 'IKHLAS_JEDDAH' ? 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى' : 'الصف الأول الابتدائي — منصة مَسَار التعليمية'}
          </p>
          <p className="text-xs text-teal-100 mt-1">المنهج الدراسي للعام ١٤٤٨ هـ</p>
        </div>

        <div className="space-y-3">
          {curriculaList.map(subject => {
            const files = uploadedFiles.filter(f => f.subjectId === subject.slug);
            const subjectIcons: Record<string, string> = {
              'lughati': '📖', 'math': '🔢', 'islamic': '🌙', 'science': '🔬',
              'english': '🔤', 'life-skills': '🌱', 'art': '🎨',
            };
            return (
              <SubjectCard key={subject.slug} subject={{
                slug: subject.slug,
                name: subject.title,
                subtitle: subject.subtitle,
                badge: subject.badge,
                pageCount: subject.pageCount,
                icon: subjectIcons[subject.slug] || '📚',
                color: subject.color || 'bg-blue-50 border-blue-200 text-blue-800',
                topics: (subject as any).units?.map((u: any) => u.title) || (subject as any).chapters?.map((c: any) => c.title) || [],
                files: files.map(f => ({
                  id: f.id,
                  title: f.name,
                  fileUrl: f.base64Data ? `data:${f.mimeType};base64,${f.base64Data}` : undefined,
                  fileType: f.mimeType?.includes('pdf') ? 'pdf' : 'image',
                })),
                uploadedBooks: [],
              }} />
            );
          })}
        </div>
      </div>
    );
  };


  // ── Approved Track Tab (طالب مسار — المسار المعتمد) ──────────────────────
  const renderApprovedTrackTab = () => {
    // Determine approved programs for Masar student
    const assignedSlugs = studentRecord?.assignedPrograms || (studentRecord?.assignedProgram ? [studentRecord.assignedProgram] : []);
    
    // Fallback: If no assigned programs yet, but student grade or notes indicate 'صعوبات التعلم'
    let resolvedPrograms = curriculumPrograms.filter((p) => assignedSlugs.includes(p.slug));
    if (resolvedPrograms.length === 0) {
      const isDifficulties =
        studentRecord?.grade === 'صعوبات التعلم' ||
        studentRecord?.notes?.includes('صعوبات التعلم') ||
        (studentRecord as any)?.targetProgram === 'learning-difficulties';
      if (isDifficulties) {
        resolvedPrograms = curriculumPrograms.filter((p) => p.slug === 'learning-difficulties');
      }
    }

    return (
      <div className="space-y-4">
        {/* Banner */}
        <div className="bg-gradient-to-br from-teal-700 via-emerald-700 to-teal-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -left-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-white/15 rounded-2xl backdrop-blur-xs text-xl">🎯</span>
              <div>
                <h2 className="text-base md:text-lg font-black">المسار التعليمي والتأهيلي المعتمد</h2>
                <p className="text-xs text-teal-100 font-bold">منصة مَسَار الذكية · التعليم الفردي المتخصص</p>
              </div>
            </div>
            <span className="text-[11px] font-black bg-emerald-400/30 border border-emerald-300/40 text-emerald-100 px-3 py-1 rounded-full">
              {resolvedPrograms.length > 0 ? 'مسار معتمد ✓' : 'قيد التقييم ⏳'}
            </span>
          </div>
          <p className="text-xs text-teal-100/90 leading-relaxed mt-2 font-medium">
            {resolvedPrograms.length > 0
              ? 'الخطة الفردية المعتمدة للبطل تحت الإشراف المباشر لاستشاري التعليم الحديث وصعوبات التعلم د. إسماعيل عيسى.'
              : 'يقوم د. إسماعيل عيسى بمراجعة بيانات وتقييم الطالب لاعتماد المسار المناسب والخطة الفردية.'}
          </p>
        </div>

        {resolvedPrograms.length > 0 ? (
          <div className="space-y-4">
            {resolvedPrograms.map((prog) => (
              <div key={prog.slug} className="bg-white rounded-3xl border border-slate-200 p-5 md:p-6 shadow-sm space-y-5">
                {/* Program Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                        {prog.tag || 'خطة فردية متخصصة'}
                      </span>
                      <span className="text-xs font-bold text-slate-400">⏱️ {prog.duration}</span>
                    </div>
                    <h3 className="text-lg font-black text-slate-900">{prog.title}</h3>
                    <p className="text-xs font-bold text-slate-500 mt-1">المستوى: {prog.level}</p>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-black text-xs px-3 py-1.5 rounded-2xl shadow-2xs">
                      <CheckCircle size={14} className="text-emerald-600" /> مسار معتمد رسمياً
                    </span>
                  </div>
                </div>

                {/* Promise / Overview */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-xs font-black text-slate-700 mb-1">💡 فكرة المسار والهدف العام:</p>
                  <p className="text-xs font-bold text-slate-600 leading-relaxed">{prog.promise}</p>
                </div>

                {/* Expected Outcomes */}
                {prog.outcomes && prog.outcomes.length > 0 && (
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span>🎯 أهداف ومخرجات المسار المعتمد:</span>
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {prog.outcomes.map((outcome, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2.5 rounded-xl bg-teal-50/50 border border-teal-100/80 text-xs font-bold text-slate-800">
                          <span className="text-teal-700 font-black shrink-0 mt-0.5">✓</span>
                          <span>{outcome}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Training Plan Stages / Modules */}
                {prog.modules && prog.modules.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <span>📋 مراحل الخطة التدريبية المعتمدة:</span>
                    </h4>
                    <div className="space-y-2.5">
                      {prog.modules.map((mod, idx) => (
                        <div key={idx} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-teal-800 bg-teal-100/70 px-2.5 py-0.5 rounded-lg">
                              {mod.week.startsWith('المرحلة') || mod.week.startsWith('الأسبوع') ? mod.week : `المرحلة: ${mod.week}`}
                            </span>
                            <span className="text-xs font-black text-slate-900">{mod.title}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-600">🎯 الهدف: {mod.goal}</p>
                          {mod.mastery && (
                            <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl inline-block">
                              🏆 معيار الإتقان: {mod.mastery}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Empty / Pending Doctor Review State */
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl">
              ⏳
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-black text-slate-900">ملف الطالب قيد مراجعة د. إسماعيل عيسى</h3>
              <p className="text-xs font-bold text-slate-500 max-w-md mx-auto leading-relaxed">
                يقوم استشاري التعليم وصعوبات التعلم د. إسماعيل عيسى حالياً بمراجعة تقييم الطالب لتحديد واعتماد المسار التأهيلي الأنسب (مثل صعوبات التعلم، تأسيس القراءة، أو الحساب الذهني). ستظهر الخطة الفردية المعتمدة هنا فور الاعتماد.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-800 border border-amber-200 px-4 py-2 rounded-2xl text-xs font-black">
              <span>الحالة: قيد التدقيق الإكلينيكي والاعتماد</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Certificates Tab ───────────────────────────────────────────────────────
  const renderCertificatesTab = () => (
    <StudentAchievementsTab
      studentId={studentId || studentRecord?.id || ''}
      studentName={studentRecord?.fullName || studentName}
      grade={studentRecord?.grade}
      variant="student"
    />
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-slate-900" dir="rtl">
      {/* Navbar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-4 py-3 mb-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-1.5">
              <span>منصة مَسَار الذكية</span>
              {studentRecord?.schoolBranch === 'IKHLAS_JEDDAH' ? (
                <span className="text-xs bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
                  فصل د. إسماعيل
                </span>
              ) : (
                <span className="text-xs bg-teal-100 text-teal-800 font-black px-2.5 py-0.5 rounded-full border border-teal-200">
                  بوابة الطالب
                </span>
              )}
            </h1>
            <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              بوابة الطالب التفاعلية — {new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell role="student" studentId={studentId || studentRecord?.id} />
            <Link href="/face-enroll"
              className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 px-3 py-2 rounded-2xl text-xs font-black transition-all shadow-xs active:scale-95">
              <ScanFace size={16} className="text-emerald-700" />
              <span className="hidden sm:inline">تسجيل الوجه</span>
            </Link>
            <button onClick={handleLogout}
              className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-2xl text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer">
              <LogOut size={16} /> <span>خروج</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center font-bold text-sm">{error}</div>
        ) : (
          <>
            {activeTab === 'home'         && renderHomeTab()}
            {activeTab === 'homework'     && renderHomeworkTab()}
            {activeTab === 'schedule'     && isIkhlas && renderScheduleTab()}
            {activeTab === 'curriculum'   && (isIkhlas ? renderCurriculumTab() : renderApprovedTrackTab())}
            {activeTab === 'certificates' && renderCertificatesTab()}
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-3 left-3 right-3 max-w-2xl mx-auto z-40 bg-white/95 backdrop-blur-xl border-2 border-emerald-500/30 shadow-2xl rounded-3xl p-1.5 ring-4 ring-emerald-500/10">
        <div className={`grid ${tabs.length === 5 ? 'grid-cols-5' : 'grid-cols-4'} gap-0.5`}>
          {tabs.map(t => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-2xl transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-black shadow-lg shadow-emerald-600/30 scale-105'
                    : 'text-slate-600 hover:text-slate-900 font-bold hover:bg-slate-100/80'
                }`}>
                <Icon className={`w-4 h-4 ${active ? 'text-white stroke-[2.5]' : 'text-slate-600'}`} />
                <span className="text-[9px] leading-none">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Homework Interactive Solver Modal */}
      {selectedHw && (
        <StudentInteractiveHomeworkModal
          hw={selectedHw}
          studentId={studentId || studentRecord?.id || ''}
          studentName={studentRecord?.fullName || studentName}
          onClose={() => setSelectedHw(null)}
          onSubmitSuccess={() => {
            setSelectedHw(null);
            loadHomework(studentName, studentId, true);
          }}
        />
      )}
    </div>
  );
}

// ── Subject Card Component ─────────────────────────────────────────────────
function SubjectCard({ subject }: { subject: { slug?: string; name: string; subtitle?: string; badge?: string; pageCount?: number; icon: string; color: string; topics: string[]; files?: any[]; uploadedBooks?: any[] } }) {
  const [open, setOpen] = useState(false);
  const hasFiles = (subject.files?.length ?? 0) > 0;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden`}>
      <div className="p-4 flex items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{subject.icon}</span>
          <div className="text-right">
            <span className="font-black text-sm text-slate-900 block">{subject.name}</span>
            <span className="text-[11px] text-slate-500 font-bold block">{subject.subtitle || 'كتاب الطالب التفاعلي'}</span>
            <div className="flex items-center gap-2 mt-1">
              {subject.pageCount && (
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                  📄 {subject.pageCount} صفحة تفاعلية
                </span>
              )}
              {hasFiles && (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                  📁 {subject.files!.length} ملف إضافي
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {subject.slug && (
            <Link
              href={`/programs/curricula/${subject.slug}`}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-sm transition active:scale-95 cursor-pointer"
            >
              <span>فتح الكتاب التفاعلي ✍️</span>
            </Link>
          )}
          <button
            onClick={() => setOpen(o => !o)}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition cursor-pointer"
            title="عرض الفهرس والوحدات"
          >
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 space-y-3 bg-slate-50/50">
          {/* Direct Interactive Link Alert */}
          {subject.slug && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between gap-2">
              <div className="text-right">
                <p className="text-xs font-black text-teal-900">الكتاب المدرسي التفاعلي بالقلم والحل الرقمي</p>
                <p className="text-[10px] text-teal-700 font-bold">يمكنك الكتابة والتلوين وحل الواجبات مباشرة داخل صفحات هذا المنهج.</p>
              </div>
              <Link
                href={`/programs/curricula/${subject.slug}`}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-black px-3 py-1.5 rounded-lg shrink-0 transition"
              >
                دخول الكتاب 📖
              </Link>
            </div>
          )}

          {/* Uploaded files / books */}
          {hasFiles && (
            <div className="space-y-2">
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-wide">📚 الكتب والملفات المرفوعة</p>
              {subject.files!.map((f: any) => (
                <a key={f.id} href={f.fileUrl || f.url || '#'} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2.5 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition">
                  <span className="text-lg">{f.fileType === 'pdf' || f.fileType === 'book' ? '📕' : '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-teal-800 truncate">{f.title || f.name || 'ملف'}</p>
                    {f.description && <p className="text-[10px] text-teal-600 truncate">{f.description}</p>}
                  </div>
                  <span className="text-[10px] bg-teal-600 text-white px-2 py-0.5 rounded-full font-bold">عرض</span>
                </a>
              ))}
            </div>
          )}

          {/* Topics / chapters */}
          {subject.topics.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-black text-slate-500 uppercase tracking-wide">📋 فهرس الوحدات والدروس</p>
              {subject.topics.map(t => (
                <div key={t} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200/70">
                  <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                  <span className="text-xs font-bold text-slate-700">{t}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
