'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Archive, Calendar, Users, BookOpen, Brain,
  Printer, Filter, Search, ChevronDown, CheckCircle2,
  XCircle, Clock, AlertCircle, BarChart3, FileText,
  Eye, Sparkles, Trophy, Star, Folder, FolderOpen,
  ArrowRight, Award, GraduationCap, Phone, UserCheck, Check
} from 'lucide-react';
import {
  getAllAttendanceSnapshots,
  getAllHomeworkSnapshots,
  getAllQuizSnapshots,
  formatArabicDate,
  getStatusLabel,
  getStatusColor,
  type DailyAttendanceSnapshot,
  type DailyHomeworkSnapshot,
  type DailyQuizSnapshot,
} from '@/lib/dailyArchive';
import { getClassStudents, getStudentHomeworkLogs, type ClassStudentRecord } from '@/lib/classDb';
import { getSubmissions, type StudentQuizSubmission } from '@/lib/curriculumDb';
import { isStudentNameMatch, normalizeArabicText } from '@/lib/nameMatching';
import { readCloudCache } from '@/lib/firestoreSync';

type ViewMode = 'dossiers' | 'daily_archive';
type ArchiveSection = 'attendance' | 'homework' | 'quizzes';
type DurationPreset = 'all' | 'today' | 'week' | 'month' | 'custom';

export interface StudentDossierRecord {
  id: string;
  fullName: string;
  grade: string;
  parentPhone?: string;
  photoUrl?: string;
  nationalId?: string;
}

export interface StudentAttendanceItem {
  id: string;
  date: string;
  dayName: string;
  sessionStart: string;
  sessionEnd: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  score?: number;
  note?: string;
  exitTime?: string;
}

export interface StudentHomeworkItem {
  id: string;
  title: string;
  subject: string;
  pages?: string;
  dueDate: string;
  date: string;
  status: 'assigned' | 'submitted' | 'late' | 'missing' | 'reviewed';
  grade?: number;
  feedback?: string;
  submittedAt?: string;
}

export interface StudentQuizItem {
  id: string;
  quizTitle: string;
  subject: string;
  score: number;
  date: string;
  status: string;
  note?: string;
}

interface Props {
  students?: { id: string; name?: string; fullName?: string; phone?: string; photoUrl?: string; grade?: string; nationalId?: string }[];
}

export default function DailyArchiveTab({ students: propStudents }: Props = {}) {
  // Navigation & Mode
  const [viewMode, setViewMode] = useState<ViewMode>('dossiers');
  const [selectedStudent, setSelectedStudent] = useState<StudentDossierRecord | null>(null);
  const [studentTab, setStudentTab] = useState<ArchiveSection>('attendance');

  // Duration Filter
  const [durationPreset, setDurationPreset] = useState<DurationPreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Search
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState('');

  // Daily Snapshots (for class-wide view)
  const [section, setSection] = useState<ArchiveSection>('attendance');
  const [attSnapshots, setAttSnapshots] = useState<DailyAttendanceSnapshot[]>([]);
  const [hwSnapshots, setHwSnapshots] = useState<DailyHomeworkSnapshot[]>([]);
  const [quizSnapshots, setQuizSnapshots] = useState<DailyQuizSnapshot[]>([]);
  const [selectedAtt, setSelectedAtt] = useState<DailyAttendanceSnapshot | null>(null);
  const [selectedHw, setSelectedHw] = useState<DailyHomeworkSnapshot | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<DailyQuizSnapshot | null>(null);

  // Load snapshots & sync
  const reloadData = () => {
    setAttSnapshots(getAllAttendanceSnapshots());
    setHwSnapshots(getAllHomeworkSnapshots());
    setQuizSnapshots(getAllQuizSnapshots());
  };

  useEffect(() => {
    reloadData();
    const handleSync = () => reloadData();
    window.addEventListener('storage', handleSync);
    window.addEventListener('masar:cloud-cache-update', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('masar:cloud-cache-update', handleSync);
    };
  }, []);

  // 1. Normalized Students Pool
  const studentsList = useMemo<StudentDossierRecord[]>(() => {
    if (propStudents && propStudents.length > 0) {
      return propStudents.map(s => ({
        id: s.id,
        fullName: (s.fullName || s.name || 'طالب').trim(),
        grade: s.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
        parentPhone: s.phone || '',
        photoUrl: s.photoUrl || '',
        nationalId: s.nationalId || '',
      }));
    }
    const cls = getClassStudents();
    if (cls && cls.length > 0) {
      return cls.map(s => ({
        id: s.id,
        fullName: s.fullName,
        grade: s.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
        parentPhone: s.parentPhone || '',
        photoUrl: s.photoUrl || '',
        nationalId: s.nationalId || '',
      }));
    }
    const main = readCloudCache<any>('masar.students.v1');
    return main.map((s: any) => ({
      id: s.id,
      fullName: s.fullName || s.name || 'طالب',
      grade: s.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
      parentPhone: s.parentPhone || s.phone || '',
      photoUrl: s.photoUrl || '',
      nationalId: s.nationalId || '',
    }));
  }, [propStudents]);

  // Filtered Students in Grid
  const filteredStudents = useMemo(() => {
    if (!studentSearchQuery.trim()) return studentsList;
    const q = normalizeArabicText(studentSearchQuery);
    return studentsList.filter(s =>
      normalizeArabicText(s.fullName).includes(q) ||
      (s.parentPhone && s.parentPhone.includes(studentSearchQuery.trim())) ||
      (s.nationalId && s.nationalId.includes(studentSearchQuery.trim()))
    );
  }, [studentsList, studentSearchQuery]);

  // Helper: Date filter tester
  const isDateInSelectedDuration = (dateStr?: string): boolean => {
    if (!dateStr) return true;
    const dOnly = dateStr.split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    if (durationPreset === 'all') return true;
    if (durationPreset === 'today') return dOnly === today;
    if (durationPreset === 'week') {
      const d7 = new Date();
      d7.setDate(d7.getDate() - 7);
      const weekAgo = d7.toISOString().split('T')[0];
      return dOnly >= weekAgo && dOnly <= today;
    }
    if (durationPreset === 'month') {
      const d30 = new Date();
      d30.setDate(d30.getDate() - 30);
      const monthAgo = d30.toISOString().split('T')[0];
      return dOnly >= monthAgo && dOnly <= today;
    }
    if (durationPreset === 'custom') {
      if (customStartDate && dOnly < customStartDate) return false;
      if (customEndDate && dOnly > customEndDate) return false;
      return true;
    }
    return true;
  };

  const currentDurationLabel = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    if (durationPreset === 'all') return 'كامل السجل الدراسي';
    if (durationPreset === 'today') return `اليوم (${formatArabicDate(today)})`;
    if (durationPreset === 'week') return 'آخر 7 أيام (هذا الأسبوع)';
    if (durationPreset === 'month') return 'آخر 30 يوماً (هذا الشهر)';
    if (durationPreset === 'custom') {
      return `فترة مخصصة من: ${customStartDate || 'البداية'} إلى: ${customEndDate || 'اليوم'}`;
    }
    return 'كامل السجل الدراسي';
  }, [durationPreset, customStartDate, customEndDate]);

  // 2. Student Data Aggregators
  const getAttendanceForStudent = (student: StudentDossierRecord): StudentAttendanceItem[] => {
    const list: StudentAttendanceItem[] = [];
    const seenDates = new Set<string>();

    attSnapshots.forEach(snap => {
      const entry = snap.entries.find(e =>
        (e.studentId && e.studentId === student.id) ||
        (e.studentName && isStudentNameMatch(e.studentName, student.fullName))
      );
      if (entry) {
        list.push({
          id: `${snap.id}_${student.id}`,
          date: snap.date,
          dayName: snap.dayName || '',
          sessionStart: snap.sessionStart || '07:00',
          sessionEnd: snap.sessionEnd || '12:30',
          status: entry.status,
          score: entry.score ?? (entry.status === 'present' ? 95 : 0),
          note: entry.note || '',
          exitTime: entry.exitTime,
        });
        seenDates.add(snap.date);
      }
    });

    // Check today's matrix if not already recorded in snapshot
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      if (!seenDates.has(todayStr)) {
        const cached = readCloudCache<{ id: string; matrix: Record<string, Record<number, any>> }>('masar_period_attendance_v2_');
        const todayItem = cached.find(item => item.id.includes(todayStr));
        if (todayItem?.matrix && todayItem.matrix[student.id]) {
          const pRec = todayItem.matrix[student.id][1] || Object.values(todayItem.matrix[student.id])[0];
          if (pRec) {
            list.unshift({
              id: `matrix_${todayStr}_${student.id}`,
              date: todayStr,
              dayName: 'اليوم',
              sessionStart: '07:00',
              sessionEnd: '12:30',
              status: pRec.status || 'present',
              score: pRec.score ?? 95,
              note: pRec.note || '',
              exitTime: pRec.exitLogged,
            });
          }
        }
      }
    } catch {}

    return list.sort((a, b) => b.date.localeCompare(a.date));
  };

  const getHomeworkForStudent = (student: StudentDossierRecord): StudentHomeworkItem[] => {
    const list: StudentHomeworkItem[] = [];
    const seen = new Set<string>();

    // 1. From classDb homework logs
    const classLogs = getStudentHomeworkLogs(student.id, student.fullName);
    classLogs.forEach(h => {
      const key = `${h.title}_${h.dueDate}`;
      if (!seen.has(key)) {
        seen.add(key);
        const pages = h.fromPage && h.toPage ? `ص ${h.fromPage} - ص ${h.toPage}` : h.fromPage ? `ص ${h.fromPage}` : undefined;
        list.push({
          id: h.id,
          title: h.title,
          subject: h.subject || 'عام',
          pages,
          dueDate: h.dueDate,
          date: (h.submittedAt || h.dueDate || h.createdAt || '').split('T')[0],
          status: h.status,
          grade: h.grade,
          feedback: h.teacherFeedback,
          submittedAt: h.submittedAt,
        });
      }
    });

    // 2. From daily homework snapshots
    hwSnapshots.forEach(snap => {
      const sub = snap.submissions.find(s =>
        (s.studentId && s.studentId === student.id) ||
        (s.studentName && isStudentNameMatch(s.studentName, student.fullName))
      );
      if (sub) {
        const key = `${snap.homeworkTitle}_${snap.dueDate}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: `${snap.id}_${student.id}`,
            title: snap.homeworkTitle,
            subject: snap.subject || 'عام',
            dueDate: snap.dueDate || snap.date,
            date: snap.date,
            status: sub.status === 'submitted' ? 'submitted' : sub.status === 'late' ? 'late' : 'missing',
            grade: sub.grade,
            feedback: sub.feedback,
          });
        }
      }
    });

    // 3. From curriculum assignments
    try {
      const assignments = readCloudCache<any>('masar.curriculumAssignments.v1');
      assignments.forEach((a: any) => {
        const matches = !a.studentId || a.studentId === 'all' || a.studentId === student.id || isStudentNameMatch(a.studentName, student.fullName);
        if (matches) {
          const key = `${a.title}_${a.dueDate}`;
          if (!seen.has(key)) {
            seen.add(key);
            const pages = a.fromPage && a.toPage ? `ص ${a.fromPage} - ص ${a.toPage}` : a.fromPage ? `ص ${a.fromPage}` : undefined;
            list.push({
              id: a.id,
              title: a.title,
              subject: a.subject || 'المقرر الدراسي',
              pages,
              dueDate: a.dueDate || a.date,
              date: (a.dueDate || a.createdAt || '').split('T')[0],
              status: a.status || 'assigned',
              grade: a.grade,
              feedback: a.doctorFeedback || a.teacherFeedback,
            });
          }
        }
      });
    } catch {}

    return list.sort((a, b) => b.date.localeCompare(a.date));
  };

  const getQuizzesForStudent = (student: StudentDossierRecord): StudentQuizItem[] => {
    const list: StudentQuizItem[] = [];
    const seen = new Set<string>();

    // 1. From curriculum quiz submissions
    try {
      const subs = getSubmissions();
      const quizzes = readCloudCache<any>('masar_curriculum_quizzes_v1');
      const quizMap = new Map<string, any>();
      quizzes.forEach((q: any) => quizMap.set(q.id, q));

      subs.forEach(s => {
        const matches = (s.studentId && s.studentId === student.id) ||
          (s.studentName && isStudentNameMatch(s.studentName, student.fullName));
        if (matches && s.score !== undefined) {
          const qInfo = quizMap.get(s.quizId);
          const title = qInfo?.title || 'اختبار تفاعلي قصير';
          const subject = qInfo?.subjectName || 'المنهج الدراسي';
          const date = (s.submittedAt || '').split('T')[0] || new Date().toISOString().split('T')[0];
          const key = `${title}_${date}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({
              id: s.id,
              quizTitle: title,
              subject,
              score: s.score,
              date,
              status: 'تم الاختبار',
              note: s.correctionNote || (s.score >= 90 ? 'ممتاز ومتميز 🌟' : s.score >= 80 ? 'جيد جداً ✅' : 'يحتاج متابعة'),
            });
          }
        }
      });
    } catch {}

    // 2. From daily quiz snapshots
    quizSnapshots.forEach(snap => {
      const r = snap.results.find(res =>
        (res.studentId && res.studentId === student.id) ||
        (res.studentName && isStudentNameMatch(res.studentName, student.fullName))
      );
      if (r) {
        const key = `${snap.quizTitle}_${snap.date}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: `${snap.id}_${student.id}`,
            quizTitle: snap.quizTitle,
            subject: snap.subject || 'عام',
            score: r.score,
            date: snap.date,
            status: 'تم الاختبار',
            note: r.score >= 90 ? 'ممتاز 🌟' : r.score >= 80 ? 'جيد جداً' : r.score >= 60 ? 'جيد' : 'يحتاج متابعة',
          });
        }
      }
    });

    return list.sort((a, b) => b.date.localeCompare(a.date));
  };

  // 3. Current Selected Student Filtered Records & Statistics
  const activeStudentAttendance = useMemo(() => {
    if (!selectedStudent) return [];
    return getAttendanceForStudent(selectedStudent).filter(r => isDateInSelectedDuration(r.date));
  }, [selectedStudent, attSnapshots, durationPreset, customStartDate, customEndDate]);

  const activeStudentHomework = useMemo(() => {
    if (!selectedStudent) return [];
    return getHomeworkForStudent(selectedStudent).filter(r => isDateInSelectedDuration(r.date || r.dueDate));
  }, [selectedStudent, hwSnapshots, durationPreset, customStartDate, customEndDate]);

  const activeStudentQuizzes = useMemo(() => {
    if (!selectedStudent) return [];
    return getQuizzesForStudent(selectedStudent).filter(r => isDateInSelectedDuration(r.date));
  }, [selectedStudent, quizSnapshots, durationPreset, customStartDate, customEndDate]);

  // Statistics for selected student in current duration
  const attendanceStats = useMemo(() => {
    const total = activeStudentAttendance.length;
    const present = activeStudentAttendance.filter(r => r.status === 'present').length;
    const absent = activeStudentAttendance.filter(r => r.status === 'absent').length;
    const late = activeStudentAttendance.filter(r => r.status === 'late').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 100;
    return { total, present, absent, late, rate };
  }, [activeStudentAttendance]);

  const homeworkStats = useMemo(() => {
    const total = activeStudentHomework.length;
    const submitted = activeStudentHomework.filter(r => r.status === 'submitted' || r.status === 'reviewed').length;
    const missing = activeStudentHomework.filter(r => r.status === 'missing' || r.status === 'assigned').length;
    const late = activeStudentHomework.filter(r => r.status === 'late').length;
    const graded = activeStudentHomework.filter(r => r.grade !== undefined);
    const avgGrade = graded.length > 0 ? (graded.reduce((sum, r) => sum + (r.grade || 0), 0) / graded.length).toFixed(1) : '—';
    const rate = total > 0 ? Math.round((submitted / total) * 100) : 100;
    return { total, submitted, missing, late, avgGrade, rate };
  }, [activeStudentHomework]);

  const quizStats = useMemo(() => {
    const total = activeStudentQuizzes.length;
    const avgScore = total > 0 ? Math.round(activeStudentQuizzes.reduce((sum, q) => sum + q.score, 0) / total) : 0;
    const highScore = total > 0 ? Math.max(...activeStudentQuizzes.map(q => q.score)) : 0;
    const rating = avgScore >= 90 ? 'ممتاز 🌟' : avgScore >= 80 ? 'جيد جداً ✅' : avgScore >= 65 ? 'جيد 👍' : 'يحتاج متابعة ⚠️';
    return { total, avgScore, highScore, rating };
  }, [activeStudentQuizzes]);

  // Quick stats for student cards in directory view
  const studentQuickStats = useMemo(() => {
    const map = new Map<string, { attRate: number; hwSubmitted: number; hwTotal: number; quizAvg: number }>();
    studentsList.forEach(s => {
      const att = getAttendanceForStudent(s);
      const hw = getHomeworkForStudent(s);
      const qz = getQuizzesForStudent(s);

      const attPres = att.filter(a => a.status === 'present').length;
      const attRate = att.length > 0 ? Math.round((attPres / att.length) * 100) : 98;
      const hwSub = hw.filter(h => h.status === 'submitted' || h.status === 'reviewed').length;
      const quizAvg = qz.length > 0 ? Math.round(qz.reduce((acc, q) => acc + q.score, 0) / qz.length) : 92;

      map.set(s.id, { attRate, hwSubmitted: hwSub, hwTotal: hw.length, quizAvg });
    });
    return map;
  }, [studentsList, attSnapshots, hwSnapshots, quizSnapshots]);

  /* ═══════════════════════════════════════════════════════
     OFFICIAL PRINTING FUNCTIONS (A4 CERTIFIED REPORTS)
  ═══════════════════════════════════════════════════════ */

  const printStudentAttendanceReport = (forceAll: boolean = false) => {
    if (!selectedStudent) return;
    const targetList = forceAll ? getAttendanceForStudent(selectedStudent) : activeStudentAttendance;
    const durationLabel = forceAll ? 'كامل السجل الدراسي للطالب (جميع الأيام والشهور)' : currentDurationLabel;
    const total = targetList.length;
    const present = targetList.filter(r => r.status === 'present').length;
    const absent = targetList.filter(r => r.status === 'absent').length;
    const late = targetList.filter(r => r.status === 'late').length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 100;

    const rows = targetList.length === 0
      ? '<tr><td colspan="8" style="padding:24px;text-align:center;color:#64748b;font-weight:bold;">لا توجد سجلات حضور خلال الفترة المحددة (' + durationLabel + ')</td></tr>'
      : targetList.map((r, i) => `
        <tr style="border-bottom:1px solid #e2e8f0; ${i % 2 === 1 ? 'background:#f8fafc;' : ''}">
          <td style="padding:8px 12px;text-align:center;font-weight:900;color:#475569;">${i + 1}</td>
          <td style="padding:8px 12px;font-weight:bold;color:#1e293b;">${formatArabicDate(r.date)}</td>
          <td style="padding:8px 12px;text-align:center;color:#64748b;font-size:12px;">${r.dayName || 'يوم دراسي'}</td>
          <td style="padding:8px 12px;text-align:center;color:#475569;font-size:12px;">${r.sessionStart} - ${r.sessionEnd}</td>
          <td style="padding:8px 12px;text-align:center;">
            <span style="background:${getStatusColor(r.status)}22;color:${getStatusColor(r.status)};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;border:1px solid ${getStatusColor(r.status)}55;">
              ${getStatusLabel(r.status)}
            </span>
          </td>
          <td style="padding:8px 12px;text-align:center;font-weight:900;color:#065f46;">${r.score !== undefined ? r.score + '%' : '—'}</td>
          <td style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;">${r.exitTime || 'انصراف نظامي'}</td>
          <td style="padding:8px 12px;font-size:11px;color:#475569;">${r.note || '—'}</td>
        </tr>
      `).join('');

    const html = `<!doctype html><html lang="ar" dir="rtl"><head>
      <meta charset="utf-8"/>
      <title>سجل حضور الطالب — ${selectedStudent.fullName}</title>
      <style>
        @page { size: A4; margin: 16mm 14mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'Cairo', 'Segoe UI', Arial, sans-serif; }
        body { margin: 0; background: #fff; color: #1e293b; }
        .header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:3px solid #06392c; background:linear-gradient(135deg,#06392c 0%,#0b4d3c 100%); border-radius:12px 12px 0 0; }
        .logo-area { display:flex; align-items:center; gap:14px; }
        .logo-circle { width:52px; height:52px; border-radius:50%; background:rgba(255,255,255,0.15); border:2px solid rgba(255,255,255,0.3); display:flex; align-items:center; justify-content:center; font-size:24px; }
        .platform-name { color:#fff; }
        .platform-name h1 { margin:0; font-size:18px; font-weight:900; }
        .platform-name p { margin:2px 0 0; font-size:12px; color:rgba(255,255,255,0.85); font-weight:bold; }
        .header-meta { text-align:left; color:rgba(255,255,255,0.9); font-size:11px; font-weight:bold; line-height:1.7; }
        .student-banner { background:#f1f5f9; border:1px solid #cbd5e1; border-top:none; padding:14px 20px; display:flex; align-items:center; justify-content:space-between; }
        .student-title h2 { margin:0; font-size:18px; font-weight:900; color:#06392c; }
        .student-title p { margin:3px 0 0; font-size:12px; font-weight:bold; color:#64748b; }
        .stats-pills { display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; }
        .pill { padding:4px 12px; border-radius:999px; font-size:12px; font-weight:900; }
        .pill-green { background:#d1fae5; color:#065f46; border:1px solid #6ee7b7; }
        .pill-red { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }
        .pill-amber { background:#fef3c7; color:#92400e; border:1px solid #fcd34d; }
        .pill-blue { background:#dbeafe; color:#1e40af; border:1px solid #93c5fd; }
        table { width:100%; border-collapse:collapse; margin-top:12px; font-size:12px; }
        thead tr { background:#06392c; color:#fff; }
        thead th { padding:10px 8px; font-weight:900; text-align:right; font-size:12px; }
        thead th:first-child, thead th:nth-child(3), thead th:nth-child(4), thead th:nth-child(5), thead th:nth-child(6), thead th:nth-child(7) { text-align:center; }
        .footer { margin-top:24px; display:flex; align-items:flex-end; justify-content:space-between; padding-top:16px; border-top:2px dashed #cbd5e1; }
        .sig-block { text-align:center; }
        .sig-block .name { font-size:15px; font-weight:900; color:#06392c; margin-top:8px; }
        .sig-block .title { font-size:11px; color:#64748b; font-weight:bold; }
        .sig-line { width:160px; height:1px; background:#06392c; margin: 28px auto 0; }
        .stamp { width:90px; height:90px; border-radius:50%; border:3px double #06392c; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:8px; }
        .stamp p { margin:0; font-size:9px; font-weight:900; color:#06392c; line-height:1.4; }
      </style>
    </head><body>
      <div class="header">
        <div class="logo-area">
          <div class="logo-circle">📋</div>
          <div class="platform-name">
            <h1>منصة مَسَار للتأهيل والتعليم الذكي</h1>
            <p>فصل الإخلاص — جدة &nbsp;|&nbsp; إشراف: د. إسماعيل عيسى</p>
          </div>
        </div>
        <div class="header-meta">
          <div>الفترة المحددة: ${durationLabel}</div>
          <div>تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}</div>
        </div>
      </div>
      <div class="student-banner">
        <div class="student-title">
          <h2>سجل الحضور والغياب والانضباط — الطالب: ${selectedStudent.fullName}</h2>
          <p>${selectedStudent.grade} ${selectedStudent.parentPhone ? '· ولي الأمر: ' + selectedStudent.parentPhone : ''}</p>
        </div>
        <div class="stats-pills">
          <span class="pill pill-blue">إجمالي الأيام: ${total}</span>
          <span class="pill pill-green">حاضر: ${present}</span>
          <span class="pill pill-red">غائب: ${absent}</span>
          <span class="pill pill-amber">متأخر: ${late}</span>
          <span class="pill pill-green">نسبة الالتزام: ${rate}%</span>
        </div>
      </div>
      <table>
        <thead><tr>
          <th style="width:36px">#</th>
          <th>التاريخ</th>
          <th style="width:80px">اليوم</th>
          <th style="width:100px">الحصة</th>
          <th style="width:100px">الحالة</th>
          <th style="width:80px">الانضباط</th>
          <th style="width:100px">الانصراف</th>
          <th>ملاحظات المشرف</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="name">د. إسماعيل عيسى</div>
          <div class="title">المشرف الأكاديمي والمعلم المختص</div>
        </div>
        <div class="stamp">
          <p>منصة مَسَار</p>
          <p>التعليم الذكي</p>
          <p style="font-size:8px;color:#06392c;">✓ معتمد رسمياً</p>
        </div>
      </div>
      <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});</script>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const printStudentHomeworkReport = (forceAll: boolean = false) => {
    if (!selectedStudent) return;
    const targetList = forceAll ? getHomeworkForStudent(selectedStudent) : activeStudentHomework;
    const durationLabel = forceAll ? 'كامل السجل الدراسي للطالب (جميع الواجبات والتكاليف)' : currentDurationLabel;
    const total = targetList.length;
    const submitted = targetList.filter(r => r.status === 'submitted' || r.status === 'reviewed').length;
    const missing = targetList.filter(r => r.status === 'missing' || r.status === 'assigned').length;
    const late = targetList.filter(r => r.status === 'late').length;

    const rows = targetList.length === 0
      ? '<tr><td colspan="8" style="padding:24px;text-align:center;color:#64748b;font-weight:bold;">لا توجد سجلات واجبات خلال الفترة المحددة (' + durationLabel + ')</td></tr>'
      : targetList.map((h, i) => `
        <tr style="border-bottom:1px solid #e2e8f0; ${i % 2 === 1 ? 'background:#f8fafc;' : ''}">
          <td style="padding:8px 12px;text-align:center;font-weight:900;color:#475569;">${i + 1}</td>
          <td style="padding:8px 12px;font-weight:bold;color:#1e293b;">${h.title}</td>
          <td style="padding:8px 12px;color:#64748b;font-size:12px;">${h.subject}</td>
          <td style="padding:8px 12px;text-align:center;color:#475569;font-size:12px;">${h.pages || '—'}</td>
          <td style="padding:8px 12px;text-align:center;color:#64748b;font-size:12px;">${h.dueDate ? formatArabicDate(h.dueDate) : '—'}</td>
          <td style="padding:8px 12px;text-align:center;">
            <span style="background:${h.status === 'submitted' || h.status === 'reviewed' ? '#d1fae5' : h.status === 'late' ? '#fef3c7' : '#fee2e2'};color:${h.status === 'submitted' || h.status === 'reviewed' ? '#065f46' : h.status === 'late' ? '#92400e' : '#991b1b'};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;">
              ${h.status === 'submitted' || h.status === 'reviewed' ? 'سُلِّم ✓' : h.status === 'late' ? 'تأخر ⏰' : 'لم يُسلَّم ✗'}
            </span>
          </td>
          <td style="padding:8px 12px;text-align:center;font-weight:900;color:#0b4d3c;">${h.grade !== undefined ? h.grade + ' / 10' : 'قيد التقييم'}</td>
          <td style="padding:8px 12px;font-size:11px;color:#475569;">${h.feedback || '—'}</td>
        </tr>
      `).join('');

    const html = `<!doctype html><html lang="ar" dir="rtl"><head>
      <meta charset="utf-8"/>
      <title>سجل واجبات الطالب — ${selectedStudent.fullName}</title>
      <style>
        @page { size: A4; margin: 16mm 14mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'Cairo', 'Segoe UI', Arial, sans-serif; }
        body { margin: 0; background: #fff; color: #1e293b; }
        .header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:3px solid #0b4d3c; background:linear-gradient(135deg,#0b4d3c,#1a6b52); border-radius:12px 12px 0 0; }
        .logo-area { display:flex; align-items:center; gap:14px; }
        .logo-circle { width:52px; height:52px; border-radius:50%; background:rgba(255,255,255,0.15); border:2px solid rgba(255,255,255,0.3); display:flex; align-items:center; justify-content:center; font-size:24px; }
        .platform-name { color:#fff; }
        .platform-name h1 { margin:0; font-size:18px; font-weight:900; }
        .platform-name p { margin:2px 0 0; font-size:12px; color:rgba(255,255,255,.85); font-weight:bold; }
        .header-meta { text-align:left; color:rgba(255,255,255,.9); font-size:11px; font-weight:bold; line-height:1.7; }
        .student-banner { background:#f8fafc; border:1px solid #e2e8f0; border-top:none; padding:14px 20px; display:flex; align-items:center; justify-content:space-between; }
        .student-title h2 { margin:0; font-size:18px; font-weight:900; color:#0b4d3c; }
        .student-title p { margin:3px 0 0; font-size:12px; font-weight:bold; color:#64748b; }
        .stats-pills { display:flex; gap:8px; flex-wrap:wrap; }
        .pill { padding:4px 12px; border-radius:999px; font-size:12px; font-weight:900; }
        table { width:100%; border-collapse:collapse; margin-top:12px; font-size:12px; }
        thead tr { background:#0b4d3c; color:#fff; }
        thead th { padding:10px 8px; font-weight:900; text-align:right; font-size:12px; }
        thead th:first-child, thead th:nth-child(4), thead th:nth-child(5), thead th:nth-child(6), thead th:nth-child(7) { text-align:center; }
        .footer { margin-top:24px; display:flex; align-items:flex-end; justify-content:space-between; padding-top:16px; border-top:2px dashed #cbd5e1; }
        .sig-block { text-align:center; }
        .sig-block .name { font-size:15px; font-weight:900; color:#06392c; margin-top:8px; }
        .sig-block .title { font-size:11px; color:#64748b; }
        .sig-line { width:160px; height:1px; background:#06392c; margin:28px auto 0; }
        .stamp { width:90px; height:90px; border-radius:50%; border:3px double #06392c; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:8px; }
        .stamp p { margin:0; font-size:9px; font-weight:900; color:#06392c; line-height:1.4; }
      </style>
    </head><body>
      <div class="header">
        <div class="logo-area"><div class="logo-circle">📚</div>
          <div class="platform-name"><h1>منصة مَسَار للتأهيل والتعليم الذكي</h1><p>فصل الإخلاص — جدة | إشراف: د. إسماعيل عيسى</p></div></div>
        <div class="header-meta"><div>الفترة المحددة: ${durationLabel}</div><div>تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}</div></div>
      </div>
      <div class="student-banner">
        <div class="student-title">
          <h2>سجل الواجبات والتكاليف الدراسية — الطالب: ${selectedStudent.fullName}</h2>
          <p>${selectedStudent.grade}</p>
        </div>
        <div class="stats-pills">
          <span class="pill" style="background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;">إجمالي الواجبات: ${total}</span>
          <span class="pill" style="background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;">سُلِّم: ${submitted}</span>
          <span class="pill" style="background:#fee2e2;color:#991b1b;border:1px solid #fca5a5;">متبقي: ${homeworkStats.missing}</span>
          <span class="pill" style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;">متوسط التقييم: ${homeworkStats.avgGrade}/10</span>
        </div>
      </div>
      <table>
        <thead><tr>
          <th style="width:36px">#</th>
          <th>عنوان الواجب</th>
          <th style="width:110px">المادة</th>
          <th style="width:90px">الصفحات</th>
          <th style="width:110px">موعد التسليم</th>
          <th style="width:100px">الحالة</th>
          <th style="width:90px">الدرجة</th>
          <th>ملاحظات المعلم</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">
        <div class="sig-block"><div class="sig-line"></div><div class="name">د. إسماعيل عيسى</div><div class="title">المشرف الأكاديمي والمعلم المختص</div></div>
        <div class="stamp"><p>منصة مَسَار</p><p>التعليم الذكي</p><p style="font-size:8px;">✓ معتمد رسمياً</p></div>
      </div>
      <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});</script>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const printStudentQuizReport = (forceAll: boolean = false) => {
    if (!selectedStudent) return;
    const targetList = forceAll ? getQuizzesForStudent(selectedStudent) : activeStudentQuizzes;
    const durationLabel = forceAll ? 'كامل السجل الدراسي للطالب (جميع الكويزات والاختبارات)' : currentDurationLabel;
    const total = targetList.length;
    const avgScore = total > 0 ? Math.round(targetList.reduce((sum, q) => sum + q.score, 0) / total) : 0;
    const highScore = total > 0 ? Math.max(...targetList.map(q => q.score)) : 0;
    const rating = avgScore >= 90 ? 'ممتاز 🌟' : avgScore >= 80 ? 'جيد جداً ✅' : avgScore >= 65 ? 'جيد 👍' : 'يحتاج متابعة ⚠️';

    const rows = targetList.length === 0
      ? '<tr><td colspan="7" style="padding:24px;text-align:center;color:#64748b;font-weight:bold;">لا توجد سجلات كويزات خلال الفترة المحددة (' + durationLabel + ')</td></tr>'
      : targetList.map((q, i) => `
        <tr style="border-bottom:1px solid #e2e8f0; ${i % 2 === 1 ? 'background:#f8fafc;' : ''}">
          <td style="padding:8px 12px;text-align:center;font-weight:900;color:#475569;">${i + 1}</td>
          <td style="padding:8px 12px;font-weight:bold;color:#1e293b;">${q.quizTitle}</td>
          <td style="padding:8px 12px;color:#64748b;font-size:12px;">${q.subject}</td>
          <td style="padding:8px 12px;text-align:center;color:#64748b;font-size:12px;">${formatArabicDate(q.date)}</td>
          <td style="padding:8px 12px;text-align:center;">
            <span style="background:${q.score >= 80 ? '#d1fae5' : q.score >= 60 ? '#fef3c7' : '#fee2e2'};color:${q.score >= 80 ? '#065f46' : q.score >= 60 ? '#92400e' : '#991b1b'};padding:3px 12px;border-radius:999px;font-size:13px;font-weight:900;">
              ${q.score}%
            </span>
          </td>
          <td style="padding:8px 12px;font-size:11px;color:#475569;">${q.note || (q.score >= 90 ? 'ممتاز' : 'جيد')}</td>
        </tr>
      `).join('');

    const html = `<!doctype html><html lang="ar" dir="rtl"><head>
      <meta charset="utf-8"/>
      <title>سجل كويزات الطالب — ${selectedStudent.fullName}</title>
      <style>
        @page { size: A4; margin: 16mm 14mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'Cairo', 'Segoe UI', Arial, sans-serif; }
        body { margin: 0; background: #fff; color: #1e293b; }
        .header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:3px solid #1e40af; background:linear-gradient(135deg,#1e3a8a,#1e40af); border-radius:12px 12px 0 0; }
        .logo-area { display:flex; align-items:center; gap:14px; }
        .logo-circle { width:52px; height:52px; border-radius:50%; background:rgba(255,255,255,0.15); border:2px solid rgba(255,255,255,0.3); display:flex; align-items:center; justify-content:center; font-size:24px; }
        .platform-name { color:#fff; }
        .platform-name h1 { margin:0; font-size:18px; font-weight:900; }
        .platform-name p { margin:2px 0 0; font-size:12px; color:rgba(255,255,255,.85); font-weight:bold; }
        .header-meta { text-align:left; color:rgba(255,255,255,.9); font-size:11px; font-weight:bold; line-height:1.7; }
        .student-banner { background:#f8fafc; border:1px solid #e2e8f0; border-top:none; padding:14px 20px; display:flex; align-items:center; justify-content:space-between; }
        .student-title h2 { margin:0; font-size:18px; font-weight:900; color:#1e40af; }
        .student-title p { margin:3px 0 0; font-size:12px; font-weight:bold; color:#64748b; }
        .stats-pills { display:flex; gap:8px; flex-wrap:wrap; }
        .pill { padding:4px 12px; border-radius:999px; font-size:12px; font-weight:900; }
        table { width:100%; border-collapse:collapse; margin-top:12px; font-size:12px; }
        thead tr { background:#1e40af; color:#fff; }
        thead th { padding:10px 8px; font-weight:900; text-align:right; font-size:12px; }
        thead th:first-child, thead th:nth-child(4), thead th:nth-child(5) { text-align:center; }
        .footer { margin-top:24px; display:flex; align-items:flex-end; justify-content:space-between; padding-top:16px; border-top:2px dashed #cbd5e1; }
        .sig-block { text-align:center; }
        .sig-block .name { font-size:15px; font-weight:900; color:#1e40af; margin-top:8px; }
        .sig-block .title { font-size:11px; color:#64748b; }
        .sig-line { width:160px; height:1px; background:#1e40af; margin:28px auto 0; }
        .stamp { width:90px; height:90px; border-radius:50%; border:3px double #1e40af; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:8px; }
        .stamp p { margin:0; font-size:9px; font-weight:900; color:#1e40af; line-height:1.4; }
      </style>
    </head><body>
      <div class="header">
        <div class="logo-area"><div class="logo-circle">🧠</div>
          <div class="platform-name"><h1>منصة مَسَار للتأهيل والتعليم الذكي</h1><p>فصل الإخلاص — جدة | إشراف: د. إسماعيل عيسى</p></div></div>
        <div class="header-meta"><div>الفترة المحددة: ${currentDurationLabel}</div><div>تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}</div></div>
      </div>
      <div class="student-banner">
        <div class="student-title">
          <h2>سجل الكويزات والاختبارات التفاعلية — الطالب: ${selectedStudent.fullName}</h2>
          <p>${selectedStudent.grade}</p>
        </div>
        <div class="stats-pills">
          <span class="pill" style="background:#dbeafe;color:#1e40af;border:1px solid #93c5fd;">إجمالي الكويزات: ${total}</span>
          <span class="pill" style="background:#d1fae5;color:#065f46;border:1px solid #6ee7b7;">متوسط الدرجات: ${avgScore}%</span>
          <span class="pill" style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;">أعلى درجة: ${highScore}%</span>
          <span class="pill" style="background:#f3e8ff;color:#6b21a8;border:1px solid #d8b4fe;">التقدير: ${rating}</span>
        </div>
      </div>
      <table>
        <thead><tr>
          <th style="width:36px">#</th>
          <th>اسم الكويز / الاختبار</th>
          <th style="width:120px">المادة</th>
          <th style="width:120px">تاريخ الإجراء</th>
          <th style="width:100px">الدرجة</th>
          <th>ملاحظات الأداء</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">
        <div class="sig-block"><div class="sig-line"></div><div class="name">د. إسماعيل عيسى</div><div class="title">المشرف الأكاديمي والمعلم المختص</div></div>
        <div class="stamp"><p>منصة مَسَار</p><p>التعليم الذكي</p><p style="font-size:8px;">✓ معتمد رسمياً</p></div>
      </div>
      <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});</script>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const printStudentComprehensiveReport = (forceAll: boolean = false) => {
    if (!selectedStudent) return;

    const attList = forceAll ? getAttendanceForStudent(selectedStudent) : activeStudentAttendance;
    const hwList = forceAll ? getHomeworkForStudent(selectedStudent) : activeStudentHomework;
    const quizList = forceAll ? getQuizzesForStudent(selectedStudent) : activeStudentQuizzes;
    const durationLabel = forceAll ? 'كامل السجل الأكاديمي الشامل (جميع الأيام والشهور بلا استثناء)' : currentDurationLabel;

    // Recalculate stats for printed dataset
    const attTotal = attList.length;
    const attPresent = attList.filter(r => r.status === 'present').length;
    const attRate = attTotal > 0 ? Math.round((attPresent / attTotal) * 100) : 100;

    const hwTotal = hwList.length;
    const hwSubmitted = hwList.filter(r => r.status === 'submitted' || r.status === 'reviewed').length;

    const quizTotal = quizList.length;
    const quizAvgScore = quizTotal > 0 ? Math.round(quizList.reduce((sum, q) => sum + q.score, 0) / quizTotal) : 0;
    const quizRating = quizAvgScore >= 90 ? 'ممتاز 🌟' : quizAvgScore >= 80 ? 'جيد جداً ✅' : quizAvgScore >= 65 ? 'جيد 👍' : 'يحتاج متابعة ⚠️';

    // Attendance rows: ALL rows without artificial slice
    const attRows = attList.map((r, i) => `
      <tr style="border-bottom:1px solid #e2e8f0; ${i % 2 === 1 ? 'background:#f8fafc;' : ''}">
        <td style="padding:6px 8px;text-align:center;font-weight:900;color:#475569;">${i + 1}</td>
        <td style="padding:6px 8px;font-weight:bold;">${formatArabicDate(r.date)}</td>
        <td style="padding:6px 8px;text-align:center;"><span style="color:${getStatusColor(r.status)};font-weight:bold;">${getStatusLabel(r.status)}</span></td>
        <td style="padding:6px 8px;text-align:center;font-weight:bold;color:#06392c;">${r.score !== undefined ? r.score + '%' : '—'}</td>
        <td style="padding:6px 8px;font-size:11px;color:#64748b;">${r.note || '—'}</td>
      </tr>
    `).join('');

    // Homework rows: ALL rows without artificial slice
    const hwRows = hwList.map((h, i) => `
      <tr style="border-bottom:1px solid #e2e8f0; ${i % 2 === 1 ? 'background:#f8fafc;' : ''}">
        <td style="padding:6px 8px;text-align:center;font-weight:900;color:#475569;">${i + 1}</td>
        <td style="padding:6px 8px;font-weight:bold;">${h.title}</td>
        <td style="padding:6px 8px;color:#475569;">${h.subject}</td>
        <td style="padding:6px 8px;text-align:center;font-weight:bold;">${h.status === 'submitted' || h.status === 'reviewed' ? 'سُلِّم ✓' : 'متبقي'}</td>
        <td style="padding:6px 8px;text-align:center;font-weight:bold;color:#0b4d3c;">${h.grade !== undefined ? h.grade + '/10' : '—'}</td>
        <td style="padding:6px 8px;font-size:11px;color:#64748b;">${h.feedback || '—'}</td>
      </tr>
    `).join('');

    // Quiz rows: ALL rows without artificial slice
    const quizRows = quizList.map((q, i) => `
      <tr style="border-bottom:1px solid #e2e8f0; ${i % 2 === 1 ? 'background:#f8fafc;' : ''}">
        <td style="padding:6px 8px;text-align:center;font-weight:900;color:#475569;">${i + 1}</td>
        <td style="padding:6px 8px;font-weight:bold;">${q.quizTitle}</td>
        <td style="padding:6px 8px;color:#475569;">${q.subject}</td>
        <td style="padding:6px 8px;text-align:center;font-weight:bold;color:#0b4d3c;">${q.score}%</td>
        <td style="padding:6px 8px;font-size:11px;color:#64748b;">${q.note || '—'}</td>
      </tr>
    `).join('');

    const html = `<!doctype html><html lang="ar" dir="rtl"><head>
      <meta charset="utf-8"/>
      <title>الملف الأكاديمي الشامل — ${selectedStudent.fullName}</title>
      <style>
        @page { size: A4; margin: 14mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'Cairo', 'Segoe UI', Arial, sans-serif; }
        body { margin: 0; background: #fff; color: #1e293b; font-size: 11px; }
        .header { display:flex; align-items:center; justify-content:space-between; padding:14px 18px; border-bottom:3px solid #06392c; background:linear-gradient(135deg,#06392c 0%,#0b4d3c 100%); border-radius:10px; color:#fff; }
        .doc-title { margin-top:12px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:12px 16px; display:flex; align-items:center; justify-content:space-between; }
        .section-header { margin-top:16px; display:flex; align-items:center; justify-content:space-between; background:#e2e8f0; padding:6px 12px; border-radius:6px; font-weight:900; color:#06392c; font-size:13px; }
        table { width:100%; border-collapse:collapse; margin-top:6px; }
        thead tr { background:#0b4d3c; color:#fff; }
        thead th { padding:6px 8px; text-align:right; font-size:11px; }
        .footer { margin-top:24px; display:flex; align-items:flex-end; justify-content:space-between; padding-top:14px; border-top:2px dashed #cbd5e1; }
        .sig-block { text-align:center; }
        .stamp { width:80px; height:80px; border-radius:50%; border:3px double #06392c; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:6px; font-size:8px; font-weight:900; color:#06392c; }
      </style>
    </head><body>
      <div class="header">
        <div><h1 style="margin:0;font-size:17px;">منصة مَسَار للتأهيل والتعليم الذكي</h1><p style="margin:2px 0 0;font-size:11px;opacity:0.9;">فصل الإخلاص — جدة | إشراف: د. إسماعيل عيسى</p></div>
        <div style="text-align:left;font-size:10px;line-height:1.6;"><div>الفترة المحددة: ${currentDurationLabel}</div><div>تاريخ الإصدار: ${new Date().toLocaleDateString('ar-EG')}</div></div>
      </div>
      <div class="doc-title">
        <div><h2 style="margin:0;font-size:16px;color:#06392c;">📄 الملف والسجل الأكاديمي الشامل للطالب</h2><p style="margin:3px 0 0;font-weight:bold;color:#64748b;">اسم الطالب: <strong>${selectedStudent.fullName}</strong> — ${selectedStudent.grade}</p></div>
        <div style="display:flex;gap:6px;">
          <span style="background:#d1fae5;color:#065f46;padding:3px 8px;border-radius:999px;font-weight:900;">حضور: ${attRate}%</span>
          <span style="background:#dbeafe;color:#1e40af;padding:3px 8px;border-radius:999px;font-weight:900;">واجبات: ${hwSubmitted}/${hwTotal}</span>
          <span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:999px;font-weight:900;">كويزات: ${quizAvgScore}%</span>
        </div>
      </div>

      <!-- 1. Attendance -->
      <div class="section-header"><span>1. سجل الحضور والغياب والانضباط</span><span>نسبة الحضور: ${attRate}% (حاضر ${attPresent} من ${attTotal})</span></div>
      <table><thead><tr><th style="width:30px">#</th><th>التاريخ</th><th style="width:90px;text-align:center;">الحالة</th><th style="width:70px;text-align:center;">الدرجة</th><th>الملاحظة</th></tr></thead><tbody>${attRows || '<tr><td colspan="5" style="text-align:center;padding:10px;">لا توجد سجلات</td></tr>'}</tbody></table>

      <!-- 2. Homework -->
      <div class="section-header"><span>2. سجل الواجبات والتكاليف الدراسية</span><span>إنجاز الواجبات: ${hwSubmitted} من ${hwTotal}</span></div>
      <table><thead><tr><th style="width:30px">#</th><th>عنوان الواجب</th><th style="width:100px">المادة</th><th style="width:80px;text-align:center;">الحالة</th><th style="width:70px;text-align:center;">الدرجة</th><th>ملاحظة المعلم</th></tr></thead><tbody>${hwRows || '<tr><td colspan="5" style="text-align:center;padding:10px;">لا توجد سجلات</td></tr>'}</tbody></table>

      <!-- 3. Quizzes -->
      <div class="section-header"><span>3. سجل الكويزات والاختبارات التفاعلية</span><span>متوسط الدرجات: ${quizAvgScore}% — ${quizRating}</span></div>
      <table><thead><tr><th style="width:30px">#</th><th>اسم الكويز</th><th style="width:100px">المادة</th><th style="width:80px;text-align:center;">الدرجة</th><th>ملاحظات الأداء</th></tr></thead><tbody>${quizRows || '<tr><td colspan="4" style="text-align:center;padding:10px;">لا توجد سجلات</td></tr>'}</tbody></table>

      <div class="footer">
        <div class="sig-block"><div style="width:140px;height:1px;background:#06392c;margin:24px auto 0;"></div><div style="font-weight:900;color:#06392c;margin-top:6px;">د. إسماعيل عيسى</div><div style="font-size:10px;color:#64748b;">المشرف الأكاديمي والمعلم المختص</div></div>
        <div class="stamp"><p>منصة مَسَار</p><p>التعليم الذكي</p><p style="font-size:7px;">✓ معتمد رسمياً</p></div>
      </div>
      <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});</script>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  /* ─────────────────────── CLASS-WIDE SNAPSHOT PRINT HELPERS ─────────────────────── */
  const printAttendanceSnapshot = (snap: DailyAttendanceSnapshot) => {
    const rows = snap.entries.map((e, i) => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:8px 12px;text-align:center;font-weight:900;color:#475569;">${i + 1}</td>
        <td style="padding:8px 12px;font-weight:bold;color:#1e293b;">${e.studentName}</td>
        <td style="padding:8px 12px;text-align:center;">
          <span style="background:${getStatusColor(e.status)}22;color:${getStatusColor(e.status)};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;border:1px solid ${getStatusColor(e.status)}55;">
            ${getStatusLabel(e.status)}
          </span>
        </td>
        <td style="padding:8px 12px;text-align:center;font-weight:bold;color:#475569;">${e.score !== undefined ? e.score + '%' : '—'}</td>
        <td style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;">${e.note ?? '—'}</td>
      </tr>
    `).join('');

    const html = `<!doctype html><html lang="ar" dir="rtl"><head>
      <meta charset="utf-8"/><title>سجل الحضور والغياب — ${formatArabicDate(snap.date)}</title>
      <style>
        @page { size: A4; margin: 18mm 14mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'Cairo', 'Segoe UI', Arial, sans-serif; }
        body { margin: 0; background: #fff; color: #1e293b; }
        .header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:3px solid #06392c; background:linear-gradient(135deg,#06392c 0%,#0b4d3c 100%); border-radius:12px 12px 0 0; color:#fff; }
        .doc-title { background:#f8fafc; border:1px solid #e2e8f0; border-top:none; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; }
        table { width:100%; border-collapse:collapse; margin-top:0; }
        thead tr { background:#06392c; color:#fff; }
        thead th { padding:10px 12px; font-size:12px; font-weight:900; text-align:right; }
        .footer { margin-top:24px; display:flex; align-items:flex-end; justify-content:space-between; padding-top:16px; border-top:2px dashed #cbd5e1; }
        .sig-block { text-align:center; }
        .stamp { width:90px; height:90px; border-radius:50%; border:3px double #06392c; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:8px; font-size:9px; font-weight:900; color:#06392c; }
      </style>
    </head><body>
      <div class="header">
        <div><h1 style="margin:0;font-size:18px;">منصة مَسَار للتأهيل والتعليم الذكي</h1><p style="margin:2px 0 0;font-size:12px;opacity:0.9;">فصل الإخلاص — جدة | إشراف: د. إسماعيل عيسى</p></div>
        <div style="text-align:left;font-size:11px;"><div>التاريخ: ${formatArabicDate(snap.date)}</div><div>الحصة: ${snap.sessionStart} — ${snap.sessionEnd}</div></div>
      </div>
      <div class="doc-title">
        <h2 style="margin:0;font-size:18px;color:#06392c;">📋 سجل الحضور والغياب اليومي الرسمي</h2>
        <div style="display:flex;gap:8px;">
          <span style="background:#dbeafe;color:#1e40af;padding:4px 12px;border-radius:999px;font-weight:900;font-size:12px;">إجمالي: ${snap.entries.length} طالب</span>
          <span style="background:#d1fae5;color:#065f46;padding:4px 12px;border-radius:999px;font-weight:900;font-size:12px;">حاضر: ${snap.totalPresent}</span>
          <span style="background:#fee2e2;color:#991b1b;padding:4px 12px;border-radius:999px;font-weight:900;font-size:12px;">غياب: ${snap.totalAbsent}</span>
          <span style="background:#d1fae5;color:#065f46;padding:4px 12px;border-radius:999px;font-weight:900;font-size:12px;">نسبة الحضور: ${snap.presentRate}%</span>
        </div>
      </div>
      <table>
        <thead><tr><th style="width:40px">#</th><th>اسم الطالب</th><th style="width:120px;text-align:center;">الحالة</th><th style="width:80px;text-align:center;">الدرجة</th><th>ملاحظة</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">
        <div class="sig-block"><div style="width:160px;height:1px;background:#06392c;margin:28px auto 0;"></div><div style="font-weight:900;color:#06392c;margin-top:8px;">د. إسماعيل عيسى</div><div style="font-size:11px;color:#64748b;">المشرف الأكاديمي</div></div>
        <div class="stamp"><p>منصة مَسَار</p><p>التعليم الذكي</p><p style="font-size:8px;">✓ معتمد رسمياً</p></div>
      </div>
      <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});</script>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const printHomeworkSnapshot = (snap: DailyHomeworkSnapshot) => {
    const rows = snap.submissions.map((s, i) => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:8px 12px;text-align:center;font-weight:900;color:#475569;">${i + 1}</td>
        <td style="padding:8px 12px;font-weight:bold;color:#1e293b;">${s.studentName}</td>
        <td style="padding:8px 12px;text-align:center;">
          <span style="background:${s.status==='submitted'?'#d1fae5':s.status==='late'?'#fef3c7':'#fee2e2'};color:${s.status==='submitted'?'#065f46':s.status==='late'?'#92400e':'#991b1b'};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;">
            ${s.status==='submitted'?'سُلِّم ✓':s.status==='late'?'تأخر':'لم يُسلَّم ✗'}
          </span>
        </td>
        <td style="padding:8px 12px;text-align:center;font-weight:900;color:#0b4d3c;">${s.grade !== undefined ? s.grade + ' / 10' : '—'}</td>
        <td style="padding:8px 12px;font-size:11px;color:#64748b;">${s.feedback ?? '—'}</td>
      </tr>
    `).join('');

    const html = `<!doctype html><html lang="ar" dir="rtl"><head>
      <meta charset="utf-8"/><title>سجل الواجبات — ${snap.homeworkTitle}</title>
      <style>
        @page { size: A4; margin: 18mm 14mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'Cairo', 'Segoe UI', Arial, sans-serif; }
        body { margin: 0; background: #fff; color: #1e293b; }
        .header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:3px solid #0b4d3c; background:linear-gradient(135deg,#0b4d3c,#1a6b52); border-radius:12px 12px 0 0; color:#fff; }
        .doc-title { background:#f8fafc; border:1px solid #e2e8f0; border-top:none; padding:16px 20px; }
        table { width:100%; border-collapse:collapse; margin-top:12px; }
        thead tr { background:#0b4d3c; color:#fff; }
        thead th { padding:10px 12px; font-size:12px; font-weight:900; text-align:right; }
        .footer { margin-top:24px; display:flex; align-items:flex-end; justify-content:space-between; padding-top:16px; border-top:2px dashed #cbd5e1; }
        .sig-block { text-align:center; }
        .stamp { width:90px; height:90px; border-radius:50%; border:3px double #06392c; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:8px; font-size:9px; font-weight:900; color:#06392c; }
      </style>
    </head><body>
      <div class="header">
        <div><h1 style="margin:0;font-size:18px;">منصة مَسَار للتأهيل والتعليم الذكي</h1><p style="margin:2px 0 0;font-size:12px;opacity:0.9;">فصل الإخلاص — جدة | إشراف: د. إسماعيل عيسى</p></div>
        <div style="text-align:left;font-size:11px;"><div>التاريخ: ${formatArabicDate(snap.date)}</div></div>
      </div>
      <div class="doc-title">
        <h2 style="margin:0 0 8px;font-size:18px;color:#0b4d3c;">📝 سجل تسليمات الواجب: ${snap.homeworkTitle}</h2>
        <div style="display:flex;gap:8px;">
          <span style="background:#f3e8ff;color:#6b21a8;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;">المادة: ${snap.subject}</span>
          <span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;">سُلِّم: ${snap.totalSubmitted}/${snap.totalStudents}</span>
          ${snap.avgGrade !== undefined ? `<span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;">متوسط: ${snap.avgGrade}/10</span>` : ''}
        </div>
      </div>
      <table>
        <thead><tr><th style="width:40px">#</th><th>اسم الطالب</th><th style="width:120px;text-align:center;">حالة التسليم</th><th style="width:90px;text-align:center;">الدرجة</th><th>ملاحظات المعلم</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">
        <div class="sig-block"><div style="width:160px;height:1px;background:#06392c;margin:28px auto 0;"></div><div style="font-weight:900;color:#06392c;margin-top:8px;">د. إسماعيل عيسى</div><div style="font-size:11px;color:#64748b;">المشرف الأكاديمي</div></div>
        <div class="stamp"><p>منصة مَسَار</p><p>التعليم الذكي</p><p style="font-size:8px;">✓ معتمد رسمياً</p></div>
      </div>
      <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});</script>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const printQuizSnapshot = (snap: DailyQuizSnapshot) => {
    const rows = snap.results.map((r, i) => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:8px 12px;text-align:center;font-weight:900;color:#475569;">${i + 1}</td>
        <td style="padding:8px 12px;font-weight:bold;color:#1e293b;">${r.studentName}</td>
        <td style="padding:8px 12px;text-align:center;">
          <span style="background:${r.score>=80?'#d1fae5':r.score>=60?'#fef3c7':'#fee2e2'};color:${r.score>=80?'#065f46':r.score>=60?'#92400e':'#991b1b'};padding:3px 12px;border-radius:999px;font-size:13px;font-weight:900;">
            ${r.score}%
          </span>
        </td>
        <td style="padding:8px 12px;text-align:center;font-size:12px;color:#64748b;">${r.score>=90?'ممتاز 🌟':r.score>=80?'جيد جداً':r.score>=60?'جيد':'يحتاج متابعة'}</td>
      </tr>
    `).join('');

    const html = `<!doctype html><html lang="ar" dir="rtl"><head>
      <meta charset="utf-8"/><title>نتائج الكويز — ${snap.quizTitle}</title>
      <style>
        @page { size: A4; margin: 18mm 14mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'Cairo', 'Segoe UI', Arial, sans-serif; }
        body { margin: 0; background: #fff; color: #1e293b; }
        .header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:3px solid #1e40af; background:linear-gradient(135deg,#1e3a8a,#1e40af); border-radius:12px 12px 0 0; color:#fff; }
        .doc-title { background:#f8fafc; border:1px solid #e2e8f0; border-top:none; padding:16px 20px; }
        table { width:100%; border-collapse:collapse; margin-top:12px; }
        thead tr { background:#1e40af; color:#fff; }
        thead th { padding:10px 12px; font-size:12px; font-weight:900; text-align:right; }
        .footer { margin-top:24px; display:flex; align-items:flex-end; justify-content:space-between; padding-top:16px; border-top:2px dashed #cbd5e1; }
        .sig-block { text-align:center; }
        .stamp { width:90px; height:90px; border-radius:50%; border:3px double #1e40af; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:8px; font-size:9px; font-weight:900; color:#1e40af; }
      </style>
    </head><body>
      <div class="header">
        <div><h1 style="margin:0;font-size:18px;">منصة مَسَار للتأهيل والتعليم الذكي</h1><p style="margin:2px 0 0;font-size:12px;opacity:0.9;">فصل الإخلاص — جدة | إشراف: د. إسماعيل عيسى</p></div>
        <div style="text-align:left;font-size:11px;"><div>التاريخ: ${formatArabicDate(snap.date)}</div></div>
      </div>
      <div class="doc-title">
        <h2 style="margin:0 0 8px;font-size:18px;color:#1e40af;">🧠 نتائج الكويز: ${snap.quizTitle}</h2>
        <div style="display:flex;gap:8px;">
          <span style="background:#f3e8ff;color:#6b21a8;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;">المادة: ${snap.subject}</span>
          <span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;">متوسط: ${snap.avgScore}%</span>
          <span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;">أعلى: ${snap.highScore}% | أدنى: ${snap.lowScore}%</span>
        </div>
      </div>
      <table>
        <thead><tr><th style="width:40px">#</th><th>اسم الطالب</th><th style="width:100px;text-align:center;">الدرجة</th><th style="width:140px;text-align:center;">التقدير</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">
        <div class="sig-block"><div style="width:160px;height:1px;background:#1e40af;margin:28px auto 0;"></div><div style="font-weight:900;color:#1e40af;margin-top:8px;">د. إسماعيل عيسى</div><div style="font-size:11px;color:#64748b;">المشرف الأكاديمي</div></div>
        <div class="stamp"><p>منصة مَسَار</p><p>التعليم الذكي</p><p style="font-size:8px;">✓ معتمد رسمياً</p></div>
      </div>
      <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});</script>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  /* ─────────────────────── RENDER ─────────────────────── */
  return (
    <div className="space-y-6 text-slate-900 animate-fade-in" dir="rtl">

      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl border border-slate-700">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Archive className="h-6 w-6 text-amber-400" />
              <span className="font-black text-slate-300 text-sm">منصة مَسَار · الأرشيف والسجلات الرسمية المعتمدة</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              📂 الأرشيف والسجلات الأكاديمية الشاملة
            </h2>
            <p className="mt-1.5 text-sm font-semibold text-slate-300">
              فولدر مخصص ومستقل لكل طالب يضم سجلات الحضور والغياب، الواجبات، والكويزات — مع إمكانية تحديد المدة وطباعة التقارير الرسمية المعتمدة بختم وتوقيع د. إسماعيل عيسى.
            </p>
          </div>

          {/* KPI Indicators */}
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20 shrink-0">
            <div className="text-center px-3">
              <div className="text-2xl font-black text-amber-300 font-mono">{studentsList.length}</div>
              <div className="text-[11px] font-bold text-slate-300">طالب مسجّل</div>
            </div>
            <div className="h-8 w-[1px] bg-white/20" />
            <div className="text-center px-3">
              <div className="text-2xl font-black text-amber-300 font-mono">{attSnapshots.length}</div>
              <div className="text-[11px] font-bold text-slate-300">يوم حضور</div>
            </div>
            <div className="h-8 w-[1px] bg-white/20" />
            <div className="text-center px-3">
              <div className="text-2xl font-black text-amber-300 font-mono">{hwSnapshots.length}</div>
              <div className="text-[11px] font-bold text-slate-300">سجل واجب</div>
            </div>
            <div className="h-8 w-[1px] bg-white/20" />
            <div className="text-center px-3">
              <div className="text-2xl font-black text-amber-300 font-mono">{quizSnapshots.length}</div>
              <div className="text-[11px] font-bold text-slate-300">كويز</div>
            </div>
          </div>
        </div>

        {/* Primary View Mode Switcher */}
        <div className="mt-6 flex items-center justify-between flex-wrap gap-3 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm p-1.5 rounded-2xl border border-white/15">
            <button
              type="button"
              onClick={() => { setViewMode('dossiers'); setSelectedStudent(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                viewMode === 'dossiers'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <FolderOpen size={16} />
              ملفات وفولدرات الطلاب ({studentsList.length})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('daily_archive')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                viewMode === 'daily_archive'
                  ? 'bg-amber-400 text-slate-950 shadow-md'
                  : 'text-white hover:bg-white/10'
              }`}
            >
              <Calendar size={16} />
              أرشيف الفصل اليومي العام
            </button>
          </div>

          {selectedStudent && viewMode === 'dossiers' && (
            <button
              type="button"
              onClick={() => setSelectedStudent(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 text-white hover:bg-white/20 text-xs font-black transition cursor-pointer"
            >
              <ArrowRight size={14} />
              العودة لكافة ملفات الطلاب
            </button>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          MODE 1: STUDENT DOSSIERS & INDIVIDUAL FOLDERS
      ══════════════════════════════════════════════════════════ */}
      {viewMode === 'dossiers' && (
        <>
          {/* Subview A: Student Directory / Folders Grid */}
          {!selectedStudent ? (
            <div className="space-y-4">
              {/* Search Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
                <div className="relative flex-1 w-full">
                  <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={studentSearchQuery}
                    onChange={e => setStudentSearchQuery(e.target.value)}
                    placeholder="ابحث عن ملف الطالب بالاسم أو رقم هاتف ولي الأمر..."
                    className="w-full pr-10 pl-4 py-2 text-sm font-bold text-slate-800 bg-slate-50 rounded-xl border border-slate-200 outline-none focus:border-amber-500 focus:bg-white transition"
                  />
                  {studentSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setStudentSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="text-xs font-black text-slate-500 shrink-0">
                  عرض <span className="text-slate-900 font-mono font-black">{filteredStudents.length}</span> من أصل <span className="text-slate-900 font-mono font-black">{studentsList.length}</span> طالب
                </div>
              </div>

              {/* Folders Grid */}
              {filteredStudents.length === 0 ? (
                <EmptyState
                  icon="📁"
                  title="لم يتم العثور على أي ملف طالب"
                  desc="جرّب كتابة جزء آخر من اسم الطالب أو مسح نص البحث لعرض كافة طلاب الفصل."
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredStudents.map((student) => {
                    const stats = studentQuickStats.get(student.id) || { attRate: 98, hwSubmitted: 0, hwTotal: 0, quizAvg: 90 };
                    return (
                      <div
                        key={student.id}
                        onClick={() => setSelectedStudent(student)}
                        className="group relative rounded-3xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-lg hover:border-amber-400/80 transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          {/* Folder Top Tab Badge */}
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-9 h-9 rounded-2xl bg-amber-50 group-hover:bg-amber-100 text-amber-700 flex items-center justify-center transition">
                                <Folder size={20} className="fill-amber-400/40 text-amber-600" />
                              </div>
                              <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                                ملف طالب معتمد
                              </span>
                            </div>
                            <span className="text-[11px] font-bold text-slate-400 font-mono">
                              ID: {student.id.slice(0, 8)}
                            </span>
                          </div>

                          {/* Student Info */}
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-white flex items-center justify-center font-black text-lg shadow-sm shrink-0">
                              {student.fullName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <h3 className="font-black text-base text-slate-900 group-hover:text-amber-700 transition truncate">
                                {student.fullName}
                              </h3>
                              <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                                {student.grade}
                              </p>
                              {student.parentPhone && (
                                <p className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mt-1">
                                  <Phone size={11} /> {student.parentPhone}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Quick KPIs */}
                          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                            <div className="bg-slate-50 rounded-xl p-2">
                              <div className="text-[10px] font-bold text-slate-500">الحضور</div>
                              <div className="text-xs font-black text-emerald-700 font-mono mt-0.5">{stats.attRate}%</div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-2">
                              <div className="text-[10px] font-bold text-slate-500">الواجبات</div>
                              <div className="text-xs font-black text-blue-700 font-mono mt-0.5">{stats.hwSubmitted} مسلّم</div>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-2">
                              <div className="text-[10px] font-bold text-slate-500">الكويزات</div>
                              <div className="text-xs font-black text-purple-700 font-mono mt-0.5">{stats.quizAvg}%</div>
                            </div>
                          </div>
                        </div>

                        {/* Action Footer */}
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs font-black text-amber-600 group-hover:text-amber-700 flex items-center gap-1">
                            فتح فولدر الطالب وسجلاته <ArrowRight size={14} className="rotate-180" />
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            سجل رسمي
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Subview B: Detailed Student Dossier */
            <div className="space-y-6">

              {/* Student Header Card */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                      {selectedStudent.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl md:text-2xl font-black text-slate-950">
                          {selectedStudent.fullName}
                        </h2>
                        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                          طالب منتظم
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-500 mt-1">
                        {selectedStudent.grade} &nbsp;·&nbsp; فصل د. إسماعيل عيسى &nbsp;·&nbsp; {selectedStudent.parentPhone ? 'هاتف ولي الأمر: ' + selectedStudent.parentPhone : 'فرع الإخلاص بجدة'}
                      </p>
                    </div>
                  </div>

                  {/* Print Buttons: All Records OR Filtered Period */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Option 1: Print FULL file without date filtering */}
                    <button
                      type="button"
                      onClick={() => printStudentComprehensiveReport(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-black shadow-md transition cursor-pointer border border-amber-400/20"
                      title="طباعة جميع سجلات الطالب من بداية العام وحتى اليوم دون أي اقتطاع"
                    >
                      <FileText size={15} className="text-amber-400" />
                      طباعة كامل السجل (بدون تحديد تاريخ) 🖨️
                    </button>

                    {/* Option 2: Print filtered period */}
                    <button
                      type="button"
                      onClick={() => printStudentComprehensiveReport(false)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-md transition cursor-pointer"
                      title="طباعة السجل للفترة المحددة بالأسفل"
                    >
                      <Printer size={15} />
                      طباعة تقرير الفترة المحددة ({durationPreset === 'all' ? 'كامل السجل' : durationPreset === 'custom' ? 'فترة مخصصة' : currentDurationLabel})
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedStudent(null)}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black transition cursor-pointer"
                    >
                      <ArrowRight size={14} />
                      رجوع
                    </button>
                  </div>
                </div>

                {/* ── Duration / Period Filter Bar ── */}
                <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-800">
                      <Filter size={15} className="text-amber-500" />
                      <span>تحديد مدة وفترة التقارير والطباعة:</span>
                      <span className="text-[11px] font-bold text-slate-500">(اختر كامل السجل أو حدد تاريخ من كذا لكذا)</span>
                    </div>
                    <div className="text-xs font-bold text-slate-500">
                      الفترة الحالية: <span className="font-black text-emerald-800 font-mono bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">{currentDurationLabel}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Primary Button: All Records */}
                    <button
                      type="button"
                      onClick={() => setDurationPreset('all')}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                        durationPreset === 'all'
                          ? 'bg-slate-900 text-amber-300 shadow-sm border border-slate-800'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>📁</span>
                      <span>كامل السجل (بدون تحديد تاريخ)</span>
                    </button>

                    {/* Custom Date Range Selector Button */}
                    <button
                      type="button"
                      onClick={() => setDurationPreset('custom')}
                      className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1.5 ${
                        durationPreset === 'custom'
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>📅</span>
                      <span>تحديد تاريخ مخصص (من كذا لكذا)</span>
                    </button>

                    {/* Quick presets */}
                    {[
                      { key: 'today' as DurationPreset, label: 'اليوم' },
                      { key: 'week' as DurationPreset, label: 'هذا الأسبوع (7 أيام)' },
                      { key: 'month' as DurationPreset, label: 'هذا الشهر (30 يوماً)' },
                    ].map(p => (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => setDurationPreset(p.key)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                          durationPreset === p.key
                            ? 'bg-emerald-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Prominent Custom Date Range Box */}
                  {durationPreset === 'custom' && (
                    <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in mt-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                          <Calendar size={15} className="text-emerald-700" />
                          حدد تاريخ بداية ونهاية التقرير:
                        </span>

                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-emerald-300 shadow-2xs">
                          <span className="text-xs font-black text-slate-600">من تاريخ:</span>
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={e => setCustomStartDate(e.target.value)}
                            className="text-xs font-black text-slate-900 bg-transparent outline-none cursor-pointer"
                          />
                        </div>

                        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-emerald-300 shadow-2xs">
                          <span className="text-xs font-black text-slate-600">إلى تاريخ:</span>
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={e => setCustomEndDate(e.target.value)}
                            className="text-xs font-black text-slate-900 bg-transparent outline-none cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {(customStartDate || customEndDate) && (
                          <button
                            type="button"
                            onClick={() => { setCustomStartDate(''); setCustomEndDate(''); }}
                            className="text-xs font-black text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition cursor-pointer"
                          >
                            مسح التاريخ
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setDurationPreset('all')}
                          className="text-xs font-black text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-300 transition cursor-pointer"
                        >
                          إلغاء التحديد وعرض كامل السجل
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── 3 Tabs Inside Student Dossier ── */}
                <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-4 flex-wrap">
                  {[
                    { key: 'attendance' as ArchiveSection, label: 'سجلات الحضور والغياب', icon: Users, count: activeStudentAttendance.length },
                    { key: 'homework'   as ArchiveSection, label: 'سجلات الواجبات والتكاليف', icon: BookOpen, count: activeStudentHomework.length },
                    { key: 'quizzes'   as ArchiveSection, label: 'سجلات الكويزات والاختبارات', icon: Brain, count: activeStudentQuizzes.length },
                  ].map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setStudentTab(tab.key)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer ${
                          studentTab === tab.key
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Icon size={15} />
                        {tab.label}
                        <span className="font-mono text-[11px] opacity-80">({tab.count})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ────────────────── SECTION 1: ATTENDANCE DOSSIER ────────────────── */}
              {studentTab === 'attendance' && (
                <div className="space-y-4">
                  {/* KPI Cards & Print Action */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <div className="text-xs font-bold text-slate-500">إجمالي الأيام</div>
                      <div className="text-2xl font-black text-slate-900 font-mono mt-1">{attendanceStats.total}</div>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
                      <div className="text-xs font-bold text-emerald-800">أيام الحضور</div>
                      <div className="text-2xl font-black text-emerald-700 font-mono mt-1">{attendanceStats.present}</div>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs">
                      <div className="text-xs font-bold text-rose-800">أيام الغياب</div>
                      <div className="text-2xl font-black text-rose-700 font-mono mt-1">{attendanceStats.absent}</div>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
                      <div className="text-xs font-bold text-amber-800">مرات التأخير</div>
                      <div className="text-2xl font-black text-amber-700 font-mono mt-1">{attendanceStats.late}</div>
                    </div>
                    <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs col-span-2 sm:col-span-1">
                      <div className="text-xs font-bold text-blue-800">نسبة الحضور</div>
                      <div className="text-2xl font-black text-blue-700 font-mono mt-1">{attendanceStats.rate}%</div>
                    </div>
                  </div>

                  {/* Table & Print Header */}
                  <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 bg-slate-50/50">
                      <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                        <Users size={16} className="text-emerald-600" />
                        سجل الحضور والغياب والانضباط اليومي للطالب ({currentDurationLabel})
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => printStudentAttendanceReport(true)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-black shadow-xs transition cursor-pointer border border-amber-400/20"
                          title="طباعة كامل سجل الحضور لجميع الأيام بلا استثناء"
                        >
                          <Printer size={14} className="text-amber-400" />
                          طباعة كامل الحضور (كل الأيام)
                        </button>
                        <button
                          type="button"
                          onClick={() => printStudentAttendanceReport(false)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black shadow-xs transition cursor-pointer"
                        >
                          <Printer size={14} />
                          طباعة تقرير الحضور للفترة المحددة
                        </button>
                      </div>
                    </div>

                    {activeStudentAttendance.length === 0 ? (
                      <EmptyState
                        icon="📋"
                        title="لا توجد سجلات حضور خلال الفترة المحددة"
                        desc="تأكد من اختيار فترة زمنية تحتوي على سجلات أو اختر 'كامل السجل' لعرض أرشيف الطالب كاملاً."
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs font-bold">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                              <th className="py-3 px-4 text-center font-black" style={{ width: '40px' }}>#</th>
                              <th className="py-3 px-4 text-right font-black">التاريخ واليوم</th>
                              <th className="py-3 px-4 text-center font-black">وقت الحصة</th>
                              <th className="py-3 px-4 text-center font-black">الحالة</th>
                              <th className="py-3 px-4 text-center font-black">درجة الانضباط</th>
                              <th className="py-3 px-4 text-center font-black">وقت الانصراف</th>
                              <th className="py-3 px-4 text-right font-black">ملاحظة المشرف</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeStudentAttendance.map((rec, i) => (
                              <tr key={rec.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition">
                                <td className="py-3 px-4 text-center text-slate-400 font-mono">{i + 1}</td>
                                <td className="py-3 px-4 font-black text-slate-900">
                                  {rec.dayName} — {formatArabicDate(rec.date)}
                                </td>
                                <td className="py-3 px-4 text-center text-slate-600 font-mono">
                                  {rec.sessionStart} - {rec.sessionEnd}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span
                                    className="px-2.5 py-1 rounded-full text-[11px] font-black border"
                                    style={{
                                      background: getStatusColor(rec.status) + '22',
                                      color: getStatusColor(rec.status),
                                      borderColor: getStatusColor(rec.status) + '55',
                                    }}
                                  >
                                    {getStatusLabel(rec.status)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center font-black text-emerald-700">
                                  {rec.score !== undefined ? `${rec.score}%` : '—'}
                                </td>
                                <td className="py-3 px-4 text-center text-slate-500 font-mono text-[11px]">
                                  {rec.exitTime || 'انصراف نظامي'}
                                </td>
                                <td className="py-3 px-4 text-slate-600">
                                  {rec.note || '—'}
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

              {/* ────────────────── SECTION 2: HOMEWORK DOSSIER ────────────────── */}
              {studentTab === 'homework' && (
                <div className="space-y-4">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <div className="text-xs font-bold text-slate-500">إجمالي الواجبات</div>
                      <div className="text-2xl font-black text-slate-900 font-mono mt-1">{homeworkStats.total}</div>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
                      <div className="text-xs font-bold text-emerald-800">الواجبات المسلّمة</div>
                      <div className="text-2xl font-black text-emerald-700 font-mono mt-1">{homeworkStats.submitted}</div>
                    </div>
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
                      <div className="text-xs font-bold text-amber-800">متبقية / لم تُسلَّم</div>
                      <div className="text-2xl font-black text-amber-700 font-mono mt-1">{homeworkStats.missing}</div>
                    </div>
                    <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
                      <div className="text-xs font-bold text-blue-800">متوسط الدرجات</div>
                      <div className="text-2xl font-black text-blue-700 font-mono mt-1">{homeworkStats.avgGrade} / 10</div>
                    </div>
                  </div>

                  {/* Table & Print Header */}
                  <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 bg-slate-50/50">
                      <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                        <BookOpen size={16} className="text-amber-600" />
                        سجل الواجبات والتكاليف الدراسية المعتمدة ({currentDurationLabel})
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => printStudentHomeworkReport(true)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-black shadow-xs transition cursor-pointer border border-amber-400/20"
                          title="طباعة كامل سجل الواجبات والتكاليف"
                        >
                          <Printer size={14} className="text-amber-400" />
                          طباعة كل الواجبات (كامل السجل)
                        </button>
                        <button
                          type="button"
                          onClick={() => printStudentHomeworkReport(false)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-black shadow-xs transition cursor-pointer"
                        >
                          <Printer size={14} />
                          طباعة تقرير الواجبات للفترة المحددة
                        </button>
                      </div>
                    </div>

                    {activeStudentHomework.length === 0 ? (
                      <EmptyState
                        icon="📚"
                        title="لا توجد واجبات خلال الفترة المحددة"
                        desc="تأكد من اختيار فترة زمنية تحتوي على واجبات أو اختر 'كامل السجل' لعرض أرشيف واجبات الطالب كاملاً."
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs font-bold">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                              <th className="py-3 px-4 text-center font-black" style={{ width: '40px' }}>#</th>
                              <th className="py-3 px-4 text-right font-black">عنوان الواجب</th>
                              <th className="py-3 px-4 text-right font-black">المادة</th>
                              <th className="py-3 px-4 text-center font-black">الصفحات</th>
                              <th className="py-3 px-4 text-center font-black">موعد التسليم</th>
                              <th className="py-3 px-4 text-center font-black">حالة التسليم</th>
                              <th className="py-3 px-4 text-center font-black">الدرجة</th>
                              <th className="py-3 px-4 text-right font-black">توجيهات وملاحظات المعلم</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeStudentHomework.map((hw, i) => (
                              <tr key={hw.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition">
                                <td className="py-3 px-4 text-center text-slate-400 font-mono">{i + 1}</td>
                                <td className="py-3 px-4 font-black text-slate-900">{hw.title}</td>
                                <td className="py-3 px-4 text-slate-600 font-semibold">{hw.subject}</td>
                                <td className="py-3 px-4 text-center text-slate-600">{hw.pages || '—'}</td>
                                <td className="py-3 px-4 text-center text-slate-600">
                                  {hw.dueDate ? formatArabicDate(hw.dueDate) : '—'}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                                      hw.status === 'submitted' || hw.status === 'reviewed'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : hw.status === 'late'
                                        ? 'bg-amber-100 text-amber-900'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {hw.status === 'submitted' || hw.status === 'reviewed'
                                      ? 'سُلِّم ✓'
                                      : hw.status === 'late'
                                      ? 'تأخر ⏰'
                                      : 'لم يُسلَّم ✗'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center font-black text-emerald-800 font-mono">
                                  {hw.grade !== undefined ? `${hw.grade} / 10` : 'قيد التقييم'}
                                </td>
                                <td className="py-3 px-4 text-slate-600 text-xs">
                                  {hw.feedback || '—'}
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

              {/* ────────────────── SECTION 3: QUIZZES DOSSIER ────────────────── */}
              {studentTab === 'quizzes' && (
                <div className="space-y-4">
                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                      <div className="text-xs font-bold text-slate-500">إجمالي الكويزات</div>
                      <div className="text-2xl font-black text-slate-900 font-mono mt-1">{quizStats.total}</div>
                    </div>
                    <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
                      <div className="text-xs font-bold text-blue-800">متوسط الدرجات</div>
                      <div className="text-2xl font-black text-blue-700 font-mono mt-1">{quizStats.avgScore}%</div>
                    </div>
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
                      <div className="text-xs font-bold text-emerald-800">أعلى درجة</div>
                      <div className="text-2xl font-black text-emerald-700 font-mono mt-1">{quizStats.highScore}%</div>
                    </div>
                    <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 shadow-xs">
                      <div className="text-xs font-bold text-purple-800">التقدير العام</div>
                      <div className="text-base font-black text-purple-700 mt-1">{quizStats.rating}</div>
                    </div>
                  </div>

                  {/* Table & Print Header */}
                  <div className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 bg-slate-50/50">
                      <div className="font-black text-sm text-slate-900 flex items-center gap-2">
                        <Brain size={16} className="text-blue-600" />
                        سجل نتائج الكويزات والاختبارات التفاعلية ({currentDurationLabel})
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => printStudentQuizReport(true)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-black shadow-xs transition cursor-pointer border border-amber-400/20"
                          title="طباعة كامل نتائج الكويزات والاختبارات"
                        >
                          <Printer size={14} className="text-amber-400" />
                          طباعة كل الكويزات (كامل السجل)
                        </button>
                        <button
                          type="button"
                          onClick={() => printStudentQuizReport(false)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-black shadow-xs transition cursor-pointer"
                        >
                          <Printer size={14} />
                          طباعة تقرير الكويزات للفترة المحددة
                        </button>
                      </div>
                    </div>

                    {activeStudentQuizzes.length === 0 ? (
                      <EmptyState
                        icon="🧠"
                        title="لا توجد نتائج كويزات خلال الفترة المحددة"
                        desc="تأكد من اختيار فترة زمنية تحتوي على اختبارات أو اختر 'كامل السجل' لعرض نتائج الطالب كاملة."
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs font-bold">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                              <th className="py-3 px-4 text-center font-black" style={{ width: '40px' }}>#</th>
                              <th className="py-3 px-4 text-right font-black">اسم الكويز / الاختبار</th>
                              <th className="py-3 px-4 text-right font-black">المادة</th>
                              <th className="py-3 px-4 text-center font-black">تاريخ الإجراء</th>
                              <th className="py-3 px-4 text-center font-black">الدرجة</th>
                              <th className="py-3 px-4 text-center font-black">التقدير</th>
                              <th className="py-3 px-4 text-right font-black">ملاحظات الأداء</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeStudentQuizzes.map((q, i) => (
                              <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition">
                                <td className="py-3 px-4 text-center text-slate-400 font-mono">{i + 1}</td>
                                <td className="py-3 px-4 font-black text-slate-900">{q.quizTitle}</td>
                                <td className="py-3 px-4 text-slate-600">{q.subject}</td>
                                <td className="py-3 px-4 text-center text-slate-600">
                                  {formatArabicDate(q.date)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span
                                    className={`px-2.5 py-1 rounded-full text-[11px] font-black ${
                                      q.score >= 80
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : q.score >= 60
                                        ? 'bg-amber-100 text-amber-900'
                                        : 'bg-rose-100 text-rose-800'
                                    }`}
                                  >
                                    {q.score}%
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center text-slate-700">
                                  {q.score >= 90 ? '🌟 ممتاز' : q.score >= 80 ? '✅ جيد جداً' : q.score >= 60 ? '👍 جيد' : '⚠️ يحتاج متابعة'}
                                </td>
                                <td className="py-3 px-4 text-slate-600 text-xs">
                                  {q.note || '—'}
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
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
          MODE 2: CLASS DAILY ARCHIVE SNAPSHOTS (CLASS-WIDE)
      ══════════════════════════════════════════════════════════ */}
      {viewMode === 'daily_archive' && (
        <div className="space-y-5">
          {/* Section Tabs & Date Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { key: 'attendance' as ArchiveSection, label: 'سجلات الحضور والغياب', icon: Users, count: attSnapshots.length },
                { key: 'homework'   as ArchiveSection, label: 'سجلات الواجبات', icon: BookOpen, count: hwSnapshots.length },
                { key: 'quizzes'   as ArchiveSection, label: 'سجلات الكويزات', icon: Brain, count: quizSnapshots.length },
              ].map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSection(t.key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                      section === t.key
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <Icon size={14} />
                    {t.label}
                    <span className="font-mono text-[10px] opacity-80">({t.count})</span>
                  </button>
                );
              })}
            </div>

            {/* Date Search */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={searchDate}
                onChange={e => setSearchDate(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 outline-none"
              />
              {searchDate && (
                <button
                  type="button"
                  onClick={() => setSearchDate('')}
                  className="text-xs font-black text-rose-600 hover:underline cursor-pointer shrink-0"
                >
                  مسح ✕
                </button>
              )}
            </div>
          </div>

          {/* Attendance Snapshots */}
          {section === 'attendance' && (
            <div className="space-y-3">
              {(searchDate ? attSnapshots.filter(s => s.date.includes(searchDate)) : attSnapshots).length === 0 ? (
                <EmptyState icon="📋" title="لا توجد سجلات حضور بعد" desc="سجلات الحضور تُحفظ تلقائياً عند رصد حضور الطلاب في تبويب الحضور والغياب." />
              ) : (
                (searchDate ? attSnapshots.filter(s => s.date.includes(searchDate)) : attSnapshots).map(snap => (
                  <div key={snap.id} className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden hover:shadow-sm transition">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 cursor-pointer" onClick={() => setSelectedAtt(selectedAtt?.id === snap.id ? null : snap)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-lg shrink-0">📋</div>
                        <div>
                          <div className="font-black text-slate-950 text-sm">{snap.dayName} — {formatArabicDate(snap.date)}</div>
                          <div className="text-xs font-bold text-slate-500 mt-0.5">{snap.sessionStart} — {snap.sessionEnd} &nbsp;·&nbsp; {snap.entries.length} طالب</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">حضور: {snap.totalPresent}</span>
                        <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-rose-100 text-rose-800">غياب: {snap.totalAbsent}</span>
                        <button type="button" onClick={e => { e.stopPropagation(); printAttendanceSnapshot(snap); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-black cursor-pointer transition">
                          <Printer size={13} /> طباعة
                        </button>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${selectedAtt?.id === snap.id ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    {selectedAtt?.id === snap.id && (
                      <div className="p-4">
                        <table className="w-full text-xs font-bold">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="py-2 px-3 text-slate-500 text-right font-black">#</th>
                              <th className="py-2 px-3 text-slate-500 text-right font-black">اسم الطالب</th>
                              <th className="py-2 px-3 text-slate-500 text-center font-black">الحالة</th>
                              <th className="py-2 px-3 text-slate-500 text-center font-black">الدرجة</th>
                              <th className="py-2 px-3 text-slate-500 text-right font-black">ملاحظة</th>
                            </tr>
                          </thead>
                          <tbody>
                            {snap.entries.map((e, i) => (
                              <tr key={e.studentId} className="border-b border-slate-50 hover:bg-slate-50">
                                <td className="py-2 px-3 text-slate-400 text-center">{i + 1}</td>
                                <td className="py-2 px-3 font-black text-slate-950">{e.studentName}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black border" style={{ background: getStatusColor(e.status) + '22', color: getStatusColor(e.status), borderColor: getStatusColor(e.status) + '55' }}>
                                    {getStatusLabel(e.status)}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center text-slate-700">{e.score !== undefined ? e.score + '%' : '—'}</td>
                                <td className="py-2 px-3 text-slate-500">{e.note ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Homework Snapshots */}
          {section === 'homework' && (
            <div className="space-y-3">
              {(searchDate ? hwSnapshots.filter(s => s.date.includes(searchDate)) : hwSnapshots).length === 0 ? (
                <EmptyState icon="📚" title="لا توجد سجلات واجبات بعد" desc="سجلات الواجبات تُحفظ تلقائياً عند تسليم أو تقييم واجب." />
              ) : (
                (searchDate ? hwSnapshots.filter(s => s.date.includes(searchDate)) : hwSnapshots).map(snap => (
                  <div key={snap.id} className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden hover:shadow-sm transition">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 cursor-pointer" onClick={() => setSelectedHw(selectedHw?.id === snap.id ? null : snap)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-lg shrink-0">📝</div>
                        <div>
                          <div className="font-black text-slate-950 text-sm">{snap.homeworkTitle}</div>
                          <div className="text-xs font-bold text-slate-500 mt-0.5">{snap.subject} &nbsp;·&nbsp; {formatArabicDate(snap.date)} &nbsp;·&nbsp; سُلِّم: {snap.totalSubmitted}/{snap.totalStudents}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {snap.avgGrade !== undefined && (
                          <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-900">متوسط: {snap.avgGrade}/10</span>
                        )}
                        <button type="button" onClick={e => { e.stopPropagation(); printHomeworkSnapshot(snap); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-black cursor-pointer transition">
                          <Printer size={13} /> طباعة
                        </button>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${selectedHw?.id === snap.id ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    {selectedHw?.id === snap.id && (
                      <div className="p-4">
                        <table className="w-full text-xs font-bold">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="py-2 px-3 text-slate-500 text-right font-black">#</th>
                              <th className="py-2 px-3 text-slate-500 text-right font-black">اسم الطالب</th>
                              <th className="py-2 px-3 text-slate-500 text-center font-black">التسليم</th>
                              <th className="py-2 px-3 text-slate-500 text-center font-black">الدرجة</th>
                              <th className="py-2 px-3 text-slate-500 text-right font-black">ملاحظة المعلم</th>
                            </tr>
                          </thead>
                          <tbody>
                            {snap.submissions.map((s, i) => (
                              <tr key={s.studentId} className="border-b border-slate-50 hover:bg-slate-50">
                                <td className="py-2 px-3 text-slate-400 text-center">{i + 1}</td>
                                <td className="py-2 px-3 font-black text-slate-950">{s.studentName}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${s.status === 'submitted' ? 'bg-emerald-100 text-emerald-800' : s.status === 'late' ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800'}`}>
                                    {s.status === 'submitted' ? 'سُلِّم ✓' : s.status === 'late' ? 'تأخر ⏰' : 'لم يُسلَّم ✗'}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center font-black text-emerald-800">{s.grade !== undefined ? s.grade + '/10' : '—'}</td>
                                <td className="py-2 px-3 text-slate-500 text-xs">{s.feedback ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Quiz Snapshots */}
          {section === 'quizzes' && (
            <div className="space-y-3">
              {(searchDate ? quizSnapshots.filter(s => s.date.includes(searchDate)) : quizSnapshots).length === 0 ? (
                <EmptyState icon="🧠" title="لا توجد سجلات كويزات بعد" desc="نتائج الكويزات ستُحفظ تلقائياً عند إجراء اختبار." />
              ) : (
                (searchDate ? quizSnapshots.filter(s => s.date.includes(searchDate)) : quizSnapshots).map(snap => (
                  <div key={snap.id} className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden hover:shadow-sm transition">
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 cursor-pointer" onClick={() => setSelectedQuiz(selectedQuiz?.id === snap.id ? null : snap)}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-lg shrink-0">🧠</div>
                        <div>
                          <div className="font-black text-slate-950 text-sm">{snap.quizTitle}</div>
                          <div className="text-xs font-bold text-slate-500 mt-0.5">{snap.subject} · {formatArabicDate(snap.date)} · {snap.totalStudents} طالب</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">متوسط: {snap.avgScore}%</span>
                        <button type="button" onClick={e => { e.stopPropagation(); printQuizSnapshot(snap); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-black cursor-pointer transition">
                          <Printer size={13} /> طباعة
                        </button>
                        <ChevronDown size={16} className={`text-slate-400 transition-transform ${selectedQuiz?.id === snap.id ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    {selectedQuiz?.id === snap.id && (
                      <div className="p-4">
                        <table className="w-full text-xs font-bold">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="py-2 px-3 text-slate-500 font-black">#</th>
                              <th className="py-2 px-3 text-slate-500 text-right font-black">اسم الطالب</th>
                              <th className="py-2 px-3 text-slate-500 text-center font-black">الدرجة</th>
                              <th className="py-2 px-3 text-slate-500 text-center font-black">التقدير</th>
                            </tr>
                          </thead>
                          <tbody>
                            {snap.results.sort((a, b) => b.score - a.score).map((r, i) => (
                              <tr key={r.studentId} className="border-b border-slate-50 hover:bg-slate-50">
                                <td className="py-2 px-3 text-slate-400 text-center">{i + 1}</td>
                                <td className="py-2 px-3 font-black text-slate-950">{r.studentName}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${r.score >= 80 ? 'bg-emerald-100 text-emerald-800' : r.score >= 60 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800'}`}>
                                    {r.score}%
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-center text-slate-500 text-[11px]">
                                  {r.score >= 90 ? '🌟 ممتاز' : r.score >= 80 ? '✅ جيد جداً' : r.score >= 60 ? '👍 جيد' : '⚠️ يحتاج متابعة'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3 shadow-xs">
      <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-3xl shadow-sm">
        {icon}
      </div>
      <div className="max-w-md mx-auto space-y-1">
        <h3 className="font-black text-sm md:text-base text-slate-900">{title}</h3>
        <p className="text-xs font-bold text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
