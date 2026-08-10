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
    // Find linked student record by name or phone or active ID
    const activeId = localStorage.getItem('masar_active_student_id') || localStorage.getItem('masar.current-student-id');
    const linked = students.find((s) => s.id === activeId || s.fullName === session.name || s.parentPhone === session.phone);
    
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

    if (typeof window !== 'undefined') {
      localStorage.setItem('school_student_setup_done', 'true');
      if (photoUrlToSave) localStorage.setItem('student_photo_url', photoUrlToSave);
      if (dateOfBirth) localStorage.setItem('student_dob', dateOfBirth);
    }

    setSuccess(true);

    setTimeout(() => {
      router.push('/school-student');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden" dir="rtl">
      {/* Dynamic Background Effects */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
        {/* Brand Header */}
        <div className="flex justify-center mb-6">
          <BrandMark size="lg" />
        </div>

        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-black text-emerald-400 border border-emerald-500/20">
            <Sparkles size={14} />
            <span>مدارس الإخلاص الأهلية بجدة 🏫</span>
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-white">
            مرحباً بك يا بطل! 👋
          </h1>
          <p className="mt-2 text-xs sm:text-sm font-bold text-slate-300">
            دعنا نكمّل ملفك الشخصي لإعداد حسابك المباشر في فصل د. إسماعيل عيسى
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
        <form onSubmit={handleSubmit} className="bg-slate-800/90 backdrop-blur-xl border border-slate-700/80 py-8 px-6 shadow-2xl rounded-3xl sm:px-8 space-y-6">
          
          {error && (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 text-xs font-black text-rose-400 text-center">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-2xl bg-emerald-500/20 border border-emerald-500/40 p-4 text-xs font-black text-emerald-300 text-center flex items-center justify-center gap-2">
              <Check size={18} />
              <span>تم حفظ البيانات بنجاح! جاري التوجيه للوحة التحكم...</span>
            </div>
          )}

          {/* 1. Date of Birth Section */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-black text-slate-200">
              <Calendar size={16} className="text-emerald-400" />
              <span>تاريخ الميلاد الكامل (مطلوب)</span>
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={dateOfBirth}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/90 px-4 py-3.5 text-sm font-black text-white outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition cursor-pointer"
              />
            </div>
            {calculatedAge !== null && calculatedAge >= 0 && (
              <p className="text-xs font-black text-emerald-400 flex items-center gap-1.5 mt-1">
                <span>🎂 العمر المحسوب: {calculatedAge} سنوات</span>
              </p>
            )}
          </div>

          {/* 2. Photo / Avatar Selection */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 text-xs font-black text-slate-200">
              <Camera size={16} className="text-teal-400" />
              <span>الصورة الشخصية أو رمز الآفتار</span>
            </label>

            {/* Live Preview */}
            <div className="flex justify-center my-2">
              <div className="relative w-24 h-24 rounded-full bg-slate-900 border-4 border-emerald-500/50 shadow-xl flex items-center justify-center overflow-hidden text-4xl">
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
              <label className="inline-flex items-center gap-2 rounded-xl bg-slate-700/80 hover:bg-slate-700 border border-slate-600 px-4 py-2.5 text-xs font-black text-slate-200 cursor-pointer transition">
                <Upload size={16} className="text-teal-400" />
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
              <p className="text-[11px] font-bold text-slate-400 mb-2.5 text-center">أو اختر رمز آفتار مميز يناسبك:</p>
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
                          ? 'border-emerald-500 bg-emerald-500/20 shadow-md scale-105'
                          : 'border-slate-700/80 bg-slate-900/60 hover:bg-slate-700/50'
                      }`}
                    >
                      <span className="text-2xl mb-1">{av.emoji}</span>
                      <span className="text-[10px] font-black text-slate-300 truncate w-full text-center">{av.label}</span>
                      {isSelected && (
                        <span className="absolute -top-1 -left-1 bg-emerald-500 text-white rounded-full p-0.5">
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
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-emerald-500/20 transition disabled:opacity-50 cursor-pointer"
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
      </div>
    </div>
  );
}
