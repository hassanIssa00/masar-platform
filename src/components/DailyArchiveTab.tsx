'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Archive, Calendar, Users, BookOpen, Brain,
  Printer, Filter, Search, ChevronDown, CheckCircle2,
  XCircle, Clock, AlertCircle, BarChart3, FileText,
  Eye, Sparkles, Trophy, Star
} from 'lucide-react';
import {
  getAllAttendanceSnapshots,
  getAllHomeworkSnapshots,
  getAllQuizSnapshots,
  formatArabicDate,
  getStatusLabel,
  getStatusColor,
  type DailyAttendanceSnapshot,
  type DailyHomeworkSnapshot,
  type DailyQuizSnapshot,
} from '@/lib/dailyArchive';

type ArchiveSection = 'attendance' | 'homework' | 'quizzes';

export default function DailyArchiveTab() {
  const [section, setSection] = useState<ArchiveSection>('attendance');
  const [searchDate, setSearchDate] = useState('');

  const [attSnapshots, setAttSnapshots] = useState<DailyAttendanceSnapshot[]>([]);
  const [hwSnapshots, setHwSnapshots] = useState<DailyHomeworkSnapshot[]>([]);
  const [quizSnapshots, setQuizSnapshots] = useState<DailyQuizSnapshot[]>([]);
  const [selectedAtt, setSelectedAtt] = useState<DailyAttendanceSnapshot | null>(null);
  const [selectedHw, setSelectedHw] = useState<DailyHomeworkSnapshot | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<DailyQuizSnapshot | null>(null);

  useEffect(() => {
    setAttSnapshots(getAllAttendanceSnapshots());
    setHwSnapshots(getAllHomeworkSnapshots());
    setQuizSnapshots(getAllQuizSnapshots());
  }, [section]);

  const filteredAtt = useMemo(() =>
    searchDate ? attSnapshots.filter(s => s.date.includes(searchDate)) : attSnapshots,
    [attSnapshots, searchDate]);

  const filteredHw = useMemo(() =>
    searchDate ? hwSnapshots.filter(s => s.date.includes(searchDate)) : hwSnapshots,
    [hwSnapshots, searchDate]);

  const filteredQuiz = useMemo(() =>
    searchDate ? quizSnapshots.filter(s => s.date.includes(searchDate)) : quizSnapshots,
    [quizSnapshots, searchDate]);

  /* ─────────────────────── PRINT ATTENDANCE ─────────────────────── */
  const printAttendance = (snap: DailyAttendanceSnapshot) => {
    const rows = snap.entries.map((e, i) => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:8px 12px;text-align:center;font-weight:900;color:#475569;">${i + 1}</td>
        <td style="padding:8px 12px;font-weight:bold;color:#1e293b;">${e.studentName}</td>
        <td style="padding:8px 12px;text-align:center;">
          <span style="background:${getStatusColor(e.status)}22;color:${getStatusColor(e.status)};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;border:1px solid ${getStatusColor(e.status)}55;">
            ${getStatusLabel(e.status)}
          </span>
        </td>
        <td style="padding:8px 12px;text-align:center;font-weight:bold;color:#475569;">${e.score !== undefined ? e.score + '%' : '—'}</td>
        <td style="padding:8px 12px;text-align:center;font-size:11px;color:#64748b;">${e.note ?? '—'}</td>
      </tr>
    `).join('');

    const html = `<!doctype html><html lang="ar" dir="rtl"><head>
      <meta charset="utf-8"/>
      <title>سجل الحضور والغياب — ${formatArabicDate(snap.date)}</title>
      <style>
        @page { size: A4; margin: 18mm 14mm; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'Cairo', 'Segoe UI', Arial, sans-serif; }
        body { margin: 0; background: #fff; color: #1e293b; }

        .header { display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:3px solid #06392c; background:linear-gradient(135deg,#06392c 0%,#0b4d3c 100%); border-radius:12px 12px 0 0; margin-bottom:0; }
        .logo-area { display:flex; align-items:center; gap:14px; }
        .logo-circle { width:56px; height:56px; border-radius:50%; background:rgba(255,255,255,0.15); border:2px solid rgba(255,255,255,0.3); display:flex; align-items:center; justify-content:center; font-size:26px; }
        .platform-name { color:#fff; }
        .platform-name h1 { margin:0; font-size:18px; font-weight:900; }
        .platform-name p { margin:2px 0 0; font-size:12px; color:rgba(255,255,255,0.85); font-weight:bold; }
        .header-meta { text-align:left; color:rgba(255,255,255,0.9); font-size:11px; font-weight:bold; line-height:1.7; }

        .doc-title { background:#f8fafc; border:1px solid #e2e8f0; border-top:none; padding:16px 20px; display:flex; align-items:center; justify-content:space-between; }
        .doc-title h2 { margin:0; font-size:20px; font-weight:900; color:#06392c; }
        .stats-pills { display:flex; gap:8px; flex-wrap:wrap; }
        .pill { padding:4px 12px; border-radius:999px; font-size:12px; font-weight:900; }
        .pill-green { background:#d1fae5; color:#065f46; border:1px solid #6ee7b7; }
        .pill-red   { background:#fee2e2; color:#991b1b; border:1px solid #fca5a5; }
        .pill-amber { background:#fef3c7; color:#92400e; border:1px solid #fcd34d; }
        .pill-blue  { background:#dbeafe; color:#1e40af; border:1px solid #93c5fd; }

        table { width:100%; border-collapse:collapse; margin-top:0; }
        thead tr { background:#06392c; }
        thead th { padding:10px 12px; color:#fff; font-size:12px; font-weight:900; text-align:right; }
        thead th:first-child, thead th:nth-child(3), thead th:nth-child(4) { text-align:center; }
        tbody tr:nth-child(even) { background:#f8fafc; }
        tbody tr:hover { background:#f0fdf4; }

        .footer { margin-top:24px; display:flex; align-items:flex-end; justify-content:space-between; padding-top:16px; border-top:2px dashed #cbd5e1; }
        .sig-block { text-align:center; }
        .sig-block .name { font-size:15px; font-weight:900; color:#06392c; margin-top:8px; }
        .sig-block .title { font-size:11px; color:#64748b; font-weight:bold; }
        .sig-line { width:160px; height:1px; background:#06392c; margin: 28px auto 0; }
        .stamp { width:90px; height:90px; border-radius:50%; border:3px double #06392c; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:8px; }
        .stamp p { margin:0; font-size:9px; font-weight:900; color:#06392c; line-height:1.4; }

        @media print { body { -webkit-print-color-adjust: exact; } }
      </style>
    </head><body>
      <div class="header">
        <div class="logo-area">
          <div class="logo-circle">🏫</div>
          <div class="platform-name">
            <h1>منصة مَسَار للتأهيل والتعليم الذكي</h1>
            <p>فصل الإخلاص — جدة &nbsp;|&nbsp; إشراف: د. إسماعيل عيسى</p>
          </div>
        </div>
        <div class="header-meta">
          <div>التاريخ: ${formatArabicDate(snap.date)}</div>
          <div>الحصة: ${snap.sessionStart} — ${snap.sessionEnd}</div>
          <div>وقت الطباعة: ${new Date().toLocaleTimeString('ar-EG')}</div>
        </div>
      </div>
      <div class="doc-title">
        <h2>📋 سجل الحضور والغياب اليومي الرسمي</h2>
        <div class="stats-pills">
          <span class="pill pill-blue">إجمالي: ${snap.entries.length} طالب</span>
          <span class="pill pill-green">حاضر: ${snap.totalPresent}</span>
          <span class="pill pill-red">غائب: ${snap.totalAbsent}</span>
          <span class="pill pill-amber">متأخر: ${snap.totalLate}</span>
          <span class="pill pill-green">نسبة الحضور: ${snap.presentRate}%</span>
        </div>
      </div>
      <table>
        <thead><tr>
          <th style="width:40px">#</th>
          <th>اسم الطالب</th>
          <th style="width:120px">الحالة</th>
          <th style="width:80px">الدرجة</th>
          <th style="width:140px">ملاحظة</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">
        <div class="sig-block">
          <div class="sig-line"></div>
          <div class="name">د. إسماعيل عيسى</div>
          <div class="title">المشرف الأكاديمي والمعلم المختص</div>
        </div>
        <div class="stamp">
          <p>منصة مَسَار</p>
          <p>التعليم الذكي</p>
          <p style="font-size:8px;color:#06392c;">✓ معتمد رسمياً</p>
        </div>
      </div>
      <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});</script>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  /* ─────────────────────── PRINT HOMEWORK ─────────────────────── */
  const printHomework = (snap: DailyHomeworkSnapshot) => {
    const rows = snap.submissions.map((s, i) => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:8px 12px;text-align:center;font-weight:900;color:#475569;">${i + 1}</td>
        <td style="padding:8px 12px;font-weight:bold;color:#1e293b;">${s.studentName}</td>
        <td style="padding:8px 12px;text-align:center;">
          <span style="background:${s.status==='submitted'?'#d1fae5':s.status==='late'?'#fef3c7':'#fee2e2'};color:${s.status==='submitted'?'#065f46':s.status==='late'?'#92400e':'#991b1b'};padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;">
            ${s.status==='submitted'?'سُلِّم ✓':s.status==='late'?'تأخر':'لم يُسلَّم ✗'}
          </span>
        </td>
        <td style="padding:8px 12px;text-align:center;font-weight:900;color:#0b4d3c;">${s.grade !== undefined ? s.grade + ' / 10' : '—'}</td>
        <td style="padding:8px 12px;font-size:11px;color:#64748b;">${s.feedback ?? '—'}</td>
      </tr>
    `).join('');

    const html = `<!doctype html><html lang="ar" dir="rtl"><head>
      <meta charset="utf-8"/>
      <title>سجل الواجبات — ${snap.homeworkTitle}</title>
      <style>
        @page{size:A4;margin:18mm 14mm;}
        *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;font-family:'Cairo','Segoe UI',Arial,sans-serif;}
        body{margin:0;background:#fff;color:#1e293b;}
        .header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:3px solid #0b4d3c;background:linear-gradient(135deg,#0b4d3c,#1a6b52);border-radius:12px 12px 0 0;}
        .logo-area{display:flex;align-items:center;gap:14px;}
        .logo-circle{width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-size:26px;}
        .platform-name{color:#fff;}.platform-name h1{margin:0;font-size:18px;font-weight:900;}.platform-name p{margin:2px 0 0;font-size:12px;color:rgba(255,255,255,.85);font-weight:bold;}
        .header-meta{text-align:left;color:rgba(255,255,255,.9);font-size:11px;font-weight:bold;line-height:1.7;}
        .doc-title{background:#f8fafc;border:1px solid #e2e8f0;border-top:none;padding:16px 20px;}
        .doc-title h2{margin:0 0 8px;font-size:18px;font-weight:900;color:#0b4d3c;}
        table{width:100%;border-collapse:collapse;margin-top:12px;}
        thead tr{background:#0b4d3c;}
        thead th{padding:10px 12px;color:#fff;font-size:12px;font-weight:900;text-align:right;}
        tbody tr:nth-child(even){background:#f8fafc;}
        .footer{margin-top:24px;display:flex;align-items:flex-end;justify-content:space-between;padding-top:16px;border-top:2px dashed #cbd5e1;}
        .sig-block{text-align:center;}.sig-block .name{font-size:15px;font-weight:900;color:#06392c;margin-top:8px;}.sig-block .title{font-size:11px;color:#64748b;}
        .sig-line{width:160px;height:1px;background:#06392c;margin:28px auto 0;}
        .stamp{width:90px;height:90px;border-radius:50%;border:3px double #06392c;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8px;}
        .stamp p{margin:0;font-size:9px;font-weight:900;color:#06392c;line-height:1.4;}
      </style>
    </head><body>
      <div class="header">
        <div class="logo-area"><div class="logo-circle">📚</div>
          <div class="platform-name"><h1>منصة مَسَار للتأهيل والتعليم الذكي</h1><p>فصل الإخلاص — جدة | إشراف: د. إسماعيل عيسى</p></div></div>
        <div class="header-meta"><div>التاريخ: ${formatArabicDate(snap.date)}</div><div>وقت الطباعة: ${new Date().toLocaleTimeString('ar-EG')}</div></div>
      </div>
      <div class="doc-title">
        <h2>📝 سجل تسليمات الواجب اليومي</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <span style="background:#dbeafe;color:#1e40af;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;border:1px solid #93c5fd;">الواجب: ${snap.homeworkTitle}</span>
          <span style="background:#f3e8ff;color:#6b21a8;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;border:1px solid #d8b4fe;">المادة: ${snap.subject}</span>
          <span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;">سُلِّم: ${snap.totalSubmitted}/${snap.totalStudents}</span>
          ${snap.avgGrade !== undefined ? `<span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;border:1px solid #fcd34d;">متوسط الدرجات: ${snap.avgGrade}/10</span>` : ''}
        </div>
      </div>
      <table>
        <thead><tr><th style="width:40px">#</th><th>اسم الطالب</th><th style="width:120px">حالة التسليم</th><th style="width:90px">الدرجة</th><th>ملاحظات المعلم</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">
        <div class="sig-block"><div class="sig-line"></div><div class="name">د. إسماعيل عيسى</div><div class="title">المشرف الأكاديمي والمعلم المختص</div></div>
        <div class="stamp"><p>منصة مَسَار</p><p>التعليم الذكي</p><p style="font-size:8px;">✓ معتمد رسمياً</p></div>
      </div>
      <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});</script>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  /* ─────────────────────── PRINT QUIZ ─────────────────────── */
  const printQuiz = (snap: DailyQuizSnapshot) => {
    const rows = snap.results.map((r, i) => `
      <tr style="border-bottom:1px solid #e2e8f0;">
        <td style="padding:8px 12px;text-align:center;font-weight:900;color:#475569;">${i + 1}</td>
        <td style="padding:8px 12px;font-weight:bold;color:#1e293b;">${r.studentName}</td>
        <td style="padding:8px 12px;text-align:center;">
          <span style="background:${r.score>=80?'#d1fae5':r.score>=60?'#fef3c7':'#fee2e2'};color:${r.score>=80?'#065f46':r.score>=60?'#92400e':'#991b1b'};padding:3px 12px;border-radius:999px;font-size:13px;font-weight:900;">
            ${r.score}%
          </span>
        </td>
        <td style="padding:8px 12px;text-align:center;font-size:12px;color:#64748b;">${r.score>=90?'ممتاز 🌟':r.score>=80?'جيد جداً':r.score>=60?'جيد':'يحتاج متابعة'}</td>
      </tr>
    `).join('');

    const html = `<!doctype html><html lang="ar" dir="rtl"><head>
      <meta charset="utf-8"/>
      <title>نتائج الكويز — ${snap.quizTitle}</title>
      <style>
        @page{size:A4;margin:18mm 14mm;}
        *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;font-family:'Cairo','Segoe UI',Arial,sans-serif;}
        body{margin:0;background:#fff;color:#1e293b;}
        .header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:3px solid #1e40af;background:linear-gradient(135deg,#1e3a8a,#1e40af);border-radius:12px 12px 0 0;}
        .logo-area{display:flex;align-items:center;gap:14px;}.logo-circle{width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-size:26px;}
        .platform-name{color:#fff;}.platform-name h1{margin:0;font-size:18px;font-weight:900;}.platform-name p{margin:2px 0 0;font-size:12px;color:rgba(255,255,255,.85);font-weight:bold;}
        .header-meta{text-align:left;color:rgba(255,255,255,.9);font-size:11px;font-weight:bold;line-height:1.7;}
        .doc-title{background:#f8fafc;border:1px solid #e2e8f0;border-top:none;padding:16px 20px;}
        .doc-title h2{margin:0 0 8px;font-size:18px;font-weight:900;color:#1e40af;}
        table{width:100%;border-collapse:collapse;margin-top:12px;}
        thead tr{background:#1e40af;}thead th{padding:10px 12px;color:#fff;font-size:12px;font-weight:900;text-align:right;}
        tbody tr:nth-child(even){background:#f8fafc;}
        .footer{margin-top:24px;display:flex;align-items:flex-end;justify-content:space-between;padding-top:16px;border-top:2px dashed #cbd5e1;}
        .sig-block{text-align:center;}.sig-block .name{font-size:15px;font-weight:900;color:#1e40af;margin-top:8px;}.sig-block .title{font-size:11px;color:#64748b;}
        .sig-line{width:160px;height:1px;background:#1e40af;margin:28px auto 0;}
        .stamp{width:90px;height:90px;border-radius:50%;border:3px double #1e40af;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:8px;}
        .stamp p{margin:0;font-size:9px;font-weight:900;color:#1e40af;line-height:1.4;}
      </style>
    </head><body>
      <div class="header">
        <div class="logo-area"><div class="logo-circle">🧠</div>
          <div class="platform-name"><h1>منصة مَسَار للتأهيل والتعليم الذكي</h1><p>فصل الإخلاص — جدة | إشراف: د. إسماعيل عيسى</p></div></div>
        <div class="header-meta"><div>التاريخ: ${formatArabicDate(snap.date)}</div><div>وقت الطباعة: ${new Date().toLocaleTimeString('ar-EG')}</div></div>
      </div>
      <div class="doc-title">
        <h2>🧠 نتائج الكويز والاختبار التفاعلي</h2>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <span style="background:#dbeafe;color:#1e40af;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;border:1px solid #93c5fd;">${snap.quizTitle}</span>
          <span style="background:#f3e8ff;color:#6b21a8;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;border:1px solid #d8b4fe;">${snap.subject}</span>
          <span style="background:#d1fae5;color:#065f46;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;">متوسط: ${snap.avgScore}%</span>
          <span style="background:#fef3c7;color:#92400e;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:900;">أعلى: ${snap.highScore}% | أدنى: ${snap.lowScore}%</span>
        </div>
      </div>
      <table>
        <thead><tr><th style="width:40px">#</th><th>اسم الطالب</th><th style="width:100px">الدرجة</th><th style="width:140px">التقدير</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">
        <div class="sig-block"><div class="sig-line"></div><div class="name">د. إسماعيل عيسى</div><div class="title">المشرف الأكاديمي والمعلم المختص</div></div>
        <div class="stamp"><p>منصة مَسَار</p><p>التعليم الذكي</p><p style="font-size:8px;">✓ معتمد رسمياً</p></div>
      </div>
      <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},400);});</script>
    </body></html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  /* ─────────────────────── RENDER ─────────────────────── */
  return (
    <div className="space-y-6 text-slate-900 animate-fade-in" dir="rtl">

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-xl border border-slate-700">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Archive className="h-6 w-6 text-amber-400" />
              <span className="font-black text-slate-300 text-sm">منصة مَسَار · الأرشيف والسجلات الرسمية</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              📂 الأرشيف اليومي الشامل
            </h2>
            <p className="mt-1.5 text-sm font-semibold text-slate-300">
              سجل يومي محفوظ تلقائياً يتضمن كل بيانات الحضور والغياب والواجبات والكويزات — مع إمكانية الطباعة الرسمية بالتاريخ والختم.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
            <div className="text-center px-3">
              <div className="text-2xl font-black text-amber-300 font-mono">{attSnapshots.length}</div>
              <div className="text-[11px] font-bold text-slate-300">يوم حضور</div>
            </div>
            <div className="h-8 w-[1px] bg-white/20" />
            <div className="text-center px-3">
              <div className="text-2xl font-black text-amber-300 font-mono">{hwSnapshots.length}</div>
              <div className="text-[11px] font-bold text-slate-300">سجل واجب</div>
            </div>
            <div className="h-8 w-[1px] bg-white/20" />
            <div className="text-center px-3">
              <div className="text-2xl font-black text-amber-300 font-mono">{quizSnapshots.length}</div>
              <div className="text-[11px] font-bold text-slate-300">نتيجة كويز</div>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="mt-6 flex items-center gap-2 flex-wrap border-t border-white/10 pt-4">
          {[
            { key: 'attendance' as ArchiveSection, label: 'سجلات الحضور والغياب', icon: Users, count: attSnapshots.length },
            { key: 'homework'   as ArchiveSection, label: 'سجلات الواجبات', icon: BookOpen, count: hwSnapshots.length },
            { key: 'quizzes'   as ArchiveSection, label: 'سجلات الكويزات', icon: Brain, count: quizSnapshots.length },
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setSection(t.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                  section === t.key
                    ? 'bg-amber-400 text-slate-950 shadow-md'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <Icon size={14} />
                {t.label}
                <span className="font-mono text-[10px] opacity-80">({t.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Search Bar */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input
          type="date"
          value={searchDate}
          onChange={e => setSearchDate(e.target.value)}
          className="flex-1 text-sm font-bold text-slate-800 bg-transparent border-none outline-none"
          placeholder="ابحث بالتاريخ..."
        />
        {searchDate && (
          <button
            type="button"
            onClick={() => setSearchDate('')}
            className="text-xs font-black text-slate-500 hover:text-rose-600 transition cursor-pointer"
          >
            مسح الفلتر ✕
          </button>
        )}
      </div>

      {/* ══════════════ ATTENDANCE SECTION ══════════════ */}
      {section === 'attendance' && (
        <div className="space-y-3">
          {filteredAtt.length === 0 ? (
            <EmptyState icon="📋" title="لا توجد سجلات حضور بعد" desc="سجلات الحضور تُحفظ تلقائياً عند رصد حضور الطلاب في تبويب الحضور والغياب — كل يوم يُحفظ بتاريخه ووقته." />
          ) : (
            filteredAtt.map(snap => (
              <div key={snap.id} className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden hover:shadow-sm transition">
                {/* Row Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 cursor-pointer" onClick={() => setSelectedAtt(selectedAtt?.id === snap.id ? null : snap)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-lg shrink-0">📋</div>
                    <div>
                      <div className="font-black text-slate-950 text-sm">{snap.dayName} — {formatArabicDate(snap.date)}</div>
                      <div className="text-xs font-bold text-slate-500 mt-0.5">
                        {snap.sessionStart} — {snap.sessionEnd} &nbsp;·&nbsp; {snap.entries.length} طالب
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">حضور: {snap.totalPresent}</span>
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-300">غياب: {snap.totalAbsent}</span>
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300">{snap.presentRate}%</span>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); printAttendance(snap); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-black cursor-pointer transition"
                    >
                      <Printer size={13} /> طباعة
                    </button>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${selectedAtt?.id === snap.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {/* Expanded Details */}
                {selectedAtt?.id === snap.id && (
                  <div className="p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-bold">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="py-2 px-3 text-slate-500 text-right font-black">#</th>
                            <th className="py-2 px-3 text-slate-500 text-right font-black">اسم الطالب</th>
                            <th className="py-2 px-3 text-slate-500 text-center font-black">الحالة</th>
                            <th className="py-2 px-3 text-slate-500 text-center font-black">الدرجة</th>
                            <th className="py-2 px-3 text-slate-500 text-right font-black">ملاحظة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snap.entries.map((e, i) => (
                            <tr key={e.studentId} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="py-2 px-3 text-slate-400 text-center">{i + 1}</td>
                              <td className="py-2 px-3 font-black text-slate-950">{e.studentName}</td>
                              <td className="py-2 px-3 text-center">
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black border" style={{ background: getStatusColor(e.status) + '22', color: getStatusColor(e.status), borderColor: getStatusColor(e.status) + '55' }}>
                                  {getStatusLabel(e.status)}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center text-slate-700">{e.score !== undefined ? e.score + '%' : '—'}</td>
                              <td className="py-2 px-3 text-slate-500">{e.note ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ══════════════ HOMEWORK SECTION ══════════════ */}
      {section === 'homework' && (
        <div className="space-y-3">
          {filteredHw.length === 0 ? (
            <EmptyState icon="📚" title="لا توجد سجلات واجبات بعد" desc="سجلات الواجبات تُحفظ تلقائياً عند تسليم أو تقييم واجب في تبويبات الواجبات أو المناهج." />
          ) : (
            filteredHw.map(snap => (
              <div key={snap.id} className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden hover:shadow-sm transition">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 cursor-pointer" onClick={() => setSelectedHw(selectedHw?.id === snap.id ? null : snap)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-lg shrink-0">📝</div>
                    <div>
                      <div className="font-black text-slate-950 text-sm">{snap.homeworkTitle}</div>
                      <div className="text-xs font-bold text-slate-500 mt-0.5">
                        {snap.subject} &nbsp;·&nbsp; {formatArabicDate(snap.date)} &nbsp;·&nbsp; سُلِّم: {snap.totalSubmitted}/{snap.totalStudents}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {snap.avgGrade !== undefined && (
                      <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">متوسط: {snap.avgGrade}/10</span>
                    )}
                    <button type="button" onClick={e => { e.stopPropagation(); printHomework(snap); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-black cursor-pointer transition">
                      <Printer size={13} /> طباعة
                    </button>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${selectedHw?.id === snap.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {selectedHw?.id === snap.id && (
                  <div className="p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-bold">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="py-2 px-3 text-slate-500 text-right font-black">#</th>
                            <th className="py-2 px-3 text-slate-500 text-right font-black">اسم الطالب</th>
                            <th className="py-2 px-3 text-slate-500 text-center font-black">التسليم</th>
                            <th className="py-2 px-3 text-slate-500 text-center font-black">الدرجة</th>
                            <th className="py-2 px-3 text-slate-500 text-right font-black">ملاحظة المعلم</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snap.submissions.map((s, i) => (
                            <tr key={s.studentId} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="py-2 px-3 text-slate-400 text-center">{i + 1}</td>
                              <td className="py-2 px-3 font-black text-slate-950">{s.studentName}</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${s.status === 'submitted' ? 'bg-emerald-100 text-emerald-800' : s.status === 'late' ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800'}`}>
                                  {s.status === 'submitted' ? 'سُلِّم ✓' : s.status === 'late' ? 'تأخر ⏰' : 'لم يُسلَّم ✗'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center font-black text-emerald-800">{s.grade !== undefined ? s.grade + '/10' : '—'}</td>
                              <td className="py-2 px-3 text-slate-500 text-xs">{s.feedback ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ══════════════ QUIZ SECTION ══════════════ */}
      {section === 'quizzes' && (
        <div className="space-y-3">
          {filteredQuiz.length === 0 ? (
            <EmptyState icon="🧠" title="لا توجد سجلات كويزات بعد" desc="نتائج الكويزات والاختبارات ستُحفظ تلقائياً عند إجراء اختبار في تبويب الكويزات والاختبارات." />
          ) : (
            filteredQuiz.map(snap => (
              <div key={snap.id} className="rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden hover:shadow-sm transition">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 cursor-pointer" onClick={() => setSelectedQuiz(selectedQuiz?.id === snap.id ? null : snap)}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-lg shrink-0">🧠</div>
                    <div>
                      <div className="font-black text-slate-950 text-sm">{snap.quizTitle}</div>
                      <div className="text-xs font-bold text-slate-500 mt-0.5">{snap.subject} · {formatArabicDate(snap.date)} · {snap.totalStudents} طالب</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300">متوسط: {snap.avgScore}%</span>
                    <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">أعلى: {snap.highScore}%</span>
                    <button type="button" onClick={e => { e.stopPropagation(); printQuiz(snap); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-black cursor-pointer transition">
                      <Printer size={13} /> طباعة
                    </button>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform ${selectedQuiz?.id === snap.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {selectedQuiz?.id === snap.id && (
                  <div className="p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-bold">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="py-2 px-3 text-slate-500 font-black">#</th>
                            <th className="py-2 px-3 text-slate-500 text-right font-black">اسم الطالب</th>
                            <th className="py-2 px-3 text-slate-500 text-center font-black">الدرجة</th>
                            <th className="py-2 px-3 text-slate-500 text-center font-black">التقدير</th>
                          </tr>
                        </thead>
                        <tbody>
                          {snap.results.sort((a, b) => b.score - a.score).map((r, i) => (
                            <tr key={r.studentId} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="py-2 px-3 text-slate-400 text-center">{i + 1}</td>
                              <td className="py-2 px-3 font-black text-slate-950">{r.studentName}</td>
                              <td className="py-2 px-3 text-center">
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${r.score >= 80 ? 'bg-emerald-100 text-emerald-800' : r.score >= 60 ? 'bg-amber-100 text-amber-900' : 'bg-rose-100 text-rose-800'}`}>
                                  ${r.score}%
                                </span>
                              </td>
                              <td className="py-2 px-3 text-center text-slate-500 text-[11px]">
                                {r.score >= 90 ? '🌟 ممتاز' : r.score >= 80 ? '✅ جيد جداً' : r.score >= 60 ? '👍 جيد' : '⚠️ يحتاج متابعة'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-4 shadow-xs">
      <div className="w-20 h-20 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-4xl shadow-sm">{icon}</div>
      <div className="max-w-md mx-auto space-y-2">
        <h3 className="font-black text-base text-slate-900">{title}</h3>
        <p className="text-xs font-bold text-slate-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
