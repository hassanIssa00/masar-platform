'use client';

import { useEffect } from 'react';
import { Printer, X, Award, FileCheck } from 'lucide-react';
import { getStudents, type ReportRecord } from '@/lib/localDb';

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

  function handlePrint() {
    const reportScore = typeof report.score === 'number' ? report.score : 0;
    const domainsList = Array.isArray(report.domains) ? report.domains : [];
    const recommendationsList = Array.isArray(report.recommendations) ? report.recommendations : [];
    const answersList = Array.isArray(report.answers) ? report.answers : [];
    const isSurveyAnswersReport = report.type === 'survey-answers';
    const isStudentAnswersReport = report.type === 'student-assessment-answers';
    const isAnswersReport = isSurveyAnswersReport || isStudentAnswersReport;
    const reportTitle = isSurveyAnswersReport
      ? 'تقرير إجابات ولي الأمر'
      : isStudentAnswersReport
        ? 'تقرير إجابات اختبار الطالب'
        : report.type === 'student-assessment-analysis'
          ? 'تحليل اختبار الطالب المباشر'
          : 'التقرير التحليلي الشامل';
    const reportSubtitle = isSurveyAnswersReport
      ? 'سجل إجابات خام فقط، بدون تحليل أو تشخيص داخل هذا الملف'
      : isStudentAnswersReport
        ? 'إجابات الطالب سؤالاً بسؤال مع قراءة المجالات المرتبطة بالاختبار'
        : 'تحليل المجالات والأولويات والخطة المقترحة دون عرض الإجابات الخام';
    const printableAnswers = isAnswersReport ? answersList : [];
    const student = getStudents().find((item) => item.id === report.studentId || item.fullName === report.studentName);
    const studentPhoto = student?.photoUrl?.trim();
    const studentPhotoHTML = studentPhoto
      ? `<img src="${studentPhoto}" alt="صورة الطالب ${report.studentName || ''}" style="width:74px;height:74px;border-radius:18px;object-fit:cover;border:2px solid #d6a83f;box-shadow:0 10px 24px rgba(15,23,42,.14);" />`
      : `<div style="width:74px;height:74px;border-radius:18px;background:#f8fafc;border:2px solid #d6a83f;display:flex;align-items:center;justify-content:center;color:#06392c;font-size:28px;font-weight:900;">${(report.studentName || 'م').slice(0, 1)}</div>`;

    const sortedDomains = [...domainsList].sort((first, second) => (first.score ?? 0) - (second.score ?? 0));
    const weakestDomains = sortedDomains.slice(0, 3);
    const strongestDomains = [...domainsList].sort((first, second) => (second.score ?? 0) - (first.score ?? 0)).slice(0, 2);
    const averageDomainScore = domainsList.length
      ? Math.round(domainsList.reduce((sum, domain) => sum + Number(domain.score || 0), 0) / domainsList.length)
      : reportScore;
    const supportLevel = averageDomainScore < 50
      ? 'دعم مكثف متعدد الحواس'
      : averageDomainScore < 70
        ? 'دعم موجه قصير ومتكرر'
        : averageDomainScore < 85
          ? 'تدريب تثبيت ومراجعة'
          : 'إثراء وانتقال تدريجي';
    const analysisDepthRows = (weakestDomains.length ? weakestDomains : domainsList.slice(0, 3)).map((domain, index) => {
      const score = Number(domain.score || 0);
      const priority = score < 50 ? 'أولوية عالية' : score < 70 ? 'أولوية متوسطة' : 'متابعة تثبيت';
      const method = domain.name?.includes('رياض')
        ? 'محسوسات عددية، رسم تمثيلي، ثم رمز رياضي'
        : domain.name?.includes('عرب') || domain.name?.includes('قراءة')
          ? 'وعي صوتي، تهجئة موجهة، قراءة كلمات قصيرة'
          : domain.name?.includes('رسم') || domain.name?.includes('بصري')
            ? 'تتبع بصري، نسخ نماذج، وتدريب تآزر يد-عين'
            : 'تعليم صريح بخطوات صغيرة مع تعزيز فوري';
      return `
        <tr style="background:${index % 2 === 0 ? '#ffffff' : '#f8fafc'}">
          <td style="padding:8px 10px;font-weight:900;color:#0f172a;border-bottom:1px solid #e2e8f0">${domain.name}</td>
          <td style="padding:8px 10px;font-weight:900;color:${score < 50 ? '#b91c1c' : score < 70 ? '#b45309' : '#047857'};text-align:center;border-bottom:1px solid #e2e8f0">${priority}</td>
          <td style="padding:8px 10px;font-weight:700;color:#334155;border-bottom:1px solid #e2e8f0">${method}</td>
          <td style="padding:8px 10px;font-weight:800;color:#475569;border-bottom:1px solid #e2e8f0">إعادة قياس بعد ${score < 50 ? '3' : '5'} جلسات</td>
        </tr>`;
    }).join('');
    const strengthsText = strongestDomains.length
      ? strongestDomains.map((domain) => `${domain.name} (${domain.score}%)`).join('، ')
      : 'لا توجد مجالات قوة كافية بعد، ويحتاج الطالب إلى جمع بيانات إضافية.';
    const needsText = weakestDomains.length
      ? weakestDomains.map((domain) => `${domain.name} (${domain.score}%)`).join('، ')
      : 'يتم تحديد الاحتياجات بعد اكتمال التقييم.';
    const headerHtml = (label: string) => `
        <div class="header">
          <div class="brand-side">
            <img src="${origin}/brand/masar-logo.png" alt="شعار منصة مسار" />
            <span>وثيقة رقمية</span>
          </div>
          <div class="brand-center">
            <div class="brand-title">MASAR · مَسَار</div>
            <div class="brand-subtitle">منصة التأهيل والتعليم الذكي لصعوبات التعلم</div>
            <div class="brand-owner">مؤسس المنصة: د. إسماعيل عيسى — تأسيس الصفوف الأولية، النطق والتخاطب، وصعوبات التعلم</div>
            <div class="brand-label">${label}</div>
          </div>
          <div class="serial-card">
            <span>رقم الملف</span>
            <strong>${fileNumber}</strong>
            <small>${report.date || hijriDate}</small>
          </div>
        </div>`;

    const compactHeaderHtml = (label: string) => `
        <div class="compact-header">
          <div class="compact-brand">
            <img src="${origin}/brand/masar-logo.png" alt="شعار منصة مسار" />
            <div>
              <strong>مَسَار</strong>
              <span>${label}</span>
            </div>
          </div>
          <div class="compact-file">${fileNumber}</div>
        </div>`;

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

    const answerRow = (ans: { question: string; answer: string }, i: number) => `
      <tr style="background:${i % 2 === 0 ? '#ffffff' : '#f8fafc'}">
        <td style="padding:7px 10px;font-weight:900;font-family:monospace;text-align:center;border-bottom:1px solid #e2e8f0">${i + 1}</td>
        <td style="padding:7px 10px;font-weight:700;color:#1e293b;font-size:10.5px;border-bottom:1px solid #e2e8f0">${ans.question}</td>
        <td style="padding:7px 10px;font-weight:900;color:#06392c;font-size:11px;border-bottom:1px solid #e2e8f0">${ans.answer}</td>
      </tr>`;
    const firstAnswerChunk = printableAnswers.slice(0, 18);
    const secondAnswerChunk = printableAnswers.slice(18);
    const answersRows = firstAnswerChunk.map((ans, i) => answerRow(ans, i)).join('');
    const answersRowsContinuation = secondAnswerChunk.map((ans, i) => answerRow(ans, i + firstAnswerChunk.length)).join('');

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
          <title>${reportTitle} - ${report.studentName || 'الطالب'} - منصة مسار</title>
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
      margin: 0 auto 20px auto;
      background: #ffffff;
      padding: 18mm 20mm 17mm 20mm;
      box-sizing: border-box;
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: none;
      box-shadow: 0 18px 45px rgba(15,23,42,0.18);
      page-break-after: always;
      break-after: page;
      overflow: hidden;
    }
    .print-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .print-page::before {
      content: "";
      position: absolute;
      inset: 8mm;
      border: 1.25mm double #06392c;
      border-radius: 5mm;
      pointer-events: none;
    }
    .print-page::after {
      content: "";
      position: absolute;
      inset: 10.6mm;
      border: 0.45mm solid #d6a83f;
      border-radius: 3.5mm;
      box-shadow:
        inset 0 0 0 0.35mm rgba(6,57,44,0.18),
        inset 0 0 22mm rgba(214,168,63,0.06);
      pointer-events: none;
    }
    .print-page > * {
      position: relative;
      z-index: 1;
    }
    @media print {
      .print-page {
        margin: 0 !important;
        box-shadow: none !important;
        width: 210mm !important;
        min-height: 297mm !important;
        border: none !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .print-page:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
    }
    .header {
      min-height: 88px;
      display: grid;
      grid-template-columns: 100px 1fr 128px;
      align-items: center;
      gap: 14px;
      border-bottom: 2px solid #06392c;
      padding: 0 0 10px 0;
      margin-bottom: 12px;
    }
    .brand-side {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: #1e1b4b;
      font-size: 8px;
      font-weight: 900;
    }
    .brand-side img {
      width: 48px;
      height: 48px;
      object-fit: contain;
      border: 1px solid #d6a83f;
      border-radius: 12px;
      padding: 3px;
      background: #fff;
    }
    .brand-center {
      text-align: center;
      line-height: 1.45;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 900;
      color: #1e1b4b;
      letter-spacing: .2px;
    }
    .brand-subtitle {
      font-size: 11px;
      font-weight: 900;
      color: #1d4ed8;
    }
    .brand-owner {
      font-size: 8.8px;
      font-weight: 800;
      color: #64748b;
    }
    .brand-label {
      display: inline-block;
      margin-top: 3px;
      padding: 2px 10px;
      border-radius: 999px;
      background: #f8fafc;
      color: #06392c;
      border: 1px solid #d6a83f;
      font-size: 8px;
      font-weight: 900;
    }
    .serial-card {
      background: #1e1b4b;
      color: #fff;
      border-radius: 8px;
      padding: 9px 10px;
      text-align: center;
      line-height: 1.35;
    }
    .serial-card span {
      display: block;
      color: #d6a83f;
      font-size: 7px;
      font-weight: 900;
    }
    .serial-card strong {
      display: block;
      font-size: 12px;
      font-weight: 900;
      font-family: monospace;
      direction: ltr;
    }
    .serial-card small {
      display: block;
      color: #dbeafe;
      font-size: 7px;
      font-weight: 700;
      direction: ltr;
    }
    .compact-header {
      min-height: 34px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1.3px solid #06392c;
      padding-bottom: 6px;
      margin-bottom: 10px;
    }
    .compact-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #06392c;
      line-height: 1.3;
    }
    .compact-brand img {
      width: 28px;
      height: 28px;
      object-fit: contain;
    }
    .compact-brand strong {
      display: block;
      font-size: 11px;
      font-weight: 900;
    }
    .compact-brand span {
      display: block;
      font-size: 8px;
      font-weight: 800;
      color: #64748b;
    }
    .compact-file {
      font-family: monospace;
      direction: ltr;
      color: #1e1b4b;
      font-size: 8.5px;
      font-weight: 900;
      border: 1px solid #d6a83f;
      border-radius: 999px;
      padding: 3px 8px;
      background: #fffdf5;
    }
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
    table, thead, tbody, tr, td, th { page-break-inside: avoid; break-inside: avoid; }
    th { background: #06392c; color: #ffffff; padding: 6px 10px; text-align: right; font-weight: 900; }
    td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }
    .answers-table td { padding: 6px 9px !important; line-height: 1.55; }
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
        ${headerHtml(reportTitle)}

        <div class="banner" style="display:flex;align-items:center;justify-content:space-between;gap:16px;text-align:right;">
          <div style="flex:1;">
            <h1>${reportTitle}</h1>
            <p>${reportSubtitle}</p>
          </div>
          ${studentPhotoHTML}
        </div>

        <div class="info-grid">
          <div class="info-item"><span class="info-lbl">اسم الطالب:</span><span class="info-val">${report.studentName || '—'}</span></div>
          <div class="info-item"><span class="info-lbl">الصف الدراسي:</span><span class="info-val">${report.grade || 'الأول الابتدائي'}</span></div>
          <div class="info-item"><span class="info-lbl">رقم الملف:</span><span class="info-val">${fileNumber}</span></div>
          <div class="info-item"><span class="info-lbl">تاريخ التقرير:</span><span class="info-val">${report.date || hijriDate}</span></div>
          <div class="info-item"><span class="info-lbl">البرنامج:</span><span class="info-val">${report.program || 'برنامج التأهيل الشامل'}</span></div>
          <div class="info-item"><span class="info-lbl">إشراف:</span><span class="info-val">د. إسماعيل عيسى</span></div>
        </div>

        ${
          isAnswersReport
            ? `<div style="background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:12px;padding:12px 16px;margin-bottom:12px;">
                <div style="font-size:12px;font-weight:900;color:#06392c;margin-bottom:4px;">طبيعة هذا التقرير</div>
                <div style="font-size:10.5px;font-weight:800;color:#334155;line-height:1.8;">هذا الملف مخصص لعرض الإجابات الخام فقط، ويتم فصل التحليل المهني في تقرير مستقل حتى لا تختلط بيانات الإجابة بقرار د. إسماعيل.</div>
              </div>`
            : `
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
          <div style="font-size: 11px; font-weight: 900; color: #06392c; margin-bottom: 4px;">قرار التأهيل التعليمي:</div>
          <div style="font-size: 10.5px; font-weight: 700; color: #1e293b; line-height: 1.6;">
            بدء تطبيق خطة التدخل الخاصة بـ <strong>${report.program || 'برنامج التأهيل الشامل'}</strong> وتوثيق نسبة التطور بشكل شهري.
          </div>
        </div>`
        }
      </div>

      <div class="footer">
        <span>جميع الحقوق محفوظة - منصة مَسَار للتأهيل والتعليم الذكي</span>
        <span>صفحة 1 من 3</span>
      </div>
    </section>

    <!-- PAGE 2: DOMAINS & IEP -->
    <section class="print-page">
      <div>
        ${compactHeaderHtml('تحليل المجالات والخطط الفردية')}

        ${
          isAnswersReport
            ? `
        <div class="sec-head">1. ${isStudentAnswersReport ? 'إجابات اختبار الطالب التفصيلية' : 'إجابات ولي الأمر التفصيلية'} - الجزء الأول</div>
        <table class="answers-table">
          <thead>
            <tr>
              <th style="width: 8%;">#</th>
              <th style="width: 52%;">السؤال</th>
              <th style="width: 40%;">الإجابة</th>
            </tr>
          </thead>
          <tbody>
            ${answersRows || `<tr><td colspan="3" style="padding:12px;text-align:center;color:#94a3b8;font-size:11px">لا توجد إجابات محفوظة</td></tr>`}
          </tbody>
        </table>`
            : `
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
        `
        }

        ${!isAnswersReport ? `
        <div class="sec-head" style="margin-top: 14px;">2. قراءة تحليلية موسعة للملف</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:10px;">
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:9px;">
            <div style="font-size:8.5px;font-weight:900;color:#64748b;">متوسط المجالات</div>
            <div style="font-size:20px;font-weight:900;color:#06392c;font-family:monospace;">${averageDomainScore}%</div>
          </div>
          <div style="background:#ecfdf5;border:1px solid #bbf7d0;border-radius:8px;padding:9px;">
            <div style="font-size:8.5px;font-weight:900;color:#047857;">نقاط القوة الحالية</div>
            <div style="font-size:9.5px;font-weight:800;color:#064e3b;line-height:1.7;">${strengthsText}</div>
          </div>
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:9px;">
            <div style="font-size:8.5px;font-weight:900;color:#c2410c;">مجالات تحتاج متابعة</div>
            <div style="font-size:9.5px;font-weight:800;color:#7c2d12;line-height:1.7;">${needsText}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 24%;">المجال</th>
              <th style="width: 20%; text-align:center;">الأولوية</th>
              <th style="width: 36%;">طريقة التدخل المقترحة</th>
              <th style="width: 20%;">إعادة القياس</th>
            </tr>
          </thead>
          <tbody>
            ${analysisDepthRows || `<tr><td colspan="4" style="text-align:center;padding:10px;color:#94a3b8;">لا توجد مجالات كافية للتحليل الموسع</td></tr>`}
          </tbody>
        </table>

        <div style="background:#f0fdfa;border:1px solid #99f6e4;border-radius:8px;padding:10px;margin-bottom:12px;">
          <div style="font-size:10.5px;font-weight:900;color:#0f766e;margin-bottom:4px;">مستوى الدعم المقترح</div>
          <div style="font-size:10px;font-weight:800;color:#134e4a;line-height:1.8;">
            ${supportLevel}: تبدأ الجلسة بنمذجة قصيرة، ثم تدريب موجه، ثم قياس إتقان مستقل. يتم تسجيل نوع المساعدة المطلوبة في كل نشاط حتى لا يعتمد القرار على الدرجة فقط.
          </div>
        </div>

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
        ` : ''}

        ${!isAnswersReport ? `
        <div class="sec-head" style="margin-top: 14px;">4. توصيات المنزل والمدرسة</div>
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
        ` : ''}
      </div>

      <div class="footer">
        <span>جميع الحقوق محفوظة - منصة مَسَار للتأهيل والتعليم الذكي</span>
        <span>صفحة 2 من 3</span>
      </div>
    </section>

    <!-- PAGE 3: DETAILED ANSWERS & SIGNATURE -->
    <section class="print-page">
      <div>
        ${compactHeaderHtml('التوقيع والختم الرقمي')}

        ${
          isAnswersReport && answersRowsContinuation.length > 0
            ? `
        <div class="sec-head">2. تكملة سجل الإجابات التفصيلية المحفوظة</div>
        <table class="answers-table">
          <thead>
            <tr>
              <th style="width: 8%;">#</th>
              <th style="width: 52%;">السؤال المستهدف</th>
              <th style="width: 40%;">الإجابة المحفوظة</th>
            </tr>
          </thead>
          <tbody>
            ${answersRowsContinuation}
          </tbody>
        </table>`
            : ''
        }

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-top: 14px;">
          <p style="font-size: 9.5px; color: #475569; font-weight: 700; line-height: 1.6; margin: 0;">
            وثيقة إشرافية مستخرجة إلكترونياً من منصة مَسَار تحت إشراف د. إسماعيل عيسى، مخصصة لمتابعة التعليم الحديث وتأسيس الصفوف الأولية والنطق والتخاطب وصعوبات التعلم.
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
              <text x="80" y="34" text-anchor="middle" font-family="Cairo,Arial" font-size="6.5" font-weight="bold" fill="#06392c">الختم الرقمي</text>
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
              <text x="80" y="125" text-anchor="middle" font-family="Cairo,Arial" font-size="5" font-weight="bold" fill="#06392c">منصة مسار · التعليم الحديث</text>
            </svg>
            <div style="font-size: 8.5px; font-weight: 900; color: #06392c; margin-top: 2px;">الختم الرقمي</div>
          </div>

          <!-- SIGNATURE -->
          <div class="sig-box">
            <div style="font-size: 9px; font-weight: 700; color: #64748b;">يعتمد:</div>
            <div style="font-size: 13px; font-weight: 900; color: #06392c; margin-top: 2px;">د. إسماعيل عيسى</div>
            <div style="font-size: 8px; color: #047857;">تأسيس الصفوف الأولية، النطق والتخاطب، وصعوبات التعلم</div>
            <div style="height: 44px; display: flex; align-items: center; justify-content: center; margin: 4px 0 2px 0;">
              <img src="${origin}/dr-ismail-signature.png" alt="توقيع د. إسماعيل عيسى" class="sig-img"/>
            </div>
            <div style="border-bottom: 1.5px solid #06392c; margin: 2px 0 4px 0;"></div>
            <div style="font-size: 9px; font-weight: 900; color: #64748b; font-family: monospace;">${hijriDate}</div>
          </div>
        </div>

        <div class="footer">
          <span>جميع الحقوق محفوظة - منصة مَسَار للتأهيل والتعليم الذكي</span>
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
  }

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
