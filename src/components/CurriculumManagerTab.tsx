'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
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
import { saveStudentHomeworkLog } from '@/lib/classDb';
import { readCloudCache, syncDocToCloud, writeCloudCache } from '@/lib/firestoreSync';
import { createNotification } from '@/lib/notifications';
import { createHomework } from '@/lib/homework';

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

  // AI Quiz Builder State (Preserved)
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

  const [activeAssignments, setActiveAssignments] = useState<any[]>(() => readCloudCache(ASSIGNMENTS_KEY));

  useEffect(() => {
    setActiveAssignments(readCloudCache(ASSIGNMENTS_KEY));
    if (students.length > 0 && !assignStudentId) {
      setAssignStudentId(students[0].id);
    }
  }, [students, assignStudentId]);

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

  // ── AI Quiz Generator Handlers ───────────────────────────────────────────
  const handleGenerateQuiz = async () => {
    const subject = CURRICULUM_SUBJECTS.find((s) => s.id === builderSubjectId);
    const file = files.find((f) => f.id === builderFileId);
    if (!subject || !file) return;

    setGenerating(true);
    setGeneratedQuestions([]);

    try {
      const res = await fetch('/api/curriculum/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectName: subject.name,
          gradeLabel: GRADE_LABELS[subject.grade],
          fileBase64: file.base64Data,
          fileMimeType: file.mimeType,
          pageFrom: builderPageFrom,
          pageTo: builderPageTo,
          questionType: builderQType,
          questionCount: builderQCount,
        }),
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.questions)) {
        setGeneratedQuestions(data.questions);
      } else {
        alert('❌ تعذر توليد الأسئلة: ' + (data.error || 'خطأ غير معروف'));
      }
    } catch (err: any) {
      alert('❌ خطأ في الاتصال بالذكاء الاصطناعي: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSendQuiz = async () => {
    if (!generatedQuestions.length || !builderSubjectId) return;
    setSendingQuiz(true);

    const subject = CURRICULUM_SUBJECTS.find((s) => s.id === builderSubjectId);
    const quizTitle = builderTitle || `واجب ${subject?.name} — صفحات ${builderPageFrom}-${builderPageTo}`;

    const quiz: GeneratedQuiz = {
      id: createQuizId(),
      subjectId: builderSubjectId,
      fileId: builderFileId,
      title: quizTitle,
      pageFrom: builderPageFrom,
      pageTo: builderPageTo,
      questionType: builderQType,
      questions: generatedQuestions,
      createdAt: new Date().toISOString(),
      sentAt: new Date().toISOString(),
      status: 'sent',
    };

    saveQuiz(quiz);
    setQuizzes(getAllQuizzes());
    setSendingQuiz(false);
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      setBuilderOpen(false);
      setGeneratedQuestions([]);
      setBuilderTitle('');
    }, 2500);
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

      {/* ══ VIEW 3: ACTIVE CLASSROOM HOMEWORK ASSIGNMENTS ══ */}
      {managerView === 'assignments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-950">سجل الواجبات المسندة لطلاب الفصل ({activeAssignments.length})</h3>
            <button
              onClick={() => setManagerView('textbooks')}
              className="rounded-xl bg-indigo-950 text-white px-4 py-2 text-xs font-black hover:bg-indigo-900"
            >
              + إسناد واجب جديد من المناهج
            </button>
          </div>

          {activeAssignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <ClipboardList size={40} className="mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-black text-slate-800">لا توجد واجبات مسندة حالياً</p>
              <p className="mt-1 text-xs font-bold text-slate-500">اختر أي مادة من الكتب التفاعلية وحدد أرقام الصفحات لإسنادها لطلاب الفصل.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeAssignments.map((a, idx) => (
                <div key={idx} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="rounded-md bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-black text-indigo-900">
                        {a.subjectTitle || a.subjectSlug}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {new Date(a.assignedAt).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                    <h4 className="font-black text-slate-950 text-sm">{a.studentName}</h4>
                    <p className="mt-2 text-xs font-bold text-slate-700 bg-slate-50 rounded-lg p-2 border border-slate-100">
                      📖 الصفحات المطلوبة: من صفحة <span className="font-black text-indigo-950">{a.fromPage}</span> إلى <span className="font-black text-indigo-950">{a.toPage}</span>
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleOpenBook(a.subjectSlug)}
                      className="flex-1 rounded-lg bg-slate-950 text-white px-3 py-1.5 text-xs font-black hover:bg-indigo-900"
                    >
                      معاينة صفحات الواجب
                    </button>
                    {onNavigateToCorrection && (
                      <button
                        onClick={onNavigateToCorrection}
                        className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-1.5 text-xs font-black hover:bg-emerald-100"
                      >
                        تصحيح الحلول
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ VIEW 4: AI QUIZ GENERATOR (PRESERVED) ══ */}
      {managerView === 'ai-quiz' && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-black text-slate-950 flex items-center gap-2 mb-2">
              <Sparkles size={18} className="text-amber-500" />
              توليد كويزات واختبارات تفاعلية بالذكاء الاصطناعي
            </h3>
            <p className="text-xs font-bold text-slate-600 mb-4">
              يمكنك توليد أسئلة اختيار من متعدد، صواب وخطأ، أو إكمال فراغات تلقائياً من صفحات المنهج وإرسالها فوراً للطلاب.
            </p>

            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">المادة الدراسية:</label>
                <select
                  value={builderSubjectId}
                  onChange={(e) => setBuilderSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                >
                  <option value="">اختر المادة...</option>
                  {CURRICULUM_SUBJECTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({GRADE_LABELS[s.grade]})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">نوع الأسئلة:</label>
                <select
                  value={builderQType}
                  onChange={(e: any) => setBuilderQType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none"
                >
                  <option value="multiple_choice">اختيار من متعدد</option>
                  <option value="true_false">صح أو خطأ</option>
                  <option value="fill_blank">إكمال الفراغ</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1">عدد الأسئلة:</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={builderQCount}
                  onChange={(e) => setBuilderQCount(parseInt(e.target.value, 10) || 5)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-900 outline-none text-center"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleGenerateQuiz}
                  disabled={generating || !builderSubjectId}
                  className="w-full rounded-xl bg-amber-400 hover:bg-amber-300 text-indigo-950 font-black px-4 py-2.5 text-xs transition shadow-sm disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  <span>{generating ? 'جاري التوليد...' : 'توليد الأسئلة بالـ AI'}</span>
                </button>
              </div>
            </div>

            {/* Generated Questions Preview */}
            {generatedQuestions.length > 0 && (
              <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black text-slate-950">
                    الأسئلة المولدة بنجاح ({generatedQuestions.length} سؤال):
                  </h4>
                  <button
                    onClick={handleSendQuiz}
                    disabled={sendingQuiz}
                    className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 text-xs font-black shadow-xs transition"
                  >
                    {sendingQuiz ? 'جاري الإرسال...' : 'إرسال الواجب لطلاب الفصل'}
                  </button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {generatedQuestions.map((q, qIdx) => (
                    <div key={qIdx} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
                      <p className="font-black text-slate-900">
                        {qIdx + 1}. {q.text}
                      </p>
                      {q.options && (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {q.options.map((opt, oIdx) => (
                            <span
                              key={oIdx}
                              className={`rounded-md px-2 py-1 text-[11px] font-bold ${
                                opt === q.correctAnswer
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : 'bg-white text-slate-700 border border-slate-200'
                              }`}
                            >
                              {opt} {opt === q.correctAnswer ? '✓' : ''}
                            </span>
                          ))}
                        </div>
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
