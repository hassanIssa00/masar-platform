'use client';

import React from 'react';
import type { ReportRecord, StudentRecord } from '@/lib/localDb';

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

export default function ReportPrintDocument({
  report,
  student,
}: {
  report: ReportRecord;
  student?: StudentRecord | null;
}) {
  const hijriDate = getTodayHijri();
  const fileNumber = `MASAR-${(report.id || '').slice(-6).toUpperCase() || 'REPORT'}`;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://masarplatform.org';

  const reportScore = typeof report.score === 'number' ? report.score : 0;
  const domainsList = Array.isArray(report.domains) ? report.domains : [];
  const recommendationsList = Array.isArray(report.recommendations) ? report.recommendations : [];
  const answersList = Array.isArray(report.answers) ? report.answers : [];

  const homeRecommendations = recommendationsList.slice(0, 3);
  const schoolRecommendations =
    recommendationsList.slice(3, 6).length > 0
      ? recommendationsList.slice(3, 6)
      : recommendationsList.slice(0, 3);

  const getScoreBadge = (score: number) => {
    if (score >= 85) return { text: 'درجة ممتاز (أداء متقدم)', color: '#047857', bg: '#ecfdf5' };
    if (score >= 70) return { text: 'درجة جيد جداً (احتياج خفيف)', color: '#1d4ed8', bg: '#eff6ff' };
    if (score >= 50) return { text: 'درجة متوسط (احتياج دعم)', color: '#b45309', bg: '#fffbeb' };
    return { text: 'درجة ملحوظة (تدخل مكثف)', color: '#b91c1c', bg: '#fef2f2' };
  };

  const badgeInfo = getScoreBadge(reportScore);

  return (
    <div className="report-print-container" dir="rtl">
      {/* ═════════════════════════════════════════════════════════════
          PAGE 1: COVER & OFFICIAL STUDENT IDENTITY
      ═════════════════════════════════════════════════════════════ */}
      <section className="print-page page-1">
        {/* Top Header Bar */}
        <header className="page-header">
          <div className="brand flex-items">
            <span className="brand-logo">مَسَار</span>
            <span className="brand-sub">منصة التأهيل الذكي والتعليم التفاعلي</span>
          </div>
          <div className="doc-meta">
            <span className="doc-type">تقرير تشخيص وتقييم إكلينيكي رسمياً</span>
            <span className="doc-serial">{fileNumber}</span>
          </div>
        </header>

        {/* Page Content Body */}
        <div className="page-body">
          {/* Main Document Title Box */}
          <div className="title-banner">
            <h1 className="main-title">تقرير التقييم الشامل وخطة التأهيل الفردية</h1>
            <p className="subtitle">صادر من قسم التربية الخاصة والتأهيل النمائي بمدرسة الإخلاص بجدة</p>
          </div>

          {/* Student & Report Metadata Grid */}
          <div className="info-grid">
            <div className="info-box">
              <span className="info-label">اسم الطالب الرباعي:</span>
              <span className="info-val font-black">{report.studentName || student?.fullName || '—'}</span>
            </div>
            <div className="info-box">
              <span className="info-label">الصف / المرحلة الدراسية:</span>
              <span className="info-val">{report.grade || student?.grade || 'الأول الابتدائي'}</span>
            </div>
            <div className="info-box">
              <span className="info-label">رقم الملف / الهوية:</span>
              <span className="info-val font-mono">{student?.nationalId || fileNumber}</span>
            </div>
            <div className="info-box">
              <span className="info-label">تاريخ التقييم والإصدار:</span>
              <span className="info-val">{report.date || hijriDate}</span>
            </div>
            <div className="info-box">
              <span className="info-label">ولي الأمر المسجل:</span>
              <span className="info-val">{student?.parentName || 'مسجل بالنظام'}</span>
            </div>
            <div className="info-box">
              <span className="info-label">الاستشاري المشرف:</span>
              <span className="info-val font-black text-emerald-900">د. إسماعيل عيسى</span>
            </div>
          </div>

          {/* Executive Score Card */}
          <div className="score-summary-card" style={{ backgroundColor: badgeInfo.bg, borderColor: badgeInfo.color }}>
            <div className="score-header">
              <span className="score-title">النتيجة الإجمالية ومستوى الأداء</span>
              <span className="score-badge" style={{ color: badgeInfo.color, borderColor: badgeInfo.color }}>
                {badgeInfo.text}
              </span>
            </div>
            <div className="score-main">
              <div className="big-number" style={{ color: badgeInfo.color }}>{reportScore}%</div>
              <div className="score-desc">
                {report.summary ||
                  'تم إعداد هذا التقرير بناءً على التقييم المباشر للقدرات النمائية والأكاديمية، بهدف تحديد جوانب القوة والاحتياجات الأساسية لبناء خطة التدخل العلاجي المناسبة.'}
              </div>
            </div>
          </div>

          {/* Summary Clinical Decision */}
          <div className="clinical-decision-box">
            <h3 className="section-title-sm">القرار الإكلينيكي والتأهيلي المعتمد:</h3>
            <p className="decision-text">
              بناءً على نتائج الملاحظة المباشرة وتحليل المهارات، يوصى ببدء تطبيق <strong>{report.program || 'برنامج التأهيل الشامل وصعوبات التعلم'}</strong> بمعدل جلسات منتظمة مع متابعة المؤشرات شهرياً.
            </p>
          </div>
        </div>

        {/* Footer Bar */}
        <footer className="page-footer">
          <span>منصة مَسَار للتأهيل والتعليم الذكي · جميع الحقوق محفوظة</span>
          <span className="page-num">صفحة 1 من 4</span>
        </footer>
      </section>

      {/* ═════════════════════════════════════════════════════════════
          PAGE 2: DOMAINS, IEP GOALS & ABC BEHAVIORAL ANALYSIS
      ═════════════════════════════════════════════════════════════ */}
      <section className="print-page page-2">
        <header className="page-header">
          <div className="brand flex-items">
            <span className="brand-logo">مَسَار</span>
            <span className="brand-sub">تقرير التقييم الشامل</span>
          </div>
          <div className="doc-meta">
            <span className="doc-serial">{fileNumber}</span>
          </div>
        </header>

        <div className="page-body">
          {/* Section 1: Domains Breakdown */}
          <div className="section-block">
            <h2 className="section-heading">1. تحليل المجالات النمائية والأكاديمية</h2>
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>المجال التقييمي</th>
                  <th style={{ width: '20%', textAlign: 'center' }}>درجة الإتقان</th>
                  <th style={{ width: '50%' }}>ملاحظات وتقييم الأداء</th>
                </tr>
              </thead>
              <tbody>
                {domainsList.length > 0 ? (
                  domainsList.map((d, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                      <td className="font-black">{d.name}</td>
                      <td className="text-center font-bold font-mono" style={{ color: d.score >= 70 ? '#047857' : '#b45309' }}>
                        {d.score}%
                      </td>
                      <td>{d.note || 'أداء يتماشى مع خطة التأهيل الحالية'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="text-center text-slate-400">تم تقييم المجالات العامة بنجاح</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section 2: IEP Goals */}
          <div className="section-block mt-4">
            <h2 className="section-heading">2. أهداف خطة التربية الفردية التفصيلية (IEP)</h2>
            <table className="doc-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>المجال المستهدف</th>
                  <th style={{ width: '45%' }}>الهدف التعليمي / السلوكي</th>
                  <th style={{ width: '30%' }}>معيار الإتقان والموعد</th>
                </tr>
              </thead>
              <tbody>
                {(domainsList.slice(0, 4)).map((domain, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'row-even' : 'row-odd'}>
                    <td className="font-black text-purple-900">{domain.name}</td>
                    <td>تحسين المهارات التأسيسية وتطبيق الاستراتيجيات الموصى بها دقة 80%</td>
                    <td className="font-mono text-xs">دقة 80% · خلال 30 يوماً</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 3: ABC Behavioral Analysis */}
          <div className="section-block mt-4">
            <h2 className="section-heading">3. تحليل النمط السلوكي (ABC Analysis)</h2>
            <table className="doc-table amber-table">
              <thead>
                <tr>
                  <th>السوابق (Antecedent)</th>
                  <th>السلوك (Behavior)</th>
                  <th>العواقب والتدخل (Consequence)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>سؤال صعب أو انتقال مفاجئ داخل الجلسة</td>
                  <td>تردد أو بطء في الاستجابة</td>
                  <td>تقديم نموذج بصري وتقليل الاختيارات المتاحة</td>
                </tr>
                <tr>
                  <td>مهمة قراءة أو حساب ممتدة</td>
                  <td>تشتت انتباه مؤقت</td>
                  <td>إعطاء استراحة قصيرة 60 ثانية مع تعزيز إيجابي</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <footer className="page-footer">
          <span>منصة مَسَار للتأهيل والتعليم الذكي · جميع الحقوق محفوظة</span>
          <span className="page-num">صفحة 2 من 4</span>
        </footer>
      </section>

      {/* ═════════════════════════════════════════════════════════════
          PAGE 3: HOME & SCHOOL RECOMMENDATIONS
      ═════════════════════════════════════════════════════════════ */}
      <section className="print-page page-3">
        <header className="page-header">
          <div className="brand flex-items">
            <span className="brand-logo">مَسَار</span>
            <span className="brand-sub">التوصيات والتوجيهات الإكلينيكية</span>
          </div>
          <div className="doc-meta">
            <span className="doc-serial">{fileNumber}</span>
          </div>
        </header>

        <div className="page-body">
          <h2 className="section-heading">4. توجيهات وتوصيات بيئة المنزل والمدرسة</h2>

          <div className="recs-dual-grid">
            {/* Home Recommendations */}
            <div className="rec-card home-card">
              <h3 className="rec-card-title">🏡 توصيات البيئة المنزلية والأسرة</h3>
              <ul className="rec-list">
                {homeRecommendations.map((rec, i) => (
                  <li key={i}>
                    <span className="rec-check">✓</span>
                    <span className="rec-text">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* School Recommendations */}
            <div className="rec-card school-card">
              <h3 className="rec-card-title">🏫 توصيات المدرسة والبيئة الصفية</h3>
              <ul className="rec-list">
                {schoolRecommendations.map((rec, i) => (
                  <li key={i}>
                    <span className="rec-check">✓</span>
                    <span className="rec-text">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Follow-up Protocol */}
          <div className="followup-box">
            <h3 className="section-title-sm">جدول وتاريخ المتابعة الإكلينيكية:</h3>
            <p className="decision-text">
              يُنصح بإجراء تقييم مرحلي بعد <strong>4 أسابيع</strong> من بدء الخطة التأهيلية لقياس نسبة النمو والتطور في المهارات المستهدفة وتعديل الأهداف عند الحاجة.
            </p>
          </div>
        </div>

        <footer className="page-footer">
          <span>منصة مَسَار للتأهيل والتعليم الذكي · جميع الحقوق محفوظة</span>
          <span className="page-num">صفحة 3 من 4</span>
        </footer>
      </section>

      {/* ═════════════════════════════════════════════════════════════
          PAGE 4: DETAILED ANSWERS & OFFICIAL SIGN-OFF / STAMP
      ═════════════════════════════════════════════════════════════ */}
      <section className="print-page page-4">
        <header className="page-header">
          <div className="brand flex-items">
            <span className="brand-logo">مَسَار</span>
            <span className="brand-sub">الإعتماد الرسمي والختم الإكلينيكي</span>
          </div>
          <div className="doc-meta">
            <span className="doc-serial">{fileNumber}</span>
          </div>
        </header>

        <div className="page-body flex-col justify-between" style={{ minHeight: 'calc(297mm - 40mm)' }}>
          <div>
            {/* Detailed Answers Section (Clean rows, not heavy cards) */}
            {answersList.length > 0 && (
              <div className="section-block">
                <h2 className="section-heading">5. سجل الإجابات التفصيلية المحفوظة للتقييم</h2>
                <div className="answers-table-container">
                  <table className="doc-table answers-table">
                    <thead>
                      <tr>
                        <th style={{ width: '8%' }}>#</th>
                        <th style={{ width: '52%' }}>السؤال المستهدف</th>
                        <th style={{ width: '40%' }}>استجابة الطالب المحفوظة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {answersList.slice(0, 10).map((ans, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                          <td className="font-bold font-mono text-center">{idx + 1}</td>
                          <td className="font-bold text-slate-800">{ans.question}</td>
                          <td className="font-black text-emerald-950">{ans.answer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Official Verification Statement */}
            <div className="verification-statement mt-4">
              <p className="statement-text">
                نشهد نحن إدارة منصة مَسَار للتأهيل والتعليم الذكي بمدرسة الإخلاص بجدة بأن كافة البيانات والمعلومات الواردة بهذا التقرير صحيحة ومستخرجة إلكترونياً وبإشراف استشاري التربية الخاصة، وهي معتمدة رسمياً وموثقة بالختم والتوقيع أدناه.
              </p>
            </div>
          </div>

          {/* Official Doctor Signature & Circular Stamp Block */}
          <div className="sign-stamp-wrapper">
            {/* Stamp Box */}
            <div className="stamp-container">
              <svg xmlns="http://www.w3.org/2000/svg" width="110" height="110" viewBox="0 0 160 160">
                <circle cx="80" cy="80" r="76" fill="none" stroke="#06392c" strokeWidth="2.5" />
                <circle cx="80" cy="80" r="68" fill="white" stroke="#06392c" strokeWidth="1.2" />
                <text x="80" y="34" textAnchor="middle" fontFamily="Cairo, Arial" fontSize="6.5" fontWeight="bold" fill="#06392c" direction="rtl">
                  الختم الرسمي المعتمد
                </text>
                <text x="80" y="49" textAnchor="middle" fontFamily="Cairo, Arial" fontSize="10.5" fontWeight="900" fill="#06392c" direction="rtl">
                  د. إسماعيل عيسى
                </text>
                <line x1="22" y1="60" x2="138" y2="60" stroke="#06392c" strokeWidth="0.8" />
                <defs>
                  <clipPath id="sig-clip-print">
                    <rect x="22" y="60" width="116" height="38" />
                  </clipPath>
                </defs>
                <image
                  href={`${origin}/dr-ismail-signature.png`}
                  x="22"
                  y="62"
                  width="116"
                  height="36"
                  preserveAspectRatio="xMidYMid meet"
                  clipPath="url(#sig-clip-print)"
                  style={{ mixBlendMode: 'multiply' }}
                />
                <line x1="22" y1="100" x2="138" y2="100" stroke="#06392c" strokeWidth="0.8" />
                <text x="80" y="113" textAnchor="middle" fontFamily="Cairo, Arial" fontSize="7.5" fontWeight="900" fill="#06392c">
                  {report.date || hijriDate}
                </text>
                <text x="80" y="125" textAnchor="middle" fontFamily="Cairo, Arial" fontSize="5" fontWeight="bold" fill="#06392c">
                  منصة مسار · التعليم العلاجي
                </text>
              </svg>
              <div className="stamp-label">الختم الرقمي المعتمد</div>
            </div>

            {/* Doctor Signature Block */}
            <div className="doctor-sig-box">
              <div className="doc-title-lbl">التوقيع والإعتماد الإكلينيكي ✍️</div>
              <div className="sig-image-holder">
                <img
                  src={`${origin}/dr-ismail-signature.png`}
                  alt="توقيع د. إسماعيل عيسى"
                  className="sig-img-print"
                />
              </div>
              <div className="sig-divider" />
              <div className="doc-name font-black">د. إسماعيل عيسى</div>
              <div className="doc-title">استشاري التربية الخاصة وتأهيل صعوبات التعلم</div>
              <div className="doc-date font-mono">{report.date || hijriDate}</div>
            </div>
          </div>
        </div>

        <footer className="page-footer">
          <span>منصة مَسَار للتأهيل والتعليم الذكي · جميع الحقوق محفوظة</span>
          <span className="page-num">صفحة 4 من 4</span>
        </footer>
      </section>

      {/* ═════════════════════════════════════════════════════════════
          PRINT STYLES ENGINE (A4 PAGE MODEL & PERFECT BORDERS)
      ═════════════════════════════════════════════════════════════ */}
      <style jsx global>{`
        @page {
          size: A4 portrait;
          margin: 0 !important;
        }

        @media print {
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 100% !important;
          }
          .no-print {
            display: none !important;
          }
        }

        .report-print-container {
          background: #e2e8f0;
          padding: 20px 0;
          direction: rtl;
          font-family: 'Cairo', sans-serif;
        }

        @media print {
          .report-print-container {
            background: transparent !important;
            padding: 0 !important;
          }
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

        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #06392c;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }

        .brand-logo {
          font-size: 18px;
          font-weight: 900;
          color: #06392c;
          margin-left: 8px;
        }

        .brand-sub {
          font-size: 9.5px;
          font-weight: 700;
          color: #475569;
        }

        .doc-type {
          font-size: 9.5px;
          font-weight: 800;
          color: #047857;
          display: block;
        }

        .doc-serial {
          font-size: 10px;
          font-weight: 900;
          font-family: monospace;
          color: #0f172a;
        }

        .page-body {
          flex: 1;
        }

        .title-banner {
          background: #f0fdf4;
          border: 1.5px solid #bbf7d0;
          border-radius: 12px;
          padding: 12px 16px;
          text-align: center;
          margin-bottom: 14px;
        }

        .main-title {
          font-size: 16px;
          font-weight: 900;
          color: #06392c;
          margin: 0;
        }

        .subtitle {
          font-size: 10px;
          font-weight: 700;
          color: #047857;
          margin-top: 2px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 14px;
        }

        .info-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 12px;
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
        }

        .info-label {
          color: #64748b;
          font-weight: 700;
        }

        .info-val {
          color: #0f172a;
        }

        .score-summary-card {
          border: 2px solid;
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 14px;
        }

        .score-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .score-title {
          font-size: 12px;
          font-weight: 900;
          color: #0f172a;
        }

        .score-badge {
          font-size: 10px;
          font-weight: 900;
          padding: 2px 10px;
          border-radius: 20px;
          border: 1px solid;
        }

        .score-main {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .big-number {
          font-size: 32px;
          font-weight: 900;
          font-family: monospace;
          line-height: 1;
        }

        .score-desc {
          font-size: 10.5px;
          font-weight: 700;
          color: #334155;
          line-height: 1.6;
        }

        .clinical-decision-box {
          background: #ffffff;
          border: 1.5px solid #06392c;
          border-radius: 10px;
          padding: 10px 14px;
        }

        .section-title-sm {
          font-size: 11px;
          font-weight: 900;
          color: #06392c;
          margin-bottom: 4px;
        }

        .decision-text {
          font-size: 10.5px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.6;
        }

        .section-heading {
          font-size: 12px;
          font-weight: 900;
          color: #06392c;
          border-right: 4px solid #d97706;
          padding-right: 8px;
          margin-bottom: 8px;
        }

        .doc-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }

        .doc-table th {
          background: #06392c;
          color: #ffffff;
          padding: 6px 10px;
          text-align: right;
          font-weight: 900;
        }

        .doc-table td {
          padding: 6px 10px;
          border-bottom: 1px solid #e2e8f0;
        }

        .row-even { background: #ffffff; }
        .row-odd { background: #f8fafc; }

        .recs-dual-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 14px;
        }

        .rec-card {
          border-radius: 10px;
          padding: 12px;
          border: 1px solid;
        }

        .home-card { background: #fffbeb; border-color: #fde68a; }
        .school-card { background: #eff6ff; border-color: #bfdbfe; }

        .rec-card-title {
          font-size: 11px;
          font-weight: 900;
          margin-bottom: 8px;
          color: #0f172a;
        }

        .rec-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .rec-list li {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          margin-bottom: 6px;
          font-size: 10px;
          font-weight: 700;
          color: #1e293b;
        }

        .rec-check {
          color: #d97706;
          font-weight: 900;
        }

        .followup-box {
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 10px;
          padding: 10px 14px;
        }

        .sign-stamp-wrapper {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          padding-top: 10px;
          border-top: 1.5px solid #e2e8f0;
          margin-top: auto;
        }

        .stamp-container {
          text-align: center;
          min-width: 130px;
        }

        .stamp-label {
          font-size: 9px;
          font-weight: 900;
          color: #06392c;
          margin-top: 2px;
        }

        .doctor-sig-box {
          border: 1.5px solid #06392c;
          background: #ffffff;
          border-radius: 12px;
          padding: 8px 16px;
          text-align: center;
          min-width: 190px;
        }

        .doc-title-lbl {
          font-size: 9px;
          font-weight: 900;
          color: #047857;
        }

        .sig-image-holder {
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #ffffff;
          margin: 2px 0;
        }

        .sig-img-print {
          height: 100%;
          width: auto;
          object-fit: contain;
          mix-blend-mode: multiply;
        }

        .sig-divider {
          border-bottom: 1.5px solid #06392c;
          margin: 4px 0;
        }

        .doc-name { font-size: 12px; color: #06392c; }
        .doc-title { font-size: 8px; color: #047857; }
        .doc-date { font-size: 9px; color: #64748b; }

        .verification-statement {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 12px;
        }

        .statement-text {
          font-size: 9.5px;
          color: #475569;
          font-weight: 700;
          line-height: 1.5;
        }

        .page-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-top: 1.5px solid #06392c;
          padding-top: 6px;
          margin-top: 8px;
          font-size: 8.5px;
          font-weight: 800;
          color: #64748b;
        }

        .page-num {
          font-family: monospace;
          color: #06392c;
        }
      `}</style>
    </div>
  );
}
