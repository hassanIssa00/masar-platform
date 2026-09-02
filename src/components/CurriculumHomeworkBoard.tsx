'use client';

import { useEffect, useState } from 'react';
import {
  Award,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  Pencil,
  RefreshCw,
  Send,
  Star,
  X,
} from 'lucide-react';
import { readCloudCache } from '@/lib/firestoreSync';
import {
  getStudentHomeworkLogs,
  saveStudentHomeworkLog,
  type StudentHomeworkLog,
} from '@/lib/classDb';
import { saveMessage } from '@/lib/cloudStore';
import { saveHomeworkSnapshot } from '@/lib/dailyArchive';

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

interface Student {
  id: string;
  name?: string;
  fullName?: string;
}

interface Props {
  students?: Student[];
}

const ASSIGNMENTS_KEY = 'masar.curriculumAssignments.v1';

function getStudentName(s: Student) {
  return s.fullName || s.name || 'طالب';
}

function readAssignments(): CurriculumAssignment[] {
  if (typeof window === 'undefined') return [];
  return readCloudCache<CurriculumAssignment>(ASSIGNMENTS_KEY);
}

function getHwLog(
  all: StudentHomeworkLog[],
  studentId: string,
  subjectTitle: string,
): StudentHomeworkLog | undefined {
  return all.find((h) => h.studentId === studentId && h.subject === subjectTitle);
}

export default function CurriculumHomeworkBoard({ students = [] }: Props) {
  const [assignments, setAssignments] = useState<CurriculumAssignment[]>([]);
  const [hwLogs, setHwLogs] = useState<StudentHomeworkLog[]>([]);
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  const [gradingTarget, setGradingTarget] = useState<{
    assignment: CurriculumAssignment;
    log: StudentHomeworkLog | undefined;
  } | null>(null);
  const [gradeInput, setGradeInput] = useState<string>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState('');

  function refresh() {
    const raw = readAssignments();
    setAssignments(raw);
    const allLogs: StudentHomeworkLog[] = [];
    students.forEach((s) => {
      getStudentHomeworkLogs(s.id).forEach((l) => {
        if (!allLogs.find((x) => x.id === l.id)) allLogs.push(l);
      });
    });
    const cached = readCloudCache<StudentHomeworkLog>('masar_student_hw_logs_v1');
    cached.forEach((l) => { if (!allLogs.find((x) => x.id === l.id)) allLogs.push(l); });
    setHwLogs(allLogs);
  }

  useEffect(() => { refresh(); }, [students.length]);

  const subjectTitles = Array.from(new Set(assignments.map((a) => a.subjectTitle)));
  const filtered = filterSubject === 'all' ? assignments : assignments.filter((a) => a.subjectTitle === filterSubject);

  const studentGroups = new Map<string, { student: Student; assignments: CurriculumAssignment[] }>();
  filtered.forEach((a) => {
    const student = students.find((s) => s.id === a.studentId);
    if (!student) return;
    if (!studentGroups.has(student.id)) studentGroups.set(student.id, { student, assignments: [] });
    const grp = studentGroups.get(student.id)!;
    const idx = grp.assignments.findIndex((x) => x.subjectTitle === a.subjectTitle);
    if (idx >= 0) {
      if (new Date(a.assignedAt) > new Date(grp.assignments[idx].assignedAt)) grp.assignments[idx] = a;
    } else {
      grp.assignments.push(a);
    }
  });

  const totalAssigned = filtered.length;
  const totalSubmitted = hwLogs.filter((h) => h.status === 'submitted' && filtered.some((a) => a.studentId === h.studentId && a.subjectTitle === h.subject)).length;
  const totalGraded = hwLogs.filter((h) => h.grade !== undefined && filtered.some((a) => a.studentId === h.studentId && a.subjectTitle === h.subject)).length;

  function handleMarkSubmitted(a: CurriculumAssignment) {
    const log = getHwLog(hwLogs, a.studentId, a.subjectTitle);
    saveStudentHomeworkLog({
      id: log?.id,
      studentId: a.studentId,
      title: log?.title || `واجب ${a.subjectTitle} (ص ${a.fromPage}-${a.toPage})`,
      subject: a.subjectTitle,
      dueDate: log?.dueDate || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      status: 'submitted',
      grade: log?.grade,
      teacherFeedback: log?.teacherFeedback,
    });
    setNotice(`✅ تم تسجيل تسليم (${a.studentName}) لواجب ${a.subjectTitle}`);
    setTimeout(() => setNotice(''), 4000);
    refresh();
  }

  function openGradeModal(a: CurriculumAssignment) {
    const log = getHwLog(hwLogs, a.studentId, a.subjectTitle);
    setGradingTarget({ assignment: a, log });
    setGradeInput(log?.grade !== undefined ? String(log.grade) : '');
    setFeedbackInput(log?.teacherFeedback || '');
  }

  async function handleSaveGrade() {
    if (!gradingTarget) return;
    const { assignment, log } = gradingTarget;
    const grade = parseFloat(gradeInput);
    if (isNaN(grade) || grade < 0 || grade > 10) {
      setNotice('الرجاء إدخال درجة صحيحة بين 0 و 10');
      setTimeout(() => setNotice(''), 4000);
      return;
    }
    setIsSaving(true);
    saveStudentHomeworkLog({
      id: log?.id,
      studentId: assignment.studentId,
      title: log?.title || `واجب ${assignment.subjectTitle} (ص ${assignment.fromPage}-${assignment.toPage})`,
      subject: assignment.subjectTitle,
      dueDate: log?.dueDate || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      status: 'submitted',
      grade,
      teacherFeedback: feedbackInput,
    });
    const feedbackNote = feedbackInput ? `\n💬 ملاحظة الدكتور: ${feedbackInput}` : '';
    saveMessage({
      studentId: assignment.studentId,
      from: 'doctor',
      to: 'parent',
      body: `🏆 نتيجة تصحيح واجب مادة (${assignment.subjectTitle}):\n\nالطالب: ${assignment.studentName}\nالصفحات: ${assignment.fromPage} – ${assignment.toPage}\nالدرجة: ${grade}/10${feedbackNote}\n\n_فصل د. إسماعيل عيسى — منصة مسار_`,
      read: false,
    });
    saveMessage({
      studentId: assignment.studentId,
      from: 'doctor',
      to: 'student',
      body: `🎉 تم تصحيح واجبك في مادة (${assignment.subjectTitle})!\nدرجتك: ${grade}/10${feedbackNote}`,
      read: false,
    });
    // 📁 Auto-save to Daily Homework Archive
    try {
      saveHomeworkSnapshot({
        date: new Date().toISOString().slice(0, 10),
        homeworkTitle: log?.title || `واجب ${assignment.subjectTitle} (ص ${assignment.fromPage}-${assignment.toPage})`,
        subject: assignment.subjectTitle,
        dueDate: log?.dueDate || new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
        submissions: [
          {
            studentId: assignment.studentId,
            studentName: assignment.studentName,
            status: 'submitted',
            grade,
            feedback: feedbackInput,
          },
        ],
        totalStudents: 1,
        totalSubmitted: 1,
        totalMissing: 0,
        avgGrade: grade,
      });
    } catch (err) {
      console.warn('Auto-save homework archive error:', err);
    }
    setIsSaving(false);
    setGradingTarget(null);
    setNotice(`✅ تم حفظ درجة ${assignment.studentName} (${grade}/10) وإبلاغ الطالب وولي الأمر!`);
    setTimeout(() => setNotice(''), 6000);
    refresh();
  }

  return (
    <div className="space-y-6 text-slate-900" dir="rtl">

      {/* HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06392c] via-[#0b4d3c] to-[#04291e] p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-5 w-5 text-amber-400" />
              <span className="font-black text-emerald-200 text-sm">منصة مَسَار · ملفات واجبات المناهج</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">ملفات واجبات الطلاب من المناهج 📂</h2>
            <p className="mt-1.5 text-sm font-semibold text-emerald-100/90">
              سجل مفصّل لكل واجب مسند من المناهج لكل طالب — تسجيل التسليم، تقييم الدرجة، وإبلاغ الطالب وولي أمره بزرار واحد.
            </p>
          </div>
          <button onClick={refresh} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2.5 rounded-2xl text-xs font-black transition cursor-pointer">
            <RefreshCw size={15} /> تحديث
          </button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { label: '📋 إجمالي الواجبات', val: totalAssigned },
            { label: '📥 تم تسليمها', val: totalSubmitted },
            { label: '✅ تم تصحيحها', val: totalGraded },
          ].map((m) => (
            <div key={m.label} className="bg-white/10 backdrop-blur-md rounded-2xl p-3 text-center border border-white/15">
              <div className="text-2xl font-black font-mono">{m.val}</div>
              <div className="text-[11px] font-bold text-emerald-200 mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      </div>

      {notice && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-950 flex items-center gap-3 shadow-sm">
          <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
          <p className="text-xs font-black">{notice}</p>
        </div>
      )}

      {/* FILTER */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-emerald-700" />
          <span className="text-xs font-black text-slate-700">تصفية حسب المادة:</span>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">جميع المواد ({subjectTitles.length})</option>
            {subjectTitles.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <span className="text-xs font-bold text-slate-500">{studentGroups.size} طالب · {totalAssigned} واجب مسند</span>
      </div>

      {studentGroups.size === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-3xl flex items-center justify-center mx-auto">📂</div>
          <h3 className="font-black text-base text-slate-800">لا توجد واجبات مسندة من المناهج حتى الآن</h3>
          <p className="text-xs text-slate-500 font-semibold max-w-md mx-auto">
            عند إسناد واجب من صفحة المناهج التفاعلية، سيظهر هنا فوراً مع ملف تفصيلي لكل طالب.
          </p>
        </div>
      )}

      {Array.from(studentGroups.values()).map(({ student, assignments: stAssigns }) => {
        const isExpanded = expandedStudent === student.id;
        const sName = getStudentName(student);
        const submittedCount = stAssigns.filter((a) => {
          const l = getHwLog(hwLogs, a.studentId, a.subjectTitle);
          return l?.status === 'submitted' || l?.grade !== undefined;
        }).length;
        const gradedCount = stAssigns.filter((a) => getHwLog(hwLogs, a.studentId, a.subjectTitle)?.grade !== undefined).length;

        return (
          <div key={student.id} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <button
              type="button"
              className="w-full p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition text-right"
              onClick={() => setExpandedStudent(isExpanded ? null : student.id)}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-emerald-700 flex items-center justify-center text-white font-black text-base shadow-sm">
                  {sName[0]}
                </div>
                <div>
                  <h4 className="font-black text-slate-900 text-sm">{sName}</h4>
                  <p className="text-xs text-slate-500 font-bold mt-0.5">
                    {stAssigns.length} مادة مسندة · <span className="text-emerald-700">{submittedCount} مسلّم</span> · <span className="text-amber-700">{gradedCount} مقيّم</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`px-3 py-1 rounded-full text-[11px] font-black border ${
                  submittedCount === stAssigns.length ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : submittedCount > 0 ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>{submittedCount}/{stAssigns.length} مسلّم</span>
                {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-slate-100 divide-y divide-slate-100">
                {stAssigns.map((a) => {
                  const log = getHwLog(hwLogs, a.studentId, a.subjectTitle);
                  const isSubmitted = log?.status === 'submitted' || log?.grade !== undefined;
                  const isGraded = log?.grade !== undefined;
                  return (
                    <div key={`${a.studentId}-${a.subjectTitle}`} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-xs ${isGraded ? 'bg-emerald-700' : isSubmitted ? 'bg-amber-600' : 'bg-slate-400'}`}>
                          {isGraded ? '✅' : isSubmitted ? '📬' : '📖'}
                        </div>
                        <div>
                          <p className="font-black text-sm text-slate-900">{a.subjectTitle}</p>
                          <p className="text-xs text-slate-500 font-bold mt-0.5">
                            صفحات {a.fromPage}–{a.toPage} · {new Date(a.assignedAt).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                          </p>
                          {isGraded && (
                            <p className="text-xs font-black text-emerald-700 mt-1">
                              الدرجة: {log!.grade}/10
                              {log!.teacherFeedback && <span className="font-normal text-slate-500"> · {log!.teacherFeedback}</span>}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-black border ${
                          isGraded ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : isSubmitted ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                        }`}>{isGraded ? '✅ تم التصحيح' : isSubmitted ? '📬 مسلّم' : '⏳ لم يُسلّم'}</span>
                        {!isSubmitted && (
                          <button
                            onClick={() => handleMarkSubmitted(a)}
                            className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer"
                          >
                            <CheckCircle2 size={13} /> تسجيل التسليم
                          </button>
                        )}
                        <button
                          onClick={() => openGradeModal(a)}
                          className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-300 text-indigo-900 px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer"
                        >
                          <Award size={13} /> {isGraded ? 'تعديل الدرجة' : 'إدخال الدرجة وإبلاغهم 🔔'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* GRADING MODAL */}
      {gradingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 border border-slate-200" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-600" /> إدخال الدرجة وإبلاغ الطالب وولي الأمر
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-1">
                  {gradingTarget.assignment.studentName} · {gradingTarget.assignment.subjectTitle} (ص {gradingTarget.assignment.fromPage}–{gradingTarget.assignment.toPage})
                </p>
              </div>
              <button onClick={() => setGradingTarget(null)} className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 mb-2">
                <Star size={13} className="inline ml-1 text-amber-500" />
                الدرجة (من 10)
              </label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                value={gradeInput}
                onChange={(e) => setGradeInput(e.target.value)}
                placeholder="مثال: 8.5"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-2xl font-black text-slate-900 text-center focus:border-indigo-500 focus:outline-none"
              />
              {gradeInput && !isNaN(parseFloat(gradeInput)) && (
                <div className="mt-2 flex justify-center gap-0.5">
                  {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                    <span key={n} className={`text-lg ${n <= parseFloat(gradeInput) ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-black text-slate-800 mb-2">
                <Pencil size={13} className="inline ml-1 text-emerald-600" />
                ملاحظات وتوجيهات د. إسماعيل (اختياري)
              </label>
              <textarea
                rows={3}
                value={feedbackInput}
                onChange={(e) => setFeedbackInput(e.target.value)}
                placeholder="مثال: أحسنت يا بطل! ركّز أكثر على الكلمات الجديدة 🌟"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none resize-none"
              />
            </div>

            <div className="rounded-2xl bg-indigo-50 border border-indigo-200 p-3.5 text-xs font-bold text-indigo-900 space-y-1.5">
              <p className="flex items-center gap-2"><Bell size={13} className="text-indigo-600" /> سيصل إشعار فوري لولي الأمر في بوابته يتضمن الدرجة والملاحظة</p>
              <p className="flex items-center gap-2"><Send size={13} className="text-emerald-600" /> وسيصل إشعار مباشر للطالب في بوابته أيضاً</p>
            </div>

            {notice && <p className="text-xs font-black text-rose-800 bg-rose-50 border border-rose-200 rounded-xl p-3">{notice}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setGradingTarget(null)}
                className="flex-1 rounded-xl border border-slate-200 text-slate-700 py-3 text-xs font-black hover:bg-slate-50 transition cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveGrade}
                disabled={isSaving || !gradeInput}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white py-3 text-xs font-black shadow-sm transition cursor-pointer disabled:opacity-50"
              >
                <Award size={14} />
                {isSaving ? 'جاري الحفظ...' : 'حفظ الدرجة وإبلاغ الطالب وولي الأمر 🔔'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
