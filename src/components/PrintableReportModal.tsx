'use client';

import { useEffect } from 'react';
import { Printer, X, Award, FileCheck } from 'lucide-react';
import type { ReportRecord } from '@/lib/localDb';

// ── Hijri date helper ──────────────────────────────────────────
function getTodayHijri(): string {
  try {
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  } catch {
    return new Date().toLocaleDateString('ar-SA');
  }
}

export default function PrintableReportModal({
  report,
  onClose,
}: {
  report: ReportRecord;
  onClose: () => void;
}) {
  const hijriDate = getTodayHijri();
  const fileNumber = `MASAR-${(report.id || '').slice(-6).toUpperCase() || 'REPORT'}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    const timer = setTimeout(() => handlePrint(), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = () => {
    /* ── Build domains table rows ── */
    const domainsRows =
      Array.isArray(report.domains) && report.domains.length > 0
        ? report.domains
            .map(
              (d, i) => `
          <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
            <td style="padding:9px 14px;font-weight:900;color:#0f172a;font-size:12px;border-bottom:1px solid #e2e8f0">${d.name || ''}</td>
            <td style="padding:9px 14px;font-weight:900;color:#4338ca;font-size:13px;text-align:center;border-bottom:1px solid #e2e8f0">${d.score ?? 0}%</td>
            <td style="padding:9px 14px;font-weight:700;color:#475569;font-size:11px;border-bottom:1px solid #e2e8f0">${d.note || '—'}</td>
          </tr>`,
            )
            .join('')
        : `<tr><td colspan="3" style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">لا توجد بيانات مجالات</td></tr>`;

    /* ── Build recommendations list ── */
    const recsHTML =
      Array.isArray(report.recommendations) && report.recommendations.length > 0
        ? report.recommendations
            .map(
              (rec) => `
          <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
            <span style="color:#f59e0b;font-size:18px;line-height:1;flex-shrink:0;margin-top:-2px">✓</span>
            <span style="font-size:12px;font-weight:700;color:#1e293b;line-height:1.8">${rec}</span>
          </div>`,
            )
            .join('')
        : '<p style="color:#94a3b8;font-size:12px;margin:0">لا توجد توصيات</p>';

    /* ══════════════════════════════════════════════════════
       FULL A4 HTML DOCUMENT — pixel-perfect print layout
    ══════════════════════════════════════════════════════ */
    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>تقرير ${report.studentName || 'الطالب'} — منصة مسار</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;700;800;900&display=swap" rel="stylesheet">
  <style>
    /* ── Reset ── */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Cairo', Arial, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    html, body {
      background: #cbd5e1;
      color: #0f172a;
      direction: rtl;
    }

    /* ── Print page setup ── */
    @page {
      size: A4 portrait;
      margin: 0;
    }

    @media print {
      html, body { background: #ffffff !important; }
      .no-print { display: none !important; }
      .page-shell {
        box-shadow: none !important;
        border-radius: 0 !important;
        margin: 0 !important;
        width: 210mm !important;
        max-width: 210mm !important;
        padding: 8mm !important;
      }
      .document {
        border-radius: 0 !important;
      }
    }

    /* ── Screen outer padding ── */
    .screen-outer {
      padding: 32px 24px;
      min-height: 100vh;
    }

    /* ── Page shell: the gray border/mat around the white doc ── */
    .page-shell {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      background: #e2e8f0;
      padding: 10px;
      border-radius: 18px;
      box-shadow: 0 24px 64px rgba(0,0,0,0.28), 0 4px 16px rgba(0,0,0,0.12);
    }

    /* ── White A4 document ── */
    .document {
      position: relative;
      background: #ffffff;
      border: 3px solid #0f172a;
      border-radius: 12px;
    }

    /* ── Decorative gold corner brackets ── */
    .corner {
      position: absolute;
      width: 22px;
      height: 22px;
      z-index: 5;
    }
    .c-tr { top: 10px; right: 10px; border-top: 2.5px solid #f59e0b; border-right: 2.5px solid #f59e0b; }
    .c-tl { top: 10px; left: 10px;  border-top: 2.5px solid #f59e0b; border-left: 2.5px solid #f59e0b; }
    .c-br { bottom: 10px; right: 10px; border-bottom: 2.5px solid #f59e0b; border-right: 2.5px solid #f59e0b; }
    .c-bl { bottom: 10px; left: 10px;  border-bottom: 2.5px solid #f59e0b; border-left: 2.5px solid #f59e0b; }

    /* ── Gold gradient stripes ── */
    .stripe {
      height: 9px;
      background: linear-gradient(to right, #92400e, #d97706, #fbbf24, #f59e0b, #fbbf24, #d97706, #92400e);
    }
    .stripe-top  { border-radius: 10px 10px 0 0; }
    .stripe-bot  { border-radius: 0 0 10px 10px; }

    /* ── Document body padding ── */
    .body { padding: 28px 34px 24px 34px; }

    /* ═══ HEADER ═══ */
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 20px;
      border-bottom: 3px solid #fbbf24;
    }
    /* File badge */
    .file-badge {
      background: #1e1b4b;
      color: #fff;
      padding: 10px 16px;
      border-radius: 10px;
      text-align: center;
      min-width: 130px;
    }
    .file-badge-lbl { font-size: 9px; font-weight: 900; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.12em; }
    .file-badge-no  { font-size: 15px; font-weight: 900; letter-spacing: 0.08em; margin-top: 3px; }
    .file-badge-dt  { font-size: 10px; font-weight: 700; color: #94a3b8; margin-top: 5px; text-align: center; }
    /* Center brand */
    .brand       { text-align: center; flex: 1; }
    .brand-title { font-size: 26px; font-weight: 900; color: #1e1b4b; letter-spacing: -0.5px; }
    .brand-sub   { font-size: 12px; font-weight: 900; color: #1d4ed8; margin-top: 3px; }
    .brand-fnd   { font-size: 10px; font-weight: 700; color: #64748b; margin-top: 2px; }
    /* Logo box */
    .logo-box    { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .logo-img    { width: 62px; height: 62px; object-fit: contain; border-radius: 12px; border: 2px solid #1e1b4b; padding: 4px; }
    .logo-lbl    { font-size: 8px; font-weight: 900; color: #4338ca; text-transform: uppercase; letter-spacing: 0.1em; }

    /* ═══ TITLE STRIP ═══ */
    .title-strip {
      margin: 18px 0;
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
      border-radius: 12px;
      padding: 14px 20px;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-top: 2px solid #fbbf24;
      border-bottom: 2px solid #fbbf24;
    }
    .ts-lbl { font-size: 9px; font-weight: 900; color: #fcd34d; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 5px; }
    .ts-h   { font-size: 17px; font-weight: 900; color: #fff; }
    .ts-badge {
      display: flex; align-items: center; gap: 6px;
      background: rgba(251,191,36,0.15);
      border: 1px solid rgba(251,191,36,0.4);
      border-radius: 8px;
      padding: 6px 14px;
      font-size: 10px; font-weight: 900; color: #fcd34d;
      white-space: nowrap; flex-shrink: 0;
    }

    /* ═══ INFO GRID 3×2 ═══ */
    .section-label {
      font-size: 9px; font-weight: 900; color: #64748b;
      text-transform: uppercase; letter-spacing: 0.1em;
      text-align: center; margin-bottom: 8px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 18px;
    }
    .info-cell {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px;
    }
    .ic-lbl { font-size: 9px; font-weight: 900; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.06em; }
    .ic-val { font-size: 14px; font-weight: 900; color: #0f172a; margin-top: 5px; line-height: 1.3; }

    /* ═══ SECTION HEADING ═══ */
    .sec-h {
      font-size: 11px; font-weight: 900; color: #0f172a;
      text-transform: uppercase; letter-spacing: 0.1em;
      border-right: 4px solid #f59e0b;
      padding-right: 10px;
      margin-bottom: 10px;
    }

    /* ═══ SUMMARY ═══ */
    .summary {
      background: #fefce8;
      border: 1.5px solid #fde68a;
      border-radius: 12px;
      padding: 16px;
      font-size: 12px; font-weight: 700; color: #1e293b;
      line-height: 1.9;
      margin-bottom: 18px;
    }

    /* ═══ TABLE ═══ */
    .table-wrap { margin-bottom: 18px; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
    thead { background: #0f172a; }
    thead th { padding: 11px 14px; font-size: 11px; font-weight: 900; color: #fbbf24; text-align: right; }

    /* ═══ RECOMMENDATIONS ═══ */
    .rec-box {
      background: #f8fafc; border: 1px solid #e2e8f0;
      border-radius: 12px; padding: 16px; margin-bottom: 18px;
    }

    /* ═══ FOOTER ═══ */
    .footer {
      margin-top: 22px;
      padding-top: 18px;
      border-top: 2.5px solid #fbbf24;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .footer-left { display: flex; align-items: center; gap: 10px; }
    .footer-icon { font-size: 30px; }
    .footer-main { font-size: 12px; font-weight: 900; color: #1e293b; }
    .footer-sub  { font-size: 9px; color: #94a3b8; margin-top: 2px; }
    .footer-right { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }

    /* Stamp */
    .stamp-wrap { display: flex; flex-direction: column; align-items: center; gap: 3px; }
    .stamp-lbl  { font-size: 8px; font-weight: 900; color: #047857; }

    /* Sig block */
    .sig-block {
      border: 1.5px solid #06392c;
      background: #f0fdf4;
      border-radius: 14px;
      padding: 10px 16px;
      display: flex; flex-direction: column; align-items: center; gap: 3px;
      min-width: 165px; text-align: center;
    }
    .sig-lbl   { font-size: 9px; font-weight: 900; color: #047857; }
    .sig-img   { height: 50px; width: 155px; object-fit: contain; mix-blend-mode: multiply; }
    .sig-line  { border-bottom: 1.5px solid #06392c; width: 100%; margin: 3px 0; }
    .sig-name  { font-size: 13px; font-weight: 900; color: #06392c; }
    .sig-title { font-size: 9px; color: #047857; }
    .sig-date  { font-size: 10px; font-weight: 900; color: #0f172a; font-family: monospace; }
  </style>
</head>
<body>
<div class="screen-outer">
<div class="page-shell">
<div class="document">

  <!-- Corner brackets -->
  <div class="corner c-tr"></div>
  <div class="corner c-tl"></div>
  <div class="corner c-br"></div>
  <div class="corner c-bl"></div>

  <!-- Top gold stripe -->
  <div class="stripe stripe-top"></div>

  <div class="body">

    <!-- ═══ HEADER ═══ -->
    <div class="header">
      <!-- Right: file badge -->
      <div>
        <div class="file-badge">
          <div class="file-badge-lbl">رقم الملف</div>
          <div class="file-badge-no">${fileNumber}</div>
        </div>
        <div class="file-badge-dt">${report.date || hijriDate}</div>
      </div>

      <!-- Center: brand -->
      <div class="brand">
        <div class="brand-title">مَسَار · MASAR</div>
        <div class="brand-sub">منصة التأهيل والتعليم الذكي لصعوبات التعلم</div>
        <div class="brand-fnd">مؤسس المنصة: د. إسماعيل عيسى — استشاري التربية الخاصة وتأهيل صعوبات التعلم</div>
      </div>

      <!-- Left: logo -->
      <div class="logo-box">
        <img src="${origin}/brand/masar-logo.png" alt="منصة مسار" class="logo-img" onerror="this.style.display='none'"/>
        <div class="logo-lbl">وثيقة معتمدة</div>
      </div>
    </div>

    <!-- ═══ TITLE STRIP ═══ -->
    <div class="title-strip">
      <div>
        <div class="ts-lbl">وثيقة تعليمية علاجية معتمدة · OFFICIAL ASSESSMENT REPORT</div>
        <div class="ts-h">${report.program || 'تقرير التقييم الشامل والتحليلي'}</div>
      </div>
      <div class="ts-badge">✦ مستند رسمي معتمد</div>
    </div>

    <!-- ═══ STUDENT INFO GRID ═══ -->
    <div class="section-label">بيانات الطالب والتقرير</div>
    <div class="info-grid">
      <div class="info-cell">
        <div class="ic-lbl">اسم الطالب</div>
        <div class="ic-val">${report.studentName || '—'}</div>
      </div>
      <div class="info-cell">
        <div class="ic-lbl">الصف الدراسي</div>
        <div class="ic-val">${report.grade || '—'}</div>
      </div>
      <div class="info-cell">
        <div class="ic-lbl">نسبة الأداء الكلي</div>
        <div class="ic-val" style="color:#4338ca">${report.score ?? 0}%</div>
      </div>
      <div class="info-cell">
        <div class="ic-lbl">تاريخ التقرير</div>
        <div class="ic-val">${report.date || '—'}</div>
      </div>
      <div class="info-cell">
        <div class="ic-lbl">البرنامج</div>
        <div class="ic-val" style="font-size:12px">${report.program || '—'}</div>
      </div>
      <div class="info-cell">
        <div class="ic-lbl">حالة التقرير</div>
        <div class="ic-val" style="color:#15803d">${report.status === 'completed' ? 'مكتمل ومعتمد ✓' : 'قيد المراجعة'}</div>
      </div>
    </div>

    <!-- ═══ SUMMARY ═══ -->
    <div class="sec-h">الخلاصة والتشخيص المعتمد</div>
    <div class="summary">${report.summary || 'لا توجد خلاصة متاحة لهذا التقرير.'}</div>

    ${
      Array.isArray(report.domains) && report.domains.length > 0
        ? `<!-- ═══ DOMAINS TABLE ═══ -->
    <div class="sec-h">تفاصيل المهارات والمجالات النمائية</div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>المجال / المهارة</th>
            <th style="text-align:center">نسبة الأداء</th>
            <th>ملاحظة الأخصائي</th>
          </tr>
        </thead>
        <tbody>${domainsRows}</tbody>
      </table>
    </div>`
        : ''
    }

    ${
      Array.isArray(report.recommendations) && report.recommendations.length > 0
        ? `<!-- ═══ RECOMMENDATIONS ═══ -->
    <div class="sec-h">التوصيات والخطة العلاجية المقترحة</div>
    <div class="rec-box">${recsHTML}</div>`
        : ''
    }

    <!-- ═══ FOOTER ═══ -->
    <div class="footer">
      <!-- Left info -->
      <div class="footer-left">
        <div class="footer-icon">🛡️</div>
        <div>
          <div class="footer-main">وثيقة إشرافية موثقة — ${fileNumber}</div>
          <div class="footer-sub">منصة مَسَار التعليمية · جميع الحقوق محفوظة</div>
        </div>
      </div>

      <!-- Right: stamp + signature -->
      <div class="footer-right">

        <!-- Official circular stamp SVG -->
        <div class="stamp-wrap">
          <svg xmlns="http://www.w3.org/2000/svg" width="104" height="104" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="76" fill="none" stroke="#06392c" stroke-width="2.5"/>
            <circle cx="80" cy="80" r="68" fill="white" stroke="#06392c" stroke-width="1.2"/>
            <text x="80" y="34" text-anchor="middle" font-family="Cairo,Arial" font-size="6.5" font-weight="bold" fill="#06392c">الختم الرسمي المعتمد</text>
            <text x="80" y="49" text-anchor="middle" font-family="Cairo,Arial" font-size="10" font-weight="900" fill="#06392c">د. إسماعيل عيسى</text>
            <line x1="22" y1="60" x2="138" y2="60" stroke="#06392c" stroke-width="0.8"/>
            <image href="${origin}/dr-ismail-signature.png" x="22" y="62" width="116" height="36" preserveAspectRatio="xMidYMid meet" style="mix-blend-mode:multiply"/>
            <line x1="22" y1="100" x2="138" y2="100" stroke="#06392c" stroke-width="0.8"/>
            <text x="80" y="113" text-anchor="middle" font-family="Cairo,Arial" font-size="7" font-weight="900" fill="#06392c">${hijriDate}</text>
            <text x="80" y="125" text-anchor="middle" font-family="Cairo,Arial" font-size="5" font-weight="bold" fill="#06392c">منصة مسار · التعليم العلاجي</text>
            <text x="80" y="135" text-anchor="middle" font-family="Cairo,Arial" font-size="5" fill="#06392c">${fileNumber}</text>
          </svg>
          <div class="stamp-lbl">الختم الرقمي المعتمد</div>
        </div>

        <!-- Doctor signature block -->
        <div class="sig-block">
          <div class="sig-lbl">التوقيع والختم المعتمد ✍️</div>
          <img src="${origin}/dr-ismail-signature.png" alt="توقيع د. إسماعيل عيسى" class="sig-img"/>
          <div class="sig-line"></div>
          <div class="sig-name">د. إسماعيل عيسى</div>
          <div class="sig-title">استشاري التربية الخاصة وتأهيل صعوبات التعلم</div>
          <div class="sig-date">${hijriDate}</div>
        </div>

      </div>
    </div>

  </div><!-- /body -->

  <!-- Bottom gold stripe -->
  <div class="stripe stripe-bot"></div>

</div><!-- /document -->
</div><!-- /page-shell -->
</div><!-- /screen-outer -->

<script>
  window.onload = function() {
    setTimeout(function() { window.print(); window.close(); }, 800);
  };
</script>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=920,height=1200');
    if (!win) {
      window.print();
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4 sm:p-8 backdrop-blur-sm grid place-items-center"
      dir="rtl"
    >
      <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden border-4 border-slate-950 ring-4 ring-amber-400/30">
        {/* Toolbar */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2">
            <Award className="text-amber-400" size={20} />
            <span className="font-black text-sm">التقرير الرسمي المعتمد — جاهز للطباعة</span>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info card */}
        <div className="p-6 bg-slate-50 text-center">
          <div className="flex items-center justify-center gap-2 text-slate-700 mb-3">
            <FileCheck size={20} className="text-emerald-600" />
            <span className="font-black text-sm">سيُفتح التقرير في نافذة طباعة منفصلة</span>
          </div>
          <p className="text-xs text-slate-500 leading-6 max-w-xs mx-auto">
            اختر <strong>Save as PDF</strong> من وجهة الطباعة لتصدير ملف PDF احترافي.
            <br />
            فعّل <strong>Background graphics</strong> لظهور الألوان والإطار الذهبي.
          </p>
          <button
            onClick={handlePrint}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-950 hover:bg-indigo-900 px-6 py-3 text-sm font-black text-white transition shadow-md cursor-pointer"
          >
            <Printer size={18} /> فتح / إعادة فتح نافذة الطباعة
          </button>
        </div>
      </div>
    </div>
  );
}
