"use client";
import { useState } from 'react';
import Navbar from '@/components/Navbar';

export default function NewStudentWizard() {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          
          {/* Progress Header */}
          <div className="bg-[#1E6FBF] p-6 text-white">
            <h1 className="text-2xl font-bold mb-6 text-center">إضافة طالب جديد</h1>
            <div className="flex justify-between items-center relative">
              <div className="absolute top-1/2 left-0 right-0 h-1 bg-white/30 -z-0 transform -translate-y-1/2 rounded"></div>
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-500 ${step >= s ? 'bg-[#F5A623] text-white shadow-lg' : 'bg-gray-300 text-gray-500'}`}>
                  {s}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm font-semibold opacity-90">
              <span>البيانات</span>
              <span>الاستبيان</span>
              <span>التقييم</span>
              <span>الخطة</span>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-8">
            {step === 1 && (
              <div className="animate-fade-in space-y-6">
                <h2 className="text-xl font-bold text-gray-800 border-b pb-2">1. بيانات الطالب الأساسية</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">اسم الطالب</label>
                    <input type="text" className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#1E6FBF] outline-none" placeholder="الاسم الرباعي" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">الرقم القومي / الهوية</label>
                    <input type="text" className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#1E6FBF] outline-none" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">تاريخ الميلاد</label>
                    <input type="date" className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#1E6FBF] outline-none" />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-2">الصف الدراسي</label>
                    <select className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#1E6FBF] outline-none bg-white">
                      <option>الروضة</option>
                      <option>الصف الأول</option>
                      <option>الصف الثاني</option>
                      <option>الصف الثالث</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">صورة الطالب</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer">
                    <span className="text-4xl mb-2 block">📸</span>
                    <span className="text-gray-500 font-semibold">اضغط لرفع صورة</span>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-fade-in space-y-6">
                <h2 className="text-xl font-bold text-gray-800 border-b pb-2">2. استبيان الأهل المبدئي</h2>
                <div className="space-y-4">
                  {[
                    "هل يعاني الطفل من تأخر في النطق؟",
                    "هل يواجه الطفل صعوبة في حفظ الحروف والأرقام؟",
                    "هل يتشتت انتباه الطفل بسهولة أثناء المذاكرة؟",
                    "هل يوجد تاريخ عائلي لصعوبات التعلم؟"
                  ].map((q, idx) => (
                    <div key={idx} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="font-semibold text-gray-700 mb-3">{idx + 1}. {q}</p>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2"><input type="radio" name={`q${idx}`} className="w-4 h-4 text-[#1E6FBF]" /> نعم</label>
                        <label className="flex items-center gap-2"><input type="radio" name={`q${idx}`} className="w-4 h-4 text-[#1E6FBF]" /> لا</label>
                        <label className="flex items-center gap-2"><input type="radio" name={`q${idx}`} className="w-4 h-4 text-[#1E6FBF]" /> أحياناً</label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-fade-in space-y-6">
                <h2 className="text-xl font-bold text-gray-800 border-b pb-2">3. التقييم الأولي (للأخصائي)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                    <h3 className="font-bold text-[#1E6FBF] mb-3">اختبار القراءة</h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" /> يعرف الحروف منفصلة</label>
                      <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" /> يقرأ كلمات ثلاثية</label>
                      <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" /> يخلط بين الحروف المتشابهة</label>
                    </div>
                  </div>
                  <div className="bg-orange-50 p-5 rounded-xl border border-orange-100">
                    <h3 className="font-bold text-[#F5A623] mb-3">اختبار الرياضيات</h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" /> يميز الأرقام 1-10</label>
                      <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" /> يجمع أعداد بسيطة</label>
                      <label className="flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" /> يفهم مدلول الرقم</label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">ملاحظات السلوك والانتباه</label>
                  <textarea className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-[#1E6FBF] outline-none h-24" placeholder="اكتب ملاحظاتك هنا..."></textarea>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-fade-in space-y-6 text-center">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-4">✨</div>
                <h2 className="text-2xl font-bold text-gray-800">تم التقييم بنجاح!</h2>
                <p className="text-gray-600">بناءً على التقييم الأولي، يوصى بالبرامج التالية للطالب:</p>
                <div className="flex flex-wrap justify-center gap-4 mt-6">
                  <span className="px-6 py-3 bg-[#1E6FBF] text-white rounded-full font-bold shadow-md">برنامج القراءة والكتابة</span>
                  <span className="px-6 py-3 bg-[#2ECC71] text-white rounded-full font-bold shadow-md">برنامج تعديل السلوك</span>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-10 pt-6 border-t">
              <button 
                onClick={() => setStep(step > 1 ? step - 1 : 1)}
                className={`px-6 py-2 rounded-xl font-bold transition ${step === 1 ? 'opacity-0 cursor-default' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                disabled={step === 1}
              >
                السابق
              </button>
              
              {step < 4 ? (
                <button 
                  onClick={() => setStep(step + 1)}
                  className="px-8 py-2 bg-[#1E6FBF] text-white rounded-xl font-bold hover:bg-[#0A3D7A] transition shadow-md"
                >
                  التالي
                </button>
              ) : (
                <button 
                  onClick={() => window.location.href = '/dashboard'}
                  className="px-8 py-2 bg-[#F5A623] text-white rounded-xl font-bold hover:bg-[#e0961b] transition shadow-md"
                >
                  حفظ وإنهاء
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
