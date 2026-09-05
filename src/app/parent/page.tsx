'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ClipboardCheck, FileText, Home, MessageSquareText, UserRoundPlus,
  Send, CheckCircle2, Sparkles, MessageSquare, LogOut, ScanFace, Camera,
  User, BookOpen, Clock, Star, ShieldCheck, GraduationCap, Phone, Video, ExternalLink,
  Trophy, Medal, Award, Gift, KeyRound
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import SyncStatus from '@/components/SyncStatus';
import VoiceRecorderButton, { MessageAudio } from '@/components/VoiceRecorderButton';
import { curriculumPrograms } from '@/data/curriculum';
import {
  getAccounts, getMessages, getReports, getSession, getStudents, getSurveys, hydrateSessionFromServer,
  MessageRecord, ReportRecord, saveMessage, StudentRecord, updateStudent, clearSession
} from '@/lib/cloudStore';
import { getLocalHomework, updateHomeworkStatus, HomeworkRecord } from '@/lib/homework';
import { pullCloudDataToLocal, syncDocToCloud, subscribeToCloudUpdates } from '@/lib/firestoreSync';
import { getClassStudents, getStudentHomeworkLogs } from '@/lib/classDb';
import StudentProfileCard from '@/components/StudentProfileCard';
import StudentAchievementsTab from '@/components/StudentAchievementsTab';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { findStudentsForParent, isParentChildNameMatch, normalizeArabicText, isStudentNameMatch } from '@/lib/nameMatching';
import { recordUserPresence } from '@/lib/presence';

function isGeneratedAlias(email?: string | null) {
  if (!email) return true;
  return /^(student|parent|acc|account|generated|user)[._-]/.test(email.toLowerCase()) || email.includes('@masar.local') || email.includes('@generated');
}

type ParentTab = 'home' | 'achievements' | 'reports' | 'chat' | 'homework' | 'profile';

export default function ParentDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ParentTab>('home');
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [hasSurvey, setHasSurvey] = useState(true);
  const [parentName, setParentName] = useState<string>('');
  const [replyText, setReplyText] = useState('');
  const [homeworkList, setHomeworkList] = useState<HomeworkRecord[]>([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [sessionEmail, setSessionEmail] = useState('');

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  useEffect(() => {
    let cancelled = false;
    const loadParentPortal = async () => {
      // Pull all relevant cloud data with force=true on mount to guarantee fresh reports and messages
      await pullCloudDataToLocal([
        'students', 'accounts', 'reports', 'classStudents',
        'messages', 'surveys', 'homework', 'studentHomeworkLogs', 'notifications'
      ], true).catch(() => {});
      if (cancelled) return;

      // Get session (local cache first, server fallback)
      const session = getSession() ?? await hydrateSessionFromServer();
      if (session?.email) setSessionEmail(session.email);
      if (cancelled) return;

      if (!session) { router.replace('/login'); return; }
      if (session.role === 'doctor' || session.role === 'specialist' || session.role === 'teacher') { router.push('/dashboard'); return; }
      if (session.schoolBranch === 'IKHLAS_JEDDAH' && session.role === 'parent') { router.replace('/school-parent'); return; }

      const allStudents = getStudents();
      const allAccounts = getAccounts();
      const classStudents = getClassStudents();
      const allKnown = [...allStudents, ...classStudents] as StudentRecord[];
      const activeId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('student') : null;

      // ─────────────────────────────────────────────────────
      //  TIER-BASED PARENT → CHILD MATCHING ALGORITHM
      // ─────────────────────────────────────────────────────

      const isPlaceholder = (n?: string | null) =>
        !n || n.includes('جديد') || n.includes('الاستبيان') || n === 'طالب' || n === 'الطالب';

      // Build parent profile from session + account record
      const parentAcc = allAccounts.find((a) => a.id === session.id) as any;
      const parentProfile = {
        ...session,
        ...parentAcc,
        id: session.id,
        email: session.email || parentAcc?.email,
        phone: session.phone || parentAcc?.phone,
        schoolBranch: session.schoolBranch || parentAcc?.schoolBranch,
      };
      const linkedStudentId: string | undefined =
        (session as any)?.linkedStudentId ||
        parentAcc?.linkedStudentId;
      const parentPhone = (session.phone || parentAcc?.phone || '').replace(/\D/g, '');
      const parentPhoneSuffix = parentPhone.length >= 8 ? parentPhone.slice(-8) : '';
      const parentEmail = (session.email || '').trim().toLowerCase();

      let myStudents: StudentRecord[] = [];

      myStudents = findStudentsForParent(parentProfile, allKnown);

      // TIER 2: linkedStudentId from session / account (set during onboarding)
      if (myStudents.length === 0 && linkedStudentId) {
        const byLink = allKnown.find((s) => s.id === linkedStudentId);
        if (byLink) myStudents = [byLink];
      }

      // TIER 3: Parent phone number suffix match (last 8 digits)
      if (myStudents.length === 0 && parentPhoneSuffix) {
        const byPhone = allKnown.filter((s) => {
          const sPhone = (s.parentPhone || '').replace(/\D/g, '');
          return sPhone.length >= 8 && sPhone.slice(-8) === parentPhoneSuffix;
        });
        if (byPhone.length > 0) myStudents = byPhone;
      }

      // TIER 4: Parent email match (skip generated/alias emails)
      if (myStudents.length === 0 && parentEmail && !parentEmail.includes('@masar.local') && !parentEmail.includes('@masarplatform.org') && !parentEmail.startsWith('parent.')) {
        const byEmail = allKnown.filter((s) => {
          const fields = [(s as any).parentEmail, (s as any).email, (s as any).recoveryEmail].map((e) => (e || '').trim().toLowerCase());
          return fields.some((e) => e && e === parentEmail);
        });
        if (byEmail.length > 0) myStudents = byEmail;
      }

      // TIER 5: Patronymic name match (session name vs student's parent name)
      if (myStudents.length === 0 && session.name && !isPlaceholder(session.name) && session.name !== 'ولي الأمر') {
        myStudents = findStudentsForParent(parentProfile, allKnown);
      }

      if (activeId) {
        const byUrl = allKnown.find((s) => s.id === activeId);
        const urlOwned = byUrl && (
          myStudents.some((s) => s.id === byUrl.id) ||
          byUrl.parentAccountId === session.id ||
          byUrl.linkedParentId === session.id ||
          byUrl.id === linkedStudentId
        );
        if (urlOwned && byUrl) {
          myStudents = [byUrl, ...myStudents.filter((s) => s.id !== byUrl.id)];
        }
      }

      // ─────────────────────────────────────────────────────
      //  DATA ENRICHMENT & DEDUPLICATION
      // ─────────────────────────────────────────────────────

      // Replace placeholders with real twin records where possible
      myStudents = myStudents.map((st) => {
        if (!isPlaceholder(st.fullName)) return st;
        const twin = allKnown.find((other) =>
          other.id !== st.id &&
          !isPlaceholder(other.fullName) &&
          normalizeArabicText(other.fullName) === normalizeArabicText(st.fullName)
        );
        return twin || st;
      });

      // Remove any remaining placeholders if we have real students
      const realStudents = myStudents.filter((s) => !isPlaceholder(s.fullName));
      if (realStudents.length > 0) {
        myStudents = realStudents;
      } else {
        // If all in myStudents were placeholders, attempt to recover real student from allKnown
        const realCandidates = allKnown.filter((s) => !isPlaceholder(s.fullName));
        const byPhone = parentPhoneSuffix
          ? realCandidates.find((s) => {
              const sp = (s.parentPhone || '').replace(/\D/g, '');
              return sp.length >= 8 && sp.slice(-8) === parentPhoneSuffix;
            })
          : null;
        const byEmail = parentEmail && !parentEmail.includes('@masar.local') && !parentEmail.includes('@masarplatform.org')
          ? realCandidates.find((s) => {
              const ems = [(s as any).parentEmail, (s as any).email].map((e) => (e || '').trim().toLowerCase());
              return ems.includes(parentEmail);
            })
          : null;
        const byParentName = session.name && !isPlaceholder(session.name) && session.name !== 'ولي الأمر'
          ? realCandidates.find((s) => s.parentName && isStudentNameMatch(s.parentName, session.name))
          : null;
        const recovered = byPhone || byEmail || byParentName || (realCandidates.length === 1 ? realCandidates[0] : null);
        if (recovered) {
          myStudents = [recovered];
        }
      }

      // Deduplicate by ID
      const seen = new Set<string>();
      myStudents = myStudents.filter((s) => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });

      // Enrich each student record with best available data from records of the EXACT same student name
      myStudents = myStudents.map((st) => {
        const normName = normalizeArabicText(st.fullName);
        const twins = allKnown.filter((other: any) =>
          other.id !== st.id &&
          normalizeArabicText(other.fullName) === normName
        );

        const enriched: StudentRecord = {
          ...st,
          photoUrl: st.photoUrl || twins.find((t: any) => t.photoUrl)?.photoUrl || allAccounts.find((a) =>
            a.photoUrl &&
            (a.id === st.studentAccountId || a.linkedStudentId === st.id || a.email === st.linkedStudentEmail)
          )?.photoUrl || '',
          dateOfBirth: st.dateOfBirth || twins.find((t: any) => t.dateOfBirth)?.dateOfBirth || (allAccounts.find((a: any) => (a.id === st.studentAccountId || a.linkedStudentId === st.id) && (a as any).dateOfBirth) as any)?.dateOfBirth || '',
          nationalId: st.nationalId || twins.find((t: any) => t.nationalId)?.nationalId || (allAccounts.find((a: any) => (a.id === st.studentAccountId || a.linkedStudentId === st.id) && (a as any).nationalId) as any)?.nationalId || '',
          grade: st.grade || twins.find((t: any) => t.grade)?.grade || 'الصف الأول',
          parentName: (st.parentName && !isPlaceholder(st.parentName) ? st.parentName : '') || twins.find((t: any) => t.parentName && !isPlaceholder(t.parentName))?.parentName || (session.name && !isPlaceholder(session.name) ? session.name : '') || 'ولي الأمر',
          parentPhone: st.parentPhone || twins.find((t: any) => t.parentPhone)?.parentPhone || session.phone || '',
        };

        // Self-heal the DB only if something genuinely changed (avoid spamming writes on every render)
        const hasChange =
          (enriched.photoUrl && enriched.photoUrl !== st.photoUrl) ||
          (enriched.dateOfBirth && enriched.dateOfBirth !== st.dateOfBirth);

        if (hasChange) {
          const healed = updateStudent(st.id, enriched);
          if (healed) void syncDocToCloud('students', healed.id, healed);
        }

        return enriched;
      });

      setStudents(myStudents);
      const allReps = getReports();
      const allMsgs = getMessages();

      // Ensure any auto-generated assessment or survey report that was never dispatched by Dr. Ismail
      // is strictly kept as dispatchedToParent: false so the parent sees the true "under review" status
      let repsRepaired = false;
      const cleanReps = allReps.map((r) => {
        const isExamOrSurvey =
          r.type === 'student-assessment-answers' ||
          r.type === 'student-assessment-analysis' ||
          r.type === 'survey-answers' ||
          r.type === 'clinical-analysis' ||
          r.type === 'placement' ||
          r.program?.includes('اختبار') ||
          r.program?.includes('استبيان') ||
          r.program?.includes('التقرير التحليلي الشامل');

        if (isExamOrSurvey && r.dispatchedToParent === true && !r.dispatchedByDoctor) {
          const hasDoctorDispatchMsg = allMsgs.some(
            (m) =>
              m.from === 'doctor' &&
              (m.body.includes(r.id) ||
                (r.program && m.body.includes(r.program)) ||
                m.body.includes('التقرير الرسمي') ||
                m.body.includes('تم اعتماد وإرسال تقرير رسمي'))
          );
          if (!hasDoctorDispatchMsg) {
            repsRepaired = true;
            return { ...r, dispatchedToParent: false, status: 'pending' as const };
          }
        }
        return r;
      });

      if (repsRepaired) {
        setReports(cleanReps);
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem('masar_reports_v1', JSON.stringify(cleanReps));
          }
        } catch {}
        cleanReps.forEach((r) => {
          if (r.dispatchedToParent === false) {
            void syncDocToCloud('reports', r.id, r);
          }
        });
      } else {
        setReports(allReps);
      }
      setMessages(allMsgs);

      const primary = myStudents[0];
      const isDrIsmailStudent = primary && (
        primary.schoolBranch === 'IKHLAS_JEDDAH' ||
        classStudents.some((cs) => cs.id === primary.id || (cs.fullName && primary.fullName && normalizeArabicText(cs.fullName) === normalizeArabicText(primary.fullName)))
      );
      if (isDrIsmailStudent && primary) {
        router.replace(`/school-parent?student=${encodeURIComponent(primary.id)}`);
        return;
      }
      const resolvedParentName =
        (primary?.parentName && !isPlaceholder(primary.parentName) ? primary.parentName : '') ||
        (session.name && !isPlaceholder(session.name) && session.name !== 'ولي الأمر' ? session.name : '') ||
        'ولي الأمر';

      setParentName(resolvedParentName);

      if (myStudents.length > 0) {
        const targetId = (activeId && myStudents.some((s) => s.id === activeId)) ? activeId : myStudents[0].id;
        setSelectedStudentId(targetId);
        void recordUserPresence({ role: 'parent', studentId: targetId });

        const allSurveys = getSurveys();
        // surveyDone check: use survey records OR session.onboardingRequired===false as fallback.
        // The survey page sets onboardingRequired:false via setSession() before navigating,
        // so even if pullCloudDataToLocal returns stale survey data, this fallback is reliable.
        const surveyRecordFound = allSurveys.some(
          (s) => s.studentId === targetId ||
          (session.email && s.parentEmail?.toLowerCase() === session.email.toLowerCase()) ||
          (session.phone && s.parentPhone === session.phone)
        );
        const surveyDone = surveyRecordFound || (session as any)?.onboardingRequired === false;
        setHasSurvey(surveyDone);

      }
      const localHw = getLocalHomework();
      const allClassHw: HomeworkRecord[] = getStudentHomeworkLogs(selectedStudentId || (myStudents[0] ? myStudents[0].id : '')).map((h) => ({
        id: h.id,
        title: h.title,
        description: h.subject ? `واجب مادة ${h.subject}` : 'واجب مدرسي',
        dueDate: h.dueDate,
        status: (h.grade !== undefined ? 'reviewed' : (h.status === 'submitted' ? 'submitted' : 'assigned')) as 'assigned' | 'submitted' | 'reviewed',
        studentId: h.studentId,
        studentName: myStudents.find((s) => s.id === h.studentId)?.fullName || 'طالب',
        grade: h.grade,
        teacherFeedback: h.teacherFeedback,
        createdAt: h.createdAt,
      }));
      setHomeworkList([...allClassHw, ...localHw]);
    };
    void loadParentPortal();
    const unsubscribe = subscribeToCloudUpdates(() => {
      if (!cancelled) void loadParentPortal();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router, selectedStudentId]);

  const rawSelectedStudent =
    students.find((student) => student.id === selectedStudentId) ??
    students[0] ??
    null;

  const selectedStudent = useMemo<StudentRecord | null>(() => {
    if (!rawSelectedStudent) return null;
    const allSt = getStudents();
    const allAcc = getAccounts();
    const classSt = getClassStudents();
    const allReps = getReports();
    const allKnown = [...allSt, ...classSt];

    // Find the real student name across all available sources
    let resolvedFullName = rawSelectedStudent.fullName;
    const isGenericName = !resolvedFullName || resolvedFullName.includes('الاستبيان') || resolvedFullName.includes('جديد') || resolvedFullName === 'طالب';

    if (isGenericName) {
      const studentAcc = allAcc.find((a) =>
        a.role === 'student' &&
        a.name &&
        !a.name.includes('جديد') &&
        !a.name.includes('الاستبيان') &&
        (a.id === rawSelectedStudent.studentAccountId ||
          a.linkedStudentId === rawSelectedStudent.id ||
          a.email === rawSelectedStudent.linkedStudentEmail)
      );
      const repStudent = allReps.find((r) =>
        r.studentId === rawSelectedStudent.id &&
        r.studentName &&
        !r.studentName.includes('جديد') &&
        !r.studentName.includes('الاستبيان')
      );
      const knownSt = allKnown.find((s: any) =>
        s.id !== rawSelectedStudent.id &&
        (s.studentAccountId === rawSelectedStudent.studentAccountId ||
          s.parentAccountId === rawSelectedStudent.parentAccountId ||
          s.linkedParentId === rawSelectedStudent.linkedParentId ||
          s.linkedStudentEmail === rawSelectedStudent.linkedStudentEmail) &&
        s.fullName &&
        !s.fullName.includes('جديد') &&
        !s.fullName.includes('الاستبيان')
      );

      if (studentAcc?.name) {
        resolvedFullName = studentAcc.name;
      } else if (repStudent?.studentName) {
        resolvedFullName = repStudent.studentName;
      } else if (knownSt?.fullName) {
        resolvedFullName = knownSt.fullName;
      }
    }


    const norm = normalizeArabicText(resolvedFullName);

    // Only search twins with exact matching student name
    const twins = allKnown.filter((s: any) =>
      normalizeArabicText(s.fullName) === norm
    );

    const bestPhoto =
      rawSelectedStudent.photoUrl ||
      twins.find((t: any) => t.photoUrl)?.photoUrl ||
      allAcc.find((a) =>
        a.photoUrl &&
        (a.id === rawSelectedStudent.studentAccountId ||
          a.linkedStudentId === rawSelectedStudent.id ||
          a.email === rawSelectedStudent.linkedStudentEmail)
      )?.photoUrl ||
      '';

    const bestDob =
      rawSelectedStudent.dateOfBirth ||
      twins.find((t: any) => t.dateOfBirth)?.dateOfBirth ||
      (allAcc.find((a: any) => (a.id === rawSelectedStudent.studentAccountId || a.linkedStudentId === rawSelectedStudent.id) && (a as any).dateOfBirth) as any)?.dateOfBirth ||
      '';

    const bestNationalId =
      rawSelectedStudent.nationalId ||
      twins.find((t: any) => t.nationalId)?.nationalId ||
      (allAcc.find((a: any) => (a.id === rawSelectedStudent.studentAccountId || a.linkedStudentId === rawSelectedStudent.id) && (a as any).nationalId) as any)?.nationalId ||
      '';

    const bestGrade =
      (rawSelectedStudent.grade && !rawSelectedStudent.grade.includes('جديد') ? rawSelectedStudent.grade : '') ||
      twins.find((t: any) => t.grade)?.grade ||
      'الصف الأول الابتدائي';

    const bestParentName =
      (rawSelectedStudent.parentName && !rawSelectedStudent.parentName.includes('جديد') ? rawSelectedStudent.parentName : '') ||
      twins.find((t: any) => t.parentName && !t.parentName.includes('جديد'))?.parentName ||
      parentName ||
      'ولي الأمر';

    const bestParentPhone =
      rawSelectedStudent.parentPhone ||
      twins.find((t: any) => t.parentPhone)?.parentPhone ||
      '';

    return {
      ...rawSelectedStudent,
      fullName: resolvedFullName,
      photoUrl: bestPhoto,
      dateOfBirth: bestDob,
      nationalId: bestNationalId,
      grade: bestGrade,
      parentName: bestParentName,
      parentPhone: bestParentPhone,
    };
  }, [rawSelectedStudent, students, parentName]);

  const resolvedChildPhoto = selectedStudent?.photoUrl || '';
  
  const selectedStudentIds = useMemo(() => {
    const ids = new Set<string>();
    if (!selectedStudent) return ids;
    if (selectedStudent.id) ids.add(selectedStudent.id);
    if (selectedStudent.studentAccountId) ids.add(selectedStudent.studentAccountId);
    if ((selectedStudent as any).classStudentId) ids.add((selectedStudent as any).classStudentId);
    if (selectedStudent.linkedStudentId) ids.add(selectedStudent.linkedStudentId);
    try {
      const classSt = getClassStudents();
      const match = classSt.find((cs) => cs.fullName === selectedStudent.fullName || (selectedStudent.parentPhone && cs.parentPhone === selectedStudent.parentPhone));
      if (match?.id) ids.add(match.id);
    } catch {}
    return ids;
  }, [selectedStudent]);

  const selectedStudentNormName = useMemo(() => {
    return normalizeArabicText(selectedStudent?.fullName || '');
  }, [selectedStudent?.fullName]);

  const allStudentReports = useMemo(() => {
    if (!selectedStudent) return reports;
    return reports.filter((report) => {
      if (report.studentId && selectedStudentIds.has(report.studentId)) return true;
      const rName = normalizeArabicText(report.studentName || '');
      if (rName && selectedStudentNormName && (rName === selectedStudentNormName || rName.includes(selectedStudentNormName) || selectedStudentNormName.includes(rName))) return true;
      if (report.parentAccountId && report.parentAccountId === (selectedStudent as any).parentAccountId) return true;
      if (report.parentPhone && selectedStudent.parentPhone && report.parentPhone.replace(/\D/g, '').slice(-8) === selectedStudent.parentPhone.replace(/\D/g, '').slice(-8)) return true;
      return false;
    });
  }, [reports, selectedStudent, selectedStudentIds, selectedStudentNormName]);

  const studentReports = useMemo(() => {
    return allStudentReports.filter((r) => r.dispatchedToParent === true);
  }, [allStudentReports]);

  const studentMessages = useMemo(() => {
    return messages
      .filter((message) => {
        if (!selectedStudent) return true;
        if (message.studentId === 'student_assessment' || message.studentId === 'all') return true;
        if (message.studentId && selectedStudentIds.has(message.studentId)) return true;
        if (message.studentName) {
          const mName = normalizeArabicText(message.studentName);
          if (mName && selectedStudentNormName && (mName === selectedStudentNormName || mName.includes(selectedStudentNormName) || selectedStudentNormName.includes(mName))) return true;
        }
        if (message.parentAccountId && message.parentAccountId === (selectedStudent as any).parentAccountId) return true;
        if (message.parentPhone && selectedStudent.parentPhone && message.parentPhone.replace(/\D/g, '').slice(-8) === selectedStudent.parentPhone.replace(/\D/g, '').slice(-8)) return true;
        return false;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, selectedStudent, selectedStudentIds, selectedStudentNormName]);

  const studentHomework = useMemo(() => {
    return homeworkList.filter((hw) => {
      if (!selectedStudent) return true;
      if (!hw.studentId || hw.studentId === 'all') return true;
      if (selectedStudentIds.has(hw.studentId)) return true;
      const hwName = normalizeArabicText(hw.studentName || '');
      if (hwName && selectedStudentNormName && (hwName === selectedStudentNormName || hwName.includes(selectedStudentNormName) || selectedStudentNormName.includes(hwName))) return true;
      return false;
    });
  }, [homeworkList, selectedStudent, selectedStudentIds, selectedStudentNormName]);

  const assignedSlugs = useMemo(() => {
    if (!selectedStudent) return [];
    return selectedStudent.assignedPrograms || (selectedStudent.assignedProgram ? [selectedStudent.assignedProgram] : []);
  }, [selectedStudent]);

  const assignedProgramsList = useMemo(() => {
    return curriculumPrograms.filter((program) => assignedSlugs.includes(program.slug));
  }, [assignedSlugs]);

  const latestReport = studentReports[0];

  const isReportDispatchedByDoctor = (report?: ReportRecord | string | null) => {
    if (!report) return false;
    if (typeof report === 'string') {
      const found = reports.find((r) => r.id === report);
      return Boolean(found?.dispatchedToParent);
    }
    return Boolean(report.dispatchedToParent);
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedStudent) return;
    saveMessage({
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      parentAccountId: (selectedStudent as any).parentAccountId || (selectedStudent as any).linkedParentId,
      parentPhone: selectedStudent.parentPhone,
      from: 'parent',
      to: 'doctor',
      body: replyText.trim(),
      read: false,
    });
    setReplyText('');
    setMessages(getMessages());
  };

  const handleSendVoiceReply = async (audioDataUrl: string) => {
    if (!selectedStudent) return;
    saveMessage({
      studentId: selectedStudent.id,
      studentName: selectedStudent.fullName,
      parentAccountId: (selectedStudent as any).parentAccountId || (selectedStudent as any).linkedParentId,
      parentPhone: selectedStudent.parentPhone,
      from: 'parent',
      to: 'doctor',
      body: 'رسالة صوتية من ولي الأمر',
      audioDataUrl,
      attachmentType: 'audio',
      read: false,
    });
    setMessages(getMessages());
  };

  const childFirstName = (selectedStudent?.fullName || 'البطل').trim().split(' ')[0];

  const tabs: Array<{ key: ParentTab; label: string; icon: any }> = [
    { key: 'home', label: 'الرئيسية', icon: Home },
    { key: 'achievements', label: `إنجازات البطل ${childFirstName} 🏆`, icon: Trophy },
    { key: 'reports', label: 'التقارير الموثقة', icon: FileText },
    { key: 'chat', label: 'محادثة الدكتور', icon: MessageSquare },
    { key: 'homework', label: 'الواجبات', icon: BookOpen },
    { key: 'profile', label: 'ملف الطفل', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-slate-950" dir="rtl">
      <Navbar hideSidebarToggle={true} />
      
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        
        {/* Required Survey Alert Banner */}
        {!hasSurvey && selectedStudent && (
          <div className="rounded-3xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm font-black text-xl">
                📝
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-950">استبيان ولي الأمر مطلوب ⚠️</h3>
                <p className="text-xs font-bold text-amber-800 mt-0.5">
                  يرجى استكمال استبيان ولي الأمر عن الطالب (<strong>{selectedStudent.fullName}</strong>) لمساعدة د. إسماعيل عيسى في تخصيص الخطة والتقييم.
                </p>
              </div>
            </div>
            <Link
              href={`/survey?student=${selectedStudent.id}&flow=parent`}
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-600 hover:bg-amber-700 px-5 py-2.5 text-xs font-black text-white transition shadow-sm shrink-0 active:scale-95"
            >
              <span>تعبئة الاستبيان الآن</span>
              <ArrowLeft size={14} />
            </Link>
          </div>
        )}

        {/* Empty state when no student is linked yet */}
        {students.length === 0 && (
          <div className="rounded-3xl border-2 border-dashed border-teal-200 bg-teal-50/60 p-8 text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-teal-100 text-teal-800 flex items-center justify-center text-3xl font-black shadow-inner">
              👨‍👧
            </div>
            <div className="max-w-md mx-auto">
              <h3 className="text-base font-black text-slate-900">لم يتم ربط طالب بحسابك بعد</h3>
              <p className="text-xs font-bold text-slate-600 mt-1">
                يمكنك تسجيل بيانات طفلك أو ربط حسابه لمتابعة تقاريره وخطته التعليمية مباشرة مع د. إسماعيل عيسى.
              </p>
            </div>
            <Link
              href="/student/new?flow=parent"
              className="inline-flex items-center gap-2 rounded-2xl bg-teal-700 hover:bg-teal-800 px-6 py-3 text-xs font-black text-white transition shadow-md"
            >
              <span>تسجيل بيانات طفل جديد</span>
              <ArrowLeft size={16} />
            </Link>
          </div>
        )}

        {/* Multiple Children Switcher Bar if parent has multiple kids */}
        {students.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 animate-fade-in">
            <span className="text-xs font-black text-slate-500 whitespace-nowrap">أطفالي المسجلين:</span>
            {students.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedStudentId(s.id)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black transition cursor-pointer ${
                  selectedStudent?.id === s.id
                    ? 'bg-teal-700 text-white shadow-md'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{s.fullName}</span>
                {s.grade && <span className="opacity-80 text-[10px]">({s.grade})</span>}
              </button>
            ))}
          </div>
        )}

        {/* Tab 1: Home Overview */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fade-in">
            {/* Welcome Header (Visible ONLY on Home Tab) */}
            <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1 text-xs font-black text-teal-800 border border-teal-200 w-fit">
                  <Sparkles size={14} className="text-teal-600" />
                  <span>بوابة ولي الأمر التفاعلية</span>
                </span>
                <h1 className="mt-1 text-2xl md:text-3xl font-black text-slate-950">
                  أهلاً بك أ. {parentName} في منصة مَسَار 👋
                </h1>
                <p className="mt-1 text-xs md:text-sm font-bold text-slate-600">
                  متابعة الخطة التعليمية والتقارير الموثقة المباشرة من د. إسماعيل عيسى لطفلك: <span className="font-black text-teal-800">{selectedStudent?.fullName || 'الطفل'}</span>.
                </p>
              </div>
            </header>

            {/* Prominent Hero Student Profile Card (Only displayed on Home tab) */}
            {selectedStudent && (
              <section className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
                <StudentProfileCard
                  student={{
                    fullName: selectedStudent.fullName,
                    grade: selectedStudent.grade,
                    photoUrl: resolvedChildPhoto || selectedStudent.photoUrl,
                    parentName: selectedStudent.parentName || parentName,
                    parentPhone: selectedStudent.parentPhone || undefined,
                    nationalId: selectedStudent.nationalId,
                    dateOfBirth: selectedStudent.dateOfBirth,
                    studentLastActiveAt: selectedStudent.studentLastActiveAt,
                    studentLastLoginAt: selectedStudent.studentLastLoginAt,
                    parentLastActiveAt: selectedStudent.parentLastActiveAt,
                    parentLastLoginAt: selectedStudent.parentLastLoginAt,
                    lastActiveAt: selectedStudent.lastActiveAt,
                    lastLoginAt: selectedStudent.lastLoginAt,
                  }}
                  greeting="بيانات طفلي المسجل في منصة مسار 🌟"
                  variant="parent"
                  showParent={true}
                  className="border-0 shadow-none rounded-2xl"
                />
              </section>
            )}

            {/* Status Overview Cards */}
            <section className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-50 text-teal-700">
                    <ClipboardCheck size={22} />
                  </span>
                  <span className="text-[11px] font-black text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                    مباشر
                  </span>
                </div>
                <p className="text-xs font-black text-slate-500">حالة التقييم والاستبيان</p>
                <p className="text-lg font-black text-slate-950">
                  {latestReport ? 'تم الحفظ والتقييم' : 'قيد المراجعة'}
                </p>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-700">
                    <FileText size={22} />
                  </span>
                  <span className="text-[11px] font-black text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    تقارير
                  </span>
                </div>
                <p className="text-xs font-black text-slate-500">التقارير المعتمدة المتاحة</p>
                <p className="text-lg font-black text-slate-950">
                  {studentReports.length > 0 ? `${studentReports.length} تقارير معتمدة` : 'قيد اعتماد الدكتور'}
                </p>
              </article>

              <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-50 text-amber-700">
                    <Home size={22} />
                  </span>
                  <span className="text-[11px] font-black text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                    الخطة
                  </span>
                </div>
                <p className="text-xs font-black text-slate-500">المسار التعليمي المعتمد</p>
                <p className="text-lg font-black text-slate-950">
                  {assignedProgramsList.length > 0
                    ? `${assignedProgramsList.length} مسارات معتمدة`
                    : 'قيد مراجعة د. إسماعيل'}
                </p>
              </article>
            </section>

            {/* Quick Actions Card */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-950">الوصول السريع لخدمات الطفل</h3>
                <span className="text-xs font-bold text-teal-800">بوابة د. إسماعيل عيسى</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <button
                  onClick={() => setActiveTab('achievements')}
                  className="flex flex-col items-start p-4 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-white hover:border-amber-400 transition text-right cursor-pointer shadow-xs"
                >
                  <Trophy className="text-amber-600 mb-2" size={24} />
                  <span className="text-sm font-black text-slate-950">إنجازات وجوائز البطل 🏆</span>
                  <span className="text-[11px] font-bold text-amber-800 mt-1">شهادات التفوق والأوسمة المعتمدة</span>
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className="flex flex-col items-start p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 transition text-right cursor-pointer"
                >
                  <FileText className="text-teal-700 mb-2" size={24} />
                  <span className="text-sm font-black text-slate-950">عرض التقارير الموثقة</span>
                  <span className="text-[11px] font-bold text-slate-500 mt-1">الاطلاع على تحليل الدكتور المعتمد</span>
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className="flex flex-col items-start p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 transition text-right cursor-pointer"
                >
                  <MessageSquare className="text-blue-700 mb-2" size={24} />
                  <span className="text-sm font-black text-slate-950">محادثة الشات المباشرة</span>
                  <span className="text-[11px] font-bold text-slate-500 mt-1">تواصل فوري مع د. إسماعيل عيسى</span>
                </button>
                <button
                  onClick={() => setActiveTab('homework')}
                  className="flex flex-col items-start p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-teal-50 hover:border-teal-300 transition text-right cursor-pointer"
                >
                  <BookOpen className="text-amber-700 mb-2" size={24} />
                  <span className="text-sm font-black text-slate-950">الواجبات والمتابعة</span>
                  <span className="text-[11px] font-bold text-slate-500 mt-1">الأنشطة والمهام المنزلية</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* Tab 2: Hero Achievements (إنجازات وجوائز البطل) */}
        {activeTab === 'achievements' && selectedStudent && (
          <StudentAchievementsTab
            studentId={selectedStudent.id}
            studentName={selectedStudent.fullName}
            grade={selectedStudent.grade}
            schoolBranch={selectedStudent.schoolBranch || 'MASAR'}
            variant="parent"
          />
        )}

        {/* Tab 3: Reports */}
        {activeTab === 'reports' && (
          <div className="space-y-6 animate-fade-in">
            {/* Multi-Track Display Card */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <p className="text-xs font-black text-teal-800">المسار التعليمي والبرامج المعتمدة</p>
                <h2 className="text-lg font-black text-slate-950 mt-0.5">
                  {assignedProgramsList.length > 0
                    ? `تم اعتماد المسارات: ${assignedProgramsList.map((p) => p.shortTitle).join(' و ')}`
                    : latestReport
                    ? 'ملف الطالب قيد مراجعة د. إسماعيل عيسى'
                    : 'لم يتم استكمال التقييم بعد'}
                </h2>
              </div>

              {assignedProgramsList.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {assignedProgramsList.map((program) => (
                    <div key={program.slug} className="rounded-2xl border border-teal-200 bg-teal-50/70 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-teal-700 text-white px-2.5 py-0.5 text-[10px] font-black">
                          مسار معتمد ✓
                        </span>
                        <span className="text-[11px] font-bold text-slate-500">{program.modules.length} وحدات</span>
                      </div>
                      <h3 className="font-black text-slate-950 text-sm">{program.title}</h3>
                      <p className="text-xs font-bold text-slate-600 leading-relaxed">{program.promise}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-bold leading-relaxed text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  سيظهر هنا تفاصيل المسارات التعليمية الموثقة فور قيام د. إسماعيل بمراجعة التقرير وتحديد الخطة المناسبة لطفلك.
                </p>
              )}
            </section>

            {/* Reports List */}
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div>
                <p className="text-xs font-black text-teal-800">تقارير الطفل الموثقة</p>
                <h2 className="text-lg font-black text-slate-950 mt-0.5">الملفات والتقارير المعتمدة من د. إسماعيل</h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    title: 'إجابات الاستبيان التفصيلية',
                    description: 'نسخة الأسئلة والإجابات الشاملة التي سجلتها في الاستبيان الأولي.',
                    report: allStudentReports.find((r) => r.type === 'survey-answers' || r.program === 'إجابات الاستبيان التفصيلية'),
                  },
                  {
                    title: 'التقرير التحليلي الشامل',
                    description: 'التقرير الإكلينيكي الشامل وتوصيات د. إسماعيل عيسى.',
                    report: allStudentReports.find((r) => r.type === 'clinical-analysis' || r.program === 'التقرير التحليلي الشامل' || r.program?.includes('شامل') || r.program?.includes('أكاديمي')),
                  },
                  {
                    title: 'إجابات اختبار الطالب التفصيلية',
                    description: 'إجابات الطالب المباشرة والتسجيلات الصوتية والرسومات.',
                    report: allStudentReports.find((r) => r.type === 'student-assessment-answers' || r.program === 'إجابات اختبار الطالب التفصيلية'),
                  },
                  {
                    title: 'تحليل اختبار الطالب المباشر',
                    description: 'نتائج تقييم المهارات وتحديد المستوى المباشر للطالب.',
                    report: allStudentReports.find((r) => r.type === 'student-assessment-analysis' || r.type === 'placement' || r.program === 'تحليل اختبار الطالب المباشر' || r.program === 'اختبار قبول وتحديد مستوى'),
                  },
                ].map((slot) => {
                  const hasReport = Boolean(slot.report);
                  const isDispatched = Boolean(slot.report && slot.report.dispatchedToParent === true);
                  return (
                    <article key={slot.title} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <div className="space-y-2">
                        <FileText className={isDispatched ? 'text-teal-700' : hasReport ? 'text-amber-600' : 'text-slate-400'} size={24} />
                        <h3 className="font-black text-slate-950 text-xs sm:text-sm leading-snug">{slot.title}</h3>
                        <p className="text-[11px] font-bold text-slate-500 leading-relaxed min-h-[34px]">{slot.description}</p>
                      </div>

                      {isDispatched ? (
                        <Link
                          href={`/reports?report=${slot.report!.id}&mode=parent`}
                          className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-teal-700 py-2.5 text-xs font-black text-white hover:bg-teal-800 transition shadow-xs"
                        >
                          <FileText size={14} />
                          <span>فتح التقرير الموثق 📄</span>
                        </Link>
                      ) : hasReport ? (
                        <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-2.5 text-center space-y-0.5">
                          <div className="flex items-center justify-center gap-1 text-[11px] font-black text-amber-900">
                            <Clock size={13} className="text-amber-700 animate-pulse shrink-0" />
                            <span>قيد التقييم والمراجعة من د. إسماعيل عيسى ⏳</span>
                          </div>
                          <p className="text-[10px] font-bold text-amber-700">
                            سيتم إتاحة التقرير هنا فور اعتماده وإرساله من الدكتور
                          </p>
                        </div>
                      ) : (
                        <div className="rounded-xl bg-white border border-slate-200 py-2.5 px-2 text-center text-[11px] font-black text-slate-400">
                          قيد الإعداد من الدكتور
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* Tab 3: Chat */}
        {activeTab === 'chat' && (
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden animate-fade-in">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare size={22} className="text-teal-400" />
                <div>
                  <h3 className="font-black text-base">محادثة الشات المباشرة مع د. إسماعيل عيسى</h3>
                  <p className="text-xs font-bold text-slate-400">يمكنك الرد والتواصل المباشر بشأن متابعة الطفل</p>
                </div>
              </div>
              <span className="rounded-full bg-teal-900/80 text-teal-300 border border-teal-700 px-3 py-1 text-xs font-black">
                {studentMessages.length} رسالة
              </span>
            </div>

            {/* Chat Messages */}
            <div className="min-h-[300px] max-h-[450px] overflow-y-auto p-5 bg-slate-50 space-y-3">
              {studentMessages.length > 0 ? (
                studentMessages.map((msg) => {
                  const isDoctor = msg.from === 'doctor';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] ${
                        isDoctor ? 'ml-auto items-start' : 'mr-auto items-end'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className={`text-[10px] font-black ${isDoctor ? 'text-teal-800' : 'text-slate-600'}`}>
                          {isDoctor ? '👨‍⚕️ د. إسماعيل عيسى' : `👨‍👦 ولي الأمر (${parentName})`}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">
                          {new Date(msg.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        className={`rounded-2xl p-4 text-xs font-bold leading-relaxed shadow-2xs whitespace-pre-wrap ${
                          isDoctor
                            ? 'bg-white border border-slate-200 text-slate-900 rounded-tl-none'
                            : 'bg-teal-700 text-white rounded-tr-none'
                        }`}
                      >
                        {msg.body}
                        <MessageAudio src={msg.audioDataUrl} />
                        {(() => {
                          const urlMatch = msg.body.match(/https?:\/\/[^\s]+/);
                          if (urlMatch) {
                            const url = urlMatch[0];
                            const isZoom = url.includes('zoom.us');
                            return (
                              <div className="mt-3 pt-2.5 border-t border-slate-100/70">
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition shadow-xs ${
                                    isZoom
                                      ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-400/30'
                                      : 'bg-teal-700 hover:bg-teal-800 text-white'
                                  }`}
                                >
                                  {isZoom ? <Video size={15} /> : <ExternalLink size={15} />}
                                  <span>{isZoom ? 'انضمام إلى اجتماع Zoom المباشر 📹' : 'فتح الرابط المرفق 🔗'}</span>
                                </a>
                              </div>
                            );
                          }
                          if (msg.body.includes('تم إرسال وتحديد التقرير') || msg.body.includes('التقرير الرسمي')) {
                            return (
                              <div className="mt-3 pt-2.5 border-t border-slate-100/70">
                                <button
                                  type="button"
                                  onClick={() => setActiveTab('reports')}
                                  className="inline-flex items-center gap-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 text-xs font-black transition shadow-xs cursor-pointer"
                                >
                                  <FileText size={15} />
                                  <span>الانتقال لتبويب التقارير المعتمدة 📄</span>
                                </button>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="grid place-items-center py-16 text-center text-slate-400">
                  <MessageSquare size={40} className="text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-600">لا توجد رسائل سابقة في الشات بعد.</p>
                  <p className="text-xs text-slate-400 mt-1">اكتب رسالتك أو استفسارك للدكتور إسماعيل وسيرد عليك مباشرة.</p>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center gap-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendReply();
                  }
                }}
                placeholder="اكتب رسالتك أو استفسارك للدكتور إسماعيل..."
                className="flex-1 min-h-[48px] max-h-[100px] rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-900 outline-none focus:border-teal-600 resize-none"
              />
              <button
                onClick={handleSendReply}
                disabled={!replyText.trim()}
                className="rounded-2xl bg-teal-700 px-6 py-3.5 text-xs font-black text-white hover:bg-teal-800 transition disabled:opacity-40 shadow-sm cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                <Send size={15} />
                <span>إرسال</span>
              </button>
              <VoiceRecorderButton onRecorded={handleSendVoiceReply} disabled={!selectedStudent} />
            </div>
          </section>
        )}

        {/* Tab 4: Homework */}
        {activeTab === 'homework' && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 animate-fade-in">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-950">الواجبات والمهام المنزلية</h2>
              <p className="text-xs font-bold text-slate-500 mt-0.5">أنشطة وتمارين يومية موجهة لتعزيز المهارات</p>
            </div>

            {studentHomework.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <BookOpen size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-black text-slate-700">لا توجد واجبات مطلوبة حالياً</p>
                <p className="text-xs font-bold text-slate-400 mt-1">ستظهر الواجبات المنزلية هنا فور تعيينها من د. إسماعيل عيسى.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {studentHomework.map((hw: any) => (
                  <div key={hw.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black text-slate-950">{hw.title}</h4>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">
                        {hw.description || 'مهمة وتدريب منزلي'} • موعد التسليم: {hw.dueDate}
                      </p>
                      {hw.grade !== undefined && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-0.5 text-xs font-black">
                            ⭐ الدرجة المعتمدة: {hw.grade} من 10
                          </span>
                          {hw.teacherFeedback && (
                            <span className="text-[11px] font-bold text-slate-600 italic">
                              "{hw.teacherFeedback}"
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black shrink-0 ${
                      hw.grade !== undefined
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : hw.status === 'submitted'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-teal-100 text-teal-800'
                    }`}>
                      {hw.grade !== undefined ? 'تم التصحيح والتقييم ✅' : hw.status === 'submitted' ? 'تم التسليم ✓' : 'مطلوب'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab 5: Profile */}
        {activeTab === 'profile' && selectedStudent && (
          <section className="space-y-6 animate-fade-in">
            {/* Photo & Quick Info Card */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
              <div className="relative h-24 w-24 shrink-0">
                {selectedStudent.photoUrl ? (
                  <Image
                    src={selectedStudent.photoUrl}
                    alt={selectedStudent.fullName}
                    width={96}
                    height={96}
                    unoptimized
                    className="h-24 w-24 rounded-full object-cover ring-4 ring-teal-200 shadow-md"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-teal-100 text-teal-800 font-black text-2xl ring-4 ring-teal-200 shadow-inner">
                    {(selectedStudent.fullName || 'ط').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('')}
                  </div>
                )}
                <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-emerald-400 ring-2 ring-white shadow" />
              </div>

              <div className="flex-1 text-center sm:text-right space-y-2">
                <h3 className="text-lg font-black text-slate-950">{selectedStudent.fullName}</h3>
                <p className="text-xs font-bold text-slate-500">{selectedStudent.grade || 'الصف الأول الابتدائي'}</p>
                <div>
                  <label className="inline-flex items-center gap-2 cursor-pointer rounded-2xl bg-teal-50 border border-teal-200 px-4 py-2 text-xs font-black text-teal-800 hover:bg-teal-100 transition shadow-2xs">
                    <Camera size={16} />
                    <span>{selectedStudent.photoUrl ? 'تغيير صورة الطفل' : 'رفع صورة شخصية للطفل'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file || !selectedStudent) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const img = document.createElement('img');
                          img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const maxDim = 240;
                            let w = img.width;
                            let h = img.height;
                            if (w > h) {
                              if (w > maxDim) {
                                h = Math.round((h * maxDim) / w);
                                w = maxDim;
                              }
                            } else {
                              if (h > maxDim) {
                                w = Math.round((w * maxDim) / h);
                                h = maxDim;
                              }
                            }
                            canvas.width = w;
                            canvas.height = h;
                            canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

                            const healed = updateStudent(selectedStudent.id, { photoUrl: dataUrl });
                            if (healed) {
                              void syncDocToCloud('students', healed.id, healed);
                              setStudents((prev) => prev.map((s) => (s.id === healed.id ? healed : s)));
                            }
                          };
                          img.src = String(reader.result);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h2 className="text-base font-black text-slate-950 border-b border-slate-100 pb-3">بيانات ملف الطفل المسجل</h2>
              <div className="grid gap-4 sm:grid-cols-2 text-sm font-bold text-slate-700">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-400 block mb-1">اسم الطالب الرباعي:</span>
                  <span className="font-black text-slate-950 text-base">{selectedStudent.fullName}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-400 block mb-1">الصف / المستوى:</span>
                  <span className="font-black text-teal-800 text-base">{selectedStudent.grade}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-400 block mb-1">رقم الهوية / الإقامة:</span>
                  <span className="font-mono font-black text-slate-950 text-base">{selectedStudent.nationalId || 'غير مسجل'}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-400 block mb-1">تاريخ الميلاد:</span>
                  <span className="font-mono font-black text-slate-950 text-base">{selectedStudent.dateOfBirth || 'غير مسجل'}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-400 block mb-1">اسم ولي الأمر:</span>
                  <span className="font-black text-slate-950 text-base">{selectedStudent.parentName || parentName}</span>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-xs text-slate-400 block mb-1">هاتف ولي الأمر:</span>
                  <span className="font-mono font-black text-slate-950 text-base">{selectedStudent.parentPhone || 'غير مسجل'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-emerald-950">تسجيل بصمة الوجه البيومترية للطفل</h3>
                <p className="text-xs font-bold text-emerald-800 mt-1">تتيح للطفل تسجيل الدخول السريع عبر الكاميرا بدون كتابة كلمات مرور.</p>
              </div>
              <Link
                href="/face-enroll"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-6 py-3 text-xs font-black text-white hover:bg-emerald-800 transition shadow-sm shrink-0"
              >
                <ScanFace size={18} />
                <span>فتح تسجيل الوجه</span>
              </Link>
            </div>
          </section>
        )}
      </main>

      {/* Floating Bottom Navigation Bar matching student & school-parent portals */}
      <div className="fixed bottom-3 left-3 right-3 max-w-2xl mx-auto z-40 bg-white/95 backdrop-blur-xl border-2 border-teal-600/30 shadow-2xl rounded-3xl p-1.5 ring-4 ring-teal-600/10">
        <div className="grid grid-cols-6 gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-gradient-to-br from-teal-700 to-emerald-700 text-white font-black shadow-lg shadow-teal-700/30 scale-105'
                    : 'text-slate-600 hover:text-slate-900 font-bold hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white stroke-[2.5]' : 'text-slate-600'}`} />
                <span className="text-[10px] leading-none">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        userEmail={sessionEmail}
      />
    </div>
  );
}
