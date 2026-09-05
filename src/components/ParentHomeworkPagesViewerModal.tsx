'use client';

import { useState, useEffect } from 'react';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import {
  parseHomeworkCurriculum,
  getCurriculumPageImageUrl,
  type ParsedCurriculumHw,
} from '@/lib/curriculumHomeworkHelper';
import { readCloudCache, pullCloudDataToLocal } from '@/lib/firestoreSync';

interface Props {
  homework: any;
  studentId?: string;
  studentName?: string;
  onClose: () => void;
}

const DRAWINGS_KEY = 'masar.curriculumDrawings.v1';

export default function ParentHomeworkPagesViewerModal({
  homework,
  studentId,
  studentName,
  onClose,
}: Props) {
  const parsed: ParsedCurriculumHw | null = parseHomeworkCurriculum(homework);
  const [currentPage, setCurrentPage] = useState<number>(parsed?.fromPage || 1);
  const [zoom, setZoom] = useState<number>(100);
  const [showStudentDrawings, setShowStudentDrawings] = useState<boolean>(true);
  const [drawingDataUrl, setDrawingDataUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);

  useEffect(() => {
    void pullCloudDataToLocal(['curriculumDrawings'], true).catch(() => {});
  }, []);

  useEffect(() => {
    if (parsed) {
      setCurrentPage(parsed.fromPage);
    }
  }, [homework]);

  // Load student drawings for the current page if available
  useEffect(() => {
    if (!parsed || !studentId) {
      setDrawingDataUrl(null);
      return;
    }

    const allDrawings = readCloudCache<any>(DRAWINGS_KEY);
    const drawing = allDrawings.find(
      (d: any) =>
        (d.studentId === studentId || d.studentId === homework?.studentId) &&
        d.subjectSlug === parsed.subjectSlug &&
        Number(d.page) === Number(currentPage)
    );

    setDrawingDataUrl(drawing?.dataUrl || null);
    setImageError(false);
  }, [currentPage, parsed, studentId, homework?.studentId]);

  if (!parsed) {
    // Fallback if not a curriculum pages homework
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" dir="rtl">
        <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 animate-scale-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-600" />
              {homework?.title || 'تفاصيل الواجب'}
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition">
              <X size={18} />
            </button>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 leading-relaxed">
            {homework?.description || 'لا يوجد وصف تفصيلي لهذا الواجب.'}
          </div>
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center space-y-1">
            <p className="text-xs font-black text-amber-900">📋 هذا الواجب مُعيّن للطالب — يتم حله إلكترونياً من صفحة الطالب فقط.</p>
            {homework?.dueDate && (
              <p className="text-[11px] font-bold text-amber-700">⏰ موعد التسليم: {new Date(homework.dueDate).toLocaleDateString('ar-SA')}</p>
            )}
          </div>
          <button onClick={onClose} className="w-full py-3 rounded-2xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 transition">
            إغلاق
          </button>
        </div>
      </div>
    );
  }

  const pageImgUrl = getCurriculumPageImageUrl(parsed.subjectSlug, currentPage);
  const currentIndex = parsed.pagesList.indexOf(currentPage);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < parsed.pagesList.length - 1;

  const goToPrev = () => {
    if (hasPrev) setCurrentPage(parsed.pagesList[currentIndex - 1]);
  };

  const goToNext = () => {
    if (hasNext) setCurrentPage(parsed.pagesList[currentIndex + 1]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto" dir="rtl">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] overflow-hidden animate-scale-in">
        
        {/* ── TOP HEADER ── */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between gap-3 border-b border-emerald-900/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-xl shrink-0 shadow-inner">
              📖
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-black px-2.5 py-0.5 rounded-lg border border-emerald-400/30">
                  {parsed.subjectTitle}
                </span>
                <span className="text-xs text-amber-300 font-black">
                  الصفحات المطلوبة: من ({parsed.fromPage}) إلى ({parsed.toPage})
                </span>
              </div>
              <h3 className="font-black text-sm sm:text-base text-white mt-1 truncate">
                {homework?.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition cursor-pointer"
              title="إغلاق"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ── NOTICE & CONTROLS TOOLBAR ── */}
        <div className="px-4 py-2.5 bg-emerald-50/80 border-b border-emerald-200/70 flex items-center justify-between gap-3 flex-wrap text-xs font-bold">
          <div className="flex items-center gap-2 text-emerald-900">
            <Info size={15} className="text-emerald-700 shrink-0" />
            <span>
              استعراض صفحات الكتاب المقررة للبطل <strong>{studentName || 'الطالب'}</strong> — يتم الحل بالقلم التفاعلي من صفحة الطالب.
            </span>
          </div>

          <div className="flex items-center gap-2 mr-auto">
            {/* Toggle Student Drawings Overlay */}
            {drawingDataUrl && (
              <button
                type="button"
                onClick={() => setShowStudentDrawings((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition cursor-pointer shadow-xs ${
                  showStudentDrawings
                    ? 'bg-amber-400 border-amber-500 text-slate-950'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                {showStudentDrawings ? <Eye size={14} /> : <EyeOff size={14} />}
                <span>{showStudentDrawings ? 'إظهار حل الطالب ✓' : 'إخفاء حل الطالب'}</span>
              </button>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <button
                onClick={() => setZoom((z) => Math.min(180, z + 15))}
                className="p-1.5 hover:bg-slate-100 text-slate-700 transition"
                title="تكبير"
              >
                <ZoomIn size={14} />
              </button>
              <span className="text-[11px] font-mono px-2 text-slate-600">{zoom}%</span>
              <button
                onClick={() => setZoom((z) => Math.max(70, z - 15))}
                className="p-1.5 hover:bg-slate-100 text-slate-700 transition"
                title="تصغير"
              >
                <ZoomOut size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* ── PAGE SELECTOR BAR (ONLY ASSIGNED PAGES) ── */}
        <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black text-slate-700 shrink-0 ml-1">صفحات الواجب:</span>
            {parsed.pagesList.map((pageNum) => {
              const isSelected = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-700 text-white shadow-sm scale-105'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300'
                  }`}
                >
                  ص {pageNum}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={goToPrev}
              disabled={!hasPrev}
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight size={14} />
              <span>السابق</span>
            </button>
            <button
              onClick={goToNext}
              disabled={!hasNext}
              className="flex items-center gap-1 px-3 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
            >
              <span>التالي</span>
              <ChevronLeft size={14} />
            </button>
          </div>
        </div>

        {/* ── MAIN BOOK VIEWER CANVAS / IMAGE ── */}
        <div className="flex-1 overflow-auto bg-slate-900 p-4 sm:p-6 flex items-center justify-center min-h-[420px]">
          <div
            className="relative rounded-2xl shadow-2xl overflow-hidden bg-white border-4 border-slate-700 transition-all duration-200"
            style={{
              width: `${Math.round(620 * (zoom / 100))}px`,
              maxWidth: '100%',
            }}
          >
            {/* Book Page Image */}
            {!imageError ? (
              <img
                src={pageImgUrl}
                alt={`صفحة ${currentPage} في ${parsed.subjectTitle}`}
                className="w-full h-auto object-contain block select-none pointer-events-none"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="p-12 text-center space-y-3 bg-slate-50 text-slate-700 min-h-[500px] flex flex-col items-center justify-center">
                <span className="text-4xl">📚</span>
                <h4 className="font-black text-base text-slate-900">
                  كتاب {parsed.subjectTitle} — صفحة {currentPage}
                </h4>
                <p className="text-xs font-bold text-slate-500 max-w-xs">
                  صفحة التمارين التفاعلية المقررة من د. إسماعيل عيسى.
                </p>
              </div>
            )}

            {/* Overlay Student Drawing if enabled & exists */}
            {drawingDataUrl && showStudentDrawings && (
              <img
                src={drawingDataUrl}
                alt={`حل الطالب لصفحة ${currentPage}`}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none z-10"
              />
            )}

            {/* Watermark badge */}
            <div className="absolute top-3 left-3 z-20 bg-slate-950/80 backdrop-blur-md text-white px-3 py-1 rounded-xl text-[11px] font-black border border-white/20 shadow-md">
              {parsed.subjectTitle} · صفحة {currentPage}
            </div>

            {/* Solved indicator */}
            {drawingDataUrl && showStudentDrawings && (
              <div className="absolute bottom-3 right-3 z-20 bg-emerald-600 text-white px-3 py-1 rounded-xl text-[11px] font-black shadow-md flex items-center gap-1.5 border border-emerald-400">
                <CheckCircle2 size={13} />
                <span>حل الطالب موثق على الصفحة ✓</span>
              </div>
            )}
          </div>
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3" dir="rtl">
          <div className="text-xs font-bold text-slate-500">
            {homework?.dueDate && (
              <span>موعد تسليم الواجب: <strong className="text-slate-900 font-black">{new Date(homework.dueDate).toLocaleDateString('ar-SA')}</strong></span>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-black transition shadow-sm cursor-pointer"
          >
            إغلاق المعاينة
          </button>
        </div>

      </div>
    </div>
  );
}
