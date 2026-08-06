'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, FilePlus2, Printer, Trash2, UserRound, Eye, TrendingUp, Award, BookOpen, Calendar, Hash } from 'lucide-react';
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
function getScoreMeta(score: number) {
  if (score >= 85) return { label: 'ممتاز', color: '#16a34a', bg: '#dcfce7', border: '#86efac', gradient: 'linear-gradient(135deg,#0d7d62,#10b981)' };
  if (score >= 70) return { label: 'جيد جداً', color: '#1d4ed8', bg: '#dbeafe', border: '#93c5fd', gradient: 'linear-gradient(135deg,#1e3a5f,#3b82f6)' };
  if (score >= 50) return { label: 'جيد', color: '#ca8a04', bg: '#fef9c3', border: '#fde047', gradient: 'linear-gradient(135deg,#b45309,#f59e0b)' };
  return { label: 'يحتاج دعم', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', gradient: 'linear-gradient(135deg,#991b1b,#ef4444)' };
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

function getReportPrintTitle(report: ReportRecord) {
  if (report.type === 'survey-answers') return 'تقرير إجابات ولي الأمر التفصيلية';
  if (report.type === 'student-assessment-answers') return 'تقرير إجابات اختبار الطالب التفصيلية';
  return 'التقرير التحليلي وخطة التدخل';
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

/* ─── Electronic Seal ─── */
function ElectronicSeal({ platform, primaryColor, accentColor, size = 100 }: { platform: string; primaryColor: string; accentColor: string; size?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `radial-gradient(circle at 38% 32%, ${accentColor}, ${primaryColor})`,
        border: `3px solid ${primaryColor}`,
        boxShadow: `0 0 0 2px white, 0 0 0 4px ${primaryColor}50, 0 6px 20px ${primaryColor}40`,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative',
      }}>
        <div style={{ position: 'absolute', width: size - 14, height: size - 14, borderRadius: '50%', border: '1.5px dashed rgba(255,255,255,0.4)' }} />
        <div style={{ color: 'white', fontWeight: 900, fontSize: size * 0.16, letterSpacing: 1 }}>{platform}</div>
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: size * 0.1, fontWeight: 600, marginTop: 1 }}>{new Date().getFullYear()}</div>
      </div>
      <div style={{ fontSize: 9, color: primaryColor, fontWeight: 700 }}>ختم إلكتروني رسمي</div>
    </div>
  );
}

/* ─── Dual Seals Footer ─── */
function DualSealsFooter({ doctorName = 'د. إسماعيل عيسى', fileNumber }: { doctorName?: string; fileNumber?: string }) {
  return (
    <div dir="rtl" style={{ marginTop: 32, borderTop: '2px solid #e2e8f0', paddingTop: 24 }}>
      <div style={{ background: 'linear-gradient(135deg,#0d7d6210,#1e3a5f10)', border: '1px solid #0d7d6230', borderRadius: 12, padding: '10px 20px', marginBottom: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <span style={{ fontSize: 14 }}>🔐</span>
        <span style={{ fontSize: 11, color: '#0f4c5c', fontWeight: 700 }}>هذا التقرير معتمد ومختوم إلكترونياً من منصتَي مسار ونيكسس التعليميتين</span>
        <span style={{ fontSize: 14 }}>🔐</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 16, alignItems: 'end' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ElectronicSeal platform="مسار" primaryColor="#0d7d62" accentColor="#34d399" size={100} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 12px', border: '1px solid #e2e8f0', borderRadius: 14, background: '#fafafa' }}>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>توقيع واعتماد المختص</span>
          <div style={{ width: '75%', height: 40, borderBottom: '2px solid #0f4c5c', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 3 }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#0f4c5c', fontStyle: 'italic', fontWeight: 700 }}>{doctorName}</span>
          </div>
          <span style={{ fontSize: 12, color: '#0f4c5c', fontWeight: 900 }}>{doctorName}</span>
          <span style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>استشاري التعليم العلاجي وصعوبات التعلم</span>
          {fileNumber && <span style={{ fontSize: 9, color: '#64748b', background: '#f1f5f9', padding: '2px 10px', borderRadius: 6 }}>{fileNumber}</span>}
          <span style={{ fontSize: 9, color: '#64748b', background: '#f1f5f9', padding: '2px 10px', borderRadius: 6 }}>
            {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ElectronicSeal platform="نيكسس" primaryColor="#1e3a5f" accentColor="#60a5fa" size={100} />
        </div>
      </div>
      <div style={{ marginTop: 16, textAlign: 'center', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
        هذا المستند صادر إلكترونياً ولا يحتاج إلى توقيع يدوي — Masar & Nexus Platforms © {new Date().getFullYear()}
      </div>
    </div>
  );
}

/* ─── MetricBar ─── */
function MetricBar({ title, value, note }: { title: string; value: number; note: string }) {
  const meta = getScoreMeta(value);
  return (
    <div style={{ background: 'white', border: `1.5px solid ${meta.border}`, borderRadius: 14, padding: '14px 18px', borderRight: `4px solid ${meta.color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', margin: 0 }}>{title}</h3>
        <span style={{ background: meta.bg, color: meta.color, fontWeight: 900, fontSize: 12, padding: '3px 12px', borderRadius: 20 }}>{value}%</span>
      </div>
      <div style={{ height: 8, background: '#f1f5f9', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ width: `${value}%`, height: '100%', background: meta.gradient, borderRadius: 8, transition: 'width 0.8s ease' }} />
      </div>
      <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.6 }}>{note}</p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   FULL REPORT VIEW
───────────────────────────────────────────────────────── */
function FullReportView({
  selected,
  selectedStudent,
  parentMode,
  onBack,
  onPrint,
  onDelete,
  onAssignProgram,
  assignMessage,
}: {
  selected: ReportRecord;
  selectedStudent: StudentRecord | undefined;
  parentMode: boolean;
  onBack: () => void;
  onPrint: () => void;
  onDelete: () => void;
  onAssignProgram: (slug: string) => void;
  assignMessage: string;
}) {
  const isAnswersReport = selected.type === 'survey-answers' || selected.type === 'student-assessment-answers';
  const decision = getDecisionFromScore(selected.score);
  const fileNumber = `MASAR-${selected.id.slice(-6).toUpperCase()}`;
  const sortedDomains = [...selected.domains].sort((a, b) => a.score - b.score);
  const supportDomains = sortedDomains.filter((d) => d.score < 70);
  const strengthDomains = [...selected.domains].sort((a, b) => b.score - a.score).slice(0, 2);
  const iepRows = (supportDomains.length ? supportDomains : sortedDomains).slice(0, 4);
  const homeRecommendations = selected.recommendations.slice(0, 3);
  const schoolRecommendations = selected.recommendations.slice(3, 6).length ? selected.recommendations.slice(3, 6) : selected.recommendations.slice(0, 3);
  const scoreMeta = getScoreMeta(selected.score);
  const clinicalLabel = isAnswersReport
    ? 'تقرير إجابات تفصيلية بدون تشخيص'
    : selected.score >= 85 ? 'مؤشرات تعلم مستقرة مع احتياج متابعة دورية'
    : selected.score >= 70 ? 'صعوبات تعلم نمائية وأكاديمية خفيفة إلى متوسطة'
    : selected.score >= 50 ? 'صعوبات تعلم متوسطة تحتاج تدخلاً علاجياً منظماً'
    : 'صعوبات تعلم مرتفعة تحتاج إعادة تدريس وتشخيصاً دقيقاً';

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }} dir="rtl">
      {!parentMode && <Navbar />}
      <div className="flex">
        {!parentMode && <Sidebar desktopOnly />}
        <main className={`min-w-0 flex-1 px-4 py-6 lg:px-8 ${parentMode ? 'mx-auto max-w-5xl' : ''}`}>

          {/* Back Button */}
          {!parentMode && (
            <button
              onClick={onBack}
              className="no-print mb-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{ background: 'var(--card-bg)', border: '1.5px solid var(--border)', color: 'var(--foreground)' }}
            >
              <ArrowRight size={16} />
              العودة إلى التقارير
            </button>
          )}

          {/* Report Paper */}
          <div
            id="printable-area"
            className="clinical-report rounded-3xl overflow-hidden"
            style={{ background: 'white', boxShadow: '0 4px 40px rgba(0,0,0,0.12)', fontFamily: 'Arial, sans-serif' }}
          >

            {/* ── GRADIENT HEADER ── */}
            <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0d7d62 100%)', padding: '32px 40px 24px', position: 'relative', overflow: 'hidden' }}>
              {/* Decorative circles */}
              <div style={{ position: 'absolute', top: -40, left: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
              <div style={{ position: 'absolute', bottom: -30, right: 100, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                {/* File number */}
                <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 18px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: 2, marginBottom: 3 }}>رقم الملف</div>
                  <div style={{ fontSize: 16, color: 'white', fontWeight: 900, letterSpacing: 2 }}>{fileNumber}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>{selected.date}</div>
                </div>

                {/* Center title */}
                <div style={{ textAlign: 'center', flex: 1, padding: '0 24px' }}>
                  <div style={{ fontSize: 10, color: '#fbbf24', fontWeight: 700, letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' }}>
                    وثيقة تعليمية علاجية معتمدة · OFFICIAL ASSESSMENT REPORT
                  </div>
                  <h1 style={{ color: 'white', fontWeight: 900, fontSize: 26, margin: '0 0 6px', letterSpacing: -0.5 }}>مَسَار · MASAR</h1>
                  <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 600, margin: '0 0 10px' }}>منصة التأهيل والتعليم الذكي لصعوبات التعلم</p>
                  <div style={{ display: 'inline-block', background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 20, padding: '5px 18px', fontSize: 13, color: '#fbbf24', fontWeight: 800 }}>
                    {getReportPrintTitle(selected)}
                  </div>
                </div>

                {/* Logo + print button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.3)', fontSize: 28 }}>🎓</div>
                  <button
                    onClick={onPrint}
                    className="no-print flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:scale-105"
                    style={{ background: '#fbbf24', color: '#0f172a' }}
                  >
                    <Printer size={14} />
                    طباعة PDF
                  </button>
                </div>
              </div>
            </div>

            <div style={{ padding: '32px 40px' }}>

              {/* ── STUDENT INFO GRID ── */}
              <section style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg,#0d7d62,#1e3a5f)', flexShrink: 0 }} />
                  <h2 style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: 0.8 }}>بيانات الطالب والتقرير</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: 14, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: 16 }}>
                  {/* Photo */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'white', borderRadius: 12, padding: 12, border: '1.5px solid #e2e8f0' }}>
                    {selectedStudent?.photoUrl ? (
                      <div style={{ width: 64, height: 64, borderRadius: 12, backgroundImage: `url(${selectedStudent.photoUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '2px solid #e2e8f0' }} />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: 12, background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #bfdbfe' }}>
                        <UserRound size={30} color="#3b82f6" />
                      </div>
                    )}
                    <span style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700 }}>صورة الطالب</span>
                  </div>

                  {/* Info cells */}
                  {[
                    { label: 'اسم الطالب', value: selected.studentName, icon: '👤' },
                    { label: 'الصف الدراسي', value: selected.grade, icon: '🏫' },
                    { label: 'البرنامج', value: cleanReportText(selected.program), icon: '📚' },
                  ].map((cell) => (
                    <div key={cell.label} style={{ background: 'white', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #e2e8f0' }}>
                      <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{cell.label}</div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>{cell.value || '—'}</div>
                    </div>
                  ))}

                  {/* Score cell spans 2 rows */}
                  <div style={{ gridColumn: '2 / 4', background: scoreMeta.bg, border: `1.5px solid ${scoreMeta.border}`, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: scoreMeta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ color: 'white', fontWeight: 900, fontSize: 16 }}>{selected.score}%</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: scoreMeta.color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{isAnswersReport ? 'نسبة اكتمال الإجابات' : 'الأداء الكلي'}</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>{scoreMeta.label}</div>
                    </div>
                  </div>
                  <div style={{ background: 'white', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #e2e8f0' }}>
                    <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>حالة التقرير</div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#16a34a' }}>
                      {selected.status === 'completed' ? '✓ مكتمل ومعتمد' : '⏳ قيد المراجعة'}
                    </div>
                  </div>
                </div>
              </section>

              {/* Gradient Divider */}
              <div style={{ height: 2, background: 'linear-gradient(90deg,#0d7d6200,#0d7d62,#1e3a5f,#1e3a5f00)', borderRadius: 2, marginBottom: 28 }} />

              {/* ── ANALYSIS CARDS ── */}
              <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
                <div style={{ background: isAnswersReport ? '#f8fafc' : '#fff1f2', border: `1.5px solid ${isAnswersReport ? '#e2e8f0' : '#fecdd3'}`, borderRadius: 16, padding: '18px 20px', borderRight: `4px solid ${isAnswersReport ? '#64748b' : '#dc2626'}` }}>
                  <div style={{ fontSize: 10, color: isAnswersReport ? '#64748b' : '#dc2626', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                    {isAnswersReport ? 'نوع التقرير' : 'التحليل التعليمي المعتمد'}
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', margin: '0 0 10px' }}>{clinicalLabel}</h3>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#334155', lineHeight: 1.8, margin: 0 }}>{cleanReportText(selected.summary)}</p>
                </div>
                <div style={{ background: isAnswersReport ? '#f8fafc' : '#eff6ff', border: `1.5px solid ${isAnswersReport ? '#e2e8f0' : '#bfdbfe'}`, borderRadius: 16, padding: '18px 20px', borderRight: '4px solid #1e3a5f' }}>
                  {!isAnswersReport ? (
                    <>
                      <div style={{ fontSize: 10, color: '#1d4ed8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>المسار العلاجي الموصى به</div>
                      <h3 style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', margin: '0 0 10px' }}>{decision.label}</h3>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1e40af', lineHeight: 1.8, margin: '0 0 10px' }}>{decision.action}</p>
                      <span style={{ display: 'inline-block', background: 'white', border: '1px solid #bfdbfe', borderRadius: 20, padding: '3px 14px', fontSize: 11, fontWeight: 800, color: '#1e3a5f' }}>{decision.range}</span>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 10, color: '#1d4ed8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>استخدام التقرير</div>
                      <h3 style={{ fontSize: 16, fontWeight: 900, color: '#0f172a', margin: '0 0 10px' }}>مراجعة إجابات ولي الأمر سؤالاً بسؤال</h3>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1e40af', lineHeight: 1.8, margin: 0 }}>هذا التقرير مخصص للدكتور فقط ويُقرأ بجانب تقرير التحليل قبل اعتماد المسار.</p>
                    </>
                  )}
                </div>
              </section>

              {/* ── PROGRAM APPROVAL (no-print) ── */}
              {!parentMode && !isAnswersReport && (
                <section className="no-print" style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '1.5px solid #86efac', borderRadius: 16, padding: '18px 20px', marginBottom: 28 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>قرار اعتماد المسار العلاجي</div>
                      <h3 style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
                        {selectedStudent?.assignedProgram
                          ? `المسار المعتمد: ${curriculumPrograms.find((p) => p.slug === selectedStudent.assignedProgram)?.shortTitle ?? selectedStudent.assignedProgram}`
                          : 'لم يتم اعتماد مسار علاجي بعد'}
                      </h3>
                      <p style={{ fontSize: 11, color: '#166534', margin: 0 }}>الطالب لا يرى المنهج إلا بعد اختيار المسار من هنا.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {curriculumPrograms.map((program) => (
                        <button
                          key={program.slug}
                          onClick={() => onAssignProgram(program.slug)}
                          disabled={!selectedStudent}
                          style={{ background: 'white', border: '1.5px solid #86efac', borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 800, color: '#166534', cursor: 'pointer', opacity: !selectedStudent ? 0.5 : 1 }}
                        >
                          {program.shortTitle}
                        </button>
                      ))}
                    </div>
                  </div>
                  {assignMessage && <p style={{ marginTop: 12, background: 'white', borderRadius: 10, padding: '8px 14px', fontSize: 12, fontWeight: 800, color: '#166534', border: '1px solid #86efac' }}>{assignMessage}</p>}
                </section>
              )}

              {/* ── SECTION 1: Domain Analysis ── */}
              <section style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg,#0d7d62,#1e3a5f)', flexShrink: 0 }} />
                  <h2 style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: 0.8 }}>1. تحليل نقاط القوة والاحتياج</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {selected.domains.map((domain) => (
                    <MetricBar key={domain.name} title={domain.name} value={domain.score} note={domain.note} />
                  ))}
                </div>
              </section>

              {/* ── SECTION 2: Strengths & Difficulties ── */}
              <section style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg,#0d7d62,#1e3a5f)', flexShrink: 0 }} />
                  <h2 style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: 0.8 }}>2. ملخص القوة والصعوبات</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, padding: '16px 18px', borderRight: '4px solid #16a34a' }}>
                    <h3 style={{ fontWeight: 900, color: '#166534', margin: '0 0 10px', fontSize: 13 }}>✅ نقاط القوة</h3>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {strengthDomains.map((d) => (
                        <li key={d.name} style={{ fontSize: 12, fontWeight: 700, color: '#166534', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{d.name}</span>
                          <span style={{ fontWeight: 900 }}>{d.score}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div style={{ background: '#fefce8', border: '1.5px solid #fde047', borderRadius: 14, padding: '16px 18px', borderRight: '4px solid #ca8a04' }}>
                    <h3 style={{ fontWeight: 900, color: '#92400e', margin: '0 0 10px', fontSize: 13 }}>⚠️ صعوبات تحتاج تدخل</h3>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(supportDomains.length ? supportDomains : sortedDomains.slice(0, 2)).map((d) => (
                        <li key={d.name} style={{ fontSize: 12, fontWeight: 700, color: '#92400e', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{d.name}</span>
                          <span style={{ fontWeight: 900 }}>{d.score}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* ── SECTION 3: IEP Table ── */}
              <section style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg,#7c3aed,#1e3a5f)', flexShrink: 0 }} />
                  <h2 style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: 0.8 }}>3. أهداف خطة التربية الفردية IEP</h2>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'right' }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg,#7c3aed,#1e3a5f)' }}>
                        {['المجال', 'الهدف التعليمي', 'معيار الإتقان', 'الموعد'].map((h) => (
                          <th key={h} style={{ padding: '12px 14px', color: 'white', fontWeight: 800, fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {iepRows.map((domain, i) => (
                        <tr key={domain.name} style={{ background: i % 2 === 0 ? 'white' : '#faf5ff', borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '11px 14px', fontWeight: 800, color: '#7c3aed', fontSize: 12 }}>{domain.name}</td>
                          <td style={{ padding: '11px 14px', fontWeight: 600, color: '#334155', fontSize: 11, lineHeight: 1.6 }}>{getGoalForDomain(domain.name)}</td>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: '#475569', fontSize: 11 }}>دقة 80% في قياسين متتاليين</td>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: '#475569', fontSize: 11 }}>{getPlanMonth(i)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ── SECTION 4: ABC Behavior ── */}
              <section style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg,#b45309,#f59e0b)', flexShrink: 0 }} />
                  <h2 style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: 0.8 }}>4. تحليل النمط السلوكي ABC</h2>
                </div>
                <div style={{ border: '1px solid #fde68a', borderRadius: 14, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'right' }}>
                    <thead>
                      <tr style={{ background: 'linear-gradient(135deg,#b45309,#f59e0b)' }}>
                        {['السوابق A', 'السلوك B', 'العواقب C', 'التكرار'].map((h) => (
                          <th key={h} style={{ padding: '12px 14px', color: 'white', fontWeight: 800, fontSize: 11 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ['سؤال صعب أو انتقال مفاجئ داخل الاختبار', 'تردد أو بطء في الاستجابة', 'تقديم نموذج بصري وتقليل الاختيارات', '2-3 مرات/جلسة'],
                        ['مهمة قراءة أو حساب ممتدة', 'فقدان انتباه أو تخمين', 'استراحة قصيرة ثم سؤال إتقان واحد', '1-2 مرات/جلسة'],
                      ].map((row, i) => (
                        <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#fefce8', borderBottom: '1px solid #fef9c3' }}>
                          {row.map((cell, j) => <td key={j} style={{ padding: '11px 14px', fontWeight: 600, color: '#334155', fontSize: 11 }}>{cell}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ── SECTION 5: Recommendations ── */}
              <section style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg,#0d7d62,#1e3a5f)', flexShrink: 0 }} />
                  <h2 style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: 0.8 }}>5. توصيات المنزل والمدرسة</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    { title: '🏠 توصيات المنزل', items: homeRecommendations, bg: '#eff6ff', border: '#bfdbfe', titleColor: '#1e40af', barColor: '#1e3a5f' },
                    { title: '🏫 توصيات المدرسة', items: schoolRecommendations, bg: '#f0fdf4', border: '#86efac', titleColor: '#166534', barColor: '#0d7d62' },
                  ].map((box) => (
                    <div key={box.title} style={{ background: box.bg, border: `1.5px solid ${box.border}`, borderRadius: 14, padding: '16px 18px', borderRight: `4px solid ${box.barColor}` }}>
                      <h3 style={{ fontWeight: 900, color: box.titleColor, margin: '0 0 12px', fontSize: 13 }}>{box.title}</h3>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {box.items.map((item, i) => (
                          <li key={i} style={{ display: 'flex', gap: 8, fontSize: 12, fontWeight: 600, color: '#334155', lineHeight: 1.6 }}>
                            <span style={{ color: box.barColor, fontWeight: 900, flexShrink: 0 }}>✓</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── SECTION 6: Answers ── */}
              <section style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg,#64748b,#94a3b8)', flexShrink: 0 }} />
                  <h2 style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: 0.8 }}>6. الإجابات التفصيلية المحفوظة</h2>
                </div>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selected.answers.map((answer, index) => (
                    <div key={`${answer.question}-${index}`} style={{ background: 'white', borderRadius: 10, padding: '12px 16px', border: '1px solid #f1f5f9' }}>
                      <p style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', margin: '0 0 4px' }}>سؤال {index + 1}: {answer.question}</p>
                      <p style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', margin: 0 }}>{answer.answer}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* ── DUAL SEALS FOOTER ── */}
              <DualSealsFooter doctorName="د. إسماعيل عيسى" fileNumber={fileNumber} />

              {/* Action Buttons (no-print) */}
              <div className="no-print" style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                <button
                  onClick={onPrint}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#0d7d62,#1e3a5f)', color: 'white', border: 'none', borderRadius: 12, padding: '12px 24px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                >
                  <Printer size={16} />
                  طباعة التقرير / PDF
                </button>
                {!parentMode && (
                  <button
                    onClick={onDelete}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fee2e2', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '12px 24px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
                  >
                    <Trash2 size={16} />
                    حذف التقرير
                  </button>
                )}
              </div>

            </div>
          </div>
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
            box-shadow: none !important; border-radius: 0 !important;
          }
          @page { size: A4 portrait; margin: 10mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          table { page-break-inside: avoid !important; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   REPORT CARD (list view)
───────────────────────────────────────────────────────── */
function ReportCard({ report, onView, onPrint, onDelete }: { report: ReportRecord; onView: () => void; onPrint: () => void; onDelete: () => void }) {
  const meta = getScoreMeta(report.score);
  const decision = getDecisionFromScore(report.score);

  return (
    <article
      className="group overflow-hidden rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
      style={{ background: 'var(--card-bg)', border: '1.5px solid var(--border)', position: 'relative' }}
    >
      {/* Top color bar */}
      <div style={{ height: 4, background: meta.gradient }} />

      {/* Score circle — top left absolute */}
      <div style={{ position: 'absolute', top: 16, left: 16, width: 56, height: 56, borderRadius: '50%', background: meta.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${meta.color}40` }}>
        <span style={{ color: 'white', fontWeight: 900, fontSize: 15 }}>{report.score}%</span>
      </div>

      <div style={{ padding: '16px 16px 16px 84px' }}>
        <div style={{ marginBottom: 4 }}>
          <h2 style={{ fontWeight: 900, fontSize: 16, color: 'var(--foreground)', margin: 0 }}>{report.studentName}</h2>
          <p style={{ fontSize: 11, color: 'var(--foreground)', opacity: 0.5, margin: '3px 0 0', fontWeight: 600 }}>
            {report.grade} · {report.date}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ background: meta.bg, color: meta.color, fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 20, border: `1px solid ${meta.border}` }}>
            {meta.label}
          </span>
          <span style={{ background: 'var(--background)', color: 'var(--foreground)', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, opacity: 0.7, border: '1px solid var(--border)' }}>
            {cleanReportText(report.program)}
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 6, background: 'var(--border)', borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ width: `${report.score}%`, height: '100%', background: meta.gradient, borderRadius: 6 }} />
        </div>

        <p style={{ fontSize: 12, color: 'var(--foreground)', opacity: 0.6, margin: '0 0 14px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {cleanReportText(report.summary)}
        </p>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onView}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'linear-gradient(135deg,#0d7d62,#1e3a5f)', color: 'white', border: 'none', borderRadius: 10, padding: '10px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
          >
            <Eye size={14} />
            عرض التقرير
          </button>
          <button
            onClick={onPrint}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', color: 'var(--foreground)' }}
          >
            <Printer size={15} />
          </button>
          <button
            onClick={onDelete}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '10px 12px', cursor: 'pointer', color: '#dc2626' }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </article>
  );
}

/* ────────────────────────────────────────────────────────
   MAIN CONTENT
───────────────────────────────────────────────────────── */
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
    const updatedList = Array.from(new Set([...currentList, slug]));
    updateStudent(selectedStudent.id, { assignedProgram: slug, assignedPrograms: updatedList, assignedBy: 'د. إسماعيل عيسى', assignedAt: new Date().toISOString(), reviewStatus: 'program-assigned' });
    setStudents(getStudents());
    setAssignMessage(`تم اعتماد ${program?.shortTitle ?? 'المسار'} للطالب ${selectedStudent.fullName}.`);
  };

  /* Full report view */
  if (selected) {
    return (
      <>
        <FullReportView
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

  /* Reports list view */
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }} dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">

          {/* Header */}
          <div
            className="mb-6 rounded-2xl overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#0f172a,#1e3a5f,#0d7d62)', boxShadow: '0 8px 32px rgba(13,125,98,0.25)' }}
          >
            <div style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <p style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700, letterSpacing: 2, margin: '0 0 6px', textTransform: 'uppercase' }}>منصة مسار — MASAR</p>
                <h1 style={{ fontSize: 26, fontWeight: 900, color: 'white', margin: '0 0 6px', letterSpacing: -0.5 }}>📋 التقارير الرسمية المعتمدة</h1>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', margin: 0, fontWeight: 600 }}>عرض وطباعة جميع تقارير التقييم الشاملة مع الختمين الإلكترونيين</p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Link
                  href="/reports/preview"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '10px 18px', fontSize: 12, fontWeight: 800, color: 'white', textDecoration: 'none' }}
                >
                  🖨️ بروفة التقارير
                </Link>
                <Link
                  href="/student/new"
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fbbf24', borderRadius: 12, padding: '10px 18px', fontSize: 12, fontWeight: 800, color: '#0f172a', textDecoration: 'none' }}
                >
                  + تقرير جديد
                </Link>
              </div>
            </div>

            {/* Stats Bar */}
            <div style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '14px 32px', display: 'flex', gap: 32 }}>
              {[
                { icon: '📄', label: 'إجمالي التقارير', value: reports.length },
                { icon: '✅', label: 'مكتملة', value: reports.filter((r) => r.status === 'completed').length },
                { icon: '📊', label: 'متوسط الأداء', value: reports.length ? `${Math.round(reports.reduce((s, r) => s + r.score, 0) / reports.length)}%` : '—' },
              ].map((stat) => (
                <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{stat.icon}</span>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: 'white' }}>{stat.value}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
            {filters.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                style={{
                  flexShrink: 0, borderRadius: 10, padding: '8px 16px', fontSize: 12, fontWeight: 800,
                  background: filter === item ? 'linear-gradient(135deg,#0d7d62,#1e3a5f)' : 'var(--card-bg)',
                  color: filter === item ? 'white' : 'var(--foreground)',
                  border: filter === item ? '1.5px solid transparent' : '1.5px solid var(--border)',
                  boxShadow: filter === item ? '0 4px 12px rgba(13,125,98,0.3)' : 'none',
                  cursor: 'pointer',
                }}
              >
                {item === 'all' ? 'الكل' : item}
              </button>
            ))}
          </div>

          {/* Empty State */}
          {filtered.length === 0 ? (
            <div
              className="rounded-2xl p-12 text-center"
              style={{ background: 'var(--card-bg)', border: '2px dashed var(--border)' }}
            >
              <div style={{ fontSize: 52, marginBottom: 16 }}>📭</div>
              <h2 style={{ fontWeight: 900, fontSize: 22, color: 'var(--foreground)', marginBottom: 8 }}>لا توجد تقارير محفوظة بعد</h2>
              <p style={{ fontSize: 13, color: 'var(--foreground)', opacity: 0.6, maxWidth: 400, margin: '0 auto 20px', lineHeight: 1.8 }}>
                أنشئ طالباً أو استبياناً، وبعد الحفظ سيظهر التقرير الحقيقي في هذه القائمة.
              </p>
              <Link
                href="/student/new"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#0d7d62,#1e3a5f)', color: 'white', borderRadius: 12, padding: '12px 24px', fontSize: 13, fontWeight: 800, textDecoration: 'none' }}
              >
                <FilePlus2 size={16} />
                إضافة طالب وتقرير
              </Link>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
              {filtered.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onView={() => setSelectedId(report.id)}
                  onPrint={() => setPrintReport(report)}
                  onDelete={() => { deleteReport(report.id); setReports(getReports()); }}
                />
              ))}
            </div>
          )}

        </main>
      </div>
      {printReport && <PrintableReportModal report={printReport} onClose={() => setPrintReport(null)} />}
    </div>
  );
}
