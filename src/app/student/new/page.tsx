'use client';

import { FormEvent, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Camera, ClipboardList, Save, UserRound } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import SyncStatus from '@/components/SyncStatus';
import { getSession, getStudents, saveStudent, updateStudent } from '@/lib/localDb';
import { pullCloudDataToLocal, syncDocToCloud } from '@/lib/firestoreSync';

const gradeOptions = ['الروضة', 'الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس', 'صعوبات التعلم'];
const days = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, '0'));
const months = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
const years = Array.from({ length: 20 }, (_, index) => String(new Date().getFullYear() - 3 - index));

export default function NewStudentPage() {
  const router = useRouter();
  const [nextFlow, setNextFlow] = useState<'parent-survey' | 'student-test'>('parent-survey');
  const [existingStudentId, setExistingStudentId] = useState('');
  const [student, setStudent] = useState({
    fullName: '',
    nationalId: '',
    dateOfBirth: '',
    grade: 'الصف الأول',
    parentName: '',
    parentPhone: '',
    photoUrl: '',
    notes: '',
  });
  const [birthDay, setBirthDay] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [loading, setLoading] = useState(false);

  // Pre-fill from registration if a student record already exists
  useEffect(() => {
    const load = async () => {
      await pullCloudDataToLocal().catch(() => {});
      const session = getSession();
      const params = new URLSearchParams(window.location.search);
      const flow = params.get('flow');
      const isStudent = session?.role === 'student' || flow === 'student';
      setNextFlow(isStudent ? 'student-test' : 'parent-survey');

      const savedStudentId = typeof window !== 'undefined' ? localStorage.getItem('masar.current-student-id') : null;
      if (!savedStudentId) {
        if (session?.role === 'student') {
          setStudent((prev) => ({
            ...prev,
            fullName: session.name || prev.fullName,
            parentPhone: session.phone || prev.parentPhone,
          }));
        } else if (session?.role === 'parent') {
          setStudent((prev) => ({
            ...prev,
            parentName: session.name || prev.parentName,
            parentPhone: session.phone || prev.parentPhone,
          }));
        }
        return;
      }

      const allStudents = getStudents();
      const found = allStudents.find((s) => s.id === savedStudentId);
      if (!found) return;

      setExistingStudentId(found.id);
      setStudent((prev) => ({
        ...prev,
        fullName: found.fullName || prev.fullName,
        grade: found.grade || prev.grade,
        parentName: found.parentName || prev.parentName,
        parentPhone: found.parentPhone || prev.parentPhone,
        photoUrl: found.photoUrl || prev.photoUrl,
        notes: found.notes || prev.notes,
        nationalId: found.nationalId || prev.nationalId,
      }));
    };

    void load();
  }, []);

  const handleFieldChange = (key: keyof typeof student, value: string) => {
    setStudent((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const dateOfBirth = birthYear && birthMonth && birthDay ? `${birthYear}-${birthMonth}-${birthDay}` : '';

    let savedStudent;
    if (existingStudentId) {
      // Update the student record that was already created at registration
      savedStudent = updateStudent(existingStudentId, {
        fullName: student.fullName.trim() || 'طالب جديد',
        nationalId: student.nationalId,
        dateOfBirth,
        grade: student.grade,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        photoUrl: student.photoUrl,
        notes: student.notes,
        reviewStatus: nextFlow === 'student-test' ? 'awaiting-doctor-review' : 'awaiting-survey',
        source: 'student-wizard',
      });
      if (!savedStudent) {
        // Fallback: create new
        savedStudent = saveStudent({
          fullName: student.fullName.trim() || 'طالب جديد',
          nationalId: student.nationalId,
          dateOfBirth,
          grade: student.grade,
          parentName: student.parentName,
          parentPhone: student.parentPhone,
          photoUrl: student.photoUrl,
          notes: student.notes,
          reviewStatus: nextFlow === 'student-test' ? 'awaiting-doctor-review' : 'awaiting-survey',
          source: 'student-wizard',
        });
      }
    } else {
      savedStudent = saveStudent({
        fullName: student.fullName.trim() || 'طالب جديد',
        nationalId: student.nationalId,
        dateOfBirth,
        grade: student.grade,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        photoUrl: student.photoUrl,
        notes: student.notes,
        reviewStatus: nextFlow === 'student-test' ? 'awaiting-doctor-review' : 'awaiting-survey',
        source: 'student-wizard',
      });
    }

    localStorage.setItem('masar.current-student-id', savedStudent!.id);
    localStorage.setItem('masar_active_student_id', savedStudent!.id);
    localStorage.setItem('masar_active_mode', nextFlow === 'student-test' ? 'student' : 'parent');
    await syncDocToCloud('students', savedStudent!.id, savedStudent);
    router.push(nextFlow === 'student-test' ? `/assessment?student=${savedStudent!.id}&flow=student` : `/survey?student=${savedStudent!.id}&flow=parent`);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <BrandMark size="sm" />
          <div className="rounded-full bg-teal-50 px-4 py-2 text-xs font-black text-teal-800">
            تسجيل بيانات الطفل
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-teal-50 text-teal-800">
              <UserRound size={24} />
            </span>
            <div>
              <p className="text-sm font-black text-teal-800">بداية مسار الطالب</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">
                {nextFlow === 'student-test' ? 'تسجيل بيانات الطالب قبل الاختبار' : 'تسجيل بيانات الطفل قبل الاستبيان'}
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-600">
                {nextFlow === 'student-test'
                  ? 'بعد حفظ البيانات ينتقل الطالب مباشرة إلى اختبار مناسب للصف. لا تظهر أي درجة أو تشخيص داخل تجربة الطالب.'
                  : 'بعد حفظ البيانات ينتقل ولي الأمر مباشرة إلى الاستبيان الشامل. لن يظهر للطالب أي تشخيص أو نتيجة قبل مراجعة د. إسماعيل.'}
              </p>
            </div>
          </div>
        </header>

        <SyncStatus />

        <form onSubmit={handleSubmit} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-7">
            <h2 className="mb-5 text-xl font-black text-slate-950">بيانات الطفل وولي الأمر</h2>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="اسم الطالب" placeholder="الاسم الرباعي" value={student.fullName} onChange={(value) => handleFieldChange('fullName', value)} />
              <Field label="رقم الهوية / الإقامة" value={student.nationalId} onChange={(value) => handleFieldChange('nationalId', value)} />
              <div className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">تاريخ الميلاد</span>
                <div className="grid grid-cols-3 gap-2">
                  <select value={birthDay} onChange={(event) => setBirthDay(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-teal-700">
                    <option value="">اليوم</option>
                    {days.map((day) => <option key={day} value={day}>{day}</option>)}
                  </select>
                  <select value={birthMonth} onChange={(event) => setBirthMonth(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-teal-700">
                    <option value="">الشهر</option>
                    {months.map((month) => <option key={month} value={month}>{month}</option>)}
                  </select>
                  <select value={birthYear} onChange={(event) => setBirthYear(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold outline-none focus:border-teal-700">
                    <option value="">السنة</option>
                    {years.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">الصف أو المسار</span>
                <select value={student.grade} onChange={(event) => handleFieldChange('grade', event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700">
                  {gradeOptions.map((grade) => <option key={grade}>{grade}</option>)}
                </select>
              </label>
              <Field label="اسم ولي الأمر" value={student.parentName} onChange={(value) => handleFieldChange('parentName', value)} />
              <Field label="هاتف ولي الأمر" type="tel" value={student.parentPhone} onChange={(value) => handleFieldChange('parentPhone', value)} />
            </div>
            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-black text-slate-700">ملاحظات أولية</span>
              <textarea value={student.notes} onChange={(event) => handleFieldChange('notes', event.target.value)} className="min-h-28 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700" placeholder="مثال: صعوبة قراءة، تشتت، تأخر نطق، حساسية صوت..." />
            </label>
          </section>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-32 lg:self-start">
            <div className="rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              {student.photoUrl ? (
                <Image src={student.photoUrl} alt="صورة الطالب" width={112} height={112} unoptimized className="mx-auto h-28 w-28 rounded-lg object-cover ring-2 ring-white" />
              ) : (
                <Camera className="mx-auto text-slate-500" size={32} />
              )}
              <label className="mt-3 inline-flex cursor-pointer rounded-lg bg-white px-5 py-3 text-sm font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">
                رفع صورة الطالب
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const img = document.createElement('img');
                      img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const maxDim = 240;
                        let w = img.width;
                        let h = img.height;
                        if (w > h) {
                          if (w > maxDim) { h = Math.round((h * maxDim) / w); w = maxDim; }
                        } else {
                          if (h > maxDim) { w = Math.round((w * maxDim) / h); h = maxDim; }
                        }
                        canvas.width = w;
                        canvas.height = h;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0, w, h);
                        handleFieldChange('photoUrl', canvas.toDataURL('image/jpeg', 0.8));
                      };
                      img.src = String(reader.result);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
            <div className="mt-5 rounded-lg bg-teal-50 p-4 text-sm font-bold leading-7 text-teal-950">
              <ClipboardList className="mb-2 text-teal-800" size={22} />
              {nextFlow === 'student-test'
                ? 'الخطوة التالية هي اختبار الطالب المباشر حسب الصف، ثم حفظ الإجابات والتحليل في لوحة د. إسماعيل.'
                : 'الخطوة التالية هي الاستبيان الشامل لتحديد مؤشرات القراءة، الكتابة، الرياضيات، السمع والنطق، التواصل، الانتباه، والسلوك.'}
            </div>
            <button type="submit" disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white hover:bg-teal-800 disabled:opacity-60">
              <Save size={17} />
              {loading
                ? nextFlow === 'student-test' ? 'جاري فتح الاختبار...' : 'جاري فتح الاستبيان...'
                : nextFlow === 'student-test' ? 'حفظ وفتح اختبار الطالب' : 'حفظ والانتقال للاستبيان'}
            </button>
          </aside>
        </form>
      </main>
      {loading && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/82 text-white backdrop-blur-md">
          <div className="motion-scale-in rounded-lg border border-white/15 bg-white/10 p-7 text-center shadow-2xl">
            <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-teal-300" />
            <p className="mt-4 text-lg font-black">تم حفظ البيانات</p>
            <p className="mt-1 text-sm font-bold text-white/70">
              {nextFlow === 'student-test' ? 'جاري فتح اختبار الطالب المناسب للصف.' : 'جاري فتح استبيان ولي الأمر الشامل.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700" placeholder={placeholder} required={label === 'اسم الطالب'} />
    </label>
  );
}
