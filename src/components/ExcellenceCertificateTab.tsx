'use client';

import { useState, useRef } from 'react';
import { Award, Printer, Star, Sparkles, Trophy, ShieldCheck, Check, Pencil } from 'lucide-react';
import BrandMark from './BrandMark';

/* ── Grade levels ── */
const GRADE_LEVELS = [
  { value: '1', label: 'الصف الأول الابتدائي' },
  { value: '2', label: 'الصف الثاني الابتدائي' },
  { value: '3', label: 'الصف الثالث الابتدائي' },
  { value: '4', label: 'الصف الرابع الابتدائي' },
  { value: '5', label: 'الصف الخامس الابتدائي' },
  { value: '6', label: 'الصف السادس الابتدائي' },
];

const ACHIEVEMENT_TYPES = [
  { value: 'التفوق الدراسي والأكاديمي العام', icon: '🌟' },
  { value: 'التميز في القراءة والوعي الفونيجي', icon: '📚' },
  { value: 'التقدم الملحوظ في مهارات التعلم العلاجي', icon: '🚀' },
  { value: 'التفوق والتميز في الرياضيات والحساب', icon: '🔢' },
  { value: 'مهارات التواصل والانضباط الصفي', icon: '🤝' },
  { value: 'الالتزام والمداومة والتفوق المستمر', icon: '✅' },
];

interface CertData {
  studentName: string;
  grade: string;
  achievement: string;
  score: number;
  date: string;
  note: string;
  certNumber: string;
}

export default function ExcellenceCertificateTab() {
  const [form, setForm] = useState<CertData>({
    studentName: 'محمد أحمد إبراهيم علي',
    grade: '1',
    achievement: ACHIEVEMENT_TYPES[0].value,
    score: 98,
    date: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
    note: 'طالب متميز ومتفوق أظهر التزاماً استثنائياً ومهارات عالية.',
    certNumber: `NSR-CERT-2026-${Math.floor(10000 + Math.random() * 90000)}`,
  });
  const [preview, setPreview] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  const selectedGradeLabel = GRADE_LEVELS.find(g => g.value === form.grade)?.label || 'الصف الأول الابتدائي';

  const handlePrint = () => {
    if (!certRef.current) return;
    const printContent = certRef.current.outerHTML;
    const win = window.open('', '_blank', 'width=1200,height=850');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8"/>
        <title>شهادة تفوق — ${form.studentName}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;800;900&display=swap" rel="stylesheet">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #fff; font-family: 'Cairo', Arial, sans-serif; }
          @page { size: A4 landscape; margin: 0; }
          @media print {
            body { width: 297mm; height: 210mm; overflow: hidden; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          }
          .cert-wrapper { width: 297mm; height: 210mm; display: flex; align-items: stretch; }
        </style>
      </head>
      <body>
        <div class="cert-wrapper">${printContent}</div>
        <script>setTimeout(() => { window.print(); window.close(); }, 600);<\/script>
      </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="space-y-6 text-slate-900" dir="rtl">

      {/* ── HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#06392c] via-[#0b4d3c] to-[#042e20] p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-6 w-6 text-amber-400" />
              <span className="font-black text-emerald-200 text-sm">منصة مَسَار · شهادات التفوق الرسمية</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">شهادات التميز والتفوق 🏆</h2>
            <p className="mt-1 text-sm font-semibold text-emerald-100/90">
              إصدار شهادات التفوق والتميز الصفي بإشراف د. إسماعيل عيسى بالتصاميم المعتمدة لمنصة مسار
            </p>
          </div>
          <Award className="h-20 w-20 text-emerald-400/40" />
        </div>
      </div>

      {/* ── MAIN LAYOUT: FORM & PREVIEW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── CONTROLS FORM (5 Cols) ── */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <h3 className="flex items-center gap-2 font-black text-base text-slate-900 pb-3 border-b border-slate-100">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            بيانات وتفاصيل الشهادة
          </h3>

          {/* Student Name */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">اسم الطالب الرباعي</label>
            <input
              type="text"
              value={form.studentName}
              onChange={e => setForm(p => ({ ...p, studentName: e.target.value }))}
              placeholder="مثال: محمد أحمد إبراهيم علي..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
            />
          </div>

          {/* Grade */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">الصف الدراسي</label>
            <select
              value={form.grade}
              onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
            >
              {GRADE_LEVELS.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          {/* Achievement Type */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-2">مجال التفوق والتميز</label>
            <div className="grid grid-cols-1 gap-2">
              {ACHIEVEMENT_TYPES.map(a => (
                <button
                  key={a.value}
                  onClick={() => setForm(p => ({ ...p, achievement: a.value }))}
                  className={`flex items-center gap-3 rounded-xl border px-3.5 py-2 text-xs font-black text-right transition ${
                    form.achievement === a.value
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300'
                  }`}
                >
                  <span>{a.icon}</span>
                  <span className="flex-1 truncate">{a.value}</span>
                  {form.achievement === a.value && <Star className="h-3.5 w-3.5 text-emerald-600 fill-emerald-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Score */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-black text-slate-700">نسبة التقييم والإنجاز</label>
              <span className="text-xs font-extrabold text-emerald-700 font-mono">%{form.score}</span>
            </div>
            <input
              type="range" min="70" max="100" value={form.score}
              onChange={e => setForm(p => ({ ...p, score: Number(e.target.value) }))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">تاريخ الإصدار</label>
            <input
              type="text"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* Custom Note */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">ملاحظة تشجيعية (اختياري)</label>
            <textarea
              value={form.note}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              rows={2}
              placeholder="اكتب ملاحظة تشجيعية خاصة للطالب..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-emerald-600 focus:outline-none resize-none"
            />
          </div>

          {/* Action buttons */}
          <button
            onClick={() => setPreview(true)}
            disabled={!form.studentName.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-5 py-3.5 text-sm font-black text-white shadow-md transition active:scale-95 disabled:opacity-40"
          >
            <Printer className="h-4 w-4" />
            فتح الشهادة الرسمية وطباعتها 🖨️
          </button>
        </div>

        {/* ── LIVE DESIGN PREVIEW (7 Cols) ── */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">معاينة مباشرة للشهادة المعتمدة</span>
            <button
              onClick={() => setPreview(true)}
              className="text-xs font-black text-emerald-700 hover:underline flex items-center gap-1"
            >
              عرض التكبير / طباعة
            </button>
          </div>

          <div className="rounded-2xl border-2 border-slate-900 bg-slate-950 p-2 shadow-2xl overflow-hidden">
            <div ref={certRef} className="w-full">
              <OfficialMasarCertificateDesign form={form} gradeLabel={selectedGradeLabel} />
            </div>
          </div>
        </div>
      </div>

      {/* ── PRINT MODAL OVERLAY ── */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-3xl bg-slate-950 shadow-2xl overflow-hidden border border-emerald-900/40 space-y-0">
            {/* Modal Toolbar */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-emerald-900/50" dir="rtl">
              <span className="text-sm font-black text-white flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-400" />
                معاينة الطباعة لشهادة التميز والتفوق — {form.studentName}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-5 py-2.5 text-xs font-black text-slate-950 transition shadow-md active:scale-95"
                >
                  <Printer className="h-4 w-4" />
                  طباعة PDF الرسمية 🖨️
                </button>
                <button
                  onClick={() => setPreview(false)}
                  className="rounded-xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-bold text-white transition"
                >
                  إغلاق ✖
                </button>
              </div>
            </div>

            {/* Certificate Canvas */}
            <div className="p-4 sm:p-6 bg-slate-900 flex justify-center overflow-x-auto">
              <div className="w-full max-w-4xl">
                <OfficialMasarCertificateDesign form={form} gradeLabel={selectedGradeLabel} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   EXACT MASAR PLATFORM OFFICIAL CERTIFICATE DESIGN
   Identical to CertificateModal.tsx styling (Emerald/Gold Luxury)
════════════════════════════════════════════════════════════════ */
function OfficialMasarCertificateDesign({
  form,
  gradeLabel,
}: {
  form: CertData;
  gradeLabel: string;
}) {
  const certNo = form.certNumber;
  const gradeText = gradeLabel;

  return (
    <div
      dir="rtl"
      style={{
        background: '#ffffff',
        border: '3px solid #06392c',
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Cairo', Arial, sans-serif",
      }}
    >
      {/* Corner decorative circles */}
      <svg width="200" height="200" viewBox="0 0 200 200" fill="none"
        style={{ position: 'absolute', top: 0, right: 0, opacity: 0.12, pointerEvents: 'none' }}>
        <circle cx="200" cy="0" r="185" stroke="#06392c" strokeWidth="1" strokeDasharray="5 4"/>
        <circle cx="200" cy="0" r="145" stroke="#06392c" strokeWidth="0.7"/>
        <circle cx="200" cy="0" r="105" stroke="#06392c" strokeWidth="0.9" strokeDasharray="3 4"/>
      </svg>
      <svg width="200" height="200" viewBox="0 0 200 200" fill="none"
        style={{ position: 'absolute', bottom: 0, left: 0, opacity: 0.12, pointerEvents: 'none' }}>
        <circle cx="0" cy="200" r="185" stroke="#06392c" strokeWidth="1" strokeDasharray="5 4"/>
        <circle cx="0" cy="200" r="145" stroke="#06392c" strokeWidth="0.7"/>
        <circle cx="0" cy="200" r="105" stroke="#06392c" strokeWidth="0.9" strokeDasharray="3 4"/>
      </svg>

      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        padding: '20px 28px 0 28px', position: 'relative', zIndex: 1, width: '100%'
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <BrandMark size="md" showText={true} />
        </div>

        {/* Certified Badge Box */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff',
          border: '1.5px solid #e2e8e4', borderRadius: 14, padding: '8px 12px', minWidth: 140, boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
        }}>
          <div style={{
            background: '#06392c', borderRadius: 10, width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <ShieldCheck size={16} color="white"/>
          </div>
          <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#06392c' }}>شهادة تفوق معتمدة</div>
            <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#666' }}>{certNo}</div>
            <div style={{ fontSize: 9, color: '#888' }}>التاريخ: {form.date}</div>
          </div>
        </div>

      </div>

      {/* ── BODY ── */}
      <div style={{
        padding: '16px 28px 12px', textAlign: 'center', display: 'flex',
        flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative', zIndex: 1
      }}>

        <h1 style={{
          fontSize: 32, fontWeight: 900, color: '#06392c', margin: 0,
          fontFamily: 'Georgia, serif', lineHeight: 1.2
        }}>
          شهادة تفوق وتميز صفي 🏆
        </h1>

        <p style={{ fontSize: 12, fontWeight: 700, color: '#555', margin: 0 }}>
          تشهد منصة مَسَار للتأهيل والتعليم الذكي وتحت إشراف الاستشاري
        </p>

        <p style={{ fontSize: 20, fontWeight: 900, color: '#06392c', margin: 0, fontFamily: 'Georgia, serif' }}>
          د. إسماعيل عيسى
        </p>

        <p style={{ fontSize: 11.5, fontWeight: 700, color: '#666', margin: 0 }}>
          بأن الطالب المتفوق ({gradeText})
        </p>

        {/* Student Name + Laurel */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
          <GoldenLaurelBranch side="left"/>
          <div>
            <h2 style={{
              fontSize: 38, fontWeight: 900, color: '#06392c', margin: 0,
              fontFamily: 'Georgia, serif', lineHeight: 1.1
            }}>
              {form.studentName || 'اسم الطالب'}
            </h2>

            {/* Gold divider line with center diamond */}
            <div style={{ position: 'relative', marginTop: 6, height: 2, display: 'flex', alignItems: 'center' }}>
              <div style={{ width: '100%', height: 2, background: 'linear-gradient(to right, transparent, #d9a238 20%, #d9a238 80%, transparent)' }}/>
              <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: 9, height: 9, background: '#d9a238' }}/>
            </div>
          </div>
          <GoldenLaurelBranch side="right"/>
        </div>

        {/* Achievement Program / Domain */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: '100%', marginTop: 2 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#555', margin: 0 }}>
            قد حقق التميز والتفوق المستحق وجدارة الأداء العالي في:
          </p>
          <div style={{ background: '#e3eae4', border: '1.5px solid #c4d4c8', borderRadius: 14, padding: '8px 28px' }}>
            <span style={{ fontSize: 17, fontWeight: 900, color: '#06392c' }}>
              {form.achievement}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: '#444', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span>وحصل على تقدير تفوق قدره</span>
            <span style={{
              background: form.score >= 90 ? '#d4a820' : form.score >= 80 ? '#06392c' : '#3b82f6',
              color: 'white', fontWeight: 900, fontSize: 12, padding: '2px 12px', borderRadius: 20,
              border: `1.5px solid ${form.score >= 90 ? '#9a6210' : form.score >= 80 ? '#042e20' : '#1d4ed8'}`,
            }}>
              {form.score >= 90 ? 'ممتاز مع مرتبة الشرف 🌟' : form.score >= 80 ? 'جيد جداً مرتفع' : 'جيد مرتفع'}
            </span>
            <span>بنسبة</span>
            <span style={{ background: '#06392c', color: 'white', fontFamily: 'monospace', fontWeight: 900, fontSize: 13, padding: '3px 14px', borderRadius: 8 }}>
              %{form.score}
            </span>
          </div>

          {form.note && (
            <p style={{ fontSize: 11, fontWeight: 700, color: '#555', fontStyle: 'italic', maxWidth: '80%', marginTop: 2 }}>
              &quot;{form.note}&quot;
            </p>
          )}
        </div>
      </div>

      {/* ── FOOTER: DOCTOR SIGNATURE & DIGITAL SEAL ── */}
      <div style={{ padding: '16px 28px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa', position: 'relative', zIndex: 1 }}>

        {/* Doctor Signature */}
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>يعتمد:</span>
          <h3 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', margin: 0, fontFamily: 'Georgia, serif' }}>
            د. إسماعيل عيسى
          </h3>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: 0 }}>
            استشاري التربية الخاصة وتأهيل صعوبات التعلم
          </p>

          <div style={{ borderBottom: '1px solid #cbd5e1', width: 220, marginTop: 10, paddingTop: 4, display: 'flex', justifyContent: 'flex-start' }}>
            <span style={{ fontSize: 9.5, fontWeight: 900, color: '#94a3b8' }}>التوقيع المعتمد ✍️</span>
          </div>
        </div>

        {/* Dashed Digital Seal Box */}
        <div style={{ background: '#ffffff', border: '1.5px dashed #334155', borderRadius: 14, padding: '10px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: '#ffffff', border: '1.5px solid #06392c', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/brand/masar-logo.png" alt="منصة مسار" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#0f172a' }}>الختم الرقمي المعتمد</div>
            <div style={{ fontSize: 9.5, fontFamily: 'monospace', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px', marginTop: 2 }}>
              {certNo}
            </div>
          </div>
        </div>

      </div>

      {/* ── BOTTOM EMERALD BAR ── */}
      <div style={{
        background: '#06392c', padding: '10px 22px', display: 'flex', alignItems: 'center',
        justify: 'space-between', borderRadius: '0 0 16px 16px', position: 'relative', zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BottomGoldMedal />
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#ffffff' }}>وثيقة تفوق موثقة رسمياً</div>
            <div style={{ fontSize: 9.5, color: '#a3b899' }}>منصة مَسَار للتأهيل والتعليم الذكي · جميع الحقوق محفوظة</div>
          </div>
        </div>

        {/* Verification Link */}
        <div style={{ background: '#ffffff', borderRadius: 8, padding: '4px 10px', fontSize: 10, fontWeight: 900, color: '#06392c' }}>
          VERIFIED BY MASAR
        </div>
      </div>
    </div>
  );
}

/* ── GOLDEN LAUREL SVG BRANCH ── */
function GoldenLaurelBranch({ side }: { side: 'left' | 'right' }) {
  return (
    <svg
      width="36" height="60" viewBox="0 0 36 60" fill="none"
      style={{ transform: side === 'left' ? 'scaleX(-1)' : 'none', flexShrink: 0 }}
    >
      <path d="M18 55C18 35 25 15 32 5" stroke="#d9a238" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M28 12C23 10 18 13 19 18C23 18 27 16 28 12Z" fill="#d9a238"/>
      <path d="M24 22C19 20 14 23 15 28C19 28 23 26 24 22Z" fill="#d9a238"/>
      <path d="M20 32C15 30 10 33 11 38C15 38 19 36 20 32Z" fill="#d9a238"/>
      <path d="M16 42C11 40 6 43 7 48C11 48 15 46 16 42Z" fill="#d9a238"/>
    </svg>
  );
}

/* ── BOTTOM GOLD MEDAL SVG ── */
function BottomGoldMedal() {
  return (
    <svg width="34" height="40" viewBox="0 0 38 44" fill="none">
      <defs>
        <linearGradient id="mgl_tab" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d060"/><stop offset="55%" stopColor="#d9a030"/><stop offset="100%" stopColor="#9a6210"/>
        </linearGradient>
      </defs>
      <path d="M12 26L7 42L15 38L19 42L17 26Z" fill="#b07820"/>
      <path d="M26 26L31 42L23 38L19 42L21 26Z" fill="#b07820"/>
      <circle cx="19" cy="16" r="15" fill="url(#mgl_tab)"/>
      <circle cx="19" cy="16" r="12.5" fill="none" stroke="#fff" strokeWidth="1.4"/>
      <path d="M13 16L17 20.5L25 12" stroke="#06392c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
