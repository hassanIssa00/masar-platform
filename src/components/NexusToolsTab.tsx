'use client';

import { useState, useEffect } from 'react';
import {
  Zap, ClipboardCheck, Award, BookOpen, Users, Bell, MessageSquare,
  CheckCircle, XCircle, RotateCcw, FileText, Calendar, Clock,
  Heart, Target, TrendingUp, Eye, Sparkles, PenLine, Hash, BarChart3,
  Layers, Volume2, Send, Search,
} from 'lucide-react';

/* ─────── Types ─────── */
interface Student { id: string; name: string; phone?: string; photoUrl?: string; grade?: string; }
interface NexusToolsTabProps { students: Student[]; }
type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
type BehaviorSeverity = 'positive' | 'neutral' | 'urgent';
type BehaviorCategory = 'academic' | 'behavior' | 'praise' | 'guidance';
type ToolKey =
  | 'attendance' | 'grade-entry' | 'quick-note' | 'certificates'
  | 'homework-assign' | 'behavior-log' | 'class-stats'
  | 'parent-msg' | 'weekly-report' | 'seat-shuffle'
  | 'timer-tool' | 'random-student' | 'mood-check'
  | 'skill-tracker' | 'group-maker' | 'exam-schedule'
  | 'reading-log' | 'vocab-list' | 'announcement' | 'absent-followup';

/* ─────── Persistence ─────── */
function nexusGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem('nexus_' + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}
function nexusSet<T>(key: string, value: T): void {
  try { localStorage.setItem('nexus_' + key, JSON.stringify(value)); } catch {}
}

const TODAY = new Date().toISOString().slice(0, 10);

/* ─────── Tool Definitions ─────── */
const TOOLS: { key: ToolKey; arabicLabel: string; icon: React.ElementType; color: string; bg: string; border: string; description: string; }[] = [
  { key: 'attendance',      arabicLabel: 'كشف الحضور',             icon: ClipboardCheck, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', description: 'سجّل حضور وغياب الطلاب بضغطة واحدة' },
  { key: 'absent-followup', arabicLabel: 'متابعة الغائبين',        icon: Bell,           color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',    description: 'أرسل تنبيهاً لولي أمر الطالب الغائب' },
  { key: 'mood-check',      arabicLabel: 'فحص مزاج الطلاب',       icon: Heart,          color: 'text-pink-700',    bg: 'bg-pink-50',    border: 'border-pink-200',    description: 'رصد الحالة النفسية لطلاب الفصل' },
  { key: 'grade-entry',     arabicLabel: 'إدخال الدرجات',          icon: Hash,           color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    description: 'سجّل درجات الاختبارات والتقييمات' },
  { key: 'skill-tracker',   arabicLabel: 'متابعة المهارات',        icon: Target,         color: 'text-indigo-700',  bg: 'bg-indigo-50',  border: 'border-indigo-200',  description: 'تتبع إتقان المهارات الأساسية لكل طالب' },
  { key: 'reading-log',     arabicLabel: 'سجل القراءة',            icon: BookOpen,       color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200',    description: 'سجّل مستوى قراءة الطلاب يومياً' },
  { key: 'class-stats',     arabicLabel: 'إحصاءات الفصل',          icon: BarChart3,      color: 'text-violet-700',  bg: 'bg-violet-50',  border: 'border-violet-200',  description: 'عرض لحظي لمتوسطات الحضور والأداء' },
  { key: 'homework-assign', arabicLabel: 'إسناد الواجبات',         icon: PenLine,        color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   description: 'أنشئ وأسنِد واجبات للطلاب فورياً' },
  { key: 'vocab-list',      arabicLabel: 'قائمة المفردات',         icon: Layers,         color: 'text-cyan-700',    bg: 'bg-cyan-50',    border: 'border-cyan-200',    description: 'أنشئ قوائم مفردات لغوية للطلاب' },
  { key: 'exam-schedule',   arabicLabel: 'جدول الاختبارات',        icon: Calendar,       color: 'text-slate-700',   bg: 'bg-slate-50',   border: 'border-slate-200',   description: 'نظّم جدول الاختبارات والتقييمات' },
  { key: 'behavior-log',    arabicLabel: 'سجل الملاحظات السلوكية', icon: Eye,            color: 'text-orange-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  description: 'سجّل ملاحظات سلوكية وأكاديمية' },
  { key: 'quick-note',      arabicLabel: 'ملاحظة سريعة',           icon: FileText,       color: 'text-slate-700',   bg: 'bg-slate-50',   border: 'border-slate-200',   description: 'دوّن ملاحظة سريعة على أي طالب' },
  { key: 'weekly-report',   arabicLabel: 'التقرير الأسبوعي',       icon: TrendingUp,     color: 'text-green-700',   bg: 'bg-green-50',   border: 'border-green-200',   description: 'أنشئ تقريراً أسبوعياً شاملاً للفصل' },
  { key: 'parent-msg',      arabicLabel: 'رسالة لولي الأمر',       icon: MessageSquare,  color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-200',  description: 'أرسل رسالة مباشرة لولي أمر الطالب' },
  { key: 'announcement',    arabicLabel: 'إعلان للفصل',            icon: Volume2,        color: 'text-rose-700',    bg: 'bg-rose-50',    border: 'border-rose-200',    description: 'أرسل إعلاناً لجميع أسر الفصل' },
  { key: 'random-student',  arabicLabel: 'اختيار طالب عشوائي',    icon: Sparkles,       color: 'text-fuchsia-700', bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', description: 'اختر طالباً عشوائياً للمشاركة' },
  { key: 'seat-shuffle',    arabicLabel: 'ترتيب المقاعد',          icon: RotateCcw,      color: 'text-sky-700',     bg: 'bg-sky-50',     border: 'border-sky-200',     description: 'عشوائيات جديدة لترتيب مقاعد الطلاب' },
  { key: 'group-maker',     arabicLabel: 'تقسيم مجموعات',          icon: Users,          color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-200',    description: 'قسّم الطلاب إلى مجموعات عمل' },
  { key: 'timer-tool',      arabicLabel: 'مؤقت الفصل',             icon: Clock,          color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   description: 'مؤقت للأنشطة والاختبارات الصفية' },
  { key: 'certificates',    arabicLabel: 'إصدار شهادة تقدير',      icon: Award,          color: 'text-yellow-700',  bg: 'bg-yellow-50',  border: 'border-yellow-200',  description: 'أصدر شهادة تقدير فورية للطالب' },
];

/* ═══════════════════════ MAIN COMPONENT ═══════════════════════ */
export default function NexusToolsTab({ students }: NexusToolsTabProps) {
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const [feedback, setFeedback] = useState<{ msg: string; ok: boolean } | null>(null);

  // Persisted data
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(() =>
    nexusGet('attendance_' + TODAY, {} as Record<string, AttendanceStatus>));
  const [grades, setGrades] = useState<any[]>(() => nexusGet('grades', [] as any[]));
  const [observations, setObservations] = useState<any[]>(() => nexusGet('observations', [] as any[]));
  const [certs, setCerts] = useState<any[]>(() => nexusGet('certs', [] as any[]));
  const [homeworkList, setHomeworkList] = useState<any[]>(() => nexusGet('homework_nexus', [] as any[]));
  const [moods, setMoods] = useState<Record<string, string>>(() => nexusGet('moods_' + TODAY, {} as Record<string, string>));

  // Form fields
  const [gradeSubject, setGradeSubject] = useState('');
  const [gradeMaxScore, setGradeMaxScore] = useState(10);
  const [gradeEntries, setGradeEntries] = useState<Record<string, number>>({});
  const [obsStudent, setObsStudent] = useState('');
  const [obsCategory, setObsCategory] = useState<BehaviorCategory>('academic');
  const [obsSeverity, setObsSeverity] = useState<BehaviorSeverity>('neutral');
  const [obsNote, setObsNote] = useState('');
  const [certStudent, setCertStudent] = useState('');
  const [certType, setCertType] = useState('شهادة تفوق');
  const [certReason, setCertReason] = useState('');
  const [hwSubject, setHwSubject] = useState('');
  const [hwTitle, setHwTitle] = useState('');
  const [hwDue, setHwDue] = useState('');
  const [msgStudent, setMsgStudent] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [announcementBody, setAnnouncementBody] = useState('');
  const [randomResult, setRandomResult] = useState<Student | null>(null);
  const [groups, setGroups] = useState<Student[][]>([]);
  const [groupCount, setGroupCount] = useState(4);
  const [seating, setSeating] = useState<Student[]>([]);
  const [timerSecs, setTimerSecs] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerInput, setTimerInput] = useState(5);
  const [vocabSubject, setVocabSubject] = useState('');
  const [vocabWords, setVocabWords] = useState('');
  const [quickNote, setQuickNote] = useState('');
  const [quickNoteStudent, setQuickNoteStudent] = useState('');
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [examSubject, setExamSubject] = useState('');

  // Timer effect
  useEffect(() => {
    if (!timerActive) return;
    const id = setInterval(() => {
      setTimerSecs(s => { if (s <= 1) { setTimerActive(false); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(id);
  }, [timerActive]);

  /* ─ Helpers ─ */
  const flash = (msg: string, ok = true) => {
    setFeedback({ msg, ok });
    setTimeout(() => setFeedback(null), 3000);
  };
  const saveAtt = (a: typeof attendance) => { setAttendance(a); nexusSet('attendance_' + TODAY, a); };
  const markAll = (status: AttendanceStatus) => {
    const n = Object.fromEntries(students.map(s => [s.id, status]));
    saveAtt(n);
    flash('تم تسجيل ' + students.length + ' طالب');
  };
  const toggleAtt = (id: string) => {
    const cycle: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];
    const cur = attendance[id] || 'absent';
    const next = cycle[(cycle.indexOf(cur) + 1) % cycle.length];
    saveAtt({ ...attendance, [id]: next });
  };
  const attColor = (s?: AttendanceStatus) =>
    !s || s === 'absent' ? 'bg-rose-100 text-rose-800 border-rose-200' :
    s === 'present' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
    s === 'late' ? 'bg-amber-100 text-amber-800 border-amber-200' :
    'bg-blue-100 text-blue-800 border-blue-200';
  const attLabel = (s?: AttendanceStatus) =>
    !s || s === 'absent' ? 'غائب ✗' : s === 'present' ? 'حاضر ✓' : s === 'late' ? 'متأخر ⏱' : 'معذور 📋';

  const presentCount = Object.values(attendance).filter(s => s === 'present').length;
  const absentCount  = Object.values(attendance).filter(s => s === 'absent').length;
  const lateCount    = Object.values(attendance).filter(s => s === 'late').length;
  const formatTimer  = (s: number) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  const visibleTools = TOOLS.filter(t => searchQ === '' || t.arabicLabel.includes(searchQ));

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div className="rounded-3xl bg-gradient-to-l from-indigo-600 via-violet-600 to-purple-600 p-5 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black">Nexus Tools — أدوات المعلم الذكية</h2>
            </div>
            <p className="text-sm text-indigo-100 font-medium">
              {TOOLS.length} أداة متكاملة · حضور · تقييم · واجبات · تواصل · تكريم
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {[{l:'حاضر',v:presentCount},{l:'غائب',v:absentCount},{l:'متأخر',v:lateCount},{l:'طلاب',v:students.length}].map(s=>(
              <div key={s.l} className="bg-white/15 rounded-2xl px-4 py-2 text-center">
                <div className="text-2xl font-black">{s.v}</div>
                <div className="text-xs text-indigo-100">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FEEDBACK TOAST */}
      {feedback && (
        <div className={`flex items-center gap-3 p-3.5 rounded-2xl border text-sm font-bold ${feedback.ok ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-rose-50 border-rose-300 text-rose-900'}`}>
          {feedback.ok ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {feedback.msg}
        </div>
      )}

      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          placeholder="ابحث عن أداة..."
          className="w-full pr-10 pl-3 py-2.5 border border-slate-200 rounded-xl text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* TOOLS GRID */}
      {activeTool === null && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {visibleTools.map(tool => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.key}
                onClick={() => setActiveTool(tool.key)}
                className={`group flex flex-col items-start gap-2.5 p-4 rounded-2xl border ${tool.bg} ${tool.border} hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 text-right cursor-pointer`}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/70">
                  <Icon className={`w-5 h-5 ${tool.color}`} />
                </div>
                <div>
                  <div className={`text-[13px] font-black ${tool.color} leading-tight`}>{tool.arabicLabel}</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-0.5 leading-tight">{tool.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ACTIVE TOOL PANEL */}
      {activeTool !== null && (
        <div className="space-y-4">
          <button
            onClick={() => setActiveTool(null)}
            className="flex items-center gap-2 text-sm font-black text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl px-4 py-2 transition cursor-pointer"
          >
            ← رجوع للأدوات
          </button>

          {/* ═ ATTENDANCE ═ */}
          {activeTool === 'attendance' && (
            <div className="rounded-2xl bg-white border border-emerald-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-emerald-600 to-teal-600 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5" /> كشف الحضور — {TODAY}
                </h3>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {(['present','absent','late','excused'] as AttendanceStatus[]).map(s => (
                    <button key={s} onClick={() => markAll(s)} className="text-xs font-black bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 transition cursor-pointer">
                      الكل {s==='present'?'حاضر':s==='absent'?'غائب':s==='late'?'متأخر':'معذور'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {students.map(s => (
                  <button key={s.id} onClick={() => toggleAtt(s.id)} className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-sm font-bold transition cursor-pointer ${attColor(attendance[s.id])}`}>
                    <span>{s.name}</span>
                    <span className="text-xs font-black shrink-0">{attLabel(attendance[s.id])}</span>
                  </button>
                ))}
                {students.length === 0 && <p className="col-span-full text-center text-slate-400 text-sm py-8">لا يوجد طلاب</p>}
              </div>
              <div className="px-5 py-3 bg-emerald-50 border-t border-emerald-100 flex flex-wrap gap-4 text-xs font-black text-emerald-800">
                <span>✓ حاضر: {presentCount}</span>
                <span>✗ غائب: {absentCount}</span>
                <span>⏱ متأخر: {lateCount}</span>
                <span>📋 معذور: {Object.values(attendance).filter(a => a === 'excused').length}</span>
              </div>
            </div>
          )}

          {/* ═ ABSENT FOLLOWUP ═ */}
          {activeTool === 'absent-followup' && (
            <div className="rounded-2xl bg-white border border-rose-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-rose-600 to-red-600 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><Bell className="w-5 h-5" /> متابعة الغائبين</h3>
              </div>
              <div className="p-5 space-y-3">
                {students.filter(s => attendance[s.id] === 'absent').map(s => (
                  <div key={s.id} className="flex items-center justify-between bg-rose-50 border border-rose-200 rounded-xl p-3">
                    <div>
                      <div className="text-sm font-black text-rose-900">{s.name}</div>
                      <div className="text-xs text-rose-600 font-medium">غائب اليوم</div>
                    </div>
                    <button onClick={() => flash('تم إرسال تنبيه لولي أمر ' + s.name + ' ✅')} className="text-xs font-black bg-rose-600 text-white px-3 py-2 rounded-xl hover:bg-rose-700 transition cursor-pointer flex items-center gap-1">
                      <Bell className="w-3 h-3" /> تنبيه ولي الأمر
                    </button>
                  </div>
                ))}
                {students.filter(s => attendance[s.id] === 'absent').length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
                    <p className="text-sm font-bold">جميع الطلاب حاضرون! 🎉</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═ MOOD CHECK ═ */}
          {activeTool === 'mood-check' && (
            <div className="rounded-2xl bg-white border border-pink-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-pink-600 to-rose-600 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><Heart className="w-5 h-5" /> فحص مزاج الطلاب</h3>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {students.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-pink-50 border border-pink-100 rounded-xl p-3">
                      <span className="text-sm font-bold text-pink-900">{s.name}</span>
                      <div className="flex gap-2">
                        {[{v:'happy',e:'😊',c:'bg-emerald-100 border-emerald-300'},{v:'neutral',e:'😐',c:'bg-amber-100 border-amber-300'},{v:'sad',e:'😢',c:'bg-rose-100 border-rose-300'}].map(m => (
                          <button key={m.v} onClick={() => { const u = {...moods,[s.id]:m.v}; setMoods(u); nexusSet('moods_'+TODAY,u); }} className={`w-8 h-8 rounded-xl border-2 text-lg flex items-center justify-center transition cursor-pointer ${moods[s.id]===m.v?m.c+' scale-110 shadow-sm':'bg-white border-slate-200 opacity-50 hover:opacity-100'}`}>
                            {m.e}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {Object.keys(moods).length > 0 && (
                  <div className="mt-4 bg-pink-50 border border-pink-200 rounded-xl p-3 flex gap-4 text-xs font-black text-pink-800">
                    <span>😊 {Object.values(moods).filter(m=>m==='happy').length}</span>
                    <span>😐 {Object.values(moods).filter(m=>m==='neutral').length}</span>
                    <span>😢 {Object.values(moods).filter(m=>m==='sad').length}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═ GRADE ENTRY ═ */}
          {activeTool === 'grade-entry' && (
            <div className="rounded-2xl bg-white border border-blue-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-blue-600 to-indigo-600 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><Hash className="w-5 h-5" /> إدخال الدرجات</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-600 mb-1 block">المادة *</label>
                    <input value={gradeSubject} onChange={e=>setGradeSubject(e.target.value)} placeholder="مثال: رياضيات" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-600 mb-1 block">الدرجة العظمى</label>
                    <input type="number" value={gradeMaxScore} onChange={e=>setGradeMaxScore(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {students.map(s => (
                    <div key={s.id} className="flex items-center gap-3">
                      <span className="flex-1 text-sm font-bold text-slate-800">{s.name}</span>
                      <input type="number" min={0} max={gradeMaxScore} value={gradeEntries[s.id] ?? ''} onChange={e=>setGradeEntries(p=>({...p,[s.id]:Number(e.target.value)}))} placeholder={'/ '+gradeMaxScore} className="w-24 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-blue-300" />
                    </div>
                  ))}
                </div>
                <button onClick={() => {
                  if (!gradeSubject) return flash('أدخل اسم المادة', false);
                  const ng = students.filter(s=>gradeEntries[s.id]!==undefined).map(s=>({studentId:s.id,subject:gradeSubject,score:gradeEntries[s.id],maxScore:gradeMaxScore,date:TODAY}));
                  const u = [...grades.filter(g=>!(g.subject===gradeSubject&&g.date===TODAY)),...ng];
                  setGrades(u); nexusSet('grades',u);
                  flash('تم حفظ ' + ng.length + ' درجة');
                }} className="w-full py-3 bg-gradient-to-l from-blue-600 to-indigo-600 text-white font-black rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition shadow-sm cursor-pointer">
                  حفظ الدرجات ✓
                </button>
              </div>
            </div>
          )}

          {/* ═ SKILL TRACKER ═ */}
          {activeTool === 'skill-tracker' && (
            <div className="rounded-2xl bg-white border border-indigo-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-indigo-600 to-blue-600 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><Target className="w-5 h-5" /> متابعة المهارات</h3>
              </div>
              <div className="p-5 space-y-3">
                {students.map(s => {
                  const k = 'skills_'+s.id;
                  const level = nexusGet<number>(k, 0);
                  return (
                    <div key={s.id} className="flex items-center gap-4 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                      <span className="flex-1 text-sm font-bold text-indigo-900">{s.name}</span>
                      <div className="flex gap-1">
                        {[1,2,3,4,5].map(l => (
                          <button key={l} onClick={()=>{nexusSet(k,l);flash('مستوى '+l+'/5 لـ'+s.name);}} className={`w-7 h-7 rounded-lg text-xs font-black transition cursor-pointer ${level>=l?'bg-indigo-600 text-white shadow-sm':'bg-white border border-indigo-200 text-indigo-400 hover:border-indigo-400'}`}>{l}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═ READING LOG ═ */}
          {activeTool === 'reading-log' && (
            <div className="rounded-2xl bg-white border border-teal-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-teal-600 to-cyan-600 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><BookOpen className="w-5 h-5" /> سجل القراءة</h3>
              </div>
              <div className="p-5 space-y-3">
                {students.map(s => {
                  const k = 'reading_'+TODAY+'_'+s.id;
                  const level = nexusGet<string>(k, '');
                  return (
                    <div key={s.id} className="flex items-center gap-3 bg-teal-50 border border-teal-100 rounded-xl p-3">
                      <span className="flex-1 text-sm font-bold text-teal-900">{s.name}</span>
                      {(['excellent','good','average','poor'] as const).map(l => (
                        <button key={l} onClick={()=>{nexusSet(k,l);flash('تم تسجيل مستوى '+s.name);}} className={`text-xs font-black px-2 py-1.5 rounded-lg transition cursor-pointer ${level===l?(l==='excellent'?'bg-emerald-600 text-white':l==='good'?'bg-blue-600 text-white':l==='average'?'bg-amber-500 text-white':'bg-rose-600 text-white'):'bg-white border border-teal-200 text-teal-700 hover:border-teal-400'}`}>
                          {l==='excellent'?'ممتاز':l==='good'?'جيد':l==='average'?'متوسط':'ضعيف'}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═ CLASS STATS ═ */}
          {activeTool === 'class-stats' && (
            <div className="rounded-2xl bg-white border border-violet-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-violet-600 to-purple-600 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5" /> إحصاءات الفصل</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {label:'إجمالي الطلاب',value:students.length,color:'text-blue-700',bg:'bg-blue-50 border-blue-200'},
                    {label:'حاضرون',value:presentCount,color:'text-emerald-700',bg:'bg-emerald-50 border-emerald-200'},
                    {label:'شهادات اليوم',value:certs.filter(c=>c.date===TODAY).length,color:'text-yellow-700',bg:'bg-yellow-50 border-yellow-200'},
                    {label:'ملاحظات اليوم',value:observations.filter(o=>o.date===TODAY).length,color:'text-orange-700',bg:'bg-orange-50 border-orange-200'},
                  ].map(stat => (
                    <div key={stat.label} className={'p-4 rounded-2xl border '+stat.bg+' text-center'}>
                      <div className={'text-3xl font-black '+stat.color}>{stat.value}</div>
                      <div className="text-xs text-slate-600 font-bold mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 text-sm font-bold text-violet-800 space-y-1">
                  <div>الواجبات المعلقة: {homeworkList.length}</div>
                  <div>نسبة الحضور: {students.length > 0 ? Math.round(presentCount/students.length*100) : 0}%</div>
                </div>
              </div>
            </div>
          )}

          {/* ═ HOMEWORK ASSIGN ═ */}
          {activeTool === 'homework-assign' && (
            <div className="rounded-2xl bg-white border border-amber-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-amber-600 to-yellow-600 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><PenLine className="w-5 h-5" /> إسناد الواجبات</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <input value={hwSubject} onChange={e=>setHwSubject(e.target.value)} placeholder="المادة *" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-300" />
                  <input type="date" value={hwDue} onChange={e=>setHwDue(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-300" />
                </div>
                <input value={hwTitle} onChange={e=>setHwTitle(e.target.value)} placeholder="وصف الواجب *" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-300" />
                <button onClick={() => {
                  if (!hwSubject || !hwTitle || !hwDue) return flash('أكمل بيانات الواجب', false);
                  const hw = {id:'HW-'+Date.now(),subject:hwSubject,title:hwTitle,dueDate:hwDue,students:students.map(s=>s.id),created:TODAY};
                  const u = [hw,...homeworkList]; setHomeworkList(u); nexusSet('homework_nexus',u);
                  setHwTitle(''); flash('تم إسناد الواجب لـ'+students.length+' طالب ✅');
                }} className="w-full py-3 bg-gradient-to-l from-amber-600 to-yellow-600 text-white font-black rounded-2xl hover:from-amber-700 hover:to-yellow-700 transition shadow-sm cursor-pointer">
                  إسناد الواجب لـ{students.length} طالب ✓
                </button>
                {homeworkList.slice(0,3).map(hw => (
                  <div key={hw.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs font-bold text-amber-900">
                    📚 {hw.subject} — {hw.title} (تسليم: {hw.dueDate})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═ VOCAB LIST ═ */}
          {activeTool === 'vocab-list' && (
            <div className="rounded-2xl bg-white border border-cyan-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-cyan-600 to-teal-600 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><Layers className="w-5 h-5" /> قائمة المفردات</h3>
              </div>
              <div className="p-5 space-y-4">
                <input value={vocabSubject} onChange={e=>setVocabSubject(e.target.value)} placeholder="المادة / الموضوع" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-300" />
                <textarea value={vocabWords} onChange={e=>setVocabWords(e.target.value)} placeholder="أدخل المفردات مفصولة بفاصلة أو سطر جديد..." rows={4} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-300 resize-none" />
                <button onClick={() => {
                  if (!vocabWords) return flash('أدخل المفردات', false);
                  const l = nexusGet<any[]>('vocab_lists',[]);
                  nexusSet('vocab_lists',[{subject:vocabSubject,words:vocabWords,date:TODAY},...l]);
                  setVocabWords(''); setVocabSubject(''); flash('تم حفظ القائمة ✅');
                }} className="w-full py-3 bg-gradient-to-l from-cyan-600 to-teal-600 text-white font-black rounded-2xl hover:from-cyan-700 hover:to-teal-700 transition shadow-sm cursor-pointer">
                  حفظ القائمة
                </button>
              </div>
            </div>
          )}

          {/* ═ EXAM SCHEDULE ═ */}
          {activeTool === 'exam-schedule' && (
            <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-slate-600 to-slate-700 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><Calendar className="w-5 h-5" /> جدول الاختبارات</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <input value={examName} onChange={e=>setExamName(e.target.value)} placeholder="اسم الاختبار" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-300" />
                  <input value={examSubject} onChange={e=>setExamSubject(e.target.value)} placeholder="المادة" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-300" />
                  <input type="date" value={examDate} onChange={e=>setExamDate(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <button onClick={() => {
                  if (!examName || !examDate) return flash('أكمل بيانات الاختبار', false);
                  const ex = nexusGet<any[]>('exams',[]);
                  nexusSet('exams',[{name:examName,subject:examSubject,date:examDate,created:TODAY},...ex]);
                  setExamName(''); setExamSubject(''); setExamDate(''); flash('تم إضافة الاختبار ✅');
                }} className="w-full py-3 bg-slate-700 text-white font-black rounded-2xl hover:bg-slate-800 transition shadow-sm cursor-pointer">
                  إضافة للجدول
                </button>
                {nexusGet<any[]>('exams',[]).slice(0,5).map((ex:any,i:number) => (
                  <div key={i} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between text-xs font-bold text-slate-800">
                    <span>📅 {ex.name} — {ex.subject}</span>
                    <span className="text-slate-500">{ex.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═ BEHAVIOR LOG ═ */}
          {activeTool === 'behavior-log' && (
            <div className="rounded-2xl bg-white border border-orange-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-orange-600 to-amber-600 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><Eye className="w-5 h-5" /> سجل الملاحظات السلوكية</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select value={obsStudent} onChange={e=>setObsStudent(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-300">
                    <option value="">اختر الطالب</option>
                    {students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select value={obsCategory} onChange={e=>setObsCategory(e.target.value as BehaviorCategory)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-300">
                    <option value="academic">أكاديمي</option>
                    <option value="behavior">سلوكي</option>
                    <option value="praise">إشادة</option>
                    <option value="guidance">إرشاد</option>
                  </select>
                  <select value={obsSeverity} onChange={e=>setObsSeverity(e.target.value as BehaviorSeverity)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-300">
                    <option value="positive">إيجابي</option>
                    <option value="neutral">محايد</option>
                    <option value="urgent">عاجل</option>
                  </select>
                </div>
                <textarea value={obsNote} onChange={e=>setObsNote(e.target.value)} placeholder="اكتب ملاحظتك هنا..." rows={3} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
                <button onClick={() => {
                  if (!obsStudent || !obsNote) return flash('اختر الطالب وأدخل الملاحظة', false);
                  const r = {studentId:obsStudent,category:obsCategory,severity:obsSeverity,note:obsNote,date:TODAY};
                  const u = [r,...observations]; setObservations(u); nexusSet('observations',u);
                  setObsNote(''); flash('تم حفظ الملاحظة ✅');
                }} className="w-full py-3 bg-gradient-to-l from-orange-600 to-amber-600 text-white font-black rounded-2xl hover:from-orange-700 hover:to-amber-700 transition shadow-sm cursor-pointer">
                  حفظ الملاحظة ✓
                </button>
                <div className="space-y-2">
                  {observations.slice(0,5).map((obs,i) => {
                    const st = students.find(s=>s.id===obs.studentId);
                    return (
                      <div key={i} className={'p-3 rounded-xl text-xs font-bold border '+(obs.severity==='positive'?'bg-emerald-50 border-emerald-200 text-emerald-900':obs.severity==='urgent'?'bg-rose-50 border-rose-200 text-rose-900':'bg-slate-50 border-slate-200 text-slate-800')}>
                        <span className="font-black">{st?.name ?? obs.studentId}</span> — {obs.note}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═ QUICK NOTE ═ */}
          {activeTool === 'quick-note' && (
            <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-slate-700 to-slate-800 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><FileText className="w-5 h-5" /> ملاحظة سريعة</h3>
              </div>
              <div className="p-5 space-y-4">
                <select value={quickNoteStudent} onChange={e=>setQuickNoteStudent(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-300">
                  <option value="">اختر الطالب (اختياري)</option>
                  {students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <textarea value={quickNote} onChange={e=>setQuickNote(e.target.value)} placeholder="اكتب ملاحظتك السريعة..." rows={4} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none" />
                <button onClick={() => {
                  if (!quickNote) return flash('أدخل الملاحظة', false);
                  nexusSet('quicknote_'+Date.now(),{studentId:quickNoteStudent,note:quickNote,date:TODAY});
                  setQuickNote(''); flash('تم حفظ الملاحظة ✅');
                }} className="w-full py-3 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-900 transition shadow-sm cursor-pointer">
                  حفظ الملاحظة
                </button>
              </div>
            </div>
          )}

          {/* ═ WEEKLY REPORT ═ */}
          {activeTool === 'weekly-report' && (
            <div className="rounded-2xl bg-white border border-green-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-green-600 to-teal-600 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5" /> التقرير الأسبوعي</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4 space-y-3">
                  <h4 className="text-sm font-black text-green-800">ملخص الأسبوع الحالي</h4>
                  <div className="grid grid-cols-2 gap-3 text-center">
                    {[
                      {l:'الحضور',v:presentCount+'/'+students.length,c:'text-green-700'},
                      {l:'التقييمات',v:grades.filter(g=>g.date===TODAY).length,c:'text-blue-700'},
                      {l:'الواجبات',v:homeworkList.length,c:'text-amber-700'},
                      {l:'الشهادات',v:certs.length,c:'text-yellow-700'},
                    ].map(s=>(
                      <div key={s.l} className="bg-white rounded-xl border border-green-100 p-3">
                        <div className={'text-2xl font-black '+s.c}>{s.v}</div>
                        <div className="text-xs text-slate-500 font-bold">{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <button onClick={()=>flash('تم إرسال التقرير للإدارة ✅')} className="w-full py-3 bg-gradient-to-l from-green-600 to-teal-600 text-white font-black rounded-2xl hover:from-green-700 hover:to-teal-700 transition shadow-sm cursor-pointer flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> إرسال التقرير للإدارة
                </button>
              </div>
            </div>
          )}

          {/* ═ PARENT MSG ═ */}
          {activeTool === 'parent-msg' && (
            <div className="rounded-2xl bg-white border border-purple-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-purple-600 to-violet-600 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5" /> رسالة لولي الأمر</h3>
              </div>
              <div className="p-5 space-y-4">
                <select value={msgStudent} onChange={e=>setMsgStudent(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-300">
                  <option value="">اختر الطالب</option>
                  {students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <textarea value={msgBody} onChange={e=>setMsgBody(e.target.value)} placeholder="اكتب رسالتك لولي الأمر..." rows={4} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none" />
                <div className="grid grid-cols-2 gap-2">
                  {['أداء الطالب ممتاز هذا الأسبوع 🌟','يحتاج الطالب لمراجعة المادة 📚','الطالب تغيّب بدون عذر ⚠️','سلوك الطالب ممتاز 🏆'].map(tmpl=>(
                    <button key={tmpl} onClick={()=>setMsgBody(tmpl)} className="text-[11px] font-bold text-purple-700 bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 hover:bg-purple-100 transition cursor-pointer text-right">{tmpl}</button>
                  ))}
                </div>
                <button onClick={()=>{
                  if (!msgStudent || !msgBody) return flash('اختر الطالب وأدخل الرسالة', false);
                  nexusSet('msg_'+Date.now(),{studentId:msgStudent,body:msgBody,date:new Date().toISOString()});
                  setMsgBody(''); flash('تم إرسال الرسالة ✅');
                }} className="w-full py-3 bg-gradient-to-l from-purple-600 to-violet-600 text-white font-black rounded-2xl hover:from-purple-700 hover:to-violet-700 transition shadow-sm cursor-pointer flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> إرسال الرسالة
                </button>
              </div>
            </div>
          )}

          {/* ═ ANNOUNCEMENT ═ */}
          {activeTool === 'announcement' && (
            <div className="rounded-2xl bg-white border border-rose-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-rose-600 to-pink-600 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><Volume2 className="w-5 h-5" /> إعلان للفصل</h3>
              </div>
              <div className="p-5 space-y-4">
                <textarea value={announcementBody} onChange={e=>setAnnouncementBody(e.target.value)} placeholder="اكتب الإعلان..." rows={4} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
                <button onClick={()=>{
                  if (!announcementBody) return flash('أدخل نص الإعلان', false);
                  nexusSet('announce_'+Date.now(),{body:announcementBody,date:new Date().toISOString()});
                  setAnnouncementBody(''); flash('تم الإرسال لجميع الأسر 📢');
                }} className="w-full py-3 bg-gradient-to-l from-rose-600 to-pink-600 text-white font-black rounded-2xl hover:from-rose-700 hover:to-pink-700 transition shadow-sm cursor-pointer flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" /> إرسال لجميع الأسر ({students.length})
                </button>
              </div>
            </div>
          )}

          {/* ═ RANDOM STUDENT ═ */}
          {activeTool === 'random-student' && (
            <div className="rounded-2xl bg-white border border-fuchsia-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-fuchsia-600 to-purple-600 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><Sparkles className="w-5 h-5" /> اختيار طالب عشوائي</h3>
              </div>
              <div className="p-8 text-center space-y-6">
                {randomResult && (
                  <div className="bg-fuchsia-50 border-2 border-fuchsia-300 rounded-3xl p-6">
                    <div className="text-6xl mb-3">🎲</div>
                    <div className="text-2xl font-black text-fuchsia-900">{randomResult.name}</div>
                    {randomResult.grade && <div className="text-sm text-fuchsia-600 font-bold mt-1">{randomResult.grade}</div>}
                  </div>
                )}
                <button onClick={()=>{
                  if (!students.length) return flash('لا يوجد طلاب', false);
                  const s = students[Math.floor(Math.random()*students.length)];
                  setRandomResult(s); flash('تم اختيار: '+s.name+' 🎲');
                }} className="px-8 py-4 bg-gradient-to-l from-fuchsia-600 to-purple-600 text-white font-black rounded-2xl text-lg hover:from-fuchsia-700 hover:to-purple-700 transition shadow-lg cursor-pointer">
                  🎲 اختر عشوائياً!
                </button>
              </div>
            </div>
          )}

          {/* ═ SEAT SHUFFLE ═ */}
          {activeTool === 'seat-shuffle' && (
            <div className="rounded-2xl bg-white border border-sky-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-sky-600 to-cyan-600 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><RotateCcw className="w-5 h-5" /> ترتيب المقاعد</h3>
              </div>
              <div className="p-5 space-y-4">
                <button onClick={()=>{
                  const s = [...students].sort(()=>Math.random()-0.5);
                  setSeating(s); flash('تم ترتيب المقاعد عشوائياً 🔀');
                }} className="w-full py-3 bg-gradient-to-l from-sky-600 to-cyan-600 text-white font-black rounded-2xl hover:from-sky-700 hover:to-cyan-700 transition shadow-sm cursor-pointer flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" /> ترتيب عشوائي جديد
                </button>
                {seating.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {seating.map((s,i) => (
                      <div key={s.id} className="bg-sky-50 border border-sky-200 rounded-xl p-2.5 text-center text-xs font-black text-sky-800">
                        <div className="text-lg font-black text-sky-600">#{i+1}</div>
                        <div>{s.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═ GROUP MAKER ═ */}
          {activeTool === 'group-maker' && (
            <div className="rounded-2xl bg-white border border-teal-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-teal-600 to-emerald-600 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><Users className="w-5 h-5" /> تقسيم مجموعات</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm font-black text-slate-700">عدد المجموعات:</label>
                  <input type="number" min={2} max={students.length||10} value={groupCount} onChange={e=>setGroupCount(Number(e.target.value))} className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-center focus:outline-none focus:ring-2 focus:ring-teal-300" />
                </div>
                <button onClick={()=>{
                  const sh = [...students].sort(()=>Math.random()-0.5);
                  const g: Student[][] = Array.from({length:groupCount},()=>[]);
                  sh.forEach((s,i)=>g[i%groupCount].push(s));
                  setGroups(g); flash('تم تقسيم '+students.length+' طالب إلى '+groupCount+' مجموعات');
                }} className="w-full py-3 bg-gradient-to-l from-teal-600 to-emerald-600 text-white font-black rounded-2xl hover:from-teal-700 hover:to-emerald-700 transition shadow-sm cursor-pointer">
                  تقسيم {students.length} طالب
                </button>
                {groups.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    {groups.map((g,gi)=>(
                      <div key={gi} className="bg-teal-50 border border-teal-200 rounded-2xl p-3">
                        <div className="text-xs font-black text-teal-700 mb-2">المجموعة {gi+1}</div>
                        {g.map(s=><div key={s.id} className="text-sm font-bold text-teal-900 py-0.5">{s.name}</div>)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═ TIMER ═ */}
          {activeTool === 'timer-tool' && (
            <div className="rounded-2xl bg-white border border-amber-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-amber-600 to-orange-600 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><Clock className="w-5 h-5" /> مؤقت الفصل</h3>
              </div>
              <div className="p-8 text-center space-y-6">
                <div className={'text-7xl font-black font-mono transition-colors '+(timerSecs>0&&timerSecs<60?'text-rose-600':'text-amber-700')}>
                  {formatTimer(timerSecs)}
                </div>
                <div className="flex items-center justify-center gap-4">
                  <label className="text-sm font-black text-slate-700">المدة (دقائق):</label>
                  <input type="number" min={1} max={60} value={timerInput} onChange={e=>setTimerInput(Number(e.target.value))} className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-center focus:outline-none" />
                </div>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button onClick={()=>{setTimerSecs(timerInput*60);setTimerActive(true);}} disabled={timerActive} className="px-6 py-3 bg-amber-600 text-white font-black rounded-2xl hover:bg-amber-700 transition cursor-pointer disabled:opacity-50">▶ ابدأ</button>
                  <button onClick={()=>setTimerActive(false)} disabled={!timerActive} className="px-6 py-3 bg-slate-200 text-slate-800 font-black rounded-2xl hover:bg-slate-300 transition cursor-pointer disabled:opacity-50">⏸ إيقاف</button>
                  <button onClick={()=>{setTimerActive(false);setTimerSecs(0);}} className="px-6 py-3 bg-rose-100 text-rose-700 font-black rounded-2xl hover:bg-rose-200 transition cursor-pointer">↺ إعادة</button>
                </div>
              </div>
            </div>
          )}

          {/* ═ CERTIFICATES ═ */}
          {activeTool === 'certificates' && (
            <div className="rounded-2xl bg-white border border-yellow-200 overflow-hidden shadow-sm">
              <div className="bg-gradient-to-l from-yellow-500 to-amber-500 px-5 py-4 text-white">
                <h3 className="font-black text-lg flex items-center gap-2"><Award className="w-5 h-5" /> إصدار شهادة تقدير</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <select value={certStudent} onChange={e=>setCertStudent(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300">
                    <option value="">اختر الطالب</option>
                    {students.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  <select value={certType} onChange={e=>setCertType(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300">
                    <option>شهادة تفوق</option>
                    <option>شهادة تميز</option>
                    <option>شهادة مشاركة</option>
                    <option>شهادة حضور منتظم</option>
                    <option>شهادة سلوك مثالي</option>
                  </select>
                </div>
                <input value={certReason} onChange={e=>setCertReason(e.target.value)} placeholder="سبب التكريم *" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                <button onClick={()=>{
                  if (!certStudent || !certReason) return flash('اختر الطالب وأدخل سبب التكريم', false);
                  const r = {studentId:certStudent,type:certType,reason:certReason,date:TODAY};
                  const u = [r,...certs]; setCerts(u); nexusSet('certs',u);
                  setCertReason(''); flash('تم إصدار الشهادة 🏆');
                }} className="w-full py-3 bg-gradient-to-l from-yellow-500 to-amber-500 text-white font-black rounded-2xl hover:from-yellow-600 hover:to-amber-600 transition shadow-sm cursor-pointer">
                  إصدار الشهادة 🏆
                </button>
                {certs.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs font-bold text-yellow-900">
                    🏆 إجمالي الشهادات المصدرة: {certs.length}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}