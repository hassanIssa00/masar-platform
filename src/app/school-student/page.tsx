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
import { getCurriculumFiles } from '@/lib/curriculumDb';
import {
  clearSession, getSession, getStudents, getAccounts, getReports,
  updateStudent, getIkhlasPosts, hydrateSessionFromServer,
  StudentRecord, AccountRecord
} from '@/lib/cloudStore';
import {
  getClassStudents, ClassStudentRecord,
  getStudentCertificateLogs, StudentCertificateLog
} from '@/lib/classDb';
import { getLocalHomework, HomeworkRecord } from '@/lib/homework';
import { pullCloudDataToLocal, syncDocToCloud, readCloudCache } from '@/lib/firestoreSync';
import { normalizeArabicText } from '@/lib/nameMatching';
import StudentProfileCard from '@/components/StudentProfileCard';
import OverviewScheduleBoard from '@/components/OverviewScheduleBoard';

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

    // Strategy 1: exact match by studentId or name
    const exact = allHw.filter(hw => {
      if (!hw.studentId || hw.studentId === '' || hw.studentId === 'all') return true;
      if (hw.studentId === id) return true;
      if (hw.studentName && normalizeArabicText(hw.studentName) === normalizeArabicText(name)) return true;
      return false;
    });

    // Strategy 2: if nothing found, show all class homework deduplicated by title
    let merged = exact.length > 0 ? exact : (() => {
      const seenTitles = new Set<string>();
      return allHw.filter(hw => {
        if (seenTitles.has(hw.title)) return false;
        seenTitles.add(hw.title);
        return true;
      });
    })();

    // Strategy 3: Also load from curriculumAssignments
    const currAssignments = readCloudCache<any>('masar.curriculumAssignments.v1');
    const studentCurrAssignments = currAssignments.filter((a: any) =>
      !a.studentId || a.studentId === 'all' || a.studentId === id ||
      (a.studentName && normalizeArabicText(a.studentName) === normalizeArabicText(name))
    );
    const currAsHomework: HomeworkRecord[] = (studentCurrAssignments.length > 0 ? studentCurrAssignments : currAssignments).map((a: any) => ({
      id: a.id || `assign_${a.subjectSlug}_${a.studentId}`,
      studentId: a.studentId || id,
      studentName: a.studentName || name,
      title: `واجب ${a.subjectTitle || 'المنهج'} (ص ${a.fromPage} - ${a.toPage})`,
      description: `حل التدريبات والأنشطة التفاعلية بالكتاب المدرسي من صفحة (${a.fromPage}) إلى صفحة (${a.toPage}).`,
      dueDate: a.dueDate || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      status: 'assigned' as const,
      createdAt: a.assignedAt || new Date().toISOString(),
    }));

    for (const ca of currAsHomework) {
      if (!merged.find(h => h.id === ca.id || h.title === ca.title)) {
        merged = [...merged, ca];
      }
    }

    // Strategy 4: also check ikhlas posts for homework type
    const posts = getIkhlasPosts();
    const fromPosts: HomeworkRecord[] = posts
      .filter(p => p.type === 'homework')
      .map(p => ({
        id: p.id,
        studentId: 'all',
        studentName: '',
        title: p.title,
        description: p.content || '',
        dueDate: p.dueDate || p.createdAt?.slice(0, 10) || '',
        status: 'assigned' as const,
        createdAt: p.createdAt,
      }));

    for (const p of fromPosts) {
      if (!merged.find(h => h.title === p.title)) merged = [...merged, p];
    }

    setHomeworks(merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  const loadCertificates = useCallback(async (id: string, name: string, forcePull = false) => {
    if (forcePull) {
      await pullCloudDataToLocal(['studentCertLogs']).catch(() => {});
    }
    const allCerts = readCloudCache<StudentCertificateLog>('masar_student_cert_logs_v1');

    // Match by studentId OR by student name
    const mine = allCerts.filter(c =>
      c.studentId === id ||
      (c.studentName && normalizeArabicText(c.studentName) === normalizeArabicText(name))
    );

    // If nothing found and there are certs, show all (could be linked differently)
    const result = mine.length > 0 ? mine : allCerts;

    setCertificates(result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  const handleLogout = () => { clearSession(); router.push('/login'); };

  const tabs: Array<{ key: Tab; label: string; icon: any }> = [
    { key: 'home',         label: 'الرئيسية',  icon: Home },
    { key: 'homework',     label: 'الواجبات',  icon: BookOpen },
    { key: 'schedule',     label: 'الجدول',    icon: Clock },
    { key: 'curriculum',   label: 'المناهج',   icon: BookMarked },
    { key: 'certificates', label: 'شهاداتي',   icon: Trophy },
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

      {/* Schedule */}
      <div>
        <OverviewScheduleBoard
          variant="student"
          studentName={studentRecord?.fullName || studentName}
          schoolBranch={studentRecord?.schoolBranch}
          onNavigateTab={(t) => setActiveTab(t as Tab)}
        />
      </div>
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
            onClick={() => hw.status === 'assigned' && setSelectedHw(hw)}
            className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-all ${hw.status === 'assigned' ? 'hover:shadow-md cursor-pointer hover:border-emerald-200' : 'opacity-80'}`}>
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
            {hw.status === 'assigned' && (
              <button onClick={() => setSelectedHw(hw)}
                className="mt-2 w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2">
                <Send size={13} /> تسليم الواجب
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


  // ── Certificates Tab ───────────────────────────────────────────────────────
  const renderCertificatesTab = () => (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-5 text-white shadow-lg flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Trophy size={22} />
            <h2 className="text-base font-black">شهادات التميز 🏆</h2>
          </div>
          <p className="text-xs text-amber-100 font-bold">شهادات التفوق والإنجاز الخاصة بك</p>
          <p className="text-xs text-amber-100 mt-1">{studentRecord?.fullName || studentName}</p>
        </div>
        <button
          onClick={() => loadCertificates(studentId, studentName, true)}
          className="flex items-center gap-1 text-xs font-black text-amber-900 bg-white/90 hover:bg-white px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer"
        >
          <RefreshCw size={12} /> تحديث
        </button>
      </div>

      {certificates.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm space-y-3">
          <div className="w-20 h-20 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto text-4xl">🏅</div>
          <h3 className="text-base font-black text-slate-900">لا توجد شهادات بعد</h3>
          <p className="text-xs font-bold text-slate-500 max-w-sm mx-auto leading-relaxed">
            {studentRecord?.schoolBranch === 'IKHLAS_JEDDAH'
              ? 'ستظهر شهادات التميز هنا فور منحها لك من د. إسماعيل عيسى. واصل التفوق يا بطل! ⭐'
              : 'ستظهر شهادات التميز هنا فور منحها لك من معلميك في منصة مَسَار. واصل التفوق يا بطل! ⭐'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {certificates.map(cert => (
            <div key={cert.id} className="bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden">
              {/* Certificate header */}
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 border-b border-amber-100 flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-2xl">{cert.badge || '🏅'}</div>
                <div className="flex-1">
                  <h3 className="font-black text-sm text-slate-900">{cert.title}</h3>
                  <p className="text-xs font-bold text-amber-700">{cert.programTitle}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500">{cert.completionDate}</p>
                  {cert.score > 0 && (
                    <div className="flex items-center gap-1 justify-end mt-1">
                      <Star size={10} className="fill-amber-500 text-amber-500" />
                      <span className="text-xs font-black text-amber-700">{cert.score}%</span>
                    </div>
                  )}
                </div>
              </div>
              {/* Certificate body */}
              <div className="p-4 space-y-2">
                {cert.achievement && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-3 py-2">
                    <p className="text-xs font-black text-emerald-800">🎯 {cert.achievement}</p>
                  </div>
                )}
                {cert.ratingText && <p className="text-xs font-bold text-slate-600">التقدير: {cert.ratingText}</p>}
                {cert.note && <p className="text-xs text-slate-500 leading-relaxed italic">"{cert.note}"</p>}
                {cert.doctorName && (
                  <p className="text-[10px] font-bold text-slate-400 text-left ltr">
                    — {cert.doctorName} {cert.doctorTitle ? `· ${cert.doctorTitle}` : ''}
                  </p>
                )}
                {cert.certNumber && (
                  <p className="text-[10px] font-mono text-slate-400">رقم الشهادة: {cert.certNumber}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
            {activeTab === 'schedule'     && renderScheduleTab()}
            {activeTab === 'curriculum'   && renderCurriculumTab()}
            {activeTab === 'certificates' && renderCertificatesTab()}
          </>
        )}
      </div>

      {/* Bottom Nav — 5 tabs */}
      <div className="fixed bottom-3 left-3 right-3 max-w-2xl mx-auto z-40 bg-white/95 backdrop-blur-xl border-2 border-emerald-500/30 shadow-2xl rounded-3xl p-1.5 ring-4 ring-emerald-500/10">
        <div className="grid grid-cols-5 gap-0.5">
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

      {/* Homework Submission Modal */}
      {selectedHw && (
        <HomeworkModal
          hw={selectedHw}
          onClose={() => setSelectedHw(null)}
          onSubmitSuccess={() => { setSelectedHw(null); loadHomework(studentName, studentId); }}
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



// ── Homework Submission Modal ──────────────────────────────────────────────
function HomeworkModal({ hw, onClose, onSubmitSuccess }: { hw: HomeworkRecord; onClose: () => void; onSubmitSuccess: () => void }) {
  const [subTab, setSubTab] = useState<'text' | 'image' | 'audio'>('text');
  const [answer, setAnswer] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setImagePreview(reader.result as string); setAnswer(reader.result as string); };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        const reader = new FileReader();
        reader.onloadend = () => setAnswer(reader.result as string);
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch { alert('يرجى السماح بالوصول إلى الميكروفون'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const handleSubmit = async () => {
    if (!answer) return;
    setIsSubmitting(true);
    try {
      await fetch(`${API}/school/homework/${hw.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: subTab, content: answer }),
      });
      onSubmitSuccess();
    } catch { alert('حدث خطأ أثناء إرسال الواجب'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center bg-black/60 backdrop-blur-sm sm:p-4" dir="rtl">
      <div className="bg-white w-full sm:max-w-md sm:mx-auto rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="font-black text-gray-800 text-sm">{hw.title}</h3>
            {hw.description && <p className="text-xs text-gray-500 mt-0.5">{hw.description}</p>}
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-red-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          {(['text', 'image', 'audio'] as const).map(tab => (
            <button key={tab} onClick={() => setSubTab(tab)}
              className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs font-bold border-b-2 transition-colors ${subTab === tab ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
              {tab === 'text' && <><FileText size={16} /> نص</>}
              {tab === 'image' && <><Camera size={16} /> صورة</>}
              {tab === 'audio' && <><Mic size={16} /> صوت</>}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {subTab === 'text' && (
            <textarea className="w-full h-40 p-3 bg-gray-50 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:border-emerald-500 text-xs font-bold text-gray-700"
              placeholder="اكتب إجابتك هنا يا بطل..." value={answer} onChange={e => setAnswer(e.target.value)} />
          )}
          {subTab === 'image' && (
            <div className="h-40 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gray-50 relative overflow-hidden">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={() => { setImagePreview(null); setAnswer(''); }} className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur text-red-500 rounded-xl"><X size={16} /></button>
                </>
              ) : (
                <label className="flex flex-col items-center gap-2 cursor-pointer p-4">
                  <Upload className="text-gray-400" size={28} />
                  <span className="text-xs font-bold text-gray-500">اختر صورة أو التقط من الكاميرا</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>
          )}
          {subTab === 'audio' && (
            <div className="h-40 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gray-50 gap-3">
              {!audioURL ? (
                <button type="button" onClick={isRecording ? stopRecording : startRecording}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${isRecording ? 'bg-red-500 animate-pulse scale-110' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
                  {isRecording ? <Square size={20} /> : <Mic size={24} />}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <audio src={audioURL} controls className="h-10" />
                  <button onClick={() => { setAudioURL(null); setAnswer(''); }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><X size={18} /></button>
                </div>
              )}
              {isRecording && <span className="text-red-500 text-xs font-bold animate-pulse">جاري تسجيل صوتك...</span>}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white">
          <button onClick={handleSubmit} disabled={!answer || isSubmitting}
            className={`w-full py-3.5 rounded-2xl text-white font-bold text-xs flex justify-center items-center gap-2 shadow-lg transition-all ${!answer || isSubmitting ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-emerald-500 hover:bg-emerald-600'}`}>
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><Send size={16} /> تسليم الواجب للمعلم</>}
          </button>
        </div>
      </div>
    </div>
  );
}
