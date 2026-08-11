'use client';

import { FormEvent, useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserPlus, GraduationCap, HeartHandshake, Search, ChevronDown, Check, AlertCircle, Loader2 } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { saveCredential, signInWithGoogle, handleGoogleRedirectResult, signInWithApple, signInWithMicrosoft } from '@/lib/auth';
import { getAccounts, getStudents, saveAccount, saveStudent, setSession, clearSession, updateStudent } from '@/lib/localDb';
import { pullCloudDataToLocal } from '@/lib/firestoreSync';
import { trackEvent } from '@/lib/analyticsTracker';

// Google icon SVG (official brand colors)
function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// Apple icon SVG
function AppleIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.32c.67-.82 1.12-1.96.99-3.11-.97.04-2.14.65-2.83 1.46-.62.72-1.16 1.88-1.01 3.01 1.08.08 2.18-.54 2.85-1.36z" />
    </svg>
  );
}

// Microsoft icon SVG
function MicrosoftIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 23 23" aria-hidden="true">
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  );
}

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
  const [schoolBranch, setSchoolBranch] = useState<'MASAR' | 'IKHLAS_JEDDAH'>('MASAR');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  // ─── Microsoft Sign-Up ───────────────────────────────────────────────────────
  const handleMicrosoftSignUp = async () => {
    setMsLoading(true);
    setGoogleError('');

    const role = accountType === 'teacher' ? 'teacher' : accountType === 'student' ? 'student' : 'parent';
    const result = await signInWithMicrosoft(role as import('@/lib/localDb').UserRole, schoolBranch);

    setMsLoading(false);

    if (result.ok) {
      setSession(result.account);
      if (typeof window !== 'undefined') {
        localStorage.setItem('masar_school_branch', schoolBranch);
        localStorage.setItem('masar_active_mode', accountType);
      }
      trackEvent('register_google', { userId: result.account.id, isNew: result.isNew });

      if (schoolBranch === 'IKHLAS_JEDDAH') {
        if (accountType === 'parent') router.push('/school-parent');
        else if (accountType === 'student') router.push('/school-student/setup');
        else router.push('/branches/ikhlas-jeddah');
      } else {
        router.push(accountType === 'parent' ? '/parent' : '/student/new');
      }
    } else if (result.reason) {
      setGoogleError(result.reason);
    }
  };
  const [accountType, setAccountType] = useState<'parent' | 'student' | 'teacher'>('parent');

  // Form Fields
  const [parentName, setParentName] = useState('');
  const [childName, setChildName] = useState('');
  const [grade, setGrade] = useState(grades[0]);
  const [email, setEmail] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(ALL_COUNTRIES[0]);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Track field touch status for instant live error feedback
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  // Pull latest accounts from Firestore on mount so duplicate checks are always accurate
  useEffect(() => {
    pullCloudDataToLocal().catch(() => {});
    handleGoogleRedirectResult('parent', schoolBranch).then((result) => {
      if (result && result.ok) {
        setSession(result.account);
        router.push(accountType === 'parent' ? '/parent' : '/student/new');
      }
    });
  }, [accountType, router, schoolBranch]);

  // ─── Google Sign-Up ──────────────────────────────────────────────────────────
  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setGoogleError('');

    const role = accountType === 'teacher' ? 'teacher' : accountType === 'student' ? 'student' : 'parent';
    const result = await signInWithGoogle(role as import('@/lib/localDb').UserRole, schoolBranch);

    setGoogleLoading(false);

    if (result.ok) {
      setSession(result.account);
      if (typeof window !== 'undefined') {
        localStorage.setItem('masar_school_branch', schoolBranch);
        localStorage.setItem('masar_active_mode', accountType);
      }
      trackEvent('register_google', { userId: result.account.id, isNew: result.isNew });

      // Route based on branch + role
      if (schoolBranch === 'IKHLAS_JEDDAH') {
        if (accountType === 'parent') router.push('/school-parent');
        else if (accountType === 'student') router.push('/school-student/setup');
        else router.push('/branches/ikhlas-jeddah');
      } else {
        router.push(accountType === 'parent' ? '/parent' : '/student/new');
      }
    } else if (result.reason) {
      setGoogleError(result.reason);
    }
  };

  // ─── Apple Sign-Up ───────────────────────────────────────────────────────────
  const handleAppleSignUp = async () => {
    setAppleLoading(true);
    setGoogleError('');

    const role = accountType === 'teacher' ? 'teacher' : accountType === 'student' ? 'student' : 'parent';
    const result = await signInWithApple(role as import('@/lib/localDb').UserRole, schoolBranch);

    setAppleLoading(false);

    if (result.ok) {
      setSession(result.account);
      if (typeof window !== 'undefined') {
        localStorage.setItem('masar_school_branch', schoolBranch);
        localStorage.setItem('masar_active_mode', accountType);
      }
      trackEvent('register_google', { userId: result.account.id, isNew: result.isNew });

      if (schoolBranch === 'IKHLAS_JEDDAH') {
        if (accountType === 'parent') router.push('/school-parent');
        else if (accountType === 'student') router.push('/school-student/setup');
        else router.push('/branches/ikhlas-jeddah');
      } else {
        router.push(accountType === 'parent' ? '/parent' : '/student/new');
      }
    } else if (result.reason) {
      setGoogleError(result.reason);
    }
  };

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return ALL_COUNTRIES;
    const q = countrySearch.trim().toLowerCase();
    return ALL_COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.includes(q)
    );
  }, [countrySearch]);

  const countWords = (str: string) => str.trim().split(/\s+/).filter(Boolean).length;

  // Live Evaluated Errors
  const getParentNameError = (): string => {
    if (accountType !== 'parent') return '';
    if (!parentName.trim()) return 'اسم ولي الأمر مطلوب';
    if (countWords(parentName) < 3) return 'اسم ولي الأمر غير مكتمل، يجب كتابة 3 أسماء على الأقل (مثال: أحمد محمد علي)';
    return '';
  };

  const getChildNameError = (): string => {
    if (accountType === 'teacher') return '';
    if (!childName.trim()) return accountType === 'parent' ? 'اسم الطالب مطلوب' : 'اسم الطالب الكامل مطلوب';
    if (countWords(childName) < 4) return 'اسم الطالب غير مكتمل، يجب كتابة 4 أسماء على الأقل (مثال: يوسف أحمد محمد علي)';
    return '';
  };

  const getEmailError = (): string => {
    const clean = email.trim().toLowerCase();
    if (!clean) return 'البريد الإلكتروني مطلوب';
    if (!clean.includes('@')) return 'البريد الإلكتروني ينقصه علامة @ (مثال: name@example.com)';
    if (!clean.endsWith('.com')) return 'البريد الإلكتروني يجب أن ينتهي بـ .com (مثال: name@example.com)';
    const regex = /^[^\s@]+@[^\s@]+\.com$/;
    if (!regex.test(clean)) return 'صيغة البريد غير صحيحة (مثال: name@example.com)';
    
    // Duplicate check
    const accounts = getAccounts();
    if (accounts.some((a) => a.email.toLowerCase() === clean)) {
      return 'هذا البريد الإلكتروني مسجل بالفعل لدى حساب آخر. يمكنك تسجيل الدخول بدلاً من ذلك.';
    }
    return '';
  };

  const getPhoneError = (): string => {
    const clean = phone.replace(/\D/g, '');
    if (!clean) return 'رقم الهاتف / الواتساب مطلوب';
    if (clean.length < 8) return 'رقم الهاتف ناقص، يرجى كتابة الرقم كاملاً (8 أرقام على الأقل)';
    // Duplicate phone check
    const fullPhone = `${selectedCountry.code}${phone}`;
    const accounts = getAccounts();
    if (accounts.some((a) => a.phone && (a.phone === fullPhone || a.phone.includes(clean)))) {
      return 'رقم الهاتف مسجّل بالفعل مع حساب آخر. يمكنك تسجيل الدخول بدلاً من ذلك.';
    }
    return '';
  };

  const getPasswordError = (): string => {
    if (!password) return 'كلمة المرور مطلوبة';
    if (password.length < 6) return 'كلمة المرور ضعيفة جداً، يجب كتابة 6 أحرف/أرقام على الأقل';
    return '';
  };

  // Errors map for display
  const errors = useMemo(() => {
    return {
      parentName: getParentNameError(),
      childName: getChildNameError(),
      email: getEmailError(),
      phone: getPhoneError(),
      password: getPasswordError(),
    };
  }, [parentName, childName, email, phone, password, accountType, selectedCountry]);

  const hasErrors = useMemo(() => {
    if (accountType === 'parent' && errors.parentName) return true;
    if (accountType !== 'teacher' && errors.childName) return true;
    return !!(errors.email || errors.phone || errors.password);
  }, [errors, accountType]);

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setTouched({
      parentName: true,
      childName: true,
      email: true,
      phone: true,
      password: true,
    });

    if (hasErrors) {
      return;
    }

    setLoading(true);

    const fullPhone = `${selectedCountry.code}${phone}`;
    const primaryName = accountType === 'parent' ? parentName : accountType === 'teacher' ? (parentName || 'معلم') : childName;

    // Clear any existing session (e.g. a previous doctor demo session)
    // so that the new parent/student account starts fresh
    if (typeof window !== 'undefined') {
      clearSession();
      localStorage.removeItem('masar.current-student-id');
      localStorage.removeItem('masar_active_student_id');
      localStorage.removeItem('masar_active_mode');
    }

    const account = saveAccount({
      name: primaryName,
      email: email.trim().toLowerCase(),
      phone: fullPhone,
      role: accountType === 'parent' ? 'parent' : accountType === 'teacher' ? 'teacher' : 'student',
      schoolBranch,
    });

    if (typeof window !== 'undefined') {
      localStorage.setItem('masar_account_type', accountType);
      localStorage.setItem('masar_school_branch', schoolBranch);
      localStorage.setItem('masar_registered_email', email.trim().toLowerCase());
    }

    const allStudents = getStudents();
    const normalizedParentName = parentName.trim().toLowerCase();
    const normalizedChildName = childName.trim().toLowerCase();

    let matchingStudent = allStudents.find((s) => {
      if (phone && s.parentPhone && s.parentPhone.includes(phone)) return true;
      if (normalizedParentName && s.parentName && s.parentName.trim().toLowerCase() === normalizedParentName) return true;
      if (normalizedChildName && s.fullName && s.fullName.trim().toLowerCase() === normalizedChildName) return true;
      return false;
    });

    if (matchingStudent) {
      updateStudent(matchingStudent.id, {
        parentName: parentName || matchingStudent.parentName,
        parentPhone: fullPhone || matchingStudent.parentPhone,
      });
    } else if (accountType !== 'teacher') {
      matchingStudent = saveStudent({
        fullName: childName || `طالب ${parentName}`,
        grade: schoolBranch === 'IKHLAS_JEDDAH' ? 'الصف الأول الابتدائي' : grade,
        parentName: parentName,
        parentPhone: fullPhone,
        source: 'student-wizard',
        reviewStatus: 'awaiting-survey',
      });
    }

    setSession(account);
    saveCredential(account, password);
    trackEvent('register', { userId: account.id, userName: account.name, userRole: account.role });

    if (typeof window !== 'undefined' && matchingStudent) {
      localStorage.setItem('masar_active_student_id', matchingStudent.id);
      localStorage.setItem('masar_active_mode', accountType);
      localStorage.setItem('masar.current-student-id', matchingStudent.id);
    }

    setTimeout(() => {
      if (schoolBranch === 'IKHLAS_JEDDAH') {
        if (accountType === 'parent') {
          router.push('/school-parent');
        } else if (accountType === 'student') {
          router.push('/school-student/setup');
        } else {
          router.push('/branches/ikhlas-jeddah');
        }
      } else {
        if (accountType === 'parent') {
          router.push('/parent');
        } else {
          router.push('/student/new');
        }
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

        {/* ── Social Sign-Up Buttons ── */}
        {googleError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-xs font-bold text-rose-700">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <span>{googleError}</span>
          </div>
        )}

        <button
          type="button"
          id="btn-google-register"
          onClick={handleGoogleSignUp}
          disabled={googleLoading}
          className="w-full mt-4 flex items-center justify-center gap-3 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 font-black text-sm transition-all shadow-sm border border-slate-300 active:scale-95 disabled:opacity-60"
        >
          {googleLoading ? (
            <Loader2 size={20} className="animate-spin text-slate-500" />
          ) : (
            <GoogleIcon size={20} />
          )}
          <span>{googleLoading ? 'جارٍ إنشاء الحساب...' : 'إنشاء حساب بـ Google — بضغطة واحدة'}</span>
        </button>

        <div className="relative mt-5 mb-1 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <span className="relative bg-white px-3 text-[10px] font-black text-slate-400">
            أو أكمل بياناتك يدوياً
          </span>
        </div>

        {/* School Branch Selector */}
        <div className="mt-5 space-y-2">
          <label className="block text-xs font-black text-slate-700">المؤسسة / المدرسة التابع لها:</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => { setSchoolBranch('MASAR'); if (accountType === 'teacher') setAccountType('parent'); }}
              className={`p-3 rounded-2xl border text-xs font-black text-center transition-all ${
                schoolBranch === 'MASAR'
                  ? 'bg-teal-700 text-white border-teal-700 shadow-md'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              🎯 منصة مَسَار التعليمية
            </button>
            <button
              type="button"
              onClick={() => setSchoolBranch('IKHLAS_JEDDAH')}
              className={`p-3 rounded-2xl border text-xs font-black text-center transition-all ${
                schoolBranch === 'IKHLAS_JEDDAH'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-md'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              🇸🇦 مدارس الإخلاص بجدة
            </button>
          </div>
        </div>

        {/* Account Type Selector Tabs */}
        <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1 border border-slate-200">
          <button
            type="button"
            onClick={() => setAccountType('parent')}
            className={`flex items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-black transition ${
              accountType === 'parent'
                ? 'bg-teal-700 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <HeartHandshake size={15} />
            <span>ولي أمر</span>
          </button>

          <button
            type="button"
            onClick={() => setAccountType('student')}
            className={`flex items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-black transition ${
              accountType === 'student'
                ? 'bg-teal-700 text-white shadow-md'
                : 'text-slate-700 hover:bg-slate-200'
            }`}
          >
            <GraduationCap size={15} />
            <span>طالب</span>
          </button>

          {schoolBranch === 'IKHLAS_JEDDAH' && (
            <button
              type="button"
              onClick={() => setAccountType('teacher')}
              className={`flex items-center justify-center gap-1 rounded-xl py-2.5 text-xs font-black transition ${
                accountType === 'teacher'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              <UserPlus size={15} />
              <span>معلم</span>
            </button>
          )}
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
                  markTouched('parentName');
                }}
                onBlur={() => markTouched('parentName')}
                placeholder="مثال: أحمد محمد علي"
                error={(touched.parentName || submitted) ? errors.parentName : ''}
              />

              <Field
                label="اسم الطالب / الطفل (الكامل الرباعي)"
                value={childName}
                onChange={(val) => {
                  setChildName(val);
                  markTouched('childName');
                }}
                onBlur={() => markTouched('childName')}
                placeholder="مثال: يوسف أحمد محمد علي"
                error={(touched.childName || submitted) ? errors.childName : ''}
              />
            </>
          ) : (
            <Field
              label="اسم الطالب (الكامل الرباعي)"
              value={childName}
              onChange={(val) => {
                setChildName(val);
                markTouched('childName');
              }}
              onBlur={() => markTouched('childName')}
              placeholder="مثال: يوسف أحمد محمد علي"
              error={(touched.childName || submitted) ? errors.childName : ''}
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
              markTouched('email');
            }}
            onBlur={() => markTouched('email')}
            placeholder="name@example.com"
            type="email"
            error={(touched.email || submitted) ? errors.email : ''}
          />

          {/* Phone Field with Modern Country Selector */}
          <div className="block text-right">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm font-black text-slate-700">رقم الهاتف / الواتساب</span>
              <span className="text-[11px] font-bold text-slate-400">اختر الدولة واكتب الرقم</span>
            </div>

            <div className={`relative flex items-center rounded-xl border bg-slate-50 transition ${
              (touched.phone || submitted) && errors.phone
                ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20'
                : 'border-slate-200 focus-within:border-teal-600 focus-within:bg-white'
            }`}>
              
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
                  markTouched('phone');
                }}
                onBlur={() => markTouched('phone')}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
                placeholder={`مثال: ${selectedCountry.example}`}
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

            {(touched.phone || submitted) && errors.phone && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-black text-rose-600">
                <AlertCircle size={14} className="shrink-0" />
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
              markTouched('password');
            }}
            onBlur={() => markTouched('password')}
            placeholder="اكتب كلمة مرور قوية"
            type="password"
            error={(touched.password || submitted) ? errors.password : ''}
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
  onBlur,
  placeholder,
  type = 'text',
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  error?: string;
}) {
  return (
    <label className="block text-right">
      <span className="mb-1.5 block text-xs sm:text-sm font-black text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={`w-full rounded-xl border px-4 py-3 text-sm font-bold outline-none transition ${
          error
            ? 'border-rose-500 bg-rose-50/50 text-slate-900 ring-2 ring-rose-500/20 focus:border-rose-600'
            : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-teal-600 focus:bg-white'
        }`}
        placeholder={placeholder}
      />
      {error ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-black text-rose-600">
          <AlertCircle size={14} className="shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </label>
  );
}
