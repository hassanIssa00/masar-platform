'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { saveCredential } from '@/lib/auth';
import { saveAccount, setSession } from '@/lib/localDb';

const countryCodes = [
  // ── الدول العربية ──
  { code: '+20', name: '🇪🇬 مصر (+20)' },
  { code: '+966', name: '🇸🇦 السعودية (+966)' },
  { code: '+971', name: '🇦🇪 الإمارات (+971)' },
  { code: '+965', name: '🇰🇼 الكويت (+965)' },
  { code: '+974', name: '🇶🇦 قطر (+974)' },
  { code: '+973', name: '🇧🇭 البحرين (+973)' },
  { code: '+968', name: '🇴🇲 عُمان (+968)' },
  { code: '+962', name: '🇯🇴 الأردن (+962)' },
  { code: '+961', name: '🇱🇧 لبنان (+961)' },
  { code: '+963', name: '🇸🇾 سوريا (+963)' },
  { code: '+964', name: '🇮🇶 العراق (+964)' },
  { code: '+218', name: '🇱🇾 ليبيا (+218)' },
  { code: '+216', name: '🇹🇳 تونس (+216)' },
  { code: '+213', name: '🇩🇿 الجزائر (+213)' },
  { code: '+212', name: '🇲🇦 المغرب (+212)' },
  { code: '+249', name: '🇸🇩 السودان (+249)' },
  { code: '+967', name: '🇾🇪 اليمن (+967)' },
  { code: '+970', name: '🇵🇸 فلسطين (+970)' },
  { code: '+252', name: '🇸🇴 الصومال (+252)' },
  { code: '+253', name: '🇩🇯 جيبوتي (+253)' },
  { code: '+222', name: '🇲🇷 موريتانيا (+222)' },
  { code: '+269', name: '🇰🇲 جزر القمر (+269)' },

  // ── أمريكا وأوروبا ──
  { code: '+1', name: '🇺🇸 أمريكا / كندا (+1)' },
  { code: '+44', name: '🇬🇧 بريطانيا (+44)' },
  { code: '+49', name: '🇩🇪 ألمانيا (+49)' },
  { code: '+33', name: '🇫🇷 فرنسا (+33)' },
  { code: '+39', name: '🇮🇹 إيطاليا (+39)' },
  { code: '+34', name: '🇪🇸 إسبانيا (+34)' },
  { code: '+31', name: '🇳🇱 هولندا (+31)' },
  { code: '+32', name: '🇧🇪 بلجيكا (+32)' },
  { code: '+41', name: '🇨🇭 سويسرا (+41)' },
  { code: '+43', name: '🇦🇹 النمسا (+43)' },
  { code: '+46', name: '🇸🇪 السويد (+46)' },
  { code: '+47', name: '🇳🇴 النرويج (+47)' },
  { code: '+45', name: '🇩🇰 الدنمارك (+45)' },
  { code: '+358', name: '🇫🇮 فنلندا (+358)' },
  { code: '+351', name: '🇵🇹 البرتغال (+351)' },
  { code: '+30', name: '🇬🇷 اليونان (+30)' },
  { code: '+90', name: '🇹🇷 تركيا (+90)' },
  { code: '+7', name: '🇷🇺 روسيا (+7)' },
  { code: '+380', name: '🇺🇦 أوكرانيا (+380)' },
  { code: '+48', name: '🇵🇱 بولندا (+48)' },
  { code: '+40', name: '🇷🇴 رومانيا (+40)' },
  { code: '+36', name: '🇭🇺 المجر (+36)' },
  { code: '+420', name: '🇨🇿 التشيك (+420)' },
  { code: '+353', name: '🇮🇪 أيرلندا (+353)' },

  // ── آسيا وأوقيانوسيا ──
  { code: '+91', name: '🇮🇳 الهند (+91)' },
  { code: '+86', name: '🇨🇳 الصين (+86)' },
  { code: '+81', name: '🇯🇵 اليابان (+81)' },
  { code: '+82', name: '🇰🇷 كوريا الجنوبية (+82)' },
  { code: '+92', name: '🇵🇰 باكستان (+92)' },
  { code: '+880', name: '🇧🇩 بنغلاديش (+880)' },
  { code: '+94', name: '🇱🇰 سريلانكا (+94)' },
  { code: '+60', name: '🇲🇾 ماليزيا (+60)' },
  { code: '+62', name: '🇮🇩 إندونيسيا (+62)' },
  { code: '+65', name: '🇸🇬 سنغافورة (+65)' },
  { code: '+66', name: '🇹🇭 تايلاند (+66)' },
  { code: '+84', name: '🇻🇳 فيتنام (+84)' },
  { code: '+63', name: '🇵🇭 الفلبين (+63)' },
  { code: '+61', name: '🇦🇺 أستراليا (+61)' },
  { code: '+64', name: '🇳🇿 نيوزيلندا (+64)' },

  // ── أمريكا اللاتينية وإفريقيا ──
  { code: '+55', name: '🇧🇷 البرازيل (+55)' },
  { code: '+52', name: '🇲🇽 المكسيك (+52)' },
  { code: '+54', name: '🇦🇷 الأرجنتين (+54)' },
  { code: '+57', name: '🇨🇴 كولومبيا (+57)' },
  { code: '+56', name: '🇨🇱 تشيلي (+56)' },
  { code: '+27', name: '🇿🇦 جنوب إفريقيا (+27)' },
  { code: '+234', name: '🇳🇬 نيجيريا (+234)' },
  { code: '+254', name: '🇰🇪 كينيا (+254)' },
  { code: '+233', name: '🇬🇭 غانا (+233)' },
  { code: '+251', name: '🇪🇹 إثيوبيا (+251)' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+20');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const account = saveAccount({
      name,
      email,
      phone: `${countryCode}${phone}`,
      role: 'parent',
    });

    setSession(account);
    saveCredential(account, password);
    router.push('/student/new');
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-teal-50/80 via-slate-50 to-emerald-50/70 p-4 py-10 text-slate-900 font-sans" dir="rtl">
      
      {/* Background Soft Glows */}
      <div className="fixed top-10 right-10 w-96 h-96 bg-teal-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-emerald-200/30 rounded-full blur-[120px] pointer-events-none" />

      <main className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8 text-right">
        <div className="text-center">
          <Link href="/" className="mx-auto inline-flex justify-center">
            <BrandMark size="lg" showText={false} />
          </Link>
          <h1 className="mt-4 text-3xl font-black text-slate-900">إنشاء حساب جديد</h1>
          <p className="mt-2 text-sm font-bold text-slate-500">إنشاء حساب ولي أمر لمتابعة بيانات الطفل والاستبيان.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <Field label="الاسم الكامل" value={name} onChange={setName} placeholder="الاسم الثلاثي" />
          <Field label="البريد الإلكتروني" value={email} onChange={setEmail} placeholder="name@example.com" type="email" />
          {/* Phone field with country code selector */}
          <div className="block">
            <span className="mb-2 block text-xs sm:text-sm font-black text-slate-700">رقم الهاتف</span>
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 focus-within:border-teal-600 focus-within:bg-white transition overflow-hidden">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="shrink-0 bg-slate-100 border-l border-slate-200 px-3 py-3 text-xs font-black text-slate-800 outline-none cursor-pointer hover:bg-slate-200 transition"
              >
                {countryCodes.map((c) => (
                  <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                ))}
              </select>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-bold text-slate-900 outline-none"
                placeholder="1000000000"
                required
              />
            </div>
          </div>
          <Field label="كلمة المرور" value={password} onChange={setPassword} placeholder="اكتب كلمة المرور" type="password" />

          <div className="rounded-2xl bg-teal-50 border border-teal-200 p-4 text-xs font-bold leading-relaxed text-teal-900">
            💡 هذه الصفحة مخصصة لولي الأمر فقط. حسابات الدكتور والأخصائي لا تُنشأ من التسجيل العام.
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="focus-ring flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 font-black text-white hover:bg-teal-700 transition shadow-md shadow-teal-600/20 active:scale-95 disabled:opacity-60"
          >
            <UserPlus size={18} />
            {loading ? 'جاري تجهيز ملف ولي الأمر...' : 'تسجيل وإنشاء جلسة'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs sm:text-sm font-bold text-slate-600">
          لديك حساب بالفعل؟{' '}
          <Link href="/auth/login" className="font-black text-teal-700 hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </main>

      {loading && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 text-slate-900 backdrop-blur-md">
          <div className="motion-scale-in rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-2xl max-w-sm w-full mx-4">
            <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
            <p className="mt-4 text-lg font-black text-slate-900">جاري نقلك لتسجيل بيانات الطفل</p>
            <p className="mt-1 text-xs font-bold text-slate-500">لحظات بسيطة ونكمل المسار بشكل منظم.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs sm:text-sm font-black text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-600 focus:bg-white transition"
        placeholder={placeholder}
        required
      />
    </label>
  );
}
