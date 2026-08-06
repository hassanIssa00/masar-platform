'use client';

import { Printer, X, CheckCircle2 } from 'lucide-react';
import type { ReportRecord } from '@/lib/localDb';
import BrandMark from './BrandMark';

/* ─────────────────────────────────────────────
   الختم الإلكتروني — مكوّن مستقل قابل لإعادة الاستخدام
   Electronic Seal Component
───────────────────────────────────────────── */
function ElectronicSeal({
  platform,
  color,
  accentColor,
  doctorName = 'د. إسماعيل عيسى',
}: {
  platform: 'masar' | 'nexus';
  color: string;
  accentColor: string;
  doctorName?: string;
}) {
  const isMasar = platform === 'masar';
  const platformAr = isMasar ? 'مسار' : 'نيكسس';
  const platformEn = isMasar ? 'MASAR' : 'NEXUS';
  const tagline = isMasar ? 'منصة التعليم العلاجي' : 'المنصة التعليمية التكاملية';
  const year = new Date().getFullYear();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      {/* Circular Seal */}
      <div
        style={{
          width: 110,
          height: 110,
          borderRadius: '50%',
          border: `3px solid ${color}`,
          boxShadow: `0 0 0 2px white, 0 0 0 4px ${color}, 0 4px 16px ${color}40`,
          background: `radial-gradient(circle at 40% 35%, ${accentColor}, ${color})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Inner ring */}
        <div
          style={{
            position: 'absolute',
            width: 94,
            height: 94,
            borderRadius: '50%',
            border: `1.5px dashed rgba(255,255,255,0.5)`,
          }}
        />
        {/* Star/Badge at top */}
        <div style={{ fontSize: 14, marginBottom: 2 }}>{isMasar ? '🌟' : '🔷'}</div>
        {/* Platform name Arabic */}
        <div style={{ color: 'white', fontWeight: 900, fontSize: 15, letterSpacing: 1, fontFamily: 'Arial' }}>
          {platformAr}
        </div>
        {/* Platform name English */}
        <div style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: 9, letterSpacing: 3 }}>
          {platformEn}
        </div>
        {/* Year */}
        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 2, fontWeight: 600 }}>
          {year}
        </div>
      </div>
      {/* Tagline below seal */}
      <div style={{ fontSize: 10, color, fontWeight: 700, textAlign: 'center', maxWidth: 120 }}>
        {tagline}
      </div>
      {/* Verification text */}
      <div
        style={{
          fontSize: 8,
          color: '#64748b',
          textAlign: 'center',
          background: '#f8fafc',
          border: `1px solid ${color}40`,
          borderRadius: 6,
          padding: '3px 8px',
          maxWidth: 120,
        }}
      >
        ✓ معتمد إلكترونياً
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   شريط الختمين الإلكترونيين
   Dual Seals Footer Bar
───────────────────────────────────────────── */
function DualSealsFooter({ doctorName = 'د. إسماعيل عيسى' }: { doctorName?: string }) {
  return (
    <div
      dir="rtl"
      style={{
        marginTop: 32,
        borderTop: '2px solid #e2e8f0',
        paddingTop: 24,
      }}
    >
      {/* Verification Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f4c5c08, #1e3a5f08)',
          border: '1px solid #0f4c5c20',
          borderRadius: 12,
          padding: '10px 20px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 14 }}>🔐</span>
        <span style={{ fontSize: 11, color: '#0f4c5c', fontWeight: 700 }}>
          هذا التقرير معتمد ومختوم إلكترونياً من منصتَي مسار ونيكسس التعليميتين
        </span>
        <span style={{ fontSize: 14 }}>🔐</span>
      </div>

      {/* 3-Column Layout: Seal | Signature | Seal */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr 1fr',
          alignItems: 'end',
          gap: 16,
        }}
      >
        {/* Masar Seal */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ElectronicSeal platform="masar" color="#0d7d62" accentColor="#10b981" doctorName={doctorName} />
        </div>

        {/* Center: Doctor Signature Box */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: '16px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: 14,
            background: '#fafafa',
          }}
        >
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>توقيع واعتماد</span>
          {/* Signature Line */}
          <div
            style={{
              width: '80%',
              height: 48,
              borderBottom: '2px solid #0f4c5c',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: 4,
            }}
          >
            <span
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 13,
                color: '#0f4c5c',
                fontStyle: 'italic',
                fontWeight: 700,
              }}
            >
              {doctorName}
            </span>
          </div>
          <span style={{ fontSize: 11, color: '#0f4c5c', fontWeight: 900 }}>{doctorName}</span>
          <span style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>
            استشاري التعليم العلاجي وصعوبات التعلم
          </span>
          {/* Date */}
          <span
            style={{
              fontSize: 9,
              color: '#64748b',
              background: '#f1f5f9',
              padding: '2px 10px',
              borderRadius: 6,
            }}
          >
            {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        {/* Nexus Seal */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ElectronicSeal platform="nexus" color="#1e3a5f" accentColor="#3b82f6" doctorName={doctorName} />
        </div>
      </div>

      {/* Bottom Legal Line */}
      <div
        style={{
          marginTop: 20,
          textAlign: 'center',
          fontSize: 9,
          color: '#94a3b8',
          borderTop: '1px solid #f1f5f9',
          paddingTop: 12,
        }}
      >
        هذا المستند صادر إلكترونياً ولا يحتاج إلى توقيع يدوي — تحقق من صحته عبر رمز الاعتماد | Masar & Nexus Platforms © {new Date().getFullYear()}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   المكوّن الرئيسي للتقرير القابل للطباعة
   Main PrintableReportModal Component
───────────────────────────────────────────── */
export default function PrintableReportModal({
  report,
  onClose,
}: {
  report: ReportRecord;
  onClose: () => void;
}) {
  const handlePrint = () => {
    window.print();
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) return { label: 'ممتاز', bg: '#dcfce7', color: '#16a34a' };
    if (score >= 70) return { label: 'جيد جداً', bg: '#dbeafe', color: '#1d4ed8' };
    if (score >= 55) return { label: 'جيد', bg: '#fef9c3', color: '#ca8a04' };
    return { label: 'يحتاج دعم', bg: '#fee2e2', color: '#dc2626' };
  };

  const badge = getScoreBadge(report.score || 0);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4 sm:p-6 backdrop-blur-sm grid place-items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-200"
        style={{ maxHeight: '95vh', overflowY: 'auto' }}
      >
        {/* ── Toolbar (hidden on print) ── */}
        <div
          className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-l from-teal-50 to-blue-50 p-4 print:hidden"
          dir="rtl"
        >
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="font-black text-slate-800 text-sm">معاينة التقرير الرسمي للطباعة</span>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">✓ معتمد ومختوم</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2 text-xs font-black text-white hover:bg-teal-700 transition-all hover:scale-105 shadow-md"
            >
              <Printer size={15} />
              طباعة / حفظ PDF
            </button>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-xl bg-slate-200 hover:bg-red-100 hover:text-red-600 text-slate-600 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Printable Document Body ── */}
        <div
          className="p-10 sm:p-14 bg-white print:p-8"
          dir="rtl"
          id="printable-area"
          style={{ fontFamily: "'Arial', sans-serif" }}
        >

          {/* ── Header / Letterhead ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 28,
              paddingBottom: 20,
              borderBottom: '3px solid #0d7d62',
            }}
          >
            {/* Right: Logo + Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0d7d62, #1e3a5f)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px #0d7d6230',
                }}
              >
                <span style={{ fontSize: 28 }}>🎓</span>
              </div>
              <div>
                <div style={{ fontWeight: 900, fontSize: 20, color: '#0f172a', lineHeight: 1.2 }}>
                  د. إسماعيل عيسى
                </div>
                <div style={{ fontWeight: 700, fontSize: 11, color: '#0d7d62', marginTop: 2 }}>
                  استشاري التعليم العلاجي وصعوبات التعلم
                </div>
                <div style={{ fontWeight: 600, fontSize: 10, color: '#64748b', marginTop: 2 }}>
                  عيادة التأهيل والتعليم العلاجي
                </div>
              </div>
            </div>

            {/* Center: Report Title */}
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  background: 'linear-gradient(135deg, #0d7d62, #1e3a5f)',
                  color: 'white',
                  padding: '8px 24px',
                  borderRadius: 30,
                  fontWeight: 900,
                  fontSize: 13,
                  letterSpacing: 0.5,
                }}
              >
                التقرير التخصصي الرسمي
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>
                {report.program || 'تقرير تقييم شامل'}
              </div>
            </div>

            {/* Left: Platform Logos */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #0d7d62, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 14 }}>🌟</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: 12, color: '#0d7d62' }}>مسار</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, #1e3a5f, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 14 }}>🔷</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: 12, color: '#1e3a5f' }}>نيكسس</span>
              </div>
            </div>
          </div>

          {/* ── Student Info Card ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 16,
              marginBottom: 28,
            }}
          >
            {/* Name */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                border: '1.5px solid #86efac',
                borderRadius: 14,
                padding: '14px 18px',
              }}
            >
              <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 800, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                اسم الطالب
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>{report.studentName}</div>
            </div>

            {/* Grade */}
            <div
              style={{
                background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                border: '1.5px solid #93c5fd',
                borderRadius: 14,
                padding: '14px 18px',
              }}
            >
              <div style={{ fontSize: 10, color: '#1d4ed8', fontWeight: 800, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
                المرحلة / الصف
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>{report.grade || '—'}</div>
            </div>

            {/* Score + Date */}
            <div
              style={{
                background: 'linear-gradient(135deg, #fefce8, #fef9c3)',
                border: '1.5px solid #fde047',
                borderRadius: 14,
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
              }}
            >
              <div style={{ fontSize: 10, color: '#ca8a04', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
                الدرجة الكلية
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>{report.score}%</span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 20,
                    background: badge.bg,
                    color: badge.color,
                  }}
                >
                  {badge.label}
                </span>
              </div>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>📅 {report.date}</div>
            </div>
          </div>

          {/* ── Horizontal Gold Divider ── */}
          <div
            style={{
              height: 2,
              background: 'linear-gradient(90deg, #0d7d6200, #0d7d62, #1e3a5f, #1e3a5f00)',
              borderRadius: 2,
              marginBottom: 28,
            }}
          />

          {/* ── Summary Section ── */}
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div style={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg, #0d7d62, #1e3a5f)' }} />
              <h4 style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
                الخلاصة والتشخيص السريري
              </h4>
            </div>
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRight: '4px solid #0d7d62',
                borderRadius: 12,
                padding: '14px 18px',
                fontSize: 13,
                fontWeight: 600,
                color: '#334155',
                lineHeight: 1.8,
              }}
            >
              {report.summary}
            </div>
          </div>

          {/* ── Domain Breakdown Table ── */}
          {report.domains && report.domains.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg, #0d7d62, #1e3a5f)' }} />
                <h4 style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
                  تفاصيل المهارات والمجالات
                </h4>
              </div>

              <table
                style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  overflow: 'hidden',
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr style={{ background: 'linear-gradient(135deg, #0d7d62, #1e3a5f)' }}>
                    <th style={{ padding: '12px 16px', color: 'white', fontWeight: 800, textAlign: 'right', fontSize: 11, letterSpacing: 0.5 }}>
                      المجال / المهارة
                    </th>
                    <th style={{ padding: '12px 16px', color: 'white', fontWeight: 800, textAlign: 'center', fontSize: 11, width: 90 }}>
                      الدرجة
                    </th>
                    <th style={{ padding: '12px 16px', color: 'white', fontWeight: 800, textAlign: 'right', fontSize: 11 }}>
                      ملاحظة الأخصائي
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.domains.map((d, i) => {
                    const rowBadge = getScoreBadge(d.score || 0);
                    return (
                      <tr
                        key={i}
                        style={{
                          background: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                          borderBottom: '1px solid #f1f5f9',
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 800, color: '#0f172a', fontSize: 12 }}>
                          {d.name}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              background: rowBadge.bg,
                              color: rowBadge.color,
                              fontWeight: 900,
                              fontSize: 12,
                              padding: '4px 12px',
                              borderRadius: 20,
                              minWidth: 55,
                            }}
                          >
                            {d.score}%
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 11, fontWeight: 600 }}>
                          {d.note}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Recommendations ── */}
          {report.recommendations && report.recommendations.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg, #0d7d62, #1e3a5f)' }} />
                <h4 style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1, margin: 0 }}>
                  التوصيات والخطة العلاجية المقترحة
                </h4>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: report.recommendations.length > 3 ? '1fr 1fr' : '1fr',
                  gap: 10,
                }}
              >
                {report.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: 10,
                      padding: '10px 14px',
                    }}
                  >
                    <span style={{ color: '#16a34a', fontWeight: 900, fontSize: 16, flexShrink: 0, lineHeight: 1.4 }}>✓</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', lineHeight: 1.6 }}>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Dual Electronic Seals Footer ── */}
          <DualSealsFooter doctorName="د. إسماعيل عيسى" />

        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; margin: 0; }
          #printable-area { padding: 20px !important; }
        }
      `}</style>
    </div>
  );
}
