'use client';

import { useState } from 'react';
import { FileText, Printer, Target } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

const programs = [
  {
    key: 'ld',
    title: 'صعوبات التعلم',
    color: '#2f6b3f',
    description: 'خطط فردية مخصصة لصعوبات القراءة والكتابة والرياضيات للصفوف 1-6',
    grades: ['الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس'],
    strategies: ['التعلم متعدد الحواس', 'تقسيم المهام', 'استخدام الألوان', 'الخرائط الذهنية', 'التكرار المتباعد', 'التعزيز الفوري'],
  },
  {
    key: 'behavior',
    title: 'تعديل السلوك',
    color: '#9f3f3f',
    description: 'برامج تقييم وتعديل السلوك للمرحلة الابتدائية مع متابعة دورية',
    grades: ['جميع المراحل'],
    strategies: ['تحليل السلوك التطبيقي', 'التعزيز الإيجابي', 'نظام النقاط', 'العقد السلوكي', 'تدريب البديل', 'متابعة الأسرة'],
  },
  {
    key: 'speech',
    title: 'التخاطب والنطق',
    color: '#63508f',
    description: 'علاج مخارج الحروف والتلعثم والتأتأة والحبسة الكلامية',
    grades: ['جميع المراحل'],
    strategies: ['تمارين مخارج الحروف', 'تنظيم التنفس', 'الإيقاع الكلامي', 'تمييز سمعي', 'قصص مصورة', 'تعميم منزلي'],
  },
  {
    key: 'autism',
    title: 'طيف التوحد وفرط الحركة',
    color: '#2d708f',
    description: 'خطط لتنمية التواصل وتخفيف صعوبات الانتباه والحركة الزائدة',
    grades: ['جميع المراحل'],
    strategies: ['التواصل بالصور', 'الجدول البصري', 'التكامل الحسي', 'القصص الاجتماعية', 'التعلم المنظم', 'تبادل الدور'],
  },
] as const;

type ProgramKey = (typeof programs)[number]['key'];

export default function LearningDifficultiesPage() {
  const [active, setActive] = useState<ProgramKey>('ld');
  const [grade, setGrade] = useState('الصف الأول');
  const program = programs.find((item) => item.key === active)!;

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-teal-800">البرامج العلاجية والتدخلية</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">صعوبات التعلم، السلوك، التخاطب، وطيف التوحد</h1>
            <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-600">
              نفس اختيارات البرنامج الأصلية مع تنظيم بصري أوضح ومولد خطة فردية في نفس الصفحة.
            </p>
          </header>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {programs.map((item) => (
              <button key={item.key} onClick={() => setActive(item.key)} className={`focus-ring rounded-lg border p-4 text-right transition ${active === item.key ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'}`}>
                <span className="mb-3 block h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="block text-sm font-black">{item.title}</span>
              </button>
            ))}
          </div>

          <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
              <div>
                <h2 className="text-2xl font-black text-slate-950">{program.title}</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-600">{program.description}</p>

                {program.grades.length > 1 && (
                  <div className="mt-5">
                    <p className="mb-2 text-sm font-black text-slate-700">اختر الصف الدراسي</p>
                    <div className="flex flex-wrap gap-2">
                      {program.grades.map((item) => (
                        <button key={item} onClick={() => setGrade(item)} className={`rounded-lg px-4 py-2 text-sm font-black transition ${grade === item ? 'text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`} style={{ backgroundColor: grade === item ? program.color : undefined }}>
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  <div className="mb-3 flex items-center gap-2">
                    <Target size={18} className="text-teal-800" />
                    <h3 className="font-black text-slate-950">الاستراتيجيات العلاجية المعتمدة</h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {program.strategies.map((strategy, index) => (
                      <div key={strategy} className="flex items-center gap-3 rounded-lg bg-slate-50 p-4">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-sm font-black text-white" style={{ backgroundColor: program.color }}>{index + 1}</span>
                        <span className="text-sm font-bold text-slate-700">{strategy}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                <h3 className="font-black text-slate-950">تقييم سريع</h3>
                <div className="mt-4 space-y-4">
                  {[
                    ['مستوى التركيز', 60],
                    ['مستوى الأداء', 45],
                    ['التفاعل الاجتماعي', 75],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <div className="mb-1 flex justify-between text-sm font-black text-slate-600">
                        <span>{label}</span>
                        <span>{value}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: program.color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-6 w-full rounded-lg px-5 py-3 text-sm font-black text-white" style={{ backgroundColor: program.color }}>إنشاء خطة فردية</button>
              </aside>
            </div>
          </section>

          <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <FileText size={19} className="text-teal-800" />
              <h2 className="text-xl font-black text-slate-950">مولد الخطة الفردية IEP</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="اسم الطالب" placeholder="اسم الطالب" />
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">الصف</span>
                <select className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none">
                  {['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'].map((item) => <option key={item}>الصف {item}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">البرنامج</span>
                <select className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none">
                  {programs.map((item) => <option key={item.key}>{item.title}</option>)}
                </select>
              </label>
            </div>
            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-black text-slate-700">ملاحظات الأخصائي</span>
              <textarea className="min-h-28 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none" placeholder="اكتب ملاحظاتك وتوصياتك هنا..." />
            </label>
            <button onClick={() => window.print()} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-950 px-6 py-3 text-sm font-black text-white hover:bg-slate-800">
              <Printer size={17} />
              توليد وطباعة الخطة الفردية
            </button>
          </section>
        </main>
      </div>
    </div>
  );
}

function Field({ label, placeholder }: { label: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>
      <input className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none" placeholder={placeholder} />
    </label>
  );
}
