'use client';

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowRight, FilePlus2, Printer, Trash2 } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import PrintableReportModal from '@/components/PrintableReportModal';
import ReportPrintDocument from '@/components/ReportPrintDocument';
import { getDecisionFromScore } from '@/data/assessmentModel';
import { deleteReport, getReports, getSession, getStudents, hydrateSessionFromServer, ReportRecord, StudentRecord } from '@/lib/cloudStore';
import { trackEvent } from '@/lib/analyticsTracker';
import { pullCloudDataToLocal, subscribeToCloudUpdates } from '@/lib/firestoreSync';

const REPORTS_SYNC_KEYS = ['students', 'reports', 'surveys'] as const;

function forcePageTopScroll() {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [printReport, setPrintReport] = useState<ReportRecord | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const parentMode = searchParams.get('mode') === 'parent';
  const reportTopRef = useRef<HTMLDivElement | null>(null);

  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previousRestoration;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const session = getSession() ?? await hydrateSessionFromServer();
      if (cancelled) return;
      if (!session) {
        router.replace('/login');
        return;
      }

      const reportId = searchParams.get('report');
      const isParentOrStudent = session.role === 'parent' || session.role === 'student';

      // If parent/student tries to access general reports dashboard without a specific report ID, redirect to portal
      if (isParentOrStudent && !reportId && !parentMode) {
        router.replace(session.role === 'parent' ? '/parent' : '/school-student');
        return;
      }

      // If user is neither doctor/specialist nor a parent/student viewing a report
      if (session.role !== 'doctor' && session.role !== 'specialist' && !isParentOrStudent) {
        router.replace('/login');
        return;
      }

      const rawReports = getReports();
      const nextReports = Array.isArray(rawReports) ? rawReports.filter(Boolean) : [];
      setReports(nextReports);
      const rawStudents = getStudents();
      setStudents(Array.isArray(rawStudents) ? rawStudents.filter(Boolean) : []);

      if (reportId && nextReports.some((report) => report && report.id === reportId)) {
        setSelectedId(reportId);
      }
    };

    (async () => {
      const session = getSession() ?? await hydrateSessionFromServer();
      if (cancelled) return;
      if (session) trackEvent('visit', { userId: session.id, userName: session.name, userRole: session.role, page: '/reports' });
      await load();
    })();
    pullCloudDataToLocal([...REPORTS_SYNC_KEYS]).then(() => {
      if (!cancelled) void load();
    }).catch(() => {});
    const unsubscribe = subscribeToCloudUpdates(() => void load(), [...REPORTS_SYNC_KEYS]);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [searchParams, router]);

  const selected = reports.find((report) => report && report.id === selectedId);
  const selectedStudent = selected ? students.find((student) => student && (student.id === selected.studentId || student.fullName === selected.studentName)) : null;
  const printStudent = printReport ? students.find((student) => student && (student.id === printReport.studentId || student.fullName === printReport.studentName)) : null;

  useLayoutEffect(() => {
    if (!selectedId) return;
    forcePageTopScroll();
    reportTopRef.current?.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'auto' });
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    forcePageTopScroll();
    const raf = window.requestAnimationFrame(forcePageTopScroll);
    const timers = [50, 180, 420].map((delay) => window.setTimeout(forcePageTopScroll, delay));
    return () => {
      window.cancelAnimationFrame(raf);
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [selectedId, selected?.id]);

  const getScoreColor = (score: number = 0) => {
    if (score >= 75) return '#15803d';
    if (score >= 50) return '#b7791f';
    return '#b91c1c';
  };

  if (selected) {
    const removeSelectedReport = () => {
      deleteReport(selected.id);
      setReports(getReports());
      setSelectedId(null);
    };

    return (
      <div className="min-h-screen bg-[var(--background)] text-slate-950">
        <div ref={reportTopRef} aria-hidden="true" className="h-0 w-0" />
        {!parentMode && <div className="no-print"><Navbar /></div>}
        <div className="flex">
          {!parentMode && <div className="no-print"><Sidebar desktopOnly /></div>}
          <main className={`min-w-0 flex-1 px-4 py-6 print:p-0 lg:px-8 ${parentMode ? 'mx-auto max-w-5xl' : ''}`}>
            {/* Top Action Toolbar (Above Report Frame) */}
            <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-4">
              {parentMode ? (
                <button
                  type="button"
                  onClick={() => router.push(selectedStudent?.schoolBranch === 'IKHLAS_JEDDAH' ? '/school-parent' : '/parent')}
                  className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-5 py-3 text-sm font-black text-teal-800 hover:bg-teal-100 transition shadow-xs cursor-pointer"
                >
                  <ArrowRight size={18} />
                  <span>العودة إلى بوابة ولي الأمر</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 transition shadow-xs cursor-pointer"
                >
                  <ArrowRight size={18} />
                  <span>العودة إلى التقارير</span>
                </button>
              )}

              <div className="flex items-center gap-3 mr-auto flex-wrap">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-indigo-950 px-6 py-3.5 text-base font-black transition-all shadow-md hover:shadow-lg ring-2 ring-amber-500/40 cursor-pointer"
                >
                  <Printer size={20} className="text-indigo-950 stroke-[2.5]" />
                  <span>طباعة التقرير الرقمي / PDF</span>
                </button>

                {!parentMode && (
                  <button
                    type="button"
                    onClick={removeSelectedReport}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-black text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                  >
                    <Trash2 size={17} />
                    <span>حذف التقرير</span>
                  </button>
                )}
              </div>
            </div>

            <ReportPrintDocument report={selected} student={selectedStudent} />

          </main>
        </div>
        {printReport && <PrintableReportModal report={printReport} student={printStudent} onClose={() => setPrintReport(null)} />}
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
                              onClick={() => {
                                forcePageTopScroll();
                                setSelectedId(report.id);
                              }}
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
      {printReport && <PrintableReportModal report={printReport} student={printStudent} onClose={() => setPrintReport(null)} />}
    </div>
  );
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
