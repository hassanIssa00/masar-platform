'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowRight, FilePlus2, Printer, Trash2, UserRound } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import PrintableReportModal from '@/components/PrintableReportModal';
import { getDecisionFromScore } from '@/data/assessmentModel';
import { curriculumPrograms } from '@/data/curriculum';
import { deleteReport, getReports, getSession, getStudents, ReportRecord, StudentRecord, updateStudent } from '@/lib/localDb';
import { trackEvent } from '@/lib/analyticsTracker';
import { pullCloudDataToLocal, subscribeToCloudUpdates } from '@/lib/firestoreSync';

const filters = ['all', 'إجابات الاستبيان', 'إجابات اختبار الطالب', 'التقرير التحليلي', 'تحليل اختبار الطالب', 'اختبار قبول', 'القراءة', 'الرياضيات', 'التخاطب', 'طيف التوحد'];

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <ReportsContent />
    </Suspense>
  );
}

function ReportsContent() {
  const searchParams = useSearchParams();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assignMessage, setAssignMessage] = useState('');
  const [printReport, setPrintReport] = useState<ReportRecord | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const parentMode = searchParams.get('mode') === 'parent';

  const router = useRouter();

  useEffect(() => {
    const load = () => {
      const session = getSession();
      if (!session || (session.role !== 'doctor' && session.role !== 'specialist')) {
        router.replace(session?.role === 'parent' ? '/parent' : session?.role === 'student' ? '/school-student' : '/login');
        return;
      }
      const rawReports = getReports();
      const nextReports = Array.isArray(rawReports) ? rawReports.filter(Boolean) : [];
      setReports(nextReports);
      const rawStudents = getStudents();
      setStudents(Array.isArray(rawStudents) ? rawStudents.filter(Boolean) : []);
      const reportId = searchParams.get('report');
      if (reportId && nextReports.some((report) => report && report.id === reportId)) {
        setSelectedId(reportId);
      }
    };

    const session = getSession();
    if (session) trackEvent('visit', { userId: session.id, userName: session.name, userRole: session.role, page: '/reports' });
    load();
    pullCloudDataToLocal().then(load).catch(() => {});
    const unsubscribe = subscribeToCloudUpdates(load);
    return () => unsubscribe();
  }, [searchParams, router]);

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? reports
        : reports.filter((report) => report && ((report.program && report.program.includes(filter)) || (filter === 'التقرير التحليلي' && ['clinical-analysis', 'student-assessment-analysis'].includes(report.type)))),
    [filter, reports],
  );
  const selected = reports.find((report) => report && report.id === selectedId);
  const selectedStudent = selected ? students.find((student) => student && (student.id === selected.studentId || student.fullName === selected.studentName)) : null;

  const getScoreColor = (score: number = 0) => {
    if (score >= 75) return '#15803d';
    if (score >= 50) return '#b7791f';
    return '#b91c1c';
  };

  if (selected) {
    const isAnswersReport = selected.type === 'survey-answers' || selected.type === 'student-assessment-answers';
    const reportScore = typeof selected.score === 'number' ? selected.score : 0;
    const decision = getDecisionFromScore(reportScore);
    const fileNumber = `MASAR-${(selected.id || '').slice(-6).toUpperCase() || 'REPORT'}`;
    const domainsList = Array.isArray(selected.domains) ? selected.domains : [];
    const recommendationsList = Array.isArray(selected.recommendations) ? selected.recommendations : [];
    const answersList = Array.isArray(selected.answers) ? selected.answers : [];
    
    const sortedDomains = [...domainsList].sort((first, second) => (first.score ?? 0) - (second.score ?? 0));
    const supportDomains = sortedDomains.filter((domain) => (domain.score ?? 0) < 70);
    const strengthDomains = [...domainsList].sort((first, second) => (second.score ?? 0) - (first.score ?? 0)).slice(0, 2);
    const clinicalLabel =
      isAnswersReport
        ? 'تقرير إجابات تفصيلية بدون تشخيص'
        : reportScore >= 85
        ? 'مؤشرات تعلم مستقرة مع احتياج متابعة دورية'
        : reportScore >= 70
          ? 'صعوبات تعلم نمائية وأكاديمية خفيفة إلى متوسطة'
          : reportScore >= 50
            ? 'صعوبات تعلم متوسطة تحتاج تدخلاً علاجياً منظماً'
            : 'صعوبات تعلم مرتفعة تحتاج إعادة تدريس وتشخيصاً دقيقاً';
    const homeRecommendations = recommendationsList.slice(0, 3);
    const schoolRecommendations = recommendationsList.slice(3, 6).length ? recommendationsList.slice(3, 6) : recommendationsList.slice(0, 3);
    const iepRows = (supportDomains.length ? supportDomains : sortedDomains).slice(0, 4);
    const approveProgram = (slug: string) => {
      if (!selectedStudent) return;
      const program = curriculumPrograms.find((item) => item.slug === slug);
      const currentList = selectedStudent.assignedPrograms || (selectedStudent.assignedProgram ? [selectedStudent.assignedProgram] : []);
      const updatedList = Array.from(new Set([...currentList, slug]));
      updateStudent(selectedStudent.id, {
        assignedProgram: slug,
        assignedPrograms: updatedList,
        assignedBy: 'د. إسماعيل عيسى',
        assignedAt: new Date().toISOString(),
        reviewStatus: 'program-assigned',
      });
      setStudents(getStudents());
      setAssignMessage(`تم اعتماد ${program?.shortTitle ?? 'المسار'} للطالب ${selectedStudent.fullName}.`);
    };
    const removeSelectedReport = () => {
      deleteReport(selected.id);
      setReports(getReports());
      setSelectedId(null);
    };

    return (
      <div className="min-h-screen bg-[var(--background)] text-slate-950">
        {!parentMode && <Navbar />}
        <div className="flex">
          {!parentMode && <Sidebar desktopOnly />}
          <main className={`min-w-0 flex-1 px-4 py-6 lg:px-8 ${parentMode ? 'mx-auto max-w-5xl' : ''}`}>
            {!parentMode && <button onClick={() => setSelectedId(null)} className="no-print mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
              <ArrowRight size={17} />
              العودة إلى التقارير
            </button>}

            {/* ══ LUXURY FRAME WRAPPER ══ */}
            <div className="p-3 bg-slate-100 rounded-2xl border-2 border-slate-300 shadow-xl">
            <article className="clinical-report overflow-hidden rounded-xl border-4 border-slate-950 bg-white shadow-lg ring-2 ring-amber-400/40 relative">

              {/* Decorative Corner Accents */}
              <div className="pointer-events-none absolute top-3 right-3 w-10 h-10 border-t-2 border-r-2 border-amber-500 z-10" />
              <div className="pointer-events-none absolute top-3 left-3 w-10 h-10 border-t-2 border-l-2 border-amber-500 z-10" />
              <div className="pointer-events-none absolute bottom-3 right-3 w-10 h-10 border-b-2 border-r-2 border-amber-500 z-10" />
              <div className="pointer-events-none absolute bottom-3 left-3 w-10 h-10 border-b-2 border-l-2 border-amber-500 z-10" />

              {/* Top Gold Stripe */}
              <div className="h-2 w-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />

              <div className="p-5 md:p-8">

                {/* ══ REPORT IDENTITY HEADER ══ */}
                <header className="border-b-4 border-amber-400 pb-6">

                  {/* Top identity bar: Logo left / Brand right */}
                  <div className="flex items-center justify-between gap-4">
                    {/* File number badge */}
                    <div className="flex flex-col items-start gap-1">
                      <div className="rounded-lg bg-indigo-950 px-5 py-2.5 text-white text-center">
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">رقم الملف</p>
                        <p className="mt-0.5 text-lg font-black tracking-widest">{fileNumber}</p>
                      </div>
                      <p className="text-xs font-bold text-slate-400 mt-1">{selected.date}</p>
                    </div>

                    {/* Center: Platform name */}
                    <div className="flex-1 text-center px-4">
                      <h1 className="text-3xl font-black text-indigo-950 tracking-tight">مَسَار · MASAR</h1>
                      <p className="mt-1 text-sm font-black text-blue-700">منصة التأهيل والتعليم الذكي لصعوبات التعلم</p>
                      <p className="mt-0.5 text-xs font-bold text-slate-500">تحت إشراف د. إسماعيل عيسى للتأهيل والتعليم الحديث</p>
                    </div>

                    {/* Masar Logo Only */}
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-16 h-16 rounded-2xl border-2 border-indigo-900 bg-white flex items-center justify-center shadow-md p-1.5">
                        <img src="/brand/masar-logo.png" alt="منصة مسار" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">وثيقة رقمية</p>
                    </div>
                  </div>

                  {/* Report title strip */}
                  <div className="mt-5 rounded-xl bg-gradient-to-l from-indigo-950 to-blue-800 px-6 py-4 text-center text-white flex items-center justify-between gap-4 flex-wrap">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest mb-1">وثيقة تعليمية حديثة · OFFICIAL ASSESSMENT REPORT</p>
                      <h2 className="text-xl font-black">{getReportPrintTitle(selected)}</h2>
                    </div>
                    <button
                      onClick={() => setPrintReport(selected)}
                      className="flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-indigo-950 px-4 py-2 text-xs font-black transition shadow-sm"
                    >
                      <Printer size={16} /> طباعة رقمية / PDF
                    </button>
                  </div>
                </header>

                {/* ══ STUDENT INFO GRID (symmetric 3-col) ══ */}
                <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="mb-3 text-xs font-black text-slate-500 uppercase tracking-wider text-center">بيانات الطالب والتقرير</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    {/* Photo cell spans 1 row on md, full width on small */}
                    <div className="md:row-span-2 grid place-items-center rounded-xl border-2 border-indigo-100 bg-white p-4 text-center">
                      {selectedStudent?.photoUrl ? (
                        <span
                          role="img"
                          aria-label={selectedStudent.fullName}
                          className="h-24 w-24 rounded-xl bg-cover bg-center ring-2 ring-indigo-200"
                          style={{ backgroundImage: `url(${selectedStudent.photoUrl})` }}
                        />
                      ) : (
                        <span className="grid h-24 w-24 place-items-center rounded-xl bg-indigo-50 text-indigo-400 border-2 border-indigo-100">
                          <UserRound size={40} />
                        </span>
                      )}
                      <p className="mt-2 text-xs font-black text-indigo-700">صورة الطالب</p>
                    </div>
                    {/* 6 info cells in 2 columns → perfectly symmetric */}
                    {[
                      ['اسم الطالب', selected.studentName],
                      [isAnswersReport ? 'نسبة اكتمال الإجابات' : 'نسبة الأداء الكلي', `${selected.score}%`],
                      ['الصف الدراسي', selected.grade],
                      ['البرنامج', cleanReportText(selected.program)],
                      ['تاريخ التقرير', selected.date],
                      ['حالة التقرير', selected.status === 'completed' ? 'مكتمل وموثق ✓' : 'قيد المراجعة'],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-slate-200 bg-white p-3.5 text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-wide">{label}</p>
                        <p className="mt-1.5 text-base font-black text-slate-950 leading-snug">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className={`${isAnswersReport ? 'border-slate-200 bg-slate-50' : 'border-rose-200 bg-rose-50'} rounded-lg border p-5`}>
                    <p className={`text-xs font-black ${isAnswersReport ? 'text-slate-600' : 'text-rose-700'}`}>
                      {isAnswersReport ? 'نوع التقرير' : 'التحليل التعليمي الموثق'}
                    </p>
                    <h3 className={`mt-2 text-xl font-black ${isAnswersReport ? 'text-slate-950' : 'text-rose-950'}`}>{clinicalLabel}</h3>
                    <p className={`mt-3 text-sm font-bold leading-7 ${isAnswersReport ? 'text-slate-700' : 'text-rose-900'}`}>{cleanReportText(selected.summary)}</p>
                  </div>
                  {!isAnswersReport ? (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-5">
                      <p className="text-xs font-black text-indigo-700">المسار التعليمي الموصى به</p>
                      <h3 className="mt-2 text-xl font-black text-indigo-950">{decision.label}</h3>
                      <p className="mt-3 text-sm font-bold leading-7 text-indigo-900">{decision.action}</p>
                      <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-900 ring-1 ring-indigo-200">{decision.range}</span>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-5">
                      <p className="text-xs font-black text-indigo-700">استخدام التقرير</p>
                      <h3 className="mt-2 text-xl font-black text-indigo-950">مراجعة إجابات ولي الأمر سؤالاً بسؤال</h3>
                      <p className="mt-3 text-sm font-bold leading-7 text-indigo-900">هذا التقرير مخصص للدكتور فقط ويُقرأ بجانب تقرير التحليل قبل اعتماد المسار.</p>
                    </div>
                  )}
                </section>

                {!parentMode && !isAnswersReport && <section className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-xs font-black text-teal-800">قرار د. إسماعيل قبل فتح المنهج للطالب</p>
                      <h3 className="mt-1 text-xl font-black text-slate-950">
                        {selectedStudent?.assignedProgram
                          ? `المسار الموثق حالياً: ${curriculumPrograms.find((program) => program.slug === selectedStudent.assignedProgram)?.shortTitle ?? selectedStudent.assignedProgram}`
                          : 'لم يتم اعتماد مسار علاجي بعد'}
                      </h3>
                      <p className="mt-2 text-sm font-bold leading-7 text-slate-700">
                        الطالب يرى الألعاب ورسائل التشجيع فقط. المنهج لا يظهر له إلا بعد اختيار المسار من هنا.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {curriculumPrograms.map((program) => (
                        <button
                          key={program.slug}
                          onClick={() => approveProgram(program.slug)}
                          disabled={!selectedStudent}
                          className="rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-800 ring-1 ring-teal-100 hover:bg-teal-100 disabled:opacity-40"
                        >
                          {program.shortTitle}
                        </button>
                      ))}
                    </div>
                  </div>
                  {assignMessage && <p className="mt-4 rounded-lg bg-white p-3 text-sm font-black text-teal-900 ring-1 ring-teal-100">{assignMessage}</p>}
                </section>}

                {domainsList.length > 0 && (
                  <ReportSection number="1" title="تحليل نقاط القوة والاحتياج">
                    <div className="grid gap-3 md:grid-cols-2">
                      {domainsList.map((domain) => (
                        <MetricBar key={domain.name} title={domain.name} value={domain.score} note={domain.note} />
                      ))}
                    </div>
                  </ReportSection>
                )}

                {domainsList.length > 0 && (
                  <ReportSection number="2" title="ملخص القوة والصعوبات">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                        <h3 className="font-black text-emerald-950">نقاط القوة</h3>
                        <ul className="mt-3 space-y-2 text-sm font-bold leading-7 text-emerald-900">
                          {strengthDomains.map((domain) => (
                            <li key={domain.name}>- {domain.name}: {domain.score}%</li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <h3 className="font-black text-amber-950">صعوبات تحتاج تدخل</h3>
                        <ul className="mt-3 space-y-2 text-sm font-bold leading-7 text-amber-900">
                          {(supportDomains.length ? supportDomains : sortedDomains.slice(0, 2)).map((domain) => (
                            <li key={domain.name}>- {domain.name}: {domain.score}%</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </ReportSection>
                )}

                {domainsList.length > 0 && (
                  <ReportSection number="3" title="أهداف خطة التربية الفردية التفصيلية IEP">
                    <div className="overflow-hidden rounded-lg border border-purple-200">
                      <table className="w-full min-w-[760px] text-right text-sm">
                        <thead className="bg-purple-700 text-white">
                          <tr>
                            <th className="p-3">المجال</th>
                            <th className="p-3">الهدف التعليمي</th>
                            <th className="p-3">معيار الإتقان</th>
                            <th className="p-3">الموعد</th>
                          </tr>
                        </thead>
                        <tbody>
                          {iepRows.map((domain, index) => (
                            <tr key={domain.name} className="border-b border-purple-100 last:border-0">
                              <td className="p-3 font-black text-purple-800">{domain.name}</td>
                              <td className="p-3 font-bold text-slate-800">{getGoalForDomain(domain.name)}</td>
                              <td className="p-3 font-bold text-slate-700">{getMasteryForDomain(domain.name)}</td>
                              <td className="p-3 font-bold text-slate-600">{getPlanMonth(index)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ReportSection>
                )}

                <ReportSection number="4" title="تحليل النمط السلوكي ABC">
                  <div className="overflow-hidden rounded-lg border border-amber-200">
                    <table className="w-full min-w-[700px] text-right text-sm">
                      <thead className="bg-amber-500 text-white">
                        <tr>
                          <th className="p-3">السوابق A</th>
                          <th className="p-3">السلوك B</th>
                          <th className="p-3">العواقب C</th>
                          <th className="p-3">التكرار</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['سؤال صعب أو انتقال مفاجئ داخل الاختبار', 'تردد أو بطء في الاستجابة', 'تقديم نموذج بصري وتقليل الاختيارات', '2-3 مرات/جلسة'],
                          ['مهمة قراءة أو حساب ممتدة', 'فقدان انتباه أو تخمين', 'استراحة قصيرة ثم سؤال إتقان واحد', '1-2 مرات/جلسة'],
                        ].map((row) => (
                          <tr key={row.join('-')} className="border-b border-amber-100 last:border-0">
                            {row.map((cell) => <td key={cell} className="p-3 font-bold text-slate-700">{cell}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ReportSection>

                {recommendationsList.length > 0 && (
                  <ReportSection number="5" title="التوصيات">
                    <div className="grid gap-4 lg:grid-cols-2">
                      <RecommendationBox title="توجيهات الأسرة" items={homeRecommendations} tone="home" />
                      <RecommendationBox title="توجيهات الجلسات" items={schoolRecommendations} tone="school" />
                    </div>
                  </ReportSection>
                )}

                {answersList.length > 0 && (
                  <ReportSection number="6" title="الإجابات التفصيلية المحفوظة">
                    <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 print:max-h-none print:overflow-visible">
                      {answersList.map((answer, index) => (
                        <article key={`${answer.question}-${index}`} className="rounded-xl bg-white p-3.5 border border-slate-200 shadow-sm print:break-inside-avoid">
                          <p className="text-xs font-black leading-6 text-slate-500">سؤال {index + 1}: {answer.question}</p>
                          <p className="mt-1 text-sm font-black leading-7 text-slate-950">{answer.answer}</p>
                        </article>
                      ))}
                    </div>
                  </ReportSection>
                )}

                <footer className="mt-8 flex items-end justify-between border-t border-slate-200 pt-6 print-break-inside-avoid" dir="rtl">
                  {/* Doctor Signature Block */}
                  <div className="text-right flex flex-col gap-1">
                    <p className="text-xs font-bold text-slate-500">يعتمد:</p>
                    <h3 className="text-xl font-black text-slate-950 margin-0">د. إسماعيل عيسى</h3>
                    <div className="w-56 mt-3">
                      <img
                        src="/dr-ismail-signature.png"
                        alt="التوقيع الموثق"
                        className="h-12 object-contain block mix-blend-multiply"
                      />
                      <div className="border-b-2 border-slate-400 w-full mt-1" />
                    </div>
                  </div>

                  {/* Circular Official Stamp SVG & Serial */}
                  <div className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-emerald-900 bg-emerald-50/40 p-3 text-center shadow-sm min-w-[190px]">
                    <div className="w-24 h-24 grid place-items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 160 160">
                        <circle cx="80" cy="80" r="76" fill="none" stroke="#06392c" strokeWidth="2.5" />
                        <circle cx="80" cy="80" r="68" fill="white" stroke="#06392c" strokeWidth="1.2" />
                        <text x="80" y="36" textAnchor="middle" fontFamily="Cairo, Arial" fontSize="6.5" fontWeight="bold" fill="#06392c" direction="rtl">الختم الرقمي</text>
                        <text x="80" y="50" textAnchor="middle" fontFamily="Cairo, Arial" fontSize="10.5" fontWeight="900" fill="#06392c" direction="rtl">د. إسماعيل عيسى</text>
                        <line x1="24" y1="63" x2="136" y2="63" stroke="#06392c" strokeWidth="0.8" />
                        <image href="/dr-ismail-signature.png" x="24" y="64" width="112" height="34" preserveAspectRatio="xMidYMid meet" style={{ mixBlendMode: 'multiply' }} />
                        <line x1="24" y1="100" x2="136" y2="100" stroke="#06392c" strokeWidth="0.8" />
                        <text x="80" y="112" textAnchor="middle" fontFamily="Cairo, Arial" fontSize="7.5" fontWeight="900" fill="#06392c">{selected.date}</text>
                        <text x="80" y="124" textAnchor="middle" fontFamily="Cairo, Arial" fontSize="5" fontWeight="bold" fill="#06392c">منصة مسار · التعليم الحديث</text>
                      </svg>
                    </div>
                    <p className="text-[11px] font-black text-emerald-950">الختم الرقمي</p>
                    <p className="text-[10px] font-bold text-emerald-800 font-mono tracking-wide">{fileNumber}</p>
                  </div>
                </footer>

                <div className="no-print mt-6 flex flex-col gap-3 sm:flex-row">
                  <button onClick={() => setPrintReport(selected)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-950 px-5 py-3 text-sm font-black text-white">
                    <Printer size={17} />
                    طباعة PDF
                  </button>
                  {!parentMode && <button onClick={removeSelectedReport} className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-black text-rose-800">
                    <Trash2 size={17} />
                    حذف التقرير
                  </button>}
                </div>
              </div>
              {/* Bottom Gold Stripe */}
              <div className="h-2 w-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600" />
            </article>
            </div>
          </main>
        </div>
        {printReport && <PrintableReportModal report={printReport} onClose={() => setPrintReport(null)} />}
      </div>
    );
  }

  // ── Report categories ─────────────────────────────────────
  const CATEGORIES = [
    {
      id: 'placement',
      label: '🎯 اختبارات تحديد المستوى',
      description: 'نتائج اختبار القبول والتحديد (7 اختبارات)',
      color: '#2563eb',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      badge: 'bg-blue-100 text-blue-800',
      types: ['placement'],
    },
    {
      id: 'student-assessment',
      label: '📝 إجابات اختبار الطالب',
      description: 'الإجابات التفصيلية من الاختبار المباشر للطالب',
      color: '#334155',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      badge: 'bg-slate-100 text-slate-700',
      types: ['student-assessment-answers', 'student-assessment-analysis'],
    },
    {
      id: 'survey',
      label: '📋 استبيانات ولي الأمر',
      description: 'إجابات الاستبيان الأولي من ولي الأمر',
      color: '#0891b2',
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      badge: 'bg-cyan-100 text-cyan-800',
      types: ['survey-answers'],
    },
    {
      id: 'clinical',
      label: '🧠 التقارير التحليلية',
      description: 'التحليل الشامل وتوصيات المسار التعليمي',
      color: '#7c3aed',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      badge: 'bg-purple-100 text-purple-800',
      types: ['clinical-analysis'],
    },
    {
      id: 'programs',
      label: '📚 تقارير مسارات التعلم',
      description: 'تقارير القراءة والرياضيات والتخاطب وغيرها',
      color: '#059669',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      badge: 'bg-emerald-100 text-emerald-800',
      types: [], // catch-all for remaining
    },
  ] as const;



  const knownTypes = CATEGORIES.flatMap((c) => [...c.types]);
  const categorized = CATEGORIES.map((cat) => ({
    ...cat,
    reports: reports.filter((r) =>
      cat.id === 'programs'
        ? !knownTypes.includes(r.type as never)
        : (cat.types as readonly string[]).includes(r.type)
    ),
  }));

  const visibleCategories = activeCategory === 'all'
    ? categorized
    : categorized.filter((c) => c.id === activeCategory);

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">

          {/* ── Header ─────────────────────────────── */}
          <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-teal-800">التقارير الشاملة</p>
                <h1 className="mt-2 text-3xl font-black text-slate-950">عرض وطباعة تقارير التقييم</h1>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                  مقسّمة حسب النوع — {reports.length} تقرير محفوظ إجمالاً
                </p>
              </div>
              <Link href="/student/new" className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">
                إنشاء تقرير جديد
              </Link>
            </div>
          </header>

          {/* ── Category tabs ───────────────────────── */}
          <div className="mb-6 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-black transition ${activeCategory === 'all' ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
            >
              📂 الكل ({reports.length})
            </button>
            {categorized.map((cat) => cat.reports.length > 0 && (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 rounded-xl border px-4 py-2.5 text-sm font-black transition ${activeCategory === cat.id ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
              >
                {cat.label.split(' ')[0]} {cat.label.split(' ').slice(1).join(' ')} ({cat.reports.length})
              </button>
            ))}
          </div>

          {/* ── Empty state ─────────────────────────── */}
          {reports.length === 0 && (
            <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-slate-100 text-slate-600">
                <FilePlus2 size={26} />
              </div>
              <h2 className="mt-4 text-2xl font-black text-slate-950">لا توجد تقارير محفوظة بعد</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-slate-600">
                أنشئ طالباً أو استبياناً أو اختباراً وسيظهر التقرير هنا تلقائياً.
              </p>
              <Link href="/student/new" className="mt-5 inline-flex rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white hover:bg-teal-800">
                إضافة طالب وتقرير
              </Link>
            </section>
          )}

          {/* ── Sections ─────────────────────────────── */}
          <div className="space-y-8">
            {visibleCategories.map((cat) => cat.reports.length === 0 ? null : (
              <section key={cat.id}>
                {/* Section header */}
                <div className={`mb-4 flex items-center justify-between rounded-xl border ${cat.border} ${cat.bg} px-5 py-3`}>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">{cat.label}</h2>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">{cat.description}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${cat.badge}`}>
                    {cat.reports.length} تقرير
                  </span>
                </div>

                {/* Cards grid */}
                <div className="grid gap-4 md:grid-cols-2">
                  {cat.reports.map((report) => {
                    const decision = getDecisionFromScore(report.score);
                    return (
                      <article key={report.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                        <div className="h-1.5 w-full" style={{ backgroundColor: cat.color }} />
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <h3 className="text-lg font-black text-slate-950 truncate">{report.studentName}</h3>
                              <p className="mt-0.5 text-sm font-bold text-slate-500">{report.grade} · {report.date}</p>
                            </div>
                            <p className="shrink-0 text-2xl font-black" style={{ color: getScoreColor(report.score) }}>
                              {report.score}%
                            </p>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className={`inline-block rounded-full px-3 py-1 text-xs font-black ${cat.badge}`}>
                              {cleanReportText(report.program)}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                              {decision.label}
                            </span>
                          </div>

                          <p className="mt-3 line-clamp-2 text-sm font-bold leading-6 text-slate-600">
                            {cleanReportText(report.summary)}
                          </p>

                          <div className="mt-4 flex gap-2 border-t border-slate-100 pt-4">
                            <button
                              onClick={() => setSelectedId(report.id)}
                              className="flex-1 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800 transition"
                            >
                              عرض التقرير الكامل
                            </button>
                            <button
                              onClick={() => setPrintReport(report)}
                              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-100 transition"
                              title="طباعة PDF"
                            >
                              <Printer size={16} />
                            </button>
                            <button
                              onClick={() => { deleteReport(report.id); setReports(getReports()); }}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-black text-rose-700 hover:bg-rose-100 transition"
                              title="حذف التقرير"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

        </main>
      </div>
      {printReport && <PrintableReportModal report={printReport} onClose={() => setPrintReport(null)} />}
    </div>
  );
}


function ReportSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="print-report-section mt-6">
      <h2 className="mb-3 flex items-center justify-end gap-2 text-xl font-black text-slate-950">
        <span>{number}. {title}</span>
        <span className="h-7 w-1.5 rounded-full bg-indigo-700" />
      </h2>
      {children}
    </section>
  );
}

function MetricBar({ title, value, note }: { title: string; value: number; note: string }) {
  const tone =
    value >= 75
      ? { pill: 'bg-emerald-100 text-emerald-800', bar: 'bg-emerald-500' }
      : value >= 55
        ? { pill: 'bg-amber-100 text-amber-800', bar: 'bg-amber-500' }
        : { pill: 'bg-rose-100 text-rose-800', bar: 'bg-rose-500' };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black text-slate-950">{title}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${tone.pill}`}>{value}%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${value}%` }} />
      </div>
      <p className="mt-2 text-xs font-bold leading-6 text-slate-600">{note}</p>
    </article>
  );
}

function RecommendationBox({ title, items, tone }: { title: string; items: string[]; tone: 'home' | 'school' }) {
  const styles = tone === 'home' ? 'border-sky-200 bg-sky-50 text-sky-950' : 'border-indigo-200 bg-indigo-50 text-indigo-950';

  return (
    <div className={`rounded-lg border p-5 ${styles}`}>
      <h3 className="font-black">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm font-bold leading-7">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  );
}

function getGoalForDomain(domain: string) {
  if (domain.includes('رياض')) return 'تنفيذ الجمع والطرح المحسوس حتى 10 بالعدادات ثم بالرمز.';
  if (domain.includes('قراءة') || domain.includes('الصوتي')) return 'تمييز الأصوات القصيرة والطويلة وقراءة كلمات من مقطعين بدقة متدرجة.';
  if (domain.includes('كتابة') || domain.includes('الحركي')) return 'نسخ كلمات قصيرة داخل سطر واضح مع تقليل المساعدة الحركية تدريجياً.';
  if (domain.includes('نطق') || domain.includes('لغة') || domain.includes('سمع')) return 'نطق الأصوات المستهدفة داخل كلمات مألوفة ثم جمل قصيرة بصوت واضح.';
  if (domain.includes('اجتماعي') || domain.includes('التوحد')) return 'المشاركة في تبادل دوري قصير مع تواصل بصري مناسب واستجابة لتوجيه مباشر.';
  if (domain.includes('انتباه') || domain.includes('سلوك') || domain.includes('حسي')) return 'إكمال مهمة تدريبية قصيرة مع فواصل حسية منظمة وتعزيز فوري.';
  if (domain.includes('العربية') || domain.includes('الإنجليزية')) return 'ربط 20 حرفاً/صوتاً بصرياً وسمعياً وقراءة كلمات قصيرة.';
  if (domain.includes('بصري') || domain.includes('حركي')) return 'تحسين التتبع البصري والتحكم بالقلم داخل مسارات قصيرة.';
  if (domain.includes('ذهنية') || domain.includes('قدرات')) return 'تنفيذ تعليمات من خطوتين وحل نمط بصري أو عددي بسيط.';
  return 'رفع دقة المجال إلى مستوى الإتقان من خلال تدريب قصير ومقاس.';
}

function getMasteryForDomain(domain: string) {
  if (domain.includes('نطق') || domain.includes('لغة') || domain.includes('سمع')) return 'وضوح الصوت في 8 من 10 محاولات خلال جلستين.';
  if (domain.includes('كتابة') || domain.includes('الحركي') || domain.includes('رسم')) return 'إنجاز 4 من 5 نماذج بجودة مقبولة ودون مساعدة مباشرة.';
  if (domain.includes('انتباه') || domain.includes('سلوك') || domain.includes('حسي')) return 'التزام بالمهمة 80% من الزمن في جلستين متتاليتين.';
  if (domain.includes('رياض')) return 'حل 4 من 5 مسائل مشابهة دون تلميح مباشر.';
  if (domain.includes('قراءة') || domain.includes('الصوتي') || domain.includes('العربية')) return 'قراءة 8 من 10 كلمات مستهدفة بدقة في قياسين.';
  return 'دقة 80% في قياسين متتاليين خلال 30 يوماً.';
}

function getPlanMonth(index: number) {
  return ['سبتمبر 2026', 'أكتوبر 2026', 'نوفمبر 2026', 'ديسمبر 2026'][index] ?? 'ديسمبر 2026';
}

function getReportPrintTitle(report?: ReportRecord | null) {
  if (!report) return 'التقرير الشامل';
  if (report.type === 'survey-answers') return 'تقرير إجابات ولي الأمر التفصيلية';
  if (report.type === 'student-assessment-answers') return 'تقرير إجابات اختبار الطالب التفصيلية';
  return 'التقرير التحليلي وخطة التعليم الحديث';
}

function cleanReportText(value?: string | null) {
  if (!value || typeof value !== 'string') return '';
  return value
    .replaceAll('التحليل الإكلينيكي الشامل', 'التقرير التحليلي الشامل')
    .replaceAll('الإكلينيكية', 'التخصصية')
    .replaceAll('إكلينيكي', 'تعليمي حديث')
    .replaceAll('السريري', 'التعليمي الحديث')
    .replaceAll('سريري', 'تعليمي حديث')
    .replaceAll('طبي', 'تعليمي');
}
