'use client';
import { useState } from 'react';

export default function SpecialistDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-l border-gray-200 p-6 flex flex-col gap-6">
        <div className="font-black text-2xl text-primary mb-8">ISSA Genesis</div>
        
        <nav className="flex flex-col gap-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`text-right p-3 rounded-xl font-bold transition-colors ${activeTab === 'overview' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            📊 نظرة عامة
          </button>
          <button 
            onClick={() => setActiveTab('patients')}
            className={`text-right p-3 rounded-xl font-bold transition-colors ${activeTab === 'patients' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            👥 ملفات الطلاب
          </button>
          <button 
            onClick={() => setActiveTab('iep')}
            className={`text-right p-3 rounded-xl font-bold transition-colors ${activeTab === 'iep' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            🎯 الخطط الفردية (IEP)
          </button>
          <button 
            onClick={() => setActiveTab('teletherapy')}
            className={`text-right p-3 rounded-xl font-bold transition-colors ${activeTab === 'teletherapy' ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            📹 الجلسات المباشرة
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800">مرحباً د. أحمد 👋</h1>
          <button className="bg-white px-6 py-2 rounded-full border border-gray-200 shadow-sm font-bold text-gray-600 hover:border-primary transition-colors">
            AI Copilot 🤖
          </button>
        </header>

        {/* Dashboard Widgets */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 font-bold mb-2">جلسات اليوم</h3>
            <div className="text-4xl font-black text-gray-800">6</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 font-bold mb-2">التقييمات المعلقة</h3>
            <div className="text-4xl font-black text-secondary">3</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 font-bold mb-2">تنبيهات AI ⚠️</h3>
            <div className="text-4xl font-black text-accent">2</div>
            <p className="text-sm text-gray-400 mt-2">تراجع ملحوظ في التركيز لدى (عمر)</p>
          </div>
        </div>

        {/* Patient List Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-800">المرضى الحاليين</h2>
          </div>
          <table className="w-full text-right">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="p-4 font-bold">اسم الطالب</th>
                <th className="p-4 font-bold">التشخيص الدعمي</th>
                <th className="p-4 font-bold">الجلسة القادمة</th>
                <th className="p-4 font-bold">الإجراء</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold">عمر خالد</td>
                <td className="p-4"><span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">ADHD - فرط حركة</span></td>
                <td className="p-4">اليوم 4:00 PM</td>
                <td className="p-4"><button className="text-primary font-bold hover:underline">فتح الملف</button></td>
              </tr>
              <tr className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold">لينا محمد</td>
                <td className="p-4"><span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">طيف التوحد (دعم تواصل)</span></td>
                <td className="p-4">غداً 2:00 PM</td>
                <td className="p-4"><button className="text-primary font-bold hover:underline">فتح الملف</button></td>
              </tr>
              <tr className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold">ياسين علي</td>
                <td className="p-4"><span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm">عسر القراءة (Dyslexia)</span></td>
                <td className="p-4">الخميس 10:00 AM</td>
                <td className="p-4"><button className="text-primary font-bold hover:underline">فتح الملف</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
