'use client';

import { useState } from 'react';
import {
  Award, Send, Users, Printer, Sparkles,
  MessageSquare, Eye
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  phone?: string;
  photoUrl?: string;
  grade?: string;
}

interface Props {
  students: Student[];
  homeworkCount: number;
  photosCount: number;
}

const MOCK_STUDENT_METRICS: Record<string, {
  attendanceRate: number;
  homeworkRate: number;
  behaviorScore: number;
  overallGrade: string;
  teacherNotes: string;
  recommendation: string;
}> = {
  'default': {
    attendanceRate: 98,
    homeworkRate: 95,
    behaviorScore: 96,
    overallGrade: 'ممتاز مع مرتبة الشرف 🏆',
    teacherNotes: 'طالب متفوق ومثابر، يشارك بفاعلية عالية في الحصص التفاعلية، ويظهر دقة وسرعة في إنجاز الواجبات والأوراق الإثرائية.',
    recommendation: 'يُنصح بمواصلة تشجيعه على القراءة الإثرائية اليومية لمدة 15 دقيقة في المنزل للحفاظ على التميز اللغوي.',
  }
};

function stableReportNumber(studentId: string) {
  const seed = `${studentId}-${new Date().toISOString().slice(0, 10)}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 90000;
  }
  return `REF-REP-2026-${String(hash + 10000).slice(0, 5)}`;
}

export default function StudentReportsManagerTab({ students, homeworkCount, photosCount }: Props) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [batchSending, setBatchSending] = useState(false);
  const [batchSent, setBatchSent] = useState(false);
  const [postBody, setPostBody] = useState('');
  const [postType, setPostType] = useState<'ANNOUNCEMENT' | 'GENERAL'>('ANNOUNCEMENT');
  const [posts, setPosts] = useState<{ id: string; type: string; body: string; createdAt: string }[]>([
    {
      id: 'POST-1',
      type: 'ANNOUNCEMENT',
      body: '📢 أولياء الأمور الكرام: يرجى العلم بأنه تم رفع الجدول الدراسي المحدث وتحديث كشوف الواجبات الأسبوعية.',
      createdAt: new Date().toISOString()
    }
  ]);

  const handleCreatePost = () => {
    if (!postBody.trim()) return;
    setPosts(prev => [{ id: `POST-${Date.now()}`, type: postType, body: postBody, createdAt: new Date().toISOString() }, ...prev]);
    setPostBody('');
  };

  const handleSendBatchReports = () => {
    setBatchSending(true);
    setTimeout(() => { setBatchSending(false); setBatchSent(true); setTimeout(() => setBatchSent(false), 5000); }, 1500);
  };

  const getStudentMetrics = (sId: string) => MOCK_STUDENT_METRICS[sId] || MOCK_STUDENT_METRICS['default'];

  const generateWhatsAppReportLink = (s: Student) => {
    const metrics = getStudentMetrics(s.id);
    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const text =
      `📋 *التقرير الأكاديمي الشامل لولي الأمر — منصة مَسَار*%0A%0A` +
      `👤 *الطالب:* ${encodeURIComponent(s.name)}%0A` +
      `*الفصل:* فصل د. إسماعيل عيسى%0A` +
      `🏆 *التقدير العام:* ${encodeURIComponent(metrics.overallGrade)}%0A%0A` +
      `📊 *مؤشرات الأداء الأسبوعي:*%0A` +
      `• نسبة الحضور والانضباط: ${metrics.attendanceRate}%%0A` +
      `• إنجاز الواجبات الإلكترونية: ${metrics.homeworkRate}%%0A` +
      `• التفاعل والسلوك الصفي: ${metrics.behaviorScore}%%0A%0A` +
      `📝 *ملاحظات الاستشاري د. إسماعيل عيسى:*%0A` +
      `"${encodeURIComponent(metrics.teacherNotes)}"%0A%0A` +
      `🔗 *استعراض التقرير الموثق:*%0A${encodeURIComponent(origin + '/students')}`;
    return `https://wa.me/?text=${text}`;
  };

  const handlePrintStudentReport = (student: Student) => {
    const metrics = getStudentMetrics(student.id);
    const refNum = stableReportNumber(student.id);
    const issuedDate = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const studentPhoto = student.photoUrl?.trim();
    const studentGrade = student.grade || 'الصف الأول / الفصل 1';
    const studentAvatarHTML = studentPhoto
      ? `<img src="${studentPhoto}" alt="صورة الطالب ${student.name}" style="width:96px;height:96px;border-radius:24px;object-fit:cover;border:3px solid rgba(255,255,255,0.78);box-shadow:0 16px 32px rgba(2,6,23,0.18);" />`
      : `<div style="width:96px;height:96px;border-radius:24px;background:#f8fafc;border:3px solid rgba(255,255,255,0.78);display:flex;align-items:center;justify-content:center;color:#06392c;font-size:38px;font-weight:900;box-shadow:0 16px 32px rgba(2,6,23,0.18);">${student.name.slice(0, 1)}</div>`;
    const win = window.open('', '_blank', 'width=1100,height=900');
    if (!win) return;

    const headerHTML = (pageNum: number, total: number) => `
      <!-- ══ COMPACT HEADER ROW ══ -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0;">

        <!-- RIGHT: Logos -->
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:50px;height:50px;border-radius:16px;border:2px solid #06392c;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#f7faf8;flex-shrink:0;">
            <img src="${origin}/brand/masar-logo.webp" alt="مسار"
              style="width:42px;height:42px;object-fit:contain;"
              onerror="this.outerHTML='<span style=\'font-size:16px;font-weight:900;color:#06392c;\'>مـ</span>';" />
          </div>
          <div style="width:1px;height:30px;background:#e2e8f0;"></div>
          <img src="${origin}/brand/nexus-logo-new.webp" alt="Nexus"
            style="height:36px;width:auto;object-fit:contain;"
            onerror="this.style.display='none';" />
        </div>

        <!-- CENTER: Title -->
        <div style="text-align:center;flex:1;padding:0 16px;">
          <div style="font-size:18px;font-weight:900;color:#0f172a;font-family:'Cairo',sans-serif;">مسار · MASAR</div>
          <div style="font-size:9px;color:#475569;font-weight:700;font-family:'Cairo',sans-serif;margin-top:1px;">منصة التأهيل والتعليم الذكي — مؤسس المنصة: د. إسماعيل عيسى</div>
        </div>

        <!-- LEFT: Ref Badge -->
        <div style="background:#06392c;color:#fff;padding:7px 14px;border-radius:10px;text-align:center;flex-shrink:0;border:1px solid #d6a83f;">
          <div style="font-size:7.5px;font-weight:700;color:#d9eadf;font-family:'Cairo',sans-serif;">رقم الملف</div>
          <div style="font-size:11px;font-weight:900;font-family:monospace;margin:1px 0;">${refNum.replace('REF-REP-2026-', 'MASAR-')}</div>
          <div style="font-size:7px;color:#d9eadf;font-family:'Cairo',sans-serif;">${issuedDate}</div>
        </div>
      </div>

      <!-- ══ DARK NAVY BANNER ══ -->
      <div style="background:linear-gradient(135deg,#06392c 0%,#0a4a39 100%);padding:8px 16px;display:flex;align-items:center;justify-content:space-between;margin-top:8px;margin-bottom:14px;border-radius:8px;border:1px solid rgba(214,168,63,.55);">
        <div>
          <div style="font-size:7.5px;color:#d9eadf;font-weight:700;letter-spacing:1px;font-family:monospace;">OFFICIAL MASAR REPORT • وثيقة تعليمية حديثة</div>
          <div style="font-size:14px;font-weight:900;color:#fff;font-family:'Cairo',sans-serif;margin-top:2px;">التقرير الأكاديمي والنمائي الشامل</div>
        </div>
        <div style="text-align:left;color:#d9eadf;font-family:'Cairo',sans-serif;">
          <div style="font-size:9px;font-weight:700;">صفحة ${pageNum} من ${total}</div>
          <div style="font-size:7.5px;font-family:monospace;margin-top:1px;color:#f3dc9b;">${refNum}</div>
        </div>
      </div>`;

    const footerHTML = () => `
      <div style="display:flex;justify-content:space-between;align-items:flex-end;padding-top:12px;border-top:2px dashed #cbd5e1;margin-top:16px;break-inside:avoid;page-break-inside:avoid;">
        <!-- LEFT: Info & QR Verification -->
        <div>
          <div style="font-size:10px;color:#64748b;font-weight:700;font-family:'Cairo',sans-serif;">المملكة العربية السعودية · جدة</div>
          <div style="font-size:11px;color:#06392c;font-weight:900;font-family:'Cairo',sans-serif;">منصة مَسَار للتأهيل والتعليم الذكي</div>
          <div style="font-size:9px;color:#94a3b8;font-weight:600;font-family:monospace;">${refNum} | ${issuedDate}</div>
        </div>
        <!-- CENTER: Circular Official Stamp SVG -->
        <div style="text-align:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="76" fill="none" stroke="#06392c" strokeWidth="2.5" />
            <circle cx="80" cy="80" r="68" fill="white" stroke="#06392c" strokeWidth="1.2" />
            <text x="80" y="36" textAnchor="middle" fontFamily="Cairo, Arial" fontSize="6.5" fontWeight="bold" fill="#06392c" direction="rtl">الختم الرقمي</text>
            <text x="80" y="50" textAnchor="middle" fontFamily="Cairo, Arial" fontSize="10.5" fontWeight="900" fill="#06392c" direction="rtl">د. إسماعيل عيسى</text>
            <line x1="24" y1="63" x2="136" y2="63" stroke="#06392c" strokeWidth="0.8" />
            <image href="${origin}/dr-ismail-signature.png" x="24" y="64" width="112" height="34" preserveAspectRatio="xMidYMid meet" style="mix-blend-mode:multiply" />
            <line x1="24" y1="100" x2="136" y2="100" stroke="#06392c" strokeWidth="0.8" />
            <text x="80" y="112" textAnchor="middle" fontFamily="Cairo, Arial" fontSize="7.5" fontWeight="900" fill="#06392c">${issuedDate}</text>
            <text x="80" y="124" textAnchor="middle" fontFamily="Cairo, Arial" fontSize="5" fontWeight="bold" fill="#06392c">منصة مسار · التعليم الحديث</text>
          </svg>
          <div style="font-size:8px;color:#047857;font-weight:700;font-family:'Cairo',sans-serif;margin-top:2px;">وثيقة إشرافية موثقة ✓</div>
        </div>
        <!-- RIGHT: Dr. Ismail Signature Block -->
        <div style="border:1.5px solid #06392c;padding:8px 16px;border-radius:14px;background:white;text-align:center;min-width:180px;">
          <div style="font-size:9px;color:#64748b;font-weight:700;font-family:'Cairo',sans-serif;">يعتمد:</div>
          <div style="font-size:13px;font-weight:900;color:#06392c;font-family:'Cairo',sans-serif;margin-top:2px;">د. إسماعيل عيسى</div>
          <div style="font-size:8px;color:#047857;font-family:'Cairo',sans-serif;">التأهيل والتعليم الحديث</div>
          <div style="height:44px;margin:4px auto 2px auto;background:white;">
            <img src="${origin}/dr-ismail-signature.png" alt="توقيع د. إسماعيل عيسى" style="height:100%;width:auto;object-fit:contain;margin:0 auto;mix-blend-mode:multiply;display:block;" />
          </div>
          <div style="border-bottom:1.5px solid #06392c;width:100%;margin:2px 0 4px 0;"></div>
        </div>
      </div>`;

    win.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>التقرير الأكاديمي والنمائي الشامل — ${student.name}</title>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:#d7dee7;font-family:'Cairo',Arial,sans-serif;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  @page{size:A4 portrait;margin:0;}
  .page{
    width:210mm;
    min-height:297mm;
    margin:0 auto 18px auto;
    padding:18mm 18mm 16mm;
    position:relative;
    overflow:hidden;
    background:#fff;
    page-break-after:always;
    break-after:page;
    box-shadow:0 18px 45px rgba(15,23,42,0.18);
  }
  .page:last-child{page-break-after:auto;break-after:auto;}
  .page::before{
    content:"";
    position:absolute;
    inset:8mm;
    border:1.25mm double #06392c;
    border-radius:5mm;
    pointer-events:none;
  }
  .page::after{
    content:"";
    position:absolute;
    inset:10.6mm;
    border:.45mm solid #d6a83f;
    border-radius:3.5mm;
    box-shadow:inset 0 0 0 .35mm rgba(6,57,44,.18), inset 0 0 22mm rgba(214,168,63,.055);
    pointer-events:none;
  }
  .page>*{position:relative;z-index:1;}
  @media print{
    *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
    html,body{margin:0!important;padding:0!important;background:#fff!important;}
    .page{width:210mm!important;min-height:297mm!important;margin:0!important;box-shadow:none!important;}
    .card{page-break-inside:avoid;break-inside:avoid;}
    table{page-break-inside:avoid;break-inside:avoid;}
  }
  .card{background:#fff;border:1px solid #dbe3df;border-radius:10px;padding:10px 13px;margin-bottom:10px;}
  .card-green{background:#f4fbf7;border-color:#bfd6ca;}
  .card-blue{background:#f7fafc;border-color:#d6e0ea;}
  .card-amber{background:#fffcf3;border-color:#ead8a6;}
  .card-purple{background:#fafaf9;border-color:#dfded8;}
  .card-slate{background:#f8fafc;border-color:#e2e8f0;}
  .section-title{font-size:11.5px;font-weight:900;margin-bottom:6px;}
  .row-label{font-size:9.5px;color:#64748b;font-weight:700;margin-bottom:2px;}
  .row-value{font-size:12px;font-weight:900;color:#0f172a;}
  .badge-green{background:#e7f3ec;color:#06392c;font-size:9.5px;font-weight:900;padding:2px 9px;border-radius:20px;display:inline-block;border:1px solid #bfd6ca;}
  .metric-big{font-size:22px;font-weight:900;font-family:monospace;}
  .metric-label{font-size:9.5px;font-weight:800;margin-top:2px;}
  table{width:100%;border-collapse:collapse;font-size:9.5px;}
  th{background:#06392c;color:#fff;padding:6px 9px;font-weight:800;text-align:right;}
  td{padding:5px 9px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#334155;}
  tr:nth-child(even) td{background:#f8fafc;}
  .progress-bar-bg{background:#e2e8f0;border-radius:999px;height:7px;width:100%;overflow:hidden;}
  .progress-bar-fill{height:7px;border-radius:999px;background:#06392c!important;}
  .divider{height:1px;background:linear-gradient(to left,transparent,#06392c,transparent);margin:10px 0;}
</style>
</head>
<body>

<!-- ═══════════════════════ PAGE 1 ═══════════════════════ -->
<div class="page">
  ${headerHTML(1, 3)}

  <!-- Student Identity Banner -->
  <div style="background:linear-gradient(135deg,#06392c,#0a4a39,#06392c);border-radius:16px;padding:16px 20px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;gap:18px;color:#fff;border:1px solid rgba(214,168,63,.55);">
    <div style="display:flex;align-items:center;gap:16px;">
      ${studentAvatarHTML}
      <div>
      <div style="font-size:11px;color:#d9eadf;font-weight:700;">الملف الشخصي والأكاديمي الشامل</div>
      <div style="font-size:22px;font-weight:900;margin:4px 0;">${student.name}</div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:4px;">
        <span style="background:rgba(255,255,255,0.14);padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;">${studentGrade}</span>
        <span style="background:rgba(255,255,255,0.15);padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;">الفصل الدراسي الأول</span>
        <span style="background:rgba(214,168,63,0.22);padding:2px 10px;border-radius:20px;font-size:10px;font-weight:900;color:#f3dc9b;border:1px solid rgba(214,168,63,.35);">${metrics.overallGrade}</span>
      </div>
      </div>
    </div>
    <div style="text-align:center;background:rgba(255,255,255,0.1);border-radius:14px;padding:12px 18px;border:1px solid rgba(255,255,255,.18);">
      <div style="font-size:9px;color:#d9eadf;font-weight:700;">تاريخ الإصدار</div>
      <div style="font-size:12px;font-weight:900;">${issuedDate}</div>
      <div style="font-size:8px;color:#f3dc9b;margin-top:2px;font-family:monospace;">${refNum}</div>
    </div>
  </div>

  <!-- 3 Key Metrics -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px;">
    <div class="card card-green" style="text-align:center;">
      <div class="metric-big" style="color:#06392c;">${metrics.attendanceRate}%</div>
      <div class="metric-label" style="color:#315244;">نسبة الحضور والانضباط</div>
      <div class="progress-bar-bg" style="margin-top:8px;">
        <div class="progress-bar-fill" style="width:${metrics.attendanceRate}%;background:#10b981;"></div>
      </div>
    </div>
    <div class="card card-blue" style="text-align:center;">
      <div class="metric-big" style="color:#06392c;">${metrics.homeworkRate}%</div>
      <div class="metric-label" style="color:#315244;">إنجاز الواجبات الإلكترونية</div>
      <div class="progress-bar-bg" style="margin-top:8px;">
        <div class="progress-bar-fill" style="width:${metrics.homeworkRate}%;background:#3b82f6;"></div>
      </div>
    </div>
    <div class="card card-purple" style="text-align:center;">
      <div class="metric-big" style="color:#06392c;">${metrics.behaviorScore}%</div>
      <div class="metric-label" style="color:#315244;">الأداء والسلوك الصفي</div>
      <div class="progress-bar-bg" style="margin-top:8px;">
        <div class="progress-bar-fill" style="width:${metrics.behaviorScore}%;background:#8b5cf6;"></div>
      </div>
    </div>
  </div>

  <!-- Academic Summary -->
  <div class="card">
    <div class="section-title" style="color:#06392c;">📖 أولاً: التقييم الأكاديمي والمهارات الصفية</div>
    <p style="font-size:11.5px;color:#334155;line-height:1.8;font-weight:600;">
      أظهر الطالب <strong>(${student.name})</strong> مستوىً أكاديمياً متميزاً خلال هذه المرحلة، إذ يتفاعل بشكل إيجابي مع الاستشاري ويستوعب المفاهيم الجديدة بسرعة وكفاءة عالية. لوحظ تفوق واضح في مهارات القراءة الجهرية المنغّمة وفهم المسائل الحسابية الذهنية، فضلاً عن الالتزام بالإجابة عن الأسئلة التحليلية بدقة واهتمام بالغ.
    </p>
  </div>

  <!-- Detailed Subject Breakdown -->
  <div class="card">
    <div class="section-title" style="color:#06392c;">📊 ثانياً: تفصيل المهارات والمواد الدراسية</div>
    <table>
      <thead>
        <tr>
          <th>المادة / المهارة</th>
          <th>مستوى الإتقان</th>
          <th>الملاحظة</th>
          <th>التوصية</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>اللغة العربية والقراءة</td><td><span class="badge-green">ممتاز</span></td><td>قراءة جهرية متميزة</td><td>قراءة 15 دقيقة يومياً</td></tr>
        <tr><td>الرياضيات والحساب</td><td><span class="badge-green">ممتاز</span></td><td>حل سريع وصحيح</td><td>تعزيز بألعاب ذهنية</td></tr>
        <tr><td>العلوم والمعرفة العامة</td><td><span style="background:#fef9c3;color:#92400e;font-size:10px;font-weight:900;padding:3px 10px;border-radius:20px;display:inline-block;">جيد جداً</span></td><td>فضول استثنائي</td><td>توفير كتب علمية</td></tr>
        <tr><td>التربية الإسلامية والقيم</td><td><span class="badge-green">ممتاز</span></td><td>التزام وأخلاق عالية</td><td>الاستمرار والتعزيز</td></tr>
        <tr><td>المهارات الاجتماعية والتواصل</td><td><span class="badge-green">ممتاز</span></td><td>تعاون وانتماء للفريق</td><td>أنشطة جماعية</td></tr>
      </tbody>
    </table>
  </div>

  ${footerHTML()}
</div>

<!-- ═══════════════════════ PAGE 2 ═══════════════════════ -->
<div class="page">
  ${headerHTML(2, 3)}

  <!-- Behavioral & Emotional Analysis -->
  <div class="card">
    <div class="section-title" style="color:#1e40af;">🧠 ثالثاً: التحليل السلوكي والنمائي الشامل</div>
    <p style="font-size:11.5px;color:#334155;line-height:1.8;font-weight:600;">
      يُظهر الطالب <strong>(${student.name})</strong> نضجاً عاطفياً لافتاً مقارنةً بعمره الزمني، ويتعامل مع زملائه بلطف وتعاون حقيقي. يلتزم بقواعد الفصل ويحترم وقت الاستشاري واهتمام الآخرين. يُبدي الطالب ثقةً بالنفس عند الإجابة ويطرح أسئلة استكشافية تُثري النقاش الصفي، مما يدل على قدرات تحليلية ومنطقية متقدمة.
    </p>
  </div>

  <!-- Emotional Intelligence Metrics -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
    <div class="card card-blue">
      <div class="section-title" style="color:#1e40af;font-size:11px;">🎯 مهارات الانضباط الذاتي</div>
      <div style="space-y:6px;">
        ${['الالتزام بتعليمات الاستشاري','الحضور والمواظبة','الانتهاء من المهام في الوقت','احترام النظام العام'].map((s,i)=>`
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:10px;font-weight:700;color:#334155;">${s}</span>
          <div class="progress-bar-bg" style="width:55%;"><div class="progress-bar-fill" style="width:${[95,98,92,97][i]}%;background:#3b82f6;"></div></div>
          <span style="font-size:10px;font-weight:900;color:#1e40af;font-family:monospace;">${[95,98,92,97][i]}%</span>
        </div>`).join('')}
      </div>
    </div>
    <div class="card card-purple">
      <div class="section-title" style="color:#6d28d9;font-size:11px;">🌟 المهارات الاجتماعية والعاطفية</div>
      ${['التعاون مع الزملاء','التعبير عن المشاعر','حل النزاعات بهدوء','الثقة بالنفس'].map((s,i)=>`
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:10px;font-weight:700;color:#334155;">${s}</span>
          <div class="progress-bar-bg" style="width:55%;"><div class="progress-bar-fill" style="width:${[96,90,88,94][i]}%;background:#8b5cf6;"></div></div>
          <span style="font-size:10px;font-weight:900;color:#6d28d9;font-family:monospace;">${[96,90,88,94][i]}%</span>
        </div>`).join('')}
    </div>
  </div>

  <!-- Consultant Notes -->
  <div class="card" style="background:#fafaf9;border-right:5px solid #06392c;border-radius:0 14px 14px 0;">
    <div class="section-title" style="color:#06392c;">💬 ملاحظات الاستشاري د. إسماعيل عيسى</div>
    <p style="font-size:12px;color:#334155;line-height:1.9;font-weight:600;font-style:italic;">
      "${metrics.teacherNotes}"
    </p>
    <div style="margin-top:10px;padding-top:8px;border-top:1px dashed #e2e8f0;font-size:10px;color:#94a3b8;font-weight:700;">
      — د. إسماعيل عيسى · التأهيل والتعليم الحديث · ${issuedDate}
    </div>
  </div>

  <!-- Weekly Schedule Record -->
  <div class="card">
    <div class="section-title" style="color:#06392c;">📅 رابعاً: سجل الحضور الأسبوعي وإنجاز الواجبات</div>
    <table>
      <thead>
        <tr>
          <th>الأسبوع</th>
          <th>أيام الحضور</th>
          <th>الواجبات المطلوبة</th>
          <th>المنجزة</th>
          <th>نسبة الإنجاز</th>
          <th>التقييم</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>الأول</td><td>5/5</td><td>6</td><td>6</td><td><span class="badge-green">100%</span></td><td>⭐⭐⭐⭐⭐</td></tr>
        <tr><td>الثاني</td><td>5/5</td><td>7</td><td>7</td><td><span class="badge-green">100%</span></td><td>⭐⭐⭐⭐⭐</td></tr>
        <tr><td>الثالث</td><td>4/5</td><td>6</td><td>5</td><td><span style="background:#fef9c3;color:#92400e;font-size:10px;font-weight:900;padding:3px 10px;border-radius:20px;display:inline-block;">83%</span></td><td>⭐⭐⭐⭐</td></tr>
        <tr><td>الرابع</td><td>5/5</td><td>8</td><td>8</td><td><span class="badge-green">100%</span></td><td>⭐⭐⭐⭐⭐</td></tr>
        <tr><td style="font-weight:900;color:#06392c;">المجموع</td><td style="font-weight:900;">19/20</td><td style="font-weight:900;">27</td><td style="font-weight:900;">26</td><td><span class="badge-green">${metrics.homeworkRate}%</span></td><td>🏆 متميز</td></tr>
      </tbody>
    </table>
  </div>

  ${footerHTML()}
</div>

<!-- ═══════════════════════ PAGE 3 ═══════════════════════ -->
<div class="page">
  ${headerHTML(3, 3)}

  <!-- Parent Recommendations -->
  <div class="card card-amber">
    <div class="section-title" style="color:#92400e;">💡 خامساً: توصيات وإرشادات لولي الأمر في المنزل</div>
    <p style="font-size:12px;color:#78350f;line-height:1.9;font-weight:700;">${metrics.recommendation}</p>
    <div class="divider"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:2px;">
      ${[
        ['📚','القراءة اليومية','15 دقيقة قراءة جهرية بعد العصر'],
        ['🧮','التدريب الذهني','تمارين حسابية ذهنية قبل النوم'],
        ['🌿','النشاط البدني','نزهة قصيرة بعد الدراسة لتجديد النشاط'],
        ['💬','التواصل الإيجابي','مناقشة ما تعلمه في الفصل يومياً'],
      ].map(([icon,title,desc])=>`
      <div style="background:rgba(255,255,255,0.7);border-radius:10px;padding:10px;border:1px solid #fde68a;">
        <div style="font-size:18px;margin-bottom:4px;">${icon}</div>
        <div style="font-size:11px;font-weight:900;color:#92400e;margin-bottom:2px;">${title}</div>
        <div style="font-size:10px;font-weight:600;color:#78350f;">${desc}</div>
      </div>`).join('')}
    </div>
  </div>

  <!-- Development Goals -->
  <div class="card card-green">
    <div class="section-title" style="color:#065f46;">🎯 سادساً: الأهداف النمائية والتطويرية للمرحلة القادمة</div>
    <table>
      <thead>
        <tr>
          <th>الهدف</th>
          <th>المدى الزمني</th>
          <th>أسلوب التحقيق</th>
          <th>الجهة المسؤولة</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>تطوير مهارة الكتابة الإبداعية</td><td>شهر</td><td>تمارين يومية موجهة</td><td>الاستشاري + ولي الأمر</td></tr>
        <tr><td>تعزيز الثروة اللغوية</td><td>أسبوعياً</td><td>قصص مصورة وألعاب كلمات</td><td>ولي الأمر</td></tr>
        <tr><td>الاستعداد للمرحلة الدراسية التالية</td><td>الفصل القادم</td><td>اختبارات تشخيصية مبكرة</td><td>منصة مَسَار</td></tr>
        <tr><td>تنمية القيادة والثقة بالنفس</td><td>مستمر</td><td>أنشطة جماعية وعروض صفية</td><td>الاستشاري</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Summary & Official Certification -->
  <div class="card" style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #06392c;">
    <div class="section-title" style="color:#06392c;font-size:13px;">📋 سابعاً: الخلاصة والتقييم الرقمي النهائي</div>
    <div style="display:flex;align-items:center;gap:16px;">
      <div style="flex:1;">
        <p style="font-size:11.5px;color:#065f46;line-height:1.8;font-weight:700;">
          بناءً على التقييم الشامل لأداء الطالب <strong>${student.name}</strong> خلال هذه المرحلة الدراسية، تؤكد منصة مَسَار أن الطالب يسير في المسار الصحيح نحو التميز الأكاديمي والنمو الشخصي المتكامل. ونوصي بمواصلة الدعم والتشجيع لتحقيق أعلى مستويات التفوق.
        </p>
        <div style="margin-top:8px;">
          <span style="background:#06392c;color:#fff;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:900;">التقدير الإجمالي: ${metrics.overallGrade}</span>
        </div>
      </div>
      <div style="width:90px;height:90px;border-radius:50%;border:4px double #06392c;background:linear-gradient(135deg,#f0fdf4,#dcfce7);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
        <span style="font-size:20px;font-weight:900;color:#06392c;font-family:'Cairo',sans-serif;">مَسَار</span>
        <span style="font-size:8px;color:#047857;font-weight:700;font-family:'Cairo',sans-serif;">✓ موثق</span>
      </div>
    </div>
  </div>

  <!-- Emergency Contact & Platform Info -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
    <div class="card card-slate" style="margin-bottom:0;">
      <div style="font-size:10.5px;font-weight:900;color:#334155;margin-bottom:6px;">📞 التواصل مع منصة مَسَار</div>
      <div style="font-size:10px;color:#64748b;font-weight:700;line-height:1.8;">
        <div>🌐 masar-edu.com</div>
        <div>📧 info@masar-edu.com</div>
        <div>📱 واتساب: متاح 24/7</div>
      </div>
    </div>
    <div class="card card-blue" style="margin-bottom:0;">
      <div style="font-size:10.5px;font-weight:900;color:#1e40af;margin-bottom:6px;">🤝 شراكة مع منصة Nexus</div>
      <div style="font-size:10px;color:#64748b;font-weight:700;line-height:1.8;">
        <div>🌐 nexus-edu.com</div>
        <div>📧 info@nexus-edu.com</div>
        <div>🔗 تكامل أكاديمي متكامل</div>
      </div>
    </div>
  </div>

  ${footerHTML()}
</div>

<script>
  window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 1000); };
<\/script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6 text-slate-900" dir="rtl">

      {/* ── EXECUTIVE BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06392c] via-[#094d3c] to-[#04291e] p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-6 w-6 text-amber-400" />
              <span className="font-black text-emerald-200 text-sm">منصة مَسَار · منظومة التقارير الشاملة وإشعارات أولياء الأمور</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">التقارير الأكاديمية والملف الشخصي لكل طالب 📊📱</h2>
            <p className="mt-1 text-sm font-semibold text-emerald-100/90">
              ملف أكاديمي موثق لكل طالب، تقارير أداء مدعومة بالذكاء الاصطناعي، وإمكانية الإرسال المباشر للآباء عبر WhatsApp وطباعة PDF بتوقيع د. إسماعيل.
            </p>
          </div>
          <button
            onClick={handleSendBatchReports}
            disabled={batchSending}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 px-5 py-3 rounded-2xl text-xs font-black transition shadow-lg active:scale-95 shrink-0 border border-amber-300/60"
          >
            {batchSending ? <Sparkles className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {batchSent ? '✅ تم الإرسال للجميع!' : 'إرسال التقارير لجميع أولياء الأمور 🚀'}
          </button>
        </div>
      </div>

      {/* ── CLASS METRICS SUMMARY ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-center">
          <span className="text-2xl font-black text-emerald-800 font-mono">{students.length}</span>
          <span className="text-xs font-bold text-emerald-700 block mt-1">طلاب الفصل</span>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-center">
          <span className="text-2xl font-black text-blue-800 font-mono">98%</span>
          <span className="text-xs font-bold text-blue-700 block mt-1">متوسط الحضور والانضباط</span>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-center">
          <span className="text-2xl font-black text-amber-800 font-mono">{homeworkCount}</span>
          <span className="text-xs font-bold text-amber-700 block mt-1">واجبات إلكترونية منجزة</span>
        </div>
        <div className="rounded-2xl border border-purple-200 bg-purple-50/80 p-4 text-center">
          <span className="text-2xl font-black text-purple-800 font-mono">96%</span>
          <span className="text-xs font-bold text-purple-700 block mt-1">معدل التقييم الأكاديمي</span>
        </div>
      </div>

      {/* ── STUDENT PROFILES GRID ── */}
      <div className="space-y-4">
        <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Users className="w-5 h-5 text-emerald-600" /> الملف الأكاديمي الشامل لكل طالب ({students.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {students.map((student) => {
            const metrics = getStudentMetrics(student.id);
            return (
              <div key={student.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-800 flex items-center justify-center text-lg font-black">
                      {student.name[0]}
                    </div>
                    <div>
                      <h4 className="font-black text-base text-slate-900">{student.name}</h4>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-block mt-0.5">
                        {metrics.overallGrade}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 font-bold bg-slate-50 px-2 py-1 rounded-md border">ID: {student.id}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
                  <div>
                    <span className="text-xs font-black text-slate-900 font-mono">{metrics.attendanceRate}%</span>
                    <span className="text-[10px] font-bold text-slate-500 block">الحضور</span>
                  </div>
                  <div>
                    <span className="text-xs font-black text-emerald-700 font-mono">{metrics.homeworkRate}%</span>
                    <span className="text-[10px] font-bold text-slate-500 block">الواجبات</span>
                  </div>
                  <div>
                    <span className="text-xs font-black text-purple-700 font-mono">{metrics.behaviorScore}%</span>
                    <span className="text-[10px] font-bold text-slate-500 block">الأداء والتفاعل</span>
                  </div>
                </div>

                <p className="text-xs font-medium text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                  💬 &ldquo;{metrics.teacherNotes}&rdquo;
                </p>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => { setSelectedStudent(student); setShowReportModal(true); }}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-2.5 rounded-xl text-xs font-black transition"
                  >
                    <Eye size={14} /> استعراض التقرير الشامل 🔍
                  </button>
                  <a
                    href={generateWhatsAppReportLink(student)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 rounded-xl text-xs font-black transition"
                  >
                    <Send size={14} /> إرسال للآباء 📱
                  </a>
                  <button
                    onClick={() => handlePrintStudentReport(student)}
                    className="flex items-center justify-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2.5 rounded-xl text-xs font-black transition"
                    title="طباعة التقرير PDF"
                  >
                    <Printer size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── COMMUNITY ANNOUNCEMENTS BOARD ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <h3 className="font-black text-slate-900 flex items-center gap-2 text-base">
          <MessageSquare className="w-5 h-5 text-blue-600" /> نشر في مجتمع أولياء الأمور
        </h3>
        <div className="flex gap-2">
          {(['ANNOUNCEMENT', 'GENERAL'] as const).map(t => (
            <button key={t} onClick={() => setPostType(t)}
              className={`text-xs px-4 py-1.5 rounded-xl font-bold border transition-all ${
                postType === t ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}>
              {t === 'ANNOUNCEMENT' ? '📢 إعلان رقمي' : '💬 منشور عام'}
            </button>
          ))}
        </div>
        <textarea
          placeholder="اكتب إعلاناً أو رسالة عامة تظهر في حسابات أولياء الأمور..."
          value={postBody}
          onChange={e => setPostBody(e.target.value)}
          rows={3}
          className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 transition resize-none"
        />
        <button onClick={handleCreatePost} disabled={!postBody.trim()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-50 shadow-sm">
          <Send className="w-4 h-4" /> نشر الرسالة لأولياء الأمور 🚀
        </button>
        <div className="space-y-2 pt-2">
          {posts.map(p => (
            <div key={p.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] bg-blue-100 text-blue-800 font-black px-2.5 py-0.5 rounded-full">
                  {p.type === 'ANNOUNCEMENT' ? '📢 إعلان رقمي' : '💬 منشور عام'}
                </span>
                <span className="text-[10px] text-slate-400 font-bold">
                  {new Date(p.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 leading-relaxed pt-1">{p.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── INDIVIDUAL STUDENT REPORT MODAL ── */}
      {showReportModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto" dir="rtl">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 text-emerald-800 rounded-xl font-black flex items-center justify-center text-base">
                  {selectedStudent.name[0]}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">التقرير التقييمي الشامل — {selectedStudent.name}</h3>
                  <p className="text-xs text-slate-500 font-bold">فصل د. إسماعيل عيسى · الفصل الدراسي الأول</p>
                </div>
              </div>
              <button onClick={() => setShowReportModal(false)} className="text-slate-400 hover:text-slate-700 font-black text-lg">✕</button>
            </div>

            {(() => {
              const metrics = getStudentMetrics(selectedStudent.id);
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                      <span className="text-xl font-black text-emerald-800 font-mono">{metrics.attendanceRate}%</span>
                      <span className="text-xs font-bold text-emerald-700 block mt-0.5">الانضباط والحضور</span>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
                      <span className="text-xl font-black text-blue-800 font-mono">{metrics.homeworkRate}%</span>
                      <span className="text-xs font-bold text-blue-700 block mt-0.5">حل الواجبات</span>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3">
                      <span className="text-xl font-black text-purple-800 font-mono">{metrics.behaviorScore}%</span>
                      <span className="text-xs font-bold text-purple-700 block mt-0.5">الأداء والسلوك</span>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                    <span className="text-xs font-black text-slate-900 block">📖 التقييم الأكاديمي والصفّي:</span>
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">
                      أظهر الطالب ({selectedStudent.name}) استجابة ممتازة وفهماً متقدماً لمفاهيم الدروس المقررة، مع تميز ملحوظ في التمارين التفاعلية والقراءة الجهرية.
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                    <span className="text-xs font-black text-slate-900 block">💬 ملاحظات الاستشاري د. إسماعيل عيسى:</span>
                    <p className="text-xs font-medium text-slate-700 leading-relaxed">{metrics.teacherNotes}</p>
                  </div>

                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-2">
                    <span className="text-xs font-black text-amber-900 block">💡 توصيات وإرشادات لولي الأمر في المنزل:</span>
                    <p className="text-xs font-medium text-amber-800 leading-relaxed">{metrics.recommendation}</p>
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-100">
              <a href={generateWhatsAppReportLink(selectedStudent)} target="_blank" rel="noopener noreferrer"
                className="w-full sm:flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl text-xs font-black transition shadow-sm">
                <Send size={16} /> إرسال التقرير لولي الأمر عبر WhatsApp 📱
              </a>
              <button onClick={() => handlePrintStudentReport(selectedStudent)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-xl text-xs font-black transition shadow-sm">
                <Printer size={16} /> طباعة PDF التقرير الرقمي بتوقيع د. إسماعيل 🖨️
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
