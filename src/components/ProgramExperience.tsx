import type { ReactNode } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { CurriculumProgram, curriculumPrograms } from '@/data/curriculum';
import { getLearningStudio } from '@/data/learningStudio';

type ProgramExperienceProps = {
  program: CurriculumProgram;
};

export default function ProgramExperience({ program }: ProgramExperienceProps) {
  const studio = getLearningStudio(program.slug);
  const topModules = program.modules.slice(0, 4);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <section className="border-b border-black/10 bg-white">
            <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1fr_360px] lg:px-10">
              <div>
                <p className="mb-3 w-fit rounded-full bg-stone-100 px-4 py-2 text-sm font-black text-stone-700">{program.tag}</p>
                <h1 className="max-w-3xl text-3xl font-black leading-tight text-stone-950 md:text-5xl">{program.title}</h1>
                <p className="mt-4 max-w-3xl text-base leading-8 text-stone-700">{program.promise}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href={`/learn/${program.slug}`} className="rounded-lg px-6 py-3 text-sm font-black text-white transition hover:brightness-95" style={{ backgroundColor: program.color }}>
                    افتح واجهة الطفل
                  </Link>
                  <Link href={`/assessment/${program.slug}`} className="rounded-lg bg-stone-950 px-6 py-3 text-sm font-black text-white hover:bg-stone-800">
                    ابدأ اختبار تفاعلي
                  </Link>
                  <Link href="/student/new" className="rounded-lg border border-black/15 bg-white px-6 py-3 text-sm font-black text-stone-900 hover:bg-stone-50">
                    تقييم وتسكين طالب
                  </Link>
                </div>
              </div>

              <Panel title="قاعدة التدريس">
                <p className="text-sm leading-7 text-stone-700">{studio?.method ?? 'تقييم، تدريب قصير، قياس، ثم تعديل الخطة حسب الأداء.'}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {[
                    ['الفئة', program.audience],
                    ['المدة', program.duration],
                    ['المستوى', program.level],
                    ['الانتقال', 'بعد الإتقان'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-stone-50 p-3">
                      <p className="text-xs font-black text-stone-500">{label}</p>
                      <p className="mt-1 text-sm font-bold leading-6 text-stone-900">{value}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
            <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
              <div>
                <div className="mb-5">
                  <p className="text-sm font-black text-stone-500">Roadmap الطالب</p>
                  <h2 className="text-2xl font-black text-stone-950">خطوات قليلة، تدريب عميق، قياس واضح</h2>
                </div>

                <div className="grid gap-4">
                  {topModules.map((module, index) => (
                    <article key={module.title} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-black text-white" style={{ backgroundColor: program.color }}>
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-xs font-black text-stone-500">أسبوع {module.week}</p>
                            <h3 className="mt-1 text-xl font-black text-stone-950">{module.title}</h3>
                          </div>
                        </div>
                        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-700">{module.mastery}</span>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <SmallBlock title="هدف الطفل" body={module.goal} />
                        <SmallBlock title="تدريب الجلسة" body={module.practice} />
                        <SmallBlock title="دروس مختصرة" body={module.lessons.slice(0, 3).join('، ')} />
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Panel title="قبل البداية">
                  <ul className="space-y-2">
                    {program.diagnostics.slice(0, 4).map((item) => (
                      <li key={item} className="rounded-lg bg-stone-50 p-3 text-sm font-bold leading-7 text-stone-700">{item}</li>
                    ))}
                  </ul>
                </Panel>

                <Panel title="قياس التقدم">
                  <div className="grid grid-cols-2 gap-2">
                    {program.measures.map((measure) => (
                      <div key={measure} className="rounded-lg bg-stone-950 p-3 text-center text-sm font-black text-white">{measure}</div>
                    ))}
                  </div>
                </Panel>

                <Panel title="انتقال سريع">
                  <div className="grid gap-2">
                    {curriculumPrograms
                      .filter((item) => item.slug !== program.slug)
                      .slice(0, 5)
                      .map((item) => (
                        <Link key={item.slug} href={`/programs/${item.slug}`} className="rounded-lg border border-black/10 px-4 py-3 text-sm font-black text-stone-800 hover:bg-stone-50">
                          {item.shortTitle}
                        </Link>
                      ))}
                  </div>
                </Panel>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-black text-stone-950">{title}</h2>
      {children}
    </section>
  );
}

function SmallBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg bg-stone-50 p-4">
      <p className="mb-2 text-xs font-black text-stone-500">{title}</p>
      <p className="text-sm leading-7 text-stone-700">{body}</p>
    </div>
  );
}
