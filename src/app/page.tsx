import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { curriculumPrograms } from '@/data/curriculum';

const operatingModel = [
  {
    title: 'تشخيص حقيقي',
    detail: 'استبيان أسرة، ملاحظة أخصائي، اختبار مهارات مصغر، وتحليل نمط الأخطاء.',
  },
  {
    title: 'خطة فردية',
    detail: 'هدف أسبوعي واحد، نشاط مناسب، معيار إتقان واضح، وتدريب منزلي قصير.',
  },
  {
    title: 'جلسات قابلة للقياس',
    detail: 'كل جلسة لها بداية، تدريب، قياس خروج، وتوصية للبيت.',
  },
  {
    title: 'تقرير وتعديل',
    detail: 'المسار يتغير حسب الدقة والاستقلالية ونوع المساعدة وليس حسب مرور الوقت فقط.',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <Navbar />

      <main>
        <section className="border-b border-black/10 bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:py-14">
            <div className="flex flex-col justify-center">
              <p className="mb-4 w-fit rounded-full border border-black/10 bg-stone-50 px-4 py-2 text-sm font-black text-stone-700">
                منصة تعليم علاجي مبنية على خطة وقياس
              </p>
              <h1 className="max-w-4xl text-4xl font-black leading-tight text-stone-950 md:text-6xl">
                منصة د. إسماعيل عيسى
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-9 text-stone-700">
                نظام كامل للتقييم، بناء المناهج العلاجية، متابعة الجلسات، وإصدار تقارير تقدم واضحة للأسرة والأخصائي. كل برنامج هنا له هدف، طريقة تدريب، ومعيار إتقان.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/dashboard" className="rounded-lg bg-stone-950 px-6 py-3 text-sm font-black text-white transition hover:bg-stone-800">
                  افتح لوحة التحكم
                </Link>
                <Link href="/programs/reading" className="rounded-lg border border-black/15 bg-white px-6 py-3 text-sm font-black text-stone-900 transition hover:bg-stone-50">
                  تصفح المناهج
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-black/10 bg-stone-950 p-5 text-white shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['6', 'مسارات علاجية'],
                  ['12', 'أسبوعا لكل خطة قراءة'],
                  ['4', 'مراحل لكل جلسة'],
                  ['80%', 'معيار إتقان قبل الانتقال'],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-lg bg-white/10 p-5 ring-1 ring-white/10">
                    <p className="text-3xl font-black text-[#e8b44f]">{value}</p>
                    <p className="mt-2 text-sm font-bold leading-6 text-white/75">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg bg-white p-5 text-stone-900">
                <p className="text-sm font-black text-stone-500">مسار الطالب داخل النظام</p>
                <div className="mt-4 space-y-3">
                  {operatingModel.map((step, index) => (
                    <div key={step.title} className="flex gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1f6f63] text-sm font-black text-white">
                        {index + 1}
                      </span>
                      <div>
                        <h2 className="font-black">{step.title}</h2>
                        <p className="text-sm leading-6 text-stone-600">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-10 lg:px-10">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black text-stone-500">المناهج الجديدة</p>
              <h2 className="text-3xl font-black text-stone-950">برامج علاجية مش مجرد عناوين</h2>
            </div>
            <Link href="/student/new" className="hidden rounded-lg bg-[#1f6f63] px-5 py-3 text-sm font-black text-white transition hover:bg-[#18584f] sm:block">
              أضف طالب للتقييم
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {curriculumPrograms.map((program) => (
              <Link
                key={program.slug}
                href={`/programs/${program.slug}`}
                className="group rounded-lg border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mb-5 h-2 rounded-full" style={{ backgroundColor: program.color }} />
                <p className="text-sm font-black" style={{ color: program.color }}>
                  {program.tag}
                </p>
                <h3 className="mt-2 text-xl font-black text-stone-950">{program.shortTitle}</h3>
                <p className="mt-3 line-clamp-3 text-sm leading-7 text-stone-600">{program.promise}</p>
                <div className="mt-5 flex items-center justify-between border-t border-black/10 pt-4">
                  <span className="text-xs font-bold text-stone-500">{program.duration}</span>
                  <span className="text-sm font-black text-stone-950 transition group-hover:translate-x-[-4px]">
                    فتح البرنامج
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
