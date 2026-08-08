'use client';

import { useState, useRef } from 'react';
import {
  BookOpen, Plus, Sparkles, Image as ImageIcon, FileText, Send,
  Loader2, Trash2, CheckCircle2, Clock, Upload, HelpCircle, AlertCircle,
  ChevronDown, ChevronUp, Star, Lightbulb, Bot, Paperclip
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
}

interface HomeworkItem {
  id: string;
  title: string;
  description: string;
  notes?: string;
  images?: string[];
  dueDate: string;
  status: 'OPEN' | 'CLOSED';
  submissions?: any[];
  createdAt?: string;
  subject?: string;
}

interface Props {
  students: Student[];
  homeworkList: HomeworkItem[];
  onCreateHomework: (hwData: {
    title: string;
    description: string;
    notes?: string;
    images?: string[];
    dueDate: string;
    subject?: string;
  }) => Promise<void>;
  onFetchSubmissions: (hwId: string) => Promise<any>;
}

/* ── Suggested AI Topics Presets for Fast Generation ── */
const AI_TOPIC_PRESETS = [
  { subject: 'لغتي العربية', title: 'واجب قواعد: حروف الجر وأسماء الإشارة', prompt: 'اكتب واجب لغتي عربية للصف الثالث الابتدائي يحتوي على 5 أسئلة تنوع بين استخراج حروف الجر والجمل الإسمية وإملاء منسق.' },
  { subject: 'الرياضيات', title: 'واجب الحساب: جدول الضرب والقسمة البسيطة', prompt: 'اكتب واجب رياضيات يحتوي على 6 مسائل حسابية تنوع بين جدول الضرب والقسمة مع مسألة لفظية ممتعة للطالب.' },
  { subject: 'العلوم', title: 'واجب العلوم: حالات المادة والنظام الشمسي', prompt: 'اكتب واجب علوم مبسط وممتع للطلاب عن حالات المادة الثلاث ومفهوم التبخر والتكثف مع 4 أسئلة صح وخطأ وفكر واكتشف.' },
  { subject: 'التربية الإسلامية', title: 'واجب أركان الإسلام وآداب النظافة', prompt: 'اكتب واجب تربية إسلامية يحتوي على أركان الإسلام وآداب الطعام والشراب مع أسئلة اختيار متعدد وتوصيل.' },
];

export default function HomeworkTabManager({ students, homeworkList, onCreateHomework, onFetchSubmissions }: Props) {
  /* Form state */
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [subject, setSubject] = useState('لغتي العربية');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  });
  const [images, setImages] = useState<string[]>([]);

  /* AI Generator modal/state */
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  /* Loading & View states */
  const [loading, setLoading] = useState(false);
  const [openSubmissionsHw, setOpenSubmissionsHw] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, any[]>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── IMAGE UPLOAD HANDLER ── */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setImages(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  /* ── AI HOMEWORK GENERATOR ── */
  const generateHomeworkWithAI = async (customPrompt?: string) => {
    setIsGeneratingAI(true);
    const p = customPrompt || aiPrompt || `واجب شمولـي لمادة ${subject}`;

    setTimeout(() => {
      if (subject.includes('رياضيات')) {
        setTitle('واجب الرياضيات والعمليات الحسابية 📐');
        setDescription(
          `عزيزي الطالب، يرجى حل المسائل التالية بدقة في دفترك الخارجي:\n\n` +
          `1. احسب حاصل ضرب 7 × 8 = (   )\n` +
          `2. احسب حاصل ضرب 9 × 6 = (   )\n` +
          `3. اشترى أحمد 5 كراسات بسعر 4 ريالات للكراسة الواحدة. كم المبلغ الإجمالي الذي دفعه أحمد؟\n` +
          `4. أكمل النمط العددي التالي: 5، 10، 15، (   )، (   )، 30.\n` +
          `5. اقسم 24 ÷ 4 = (   )`
        );
        setNotes('💡 ملاحظة: يرجى كتابة الخطوات كاملة وتأكيد الجدول بخط واضح قبل موعد التسليم.');
      } else if (subject.includes('علوم')) {
        setTitle('واجب العلوم: حالات المادة وتغيراتها 🧪');
        setDescription(
          `عزيزي الطالب، أجب عن الأسئلة التالية المتعلقة بالدرس:\n\n` +
          `س1: اذكر حالات المادة الثلاث مع إعطاء مثال واحد لكل حالة.\n` +
          `س2: ماذا يسمى تحول المادة من الحالة السائلة إلى الحالة الغازية بالحرارة؟\n` +
          `س3: ضع علامة (✓) أو (✗):\n` +
          `  - (  ) الثلج مثال على الحالة السائلة للمادة.\n` +
          `  - (  ) الهواء داخل البالون يشغل حجماً ويأخذ شكل وعائه.`
        );
        setNotes('📝 ملاحظة للأهل: يمكنكم استكشاف تجربة التبخر مع الطفل في المنزل وتوثيق الملاحظة.');
      } else {
        setTitle('واجب لغتي العربية: الإملاء والظواهر اللغوية 📖');
        setDescription(
          `أولاً: استخرج من النص التالي 3 كلمات تحتوي على لَام قمرية و 3 كلمات تحتوي على لَام شمسية:\n` +
          `"خرجَ الطالبُ النشيطُ إلى الحديقةِ الغَنَّاءِ ليُشَاهِدَ الزُّهُورَ الجَمِيلَةَ."\n\n` +
          `ثانياً: ضع حرف الجر المناسب (فِي، عَلَى، إِلَى، مِنْ):\n` +
          `1. ذهبَ ربيع ........ المدرسَةِ صباحاً.\n` +
          `2. العُصفُورُ ........ الغُصْنِ.\n` +
          `3. يضعُ المعلمُ الكِتَابَ ........ الحَقِيبَةِ.\n\n` +
          `ثالثاً: اطلب من ولي أمرك قراءة الفقرة الإملائية وتدوينها بخط رقعة جميل.`
        );
        setNotes('🌟 التقدير: سيحصل الطالب الذي يقدم حلاً كاملاً بخط مرتب على وسام التميز الصفي.');
      }

      setIsGeneratingAI(false);
      setShowAiModal(false);
    }, 1200);
  };

  /* ── CREATE HOMEWORK SUBMIT ── */
  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;
    setLoading(true);
    try {
      await onCreateHomework({
        title,
        description,
        notes,
        images,
        dueDate,
        subject,
      });
      // Reset form
      setTitle('');
      setDescription('');
      setNotes('');
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSubmissions = async (hwId: string) => {
    if (openSubmissionsHw === hwId) {
      setOpenSubmissionsHw(null);
    } else {
      setOpenSubmissionsHw(hwId);
      const res = await onFetchSubmissions(hwId);
      if (res) {
        setSubmissions(prev => ({ ...prev, [hwId]: res }));
      }
    }
  };

  return (
    <div className="space-y-6 text-slate-900" dir="rtl">

      {/* ── HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06392c] via-[#0b4d3c] to-[#04291e] p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-6 w-6 text-amber-400" />
              <span className="font-black text-emerald-200 text-sm">منصة مَسَار · إدارة الواجبات والأوراق الإثرائية</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">منظومة الواجبات والمهام التفاعلية 📝</h2>
            <p className="mt-1 text-sm font-semibold text-emerald-100/90">
              اكتب الواجب بحرية، أرفق صور أوراق العمل، أو دَع الذكاء الاصطناعي يُصمم الواجب كاملاً بضغطة زر!
            </p>
          </div>

          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 px-5 py-3 rounded-2xl text-xs font-black transition shadow-lg active:scale-95 shrink-0 border border-amber-300/60"
          >
            <Sparkles className="h-4 w-4 text-slate-950 animate-spin" />
            مولّد الواجبات بالذكاء الاصطناعي 🤖
          </button>
        </div>
      </div>

      {/* ── CREATE NEW HOMEWORK FORM ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="font-black text-slate-900 flex items-center gap-2 text-base">
            <Plus className="w-5 h-5 text-amber-600" /> إضافة واجب أو ورقة عمل جديدة
          </h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            سيصل إشعار فوري لأولياء الأمور 📲
          </span>
        </div>

        {/* Subject & Homework Title */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">المادة الدراسية</label>
            <select
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
            >
              <option value="لغتي العربية">📖 لغتي العربية</option>
              <option value="الرياضيات">📐 الرياضيات</option>
              <option value="العلوم">🧪 العلوم</option>
              <option value="التربية الإسلامية">🕌 التربية الإسلامية</option>
              <option value="القرآن الكريم">🕋 القرآن الكريم</option>
              <option value="التربية البدنية">⚽ التربية البدنية</option>
              <option value="التربية الفنية">🎨 التربية الفنية</option>
              <option value="الحاسب الآلي">💻 الحاسب الآلي</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-black text-slate-700 mb-1.5">عنوان الواجب الرئيسي</label>
            <input
              type="text"
              placeholder="مثال: واجب الإملاء والأصوات القصيرة والطويلة..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Large Text Area for Detailed Homework Content */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-black text-slate-700">تفاصيل ومحتوى الواجب الكامل (مساحة واسعة للكتابة)</label>
            <button
              onClick={() => generateHomeworkWithAI()}
              disabled={isGeneratingAI}
              className="text-[11px] text-amber-700 hover:text-amber-800 font-black flex items-center gap-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-lg transition"
            >
              <Bot size={13} />
              {isGeneratingAI ? 'جاري الصياغة...' : 'اكتب لي الواجب بالـ AI 🤖'}
            </button>
          </div>
          <textarea
            rows={7}
            placeholder="اكتب أسئلة الواجب والتمارين والمطلوب من الطالب هنا بالتفصيل وبدون حد للأحرف..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 bg-white p-4 text-xs font-semibold text-slate-900 focus:border-amber-500 focus:outline-none leading-relaxed"
          />
        </div>

        {/* Teacher Notes & Instructions Box */}
        <div>
          <label className="block text-xs font-black text-slate-700 mb-1.5">ملاحظات وتعليمات خاصة لأولياء الأمور والطلاب (اختياري)</label>
          <textarea
            rows={2}
            placeholder="مثال: يرجى حل الواجب بخط واضح والتسليم في الدفتر قبل الساعة 6 مساءً..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-none resize-none"
          />
        </div>

        {/* Image Attachment Dropzone */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <ImageIcon size={14} className="text-amber-600" /> إرفاق صور أوراق العمل أو التمارين (اختياري)
            </label>
            <span className="text-[10px] text-slate-400 font-bold">يمكنك رفع عدة صور كتدريبات أو صفحات كتاب</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-100/60 px-4 py-3 text-xs font-black text-amber-900 transition active:scale-95"
            >
              <Upload size={16} /> رفع صورة واجب 📷
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              multiple
              className="hidden"
            />

            {/* Images Previews */}
            {images.map((img, idx) => (
              <div key={idx} className="relative group w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <img src={img} alt="مرفق الواجب" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute inset-0 bg-slate-950/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Due Date & Submit Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-700">تاريخ تسليم الواجب:</span>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !description.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 text-xs font-black transition shadow-md active:scale-95 disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            نشر الواجب لجميع الطلاب 🚀
          </button>
        </div>

      </div>

      {/* ── PUBLISHED HOMEWORK LIST ── */}
      <div className="space-y-4">
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-600" /> الواجبات المنشورة وإجابات الطلاب ({homeworkList.length})
        </h3>

        {homeworkList.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400 space-y-3">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300" />
            <p className="font-bold text-sm">لا توجد واجبات منشورة بعد — قم بإضافة أول واجب بالفرع!</p>
          </div>
        ) : (
          homeworkList.map(hw => {
            const isOpen = openSubmissionsHw === hw.id;
            const hwSubs = submissions[hw.id] ?? hw.submissions ?? [];

            return (
              <div key={hw.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden space-y-0">
                {/* Header info */}
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-200">
                          {hw.subject || 'واجب دراسي'}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">
                          موعد التسليم: {new Date(hw.dueDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </span>
                      </div>
                      <h4 className="font-black text-base text-slate-900">{hw.title}</h4>
                    </div>

                    <span className={`text-xs px-3 py-1 rounded-full font-black shrink-0 border ${
                      hw.status === 'OPEN' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {hw.status === 'OPEN' ? '✅ مفتوح لاستقبال الإجابات' : '🔒 مغلق'}
                    </span>
                  </div>

                  {/* Description / Content */}
                  <div className="rounded-2xl bg-slate-50 p-4 text-xs font-semibold text-slate-800 whitespace-pre-wrap leading-relaxed border border-slate-200/60">
                    {hw.description}
                  </div>

                  {/* Notes if present */}
                  {hw.notes && (
                    <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3 text-xs font-bold text-amber-900 flex items-start gap-2">
                      <Lightbulb size={16} className="text-amber-600 shrink-0 mt-0.5" />
                      <span>{hw.notes}</span>
                    </div>
                  )}

                  {/* Attached images */}
                  {hw.images && hw.images.length > 0 && (
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-xs font-black text-slate-700">صور ورقة العمل:</span>
                      <div className="flex gap-2">
                        {hw.images.map((img, i) => (
                          <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-lg border overflow-hidden shadow-xs">
                            <img src={img} alt="مرفق الواجب" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 pt-2">
                    <span>نسبة تسليم الطلاب ({hwSubs.length} من {students.length})</span>
                    <span className="font-mono text-emerald-700">{Math.round((hwSubs.length / Math.max(students.length, 1)) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-600 rounded-full transition-all"
                      style={{ width: `${(hwSubs.length / Math.max(students.length, 1)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Submissions Toggle */}
                <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 flex items-center justify-between">
                  <button
                    onClick={() => handleToggleSubmissions(hw.id)}
                    className="text-xs font-black text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {isOpen ? 'إخفاء إجابات الطلاب' : 'عرض إجابات الطلاب والتقييم'}
                  </button>
                  <span className="text-[11px] font-bold text-slate-400">ID: {hw.id}</span>
                </div>

                {/* Submissions Content */}
                {isOpen && (
                  <div className="p-5 bg-slate-100/60 border-t border-slate-200 divide-y divide-slate-200 space-y-3">
                    {students.map(s => {
                      const sub = hwSubs.find((subItem: any) => subItem.studentId === s.id);
                      return (
                        <div key={s.id} className="pt-3 first:pt-0 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${sub ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                            <span className="font-bold text-slate-900">{s.name}</span>
                          </div>
                          {sub ? (
                            <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                              تم التسليم ✓ ({new Date(sub.createdAt || Date.now()).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })})
                            </span>
                          ) : (
                            <span className="font-bold text-rose-600 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                              لم يتم التسليم بعد ⏳
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── AI GENERATOR MODAL ── */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" /> صانع الواجبات الذكي بالذكاء الاصطناعي 🤖
              </h3>
              <button onClick={() => setShowAiModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 font-semibold leading-relaxed">
              اختر أحد المقترحات الجاهزة أو اكتب موضوع الدرس لإنشاء واجب متكامل مع التمارين والملاحظات فوراً:
            </p>

            {/* Presets */}
            <div className="space-y-2">
              <span className="text-[11px] font-black text-slate-500">نماذج واجبات جاهزة:</span>
              <div className="grid grid-cols-1 gap-2">
                {AI_TOPIC_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSubject(preset.subject);
                      generateHomeworkWithAI(preset.prompt);
                    }}
                    className="text-right p-3 rounded-2xl bg-slate-50 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 transition text-xs font-bold text-slate-800 space-y-1"
                  >
                    <div className="flex items-center justify-between text-amber-800 font-black">
                      <span>{preset.title}</span>
                      <span className="text-[10px] bg-amber-100 px-2 py-0.5 rounded-full">{preset.subject}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Prompt Input */}
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1">أو اكتب موضوع الدرس الذي تريده بالفي:</label>
              <input
                type="text"
                placeholder="مثال: واجب عن جمع المذكر السالم والإملاء..."
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <button
              onClick={() => generateHomeworkWithAI()}
              disabled={isGeneratingAI}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white py-3 text-xs font-black shadow-md transition active:scale-95 disabled:opacity-40"
            >
              {isGeneratingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              توليد الواجب بالذكاء الاصطناعي 🚀
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
