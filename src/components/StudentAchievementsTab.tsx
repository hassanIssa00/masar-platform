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
import { getStudentCertificateLogs, getStudentBadges, type StudentCertificateLog, type StudentBadgeRecord } from '@/lib/classDb';
import { readCloudCache } from '@/lib/firestoreSync';
import BrandMark from './BrandMark';
import { OfficialMasarCertificateDesign, type CertData } from './ExcellenceCertificateTab';

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

  // Real Medals & Badges — only show badges actually awarded by Dr. Ismail
  const [badges, setBadges] = useState<StudentBadgeRecord[]>([]);

  useEffect(() => {
    const fromDb = getStudentBadges(studentId);
    // Also check cloud cache
    const allBadges = readCloudCache<StudentBadgeRecord>('masar_student_badges_v1');
    const matched = allBadges.filter(
      (b) => b.studentId === studentId ||
      (b.studentName && studentName && b.studentName.trim().toLowerCase() === studentName.trim().toLowerCase()),
    );
    const merged = [...fromDb];
    matched.forEach((b) => {
      if (!merged.find((x) => x.id === b.id)) {
        merged.push(b);
      }
    });
    setBadges(merged);
  }, [studentId, studentName]);

  const totalPoints = badges.reduce((sum, b) => sum + b.points, 0);

  const toCertData = (cert: StudentCertificateLog): CertData => ({
    certTitle: cert.title || 'شهادة تفوق وتميز صفي 🏆',
    subTitle: cert.subTitle || 'تشهد منصة مَسَار للتأهيل والتعليم الذكي وتحت إشراف',
    doctorName: cert.doctorName || 'د. إسماعيل عيسى',
    doctorTitle: cert.doctorTitle || 'التأهيل والتعليم الحديث',
    studentPrefix: cert.studentPrefix || 'بأن الطالب المتفوق',
    studentName: cert.studentName || studentName,
    gradeLabel: cert.gradeLabel || grade,
    achievementIntro: cert.achievementIntro || 'قد حقق التميز والتفوق المستحق وجدارة الأداء العالي في:',
    achievement: cert.achievement || cert.programTitle || 'التقدم الملحوظ في مهارات التعلم الحديث',
    score: cert.score || 100,
    ratingText: cert.ratingText || 'ممتاز مع مرتبة الشرف 🌟',
    date: cert.completionDate || (cert.createdAt ? new Date(cert.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('ar-EG')),
    note: cert.note || 'طالب متميز ومتفوق أظهر التزاماً استثنائياً ومهارات عالية.',
    certNumber: cert.certNumber || 'NSR-CERT-2026',
  });

  // Print certificate handler with official Masar design
  const handlePrintCertificate = (cert: StudentCertificateLog) => {
    let certElement = document.getElementById(`official-cert-${cert.id}`);
    if (!certElement) {
      certElement = printFrameRef.current?.querySelector('#printable-certificate') ||
                    document.querySelector('#printable-certificate') ||
                    document.querySelector('#certificate-preview-only');
    }
    const certificate = certElement?.outerHTML;
    if (!certificate) return;

    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((node) => node.outerHTML)
      .join('\n');
    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(`<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8"/>
  <title>شهادة تفوق وتقدير - ${cert.studentName || studentName}</title>
  ${styles}
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
    #printable-certificate, [id^="official-cert-"], #certificate-preview-only {
      width: 285mm !important;
      height: 198mm !important;
      min-height: 0 !important;
      margin: 6mm auto !important;
      border: 1.2mm double #06392c !important;
      border-radius: 3.5mm !important;
      box-shadow:
        inset 0 0 0 0.45mm #d6a83f,
        inset 0 0 0 1.25mm rgba(6, 57, 44, 0.16) !important;
      overflow: hidden !important;
    }
  </style>
</head>
<body>
  ${certificate}
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 400);
    });
  </script>
</body>
</html>`);
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
                {badges.length}
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
            لوحة الأوسمة والميداليات ({badges.length})
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
            <div className="space-y-8">
              {certificates.map((cert) => {
                const certData = toCertData(cert);
                const verifyUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://masarplatform.org'}/verify/${certData.certNumber}?name=${encodeURIComponent(certData.studentName)}&prog=${encodeURIComponent(certData.achievement)}&score=${certData.score}&date=${encodeURIComponent(certData.date)}`;

                return (
                  <div
                    key={cert.id}
                    className="rounded-3xl border-2 border-emerald-800/50 bg-gradient-to-br from-[#06392c] via-[#094838] to-[#04281e] p-4 sm:p-6 shadow-2xl text-white space-y-4"
                  >
                    {/* Top Bar with Badge, Title, and Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-emerald-700/50 pb-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-2xl shadow-md shrink-0">
                          🏆
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs bg-emerald-500/30 text-emerald-200 font-black px-2.5 py-0.5 rounded-lg border border-emerald-400/30">
                              وثيقة تفوق رسمية معتمدة ✓
                            </span>
                            <span className="text-xs text-amber-300 font-mono font-black">
                              {certData.certNumber}
                            </span>
                          </div>
                          <h3 className="font-black text-base sm:text-lg text-white mt-1">
                            {certData.certTitle} — للبطل {certData.studentName}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mr-auto sm:mr-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handlePrintCertificate(cert)}
                          className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2.5 text-xs font-black transition cursor-pointer shadow-lg active:scale-95"
                          title="طباعة الشهادة الرسمية أو حفظها بصيغة PDF"
                        >
                          <Printer size={15} />
                          <span>طباعة / تحميل PDF 🖨️</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleShareWhatsApp(cert)}
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2.5 text-xs font-black transition cursor-pointer shadow-md active:scale-95"
                          title="مشاركة الشهادة عبر واتساب"
                        >
                          <Send size={14} />
                          <span>واتساب</span>
                        </button>

                        <a
                          href={verifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white px-3.5 py-2.5 text-xs font-black transition border border-white/15 cursor-pointer shadow-xs"
                          title="التحقق الرقمي ومسح الـ QR"
                        >
                          <ShieldCheck size={14} />
                          <span className="hidden md:inline">التحقق بالـ QR</span>
                        </a>
                      </div>
                    </div>

                    {/* ── THE OFFICIAL MASAR CERTIFICATE DISPLAY ── */}
                    <div className="overflow-x-auto rounded-2xl bg-slate-900/70 p-2 sm:p-4 border border-emerald-700/40 flex justify-center shadow-inner">
                      <div className="w-full max-w-4xl min-w-[680px]">
                        <OfficialMasarCertificateDesign
                          form={certData}
                          isPrintTarget={false}
                          customId={`official-cert-${cert.id}`}
                        />
                      </div>
                    </div>

                    {/* Bottom Verification & Metadata Line */}
                    <div className="flex items-center justify-between text-xs text-emerald-200/90 px-2 pt-1 flex-wrap gap-2 border-t border-emerald-800/40">
                      <span>
                        ✍️ اعتماد وتوثيق: <strong className="text-white">{certData.doctorName}</strong> ({certData.doctorTitle})
                      </span>
                      <span>
                        📅 تاريخ الإصدار: <strong className="text-amber-300">{certData.date}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2: MEDALS & BADGES WALL
      ══════════════════════════════════════════════════════════════════ */}
      {activeSection === 'badges' && (
        <div className="space-y-4">
          {badges.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center space-y-4 shadow-sm">
              <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto text-4xl shadow-sm">
                🏅
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="font-black text-lg text-slate-900">
                  لم يتم منح أي وسام بعد
                </h3>
                <p className="text-xs font-bold text-slate-500 leading-relaxed">
                  عندما يمنح د. إسماعيل عيسى {studentName} وساماً أو ميدالية، ستظهر هنا فوراً.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  className="rounded-3xl border border-amber-300 bg-white hover:border-amber-400 p-5 shadow-xs transition space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${badge.color} text-white flex items-center justify-center text-2xl shadow-sm`}
                      >
                        {badge.icon}
                      </div>
                      <span className="px-3 py-1 rounded-full text-[11px] font-black border bg-emerald-100 text-emerald-900 border-emerald-300">
                        محقق وممنوح ✓
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
                      {badge.note && (
                        <p className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-2 mt-2 italic">
                          &quot;{badge.note}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black">
                    <span className="text-amber-700 flex items-center gap-1">
                      <Star size={13} className="fill-amber-400 text-amber-500" /> {badge.points} نقطة
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">
                      {new Date(badge.awardedAt).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* ══════════════════════════════════════════════════════════════════
          CERTIFICATE FULL PREVIEW MODAL (OFFICIAL MASAR DESIGN)
      ══════════════════════════════════════════════════════════════════ */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-3xl bg-slate-950 p-5 sm:p-7 shadow-2xl space-y-4 border border-emerald-900/50 animate-scale-in my-6" dir="rtl">
            <div className="flex items-center justify-between border-b border-emerald-900/50 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="text-amber-400" size={20} />
                <h3 className="font-black text-white text-base">معاينة شهادة التفوق الرسمية المعتمدة 🏆</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCert(null)}
                className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Official Certificate Visual Canvas */}
            <div ref={printFrameRef} className="overflow-x-auto py-2 flex justify-center">
              <div className="w-full max-w-3xl">
                <OfficialMasarCertificateDesign form={toCertData(selectedCert)} isPrintTarget={true} />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => handlePrintCertificate(selectedCert)}
                className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 py-3.5 text-xs font-black transition cursor-pointer shadow-lg active:scale-95"
              >
                <Printer size={16} /> طباعة الشهادة الرسمية / تحميل PDF 🖨️
              </button>
              <button
                type="button"
                onClick={() => setSelectedCert(null)}
                className="px-6 rounded-2xl border border-slate-700 text-slate-300 py-3.5 text-xs font-black hover:bg-white/10 transition cursor-pointer"
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
