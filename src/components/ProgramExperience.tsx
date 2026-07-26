import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { CurriculumProgram, curriculumPrograms } from '@/data/curriculum';

type ProgramExperienceProps = {
  program: CurriculumProgram;
};

export default function ProgramExperience({ program }: ProgramExperienceProps) {
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--ink)]">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <section className="border-b border-black/10 bg-white">
            <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-12">
              <div>
                <div className="mb-4 inline-flex rounded-full border border-black/10 bg-stone-50 px-4 py-2 text-sm font-bold text-stone-700">
                  {program.tag}
                </div>
                <h1 className="max-w-3xl text-3xl font-black leading-tight text-stone-950 md:text-5xl">
                  {program.title}
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-700">{program.promise}</p>
                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {[
                    ['الفئة', program.audience],
                    ['المدة', program.duration],
                    ['المستوى', program.level],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-black/10 bg-stone-50 p-4">
                      <p className="text-xs font-black uppercase text-stone-500">{label}</p>
                      <p className="mt-1 text-sm font-bold leading-6 text-stone-900">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg p-6 text-white shadow-sm" style={{ backgroundColor: program.color }}>
                <p className="text-sm font-bold text-white/80">نظام التعلم داخل البرنامج</p>
                <div className="mt-5 space-y-4">
                  {program.sessionFlow.map((step) => (
                    <div key={step.title} className="rounded-lg bg-white/12 p-4 ring-1 ring-white/20">
                      <div className="flex items-center justify-between gap-4">
                        <h2 className="font-black">{step.title}</h2>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black" style={{ color: program.color }}>
                          {step.minutes}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/85">{step.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-7xl px-5 py-8 lg:px-10">
            <div className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
              <div className="space-y-6">
                <Panel title="قبل البداية">
                  <ul className="space-y-3">
                    {program.diagnostics.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-7 text-stone-700">
                        <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: program.accent }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel title="مخرجات قابلة للقياس">
                  <ul className="space-y-3">
                    {program.outcomes.map((item) => (
                      <li key={item} className="rounded-lg bg-stone-50 p-3 text-sm font-bold leading-7 text-stone-800">
                        {item}
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel title="أدوات الجلسة">
                  <div className="flex flex-wrap gap-2">
                    {program.tools.map((tool) => (
                      <span key={tool} className="rounded-full bg-white px-3 py-2 text-xs font-black text-stone-700 ring-1 ring-black/10">
                        {tool}
                      </span>
                    ))}
                  </div>
                </Panel>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-stone-500">خريطة المنهج</p>
                      <h2 className="text-2xl font-black text-stone-950">من تشخيص إلى إتقان</h2>
                    </div>
                    <Link href="/student/new" className="rounded-lg bg-stone-950 px-4 py-3 text-sm font-black text-white transition hover:bg-stone-800">
                      ابدأ تقييم طالب
                    </Link>
                  </div>
                  <div className="grid gap-4">
                    {program.modules.map((module) => (
                      <article key={module.title} className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <span className="rounded-full px-3 py-1 text-xs font-black text-white" style={{ backgroundColor: program.color }}>
                              أسبوع {module.week}
                            </span>
                            <h3 className="mt-3 text-xl font-black text-stone-950">{module.title}</h3>
                          </div>
                          <p className="max-w-md text-sm leading-7 text-stone-600">{module.goal}</p>
                        </div>
                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                          <div>
                            <p className="mb-2 text-xs font-black text-stone-500">الدروس</p>
                            <ul className="space-y-2">
                              {module.lessons.map((lesson) => (
                                <li key={lesson} className="text-sm font-bold text-stone-800">{lesson}</li>
                              ))}
                            </ul>
                          </div>
                          <InfoBlock label="التدريب" value={module.practice} />
                          <InfoBlock label="معيار الإتقان" value={module.mastery} />
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="border-t border-black/10 bg-white">
            <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-3 lg:px-10">
              <Panel title="خطة البيت">
                <ul className="space-y-3">
                  {program.homePlan.map((item) => (
                    <li key={item} className="text-sm font-bold leading-7 text-stone-700">{item}</li>
                  ))}
                </ul>
              </Panel>
              <Panel title="مؤشرات المتابعة">
                <div className="grid grid-cols-2 gap-3">
                  {program.measures.map((measure) => (
                    <div key={measure} className="rounded-lg bg-stone-50 p-3 text-sm font-black text-stone-800">
                      {measure}
                    </div>
                  ))}
                </div>
              </Panel>
              <Panel title="انتقل لمسار آخر">
                <div className="grid gap-2">
                  {curriculumPrograms
                    .filter((item) => item.slug !== program.slug)
                    .slice(0, 4)
                    .map((item) => (
                      <Link key={item.slug} href={`/programs/${item.slug}`} className="rounded-lg border border-black/10 px-4 py-3 text-sm font-black text-stone-800 transition hover:bg-stone-50">
                        {item.shortTitle}
                      </Link>
                    ))}
                </div>
              </Panel>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-black text-stone-950">{title}</h2>
      {children}
    </section>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 p-4">
      <p className="mb-2 text-xs font-black text-stone-500">{label}</p>
      <p className="text-sm leading-7 text-stone-700">{value}</p>
    </div>
  );
}
