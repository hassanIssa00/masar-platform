'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Camera, Upload, Check, Sparkles, ArrowLeft, Loader2, User } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { getSession, getStudents, updateStudent, StudentRecord } from '@/lib/localDb';

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

export default function StudentSetupPage() {
  const router = useRouter();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0].id);
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session) {
      router.replace('/login');
      return;
    }

    const students = getStudents();
    const email = session.email?.trim().toLowerCase() ?? '';
    const phone = session.phone?.replace(/\D/g, '') ?? '';
    const linked = students.find((s) => {
      const record = s as StudentRecord & { email?: string; parentEmail?: string };
      const parentPhone = s.parentPhone?.replace(/\D/g, '') ?? '';
      if (session.id && s.id === session.id) return true;
      if (s.fullName === session.name) return true;
      if (email && (record.email?.trim().toLowerCase() === email || record.parentEmail?.trim().toLowerCase() === email)) return true;
      if (phone && parentPhone.includes(phone)) return true;
      return false;
    });
    
    if (linked) {
      setStudent(linked);
      if (linked.dateOfBirth) setDateOfBirth(linked.dateOfBirth);
      if (linked.photoUrl) {
        if (linked.photoUrl.startsWith('data:image')) {
          setCustomPhoto(linked.photoUrl);
        } else {
          const matchAv = PRESET_AVATARS.find((av) => av.emoji === linked.photoUrl || av.id === linked.photoUrl);
          if (matchAv) setSelectedAvatar(matchAv.id);
        }
      }
    }
  }, [router]);

  // Calculate age dynamically
  const calculatedAge = dateOfBirth ? Math.floor((new Date().getTime() - new Date(dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!dateOfBirth) {
      setError('يرجى تحديد تاريخ الميلاد لإنهاء الإعداد.');
      return;
    }

    setLoading(true);
    setError('');

    const photoUrlToSave = customPhoto || PRESET_AVATARS.find((av) => av.id === selectedAvatar)?.emoji || '🎓';

    if (student) {
      updateStudent(student.id, {
        dateOfBirth,
        photoUrl: photoUrlToSave,
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

      <main className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xl text-right z-10">
        {/* Brand Header */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <BrandMark size="lg" />
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-black text-emerald-800 border border-emerald-200">
            <Sparkles size={14} className="text-emerald-600" />
            <span>فصل د. إسماعيل عيسى</span>
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black text-slate-900">
            مرحباً بك يا بطل! 👋
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm font-bold text-slate-500">
            دعنا نكمّل ملفك الشخصي لإعداد حسابك المباشر في فصل د. إسماعيل عيسى
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          
          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-xs font-black text-rose-700 text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-black text-emerald-800 text-center flex items-center justify-center gap-2">
              <Check size={18} className="text-emerald-600" />
              <span>تم حفظ البيانات بنجاح! جاري التوجيه للوحة التحكم...</span>
            </div>
          )}

          {/* 1. Date of Birth Section */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-black text-slate-800">
              <Calendar size={16} className="text-teal-600" />
              <span>تاريخ الميلاد الكامل (مطلوب)</span>
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={dateOfBirth}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-black text-slate-900 outline-none focus:bg-white focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 transition cursor-pointer"
              />
            </div>
            {calculatedAge !== null && calculatedAge >= 0 && (
              <p className="text-xs font-black text-teal-700 flex items-center gap-1.5 mt-1">
                <span>🎂 العمر المحسوب: {calculatedAge} سنوات</span>
              </p>
            )}
          </div>

          {/* 2. Photo / Avatar Selection */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 text-xs font-black text-slate-800">
              <Camera size={16} className="text-teal-600" />
              <span>الصورة الشخصية أو رمز الآفتار</span>
            </label>

            {/* Live Preview */}
            <div className="flex justify-center my-2">
              <div className="relative w-24 h-24 rounded-full bg-teal-50 border-4 border-emerald-400 shadow-lg flex items-center justify-center overflow-hidden text-4xl">
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
              <label className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-300 px-4 py-2.5 text-xs font-black text-slate-800 cursor-pointer transition shadow-sm">
                <Upload size={16} className="text-teal-600" />
                <span>رفع صورة شخصية من جهازك</span>
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
              <p className="text-[11px] font-bold text-slate-500 mb-2.5 text-center">أو اختر رمز آفتار مميز يناسبك:</p>
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
                          ? 'border-emerald-600 bg-emerald-50 shadow-md scale-105'
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
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <span>حفظ ومتابعة إلى لوحة التحكم</span>
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
