'use client';

import { FormEvent, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, GraduationCap, HeartHandshake, Search, ChevronDown, Check, AlertCircle } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { saveCredential } from '@/lib/auth';
import { getAccounts, getStudents, saveAccount, saveStudent, setSession, updateStudent } from '@/lib/localDb';
import { trackEvent } from '@/lib/analyticsTracker';

type Country = {
  code: string;
  flag: string;
  name: string;
  example: string;
};

const ALL_COUNTRIES: Country[] = [
  { code: '+20', flag: '🇪🇬', name: 'مصر', example: '01012345678' },
  { code: '+966', flag: '🇸🇦', name: 'السعودية', example: '0501234567' },
  { code: '+971', flag: '🇦🇪', name: 'الإمارات', example: '0501234567' },
  { code: '+965', flag: '🇰🇼', name: 'الكويت', example: '91234567' },
  { code: '+974', flag: '🇶🇦', name: 'قطر', example: '55123456' },
  { code: '+973', flag: '🇧🇭', name: 'البحرين', example: '36123456' },
  { code: '+968', flag: '🇴🇲', name: 'عُمان', example: '91234567' },
  { code: '+962', flag: '🇯🇴', name: 'الأردن', example: '0791234567' },
  { code: '+961', flag: '🇱🇧', name: 'لبنان', example: '03123456' },
  { code: '+963', flag: '🇸🇾', name: 'سوريا', example: '0912345678' },
  { code: '+964', flag: '🇮🇶', name: 'العراق', example: '07901234567' },
  { code: '+970', flag: '🇵🇸', name: 'فلسطين', example: '0591234567' },
  { code: '+218', flag: '🇱🇾', name: 'ليبيا', example: '0912345678' },
  { code: '+216', flag: '🇹🇳', name: 'تونس', example: '20123456' },
  { code: '+213', flag: '🇩🇿', name: 'الجزائر', example: '0550123456' },
  { code: '+212', flag: '🇲🇦', name: 'المغرب', example: '0612345678' },
  { code: '+249', flag: '🇸🇩', name: 'السودان', example: '0912345678' },
  { code: '+967', flag: '🇾🇪', name: 'اليمن', example: '0771234567' },
  { code: '+252', flag: '🇸🇴', name: 'الصومال', example: '061234567' },
  { code: '+253', flag: '🇩🇯', name: 'جيبوتي', example: '77123456' },
  { code: '+222', flag: '🇲🇷', name: 'موريتانيا', example: '46123456' },
  { code: '+269', flag: '🇰🇲', name: 'جزر القمر', example: '3212345' },
  { code: '+1', flag: '🇺🇸', name: 'أمريكا', example: '2025550123' },
  { code: '+1', flag: '🇨🇦', name: 'كندا', example: '4165550123' },
  { code: '+44', flag: '🇬🇧', name: 'بريطانيا', example: '07123456789' },
  { code: '+49', flag: '🇩🇪', name: 'ألمانيا', example: '015123456789' },
  { code: '+33', flag: '🇫🇷', name: 'فرنسا', example: '0612345678' },
  { code: '+39', flag: '🇮🇹', name: 'إيطاليا', example: '3123456789' },
  { code: '+34', flag: '🇪🇸', name: 'إسبانيا', example: '612345678' },
  { code: '+90', flag: '🇹🇷', name: 'تركيا', example: '05123456789' },
  { code: '+60', flag: '🇲🇾', name: 'ماليزيا', example: '0123456789' },
  { code: '+91', flag: '🇮🇳', name: 'الهند', example: '9123456789' },
  { code: '+86', flag: '🇨🇳', name: 'الصين', example: '13812345678' },
  { code: '+81', flag: '🇯🇵', name: 'اليابان', example: '09012345678' },
  { code: '+61', flag: '🇦🇺', name: 'أستراليا', example: '0412345678' },
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
  const [selectedCountry, setSelectedCountry] = useState<Country>(ALL_COUNTRIES[0]); // Default Egypt
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Errors State
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return ALL_COUNTRIES;
    const q = countrySearch.trim().toLowerCase();
    return ALL_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.includes(q)
    );
  }, [countrySearch]);

  const countWords = (str: string) => {
    return str.trim().split(/\s+/).filter(Boolean).length;
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    // 1. Parent Name Validation (3+ words)
    if (accountType === 'parent') {
      const pWords = countWords(parentName);
      if (!parentName.trim()) {
        errs.parentName = 'يرجى كتابة اسم ولي الأمر الكامل';
      } else if (pWords < 3) {
        errs.parentName = 'اسم ولي الأمر يجب أن يكون ثلاثياً على الأقل (مثال: أحمد محمد علي)';
      }
    }

    // 2. Child / Student Name Validation (4+ words)
    const cWords = countWords(childName);
    if (!childName.trim()) {
      errs.childName = accountType === 'parent' ? 'يرجى كتابة اسم الطالب' : 'يرجى كتابة اسم الطالب الكامل';
    } else if (cWords < 4) {
      errs.childName = 'اسم الطالب يجب أن يكون رباعياً على الأقل (مثال: يوسف أحمد محمد علي)';
    }

    // 3. Email Validation (must contain @ and end with .com)
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      errs.email = 'يرجى كتابة البريد الإلكتروني';
    } else if (!cleanEmail.includes('@') || !cleanEmail.endsWith('.com')) {
      errs.email = 'البريد الإلكتروني يجب أن يحتوي على @ وينتهي بـ .com (مثال: name@example.com)';
    } else {
      // Check duplicate
      const accounts = getAccounts();
      const isDuplicate = accounts.some((a) => a.email.toLowerCase() === cleanEmail);
      if (isDuplicate) {
        errs.email = 'هذا البريد الإلكتروني مسجل بالفعل لدى حساب آخر. يمكنك تسجيل الدخول بدلاً من ذلك.';
      }
    }

    // 4. Phone Validation
    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone) {
      errs.phone = 'يرجى كتابة رقم الهاتف / الواتساب';
    } else if (cleanPhone.length < 7) {
      errs.phone = 'يرجى كتابة رقم هاتف صحيح';
    }

    // 5. Password Validation
    if (!password || password.length < 4) {
      errs.password = 'يرجى كتابة كلمة مرور مكونة من 4 أحرف/أرقام على الأقل';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    const fullPhone = `${selectedCountry.code}${phone}`;
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
      email: email.trim().toLowerCase(),
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
    // Track registration event
    trackEvent('register', { userId: account.id, userName: account.name, userRole: account.role });

    // Save active student ID for instant report and profile switcher binding
    if (typeof window !== 'undefined') {
      localStorage.setItem('masar_active_student_id', matchingStudent.id);
      localStorage.setItem('masar_active_mode', accountType === 'parent' ? 'parent' : 'student');
      localStorage.setItem('masar.current-student-id', matchingStudent.id);
    }

    setTimeout(() => {
      if (accountType === 'parent') {
        // Parent accounts go straight to their dashboard
        router.push('/parent');
      } else {
        // Student accounts start wizard
        router.push('/student/new');
      }
    }, 600);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-gradient-to-br from-teal-50/80 via-slate-50 to-emerald-50/70 p-4 py-10 text-slate-900" dir="rtl">
      
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
            onClick={() => {
              setAccountType('parent');
              setErrors({});
            }}
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
            onClick={() => {
              setAccountType('student');
              setErrors({});
            }}
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
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          
          {accountType === 'parent' ? (
            <>
              <Field
                label="اسم ولي الأمر (الكامل الثلاثي)"
                value={parentName}
                onChange={(val) => {
                  setParentName(val);
                  if (errors.parentName) setErrors((e) => ({ ...e, parentName: '' }));
                }}
                placeholder="مثال: أحمد محمد علي"
                error={errors.parentName}
                hint="يجب أن يتكون اسم ولي الأمر من 3 أسماء على الأقل"
                required
              />

              <Field
                label="اسم الطالب / الطفل (الكامل الرباعي)"
                value={childName}
                onChange={(val) => {
                  setChildName(val);
                  if (errors.childName) setErrors((e) => ({ ...e, childName: '' }));
                }}
                placeholder="مثال: يوسف أحمد محمد علي"
                error={errors.childName}
                hint="يجب أن يتكون اسم الطالب من 4 أسماء على الأقل"
                required
              />
            </>
          ) : (
            <Field
              label="اسم الطالب (الكامل الرباعي)"
              value={childName}
              onChange={(val) => {
                setChildName(val);
                if (errors.childName) setErrors((e) => ({ ...e, childName: '' }));
              }}
              placeholder="مثال: يوسف أحمد محمد علي"
              error={errors.childName}
              hint="يجب أن يتكون اسم الطالب من 4 أسماء على الأقل"
              required
            />
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

          {/* Email Field */}
          <Field
            label="البريد الإلكتروني"
            value={email}
            onChange={(val) => {
              setEmail(val);
              if (errors.email) setErrors((e) => ({ ...e, email: '' }));
            }}
            placeholder="name@example.com"
            type="email"
            error={errors.email}
            hint="يجب أن يحتوي على @ وينتهي بـ .com"
            required
          />

          {/* Phone Field with Modern Country Selector */}
          <div className="block">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-black text-slate-700">رقم الهاتف / الواتساب</span>
              <span className="text-[11px] font-bold text-slate-400">اختر الدولة واكتب الرقم</span>
            </div>

            <div className="relative flex items-center rounded-xl border border-slate-200 bg-slate-50 focus-within:border-teal-600 focus-within:bg-white transition">
              
              {/* Country Trigger Button */}
              <button
                type="button"
                onClick={() => setCountryPickerOpen(!countryPickerOpen)}
                className="flex items-center gap-1.5 shrink-0 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-3 rounded-r-xl border-l border-slate-200 font-bold text-xs transition cursor-pointer"
                title="اختر الدولة"
              >
                <span className="text-lg leading-none">{selectedCountry.flag}</span>
                <span className="font-black text-slate-900" dir="ltr">{selectedCountry.code}</span>
                <ChevronDown size={14} className="text-slate-500" />
              </button>

              {/* Phone Input */}
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (errors.phone) setErrors((e) => ({ ...e, phone: '' }));
                }}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
                placeholder={`مثال: ${selectedCountry.example}`}
                required
              />

              {/* Country Picker Dropdown Modal / Popover */}
              {countryPickerOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setCountryPickerOpen(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 z-50 w-72 max-h-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl overflow-hidden flex flex-col text-right">
                    {/* Search input inside dropdown */}
                    <div className="relative mb-2 shrink-0">
                      <Search size={14} className="absolute right-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        placeholder="ابحث عن دولة أو كود..."
                        className="w-full rounded-xl bg-slate-100 pr-8 pl-3 py-2 text-xs font-bold text-slate-900 outline-none focus:bg-slate-50 border border-slate-200"
                        autoFocus
                      />
                    </div>

                    {/* Countries List */}
                    <div className="flex-1 overflow-y-auto space-y-1">
                      {filteredCountries.length === 0 ? (
                        <p className="p-3 text-center text-xs font-bold text-slate-400">لا توجد نتائج</p>
                      ) : (
                        filteredCountries.map((c) => {
                          const isSelected = selectedCountry.code === c.code && selectedCountry.name === c.name;
                          return (
                            <button
                              key={`${c.name}-${c.code}`}
                              type="button"
                              onClick={() => {
                                setSelectedCountry(c);
                                setCountryPickerOpen(false);
                                setCountrySearch('');
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition ${
                                isSelected
                                  ? 'bg-teal-50 text-teal-800 font-black'
                                  : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-base leading-none">{c.flag}</span>
                                <span className="truncate">{c.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-black text-slate-500" dir="ltr">{c.code}</span>
                                {isSelected && <Check size={14} className="text-teal-600 shrink-0" />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {errors.phone && (
              <p className="mt-1 flex items-center gap-1 text-xs font-bold text-rose-600">
                <AlertCircle size={13} />
                <span>{errors.phone}</span>
              </p>
            )}
          </div>

          {/* Password Field */}
          <Field
            label="كلمة المرور"
            value={password}
            onChange={(val) => {
              setPassword(val);
              if (errors.password) setErrors((e) => ({ ...e, password: '' }));
            }}
            placeholder="اكتب كلمة مرور قوية"
            type="password"
            error={errors.password}
            required
          />

          <button 
            type="submit" 
            disabled={loading} 
            className="focus-ring flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 font-black text-white hover:bg-teal-700 transition shadow-md shadow-teal-600/20 active:scale-95 disabled:opacity-60 cursor-pointer mt-2"
          >
            <UserPlus size={18} />
            {loading ? 'جاري التحقق وإنشاء الحساب...' : 'إنشاء الحساب ودخول المنصة'}
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
  error,
  hint,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <label className="block text-right">
      <span className="mb-1.5 block text-xs sm:text-sm font-black text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none transition ${
          error
            ? 'border-rose-400 bg-rose-50/50 text-slate-900 focus:border-rose-600'
            : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-teal-600 focus:bg-white'
        }`}
        placeholder={placeholder}
        required={required}
      />
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-rose-600">
          <AlertCircle size={13} className="shrink-0" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="mt-1 text-[11px] font-bold text-slate-400">{hint}</p>
      ) : null}
    </label>
  );
}
