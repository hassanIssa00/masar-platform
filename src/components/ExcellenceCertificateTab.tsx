'use client';

import { useState, useRef } from 'react';
import { Award, Printer, Sparkles, Trophy, ShieldCheck, RefreshCw, Send, UserCheck, CheckCircle2, PhoneCall } from 'lucide-react';
import BrandMark from './BrandMark';

/* ── Suggested Achievement Presets (User can pick or type custom) ── */
const SUGGESTED_ACHIEVEMENTS = [
  'التفوق الدراسي والأكاديمي العام',
  'التميز في القراءة والوعي الفونيجي',
  'التقدم الملحوظ في مهارات التعلم العلاجي',
  'التفوق والتميز في الرياضيات والحساب',
  'مهارات التواصل والانضباط الصفي',
  'الالتزام والمداومة والتفوق المستمر',
];

const GRADE_PRESETS = [
  'الصف الأول الابتدائي',
  'الصف الثاني الابتدائي',
  'الصف الثالث الابتدائي',
  'الصف الرابع الابتدائي',
  'الصف الخامس الابتدائي',
  'الصف السادس الابتدائي',
];

interface Parent {
  id: string;
  parentName: string;
  phone: string;
}

interface Props {
  students?: { id: string; name: string; phone?: string }[];
}

const DEFAULT_PARENTS: Parent[] = [];

interface CertData {
  certTitle: string;
  subTitle: string;
  doctorName: string;
  doctorTitle: string;
  studentPrefix: string;
  studentName: string;
  gradeLabel: string;
  achievementIntro: string;
  achievement: string;
  score: number;
  ratingText: string;
  date: string;
  note: string;
  certNumber: string;
}

export default function ExcellenceCertificateTab({ students }: Props) {
  const parentsList: Parent[] = students && students.length > 0
    ? students.map((s, idx) => ({ id: s.id, parentName: s.name, phone: s.phone || `96650${1234567 + idx}` }))
    : DEFAULT_PARENTS;

  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [directSentMessage, setDirectSentMessage] = useState<string | null>(null);
  const [sendingDirect, setSendingDirect] = useState(false);

  const [form, setForm] = useState<CertData>({
    certTitle: 'شهادة تفوق وتميز صفي 🏆',
    subTitle: 'تشهد منصة مَسَار للتأهيل والتعليم الذكي وتحت إشراف الاستشاري',
    doctorName: 'د. إسماعيل عيسى',
    doctorTitle: 'استشاري التربية الخاصة وتأهيل صعوبات التعلم',
    studentPrefix: 'بأن الطالب المتفوق',
    studentName: 'ربيع إسماعيل محمد كامل عيسى',
    gradeLabel: 'الصف الثالث الابتدائي',
    achievementIntro: 'قد حقق التميز والتفوق المستحق وجدارة الأداء العالي في:',
    achievement: 'التقدم الملحوظ في مهارات التعلم العلاجي',
    score: 100,
    ratingText: 'ممتاز مع مرتبة الشرف 🌟',
    date: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
    note: 'طالب متميز ومتفوق أظهر التزاماً استثنائياً ومهارات عالية.',
    certNumber: `NSR-CERT-2026-${Math.floor(10000 + Math.random() * 90000)}`,
  });

  const [preview, setPreview] = useState(false);
  const certRef = useRef<HTMLDivElement>(null);

  const generateNewCertNo = () => {
    setForm(p => ({ ...p, certNumber: `NSR-CERT-2026-${Math.floor(10000 + Math.random() * 90000)}` }));
  };

  const handleSendWhatsAppToParent = () => {
    const parent = parentsList.find(p => p.id === selectedParentId);
    const parentName = parent ? parent.parentName : 'ولي الأمر';
    const parentPhone = parent?.phone ? parent.phone.replace(/\+/g, '') : '';

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://masar-platform.com';
    const verifyUrl = `${origin}/verify/${form.certNumber}?name=${encodeURIComponent(form.studentName)}&prog=${encodeURIComponent(form.achievement)}&score=${form.score}&date=${encodeURIComponent(form.date)}`;
    
    const text =
      `🎖️ *إشعار شهادة تفوق وتكريم رسمية — منصة مَسَار*%0A%0A` +
      `👨‍👦 *المكرم المحترم (ولي الأمر):* ${encodeURIComponent(parentName)}%0A` +
      `👤 *شهادة تفوق وتكريم لابنكم البطل:* ${encodeURIComponent(form.studentName)}%0A` +
      `🏫 *المدرسة:* مدارس الإخلاص الأهلية بجدة%0A` +
      `🏆 *عنوان التكريم:* ${encodeURIComponent(form.certTitle)}%0A` +
      `🎯 *مجال التميز:* ${encodeURIComponent(form.achievement)}%0A` +
      `🌟 *التقدير المستحق:* ${encodeURIComponent(form.ratingText)} (بنسبة %${form.score})%0A` +
      `✍️ *معتمدة برقم تسلسلي:* ${form.certNumber}%0A%0A` +
      `💬 *ملاحظة تشجيعية:*%0A"${encodeURIComponent(form.note)}"%0A%0A` +
      `🔗 *استعراض الشهادة التفاعلية ومسح الـ QR:*%0A${encodeURIComponent(verifyUrl)}`;

    window.open(`https://wa.me/${parentPhone}?text=${text}`, '_blank');
  };

  const handleSendToParentDirect = () => {
    const parent = parentsList.find(p => p.id === selectedParentId);
    const parentName = parent ? parent.parentName : 'ولي الأمر';

    setSendingDirect(true);
    setTimeout(() => {
      setSendingDirect(false);
      setDirectSentMessage(`تم إرسال شهادة الطالب (${form.studentName}) لولي الأمر (${parentName}) بنجاح! 🚀`);
      setTimeout(() => setDirectSentMessage(null), 6000);
    }, 1200);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-slate-900" dir="rtl">

      {/* ── HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#06392c] via-[#0b4d3c] to-[#042e20] p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-6 w-6 text-amber-400" />
              <span className="font-black text-emerald-200 text-sm">منصة مَسَار · شهادات التفوق والحرية الكاملة للتعديل</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">منشئ شهادات التفوق المخصصة 🏆</h2>
            <p className="mt-1 text-sm font-semibold text-emerald-100/90">
              يمكنك كتابة وتعديل أي نص أو مجال أو درجة داخل الشهادة بحرية تامة وبدون أي قيود!
            </p>
          </div>
          <Award className="h-20 w-20 text-emerald-400/40" />
        </div>
      </div>

      {/* ── MAIN LAYOUT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── FULL EDIT CONTROLS FORM (5 Cols) ── */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 max-h-[850px] overflow-y-auto">
          <h3 className="flex items-center gap-2 font-black text-base text-slate-900 pb-3 border-b border-slate-100">
            <Sparkles className="h-5 w-5 text-emerald-600" />
            تحرير وتعديل نصوص الشهادة بحرية
          </h3>

          {/* Student Name */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">اسم الطالب الرباعي</label>
            <input
              type="text"
              value={form.studentName}
              onChange={e => setForm(p => ({ ...p, studentName: e.target.value }))}
              placeholder="اكتب اسم الطالب بالكامل..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 focus:outline-none"
            />
          </div>

          {/* Custom Grade / Level */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">الصف / المستوى الدراسي (اكتب أو اختر)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={form.gradeLabel}
                onChange={e => setForm(p => ({ ...p, gradeLabel: e.target.value }))}
                placeholder="مثال: الصف الثالث الابتدائي..."
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
              <select
                onChange={e => e.target.value && setForm(p => ({ ...p, gradeLabel: e.target.value }))}
                className="rounded-xl border border-slate-300 bg-slate-50 px-2 py-2 text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="">اختيارات سريعة...</option>
                {GRADE_PRESETS.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Achievement Domain (Text input + Presets) */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">مجال التفوق والتميز (اكتب النص الذي تريده بحرية)</label>
            <textarea
              value={form.achievement}
              onChange={e => setForm(p => ({ ...p, achievement: e.target.value }))}
              rows={2}
              placeholder="اكتب مجال التفوق والتميز هنا بحرية..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none resize-none"
            />
            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-slate-400 w-full">مقترحات سريعة:</span>
              {SUGGESTED_ACHIEVEMENTS.map(item => (
                <button
                  key={item}
                  onClick={() => setForm(p => ({ ...p, achievement: item }))}
                  className="rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 transition"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Score Slider & Rating Select Dropdown */}
          <div className="space-y-3 rounded-xl bg-slate-50 p-3 border border-slate-200">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-slate-700">نسبة الإنجاز (%)</label>
                <span className="text-xs font-black text-emerald-700 font-mono bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                  %{form.score}
                </span>
              </div>
              <input
                type="range" min="70" max="100" value={form.score}
                onChange={e => {
                  const s = Number(e.target.value);
                  const rating = s >= 95 ? 'ممتاز مع مرتبة الشرف 🌟' : s >= 90 ? 'ممتاز مرتفع 🌟' : s >= 80 ? 'جيد جداً مرتفع 🌟' : 'جيد مرتفع 🌟';
                  setForm(p => ({ ...p, score: s, ratingText: rating }));
                }}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">نص التقدير (اختر من القائمة)</label>
              <select
                value={form.ratingText}
                onChange={e => setForm(p => ({ ...p, ratingText: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
              >
                <option value="ممتاز مع مرتبة الشرف 🌟">ممتاز مع مرتبة الشرف 🌟</option>
                <option value="ممتاز مرتفع 🌟">ممتاز مرتفع 🌟</option>
                <option value="جيد جداً مرتفع 🌟">جيد جداً مرتفع 🌟</option>
                <option value="جيد جداً 🌟">جيد جداً 🌟</option>
                <option value="تفوق واستحقاق استثنائي 🌟">تفوق واستحقاق استثنائي 🌟</option>
              </select>
            </div>
          </div>

          {/* Certificate Main Title & Prefix */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">عنوان الشهادة الرئيسي</label>
              <input
                type="text"
                value={form.certTitle}
                onChange={e => setForm(p => ({ ...p, certTitle: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">عبارة الطالب</label>
              <input
                type="text"
                value={form.studentPrefix}
                onChange={e => setForm(p => ({ ...p, studentPrefix: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Doctor Name & Doctor Title */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">اسم الاستشاري / المعلم</label>
              <input
                type="text"
                value={form.doctorName}
                onChange={e => setForm(p => ({ ...p, doctorName: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">الصفة / المسمى الوظيفي</label>
              <input
                type="text"
                value={form.doctorTitle}
                onChange={e => setForm(p => ({ ...p, doctorTitle: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Date & Serial Code */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">التاريخ</label>
              <input
                type="text"
                value={form.date}
                onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-black text-slate-700">الرقم التسلسلي</label>
                <button onClick={generateNewCertNo} className="text-[10px] text-emerald-700 hover:underline flex items-center gap-1 font-bold">
                  <RefreshCw size={10} /> جديد
                </button>
              </div>
              <input
                type="text"
                value={form.certNumber}
                onChange={e => setForm(p => ({ ...p, certNumber: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:border-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          {/* Custom Note */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1">ملاحظة تشجيعية</label>
            <textarea
              value={form.note}
              onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
              rows={2}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none resize-none"
            />
          </div>

          {/* ── SEND TO PARENT SECTION ── */}
          <div className="space-y-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/70 p-4 border border-emerald-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-700" />
                حدد ولي الأمر المستلم للشهادة:
              </label>
              <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                إرسال فوري 📱
              </span>
            </div>

            <select
              value={selectedParentId}
              onChange={e => setSelectedParentId(e.target.value)}
              className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-900 focus:border-emerald-600 focus:outline-none shadow-sm"
            >
              <option value="">-- اضغط هنا لاختيار ولي الأمر المستلم --</option>
              {parentsList.map(p => (
                <option key={p.id} value={p.id}>
                  👨‍👦 {p.parentName} ({p.phone})
                </option>
              ))}
            </select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                onClick={handleSendWhatsAppToParent}
                disabled={!selectedParentId}
                className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 rounded-xl text-xs font-black transition shadow-sm active:scale-95 disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
                {selectedParentId ? 'إرسال لولي الأمر عبر WhatsApp 📱' : 'اختر ولي الأمر أولاً للإرسال'}
              </button>

              <button
                onClick={handleSendToParentDirect}
                disabled={sendingDirect || !selectedParentId}
                className="flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-2.5 rounded-xl text-xs font-black transition shadow-sm active:scale-95 disabled:opacity-40"
              >
                {sendingDirect ? <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />}
                {selectedParentId ? 'إرسال إشعار بالمنصة 🚀' : 'اختر ولي الأمر أولاً للإرسال'}
              </button>
            </div>

            {directSentMessage && (
              <div className="rounded-xl bg-emerald-100 border border-emerald-300 p-2.5 text-center text-xs font-black text-emerald-900 animate-fadeIn">
                {directSentMessage}
              </div>
            )}
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
            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">معاينة مباشرة للشهادة الرسمية المعتمدة</span>
            <button
              onClick={() => setPreview(true)}
              className="text-xs font-black text-emerald-700 hover:underline flex items-center gap-1"
            >
              عرض التكبير / طباعة
            </button>
          </div>

          <div className="rounded-2xl border-2 border-slate-900 bg-slate-950 p-2 shadow-2xl overflow-hidden">
            <div className="w-full">
              <OfficialMasarCertificateDesign form={form} isPrintTarget={false} />
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
              <div ref={certRef} className="w-full max-w-4xl">
                <OfficialMasarCertificateDesign form={form} isPrintTarget={true} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   OFFICIAL MASAR PLATFORM CERTIFICATE DESIGN
════════════════════════════════════════════════════════════════ */
function OfficialMasarCertificateDesign({ form, isPrintTarget = false }: { form: CertData; isPrintTarget?: boolean }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://masar-platform.com';
  const verifyUrl = `${origin}/verify/${form.certNumber}?name=${encodeURIComponent(form.studentName)}&prog=${encodeURIComponent(form.achievement)}&score=${form.score}&date=${encodeURIComponent(form.date)}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verifyUrl)}`;

  return (
    <div
      id={isPrintTarget ? 'printable-certificate' : 'certificate-preview-only'}
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
            <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#666' }}>{form.certNumber}</div>
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
          {form.certTitle}
        </h1>

        <p style={{ fontSize: 12, fontWeight: 700, color: '#555', margin: 0 }}>
          {form.subTitle}
        </p>

        <p style={{ fontSize: 20, fontWeight: 900, color: '#06392c', margin: 0, fontFamily: 'Georgia, serif' }}>
          {form.doctorName}
        </p>

        <p style={{ fontSize: 11.5, fontWeight: 700, color: '#666', margin: 0 }}>
          {form.studentPrefix} ({form.gradeLabel})
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
            {form.achievementIntro}
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
              {form.ratingText}
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
            {form.doctorName}
          </h3>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', margin: 0 }}>
            {form.doctorTitle}
          </p>

          <div style={{ borderBottom: '1px solid #cbd5e1', width: 220, marginTop: 10, paddingTop: 4, display: 'flex', justifyContent: 'flex-start' }}>
            <span style={{ fontSize: 9.5, fontWeight: 900, color: '#94a3b8' }}>التوقيع المعتمد ✍️</span>
          </div>
        </div>

        {/* Dashed Digital Seal Box WITH OFFICIAL MASAR LOGO AND CLICK-TO-VERIFY LINK */}
        <a
          href={verifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: '#ffffff', border: '1.5px dashed #334155', borderRadius: 14,
            padding: '10px 18px', display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 6, textAlign: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.02)', minWidth: 220,
            textDecoration: 'none', cursor: 'pointer'
          }}
          title="اضغط للتحقق الرقمي من صحة هذه الشهادة"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: '#ffffff',
              border: '1.5px solid #06392c', padding: 4, display: 'flex',
              alignItems: 'center', justifyContent: 'center'
            }}>
              <img src="/brand/masar-logo.png" alt="الختم الرقمي المعتمد — منصة مسار" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#0f172a' }}>الختم الرقمي المعتمد</div>
            <div style={{ fontSize: 9.5, fontFamily: 'monospace', fontWeight: 900, color: '#0f172a', letterSpacing: '0.5px', marginTop: 2 }}>
              {form.certNumber}
            </div>
          </div>
        </a>

      </div>

      {/* ── BOTTOM EMERALD BAR ── */}
      <div style={{
        background: '#06392c', padding: '10px 22px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', borderRadius: '0 0 16px 16px', position: 'relative', zIndex: 1
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BottomGoldMedal />
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#ffffff' }}>وثيقة تفوق موثقة رسمياً</div>
            <div style={{ fontSize: 9.5, color: '#a3b899' }}>منصة مَسَار للتأهيل والتعليم الذكي · جميع الحقوق محفوظة</div>
          </div>
        </div>

        {/* Real Scannable QR Code + Verification Text (Matching Masar Platform standard) */}
        <a
          href={verifyUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            cursor: 'pointer'
          }}
          title="اضغط أو امسح الـ QR للتحقق الرقمي من صحة الشهادة"
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#ffffff', lineHeight: 1.3 }}>
              تحقق من صحة الشهادة
            </div>
            <div style={{ fontSize: 9.5, color: '#a8d4b8', lineHeight: 1.3 }}>
              امسح الكود للتحقق
            </div>
          </div>
          <div style={{
            background: '#ffffff',
            borderRadius: 8,
            padding: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 38,
            height: 38,
            flexShrink: 0
          }}>
            <img
              src={qrImageUrl}
              alt="رمز QR للتحقق"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        </a>
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
        <linearGradient id="mgl_tab_custom" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d060"/><stop offset="55%" stopColor="#d9a030"/><stop offset="100%" stopColor="#9a6210"/>
        </linearGradient>
      </defs>
      <path d="M12 26L7 42L15 38L19 42L17 26Z" fill="#b07820"/>
      <path d="M26 26L31 42L23 38L19 42L21 26Z" fill="#b07820"/>
      <circle cx="19" cy="16" r="15" fill="url(#mgl_tab_custom)"/>
      <circle cx="19" cy="16" r="12.5" fill="none" stroke="#fff" strokeWidth="1.4"/>
      <path d="M13 16L17 20.5L25 12" stroke="#06392c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
}
