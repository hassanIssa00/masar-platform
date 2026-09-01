'use client';

import { useEffect, useState } from 'react';
import {
  ClipboardPen, Plus, X, Printer, Star, Clock, CheckCircle2, TrendingUp,
  FileText, User, Calendar, Trash2
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  getLocalSessionRecords, createSessionRecord, deleteSessionRecord,
  type SessionRecord, type CooperationLevel, type SessionRating,
  COOPERATION_LABELS, COOPERATION_COLORS, RATING_LABELS
} from '@/lib/sessionRecords';
import { getStudents, type StudentRecord } from '@/lib/cloudStore';
import FeatureGuideBanner from '@/components/FeatureGuideBanner';

export default function SessionRecordsPage() {
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<SessionRecord | null>(null);

  const [form, setForm] = useState({
    studentId: '',
    sessionDate: new Date().toISOString().slice(0, 10),
    sessionTime: '10:00 AM',
    durationMinutes: 45,
    conductedBy: 'د. إسماعيل عيسى',
    goalsInput: 'تمييز الأصوات القصيرة والطويلة، تتبع الأرقام حتى 20',
    activitiesInput: 'تمارين العدادات الخشبية، البطاقات البصرية الملونة',
    cooperation: 'excellent' as CooperationLevel,
    attentionSpan: 4 as SessionRating,
    motivation: 5 as SessionRating,
    overallPerformance: 4 as SessionRating,
    progressNotes: 'أظهر الطالب استجابة ممتازة وتفاعلاً عالياً مع بطاقات التعزيز البصرية.',
    challenges: 'تشتت خفيف في بداية الجلسة لمدة 3 دقائق.',
    nextSessionPlan: 'الانتقال إلى المقطع الثلاثي مع تعزيز القراءة المسترسلة.',
  });

  useEffect(() => {
    setRecords(getLocalSessionRecords());
    const allSt = getStudents();
    setStudents(allSt);
    if (allSt.length > 0) setForm(f => ({ ...f, studentId: allSt[0].id }));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find((s) => s.id === form.studentId);
    await createSessionRecord({
      studentId: form.studentId,
      studentName: st ? st.fullName : 'طالب',
      sessionDate: form.sessionDate,
      sessionTime: form.sessionTime,
      durationMinutes: form.durationMinutes,
      conductedBy: form.conductedBy,
      goalsWorkedOn: form.goalsInput.split('،').map((g) => g.trim()).filter(Boolean),
      activitiesUsed: form.activitiesInput.split('،').map((a) => a.trim()).filter(Boolean),
      materialsUsed: ['بطاقات بصرية', 'عدادات'],
      cooperation: form.cooperation,
      attentionSpan: form.attentionSpan,
      motivation: form.motivation,
      overallPerformance: form.overallPerformance,
      progressNotes: form.progressNotes,
      challenges: form.challenges,
      nextSessionPlan: form.nextSessionPlan,
      goalAchievements: [],
      status: 'completed',
    });

    setRecords(getLocalSessionRecords());
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    deleteSessionRecord(id);
    setRecords(getLocalSessionRecords());
    setSelectedRecord(null);
  };

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <ClipboardPen className="text-teal-600" size={26} />
                سجلات الجلسات الطبية والعلاجية (Clinical Session Records)
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-1">
                توثيق السجل الطبي الكامل لكل جلسة، الملاحظات السلوكية، وتتبع مخرجات التعلم
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-black text-white hover:bg-teal-700 shadow-sm"
            >
              <Plus size={18} /> توثيق جلسة جديدة
            </button>
          </div>

          <FeatureGuideBanner
            title="السجل الطبي للجلسات (Clinical Session Records)"
            description="نظام توثيق طبي إلكتروني دقيق يسجل محتوى كل جلسة علاجيّة، الأهداف المنفذة، درجة انتباه وتعاون الطفل، والنتائج المرحلية فور انتهائها."
            benefits={[
              'يُلغي الاعتماد على الذاكرة الشخصية أو الأوراق المفقودة في متابعة تطور الطالب.',
              'يسمح للأخصائي الجديد بمراجعة التاريخ الطبي الكامل للطفل بدقة وسرعة.',
              'يوفر بيانات إحصائية دقيقة لتقييم أداء وتفاعل الطالب عبر الجلسات المتتالية.'
            ]}
            modernShift="التوثيق الإكلينيكي الإلكتروني (Electronic Health & Therapy Records - EHTR) هو الأساس في الممارسة الطبية الحديثة، حيث يُحوّل الانطباعات الشفهية إلى سجل تاريخي علمي رصين."
          />

          {/* Records Grid */}
          {records.length === 0 ? (
            <div className="py-20 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-3">
              <ClipboardPen className="mx-auto text-slate-300" size={48} />
              <p className="text-lg font-black text-slate-700">لا توجد سجلات جلسات وثقت بعد</p>
              <p className="text-xs font-bold text-slate-400">توثيق الجلسات هو متطلب أساسي في الملف الطبي للطالب</p>
              <button onClick={() => setShowModal(true)} className="mx-auto flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-black text-white hover:bg-teal-700">
                <Plus size={16} /> توثيق أول جلسة
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {records.map((rec) => (
                <div key={rec.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-slate-900 text-base">{rec.studentName}</h3>
                      <p className="text-xs font-bold text-slate-400">{rec.sessionDate} · {rec.sessionTime}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${COOPERATION_COLORS[rec.cooperation]}`}>
                      التعاون: {COOPERATION_LABELS[rec.cooperation]}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-600 leading-relaxed line-clamp-2">
                    {rec.progressNotes}
                  </p>

                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} size={14} fill={star <= rec.overallPerformance ? 'currentColor' : 'none'} />
                    ))}
                    <span className="text-xs font-black text-slate-700 mr-1">التقييم: {RATING_LABELS[rec.overallPerformance]}</span>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between text-xs">
                    <button onClick={() => setSelectedRecord(rec)} className="font-black text-teal-700 hover:underline">
                      عرض التقرير الطبي الكامل ←
                    </button>
                    <button onClick={() => handleDelete(rec.id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded-md">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm grid place-items-center">
              <form onSubmit={handleCreate} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 text-right">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-black text-slate-900 text-lg">توثيق جلسة علاجية جديدة</h3>
                  <button type="button" onClick={() => setShowModal(false)}><X size={20} className="text-slate-400" /></button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-black text-slate-700 block mb-1">اختر الطالب</label>
                    <select value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none" required>
                      {students.map((st) => <option key={st.id} value={st.id}>👦 {st.fullName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">تاريخ الجلسة</label>
                    <input type="date" value={form.sessionDate} onChange={(e) => setForm((f) => ({ ...f, sessionDate: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none" required />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">المدة بالدقائق</label>
                    <input type="number" value={form.durationMinutes} onChange={(e) => setForm((f) => ({ ...f, durationMinutes: +e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none" required />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">الأهداف المنفذة (مفصولة بفاصلة)</label>
                  <input type="text" value={form.goalsInput} onChange={(e) => setForm((f) => ({ ...f, goalsInput: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none" required />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">ملاحظات التقدّم والتفاعل</label>
                  <textarea rows={3} value={form.progressNotes} onChange={(e) => setForm((f) => ({ ...f, progressNotes: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none resize-none" required />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-xs font-black text-slate-500">إلغاء</button>
                  <button type="submit" className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white hover:bg-teal-700 shadow-sm">
                    حفظ السجل الطبي للجلسة
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Record Detail Modal */}
          {selectedRecord && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm grid place-items-center">
              <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 text-right">
                <div className="flex justify-between items-center border-b pb-3">
                  <h3 className="font-black text-slate-900 text-lg">السجل الطبي للجلسة · {selectedRecord.studentName}</h3>
                  <button onClick={() => window.print()} className="rounded-xl bg-teal-600 px-3 py-1 text-xs font-black text-white">
                    <Printer size={14} className="inline ml-1" /> طباعة
                  </button>
                </div>
                <div className="space-y-2 text-xs font-bold text-slate-700">
                  <p>التاريخ والوقت: <span className="font-black">{selectedRecord.sessionDate} ({selectedRecord.durationMinutes} دقيقة)</span></p>
                  <p>الأخصائي الموثِّق: <span className="font-black">{selectedRecord.conductedBy}</span></p>
                  <p>التقدم: <span className="font-black text-slate-900">{selectedRecord.progressNotes}</span></p>
                  <p>خطة الجلسة القادمة: <span className="font-black text-teal-700">{selectedRecord.nextSessionPlan}</span></p>
                </div>
                <div className="pt-3 border-t flex justify-end">
                  <button onClick={() => setSelectedRecord(null)} className="text-xs font-black text-slate-600">إغلاق</button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
