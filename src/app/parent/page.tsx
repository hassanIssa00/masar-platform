'use client';

export default function ParentDashboard() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] p-8" dir="rtl">
      {/* Header */}
      <header className="flex justify-between items-center mb-12 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-black text-primary">ISSA Genesis</h1>
          <p className="text-gray-500 font-bold mt-1">بوابة الآباء 👨‍👩‍👧</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <div className="font-bold text-gray-800">أهلاً، والدة ياسين</div>
            <div className="text-sm text-gray-500">حساب مميز</div>
          </div>
          <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-xl shadow-sm border-2 border-white">
            👩
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        
        {/* Child Selector (If multiple children) */}
        <div className="flex gap-4">
          <button className="bg-white border-2 border-primary px-6 py-3 rounded-2xl font-bold text-primary shadow-sm flex items-center gap-3">
            <span className="text-2xl">👦</span> ياسين
          </button>
          <button className="bg-white border-2 border-gray-100 px-6 py-3 rounded-2xl font-bold text-gray-400 shadow-sm flex items-center gap-3 hover:border-gray-200 transition-colors">
            <span className="text-2xl">👧</span> مريم
          </button>
          <button className="bg-white border-2 border-dashed border-gray-200 px-6 py-3 rounded-2xl font-bold text-gray-400 shadow-sm flex items-center gap-3 hover:border-gray-300 transition-colors">
            + إضافة طفل
          </button>
        </div>

        {/* Action Feed */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-black text-gray-800 mb-6">ملخص اليوم ✨</h2>
          
          <div className="space-y-4">
            {/* Event 1 */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-blue-50/50 hover:bg-blue-50 transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                🎮
              </div>
              <div>
                <h3 className="font-bold text-gray-800">ياسين أنهى 3 مستويات في لعبة &quot;حروف الغابة&quot;</h3>
                <p className="text-gray-500 text-sm mt-1">تم تحقيق الهدف اليومي للقراءة! لقد حصل على 50 نقطة خبرة (XP).</p>
                <div className="mt-3 flex gap-2">
                  <button className="bg-white px-4 py-1.5 rounded-full text-sm font-bold text-primary border border-primary/20 shadow-sm hover:bg-primary/5">
                    إرسال تشجيع 👏
                  </button>
                </div>
              </div>
            </div>

            {/* Event 2 */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-orange-50/50 hover:bg-orange-50 transition-colors">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                📋
              </div>
              <div>
                <h3 className="font-bold text-gray-800">رسالة جديدة من الأخصائي</h3>
                <p className="text-gray-500 text-sm mt-1">د. أحمد أضاف ملاحظة حول الجلسة المباشرة الأخيرة.</p>
                <div className="mt-3 flex gap-2">
                  <button className="bg-white px-4 py-1.5 rounded-full text-sm font-bold text-orange-600 border border-orange-200 shadow-sm hover:bg-orange-50">
                    قراءة الملاحظة 👁️
                  </button>
                </div>
              </div>
            </div>

            {/* Event 3 */}
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-green-50/50 hover:bg-green-50 transition-colors">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                📅
              </div>
              <div>
                <h3 className="font-bold text-gray-800">تذكير بالجلسة القادمة</h3>
                <p className="text-gray-500 text-sm mt-1">جلسة تخاطب غداً الساعة 4:00 عصراً بتوقيت الرياض.</p>
              </div>
            </div>

          </div>
        </div>

        {/* At a glance stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="text-3xl mb-2">🔥</div>
            <div className="text-2xl font-black text-gray-800">5 أيام</div>
            <div className="text-sm font-bold text-gray-400 mt-1">سلسلة التعلم (Streak)</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-2xl font-black text-gray-800">1,250</div>
            <div className="text-sm font-bold text-gray-400 mt-1">إجمالي النقاط (XP)</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="text-3xl mb-2">📚</div>
            <div className="text-2xl font-black text-gray-800">12</div>
            <div className="text-sm font-bold text-gray-400 mt-1">قصة مقروءة</div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-2xl font-black text-primary">85%</div>
            <div className="text-sm font-bold text-gray-400 mt-1">إنجاز الأهداف الأسبوعية</div>
          </div>
        </div>
      </main>
    </div>
  );
}
