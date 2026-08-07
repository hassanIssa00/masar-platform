'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, FilePlus2, Printer, Trash2, UserRound } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import PrintableReportModal from '@/components/PrintableReportModal';
import { getDecisionFromScore } from '@/data/assessmentModel';
import { curriculumPrograms } from '@/data/curriculum';
import { deleteReport, getReports, getSession, getStudents, ReportRecord, StudentRecord, updateStudent } from '@/lib/localDb';
import { trackEvent } from '@/lib/analyticsTracker';

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
  const parentMode = searchParams.get('mode') === 'parent';

  useEffect(() => {
    queueMicrotask(() => {
      const session = getSession();
      if (session) trackEvent('visit', { userId: session.id, userName: session.name, userRole: session.role, page: '/reports' });
      const nextReports = getReports();
      setReports(nextReports);
      setStudents(getStudents());
      const reportId = searchParams.get('report');
      if (reportId && nextReports.some((report) => report.id === reportId)) {
        setSelectedId(reportId);
      }
    });
  }, [searchParams]);

  const filtered = useMemo(
    () =>
      filter === 'all'
        ? reports
        : reports.filter((report) => report.program.includes(filter) || (filter === 'التقرير التحليلي' && ['clinical-analysis', 'student-assessment-analysis'].includes(report.type))),
    [filter, reports],
  );
  const selected = reports.find((report) => report.id === selectedId);
  const selectedStudent = selected ? students.find((student) => student.id === selected.studentId || student.fullName === selected.studentName) : null;

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#15803d';
    if (score >= 50) return '#b7791f';
    return '#b91c1c';
  };

  if (selected) {
    const isAnswersReport = selected.type === 'survey-answers' || selected.type === 'student-assessment-answers';
    const decision = getDecisionFromScore(selected.score);
    const fileNumber = `MASAR-${selected.id.slice(-6).toUpperCase()}`;
    const sortedDomains = [...selected.domains].sort((first, second) => first.score - second.score);
    const supportDomains = sortedDomains.filter((domain) => domain.score < 70);
    const strengthDomains = [...selected.domains].sort((first, second) => second.score - first.score).slice(0, 2);
    const clinicalLabel =
      isAnswersReport
        ? 'تقرير إجابات تفصيلية بدون تشخيص'
        : selected.score >= 85
        ? 'مؤشرات تعلم مستقرة مع احتياج متابعة دورية'
        : selected.score >= 70
          ? 'صعوبات تعلم نمائية وأكاديمية خفيفة إلى متوسطة'
          : selected.score >= 50
            ? 'صعوبات تعلم متوسطة تحتاج تدخلاً علاجياً منظماً'
            : 'صعوبات تعلم مرتفعة تحتاج إعادة تدريس وتشخيصاً دقيقاً';
    const homeRecommendations = selected.recommendations.slice(0, 3);
    const schoolRecommendations = selected.recommendations.slice(3, 6).length ? selected.recommendations.slice(3, 6) : selected.recommendations.slice(0, 3);
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
                      <p className="mt-0.5 text-xs font-bold text-slate-500">مؤسس المنصة: أ.د. إسماعيل عيسى — استشاري التربية الخاصة وتأهيل صعوبات التعلم</p>
                    </div>

                    {/* Logo */}
                    <div className="flex flex-col items-center gap-1">
                      <BrandMark size="lg" showText={false} />
                      <p className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">وثيقة معتمدة</p>
                    </div>
                  </div>

                  {/* Report title strip */}
                  <div className="mt-5 rounded-xl bg-gradient-to-l from-indigo-950 to-blue-800 px-6 py-4 text-center text-white flex items-center justify-between gap-4 flex-wrap">
                    <div className="text-right">
                      <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest mb-1">وثيقة تعليمية علاجية معتمدة · OFFICIAL ASSESSMENT REPORT</p>
                      <h2 className="text-xl font-black">{getReportPrintTitle(selected)}</h2>
                    </div>
                    <button
                      onClick={() => setPrintReport(selected)}
                      className="flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-indigo-950 px-4 py-2 text-xs font-black transition shadow-sm"
                    >
                      <Printer size={16} /> طباعة رسمية / PDF
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
                      ['حالة التقرير', selected.status === 'completed' ? 'مكتمل ومعتمد ✓' : 'قيد المراجعة'],
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
                      {isAnswersReport ? 'نوع التقرير' : 'التحليل التعليمي المعتمد'}
                    </p>
                    <h3 className={`mt-2 text-xl font-black ${isAnswersReport ? 'text-slate-950' : 'text-rose-950'}`}>{clinicalLabel}</h3>
                    <p className={`mt-3 text-sm font-bold leading-7 ${isAnswersReport ? 'text-slate-700' : 'text-rose-900'}`}>{cleanReportText(selected.summary)}</p>
                  </div>
                  {!isAnswersReport ? (
                    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-5">
                      <p className="text-xs font-black text-indigo-700">المسار العلاجي الموصى به</p>
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
                          ? `المسار المعتمد حالياً: ${curriculumPrograms.find((program) => program.slug === selectedStudent.assignedProgram)?.shortTitle ?? selectedStudent.assignedProgram}`
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

                <ReportSection number="1" title="تحليل نقاط القوة والاحتياج">
                  <div className="grid gap-3 md:grid-cols-2">
                    {selected.domains.map((domain) => (
                      <MetricBar key={domain.name} title={domain.name} value={domain.score} note={domain.note} />
                    ))}
                  </div>
                </ReportSection>

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
                            <td className="p-3 font-bold text-slate-700">دقة 80% في قياسين متتاليين</td>
                            <td className="p-3 font-bold text-slate-600">{getPlanMonth(index)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ReportSection>

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

                <ReportSection number="5" title="توصيات المنزل والمدرسة">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <RecommendationBox title="توصيات المنزل" items={homeRecommendations} tone="home" />
                    <RecommendationBox title="توصيات المدرسة" items={schoolRecommendations} tone="school" />
                  </div>
                </ReportSection>

                <ReportSection number="6" title="الإجابات التفصيلية المحفوظة">
                  <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-4 print:max-h-none print:overflow-visible">
                    {selected.answers.map((answer, index) => (
                      <article key={`${answer.question}-${index}`} className="rounded-xl bg-white p-3.5 border border-slate-200 shadow-sm print:break-inside-avoid">
                        <p className="text-xs font-black leading-6 text-slate-500">سؤال {index + 1}: {answer.question}</p>
                        <p className="mt-1 text-sm font-black leading-7 text-slate-950">{answer.answer}</p>
                      </article>
                    ))}
                  </div>
                </ReportSection>

                <footer className="mt-8 grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-[1fr_180px]">
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-500">يعتمد هذا التقرير رسمياً من:</p>
                    <h3 className="mt-3 text-2xl font-black text-indigo-950">د. إسماعيل عيسى</h3>
                    <p className="mt-1 font-bold text-slate-600">استشاري التربية الخاصة وتأهيل صعوبات التعلم</p>
                    <div className="mt-4 h-px w-56 bg-slate-300" />
                    <p className="mt-2 text-xs font-bold text-slate-400">التوقيع المعتمد</p>
                  </div>
                  <div className="rounded-lg border-2 border-dashed border-indigo-400 p-4 text-center">
                    <BrandMark size="lg" showText={false} />
                    <p className="mt-2 text-xs font-black text-slate-700">الختم الرقمي المعتمد</p>
                    <p className="mt-1 text-xs font-bold text-indigo-700">{fileNumber}</p>
                  </div>
                </footer>

                <div className="no-print mt-6 flex flex-col gap-3 sm:flex-row">
                  <button onClick={() => window.print()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-950 px-5 py-3 text-sm font-black text-white">
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

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-teal-800">التقارير الشاملة</p>
                <h1 className="mt-2 text-3xl font-black text-slate-950">عرض وطباعة تقارير التقييم</h1>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-600">نفس فلاتر وتقارير النظام الأصلية، بتصميم أوضح للموبايل والديسكتوب.</p>
              </div>
              <Link href="/student/new" className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800">إنشاء تقرير جديد</Link>
            </div>
          </header>

          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {filters.map((item) => (
              <button key={item} onClick={() => setFilter(item)} className={`shrink-0 rounded-lg border px-5 py-3 text-sm font-black transition ${filter === item ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                {item === 'all' ? 'الكل' : item}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-slate-100 text-slate-600">
                <FilePlus2 size={26} />
              </div>
              <h2 className="mt-4 text-2xl font-black text-slate-950">لا توجد تقارير محفوظة بعد</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-slate-600">
                لن تظهر أي أسماء أو نتائج وهمية هنا. أنشئ طالبًا أو استبيانًا، وبعد الحفظ سيظهر التقرير الحقيقي في هذه القائمة.
              </p>
              <Link href="/student/new" className="mt-5 inline-flex rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white hover:bg-teal-800">
                إضافة طالب وتقرير
              </Link>
            </section>
          ) : (
            <section className="grid gap-4 md:grid-cols-2">
              {filtered.map((report) => {
              const decision = getDecisionFromScore(report.score);

              return (
                <article key={report.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="h-2" style={{ backgroundColor: report.programColor }} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-black text-slate-950">{report.studentName}</h2>
                        <p className="mt-1 text-sm font-bold text-slate-500">{report.grade} · {report.date}</p>
                      </div>
                      <p className="text-3xl font-black" style={{ color: getScoreColor(report.score) }}>{report.score}%</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="inline-block rounded-full px-3 py-1 text-xs font-black text-white" style={{ backgroundColor: report.programColor }}>{cleanReportText(report.program)}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{decision.label}</span>
                    </div>
                    <p className="mt-4 line-clamp-2 text-sm font-bold leading-7 text-slate-600">{cleanReportText(report.summary)}</p>
                    <div className="mt-5 flex gap-3">
                      <button onClick={() => setSelectedId(report.id)} className="flex-1 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800">عرض التقرير الكامل</button>
                      <button onClick={() => window.print()} className="no-print rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-700"><Printer size={17} /></button>
                      <button
                        onClick={() => {
                          deleteReport(report.id);
                          setReports(getReports());
                        }}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700"
                        title="حذف التقرير"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                </article>
              );
              })}
            </section>
          )}
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

function getPlanMonth(index: number) {
  return ['سبتمبر 2026', 'أكتوبر 2026', 'نوفمبر 2026', 'ديسمبر 2026'][index] ?? 'ديسمبر 2026';
}

function getReportPrintTitle(report: ReportRecord) {
  if (report.type === 'survey-answers') return 'تقرير إجابات ولي الأمر التفصيلية';
  if (report.type === 'student-assessment-answers') return 'تقرير إجابات اختبار الطالب التفصيلية';
  return 'التقرير التحليلي وخطة التدخل';
}

function cleanReportText(value: string) {
  return value
    .replaceAll('التحليل الإكلينيكي الشامل', 'التقرير التحليلي الشامل')
    .replaceAll('الإكلينيكية', 'التخصصية')
    .replaceAll('إكلينيكي', 'تعليمي علاجي')
    .replaceAll('السريري', 'التعليمي العلاجي')
    .replaceAll('سريري', 'تعليمي علاجي')
    .replaceAll('طبي', 'تعليمي');
}
