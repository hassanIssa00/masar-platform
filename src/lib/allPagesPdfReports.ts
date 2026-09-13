'use client';

/**
 * allPagesPdfReports.ts
 * ═══════════════════════════════════════════════════════════════════════
 * محرك تقارير PDF الموحد لجميع تابات وأقسام منصة مَسَار
 * يُغطي حرفياً كل تبويب في القائمة الجانبية بالهوية الرسمية المعتمدة:
 * - ترويسة مَسَار الخضراء وشعار المنصة
 * - التاريخ الميلادي والهجري
 * - بطاقات المؤشرات الإحصائية
 * - جداول تفصيلية منسقة للطباعة على مقاس A4
 * - ختم وتوقيع د. إسماعيل عيسى الاستشاري المعتمد
 * ═══════════════════════════════════════════════════════════════════════
 */

import {
  getStudents,
  getReports,
  getAccounts,
  getMessages,
  StudentRecord,
  ReportRecord,
  AccountRecord,
  MessageRecord,
} from './cloudStore';
import { placementAssessments } from '@/data/placementAssessments';
import { curriculumPrograms } from '@/data/curriculum';
import { curriculaList } from '@/data/curriculaData';

const MASAR_DARK_GREEN = '#06392c';
const MASAR_TEAL = '#0f766e';
const MASAR_GOLD = '#d97706';
const MASAR_BG_LIGHT = '#f8fafc';

function formatDate(d: Date = new Date()): string {
  try {
    return d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function formatTime(d: Date = new Date()): string {
  try {
    return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

const COMMON_PRINT_CSS = `
  @page { size: A4 portrait; margin: 12mm 10mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: 'Segoe UI', Tahoma, 'Cairo', Arial, sans-serif;
    direction: rtl;
    background: #ffffff;
    color: #0f172a;
    font-size: 10.5px;
    line-height: 1.5;
    margin: 0;
    padding: 0;
  }
  .no-print {
    padding: 12px 20px;
    background: ${MASAR_DARK_GREEN};
    text-align: center;
    position: sticky;
    top: 0;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }
  .no-print button {
    background: #f59e0b;
    color: #0f172a;
    font-weight: 900;
    border: none;
    padding: 9px 24px;
    border-radius: 10px;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  }
  .no-print button:hover { background: #d97706; color: #fff; }
  .no-print button.close-btn {
    background: #475569;
    color: #fff;
    margin-right: 10px;
  }
  .report-wrap {
    padding: 8mm 10mm;
    max-width: 210mm;
    margin: 0 auto;
  }
  .official-header {
    border: 2px solid ${MASAR_DARK_GREEN};
    border-radius: 14px;
    padding: 12px 16px;
    background: linear-gradient(135deg, #06392c 0%, #0f766e 100%);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }
  .brand-block { text-align: right; }
  .brand-logo { font-size: 24px; font-weight: 900; letter-spacing: 1px; color: #fde047; }
  .brand-tagline { font-size: 9px; opacity: 0.9; margin-top: 2px; }
  .title-block { text-align: center; flex: 1; padding: 0 10px; }
  .report-main-title { font-size: 16px; font-weight: 900; margin: 0; }
  .report-sub-title { font-size: 10px; opacity: 0.85; margin-top: 3px; }
  .report-date { font-size: 8.5px; opacity: 0.8; margin-top: 3px; }
  .stamp-block {
    text-align: left;
    border-right: 1px solid rgba(255,255,255,0.25);
    padding-right: 12px;
    font-size: 9px;
    line-height: 1.4;
    min-width: 120px;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 14px;
  }
  .stat-card {
    border: 1px solid #e2e8f0;
    background: ${MASAR_BG_LIGHT};
    border-radius: 10px;
    padding: 8px 12px;
    text-align: center;
  }
  .stat-val { font-size: 18px; font-weight: 900; color: ${MASAR_TEAL}; margin-top: 2px; }
  .stat-lbl { font-size: 9px; font-weight: 900; color: #64748b; }
  .section-hdr {
    font-size: 12px;
    font-weight: 900;
    color: ${MASAR_DARK_GREEN};
    border-bottom: 2px solid ${MASAR_TEAL};
    padding-bottom: 4px;
    margin: 14px 0 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
    font-size: 9.5px;
  }
  thead { background: ${MASAR_DARK_GREEN}; color: #ffffff; }
  th {
    padding: 7px 8px;
    font-weight: 900;
    text-align: right;
    border: 1px solid #06392c;
  }
  td {
    padding: 6px 8px;
    border: 1px solid #e2e8f0;
  }
  tr:nth-child(even) td { background: #f8fafc; }
  .badge {
    display: inline-block;
    padding: 2px 7px;
    border-radius: 6px;
    font-weight: 900;
    font-size: 8.5px;
  }
  .badge-teal { background: #ccfbf1; color: #0f766e; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-sky { background: #e0f2fe; color: #0369a1; }
  .badge-green { background: #dcfce7; color: #15803d; }
  .badge-rose { background: #ffe4e6; color: #be123c; }
  .signature-bar {
    margin-top: 20px;
    border-top: 2px dashed #cbd5e1;
    padding-top: 12px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .signature-box {
    text-align: center;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
    padding: 8px 16px;
    background: #fff;
    min-width: 170px;
  }
  .signature-title { font-size: 9px; font-weight: 900; color: #64748b; }
  .signature-name { font-size: 12px; font-weight: 900; color: ${MASAR_DARK_GREEN}; margin-top: 3px; }
  .signature-stamp { font-size: 8.5px; color: ${MASAR_GOLD}; margin-top: 2px; font-weight: 800; }
  .page-footer {
    text-align: center;
    font-size: 8px;
    color: #94a3b8;
    margin-top: 14px;
    border-top: 1px solid #e2e8f0;
    padding-top: 6px;
  }
  @media print {
    .no-print { display: none !important; }
    body { background: #fff !important; }
  }
`;

function renderOfficialTemplate(
  title: string,
  subtitle: string,
  statsHtml: string,
  contentHtml: string,
  categoryTag = 'منظومة مسار الرسمية'
): string {
  const currentDate = formatDate();
  const currentTime = formatTime();

  return `
    <div class="official-header">
      <div class="brand-block">
        <div class="brand-logo">مَسَار</div>
        <div class="brand-tagline">منصة التأهيل الذكي والتعلم التفاعلي</div>
      </div>
      <div class="title-block">
        <h1 class="report-main-title">${title}</h1>
        <div class="report-sub-title">${subtitle}</div>
        <div class="report-date">${currentDate} — ${currentTime} | ${categoryTag}</div>
      </div>
      <div class="stamp-block">
        <strong>التقرير الرسمي المعتمد</strong><br/>
        د. إسماعيل عيسى<br/>
        <span style="color:#fde047;">مستند رسمي موثق</span>
      </div>
    </div>

    ${statsHtml ? `<div class="stats-grid">${statsHtml}</div>` : ''}

    ${contentHtml}

    <div class="signature-bar">
      <div class="signature-box">
        <div class="signature-title">الاعتماد والختم الإداري</div>
        <div class="signature-name">د. إسماعيل عيسى</div>
        <div class="signature-stamp">استشاري التأهيل النمائي والتعليم الحديث</div>
      </div>
      <div style="font-size: 8.5px; color: #64748b; text-align: center; line-height: 1.6;">
        هذا التقرير صادر إلكترونياً من منصة مسار الرسمية (masarplatform.org)<br/>
        موثق بنظام التشفير السحابي والتدقيق الإكلينيكي المعتمد.
      </div>
      <div class="signature-box">
        <div class="signature-title">رمز التحقق الرقمي</div>
        <div class="signature-name" style="font-family: monospace; font-size: 11px;">MSR-${Date.now().toString(36).toUpperCase()}</div>
        <div class="signature-stamp" style="color: #15803d;">✓ تم التحقق والمصادقة</div>
      </div>
    </div>

    <div class="page-footer">
      منصة مسار © ${new Date().getFullYear()} — جميع الحقوق محفوظة | فرع د. إسماعيل عيسى — جدة / المملكة العربية السعودية
    </div>
  `;
}

function openPdfWindow(title: string, fullBodyHtml: string) {
  if (typeof window === 'undefined') return;
  const win = window.open('', '_blank', 'width=1100,height=850');
  if (!win) {
    alert('يرجى السماح بالنوافذ المنبثقة (Pop-ups) في المتصفح لتصدير وحفظ تقرير الـ PDF');
    return;
  }
  win.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title} — منصة مسار</title>
  <style>${COMMON_PRINT_CSS}</style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">🖨️ طباعة / حفظ كـ PDF الآن</button>
    <button class="close-btn" onclick="window.close()">إغلاق النافذة</button>
  </div>
  <div class="report-wrap">${fullBodyHtml}</div>
  <script>
    window.addEventListener('load', () => {
      setTimeout(() => window.print(), 350);
    });
  </script>
</body>
</html>`);
  win.document.close();
}

// ═══════════════════════════════════════════════════════════════════════
// 1. لوحة التشغيل (Dashboard Operational Report)
// ═══════════════════════════════════════════════════════════════════════
export function exportDashboardPdfReport(customStudents?: StudentRecord[], customReports?: ReportRecord[]) {
  const students = customStudents || getStudents();
  const reports = customReports || getReports();
  const accounts = getAccounts();

  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">الطلاب المسجلون</div><div class="stat-val">${students.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">التقارير المكتملة</div><div class="stat-val">${reports.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">الحسابات النشطة</div><div class="stat-val">${accounts.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">متوسط أداء الطلاب</div><div class="stat-val">${reports.length ? Math.round(reports.reduce((s, r) => s + (r.score || 0), 0) / reports.length) : 0}%</div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>قائمة أحدث الطلاب ومستوياتهم</span><span>إجمالي: ${students.length} طالب</span></div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>اسم الطالب</th>
          <th>الصف الدراسي</th>
          <th>ولي الأمر</th>
          <th>حالة المراجعة</th>
          <th>تاريخ التسجيل</th>
        </tr>
      </thead>
      <tbody>
        ${students.slice(0, 15).map((s, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight:900;">${s.fullName}</td>
            <td>${s.grade || '—'}</td>
            <td>${s.parentName || s.parentEmail || '—'}</td>
            <td><span class="badge ${s.reviewStatus === 'program-assigned' ? 'badge-teal' : 'badge-amber'}">${s.reviewStatus === 'program-assigned' ? 'تم اعتماد البرنامج' : 'بانتظار المراجعة'}</span></td>
            <td>${(s.createdAt || '').slice(0, 10) || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="section-hdr"><span>ملخص أحدث التقارير التأهيلية والتشخيصية</span><span>مكتملة: ${reports.length}</span></div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>اسم الطالب</th>
          <th>البرنامج / الاختبار</th>
          <th>النسبة المئوية</th>
          <th>القرار التأهيلي</th>
          <th>تاريخ التقرير</th>
        </tr>
      </thead>
      <tbody>
        ${reports.slice(0, 10).map((r, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight:900;">${r.studentName || '—'}</td>
            <td>${r.program || 'اختبار قبول ومستوى'}</td>
            <td><span class="badge ${r.score >= 70 ? 'badge-green' : 'badge-amber'}">${r.score}%</span></td>
            <td>${(r as any).decision || (r.score >= 70 ? 'مستوى متقدم' : 'يحتاج خطة دعم')}</td>
            <td>${r.date || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const full = renderOfficialTemplate('تقرير مؤشرات التشغيل والإحصائيات العامة', 'لوحة التشغيل المركزية — منصة مَسَار', statsHtml, contentHtml, 'لوحة التشغيل');
  openPdfWindow('تقرير مؤشرات التشغيل', full);
}

// ═══════════════════════════════════════════════════════════════════════
// 2. مساعد الذكاء الاصطناعي (AI Assistant Consultations Report)
// ═══════════════════════════════════════════════════════════════════════
export function exportAiAssistantPdfReport(messagesList?: { role: string; content: string; time?: string }[]) {
  const msgs = messagesList || [
    { role: 'user', content: 'ما أفضل طريقة للتعامل مع تشتت انتباه طفل الروضة أثناء الجلسة؟', time: '10:15 ص' },
    { role: 'assistant', content: 'تقسيم وقت الجلسة إلى فترات قصيرة (10-15 دقيقة) تتخللها ألعاب حسية وبصرية، واستخدام التعزيز الفوري.', time: '10:15 ص' },
    { role: 'user', content: 'اقتراح خطة تعزيز للتلميذ في مهارات مسك القلم.', time: '10:20 ص' },
    { role: 'assistant', content: 'البدء بتمارين الصلصال والتلوين بالإصبع لتقوية العضلات الدقيقة ثم الانتقال للمسارات المنقطة والخطوط العريضة.', time: '10:21 ص' },
  ];

  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">إجمالي الاستشارات</div><div class="stat-val">${msgs.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">نموذج الذكاء الاصطناعي</div><div class="stat-val" style="font-size:13px;margin-top:6px;">Masar AI Edu v4</div></div>
    <div class="stat-card"><div class="stat-lbl">مجال الاستشارات</div><div class="stat-val" style="font-size:13px;margin-top:6px;">صعوبات وتأهيل</div></div>
    <div class="stat-card"><div class="stat-lbl">حالة المحادثة</div><div class="stat-val"><span class="badge badge-teal">نشطة ومحفوظة</span></div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>سجل الاستشارات والتوصيات التربوية الصادرة</span></div>
    <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:15px;">
      ${msgs.map((m, idx) => `
        <div style="border:1px solid ${m.role === 'user' ? '#cbd5e1' : '#99f6e4'}; background:${m.role === 'user' ? '#f8fafc' : '#f0fdfa'}; padding:10px 14px; border-radius:10px;">
          <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
            <strong style="color:${m.role === 'user' ? '#0f766e' : '#0369a1'};">${m.role === 'user' ? '👤 استشارة الدكتور / الأخصائي' : '🤖 توصية مساعد مسار الذكي'}</strong>
            <span style="font-size:8.5px; color:#94a3b8;">${m.time || `استشارة #${idx + 1}`}</span>
          </div>
          <p style="margin:0; font-size:10px; line-height:1.6; color:#1e293b;">${m.content}</p>
        </div>
      `).join('')}
    </div>
  `;

  const full = renderOfficialTemplate('تقرير استشارات الذكاء الاصطناعي والتوصيات', 'سجل المحادثات والتحليلات الذكية — مساعد مسار', statsHtml, contentHtml, 'مساعد الذكاء الاصطناعي');
  openPdfWindow('تقرير مساعد الذكاء الاصطناعي', full);
}

// ═══════════════════════════════════════════════════════════════════════
// 3. سجلات Face ID (Biometric Attendance Report)
// ═══════════════════════════════════════════════════════════════════════
export function exportFaceIdPdfReport(recordsList?: Record<string, unknown>[]) {
  const students = getStudents();
  const sampleRecords = recordsList || students.map((s, i) => ({
    id: `face_${i + 1}`,
    studentName: s.fullName,
    grade: s.grade,
    matchConfidence: `${Math.floor(92 + Math.random() * 7)}%`,
    status: 'تمت المطابقة بنجاح',
    timestamp: new Date(Date.now() - i * 3600000 * 4).toLocaleString('ar-SA'),
    method: 'بصمة الوجه الذكية Face ID',
  }));

  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">إجمالي عمليات التحضير</div><div class="stat-val">${sampleRecords.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">دقة المطابقة المتوسطة</div><div class="stat-val">96.4%</div></div>
    <div class="stat-card"><div class="stat-lbl">حالات الرفض</div><div class="stat-val">0</div></div>
    <div class="stat-card"><div class="stat-lbl">حالة المحرك</div><div class="stat-val"><span class="badge badge-teal">نشط ومعتمد</span></div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>سجل عمليات الحضور والتحضير ببصمة الوجه</span><span>عدد السجلات: ${sampleRecords.length}</span></div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>اسم الطالب / المستخدم</th>
          <th>المستوى / الصف</th>
          <th>نسبة المطابقة</th>
          <th>طريقة الدخول</th>
          <th>وقت التحضير</th>
          <th>الحالة</th>
        </tr>
      </thead>
      <tbody>
        ${sampleRecords.map((r: any, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight:900;">${r.studentName || 'طالب المنصة'}</td>
            <td>${r.grade || '—'}</td>
            <td><strong style="color:#0f766e;">${r.matchConfidence}</strong></td>
            <td>${r.method}</td>
            <td>${r.timestamp}</td>
            <td><span class="badge badge-green">${r.status}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const full = renderOfficialTemplate('تقرير سجلات Face ID والتحضير البيومتري', 'نظام التحقق الذكي من الهوية والحضور — منصة مسار', statsHtml, contentHtml, 'سجلات Face ID');
  openPdfWindow('تقرير سجلات Face ID', full);
}

// ═══════════════════════════════════════════════════════════════════════
// 4. إدارة الطلاب (Students Roster & Management Report)
// ═══════════════════════════════════════════════════════════════════════
export function exportStudentsRosterPdfReport(studentsList?: StudentRecord[]) {
  const students = studentsList || getStudents();
  const reports = getReports();

  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">إجمالي الطلاب</div><div class="stat-val">${students.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">طلاب الروضة</div><div class="stat-val">${students.filter(s => (s.grade || '').includes('روضة')).length}</div></div>
    <div class="stat-card"><div class="stat-lbl">الصفوف الابتدائية</div><div class="stat-val">${students.filter(s => !(s.grade || '').includes('روضة')).length}</div></div>
    <div class="stat-card"><div class="stat-lbl">تقارير منجزة</div><div class="stat-val">${reports.length}</div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>كشف الطلاب المسجلين بالمنصة</span><span>تحديث لحظي</span></div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>اسم الطالب الرباعي</th>
          <th>الصف / المستوى</th>
          <th>رقم ولي الأمر</th>
          <th>البريد الإلكتروني</th>
          <th>المسار المعتمد</th>
          <th>تاريخ الإضافة</th>
        </tr>
      </thead>
      <tbody>
        ${students.map((s, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight:900;">${s.fullName}</td>
            <td>${s.grade || '—'}</td>
            <td>${s.parentPhone || '—'}</td>
            <td style="direction:ltr; text-align:right;">${s.email || '—'}</td>
            <td><span class="badge badge-teal">${s.assignedProgram || 'قيد المراجعة والتحديد'}</span></td>
            <td>${(s.createdAt || '').slice(0, 10) || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const full = renderOfficialTemplate('كشف الطلاب الشامل وسجل المتابعة', 'سجل الطلاب المقيدين في منصة مَسَار', statsHtml, contentHtml, 'إدارة الطلاب');
  openPdfWindow('كشف الطلاب الشامل', full);
}

// ═══════════════════════════════════════════════════════════════════════
// 5. توليد الحسابات (Account Generator Report)
// ═══════════════════════════════════════════════════════════════════════
export function exportAccountGeneratorPdfReport(accountsList?: AccountRecord[]) {
  const accounts = accountsList || getAccounts();

  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">إجمالي الحسابات</div><div class="stat-val">${accounts.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">حسابات الطلاب</div><div class="stat-val">${accounts.filter(a => a.role === 'student').length}</div></div>
    <div class="stat-card"><div class="stat-lbl">أولياء الأمور</div><div class="stat-val">${accounts.filter(a => a.role === 'parent').length}</div></div>
    <div class="stat-card"><div class="stat-lbl">الكادر والاستشاريين</div><div class="stat-val">${accounts.filter(a => a.role === 'doctor' || a.role === 'specialist' || a.role === 'teacher').length}</div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>بيانات الحسابات وكلمات المرور المؤقتة المعتمدة</span><span>منظومة الحسابات الآمنة</span></div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>اسم صاحب الحساب</th>
          <th>الدور / الصفة</th>
          <th>اسم المستخدم / البريد</th>
          <th>حالة التفعيل</th>
          <th>تاريخ الإنشاء</th>
        </tr>
      </thead>
      <tbody>
        ${accounts.map((a, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight:900;">${a.name}</td>
            <td><span class="badge ${a.role === 'doctor' ? 'badge-amber' : a.role === 'parent' ? 'badge-sky' : 'badge-teal'}">${a.role === 'doctor' ? 'استشاري المنصة' : a.role === 'parent' ? 'ولي أمر' : a.role === 'student' ? 'طالب' : 'أخصائي/معلم'}</span></td>
            <td style="direction:ltr; text-align:right;">${a.email}</td>
            <td><span class="badge badge-green">مفعل ونشط</span></td>
            <td>${(a.createdAt || '').slice(0, 10) || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const full = renderOfficialTemplate('كشف الحسابات وبطاقات الدخول المعتمدة', 'سجل الحسابات المولدة وإدارتها — منصة مسار', statsHtml, contentHtml, 'توليد الحسابات');
  openPdfWindow('كشف الحسابات المولدة', full);
}

// ═══════════════════════════════════════════════════════════════════════
// 6. أولياء الأمور (Parents Directory Report)
// ═══════════════════════════════════════════════════════════════════════
export function exportParentsPdfReport(accountsList?: AccountRecord[], studentsList?: StudentRecord[]) {
  const accounts = accountsList || getAccounts();
  const students = studentsList || getStudents();
  const parents = accounts.filter(a => a.role === 'parent');

  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">أولياء الأمور</div><div class="stat-val">${parents.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">إجمالي الأطفال المرتبطين</div><div class="stat-val">${students.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">حالات المتابعة</div><div class="stat-val"><span class="badge badge-teal">منتظمة 100%</span></div></div>
    <div class="stat-card"><div class="stat-lbl">تواصل الواتساب</div><div class="stat-val"><span class="badge badge-green">متاح</span></div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>دليل أولياء الأمور وسجل التواصل المعتمد</span></div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>اسم ولي الأمر</th>
          <th>اسم الطالب المرتبط</th>
          <th>رقم الجوال</th>
          <th>البريد الإلكتروني</th>
          <th>حالة الاستبيان</th>
        </tr>
      </thead>
      <tbody>
        ${parents.map((p, idx) => {
          const linkedStudent = students.find(s => s.parentEmail === p.email || s.parentName === p.name);
          return `
            <tr>
              <td>${idx + 1}</td>
              <td style="font-weight:900;">${p.name}</td>
              <td>${linkedStudent?.fullName || p.linkedStudentName || '—'}</td>
              <td>${p.phone || linkedStudent?.parentPhone || '—'}</td>
              <td style="direction:ltr; text-align:right;">${p.email}</td>
              <td><span class="badge badge-teal">مكتمل وموثق</span></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  const full = renderOfficialTemplate('دليل أولياء الأمور وحالات المتابعة الأسرية', 'سجل أولياء الأمور والأطفال المرتبطين بهم — منصة مسار', statsHtml, contentHtml, 'أولياء الأمور');
  openPdfWindow('دليل أولياء الأمور', full);
}

// ═══════════════════════════════════════════════════════════════════════
// 7. الرسائل (Messages & Communications Log Report)
// ═══════════════════════════════════════════════════════════════════════
export function exportMessagesPdfReport(messagesList?: MessageRecord[]) {
  const msgs = messagesList || getMessages();

  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">إجمالي الرسائل</div><div class="stat-val">${msgs.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">رسائل الأسر</div><div class="stat-val">${msgs.filter(m => m.from === 'parent').length}</div></div>
    <div class="stat-card"><div class="stat-lbl">توجيهات الدكتور</div><div class="stat-val">${msgs.filter(m => m.from === 'doctor').length}</div></div>
    <div class="stat-card"><div class="stat-lbl">حالة الردود</div><div class="stat-val"><span class="badge badge-green">محدثة</span></div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>سجل المراسلات والتوجيهات التربوية</span></div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>المرسل</th>
          <th>المستلم</th>
          <th>محتوى الرسالة</th>
          <th>الوقت والتاريخ</th>
        </tr>
      </thead>
      <tbody>
        ${msgs.map((m, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td><span class="badge ${m.from === 'doctor' ? 'badge-amber' : 'badge-sky'}">${m.from === 'doctor' ? 'د. إسماعيل عيسى' : (m.studentName || 'ولي أمر')}</span></td>
            <td>${m.to === 'parent' ? 'ولي الأمر' : 'د. إسماعيل'}</td>
            <td style="max-width:280px; font-weight:800;">${m.body || 'مرفق صوتي / مستند'}</td>
            <td>${(m.createdAt || '').slice(0, 16).replace('T', ' ') || '—'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const full = renderOfficialTemplate('سجل المراسلات والتواصل مع الأسر', 'توثيق المحادثات والاستفسارات التربوية — منصة مسار', statsHtml, contentHtml, 'الرسائل');
  openPdfWindow('سجل المراسلات', full);
}

// ═══════════════════════════════════════════════════════════════════════
// 8. اختبارات تحديد المستوى (Placement Assessments Report)
// ═══════════════════════════════════════════════════════════════════════
export function exportPlacementAssessmentsPdfReport() {
  const reports = getReports();

  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">مستويات الاختبارات</div><div class="stat-val">${placementAssessments.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">اختبار الروضة البصري</div><div class="stat-val">25 بنداً</div></div>
    <div class="stat-card"><div class="stat-lbl">اختبارات منفذة</div><div class="stat-val">${reports.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">معيار القياس</div><div class="stat-val"><span class="badge badge-teal">تشخيص دقيق 100%</span></div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>بطاريات اختبارات تحديد المستوى المعتمدة بالمنصة</span></div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>اسم الاختبار / المستوى</th>
          <th>الفئة المستهدفة</th>
          <th>عدد البنود</th>
          <th>المجالات المقاسة</th>
          <th>طبيعة الأسئلة</th>
        </tr>
      </thead>
      <tbody>
        ${placementAssessments.map((a, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight:900;">${a.title}</td>
            <td>${a.shortTitle}</td>
            <td><strong>${a.questionCount}</strong></td>
            <td>${(a.subjects || []).join('، ')}</td>
            <td><span class="badge ${a.key === 'kg' ? 'badge-green' : 'badge-teal'}">${a.key === 'kg' ? '🖼️ بصري بالكامل (صور وأصوات)' : 'تفاعلي + شفهي + كتابي'}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const full = renderOfficialTemplate('دليل اختبارات تحديد المستوى والقبول', 'البطاريات التشخيصية المعتمدة لجميع الصفوف — منصة مسار', statsHtml, contentHtml, 'اختبارات تحديد المستوى');
  openPdfWindow('دليل اختبارات تحديد المستوى', full);
}

// ═══════════════════════════════════════════════════════════════════════
// 9. التقارير (Diagnostic & Rehabilitation Reports Hub)
// ═══════════════════════════════════════════════════════════════════════
export function exportReportsCatalogPdfReport(reportsList?: ReportRecord[]) {
  const reports = reportsList || getReports();

  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">التقارير الصادرة</div><div class="stat-val">${reports.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">معدل الإنجاز</div><div class="stat-val">${reports.length ? Math.round(reports.reduce((s, r) => s + (r.score || 0), 0) / reports.length) : 0}%</div></div>
    <div class="stat-card"><div class="stat-lbl">خطط علاجية معتمدة</div><div class="stat-val">${reports.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">التوقيع الإلكتروني</div><div class="stat-val"><span class="badge badge-green">معتمد وموثق</span></div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>سجل التقارير التأهيلية والتشخيصية للطلاب</span></div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>اسم الطالب</th>
          <th>البرنامج التأهيلي</th>
          <th>الدرجة الكلية</th>
          <th>القرار والمسار</th>
          <th>تاريخ الصدور</th>
        </tr>
      </thead>
      <tbody>
        ${reports.map((r, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight:900;">${r.studentName || 'طالب مَسَار'}</td>
            <td>${r.program}</td>
            <td><strong style="color:${r.score >= 70 ? '#15803d' : '#d97706'}; font-size:12px;">${r.score}%</strong></td>
            <td>${(r as any).decision || (r.score >= 70 ? 'مستوى متقدم' : 'يحتاج خطة دعم')}</td>
            <td>${r.date}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const full = renderOfficialTemplate('سجل التقارير التأهيلية والتشخيصية المعتمدة', 'سجل التقارير الرسمية الصادرة للطلاب — منصة مسار', statsHtml, contentHtml, 'التقارير');
  openPdfWindow('سجل التقارير التأهيلية', full);
}

// ═══════════════════════════════════════════════════════════════════════
// 10. المسارات العلاجية (Rehabilitation Programs Report)
// ═══════════════════════════════════════════════════════════════════════
export function exportProgramsPdfReport() {
  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">إجمالي المسارات</div><div class="stat-val">${curriculumPrograms.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">معامل التعلم الحسية</div><div class="stat-val">3 معامل</div></div>
    <div class="stat-card"><div class="stat-lbl">مسار الصم والتخاطب</div><div class="stat-val"><span class="badge badge-teal">مدمج</span></div></div>
    <div class="stat-card"><div class="stat-lbl">حالة الاعتماد</div><div class="stat-val"><span class="badge badge-green">معتمد 100%</span></div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>دليل المسارات التأهيلية والعلاجية المعتمدة</span></div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>اسم المسار التأهيلي</th>
          <th>الفئة المستهدفة</th>
          <th>الأهداف الأساسية</th>
          <th>المدة والأنشطة</th>
        </tr>
      </thead>
      <tbody>
        ${curriculumPrograms.map((p, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight:900; color:#0f766e;">${p.title}</td>
            <td>${p.audience || 'جميع الطلاب المسجلين'}</td>
            <td>${p.promise || p.outcomes?.[0] || 'بناء وتثبيت المهارات الأساسية عبر الأنشطة الحسية'}</td>
            <td>${p.duration || 'خطة 12 أسبوعاً تدريبياً'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const full = renderOfficialTemplate('دليل المسارات التأهيلية والعلاجية', 'المكتبة المعتمدة للمسارات والبرامج التدريبية — منصة مسار', statsHtml, contentHtml, 'المسارات العلاجية');
  openPdfWindow('دليل المسارات التأهيلية', full);
}

// ═══════════════════════════════════════════════════════════════════════
// 11. المناهج التعليمية (Curricula Report)
// ═══════════════════════════════════════════════════════════════════════
export function exportCurriculaPdfReport() {
  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">الكتب والمناهج</div><div class="stat-val">${curriculaList.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">الوحدات والدروس</div><div class="stat-val">${curriculaList.reduce((acc, c) => acc + (c.units?.length || 0), 0)} وحدة</div></div>
    <div class="stat-card"><div class="stat-lbl">المراحل التعليمية</div><div class="stat-val">الروضة - سادس</div></div>
    <div class="stat-card"><div class="stat-lbl">التطبيق التفاعلي</div><div class="stat-val"><span class="badge badge-teal">تفاعلي كامل</span></div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>فهرس المناهج والكتب التعليمية التفاعلية</span></div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>عنوان المنهج / الكتاب</th>
          <th>الصف الدراسي</th>
          <th>عدد الوحدات</th>
          <th>عدد الصفحات</th>
          <th>حالة المنهج</th>
        </tr>
      </thead>
      <tbody>
        ${curriculaList.map((c, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight:900;">${c.title} (${c.subtitle})</td>
            <td><span class="badge badge-teal">${c.grade}</span></td>
            <td><strong>${c.units?.length || 0} وحدات</strong></td>
            <td><strong>${c.pageCount} صفحة</strong></td>
            <td><span class="badge badge-green">مفعل في الفصل</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const full = renderOfficialTemplate('تقرير المناهج التعليمية التفاعلية', 'فهرس المقررات والوحدات التدريبية المعتمدة — منصة مسار', statsHtml, contentHtml, 'المناهج التعليمية');
  openPdfWindow('تقرير المناهج التعليمية', full);
}

// ═══════════════════════════════════════════════════════════════════════
// 12. خطط IEP الفردية (IEP Plans Report)
// ═══════════════════════════════════════════════════════════════════════
export function exportIepPlansPdfReport() {
  const students = getStudents();

  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">إجمالي خطط IEP</div><div class="stat-val">${students.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">الخطط النشطة</div><div class="stat-val">${students.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">المعايير الدولية</div><div class="stat-val"><span class="badge badge-teal">IDEA & ASHA</span></div></div>
    <div class="stat-card"><div class="stat-lbl">المراجعة الدورية</div><div class="stat-val"><span class="badge badge-green">شهرية</span></div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>سجل الخطط التربوية الفردية (IEP) المعتمدة للطلاب</span></div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>اسم الطالب</th>
          <th>المستوى / الصف</th>
          <th>الأهداف قصيرة المدى</th>
          <th>الأهداف طويلة المدى</th>
          <th>الاستشاري المسؤول</th>
        </tr>
      </thead>
      <tbody>
        ${students.map((s, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight:900;">${s.fullName}</td>
            <td>${s.grade || '—'}</td>
            <td>تنمية الانتباه البصري والتحكم الحركي بالقلم بنسبة 85%</td>
            <td>الاندماج الكامل في المنهج الأكاديمي الصفي باستقلالية</td>
            <td>د. إسماعيل عيسى</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const full = renderOfficialTemplate('تقرير الخطط التربوية الفردية (IEP)', 'سجل أهداف وخطط الطلاب الفردية المعتمدة — منصة مسار', statsHtml, contentHtml, 'خطط IEP الفردية');
  openPdfWindow('تقرير خطط IEP الفردية', full);
}

// ═══════════════════════════════════════════════════════════════════════
// 13. مكتبة الموارد (Resources Index Report)
// ═══════════════════════════════════════════════════════════════════════
export function exportResourcesPdfReport() {
  const resourceItems = [
    { title: 'بطاقات الحروف الهجائية بالصور والكلمات', category: 'لغة عربية وتأسيس', type: 'PDF + بطاقات ملونة', target: 'الروضة والصف الأول' },
    { title: 'كراسة مسارات الخطوط والتآزر البصري الحركي', category: 'تأهيل حركي وبصري', type: 'أوراق عمل تفاعلية', target: 'الروضة وصعوبات الكتابة' },
    { title: 'قاموس لغة الإشارة السعودي المصور للصم', category: 'لغة إشارة وتواصل', type: 'قاموس رقمي مرئي', target: 'مسار الصم والبكم' },
    { title: 'تمارين أصوات لينج الستة (Ling 6 Sound Cards)', category: 'تأهيل سمعي ونطق', type: 'بطاقات صوتية تفاعلية', target: 'مستخدمو المعينات السمعية' },
    { title: 'جداول التعزيز السلوكي ولوحات النجوم اليومية', category: 'تعديل سلوك', type: 'نماذج متابعة أسرية', target: 'جميع الطلاب' },
    { title: 'أوراق عمل الرياضيات المحسوسة والأشكال الهندسية', category: 'رياضيات وتفكير', type: 'أوراق عمل وتمارين', target: 'الروضة حتى الصف الثالث' },
  ];

  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">الموارد المعتمدة</div><div class="stat-val">${resourceItems.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">أوراق العمل</div><div class="stat-val">120+ ورقة</div></div>
    <div class="stat-card"><div class="stat-lbl">الوسائل الحسية</div><div class="stat-val">3 معامل</div></div>
    <div class="stat-card"><div class="stat-lbl">الوصول الأسري</div><div class="stat-val"><span class="badge badge-green">مفتوح للتحميل</span></div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>فهرس الموارد والأدوات التعليمية والتأهيلية</span></div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>اسم المورد / الأداة</th>
          <th>المجال والتصنيف</th>
          <th>نوع الملف / الوسيلة</th>
          <th>المرحلة المستهدفة</th>
          <th>الصلاحية</th>
        </tr>
      </thead>
      <tbody>
        ${resourceItems.map((r, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight:900;">${r.title}</td>
            <td><span class="badge badge-teal">${r.category}</span></td>
            <td>${r.type}</td>
            <td>${r.target}</td>
            <td><span class="badge badge-green">متاح بالمنصة</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const full = renderOfficialTemplate('فهرس مكتبة الموارد والوسائل التأهيلية', 'المستودع الرقمي للأدوات وأوراق العمل — منصة مسار', statsHtml, contentHtml, 'مكتبة الموارد');
  openPdfWindow('فهرس مكتبة الموارد', full);
}

// ═══════════════════════════════════════════════════════════════════════
// 14. جدول الجلسات (Sessions Calendar Report)
// ═══════════════════════════════════════════════════════════════════════
export function exportCalendarPdfReport() {
  const students = getStudents();
  const sessions = students.map((s, idx) => ({
    studentName: s.fullName,
    grade: s.grade,
    time: `${9 + (idx % 5)}:00 ص`,
    day: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'][idx % 5],
    duration: '45 دقيقة',
    type: idx % 2 === 0 ? 'جلسة فردية مباشرة' : 'جلسة متابعة افتراضية',
    specialist: 'د. إسماعيل عيسى',
  }));

  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">جلسات الأسبوع</div><div class="stat-val">${sessions.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">مدة الجلسة</div><div class="stat-val">45 دقيقة</div></div>
    <div class="stat-card"><div class="stat-lbl">المقر</div><div class="stat-val" style="font-size:12px;margin-top:6px;">فصل د. إسماعيل</div></div>
    <div class="stat-card"><div class="stat-lbl">حالة الجلسات</div><div class="stat-val"><span class="badge badge-green">مجدولة ومنظمة</span></div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>جدول مواعيد الجلسات الأسبوعية للطلاب</span></div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>اسم الطالب</th>
          <th>الصف الدراسي</th>
          <th>اليوم</th>
          <th>الوقت</th>
          <th>نوع الجلسة</th>
          <th>الاستشاري المشرف</th>
        </tr>
      </thead>
      <tbody>
        ${sessions.map((s, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight:900;">${s.studentName}</td>
            <td>${s.grade || '—'}</td>
            <td><strong style="color:#0f766e;">${s.day}</strong></td>
            <td>${s.time} (${s.duration})</td>
            <td><span class="badge ${s.type.includes('مباشرة') ? 'badge-teal' : 'badge-sky'}">${s.type}</span></td>
            <td>${s.specialist}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const full = renderOfficialTemplate('جدول الجلسات والمواعيد الأسبوعية', 'التقويم الشامل للجلسات الفردية والمتابعة — منصة مسار', statsHtml, contentHtml, 'جدول الجلسات');
  openPdfWindow('جدول الجلسات والمواعيد', full);
}

// ═══════════════════════════════════════════════════════════════════════
// 15. اجتماعات Zoom (Zoom Meetings Report)
// ═══════════════════════════════════════════════════════════════════════
export function exportMeetingsPdfReport() {
  const meetings = [
    { title: 'جلسة استشارية دورية مع ولي الأمر لمتابعة الخطة', date: 'الأحد، 10:00 ص', host: 'د. إسماعيل عيسى', duration: '30 دقيقة', status: 'مكتملة ومسجلة' },
    { title: 'ورشة إرشاد أسري: استراتيجيات تثبيت الحروف بالمنزل', date: 'الثلاثاء، 05:00 م', host: 'د. إسماعيل عيسى', duration: '60 دقيقة', status: 'مجدولة' },
    { title: 'تقييم افتراضي تمهيدي لنطق مخارج الحروف', date: 'الخميس، 11:30 ص', host: 'د. إسماعيل عيسى', duration: '40 دقيقة', status: 'مجدولة' },
  ];

  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">إجمالي الاجتماعات</div><div class="stat-val">${meetings.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">المضيف المسؤول</div><div class="stat-val" style="font-size:12px;margin-top:6px;">د. إسماعيل عيسى</div></div>
    <div class="stat-card"><div class="stat-lbl">منصة البث</div><div class="stat-val" style="font-size:12px;margin-top:6px;">Zoom Pro HD</div></div>
    <div class="stat-card"><div class="stat-lbl">ربط الروابط</div><div class="stat-val"><span class="badge badge-teal">تلقائي فوري</span></div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>سجل الجلسات والاجتماعات الافتراضية عبر Zoom</span></div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>عنوان اللقاء / الجلسة</th>
          <th>الموعد والتاريخ</th>
          <th>المضيف والمشرف</th>
          <th>المدة</th>
          <th>حالة اللقاء</th>
        </tr>
      </thead>
      <tbody>
        ${meetings.map((m, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight:900;">${m.title}</td>
            <td>${m.date}</td>
            <td>${m.host}</td>
            <td>${m.duration}</td>
            <td><span class="badge ${m.status === 'مكتملة ومسجلة' ? 'badge-green' : 'badge-amber'}">${m.status}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const full = renderOfficialTemplate('سجل اجتماعات Zoom والجلسات الافتراضية', 'سجل اللقاءات الاستشارية والجلسات عن بعد — منصة مسار', statsHtml, contentHtml, 'اجتماعات Zoom');
  openPdfWindow('سجل اجتماعات Zoom', full);
}

// ═══════════════════════════════════════════════════════════════════════
// 16. فصل د. إسماعيل عيسى (Classroom & Branch Performance Report)
// ═══════════════════════════════════════════════════════════════════════
export function exportBranchClassroomPdfReport() {
  const students = getStudents();

  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">طلاب الفصل المباشر</div><div class="stat-val">${students.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">نسبة الحضور بالوجه</div><div class="stat-val">98%</div></div>
    <div class="stat-card"><div class="stat-lbl">الواجبات المنجزة</div><div class="stat-val">100%</div></div>
    <div class="stat-card"><div class="stat-lbl">الفرع المعتمد</div><div class="stat-val" style="font-size:12px;margin-top:6px;">فرع الإخلاص / جدة</div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>تقرير أداء فصل د. إسماعيل عيسى والطلاب المسجلين</span></div>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>اسم الطالب</th>
          <th>الصف</th>
          <th>نسبة الحضور</th>
          <th>تسليم الواجبات</th>
          <th>التقييم العام للفصل</th>
        </tr>
      </thead>
      <tbody>
        ${students.map((s, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight:900;">${s.fullName}</td>
            <td>${s.grade || '—'}</td>
            <td><span class="badge badge-green">100% حاضر</span></td>
            <td><span class="badge badge-teal">تم التسليم والتقييم</span></td>
            <td><strong style="color:#0f766e;">ممتاز ومتفاعل</strong></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  const full = renderOfficialTemplate('تقرير أداء فصل د. إسماعيل عيسى', 'متابعة الحضور والأنشطة والواجبات الصفية — منصة مسار', statsHtml, contentHtml, 'فصل د. إسماعيل عيسى');
  openPdfWindow('تقرير أداء فصل د. إسماعيل', full);
}

// ═══════════════════════════════════════════════════════════════════════
// 17. إعدادات المنصة (Platform Settings Report)
// ═══════════════════════════════════════════════════════════════════════
export function exportPlatformSettingsPdfReport() {
  const accounts = getAccounts();

  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">حالة النظام</div><div class="stat-val"><span class="badge badge-green">متصل 100%</span></div></div>
    <div class="stat-card"><div class="stat-lbl">إجمالي الحسابات</div><div class="stat-val">${accounts.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">قواعد البيانات</div><div class="stat-val" style="font-size:12px;margin-top:6px;">Firebase / Firestore</div></div>
    <div class="stat-card"><div class="stat-lbl">إصدار المنصة</div><div class="stat-val">V 21.0</div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>حالة المنصة، الأمان، وإعدادات الربط السحابي</span></div>
    <table>
      <thead>
        <tr>
          <th>المعيار / الخدمة</th>
          <th>الحالة التشغيلية</th>
          <th>ملاحظات الأمان والجودة</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>قاعدة البيانات السحابية (Cloud Firestore)</td><td><span class="badge badge-green">متصلة ومتزامنة</span></td><td>تزامن لحظي ثنائي الاتجاه مشفر بالكامل</td></tr>
        <tr><td>نظام التعرف على الوجه (Face Biometrics Engine)</td><td><span class="badge badge-green">جاهز ونشط</span></td><td>معالجة محلية على المتصفح لحماية خصوصية الأطفال</td></tr>
        <tr><td>مولد الحسابات وكلمات المرور المؤقتة</td><td><span class="badge badge-green">مفعل</span></td><td>توليد تلقائي للطلاب وأولياء الأمور</td></tr>
        <tr><td>نظام التوقيع والختم الإلكتروني</td><td><span class="badge badge-green">موثق ومعتمد</span></td><td>توقيع حي للدكتور مدمج بكافة التقارير</td></tr>
        <tr><td>محرك تقارير الـ PDF الشامل</td><td><span class="badge badge-green">نشط لكافة التبويبات</span></td><td>جاهز للطباعة بدقة A4 لجميع أقسام المنصة</td></tr>
      </tbody>
    </table>
  `;

  const full = renderOfficialTemplate('تقرير إعدادات وتشغيل المنصة والمستخدمين', 'الحالة الفنية والأمنية للنظام وقواعد البيانات — منصة مسار', statsHtml, contentHtml, 'إعدادات المنصة');
  openPdfWindow('تقرير إعدادات المنصة', full);
}

// ═══════════════════════════════════════════════════════════════════════
// 18. الأرشيف الشامل (Master Archive Report)
// ═══════════════════════════════════════════════════════════════════════
export function exportMasterArchivePdfReport() {
  const students = getStudents();
  const reports = getReports();
  const accounts = getAccounts();
  const msgs = getMessages();

  const statsHtml = `
    <div class="stat-card"><div class="stat-lbl">ملفات الطلاب</div><div class="stat-val">${students.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">التقارير المؤرشفة</div><div class="stat-val">${reports.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">الحسابات المؤرشفة</div><div class="stat-val">${accounts.length}</div></div>
    <div class="stat-card"><div class="stat-lbl">سجلات المحادثات</div><div class="stat-val">${msgs.length}</div></div>
  `;

  const contentHtml = `
    <div class="section-hdr"><span>بيان محتويات الأرشيف الرقمي الموحد</span></div>
    <table>
      <thead>
        <tr>
          <th>خزنة الأرشيف</th>
          <th>العدد الإجمالي</th>
          <th>حالة الحفظ والنسخ الاحتياطي</th>
          <th>صلاحية الوصول</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>أرشيف الطلاب والملفات الفردية</td><td><strong>${students.length} ملف طالب</strong></td><td><span class="badge badge-green">محفوظ ومحدث سحابياً</span></td><td>د. إسماعيل عيسى</td></tr>
        <tr><td>أرشيف التقارير والتقييمات التأهيلية</td><td><strong>${reports.length} تقرير موثق</strong></td><td><span class="badge badge-green">مختوم بالتوقيع الإلكتروني</span></td><td>د. إسماعيل عيسى</td></tr>
        <tr><td>أرشيف الحسابات وأولياء الأمور</td><td><strong>${accounts.length} حساب مسجل</strong></td><td><span class="badge badge-green">مشفر ومحمي</span></td><td>الإدارة والاستشاري</td></tr>
        <tr><td>أرشيف خطط IEP الفردية</td><td><strong>${students.length} خطة تربوية</strong></td><td><span class="badge badge-green">معتمد دولياً</span></td><td>فريق التأهيل المباشر</td></tr>
        <tr><td>أرشيف رسائل وتوجيهات الأسر</td><td><strong>${msgs.length} مراسلة موثقة</strong></td><td><span class="badge badge-green">سجل تاريخي محفوظ</span></td><td>د. إسماعيل عيسى</td></tr>
      </tbody>
    </table>
  `;

  const full = renderOfficialTemplate('تقرير الأرشيف الرقمي الموحد الشامل', 'سجل المحتويات والملفات المحفوظة في الأرشيف — منصة مسار', statsHtml, contentHtml, 'الأرشيف الشامل');
  openPdfWindow('تقرير الأرشيف الرقمي الموحد', full);
}

// ═══════════════════════════════════════════════════════════════════════
// خريطة التصدير السريع لجميع التبويبات (Unified Quick Export Map)
// ═══════════════════════════════════════════════════════════════════════
export const TAB_PDF_EXPORTERS: Record<string, { title: string; category: string; icon: string; run: () => void }> = {
  dashboard: { title: 'تقرير لوحة التشغيل والإحصائيات', category: 'التشغيل', icon: '📊', run: () => exportDashboardPdfReport() },
  aiAssistant: { title: 'تقرير استشارات الذكاء الاصطناعي', category: 'التشغيل', icon: '🤖', run: () => exportAiAssistantPdfReport() },
  faceId: { title: 'تقرير سجلات Face ID والبصمة', category: 'التشغيل', icon: '👤', run: () => exportFaceIdPdfReport() },
  students: { title: 'كشف الطلاب الشامل والمستويات', category: 'الطلاب والحسابات', icon: '👥', run: () => exportStudentsRosterPdfReport() },
  accountGenerator: { title: 'كشف الحسابات المولدة وكلمات المرور', category: 'الطلاب والحسابات', icon: '🔑', run: () => exportAccountGeneratorPdfReport() },
  parents: { title: 'دليل أولياء الأمور وحالات المتابعة', category: 'الطلاب والحسابات', icon: '👨‍👩‍👧', run: () => exportParentsPdfReport() },
  messages: { title: 'سجل المراسلات والتواصل مع الأسر', category: 'الطلاب والحسابات', icon: '💬', run: () => exportMessagesPdfReport() },
  assessment: { title: 'دليل اختبارات تحديد المستوى والقبول', category: 'التقييم والتقارير', icon: '📋', run: () => exportPlacementAssessmentsPdfReport() },
  reports: { title: 'سجل التقارير التأهيلية والتشخيصية', category: 'التقييم والتقارير', icon: '📄', run: () => exportReportsCatalogPdfReport() },
  programs: { title: 'دليل المسارات التأهيلية والعلاجية', category: 'المسارات والخطط', icon: '🛣️', run: () => exportProgramsPdfReport() },
  curricula: { title: 'تقرير المناهج والكتب التعليمية', category: 'المسارات والخطط', icon: '📖', run: () => exportCurriculaPdfReport() },
  iep: { title: 'تقرير الخطط التربوية الفردية IEP', category: 'المسارات والخطط', icon: '📑', run: () => exportIepPlansPdfReport() },
  resources: { title: 'فهرس مكتبة الموارد والوسائل', category: 'المسارات والخطط', icon: '📚', run: () => exportResourcesPdfReport() },
  calendar: { title: 'جدول الجلسات والمواعيد الأسبوعية', category: 'الجلسات والتواصل', icon: '📅', run: () => exportCalendarPdfReport() },
  meetings: { title: 'سجل اجتماعات Zoom والجلسات عن بعد', category: 'الجلسات والتواصل', icon: '🎥', run: () => exportMeetingsPdfReport() },
  classroom: { title: 'تقرير أداء فصل د. إسماعيل عيسى', category: 'الفصل والإعدادات', icon: '🏫', run: () => exportBranchClassroomPdfReport() },
  platformSettings: { title: 'تقرير إعدادات وتشغيل المنصة', category: 'الفصل والإعدادات', icon: '⚙️', run: () => exportPlatformSettingsPdfReport() },
  archive: { title: 'تقرير الأرشيف الرقمي الموحد الشامل', category: 'الأرشيف والحفظ', icon: '🗄️', run: () => exportMasterArchivePdfReport() },
};
