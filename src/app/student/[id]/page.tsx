"use client";
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import ProgressBar from '@/components/ProgressBar';

export default function StudentProfilePage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState('profile');
  const studentId = params.id;

  const tabs = [
    { id: 'profile', name: 'البروفايل' },
    { id: 'plan', name: 'خطة التعلم' },
    { id: 'reports', name: 'التقارير' },
    { id: 'progress', name: 'التقدم' }
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header Profile Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#1E6FBF] opacity-5 rounded-bl-full"></div>
          
          <div className="w-32 h-32 bg-gray-200 rounded-full border-4 border-[#1E6FBF] overflow-hidden shrink-0 shadow-lg">
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-5xl bg-white">👤</div>
          </div>
          
          <div className="flex-1 text-center md:text-right z-10">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">أحمد محمود عبدالسلام</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 text-sm mb-4">
              <span className="bg-gray-50 text-gray-700 px-3 py-1 rounded-full font-semibold border border-gray-100">ملف #{studentId}</span>
              <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-semibold border border-blue-100">الصف الثاني</span>
              <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full font-semibold border border-green-100">نشط</span>
              <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full font-semibold border border-orange-100">الأخصائي: د. محمد</span>
            </div>
            <button className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-2 mx-auto md:mx-0">
              🖨️ طباعة الملف
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-x-auto">
          <div className="flex border-b">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 px-6 text-center font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'text-[#1E6FBF] border-b-4 border-[#1E6FBF] bg-blue-50/30' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[400px]">
          {activeTab === 'profile' && (
            <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">المعلومات الشخصية</h3>
                <ul className="space-y-4">
                  <li className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">تاريخ الميلاد</span> <span className="font-semibold">12 مايو 2016</span></li>
                  <li className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">الجنس</span> <span className="font-semibold">ذكر</span></li>
                  <li className="flex justify-between border-b border-gray-50 pb-2"><span className="text-gray-500">تاريخ الانضمام</span> <span className="font-semibold">1 سبتمبر 2023</span></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">ملاحظات الأخصائي</h3>
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-gray-700 leading-relaxed text-sm">
                  الطالب يظهر تحسناً ملحوظاً في التمييز بين الحروف المتشابهة. يحتاج إلى مزيد من التركيز في العمليات الحسابية البسيطة. الاستجابة لبرنامج تعديل السلوك ممتازة.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="animate-fade-in">
              <h3 className="text-xl font-bold text-gray-800 mb-6">التقدم في البرامج</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <ProgressBar label="القراءة والكتابة" percentage={75} colorClass="bg-[#1E6FBF]" />
                  <ProgressBar label="الرياضيات" percentage={45} colorClass="bg-[#F5A623]" />
                  <ProgressBar label="صعوبات التعلم" percentage={60} colorClass="bg-[#2ECC71]" />
                </div>
                <div className="space-y-6">
                  <ProgressBar label="تعديل السلوك" percentage={90} colorClass="bg-[#E74C3C]" />
                  <ProgressBar label="التخاطب والنطق" percentage={30} colorClass="bg-[#8E44AD]" />
                  <ProgressBar label="طيف التوحد" percentage={0} colorClass="bg-gray-300" />
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-800 mt-10 mb-6">التطور الشهري (نموذج بياني)</h3>
              <div className="h-64 flex items-end gap-4 border-b-2 border-l-2 border-gray-200 pb-2 pl-2">
                {[40, 55, 60, 75, 80].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center group">
                    <div className="w-full bg-[#1E6FBF] rounded-t-md transition-all group-hover:bg-[#F5A623]" style={{ height: `${val}%` }}></div>
                    <span className="text-xs text-gray-500 mt-2 font-bold">شهر {i+1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Plan & Reports placeholders for brevity */}
          {activeTab === 'plan' && <div className="animate-fade-in text-center text-gray-500 py-10">محتوى خطة التعلم قيد التطوير...</div>}
          {activeTab === 'reports' && <div className="animate-fade-in text-center text-gray-500 py-10">سجل التقارير يظهر هنا...</div>}
        </div>
      </div>
    </div>
  );
}
