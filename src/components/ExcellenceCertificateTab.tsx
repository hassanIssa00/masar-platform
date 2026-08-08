'use client';

import { useState, useRef } from 'react';
import { Award, Printer, Star, Sparkles, GraduationCap, Trophy, Medal, Download } from 'lucide-react';

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
  { value: 'التفوق الدراسي والأكاديمي', icon: '🌟', color: 'from-amber-500 to-yellow-400' },
  { value: 'التميز في القراءة والكتابة', icon: '📚', color: 'from-blue-500 to-indigo-400' },
  { value: 'التقدم الملحوظ في مهارات التعلم', icon: '🚀', color: 'from-purple-500 to-violet-400' },
  { value: 'التفوق في الرياضيات والأرقام', icon: '🔢', color: 'from-green-500 to-teal-400' },
  { value: 'مهارات التواصل والانضباط', icon: '🤝', color: 'from-rose-500 to-pink-400' },
  { value: 'الحضور والمداومة والالتزام', icon: '✅', color: 'from-cyan-500 to-sky-400' },
];

interface CertData {
  studentName: string;
  grade: string;
  achievement: string;
  date: string;
  note: string;
}

export default function ExcellenceCertificateTab() {
  const [form, setForm] = useState<CertData>({
    studentName: '',
    grade: '1',
    achievement: ACHIEVEMENT_TYPES[0].value,
    date: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
    note: '',
  });
  const [preview, setPreview] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  const selectedGradeLabel = GRADE_LEVELS.find(g => g.value === form.grade)?.label || '';
  const selectedAchievement = ACHIEVEMENT_TYPES.find(a => a.value === form.achievement);

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
            body { width: 297mm; height: 210mm; overflow: hidden; }
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

      {/* ── HEADER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-700 via-yellow-600 to-amber-500 p-6 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(255,255,255,0.3) 30px, rgba(255,255,255,0.3) 31px)'
        }} />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-6 w-6 text-amber-200" />
              <span className="font-black text-amber-100 text-sm">مَسَار · مدرسة الإخلاص الأهلية بجدة</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">شهادات التفوق الصفي 🏆</h2>
            <p className="mt-1 text-sm font-semibold text-amber-100">
              أصدر شهادات تفوق شخصية مع أ. د. إسماعيل عيسى لكل طالب متميز في فصله
            </p>
          </div>
          <Award className="h-20 w-20 text-amber-200 opacity-80" />
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── FORM ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
          <h3 className="flex items-center gap-2 font-black text-lg text-slate-900">
            <Sparkles className="h-5 w-5 text-amber-500" />
            بيانات شهادة التفوق
          </h3>

          {/* Student Name */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">اسم الطالب</label>
            <input
              type="text"
              value={form.studentName}
              onChange={e => setForm(p => ({ ...p, studentName: e.target.value }))}
              placeholder="اكتب الاسم الرباعي للطالب هنا..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-100 focus:outline-none"
            />
          </div>

          {/* Grade */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">الصف الدراسي</label>
            <select
              value={form.grade}
              onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-amber-500 focus:outline-none appearance-none"
            >
              {GRADE_LEVELS.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          {/* Achievement Type */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-2">نوع التفوق والإنجاز</label>
            <div className="grid grid-cols-1 gap-2">
              {ACHIEVEMENT_TYPES.map(a => (
                <button
                  key={a.value}
                  onClick={() => setForm(p => ({ ...p, achievement: a.value }))}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 text-xs font-black text-right transition ${
                    form.achievement === a.value
                      ? 'border-amber-400 bg-amber-50 text-amber-800 shadow-sm'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-amber-200 hover:bg-amber-50/40'
                  }`}
                >
                  <span className="text-xl">{a.icon}</span>
                  {a.value}
                  {form.achievement === a.value && <Star className="h-3.5 w-3.5 text-amber-500 mr-auto fill-amber-400" />}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">تاريخ الشهادة</label>
            <input
              type="text"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Custom Note */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">ملاحظة خاصة (اختياري)</label>
            <textarea
              value={form.note}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              rows={2}
              placeholder="يمكنك كتابة ملاحظة تشجيعية خاصة للطالب..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 focus:border-amber-500 focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setPreview(true)}
              disabled={!form.studentName.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-3 text-sm font-black text-white shadow-md transition active:scale-95 disabled:opacity-40"
            >
              <GraduationCap className="h-4 w-4" />
              معاينة الشهادة
            </button>
          </div>
        </div>

        {/* ── MINI PREVIEW ── */}
        <div className="rounded-2xl border border-slate-200 bg-slate-100 p-4 flex items-center justify-center min-h-[400px]">
          {!form.studentName.trim() ? (
            <div className="text-center space-y-3 text-slate-400">
              <Award className="h-16 w-16 mx-auto opacity-30" />
              <p className="font-black text-base">أكتب اسم الطالب لترى معاينة الشهادة</p>
            </div>
          ) : (
            <div className="w-full rounded-xl overflow-hidden shadow-xl border border-amber-200" style={{ transform: 'scale(0.55)', transformOrigin: 'top center', height: 210 }}>
              <CertificateDesign form={form} gradeLabel={selectedGradeLabel} achievement={selectedAchievement} />
            </div>
          )}
        </div>
      </div>

      {/* ── PRINT PREVIEW MODAL ── */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl overflow-hidden">

            {/* Modal Toolbar */}
            <div className="flex items-center justify-between bg-slate-900 px-6 py-4" dir="rtl">
              <div className="flex items-center gap-2 text-white">
                <Trophy className="h-5 w-5 text-amber-400" />
                <span className="font-black text-sm">معاينة شهادة التفوق — {form.studentName}</span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2 text-xs font-black text-slate-950 transition shadow-md"
                >
                  <Printer className="h-4 w-4" />
                  طباعة PDF 🖨️
                </button>
                <button
                  onClick={() => setPreview(false)}
                  className="rounded-xl bg-slate-700 hover:bg-slate-600 px-4 py-2 text-xs font-bold text-white"
                >
                  إغلاق ✖
                </button>
              </div>
            </div>

            {/* Certificate */}
            <div className="p-4 bg-slate-200 flex items-center justify-center overflow-hidden" style={{ minHeight: 540 }}>
              <div ref={certRef} className="w-full" style={{ maxWidth: '940px', aspectRatio: '297/210' }}>
                <CertificateDesign form={form} gradeLabel={selectedGradeLabel} achievement={selectedAchievement} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════
   THE CERTIFICATE DESIGN
════════════════════════════════════════════ */
function CertificateDesign({
  form,
  gradeLabel,
  achievement
}: {
  form: CertData;
  gradeLabel: string;
  achievement: typeof ACHIEVEMENT_TYPES[number] | undefined;
}) {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      minHeight: 560,
      background: 'linear-gradient(135deg, #fefce8 0%, #fff7ed 40%, #fef3c7 100%)',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: "'Cairo', Arial, sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* ── TOP GOLD STRIPE ── */}
      <div style={{
        height: 12,
        background: 'linear-gradient(90deg, #92400e, #d97706, #fbbf24, #d97706, #92400e)',
      }} />

      {/* ── DECORATIVE BG PATTERN ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0,
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(251,191,36,0.12) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(251,191,36,0.12) 0%, transparent 50%)',
      }} />

      {/* ── DOUBLE BORDER FRAME ── */}
      <div style={{
        position: 'absolute', top: 18, right: 18, bottom: 18, left: 18,
        border: '3px solid #d97706',
        borderRadius: 20,
        pointerEvents: 'none',
        zIndex: 1,
      }} />
      <div style={{
        position: 'absolute', top: 26, right: 26, bottom: 26, left: 26,
        border: '1.5px solid rgba(217,119,6,0.4)',
        borderRadius: 16,
        pointerEvents: 'none',
        zIndex: 1,
      }} />

      {/* ── CORNER ORNAMENTS ── */}
      {[{ top: 28, right: 28 }, { top: 28, left: 28 }, { bottom: 28, right: 28 }, { bottom: 28, left: 28 }].map((pos, i) => (
        <div key={i} style={{
          position: 'absolute', ...pos,
          width: 32, height: 32,
          borderTop: i < 2 ? '3px solid #b45309' : undefined,
          borderBottom: i >= 2 ? '3px solid #b45309' : undefined,
          borderRight: (i === 0 || i === 2) ? '3px solid #b45309' : undefined,
          borderLeft: (i === 1 || i === 3) ? '3px solid #b45309' : undefined,
          zIndex: 2,
        }} />
      ))}

      {/* ── BODY ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px 60px',
        position: 'relative',
        zIndex: 3,
        textAlign: 'center',
        gap: 10,
      }}>

        {/* Header Row: Logo + Platform + Dr Name */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
          {/* Left: Masar Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12,
              border: '2px solid #d97706',
              background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', padding: 4,
            }}>
              <img src="/brand/masar-logo.png" alt="مسار" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 900, color: '#92400e', letterSpacing: 1 }}>منصة مَسَار</span>
          </div>

          {/* Center: Title */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <p style={{ fontSize: 11, fontWeight: 900, color: '#92400e', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
              مدارس الإخلاص الأهلية — جدة · IKHLAS SCHOOL JEDDAH
            </p>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #92400e, #d97706)',
              borderRadius: 12, padding: '8px 28px',
            }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: 1 }}>🏆 شهادة تفوق وتميز</span>
            </div>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#b45309', marginTop: 4 }}>
              EXCELLENCE & ACHIEVEMENT CERTIFICATE
            </p>
          </div>

          {/* Right: Trophy Icon */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 12,
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
              boxShadow: '0 4px 12px rgba(245,158,11,0.4)',
            }}>
              {achievement?.icon || '🌟'}
            </div>
            <span style={{ fontSize: 9, fontWeight: 900, color: '#92400e', letterSpacing: 1 }}>{gradeLabel.split(' ')[1] || 'الابتدائي'}</span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '80%', height: 2, background: 'linear-gradient(90deg, transparent, #d97706, transparent)', margin: '4px auto' }} />

        {/* Presented To */}
        <p style={{ fontSize: 12, fontWeight: 700, color: '#78350f', letterSpacing: 1 }}>
          تُمنح هذه الشهادة الكريمة إلى الطالب المتفوق المتميز
        </p>

        {/* Student Name */}
        <div style={{
          padding: '10px 40px',
          borderBottom: '2px solid #d97706',
          borderTop: '2px solid #d97706',
          background: 'rgba(251,191,36,0.08)',
          borderRadius: 8,
        }}>
          <p style={{
            fontSize: 28, fontWeight: 900,
            color: '#1e293b',
            letterSpacing: 2,
            textShadow: '0 1px 2px rgba(0,0,0,0.1)',
          }}>
            {form.studentName || 'اسم الطالب'}
          </p>
        </div>

        {/* Grade */}
        <p style={{ fontSize: 12, fontWeight: 800, color: '#44403c' }}>
          {gradeLabel} · مدارس الإخلاص الأهلية بجدة
        </p>

        {/* Achievement */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(146,64,14,0.08), rgba(217,119,6,0.12))',
          border: '1.5px solid rgba(217,119,6,0.3)',
          borderRadius: 12, padding: '8px 28px',
          display: 'inline-block',
        }}>
          <p style={{ fontSize: 13, fontWeight: 900, color: '#92400e' }}>
            تقديراً لتفوقه وتميزه في: {form.achievement}
          </p>
        </div>

        {/* Custom Note */}
        {form.note && (
          <p style={{ fontSize: 11, fontWeight: 700, color: '#57534e', fontStyle: 'italic', maxWidth: '70%' }}>
            &quot;{form.note}&quot;
          </p>
        )}

        {/* Divider */}
        <div style={{ width: '80%', height: 1, background: 'linear-gradient(90deg, transparent, #d97706, transparent)', margin: '2px auto' }} />

        {/* Footer Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%', marginTop: 4 }}>
          {/* Date */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 10, color: '#a8a29e', fontWeight: 700 }}>تاريخ الإصدار</p>
            <p style={{ fontSize: 12, fontWeight: 900, color: '#44403c' }}>{form.date}</p>
          </div>

          {/* Stars */}
          <div style={{ display: 'flex', gap: 4 }}>
            {['⭐', '⭐', '⭐', '⭐', '⭐'].map((s, i) => (
              <span key={i} style={{ fontSize: 18 }}>{s}</span>
            ))}
          </div>

          {/* Signature */}
          <div style={{ textAlign: 'left', borderTop: '1.5px solid #d97706', paddingTop: 4, minWidth: 140 }}>
            <p style={{ fontSize: 13, fontWeight: 900, color: '#1e293b', fontStyle: 'italic' }}>أ. إسماعيل عيسى ✍️</p>
            <p style={{ fontSize: 9, color: '#92400e', fontWeight: 800 }}>استشاري التعليم العلاجي وصعوبات التعلم</p>
          </div>
        </div>
      </div>

      {/* ── BOTTOM GOLD STRIPE ── */}
      <div style={{
        height: 12,
        background: 'linear-gradient(90deg, #92400e, #d97706, #fbbf24, #d97706, #92400e)',
      }} />
    </div>
  );
}
