'use client';

import { useEffect, useState } from 'react';
import {
  ClipboardList, Plus, X, Printer, ChevronDown, ChevronUp,
  CheckCircle2, Target, Sparkles, Trash2, FileText, Save, PenLine, TrendingUp, User
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  getLocalIEPs, createIEP, updateIEP, deleteIEP, type IEPRecord, type IEPGoal,
  type IEPDomain, DOMAIN_LABELS, DOMAIN_COLORS, type IEPGoalStatus
} from '@/lib/iep';
import { getStudents, type StudentRecord } from '@/lib/localDb';
import FeatureGuideBanner from '@/components/FeatureGuideBanner';

export default function IEPPage() {
  const [ieps, setIeps] = useState<IEPRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedIep, setSelectedIep] = useState<IEPRecord | null>(null);

  // Form State
  const [studentId, setStudentId] = useState('');
  const [schoolName, setSchoolName] = useState('مدرسة الأمل التخصصية');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [reviewDate, setReviewDate] = useState(new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10));
  const [strengths, setStrengths] = useState('الذاكرة البصرية الممتازة، الاستجابة للتعزيز الفوري، حب الاستكشاف الأكاديمي.');
  const [challenges, setChallenges] = useState('التشتت السمعي الخفيف، صعوبة دمج المقاطع اللفظية المركبة، بطء الكتابة اليدوية.');
  const [accommodations, setAccommodations] = useState<string[]>([
    'وقت إضافي في الاختبارات',
    'جلوس في المقدمة',
    'استراحات حركية منتظمة'
  ]);

  const [goals, setGoals] = useState<Omit<IEPGoal, 'id'>[]>([
    {
      domain: 'academic',
      objective: 'قراءة 20 كلمة ثنائية المقاطع بدقة 85% بدون تردد.',
      targetDate: new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10),
      progressNotes: 'أظهر استجابةممتازة في التمييز البصري للحروف.',
      status: 'in-progress',
      baselineScore: 40,
      currentScore: 75,
    },
    {
      domain: 'speech',
      objective: 'نطق الحروف الحلقية بصوت واضح داخل جمل قصيرة.',
      targetDate: new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10),
      progressNotes: 'تحسن نطق حرف الخاء والجيم.',
      status: 'in-progress',
      baselineScore: 30,
      currentScore: 65,
    },
  ]);

  useEffect(() => {
    setIeps(getLocalIEPs());
    const allSt = getStudents();
    setStudents(allSt);
    if (allSt.length > 0) setStudentId(allSt[0].id);
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find((s) => s.id === studentId);
    const fullGoals: IEPGoal[] = goals.map((g, i) => ({
      ...g,
      id: `goal_${Date.now()}_${i}`,
    }));

    const newRecord = await createIEP({
      studentId,
      studentName: st ? st.fullName : 'طالب',
      grade: st ? st.grade : 'الصف الأول الابتدائي',
      schoolName,
      doctorName: 'أ.د. إسماعيل عيسى',
      startDate,
      reviewDate,
      goals: fullGoals,
      strengths,
      challenges,
      accommodations,
      status: 'active',
    });

    setIeps(getLocalIEPs());
    setSelectedIep(newRecord);
    setView('detail');
  };

  const handleToggleGoalStatus = (iepId: string, goalId: string) => {
    const target = ieps.find((i) => i.id === iepId);
    if (!target) return;
    const updatedGoals = target.goals.map((g) => {
      if (g.id === goalId) {
        const nextStatus: IEPGoalStatus =
          g.status === 'in-progress' ? 'achieved' : g.status === 'achieved' ? 'not-started' : 'in-progress';
        return { ...g, status: nextStatus, currentScore: nextStatus === 'achieved' ? 100 : g.currentScore };
      }
      return g;
    });
    updateIEP(iepId, { goals: updatedGoals });
    const updatedList = getLocalIEPs();
    setIeps(updatedList);
    if (selectedIep?.id === iepId) {
      setSelectedIep(updatedList.find((i) => i.id === iepId) || null);
    }
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (confirm('هل أنت تأكد من رغبتك في حذف خطة الـ IEP هذه؟')) {
      deleteIEP(id);
      setIeps(getLocalIEPs());
      if (selectedIep?.id === id) {
        setView('list');
        setSelectedIep(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 print:hidden">
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <ClipboardList className="text-teal-600" size={26} />
                خطط التعليم الفردية الرسمية (IEP Builder)
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-1">
                صياغة وتتبع أهداف خطة التربية الخاصة الرسمية وتصديرها كملف معتمد
              </p>
            </div>

            <div className="flex items-center gap-2">
              {view !== 'list' && (
                <button
                  onClick={() => setView('list')}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50"
                >
                  ← العودة للقائمة
                </button>
              )}
              {view === 'list' && (
                <button
                  onClick={() => setView('create')}
                  className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-black text-white hover:bg-teal-700 shadow-sm"
                >
                  <Plus size={18} /> إنشاء خطة IEP جديدة
                </button>
              )}
            </div>
          </div>

          {/* Educational Guide Banner */}
          <FeatureGuideBanner
            title="خطة التربية الفردية (IEP)"
            description="نظام رقمي معتمد دولياً لتنظيم الخطة العلاجية والتعليمية لكل طفل. يُحدد نقاط القوة، التحديات الأكاديمية والنطقية والسلوكية، ويُصمّم أهدافاً ذكية قابلة للمقياس والتتبع المباشر."
            benefits={[
              'تضمن توحيد الخطة بين الأخصائي، المدرسة، وولي الأمر بدون تشتت.',
              'تُوفر تقييمات دقيقة ونسب مئوية تراكمية تقيس معدل التحسن الفعلي.',
              'تُصدر كوثيقة رسمية معتمدة قابلة للطباعة والتسليم للجهات التعليمية.'
            ]}
            modernShift="يُمثّل نظام الـ IEP الانتقال الحديث من التدريس العشوائي الموحد إلى التعليم الشخصي الموجه (Personalized Intervention)، حيث يحصل كل طفل على مسار خاص يُناسب قدراته الذهنية والنفسية."
          />

          {/* LIST VIEW */}
          {view === 'list' && (
            <div className="space-y-4">
              {ieps.length === 0 ? (
                <div className="py-20 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-3">
                  <ClipboardList className="mx-auto text-slate-300" size={48} />
                  <p className="text-lg font-black text-slate-700">لا توجد خطط IEP مسجلة بعد</p>
                  <p className="text-xs font-bold text-slate-400">ابدأ بإنشاء أول خطة تعليم فردية معتمدة لطالب</p>
                  <button
                    onClick={() => setView('create')}
                    className="mx-auto flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-black text-white hover:bg-teal-700 shadow-sm"
                  >
                    <Plus size={16} /> إنشاء خطة IEP الآن
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {ieps.map((iep) => (
                    <div
                      key={iep.id}
                      onClick={() => { setSelectedIep(iep); setView('detail'); }}
                      className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-teal-300 transition space-y-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700 font-black">
                            <User size={20} />
                          </div>
                          <div>
                            <h3 className="font-black text-slate-900 text-base">{iep.studentName}</h3>
                            <p className="text-xs font-bold text-slate-400">{iep.grade}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                            iep.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {iep.status === 'active' ? 'نشطة ✓' : 'مسودة'}
                          </span>
                          <button
                            onClick={(e) => handleDelete(iep.id, e)}
                            className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-black text-rose-700 hover:bg-rose-100 border border-rose-200 transition"
                            title="حذف الخطة"
                          >
                            <Trash2 size={13} />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1 text-xs font-bold text-slate-600">
                        <p>🏫 المدرسة: <span className="font-black text-slate-800">{iep.schoolName}</span></p>
                        <p>🎯 الأهداف المحددة: <span className="font-black text-teal-700">{iep.goals.length} أهداف مقيسة</span></p>
                        <p>📅 تاريخ المراجعة: <span className="font-black text-slate-800">{iep.reviewDate}</span></p>
                      </div>

                      <div className="pt-2 flex items-center justify-between text-xs font-black">
                        <span className="text-teal-700">عرض التفاصيل الأهداف ←</span>
                        <button
                          onClick={(e) => handleDelete(iep.id, e)}
                          className="flex items-center gap-1 text-rose-600 hover:text-rose-800 hover:underline text-[11px]"
                        >
                          <Trash2 size={12} />
                          <span>حذف الخطة</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* CREATE FORM VIEW */}
          {view === 'create' && (
            <form onSubmit={handleCreateSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
              <h2 className="text-lg font-black text-slate-900 border-b pb-3">نموذج صياغة خطة التربية الفردية (IEP)</h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">الطالب المستهدف</label>
                  <select
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none"
                    required
                  >
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>👦 {st.fullName} ({st.grade})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">اسم المدرسة</label>
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">تاريخ المراجعة الربعية</label>
                  <input
                    type="date"
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">نقاط القوة والأداء الحالي</label>
                  <textarea
                    rows={3}
                    value={strengths}
                    onChange={(e) => setStrengths(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">التحديات والاحتياجات الرئيسية</label>
                  <textarea
                    rows={3}
                    value={challenges}
                    onChange={(e) => setChallenges(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none resize-none"
                  />
                </div>
              </div>

              {/* Goals Builder */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-black text-slate-900 text-sm">أهداف الخطة المقيسة ({goals.length})</h3>
                  <button
                    type="button"
                    onClick={() => setGoals([...goals, {
                      domain: 'academic',
                      objective: 'هدف تعليمي جديد...',
                      targetDate: reviewDate,
                      progressNotes: '',
                      status: 'in-progress',
                      baselineScore: 20,
                      currentScore: 50,
                    }])}
                    className="text-xs font-black text-teal-700 hover:underline"
                  >
                    + إضافة هدف جديد
                  </button>
                </div>

                <div className="space-y-3">
                  {goals.map((g, idx) => (
                    <div key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div>
                          <label className="text-[11px] font-black text-slate-600 block mb-1">المجال</label>
                          <select
                            value={g.domain}
                            onChange={(e) => {
                              const next = [...goals];
                              next[idx].domain = e.target.value as IEPDomain;
                              setGoals(next);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-black"
                          >
                            {Object.entries(DOMAIN_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[11px] font-black text-slate-600 block mb-1">نص الهدف المقيس</label>
                          <input
                            type="text"
                            value={g.objective}
                            onChange={(e) => {
                              const next = [...goals];
                              next[idx].objective = e.target.value;
                              setGoals(next);
                            }}
                            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-black"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setView('list')} className="px-5 py-2.5 text-xs font-black text-slate-500">إلغاء</button>
                <button type="submit" className="rounded-xl bg-teal-600 px-6 py-2.5 text-xs font-black text-white hover:bg-teal-700 shadow-sm">
                  حفظ واعتاماد خطة IEP
                </button>
              </div>
            </form>
          )}

          {/* DETAIL VIEW */}
          {view === 'detail' && selectedIep && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">

              {/* Action Bar */}
              <div className="flex items-center justify-between border-b pb-4 print:hidden">
                <div>
                  <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-black text-teal-800">
                    خطة فردية معتمدة · {selectedIep.status}
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 mt-1">{selectedIep.studentName}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-black text-white">
                    <Printer size={15} /> طباعة رسمية PDF
                  </button>
                  <button onClick={() => handleDelete(selectedIep.id)} className="p-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Printable Body */}
              <div className="space-y-6" id="iep-print">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl bg-slate-50 p-4 border text-xs font-bold">
                  <div><p className="text-slate-400">الطالب</p><p className="font-black text-slate-900">{selectedIep.studentName}</p></div>
                  <div><p className="text-slate-400">الصف</p><p className="font-black text-slate-900">{selectedIep.grade}</p></div>
                  <div><p className="text-slate-400">المدرسة</p><p className="font-black text-slate-900">{selectedIep.schoolName}</p></div>
                  <div><p className="text-slate-400">تاريخ المراجعة</p><p className="font-black text-slate-900">{selectedIep.reviewDate}</p></div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-black text-slate-900 text-sm border-r-4 border-teal-600 pr-3">أهداف الخطة ومستوى الإنجاز</h3>
                  <div className="space-y-3">
                    {selectedIep.goals.map((g) => (
                      <div key={g.id} className="rounded-2xl border border-slate-200 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${DOMAIN_COLORS[g.domain]}`}>
                            {DOMAIN_LABELS[g.domain]}
                          </span>
                          <button
                            onClick={() => handleToggleGoalStatus(selectedIep.id, g.id)}
                            className="text-xs font-black text-teal-700 hover:underline print:hidden"
                          >
                            الحالة: {g.status === 'achieved' ? 'محقَّق ✓' : 'قيد التدريب ⏳'}
                          </button>
                        </div>
                        <p className="font-black text-slate-900 text-sm">{g.objective}</p>
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                          <span>المستوى الأساسي: {g.baselineScore}%</span>
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full bg-teal-600 rounded-full" style={{ width: `${g.currentScore}%` }} />
                          </div>
                          <span className="font-black text-teal-700">الحالي: {g.currentScore}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

        </main>
      </div>
    </div>
  );
}
