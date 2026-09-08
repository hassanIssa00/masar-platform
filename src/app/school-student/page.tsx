'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen, Star, Mic, Camera, FileText, CheckCircle, CheckCircle2, Award,
  Clock, Video, ChevronRight, Send, Loader2, X, Play, Square,
  Upload, LogOut, ScanFace, Sparkles, Home, GraduationCap,
  Calendar, BookMarked, Trophy, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { DAY_NAMES, SUBJECT_COLORS, getTodayPeriods, getCurrentPeriod, getSavedSchedule, Period } from '@/data/ikhlasSchedule';
import { getSaudiNow } from '@/lib/saudiTime';
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
  getClassStudents, saveClassStudent, ClassStudentRecord,
  getStudentCertificateLogs, StudentCertificateLog,
  getStudentHomeworkLogs,
} from '@/lib/classDb';
import { getLocalHomework, HomeworkRecord } from '@/lib/homework';
import { pullCloudDataToLocal, syncDocToCloud, readCloudCache, subscribeToCloudUpdates } from '@/lib/firestoreSync';
import { normalizeArabicText, isStudentNameMatch } from '@/lib/nameMatching';
import StudentProfileCard from '@/components/StudentProfileCard';
import OverviewScheduleBoard from '@/components/OverviewScheduleBoard';
import StudentInteractiveHomeworkModal from '@/components/StudentInteractiveHomeworkModal';
import StudentAchievementsTab from '@/components/StudentAchievementsTab';
import NotificationBell from '@/components/NotificationBell';
import { recordUserPresence } from '@/lib/presence';
import dynamic from 'next/dynamic';
import { isFaceEnrolled as checkFaceEnrolled } from '@/lib/faceAuth';
import {
  getStudentTodayAttendance,
  markStudentAttendanceViaFace,
  getLocalAttendance,
  getStudentTodayPeriodsAttendance,
  AttendanceRecord,
  PERIOD_NAMES,
} from '@/lib/attendance';

const FaceEnrollModal = dynamic(() => import('@/components/FaceEnrollModal'), { ssr: false });
const StudentFaceAttendanceModal = dynamic(() => import('@/components/StudentFaceAttendanceModal'), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
const BRANCH = 'IKHLAS_JEDDAH';

type Tab = 'home' | 'attendance' | 'homework' | 'schedule' | 'curriculum' | 'certificates';

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
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [showFaceEnrollModal, setShowFaceEnrollModal] = useState(false);
  const [showFaceAttendanceModal, setShowFaceAttendanceModal] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null>(null);
  const [todayPeriodsAttendance, setTodayPeriodsAttendance] = useState<Record<number, AttendanceRecord>>({});
  const [targetPeriodForModal, setTargetPeriodForModal] = useState<{ periodNumber: number; subjectName: string } | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<{ photoUrl: string; title: string; time: string } | null>(null);
  const [showOneTimeFacePrompt, setShowOneTimeFacePrompt] = useState(false);
  const [faceToastMsg, setFaceToastMsg] = useState('');
  const [accountSessionId, setAccountSessionId] = useState('');

  useEffect(() => {
    let cancelled = false;
    let currentFinalName = '';
    let currentResolvedId = '';
    const loadStudentPortal = async () => {
      await pullCloudDataToLocal(['students', 'accounts', 'homework', 'curriculumAssignments', 'classStudents', 'studentCertLogs', 'studentHomeworkLogs', 'studentBadges', 'notifications', 'messages', 'ikhlasPosts'], true).catch(() => {});
      if (cancelled) return;

      const session = getSession() ?? await hydrateSessionFromServer();
      if (cancelled) return;
      if (!session) { router.replace('/login'); return; }
      if (session.id) setAccountSessionId(session.id);
      if (session.role === 'doctor' || session.role === 'specialist') { router.replace('/dashboard'); return; }
      // Route parent by school branch: IKHLAS_JEDDAH → school-parent, MASAR → parent
      if (session.role === 'parent') { router.replace((session as any).schoolBranch === 'IKHLAS_JEDDAH' ? '/school-parent' : '/parent'); return; }

      const sessionBranch = (session as any)?.schoolBranch || 'MASAR';
      const isSessionIkhlas = sessionBranch === 'IKHLAS_JEDDAH';
      const classStudents = isSessionIkhlas ? getClassStudents() : [];
      const allStudents = getStudents();
      const allAccounts = getAccounts();
      const combined = isSessionIkhlas ? [...classStudents, ...allStudents] : allStudents;

      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const paramStudentId = urlParams?.get('student')?.trim() || '';
      const tabParam = urlParams?.get('tab') as Tab | null;
      if (tabParam && ['home', 'homework', 'schedule', 'curriculum', 'certificates'].includes(tabParam)) {
        setActiveTab(tabParam);
      }

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
        if (paramStudentId && (s.id === paramStudentId || s.studentAccountId === paramStudentId || (s as any).accountId === paramStudentId)) return true;
        if (linkedStudentId && s.id === linkedStudentId) return true;
        if (session.id && s.id === session.id) return true;
        if (session.id && s.studentAccountId === session.id) return true;
        if (email && s.linkedStudentEmail?.trim().toLowerCase() === email) return true;
        if (sName && !isSyntheticOrGeneric(sName) && isStudentNameMatch(s.fullName, sName)) return true;
        if (phone && phone.length >= 8 && s.parentPhone && s.parentPhone.replace(/\D/g, '').includes(phone.slice(-8))) return true;
        if (email && ((s.email || '').trim().toLowerCase() === email || (s.recoveryEmail || '').trim().toLowerCase() === email)) return true;
        return false;
      }) || null;

      if (!linked && (paramStudentId || session.id)) {
        const acc = allAccounts.find(a => (paramStudentId && a.id === paramStudentId) || (session.id && a.id === session.id));
        if (acc) {
          linked = combined.find((s: any) =>
            (acc.linkedStudentId && s.id === acc.linkedStudentId) ||
            (acc.name && !isSyntheticOrGeneric(acc.name) && isStudentNameMatch(s.fullName, acc.name))
          ) || null;
        }
      }

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
      currentFinalName = finalName;
      currentResolvedId = resolvedId;
      setStudentName(finalName);
      setStudentPhoto(photoUrl);
      setStudentId(resolvedId);
      setStudentRecord({
        ...(linked || {}),
        fullName: finalName,
        photoUrl,
        grade: linked?.grade || (isSessionIkhlas ? 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى' : 'الصف الأول الابتدائي'),
        schoolBranch: isSessionIkhlas ? 'IKHLAS_JEDDAH' : 'MASAR',
        parentName: linked?.parentName || '',
        parentPhone: linked?.parentPhone || session.phone || '',
        nationalId: linked?.nationalId || (session as any)?.nationalId || '',
        dateOfBirth: linked?.dateOfBirth || '',
        notes: linked?.notes || '',
      });

      // Record student presence
      void recordUserPresence({ role: 'student', studentId: resolvedId, studentName: finalName });

      // Directly record active presence in class_students and sync to Firestore
      try {
        const clsList = getClassStudents();
        const matchedCs = clsList.find(cs =>
          (resolvedId && (cs.id === resolvedId || cs.studentAccountId === resolvedId)) ||
          (finalName && isStudentNameMatch(cs.fullName, finalName))
        );
        if (matchedCs) {
          const nowIso = new Date().toISOString();
          saveClassStudent({
            ...matchedCs,
            studentLastActiveAt: nowIso,
            lastActiveAt: nowIso,
          });
        }
      } catch {}

      // Load homework from Firestore (via local cache pulled above)
      loadHomework(finalName, resolvedId);
      // Load certificates
      loadCertificates(resolvedId, finalName);
      setLoading(false);

      // Check Face ID enrollment status & trigger one-time prompt ONLY if not enrolled
      const isLoginViaFace = typeof window !== 'undefined' && localStorage.getItem('masar_last_login_provider') === 'face';
      const sessionHasFace = Boolean((session as any)?.hasFaceId || (session as any)?.lastLoginProvider === 'face');
      const localEnrolled = typeof window !== 'undefined' && (
        localStorage.getItem(`masar_face_enrolled_${resolvedId}`) === 'true' ||
        localStorage.getItem(`masar_face_enrolled_${session.id}`) === 'true'
      );
      
      let isEnrolled = isLoginViaFace || sessionHasFace || localEnrolled || checkFaceEnrolled(resolvedId) || checkFaceEnrolled(session.id);

      if (!isEnrolled) {
        // Also check server in real-time from Firestore faceRecordsV2
        try {
          const checkId = resolvedId || session.id;
          const res = await fetch(`/api/auth/face?userId=${encodeURIComponent(checkId)}`, { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            if (data?.enrolled) {
              isEnrolled = true;
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem(`masar_face_enrolled_${resolvedId}`, 'true');
                  localStorage.setItem(`masar_face_enrolled_${session.id}`, 'true');
                  localStorage.setItem(`masar_face_prompt_seen_${resolvedId}`, '1');
                  localStorage.setItem(`masar_face_prompt_seen_${session.id}`, '1');
                } catch {}
              }
            }
          }
        } catch {}
      }

      setFaceEnrolled(isEnrolled);

      // Check today's attendance status (READ ONLY — NEVER auto-record attendance on page load!)
      const existingAtt = getStudentTodayAttendance(resolvedId) || (session.id ? getStudentTodayAttendance(session.id) : undefined);
      setTodayAttendance(existingAtt || null);
      setTodayPeriodsAttendance(getStudentTodayPeriodsAttendance(resolvedId));

      // Trigger one-time prompt ONLY if truly not enrolled AND prompt hasn't been seen/dismissed
      if (!isEnrolled) {
        const promptKey = `masar_face_prompt_seen_${resolvedId}`;
        const promptKeySession = `masar_face_prompt_seen_${session.id}`;
        const seen = typeof window !== 'undefined' ? (localStorage.getItem(promptKey) || localStorage.getItem(promptKeySession)) : null;
        if (!seen) {
          setTimeout(() => {
            setShowOneTimeFacePrompt(true);
          }, 850);
        }
      }
    };

    void loadStudentPortal();

    const onAttUpdated = () => {
      if (currentResolvedId) {
        const att = getStudentTodayAttendance(currentResolvedId);
        if (att) setTodayAttendance(att);
        setTodayPeriodsAttendance(getStudentTodayPeriodsAttendance(currentResolvedId));
      }
    };
    window.addEventListener('masar_attendance_updated', onAttUpdated);

    const presenceInterval = setInterval(() => {
      if (!cancelled && currentResolvedId) {
        void recordUserPresence({ role: 'student', studentId: currentResolvedId, studentName: currentFinalName });
        try {
          const clsList = getClassStudents();
          const matchedCs = clsList.find(cs =>
            (currentResolvedId && (cs.id === currentResolvedId || cs.studentAccountId === currentResolvedId)) ||
            (currentFinalName && isStudentNameMatch(cs.fullName, currentFinalName))
          );
          if (matchedCs) {
            const nowIso = new Date().toISOString();
            saveClassStudent({
              ...matchedCs,
              studentLastActiveAt: nowIso,
              lastActiveAt: nowIso,
            });
          }
        } catch {}
      }
    }, 2 * 60 * 1000);

    const unsubscribe = subscribeToCloudUpdates(() => {
      if (!cancelled && currentResolvedId) {
        void pullCloudDataToLocal(['homework', 'curriculumAssignments', 'ikhlasPosts', 'studentHomeworkLogs', 'studentCertLogs', 'studentBadges', 'notifications'], true).then(() => {
          loadHomework(currentFinalName, currentResolvedId);
          loadCertificates(currentResolvedId, currentFinalName);
        });
      }
    });
    return () => {
      cancelled = true;
      clearInterval(presenceInterval);
      unsubscribe();
      window.removeEventListener('masar_attendance_updated', onAttUpdated);
    };
  }, [router]);

  const loadHomework = useCallback(async (name: string, id: string, forcePull = false) => {
    if (forcePull) {
      await pullCloudDataToLocal(['homework', 'curriculumAssignments', 'ikhlasPosts', 'studentHomeworkLogs', 'studentBadges'], true).catch(() => {});
    }
    const allHw = getLocalHomework();
    const logs = getStudentHomeworkLogs(id, name);

    const sName = name ? normalizeArabicText(name) : '';
    const classStudentMatches = getClassStudents().filter(cs => {
      if (id && cs.id === id) return true;
      if (sName && cs.fullName && isStudentNameMatch(cs.fullName, sName)) return true;
      return false;
    });
    const session = getSession();
    const allAccounts = getAccounts();
    const matchingAccounts = allAccounts.filter(a =>
      a.id === id || a.linkedStudentId === id || (sName && a.name && isStudentNameMatch(a.name, sName))
    );
    const validStudentIds = new Set<string>([
      ...(id ? [id] : []),
      ...(session?.id ? [session.id] : []),
      ...(session?.linkedStudentId ? [session.linkedStudentId] : []),
      ...classStudentMatches.map(c => c.id),
      ...matchingAccounts.map(a => a.id),
      ...matchingAccounts.map(a => a.linkedStudentId || '').filter(Boolean),
    ]);

    const isMatch = (targetId?: string, targetName?: string, studentAccId?: string) => {
      if (!targetId && !targetName && !studentAccId) return false;
      // Do NOT allow targetId === 'all' so new students don't inherit old homework!
      if (targetId && targetId !== 'all' && validStudentIds.has(targetId)) return true;
      if (studentAccId && studentAccId !== 'all' && validStudentIds.has(studentAccId)) return true;
      if (sName && targetName && targetName !== 'جميع طلاب الفصل' && isStudentNameMatch(sName, targetName)) return true;
      return false;
    };

    // Strategy 1: ONLY homework assigned explicitly to this student
    let merged = allHw.filter(hw => isMatch(hw.studentId, hw.studentName, (hw as any).studentAccountId));

    // Strategy 2: Homework logs from Doctor assignments specifically for this student
    logs.forEach((log) => {
      // Deduplicate by id, title, OR (subjectSlug + fromPage + toPage)
      const existing = merged.find((x) =>
        x.title === log.title ||
        x.id === log.id ||
        ((log as any).subjectSlug && (x as any).subjectSlug === (log as any).subjectSlug &&
          Number((x as any).fromPage) === Number((log as any).fromPage) && Number((x as any).toPage) === Number((log as any).toPage))
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
            status: (log.status === 'reviewed' ? 'reviewed' : log.status === 'submitted' ? 'submitted' : 'assigned') as any,
            grade: log.grade,
            doctorFeedback: log.teacherFeedback,
            createdAt: log.createdAt || new Date().toISOString(),
          } as HomeworkRecord,
        ];
      } else {
        // Propagate status/grade updates from log to existing record
        if (log.status === 'reviewed') { existing.status = 'reviewed'; }
        else if (log.status === 'submitted' && existing.status === 'assigned') { existing.status = 'submitted'; }
        if (log.grade !== undefined) (existing as any).grade = log.grade;
        if (log.teacherFeedback) (existing as any).doctorFeedback = log.teacherFeedback;
      }
    });

    // Strategy 3: ONLY curriculum workbook assignments for students of Dr. Ismail's class
    const isIkhlasStudent = Boolean(
      (session as any)?.schoolBranch === 'IKHLAS_JEDDAH' ||
      classStudentMatches.length > 0 ||
      (studentRecord && (studentRecord.schoolBranch === 'IKHLAS_JEDDAH' || studentRecord.source === 'ikhlas-jeddah'))
    );

    let currAsHomework: any[] = [];
    if (isIkhlasStudent) {
      const currAssignments = readCloudCache<any>('masar.curriculumAssignments.v1');
      const studentCurrAssignments = currAssignments.filter((a: any) => isMatch(a.studentId, a.studentName, a.studentAccountId));
      currAsHomework = studentCurrAssignments.map((a: any) => {
        const matchLog = logs.find(l =>
          ((l.studentId && (l.studentId === id || l.studentId === a.studentId)) ||
           ((l as any).studentAccountId && ((l as any).studentAccountId === id || (l as any).studentAccountId === a.studentAccountId))) &&
          (l.subject === a.subjectTitle || (l as any).subjectSlug === a.subjectSlug)
        );
        const isReviewed = matchLog?.status === 'reviewed' || (matchLog?.grade !== undefined);
        const isSubmitted = matchLog?.status === 'submitted';
        // Only mark submitted if this student specifically has a submission or assignment was directly submitted by them
        const isDirectAssignmentSubmitted = a.status === 'submitted' && (a.studentId === id || a.studentAccountId === id);
        return {
          id: a.id || `assign_${a.subjectSlug}_${a.studentId}`,
          studentId: a.studentId || id,
          studentName: a.studentName || name,
          title: `واجب ${a.subjectTitle || 'المنهج'} (ص ${a.fromPage} - ${a.toPage})`,
          description: `حل التدريبات والأنشطة التفاعلية بالكتاب المدرسي من صفحة (${a.fromPage}) إلى صفحة (${a.toPage}).`,
          dueDate: a.dueDate || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
          status: (isReviewed ? 'reviewed' : isSubmitted ? 'submitted' : (isDirectAssignmentSubmitted ? 'submitted' : 'assigned')) as 'assigned' | 'submitted' | 'reviewed',
          createdAt: a.assignedAt || new Date().toISOString(),
          subjectSlug: a.subjectSlug,
          subjectTitle: a.subjectTitle,
          fromPage: a.fromPage,
          toPage: a.toPage,
          grade: matchLog?.grade ?? a.grade,
          doctorFeedback: matchLog?.teacherFeedback ?? a.teacherFeedback,
        };
      });
    }

    for (const ca of currAsHomework) {
      // Deduplicate by id OR title OR (subjectSlug + fromPage + toPage)
      const existing = merged.find(h =>
        h.id === ca.id ||
        h.title === ca.title ||
        (ca.subjectSlug && (h as any).subjectSlug === ca.subjectSlug &&
          Number((h as any).fromPage) === Number(ca.fromPage) && Number((h as any).toPage) === Number(ca.toPage))
      );
      if (!existing) {
        merged = [...merged, ca];
      } else {
        (existing as any).subjectSlug = (existing as any).subjectSlug || ca.subjectSlug;
        (existing as any).fromPage = (existing as any).fromPage || ca.fromPage;
        (existing as any).toPage = (existing as any).toPage || ca.toPage;
        // Propagate grade and reviewed status from curriculum assignment
        if (ca.grade !== undefined) (existing as any).grade = ca.grade;
        if (ca.doctorFeedback) (existing as any).doctorFeedback = ca.doctorFeedback;
        if (ca.status === 'reviewed') existing.status = 'reviewed';
        else if (ca.status === 'submitted' && existing.status === 'assigned') existing.status = 'submitted';
      }
    }

    setHomeworks(merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  const loadCertificates = useCallback(async (id: string, name: string, forcePull = false) => {
    if (forcePull) {
      await pullCloudDataToLocal(['studentCertLogs', 'studentBadges']).catch(() => {});
    }
    const allCerts = readCloudCache<StudentCertificateLog>('masar_student_cert_logs_v1');

    const sName = name ? normalizeArabicText(name) : '';
    const classStudentMatches = getClassStudents().filter(cs => {
      if (id && cs.id === id) return true;
      if (sName && cs.fullName && isStudentNameMatch(cs.fullName, sName)) return true;
      return false;
    });
    const session = getSession();
    const allAccounts = getAccounts();
    const matchingAccounts = allAccounts.filter(a =>
      a.id === id || a.linkedStudentId === id || (sName && a.name && isStudentNameMatch(a.name, sName))
    );
    const validStudentIds = new Set<string>([
      ...(id ? [id] : []),
      ...(session?.id ? [session.id] : []),
      ...(session?.linkedStudentId ? [session.linkedStudentId] : []),
      ...classStudentMatches.map(c => c.id),
      ...matchingAccounts.map(a => a.id),
      ...matchingAccounts.map(a => a.linkedStudentId || '').filter(Boolean),
      'all',
    ]);

    const mine = allCerts.filter(c => {
      if (c.studentId && validStudentIds.has(c.studentId)) return true;
      if (c.studentAccountId && validStudentIds.has(c.studentAccountId)) return true;
      if (sName && c.studentName && isStudentNameMatch(sName, c.studentName)) return true;
      return false;
    });
    setCertificates(mine.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  const handleLogout = () => { clearSession(); router.push('/login'); };

  const isIkhlas = studentRecord?.schoolBranch === 'IKHLAS_JEDDAH';

  const assignedSlugs = useMemo(() => {
    return studentRecord?.assignedPrograms || (studentRecord?.assignedProgram ? [studentRecord.assignedProgram] : []);
  }, [studentRecord?.assignedPrograms, studentRecord?.assignedProgram]);

  const resolvedApprovedPrograms = useMemo(() => {
    return curriculumPrograms.filter((p) => assignedSlugs.includes(p.slug));
  }, [assignedSlugs]);

  const hasApprovedTrack = resolvedApprovedPrograms.length > 0;

  const tabs: Array<{ key: Tab; label: string; icon: any }> = [
    { key: 'home',         label: 'الرئيسية',                                icon: Home },
    { key: 'attendance',   label: 'حضوري 📸',                                icon: ScanFace },
    { key: 'homework',     label: 'الواجبات',                                icon: BookOpen },
    ...(isIkhlas ? [{ key: 'schedule' as Tab, label: 'الجدول', icon: Clock }] : []),
    { key: 'curriculum',   label: isIkhlas ? 'المناهج' : (hasApprovedTrack ? 'المسار المعتمد' : 'مسار الطالب'), icon: isIkhlas ? BookMarked : Award },
    { key: 'certificates', label: 'شهاداتي',                                 icon: Trophy },
  ];

  const handleDismissOneTimePrompt = () => {
    setShowOneTimeFacePrompt(false);
    const idToMark = studentId || studentRecord?.id || accountSessionId;
    if (typeof window !== 'undefined') {
      try {
        if (idToMark) localStorage.setItem(`masar_face_prompt_seen_${idToMark}`, '1');
        if (accountSessionId) localStorage.setItem(`masar_face_prompt_seen_${accountSessionId}`, '1');
        if (studentId) localStorage.setItem(`masar_face_prompt_seen_${studentId}`, '1');
      } catch {}
    }
  };

  const handleStartFaceEnroll = () => {
    setShowOneTimeFacePrompt(false);
    setShowFaceEnrollModal(true);
  };

  const handleFaceEnrollSuccess = () => {
    setShowFaceEnrollModal(false);
    setFaceEnrolled(true);
    const idToMark = studentId || studentRecord?.id || accountSessionId;
    if (typeof window !== 'undefined') {
      try {
        if (idToMark) {
          localStorage.setItem(`masar_face_prompt_seen_${idToMark}`, '1');
          localStorage.setItem(`masar_face_enrolled_${idToMark}`, 'true');
        }
        if (accountSessionId) {
          localStorage.setItem(`masar_face_prompt_seen_${accountSessionId}`, '1');
          localStorage.setItem(`masar_face_enrolled_${accountSessionId}`, 'true');
        }
        if (studentId) {
          localStorage.setItem(`masar_face_prompt_seen_${studentId}`, '1');
          localStorage.setItem(`masar_face_enrolled_${studentId}`, 'true');
        }
      } catch {}
    }
    setFaceToastMsg('🎉 تم تسجيل بصمة وجهك بنجاح! يمكنك الآن تسجيل الدخول بوجهك في أي وقت.');
    setTimeout(() => setFaceToastMsg(''), 6000);
  };

  // ── Attendance Tab (كشف حضور حصص اليوم بالبصمة الذكية) ──────────────────────
  const renderAttendanceTab = () => {
    const allAtt = getLocalAttendance().filter(
      (a) => a.studentId === studentId || a.studentId === (studentRecord as any)?.id || a.studentId === accountSessionId
    );
    const todayPeriods = getTodayPeriods(getSavedSchedule());
    const curActivePeriod = getCurrentPeriod(getSavedSchedule());

    // Standard 7 periods for today
    const periodsToDisplay = todayPeriods.length > 0 ? todayPeriods : [
      { dayOfWeek: 0, periodNumber: 1, subjectName: 'لغتي العربية', startTime: '07:00', endTime: '07:45' },
      { dayOfWeek: 0, periodNumber: 2, subjectName: 'الرياضيات', startTime: '07:45', endTime: '08:30' },
      { dayOfWeek: 0, periodNumber: 3, subjectName: 'التربية الإسلامية', startTime: '08:30', endTime: '09:15' },
      { dayOfWeek: 0, periodNumber: 4, subjectName: 'القرآن الكريم', startTime: '09:30', endTime: '10:15' },
      { dayOfWeek: 0, periodNumber: 5, subjectName: 'العلوم', startTime: '10:15', endTime: '11:00' },
      { dayOfWeek: 0, periodNumber: 6, subjectName: 'التربية الفنية', startTime: '11:00', endTime: '11:45' },
      { dayOfWeek: 0, periodNumber: 7, subjectName: 'نشاط صفي', startTime: '11:45', endTime: '12:30' },
    ];

    const attendedTodayCount = periodsToDisplay.filter(p => todayPeriodsAttendance[p.periodNumber]?.status === 'present').length;
    const totalPeriodsCount = periodsToDisplay.length;
    const faceVerifiedCount = periodsToDisplay.filter(p => todayPeriodsAttendance[p.periodNumber]?.verifiedVia === 'face').length;

    return (
      <div className="space-y-5" dir="rtl">
        {/* Main Hero Banner */}
        <div className="bg-gradient-to-br from-teal-700 via-emerald-600 to-teal-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-4 text-center sm:text-right">
              <div className="w-16 h-16 rounded-3xl bg-white/20 border border-white/30 backdrop-blur-md flex items-center justify-center text-white shadow-inner shrink-0">
                <ScanFace size={36} />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-[11px] font-black backdrop-blur-md mb-1.5">
                  <Sparkles size={13} className="text-amber-300" />
                  <span>نظام حضور الحصص البيومتري (Face ID)</span>
                </div>
                <h2 className="text-xl font-black">كشف حضور الحصص المدرسية</h2>
                <p className="text-xs text-emerald-100 font-bold mt-1">
                  تسجيل وتوثيق حضور كل حصة دراسية مباشرة عبر بصمة الوجه الذكية
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={!curActivePeriod}
              onClick={() => {
                if (curActivePeriod) {
                  setTargetPeriodForModal({ periodNumber: curActivePeriod.periodNumber, subjectName: curActivePeriod.subjectName });
                  setShowFaceAttendanceModal(true);
                }
              }}
              className={`w-full sm:w-auto px-6 py-4 rounded-2xl font-black text-sm shadow-xl transition-all duration-200 flex items-center justify-center gap-2 shrink-0 ${
                curActivePeriod
                  ? 'bg-white hover:bg-emerald-50 text-emerald-950 cursor-pointer active:scale-95 shadow-emerald-950/20'
                  : 'bg-white/40 text-white/70 cursor-not-allowed shadow-none'
              }`}
            >
              <Camera size={20} className={curActivePeriod ? 'text-emerald-600' : 'text-white/60'} />
              <span>
                {curActivePeriod ? `تسجيل حضور (${PERIOD_NAMES[curActivePeriod.periodNumber] || `الحصة ${curActivePeriod.periodNumber}`}) 📸` : 'لا توجد حصة جارية الآن ⏸️'}
              </span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-xs">
            <span className="text-2xl font-black text-emerald-600">{attendedTodayCount} / {totalPeriodsCount}</span>
            <p className="text-xs font-bold text-slate-500 mt-1">حصص حضرتها اليوم 📚</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-xs">
            <span className="text-2xl font-black text-teal-600">{faceVerifiedCount}</span>
            <p className="text-xs font-bold text-slate-500 mt-1">بالبصمة الذكية 👁️</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-xs">
            <span className="text-2xl font-black text-amber-500">{Math.max(0, totalPeriodsCount - attendedTodayCount)}</span>
            <p className="text-xs font-bold text-slate-500 mt-1">حصص متبقية ⏳</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 text-center shadow-xs">
            <span className="text-2xl font-black text-indigo-600">
              {totalPeriodsCount > 0 ? Math.round((attendedTodayCount / totalPeriodsCount) * 100) : 0}%
            </span>
            <p className="text-xs font-bold text-slate-500 mt-1">نسبة حضور اليوم 🌟</p>
          </div>
        </div>

        {/* ── Today's 7 Periods Matrix ── */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>جدول حصص اليوم وحالة الحضور</span>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </h3>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                اضغط على أي حصة لتسجيل حضورها فورياً ببصمة الوجه
              </p>
            </div>
            {curActivePeriod && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-300 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>الحصة الجارية: {curActivePeriod.subjectName}</span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {periodsToDisplay.map((p) => {
              const rec = todayPeriodsAttendance[p.periodNumber];
              const isPresent = rec?.status === 'present';
              const saudi = getSaudiNow();
              const isCurrent = curActivePeriod?.periodNumber === p.periodNumber || (saudi.hhmm >= p.startTime && saudi.hhmm <= p.endTime);
              const isPassed = !isPresent && !isCurrent && (saudi.hhmm > p.endTime);
              const isFuture = !isPresent && !isCurrent && (saudi.hhmm < p.startTime);
              const periodTitle = PERIOD_NAMES[p.periodNumber] || `الحصة ${p.periodNumber}`;

              return (
                <div
                  key={p.periodNumber}
                  className={`rounded-2xl border-2 p-4 transition-all flex flex-col justify-between gap-3 relative ${
                    isPresent
                      ? 'bg-emerald-50/50 border-emerald-300 shadow-xs'
                      : isCurrent
                      ? 'bg-amber-50/70 border-amber-400 shadow-md ring-2 ring-amber-400/40'
                      : isPassed
                      ? 'bg-rose-50/40 border-rose-200/80 opacity-90'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Top: Period num + status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-black text-slate-500 block">{periodTitle}</span>
                      <h4 className="text-sm font-black text-slate-900 mt-0.5">{p.subjectName}</h4>
                      <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock size={11} className="text-slate-400" />
                        <span>{p.startTime} – {p.endTime}</span>
                      </p>
                    </div>

                    {/* Status Badge */}
                    {isPresent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        <span>حاضر ✓</span>
                      </span>
                    ) : isCurrent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 shrink-0 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                        <span>جارية الآن</span>
                      </span>
                    ) : isPassed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                        <span>انتهت ✕</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200/80 text-slate-600 shrink-0">
                        <span>قادمة</span>
                      </span>
                    )}
                  </div>

                  {/* Middle: Live Photo snapshot if present */}
                  {isPresent && rec?.capturedPhotoUrl && (
                    <div className="flex items-center gap-2.5 bg-white p-2 rounded-xl border border-emerald-200">
                      <img
                        src={rec.capturedPhotoUrl}
                        alt="لقطة التحقق"
                        className="w-10 h-10 rounded-lg object-cover border border-emerald-300 shrink-0 cursor-pointer"
                        onClick={() => setSelectedPhotoPreview({
                          photoUrl: rec.capturedPhotoUrl!,
                          title: `${periodTitle} - ${p.subjectName}`,
                          time: rec.sessionTime || 'صباحاً',
                        })}
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-emerald-900">موثق بالبصمة 📸</p>
                        <p className="text-[10px] text-slate-500 font-bold truncate">الساعة: {rec.sessionTime}</p>
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div>
                    {isPresent ? (
                      <div className="w-full py-2 px-3 rounded-xl bg-emerald-100/60 border border-emerald-200 text-emerald-800 text-[11px] font-black flex items-center justify-center gap-1.5 select-none">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>تم توثيق الحضور ✓</span>
                      </div>
                    ) : isCurrent ? (
                      <button
                        type="button"
                        onClick={() => {
                          setTargetPeriodForModal({ periodNumber: p.periodNumber, subjectName: p.subjectName });
                          setShowFaceAttendanceModal(true);
                        }}
                        className="w-full py-2.5 px-3 rounded-xl text-white text-[11px] font-black transition flex items-center justify-center gap-1.5 shadow-md bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400/40 cursor-pointer active:scale-95"
                      >
                        <ScanFace size={14} />
                        <span>سجّل حضور الحصة الآن 📸</span>
                      </button>
                    ) : isPassed ? (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2 px-3 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-400 text-[11px] font-bold cursor-not-allowed flex items-center justify-center gap-1.5 select-none"
                      >
                        <Clock size={12} className="text-slate-400" />
                        <span>انتهى وقت الحصة ⛔</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full py-2 px-3 rounded-xl bg-slate-100/80 border border-slate-200 text-slate-400 text-[11px] font-bold cursor-not-allowed flex items-center justify-center gap-1.5 select-none"
                      >
                        <Clock size={12} className="text-slate-400" />
                        <span>تبدأ الساعة {p.startTime} ⏳</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance History Table */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
          <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
            <Calendar size={15} className="text-teal-600" />
            <span>سجل توثيق الحضور والغياب</span>
          </h4>

          {allAtt.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-bold">
              لا توجد سجلات حضور مسجلة بعد. اختر أي حصة وسجل حضورك بالوجه لتظهر هنا!
            </div>
          ) : (
            <div className="space-y-2">
              {allAtt.slice(0, 10).map((att) => (
                <div key={att.id} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-3">
                    {att.capturedPhotoUrl ? (
                      <img
                        src={att.capturedPhotoUrl}
                        alt="لقطة الحضور"
                        className="w-8 h-8 rounded-lg object-cover border border-emerald-300 cursor-pointer"
                        onClick={() => setSelectedPhotoPreview({
                          photoUrl: att.capturedPhotoUrl!,
                          title: att.periodName ? `${att.periodName} - ${att.subjectName || ''}` : 'حضور مدرسي',
                          time: att.sessionTime,
                        })}
                      />
                    ) : (
                      <span className={`w-2.5 h-2.5 rounded-full ${att.status === 'present' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    )}
                    <div>
                      <span className="font-black text-slate-900">
                        {att.periodName ? `${att.periodName} (${att.subjectName || 'حصة'})` : `حضور يومي`}
                      </span>
                      <span className="text-[11px] text-slate-400 mr-2">{att.sessionDate} • {att.sessionTime}</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    att.status === 'present' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {att.status === 'present' ? (att.verifiedVia === 'face' ? 'بصمة الوجه ✓' : 'حاضر') : 'غائب'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Home Tab ───────────────────────────────────────────────────────────────
  const renderHomeTab = () => (
    <div className="space-y-5">
      {studentRecord && (
        <StudentProfileCard
          student={{
            id: studentRecord.id || studentId,
            fullName: studentRecord.fullName || studentName,
            grade: studentRecord.grade,
            photoUrl: studentRecord.photoUrl || studentPhoto,
            parentName: studentRecord.parentName,
            parentPhone: studentRecord.parentPhone,
            nationalId: studentRecord.nationalId,
            dateOfBirth: studentRecord.dateOfBirth,
            notes: studentRecord.notes,
            studentLastActiveAt: studentRecord.studentLastActiveAt,
            studentLastLoginAt: studentRecord.studentLastLoginAt,
            parentLastActiveAt: studentRecord.parentLastActiveAt,
            parentLastLoginAt: studentRecord.parentLastLoginAt,
            lastActiveAt: studentRecord.lastActiveAt,
            lastLoginAt: studentRecord.lastLoginAt,
          }}
          greeting="مرحباً بك يا بطل 👋"
          variant="student"
          showParent={true}
          allowPhotoUpload={true}
          isFaceEnrolled={faceEnrolled}
          onEnrollFaceRequested={() => setShowFaceEnrollModal(true)}
          onPhotoUpdated={(newPhoto) => {
            setStudentPhoto(newPhoto);
            if (studentRecord) {
              setStudentRecord({ ...studentRecord, photoUrl: newPhoto });
            }
          }}
        />
      )}

      {/* ── Smart Period Face Attendance Card (بطاقة حضور الحصص بالبصمة الذكية) ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200/60 shadow-xs">
              <ScanFace size={20} />
            </div>
            <div>
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <span>حضور الحصص بالبصمة الذكية (Face ID)</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                  بالحصة الدراسية 📚
                </span>
              </h3>
              <p className="text-[11px] font-bold text-slate-500">
                توثيق حضور كل حصة مباشرة بالوجه مع د. إسماعيل عيسى
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className="text-xs font-black text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 px-3 py-1.5 rounded-xl transition flex items-center gap-1 cursor-pointer"
          >
            <span>كشف الحصص الشامل</span>
            <ChevronRight size={13} className="rotate-180" />
          </button>
        </div>

        {/* Current Active Period Banner */}
        {(() => {
          const cur = getCurrentPeriod(getSavedSchedule());
          if (!cur) {
            return (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-black">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900">خارج وقت الحصص المدرسية الحالية</h4>
                    <p className="text-[11px] text-slate-500 font-bold">يمكنك تسجيل حضور أي حصة من جدول الحصص أدناه</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTargetPeriodForModal(null);
                    setShowFaceAttendanceModal(true);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Camera size={14} />
                  <span>تسجيل حضور حصة</span>
                </button>
              </div>
            );
          }

          const curRec = todayPeriodsAttendance[cur.periodNumber];
          const isAttended = curRec?.status === 'present';
          const pTitle = PERIOD_NAMES[cur.periodNumber] || `الحصة ${cur.periodNumber}`;

          if (isAttended) {
            return (
              <div className="bg-gradient-to-l from-emerald-500/15 via-teal-500/5 to-transparent border border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        {pTitle}
                      </span>
                      <h4 className="text-sm font-black text-slate-900">
                        حاضر في {cur.subjectName} ({cur.startTime} – {cur.endTime}) ✓
                      </h4>
                    </div>
                    <p className="text-xs text-slate-600 font-bold mt-0.5">
                      تم التوثيق ببصمة الوجه الذكية • الساعة {curRec.sessionTime || 'صباحاً'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTargetPeriodForModal({ periodNumber: cur.periodNumber, subjectName: cur.subjectName });
                    setShowFaceAttendanceModal(true);
                  }}
                  className="text-xs font-black text-emerald-800 hover:text-emerald-950 bg-emerald-100 hover:bg-emerald-200 px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer self-end sm:self-center"
                >
                  <RefreshCw size={13} />
                  <span>إعادة المسح</span>
                </button>
              </div>
            );
          }

          return (
            <div className="bg-gradient-to-l from-amber-500/15 via-orange-500/10 to-transparent border-2 border-amber-400 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm ring-2 ring-amber-400/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 animate-pulse">
                  <Clock size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full animate-pulse">
                      الحصة جارية الآن 🔴
                    </span>
                    <h4 className="text-sm font-black text-slate-900">
                      {pTitle}: {cur.subjectName} ({cur.startTime} – {cur.endTime})
                    </h4>
                  </div>
                  <p className="text-xs text-slate-600 font-bold mt-0.5">
                    لم توثّق حضورك في هذه الحصة بعد! اضغط لتسجيل الحضور بلمح البصر.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTargetPeriodForModal({ periodNumber: cur.periodNumber, subjectName: cur.subjectName });
                  setShowFaceAttendanceModal(true);
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer self-stretch sm:self-center justify-center"
              >
                <ScanFace size={16} />
                <span>سجّل حضور {pTitle} الآن 📸</span>
              </button>
            </div>
          );
        })()}

        {/* 7 Periods Quick Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
          {(() => {
            const todays = getTodayPeriods(getSavedSchedule());
            const list = todays.length > 0 ? todays : [
              { dayOfWeek: 0, periodNumber: 1, subjectName: 'لغتي', startTime: '07:00', endTime: '07:45' },
              { dayOfWeek: 0, periodNumber: 2, subjectName: 'رياضيات', startTime: '07:45', endTime: '08:30' },
              { dayOfWeek: 0, periodNumber: 3, subjectName: 'إسلامية', startTime: '08:30', endTime: '09:15' },
              { dayOfWeek: 0, periodNumber: 4, subjectName: 'قرآن', startTime: '09:30', endTime: '10:15' },
              { dayOfWeek: 0, periodNumber: 5, subjectName: 'علوم', startTime: '10:15', endTime: '11:00' },
              { dayOfWeek: 0, periodNumber: 6, subjectName: 'فنية', startTime: '11:00', endTime: '11:45' },
              { dayOfWeek: 0, periodNumber: 7, subjectName: 'نشاط', startTime: '11:45', endTime: '12:30' },
            ];
            const curP = getCurrentPeriod(getSavedSchedule());

            return list.map(p => {
              const rec = todayPeriodsAttendance[p.periodNumber];
              const isPres = rec?.status === 'present';
              const isCur = curP?.periodNumber === p.periodNumber;

              return (
                <button
                  key={p.periodNumber}
                  type="button"
                  onClick={() => {
                    setTargetPeriodForModal({ periodNumber: p.periodNumber, subjectName: p.subjectName });
                    setShowFaceAttendanceModal(true);
                  }}
                  className={`p-2.5 rounded-2xl border text-right transition flex flex-col justify-between gap-1 cursor-pointer ${
                    isPres
                      ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/60'
                      : isCur
                      ? 'bg-amber-50 border-amber-400 hover:bg-amber-100/60 ring-2 ring-amber-400/40'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500">حـ{p.periodNumber}</span>
                    {isPres ? (
                      <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded-full">حاضر ✓</span>
                    ) : isCur ? (
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    ) : (
                      <span className="text-[9px] text-slate-400 font-bold">قادمة</span>
                    )}
                  </div>
                  <p className="text-xs font-black text-slate-900 truncate mt-0.5">{p.subjectName}</p>
                  <p className="text-[10px] text-slate-500 font-bold">{p.startTime}</p>
                </button>
              );
            });
          })()}
        </div>
      </div>

      {/* Face ID Quick Action Banner */}
      {!faceEnrolled ? (
        <div className="bg-gradient-to-l from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-300/80 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ScanFace size={22} />
            </div>
            <div className="text-right">
              <h4 className="text-xs sm:text-sm font-black text-slate-900">سجّل بصمة وجهك للدخول السريع 📸</h4>
              <p className="text-[11px] font-bold text-slate-500">سجّل ملامحك لمرة واحدة لتسجيل الدخول بلمح البصر دون الحاجة لكتابة كلمة المرور.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowFaceEnrollModal(true)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
          >
            <Camera size={14} />
            <span>سجّل الآن</span>
          </button>
        </div>
      ) : (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <span className="text-xs font-black text-emerald-900">بصمة الوجه مفعلة لحسابك للدخول السريع 🔒</span>
          </div>
          <button
            type="button"
            onClick={() => setShowFaceEnrollModal(true)}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline transition cursor-pointer"
          >
            إعادة التسجيل 🔄
          </button>
        </div>
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
          {hasApprovedTrack ? (
            /* Quick Approved Track Access */
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
                      {resolvedApprovedPrograms.map((p) => p.title).join(' + ')}
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
          ) : (
            /* Pending Doctor Review & Track Assignment */
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-5 text-white shadow-md relative overflow-hidden border border-slate-700/60">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center justify-center text-sm font-bold">
                    ⏳
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white">ملف الطالب قيد مراجعة د. إسماعيل عيسى</h3>
                    <p className="text-[11px] font-bold text-amber-300">بانتظار تدقيق التقييم واعتماد المسار</p>
                  </div>
                </div>
                <span className="text-[10px] font-black bg-amber-400/20 border border-amber-400/30 text-amber-300 px-2.5 py-1 rounded-full">
                  قيد التقييم ⏳
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium leading-relaxed mb-3.5">
                يقوم استشاري التعليم وصعوبات التعلم د. إسماعيل عيسى حالياً بدراسة تقييم الطالب لتحديد واعتماد المسار التأهيلي الأنسب (صعوبات تعلم، تأسيس قراءة، أو حساب ذهني). ستظهر الخطة هنا فور اعتمادها.
              </p>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-xs font-bold">⚠️ لم يتم اعتماد مسار للطالب بعد</span>
                </div>
                <button
                  onClick={() => setActiveTab('curriculum')}
                  className="text-[11px] font-black bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  متابعة حالة الاعتماد ↗
                </button>
              </div>
            </div>
          )}

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
        homeworks.map(hw => {
          const isQuiz = hw.type === 'QUIZ' || Boolean((hw as any).questions && (hw as any).questions.length > 0);
          return (
            <div key={hw.id}
              onClick={() => setSelectedHw(hw)}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md cursor-pointer hover:border-emerald-200 transition-all">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${isQuiz ? 'bg-amber-50 text-amber-600' : 'bg-teal-50 text-teal-600'}`}>
                    {isQuiz ? <span className="text-lg">🎯</span> : <BookOpen size={18} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-sm text-gray-800">{hw.title}</h3>
                      {isQuiz && (
                        <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 font-black px-2 py-0.5 rounded-md">
                          كويز ذكي 🎯
                        </span>
                      )}
                    </div>
                    {hw.description && <p className="text-xs text-gray-500 mt-0.5 max-w-xs">{hw.description}</p>}
                    <p className="text-[10px] font-bold text-slate-400 mt-1">📅 التسليم: {hw.dueDate || 'غير محدد'}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                  hw.status === 'assigned' ? 'bg-amber-100 text-amber-700' :
                  hw.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {hw.status === 'assigned' ? '📝 مطلوب' :
                   hw.status === 'submitted' ? '⏳ قيد المراجعة' :
                   (hw as any).grade !== undefined ? `⭐ ${(hw as any).grade}/10` : '✅ تم التصحيح'}
                </span>
              </div>
              {/* Grade & Feedback display when reviewed */}
              {(hw.status === 'reviewed' || (hw as any).grade !== undefined) && (
                <div className="mt-2 flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <span className="text-xl">🏆</span>
                  <div>
                    <p className="text-xs font-black text-emerald-800">الدرجة: {(hw as any).grade}/10</p>
                    {(hw as any).doctorFeedback && (
                      <p className="text-[11px] font-bold text-slate-600 mt-0.5">💬 د. إسماعيل: {(hw as any).doctorFeedback}</p>
                    )}
                  </div>
                </div>
              )}
              {hw.status === 'assigned' ? (
                <button onClick={(e) => { e.stopPropagation(); setSelectedHw(hw); }}
                  className="mt-2 w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-xs">
                  {isQuiz ? <span className="text-sm">🎯</span> : <Send size={13} />}
                  <span>{isQuiz ? 'بدء حل الكويز التفاعلي 🎯' : 'حل وتسليم الواجب بالكتاب تفاعلياً ✍️'}</span>
                </button>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); setSelectedHw(hw); }}
                  className="mt-2 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition flex items-center justify-center gap-2 cursor-pointer">
                  {isQuiz ? <span className="text-sm">🏆</span> : <BookOpen size={13} />}
                  <span>{isQuiz ? 'استعراض نتيجة وإجابات الكويز 👁️' : 'استعراض حلي في الكتاب 👁️'}</span>
                </button>
              )}
            </div>
          );
        })
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
              }}
              studentId={studentId || studentRecord?.id}
              />
            );
          })}
        </div>
      </div>
    );
  };


  // ── Approved Track Tab (طالب مسار — المسار المعتمد) ──────────────────────
  const renderApprovedTrackTab = () => {
    return (
      <div className="space-y-4">
        {/* Banner */}
        <div className="bg-gradient-to-br from-teal-700 via-emerald-700 to-teal-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="absolute -left-8 -bottom-8 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-white/15 rounded-2xl backdrop-blur-xs text-xl">🎯</span>
              <div>
                <h2 className="text-base md:text-lg font-black">{hasApprovedTrack ? 'المسار التعليمي والتأهيلي المعتمد' : 'مسار الطالب الفردي'}</h2>
                <p className="text-xs text-teal-100 font-bold">منصة مَسَار الذكية · التعليم الفردي المتخصص</p>
              </div>
            </div>
            <span className="text-[11px] font-black bg-emerald-400/30 border border-emerald-300/40 text-emerald-100 px-3 py-1 rounded-full">
              {hasApprovedTrack ? 'مسار معتمد ✓' : 'قيد التقييم ⏳'}
            </span>
          </div>
          <p className="text-xs text-teal-100/90 leading-relaxed mt-2 font-medium">
            {hasApprovedTrack
              ? 'الخطة الفردية المعتمدة للبطل تحت الإشراف المباشر لاستشاري التعليم الحديث وصعوبات التعلم د. إسماعيل عيسى.'
              : 'يقوم د. إسماعيل عيسى بمراجعة بيانات وتقييم الطالب لاعتماد المسار المناسب والخطة الفردية.'}
          </p>
        </div>

        {hasApprovedTrack ? (
          <div className="space-y-4">
            {resolvedApprovedPrograms.map((prog) => (
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
      schoolBranch={studentRecord?.schoolBranch || 'MASAR'}
      variant="student"
    />
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-slate-900" dir="rtl">
      {/* Executive Modern Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 shadow-xs px-3 sm:px-4 py-2.5 mb-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          {/* Brand Identity & Portal Tag */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href="/" className="shrink-0 transition-transform active:scale-95 group" title="منصة مسار">
              <span className="relative inline-flex w-10 h-10 sm:w-11 sm:h-11 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-200/70 ring-2 ring-emerald-500/15 shadow-sm items-center justify-center">
                <Image
                  src="/brand/masar-logo.webp"
                  alt="شعار منصة مسار"
                  fill
                  className="object-contain p-1 group-hover:scale-105 transition-transform"
                  priority
                />
              </span>
            </Link>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-black text-sm sm:text-base text-slate-900 tracking-tight shrink-0">
                  منصة مَسَار
                </span>
                {isIkhlas ? (
                  <span className="text-[10px] sm:text-xs bg-emerald-600 text-white font-black px-2 py-0.5 rounded-full shadow-2xs shrink-0">
                    فصل د. إسماعيل
                  </span>
                ) : (
                  <span className="text-[10px] sm:text-xs bg-teal-50 text-teal-800 border border-teal-200/80 font-black px-2 py-0.5 rounded-full shrink-0">
                    بوابة الطالب
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] font-bold text-slate-500 truncate mt-0.5">
                بوابة الطالب · {new Date().toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>

          {/* Quick Actions (Streamlined Mobile Bar) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <NotificationBell role="student" studentId={studentId || studentRecord?.id} studentName={studentName || studentRecord?.fullName} />

            <button
              onClick={handleLogout}
              title="تسجيل الخروج"
              className="w-9 h-9 sm:w-auto sm:px-3 sm:py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shadow-2xs active:scale-95 cursor-pointer"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

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
            {activeTab === 'attendance'   && renderAttendanceTab()}
            {activeTab === 'homework'     && renderHomeworkTab()}
            {activeTab === 'schedule'     && isIkhlas && renderScheduleTab()}
            {activeTab === 'curriculum'   && (isIkhlas ? renderCurriculumTab() : renderApprovedTrackTab())}
            {activeTab === 'certificates' && renderCertificatesTab()}
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-3 left-3 right-3 max-w-2xl mx-auto z-40 bg-white/95 backdrop-blur-xl border-2 border-emerald-500/30 shadow-2xl rounded-3xl p-1.5 ring-4 ring-emerald-500/10">
        <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
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

      {/* Toast Notification */}
      {faceToastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full px-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-700 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500 flex items-center justify-between gap-3 text-xs font-black">
            <span>{faceToastMsg}</span>
            <button onClick={() => setFaceToastMsg('')} className="text-white/80 hover:text-white cursor-pointer">✕</button>
          </div>
        </div>
      )}

      {/* One-Time Face ID Invitation Modal */}
      {showOneTimeFacePrompt && !faceEnrolled && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-in fade-in duration-300" dir="rtl">
          <div className="w-full max-w-md rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden text-right ring-4 ring-emerald-500/10">
            {/* Header */}
            <div className="bg-gradient-to-br from-teal-600 via-emerald-600 to-teal-700 p-6 text-white text-center relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 text-white flex items-center justify-center mx-auto mb-3 shadow-inner">
                <ScanFace size={34} />
              </div>
              <h3 className="text-xl font-black text-white">تفعيل بصمة الوجه (Face ID) 🌟</h3>
              <p className="text-xs text-emerald-100 font-bold mt-1">
                مرحباً بك يا بطل! سجّل وجهك لمرة واحدة فقط للدخول السريع دائماً
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="space-y-2.5">
                {[
                  { icon: '⚡', title: 'دخول سريع بلمح البصر', desc: 'بمجرد النظر للكاميرا يفتح حسابك فوراً بدون كلمة مرور' },
                  { icon: '🔒', title: 'أمان وخصوصية تامة', desc: 'لا تُحفظ أي صورة لك — بياناتك مشفرة محلياً' },
                  { icon: '🎯', title: 'تسجيل لمرة واحدة فقط', desc: 'تستغرق أقل من 10 ثوانٍ وتريحك في كل مرة تدخل فيها' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <span className="text-2xl shrink-0">{item.icon}</span>
                    <div>
                      <h5 className="text-xs font-black text-slate-900">{item.title}</h5>
                      <p className="text-[11px] font-bold text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleStartFaceEnroll}
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition cursor-pointer"
                >
                  <Camera size={16} />
                  <span>سجّل بصمة وجهك الآن 📸</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismissOneTimePrompt}
                  className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                >
                  لاحقاً / تخطي
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Face Enroll Modal */}
      {showFaceEnrollModal && (
        <FaceEnrollModal
          userId={accountSessionId || studentId || (studentRecord as any)?.id || ''}
          accountId={accountSessionId}
          studentId={studentId || (studentRecord as any)?.id || ''}
          userName={studentName}
          userRole="student"
          schoolBranch={isIkhlas ? 'IKHLAS_JEDDAH' : 'MASAR'}
          onSuccess={handleFaceEnrollSuccess}
          onCancel={() => {
            setShowFaceEnrollModal(false);
            handleDismissOneTimePrompt();
          }}
        />
      )}

      {/* Face Attendance Verification Modal */}
      {showFaceAttendanceModal && (
        <StudentFaceAttendanceModal
          studentId={studentId || (studentRecord as any)?.id || accountSessionId || ''}
          studentName={studentName}
          branch={isIkhlas ? 'IKHLAS_JEDDAH' : 'MASAR'}
          targetPeriodNumber={targetPeriodForModal?.periodNumber}
          targetSubjectName={targetPeriodForModal?.subjectName}
          onClose={() => {
            setShowFaceAttendanceModal(false);
            setTargetPeriodForModal(null);
          }}
          onSuccess={(record) => {
            setTodayAttendance(record);
            const resolvedId = studentId || (studentRecord as any)?.id || accountSessionId || '';
            if (resolvedId) {
              setTodayPeriodsAttendance(getStudentTodayPeriodsAttendance(resolvedId));
            }
            setShowFaceAttendanceModal(false);
            setTargetPeriodForModal(null);
          }}
        />
      )}

      {/* Snapshot Photo Preview Lightbox */}
      {selectedPhotoPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setSelectedPhotoPreview(null)}
          dir="rtl"
        >
          <div
            className="bg-white rounded-3xl p-5 max-w-sm w-full text-center space-y-3 shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-black text-slate-800">{selectedPhotoPreview.title}</span>
              <button
                type="button"
                onClick={() => setSelectedPhotoPreview(null)}
                className="w-7 h-7 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>
            <img
              src={selectedPhotoPreview.photoUrl}
              alt={selectedPhotoPreview.title}
              className="w-56 h-56 mx-auto rounded-2xl object-cover border-4 border-emerald-500 shadow-xl"
            />
            <div className="bg-slate-50 rounded-xl p-2 text-xs font-bold text-slate-600">
              <span>توقيت التحقق المباشر: {selectedPhotoPreview.time}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Subject Card Component ─────────────────────────────────────────────────
function SubjectCard({ subject, studentId }: { subject: { slug?: string; name: string; subtitle?: string; badge?: string; pageCount?: number; icon: string; color: string; topics: string[]; files?: any[]; uploadedBooks?: any[] }; studentId?: string }) {
  const [open, setOpen] = useState(false);
  const hasFiles = (subject.files?.length ?? 0) > 0;
  const bookHref = `/programs/curricula/${subject.slug}${studentId ? `?student=${encodeURIComponent(studentId)}&from=school-student` : '?from=school-student'}`;

  return (
    <div className={`bg-white rounded-2xl border shadow-xs overflow-hidden`}>
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
              href={bookHref}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
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
                href={bookHref}
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
