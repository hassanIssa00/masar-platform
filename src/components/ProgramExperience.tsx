import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ClipboardCheck, Download, FileText, Gauge, Layers3, Route, Target } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { CurriculumProgram, curriculumPrograms } from '@/data/curriculum';

type ProgramExperienceProps = {
  program: CurriculumProgram;
};

export default function ProgramExperience({ program }: ProgramExperienceProps) {
  const topModules = program.modules.slice(0, 4);
  const image =
    program.slug === 'math'
      ? '/learning/math-lab.png'
      : program.slug === 'reading' || program.slug === 'speech' || program.slug === 'simple-spelling'
        ? '/learning/literacy-lab.png'
        : '/learning/communication-lab.png';

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1">
          <section className="border-b border-slate-200 bg-white">
            <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1fr_420px] lg:px-8">
              <div className="flex flex-col justify-center">
                <p className="mb-3 w-fit rounded-full bg-teal-50 px-4 py-2 text-sm font-black text-teal-900">{program.tag}</p>
                <h1 className="max-w-3xl text-3xl font-black leading-tight text-slate-950 md:text-5xl">{program.title}</h1>
                <p className="mt-4 max-w-3xl text-base font-bold leading-8 text-slate-600">{program.promise}</p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link href="/student/new" className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-black text-white shadow-sm transition hover:brightness-95" style={{ backgroundColor: program.color }}>
                    <ClipboardCheck size={17} />
                    تقييم الطالب
                  </Link>
                  <Link href="/student/new" className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-black text-slate-900 hover:bg-slate-50">
                    <Route size={17} />
                    تسكين طالب
                  </Link>
                </div>
              </div>

              <div className="relative min-h-72 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shadow-sm">
                <Image src={image} alt="" fill sizes="(max-width: 1024px) 100vw, 420px" className="object-cover" priority />
              </div>
            </div>
          </section>

          {program.slug === 'simple-spelling' && (
            <section className="border-b border-slate-200 bg-slate-50">
              <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-black text-teal-800">المذكرة الأصلية كاملة</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">محتوى التهجي البسيط كما هو داخل النظام</h2>
                    <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-600">
                      الملف مدمج داخل المسار بنفس ترتيب الصفحات والتدريبات، ويستخدمه الدكتور أو ولي الأمر للطباعة أو المتابعة.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <a href="/resources/simple-spelling-iop.pdf" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white">
                      <FileText size={17} />
                      فتح PDF كامل
                    </a>
                    <a href="/resources/simple-spelling-iop.pdf" download className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800">
                      <Download size={17} />
                      تحميل المذكرة
                    </a>
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  <iframe
                    title="مذكرة التهجي البسيط"
                    src="/resources/simple-spelling-iop.pdf#view=FitH"
                    className="h-[78svh] min-h-[620px] w-full"
                  />
                </div>
              </div>
            </section>
          )}

          <section className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
            <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <div>
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-black text-teal-800">Roadmap الطالب</p>
                    <h2 className="mt-1 text-2xl font-black text-slate-950">مهارات مرتبة حسب الإتقان، لا حسب الأسبوع فقط</h2>
                  </div>
                </div>

                <div className="grid gap-4">
                  {topModules.map((module, index) => (
                    <article key={module.title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-sm font-black text-white" style={{ backgroundColor: program.color }}>
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-xs font-black text-slate-500">مرحلة {module.week}</p>
                            <h3 className="mt-1 text-xl font-black text-slate-950">{module.title}</h3>
                            <p className="mt-2 text-sm font-bold leading-7 text-slate-600">{module.goal}</p>
                          </div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{module.mastery}</span>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <SmallBlock title="نشاط الجلسة" body={module.practice} icon={<Target size={17} />} />
                        <SmallBlock title="دروس مختصرة" body={module.lessons.slice(0, 3).join('، ')} icon={<Layers3 size={17} />} />
                        <SmallBlock title="قرار الانتقال" body={module.mastery} icon={<Gauge size={17} />} />
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Panel title="قاعدة التدريس">
                  <p className="text-sm font-bold leading-7 text-slate-700">تقييم، تدريب قصير، قياس، ثم تعديل الخطة حسب أداء الطالب داخل نفس المسار.</p>
                </Panel>

                <Panel title="قبل البداية">
                  <ul className="space-y-2">
                    {program.diagnostics.slice(0, 4).map((item) => (
                      <li key={item} className="rounded-lg bg-slate-50 p-3 text-sm font-bold leading-7 text-slate-700">{item}</li>
                    ))}
                  </ul>
                </Panel>

                <Panel title="مؤشرات التقدم">
                  <div className="grid grid-cols-2 gap-2">
                    {program.measures.map((measure) => (
                      <div key={measure} className="rounded-lg bg-slate-950 p-3 text-center text-sm font-black text-white">{measure}</div>
                    ))}
                  </div>
                </Panel>

                <Panel title="مسارات أخرى">
                  <div className="grid gap-2">
                    {curriculumPrograms
                      .filter((item) => item.slug !== program.slug)
                      .slice(0, 5)
                      .map((item) => (
                        <Link key={item.slug} href={`/programs/${item.slug}`} className="focus-ring flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">
                          {item.shortTitle}
                          <ArrowLeft size={15} />
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
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-black text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

function SmallBlock({ title, body, icon }: { title: string; body: string; icon: ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-black text-slate-500">
        {icon}
        {title}
      </div>
      <p className="text-sm font-bold leading-7 text-slate-700">{body}</p>
    </div>
  );
}
