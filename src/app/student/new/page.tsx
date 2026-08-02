'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Camera, ClipboardList, Save, UserRound } from 'lucide-react';
import Navbar from '@/components/Navbar';
import SyncStatus from '@/components/SyncStatus';
import { saveStudent } from '@/lib/localDb';

const gradeOptions = ['الروضة', 'الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس', 'صعوبات التعلم'];

export default function NewStudentPage() {
  const router = useRouter();
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

  const handleFieldChange = (key: keyof typeof student, value: string) => {
    setStudent((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const savedStudent = saveStudent({
      fullName: student.fullName.trim() || 'طالب جديد',
      nationalId: student.nationalId,
      dateOfBirth: student.dateOfBirth,
      grade: student.grade,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      photoUrl: student.photoUrl,
      notes: student.notes,
      reviewStatus: 'awaiting-survey',
      source: 'student-wizard',
    });

    localStorage.setItem('masar.current-student-id', savedStudent.id);
    router.push(`/survey?student=${savedStudent.id}`);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-teal-50 text-teal-800">
              <UserRound size={24} />
            </span>
            <div>
              <p className="text-sm font-black text-teal-800">بداية مسار الطالب</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">تسجيل بيانات الطفل قبل الاستبيان</h1>
              <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-600">
                بعد حفظ البيانات ينتقل ولي الأمر مباشرة إلى الاستبيان الشامل. لن يظهر للطالب أي تشخيص أو نتيجة قبل مراجعة د. إسماعيل.
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
              <Field label="تاريخ الميلاد" type="date" value={student.dateOfBirth} onChange={(value) => handleFieldChange('dateOfBirth', value)} />
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
                    reader.onload = () => handleFieldChange('photoUrl', String(reader.result));
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>
            <div className="mt-5 rounded-lg bg-teal-50 p-4 text-sm font-bold leading-7 text-teal-950">
              <ClipboardList className="mb-2 text-teal-800" size={22} />
              الخطوة التالية هي الاستبيان الشامل لتحديد مؤشرات القراءة، الكتابة، الرياضيات، السمع والنطق، التواصل، الانتباه، والسلوك.
            </div>
            <button type="submit" className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white hover:bg-teal-800">
              <Save size={17} />
              حفظ والانتقال للاستبيان
            </button>
          </aside>
        </form>
      </main>
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
