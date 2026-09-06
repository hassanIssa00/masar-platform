'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Upload,
  Trash2,
  Plus,
  Sparkles,
  Send,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  RefreshCw,
  ClipboardList,
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  ArrowLeft,
  ChevronRight,
  PenTool,
  Users,
  Search,
  ExternalLink,
  MessageCircle,
  Megaphone,
  Folder,
  FolderOpen,
  HelpCircle,
} from 'lucide-react';
import {
  CURRICULUM_SUBJECTS,
  getCurriculumFiles,
  saveCurriculumFile,
  deleteCurriculumFile,
  getAllQuizzes,
  saveQuiz,
  createQuizId,
  type CurriculumFile,
  type GeneratedQuiz,
  type QuizQuestion,
  type SubjectGrade,
} from '@/lib/curriculumDb';
import { curriculaList, CurriculumSubject, getCurriculumBySlug } from '@/data/curriculaData';
import CurriculumInteractiveWorkbook from '@/components/CurriculumInteractiveWorkbook';
import { saveMessage } from '@/lib/cloudStore';
import {
  saveStudentHomeworkLog,
  getStudentHomeworkLogs,
  getClassStudents,
  cleanClassStudentName,
  deleteAssignmentPermanently,
} from '@/lib/classDb';
import { readCloudCache, syncDocToCloud, writeCloudCache, pullCloudDataToLocal } from '@/lib/firestoreSync';
import { createNotification } from '@/lib/notifications';
import { createHomework, getLocalHomework, deleteHomework } from '@/lib/homework';
import { isStudentNameMatch } from '@/lib/nameMatching';

const ASSIGNMENTS_KEY = 'masar.curriculumAssignments.v1';

interface Student {
  id: string;
  name: string;
  phone?: string;
  grade?: string;
}

interface Props {
  students?: Student[];
  onNavigateToCorrection?: () => void;
}

const GRADE_LABELS: Record<SubjectGrade, string> = {
  grade1: 'الصف الأول الابتدائي',
  grade2: 'الصف الثاني الابتدائي',
};

export default function CurriculumManagerTab({ students = [], onNavigateToCorrection }: Props) {
  const [managerView, setManagerView] = useState<'textbooks' | 'reader' | 'assignments' | 'ai-quiz'>('textbooks');
  const [selectedBookSlug, setSelectedBookSlug] = useState<string>('lughati');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  // Quick Classroom Assignment Modal / Inline State
  const [assignStudentId, setAssignStudentId] = useState<string>(students[0]?.id || '');
  const [assignPageFrom, setAssignPageFrom] = useState<number>(1);
  const [assignPageTo, setAssignPageTo] = useState<number>(5);
  const [assignNotice, setAssignNotice] = useState('');

  // Subject Folders and Assignment Filter
  const [selectedSubjectFolder, setSelectedSubjectFolder] = useState<string>('all');
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<any | null>(null);
  const [deletingTargetId, setDeletingTargetId] = useState<string | null>(null);

  // AI Quiz Builder State (Connected to real Saudi curricula books)
  const [quizSubjectSlug, setQuizSubjectSlug] = useState<string>('lughati');
  const [quizPageFrom, setQuizPageFrom] = useState<number>(1);
  const [quizPageTo, setQuizPageTo] = useState<number>(5);
  const [quizQType, setQuizQType] = useState<'multiple_choice' | 'true_false' | 'fill_blank'>('multiple_choice');
  const [quizQCount, setQuizQCount] = useState<number>(5);
  const [quizCustomTitle, setQuizCustomTitle] = useState<string>('');
  const [quizTargetStudentId, setQuizTargetStudentId] = useState<string>('all');
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState<boolean>(false);
  const [quizGeneratedQuestions, setQuizGeneratedQuestions] = useState<any[]>([]);
  const [isSendingQuiz, setIsSendingQuiz] = useState<boolean>(false);
  const [quizSentNotice, setQuizSentNotice] = useState<string>('');

  // Legacy AI Quiz Builder State (Preserved for compatibility)
  const [activeGrade, setActiveGrade] = useState<SubjectGrade>('grade1');
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);
  const [files, setFiles] = useState<CurriculumFile[]>(() => getCurriculumFiles());
  const [quizzes, setQuizzes] = useState<GeneratedQuiz[]>(() => getAllQuizzes());
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderSubjectId, setBuilderSubjectId] = useState('');
  const [builderFileId, setBuilderFileId] = useState('');
  const [builderPageFrom, setBuilderPageFrom] = useState(1);
  const [builderPageTo, setBuilderPageTo] = useState(10);
  const [builderQType, setBuilderQType] = useState<'multiple_choice' | 'true_false' | 'fill_blank'>('multiple_choice');
  const [builderQCount, setBuilderQCount] = useState(10);
  const [builderTitle, setBuilderTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[]>([]);
  const [sendingQuiz, setSendingQuiz] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);

  const refreshAssignments = useCallback(() => {
    const rawCurr = readCloudCache<any>(ASSIGNMENTS_KEY);
    const pool = students.length > 0 ? students : getClassStudents().map(s => ({ id: s.id, name: s.fullName, phone: s.parentPhone, grade: s.grade }));
    const allLogs: any[] = [];

    pool.forEach((s) => {
      getStudentHomeworkLogs(s.id, s.name).forEach((l) => {
        if (!allLogs.some((x) => x.id === l.id)) allLogs.push(l);
      });
    });

    const cachedLogs = readCloudCache<any>('masar_student_hw_logs_v1');
    cachedLogs.forEach((l) => {
      if (!allLogs.some((x) => x.id === l.id)) allLogs.push(l);
    });

    const allHw = getLocalHomework();
    const map = new Map<string, any>();

    // 1. Add raw curriculum assignments
    rawCurr.forEach((a) => {
      const key = a.id || `${a.studentId}_${a.subjectSlug}_${a.fromPage}_${a.toPage}`;
      map.set(key, {
        ...a,
        id: a.id || key,
        type: a.type || 'CURRICULUM',
        studentName: cleanClassStudentName(a.studentName),
      });
    });

    // 2. Add/merge student homework logs (captures student submissions, review status, grades)
    allLogs.forEach((log) => {
      const isCurriculum = Boolean(
        log.subjectSlug ||
        log.fromPage ||
        log.title?.includes('واجب') ||
        log.title?.includes('كويز') ||
        log.type === 'CURRICULUM' ||
        log.type === 'QUIZ' ||
        log.title?.includes('ص ') ||
        (log.questions && log.questions.length > 0)
      );
      if (!isCurriculum) return;

      const matchedStudent = pool.find(s => s.id === log.studentId || (log.studentAccountId && s.id === log.studentAccountId) || (s.name && log.studentName && isStudentNameMatch(s.name, log.studentName)));
      const sName = cleanClassStudentName(matchedStudent?.name || log.studentName || 'طالب');

      const pageMatch = log.title?.match(/(\d+)\s*[-–]\s*(\d+)/);
      const fromP = log.fromPage || (pageMatch ? Number(pageMatch[1]) : 1);
      const toP = log.toPage || (pageMatch ? Number(pageMatch[2]) : 5);

      // Match with existing assignment or synthesize
      const existingKey = Array.from(map.keys()).find((k) => {
        const item = map.get(k);
        return item.id === log.id ||
          (item.studentId === log.studentId && (item.subjectSlug === log.subjectSlug || item.subjectTitle === log.subject));
      });

      if (existingKey) {
        const existing = map.get(existingKey);
        map.set(existingKey, {
          ...existing,
          studentName: sName,
          status: log.status || existing.status || 'assigned',
          grade: log.grade ?? existing.grade,
          teacherFeedback: log.teacherFeedback || existing.teacherFeedback,
          fromPage: existing.fromPage || fromP,
          toPage: existing.toPage || toP,
          type: log.type || existing.type || 'CURRICULUM',
          questions: log.questions || existing.questions,
          title: log.title || existing.title,
        });
      } else {
        const subSlug = log.subjectSlug || curriculaList.find(c => c.title === log.subject)?.slug || 'lughati';
        map.set(log.id, {
          id: log.id,
          studentId: log.studentId,
          studentName: sName,
          subjectSlug: subSlug,
          subjectTitle: log.subject || 'المنهج الدراسي',
          fromPage: fromP,
          toPage: toP,
          status: log.status || 'assigned',
          grade: log.grade,
          teacherFeedback: log.teacherFeedback,
          type: log.type || 'CURRICULUM',
          questions: log.questions,
          title: log.title,
          assignedAt: log.createdAt || new Date().toISOString(),
        });
      }
    });

    // 3. Merge general homework
    allHw.forEach((hw) => {
      if (
        hw.type === 'CURRICULUM' ||
        hw.type === 'QUIZ' ||
        hw.subjectSlug ||
        hw.fromPage ||
        hw.title?.includes('ص ') ||
        hw.title?.includes('كويز') ||
        (hw.questions && hw.questions.length > 0)
      ) {
        const existingKey = Array.from(map.keys()).find((k) => {
          const item = map.get(k);
          return item.id === hw.id;
        });
        if (!existingKey) {
          const pageMatch = hw.title?.match(/(\d+)\s*[-–]\s*(\d+)/);
          const fromP = (hw as any).fromPage || (pageMatch ? Number(pageMatch[1]) : 1);
          const toP = (hw as any).toPage || (pageMatch ? Number(pageMatch[2]) : 5);
          const subSlug = hw.subjectSlug || curriculaList.find(c => c.title === (hw as any).subjectTitle || c.title === hw.title)?.slug || 'lughati';
          map.set(hw.id, {
            id: hw.id,
            studentId: hw.studentId,
            studentName: cleanClassStudentName(hw.studentName),
            subjectSlug: subSlug,
            subjectTitle: (hw as any).subjectTitle || hw.title,
            fromPage: fromP,
            toPage: toP,
            status: hw.status || 'assigned',
            grade: (hw as any).grade,
            type: hw.type || 'CURRICULUM',
            questions: hw.questions,
            title: hw.title,
            assignedAt: hw.createdAt || new Date().toISOString(),
          });
        }
      }
    });

    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(b.assignedAt || 0).getTime() - new Date(a.assignedAt || 0).getTime()
    );
    setActiveAssignments(merged);
  }, [students]);

  useEffect(() => {
    refreshAssignments();
    if (students.length > 0 && !assignStudentId) {
      setAssignStudentId(students[0].id);
    }
  }, [students, assignStudentId, refreshAssignments]);

  useEffect(() => {
    const handleUpdate = () => refreshAssignments();
    window.addEventListener('masar:cloud-cache-update', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('masar:cloud-cache-update', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [refreshAssignments]);

  useEffect(() => {
    if (managerView === 'assignments') {
      refreshAssignments();
      void pullCloudDataToLocal(
        ['curriculumAssignments', 'studentHomeworkLogs', 'homework', 'curriculumDrawings'],
        true
      ).then(() => refreshAssignments()).catch(() => {});
    }
  }, [managerView, refreshAssignments]);

  const selectedCurriculum = getCurriculumBySlug(selectedBookSlug) || curriculaList[0];

  const handleOpenBook = (slug: string) => {
    setSelectedBookSlug(slug);
    setManagerView('reader');
  };

  const handleAssignToClassStudent = (curriculum: CurriculumSubject) => {
    const targetStudent = students.find((s) => s.id === assignStudentId) || students[0];
    if (!targetStudent) {
      setAssignNotice('يرجى اختيار طالب أولاً.');
      return;
    }

    const cleanFrom = Math.max(1, Math.min(assignPageFrom, curriculum.pageCount));
    const cleanTo = Math.max(cleanFrom, Math.min(assignPageTo, curriculum.pageCount));

    const newAssignment = {
      studentId: targetStudent.id,
      studentName: targetStudent.name,
      subjectSlug: curriculum.slug,
      subjectTitle: curriculum.title,
      fromPage: cleanFrom,
      toPage: cleanTo,
      assignedAt: new Date().toISOString(),
    };

    const current = readCloudCache<any>(ASSIGNMENTS_KEY);
    const updated = [newAssignment, ...current.filter((item: any) => !(item.studentId === targetStudent.id && item.subjectSlug === curriculum.slug))];
    writeCloudCache(ASSIGNMENTS_KEY, updated);
    void syncDocToCloud('curriculum_assignments', `${targetStudent.id}_${curriculum.slug}`, newAssignment);
    setActiveAssignments(updated);

    // 1. Create homework record in homework collection for student and parent
    void createHomework({
      studentId: targetStudent.id,
      studentName: targetStudent.name,
      title: `واجب ${curriculum.title} (ص ${cleanFrom}-${cleanTo})`,
      description: `حل التدريبات والأنشطة من صفحة (${cleanFrom}) إلى صفحة (${cleanTo}) في الكتاب التفاعلي لمادة ${curriculum.title}.`,
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    });

    // 2. Save homework log
    saveStudentHomeworkLog({
      studentId: targetStudent.id,
      studentName: targetStudent.name,
      title: `واجب ${curriculum.title} (ص ${cleanFrom}-${cleanTo})`,
      subject: curriculum.title,
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      status: 'assigned',
    });

    // 3. In-app Notification for parent
    void createNotification({
      type: 'homework',
      title: `📝 واجب جديد للبطل ${targetStudent.name}: ${curriculum.title}`,
      body: `تم إسناد صفحات (${cleanFrom} إلى ${cleanTo}) في مادة ${curriculum.title} من قبل د. إسماعيل عيسى. موعد التسليم: ${new Date(Date.now() + 86400000 * 3).toLocaleDateString('ar-SA')}.`,
      link: `/school-parent?student=${targetStudent.id}&tab=homework`,
      targetRole: 'parent',
      studentId: targetStudent.id,
      studentName: targetStudent.name,
    });

    // 4. In-app Notification for student
    void createNotification({
      type: 'homework',
      title: `📝 واجب تفاعلي جديد: ${curriculum.title} (ص ${cleanFrom}–${cleanTo})`,
      body: `كلفك د. إسماعيل عيسى بحل الصفحات (${cleanFrom} إلى ${cleanTo}) بالكتاب التفاعلي ✍️`,
      link: `/school-student?tab=homework`,
      targetRole: 'student',
      studentId: targetStudent.id,
      studentName: targetStudent.name,
    });

    setAssignNotice(`✅ تم إسناد الصفحات (${cleanFrom} إلى ${cleanTo}) في ${curriculum.title} للطالب (${targetStudent.name}) بنجاح!`);
    setTimeout(() => setAssignNotice(''), 5000);

    // Optional WhatsApp share
    if (targetStudent.phone) {
      const cleanPhone = targetStudent.phone.replace(/\D/g, '').replace(/^0/, '');
      const msg = `*فصل د. إسماعيل عيسى*

السلام عليكم ورحمة الله
تم إسناد واجب جديد للطالب (${targetStudent.name}):
📚 *المادة:* ${curriculum.title}
📖 *الصفحات المطلوبة:* من صفحة ${cleanFrom} إلى صفحة ${cleanTo}

يرجى فتح المنهج التفاعلي والحل بالقلم الرقمي عبر منصة مسار: https://masarplatform.org/programs/curricula/${curriculum.slug}`;
    }
  };

  const handleAssignToEntireClassTab = (curriculum: CurriculumSubject) => {
    if (!students || students.length === 0) {
      setAssignNotice('لا يوجد طلاب في الفصل حالياً.');
      return;
    }

    const cleanFrom = Math.max(1, Math.min(assignPageFrom, curriculum.pageCount));
    const cleanTo = Math.max(cleanFrom, Math.min(assignPageTo, curriculum.pageCount));
    const now = new Date().toISOString();
    const dueDateStr = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);

    const current = readCloudCache<any>(ASSIGNMENTS_KEY);
    const newItems = students.map((s) => {
      const item = {
        studentId: s.id,
        studentName: s.name,
        subjectSlug: curriculum.slug,
        subjectTitle: curriculum.title,
        fromPage: cleanFrom,
        toPage: cleanTo,
        assignedAt: now,
      };
      void syncDocToCloud('curriculum_assignments', `${s.id}_${curriculum.slug}`, item);

      // 1. Notify parent in system messages
      saveMessage({
        studentId: s.id,
        from: 'doctor',
        to: 'parent',
        body: `📚 واجب جديد من د. إسماعيل لمادة (${curriculum.title}):\nيرجى حل الصفحات من (${cleanFrom}) إلى (${cleanTo}) في الكتاب التفاعلي.\nرابط المنهاج: https://masarplatform.org/programs/curricula/${curriculum.slug}?page=${cleanFrom}`,
        read: false,
      });

      // 2. Save homework log
      saveStudentHomeworkLog({
        studentId: s.id,
        studentName: s.name,
        title: `واجب ${curriculum.title} (ص ${cleanFrom}-${cleanTo})`,
        subject: curriculum.title,
        dueDate: dueDateStr,
        status: 'assigned',
      });

      // 3. Save to homework collection for student and parent
      void createHomework({
        studentId: s.id,
        studentName: s.name,
        title: `واجب ${curriculum.title} (ص ${cleanFrom}-${cleanTo})`,
        description: `حل التدريبات والأنشطة من صفحة (${cleanFrom}) إلى صفحة (${cleanTo}) في الكتاب التفاعلي لمادة ${curriculum.title}.`,
        dueDate: dueDateStr,
      });

      // 4. In-app Notification for parent
      void createNotification({
        type: 'homework',
        title: `📝 واجب جديد للبطل ${s.name}: ${curriculum.title}`,
        body: `تم إسناد صفحات (${cleanFrom} إلى ${cleanTo}) في مادة ${curriculum.title} من قبل د. إسماعيل عيسى. موعد التسليم: ${new Date(Date.now() + 86400000 * 3).toLocaleDateString('ar-SA')}.`,
        link: `/school-parent?student=${s.id}&tab=homework`,
        targetRole: 'parent',
        studentId: s.id,
        studentName: s.name,
      });

      // 5. In-app Notification for student
      void createNotification({
        type: 'homework',
        title: `📝 واجب تفاعلي جديد: ${curriculum.title} (ص ${cleanFrom}–${cleanTo})`,
        body: `كلفك د. إسماعيل عيسى بحل الصفحات (${cleanFrom} إلى ${cleanTo}) بالكتاب التفاعلي.`,
        link: `/school-student?tab=homework`,
        targetRole: 'student',
        studentId: s.id,
        studentName: s.name,
      });

      return item;
    });

    const studentIds = new Set(students.map((s) => s.id));
    const updated = [...newItems, ...current.filter((item: any) => !(studentIds.has(item.studentId) && item.subjectSlug === curriculum.slug))];
    writeCloudCache(ASSIGNMENTS_KEY, updated);
    setActiveAssignments(updated);

    setAssignNotice(`📢 تم بنجاح إسناد واجب (${curriculum.title}) من ص ${cleanFrom} إلى ص ${cleanTo} لجميع طلاب الفصل (${students.length} طالب) وإشعار كافة أولياء الأمور! ✓`);
    setTimeout(() => setAssignNotice(''), 7000);
  };

  // ── Permanent Homework Delete Handler ──────────────────────────────────────
  const handleExecutePermanentDelete = async () => {
    if (!deleteConfirmTarget) return;
    const target = deleteConfirmTarget;
    setDeletingTargetId(target.id || 'del');
    try {
      await deleteAssignmentPermanently(target);
      setDeleteConfirmTarget(null);
      refreshAssignments();
      setNotice(`✅ تم حذف الواجب نهائياً من قاعدة البيانات وبوابة الطالب وولي الأمر.`);
      setTimeout(() => setNotice(''), 5000);
    } catch (err: any) {
      alert('حدث خطأ أثناء حذف الواجب: ' + err.message);
    } finally {
      setDeletingTargetId(null);
    }
  };

  // ── AI Quiz Generator from Real Curricula Handlers ────────────────────────
  const currentQuizCurriculum = getCurriculumBySlug(quizSubjectSlug) || curriculaList[0];
  const currentQuizUnit = currentQuizCurriculum.units.find(
    (u) => !(u.toPage < quizPageFrom || u.fromPage > quizPageTo)
  ) || currentQuizCurriculum.units[0];

  const handleGenerateQuizFromCurriculum = async () => {
    setIsGeneratingQuiz(true);
    setQuizGeneratedQuestions([]);
    setQuizSentNotice('');

    try {
      const res = await fetch('/api/curriculum/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectSlug: currentQuizCurriculum.slug,
          subjectName: currentQuizCurriculum.title,
          gradeLabel: currentQuizCurriculum.grade,
          pageFrom: quizPageFrom,
          pageTo: quizPageTo,
          questionType: quizQType,
          questionCount: quizQCount,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.questions)) {
        setQuizGeneratedQuestions(data.questions);
        if (!quizCustomTitle) {
          setQuizCustomTitle(`كويز ${currentQuizCurriculum.title} (ص ${quizPageFrom}–${quizPageTo})`);
        }
      } else {
        alert('❌ تعذر توليد الأسئلة: ' + (data.error || 'خطأ غير معروف'));
      }
    } catch (err: any) {
      alert('❌ خطأ في الاتصال بنظام التوليد الذكي: ' + err.message);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSendQuizToClass = async () => {
    if (!quizGeneratedQuestions.length) return;
    setIsSendingQuiz(true);

    const title = quizCustomTitle || `كويز ${currentQuizCurriculum.title} (ص ${quizPageFrom}–${quizPageTo})`;
    const targetPool = quizTargetStudentId === 'all'
      ? (students.length > 0 ? students : getClassStudents().map(s => ({ id: s.id, name: s.fullName, phone: s.parentPhone, grade: s.grade })))
      : students.filter((s) => s.id === quizTargetStudentId);

    if (!targetPool || targetPool.length === 0) {
      alert('يرجى اختيار طالب أو التأكد من وجود طلاب بالفصل.');
      setIsSendingQuiz(false);
      return;
    }

    const now = new Date().toISOString();
    const dueDateStr = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);
    const currAssignments = readCloudCache<any>(ASSIGNMENTS_KEY);
    const newAssignments: any[] = [];

    for (const s of targetPool) {
      const quizId = `quiz_${currentQuizCurriculum.slug}_${s.id}_${Date.now()}`;

      // 1. Save in curriculumAssignments
      const assignItem = {
        id: quizId,
        studentId: s.id,
        studentName: s.name,
        subjectSlug: currentQuizCurriculum.slug,
        subjectTitle: currentQuizCurriculum.title,
        fromPage: quizPageFrom,
        toPage: quizPageTo,
        type: 'QUIZ',
        title,
        questions: quizGeneratedQuestions,
        status: 'assigned',
        assignedAt: now,
      };
      newAssignments.push(assignItem);
      void syncDocToCloud('curriculum_assignments', quizId, assignItem);

      // 2. Create in homework collection
      void createHomework({
        id: quizId,
        studentId: s.id,
        studentName: s.name,
        title,
        description: `كويز تفاعلي ذكي (${quizGeneratedQuestions.length} أسئلة) من صفحات كتاب ${currentQuizCurriculum.title} (ص ${quizPageFrom} إلى ${quizPageTo}).`,
        dueDate: dueDateStr,
        type: 'QUIZ',
        subjectSlug: currentQuizCurriculum.slug,
        subjectTitle: currentQuizCurriculum.title,
        fromPage: quizPageFrom,
        toPage: quizPageTo,
        questions: quizGeneratedQuestions,
      });

      // 3. Save student homework log
      saveStudentHomeworkLog({
        id: quizId,
        studentId: s.id,
        studentName: s.name,
        title,
        subject: currentQuizCurriculum.title,
        subjectSlug: currentQuizCurriculum.slug,
        fromPage: quizPageFrom,
        toPage: quizPageTo,
        dueDate: dueDateStr,
        status: 'assigned',
        type: 'QUIZ',
        questions: quizGeneratedQuestions,
      });

      // 4. In-app Notification for student
      void createNotification({
        type: 'homework',
        title: `🎯 كويز تفاعلي جديد: ${currentQuizCurriculum.title}`,
        body: `كلفك د. إسماعيل عيسى بحل كويز تفاعلي من صفحات (${quizPageFrom} إلى ${quizPageTo}) بمادة ${currentQuizCurriculum.title}. اختبر معلوماتك الآن 🚀`,
        link: `/school-student?tab=homework`,
        targetRole: 'student',
        studentId: s.id,
        studentName: s.name,
      });

      // 5. In-app Notification for parent
      void createNotification({
        type: 'homework',
        title: `🎯 كويز تفاعلي جديد للبطل ${s.name}: ${currentQuizCurriculum.title}`,
        body: `تم إسناد كويز ذكي (${quizGeneratedQuestions.length} أسئلة) من صفحات (${quizPageFrom} إلى ${quizPageTo}) بمادة ${currentQuizCurriculum.title} من قبل د. إسماعيل عيسى.`,
        link: `/school-parent?student=${s.id}&tab=homework`,
        targetRole: 'parent',
        studentId: s.id,
        studentName: s.name,
      });

      // 6. Direct Message in Chat to Parent
      saveMessage({
        studentId: s.id,
        from: 'doctor',
        to: 'parent',
        body: `🎯 السلام عليكم ورحمة الله.\nتم إسناد كويز تفاعلي جديد للبطل (${s.name}) في مادة (${currentQuizCurriculum.title}) من صفحة (${quizPageFrom}) إلى (${quizPageTo}).\nيرجى فتح بوابة الطالب وحل الكويز.`,
        read: false,
      });
    }

    const updatedCurr = [...newAssignments, ...currAssignments];
    writeCloudCache(ASSIGNMENTS_KEY, updatedCurr);
    setActiveAssignments(updatedCurr);

    setIsSendingQuiz(false);
    setQuizSentNotice(`✅ تم بنجاح إسناد الكويز إلى (${targetPool.length}) طالب وإشعار الطلاب وأولياء الأمور فوراً!`);
    setTimeout(() => {
      setQuizSentNotice('');
      setQuizGeneratedQuestions([]);
      setSelectedSubjectFolder(currentQuizCurriculum.slug);
      setManagerView('assignments');
    }, 2000);
  };

  const filteredCurricula = curriculaList.filter((c) => {
    return (
      !search ||
      c.title.includes(search) ||
      c.subtitle.includes(search) ||
      c.badge.includes(search)
    );
  });

  return (
    <div className="space-y-6 text-slate-900" dir="rtl">
      {/* ── BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-slate-950 via-indigo-950 to-blue-900 p-6 text-white shadow-xl border border-indigo-900">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-black text-amber-300 ring-1 ring-amber-400/40">
                <Sparkles size={14} />
                فصل د. إسماعيل عيسى · المناهج والكتب التفاعلية المعتمدة 1448هـ
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              مجلد المناهج التعليمية وإسناد واجبات الفصل 📚
            </h2>
            <p className="mt-2 text-xs md:text-sm font-bold text-slate-300 max-w-2xl leading-relaxed">
              جميع الكتب المدرسية الرسمية (7 كتب) متاحة بنظام التهجي البسيط وحل التمارين التفاعلية بالقلم، مع إمكانية إسناد الصفحات لطلاب الفصل ومتابعة حلولهم.
            </p>
          </div>

          {/* Sub-view Navigation Tabs */}
          <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-2xl backdrop-blur-xs border border-white/20">
            <button
              onClick={() => setManagerView('textbooks')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                managerView === 'textbooks'
                  ? 'bg-amber-400 text-indigo-950 shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              📚 الكتب التفاعلية ({curriculaList.length})
            </button>
            <button
              onClick={() => setManagerView('assignments')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                managerView === 'assignments'
                  ? 'bg-amber-400 text-indigo-950 shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <ClipboardList size={14} />
              واجبات الفصل ({activeAssignments.length})
            </button>
            <button
              onClick={() => setManagerView('ai-quiz')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                managerView === 'ai-quiz'
                  ? 'bg-amber-400 text-indigo-950 shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sparkles size={14} />
              توليد الكويزات AI
            </button>
          </div>
        </div>
      </div>

      {/* ══ VIEW 1: TEXTBOOKS GALLERY ══ */}
      {managerView === 'textbooks' && (
        <div className="space-y-6">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث في مناهج الفصل الدراسي الأول..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-10 pl-4 text-xs font-bold text-slate-900 shadow-xs outline-none focus:border-blue-700"
              />
            </div>
            <span className="text-xs font-bold text-slate-500">
              إجمالي {filteredCurricula.length} مواد دراسية رسمية
            </span>
          </div>

          {/* Quick Classroom Quick Assign Bar */}
          <div className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-indigo-800" />
                <span className="text-xs font-black text-indigo-950">إسناد سريع لطلاب فصل د. إسماعيل عيسى:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedBookSlug}
                  onChange={(e) => setSelectedBookSlug(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
                >
                  {curriculaList.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title} ({c.pageCount} صفحة)
                    </option>
                  ))}
                </select>

                <select
                  value={assignStudentId}
                  onChange={(e) => setAssignStudentId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1 text-xs font-bold text-slate-700">
                  <span>من ص</span>
                  <input
                    type="number"
                    min={1}
                    max={selectedCurriculum.pageCount}
                    value={assignPageFrom}
                    onChange={(e) => setAssignPageFrom(parseInt(e.target.value, 10) || 1)}
                    className="w-14 rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center font-black text-slate-900 outline-none"
                  />
                  <span>إلى ص</span>
                  <input
                    type="number"
                    min={assignPageFrom}
                    max={selectedCurriculum.pageCount}
                    value={assignPageTo}
                    onChange={(e) => setAssignPageTo(parseInt(e.target.value, 10) || assignPageFrom)}
                    className="w-14 rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-center font-black text-slate-900 outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleAssignToClassStudent(selectedCurriculum)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-900 hover:bg-indigo-800 text-white px-3.5 py-1.5 text-xs font-black shadow-xs transition cursor-pointer"
                  title="إسناد الواجب للطالب المحدد فقط"
                >
                  <Send size={13} />
                  إسناد للطالب
                </button>

                <button
                  type="button"
                  onClick={() => handleAssignToEntireClassTab(selectedCurriculum)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 text-xs font-black shadow-xs transition cursor-pointer"
                  title="إسناد الواجب لجميع طلاب الفصل وإشعار أولياء الأمور فوراً"
                >
                  <Megaphone size={13} />
                  إسناد للفصل بالكامل وإشعار أولياء الأمور 📢
                </button>
              </div>
            </div>
            {assignNotice && (
              <p className="mt-2.5 text-xs font-black text-emerald-800 bg-emerald-100/80 border border-emerald-300 rounded-lg p-2">
                {assignNotice}
              </p>
            )}
          </div>

          {/* Horizontal Books Slider Strip (سلايدر التصفح السريع للكتب والمناهج) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 font-black text-xs">
                  📚
                </span>
                <span className="text-xs font-black text-slate-800">شريط التصفح السريع للكتب والمناهج الدراسية:</span>
              </div>
              <span className="text-[11px] font-bold text-slate-400">انقر على أي كتاب لفتحه وتصفحه فوراً</span>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-200">
              {curriculaList.map((c) => (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => handleOpenBook(c.slug)}
                  className={`shrink-0 flex items-center gap-2.5 rounded-xl border p-2.5 transition cursor-pointer text-right min-w-[170px] ${
                    selectedBookSlug === c.slug
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white font-black text-sm shadow-xs"
                    style={{ backgroundColor: c.color }}
                  >
                    <BookOpen size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-900 truncate leading-tight">{c.title}</p>
                    <p className="text-[10px] font-bold text-slate-500 mt-0.5">{c.pageCount} صفحة</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Textbooks Grid */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredCurricula.map((curriculum) => (
              <article
                key={curriculum.slug}
                className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition"
              >
                {/* Subject Header Banner */}
                <div
                  className="p-5 text-white relative overflow-hidden"
                  style={{ backgroundColor: curriculum.color }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-black backdrop-blur-xs">
                      {curriculum.badge}
                    </span>
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold">
                      {curriculum.pageCount} صفحة
                    </span>
                  </div>

                  <h3 className="mt-3 text-2xl font-black">{curriculum.title}</h3>
                  <p className="mt-1 text-xs font-bold text-white/80">{curriculum.subtitle}</p>
                </div>

                {/* Subject Body */}
                <div className="flex flex-1 flex-col justify-between p-5">
                  <div>
                    <p className="text-xs font-bold leading-6 text-slate-600">
                      {curriculum.promise}
                    </p>

                    <div className="mt-4 rounded-xl bg-slate-50 p-3 border border-slate-100">
                      <p className="text-[11px] font-black text-slate-500 mb-1">الوحدات والفصول الرئيسية:</p>
                      <div className="flex flex-wrap gap-1">
                        {curriculum.units.slice(0, 3).map((u) => (
                          <span
                            key={u.title}
                            className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200"
                          >
                            {u.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleOpenBook(curriculum.slug)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-black text-white hover:bg-indigo-900 transition shadow-xs cursor-pointer"
                    >
                      <PenTool size={15} />
                      فتح الكتاب التفاعلي
                      <ArrowLeft size={14} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* ══ VIEW 2: INTERACTIVE WORKBOOK READER (INLINE IN CLASSROOM) ══ */}
      {managerView === 'reader' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setManagerView('textbooks')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
            >
              <ChevronRight size={16} />
              العودة إلى قائمة المناهج
            </button>

            {/* Quick Switch Book Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-500">تبديل المادة:</span>
              <select
                value={selectedBookSlug}
                onChange={(e) => setSelectedBookSlug(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-900 outline-none"
              >
                {curriculaList.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.title} ({c.pageCount} صفحة)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <CurriculumInteractiveWorkbook curriculum={selectedCurriculum} students={students} branch="IKHLAS_JEDDAH" />
        </div>
      )}

      {/* ══ VIEW 3: ACTIVE CLASSROOM HOMEWORK ASSIGNMENTS & SUBJECT FOLDERS ══ */}
      {managerView === 'assignments' && (
        <div className="space-y-6">
          {/* Top Control Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
                <Folder className="text-indigo-600" size={20} />
                مجلدات وواجبات الفصل الدراسية ({activeAssignments.length})
              </h3>
              <p className="text-xs font-bold text-slate-500 mt-0.5">
                مقسمة حسب المواد الدراسية الرسمية — يمكنك استعراض واجبات كل مادة أو حذف أي واجب نهائياً من قاعدة البيانات.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setManagerView('ai-quiz')}
                className="rounded-xl bg-amber-400 hover:bg-amber-300 text-indigo-950 px-3.5 py-2 text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={14} />
                + توليد كويز AI من الكتاب
              </button>
              <button
                type="button"
                onClick={() => setManagerView('textbooks')}
                className="rounded-xl bg-indigo-950 text-white px-3.5 py-2 text-xs font-black hover:bg-indigo-900 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                + إسناد صفحات من المناهج
              </button>
            </div>
          </div>

          {/* Subject Folders Shelf (مجلدات المواد الدراسية) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-700">مجلدات المواد الدراسية المعتمدة:</span>
              {selectedSubjectFolder !== 'all' && (
                <button
                  type="button"
                  onClick={() => setSelectedSubjectFolder('all')}
                  className="text-xs font-black text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft size={13} />
                  عرض كافة المواد ({activeAssignments.length})
                </button>
              )}
            </div>

            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
              {/* "All Subjects" Folder */}
              <button
                type="button"
                onClick={() => setSelectedSubjectFolder('all')}
                className={`p-3 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between ${
                  selectedSubjectFolder === 'all'
                    ? 'border-indigo-600 bg-indigo-50/90 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">📁</span>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      selectedSubjectFolder === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {activeAssignments.length}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-black text-slate-900 truncate">كافة المواد</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">عرض شامل</p>
                </div>
              </button>

              {/* 7 Official Curricula Subject Folders */}
              {curriculaList.map((c) => {
                const count = activeAssignments.filter(
                  (a) => a.subjectSlug === c.slug || a.subjectTitle === c.title
                ).length;
                const isSelected = selectedSubjectFolder === c.slug;
                const iconMap: Record<string, string> = {
                  lughati: '📖',
                  math: '📐',
                  islamic: '🕌',
                  science: '🔬',
                  english: '🔤',
                  'life-skills': '🏠',
                  art: '🎨',
                };
                const icon = iconMap[c.slug] || '📚';

                return (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setSelectedSubjectFolder(isSelected ? 'all' : c.slug)}
                    className={`p-3 rounded-2xl border text-right transition cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/90 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className="absolute top-0 right-0 left-0 h-1"
                      style={{ backgroundColor: c.color }}
                    />
                    <div className="flex items-center justify-between mb-2 pt-1">
                      <span className="text-xl">{icon}</span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          count > 0
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {count} {count === 1 ? 'واجب' : count === 2 ? 'واجبان' : 'واجبات'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900 truncate">{c.title}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">{c.pageCount} صفحة</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assignments List Section */}
          {(() => {
            const displayed =
              selectedSubjectFolder === 'all'
                ? activeAssignments
                : activeAssignments.filter(
                    (a) =>
                      a.subjectSlug === selectedSubjectFolder ||
                      a.subjectTitle === getCurriculumBySlug(selectedSubjectFolder)?.title
                  );

            const activeCurriculum =
              selectedSubjectFolder !== 'all' ? getCurriculumBySlug(selectedSubjectFolder) : null;

            return (
              <div className="space-y-4">
                {/* Folder Header if filtered */}
                {activeCurriculum && (
                  <div
                    className="p-4 rounded-2xl border text-white flex items-center justify-between gap-3 shadow-xs"
                    style={{ backgroundColor: activeCurriculum.color }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {{
                          lughati: '📖',
                          math: '📐',
                          islamic: '🕌',
                          science: '🔬',
                          english: '🔤',
                          'life-skills': '🏠',
                          art: '🎨',
                        }[activeCurriculum.slug] || '📚'}
                      </span>
                      <div>
                        <h4 className="text-sm font-black text-white">
                          مجلد واجبات مادة: {activeCurriculum.title} ({displayed.length} واجب)
                        </h4>
                        <p className="text-[11px] font-bold text-white/80">
                          {activeCurriculum.subtitle} · {activeCurriculum.badge}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBookSlug(activeCurriculum.slug);
                          setManagerView('textbooks');
                        }}
                        className="rounded-xl bg-white text-slate-900 font-black px-3 py-1.5 text-xs hover:bg-slate-100 transition shadow-xs cursor-pointer"
                      >
                        + إسناد واجب في {activeCurriculum.title}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSubjectFolder('all')}
                        className="rounded-xl bg-black/25 text-white font-bold px-3 py-1.5 text-xs hover:bg-black/40 transition cursor-pointer"
                      >
                        إغلاق المجلد ✕
                      </button>
                    </div>
                  </div>
                )}

                {displayed.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center space-y-3">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl mx-auto">
                      📂
                    </div>
                    <p className="text-sm font-black text-slate-800">
                      {activeCurriculum
                        ? `لا توجد واجبات مسندة حالياً في مجلد (${activeCurriculum.title})`
                        : 'لا توجد واجبات مسندة حالياً'}
                    </p>
                    <p className="text-xs font-bold text-slate-500 max-w-sm mx-auto">
                      اختر مادة دراسية وحدد الصفحات أو قم بتوليد كويز بالذكاء الاصطناعي لإسناده لطلاب الفصل.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (activeCurriculum) setSelectedBookSlug(activeCurriculum.slug);
                          setManagerView('textbooks');
                        }}
                        className="rounded-xl bg-indigo-950 text-white font-black px-4 py-2 text-xs hover:bg-indigo-900 transition"
                      >
                        إسناد صفحات من الكتاب 📖
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (activeCurriculum) setQuizSubjectSlug(activeCurriculum.slug);
                          setManagerView('ai-quiz');
                        }}
                        className="rounded-xl bg-amber-400 text-indigo-950 font-black px-4 py-2 text-xs hover:bg-amber-300 transition"
                      >
                        توليد كويز AI ⚡
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {displayed.map((a, idx) => {
                      const isQuiz = a.type === 'QUIZ' || Boolean(a.questions && a.questions.length > 0) || a.title?.includes('كويز');
                      const curriculumInfo = getCurriculumBySlug(a.subjectSlug);
                      const qCount = a.questions?.length || 5;

                      return (
                        <div
                          key={a.id || idx}
                          className="rounded-2xl border border-slate-200 bg-white p-4.5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-3"
                        >
                          <div>
                            {/* Subject & Date Header */}
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className="rounded-lg px-2.5 py-0.5 text-xs font-black text-white shadow-2xs"
                                style={{ backgroundColor: curriculumInfo?.color || '#312e81' }}
                              >
                                {a.subjectTitle || curriculumInfo?.title || a.subjectSlug}
                              </span>
                              <span className="text-[11px] font-bold text-slate-400">
                                {new Date(a.assignedAt || Date.now()).toLocaleDateString('ar-SA')}
                              </span>
                            </div>

                            {/* Student Name & Status */}
                            <div className="flex items-center justify-between gap-2">
                              <h4 className="font-black text-slate-950 text-sm flex items-center gap-1.5">
                                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-black">
                                  {(a.studentName || 'ط')[0]}
                                </span>
                                <span>{a.studentName}</span>
                              </h4>
                              <span
                                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                                  a.status === 'submitted'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : a.status === 'reviewed'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}
                              >
                                {a.status === 'submitted'
                                  ? '⏳ قيد المراجعة'
                                  : a.status === 'reviewed'
                                  ? a.grade !== undefined
                                    ? `⭐ تم التصحيح (${a.grade}/10)`
                                    : '✅ تم التصحيح'
                                  : '📝 مطلوب حلّه'}
                              </span>
                            </div>

                            {/* Assignment Type & Details */}
                            <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                              {isQuiz ? (
                                <div className="space-y-1">
                                  <p className="font-black text-amber-900 flex items-center gap-1.5">
                                    <Sparkles size={13} className="text-amber-600" />
                                    <span>كويز تفاعلي مولد بالذكاء الاصطناعي ({qCount} أسئلة)</span>
                                  </p>
                                  <p className="text-[11px] font-bold text-slate-600">
                                    📖 من صفحات الكتاب: ({a.fromPage || 1} إلى {a.toPage || 5})
                                  </p>
                                </div>
                              ) : (
                                <p className="font-bold text-slate-700">
                                  📖 واجب صفحات الكتاب: من صفحة{' '}
                                  <strong className="text-indigo-950 font-black">{a.fromPage || 1}</strong> إلى{' '}
                                  <strong className="text-indigo-950 font-black">{a.toPage || 5}</strong>
                                </p>
                              )}
                            </div>

                            {a.teacherFeedback && (
                              <p className="mt-2 text-[11px] font-bold text-slate-500 bg-slate-50/70 rounded-lg p-2 border border-dashed border-slate-200">
                                💬 ملاحظات المعلم: {a.teacherFeedback}
                              </p>
                            )}
                          </div>

                          {/* Action Buttons: Preview, Correction, and PERMANENT DELETE */}
                          <div className="mt-4 flex items-center gap-2 pt-2.5 border-t border-slate-100 flex-wrap sm:flex-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                if (a.subjectSlug) handleOpenBook(a.subjectSlug);
                                else setManagerView('textbooks');
                              }}
                              className="flex-1 rounded-xl bg-slate-950 text-white px-3 py-2 text-xs font-black hover:bg-indigo-900 transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Eye size={14} /> معاينة الواجب
                            </button>
                            {onNavigateToCorrection && (
                              <button
                                type="button"
                                onClick={onNavigateToCorrection}
                                className={`rounded-xl px-3 py-2 text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer ${
                                  a.status === 'submitted'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                    : 'border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                                }`}
                              >
                                <PenTool size={13} /> {a.status === 'submitted' ? 'تصحيح الحل ✍️' : 'تصحيح'}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmTarget(a)}
                              className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 px-3 py-2 text-xs font-black transition flex items-center justify-center gap-1 cursor-pointer"
                              title="حذف هذا الواجب نهائياً من قاعدة البيانات"
                            >
                              <Trash2 size={14} className="text-rose-600" />
                              <span className="hidden sm:inline">حذف</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── PERMANENT DELETE CONFIRMATION MODAL ── */}
          {deleteConfirmTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4" dir="rtl">
              <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-in">
                <div className="flex items-center gap-3 text-rose-600">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                    <Trash2 size={24} />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-slate-950">تأكيد حذف الواجب نهائياً 🗑️</h4>
                    <p className="text-xs font-bold text-rose-700">تحذير: هذا الإجراء لا يمكن التراجع عنه!</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-1.5">
                  <p><strong className="text-slate-900">الطالب:</strong> {deleteConfirmTarget.studentName || 'جميع طلاب الفصل'}</p>
                  <p><strong className="text-slate-900">المادة:</strong> {deleteConfirmTarget.subjectTitle || deleteConfirmTarget.subjectSlug}</p>
                  <p><strong className="text-slate-900">النوع:</strong> {deleteConfirmTarget.type === 'QUIZ' ? 'كويز تفاعلي AI' : `صفحات الكتاب (${deleteConfirmTarget.fromPage || 1} إلى ${deleteConfirmTarget.toPage || 5})`}</p>
                </div>

                <p className="text-xs font-bold text-slate-600 leading-relaxed">
                  سيتم حذف هذا الواجب نهائياً من قاعدة البيانات السحابية (Firestore) ومسحه من حساب الطالب وحساب ولي الأمر فوراً.
                </p>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={deletingTargetId === deleteConfirmTarget.id}
                    onClick={handleExecutePermanentDelete}
                    className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black py-2.5 text-xs transition shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {deletingTargetId ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    <span>نعم، احذف الواجب نهائياً 🗑️</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTarget(null)}
                    className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 text-xs transition cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ VIEW 4: AI QUIZ GENERATOR FROM REAL TEXTBOOKS ══ */}
      {managerView === 'ai-quiz' && (
        <div className="space-y-5">
          <div className="rounded-3xl border border-indigo-200 bg-white p-6 shadow-sm space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-lg font-black text-slate-950 flex items-center gap-2">
                  <Sparkles size={20} className="text-amber-500" />
                  توليد كويزات ذكية من صفحات الكتب المدرسية المعتمدة 1448هـ
                </h3>
                <p className="text-xs font-bold text-slate-600 mt-1 max-w-2xl leading-relaxed">
                  يقرأ الذكاء الاصطناعي الصفحات الحقيقية من كتاب المنهج المختار بدقة، ويستخرج منها أسئلة مطابقة للدروس والتمارين الرسمية مع إمكانية إسنادها لطلاب الفصل فوراً.
                </p>
              </div>
              <span className="rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-black px-3.5 py-1">
                وزارة التعليم · الصف الأول الابتدائي
              </span>
            </div>

            {/* Select Book Cards / Dropdown */}
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {/* 1. Subject */}
              <div>
                <label className="text-xs font-black text-slate-800 block mb-1.5">الكتاب المدرسي المعتمد:</label>
                <select
                  value={quizSubjectSlug}
                  onChange={(e) => {
                    setQuizSubjectSlug(e.target.value);
                    setQuizPageFrom(1);
                    setQuizPageTo(Math.min(5, getCurriculumBySlug(e.target.value)?.pageCount || 5));
                    setQuizGeneratedQuestions([]);
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-black text-slate-900 outline-none focus:border-indigo-600"
                >
                  {curriculaList.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.title} ({c.pageCount} صفحة)
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Page Range */}
              <div>
                <label className="text-xs font-black text-slate-800 block mb-1.5">
                  الصفحات المحددة (من - إلى):
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500">من ص</span>
                  <input
                    type="number"
                    min={1}
                    max={currentQuizCurriculum.pageCount}
                    value={quizPageFrom}
                    onChange={(e) => setQuizPageFrom(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 rounded-xl border border-slate-300 bg-white py-2 text-center text-xs font-black text-slate-900 outline-none focus:border-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-500">إلى ص</span>
                  <input
                    type="number"
                    min={quizPageFrom}
                    max={currentQuizCurriculum.pageCount}
                    value={quizPageTo}
                    onChange={(e) => setQuizPageTo(Math.max(quizPageFrom, parseInt(e.target.value, 10) || quizPageFrom))}
                    className="w-16 rounded-xl border border-slate-300 bg-white py-2 text-center text-xs font-black text-slate-900 outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* 3. Question Type */}
              <div>
                <label className="text-xs font-black text-slate-800 block mb-1.5">نوع الأسئلة:</label>
                <select
                  value={quizQType}
                  onChange={(e: any) => setQuizQType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-black text-slate-900 outline-none focus:border-indigo-600"
                >
                  <option value="multiple_choice">اختيار من متعدد (4 خيارات)</option>
                  <option value="true_false">صح أو خطأ</option>
                  <option value="fill_blank">إكمال الفراغ</option>
                </select>
              </div>

              {/* 4. Question Count */}
              <div>
                <label className="text-xs font-black text-slate-800 block mb-1.5">عدد الأسئلة:</label>
                <select
                  value={quizQCount}
                  onChange={(e) => setQuizQCount(parseInt(e.target.value, 10) || 5)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-black text-slate-900 outline-none focus:border-indigo-600"
                >
                  <option value={3}>3 أسئلة سريعة</option>
                  <option value={5}>5 أسئلة أساسية</option>
                  <option value={10}>10 أسئلة شاملة</option>
                </select>
              </div>
            </div>

            {/* Unit Helper Banner */}
            <div className="rounded-2xl bg-indigo-50/60 border border-indigo-100 p-3 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-indigo-700 shrink-0" />
                <span className="font-black text-indigo-950">
                  الوحدة الدراسية المقررة لهذه الصفحات:
                </span>
                <span className="font-bold text-indigo-800">
                  {currentQuizUnit?.title || 'الوحدة التأسيسية'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleGenerateQuizFromCurriculum}
                disabled={isGeneratingQuiz}
                className="rounded-xl bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black px-5 py-2 text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingQuiz ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                <span>{isGeneratingQuiz ? 'جاري قراءة الكتاب وتوليد الأسئلة...' : 'توليد الكويز بالـ AI ⚡'}</span>
              </button>
            </div>

            {/* Generated Questions Preview & Assign Controls */}
            {quizGeneratedQuestions.length > 0 && (
              <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200">
                  <div>
                    <h4 className="text-sm font-black text-emerald-950 flex items-center gap-2">
                      <CheckCircle2 size={17} className="text-emerald-600" />
                      تم توليد {quizGeneratedQuestions.length} أسئلة بنجاح من كتاب ({currentQuizCurriculum.title})
                    </h4>
                    <p className="text-xs font-bold text-emerald-800 mt-0.5">
                      يمكنك تعديل عنوان الكويز واختيار إسناده لكافة طلاب الفصل أو لطالب محدد.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      placeholder="عنوان الكويز..."
                      value={quizCustomTitle}
                      onChange={(e) => setQuizCustomTitle(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none min-w-[200px]"
                    />

                    <select
                      value={quizTargetStudentId}
                      onChange={(e) => setQuizTargetStudentId(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-900 outline-none"
                    >
                      <option value="all">إسناد للفصل بالكامل ({students.length} طالب) 📢</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      disabled={isSendingQuiz}
                      onClick={handleSendQuizToClass}
                      className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 text-xs font-black shadow-xs transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isSendingQuiz ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                      <span>{isSendingQuiz ? 'جاري الإسناد...' : 'إرسال الواجب لطلاب الفصل 🚀'}</span>
                    </button>
                  </div>
                </div>

                {quizSentNotice && (
                  <div className="p-3 bg-emerald-600 text-white font-black text-xs rounded-xl shadow-md text-center">
                    {quizSentNotice}
                  </div>
                )}

                {/* Questions List */}
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {quizGeneratedQuestions.map((q, qIdx) => (
                    <div
                      key={q.id || qIdx}
                      className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-black text-slate-950 text-sm">
                          {qIdx + 1}. {q.text}
                        </p>
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-black px-2 py-0.5 rounded-md shrink-0">
                          {quizQType === 'multiple_choice'
                            ? 'اختيار متعدد'
                            : quizQType === 'true_false'
                            ? 'صح أو خطأ'
                            : 'إكمال فراغ'}
                        </span>
                      </div>

                      {q.options && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((opt: string, oIdx: number) => {
                            const isCorrect = opt === q.correctAnswer;
                            return (
                              <div
                                key={oIdx}
                                className={`rounded-xl px-3 py-2 text-xs font-bold transition border flex items-center justify-between ${
                                  isCorrect
                                    ? 'bg-emerald-100 border-emerald-300 text-emerald-950'
                                    : 'bg-white border-slate-200 text-slate-700'
                                }`}
                              >
                                <span>{opt}</span>
                                {isCorrect && (
                                  <span className="text-emerald-700 font-black text-[11px]">✓ الإجابة الصحيحة</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.explanation && (
                        <p className="text-[11px] font-bold text-slate-500 bg-white/80 rounded-lg p-2 border border-slate-100">
                          💡 <strong>التفسير التربوي:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
