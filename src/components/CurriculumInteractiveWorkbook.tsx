'use client';

import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eraser,
  Highlighter,
  Loader2,
  Maximize2,
  Megaphone,
  Minimize2,
  PenLine,
  Printer,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  Users,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { CurriculumSubject } from '@/data/curriculaData';
import { getSession, getStudents, saveMessage, saveReport, type StudentRecord } from '@/lib/cloudStore';
import { getClassStudents, saveStudentHomeworkLog } from '@/lib/classDb';
import { readCloudCache, syncDocToCloud, writeCloudCache } from '@/lib/firestoreSync';
import { recordStudentLearningActivity } from '@/lib/learningProgress';
import { broadcastHomeworkToParents } from '@/lib/broadcastService';
import { createNotification } from '@/lib/notifications';

const ASSIGNMENTS_KEY = 'masar.curriculumAssignments.v1';
const DRAWINGS_KEY = 'masar.curriculumDrawings.v1';

type Tool = 'view' | 'pen' | 'highlighter' | 'eraser';

type StudentItem = {
  id: string;
  name?: string;
  fullName?: string;
  phone?: string;
  parentPhone?: string;
  grade?: string;
  schoolBranch?: string;
};

type CurriculumAssignment = {
  id?: string;
  studentId: string;
  studentName: string;
  subjectSlug: string;
  subjectTitle: string;
  fromPage: number;
  toPage: number;
  assignedAt: string;
};

type CurriculumDrawingRecord = {
  id: string;
  studentId: string;
  subjectSlug: string;
  page: number;
  dataUrl: string;
  updatedAt: string;
};

const COLOR_PALETTE = [
  { name: 'أسود', value: '#0f172a' },
  { name: 'كحلي', value: '#1e3a8a' },
  { name: 'أحمر', value: '#dc2626' },
  { name: 'أخضر', value: '#059669' },
  { name: 'بنفسجي', value: '#7c3aed' },
  { name: 'ذهبي', value: '#d97706' },
  { name: 'أزرق سماوي', value: '#0284c7' },
];

export default function CurriculumInteractiveWorkbook({
  curriculum,
  students: propStudents,
  branch = 'IKHLAS_JEDDAH',
}: {
  curriculum: CurriculumSubject;
  students?: StudentItem[];
  branch?: string;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState('1');
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#0f172a');
  const [brush, setBrush] = useState(4);
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  const [sessionRole, setSessionRole] = useState('');
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(5);
  const [assignment, setAssignment] = useState<CurriculumAssignment | null>(null);
  const [notice, setNotice] = useState('');
  const [loadingPage, setLoadingPage] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  function pageSrc(pageNum: number) {
    return `/resources/curricula/${curriculum.slug}/page-${String(pageNum).padStart(3, '0')}.jpg`;
  }

  function readAssignments(): CurriculumAssignment[] {
    return readCloudCache<CurriculumAssignment>(ASSIGNMENTS_KEY);
  }

  function writeAssignments(items: CurriculumAssignment[]) {
    writeCloudCache(ASSIGNMENTS_KEY, items);
    items.forEach((item) => {
      const docId = `${item.studentId}_${item.subjectSlug}`;
      void syncDocToCloud('curriculum_assignments', docId, item);
    });
  }

  function getActiveStudentId() {
    const session = getSession();
    const allStudents = getStudents();

    if (session?.role === 'student') {
      return (
        allStudents.find(
          (student) =>
            student.id === session.linkedStudentId ||
            student.linkedStudentId === session.linkedStudentId ||
            student.studentAccountId === session.id ||
            student.linkedStudentEmail === session.email ||
            student.email === session.email ||
            student.fullName === session.name ||
            student.parentPhone === session.phone ||
            student.parentPhone === session.email ||
            student.id === session.id,
        )?.id ?? ''
      );
    }

    return selectedStudentId || allStudents[0]?.id || '';
  }

  function getActiveStudent() {
    const activeId = getActiveStudentId();
    return getStudents().find((student) => student.id === activeId) ?? null;
  }

  function shouldTrackStudentActivity() {
    return getSession()?.role === 'student';
  }

  function drawingId(pageNumber = page) {
    return `${getActiveStudentId() || 'doctor'}_${curriculum.slug}_p${pageNumber}`;
  }

  function readDrawings() {
    return readCloudCache<CurriculumDrawingRecord>(DRAWINGS_KEY);
  }

  function readDrawing(pageNumber = page) {
    const id = drawingId(pageNumber);
    return readDrawings().find((item) => item.id === id);
  }

  function upsertDrawing(record: CurriculumDrawingRecord) {
    const next = [record, ...readDrawings().filter((item) => item.id !== record.id)];
    writeCloudCache(DRAWINGS_KEY, next);
    void syncDocToCloud('curriculum_drawings', record.id, record);
    const activeStudent = getActiveStudent();
    if (activeStudent && shouldTrackStudentActivity()) {
      recordStudentLearningActivity({
        studentId: activeStudent.id,
        studentName: activeStudent.fullName,
        type: 'save_curriculum_page',
        subjectSlug: curriculum.slug,
        subjectTitle: curriculum.title,
        page: record.page,
        href: `/programs/curricula/${curriculum.slug}?page=${record.page}`,
      });
    }
  }

  function getCanvasContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }

  function syncCanvasSize() {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;

    const width = img.naturalWidth || img.clientWidth || 800;
    const height = img.naturalHeight || img.clientHeight || 1130;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function redrawSavedDrawing(pageNumber = page) {
    const ctx = getCanvasContext();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    syncCanvasSize();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const saved = readDrawing(pageNumber);
    if (!saved?.dataUrl) {
      setSavedAt('');
      return;
    }

    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setSavedAt(new Date(saved.updatedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
    };
    img.src = saved.dataUrl;
  }

  useEffect(() => {
    const session = getSession();
    const role = session?.role || 'doctor';
    setSessionRole(role);

    if (propStudents && propStudents.length > 0) {
      const mapped: StudentRecord[] = propStudents.map((s: any) => ({
        id: s.id,
        fullName: s.fullName || s.name || 'طالب',
        grade: s.grade || 'الصف الأول الابتدائي',
        parentPhone: s.parentPhone || s.phone,
        parentName: s.parentName,
        source: 'ikhlas-jeddah' as const,
        schoolBranch: s.schoolBranch || branch || 'IKHLAS_JEDDAH',
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: s.updatedAt || new Date().toISOString(),
      }));
      setStudents(mapped);
      setSelectedStudentId((prev) => (mapped.some((m) => m.id === prev) ? prev : mapped[0]?.id || ''));
      return;
    }

    const classStudents = getClassStudents();
    const classIds = new Set(classStudents.map((c) => c.id));
    const allStudents = getStudents();

    let filtered = allStudents.filter(
      (s) => s.schoolBranch === 'IKHLAS_JEDDAH' || s.source === 'ikhlas-jeddah' || classIds.has(s.id),
    );

    if (filtered.length === 0 && classStudents.length > 0) {
      filtered = classStudents.map((cs) => ({
        id: cs.id,
        fullName: cs.fullName,
        grade: cs.grade || 'الصف الأول الابتدائي',
        parentPhone: cs.parentPhone,
        source: 'ikhlas-jeddah' as const,
        schoolBranch: 'IKHLAS_JEDDAH',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
    }

    setStudents(filtered);
    if (filtered.length > 0) {
      setSelectedStudentId((prev) => (filtered.some((m) => m.id === prev) ? prev : filtered[0]?.id || ''));
    }
  }, [propStudents, branch]);

  useEffect(() => {
    const activeId = getActiveStudentId();
    const currentAssignment = readAssignments().find(
      (item) => item.studentId === activeId && item.subjectSlug === curriculum.slug,
    );
    setAssignment(currentAssignment || null);
    if (currentAssignment) {
      setFromPage(currentAssignment.fromPage);
      setToPage(currentAssignment.toPage);
    }
  }, [selectedStudentId, curriculum.slug]);

  useEffect(() => {
    setPageInput(String(page));
    setLoadingPage(true);
    const activeStudent = getActiveStudent();
    if (activeStudent && shouldTrackStudentActivity()) {
      recordStudentLearningActivity({
        studentId: activeStudent.id,
        studentName: activeStudent.fullName,
        type: 'open_curriculum_page',
        subjectSlug: curriculum.slug,
        subjectTitle: curriculum.title,
        page,
        href: `/programs/curricula/${curriculum.slug}?page=${page}`,
      });
    }
    const timeout = setTimeout(() => {
      redrawSavedDrawing(page);
      setLoadingPage(false);
    }, 150);
    return () => clearTimeout(timeout);
  }, [page, selectedStudentId, curriculum.slug]);

  function getCanvasCoordinates(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === 'view') return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    const point = getCanvasCoordinates(event);
    lastPointRef.current = point;

    if (!point) return;
    const ctx = getCanvasContext();
    if (!ctx) return;

    ctx.save();
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brush * 4;
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = brush * 3.5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = brush;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.arc(point.x, point.y, (ctx.lineWidth || 4) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || tool === 'view') return;
    const currentPoint = getCanvasCoordinates(event);
    const lastPoint = lastPointRef.current;
    if (!currentPoint || !lastPoint) return;

    const ctx = getCanvasContext();
    if (!ctx) return;

    ctx.save();
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brush * 4;
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = brush * 3.5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = brush;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPoint.x, lastPoint.y);
    ctx.lineTo(currentPoint.x, currentPoint.y);
    ctx.stroke();
    ctx.restore();

    lastPointRef.current = currentPoint;
  }

  function endDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}
    saveCanvasData();
  }

  function saveCanvasData() {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const studentId = getActiveStudentId();
    const dataUrl = canvas.toDataURL('image/png');
    const now = new Date().toISOString();

    upsertDrawing({
      id: drawingId(page),
      studentId: studentId || 'doctor',
      subjectSlug: curriculum.slug,
      page,
      dataUrl,
      updatedAt: now,
    });

    setSavedAt(new Date(now).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
  }

  function clearCurrentPage() {
    const canvas = canvasRef.current;
    const ctx = getCanvasContext();
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const id = drawingId(page);
    const next = readDrawings().filter((item) => item.id !== id);
    writeCloudCache(DRAWINGS_KEY, next);
    setSavedAt('');
    setNotice('تم مسح الرسم من الصفحة.');
    setTimeout(() => setNotice(''), 3000);
  }

  function handleAssignHomework() {
    const student = students.find((s) => s.id === selectedStudentId);
    if (!student) {
      setNotice('اختر طالباً أولاً لإسناد الصفحات.');
      setTimeout(() => setNotice(''), 4000);
      return;
    }

    const cleanFrom = Math.max(1, Math.min(fromPage, curriculum.pageCount));
    const cleanTo = Math.max(cleanFrom, Math.min(toPage, curriculum.pageCount));

    const newAssignment: CurriculumAssignment = {
      id: `assign_${student.id}_${curriculum.slug}`,
      studentId: student.id,
      studentName: student.fullName,
      subjectSlug: curriculum.slug,
      subjectTitle: curriculum.title,
      fromPage: cleanFrom,
      toPage: cleanTo,
      assignedAt: new Date().toISOString(),
    };

    const currentAssignments = readAssignments().filter(
      (item) => !(item.studentId === student.id && item.subjectSlug === curriculum.slug),
    );
    writeAssignments([newAssignment, ...currentAssignments]);
    setAssignment(newAssignment);

    // Send direct notification to parent
    saveMessage({
      studentId: student.id,
      from: 'doctor',
      to: 'parent',
      body: `📚 واجب منزلي جديد لمادة (${curriculum.title}):\nيرجى حل التدريبات والأنشطة من صفحة (${cleanFrom}) إلى صفحة (${cleanTo}) في الكتاب التفاعلي.\nرابط فتح المنهج: https://masarplatform.org/programs/curricula/${curriculum.slug}?page=${cleanFrom}`,
      read: false,
    });

    // Save to homework log
    saveStudentHomeworkLog({
      studentId: student.id,
      title: `واجب ${curriculum.title} (ص ${cleanFrom}-${cleanTo})`,
      subject: curriculum.title,
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      status: 'submitted',
    });

    void import('@/lib/homework').then(({ createHomework }) =>
      createHomework({
        studentId: student.id,
        studentName: student.fullName,
        title: `واجب ${curriculum.title} (ص ${cleanFrom}-${cleanTo})`,
        description: `حل التدريبات والأنشطة من صفحة (${cleanFrom}) إلى صفحة (${cleanTo}) في الكتاب التفاعلي لمادة ${curriculum.title}.`,
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      })
    );

    // In-app notification for Parent
    void createNotification({
      type: 'homework',
      title: `📝 واجب جديد للبطل ${student.fullName}: ${curriculum.title}`,
      body: `تم إسناد صفحات (${cleanFrom} إلى ${cleanTo}) في مادة ${curriculum.title} من قبل د. إسماعيل عيسى. موعد التسليم: ${new Date(Date.now() + 86400000 * 3).toLocaleDateString('ar-SA')}.`,
      link: `/school-parent?student=${student.id}&tab=homework`,
      targetRole: 'parent',
      studentId: student.id,
      studentName: student.fullName,
    });

    // In-app notification for Student
    void createNotification({
      type: 'homework',
      title: `📝 واجب تفاعلي جديد: ${curriculum.title} (ص ${cleanFrom}–${cleanTo})`,
      body: `كلفك د. إسماعيل عيسى بحل الصفحات (${cleanFrom} إلى ${cleanTo}) بالكتاب التفاعلي.`,
      link: `/school-student?tab=homework`,
      targetRole: 'student',
      studentId: student.id,
      studentName: student.fullName,
    });

    setNotice(`✅ تم إسناد صفحات ${cleanFrom} إلى ${cleanTo} في ${curriculum.title} للطالب (${student.fullName}) وإشعار ولي أمره بنجاح!`);
    setTimeout(() => setNotice(''), 6000);
  }

  async function handleAssignToEntireClass() {
    if (!students || students.length === 0) {
      setNotice('لا يوجد طلاب في الفصل حالياً.');
      setTimeout(() => setNotice(''), 4000);
      return;
    }

    const cleanFrom = Math.max(1, Math.min(fromPage, curriculum.pageCount));
    const cleanTo = Math.max(cleanFrom, Math.min(toPage, curriculum.pageCount));
    setIsBroadcasting(true);

    try {
      const now = new Date().toISOString();
      const currentAssignments = readAssignments();
      const newAssignmentsList: CurriculumAssignment[] = [];

      for (const s of students) {
        const item: CurriculumAssignment = {
          id: `assign_${s.id}_${curriculum.slug}`,
          studentId: s.id,
          studentName: s.fullName,
          subjectSlug: curriculum.slug,
          subjectTitle: curriculum.title,
          fromPage: cleanFrom,
          toPage: cleanTo,
          assignedAt: now,
        };
        newAssignmentsList.push(item);

        // Save homework log
        saveStudentHomeworkLog({
          studentId: s.id,
          title: `واجب ${curriculum.title} (ص ${cleanFrom}-${cleanTo})`,
          subject: curriculum.title,
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
          status: 'submitted',
        });
      }

      const assignedIds = new Set(students.map((s) => s.id));
      const remaining = currentAssignments.filter(
        (a) => !(assignedIds.has(a.studentId) && a.subjectSlug === curriculum.slug),
      );
      writeAssignments([...newAssignmentsList, ...remaining]);

      // ── CRITICAL: Also save to 'homework' collection so students can see it ──
      await broadcastHomeworkToParents({
        title: `واجب ${curriculum.title}`,
        description: `حل التدريبات والأنشطة من صفحة (${cleanFrom}) إلى صفحة (${cleanTo}) في الكتاب التفاعلي لمادة ${curriculum.title}.`,
        subject: curriculum.title,
        dueDate: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
        notes: `رابط فتح المنهج: https://masarplatform.org/programs/curricula/${curriculum.slug}?page=${cleanFrom}`,
      });

      setNotice(`📢 تم بنجاح إسناد واجب (${curriculum.title}) من ص ${cleanFrom} إلى ص ${cleanTo} لجميع طلاب الفصل (${students.length} طالب) وإشعار كافة أولياء الأمور! ✓`);
      setTimeout(() => setNotice(''), 7000);
    } catch (err) {
      console.error('Error assigning to class:', err);
    } finally {
      setIsBroadcasting(false);
    }
  }

  function submitStudentWork() {
    const studentId = getActiveStudentId();
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    saveCanvasData();

    // Create a detailed report entry for Dr. Ismail
    const studentDrawings = readDrawings().filter(
      (item) => item.studentId === student.id && item.subjectSlug === curriculum.slug,
    );

    const mediaPayload: Record<string, { type: 'image'; dataUrl: string; label: string; createdAt: string }> = {};
    studentDrawings.forEach((d) => {
      mediaPayload[`curriculum_${curriculum.slug}_p${d.page}`] = {
        type: 'image',
        dataUrl: d.dataUrl,
        label: `${curriculum.title} - صفحة ${d.page}`,
        createdAt: d.updatedAt,
      };
    });

    saveReport({
      studentId: student.id,
      studentName: student.fullName,
      grade: student.grade || curriculum.grade,
      program: `منهج ${curriculum.title}`,
      programColor: curriculum.color,
      date: new Date().toISOString().split('T')[0],
      score: 100,
      status: 'completed',
      type: 'student-assessment-analysis',
      summary: `أنجز الطالب تدريبات ${curriculum.title} (تم إرفاق حلول ${studentDrawings.length} صفحة موثقة).`,
      recommendations: ['مراجعة التدريبات والتعزيز الإيجابي', 'الانتقال إلى صفحات التقييم التالية'],
      answers: studentDrawings.map((d) => ({
        question: `صفحة ${d.page} من كتاب ${curriculum.title}`,
        answer: 'تم حل التدريبات وكتابتها بالقلم التفاعلي على الصفحة',
      })),
      domains: [{ name: curriculum.title, score: 100, note: 'حل تدريبات المنهج التفاعلي' }],
      media: mediaPayload,
    });

    setNotice('تم تسليم حلول الصفحات بنجاح لدكتور إسماعيل! ✓');
    setTimeout(() => setNotice(''), 5000);
  }

  function handleJumpPage(e: React.FormEvent) {
    e.preventDefault();
    const target = parseInt(pageInput, 10);
    if (!isNaN(target) && target >= 1 && target <= curriculum.pageCount) {
      setPage(target);
    }
  }

  const isStaff = sessionRole === 'doctor' || sessionRole === 'specialist' || sessionRole === 'teacher';
  const isAssignedPage = assignment && page >= assignment.fromPage && page <= assignment.toPage;

  return (
    <div
      ref={containerRef}
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6 transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 overflow-y-auto bg-slate-900/95 p-4' : ''
      }`}
      dir="rtl"
    >
      {/* ══ HEADER BAR ══ */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <span
            className="grid h-12 w-12 place-items-center rounded-xl text-white shadow-sm font-black text-xl"
            style={{ backgroundColor: curriculum.color }}
          >
            <BookOpen size={24} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-950 md:text-2xl">{curriculum.title}</h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                {curriculum.grade}
              </span>
            </div>
            <p className="mt-0.5 text-xs font-bold text-slate-500">
              {curriculum.subtitle} · {curriculum.term} · إجمالي {curriculum.pageCount} صفحة
            </p>
          </div>
        </div>

        {/* Notice Message */}
        {notice && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2 text-xs font-black text-emerald-800 animate-fade-in shadow-xs">
            {notice}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {sessionRole === 'student' && (
            <button
              onClick={submitStudentWork}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 text-xs font-black shadow-sm transition"
            >
              <Send size={15} />
              تسليم الحل للدكتور
            </button>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            <Printer size={15} />
            طباعة الصفحة
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            {isFullscreen ? 'تصغير' : 'ملء الشاشة'}
          </button>
        </div>
      </div>

      {/* ══ DOCTOR ASSIGNMENT / STUDENT HOMEWORK BANNER ══ */}
      {isStaff ? (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 p-4 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Top row / Select student & page range */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-blue-700" />
                <span className="text-xs font-black text-blue-950">إسناد صفحات المنهج كواجب:</span>
              </div>

              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 outline-none focus:border-blue-600 shadow-2xs"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.grade || 'الصف الأول'})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1.5 text-xs font-black text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                <span>من ص</span>
                <input
                  type="number"
                  min={1}
                  max={curriculum.pageCount}
                  value={fromPage}
                  onChange={(e) => setFromPage(parseInt(e.target.value, 10) || 1)}
                  className="w-14 rounded-lg bg-slate-50 border border-slate-300 px-1.5 py-0.5 text-center font-black text-slate-900 outline-none focus:border-blue-600"
                />
                <span>إلى ص</span>
                <input
                  type="number"
                  min={fromPage}
                  max={curriculum.pageCount}
                  value={toPage}
                  onChange={(e) => setToPage(parseInt(e.target.value, 10) || fromPage)}
                  className="w-14 rounded-lg bg-slate-50 border border-slate-300 px-1.5 py-0.5 text-center font-black text-slate-900 outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Action Buttons: Single Student + Entire Class */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleAssignHomework}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white px-4 py-2.5 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
                title="إسناد الواجب للطالب المحدد فقط"
              >
                <ClipboardCheck size={16} />
                <span>إسناد للطالب المحدد</span>
              </button>

              <button
                type="button"
                onClick={handleAssignToEntireClass}
                disabled={isBroadcasting || students.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-black shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50 ring-2 ring-emerald-500/30"
                title="إسناد الواجب لجميع طلاب الفصل وإشعار أولياء الأمور فوراً"
              >
                {isBroadcasting ? <Loader2 size={16} className="animate-spin" /> : <Megaphone size={16} />}
                <span>إسناد لجميع طلاب الفصل وإخطار أولياء الأمور 📢</span>
              </button>
            </div>
          </div>

          {assignment && (
            <p className="mt-2.5 text-[11px] font-bold text-blue-800 flex items-center gap-1.5 border-t border-blue-200/60 pt-2">
              <span>📌</span>
              <span>آخر واجب مسند لـ ({assignment.studentName}): من صفحة {assignment.fromPage} إلى صفحة {assignment.toPage}</span>
            </p>
          )}
        </div>
      ) : assignment ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-700" />
            <span className="text-xs font-black text-amber-950">
              واجب مطلوب من د. إسماعيل: حل الصفحات من ({assignment.fromPage}) إلى ({assignment.toPage})
            </span>
          </div>
          <button
            onClick={() => setPage(assignment.fromPage)}
            className="rounded-lg bg-amber-400 hover:bg-amber-300 text-indigo-950 px-3 py-1.5 text-xs font-black shadow-xs transition cursor-pointer"
          >
            انتقل للواجب
          </button>
        </div>
      ) : null}

      {/* ══ TOOLBAR & CHAPTERS QUICK NAV ══ */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
        {/* Drawing Tools */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTool('pen')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black transition cursor-pointer ${
              tool === 'pen' ? 'bg-slate-950 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <PenLine size={15} />
            القلم
          </button>

          <button
            type="button"
            onClick={() => setTool('highlighter')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black transition cursor-pointer ${
              tool === 'highlighter' ? 'bg-amber-400 text-slate-950 font-black shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Highlighter size={15} />
            تظليل
          </button>

          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black transition cursor-pointer ${
              tool === 'eraser' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Eraser size={15} />
            الممحاة
          </button>

          {/* Brush Sizes */}
          <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1">
            <span className="text-[10px] font-bold text-slate-400 ml-1">الحجم:</span>
            {[2, 4, 8, 14].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setBrush(size)}
                className={`h-7 w-7 rounded-lg text-xs font-black transition cursor-pointer ${
                  brush === size ? 'bg-slate-900 text-white shadow-xs' : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          {/* Color Palette */}
          <div className="flex items-center gap-1.5 border-r border-slate-200 pr-2 mr-1">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => {
                  setColor(c.value);
                  if (tool === 'eraser' || tool === 'view') setTool('pen');
                }}
                className={`h-6 w-6 rounded-full transition-transform cursor-pointer ${
                  color === c.value && tool !== 'eraser' ? 'scale-125 ring-2 ring-offset-1 ring-slate-900' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c.value }}
                title={c.name}
              />
            ))}
          </div>

          {/* Clear Page Canvas */}
          <button
            type="button"
            onClick={clearCurrentPage}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-rose-700 cursor-pointer"
            title="مسح كل ما رُسم في هذه الصفحة"
          >
            <RotateCcw size={14} />
            مسح الكل
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(60, z - 15))}
            className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 grid place-items-center cursor-pointer"
            title="تصغير"
          >
            <ZoomOut size={15} />
          </button>
          <span className="text-xs font-black text-slate-700 min-w-10 text-center">{zoom}%</span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(160, z + 15))}
            className="h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 grid place-items-center cursor-pointer"
            title="تكبير"
          >
            <ZoomIn size={15} />
          </button>
        </div>
      </div>

      {/* ══ CHAPTERS / UNITS QUICK JUMP PILLS ══ */}
      {curriculum.units && curriculum.units.length > 0 && (
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="shrink-0 font-black text-slate-500 text-[11px]">الفهرس السريع:</span>
          {curriculum.units.map((unit) => (
            <button
              key={unit.title}
              onClick={() => setPage(unit.fromPage)}
              className={`shrink-0 rounded-lg px-3 py-1.5 font-bold transition cursor-pointer ${
                page >= unit.fromPage && page <= unit.toPage
                  ? 'bg-slate-900 text-white font-black'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {unit.title} (ص {unit.fromPage})
            </button>
          ))}
        </div>
      )}

      {/* ══ INTERACTIVE PAGE SLIDER (سلايدر التصفح السريع المباشر لجميع الصفحات) ══ */}
      <div className="mt-3.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-700 font-black text-xs">
              📄
            </span>
            <div>
              <h4 className="text-xs font-black text-slate-900">سلايدر التصفح والانتقال السريع لصفحات الكتاب</h4>
              <p className="text-[10px] font-bold text-slate-400">اسحب المؤشر للتنقل الفوري بين جميع الصفحات (1 إلى {curriculum.pageCount})</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 text-xs font-black text-slate-800 font-mono">
            <span>صفحة:</span>
            <span className="text-teal-700 text-sm font-black">{page}</span>
            <span className="text-slate-400">/ {curriculum.pageCount}</span>
            <span className="text-[10px] text-teal-700 bg-teal-100/70 px-1.5 py-0.5 rounded-md font-bold">
              ({Math.round((page / curriculum.pageCount) * 100)}%)
            </span>
          </div>
        </div>

        {/* The Range Slider */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setPage(1)}
            disabled={page <= 1}
            className="shrink-0 rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] font-black text-slate-700 disabled:opacity-30 transition cursor-pointer"
            title="الانتقال لصفحة 1"
          >
            بداية (1)
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 10))}
            disabled={page <= 1}
            className="shrink-0 rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] font-black text-slate-700 disabled:opacity-30 transition cursor-pointer font-mono"
            title="رجوع 10 صفحات"
          >
            -10
          </button>

          <input
            type="range"
            min={1}
            max={curriculum.pageCount}
            step={1}
            value={page}
            onChange={(e) => setPage(parseInt(e.target.value, 10) || 1)}
            className="flex-1 h-3 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600 hover:accent-teal-700 transition"
          />

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(curriculum.pageCount, p + 10))}
            disabled={page >= curriculum.pageCount}
            className="shrink-0 rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] font-black text-slate-700 disabled:opacity-30 transition cursor-pointer font-mono"
            title="تقدم 10 صفحات"
          >
            +10
          </button>
          <button
            type="button"
            onClick={() => setPage(curriculum.pageCount)}
            disabled={page >= curriculum.pageCount}
            className="shrink-0 rounded-lg bg-slate-100 hover:bg-slate-200 px-2 py-1 text-[11px] font-black text-slate-700 disabled:opacity-30 transition cursor-pointer"
            title={`الانتقال لآخر صفحة (${curriculum.pageCount})`}
          >
            نهاية ({curriculum.pageCount})
          </button>
        </div>
      </div>

      {/* ══ MAIN INTERACTIVE CANVAS & BOOK PAGE ══ */}
      <div className="mt-4 flex flex-col items-center justify-center overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-2 md:p-6 min-h-[600px]">
        {/* Page status indicators */}
        <div className="mb-3 flex items-center justify-between w-full max-w-3xl px-2 text-xs font-bold text-slate-600">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-white px-2.5 py-1 font-black text-slate-900 border border-slate-200">
              صفحة {page} من {curriculum.pageCount}
            </span>
            {isAssignedPage && (
              <span className="rounded-md bg-amber-400 text-indigo-950 font-black px-2 py-0.5 shadow-xs">
                ★ واجب مطلوب
              </span>
            )}
          </div>
          {savedAt && (
            <span className="text-emerald-700 font-bold">
              ✓ تم الحفظ تلقائياً ({savedAt})
            </span>
          )}
        </div>

        {/* Workbook Interactive Surface */}
        <div
          className="relative inline-block overflow-hidden rounded-xl border-2 border-slate-300 bg-white shadow-xl transition-transform"
          style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
        >
          {/* Base Book Page Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={pageSrc(page)}
            alt={`صفحة ${page} من كتاب ${curriculum.title}`}
            onLoad={syncCanvasSize}
            className="block max-h-[85vh] w-auto max-w-full object-contain pointer-events-none select-none"
            loading="eager"
          />

          {/* Interactive Drawing Overlay Canvas */}
          <canvas
            ref={canvasRef}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={endDrawing}
            onPointerCancel={endDrawing}
            className={`absolute inset-0 h-full w-full touch-none ${
              tool === 'view' ? 'cursor-default' : tool === 'eraser' ? 'cursor-crosshair' : 'cursor-crosshair'
            }`}
          />
        </div>
      </div>

      {/* ══ BOTTOM NAVIGATION BAR ══ */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        {/* Next / Prev Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-xs cursor-pointer"
          >
            <ChevronRight size={16} />
            الصفحة السابقة
          </button>

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(curriculum.pageCount, p + 1))}
            disabled={page >= curriculum.pageCount}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-40 shadow-xs cursor-pointer"
          >
            الصفحة التالية
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Direct Page Jump Form */}
        <form onSubmit={handleJumpPage} className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">انتقال لصفحة:</span>
          <input
            type="number"
            min={1}
            max={curriculum.pageCount}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            className="w-16 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-xs font-black text-slate-950 outline-none focus:border-blue-700"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-black text-slate-800 hover:bg-slate-300 cursor-pointer"
          >
            انتقال
          </button>
        </form>
      </div>
    </div>
  );
}
