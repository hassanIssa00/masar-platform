"use client";
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

const MOCK_REPORTS = [
  {
    id: 'r001',
    studentName: 'عمر خالد',
    grade: 'الصف الثالث',
    program: 'القراءة والكتابة',
    programColor: '#1E6FBF',
    date: '2024-07-15',
    summary: 'يُعاني الطالب من صعوبات في التمييز بين الحروف المتشابهة وقراءة الكلمات المركّبة. مستوى القراءة دون المتوسط بنسبة 35%. يُوصى ببرنامج الوعي الصوتي متعدد الحواس.',
    status: 'completed',
    score: 65,
  },
  {
    id: 'r002',
    studentName: 'لينا محمد',
    grade: 'الصف الأول',
    program: 'طيف التوحد',
    programColor: '#3498DB',
    date: '2024-07-10',
    summary: 'تُظهر الطالبة تحسناً ملحوظاً في مهارات التواصل البصري. لا تزال تحتاج دعماً في المهارات الاجتماعية. يُوصى بالاستمرار في برنامج PECS مع إدراج جلسات Social Stories.',
    status: 'completed',
    score: 72,
  },
  {
    id: 'r003',
    studentName: 'ياسين علي',
    grade: 'الصف الرابع',
    program: 'التخاطب والنطق',
    programColor: '#9B59B6',
    date: '2024-07-08',
    summary: 'يُعاني الطالب من تأتأة عند بداية الجمل وصعوبة في نطق حرفي (ص) و(ض). يستجيب بشكل جيد لتمارين التنفس وإيقاع الكلام. يُوصى بجلستين أسبوعياً.',
    status: 'pending',
    score: 58,
  },
  {
    id: 'r004',
    studentName: 'سارة أحمد',
    grade: 'الصف الثاني',
    program: 'الرياضيات',
    programColor: '#F5A623',
    date: '2024-07-05',
    summary: 'تُواجه الطالبة صعوبة في إدراك مفهوم الأرقام وربطها بالكميات. أداء جيد في الأشكال الهندسية. يُوصى بالتعلم المحسوس باستخدام المواد الملموسة.',
    status: 'completed',
    score: 70,
  },
];

export default function ReportsPage() {
  const [filter, setFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState<typeof MOCK_REPORTS[0] | null>(null);

  const filtered = filter === 'all' ? MOCK_REPORTS : MOCK_REPORTS.filter(r => r.program.includes(filter));

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#2ECC71';
    if (score >= 50) return '#F5A623';
    return '#E74C3C';
  };

  if (selectedReport) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex flex-col">
        <Navbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
            <button onClick={() => setSelectedReport(null)}
              className="mb-6 text-[#1E6FBF] font-bold flex items-center gap-2 hover:underline">
              ← العودة إلى التقارير
            </button>

            {/* Print-Ready Report */}
            <div id="report-print" className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in">

              {/* Report Header */}
              <div className="bg-gradient-to-l from-[#1E6FBF] to-[#0A3D7A] p-8 text-white">
                <div className="flex justify-between items-start flex-wrap gap-4">
                  <div>
                    <h1 className="text-3xl font-black mb-1">تقرير تقييم شامل</h1>
                    <p className="text-white/70">منصة د. إسماعيل عيسى للتعليم وعلاج صعوبات التعلم</p>
                  </div>
                  <button onClick={() => window.print()}
                    className="bg-white/20 border border-white/40 text-white px-6 py-2 rounded-xl font-bold hover:bg-white/30 transition flex items-center gap-2">
                    🖨️ طباعة / PDF
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {/* Student Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'اسم الطالب', value: selectedReport.studentName },
                    { label: 'الصف الدراسي', value: selectedReport.grade },
                    { label: 'البرنامج', value: selectedReport.program },
                    { label: 'تاريخ التقرير', value: selectedReport.date },
                  ].map((item, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <p className="text-xs font-bold text-gray-400 mb-1">{item.label}</p>
                      <p className="font-bold text-gray-800">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Score */}
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 text-center">
                  <h2 className="text-lg font-bold text-gray-600 mb-4">الدرجة الكلية للتقييم</h2>
                  <div className="relative w-36 h-36 mx-auto mb-4">
                    <svg className="w-36 h-36 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke={getScoreColor(selectedReport.score)} strokeWidth="3"
                        strokeDasharray={`${selectedReport.score} 100`} strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-4xl font-black" style={{ color: getScoreColor(selectedReport.score) }}>
                        {selectedReport.score}%
                      </span>
                    </div>
                  </div>
                  <p className="font-bold text-gray-700">
                    {selectedReport.score >= 75 ? '✅ مستوى جيد' : selectedReport.score >= 50 ? '⚠️ يحتاج متابعة' : '🔴 يحتاج تدخلاً فورياً'}
                  </p>
                </div>

                {/* Summary */}
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">📝 ملخص التقييم</h2>
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                    <p className="text-gray-700 leading-relaxed">{selectedReport.summary}</p>
                  </div>
                </div>

                {/* Assessment Results Table */}
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">📊 نتائج التقييم التفصيلية</h2>
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-right">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="p-4 font-bold text-gray-600">المهارة</th>
                          <th className="p-4 font-bold text-gray-600">المستوى</th>
                          <th className="p-4 font-bold text-gray-600">الدرجة</th>
                          <th className="p-4 font-bold text-gray-600">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { skill: 'التعرف على الحروف', level: 'أساسي', score: 70, status: 'جيد' },
                          { skill: 'القراءة الجهرية', level: 'متوسط', score: 55, status: 'يحتاج متابعة' },
                          { skill: 'الفهم القرائي', level: 'متوسط', score: 60, status: 'يحتاج متابعة' },
                          { skill: 'الكتابة والإملاء', level: 'أساسي', score: 45, status: 'يحتاج تدخلاً' },
                        ].map((row, i) => (
                          <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition">
                            <td className="p-4 font-semibold text-gray-800">{row.skill}</td>
                            <td className="p-4 text-gray-500">{row.level}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${row.score}%`, backgroundColor: getScoreColor(row.score) }} />
                                </div>
                                <span className="font-bold text-sm" style={{ color: getScoreColor(row.score) }}>{row.score}%</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="px-3 py-1 rounded-full text-sm font-bold" style={{
                                backgroundColor: row.score >= 65 ? '#2ECC71' + '20' : row.score >= 50 ? '#F5A623' + '20' : '#E74C3C' + '20',
                                color: getScoreColor(row.score),
                              }}>{row.status}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recommendations */}
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">🎯 التوصيات والخطة العلاجية</h2>
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-6 space-y-3">
                    {[
                      'البدء ببرنامج الوعي الصوتي متعدد الحواس (VAKT) بواقع 3 جلسات أسبوعياً',
                      'استخدام البطاقات المصورة لتعزيز التعرف على الحروف المتشابهة',
                      'تخصيص 15 دقيقة يومياً للقراءة الجهرية بإشراف ولي الأمر',
                      'إعادة التقييم بعد 6 أسابيع لقياس التقدم',
                    ].map((rec, i) => (
                      <p key={i} className="flex items-start gap-3 text-gray-700">
                        <span className="w-6 h-6 bg-[#2ECC71] text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                        {rec}
                      </p>
                    ))}
                  </div>
                </div>

                {/* Specialist Signature */}
                <div className="border-t border-gray-100 pt-6 flex justify-between items-end">
                  <div>
                    <p className="text-sm text-gray-400">التقرير معتمد من قِبل</p>
                    <p className="font-bold text-gray-800 mt-1">د. إسماعيل عيسى</p>
                    <p className="text-sm text-gray-500">أخصائي صعوبات التعلم والتخاطب</p>
                  </div>
                  <div className="text-[#1E6FBF] font-black text-xl">منصة د. إسماعيل عيسى ✦</div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-10 overflow-y-auto animate-fade-in">

          {/* Header */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8 flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3 mb-1">
                <span className="text-4xl">📋</span> التقارير الشاملة
              </h1>
              <p className="text-gray-500">عرض وطباعة تقارير التقييم لجميع الطلاب</p>
            </div>
            <button className="bg-[#1E6FBF] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#0A3D7A] transition shadow-md">
              + إنشاء تقرير جديد
            </button>
          </div>

          {/* Filter */}
          <div className="flex gap-3 mb-8 flex-wrap">
            {['all', 'القراءة', 'الرياضيات', 'التخاطب', 'طيف التوحد'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-5 py-2 rounded-xl font-bold transition-all ${filter === f ? 'bg-[#1E6FBF] text-white shadow-md' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                {f === 'all' ? 'الكل' : f}
              </button>
            ))}
          </div>

          {/* Report Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filtered.map(report => (
              <div key={report.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className="h-2" style={{ backgroundColor: report.programColor }} />
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">{report.studentName}</h2>
                      <p className="text-gray-500 text-sm">{report.grade} · {report.date}</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-black" style={{ color: getScoreColor(report.score) }}>{report.score}%</div>
                      <div className="text-xs font-bold text-gray-400">الدرجة</div>
                    </div>
                  </div>

                  <span className="inline-block px-3 py-1 rounded-full text-sm font-bold text-white mb-4"
                    style={{ backgroundColor: report.programColor }}>
                    {report.program}
                  </span>

                  <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-2">{report.summary}</p>

                  <div className="flex gap-3">
                    <button onClick={() => setSelectedReport(report)}
                      className="flex-1 bg-[#1E6FBF] text-white py-2 rounded-xl font-bold hover:bg-[#0A3D7A] transition text-sm">
                      عرض التقرير الكامل
                    </button>
                    <button onClick={() => window.print()}
                      className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition text-sm">
                      🖨️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
