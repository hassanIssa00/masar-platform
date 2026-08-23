'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ClipboardCheck, Download, Eraser, PenLine, RotateCcw, Save, Send, Users } from 'lucide-react';
import { getSession, getStudents, saveReport, type StudentRecord } from '@/lib/localDb';
import { readCloudCache, syncDocToCloud, writeCloudCache } from '@/lib/firestoreSync';

const PAGE_COUNT = 81;
const STORAGE_PREFIX = 'masar.simpleSpellingWorkbook.v1';
const ASSIGNMENTS_KEY = 'masar.simpleSpellingAssignments.v1';
const DRAWINGS_KEY = 'masar.simpleSpellingDrawings.v1';

type Tool = 'view' | 'pen' | 'eraser';
type Assignment = {
  studentId: string;
  studentName: string;
  fromPage: number;
  toPage: number;
  assignedAt: string;
};
type DrawingRecord = {
  id: string;
  studentId: string;
  page: number;
  dataUrl: string;
  updatedAt: string;
};

function pageSrc(page: number) {
  return `/resources/simple-spelling-pages/page-${String(page).padStart(2, '0')}.jpg`;
}

export default function SimpleSpellingWorkbook() {
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [page, setPage] = useState(1);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState('#0f172a');
  const [brush, setBrush] = useState(5);
  const [savedAt, setSavedAt] = useState('');
  const [sessionRole, setSessionRole] = useState('');
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [fromPage, setFromPage] = useState(1);
  const [toPage, setToPage] = useState(2);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [notice, setNotice] = useState('');

  function readAssignments(): Assignment[] {
    return readCloudCache<Assignment>(ASSIGNMENTS_KEY);
  }

  function writeAssignments(items: Assignment[]) {
    writeCloudCache(ASSIGNMENTS_KEY, items);
    items.forEach((item) => {
      void syncDocToCloud('simple_spelling_assignments', item.studentId, item);
    });
  }

  function getActiveStudentId() {
    const session = getSession();
    const allStudents = getStudents();

    if (session?.role === 'student') {
      return (
        allStudents.find((student) =>
          student.fullName === session.name ||
          student.parentPhone === session.phone ||
          student.parentPhone === session.email ||
          student.id === session.id,
        )?.id ?? ''
      );
    }

    return selectedStudentId || allStudents[0]?.id || '';
  }

  function drawingId(pageNumber = page) {
    return `${getActiveStudentId() || 'doctor'}-${pageNumber}`;
  }

  function readDrawings() {
    return readCloudCache<DrawingRecord>(DRAWINGS_KEY);
  }

  function readDrawing(pageNumber = page) {
    const id = drawingId(pageNumber);
    return readDrawings().find((item) => item.id === id);
  }

  function upsertDrawing(record: DrawingRecord) {
    const next = [record, ...readDrawings().filter((item) => item.id !== record.id)];
    writeCloudCache(DRAWINGS_KEY, next);
    void syncDocToCloud('simple_spelling_drawings', record.id, record);
  }

  function getCanvasContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }

  function persistCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const studentId = getActiveStudentId();
      const record: DrawingRecord = {
        id: drawingId(page),
        studentId: studentId || 'doctor',
        page,
        dataUrl: canvas.toDataURL('image/png'),
        updatedAt: new Date().toISOString(),
      };
      upsertDrawing(record);
      setSavedAt(new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }));
    } catch {}
  }

  function fitCanvasToImage() {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;

    const rect = image.getBoundingClientRect();
    const nextWidth = Math.max(1, Math.round(rect.width));
    const nextHeight = Math.max(1, Math.round(rect.height));

    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    try {
      const saved = readDrawing(page)?.dataUrl;
      if (!saved) return;
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = saved;
    } catch {}
  }

  useEffect(() => {
    const session = getSession();
    const allStudents = getStudents();
    const currentStudentId =
      session?.role === 'student'
        ? allStudents.find((student) =>
            student.fullName === session.name ||
            student.parentPhone === session.phone ||
            student.parentPhone === session.email ||
            student.id === session.id,
          )?.id ?? ''
        : '';
    const currentAssignment = readAssignments().find((item) => item.studentId === currentStudentId) ?? null;

    setSessionRole(session?.role ?? '');
    setStudents(allStudents);
    setSelectedStudentId(currentStudentId || allStudents[0]?.id || '');
    setAssignment(currentAssignment);
    if (currentAssignment) {
      setPage(currentAssignment.fromPage);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(fitCanvasToImage);
    const onResize = () => fitCanvasToImage();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [page]);

  const minPage = assignment && sessionRole === 'student' ? assignment.fromPage : 1;
  const maxPage = assignment && sessionRole === 'student' ? assignment.toPage : PAGE_COUNT;

  function goToPage(nextPage: number) {
    setPage(Math.max(minPage, Math.min(maxPage, nextPage)));
  }

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function drawTo(point: { x: number; y: number }) {
    const ctx = getCanvasContext();
    const last = lastPointRef.current;
    if (!ctx || !last) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = tool === 'eraser' ? brush * 3 : brush;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    ctx.restore();
    lastPointRef.current = point;
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === 'view') return;
    const point = pointFromEvent(event);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    lastPointRef.current = point;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || tool === 'view') return;
    const point = pointFromEvent(event);
    if (!point) return;
    drawTo(point);
  }

  function finishDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}
    persistCanvas();
  }

  function clearPage() {
    const canvas = canvasRef.current;
    const ctx = getCanvasContext();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const id = drawingId(page);
    writeCloudCache(DRAWINGS_KEY, readDrawings().filter((item) => item.id !== id));
    void syncDocToCloud('simple_spelling_drawings', id, {
      id,
      studentId: getActiveStudentId() || 'doctor',
      page,
      dataUrl: '',
      clearedAt: new Date().toISOString(),
    });
    setSavedAt('');
  }

  function downloadCurrentPage() {
    const image = imageRef.current;
    const canvas = canvasRef.current;
    if (!image || !canvas) return;

    const output = document.createElement('canvas');
    output.width = image.naturalWidth;
    output.height = image.naturalHeight;
    const ctx = output.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, output.width, output.height);
    ctx.drawImage(image, 0, 0, output.width, output.height);
    ctx.drawImage(canvas, 0, 0, output.width, output.height);

    const link = document.createElement('a');
    link.download = `simple-spelling-page-${String(page).padStart(2, '0')}.png`;
    link.href = output.toDataURL('image/png');
    link.click();
  }

  function saveAssignment() {
    const student = students.find((item) => item.id === selectedStudentId);
    if (!student) {
      setNotice('اختر طالباً أولاً.');
      return;
    }
    const orderedFrom = Math.max(1, Math.min(fromPage, toPage));
    const orderedTo = Math.min(PAGE_COUNT, Math.max(fromPage, toPage));
    const nextAssignment: Assignment = {
      studentId: student.id,
      studentName: student.fullName,
      fromPage: orderedFrom,
      toPage: orderedTo,
      assignedAt: new Date().toISOString(),
    };
    writeAssignments([nextAssignment, ...readAssignments().filter((item) => item.studentId !== student.id)]);
    setNotice(`تم إرسال صفحات ${orderedFrom} إلى ${orderedTo} للطالب ${student.fullName}.`);
  }

  function submitAssignedPages() {
    persistCanvas();
    const currentStudentId = getActiveStudentId();
    const student = getStudents().find((item) => item.id === currentStudentId);
    if (!student || !assignment) {
      setNotice('لا يوجد تكليف صفحات مرتبط بهذا الطالب حالياً.');
      return;
    }

    const pages = Array.from({ length: assignment.toPage - assignment.fromPage + 1 }, (_, index) => assignment.fromPage + index);
    saveReport({
      studentId: student.id,
      studentName: student.fullName,
      grade: student.grade,
      program: 'تسليم صفحات التهجي البسيط',
      programColor: '#0f766e',
      score: 100,
      status: 'pending',
      type: 'student-assessment-answers',
      summary: `أرسل الطالب صفحات التهجي البسيط من ${assignment.fromPage} إلى ${assignment.toPage} للمراجعة.`,
      recommendations: ['مراجعة الكتابة فوق الصفحات وتحديد الحروف التي تحتاج إعادة تدريب.', 'إرسال ملاحظة قصيرة لولي الأمر بعد التصحيح.'],
      answers: pages.map((pageNumber) => ({
        question: `صفحة ${pageNumber} من مذكرة التهجي البسيط`,
        answer: readDrawing(pageNumber)?.dataUrl ? 'تم حل الصفحة وإرسالها للمراجعة' : 'لم يتم العثور على كتابة محفوظة على الصفحة',
      })),
      domains: [],
    });
    setNotice('تم إرسال الصفحات إلى لوحة د. إسماعيل للمراجعة.');
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm" dir="rtl">
      {(sessionRole === 'doctor' || sessionRole === 'specialist' || sessionRole === 'teacher') && (
        <div className="border-b border-teal-100 bg-teal-50/80 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-black text-teal-900">
                <Users size={17} />
                تكليف صفحات التهجي البسيط
              </p>
              <p className="mt-1 text-xs font-bold text-teal-800">حدد الصفحات التي تظهر للطالب فقط، ثم يحلها ويرسلها للمراجعة.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_110px_110px_auto]">
              <select value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} className="rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-black text-slate-900">
                {students.map((student) => <option key={student.id} value={student.id}>{student.fullName} - {student.grade}</option>)}
              </select>
              <input type="number" min={1} max={PAGE_COUNT} value={fromPage} onChange={(event) => setFromPage(Number(event.target.value))} className="rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-black" />
              <input type="number" min={1} max={PAGE_COUNT} value={toPage} onChange={(event) => setToPage(Number(event.target.value))} className="rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-black" />
              <button type="button" onClick={saveAssignment} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-xs font-black text-white">
                <ClipboardCheck size={15} />
                إرسال التكليف
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-3 backdrop-blur">
        {assignment && sessionRole === 'student' && (
          <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-950">
            الصفحات المكلف بها: من صفحة {assignment.fromPage} إلى صفحة {assignment.toPage}. بعد الانتهاء اضغط إرسال الصفحات للدكتور.
          </div>
        )}
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page === minPage}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-800 disabled:opacity-40"
            >
              <ChevronRight size={16} />
              السابق
            </button>
            <div className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-black text-slate-900">
              صفحة {page} من {PAGE_COUNT}
            </div>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page === maxPage}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-800 disabled:opacity-40"
            >
              التالي
              <ChevronLeft size={16} />
            </button>
            <input
              type="range"
              min={minPage}
              max={maxPage}
              value={page}
              onChange={(event) => goToPage(Number(event.target.value))}
              className="w-40 accent-teal-700"
              aria-label="اختيار صفحة المذكرة"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setTool('view')}
              className={`rounded-lg px-3 py-2 text-xs font-black ${tool === 'view' ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              تصفح
            </button>
            <button
              type="button"
              onClick={() => setTool('pen')}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-black ${tool === 'pen' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              <PenLine size={15} />
              كتابة
            </button>
            <button
              type="button"
              onClick={() => setTool('eraser')}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-black ${tool === 'eraser' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              <Eraser size={15} />
              مسح
            </button>
            <input
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-9 w-10 rounded-lg border border-slate-200 bg-white p-1"
              aria-label="لون القلم"
            />
            <input
              type="range"
              min={2}
              max={16}
              value={brush}
              onChange={(event) => setBrush(Number(event.target.value))}
              className="w-28 accent-teal-700"
              aria-label="حجم القلم"
            />
            <button type="button" onClick={persistCanvas} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-black text-white">
              <Save size={15} />
              حفظ
            </button>
            <button type="button" onClick={clearPage} className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">
              <RotateCcw size={15} />
              مسح الصفحة
            </button>
            <button type="button" onClick={downloadCurrentPage} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-800">
              <Download size={15} />
              تنزيل الصفحة
            </button>
            {assignment && sessionRole === 'student' && (
              <button type="button" onClick={submitAssignedPages} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-xs font-black text-white">
                <Send size={15} />
                إرسال الصفحات للدكتور
              </button>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs font-bold text-slate-500">
          اختر كتابة ثم اكتب بالقلم أو باللمس فوق ورقة التدريب. في وضع تصفح يمكنك تحريك الصفحة بدون رسم.
          {savedAt ? <span className="mr-2 text-emerald-700">آخر حفظ: {savedAt}</span> : null}
          {notice ? <span className="mr-2 text-teal-700">{notice}</span> : null}
        </p>
      </div>

      <div className="bg-slate-100 p-3 sm:p-5">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="relative">
            <img
              ref={imageRef}
              src={pageSrc(page)}
              alt={`صفحة ${page} من مذكرة التهجي البسيط`}
              className="block h-auto w-full select-none"
              draggable={false}
              onLoad={fitCanvasToImage}
            />
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 h-full w-full ${tool === 'view' ? 'pointer-events-none' : 'touch-none cursor-crosshair'}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrawing}
              onPointerCancel={finishDrawing}
              onPointerLeave={finishDrawing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
