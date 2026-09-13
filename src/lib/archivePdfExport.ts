'use client';

/**
 * archivePdfExport.ts
 * تصدير أي مجموعة بيانات من الأرشيف كـ PDF جاهز للطباعة.
 * يُولّد HTML في نافذة جديدة ويفتح نافذة الطباعة مباشرةً.
 */

import type { PersonArchiveProfile } from './archiveSnapshot';

const MASAR_GREEN = '#06392c';
const MASAR_LIGHT = '#f0fdf4';
const PAGE_BREAK_EVERY = 40; // سطور

// ─── الترويسة المشتركة ─────────────────────────────────────────────────────
function headerHtml(title: string, subtitle = '') {
  const now = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
  return `
    <div class="hdr">
      <div class="hdr-logo">مَسَار</div>
      <div class="hdr-center">
        <div class="hdr-title">${title}</div>
        ${subtitle ? `<div class="hdr-sub">${subtitle}</div>` : ''}
        <div class="hdr-date">${now}</div>
      </div>
      <div class="hdr-stamp">الأرشيف الرسمي<br/>د. إسماعيل عيسى</div>
    </div>`;
}

// ─── الأنماط المشتركة ─────────────────────────────────────────────────────
const BASE_CSS = `
  @page { size: A4 landscape; margin: 12mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; background: #fff; color: #1e293b; font-size: 10px; margin: 0; padding: 0; }
  .no-print { padding: 10px 16px; background: ${MASAR_GREEN}; text-align: center; }
  .no-print button { background: #f59e0b; color: #0f172a; font-weight: 900; border: none; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 13px; }
  .page-wrap { padding: 6mm 8mm; }
  .hdr { display: flex; align-items: center; justify-content: space-between; background: ${MASAR_GREEN}; color: #fff; padding: 8px 12px; border-radius: 10px; margin-bottom: 10px; }
  .hdr-logo { font-size: 20px; font-weight: 900; letter-spacing: 1px; min-width: 60px; }
  .hdr-center { text-align: center; flex: 1; }
  .hdr-title { font-size: 14px; font-weight: 900; }
  .hdr-sub { font-size: 10px; opacity: .8; margin-top: 2px; }
  .hdr-date { font-size: 9px; opacity: .7; margin-top: 2px; }
  .hdr-stamp { font-size: 9px; text-align: left; opacity: .85; min-width: 90px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
  thead { background: ${MASAR_GREEN}; color: #fff; }
  th { padding: 5px 6px; font-size: 9px; font-weight: 900; text-align: right; white-space: nowrap; }
  td { padding: 4px 6px; font-size: 9px; border-bottom: 1px solid #e2e8f0; }
  tr:nth-child(even) td { background: ${MASAR_LIGHT}; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 6px; font-weight: 900; font-size: 8px; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-amber { background: #fef3c7; color: #92400e; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-sky { background: #e0f2fe; color: #0369a1; }
  .badge-violet { background: #ede9fe; color: #6d28d9; }
  .footer { text-align: center; font-size: 8px; color: #94a3b8; margin-top: 8px; border-top: 1px solid #e2e8f0; padding-top: 4px; }
  .section-title { font-size: 12px; font-weight: 900; color: ${MASAR_GREEN}; border-bottom: 2px solid ${MASAR_GREEN}; padding-bottom: 4px; margin: 10px 0 6px; }
  .count-bar { display: flex; gap: 12px; margin-bottom: 8px; }
  .count-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px 10px; font-weight: 900; font-size: 9px; color: #475569; }
  .page-break { page-break-after: always; }
`;

// ─── فتح نافذة PDF ─────────────────────────────────────────────────────────
function openPdfWindow(title: string, bodyHtml: string, autoPrint = false) {
  const win = window.open('', '_blank');
  if (!win) { alert('يرجى السماح بالنوافذ المنبثقة لتصدير PDF'); return; }
  win.document.write(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title} — مسار</title>
  <style>${BASE_CSS}</style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">🖨️ طباعة / حفظ PDF الآن</button>
    <button onclick="window.close()" style="background:#94a3b8;margin-right:8px;">إغلاق</button>
  </div>
  <div class="page-wrap">${bodyHtml}</div>
  <script>
    ${autoPrint ? `window.addEventListener('load',()=>setTimeout(()=>window.print(),400));` : ''}
  </script>
</body>
</html>`);
  win.document.close();
}

// ─── مساعد تنسيق القيمة ────────────────────────────────────────────────────
function val(v: unknown, fallback = '—'): string {
  if (v === null || v === undefined || v === '') return fallback;
  if (typeof v === 'boolean') return v ? '✓ نعم' : '—';
  return String(v);
}

function dateVal(v: unknown): string {
  if (!v) return '—';
  return String(v).slice(0, 10);
}

// ─── 1. PDF ملف الطالب الشخصي ─────────────────────────────────────────────
export function exportStudentProfilePdf(profile: PersonArchiveProfile, autoPrint = false) {
  const studentData = profile.student;
  const reports = studentData?.reports || [];
  const surveys = studentData?.surveys || [];
  const attendance = studentData?.attendanceRecords || [];
  const assignedPrograms = studentData?.assignedPrograms?.join('، ') || '—';
  const parentName = (studentData?.studentRecord as any)?.parentName || (profile.parent?.linkedStudents?.[0]?.name) || '—';

  const body = `
    ${headerHtml(`ملف الطالب الأرشيفي — ${profile.fullName}`, `${profile.type === 'student' ? 'طالب' : 'مستخدم'} | ${profile.schoolBranch || ''}`)}

    <div class="count-bar">
      <span class="count-item">🎓 رقم الملف: ${profile.archiveId}</span>
      <span class="count-item">📅 تاريخ التسجيل: ${dateVal(profile.createdAt)}</span>
      <span class="count-item">📧 الإيميل: ${profile.emails[0] || '—'}</span>
      ${profile.nationalId ? `<span class="count-item">🪪 الهوية: ${profile.nationalId}</span>` : ''}
      ${profile.phone ? `<span class="count-item">📞 الهاتف: ${profile.phone}</span>` : ''}
    </div>

    <div class="section-title">📋 البيانات الأساسية</div>
    <table>
      <thead><tr><th>البيان</th><th>القيمة</th><th>البيان</th><th>القيمة</th></tr></thead>
      <tbody>
        <tr><td>الاسم الكامل</td><td>${val(profile.fullName)}</td><td>الدور في المنصة</td><td>${val(profile.type)}</td></tr>
        <tr><td>الإيميل الرئيسي</td><td>${val(profile.emails[0])}</td><td>الفرع</td><td>${val(profile.schoolBranch)}</td></tr>
        <tr><td>رقم الهوية الوطنية</td><td>${val(profile.nationalId)}</td><td>رقم الهاتف</td><td>${val(profile.phone)}</td></tr>
        <tr><td>اسم ولي الأمر</td><td>${val(parentName)}</td><td>الصف الدراسي</td><td>${val(profile.grade)}</td></tr>
        <tr><td>المسار التعليمي</td><td>${val(assignedPrograms)}</td><td>بصمة الوجه</td><td>${profile.faceEnrolled ? '<span class="badge badge-green">✓ مسجلة</span>' : '<span class="badge badge-amber">غير مسجلة</span>'}</td></tr>
      </tbody>
    </table>

    ${reports.length > 0 ? `
    <div class="section-title">📄 التقارير (${reports.length})</div>
    <table>
      <thead><tr><th>#</th><th>النوع</th><th>المسار</th><th>الدرجة</th><th>الحالة</th><th>التاريخ</th></tr></thead>
      <tbody>
        ${reports.map((r: any, i: number) => `
          <tr>
            <td>${i + 1}</td>
            <td>${val(r.type)}</td>
            <td>${val(r.program)}</td>
            <td>${r.score !== undefined ? r.score + '%' : '—'}</td>
            <td><span class="badge ${r.status === 'completed' ? 'badge-green' : 'badge-amber'}">${r.status === 'completed' ? 'مكتمل' : 'قيد الانتظار'}</span></td>
            <td>${dateVal(r.date || r.createdAt)}</td>
          </tr>`).join('')}
      </tbody>
    </table>` : ''}

    ${surveys.length > 0 ? `
    <div class="section-title">📋 الاستبيانات (${surveys.length})</div>
    <table>
      <thead><tr><th>#</th><th>الصف</th><th>ولي الأمر</th><th>الهاتف</th><th>عدد الإجابات</th><th>تاريخ الإرسال</th></tr></thead>
      <tbody>
        ${surveys.map((s: any, i: number) => `
          <tr>
            <td>${i + 1}</td>
            <td>${val(s.grade)}</td>
            <td>${val(s.parentName)}</td>
            <td>${val(s.parentPhone)}</td>
            <td>${s.answers ? Object.keys(s.answers).length : 0}</td>
            <td>${dateVal(s.submittedAt)}</td>
          </tr>`).join('')}
      </tbody>
    </table>` : ''}

    ${attendance.length > 0 ? `
    <div class="section-title">✅ سجل الحضور (${attendance.length})</div>
    <table>
      <thead><tr><th>#</th><th>التاريخ</th><th>الوقت</th><th>الحالة</th><th>طريقة التحقق</th><th>أُبلغ ولي الأمر</th></tr></thead>
      <tbody>
        ${attendance.slice(0, PAGE_BREAK_EVERY).map((a: any, i: number) => `
          <tr>
            <td>${i + 1}</td>
            <td>${val(a.sessionDate)}</td>
            <td>${val(a.sessionTime)}</td>
            <td><span class="badge ${a.status === 'present' ? 'badge-green' : a.status === 'late' ? 'badge-amber' : 'badge-red'}">${a.status === 'present' ? 'حاضر' : a.status === 'late' ? 'متأخر' : 'غائب'}</span></td>
            <td>${val(a.verifiedVia)}</td>
            <td>${a.parentNotified ? '✓' : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>` : ''}

    <div class="footer">منصة مَسَار للتأهيل والتعليم الذكي — الأرشيف الرسمي — جميع الحقوق محفوظة</div>`;

  openPdfWindow(`ملف الطالب — ${profile.fullName}`, body, autoPrint);
}

// ─── 2. PDF تقرير واحد ────────────────────────────────────────────────────
export function exportReportPdf(report: Record<string, unknown>, autoPrint = false) {
  const r = report as any;
  const scoreColor = Number(r.score) >= 70 ? 'badge-green' : Number(r.score) >= 50 ? 'badge-amber' : 'badge-red';
  const body = `
    ${headerHtml(`تقرير أرشيفي — ${r.studentName || '—'}`, r.program || '')}

    <div class="count-bar">
      <span class="count-item">رقم التقرير: ${r.id || '—'}</span>
      <span class="count-item">النوع: ${r.type || '—'}</span>
      <span class="count-item">التاريخ: ${dateVal(r.date || r.createdAt)}</span>
    </div>

    <div class="section-title">بيانات التقرير</div>
    <table>
      <thead><tr><th>البيان</th><th>القيمة</th><th>البيان</th><th>القيمة</th></tr></thead>
      <tbody>
        <tr><td>اسم الطالب</td><td>${val(r.studentName)}</td><td>المسار</td><td>${val(r.program)}</td></tr>
        <tr><td>النوع</td><td>${val(r.type)}</td><td>الدرجة</td><td><span class="badge ${scoreColor}">${r.score !== undefined ? r.score + '%' : '—'}</span></td></tr>
        <tr><td>الحالة</td><td>${r.status === 'completed' ? '<span class="badge badge-green">مكتمل</span>' : '<span class="badge badge-amber">قيد الانتظار</span>'}</td><td>أُرسل لولي الأمر</td><td>${r.dispatchedToParent ? '<span class="badge badge-green">✓ نعم</span>' : '—'}</td></tr>
      </tbody>
    </table>

    ${r.summary ? `
    <div class="section-title">الملخص التحليلي</div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;font-size:10px;line-height:1.7;">${r.summary}</div>
    ` : ''}

    ${r.answers && Object.keys(r.answers).length > 0 ? `
    <div class="section-title">الإجابات التفصيلية (${Object.keys(r.answers).length})</div>
    <table>
      <thead><tr><th>#</th><th>السؤال</th><th>الإجابة</th></tr></thead>
      <tbody>
        ${Object.entries(r.answers as Record<string, unknown>).map(([q, a], i) => `
          <tr><td>${i + 1}</td><td>${q}</td><td>${val(a)}</td></tr>`).join('')}
      </tbody>
    </table>` : ''}

    <div class="footer">منصة مَسَار للتأهيل والتعليم الذكي — الأرشيف الرسمي — جميع الحقوق محفوظة</div>`;

  openPdfWindow(`تقرير — ${r.studentName}`, body, autoPrint);
}

// ─── 3. PDF استبيان واحد ─────────────────────────────────────────────────
export function exportSurveyPdf(survey: Record<string, unknown>, autoPrint = false) {
  const s = survey as any;
  const body = `
    ${headerHtml(`استبيان — ${s.studentName || '—'}`, `الصف: ${s.grade || '—'} | ولي الأمر: ${s.parentName || '—'}`)}

    <div class="count-bar">
      <span class="count-item">رقم الاستبيان: ${s.id || '—'}</span>
      <span class="count-item">التاريخ: ${dateVal(s.submittedAt)}</span>
      <span class="count-item">الهاتف: ${s.parentPhone || '—'}</span>
      <span class="count-item">الإيميل: ${s.parentEmail || '—'}</span>
    </div>

    ${s.answers && Object.keys(s.answers).length > 0 ? `
    <div class="section-title">إجابات الاستبيان (${Object.keys(s.answers).length} سؤال)</div>
    <table>
      <thead><tr><th>#</th><th>السؤال</th><th>الإجابة</th></tr></thead>
      <tbody>
        ${Object.entries(s.answers as Record<string, unknown>).map(([q, a], i) => `
          <tr><td>${i + 1}</td><td style="max-width:200px;">${q}</td><td>${val(a)}</td></tr>`).join('')}
      </tbody>
    </table>` : '<p style="color:#94a3b8;text-align:center;padding:20px;">لا توجد إجابات</p>'}

    <div class="footer">منصة مَسَار للتأهيل والتعليم الذكي — الأرشيف الرسمي — جميع الحقوق محفوظة</div>`;

  openPdfWindow(`استبيان — ${s.studentName}`, body, autoPrint);
}

// ─── 4. PDF مجموعة تقارير كاملة ─────────────────────────────────────────
export function exportReportsCollectionPdf(reports: Record<string, unknown>[], autoPrint = false) {
  const body = `
    ${headerHtml('أرشيف التقارير الكامل', `العدد الإجمالي: ${reports.length} تقرير`)}

    <div class="count-bar">
      <span class="count-item">إجمالي التقارير: ${reports.length}</span>
      <span class="count-item">تاريخ التصدير: ${new Date().toLocaleDateString('ar-SA')}</span>
    </div>

    <table>
      <thead>
        <tr>
          <th>#</th><th>اسم الطالب</th><th>المسار</th><th>النوع</th>
          <th>الدرجة</th><th>الحالة</th><th>أُرسل لولي الأمر</th><th>التاريخ</th>
        </tr>
      </thead>
      <tbody>
        ${reports.map((r: any, i) => `
          <tr>
            <td>${i + 1}</td>
            <td style="font-weight:900;">${val(r.studentName)}</td>
            <td>${val(r.program)}</td>
            <td><span class="badge badge-amber">${val(r.type)}</span></td>
            <td><span class="badge ${Number(r.score) >= 70 ? 'badge-green' : Number(r.score) >= 50 ? 'badge-amber' : 'badge-red'}">${r.score !== undefined ? r.score + '%' : '—'}</span></td>
            <td>${r.status === 'completed' ? '<span class="badge badge-green">مكتمل</span>' : '<span class="badge badge-amber">انتظار</span>'}</td>
            <td>${r.dispatchedToParent ? '✓' : '—'}</td>
            <td>${dateVal(r.date || r.createdAt)}</td>
          </tr>`).join('')}
      </tbody>
    </table>

    <div class="footer">منصة مَسَار للتأهيل والتعليم الذكي — الأرشيف الرسمي — جميع الحقوق محفوظة</div>`;

  openPdfWindow('أرشيف التقارير', body, autoPrint);
}

// ─── 5. PDF مجموعة استبيانات كاملة ─────────────────────────────────────
export function exportSurveysCollectionPdf(surveys: Record<string, unknown>[], autoPrint = false) {
  const body = `
    ${headerHtml('أرشيف الاستبيانات الكامل', `العدد الإجمالي: ${surveys.length} استبيان`)}

    <table>
      <thead>
        <tr><th>#</th><th>اسم الطالب</th><th>الصف</th><th>ولي الأمر</th><th>الهاتف</th><th>الإيميل</th><th>الإجابات</th><th>التاريخ</th></tr>
      </thead>
      <tbody>
        ${surveys.map((s: any, i) => `
          <tr>
            <td>${i + 1}</td>
            <td style="font-weight:900;">${val(s.studentName)}</td>
            <td>${val(s.grade)}</td>
            <td>${val(s.parentName)}</td>
            <td>${val(s.parentPhone)}</td>
            <td>${val(s.parentEmail)}</td>
            <td>${s.answers ? Object.keys(s.answers).length : 0}</td>
            <td>${dateVal(s.submittedAt)}</td>
          </tr>`).join('')}
      </tbody>
    </table>

    <div class="footer">منصة مَسَار للتأهيل والتعليم الذكي — الأرشيف الرسمي — جميع الحقوق محفوظة</div>`;

  openPdfWindow('أرشيف الاستبيانات', body, autoPrint);
}

// ─── 6. PDF شهادة من الأرشيف ─────────────────────────────────────────────
export function exportCertificatePdf(cert: Record<string, unknown>, autoPrint = false) {
  const c = cert as any;
  const body = `
    ${headerHtml(`شهادة — ${c.studentName || '—'}`, c.programTitle || c.title || '')}

    <div class="count-bar">
      <span class="count-item">رقم الشهادة: ${c.certNumber || c.id || '—'}</span>
      <span class="count-item">التاريخ: ${dateVal(c.completionDate || c.createdAt)}</span>
      <span class="count-item">الدرجة: ${c.score !== undefined ? c.score + '%' : '—'}</span>
    </div>

    <table>
      <thead><tr><th>البيان</th><th>القيمة</th><th>البيان</th><th>القيمة</th></tr></thead>
      <tbody>
        <tr><td>اسم الطالب</td><td style="font-weight:900;">${val(c.studentName)}</td><td>عنوان الشهادة</td><td>${val(c.title)}</td></tr>
        <tr><td>البرنامج</td><td>${val(c.programTitle)}</td><td>الدرجة</td><td>${c.score !== undefined ? c.score + '%' : '—'}</td></tr>
        <tr><td>رقم الشهادة</td><td>${val(c.certNumber)}</td><td>أُرسلت لولي الأمر</td><td>${c.dispatchedToParent ? '✓ نعم' : '—'}</td></tr>
        <tr><td>تاريخ الإتمام</td><td>${dateVal(c.completionDate || c.createdAt)}</td><td>المشرف</td><td>د. إسماعيل عيسى</td></tr>
      </tbody>
    </table>

    <div class="footer">منصة مَسَار للتأهيل والتعليم الذكي — الأرشيف الرسمي — جميع الحقوق محفوظة</div>`;

  openPdfWindow(`شهادة — ${c.studentName}`, body, autoPrint);
}

// ─── 7. PDF طلاب (قائمة) ────────────────────────────────────────────────
export function exportStudentsCollectionPdf(students: Record<string, unknown>[], autoPrint = false) {
  const body = `
    ${headerHtml('قائمة الطلاب الأرشيفية', `العدد الإجمالي: ${students.length} طالب`)}

    <table>
      <thead>
        <tr><th>#</th><th>الاسم الكامل</th><th>الصف</th><th>الإيميل</th><th>رقم الهوية</th><th>الفرع</th><th>المسار</th><th>ولي الأمر</th><th>الهاتف</th><th>تاريخ الإضافة</th></tr>
      </thead>
      <tbody>
        ${students.map((s: any, i) => `
          <tr>
            <td>${i + 1}</td>
            <td style="font-weight:900;">${val(s.fullName || s.name)}</td>
            <td>${val(s.grade)}</td>
            <td style="font-size:8px;">${val(s.email)}</td>
            <td>${val(s.nationalId)}</td>
            <td>${val(s.schoolBranch)}</td>
            <td>${val(s.assignedProgram)}</td>
            <td>${val(s.parentName)}</td>
            <td>${val(s.parentPhone)}</td>
            <td>${dateVal(s.createdAt)}</td>
          </tr>`).join('')}
      </tbody>
    </table>

    <div class="footer">منصة مَسَار للتأهيل والتعليم الذكي — الأرشيف الرسمي — جميع الحقوق محفوظة</div>`;

  openPdfWindow('قائمة الطلاب', body, autoPrint);
}

// ─── 8. PDF ملف ولي الأمر الشخصي ─────────────────────────────────────────
export function exportAccountPdf(account: Record<string, unknown>, autoPrint = false) {
  const a = account as any;
  const body = `
    ${headerHtml(`ملف حساب — ${a.name || '—'}`, `الدور: ${a.role || '—'} | الفرع: ${a.schoolBranch || '—'}`)}

    <table>
      <thead><tr><th>البيان</th><th>القيمة</th><th>البيان</th><th>القيمة</th></tr></thead>
      <tbody>
        <tr><td>الاسم</td><td style="font-weight:900;">${val(a.name)}</td><td>الدور</td><td><span class="badge badge-violet">${val(a.role)}</span></td></tr>
        <tr><td>الإيميل</td><td>${val(a.email)}</td><td>الهاتف</td><td>${val(a.phone)}</td></tr>
        <tr><td>الفرع</td><td>${val(a.schoolBranch)}</td><td>طريقة التسجيل</td><td>${val(a.createdVia)}</td></tr>
        <tr><td>آخر دخول</td><td>${dateVal(a.lastLoginAt)}</td><td>تاريخ الإنشاء</td><td>${dateVal(a.createdAt)}</td></tr>
      </tbody>
    </table>

    <div class="footer">منصة مَسَار للتأهيل والتعليم الذكي — الأرشيف الرسمي — جميع الحقوق محفوظة</div>`;

  openPdfWindow(`ملف حساب — ${a.name}`, body, autoPrint);
}

// ─── 9. PDF بطاقة بيانات طالب مفرد ────────────────────────────────────────
export function exportStudentCardPdf(student: Record<string, unknown>, autoPrint = false) {
  const s = student as any;
  const body = `
    ${headerHtml(`بطاقة طالب أرشيفية — ${s.fullName || s.name || '—'}`, `الصف: ${s.grade || '—'} | الفرع: ${s.schoolBranch || '—'}`)}

    <div class="count-bar">
      <span class="count-item">🎓 رقم الطالب: ${s.id || '—'}</span>
      <span class="count-item">📅 تاريخ التسجيل: ${dateVal(s.createdAt)}</span>
      ${s.nationalId ? `<span class="count-item">🪪 رقم الهوية: ${s.nationalId}</span>` : ''}
    </div>

    <div class="section-title">بيانات الطالب الشخصية والأكاديمية</div>
    <table>
      <thead><tr><th>البيان</th><th>القيمة</th><th>البيان</th><th>القيمة</th></tr></thead>
      <tbody>
        <tr><td>الاسم الكامل</td><td style="font-weight:900;">${val(s.fullName || s.name)}</td><td>الصف الدراسي</td><td>${val(s.grade)}</td></tr>
        <tr><td>البريد الإلكتروني</td><td>${val(s.email)}</td><td>الفرع</td><td>${val(s.schoolBranch)}</td></tr>
        <tr><td>رقم الهوية الوطنية</td><td>${val(s.nationalId)}</td><td>المسار التعليمي</td><td>${val(s.assignedProgram)}</td></tr>
        <tr><td>اسم ولي الأمر</td><td>${val(s.parentName)}</td><td>هاتف ولي الأمر</td><td>${val(s.parentPhone)}</td></tr>
        <tr><td>المدينة / العنوان</td><td>${val(s.city || s.address)}</td><td>الحالة الصحية/التشخيص</td><td>${val(s.diagnosis || s.medicalNotes)}</td></tr>
      </tbody>
    </table>

    <div class="footer">منصة مَسَار للتأهيل والتعليم الذكي — الأرشيف الرسمي — جميع الحقوق محفوظة</div>`;

  openPdfWindow(`بطاقة طالب — ${s.fullName || s.name}`, body, autoPrint);
}

// ─── 10. PDF فاتورة مفردة ────────────────────────────────────────────────
export function exportInvoicePdf(invoice: Record<string, unknown>, autoPrint = false) {
  const inv = invoice as any;
  const body = `
    ${headerHtml(`فاتورة مالية رسمية — ${inv.invoiceNumber || '—'}`, `الجهة: منصة مسار التعليمية`)}

    <div class="count-bar">
      <span class="count-item">رقم الفاتورة: ${inv.invoiceNumber || inv.id || '—'}</span>
      <span class="count-item">التاريخ: ${dateVal(inv.createdAt)}</span>
      <span class="count-item">الحالة: ${inv.status === 'paid' ? 'مدفوعة' : 'غير مدفوعة'}</span>
    </div>

    <div class="section-title">تفاصيل الفاتورة</div>
    <table>
      <thead><tr><th>البيان</th><th>القيمة</th><th>البيان</th><th>القيمة</th></tr></thead>
      <tbody>
        <tr><td>اسم الطالب</td><td style="font-weight:900;">${val(inv.studentName)}</td><td>اسم ولي الأمر</td><td>${val(inv.parentName)}</td></tr>
        <tr><td>المبلغ الإجمالي</td><td style="font-weight:900;font-size:12px;color:#065f46;">${val(inv.amount)} ${val(inv.currency || 'ر.س')}</td><td>تاريخ الاستحقاق</td><td>${dateVal(inv.dueDate)}</td></tr>
        <tr><td>الوصف</td><td colspan="3">${val(inv.description)}</td></tr>
      </tbody>
    </table>

    <div class="footer">منصة مَسَار للتأهيل والتعليم الذكي — الأرشيف المالي — جميع الحقوق محفوظة</div>`;

  openPdfWindow(`فاتورة — ${inv.invoiceNumber || inv.studentName}`, body, autoPrint);
}

// ─── 11. PDF مجموعة فواتير ────────────────────────────────────────────────
export function exportInvoicesCollectionPdf(invoices: Record<string, unknown>[], autoPrint = false) {
  const body = `
    ${headerHtml('كشف الفواتير الأرشيفي', `العدد الإجمالي: ${invoices.length} فاتورة`)}

    <table>
      <thead>
        <tr><th>#</th><th>رقم الفاتورة</th><th>الطالب</th><th>ولي الأمر</th><th>المبلغ</th><th>الحالة</th><th>تاريخ الاستحقاق</th><th>تاريخ الإنشاء</th></tr>
      </thead>
      <tbody>
        ${invoices.map((inv: any, i) => `
          <tr>
            <td>${i + 1}</td>
            <td style="font-family:monospace;">${val(inv.invoiceNumber)}</td>
            <td style="font-weight:900;">${val(inv.studentName)}</td>
            <td>${val(inv.parentName)}</td>
            <td style="font-weight:900;">${val(inv.amount)} ${val(inv.currency || 'ر.س')}</td>
            <td><span class="badge ${inv.status === 'paid' ? 'badge-green' : inv.status === 'overdue' ? 'badge-red' : 'badge-amber'}">${inv.status === 'paid' ? 'مدفوعة' : inv.status === 'overdue' ? 'متأخرة' : 'غير مدفوعة'}</span></td>
            <td>${dateVal(inv.dueDate)}</td>
            <td>${dateVal(inv.createdAt)}</td>
          </tr>`).join('')}
      </tbody>
    </table>

    <div class="footer">منصة مَسَار للتأهيل والتعليم الذكي — الأرشيف المالي — جميع الحقوق محفوظة</div>`;

  openPdfWindow('كشف الفواتير', body, autoPrint);
}

// ─── 12. PDF خطة فردية IEP ────────────────────────────────────────────────
export function exportIepPdf(iep: Record<string, unknown>, autoPrint = false) {
  const r = iep as any;
  const body = `
    ${headerHtml(`خطة التدخل الفردي (IEP) — ${r.studentName || '—'}`, `المشرف: ${r.doctorName || 'د. إسماعيل عيسى'}`)}

    <div class="count-bar">
      <span class="count-item">رقم الخطة: ${r.id || '—'}</span>
      <span class="count-item">الحالة: ${r.status || 'نشط'}</span>
      <span class="count-item">تاريخ البداية: ${dateVal(r.startDate || r.createdAt)}</span>
    </div>

    <div class="section-title">البيانات العامة</div>
    <table>
      <thead><tr><th>البيان</th><th>القيمة</th><th>البيان</th><th>القيمة</th></tr></thead>
      <tbody>
        <tr><td>اسم الطالب</td><td style="font-weight:900;">${val(r.studentName)}</td><td>الاستشاري / الأخصائي</td><td>${val(r.doctorName)}</td></tr>
        <tr><td>الحالة</td><td>${val(r.status)}</td><td>تاريخ المراجعة القادمة</td><td>${dateVal(r.nextReviewDate)}</td></tr>
        <tr><td>الأهداف الرئيسية</td><td colspan="3">${val(r.primaryGoals || r.goalsSummary)}</td></tr>
      </tbody>
    </table>

    ${Array.isArray(r.goals) && r.goals.length > 0 ? `
    <div class="section-title">الأهداف التفصيلية (${r.goals.length})</div>
    <table>
      <thead><tr><th>#</th><th>المجال</th><th>الهدف</th><th>التقدم</th><th>الحالة</th></tr></thead>
      <tbody>
        ${r.goals.map((g: any, i: number) => `
          <tr>
            <td>${i + 1}</td>
            <td>${val(g.domain)}</td>
            <td>${val(g.description || g.title)}</td>
            <td>${g.progress !== undefined ? g.progress + '%' : '—'}</td>
            <td>${val(g.status)}</td>
          </tr>`).join('')}
      </tbody>
    </table>` : ''}

    <div class="footer">منصة مَسَار للتأهيل والتعليم الذكي — الخطط الفردية — جميع الحقوق محفوظة</div>`;

  openPdfWindow(`خطة IEP — ${r.studentName}`, body, autoPrint);
}

// ─── 13. PDF سجل الحضور ──────────────────────────────────────────────────
export function exportAttendanceCollectionPdf(records: Record<string, unknown>[], autoPrint = false) {
  const body = `
    ${headerHtml('سجل الحضور والغياب الأرشيفي', `العدد الإجمالي: ${records.length} سجل`)}

    <table>
      <thead>
        <tr><th>#</th><th>الطالب</th><th>التاريخ</th><th>الوقت</th><th>الحالة</th><th>طريقة التحقق</th><th>الحصة</th><th>المادة</th><th>أُبلغ ولي الأمر</th></tr>
      </thead>
      <tbody>
        ${records.map((a: any, i) => `
          <tr>
            <td>${i + 1}</td>
            <td style="font-weight:900;">${val(a.studentName || a.name)}</td>
            <td>${val(a.sessionDate || a.date)}</td>
            <td>${val(a.sessionTime || a.time)}</td>
            <td><span class="badge ${a.status === 'present' ? 'badge-green' : a.status === 'late' ? 'badge-amber' : 'badge-red'}">${a.status === 'present' ? 'حاضر' : a.status === 'late' ? 'متأخر' : 'غائب'}</span></td>
            <td>${val(a.verifiedVia)}</td>
            <td>${val(a.periodName)}</td>
            <td>${val(a.subjectName)}</td>
            <td>${a.parentNotified ? '✓' : '—'}</td>
          </tr>`).join('')}
      </tbody>
    </table>

    <div class="footer">منصة مَسَار للتأهيل والتعليم الذكي — الأرشيف الرسمي — جميع الحقوق محفوظة</div>`;

  openPdfWindow('سجل الحضور', body, autoPrint);
}

