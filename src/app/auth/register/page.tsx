import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E6FBF] to-[#0A3D7A] p-4 py-12">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-2xl w-full max-w-lg animate-slide-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#1E6FBF] mb-2">إنشاء حساب جديد</h1>
          <p className="text-gray-500">انضم إلى المنصة الأولى عربياً للتعليم والتأهيل</p>
        </div>
        <form className="space-y-5">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">الاسم الكامل</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E6FBF] focus:border-transparent transition"
              placeholder="الاسم الثلاثي"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">البريد الإلكتروني</label>
            <input 
              type="email" 
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E6FBF] focus:border-transparent transition"
              placeholder="name@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">رقم الهاتف</label>
            <input 
              type="tel" 
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E6FBF] focus:border-transparent transition"
              placeholder="+966 5X XXX XXXX"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">كلمة المرور</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E6FBF] focus:border-transparent transition"
              placeholder="••••••••"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 font-semibold mb-2">نوع الحساب</label>
            <select className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E6FBF] bg-white transition">
              <option value="parent">أحد الوالدين</option>
              <option value="specialist">أخصائي</option>
              <option value="teacher">معلم</option>
            </select>
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-[#F5A623] hover:bg-[#e0961b] text-white font-bold py-3 px-4 rounded-xl shadow-lg transition transform hover:-translate-y-1 mt-4"
          >
            تسجيل
          </button>
        </form>
        <div className="mt-8 text-center text-gray-600">
          لديك حساب بالفعل؟{' '}
          <Link href="/auth/login" className="text-[#1E6FBF] font-bold hover:underline">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
