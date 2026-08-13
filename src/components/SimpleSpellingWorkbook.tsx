'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Eraser, PenLine, RotateCcw, Save } from 'lucide-react';

const PAGE_COUNT = 81;
const STORAGE_PREFIX = 'masar.simpleSpellingWorkbook.v1';

type Tool = 'view' | 'pen' | 'eraser';

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

  const storageKey = `${STORAGE_PREFIX}.page.${page}`;

  function getCanvasContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  }

  function persistCanvas() {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === 'undefined') return;
    try {
      localStorage.setItem(storageKey, canvas.toDataURL('image/png'));
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
      const saved = localStorage.getItem(storageKey);
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
    queueMicrotask(fitCanvasToImage);
    const onResize = () => fitCanvasToImage();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [page]);

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
    if (typeof window !== 'undefined') localStorage.removeItem(storageKey);
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

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm" dir="rtl">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 p-3 backdrop-blur">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
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
              onClick={() => setPage((current) => Math.min(PAGE_COUNT, current + 1))}
              disabled={page === PAGE_COUNT}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-black text-slate-800 disabled:opacity-40"
            >
              التالي
              <ChevronLeft size={16} />
            </button>
            <input
              type="range"
              min={1}
              max={PAGE_COUNT}
              value={page}
              onChange={(event) => setPage(Number(event.target.value))}
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
          </div>
        </div>
        <p className="mt-2 text-xs font-bold text-slate-500">
          اختر كتابة ثم اكتب بالقلم أو باللمس فوق ورقة التدريب. في وضع تصفح يمكنك تحريك الصفحة بدون رسم.
          {savedAt ? <span className="mr-2 text-emerald-700">آخر حفظ: {savedAt}</span> : null}
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
