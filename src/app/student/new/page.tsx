'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Camera, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, FileCheck2, Gauge, UserRound } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { assessmentPrinciples, getRiskLabel, getRiskLevel } from '@/data/assessmentModel';
import { saveReport, saveStudent } from '@/lib/localDb';

const steps = [
  { id: 1, label: 'البيانات', icon: UserRound },
  { id: 2, label: 'الاستبيان', icon: ClipboardList },
  { id: 3, label: 'التقييم', icon: FileCheck2 },
  { id: 4, label: 'الخطة', icon: CheckCircle2 },
];

const parentQuestions = [
  'هل يعاني الطفل من تأخر في النطق؟',
  'هل يواجه الطفل صعوبة في حفظ الحروف والأرقام؟',
  'هل يتشتت انتباه الطفل بسهولة أثناء المذاكرة؟',
  'هل يوجد تاريخ عائلي لصعوبات التعلم؟',
];

export default function NewStudentWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saved, setSaved] = useState(false);
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
  const [parentAnswers, setParentAnswers] = useState<Record<number, string>>({});
  const [readingChecks, setReadingChecks] = useState<Record<string, boolean>>({});
  const [mathChecks, setMathChecks] = useState<Record<string, boolean>>({});

  const parentRisk = Object.values(parentAnswers).reduce((total, answer) => total + (answer === 'نعم' ? 20 : answer === 'أحياناً' ? 10 : 0), 0);
  const readingDone = Object.values(readingChecks).filter(Boolean).length;
  const mathDone = Object.values(mathChecks).filter(Boolean).length;
  const skillRisk = (3 - readingDone) * 10 + (3 - mathDone) * 10;
  const riskScore = Math.min(parentRisk + skillRisk, 100);
  const riskLevel = getRiskLevel(riskScore);
  const recommendation = mathDone < readingDone ? 'برنامج الرياضيات' : 'برنامج القراءة والكتابة';
  const answeredQuestions = parentQuestions.map((question, index) => ({
    question,
    answer: parentAnswers[index] ?? 'لم يتم تسجيل إجابة',
  }));

  const handleFieldChange = (key: keyof typeof student, value: string) => {
    setStudent((current) => ({ ...current, [key]: value }));
  };

  const handleFinish = () => {
    const savedStudent = saveStudent({
      fullName: student.fullName.trim() || 'طالب بدون اسم',
      nationalId: student.nationalId,
      dateOfBirth: student.dateOfBirth,
      grade: student.grade,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
      photoUrl: student.photoUrl,
      source: 'student-wizard',
    });

    saveReport({
      studentId: savedStudent.id,
      studentName: savedStudent.fullName,
      grade: savedStudent.grade,
      program: recommendation,
      programColor: recommendation.includes('رياض') ? '#a6532c' : '#1f6f63',
      score: Math.max(0, 100 - riskScore),
      status: 'completed',
      type: 'initial-assessment',
      summary:
        riskScore >= 70
          ? 'الطالب يحتاج تدخلاً مركزاً يبدأ بمهارات صغيرة وواضحة مع متابعة أسبوعية.'
          : riskScore >= 35
            ? 'الطالب يحتاج تدريباً منظماً على المهارات التي ظهرت أقل ثباتاً في التقييم.'
            : 'الطالب يظهر احتياجاً بسيطاً ويمكن البدء بخطة تأسيس ومراجعة دورية.',
      recommendations: [
        `البدء بـ ${recommendation} حسب نتيجة التقييم الأولي.`,
        'تحديد هدف واحد لكل جلسة وتسجيل الدقة ونوع المساعدة.',
        'إعادة القياس بعد 6 جلسات أو عند الوصول إلى 80% إتقان.',
      ],
      answers: [
        ...answeredQuestions,
        ...Object.entries(readingChecks).map(([question, answer]) => ({ question: `قراءة: ${question}`, answer: answer ? 'متقن' : 'غير متقن' })),
        ...Object.entries(mathChecks).map(([question, answer]) => ({ question: `رياضيات: ${question}`, answer: answer ? 'متقن' : 'غير متقن' })),
      ],
      domains: [
        { name: 'استبيان الأهل', score: Math.max(0, 100 - parentRisk), note: getRiskLabel(riskLevel) },
        { name: 'القراءة', score: Math.round((readingDone / 3) * 100), note: `${readingDone} من 3 مهارات` },
        { name: 'الرياضيات', score: Math.round((mathDone / 3) * 100), note: `${mathDone} من 3 مهارات` },
      ],
    });

    setSaved(true);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
        <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-black text-teal-800">إضافة طالب جديد</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">نفس خطوات النظام الأصلية بشكل أوضح</h1>
          <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-600">
            أدخل البيانات، اجمع استبيان الأهل، سجل تقييم الأخصائي، ثم احفظ توصية البرامج المناسبة.
          </p>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-4 gap-2">
                {steps.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => setStep(id)}
                    className={`focus-ring min-h-20 rounded-lg p-3 text-center transition ${
                      step === id ? 'bg-slate-950 text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="mx-auto" size={20} />
                    <span className="mt-2 block text-xs font-black leading-5 md:text-sm">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 md:p-7">
            {step === 1 && (
              <div className="space-y-6">
                <SectionTitle title="بيانات الطالب الأساسية" />
                <div className="grid gap-5 md:grid-cols-2">
                  <Field label="اسم الطالب" placeholder="الاسم الرباعي" value={student.fullName} onChange={(value) => handleFieldChange('fullName', value)} />
                  <Field label="الرقم القومي / الهوية" value={student.nationalId} onChange={(value) => handleFieldChange('nationalId', value)} />
                  <Field label="تاريخ الميلاد" type="date" value={student.dateOfBirth} onChange={(value) => handleFieldChange('dateOfBirth', value)} />
                  <Field label="اسم ولي الأمر" value={student.parentName} onChange={(value) => handleFieldChange('parentName', value)} />
                  <Field label="هاتف ولي الأمر" type="tel" value={student.parentPhone} onChange={(value) => handleFieldChange('parentPhone', value)} />
                  <label className="block">
                    <span className="mb-2 block text-sm font-black text-slate-700">الصف الدراسي</span>
                    <select value={student.grade} onChange={(event) => handleFieldChange('grade', event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700">
                      <option>الروضة</option>
                      <option>الصف الأول</option>
                      <option>الصف الثاني</option>
                      <option>الصف الثالث</option>
                      <option>الصف الرابع</option>
                      <option>الصف الخامس</option>
                      <option>الصف السادس</option>
                    </select>
                  </label>
                </div>
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
                  <p className="mt-2 text-xs font-bold text-slate-500">اختياري، وتحفظ الصورة داخل ملف الطالب المحلي.</p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <SectionTitle title="استبيان الأهل المبدئي" />
                <div className="grid gap-4">
                  {parentQuestions.map((question, index) => (
                    <article key={question} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <p className="font-black text-slate-900">{index + 1}. {question}</p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        {['نعم', 'لا', 'أحياناً'].map((answer) => (
                          <label
                            key={answer}
                            className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black ring-1 transition ${
                              parentAnswers[index] === answer
                                ? 'bg-slate-950 text-white ring-slate-950'
                                : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`q${index}`}
                              className="sr-only"
                              checked={parentAnswers[index] === answer}
                              onChange={() => setParentAnswers((current) => ({ ...current, [index]: answer }))}
                            />
                            {answer}
                          </label>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <SectionTitle title="التقييم الأولي للأخصائي" />
                <div className="grid gap-5 md:grid-cols-2">
                  <AssessmentBox
                    title="اختبار القراءة"
                    items={['يعرف الحروف منفصلة', 'يقرأ كلمات ثلاثية', 'يخلط بين الحروف المتشابهة']}
                    values={readingChecks}
                    onChange={setReadingChecks}
                  />
                  <AssessmentBox
                    title="اختبار الرياضيات"
                    items={['يميز الأرقام 1-10', 'يجمع أعداد بسيطة', 'يفهم مدلول الرقم']}
                    values={mathChecks}
                    onChange={setMathChecks}
                  />
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-black text-slate-700">ملاحظات السلوك والانتباه</span>
                  <textarea value={student.notes} onChange={(event) => handleFieldChange('notes', event.target.value)} className="min-h-28 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700" placeholder="اكتب ملاحظاتك هنا..." />
                </label>
              </div>
            )}

            {step === 4 && (
              <div className="mx-auto max-w-2xl text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-lg bg-emerald-50 text-emerald-700">
                  <CheckCircle2 size={34} />
                </div>
                <h2 className="mt-5 text-2xl font-black text-slate-950">{saved ? 'تم حفظ الطالب والتقرير' : 'مراجعة الخطة قبل الحفظ'}</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-600">بناءً على التقييم الأولي، يوصى بالبرامج التالية للطالب:</p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <span className="rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white">{recommendation}</span>
                  <span className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white">برنامج تعديل السلوك</span>
                </div>
                {saved && (
                  <button onClick={() => router.push('/reports')} className="mt-6 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">
                    فتح التقارير
                  </button>
                )}
              </div>
            )}

            <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-5">
              <button onClick={() => setStep(Math.max(step - 1, 1))} disabled={step === 1} className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 disabled:opacity-40">
                <ChevronRight size={17} />
                السابق
              </button>
              <button onClick={() => (step < 4 ? setStep(step + 1) : handleFinish())} className="focus-ring inline-flex min-h-12 items-center gap-2 rounded-lg bg-teal-700 px-6 py-3 text-sm font-black text-white hover:bg-teal-800">
                {step < 4 ? 'التالي' : saved ? 'تم الحفظ' : 'حفظ وإنهاء'}
                <ChevronLeft size={17} />
              </button>
            </div>
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-32 lg:self-start">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-teal-50 text-teal-800">
                <Gauge size={22} />
              </span>
              <div>
                <p className="text-xs font-black text-slate-500">تحليل فوري</p>
                <h2 className="font-black text-slate-950">{getRiskLabel(riskLevel)}</h2>
              </div>
            </div>
            <div className="mt-5 rounded-lg bg-slate-950 p-5 text-center text-white">
              <p className="text-5xl font-black">{riskScore}%</p>
              <p className="mt-2 text-sm font-bold text-white/70">مؤشر الاحتياج</p>
            </div>
            <div className="mt-5 space-y-3">
              {assessmentPrinciples.map((principle) => (
                <div key={principle.title} className="rounded-lg bg-slate-50 p-3">
                  <h3 className="text-sm font-black text-slate-950">{principle.title}</h3>
                  <p className="mt-1 text-xs font-bold leading-6 text-slate-600">{principle.detail}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-xl font-black text-slate-950">{title}</h2>;
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
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700" placeholder={placeholder} />
    </label>
  );
}

function AssessmentBox({
  title,
  items,
  values,
  onChange,
}: {
  title: string;
  items: string[];
  values: Record<string, boolean>;
  onChange: (value: Record<string, boolean>) => void;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-5">
      <h3 className="font-black text-slate-950">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <label
            key={item}
            className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-bold transition ${
              values[item] ? 'border-teal-700 bg-teal-50 text-teal-950' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <input
              type="checkbox"
              className="accent-teal-700"
              checked={Boolean(values[item])}
              onChange={(event) => onChange({ ...values, [item]: event.target.checked })}
            />
            {item}
          </label>
        ))}
      </div>
    </section>
  );
}
