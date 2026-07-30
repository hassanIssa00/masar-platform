import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, BarChart3, BookOpenCheck, ClipboardCheck, FileText, LineChart, MonitorPlay, Volume2 } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import Navbar from '@/components/Navbar';
import { curriculumPrograms } from '@/data/curriculum';

const workflow = [
  { title: 'قياس تشخيصي', body: 'اختبار قصير يقيس مهارات دقيقة بدل درجة عامة.', icon: ClipboardCheck },
  { title: 'تسكين علاجي', body: 'اختيار مهارة البداية حسب الفجوة، العمر، ونوع المساعدة.', icon: BookOpenCheck },
  { title: 'تدريب تفاعلي', body: 'نشاط بصري وصوت واضح واستجابة فورية للطالب.', icon: MonitorPlay },
  { title: 'قرار بالتقدم', body: 'تقرير يحدد: إتقان، إعادة تدريس، أو انتقال للمهارة التالية.', icon: LineChart },
];

const metrics = [
  ['7', 'اختبارات تحديد مستوى'],
  ['35', 'سؤال استبيان أسري'],
  ['80%', 'معيار فتح المهارة التالية'],
  ['4', 'مستويات قرار علاجي'],
];

const systemHighlights = [
  { title: 'الطالب لا يختار عشوائياً', body: 'المسار الموجه يفتح الدرس التالي بعد تسجيل الإتقان، مع بقاء التابات الأصلية للمعلم والأخصائي.', icon: BookOpenCheck },
  { title: 'صوت وصورة داخل النشاط', body: 'أزرار الاستماع موحدة عبر باكدج صوت ElevenLabs مع بديل عربي محلي عند عدم وجود مفاتيح الإنتاج.', icon: Volume2 },
  { title: 'تقرير قابل للطباعة', body: 'كل اختبار يحفظ المجالات، الإجابات، القرار، وخطة تدخل عملية تناسب متابعة الطالب في السعودية.', icon: FileText },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />

      <main>
        <section className="relative isolate min-h-[calc(100svh-128px)] overflow-hidden bg-slate-950 text-white lg:min-h-[calc(100svh-70px)]">
          <Image
            src="/learning/literacy-lab.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-42"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.94),rgba(15,23,42,0.78),rgba(15,23,42,0.34))]" />
          <div className="relative mx-auto flex min-h-[calc(100svh-128px)] max-w-7xl flex-col justify-center px-5 py-12 lg:min-h-[calc(100svh-70px)] lg:px-8">
            <div className="max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-black text-white/90 backdrop-blur">
                <BrandMark size="sm" showText={false} />
                منصة سعودية للتقييم والتعليم العلاجي
              </div>
              <h1 className="text-4xl font-black leading-[1.18] text-white md:text-6xl lg:text-7xl">
                مسار MASAR
              </h1>
              <h2 className="mt-3 text-2xl font-black leading-10 text-teal-100 md:text-4xl">نظام يقيس ثم يعلّم ثم يقرر الخطوة التالية</h2>
              <p className="mt-6 max-w-2xl text-base font-bold leading-8 text-white/82 md:text-xl md:leading-10">
                منصة تجمع اختبارات القبول، المناهج الموجهة، صوت النطق، الألعاب، وتقرير القرار في تجربة واحدة مصممة للأطفال ذوي صعوبات التعلم.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/assessment" className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-teal-950/30 transition hover:bg-teal-500">
                  ابدأ اختبار تحديد المستوى
                  <ArrowLeft size={18} />
                </Link>
                <Link href="/programs/reading" className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-white/24 bg-white/10 px-6 py-4 text-sm font-black text-white backdrop-blur transition hover:bg-white/16">
                  تصفح البرامج العلاجية
                  <BookOpenCheck size={18} />
                </Link>
              </div>
            </div>

            <div className="mt-12 grid max-w-4xl grid-cols-2 gap-3 md:grid-cols-4">
              {metrics.map(([value, label]) => (
                <div key={label} className="rounded-lg border border-white/14 bg-white/10 p-4 backdrop-blur">
                  <p className="text-3xl font-black text-white">{value}</p>
                  <p className="mt-1 text-sm font-bold leading-6 text-white/72">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
            <div className="grid gap-4 md:grid-cols-4">
              {workflow.map(({ title, body, icon: Icon }) => (
                <article key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-teal-50 text-teal-800">
                    <Icon size={22} strokeWidth={2.4} />
                  </div>
                  <h2 className="mt-4 text-lg font-black text-slate-950">{title}</h2>
                  <p className="mt-2 text-sm font-bold leading-7 text-slate-600">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-slate-950 text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div>
              <p className="text-sm font-black text-teal-200">داخل النظام بعد تسجيل الدخول</p>
              <h2 className="mt-2 text-3xl font-black leading-tight md:text-4xl">كل خطوة مربوطة بالتي بعدها</h2>
              <p className="mt-4 text-sm font-bold leading-8 text-white/70">
                الهدف مش شكل جميل فقط؛ الهدف إن الطالب ما يتوهش، والأخصائي يعرف لماذا فتحنا مهارة أو أعدنا تدريسها.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {systemHighlights.map(({ title, body, icon: Icon }) => (
                <article key={title} className="rounded-lg border border-white/10 bg-white/8 p-5">
                  <div className="grid h-11 w-11 place-items-center rounded-lg bg-teal-400/14 text-teal-200">
                    <Icon size={22} strokeWidth={2.4} />
                  </div>
                  <h3 className="mt-4 text-lg font-black text-white">{title}</h3>
                  <p className="mt-2 text-sm font-bold leading-7 text-white/68">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black text-teal-800">المسارات العلاجية</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">منهج مختصر للعرض، عميق في القياس</h2>
            </div>
            <Link href="/dashboard" className="focus-ring inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50">
              دخول لوحة التشغيل
              <BarChart3 size={17} />
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {curriculumPrograms.map((program) => (
              <Link key={program.slug} href={`/programs/${program.slug}`} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="h-2 w-24 rounded-full" style={{ backgroundColor: program.color }} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{program.duration}</span>
                </div>
                <p className="text-sm font-black" style={{ color: program.color }}>{program.tag}</p>
                <h3 className="mt-2 text-xl font-black text-slate-950">{program.shortTitle}</h3>
                <p className="mt-3 line-clamp-3 text-sm font-bold leading-7 text-slate-600">{program.promise}</p>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-xs font-black text-slate-500">{program.modules.length} مراحل قياس</span>
                  <span className="inline-flex items-center gap-1 text-sm font-black text-slate-950 transition group-hover:-translate-x-1">
                    فتح المسار
                    <ArrowLeft size={16} />
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
