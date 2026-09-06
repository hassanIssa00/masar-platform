'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Users, Send, FileText, Video, Phone, MessageSquare,
  CheckCircle2, Sparkles, User, Search, Copy, ShieldCheck,
  Mail, ExternalLink, MessageCircle, Eye, EyeOff, ChevronDown, ChevronUp,
  X, Award, BookOpen, Clock, AlertCircle, Printer, Star, Calendar
} from 'lucide-react';
import { getClassParents, getClassStudents, ClassParentRecord,
  getStudentHomeworkLogs, getStudentNotes, getStudentCertificateLogs } from '@/lib/classDb';
import { saveMessage, saveReport, saveActivity, getReports, getSurveys, ReportRecord } from '@/lib/cloudStore';
import { pullCloudDataToLocal } from '@/lib/firestoreSync';
import { isStudentNameMatch } from '@/lib/nameMatching';
import { synthesizeSurveyReports } from '@/lib/surveyAnalysis';
import { createNotification } from '@/lib/notifications';
import { formatLastSeen } from '@/lib/presence';
import PrintableReportModal from '@/components/PrintableReportModal';

export default function ClassroomParentsTab() {
  const [parents, setParents] = useState<ClassParentRecord[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>('');
  const [dataVersion, setDataVersion] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [zoomUrlInput, setZoomUrlInput] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedReports, setSelectedReports] = useState<Record<string, boolean>>({
    homework: true,
    notes: true,
    certs: true,
    attendance: true,
  });
  const toggleReport = (key: string) =>
    setSelectedReports(prev => ({ ...prev, [key]: !prev[key] }));
  const [showPreview, setShowPreview] = useState(false);
  const [previewSectionModal, setPreviewSectionModal] = useState<{
    title: string;
    type: 'homework' | 'notes' | 'certs' | 'attendance';
  } | null>(null);
  const [selectedDiagnosticReportIds, setSelectedDiagnosticReportIds] = useState<Set<string>>(new Set());
  const toggleDiagnosticReportId = (id: string) =>
    setSelectedDiagnosticReportIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  const [previewingReport, setPreviewingReport] = useState<ReportRecord | null>(null);

  const refresh = () => {
    const list = getClassParents();
    setParents(list);
    if (list.length > 0 && !selectedParentId) {
      setSelectedParentId(list[0].id);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      refresh();
      setDataVersion((v) => v + 1);
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('masar:cloud-cache-update', handleUpdate);

    void pullCloudDataToLocal(
      ['reports', 'surveys', 'students', 'classStudents', 'messages', 'notifications'],
      true
    )
      .then(() => {
        refresh();
        setDataVersion((v) => v + 1);
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('masar:cloud-cache-update', handleUpdate);
    };
  }, [selectedParentId]);

  const filteredParents = useMemo(() => {
    if (!searchQuery.trim()) return parents;
    const q = searchQuery.toLowerCase();
    return parents.filter(
      (p) => p.name.toLowerCase().includes(q) || p.studentName.toLowerCase().includes(q) || p.phone.includes(q),
    );
  }, [parents, searchQuery]);

  const selectedParent = parents.find((p) => p.id === selectedParentId) ?? parents[0] ?? null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  useEffect(() => {
    setSelectedDiagnosticReportIds(new Set());
    setPreviewSectionModal(null);
    setShowPreview(false);
  }, [selectedParentId]);

  // Find all diagnostic student reports (matching Image 2)
  const diagnosticStudentReports = useMemo(() => {
    if (!selectedParent) return [];
    const students = getClassStudents();
    const linkedStudent = students.find(
      (s) =>
        s.id === selectedParent.studentId ||
        (selectedParent.studentName && isStudentNameMatch(s.fullName, selectedParent.studentName))
    );
    const sid = selectedParent.studentId || linkedStudent?.id || selectedParent.id.replace(/^prt-/, '');
    const sName = selectedParent.studentName;
    const parentPhoneDigits = selectedParent.phone ? selectedParent.phone.replace(/\D/g, '').slice(-9) : '';

    const allReports = getReports();
    const matched = allReports.filter((r) => {
      if (r.studentId && (r.studentId === sid || r.studentId === selectedParent.studentId || (linkedStudent && r.studentId === linkedStudent.id))) {
        return true;
      }
      if (sName && isStudentNameMatch(r.studentName, sName)) {
        return true;
      }
      if (linkedStudent?.fullName && isStudentNameMatch(r.studentName, linkedStudent.fullName)) {
        return true;
      }
      if (parentPhoneDigits && r.parentPhone) {
        const rPhoneDigits = r.parentPhone.replace(/\D/g, '').slice(-9);
        if (rPhoneDigits && rPhoneDigits === parentPhoneDigits) return true;
      }
      if (selectedParent.name && r.parentName && isStudentNameMatch(r.parentName, selectedParent.name)) {
        return true;
      }
      return false;
    });

    // Check surveys collection and synthesize survey reports if missing from reports
    const allSurveys = getSurveys();
    const matchingSurveys = allSurveys.filter((s) => {
      if (s.studentId && (s.studentId === sid || s.studentId === selectedParent.studentId || (linkedStudent && s.studentId === linkedStudent.id))) {
        return true;
      }
      if (sName && isStudentNameMatch(s.studentName, sName)) {
        return true;
      }
      if (linkedStudent?.fullName && isStudentNameMatch(s.studentName, linkedStudent.fullName)) {
        return true;
      }
      if (parentPhoneDigits && s.parentPhone) {
        const sPhoneDigits = s.parentPhone.replace(/\D/g, '').slice(-9);
        if (sPhoneDigits && sPhoneDigits === parentPhoneDigits) return true;
      }
      if (selectedParent.name && s.parentName && isStudentNameMatch(s.parentName, selectedParent.name)) {
        return true;
      }
      return false;
    });

    if (matchingSurveys.length > 0) {
      matchingSurveys.sort(
        (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
      );
      const latestSurvey = matchingSurveys[0];

      const hasSurveyAnswers = matched.some(
        (r) => r.type === 'survey-answers' || r.program?.includes('إجابات الاستبيان')
      );
      const hasClinicalAnalysis = matched.some(
        (r) => r.type === 'clinical-analysis' || r.program?.includes('التقرير التحليلي الشامل') || r.program?.includes('تحليلي شامل')
      );

      if (!hasSurveyAnswers || !hasClinicalAnalysis) {
        const { surveyAnswersReport, clinicalAnalysisReport } = synthesizeSurveyReports(latestSurvey, {
          studentId: sid,
          studentName: sName || linkedStudent?.fullName,
          grade: linkedStudent?.grade || latestSurvey.grade,
          parentName: selectedParent.name,
          parentPhone: selectedParent.phone,
          parentAccountId: (linkedStudent as any)?.parentAccountId || (selectedParent as any).accountId,
        });

        if (!hasSurveyAnswers) {
          saveReport(surveyAnswersReport);
          matched.push(surveyAnswersReport);
        }
        if (!hasClinicalAnalysis) {
          saveReport(clinicalAnalysisReport);
          matched.push(clinicalAnalysisReport);
        }
      }
    }

    const findBest = (matcher: (r: ReportRecord) => boolean) => {
      const list = matched.filter(matcher);
      if (list.length === 0) return null;
      list.sort((a, b) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime());
      return list[0];
    };

    const slots = [
      {
        key: 'student-assessment-answers',
        title: 'إجابات اختبار الطالب التفصيلية',
        report: findBest((r) => r.type === 'student-assessment-answers' || r.program?.includes('إجابات اختبار الطالب')),
      },
      {
        key: 'clinical-analysis',
        title: 'التقرير التحليلي الشامل',
        report: findBest((r) => r.type === 'clinical-analysis' || r.program?.includes('التقرير التحليلي الشامل') || r.program?.includes('تحليلي شامل') || r.program?.includes('أكاديمي')),
      },
      {
        key: 'survey-answers',
        title: 'إجابات الاستبيان التفصيلية',
        report: findBest((r) => r.type === 'survey-answers' || r.program?.includes('إجابات الاستبيان')),
      },
      {
        key: 'student-assessment-analysis',
        title: 'تحليل اختبار الطالب المباشر',
        report: findBest((r) => r.type === 'student-assessment-analysis' || r.type === 'placement' || r.program?.includes('تحليل اختبار الطالب المباشر') || r.program?.includes('تحديد مستوى')),
      },
    ];

    const slotReports = slots.map((s) => s.report).filter(Boolean) as ReportRecord[];
    const slotIds = new Set(slotReports.map((r) => r.id));
    const otherReports = matched.filter((r) => !slotIds.has(r.id));

    return [...slotReports, ...otherReports];
  }, [selectedParent, dataVersion]);

  const handleSendDiagnosticReports = async () => {
    if (!selectedParent || selectedDiagnosticReportIds.size === 0) return;
    setReportLoading(true);

    const students = getClassStudents();
    const linkedStudent = students.find(
      (s) =>
        s.id === selectedParent.studentId ||
        (selectedParent.studentName && isStudentNameMatch(s.fullName, selectedParent.studentName))
    );
    const sid = selectedParent.studentId || linkedStudent?.id || selectedParent.id.replace(/^prt-/, '');
    const parentAccId = (linkedStudent as any)?.parentAccountId || (linkedStudent as any)?.linkedParentId || (selectedParent as any).accountId;

    const chosenReports = diagnosticStudentReports.filter((r) => selectedDiagnosticReportIds.has(r.id));

    for (const report of chosenReports) {
      saveReport({
        ...report,
        studentId: report.studentId || sid,
        studentName: report.studentName || selectedParent.studentName,
        parentPhone: report.parentPhone || selectedParent.phone,
        parentName: report.parentName || selectedParent.name,
        parentAccountId: report.parentAccountId || parentAccId,
        status: 'completed',
        dispatchedToParent: true,
        dispatchedByDoctor: true,
        dispatchedAt: new Date().toISOString(),
      });

      const reportTitle = report.program || 'التقرير التشخيصي';
      const text = `📋 تم إرسال وتحديد التقرير الرسمي (${reportTitle}) للطالب (${selectedParent.studentName}). يمكنك الاستطلاع عليه وعلى التوصيات في بوابتك الآن.`;
      saveMessage({
        studentId: sid,
        studentName: selectedParent.studentName,
        parentName: selectedParent.name,
        parentPhone: selectedParent.phone,
        parentAccountId: parentAccId,
        from: 'doctor',
        to: 'parent',
        body: text,
        read: false,
      });

      await createNotification({
        type: 'report',
        title: `📋 تقرير رسمي معتمد: ${reportTitle}`,
        body: `اعتمد د. إسماعيل عيسى تقرير (${reportTitle}) للبطل ${selectedParent.studentName}. متاح الآن في بوابتك.`,
        link: `/school-parent?tab=report`,
        targetRole: 'parent',
        studentId: sid,
        studentName: selectedParent.studentName,
      });
    }

    saveActivity({
      type: 'student',
      title: `📤 إرسال تقارير رسمية للطالب ${selectedParent.studentName}`,
      detail: `تم إرسال ${chosenReports.length} تقرير/تقارير رسمية إلى بوابة ولي الأمر.`,
    });

    const titles = chosenReports.map((r) => r.program).join('، ');
    setActionSuccess(`✅ تم إرسال (${titles}) إلى بوابة ولي أمر ${selectedParent.studentName} بنجاح! 📄`);
    setSelectedDiagnosticReportIds(new Set());
    setReportLoading(false);
    setDataVersion((v) => v + 1);
    setTimeout(() => setActionSuccess(''), 5000);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageBody.trim() || !selectedParent) return;

    const students = getClassStudents();
    const linkedStudent = students.find(s => s.fullName === selectedParent.studentName);
    const sid = linkedStudent?.id || selectedParent.id;
    const parentAccId = (linkedStudent as any)?.parentAccountId || (linkedStudent as any)?.linkedParentId || (selectedParent as any).accountId;

    saveMessage({
      studentId: sid,
      studentName: selectedParent.studentName,
      parentName: selectedParent.name,
      parentPhone: selectedParent.phone,
      parentAccountId: parentAccId,
      from: 'doctor',
      to: 'parent',
      body: messageBody.trim(),
      read: false,
    });

    void createNotification({
      type: 'message',
      title: `رسالة وتوجيه جديد من د. إسماعيل عيسى`,
      body: messageBody.trim().slice(0, 100),
      link: `/school-parent?tab=community`,
      targetRole: 'parent',
      studentId: sid,
      studentName: selectedParent.studentName,
    });

    setActionSuccess(`تم إرسال الرسالة إلى حساب ومنصة ولي الأمر (${selectedParent.name}) بنجاح ✨`);
    setMessageBody('');
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handleSendZoomLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoomUrlInput.trim() || !selectedParent) return;

    const students = getClassStudents();
    const linkedStudent = students.find(s => s.fullName === selectedParent.studentName);
    const sid = linkedStudent?.id || selectedParent.id;
    const parentAccId = (linkedStudent as any)?.parentAccountId || (linkedStudent as any)?.linkedParentId || (selectedParent as any).accountId;

    const zoomMsg = `📹 *رابط الجلسة المباشرة / Zoom*\nعزيزي ولي أمر الطالب *${selectedParent.studentName}* 👋\nيسر د. إسماعيل عيسى دعوتكم لحضور الجلسة التفاعلية المباشرة عبر الرابط التالي:\n🔗 ${zoomUrlInput.trim()}`;

    saveMessage({
      studentId: sid,
      studentName: selectedParent.studentName,
      parentName: selectedParent.name,
      parentPhone: selectedParent.phone,
      parentAccountId: parentAccId,
      from: 'doctor',
      to: 'parent',
      body: zoomMsg,
      read: false,
    });

    void createNotification({
      type: 'meeting',
      title: `📹 دعوة لجلسة تفاعلية مباشرة مع د. إسماعيل`,
      body: `اضغط للدخول إلى رابط الجلسة المباشرة لـ ${selectedParent.studentName}`,
      link: zoomUrlInput.trim(),
      targetRole: 'parent',
      studentId: sid,
      studentName: selectedParent.studentName,
    });

    setActionSuccess(`تم إرسال رابط البث المباشر / الجلسة لـ (${selectedParent.name}) عبر المنصة بنجاح 📹`);
    setZoomUrlInput('');
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handleSendFullReport = async (channel: 'platform' | 'whatsapp' | 'both' = 'platform') => {
    if (!selectedParent) return;
    const anySelected = Object.values(selectedReports).some(Boolean);
    if (!anySelected) {
      setActionSuccess('⚠️ يرجى اختيار قسم واحد على الأقل لإرساله!');
      setTimeout(() => setActionSuccess(''), 3000);
      return;
    }
    setReportLoading(true);
    // Find the linked student id from class students list
    const students = getClassStudents();
    const linkedStudent = students.find(s => s.fullName === selectedParent.studentName);
    const sid = linkedStudent?.id ?? selectedParent.id;
    const hwLogs = sid ? getStudentHomeworkLogs(sid) : [];
    const notes  = sid ? getStudentNotes(sid) : [];
    const certs  = sid ? getStudentCertificateLogs(sid) : [];

    const phone = selectedParent.phone.replace(/\D/g, '');
    const wap   = phone.startsWith('966') ? phone : '966' + phone.replace(/^0/, '');
    const day   = new Date().toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });

    // Build selected sections label
    const sectionLabels: string[] = [];
    if (selectedReports.homework) sectionLabels.push('الواجبات');
    if (selectedReports.notes) sectionLabels.push('الملاحظات');
    if (selectedReports.certs) sectionLabels.push('الشهادات');
    if (selectedReports.attendance) sectionLabels.push('الحضور');

    let m = `*فصل د. إسماعيل عيسى — مسار التعليمي*\n`;
    m += `📋 *تقرير متابعة الطالب: ${selectedParent.studentName}*\n`;
    m += `📌 *يتضمن:* ${sectionLabels.join(' · ')}\n`;
    m += `📅 *التاريخ:* ${day}\n`;
    m += `👨‍👩‍👦 *ولي الأمر:* ${selectedParent.name}\n\n`;

    // Section 1: Homework
    if (selectedReports.homework) {
      if (hwLogs.length) {
        m += `📚 *الواجبات والمهام (${hwLogs.length}):*\n`;
        hwLogs.slice(0, 6).forEach(h => {
          const ic = h.status === 'submitted' || h.status === 'reviewed' ? '✅' : h.status === 'late' ? '⏰' : '❌';
          m += `${ic} ${h.title} — ${h.subject}${h.grade !== undefined ? ` (${h.grade}/10)` : ''}\n`;
        });
        m += '\n';
      } else {
        m += `📚 *الواجبات:* لا توجد سجلات واجبات بعد.\n\n`;
      }
    }

    // Section 2: Teacher Notes
    if (selectedReports.notes) {
      if (notes.length) {
        m += `📝 *ملاحظات المعلم د. إسماعيل (${notes.length}):*\n`;
        notes.slice(0, 4).forEach(n => { m += `• ${n.text}\n`; });
        m += '\n';
      } else {
        m += `📝 *ملاحظات المعلم:* لا توجد ملاحظات مسجلة بعد.\n\n`;
      }
    }

    // Section 3: Certificates & Achievements
    if (selectedReports.certs) {
      if (certs.length) {
        m += `🏆 *الشهادات والإنجازات المعتمدة (${certs.length}):*\n`;
        certs.forEach(c => { m += `🎖️ ${c.title} — ${c.completionDate}\n`; });
        m += '\n';
      } else {
        m += `🏆 *الشهادات:* لا توجد شهادات مسجلة بعد.\n\n`;
      }
    }

    // Section 4: Attendance summary
    if (selectedReports.attendance) {
      m += `📅 *ملخص الحضور:*\n`;
      m += `• الفصل: الصف الأول الابتدائي — فصل د. إسماعيل عيسى\n`;
      m += `• يتم متابعة حضور الطالب يومياً وإشعار ولي الأمر عند الغياب.\n\n`;
    }

    m += `🌟 نسعد دائماً بمتابعتكم ودعمكم لأبطالنا الصغار!\n_منصة مسار للتعليم الذكي_`;

    // 1. Send to Platform (In-app chat + notification + official report record)
    if (channel === 'platform' || channel === 'both') {
      const parentAccId = (linkedStudent as any)?.parentAccountId || (linkedStudent as any)?.linkedParentId || (selectedParent as any).accountId;

      saveMessage({
        studentId: sid,
        studentName: selectedParent.studentName,
        parentName: selectedParent.name,
        parentPhone: selectedParent.phone,
        parentAccountId: parentAccId,
        from: 'doctor',
        to: 'parent',
        body: m,
        read: false,
      });

      saveReport({
        studentId: sid,
        studentName: selectedParent.studentName,
        parentName: selectedParent.name,
        parentPhone: selectedParent.phone,
        parentAccountId: parentAccId,
        grade: linkedStudent?.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
        program: `تقرير (${sectionLabels.join(' + ')}) — فصل د. إسماعيل عيسى`,
        programColor: 'bg-emerald-600',
        date: new Date().toISOString().slice(0, 10),
        score: 100,
        status: 'completed',
        type: 'clinical-analysis',
        summary: m,
        recommendations: notes.length ? notes.map(n => n.text) : ['الاستمرار في المتابعة وتشجيع الطالب.'],
        answers: [],
        domains: [
          ...(selectedReports.homework ? [{ name: 'الواجبات والمهام', score: hwLogs.length ? 95 : 100, note: `${hwLogs.length} واجبات مسجلة` }] : []),
          ...(selectedReports.notes ? [{ name: 'ملاحظات المعلم', score: 98, note: `${notes.length} ملاحظات` }] : []),
          ...(selectedReports.certs ? [{ name: 'الشهادات والإنجازات', score: certs.length ? 100 : 90, note: `${certs.length} شهادات` }] : []),
          ...(selectedReports.attendance ? [{ name: 'الحضور والانتظام', score: 96, note: 'متابعة يومية' }] : []),
        ],
      });

      await createNotification({
        type: 'report',
        title: `📋 تقرير جديد للطالب: ${selectedParent.studentName} (${sectionLabels.join(' + ')})`,
        body: `تم إصدار التقرير من قِبَل د. إسماعيل عيسى، متاح الآن في حسابك.`,
        link: `/school-parent?tab=report`,
        targetRole: 'parent',
        studentId: sid,
        studentName: selectedParent.studentName,
      });

      saveActivity({
        type: 'student',
        title: `📋 إرسال تقرير للطالب ${selectedParent.studentName}`,
        detail: `الأقسام المرسلة: ${sectionLabels.join('، ')} — مباشرة إلى منصة وحساب ولي الأمر.`,
      });
    }

    // 2. Send via WhatsApp
    if (channel === 'whatsapp' || channel === 'both') {
      window.open(`https://wa.me/${wap}?text=${encodeURIComponent(m)}`, '_blank');
    }

    setReportLoading(false);

    if (channel === 'platform') {
      setActionSuccess(`✅ تم إرسال التقرير (${sectionLabels.join(' + ')}) بنجاح إلى منصة ولي الأمر (${selectedParent.name})! 📱`);
    } else if (channel === 'whatsapp') {
      setActionSuccess(`✅ تم فتح واتساب لإرسال تقرير (${sectionLabels.join(' + ')}) للطالب ${selectedParent.studentName} 💬`);
    } else {
      setActionSuccess(`✅ تم إرسال التقرير للمنصة وفُتح واتساب بنجاح! 🚀`);
    }

    setTimeout(() => setActionSuccess(''), 5000);
  };




  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              إدارة أولياء أمور الفصل
              <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-black text-indigo-800">
                فصل د. إسماعيل عيسى
              </span>
            </h1>
            <p className="text-xs font-bold text-slate-500 mt-1">
              متابعة حسابات أولياء الأمور المرتبطة بطلاب الفصل · التواصل المباشر · إرسال التقارير وروابط الجلسات
            </p>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-black text-emerald-900 flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-600 shrink-0" />
          {actionSuccess}
        </div>
      )}

      {/* Main Grid: Left Parents List / Right Control Dashboard */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Parents List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="بحث باسم ولي الأمر أو الطفل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none"
              />
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            </div>

            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-0.5 scrollbar-thin">
              {filteredParents.map((p) => {
                const active = p.id === selectedParentId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedParentId(p.id)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                      active
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-10 w-10 place-items-center rounded-xl font-black text-sm ${
                            active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900">{p.name}</h3>
                          <p className="text-[11px] font-bold text-slate-500">طالب الفصل: {p.studentName}</p>
                          {(() => {
                            const presence = formatLastSeen(p.parentLastActiveAt || p.parentLastLoginAt);
                            return (
                              <div className="flex items-center gap-1.5 mt-1" title={presence.title}>
                                <span className={`inline-block h-1.5 w-1.5 rounded-full ${presence.dotClass}`} />
                                <span className="text-[10px] font-bold text-slate-500 truncate">آخر ظهور: {presence.text}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        {p.phone}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredParents.length === 0 && (
                <div className="p-8 text-center text-xs font-bold text-slate-400">
                  لا يوجد أولياء أمور مطابقون للبحث
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Parent Control Panel */}
        <div className="lg:col-span-8 space-y-6">
          {selectedParent ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              {/* Selected Parent Card Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white font-black text-xl shadow-lg shadow-indigo-600/20">
                    {selectedParent.name.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      {selectedParent.name}
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
                        <CheckCircle2 size={12} /> حساب موثق بالفصل
                      </span>
                    </h2>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      مرتبط بالطفل: <span className="text-indigo-950 font-black">{selectedParent.studentName}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {(() => {
                        const prPresence = formatLastSeen(selectedParent.parentLastActiveAt || selectedParent.parentLastLoginAt);
                        return (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${prPresence.badgeClass}`} title={prPresence.title}>
                            <span className={`h-1.5 w-1.5 rounded-full ${prPresence.dotClass}`} />
                            👤 نشاط ولي الأمر: {prPresence.text}
                          </span>
                        );
                      })()}
                      {(() => {
                        const stPresence = formatLastSeen(selectedParent.studentLastActiveAt || selectedParent.studentLastLoginAt);
                        return (
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${stPresence.badgeClass}`} title={stPresence.title}>
                            <span className={`h-1.5 w-1.5 rounded-full ${stPresence.dotClass}`} />
                            🎒 نشاط الطالب: {stPresence.text}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Direct WhatsApp Action Link */}
                <a
                  href={`https://wa.me/966${selectedParent.phone.replace(/^0/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700 transition shadow-sm"
                >
                  <MessageCircle size={16} />
                  تواصل عبر الواتساب
                </a>
              </div>

              {/* Account Credentials & Activity Summary Grid */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                  <span className="text-slate-400 font-bold block text-[11px]">رقم الجوال:</span>
                  <div className="flex items-center justify-between font-mono font-black text-slate-900 text-xs">
                    <span>{selectedParent.phone}</span>
                    <button
                      onClick={() => copyToClipboard(selectedParent.phone, 'phone')}
                      className="text-indigo-600 text-[11px] font-sans hover:underline flex items-center gap-0.5"
                    >
                      <Copy size={12} />
                      {copiedKey === 'phone' ? 'تم' : 'نسخ'}
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                  <span className="text-slate-400 font-bold block text-[11px]">البريد الإلكتروني:</span>
                  <div className="flex items-center justify-between font-mono font-black text-slate-900 text-xs">
                    <span className="truncate max-w-[130px]">{selectedParent.email || '—'}</span>
                    {selectedParent.email && (
                      <button
                        onClick={() => copyToClipboard(selectedParent.email, 'email')}
                        className="text-indigo-600 text-[11px] font-sans hover:underline flex items-center gap-0.5"
                      >
                        <Copy size={12} />
                        {copiedKey === 'email' ? 'تم' : 'نسخ'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Parent Last Seen Card */}
                {(() => {
                  const prPresence = formatLastSeen(selectedParent.parentLastActiveAt || selectedParent.parentLastLoginAt);
                  return (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                      <span className="text-slate-400 font-bold block text-[11px]">آخر نشاط لولي الأمر:</span>
                      <div className="flex items-center gap-1.5" title={prPresence.title}>
                        <span className={`h-2 w-2 rounded-full ${prPresence.dotClass}`} />
                        <span className="font-black text-slate-900 text-xs truncate">{prPresence.text}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Student Last Seen Card */}
                {(() => {
                  const stPresence = formatLastSeen(selectedParent.studentLastActiveAt || selectedParent.studentLastLoginAt);
                  return (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                      <span className="text-slate-400 font-bold block text-[11px]">آخر نشاط للطالب:</span>
                      <div className="flex items-center gap-1.5" title={stPresence.title}>
                        <span className={`h-2 w-2 rounded-full ${stPresence.dotClass}`} />
                        <span className="font-black text-slate-900 text-xs truncate">{stPresence.text}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Direct Communication Panel */}
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Send size={18} className="text-indigo-600" />
                  إرسال رسالة مباشرة لولي الأمر بالفصل
                </h3>

                <form onSubmit={handleSendMessage} className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder="اكتب التوجيه أو الرسالة التي ستظهر في حساب ولي الأمر مباشرة..."
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-indigo-700 px-5 py-2.5 text-xs font-black text-white hover:bg-indigo-800 transition shadow-sm"
                  >
                    إرسال التوجيه الآن
                  </button>
                </form>
              </div>

              {/* Send Zoom/Live Session Link Panel */}
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Video size={18} className="text-purple-600" />
                  إرسال رابط الجلسة المباشرة / Zoom لولي الأمر
                </h3>

                <form onSubmit={handleSendZoomLink} className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://zoom.us/j/1234567890"
                    value={zoomUrlInput}
                    onChange={(e) => setZoomUrlInput(e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:bg-white focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-purple-700 px-5 py-2.5 text-xs font-black text-white hover:bg-purple-800 transition shadow-sm shrink-0"
                  >
                    مشاركة رابط الجلسة
                  </button>
                </form>
              </div>

              {/* ════════════════════════════════════════════════════════════════════════════
                  TOOL 1: CLASS COMPREHENSIVE REPORT SENDER (HOMEWORK, NOTES, CERTS, ATTENDANCE)
              ════════════════════════════════════════════════════════════════════════════ */}
              <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <FileText size={18} className="text-emerald-600" />
                    <span>إرسال تقرير المتابعة الصفية للطالب</span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
                      اختر الأقسام المطلوب إرسالها
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowPreview((p) => !p)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-black transition cursor-pointer self-start sm:self-auto ${
                      showPreview
                        ? 'border-emerald-400 bg-emerald-100 text-emerald-900 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                    <span>{showPreview ? 'إخفاء معاينة الرسالة' : 'معاينة نص الرسالة قبل الإرسال 👁️'}</span>
                  </button>
                </div>

                <p className="text-xs font-bold text-slate-600 leading-relaxed">
                  حدد الأقسام التي تود تضمينها في رسالة تقرير الطالب <strong>{selectedParent.studentName}</strong>، ويمكنك الضغط على <strong>زر المعاينة 👁️</strong> بجانب كل قسم لفحص بياناته قبل الإرسال.
                </p>

                {/* 4 Core Report Sections with Checkbox + Preview Button */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {([
                    {
                      key: 'homework',
                      label: '📚 الواجبات والمهام',
                      active: 'border-emerald-500 bg-emerald-100 text-emerald-950',
                      check: 'border-emerald-600 bg-emerald-600',
                      previewType: 'homework' as const,
                      previewTitle: `معاينة سجل الواجبات والمهام — ${selectedParent.studentName}`,
                    },
                    {
                      key: 'notes',
                      label: '📝 ملاحظات المعلم',
                      active: 'border-blue-500 bg-blue-100 text-blue-950',
                      check: 'border-blue-600 bg-blue-600',
                      previewType: 'notes' as const,
                      previewTitle: `معاينة ملاحظات وتوجيهات المعلم — ${selectedParent.studentName}`,
                    },
                    {
                      key: 'certs',
                      label: '🏆 الشهادات والإنجازات',
                      active: 'border-amber-500 bg-amber-100 text-amber-950',
                      check: 'border-amber-600 bg-amber-600',
                      previewType: 'certs' as const,
                      previewTitle: `معاينة الشهادات والأوسمة — ${selectedParent.studentName}`,
                    },
                    {
                      key: 'attendance',
                      label: '📅 ملخص الحضور',
                      active: 'border-purple-500 bg-purple-100 text-purple-950',
                      check: 'border-purple-600 bg-purple-600',
                      previewType: 'attendance' as const,
                      previewTitle: `معاينة ملخص الحضور والانتظام — ${selectedParent.studentName}`,
                    },
                  ] as const).map(({ key, label, active, check, previewType, previewTitle }) => (
                    <div
                      key={key}
                      className={`flex items-center justify-between rounded-xl border-2 p-2.5 transition-all ${
                        selectedReports[key] ? active : 'border-slate-200 bg-white text-slate-500'
                      }`}
                    >
                      {/* Checkbox selector */}
                      <button
                        type="button"
                        onClick={() => toggleReport(key)}
                        className="flex items-center gap-2 flex-1 text-right font-black text-xs cursor-pointer select-none"
                      >
                        <span
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                            selectedReports[key] ? check : 'border-slate-300 bg-white'
                          }`}
                        >
                          {selectedReports[key] && <span className="text-white text-[10px] font-black leading-none">✓</span>}
                        </span>
                        <span>{label}</span>
                      </button>

                      {/* Preview Button for this specific section */}
                      <button
                        type="button"
                        onClick={() => setPreviewSectionModal({ title: previewTitle, type: previewType })}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-300/80 bg-white px-2 py-1 text-[11px] font-black text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition cursor-pointer shrink-0 shadow-2xs"
                        title="معاينة محتوى هذا القسم بالتفصيل"
                      >
                        <Eye size={12} className="text-slate-600" />
                        <span>معاينة</span>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Live Message Text Preview (Expandable) */}
                {showPreview && (() => {
                  const students = getClassStudents();
                  const linked = students.find((s) => s.fullName === selectedParent.studentName);
                  const sid = linked?.id ?? selectedParent.id;
                  const hwLogs = sid ? getStudentHomeworkLogs(sid) : [];
                  const notes = sid ? getStudentNotes(sid) : [];
                  const certs = sid ? getStudentCertificateLogs(sid) : [];
                  return (
                    <div className="rounded-2xl border border-emerald-300 bg-white p-4 space-y-3 shadow-sm animate-fadeIn">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <p className="text-xs font-black text-emerald-900 flex items-center gap-1.5">
                          <Eye size={14} className="text-emerald-700" />
                          <span>معاينة نص الرسالة التي ستصل لولي الأمر:</span>
                        </p>
                        <span className="text-[10px] font-bold text-slate-400">فصل د. إسماعيل عيسى</span>
                      </div>

                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 font-mono text-xs text-slate-800 leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto">
                        {`*فصل د. إسماعيل عيسى — مسار التعليمي*\n📋 *تقرير الطالب: ${selectedParent.studentName}*\n📅 *التاريخ:* ${new Date().toLocaleDateString('ar-SA')}\n👨‍👩‍👦 *ولي الأمر:* ${selectedParent.name}\n\n` +
                          (selectedReports.homework
                            ? `📚 *الواجبات والمهام (${hwLogs.length}):*\n` +
                              (hwLogs.length
                                ? hwLogs
                                    .slice(0, 4)
                                    .map(
                                      (h) =>
                                        `• ${h.title} — ${h.subject}${h.grade !== undefined ? ` (${h.grade}/10 ⭐)` : ''}`
                                    )
                                    .join('\n') + '\n\n'
                                : 'لا توجد واجبات متأخرة\n\n')
                            : '') +
                          (selectedReports.notes
                            ? `📝 *ملاحظات المعلم د. إسماعيل (${notes.length}):*\n` +
                              (notes.length ? notes.slice(0, 3).map((n) => `• ${n.text}`).join('\n') + '\n\n' : 'لا توجد ملاحظات مسجلة\n\n')
                            : '') +
                          (selectedReports.certs
                            ? `🏆 *الشهادات والإنجازات (${certs.length}):*\n` +
                              (certs.length ? certs.slice(0, 2).map((c) => `🎖️ ${c.title} — ${c.completionDate}`).join('\n') + '\n\n' : 'لا توجد شهادات مسجلة\n\n')
                            : '') +
                          (selectedReports.attendance
                            ? `📅 *ملخص الحضور:*\n• الصف الأول الابتدائي — متابعة يومية منتظمة\n\n`
                            : '') +
                          `🌟 نسعد دائماً بمتابعتكم ودعمكم لأبطالنا الصغار!\n_منصة مسار للتعليم الذكي_`}
                      </div>
                    </div>
                  );
                })()}

                {/* Send Buttons for Class Report */}
                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-emerald-200">
                  <button
                    onClick={() => handleSendFullReport('platform')}
                    disabled={reportLoading}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 text-xs font-black text-white transition shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    <Send size={14} />
                    <span>إرسال لمنصة ولي الأمر 📱</span>
                  </button>

                  <button
                    onClick={() => handleSendFullReport('whatsapp')}
                    disabled={reportLoading}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs font-black text-white transition shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    <MessageCircle size={15} />
                    <span>إرسال عبر واتساب 💬</span>
                  </button>

                  <button
                    onClick={() => handleSendFullReport('both')}
                    disabled={reportLoading}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2.5 text-xs font-black text-white transition shadow-sm cursor-pointer disabled:opacity-60"
                  >
                    <Sparkles size={14} className="text-amber-400" />
                    <span>إرسال للمنصة + واتساب معاً 🚀</span>
                  </button>
                </div>
              </div>

              {/* ════════════════════════════════════════════════════════════════════════════
                  TOOL 2: OFFICIAL DIAGNOSTIC REPORTS DISPATCH (IMAGE 2 RECREATION)
              ════════════════════════════════════════════════════════════════════════════ */}
              <section className="rounded-2xl border border-teal-200 bg-white p-6 shadow-sm space-y-5">
                <div className="border-b border-teal-100 pb-3">
                  <h3 className="text-base font-black text-slate-950 flex items-center gap-2">
                    <Sparkles size={20} className="text-teal-600" />
                    <span>أدوات إرسال البيانات المباشرة لحساب ولي الأمر</span>
                  </h3>
                  <p className="text-xs font-bold text-slate-500 mt-1">
                    أي بيان ترقيه هنا يرسل فوراً إلى حساب ولي الأمر ليظهر له عند تسجيل دخوله في بوابته (`/parent`).
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-teal-800">
                      <FileText size={20} className="text-teal-600" />
                      <h4 className="font-black text-sm">حدد التقرير المطلوب إرساله لولي الأمر</h4>
                    </div>
                    <span className="text-[11px] font-black text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full">
                      {diagnosticStudentReports.length} متاح
                    </span>
                  </div>

                  {diagnosticStudentReports.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-[11px] font-black text-slate-500">
                        اختر التقارير التي تريد إرسالها لولي الأمر ({diagnosticStudentReports.length} متاح):
                      </p>

                      <div className="grid gap-2.5">
                        {diagnosticStudentReports.map((r) => {
                          const checked = selectedDiagnosticReportIds.has(r.id);
                          const isDispatched = r.dispatchedToParent === true;
                          return (
                            <div
                              key={r.id}
                              className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 transition select-none ${
                                checked
                                  ? 'border-teal-500 bg-teal-50 shadow-xs'
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                            >
                              <label className="flex items-start gap-3 flex-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleDiagnosticReportId(r.id)}
                                  className="mt-1 h-4 w-4 accent-teal-600 shrink-0 cursor-pointer"
                                />
                                <div className="min-w-0">
                                  <p className={`text-xs font-black truncate ${checked ? 'text-teal-950' : 'text-slate-900'}`}>
                                    📄 {r.program}
                                  </p>
                                  <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                                    {r.date} — نتيجة {r.score}%
                                  </p>
                                </div>
                              </label>

                              <div className="flex items-center gap-2 shrink-0">
                                {isDispatched && (
                                  <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-black">
                                    مرسل سابقاً ✓
                                  </span>
                                )}
                                {/* PREVIEW BUTTON */}
                                <button
                                  type="button"
                                  onClick={() => setPreviewingReport(r)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-teal-300 bg-teal-50 px-2.5 py-1 text-xs font-black text-teal-800 hover:bg-teal-100 transition cursor-pointer shadow-2xs"
                                  title="معاينة التقرير الرسمي بالكامل"
                                >
                                  <Eye size={13} />
                                  <span>معاينة التقرير</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {selectedDiagnosticReportIds.size > 0 && (
                        <p className="text-xs font-black text-teal-800 bg-teal-50 rounded-xl border border-teal-200 p-2.5 text-center">
                          ✅ سيتم إرسال {selectedDiagnosticReportIds.size} تقرير/تقارير معتمدة إلى بوابة ولي الأمر
                        </p>
                      )}

                      <button
                        onClick={handleSendDiagnosticReports}
                        disabled={selectedDiagnosticReportIds.size === 0 || reportLoading}
                        className="w-full rounded-xl bg-teal-600 hover:bg-teal-700 py-3 text-xs font-black text-white transition disabled:opacity-50 shadow-sm cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Send size={15} />
                        <span>إرسال التقارير المحددة ({selectedDiagnosticReportIds.size}) إلى بوابة ولي الأمر 📤</span>
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl bg-white border border-slate-200 p-6 text-center space-y-2">
                      <FileText size={32} className="mx-auto text-slate-300" />
                      <p className="text-xs font-black text-slate-700">لا توجد تقارير تشخيصية منشأة لهذا الطالب بعد.</p>
                      <p className="text-[11px] font-bold text-slate-400">
                        عند إكمال اختبار الطالب أو الاستبيان، ستظهر التقارير الأربعة (إجابات الاختبار، التقرير التحليلي الشامل، إجابات الاستبيان، تحليل الاختبار) هنا تلقائياً للإرسال.
                      </p>
                    </div>
                  )}
                </div>
              </section>



            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400 font-bold">
              اختر ولي أمر من القائمة لعرض بياناته والتواصل معه
            </div>
          )}
        </div>
      </div>

      {/* Section Detail Preview Modal (Homework, Notes, Certs, Attendance) */}
      {previewSectionModal && selectedParent && (() => {
        const students = getClassStudents();
        const linked = students.find((s) => s.fullName === selectedParent.studentName);
        const sid = linked?.id ?? selectedParent.id;
        const hwLogs = sid ? getStudentHomeworkLogs(sid) : [];
        const notes = sid ? getStudentNotes(sid) : [];
        const certs = sid ? getStudentCertificateLogs(sid) : [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fadeIn" dir="rtl">
            <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Eye size={18} className="text-indigo-600" />
                  <span>{previewSectionModal.title}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setPreviewSectionModal(null)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {previewSectionModal.type === 'homework' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>قائمة الواجبات والمهام المسجلة:</span>
                    <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 font-black text-[11px]">{hwLogs.length} واجب</span>
                  </div>
                  {hwLogs.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center text-xs font-bold text-slate-400">
                      لا توجد واجبات مسجلة لهذا الطالب حتى الآن.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
                      {hwLogs.map((h, i) => (
                        <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-slate-900">{h.title}</span>
                            <span className="rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black px-2.5 py-0.5">{h.subject}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500 flex-wrap">
                            <span>موعد التسليم: {h.dueDate}</span>
                            <span className={h.status === 'reviewed' ? 'text-emerald-700 font-black' : h.status === 'submitted' ? 'text-blue-700' : 'text-slate-600'}>
                              الحالة: {h.status === 'reviewed' ? 'تم التصحيح ✅' : h.status === 'submitted' ? 'تم التسليم ⏳' : 'مكلف 📋'}
                            </span>
                            {h.grade !== undefined && (
                              <span className="font-black text-amber-600 bg-amber-50 rounded-md px-1.5 py-0.5 border border-amber-200">
                                الدرجة: {h.grade}/10 ⭐
                              </span>
                            )}
                          </div>
                          {h.teacherFeedback && (
                            <p className="text-[11px] font-bold text-emerald-900 bg-emerald-50/90 rounded-xl p-2 border border-emerald-200">
                              💬 ملاحظة الدكتور: {h.teacherFeedback}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {previewSectionModal.type === 'notes' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>ملاحظات المعلم وتوجيهاته الدورية:</span>
                    <span className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 font-black text-[11px]">{notes.length} ملاحظة</span>
                  </div>
                  {notes.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center text-xs font-bold text-slate-400">
                      لا توجد ملاحظات مسجلة لهذا الطالب حتى الآن.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
                      {notes.map((n, i) => (
                        <div key={i} className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 space-y-1">
                          <p className="text-xs font-black text-blue-950 leading-relaxed">• {n.text}</p>
                          <p className="text-[10px] font-bold text-blue-600">{n.createdAt ? new Date(n.createdAt).toLocaleDateString('ar-SA') : 'توجيه صفي'}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {previewSectionModal.type === 'certs' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>الشهادات والأوسمة التقديرية المعتمدة:</span>
                    <span className="rounded-full bg-amber-100 text-amber-900 px-2 py-0.5 font-black text-[11px]">{certs.length} شهادة</span>
                  </div>
                  {certs.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 text-center text-xs font-bold text-slate-400">
                      لا توجد شهادات مسجلة لهذا الطالب حتى الآن.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
                      {certs.map((c, i) => (
                        <div key={i} className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3.5 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <p className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                              <Award size={15} className="text-amber-600" />
                              <span>{c.title}</span>
                            </p>
                            <p className="text-[10px] font-bold text-amber-700">تاريخ الإنجاز: {c.completionDate}</p>
                          </div>
                          <span className="rounded-full bg-amber-200 text-amber-900 px-2.5 py-0.5 text-[10px] font-black">
                            معتمدة 🏆
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {previewSectionModal.type === 'attendance' && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-slate-500">ملخص انتظام وحضور الطالب:</p>
                  <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4 space-y-2.5 text-xs font-bold text-purple-950">
                    <p className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-purple-600 shrink-0" />
                      <span>الفصل: الصف الأول الابتدائي — فصل د. إسماعيل عيسى</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />
                      <span>المتابعة اليومية: متابعة حضور وانتظام مستمرة مع كل حصة دراسية.</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                      <span>التنبيهات: إشعار فوري لولي الأمر عبر المنصة والواتساب عند أي غياب أو ملاحظة سلوكية.</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewSectionModal(null)}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-black text-white hover:bg-slate-800 transition cursor-pointer"
                >
                  إغلاق المعاينة
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Official Diagnostic Report Preview Modal (PrintableReportModal) */}
      {previewingReport && (() => {
        const students = getClassStudents();
        const linked = selectedParent
          ? students.find((s) => s.id === selectedParent.studentId || (selectedParent.studentName && isStudentNameMatch(s.fullName, selectedParent.studentName)))
          : null;
        return (
          <PrintableReportModal
            report={previewingReport}
            student={linked as any}
            onClose={() => setPreviewingReport(null)}
          />
        );
      })()}
    </div>
  );
}
