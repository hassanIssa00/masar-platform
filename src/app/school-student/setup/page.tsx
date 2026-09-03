'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  Calendar, Camera, Upload, Check, Sparkles, ArrowLeft, Loader2, User,
  IdCard, GraduationCap, Phone, Mail, FileText, CheckCircle2
} from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import {
  getSession, getStudents, hydrateSessionFromServer, updateStudent,
  saveStudent, StudentRecord, setSession
} from '@/lib/cloudStore';
import { pullCloudDataToLocal, syncDocToCloud } from '@/lib/firestoreSync';

// Preset avatar options for quick selection
const PRESET_AVATARS = [
  { id: 'av1', emoji: '🚀', label: 'رائد الفضاء', bg: 'from-blue-500 to-indigo-600' },
  { id: 'av2', emoji: '🦁', label: 'الأسد الشجاع', bg: 'from-amber-400 to-orange-500' },
  { id: 'av3', emoji: '🎓', label: 'العبقري الصغير', bg: 'from-emerald-400 to-teal-600' },
  { id: 'av4', emoji: '⚽', label: 'النجم الرياضي', bg: 'from-green-500 to-emerald-700' },
  { id: 'av5', emoji: '🎨', label: 'الفنان المبدع', bg: 'from-pink-500 to-rose-600' },
  { id: 'av6', emoji: '👑', label: 'البطل الملكي', bg: 'from-purple-500 to-violet-600' },
  { id: 'av7', emoji: '🦸', label: 'البطل الخارق', bg: 'from-cyan-500 to-blue-600' },
  { id: 'av8', emoji: '🐬', label: 'الدلفين الذكي', bg: 'from-teal-400 to-cyan-600' },
];

const ARABIC_MONTHS = [
  { value: '01', label: '01 - يناير' },
  { value: '02', label: '02 - فبراير' },
  { value: '03', label: '03 - مارس' },
  { value: '04', label: '04 - إبريل' },
  { value: '05', label: '05 - مايو' },
  { value: '06', label: '06 - يونيو' },
  { value: '07', label: '07 - يوليو' },
  { value: '08', label: '08 - أغسطس' },
  { value: '09', label: '09 - سبتمبر' },
  { value: '10', label: '10 - أكتوبر' },
  { value: '11', label: '11 - نوفمبر' },
  { value: '12', label: '12 - ديسمبر' },
];

const GRADES = [
  'الروضة',
  'الصف الأول',
  'الصف الثاني',
  'الصف الثالث',
  'الصف الرابع',
  'الصف الخامس',
  'الصف السادس',
  'صعوبات التعلم',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 20 }, (_, i) => String(currentYear - 3 - i));
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

export default function StudentSetupPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentRecord | null>(null);

  // Student Fields
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [grade, setGrade] = useState('الصف الأول');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Date of Birth fields (Day, Month, Year)
  const [birthDay, setBirthDay] = useState('15');
  const [birthMonth, setBirthMonth] = useState('05');
  const [birthYear, setBirthYear] = useState('2018');

  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].id);
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadSetup = async () => {
      await pullCloudDataToLocal(['students', 'accounts', 'reports', 'classStudents']).catch(() => {});
      if (cancelled) return;

      const session = getSession() ?? await hydrateSessionFromServer();
      if (cancelled) return;
      if (!session) {
        router.replace('/login');
        return;
      }

      const students = getStudents();
      const email = session.email?.trim().toLowerCase() ?? '';
      const phone = session.phone?.replace(/\D/g, '') ?? '';
      const sName = session.name?.trim().toLowerCase() ?? '';

      const linked = students.find((s) => {
        const record = s as StudentRecord & { email?: string; parentEmail?: string };
        const pPhone = s.parentPhone?.replace(/\D/g, '') ?? '';
        if (session.id && s.id === session.id) return true;
        if (s.fullName && s.fullName.trim().toLowerCase() === sName) return true;
        if (s.fullName && sName && (s.fullName.includes(sName) || sName.includes(s.fullName))) return true;
        if (email && (record.email?.trim().toLowerCase() === email || record.parentEmail?.trim().toLowerCase() === email)) return true;
        if (phone && pPhone.includes(phone)) return true;
        return false;
      }) || null; // Never fall back to a random student

      if (linked) {
        setStudent(linked);
        setFullName(linked.fullName || session.name || '');
        setNationalId(linked.nationalId || '');
        setGrade(linked.grade || 'الصف الأول');
        setParentName(linked.parentName || '');
        setParentPhone(linked.parentPhone || session.phone || '');
        // Only pre-fill recoveryEmail if it looks like a real human email (not auto-generated)
        const rawEmail = (linked as any).recoveryEmail || (linked as any).email || '';
        const isAutoGenEmail = rawEmail.includes('student.') || rawEmail.includes('student.ikhlas') || rawEmail.includes('@masarplatform.org');
        setRecoveryEmail(isAutoGenEmail ? '' : rawEmail);
        setNotes((linked as any).notes || '');

        if (linked.dateOfBirth) {
          const parts = linked.dateOfBirth.split('-');
          if (parts.length === 3) {
            setBirthYear(parts[0]);
            setBirthMonth(parts[1].padStart(2, '0'));
            setBirthDay(parts[2].padStart(2, '0'));
          }
        }
        if (linked.photoUrl) {
          if (linked.photoUrl.startsWith('data:image') || linked.photoUrl.startsWith('http')) {
            setCustomPhoto(linked.photoUrl);
          } else {
            const matchAv = PRESET_AVATARS.find((av) => av.emoji === linked.photoUrl || av.id === linked.photoUrl);
            if (matchAv) setSelectedAvatar(matchAv.id);
          }
        }
      } else {
        // New user — only pre-fill from session if the name looks real (not "طالب جديد" etc.)
        const nameIsReal = session.name && !session.name.includes('جديد') && !session.name.includes('طالب');
        if (nameIsReal) setFullName(session.name!);
        if (session.phone) setParentPhone(session.phone);
        // Don't pre-fill email — let user enter it manually
      }
    };
    void loadSetup();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Formatted ISO date & dynamic age calculation
  const formattedDob = `${birthYear}-${birthMonth}-${birthDay}`;
  const calculatedAge = (() => {
    try {
      const birth = new Date(`${birthYear}-${birthMonth}-${birthDay}`);
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const m = now.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
        age--;
      }
      return age >= 0 ? age : null;
    } catch {
      return null;
    }
  })();

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 5 ميجابايت.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setCustomPhoto(reader.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('يرجى كتابة اسم الطالب الرباعي كاملاً.');
      return;
    }
    if (!parentPhone.trim()) {
      setError('يرجى إدخال رقم هاتف ولي الأمر للتواصل ومتابعة الخطة.');
      return;
    }

    setLoading(true);
    setError('');

    const photoUrlToSave = customPhoto || PRESET_AVATARS.find((av) => av.id === selectedAvatar)?.emoji || '🎓';

    let savedRec: StudentRecord;
    if (student) {
      savedRec = updateStudent(student.id, {
        fullName: fullName.trim(),
        nationalId: nationalId.trim(),
        grade,
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        dateOfBirth: formattedDob,
        photoUrl: photoUrlToSave,
        ...({ recoveryEmail: recoveryEmail.trim(), notes: notes.trim() } as any),
      }) ?? student;
    } else {
      savedRec = saveStudent({
        fullName: fullName.trim(),
        nationalId: nationalId.trim(),
        grade,
        parentName: parentName.trim(),
        parentPhone: parentPhone.trim(),
        dateOfBirth: formattedDob,
        photoUrl: photoUrlToSave,
        reviewStatus: 'awaiting-doctor-review',
        source: 'student-wizard',
      });
    }

    await syncDocToCloud('students', savedRec.id, savedRec).catch(() => {});

    // Update active session name if needed
    const currentSession = getSession();
    if (currentSession && currentSession.role === 'student') {
      setSession({
        ...currentSession,
        name: fullName.trim(),
        phone: parentPhone.trim(),
      });
    }

    setSuccess(true);

    setTimeout(() => {
      router.push('/school-student');
    }, 800);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden bg-gradient-to-br from-teal-50/80 via-slate-50 to-emerald-50/70 p-4 py-10 text-slate-900" dir="rtl">
      {/* Background Soft Glows */}
      <div className="fixed top-10 right-10 w-96 h-96 bg-teal-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed bottom-10 left-10 w-96 h-96 bg-emerald-200/30 rounded-full blur-[120px] pointer-events-none" />

      <main className="relative w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-2xl text-right z-10">
        {/* Brand Header */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <BrandMark size="lg" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-black text-emerald-800 border border-emerald-200">
            <Sparkles size={14} className="text-emerald-600" />
            <span>
              {student?.schoolBranch === 'IKHLAS_JEDDAH' ? 'منصة مسار — فصل د. إسماعيل عيسى' : 'منصة مَسَار التعليمية الذكية'}
            </span>
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">
            استكمال بيانات ملف الطالب 🌟
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm font-bold text-slate-500">
            يرجى التأكد من صحة بيانات الطالب وولي الأمر لإعداد الحساب المباشر والخطة التعليمية
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          
          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-black text-rose-700 text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-black text-emerald-800 text-center flex items-center justify-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>تم حفظ وتحديث بيانات الطالب بنجاح! جاري التوجيه للوحة التحكم...</span>
            </div>
          )}

          {/* Section 1: Basic Student Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <User size={18} className="text-teal-700" />
              <span>البيانات الأساسية للطالب</span>
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Full Name */}
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-xs font-black text-slate-700">
                  اسم الطالب الرباعي <span className="text-rose-500">*</span>
                </span>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="الاسم الرباعي كاملاً"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 transition"
                />
              </label>

              {/* National ID */}
              <label className="block">
                <span className="mb-2 block text-xs font-black text-slate-700">
                  رقم الهوية الوطنية / الإقامة (10 أرقام)
                </span>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={10}
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                    placeholder="10 أرقام"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-mono font-black text-slate-900 outline-none focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 transition"
                  />
                  <IdCard size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </label>

              {/* Grade Selector */}
              <label className="block">
                <span className="mb-2 block text-xs font-black text-slate-700">
                  الصف الدراسي / المستوى <span className="text-rose-500">*</span>
                </span>
                <div className="relative">
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 transition cursor-pointer"
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  <GraduationCap size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </label>
            </div>
          </div>

          {/* Section 2: Accurate Arabic Date of Birth Selector (No mangled characters) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <label className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Calendar size={18} className="text-teal-700" />
                <span>تاريخ الميلاد الكامل</span>
              </label>
              {calculatedAge !== null && calculatedAge >= 0 && (
                <span className="rounded-full bg-teal-50 border border-teal-200 px-3 py-1 text-xs font-black text-teal-800">
                  🎂 العمر: {calculatedAge} سنوات
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {/* Day */}
              <div>
                <span className="block text-[11px] font-black text-slate-500 mb-1.5">اليوم</span>
                <select
                  value={birthDay}
                  onChange={(e) => setBirthDay(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-teal-600 transition cursor-pointer"
                >
                  {DAYS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month */}
              <div>
                <span className="block text-[11px] font-black text-slate-500 mb-1.5">الشهر</span>
                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-teal-600 transition cursor-pointer"
                >
                  {ARABIC_MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <span className="block text-[11px] font-black text-slate-500 mb-1.5">السنة</span>
                <select
                  value={birthYear}
                  onChange={(e) => setBirthYear(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-teal-600 transition cursor-pointer"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="text-[11px] font-bold text-slate-400">
              التاريخ المعتمد: <span className="font-mono font-black text-slate-700">{formattedDob}</span>
            </p>
          </div>

          {/* Section 3: Parent Contact Info */}
          <div className="space-y-4 pt-2">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Phone size={18} className="text-teal-700" />
              <span>بيانات ولي الأمر والتواصل</span>
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Parent Name */}
              <label className="block">
                <span className="mb-2 block text-xs font-black text-slate-700">
                  اسم ولي الأمر الرباعي
                </span>
                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="اسم ولي الأمر الرباعي كاملاً"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 transition"
                />
              </label>

              {/* Parent Phone */}
              <label className="block">
                <span className="mb-2 block text-xs font-black text-slate-700">
                  رقم هاتف ولي الأمر <span className="text-rose-500">*</span>
                </span>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    placeholder="رقم الجوال"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-mono font-black text-slate-900 outline-none focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 transition"
                  />
                  <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </label>

              {/* Recovery Email */}
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-xs font-black text-slate-700">
                  البريد الإلكتروني الاحتياطي (اختياري — لاستعادة الحساب)
                </span>
                <div className="relative">
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 transition text-left"
                    dir="ltr"
                  />
                  <Mail size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </label>
            </div>
          </div>

          {/* Section 4: Photo / Avatar Selection */}
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Camera size={18} className="text-teal-700" />
              <span>الصورة الشخصية أو رمز الآفتار</span>
            </h3>

            {/* Live Preview */}
            <div className="flex justify-center my-3">
              <div className="relative w-24 h-24 rounded-full bg-teal-50 border-4 border-emerald-500 shadow-xl flex items-center justify-center overflow-hidden text-4xl">
                {customPhoto ? (
                  <img src={customPhoto} alt="صورة الطالب" className="w-full h-full object-cover" />
                ) : (
                  <span>
                    {PRESET_AVATARS.find((av) => av.id === selectedAvatar)?.emoji || '🎓'}
                  </span>
                )}
              </div>
            </div>

            {/* Custom Upload Button */}
            <div className="flex justify-center">
              <label className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 px-5 py-3 text-xs font-black text-slate-800 cursor-pointer transition shadow-sm">
                <Upload size={16} className="text-teal-600" />
                <span>رفع صورة الطالب من جهازك</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Preset Avatars Grid */}
            <div className="pt-2">
              <p className="text-[11px] font-bold text-slate-500 mb-2.5 text-center">أو اختر رمز آفتار مميز للطفل:</p>
              <div className="grid grid-cols-4 gap-2.5">
                {PRESET_AVATARS.map((av) => {
                  const isSelected = !customPhoto && selectedAvatar === av.id;
                  return (
                    <button
                      key={av.id}
                      type="button"
                      onClick={() => {
                        setSelectedAvatar(av.id);
                        setCustomPhoto(null);
                      }}
                      className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border transition cursor-pointer ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 shadow-md scale-105 ring-2 ring-emerald-500/20'
                          : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                      }`}
                    >
                      <span className="text-2xl mb-1">{av.emoji}</span>
                      <span className="text-[10px] font-black text-slate-700 truncate w-full text-center">{av.label}</span>
                      {isSelected && (
                        <span className="absolute -top-1 -left-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-sm">
                          <Check size={12} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || success}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 px-6 py-4 text-sm font-black text-white shadow-xl shadow-teal-700/20 transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>جاري الحفظ والمزامنة...</span>
                </>
              ) : (
                <>
                  <span>حفظ البيانات ومتابعة إلى لوحة التحكم</span>
                  <ArrowLeft size={18} />
                </>
              )}
            </button>
          </div>

        </form>
      </main>
    </div>
  );
}
