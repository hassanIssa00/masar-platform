'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Printer, ArrowRight, Eye } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

/* ─────────────────────────────────────────────
   Electronic Seal SVG Component
───────────────────────────────────────────── */
function ElectronicSeal({
  platform,
  primaryColor,
  accentColor,
  size = 120,
}: {
  platform: string;
  platformEn: string;
  primaryColor: string;
  accentColor: string;
  size?: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle at 38% 32%, ${accentColor}, ${primaryColor})`,
          border: `3px solid ${primaryColor}`,
          boxShadow: `0 0 0 2px white, 0 0 0 5px ${primaryColor}50, 0 8px 24px ${primaryColor}40`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Dashed inner ring */}
        <div style={{
          position: 'absolute',
          width: size - 16,
          height: size - 16,
          borderRadius: '50%',
          border: '1.5px dashed rgba(255,255,255,0.45)',
        }} />
        <div style={{ color: 'white', fontWeight: 900, fontSize: size * 0.15, letterSpacing: 1 }}>
          {platform}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: size * 0.09, fontWeight: 600, marginTop: 2 }}>
          {new Date().getFullYear()}
        </div>
      </div>
      <div style={{ fontSize: 10, color: primaryColor, fontWeight: 700 }}>ختم إلكتروني رسمي</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Dual Seals Bar
───────────────────────────────────────────── */
function DualSealsBar({ doctorName = 'د. إسماعيل عيسى' }: { doctorName?: string }) {
  return (
    <div dir="rtl" style={{ marginTop: 28, borderTop: '2px solid #e2e8f0', paddingTop: 24 }}>
      {/* Verification Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0d7d6210, #1e3a5f10)',
        border: '1px solid #0d7d6230',
        borderRadius: 12,
        padding: '10px 20px',
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}>
        <span style={{ fontSize: 14 }}>🔐</span>
        <span style={{ fontSize: 11, color: '#0f4c5c', fontWeight: 700, letterSpacing: 0.3 }}>
          هذا التقرير معتمد ومختوم إلكترونياً من منصتَي مسار ونيكسس التعليميتين
        </span>
        <span style={{ fontSize: 14 }}>🔐</span>
      </div>

      {/* Seals Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr 1fr', gap: 16, alignItems: 'end' }}>
        {/* Masar Seal */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ElectronicSeal platform="مسار" platformEn="MASAR" primaryColor="#0d7d62" accentColor="#34d399" size={110} />
        </div>

        {/* Signature */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          padding: '16px 12px', border: '1px solid #e2e8f0', borderRadius: 14, background: '#fafafa',
        }}>
          <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>توقيع واعتماد المختص</span>
          <div style={{
            width: '75%', height: 44, borderBottom: '2px solid #0f4c5c',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 4,
          }}>
            <span style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#0f4c5c', fontStyle: 'italic', fontWeight: 700 }}>
              {doctorName}
            </span>
          </div>
          <span style={{ fontSize: 12, color: '#0f4c5c', fontWeight: 900 }}>{doctorName}</span>
          <span style={{ fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>استشاري التعليم العلاجي</span>
          <span style={{ fontSize: 9, color: '#64748b', background: '#f1f5f9', padding: '2px 10px', borderRadius: 6 }}>
            {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>

        {/* Nexus Seal */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <ElectronicSeal platform="نيكسس" platformEn="NEXUS" primaryColor="#1e3a5f" accentColor="#60a5fa" size={110} />
        </div>
      </div>

      {/* Legal footer */}
      <div style={{
        marginTop: 18, textAlign: 'center', fontSize: 9, color: '#94a3b8',
        borderTop: '1px solid #f1f5f9', paddingTop: 10,
      }}>
        هذا المستند صادر إلكترونياً ولا يحتاج إلى توقيع يدوي — Masar & Nexus Platforms © {new Date().getFullYear()}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Helper: Section Header
───────────────────────────────────────────── */
function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <div style={{ width: 4, height: 22, borderRadius: 2, background: 'linear-gradient(180deg,#0d7d62,#1e3a5f)', flexShrink: 0 }} />
      <h4 style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {title}
      </h4>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Report 1: تقرير أداء الطالب الفردي
───────────────────────────────────────────── */
function Report1() {
  const domains = [
    { name: 'المهارات اللغوية والتواصل', score: 82, note: 'تقدم ملحوظ في النطق وتكوين الجمل' },
    { name: 'الإدراك والانتباه', score: 74, note: 'يحتاج تمارين تركيز إضافية' },
    { name: 'المهارات الاجتماعية', score: 90, note: 'ممتاز في التفاعل مع الأقران' },
    { name: 'الحركة الدقيقة والكتابة', score: 68, note: 'يُنصح بجلسات تقوية اليد' },
    { name: 'الرياضيات والمنطق', score: 78, note: 'جيد في الإضافة، يحتاج دعم في الطرح' },
  ];

  const getColor = (s: number) => s >= 85 ? { bg: '#dcfce7', color: '#16a34a' } : s >= 70 ? { bg: '#dbeafe', color: '#1d4ed8' } : s >= 55 ? { bg: '#fef9c3', color: '#ca8a04' } : { bg: '#fee2e2', color: '#dc2626' };

  return (
    <div dir="rtl" style={{ fontFamily: 'Arial, sans-serif', color: '#0f172a', background: 'white' }}>

      {/* Letterhead */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 20, borderBottom: '3px solid #0d7d62' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#0d7d62,#1e3a5f)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px #0d7d6230' }}>
            <span style={{ fontSize: 26 }}>🎓</span>
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, color: '#0f172a' }}>د. إسماعيل عيسى</div>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#0d7d62' }}>استشاري التعليم العلاجي وصعوبات التعلم</div>
            <div style={{ fontWeight: 600, fontSize: 10, color: '#64748b' }}>عيادة التأهيل والتعليم العلاجي</div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: 'linear-gradient(135deg,#0d7d62,#1e3a5f)', color: 'white', padding: '8px 22px', borderRadius: 30, fontWeight: 900, fontSize: 13 }}>
            تقرير أداء الطالب الفردي
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>Individual Student Performance Report</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[{ name: 'مسار', color: '#0d7d62' }, { name: 'نيكسس', color: '#1e3a5f' }].map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12 }}>{p.name === 'مسار' ? '🌟' : '🔷'}</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 11, color: p.color }}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Student Info Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 26 }}>
        {[
          { label: 'اسم الطالب', value: 'أحمد محمد علي إبراهيم', bg: '#f0fdf4', border: '#86efac', lColor: '#16a34a' },
          { label: 'المرحلة الدراسية', value: 'المرحلة الابتدائية — صف أول', bg: '#eff6ff', border: '#93c5fd', lColor: '#1d4ed8' },
          { label: 'تاريخ التقرير', value: new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }), bg: '#fefce8', border: '#fde047', lColor: '#ca8a04' },
        ].map((c, i) => (
          <div key={i} style={{ background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 13, padding: '13px 16px' }}>
            <div style={{ fontSize: 9, color: c.lColor, fontWeight: 800, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>{c.label}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ height: 2, background: 'linear-gradient(90deg,#0d7d6200,#0d7d62,#1e3a5f,#1e3a5f00)', borderRadius: 2, marginBottom: 26 }} />

      {/* Overall Score */}
      <div style={{ marginBottom: 26 }}>
        <SectionHeader title="الدرجة الإجمالية للتقييم" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#0d7d62,#1e3a5f)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: 'white', fontWeight: 900, fontSize: 22 }}>78%</span>
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>جيد جداً</div>
            <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>يُظهر الطالب تقدماً ملحوظاً في معظم المجالات مع الحاجة لدعم إضافي في الحركة الدقيقة والإدراك البصري.</div>
          </div>
          {/* Mini bar chart */}
          <div style={{ marginRight: 'auto', display: 'flex', gap: 5, alignItems: 'flex-end', height: 60 }}>
            {[55, 62, 70, 74, 78].map((v, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ width: 18, height: (v / 100) * 50, background: `hsl(${160 + i * 10},70%,${40 + i * 3}%)`, borderRadius: '4px 4px 0 0' }} />
                <span style={{ fontSize: 7, color: '#94a3b8' }}>ش{i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Domain Table */}
      <div style={{ marginBottom: 26 }}>
        <SectionHeader title="تفاصيل المهارات والمجالات" />
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg,#0d7d62,#1e3a5f)' }}>
              {['المجال / المهارة', 'الدرجة', 'التقدير', 'ملاحظة الأخصائي'].map(h => (
                <th key={h} style={{ padding: '11px 14px', color: 'white', fontWeight: 800, textAlign: 'right', fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {domains.map((d, i) => {
              const c = getColor(d.score);
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '11px 14px', fontWeight: 800, color: '#0f172a', fontSize: 12 }}>{d.name}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ width: 120, background: '#e2e8f0', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                      <div style={{ width: `${d.score}%`, height: '100%', background: `linear-gradient(90deg,#0d7d62,#1e3a5f)`, borderRadius: 6 }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }}>{d.score}%</span>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ background: c.bg, color: c.color, fontWeight: 800, fontSize: 10, padding: '3px 10px', borderRadius: 20 }}>
                      {d.score >= 85 ? 'ممتاز' : d.score >= 70 ? 'جيد جداً' : d.score >= 55 ? 'جيد' : 'يحتاج دعم'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px', color: '#64748b', fontSize: 11 }}>{d.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Recommendations */}
      <div style={{ marginBottom: 26 }}>
        <SectionHeader title="التوصيات والخطة العلاجية المقترحة" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            'مواصلة جلسات تقوية العضلات الدقيقة مرتين أسبوعياً',
            'تطبيق برنامج تدريب الانتباه المرئي 15 دقيقة يومياً',
            'تعزيز المهارات الرياضية عبر الألعاب التعليمية التفاعلية',
            'إشراك ولي الأمر في تمارين المنزل بشكل أسبوعي',
          ].map((rec, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px' }}>
              <span style={{ color: '#16a34a', fontWeight: 900, fontSize: 16, flexShrink: 0 }}>✓</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1e293b', lineHeight: 1.6 }}>{rec}</span>
            </div>
          ))}
        </div>
      </div>

      <DualSealsBar />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Report 2: الملخص الأسبوعي للفصل
───────────────────────────────────────────── */
function Report2() {
  const students = [
    { name: 'أحمد محمد', attendance: '5/5', hw: '4/5', score: 88, status: 'ممتاز' },
    { name: 'سارة علي', attendance: '4/5', hw: '5/5', score: 92, status: 'ممتاز' },
    { name: 'يوسف حسن', attendance: '3/5', hw: '3/5', score: 70, status: 'جيد جداً' },
    { name: 'نور إبراهيم', attendance: '5/5', hw: '4/5', score: 79, status: 'جيد جداً' },
    { name: 'عمر خالد', attendance: '2/5', hw: '2/5', score: 55, status: 'يحتاج متابعة' },
  ];
  const stats = [
    { label: 'متوسط الحضور', value: '76%', icon: '📅', color: '#0d7d62' },
    { label: 'معدل إنجاز الواجبات', value: '82%', icon: '📝', color: '#1e3a5f' },
    { label: 'متوسط درجات الفصل', value: '76.8%', icon: '📊', color: '#7c3aed' },
    { label: 'عدد الطلاب المميزين', value: '2 طلاب', icon: '🌟', color: '#ca8a04' },
  ];

  return (
    <div dir="rtl" style={{ fontFamily: 'Arial, sans-serif', color: '#0f172a', background: 'white' }}>

      {/* Letterhead */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 20, borderBottom: '3px solid #1e3a5f' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#1e3a5f,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px #1e3a5f30' }}>
            <span style={{ fontSize: 26 }}>🏫</span>
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, color: '#0f172a' }}>د. إسماعيل عيسى</div>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#1e3a5f' }}>استشاري التعليم العلاجي وصعوبات التعلم</div>
            <div style={{ fontWeight: 600, fontSize: 10, color: '#64748b' }}>الفصل الدراسي الأول — الفوج أ</div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#3b82f6)', color: 'white', padding: '8px 22px', borderRadius: 30, fontWeight: 900, fontSize: 13 }}>
            ملخص النشاط الأسبوعي للفصل
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>Weekly Class Activity Summary</div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 3, fontWeight: 700 }}>
            الأسبوع: {new Date().toLocaleDateString('ar-EG', { month: 'long', day: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[{ name: 'مسار', color: '#0d7d62' }, { name: 'نيكسس', color: '#1e3a5f' }].map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12 }}>{p.name === 'مسار' ? '🌟' : '🔷'}</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 11, color: p.color }}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 26 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 13, padding: '14px 16px', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ height: 2, background: 'linear-gradient(90deg,#1e3a5f00,#1e3a5f,#0d7d62,#0d7d6200)', borderRadius: 2, marginBottom: 26 }} />

      {/* Students Table */}
      <div style={{ marginBottom: 26 }}>
        <SectionHeader title="أداء الطلاب هذا الأسبوع" />
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', fontSize: 12 }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg,#1e3a5f,#3b82f6)' }}>
              {['#', 'اسم الطالب', 'الحضور', 'الواجبات', 'الدرجة', 'التقدير'].map(h => (
                <th key={h} style={{ padding: '11px 14px', color: 'white', fontWeight: 800, textAlign: 'right', fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((st, i) => {
              const isGood = st.score >= 80;
              const isWarn = st.score < 65;
              return (
                <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: '#94a3b8', fontSize: 11 }}>{i + 1}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 800, color: '#0f172a', fontSize: 12 }}>{st.name}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: st.attendance.startsWith('5') ? '#16a34a' : '#ca8a04', fontSize: 12 }}>{st.attendance}</td>
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: '#64748b', fontSize: 12 }}>{st.hw}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 4, height: 6 }}>
                        <div style={{ width: `${st.score}%`, height: '100%', background: isWarn ? '#ef4444' : isGood ? '#0d7d62' : '#f59e0b', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800 }}>{st.score}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{
                      background: isWarn ? '#fee2e2' : isGood ? '#dcfce7' : '#fef9c3',
                      color: isWarn ? '#dc2626' : isGood ? '#16a34a' : '#ca8a04',
                      fontWeight: 800, fontSize: 10, padding: '3px 10px', borderRadius: 20,
                    }}>{st.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      <div style={{ marginBottom: 26 }}>
        <SectionHeader title="ملاحظات المعلم والتوصيات" />
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRight: '4px solid #1e3a5f', borderRadius: 12, padding: '16px 20px', fontSize: 12, color: '#334155', lineHeight: 1.8 }}>
          شهد الفصل هذا الأسبوع تحسناً ملحوظاً في معدل إنجاز الواجبات. يُوصى بمتابعة عمر خالد بشكل مكثف نظراً لانخفاض نسبة حضوره وأدائه. تم تطبيق 3 أنشطة تفاعلية جديدة حققت تفاعلاً إيجابياً من الطلاب.
        </div>
      </div>

      <DualSealsBar />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Report 3: تقرير تقدم الخطة الفردية IEP
───────────────────────────────────────────── */
function Report3() {
  const goals = [
    { goal: 'تحسين مهارة القراءة الجهرية', target: '80%', current: 72, sessions: 12, status: 'في تقدم' },
    { goal: 'تطوير التواصل اللفظي الوظيفي', target: '75%', current: 80, sessions: 15, status: 'تحقق ✓' },
    { goal: 'تعزيز الاستقلالية في الرعاية الذاتية', target: '70%', current: 68, sessions: 10, status: 'قريب من الهدف' },
    { goal: 'تنمية المهارات الرياضية الأساسية', target: '75%', current: 60, sessions: 8, status: 'يحتاج دعم' },
  ];

  return (
    <div dir="rtl" style={{ fontFamily: 'Arial, sans-serif', color: '#0f172a', background: 'white' }}>

      {/* Letterhead */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, paddingBottom: 20, borderBottom: '3px solid #7c3aed' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#0d7d62)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px #7c3aed30' }}>
            <span style={{ fontSize: 26 }}>🎯</span>
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18, color: '#0f172a' }}>د. إسماعيل عيسى</div>
            <div style={{ fontWeight: 700, fontSize: 11, color: '#7c3aed' }}>استشاري التعليم العلاجي وصعوبات التعلم</div>
            <div style={{ fontWeight: 600, fontSize: 10, color: '#64748b' }}>الخطة التعليمية الفردية — IEP</div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ background: 'linear-gradient(135deg,#7c3aed,#0d7d62)', color: 'white', padding: '8px 22px', borderRadius: 30, fontWeight: 900, fontSize: 13 }}>
            تقرير تقدم الخطة التعليمية الفردية
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>IEP Progress Tracking Report</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[{ name: 'مسار', color: '#0d7d62' }, { name: 'نيكسس', color: '#1e3a5f' }].map(p => (
            <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 26, height: 26, borderRadius: 7, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12 }}>{p.name === 'مسار' ? '🌟' : '🔷'}</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 11, color: p.color }}>{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Student + Plan Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 26 }}>
        {[
          { label: 'اسم الطالب', value: 'أحمد محمد علي', bg: '#faf5ff', border: '#e9d5ff', lc: '#7c3aed' },
          { label: 'رقم الخطة', value: 'IEP-2026-0042', bg: '#f0fdf4', border: '#86efac', lc: '#16a34a' },
          { label: 'بداية الخطة', value: 'يناير 2026', bg: '#eff6ff', border: '#93c5fd', lc: '#1d4ed8' },
          { label: 'المراجعة القادمة', value: 'سبتمبر 2026', bg: '#fefce8', border: '#fde047', lc: '#ca8a04' },
        ].map((c, i) => (
          <div key={i} style={{ background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, color: c.lc, fontWeight: 800, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{c.label}</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ height: 2, background: 'linear-gradient(90deg,#7c3aed00,#7c3aed,#0d7d62,#0d7d6200)', borderRadius: 2, marginBottom: 26 }} />

      {/* Goals Table */}
      <div style={{ marginBottom: 26 }}>
        <SectionHeader title="أهداف الخطة الفردية ومستوى التقدم" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {goals.map((g, i) => {
            const pct = g.current;
            const achieved = g.current >= parseInt(g.target);
            const color = achieved ? '#16a34a' : pct >= 65 ? '#ca8a04' : '#dc2626';
            return (
              <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 13, padding: '16px 20px', borderRight: `4px solid ${color}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 13, color: '#0f172a', marginBottom: 2 }}>
                      {i + 1}. {g.goal}
                    </div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>
                      عدد الجلسات المنجزة: <strong>{g.sessions} جلسة</strong> | الهدف المستهدف: <strong>{g.target}</strong>
                    </div>
                  </div>
                  <span style={{ background: achieved ? '#dcfce7' : pct >= 65 ? '#fef9c3' : '#fee2e2', color, fontWeight: 800, fontSize: 10, padding: '4px 12px', borderRadius: 20, flexShrink: 0 }}>
                    {g.status}
                  </span>
                </div>
                {/* Progress Bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 8, height: 12, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg, ${color}, ${color}90)`, borderRadius: 8, transition: 'width 0.6s' }} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 900, color, minWidth: 36 }}>{pct}%</span>
                  <span style={{ fontSize: 10, color: '#94a3b8' }}>/ {g.target}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overall Progress Summary */}
      <div style={{ marginBottom: 26 }}>
        <SectionHeader title="ملخص التقدم الإجمالي" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
          <div style={{ background: '#dcfce7', border: '1.5px solid #86efac', borderRadius: 13, padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#16a34a' }}>1</div>
            <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>هدف تحقق بالكامل</div>
          </div>
          <div style={{ background: '#fef9c3', border: '1.5px solid #fde047', borderRadius: 13, padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#ca8a04' }}>2</div>
            <div style={{ fontSize: 11, color: '#ca8a04', fontWeight: 700 }}>هدفان في تقدم جيد</div>
          </div>
          <div style={{ background: '#fee2e2', border: '1.5px solid #fca5a5', borderRadius: 13, padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#dc2626' }}>1</div>
            <div style={{ fontSize: 11, color: '#dc2626', fontWeight: 700 }}>هدف يحتاج تكثيف</div>
          </div>
        </div>
      </div>

      <DualSealsBar />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
const TABS = [
  { id: 'report1', icon: '👤', label: 'تقرير أداء الطالب الفردي', sub: 'Individual Performance Report' },
  { id: 'report2', icon: '📊', label: 'الملخص الأسبوعي للفصل', sub: 'Weekly Class Summary' },
  { id: 'report3', icon: '🎯', label: 'تقرير الخطة الفردية IEP', sub: 'IEP Progress Report' },
];

export default function ReportsPreviewPage() {
  const [active, setActive] = useState<'report1' | 'report2' | 'report3'>('report1');

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 md:p-8" dir="rtl">

          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3 text-sm opacity-60">
              <Link href="/reports" className="hover:opacity-100 transition-opacity">التقارير</Link>
              <span>›</span>
              <span style={{ color: 'var(--primary)' }} className="font-bold opacity-100">معاينة التقارير الرسمية</span>
            </div>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-black mb-1" style={{ color: 'var(--foreground)' }}>
                  📋 بروفة التقارير الرسمية المعتمدة
                </h1>
                <p className="text-sm opacity-60">معاينة التقارير مختومة إلكترونياً بختم منصتَي <strong>مسار</strong> و<strong>نيكسس</strong></p>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105 hover:shadow-lg print:hidden"
                style={{ background: 'linear-gradient(135deg, #0d7d62, #1e3a5f)' }}
              >
                <Printer size={18} />
                طباعة / PDF
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 print:hidden">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id as 'report1' | 'report2' | 'report3')}
                className="p-5 rounded-2xl text-right transition-all duration-300 hover:scale-[1.02]"
                style={{
                  background: active === tab.id
                    ? 'linear-gradient(135deg, #0d7d62, #1e3a5f)'
                    : 'var(--card-bg)',
                  color: active === tab.id ? 'white' : 'var(--foreground)',
                  border: active === tab.id ? '2px solid transparent' : '2px solid var(--border)',
                  boxShadow: active === tab.id ? '0 8px 32px rgba(13,125,98,0.35)' : '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div className="text-3xl mb-2">{tab.icon}</div>
                <div className="font-black text-base mb-1">{tab.label}</div>
                <div className="text-xs opacity-70">{tab.sub}</div>
              </button>
            ))}
          </div>

          {/* Report Preview Card */}
          <div
            className="rounded-3xl overflow-hidden print:shadow-none print:rounded-none"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
            }}
          >
            {/* Preview bar */}
            <div
              className="flex items-center justify-between px-6 py-3 print:hidden"
              style={{ background: 'var(--sidebar-bg)', borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="mr-2 text-xs opacity-50 font-mono">preview — official-report.pdf</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: '#dcfce7', color: '#16a34a' }}>
                  ✓ مختوم إلكترونياً — مسار × نيكسس
                </span>
              </div>
            </div>

            {/* White paper simulation */}
            <div className="p-6 md:p-10 print:p-0">
              <div
                className="rounded-2xl print:rounded-none print:shadow-none"
                style={{
                  background: 'white',
                  boxShadow: '0 4px 40px rgba(0,0,0,0.12)',
                  padding: '40px 48px',
                }}
              >
                {active === 'report1' && <Report1 />}
                {active === 'report2' && <Report2 />}
                {active === 'report3' && <Report3 />}
              </div>
            </div>
          </div>

        </main>
      </div>

      <style jsx global>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
