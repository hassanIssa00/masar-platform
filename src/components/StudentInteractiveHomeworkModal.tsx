'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Highlighter,
  Loader2,
  PenLine,
  RotateCcw,
  Save,
  Send,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  Camera,
  FileText,
  Mic,
  Square,
  Upload,
} from 'lucide-react';
import {
  parseHomeworkCurriculum,
  getCurriculumPageImageUrl,
  type ParsedCurriculumHw,
} from '@/lib/curriculumHomeworkHelper';
import { readCloudCache, syncDocToCloud, writeCloudCache } from '@/lib/firestoreSync';
import { saveStudentHomeworkLog } from '@/lib/classDb';
import { updateHomeworkStatus, HomeworkRecord } from '@/lib/homework';
import { createNotification } from '@/lib/notifications';
import { saveMessage } from '@/lib/cloudStore';

interface Props {
  hw: HomeworkRecord;
  studentId: string;
  studentName: string;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const DRAWINGS_KEY = 'masar.curriculumDrawings.v1';

type Tool = 'pen' | 'highlighter' | 'eraser';

const COLOR_PALETTE = [
  { name: 'أسود', value: '#0f172a' },
  { name: 'أزرق', value: '#1d4ed8' },
  { name: 'أحمر', value: '#dc2626' },
  { name: 'أخضر', value: '#059669' },
  { name: 'بنفسجي', value: '#7c3aed' },
  { name: 'ذهبي', value: '#d97706' },
];

export default function StudentInteractiveHomeworkModal({
  hw,
  studentId,
  studentName,
  onClose,
  onSubmitSuccess,
}: Props) {
  const parsed: ParsedCurriculumHw | null = parseHomeworkCurriculum(hw);

  // If not a curriculum pages homework, fallback to classic submission (text/image/audio)
  const isCurriculumHw = Boolean(parsed);

  const [currentPage, setCurrentPage] = useState<number>(parsed?.fromPage || 1);
  const [tool, setTool] = useState<Tool>('pen');
  const [color, setColor] = useState<string>('#1d4ed8');
  const [brushSize, setBrushSize] = useState<number>(4);
  const [zoom, setZoom] = useState<number>(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');

  // Classic submission fallback state
  const [subTab, setSubTab] = useState<'text' | 'image' | 'audio'>('text');
  const [textAnswer, setTextAnswer] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  // Drawing persistence helper
  const getDrawingKey = (pageNum: number) => `${studentId || 'student'}_${parsed?.subjectSlug || 'curriculum'}_p${pageNum}`;

  // Redraw saved drawing on page change
  useEffect(() => {
    if (!isCurriculumHw) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allDrawings = readCloudCache<any>(DRAWINGS_KEY);
    const key = getDrawingKey(currentPage);
    const saved = allDrawings.find((d: any) => d.id === key || (d.studentId === studentId && d.subjectSlug === parsed?.subjectSlug && Number(d.page) === Number(currentPage)));

    if (saved && saved.dataUrl) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = saved.dataUrl;
    }
  }, [currentPage, isCurriculumHw, studentId, parsed?.subjectSlug]);

  // Coordinate mapper for canvas
  const getCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const pt = getCoords(e);
    lastPointRef.current = pt;
    if (!pt) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 4;
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = brushSize * 3.5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = brushSize;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, (ctx.lineWidth || 4) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const pt = getCoords(e);
    const last = lastPointRef.current;
    if (!pt || !last) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = brushSize * 4;
    } else if (tool === 'highlighter') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = brushSize * 3.5;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = brushSize;
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
    ctx.restore();

    lastPointRef.current = pt;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    saveCurrentPageDrawing();
  };

  const saveCurrentPageDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas || !parsed) return;
    const dataUrl = canvas.toDataURL('image/png');
    const key = getDrawingKey(currentPage);
    const now = new Date().toISOString();

    const record = {
      id: key,
      studentId,
      subjectSlug: parsed.subjectSlug,
      page: currentPage,
      dataUrl,
      updatedAt: now,
    };

    const current = readCloudCache<any>(DRAWINGS_KEY);
    const updated = [record, ...current.filter((d: any) => d.id !== key)];
    writeCloudCache(DRAWINGS_KEY, updated);
    void syncDocToCloud('curriculum_drawings', key, record);

    setSavedNotice('تم حفظ الحل تلقائياً ✓');
    setTimeout(() => setSavedNotice(''), 2500);
  };

  const handleClearPage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !parsed) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const key = getDrawingKey(currentPage);
    const current = readCloudCache<any>(DRAWINGS_KEY);
    const updated = current.filter((d: any) => d.id !== key);
    writeCloudCache(DRAWINGS_KEY, updated);
  };

  // Submit solved homework to Dr. Ismail
  const handleSubmitHomework = async () => {
    setIsSubmitting(true);
    try {
      if (isCurriculumHw && parsed) {
        saveCurrentPageDrawing();

        // 1. Mark status as submitted
        updateHomeworkStatus(hw.id, 'submitted', 'تم الحل بالقلم التفاعلي على صفحات الكتاب');

        // 2. Save to homework log
        saveStudentHomeworkLog({
          studentId,
          title: hw.title,
          subject: parsed.subjectTitle,
          dueDate: hw.dueDate,
          status: 'submitted',
          teacherFeedback: 'تم التسليم من الطالب وجاري مراجعة الحل.',
        });

        // 3. Notify Doctor
        void createNotification({
          type: 'homework',
          title: `📬 تسليم واجب جديد: ${studentName}`,
          body: `قام الطالب البطل ${studentName} بحل وتسليم واجب ${parsed.subjectTitle} (ص ${parsed.fromPage}–${parsed.toPage}) على الكتاب التفاعلي.`,
          link: `/branches/ikhlas-jeddah`,
          targetRole: 'doctor',
          studentId,
          studentName,
        });

        // 4. Confirmation Notification to Parent
        void createNotification({
          type: 'homework',
          title: `✅ تم تسليم واجب: ${parsed.subjectTitle}`,
          body: `قام ابنكم البطل ${studentName} بحل وتسليم واجب ${parsed.subjectTitle} (ص ${parsed.fromPage}–${parsed.toPage}) بنجاح!`,
          link: `/school-parent?tab=homework`,
          targetRole: 'parent',
          studentId,
          studentName,
        });

        // 5. Send Message to Doctor
        saveMessage({
          studentId,
          from: 'student',
          to: 'doctor',
          body: `✍️ قام الطالب (${studentName}) بحل واجب مادة (${parsed.subjectTitle}) صفحات ${parsed.fromPage} إلى ${parsed.toPage} وتسليمه للمراجعة والتصحيح.`,
          read: false,
        });
      } else {
        // Classic submission
        const answerPayload = textAnswer || imagePreview || audioURL || 'تم التسليم';
        updateHomeworkStatus(hw.id, 'submitted', answerPayload);

        saveStudentHomeworkLog({
          studentId,
          title: hw.title,
          subject: 'الواجب المنزلي',
          dueDate: hw.dueDate,
          status: 'submitted',
        });

        // Notify Doctor
        void createNotification({
          type: 'homework',
          title: `📬 تسليم واجب: ${studentName}`,
          body: `سلّم الطالب ${studentName} واجب: ${hw.title}`,
          link: `/branches/ikhlas-jeddah`,
          targetRole: 'doctor',
          studentId,
          studentName,
        });

        // Confirmation to Parent
        void createNotification({
          type: 'homework',
          title: `✅ تم تسليم الواجب: ${hw.title}`,
          body: `سلّم ابنكم البطل ${studentName} واجب: ${hw.title} بنجاح!`,
          link: `/school-parent?tab=homework`,
          targetRole: 'parent',
          studentId,
          studentName,
        });
      }

      setSubmittedSuccess(true);
      setTimeout(() => {
        onSubmitSuccess();
      }, 2500);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تسليم الواجب.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto" dir="rtl">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] overflow-hidden animate-scale-in">
        
        {/* ── TOP HEADER ── */}
        <div className="p-4 bg-gradient-to-l from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-teal-800/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-teal-600/30 border border-teal-400/40 flex items-center justify-center text-xl shrink-0">
              ✏️
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-teal-500/20 text-teal-300 font-black px-2.5 py-0.5 rounded-lg border border-teal-400/30">
                  {parsed?.subjectTitle || 'واجب مدرسي'}
                </span>
                {parsed && (
                  <span className="text-xs text-amber-300 font-black">
                    صفحات: {parsed.fromPage} – {parsed.toPage}
                  </span>
                )}
              </div>
              <h3 className="font-black text-sm text-white mt-0.5 truncate">{hw.title}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* ── SUCCESS BANNER ON SUBMIT ── */}
        {submittedSuccess ? (
          <div className="p-12 text-center space-y-4 bg-emerald-50">
            <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-300 text-emerald-600 flex items-center justify-center text-4xl mx-auto animate-bounce shadow-md">
              🎉
            </div>
            <h3 className="text-xl font-black text-emerald-950">
              أحسنت يا بطل! تم تسليم الواجب بنجاح! 🚀
            </h3>
            <p className="text-xs font-bold text-emerald-800 max-w-sm mx-auto leading-relaxed">
              وصل حلك وتعديلاتك على الكتاب إلى د. إسماعيل عيسى، وسيتم مراجعته ورصد درجتك قريباً بإذن الله!
            </p>
          </div>
        ) : isCurriculumHw && parsed ? (
          /* ── INTERACTIVE WORKBOOK SOLVER ── */
          <>
            {/* Toolbar: Pen, Highlighter, Eraser, Colors */}
            <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap text-xs">
              {/* Tools */}
              <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
                <button
                  type="button"
                  onClick={() => setTool('pen')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-black transition cursor-pointer ${
                    tool === 'pen' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <PenLine size={14} /> <span>قلم</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTool('highlighter')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-black transition cursor-pointer ${
                    tool === 'highlighter' ? 'bg-amber-400 text-slate-950 shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Highlighter size={14} /> <span>تحديد</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTool('eraser')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl font-black transition cursor-pointer ${
                    tool === 'eraser' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Eraser size={14} /> <span>ممحاة</span>
                </button>
              </div>

              {/* Color Palette */}
              {tool !== 'eraser' && (
                <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setColor(c.value)}
                      style={{ backgroundColor: c.value }}
                      className={`w-6 h-6 rounded-full transition-all cursor-pointer ${
                        color === c.value ? 'ring-2 ring-offset-2 ring-teal-600 scale-110 shadow-sm' : 'opacity-80 hover:opacity-100'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              )}

              {/* Clear Page & Zoom */}
              <div className="flex items-center gap-2 mr-auto">
                {savedNotice && (
                  <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md animate-fade-in">
                    {savedNotice}
                  </span>
                )}

                <button
                  type="button"
                  onClick={handleClearPage}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-300 transition text-xs font-bold shadow-xs cursor-pointer"
                  title="مسح كتابات هذه الصفحة"
                >
                  <RotateCcw size={13} />
                  <span className="hidden sm:inline">مسح الصفحة</span>
                </button>

                <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <button onClick={() => setZoom((z) => Math.min(180, z + 15))} className="p-1.5 hover:bg-slate-100 text-slate-700 transition">
                    <ZoomIn size={14} />
                  </button>
                  <span className="text-[11px] font-mono px-2 text-slate-600">{zoom}%</span>
                  <button onClick={() => setZoom((z) => Math.max(70, z - 15))} className="p-1.5 hover:bg-slate-100 text-slate-700 transition">
                    <ZoomOut size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Page Navigator (ONLY ASSIGNED PAGES) */}
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-700 shrink-0 ml-1">اختر الصفحة للحل:</span>
                {parsed.pagesList.map((pageNum) => {
                  const isSelected = pageNum === currentPage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer border ${
                        isSelected
                          ? 'bg-teal-600 border-teal-700 text-white shadow-sm scale-105'
                          : 'bg-white border-slate-300 text-slate-700 hover:bg-teal-50 hover:border-teal-300'
                      }`}
                    >
                      ص {pageNum}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const idx = parsed.pagesList.indexOf(currentPage);
                    if (idx > 0) setCurrentPage(parsed.pagesList[idx - 1]);
                  }}
                  disabled={parsed.pagesList.indexOf(currentPage) === 0}
                  className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={14} className="inline ml-1" /> السابق
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idx = parsed.pagesList.indexOf(currentPage);
                    if (idx < parsed.pagesList.length - 1) setCurrentPage(parsed.pagesList[idx + 1]);
                  }}
                  disabled={parsed.pagesList.indexOf(currentPage) === parsed.pagesList.length - 1}
                  className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
                >
                  التالي <ChevronLeft size={14} className="inline mr-1" />
                </button>
              </div>
            </div>

            {/* Interactive Canvas Area */}
            <div className="flex-1 overflow-auto bg-slate-900 p-4 sm:p-6 flex items-center justify-center min-h-[420px] select-none">
              <div
                className="relative rounded-2xl shadow-2xl overflow-hidden bg-white border-4 border-slate-700 touch-none"
                style={{
                  width: `${Math.round(620 * (zoom / 100))}px`,
                  maxWidth: '100%',
                }}
              >
                {/* Book Page Image */}
                <img
                  src={getCurriculumPageImageUrl(parsed.subjectSlug, currentPage)}
                  alt={`صفحة ${currentPage}`}
                  className="w-full h-auto object-contain block select-none pointer-events-none"
                />

                {/* Drawing Canvas Overlay */}
                <canvas
                  ref={canvasRef}
                  width={1200}
                  height={1700}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  className="absolute inset-0 w-full h-full cursor-crosshair z-10"
                />

                <div className="absolute top-3 left-3 z-20 bg-slate-950/80 backdrop-blur-md text-white px-3 py-1 rounded-xl text-[11px] font-black border border-white/20 shadow-md">
                  {parsed.subjectTitle} · ص {currentPage} (اكتب وحل بالقلم مباشرة)
                </div>
              </div>
            </div>

            {/* Submit Bar */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-600">
                ✏️ يمكنك الحل في كل صفحة وسيتم حفظ وتجميع كافة إجاباتك وإرسالها لدكتور إسماعيل فوراً.
              </span>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitHomework}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white px-7 py-3.5 text-xs sm:text-sm font-black transition shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                <span>إرسال وتسليم الواجب لدكتور إسماعيل 🚀</span>
              </button>
            </div>
          </>
        ) : (
          /* ── CLASSIC SUBMISSION FALLBACK ── */
          <div className="p-6 space-y-5">
            <div className="flex border-b border-slate-200 pb-2 gap-2">
              {(['text', 'image'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSubTab(tab)}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition ${
                    subTab === tab ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {tab === 'text' ? 'كتابة نص' : 'إرفاق صورة'}
                </button>
              ))}
            </div>

            {subTab === 'text' ? (
              <textarea
                rows={5}
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="اكتب إجابتك هنا يا بطل..."
                className="w-full p-4 rounded-2xl border border-slate-300 text-xs font-bold focus:border-teal-500 focus:outline-none"
              />
            ) : (
              <div className="p-8 border-2 border-dashed border-slate-300 rounded-2xl text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const reader = new FileReader();
                      reader.onloadend = () => setImagePreview(reader.result as string);
                      reader.readAsDataURL(f);
                    }
                  }}
                  className="hidden"
                  id="img-upload"
                />
                <label htmlFor="img-upload" className="cursor-pointer text-xs font-bold text-teal-700">
                  اضغط هنا لاختيار صورة من جهازك 📷
                </label>
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" className="mt-4 max-h-48 mx-auto rounded-xl" />
                )}
              </div>
            )}

            <button
              type="button"
              disabled={isSubmitting || (!textAnswer && !imagePreview)}
              onClick={handleSubmitHomework}
              className="w-full py-4 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? 'جاري الإرسال...' : 'إرسال الواجب للمعلم 🚀'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
