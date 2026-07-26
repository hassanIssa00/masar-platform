import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { curriculumPrograms } from '@/data/curriculum';

const stats = [
  { label: 'طلاب نشطون', value: '142', note: '18 يحتاجون مراجعة خطة' },
  { label: 'جلسات اليوم', value: '18', note: '6 قراءة، 4 رياضيات، 8 تدخل' },
  { label: 'خطط فردية', value: '37', note: '12 خطة تنتهي هذا الأسبوع' },
  { label: 'تحسن متوسط', value: '24%', note: 'آخر 6 أسابيع' },
];

const students = [
  { name: 'أحمد محمود', grade: 'الصف الثاني', program: 'القراءة والكتابة', risk: 'خلط حروف متشابهة', progress: 62 },
  { name: 'ليان عبدالله', grade: 'الصف الأول', program: 'طيف التوحد', risk: 'انتقالات وروتين بصري', progress: 71 },
  { name: 'عمر خالد', grade: 'الصف الرابع', program: 'الرياضيات', risk: 'قيمة مكانية ومسائل لفظية', progress: 48 },
  { name: 'سارة محمد', grade: 'الروضة', program: 'التخاطب والنطق', risk: 'صوت س/ص داخل الكلمات', progress: 57 },
];

const sessions = [
  ['09:00', 'قراءة علاجية', 'إملاء المدود والسكون'],
  ['10:30', 'رياضيات محسوسة', 'تكوين عشرة بالمكعبات'],
  ['12:00', 'تعديل سلوك', 'طلب الاستراحة بدل الانسحاب'],
  ['02:00', 'تخاطب', 'إنتاج صوت الراء داخل كلمات'],
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-5 py-8 lg:px-10">
          <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-stone-500">مركز التشغيل</p>
              <h1 className="text-3xl font-black text-stone-950">لوحة متابعة التعلم العلاجي</h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-stone-600">
                هنا تظهر حالة الطلاب والخطط والجلسات بناء على قياس فعلي: دقة، استقلالية، نوع مساعدة، وانتقال المهارة للبيت.
              </p>
            </div>
            <Link href="/student/new" className="rounded-lg bg-stone-950 px-5 py-3 text-sm font-black text-white transition hover:bg-stone-800">
              إضافة وتقييم طالب
            </Link>
            <Link href="/assessment/reading" className="rounded-lg border border-black/10 bg-white px-5 py-3 text-sm font-black text-stone-800 transition hover:bg-stone-50">
              اختبار سريع
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <section key={stat.label} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
                <p className="text-sm font-black text-stone-500">{stat.label}</p>
                <p className="mt-3 text-4xl font-black text-stone-950">{stat.value}</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">{stat.note}</p>
              </section>
            ))}
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-stone-500">متابعة الطلاب</p>
                  <h2 className="text-xl font-black text-stone-950">حالات تحتاج قرارا تعليميا</h2>
                </div>
                <Link href="/reports" className="text-sm font-black text-[#1f6f63]">عرض التقارير</Link>
              </div>
              <div className="grid gap-3 md:hidden">
                {students.map((student) => (
                  <article key={student.name} className="rounded-lg bg-stone-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black text-stone-950">{student.name}</h3>
                        <p className="text-sm text-stone-500">{student.grade} · {student.program}</p>
                      </div>
                      <span className="text-sm font-black text-stone-700">{student.progress}%</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-stone-600">{student.risk}</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                      <div className="h-full rounded-full bg-[#1f6f63]" style={{ width: `${student.progress}%` }} />
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[720px] text-right">
                  <thead>
                    <tr className="border-b border-black/10 text-xs font-black text-stone-500">
                      <th className="py-3">الطالب</th>
                      <th className="py-3">البرنامج</th>
                      <th className="py-3">نقطة التدخل</th>
                      <th className="py-3">التقدم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.name} className="border-b border-black/5 last:border-0">
                        <td className="py-4">
                          <p className="font-black text-stone-950">{student.name}</p>
                          <p className="text-sm text-stone-500">{student.grade}</p>
                        </td>
                        <td className="py-4 text-sm font-bold text-stone-800">{student.program}</td>
                        <td className="py-4 text-sm text-stone-600">{student.risk}</td>
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-2 w-32 overflow-hidden rounded-full bg-stone-100">
                              <div className="h-full rounded-full bg-[#1f6f63]" style={{ width: `${student.progress}%` }} />
                            </div>
                            <span className="text-sm font-black text-stone-700">{student.progress}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
              <p className="text-sm font-black text-stone-500">جدول اليوم</p>
              <h2 className="mb-5 text-xl font-black text-stone-950">جلسات قابلة للتنفيذ</h2>
              <div className="space-y-3">
                {sessions.map(([time, title, goal]) => (
                  <div key={time} className="rounded-lg bg-stone-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-black text-stone-950">{title}</h3>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-stone-700 ring-1 ring-black/10">{time}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{goal}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="mt-8 rounded-lg border border-black/10 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <p className="text-sm font-black text-stone-500">جودة المناهج</p>
              <h2 className="text-xl font-black text-stone-950">كل برنامج له تشخيص، جلسة، بيت، وقياس</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {curriculumPrograms.map((program) => (
                <Link key={program.slug} href={`/programs/${program.slug}`} className="rounded-lg border border-black/10 p-4 transition hover:bg-stone-50">
                  <span className="mb-3 block h-2 rounded-full" style={{ backgroundColor: program.color }} />
                  <h3 className="font-black text-stone-950">{program.shortTitle}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{program.modules.length} مراحل، {program.measures.length} مؤشرات قياس</p>
                </Link>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
