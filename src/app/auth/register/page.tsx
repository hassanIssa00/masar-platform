'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, GraduationCap, HeartHandshake } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { saveCredential } from '@/lib/auth';
import { getStudents, saveAccount, saveStudent, setSession, updateStudent } from '@/lib/localDb';

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

  // ── آسيا وباقي العالم ──
  { code: '+91', name: '🇮🇳 الهند (+91)' },
  { code: '+86', name: '🇨🇳 الصين (+86)' },
  { code: '+81', name: '🇯🇵 اليابان (+81)' },
  { code: '+90', name: '🇹🇷 تركيا (+90)' },
  { code: '+61', name: '🇦🇺 أستراليا (+61)' },
];

const grades = [
  'الصف الأول الابتدائي',
  'الصف الثاني الابتدائي',
  'الصف الثالث الابتدائي',
  'الصف الرابع الابتدائي',
  'الصف الخامس الابتدائي',
  'الصف السادس الابتدائي',
  'الروضة / التمهيدي',
  'مرحلة متوسطة / إعدادية',
];

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<'parent' | 'student'>('parent');

  // Form Fields
  const [parentName, setParentName] = useState('');
  const [childName, setChildName] = useState('');
  const [grade, setGrade] = useState(grades[0]);
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+20');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    const fullPhone = `${countryCode}${phone}`;
    const primaryName = accountType === 'parent' ? parentName : childName;

    // 0. Clear any stale session/onboarding data to ensure clean fresh flow
    if (typeof window !== 'undefined') {
      localStorage.removeItem('masar.current-student-id');
      localStorage.removeItem('masar_active_student_id');
      localStorage.removeItem('masar_active_mode');
    }

    // 1. Save User Account
    const account = saveAccount({
      name: primaryName,
      email,
      phone: fullPhone,
      role: accountType === 'parent' ? 'parent' : 'student',
    });

    // Store account type so login redirect works correctly
    if (typeof window !== 'undefined') {
      localStorage.setItem('masar_account_type', accountType);
      localStorage.setItem('masar_registered_email', email.trim().toLowerCase());
    }

    // 2. Automatic Linkage Logic: Look for existing matching student in system
    const allStudents = getStudents();
    const normalizedParentName = parentName.trim().toLowerCase();
    const normalizedChildName = childName.trim().toLowerCase();

    let matchingStudent = allStudents.find((s) => {
      if (phone && s.parentPhone && s.parentPhone.includes(phone)) return true;
      if (normalizedParentName && s.parentName && s.parentName.trim().toLowerCase() === normalizedParentName) return true;
      if (normalizedChildName && s.fullName && s.fullName.trim().toLowerCase() === normalizedChildName) return true;
      return false;
    });

    // If matching student found, update their parent details to ensure instant report linkage
    if (matchingStudent) {
      updateStudent(matchingStudent.id, {
        parentName: parentName || matchingStudent.parentName,
        parentPhone: fullPhone || matchingStudent.parentPhone,
      });
    } else {
      // If no matching student exists yet, create new student record linked to this parent
      matchingStudent = saveStudent({
        fullName: childName || `طالب ${parentName}`,
        grade,
        parentName: parentName,
        parentPhone: fullPhone,
        source: 'student-wizard',
        reviewStatus: 'awaiting-survey',
      });
    }

    setSession(account);
    saveCredential(account, password);

    // Save active student ID for instant report and profile switcher binding
    if (typeof window !== 'undefined') {
      localStorage.setItem('masar_active_student_id', matchingStudent.id);
      localStorage.setItem('masar_active_mode', accountType === 'parent' ? 'parent' : 'student');
      localStorage.setItem('masar.current-student-id', matchingStudent.id);
    }

    setTimeout(() => {
      if (accountType === 'parent') {
        // Parent accounts go straight to their dashboard — no survey/assessment needed
        router.push('/parent');
      } else {
        // Student accounts must complete the full onboarding:
        // /student/new → /survey → /assessment → /kids
        router.push('/student/new');
      }
    }, 600);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-teal-50/80 via-slate-50 to-emerald-50/70 p-4 py-10 text-slate-900 font-sans" dir="rtl">
      
      {/* Background Soft Glows */}
      <div className="fixed top-10 right-10 w-96 h-96 bg-teal-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-emerald-200/30 rounded-full blur-[120px] pointer-events-none" />

      <main className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl text-right">
        
        {/* Header Logo & Title */}
        <div className="text-center">
          <Link href="/" className="mx-auto inline-flex justify-center">
            <BrandMark size="lg" showText={false} />
          </Link>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">إنشاء حساب جديد</h1>
          <p className="mt-1.5 text-xs sm:text-sm font-bold text-slate-500">
            انضم لمنصة د. إسماعيل عيسى ومكّن طفلك من رحلة التأهيل الذكي
          </p>
        </div>

        {/* Account Type Selector Tabs (Parent vs Student) */}
        <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setAccountType('parent')}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-black transition ${
              accountType === 'parent'
                ? 'bg-teal-700 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <HeartHandshake size={18} />
            <span>حساب ولي أمر</span>
          </button>

          <button
            type="button"
            onClick={() => setAccountType('student')}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs sm:text-sm font-black transition ${
              accountType === 'student'
                ? 'bg-teal-700 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <GraduationCap size={18} />
            <span>تسجيل طالب مباشر</span>
          </button>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          
          {accountType === 'parent' ? (
            <>
              <Field label="اسم ولي الأمر (الكامل)" value={parentName} onChange={setParentName} placeholder="مثال: أحمد محمد علي" required />
              <Field label="اسم الطالب / الطفل" value={childName} onChange={setChildName} placeholder="مثال: يوسف أحمد" required />
            </>
          ) : (
            <Field label="اسم الطالب (الكامل)" value={childName} onChange={setChildName} placeholder="مثال: يوسف أحمد محمد" required />
          )}

          {/* Grade Selector */}
          <label className="block text-right">
            <span className="mb-2 block text-xs sm:text-sm font-black text-slate-700">الصف الدراسي للطالب</span>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 outline-none focus:border-teal-600 focus:bg-white transition cursor-pointer"
            >
              {grades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>

          <Field label="البريد الإلكتروني" value={email} onChange={setEmail} placeholder="name@example.com" type="email" required />

          {/* Phone field with country code selector */}
          <div className="block">
            <span className="mb-2 block text-xs sm:text-sm font-black text-slate-700">رقم الهاتف / الواتساب</span>
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 focus-within:border-teal-600 focus-within:bg-white transition overflow-hidden">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="shrink-0 bg-slate-100 border-l border-slate-200 px-3 py-3 text-xs font-black text-slate-800 outline-none cursor-pointer hover:bg-slate-200 transition"
              >
                {countryCodes.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
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

          <Field label="كلمة المرور" value={password} onChange={setPassword} placeholder="اكتب كلمة مرور قوية" type="password" required />

          <button 
            type="submit" 
            disabled={loading} 
            className="focus-ring flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 font-black text-white hover:bg-teal-700 transition shadow-md shadow-teal-600/20 active:scale-95 disabled:opacity-60"
          >
            <UserPlus size={18} />
            {loading ? 'جاري الربط وإنشاء الحساب...' : 'إنشاء الحساب ودخول المنصة'}
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
          <div className="motion-scale-in rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-2xl max-w-sm w-full mx-4 space-y-3">
            <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600" />
            <p className="text-lg font-black text-slate-900">جاري ربط ملف الطالب والتقارير...</p>
            <p className="text-xs font-bold text-slate-500">سيتم التعرف التلقائي على نتائج وتقارير الطفل.</p>
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
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
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
        required={required}
      />
    </label>
  );
}
