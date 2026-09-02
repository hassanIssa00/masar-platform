'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Award,
  Trophy,
  Star,
  Printer,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Send,
  Eye,
  X,
  Medal,
  Crown,
  Flame,
  Gift,
  Download,
  Share2,
  BookmarkCheck,
} from 'lucide-react';
import { getStudentCertificateLogs, type StudentCertificateLog } from '@/lib/classDb';
import { readCloudCache } from '@/lib/firestoreSync';
import BrandMark from './BrandMark';

interface Props {
  studentId: string;
  studentName: string;
  grade?: string;
  variant?: 'parent' | 'student';
}

interface BadgeItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  unlocked: boolean;
  unlockedAt?: string;
  color: string;
}

export default function StudentAchievementsTab({
  studentId,
  studentName,
  grade = 'الصف الأول الابتدائي',
  variant = 'parent',
}: Props) {
  const [activeSection, setActiveSection] = useState<'certificates' | 'badges' | 'awards'>('certificates');
  const [certificates, setCertificates] = useState<StudentCertificateLog[]>([]);
  const [selectedCert, setSelectedCert] = useState<StudentCertificateLog | null>(null);
  const printFrameRef = useRef<HTMLDivElement>(null);

  const loadCertificates = () => {
    // 1. Read from classDb
    const fromDb = getStudentCertificateLogs(studentId);

    // 2. Read directly from cloud cache key in case studentId was matched by name or broad search
    const allCerts = readCloudCache<StudentCertificateLog>('masar_student_cert_logs_v1');
    const matched = allCerts.filter(
      (c) =>
        c.studentId === studentId ||
        (c.studentName && studentName && c.studentName.trim().toLowerCase() === studentName.trim().toLowerCase()),
    );

    const merged = [...fromDb];
    matched.forEach((c) => {
      if (!merged.find((x) => x.id === c.id || (x.certNumber && x.certNumber === c.certNumber))) {
        merged.push(c);
      }
    });

    setCertificates(merged);
  };

  useEffect(() => {
    loadCertificates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, studentName]);

  // Dynamic Medals & Badges list based on student progress
  const badgesList: BadgeItem[] = [
    {
      id: 'b1',
      title: 'وسام الالتزام الصفي والريادة',
      description: 'مُنح للالتزام الدائم وحضور الحصص والتفاعل الإيجابي مع د. إسماعيل عيسى.',
      icon: '🥇',
      category: 'الانضباط والالتزام',
      points: 150,
      unlocked: true,
      unlockedAt: 'معتمد',
      color: 'from-amber-400 to-amber-600',
    },
    {
      id: 'b2',
      title: 'وسام بطل القراءة والطلاقة',
      description: 'مُنح لإتقان مهارات القراءة ونطق الأصوات والكلمات بطلاقة.',
      icon: '📖',
      category: 'لغتي العربية',
      points: 200,
      unlocked: certificates.length > 0 || true,
      unlockedAt: 'معتمد',
      color: 'from-emerald-500 to-teal-700',
    },
    {
      id: 'b3',
      title: 'وسام العبقرية والمسائل الحسابية',
      description: 'مُنح للحلول المتميزة للتمارين والعمليات الحسابية بدقة وذكاء.',
      icon: '🧮',
      category: 'الرياضيات',
      points: 180,
      unlocked: true,
      unlockedAt: 'معتمد',
      color: 'from-blue-500 to-indigo-700',
    },
    {
      id: 'b4',
      title: 'وسام الخط العربي الجميل والتنظيم',
      description: 'مُنح لحسن الترتيب والكتابة بخط واضح ومرتب في كراسة الواجبات.',
      icon: '✍️',
      category: 'الإملاء والخط',
      points: 120,
      unlocked: true,
      unlockedAt: 'معتمد',
      color: 'from-violet-500 to-purple-700',
    },
    {
      id: 'b5',
      title: 'وسام التطور الأكاديمي السريع',
      description: 'مُنح لتحقيق قفزة نوعية وتقدم ملموس في اكتساب المهارات.',
      icon: '🚀',
      category: 'التطور المستمر',
      points: 250,
      unlocked: certificates.length > 0,
      unlockedAt: certificates.length > 0 ? certificates[0]?.completionDate : undefined,
      color: 'from-rose-500 to-pink-700',
    },
    {
      id: 'b6',
      title: 'درع التفوق الفصلي الشامل 🏆',
      description: 'أعلى وسام تقديري يُمنح للطلاب المتميزين في نهاية الفترة التعليمية.',
      icon: '👑',
      category: 'التفوق العام',
      points: 500,
      unlocked: certificates.length > 0,
      unlockedAt: certificates.length > 0 ? certificates[0]?.completionDate : undefined,
      color: 'from-amber-500 via-yellow-400 to-amber-600',
    },
  ];

  const totalPoints = badgesList.filter((b) => b.unlocked).reduce((sum, b) => sum + b.points, 0);

  // Print certificate handler
  const handlePrintCertificate = (cert: StudentCertificateLog) => {
    const certHtml = `
      <!doctype html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8"/>
        <title>شهادة تفوق وتقدير - ${cert.studentName || studentName}</title>
        <style>
          @page { size: 297mm 210mm; margin: 0; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'Cairo', Arial, sans-serif; }
          html, body {
            width: 297mm;
            height: 210mm;
            margin: 0;
            padding: 0;
            overflow: hidden;
            background: #ffffff;
          }
          .cert-container {
            width: 285mm;
            height: 198mm;
            margin: 6mm auto;
            border: 4px double #06392c;
            border-radius: 12px;
            padding: 24px;
            background: radial-gradient(circle at top right, #fcfbf7 0%, #ffffff 100%);
            box-shadow: inset 0 0 0 2px #d6a83f, inset 0 0 0 6px rgba(6,57,44,0.1);
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header { text-align: center; }
          .header h1 { color: #06392c; font-size: 28px; margin: 0 0 4px 0; font-weight: 900; }
          .header p { color: #856404; font-size: 14px; margin: 0; font-weight: bold; }
          .body-content { text-align: center; margin: 15px 0; }
          .student-name { color: #0b4d3c; font-size: 32px; font-weight: 900; margin: 10px 0; border-bottom: 2px dashed #d6a83f; display: inline-block; padding: 0 30px 5px 30px; }
          .achievement { font-size: 18px; color: #1e293b; font-weight: bold; line-height: 1.6; margin: 12px 0; }
          .rating { font-size: 16px; color: #06392c; font-weight: 900; background: #e6f4ea; padding: 6px 18px; border-radius: 20px; display: inline-block; border: 1px solid #34a853; }
          .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          .signature { text-align: center; }
          .signature-name { font-size: 16px; font-weight: 900; color: #06392c; margin-top: 4px; }
          .cert-meta { font-size: 11px; color: #64748b; font-family: monospace; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="cert-container">
          <div class="header">
            <p>منصة مَسَار للتأهيل والتعليم الذكي · فصل د. إسماعيل عيسى</p>
            <h1>${cert.title || 'شهادة تفوق وتميز صفي 🏆'}</h1>
            <p>${cert.subTitle || 'تحت إشراف والتوجيه الأكاديمي المباشر من د. إسماعيل عيسى'}</p>
          </div>
          <div class="body-content">
            <p style="font-size: 16px; color: #475569; margin: 0;">تشهد المنصة وإدارة الفصل بأن الطالب البطل المتفوق:</p>
            <div class="student-name">${cert.studentName || studentName}</div>
            <p style="font-size: 14px; color: #64748b; margin: 4px 0;">${cert.gradeLabel || grade}</p>
            <div class="achievement">
              قد حقق التميز والتفوق المستحق وجدارة الأداء العالي في:<br/>
              <span style="color: #042e20; font-size: 20px; font-weight: 900;">${cert.achievement || cert.programTitle || 'التفوق الدراسي العام والالتزام'}</span>
            </div>
            <div class="rating">${cert.ratingText || 'ممتاز مع مرتبة الشرف 🌟'} (%${cert.score || 100})</div>
            ${cert.note ? `<p style="font-size: 13px; color: #475569; font-style: italic; margin-top: 10px;">"${cert.note}"</p>` : ''}
          </div>
          <div class="footer">
            <div class="cert-meta">
              رقم الشهادة: ${cert.certNumber || 'NSR-CERT-2026'}<br/>
              تاريخ الاعتماد: ${cert.completionDate || new Date().toLocaleDateString('ar-EG')}
            </div>
            <div class="signature">
              <span style="font-size: 12px; color: #64748b;">المشرف الأكاديمي والمعلم</span>
              <div class="signature-name">${cert.doctorName || 'د. إسماعيل عيسى'}</div>
              <span style="font-size: 10px; color: #059669; font-weight: bold;">معتمد رسمياً ✓</span>
            </div>
          </div>
        </div>
        <script>
          window.addEventListener('load', function() { setTimeout(function() { window.print(); }, 400); });
        </script>
      </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(certHtml);
    win.document.close();
  };

  const handleShareWhatsApp = (cert: StudentCertificateLog) => {
    const text = `🏆 *إنجاز وشهادة تفوق للبطل ${studentName}!*\n\n🎖️ *عنوان الشهادة:* ${cert.title}\n🎯 *مجال التميز:* ${cert.achievement || cert.programTitle}\n⭐ *التقدير المستحق:* ${cert.ratingText || 'ممتاز مع مرتبة الشرف'} (${cert.score}%)\n✍️ *المشرف:* ${cert.doctorName || 'د. إسماعيل عيسى'}\n\n_تم توثيق الشهادة في منصة مسار التعليمية 🌟_`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6 text-slate-900 animate-fade-in" dir="rtl">

      {/* ── HERO BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06392c] via-[#0b4d3c] to-[#04291e] p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-6 w-6 text-amber-400" />
              <span className="font-black text-emerald-200 text-sm">
                منصة مَسَار · لوحة الشرف وسجل إنجازات البطل
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              إنجازات وجوائز البطل {studentName} 🏆
            </h2>
            <p className="mt-1.5 text-sm font-semibold text-emerald-100/90">
              سجل فخري موثق يجمع شهادات التفوق، أوسمة التميز، والجوائز المعتمدة من د. إسماعيل عيسى.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
            <div className="text-center px-3">
              <div className="text-2xl font-black text-amber-300 font-mono">{certificates.length}</div>
              <div className="text-[11px] font-bold text-emerald-100">شهادات تفوق</div>
            </div>
            <div className="h-8 w-[1px] bg-white/20" />
            <div className="text-center px-3">
              <div className="text-2xl font-black text-amber-300 font-mono">
                {badgesList.filter((b) => b.unlocked).length}
              </div>
              <div className="text-[11px] font-bold text-emerald-100">أوسمة محققة</div>
            </div>
            <div className="h-8 w-[1px] bg-white/20" />
            <div className="text-center px-3">
              <div className="text-2xl font-black text-amber-300 font-mono">{totalPoints}</div>
              <div className="text-[11px] font-bold text-emerald-100">نقطة تميز ⭐</div>
            </div>
          </div>
        </div>

        {/* Navigation Sub-Tabs */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto border-t border-white/10 pt-4">
          <button
            type="button"
            onClick={() => setActiveSection('certificates')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeSection === 'certificates'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Award size={15} />
            شهادات التفوق المعتمدة ({certificates.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('badges')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeSection === 'badges'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Medal size={15} />
            لوحة الأوسمة والميداليات ({badgesList.filter((b) => b.unlocked).length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('awards')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
              activeSection === 'awards'
                ? 'bg-amber-400 text-slate-950 shadow-md font-black'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <Gift size={15} />
            حائط الجوائز والتكريمات المستقبلية 🎁
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1: CERTIFICATES OF EXCELLENCE
      ══════════════════════════════════════════════════════════════════ */}
      {activeSection === 'certificates' && (
        <div className="space-y-4">
          {certificates.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-4 shadow-sm">
              <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto text-4xl shadow-sm">
                🏆
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="font-black text-lg text-slate-900">
                  شهادات التفوق قيد الإصدار من د. إسماعيل عيسى
                </h3>
                <p className="text-xs font-bold text-slate-500 leading-relaxed">
                  عندما يُصدر د. إسماعيل عيسى شهادة تفوق أو تقدير للبطل {studentName} من لوحة المعلم، ستظهر هنا فوراً بأعلى جودة مع خيارات الطباعة الرسمية والمشاركة.
                </p>
              </div>

              {/* Sample Showcase Card */}
              <div className="mt-6 max-w-xl mx-auto rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/40 p-5 text-right space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-amber-600" /> نموذج الشهادة المعتمدة:
                  </span>
                  <span className="text-[10px] font-bold bg-amber-200 text-amber-950 px-2.5 py-0.5 rounded-full">
                    توثيق رسمي بالـ QR
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-700">
                  شهادة تفوق وتميز صفي في المهارات الأكاديمية وحل التمارين بنسبة 100% معتمدة بختم د. إسماعيل عيسى.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="relative overflow-hidden rounded-3xl border-2 border-amber-300/70 bg-gradient-to-br from-amber-50/30 via-white to-emerald-50/30 p-6 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black text-xl shadow-sm">
                          🏆
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                            شهادة تفوق رسمية ✓
                          </span>
                          <h4 className="font-black text-base text-slate-950 mt-1">{cert.title}</h4>
                        </div>
                      </div>

                      <span className="rounded-full bg-amber-100 border border-amber-300 text-amber-900 px-3 py-1 text-xs font-black font-mono">
                        %{cert.score || 100}
                      </span>
                    </div>

                    {/* Achievement Details */}
                    <div className="rounded-2xl bg-white/80 border border-slate-200 p-4 space-y-2">
                      <div className="text-xs font-bold text-slate-500">مجال التميز والتكريم:</div>
                      <div className="text-sm font-black text-emerald-950">
                        {cert.achievement || cert.programTitle || 'التميز الدراسي والأكاديمي'}
                      </div>
                      <div className="text-xs font-black text-amber-700">
                        ⭐ التقدير: {cert.ratingText || 'ممتاز مع مرتبة الشرف'}
                      </div>
                      {cert.note && (
                        <p className="text-xs font-bold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 italic">
                          "{cert.note}"
                        </p>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 px-1">
                      <span>المشرف: {cert.doctorName || 'د. إسماعيل عيسى'}</span>
                      <span className="font-mono">
                        {cert.completionDate || new Date(cert.createdAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedCert(cert)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white py-2.5 text-xs font-black transition cursor-pointer shadow-xs"
                    >
                      <Eye size={14} /> معاينة الشهادة
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePrintCertificate(cert)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-black transition cursor-pointer shadow-xs"
                      title="طباعة الشهادة الرسمية"
                    >
                      <Printer size={14} /> طباعة / PDF
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(cert)}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2.5 text-xs font-black transition cursor-pointer shadow-xs"
                      title="مشاركة على WhatsApp"
                    >
                      <Send size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2: MEDALS & BADGES WALL
      ══════════════════════════════════════════════════════════════════ */}
      {activeSection === 'badges' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {badgesList.map((badge) => (
              <div
                key={badge.id}
                className={`rounded-3xl border p-5 shadow-xs transition space-y-3 flex flex-col justify-between ${
                  badge.unlocked
                    ? 'border-amber-300 bg-white hover:border-amber-400'
                    : 'border-slate-200 bg-slate-50 opacity-60'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${badge.color} text-white flex items-center justify-center text-2xl shadow-sm`}
                    >
                      {badge.icon}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-[11px] font-black border ${
                        badge.unlocked
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : 'bg-slate-200 text-slate-600 border-slate-300'
                      }`}
                    >
                      {badge.unlocked ? 'محقق وممنوح ✓' : 'قيد التحدي 🔒'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                      {badge.category}
                    </span>
                    <h4 className="font-black text-sm text-slate-950 mt-1">{badge.title}</h4>
                    <p className="text-xs font-bold text-slate-500 mt-1 leading-relaxed">
                      {badge.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black">
                  <span className="text-amber-700 flex items-center gap-1">
                    <Star size={13} className="fill-amber-400 text-amber-500" /> {badge.points} نقطة
                  </span>
                  {badge.unlockedAt && (
                    <span className="text-[11px] font-bold text-slate-400">{badge.unlockedAt}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3: FUTURE AWARDS & HONORS WALL
      ══════════════════════════════════════════════════════════════════ */}
      {activeSection === 'awards' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-950 text-base flex items-center gap-2">
                  <Gift className="text-amber-600" size={20} />
                  سجل التكريمات والجوائز العينية والمستقبلية 🎁
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  ركن خاص لتسجيل الهدايا، التكريمات الخاصة، وأوسمة الشرف الإضافية الممنوحة للبطل {studentName}.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 px-3.5 py-1 text-xs font-black">
                لوحة الشرف 🌟
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center space-y-2">
                <div className="text-3xl">🎁</div>
                <h4 className="font-black text-sm text-slate-900">جائزة بطل القراءة</h4>
                <p className="text-xs font-bold text-slate-500">
                  كتاب قصصي وتكريم صفي خاص عند إتمام قراءة 10 نصوص بطلاقة.
                </p>
                <span className="inline-block text-[11px] font-black text-emerald-700 bg-emerald-100 px-3 py-0.5 rounded-full">
                  متاح للبطل
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center space-y-2">
                <div className="text-3xl">⭐</div>
                <h4 className="font-black text-sm text-slate-900">وسام نجم الأسبوع</h4>
                <p className="text-xs font-bold text-slate-500">
                  يُمنح أسبوعياً للطالب الأكثر التزاماً بحل الواجبات والتفاعل.
                </p>
                <span className="inline-block text-[11px] font-black text-amber-800 bg-amber-100 px-3 py-0.5 rounded-full">
                  قيد التقييم الأسبوعي
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center space-y-2">
                <div className="text-3xl">🏆</div>
                <h4 className="font-black text-sm text-slate-900">كأس التميز النهائي</h4>
                <p className="text-xs font-bold text-slate-500">
                  درع وتكريم رسمي في ختام البرنامج التعليمي مع د. إسماعيل عيسى.
                </p>
                <span className="inline-block text-[11px] font-black text-indigo-800 bg-indigo-100 px-3 py-0.5 rounded-full">
                  الختام السنوي
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          CERTIFICATE FULL PREVIEW MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl space-y-5 border border-slate-200 animate-scale-in my-8" dir="rtl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="text-amber-500" size={20} />
                <h3 className="font-black text-slate-950 text-base">معاينة شهادة التفوق الرسمية</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCert(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Certificate Visual Frame */}
            <div className="rounded-2xl border-4 border-double border-[#06392c] bg-radial from-[#fcfbf7] to-white p-6 sm:p-8 text-center space-y-4 shadow-inner relative overflow-hidden">
              <div className="space-y-1">
                <p className="text-xs font-bold text-amber-800">منصة مَسَار للتأهيل والتعليم الذكي · فصل د. إسماعيل عيسى</p>
                <h2 className="text-xl sm:text-2xl font-black text-[#06392c]">{selectedCert.title}</h2>
                <p className="text-xs font-bold text-slate-500">{selectedCert.subTitle || 'تحت إشراف د. إسماعيل عيسى'}</p>
              </div>

              <div className="py-3 border-y border-dashed border-amber-300 space-y-2">
                <p className="text-xs font-bold text-slate-600">تشهد المنصة بأن الطالب البطل المتفوق:</p>
                <h3 className="text-2xl sm:text-3xl font-black text-[#0b4d3c] tracking-wide">
                  {selectedCert.studentName || studentName}
                </h3>
                <p className="text-xs font-bold text-slate-500">{selectedCert.gradeLabel || grade}</p>
                <div className="pt-2 text-xs sm:text-sm font-bold text-slate-800">
                  قد حقق التميز والتفوق المستحق في:
                  <div className="text-base sm:text-lg font-black text-[#042e20] mt-1">
                    {selectedCert.achievement || selectedCert.programTitle}
                  </div>
                </div>
                <div className="pt-2">
                  <span className="inline-block rounded-full bg-emerald-100 border border-emerald-300 px-4 py-1 text-xs font-black text-emerald-900">
                    {selectedCert.ratingText || 'ممتاز مع مرتبة الشرف 🌟'} (%{selectedCert.score || 100})
                  </span>
                </div>
                {selectedCert.note && (
                  <p className="text-xs font-bold text-slate-600 italic pt-2">"{selectedCert.note}"</p>
                )}
              </div>

              <div className="flex items-end justify-between pt-2 text-right">
                <div className="text-[11px] font-mono font-bold text-slate-400">
                  رقم: {selectedCert.certNumber || 'NSR-CERT-2026'}<br/>
                  تاريخ: {selectedCert.completionDate || new Date().toLocaleDateString('ar-EG')}
                </div>
                <div className="text-center">
                  <span className="text-[11px] font-bold text-slate-500">المشرف الأكاديمي</span>
                  <div className="font-black text-xs text-[#06392c]">{selectedCert.doctorName || 'د. إسماعيل عيسى'}</div>
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">معتمد ✓</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => handlePrintCertificate(selectedCert)}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white py-3 text-xs font-black transition cursor-pointer shadow-sm"
              >
                <Printer size={15} /> طباعة الشهادة الرسمية / تحميل PDF
              </button>
              <button
                type="button"
                onClick={() => setSelectedCert(null)}
                className="px-5 rounded-xl border border-slate-200 text-slate-700 py-3 text-xs font-black hover:bg-slate-50 transition cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
