'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, FilePlus2, Printer, Trash2, UserRound, ShieldCheck, CheckCircle2 } from 'lucide-react';
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

/* ─── helpers ─── */
function cleanReportText(value: string) {
  return value
    .replaceAll('التحليل الإكلينيكي الشامل', 'التقرير التحليلي الشامل')
    .replaceAll('الإكلينيكية', 'التخصصية')
    .replaceAll('إكلينيكي', 'تعليمي علاجي')
    .replaceAll('السريري', 'التعليمي العلاجي')
    .replaceAll('سريري', 'تعليمي علاجي')
    .replaceAll('طبي', 'تعليمي');
}

function getScoreColor(score: number) {
  if (score >= 75) return '#15803d';
  if (score >= 50) return '#b7791f';
  return '#b91c1c';
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
  if (report.type === 'parent-teacher') return 'تقرير ولي الأمر والمعلم';
  return 'التقرير التحليلي الشامل — د. إسماعيل عيسى';
}

function getReportTypeLabel(type: string) {
  if (type === 'survey-answers') return { label: 'إجابات الاستبيان', color: '#0369a1', bg: '#e0f2fe', icon: '📝' };
  if (type === 'student-assessment-answers') return { label: 'إجابات اختبار الطالب', color: '#7c3aed', bg: '#ede9fe', icon: '📋' };
  if (type === 'parent-teacher') return { label: 'تقرير ولي الأمر والمعلم', color: '#b45309', bg: '#fef3c7', icon: '👨‍👩‍👧' };
  return { label: 'تحليل شامل — دكتور', color: '#166534', bg: '#dcfce7', icon: '🔬' };
}

/* ─── Dual Seals Footer ─── */
function DualSealsFooter({ fileNumber }: { fileNumber: string }) {
  const year = new Date().getFullYear();
  const today = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="mt-8 border-t-2 border-slate-200 pt-6" dir="rtl">
      {/* Verification strip */}
      <div className="mb-5 flex items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-5 py-3">
        <ShieldCheck size={16} className="text-teal-600 shrink-0" />
        <p className="text-xs font-black text-teal-800">
          هذا التقرير معتمد ومختوم إلكترونياً من منصتَي <strong>مسار</strong> و<strong>نيكسس</strong> التعليميتين
        </p>
        <ShieldCheck size={16} className="text-teal-600 shrink-0" />
      </div>

      {/* 3-col: Masar seal | Doctor signature | Nexus seal */}
      <div className="grid grid-cols-3 items-end gap-4">

        {/* Masar Seal */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="flex flex-col items-center justify-center"
            style={{
              width: 100, height: 100, borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 32%, #34d399, #0d7d62)',
              border: '3px solid #0d7d62',
              boxShadow: '0 0 0 2px white, 0 0 0 4px #0d7d6250, 0 6px 18px #0d7d6230',
              position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', width: 86, height: 86, borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,0.4)' }} />
            <span className="text-xl font-black text-white" style={{ fontSize: 16, letterSpacing: 1 }}>مسار</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 600 }}>{year}</span>
          </div>
          <span className="text-[10px] font-bold text-teal-700">ختم منصة مسار</span>
          <span className="rounded-full bg-teal-50 border border-teal-200 px-2 py-0.5 text-[9px] font-bold text-teal-600">✓ معتمد إلكترونياً</span>
        </div>

        {/* Doctor Signature */}
        <div className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-[10px] font-black text-slate-500">توقيع واعتماد</p>
          <div className="flex w-full items-end justify-center border-b-2 border-indigo-950 pb-1" style={{ height: 44 }}>
            <span className="font-serif text-sm italic font-bold text-indigo-950">د. إسماعيل عيسى</span>
          </div>
          <p className="text-sm font-black text-indigo-950">د. إسماعيل عيسى</p>
          <p className="text-[9px] font-bold text-slate-500 text-center">استشاري التعليم العلاجي وصعوبات التعلم</p>
          <p className="rounded-full bg-white border border-slate-200 px-3 py-0.5 text-[9px] font-bold text-slate-500">{fileNumber}</p>
          <p className="text-[9px] text-slate-400">{today}</p>
        </div>

        {/* Nexus Seal */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="flex flex-col items-center justify-center"
            style={{
              width: 100, height: 100, borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 32%, #60a5fa, #1e3a5f)',
              border: '3px solid #1e3a5f',
              boxShadow: '0 0 0 2px white, 0 0 0 4px #1e3a5f50, 0 6px 18px #1e3a5f30',
              position: 'relative',
            }}
          >
            <div style={{ position: 'absolute', width: 86, height: 86, borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,0.4)' }} />
            <span className="text-xl font-black text-white" style={{ fontSize: 14, letterSpacing: 1 }}>نيكسس</span>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: 600 }}>{year}</span>
          </div>
          <span className="text-[10px] font-bold text-blue-800">ختم منصة نيكسس</span>
          <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[9px] font-bold text-blue-700">✓ معتمد إلكترونياً</span>
        </div>
      </div>

      {/* Legal line */}
      <p className="mt-4 text-center text-[9px] font-bold text-slate-400 border-t border-slate-100 pt-3">
        هذا المستند صادر إلكترونياً ولا يحتاج إلى توقيع يدوي — Masar &amp; Nexus Platforms © {year}
      </p>
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
          <li key={item} className="flex items-start gap-2">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 opacity-70" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   REPORT TYPE: إجابات ولي الأمر  /  إجابات اختبار الطالب
══════════════════════════════════════════════════════════ */
function AnswersReportView({ report, fileNumber }: { report: ReportRecord; fileNumber: string }) {
  const isSurvey = report.type === 'survey-answers';
  const accentColor = isSurvey ? 'bg-sky-700' : 'bg-violet-700';
  const accentBorder = isSurvey ? 'border-sky-700' : 'border-violet-700';
  const title = isSurvey ? 'تقرير إجابات استبيان ولي الأمر التفصيلية' : 'تقرير إجابات اختبار الطالب التفصيلية';
  const icon = isSurvey ? '📝' : '📋';
  const who = isSurvey ? 'ولي الأمر' : 'الطالب';

  return (
    <div className="space-y-6">
      {/* Who filled it */}
      <div className={`rounded-xl border-r-4 ${accentBorder} bg-slate-50 p-5`}>
        <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-1">نوع التقرير</p>
        <h3 className="text-lg font-black text-slate-950">{title}</h3>
        <p className="mt-2 text-sm font-bold text-slate-600">
          {isSurvey
            ? 'هذا التقرير يعرض إجابات ولي الأمر على استبيان التقييم سؤالاً بسؤال. يُستخدم من قِبَل الدكتور لفهم بيئة الطالب المنزلية واحتياجاته.'
            : 'هذا التقرير يعرض إجابات الطالب على اختبار التقييم سؤالاً بسؤال. يُستخدم من قِبَل الدكتور لتحليل الأداء الفعلي في الجلسة.'}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black text-white ${accentColor}`}>
            {icon} مجاب من قِبَل: {who}
          </span>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">
            نسبة الاكتمال: {report.score}%
          </span>
        </div>
      </div>

      {/* Answers */}
      <ReportSection number="1" title={`إجابات ${who} التفصيلية`}>
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {report.answers.length === 0 ? (
            <p className="text-center text-sm font-bold text-slate-500 py-6">لا توجد إجابات مسجلة بعد.</p>
          ) : report.answers.map((answer, index) => (
            <article key={`${answer.question}-${index}`} className="rounded-xl bg-white p-4 border border-slate-200 shadow-sm">
              <p className="text-xs font-black leading-6 text-slate-400">
                سؤال {index + 1}
              </p>
              <p className="text-sm font-black text-slate-600 mb-2">{answer.question}</p>
              <div className={`rounded-lg border-r-4 ${accentBorder} bg-slate-50 px-4 py-2`}>
                <p className="text-sm font-black text-slate-950">{answer.answer}</p>
              </div>
            </article>
          ))}
        </div>
      </ReportSection>

      {/* Domain summary if available */}
      {report.domains && report.domains.length > 0 && (
        <ReportSection number="2" title="ملخص المجالات المُقيَّمة">
          <div className="grid gap-3 md:grid-cols-2">
            {report.domains.map((domain) => (
              <MetricBar key={domain.name} title={domain.name} value={domain.score} note={domain.note} />
            ))}
          </div>
        </ReportSection>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   REPORT TYPE: تقرير ولي الأمر والمعلم (مبسَّط)
══════════════════════════════════════════════════════════ */
function ParentTeacherReportView({ report }: { report: ReportRecord }) {
  const sortedDomains = [...report.domains].sort((a, b) => b.score - a.score);
  const strengthDomains = sortedDomains.slice(0, 2);
  const supportDomains = [...report.domains].sort((a, b) => a.score - b.score).filter((d) => d.score < 70);
  const homeRecommendations = report.recommendations.slice(0, 3);
  const schoolRecommendations = report.recommendations.slice(3, 6).length ? report.recommendations.slice(3, 6) : report.recommendations.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <p className="text-xs font-black text-amber-700 uppercase tracking-wider mb-1">موجَّه لـ</p>
        <h3 className="text-lg font-black text-amber-950">ولي الأمر والمعلم المسؤول</h3>
        <p className="mt-2 text-sm font-bold text-amber-900 leading-7">
          هذا التقرير مصمَّم بلغة واضحة ومبسطة لمساعدة ولي الأمر والمعلم على فهم احتياجات الطالب وكيفية دعمه في المنزل والمدرسة.
        </p>
      </div>

      {/* Score summary */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">ملخص الأداء العام</p>
        <div className="flex items-center gap-4">
          <div
            className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border-4"
            style={{
              borderColor: report.score >= 75 ? '#15803d' : report.score >= 50 ? '#b7791f' : '#b91c1c',
              color: report.score >= 75 ? '#15803d' : report.score >= 50 ? '#b7791f' : '#b91c1c',
            }}
          >
            <span className="text-2xl font-black">{report.score}%</span>
          </div>
          <div>
            <p className="font-black text-slate-950 text-lg">
              {report.score >= 75 ? '✅ أداء جيد ومستقر' : report.score >= 50 ? '⚠️ يحتاج دعماً إضافياً' : '🔴 يحتاج تدخلاً علاجياً عاجلاً'}
            </p>
            <p className="text-sm font-bold text-slate-600 mt-1 leading-7">{cleanReportText(report.summary)}</p>
          </div>
        </div>
      </div>

      {/* Strengths & Support */}
      <ReportSection number="1" title="نقاط القوة والاحتياج">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="font-black text-emerald-950 mb-3">✅ ما يُجيده طفلك</h3>
            <ul className="space-y-2 text-sm font-bold text-emerald-900">
              {strengthDomains.map((d) => (
                <li key={d.name} className="flex justify-between">
                  <span>{d.name}</span>
                  <span className="font-black">{d.score}%</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="font-black text-amber-950 mb-3">⚠️ يحتاج تقوية في</h3>
            <ul className="space-y-2 text-sm font-bold text-amber-900">
              {(supportDomains.length ? supportDomains : sortedDomains.slice(-2)).map((d) => (
                <li key={d.name} className="flex justify-between">
                  <span>{d.name}</span>
                  <span className="font-black">{d.score}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ReportSection>

      {/* Recommendations */}
      <ReportSection number="2" title="كيف تساعد طفلك؟">
        <div className="grid gap-4 md:grid-cols-2">
          <RecommendationBox title="🏠 في المنزل" items={homeRecommendations} tone="home" />
          <RecommendationBox title="🏫 في المدرسة" items={schoolRecommendations} tone="school" />
        </div>
      </ReportSection>

      {/* Next steps */}
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
        <h3 className="font-black text-indigo-950 mb-3">📅 الخطوات القادمة</h3>
        <ul className="space-y-2 text-sm font-bold text-indigo-900">
          <li className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0" /> متابعة التقدم مع الأخصائي كل شهر</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0" /> تطبيق التوصيات المنزلية بشكل يومي لمدة 15 دقيقة</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0" /> التواصل مع معلم الفصل لإخباره باحتياجات الطالب</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0" /> المراجعة الدورية القادمة بعد 4 أسابيع</li>
        </ul>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   REPORT TYPE: التحليل الشامل — دكتور إسماعيل (الأصلي)
══════════════════════════════════════════════════════════ */
function DoctorFullReportView({ report, selectedStudent, onAssignProgram, assignMessage }: {
  report: ReportRecord;
  selectedStudent: StudentRecord | undefined;
  onAssignProgram: (slug: string) => void;
  assignMessage: string;
}) {
  const decision = getDecisionFromScore(report.score);
  const sortedDomains = [...report.domains].sort((a, b) => a.score - b.score);
  const supportDomains = sortedDomains.filter((d) => d.score < 70);
  const strengthDomains = [...report.domains].sort((a, b) => b.score - a.score).slice(0, 2);
  const iepRows = (supportDomains.length ? supportDomains : sortedDomains).slice(0, 4);
  const homeRecommendations = report.recommendations.slice(0, 3);
  const schoolRecommendations = report.recommendations.slice(3, 6).length ? report.recommendations.slice(3, 6) : report.recommendations.slice(0, 3);
  const clinicalLabel =
    report.score >= 85 ? 'مؤشرات تعلم مستقرة مع احتياج متابعة دورية'
    : report.score >= 70 ? 'صعوبات تعلم نمائية وأكاديمية خفيفة إلى متوسطة'
    : report.score >= 50 ? 'صعوبات تعلم متوسطة تحتاج تدخلاً علاجياً منظماً'
    : 'صعوبات تعلم مرتفعة تحتاج إعادة تدريس وتشخيصاً دقيقاً';

  return (
    <div className="space-y-0">
      {/* Clinical Analysis */}
      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-5">
          <p className="text-xs font-black text-rose-700">التحليل التعليمي المعتمد</p>
          <h3 className="mt-2 text-xl font-black text-rose-950">{clinicalLabel}</h3>
          <p className="mt-3 text-sm font-bold leading-7 text-rose-900">{cleanReportText(report.summary)}</p>
        </div>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-5">
          <p className="text-xs font-black text-indigo-700">المسار العلاجي الموصى به</p>
          <h3 className="mt-2 text-xl font-black text-indigo-950">{decision.label}</h3>
          <p className="mt-3 text-sm font-bold leading-7 text-indigo-900">{decision.action}</p>
          <span className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-black text-indigo-900 ring-1 ring-indigo-200">{decision.range}</span>
        </div>
      </section>

      {/* Program Approval */}
      <section className="mt-5 rounded-lg border border-teal-200 bg-teal-50 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black text-teal-800">قرار د. إسماعيل — اعتماد المسار</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">
              {selectedStudent?.assignedProgram
                ? `المسار المعتمد: ${curriculumPrograms.find((p) => p.slug === selectedStudent.assignedProgram)?.shortTitle ?? selectedStudent.assignedProgram}`
                : 'لم يتم اعتماد مسار علاجي بعد'}
            </h3>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-700">
              الطالب يرى الألعاب ورسائل التشجيع فقط. المنهج لا يظهر له إلا بعد اختيار المسار.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {curriculumPrograms.map((program) => (
              <button
                key={program.slug}
                onClick={() => onAssignProgram(program.slug)}
                disabled={!selectedStudent}
                className="rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-800 ring-1 ring-teal-100 hover:bg-teal-100 disabled:opacity-40"
              >
                {program.shortTitle}
              </button>
            ))}
          </div>
        </div>
        {assignMessage && <p className="mt-4 rounded-lg bg-white p-3 text-sm font-black text-teal-900 ring-1 ring-teal-100">{assignMessage}</p>}
      </section>

      <ReportSection number="1" title="تحليل نقاط القوة والاحتياج">
        <div className="grid gap-3 md:grid-cols-2">
          {report.domains.map((domain) => (
            <MetricBar key={domain.name} title={domain.name} value={domain.score} note={domain.note} />
          ))}
        </div>
      </ReportSection>

      <ReportSection number="2" title="ملخص القوة والصعوبات">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="font-black text-emerald-950">نقاط القوة</h3>
            <ul className="mt-3 space-y-2 text-sm font-bold leading-7 text-emerald-900">
              {strengthDomains.map((d) => <li key={d.name}>— {d.name}: {d.score}%</li>)}
            </ul>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <h3 className="font-black text-amber-950">صعوبات تحتاج تدخل</h3>
            <ul className="mt-3 space-y-2 text-sm font-bold leading-7 text-amber-900">
              {(supportDomains.length ? supportDomains : sortedDomains.slice(0, 2)).map((d) => <li key={d.name}>— {d.name}: {d.score}%</li>)}
            </ul>
          </div>
        </div>
      </ReportSection>

      <ReportSection number="3" title="أهداف خطة التربية الفردية IEP">
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
        <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          {report.answers.map((answer, index) => (
            <article key={`${answer.question}-${index}`} className="rounded-xl bg-white p-3.5 border border-slate-200 shadow-sm print:break-inside-avoid">
              <p className="text-xs font-black leading-6 text-slate-500">سؤال {index + 1}: {answer.question}</p>
              <p className="mt-1 text-sm font-black leading-7 text-slate-950">{answer.answer}</p>
            </article>
          ))}
        </div>
      </ReportSection>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SELECTED REPORT FULL PAGE
══════════════════════════════════════════════════════════ */
function SelectedReportPage({
  selected, selectedStudent, parentMode, onBack, onPrint, onDelete, onAssignProgram, assignMessage,
}: {
  selected: ReportRecord; selectedStudent: StudentRecord | undefined; parentMode: boolean;
  onBack: () => void; onPrint: () => void; onDelete: () => void;
  onAssignProgram: (slug: string) => void; assignMessage: string;
}) {
  const isAnswersReport = selected.type === 'survey-answers' || selected.type === 'student-assessment-answers';
  const isParentTeacher = selected.type === 'parent-teacher';
  const fileNumber = `MASAR-${selected.id.slice(-6).toUpperCase()}`;
  const typeInfo = getReportTypeLabel(selected.type);

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      {!parentMode && <Navbar />}
      <div className="flex">
        {!parentMode && <Sidebar desktopOnly />}
        <main className={`min-w-0 flex-1 px-4 py-6 lg:px-8 ${parentMode ? 'mx-auto max-w-5xl' : ''}`}>
          {!parentMode && (
            <button onClick={onBack} className="no-print mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 transition-colors">
              <ArrowRight size={17} />
              العودة إلى التقارير
            </button>
          )}

          <article id="printable-area" className="clinical-report overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="p-5 md:p-8">

              {/* ══ REPORT IDENTITY HEADER (original style, enhanced) ══ */}
              <header className="border-b-4 border-indigo-950 pb-6">
                <div className="flex items-center justify-between gap-4">
                  {/* File number */}
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
                <div className="mt-5 rounded-xl bg-gradient-to-l from-indigo-950 to-blue-800 px-6 py-4 text-white flex items-center justify-between gap-4 flex-wrap">
                  <div className="text-right">
                    <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest mb-1">وثيقة تعليمية علاجية معتمدة · OFFICIAL ASSESSMENT REPORT</p>
                    <h2 className="text-xl font-black">{getReportPrintTitle(selected)}</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Report type badge */}
                    <span className="rounded-full px-4 py-1.5 text-xs font-black" style={{ background: typeInfo.bg, color: typeInfo.color }}>
                      {typeInfo.icon} {typeInfo.label}
                    </span>
                    <button
                      onClick={onPrint}
                      className="no-print flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-indigo-950 px-4 py-2 text-xs font-black transition shadow-sm"
                    >
                      <Printer size={16} /> طباعة رسمية / PDF
                    </button>
                  </div>
                </div>
              </header>

              {/* ══ STUDENT INFO GRID ══ */}
              <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-3 text-xs font-black text-slate-500 uppercase tracking-wider text-center">بيانات الطالب والتقرير</p>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="md:row-span-2 grid place-items-center rounded-xl border-2 border-indigo-100 bg-white p-4 text-center">
                    {selectedStudent?.photoUrl ? (
                      <span role="img" aria-label={selectedStudent.fullName} className="h-24 w-24 rounded-xl bg-cover bg-center ring-2 ring-indigo-200" style={{ backgroundImage: `url(${selectedStudent.photoUrl})` }} />
                    ) : (
                      <span className="grid h-24 w-24 place-items-center rounded-xl bg-indigo-50 text-indigo-400 border-2 border-indigo-100">
                        <UserRound size={40} />
                      </span>
                    )}
                    <p className="mt-2 text-xs font-black text-indigo-700">صورة الطالب</p>
                  </div>
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

              {/* ══ DYNAMIC REPORT BODY based on type ══ */}
              {isAnswersReport ? (
                <AnswersReportView report={selected} fileNumber={fileNumber} />
              ) : isParentTeacher ? (
                <ParentTeacherReportView report={selected} />
              ) : (
                <DoctorFullReportView
                  report={selected}
                  selectedStudent={selectedStudent}
                  onAssignProgram={onAssignProgram}
                  assignMessage={assignMessage}
                />
              )}

              {/* ══ DUAL SEALS FOOTER (all report types) ══ */}
              <DualSealsFooter fileNumber={fileNumber} />

              {/* Actions */}
              <div className="no-print mt-6 flex flex-col gap-3 sm:flex-row">
                <button onClick={onPrint} className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-950 px-5 py-3 text-sm font-black text-white hover:bg-indigo-900 transition-colors">
                  <Printer size={17} /> طباعة PDF
                </button>
                {!parentMode && (
                  <button onClick={onDelete} className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-black text-rose-800 hover:bg-rose-100 transition-colors">
                    <Trash2 size={17} /> حذف التقرير
                  </button>
                )}
              </div>

            </div>
          </article>
        </main>
      </div>

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #printable-area, #printable-area * { visibility: visible !important; }
          #printable-area {
            position: fixed !important; inset: 0 !important;
            width: 100% !important; padding: 14mm 16mm !important;
            background: white !important; overflow: visible !important;
            box-shadow: none !important; border-radius: 0 !important; border: none !important;
          }
          @page { size: A4 portrait; margin: 10mm 12mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          table { page-break-inside: avoid !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   REPORTS LIST PAGE
══════════════════════════════════════════════════════════ */
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
      if (reportId && nextReports.some((r) => r.id === reportId)) setSelectedId(reportId);
    });
  }, [searchParams]);

  const filtered = useMemo(
    () => filter === 'all' ? reports : reports.filter((r) => r.program.includes(filter) || (filter === 'التقرير التحليلي' && ['clinical-analysis', 'student-assessment-analysis'].includes(r.type))),
    [filter, reports],
  );

  const selected = reports.find((r) => r.id === selectedId);
  const selectedStudent = selected ? students.find((s) => s.id === selected.studentId || s.fullName === selected.studentName) : null;

  const handleAssignProgram = (slug: string) => {
    if (!selectedStudent) return;
    const program = curriculumPrograms.find((p) => p.slug === slug);
    const currentList = selectedStudent.assignedPrograms || (selectedStudent.assignedProgram ? [selectedStudent.assignedProgram] : []);
    updateStudent(selectedStudent.id, {
      assignedProgram: slug,
      assignedPrograms: Array.from(new Set([...currentList, slug])),
      assignedBy: 'د. إسماعيل عيسى',
      assignedAt: new Date().toISOString(),
      reviewStatus: 'program-assigned',
    });
    setStudents(getStudents());
    setAssignMessage(`تم اعتماد ${program?.shortTitle ?? 'المسار'} للطالب ${selectedStudent.fullName}.`);
  };

  if (selected) {
    return (
      <>
        <SelectedReportPage
          selected={selected}
          selectedStudent={selectedStudent ?? undefined}
          parentMode={parentMode}
          onBack={() => setSelectedId(null)}
          onPrint={() => setPrintReport(selected)}
          onDelete={() => { deleteReport(selected.id); setReports(getReports()); setSelectedId(null); }}
          onAssignProgram={handleAssignProgram}
          assignMessage={assignMessage}
        />
        {printReport && <PrintableReportModal report={printReport} onClose={() => setPrintReport(null)} />}
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">

          {/* Header */}
          <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black text-teal-800">التقارير الشاملة</p>
                <h1 className="mt-2 text-3xl font-black text-slate-950">عرض وطباعة تقارير التقييم</h1>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                  أربعة أنواع من التقارير: إجابات الاستبيان · إجابات الاختبار · التحليل الكامل للدكتور · تقرير ولي الأمر والمعلم
                </p>
              </div>
              <div className="flex gap-3">
                <Link href="/reports/preview" className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-100 transition-colors">
                  🖨️ بروفة التقارير
                </Link>
                <Link href="/student/new" className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 transition-colors">
                  إنشاء تقرير جديد
                </Link>
              </div>
            </div>

            {/* Report type legend */}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {[
                { label: 'إجابات الاستبيان', color: '#0369a1', bg: '#e0f2fe', icon: '📝' },
                { label: 'إجابات اختبار الطالب', color: '#7c3aed', bg: '#ede9fe', icon: '📋' },
                { label: 'التحليل الكامل — للدكتور', color: '#166534', bg: '#dcfce7', icon: '🔬' },
                { label: 'تقرير ولي الأمر والمعلم', color: '#b45309', bg: '#fef3c7', icon: '👨‍👩‍👧' },
              ].map((t) => (
                <span key={t.label} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black" style={{ background: t.bg, color: t.color }}>
                  {t.icon} {t.label}
                </span>
              ))}
            </div>
          </header>

          {/* Filters */}
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {filters.map((item) => (
              <button key={item} onClick={() => setFilter(item)} className={`shrink-0 rounded-lg border px-5 py-3 text-sm font-black transition ${filter === item ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                {item === 'all' ? 'الكل' : item}
              </button>
            ))}
          </div>

          {/* Empty State */}
          {filtered.length === 0 ? (
            <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-lg bg-slate-100 text-slate-600">
                <FilePlus2 size={26} />
              </div>
              <h2 className="mt-4 text-2xl font-black text-slate-950">لا توجد تقارير محفوظة بعد</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-7 text-slate-600">
                لن تظهر أي أسماء أو نتائج وهمية هنا. أنشئ طالباً أو استبياناً، وبعد الحفظ سيظهر التقرير الحقيقي في هذه القائمة.
              </p>
              <Link href="/student/new" className="mt-5 inline-flex rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white hover:bg-teal-800">
                إضافة طالب وتقرير
              </Link>
            </section>
          ) : (
            <section className="grid gap-4 md:grid-cols-2">
              {filtered.map((report) => {
                const decision = getDecisionFromScore(report.score);
                const typeInfo = getReportTypeLabel(report.type);
                return (
                  <article key={report.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow">
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
                        {/* Report type badge */}
                        <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black" style={{ background: typeInfo.bg, color: typeInfo.color }}>
                          {typeInfo.icon} {typeInfo.label}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{decision.label}</span>
                      </div>
                      <p className="mt-4 line-clamp-2 text-sm font-bold leading-7 text-slate-600">{cleanReportText(report.summary)}</p>
                      <div className="mt-5 flex gap-3">
                        <button onClick={() => setSelectedId(report.id)} className="flex-1 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white hover:bg-slate-800 transition-colors">
                          عرض التقرير الكامل
                        </button>
                        <button onClick={() => setPrintReport(report)} className="no-print rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50 transition-colors">
                          <Printer size={17} />
                        </button>
                        <button
                          onClick={() => { deleteReport(report.id); setReports(getReports()); }}
                          className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 hover:bg-rose-100 transition-colors"
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
