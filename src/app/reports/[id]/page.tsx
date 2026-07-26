"use client";
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function ReportDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gray-100 pb-10">
      <Navbar />
      
      <div className="container mx-auto px-4 mt-10 max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <Link href="/reports" className="text-gray-500 hover:text-[#1E6FBF] font-bold flex items-center gap-2">
            → العودة للتقارير
          </Link>
          <button className="bg-[#1E6FBF] text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-[#0A3D7A] transition flex items-center gap-2">
            🖨️ طباعة التقرير
          </button>
        </div>

        <div className="bg-white rounded-none md:rounded-xl shadow-2xl p-8 md:p-12 print:shadow-none print:p-0">
          
          {/* Header */}
          <div className="border-b-4 border-[#1E6FBF] pb-6 mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#1E6FBF]"><span className="text-[#F5A623]">د.</span> إسماعيل عيسى</h1>
              <p className="text-gray-500 text-sm">المنصة الأولى عربياً للتعليم وعلاج صعوبات التعلم</p>
            </div>
            <div className="text-left">
              <h2 className="text-xl font-bold text-gray-800">تقرير أداء دوري</h2>
              <p className="text-gray-500">التاريخ: 15 أكتوبر 2023</p>
              <p className="text-gray-500">رقم التقرير: #100{params.id}</p>
            </div>
          </div>

          {/* Student Info */}
          <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-gray-500 text-xs mb-1">اسم الطالب</p><p className="font-bold text-gray-800">أحمد محمود</p></div>
            <div><p className="text-gray-500 text-xs mb-1">الصف الدراسي</p><p className="font-bold text-gray-800">الثاني الابتدائي</p></div>
            <div><p className="text-gray-500 text-xs mb-1">البرنامج المتبع</p><p className="font-bold text-[#1E6FBF]">القراءة والكتابة</p></div>
            <div><p className="text-gray-500 text-xs mb-1">اسم الأخصائي</p><p className="font-bold text-gray-800">د. محمد علي</p></div>
          </div>

          {/* Assessment Table */}
          <h3 className="text-lg font-bold text-gray-800 mb-4 border-r-4 border-[#F5A623] pr-3">نتائج التقييم</h3>
          <div className="overflow-x-auto mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#1E6FBF] text-white">
                  <th className="p-3 text-right font-semibold rounded-tr-lg">المهارة</th>
                  <th className="p-3 text-center font-semibold">التقييم السابق</th>
                  <th className="p-3 text-center font-semibold">التقييم الحالي</th>
                  <th className="p-3 text-center font-semibold rounded-tl-lg">مستوى التقدم</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 bg-white">
                  <td className="p-3 font-semibold text-gray-800">التمييز بين الحروف المتشابهة</td>
                  <td className="p-3 text-center text-gray-600">40%</td>
                  <td className="p-3 text-center text-gray-600">75%</td>
                  <td className="p-3 text-center text-green-600 font-bold">ممتاز</td>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <td className="p-3 font-semibold text-gray-800">قراءة كلمات ثلاثية بحركة الفتح</td>
                  <td className="p-3 text-center text-gray-600">30%</td>
                  <td className="p-3 text-center text-gray-600">50%</td>
                  <td className="p-3 text-center text-orange-500 font-bold">جيد</td>
                </tr>
                <tr className="border-b border-gray-200 bg-white">
                  <td className="p-3 font-semibold text-gray-800">كتابة الحروف بالحركات</td>
                  <td className="p-3 text-center text-gray-600">20%</td>
                  <td className="p-3 text-center text-gray-600">65%</td>
                  <td className="p-3 text-center text-green-600 font-bold">جيد جداً</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <h3 className="text-lg font-bold text-gray-800 mb-4 border-r-4 border-[#2ECC71] pr-3">ملاحظات وتوصيات الأخصائي</h3>
          <div className="bg-green-50 p-6 rounded-xl border border-green-200 text-gray-700 leading-relaxed mb-8">
            أظهر الطالب أحمد تقدماً ملحوظاً خلال الشهر الماضي في مهارات التمييز البصري للحروف. نوصي بالاستمرار في التدريبات المنزلية المرفقة، والتركيز على قراءة الكلمات المكونة من ثلاثة حروف. كما يرجى تشجيعه المستمر لتعزيز ثقته بنفسه.
          </div>

          {/* Signatures */}
          <div className="mt-16 flex justify-between items-center text-center">
            <div>
              <p className="font-bold text-gray-800 mb-4">توقيع الأخصائي</p>
              <div className="border-b border-gray-400 w-32 mx-auto"></div>
            </div>
            <div>
              <p className="font-bold text-gray-800 mb-4">توقيع الإدارة</p>
              <div className="border-b border-gray-400 w-32 mx-auto"></div>
            </div>
            <div className="w-24 h-24 border-2 border-[#1E6FBF] rounded-full flex items-center justify-center text-[#1E6FBF] font-bold opacity-50 transform -rotate-12">
              ختم معتمد
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
