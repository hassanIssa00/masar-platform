'use client';

import { useEffect } from 'react';
import { Printer, X, Award, FileCheck } from 'lucide-react';
import type { ReportRecord } from '@/lib/localDb';

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
    const reportScore = typeof report.score === 'number' ? report.score : 0;
    const domainsList = Array.isArray(report.domains) ? report.domains : [];
    const recommendationsList = Array.isArray(report.recommendations) ? report.recommendations : [];
    const answersList = Array.isArray(report.answers) ? report.answers : [];

    const homeRecommendations = recommendationsList.slice(0, 3);
    const schoolRecommendations =
      recommendationsList.slice(3, 6).length > 0
        ? recommendationsList.slice(3, 6)
        : recommendationsList.slice(0, 3);

    const domainsRows =
      domainsList.length > 0
        ? domainsList
            .map(
              (d, i) => `
          <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
            <td style="padding:8px 12px;font-weight:900;color:#0f172a;font-size:11px;border-bottom:1px solid #e2e8f0">${d.name || ''}</td>
            <td style="padding:8px 12px;font-weight:900;color:#047857;font-size:12px;text-align:center;border-bottom:1px solid #e2e8f0">${d.score ?? 0}%</td>
            <td style="padding:8px 12px;font-weight:700;color:#475569;font-size:10.5px;border-bottom:1px solid #e2e8f0">${d.note || 'أداء يتماشى مع الخطة التأهيلية'}</td>
          </tr>`,
            )
            .join('')
        : `<tr><td colspan="3" style="padding:12px;text-align:center;color:#94a3b8;font-size:11px">تم تقييم المجالات العامة بنجاح</td></tr>`;

    const iepRows = domainsList.slice(0, 4).map(
      (d, i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
        <td style="padding:8px 12px;font-weight:900;color:#06392c;font-size:11px;border-bottom:1px solid #e2e8f0">${d.name}</td>
        <td style="padding:8px 12px;font-weight:700;color:#1e293b;font-size:10.5px;border-bottom:1px solid #e2e8f0">تحسين المهارات التأسيسية وتطبيق الاستراتيجيات الموصى بها</td>
        <td style="padding:8px 12px;font-weight:900;color:#64748b;font-size:10px;font-family:monospace;border-bottom:1px solid #e2e8f0">دقة 80% · 30 يوماً</td>
      </tr>`,
    ).join('');

    const answersRows = answersList.slice(0, 12).map(
      (ans, i) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
        <td style="padding:7px 10px;font-weight:900;font-family:monospace;text-align:center;border-bottom:1px solid #e2e8f0">${i + 1}</td>
        <td style="padding:7px 10px;font-weight:700;color:#1e293b;font-size:10.5px;border-bottom:1px solid #e2e8f0">${ans.question}</td>
        <td style="padding:7px 10px;font-weight:900;color:#06392c;font-size:11px;border-bottom:1px solid #e2e8f0">${ans.answer}</td>
      </tr>`,
    ).join('');

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>تقرير ${report.studentName || 'الطالب'} — منصة مسار</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
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
    @page {
      size: A4 portrait;
      margin: 0 !important;
    }
    @media print {
      html, body { background: #ffffff !important; margin: 0 !important; padding: 0 !important; }
      .no-print { display: none !important; }
      .report-document-wrap { padding: 0 !important; background: transparent !important; }
    }
    .report-document-wrap {
      padding: 24px 0;
    }
    .print-page {
      width: 210mm;
      min-height: 297mm;
      height: 297mm;
      margin: 0 auto 20px auto;
      background: #ffffff;
      padding: 12mm 15mm 12mm 15mm;
      box-sizing: border-box;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 3px double #06392c;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    @media print {
      .print-page {
        margin: 0 !important;
        box-shadow: none !important;
        border: 3px double #06392c !important;
        height: 297mm !important;
        page-break-after: always !important;
        break-after: page !important;
      }
    }
    .header {
      display: flex; align-items: center; justify-content: space-between;
      border-bottom: 2px solid #06392c; padding-bottom: 8px; margin-bottom: 12px;
    }
    .logo { font-size: 18px; font-weight: 900; color: #06392c; }
    .sublogo { font-size: 9.5px; font-weight: 700; color: #475569; }
    .serial { font-size: 10px; font-weight: 900; font-family: monospace; color: #0f172a; }
    .banner {
      background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px;
      padding: 10px 16px; text-align: center; margin-bottom: 12px;
    }
    .banner h1 { font-size: 16px; font-weight: 900; color: #06392c; }
    .banner p { font-size: 10px; font-weight: 700; color: #047857; margin-top: 2px; }
    .info-grid {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 12px;
    }
    .info-item {
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
      padding: 8px 12px; display: flex; justify-content: space-between; font-size: 10.5px;
    }
    .info-lbl { color: #64748b; font-weight: 700; }
    .info-val { color: #0f172a; font-weight: 900; }
    .score-card {
      border: 2px solid #047857; background: #ecfdf5; border-radius: 12px;
      padding: 12px 16px; margin-bottom: 12px;
    }
    .score-num { font-size: 32px; font-weight: 900; color: #047857; font-family: monospace; }
    .sec-head {
      font-size: 12px; font-weight: 900; color: #06392c;
      border-right: 4px solid #d97706; padding-right: 8px; margin-bottom: 8px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px; }
    th { background: #06392c; color: #ffffff; padding: 6px 10px; text-align: right; font-weight: 900; }
    td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
    .footer {
      display: flex; justify-content: space-between; align-items: center;
      border-top: 1.5px solid #06392c; padding-top: 6px; margin-top: auto;
      font-size: 8.5px; font-weight: 800; color: #64748b;
    }
    .stamp-box { text-align: center; }
    .sig-box {
      border: 1.5px solid #06392c; background: #ffffff; border-radius: 12px;
      padding: 8px 16px; text-align: center; min-width: 180px;
    }
    .sig-img { height: 48px; object-fit: contain; mix-blend-mode: multiply; }
  </style>
</head>
<body>
  <div class="no-print" style="padding: 16px; text-align: center; background: #06392c; color: white;">
    <button onclick="window.print()" style="background: #f59e0b; color: #0f172a; font-weight: 900; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-size: 14px;">
      🖨️ طباعة التقرير PDF الآن
    </button>
  </div>

  <div class="report-document-wrap">
    <!-- PAGE 1: COVER & IDENTITY -->
    <section class="print-page">
      <div>
        <div class="header">
          <div>
            <span class="logo">مَسَار</span>
            <span class="sublogo">منصة التأهيل الذكي والتعليم التفاعلي</span>
          </div>
          <div class="serial">${fileNumber}</div>
        </div>

        <div class="banner">
          <h1>تقرير التقييم الشامل وخطة التأهيل الفردية</h1>
          <p>مدرسة الإخلاص بجدة · قسم التربية الخاصة والتأهيل النمائي</p>
        </div>

        <div class="info-grid">
          <div class="info-item"><span class="info-lbl">اسم الطالب:</span><span class="info-val">${report.studentName || '—'}</span></div>
          <div class="info-item"><span class="info-lbl">الصف الدراسي:</span><span class="info-val">${report.grade || 'الأول الابتدائي'}</span></div>
          <div class="info-item"><span class="info-lbl">رقم الملف:</span><span class="info-val">${fileNumber}</span></div>
          <div class="info-item"><span class="info-lbl">تاريخ التقرير:</span><span class="info-val">${report.date || hijriDate}</span></div>
          <div class="info-item"><span class="info-lbl">البرنامج العلاجي:</span><span class="info-val">${report.program || 'برنامج التأهيل الشامل'}</span></div>
          <div class="info-item"><span class="info-lbl">الاستشاري المشرف:</span><span class="info-val">د. إسماعيل عيسى</span></div>
        </div>

        <div class="score-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 11px; font-weight: 900; color: #047857;">نتيجة التقييم الإجمالية</div>
              <div class="score-num">${reportScore}%</div>
            </div>
            <div style="font-size: 11px; font-weight: 800; color: #1e293b; max-width: 320px; line-height: 1.6;">
              ${report.summary || 'أظهر الطالب مؤشرات أداء إيجابية مع حاجته لمتابعة الجلسات التأهيلية بانتظام لتطوير مهارات القراءة والتركيز.'}
            </div>
          </div>
        </div>

        <div style="background: #ffffff; border: 1.5px solid #06392c; border-radius: 10px; padding: 10px 14px; margin-top: 10px;">
          <div style="font-size: 11px; font-weight: 900; color: #06392c; margin-bottom: 4px;">القرار الإكلينيكي المعتمد:</div>
          <div style="font-size: 10.5px; font-weight: 700; color: #1e293b; line-height: 1.6;">
            بدء تطبيق خطة التدخل العلاجي الخاصة بـ <strong>${report.program || 'برنامج التأهيل الشامل'}</strong> وتوثيق نسبة التطور بشكل شهري.
          </div>
        </div>
      </div>

      <div class="footer">
        <span>منصة مَسَار للتأهيل والتعليم الذكي · جميع الحقوق محفوظة</span>
        <span>صفحة 1 من 3</span>
      </div>
    </section>

    <!-- PAGE 2: DOMAINS & IEP -->
    <section class="print-page">
      <div>
        <div class="header">
          <div><span class="logo">مَسَار</span> <span class="sublogo">تحليل المجالات والخطط الفردية</span></div>
          <div class="serial">${fileNumber}</div>
        </div>

        <div class="sec-head">1. نتائج تحليل المجالات النمائية والأكاديمية</div>
        <table>
          <thead>
            <tr>
              <th style="width: 35%;">المجال</th>
              <th style="width: 25%; text-align: center;">النسبة المئوية</th>
              <th style="width: 40%;">التقييم والملاحظات</th>
            </tr>
          </thead>
          <tbody>
            ${domainsRows}
          </tbody>
        </table>

        <div class="sec-head" style="margin-top: 14px;">2. أهداف خطة التربية الفردية التفصيلية (IEP)</div>
        <table>
          <thead>
            <tr>
              <th style="width: 30%;">المجال</th>
              <th style="width: 45%;">الهدف التعليمي</th>
              <th style="width: 25%;">معيار الإتقان</th>
            </tr>
          </thead>
          <tbody>
            ${iepRows.length > 0 ? iepRows : `<tr><td colspan="3" style="text-align: center; padding: 10px; color: #94a3b8;">تم تحديد الأهداف الأساسية للخطة</td></tr>`}
          </tbody>
        </table>

        <div class="sec-head" style="margin-top: 14px;">3. توصيات المنزل والمدرسة</div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 10px;">
            <div style="font-size: 10.5px; font-weight: 900; color: #92400e; margin-bottom: 6px;">🏡 توصيات المنزل:</div>
            <ul style="font-size: 9.5px; color: #78350f; font-weight: 700; padding-right: 12px; margin: 0;">
              ${homeRecommendations.map((r) => `<li style="margin-bottom: 4px;">• ${r}</li>`).join('')}
            </ul>
          </div>
          <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px;">
            <div style="font-size: 10.5px; font-weight: 900; color: #1e40af; margin-bottom: 6px;">🏫 توصيات المدرسة:</div>
            <ul style="font-size: 9.5px; color: #1e3a8a; font-weight: 700; padding-right: 12px; margin: 0;">
              ${schoolRecommendations.map((r) => `<li style="margin-bottom: 4px;">• ${r}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>

      <div class="footer">
        <span>منصة مَسَار للتأهيل والتعليم الذكي · جميع الحقوق محفوظة</span>
        <span>صفحة 2 من 3</span>
      </div>
    </section>

    <!-- PAGE 3: DETAILED ANSWERS & SIGNATURE -->
    <section class="print-page">
      <div>
        <div class="header">
          <div><span class="logo">مَسَار</span> <span class="sublogo">الإعتماد الرسمي والختم</span></div>
          <div class="serial">${fileNumber}</div>
        </div>

        ${
          answersRows.length > 0
            ? `
        <div class="sec-head">4. سجل الإجابات التفصيلية المحفوظة</div>
        <table>
          <thead>
            <tr>
              <th style="width: 8%;">#</th>
              <th style="width: 52%;">السؤال المستهدف</th>
              <th style="width: 40%;">استجابة الطالب المحفوظة</th>
            </tr>
          </thead>
          <tbody>
            ${answersRows}
          </tbody>
        </table>`
            : ''
        }

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-top: 14px;">
          <p style="font-size: 9.5px; color: #475569; font-weight: 700; line-height: 1.6; margin: 0;">
            وثيقة إشرافية معتمدة رسمياً ومستخرجة إلكترونياً من منصة مَسَار بمدرسة الإخلاص بجدة تحت إشراف وتوقيع استشاري التربية الخاصة وتأهيل صعوبات التعلم.
          </p>
        </div>
      </div>

      <div>
        <div style="display: flex; align-items: flex-end; justify-content: space-between; border-top: 1.5px solid #06392c; padding-top: 10px; margin-top: 20px;">
          <!-- STAMP -->
          <div class="stamp-box">
            <svg xmlns="http://www.w3.org/2000/svg" width="104" height="104" viewBox="0 0 160 160">
              <circle cx="80" cy="80" r="76" fill="none" stroke="#06392c" stroke-width="2.5"/>
              <circle cx="80" cy="80" r="68" fill="white" stroke="#06392c" stroke-width="1.2"/>
              <text x="80" y="34" text-anchor="middle" font-family="Cairo,Arial" font-size="6.5" font-weight="bold" fill="#06392c">الختم الرسمي المعتمد</text>
              <text x="80" y="49" text-anchor="middle" font-family="Cairo,Arial" font-size="10" font-weight="900" fill="#06392c">د. إسماعيل عيسى</text>
              <line x1="22" y1="60" x2="138" y2="60" stroke="#06392c" stroke-width="0.8"/>
              <defs>
                <clipPath id="sig-clip-modal">
                  <rect x="22" y="60" width="116" height="38"/>
                </clipPath>
              </defs>
              <image href="${origin}/dr-ismail-signature.png" x="22" y="62" width="116" height="36" preserveAspectRatio="xMidYMid meet" clip-path="url(#sig-clip-modal)" style="mix-blend-mode:multiply"/>
              <line x1="22" y1="100" x2="138" y2="100" stroke="#06392c" stroke-width="0.8"/>
              <text x="80" y="113" text-anchor="middle" font-family="Cairo,Arial" font-size="7" font-weight="900" fill="#06392c">${hijriDate}</text>
              <text x="80" y="125" text-anchor="middle" font-family="Cairo,Arial" font-size="5" font-weight="bold" fill="#06392c">منصة مسار · التعليم العلاجي</text>
            </svg>
            <div style="font-size: 8.5px; font-weight: 900; color: #06392c; margin-top: 2px;">الختم الرقمي المعتمد</div>
          </div>

          <!-- SIGNATURE -->
          <div class="sig-box">
            <div style="font-size: 9px; font-weight: 700; color: #64748b;">يعتمد هذا التقرير رسمياً من:</div>
            <div style="font-size: 13px; font-weight: 900; color: #06392c; margin-top: 2px;">د. إسماعيل عيسى</div>
            <div style="font-size: 8px; color: #047857;">استشاري التربية الخاصة وتأهيل صعوبات التعلم</div>
            <div style="height: 44px; display: flex; align-items: center; justify-content: center; margin: 4px 0 2px 0;">
              <img src="${origin}/dr-ismail-signature.png" alt="توقيع د. إسماعيل عيسى" class="sig-img"/>
            </div>
            <div style="border-bottom: 1.5px solid #06392c; margin: 2px 0 4px 0;"></div>
            <div style="font-size: 9px; font-weight: 900; color: #64748b; font-family: monospace;">${hijriDate}</div>
          </div>
        </div>

        <div class="footer">
          <span>منصة مَسَار للتأهيل والتعليم الذكي · جميع الحقوق محفوظة</span>
          <span>صفحة 3 من 3</span>
        </div>
      </div>
    </section>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" dir="rtl">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5 border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-teal-600 text-white">
              <FileCheck size={18} />
            </span>
            <h2 className="text-base font-black text-slate-900">جاهز للطباعة والتحميل</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs space-y-2">
          <p className="font-bold text-slate-700">سيتم فتح نافذة المعاينة والطباعة المستقلة تلقائياً بنظام صفحات A4 المعايرة.</p>
          <p className="text-slate-500 font-mono">رقم التقرير: {fileNumber}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-teal-700 py-3 text-sm font-black text-white hover:bg-teal-800 transition"
          >
            <Printer size={16} />
            إعادة فتح نافذة الطباعة PDF
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-black text-slate-600 hover:bg-slate-50"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
