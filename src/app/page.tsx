import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Gamepad2,
  LineChart,
  LockKeyhole,
  Route,
  ShieldCheck,
  UserRoundPlus,
  Volume2,
} from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import Navbar from '@/components/Navbar';
import { curriculumPrograms } from '@/data/curriculum';

const workflow = [
  { title: 'ملف الطالب', body: 'ولي الأمر يسجل بيانات الطفل والصف والملاحظات المهمة قبل أي تقييم.', icon: UserRoundPlus },
  { title: 'استبيان شامل', body: 'أسئلة منظمة تكشف القراءة، الكتابة، الرياضيات، النطق، الانتباه، والتواصل.', icon: ClipboardCheck },
  { title: 'تقريران للدكتور', body: 'تقرير إجابات خام وتقرير تحليل إكلينيكي مستقل بدون كشف النتيجة للطالب.', icon: FileSearch },
  { title: 'اعتماد المسار', body: 'د. إسماعيل يراجع الملف ثم يفتح للطالب المسار المناسب فقط.', icon: ShieldCheck },
];

const metrics = [
  ['7', 'مستويات تقييم'],
  ['35', 'سؤال استبيان'],
  ['2', 'تقريران لكل طالب'],
  ['8', 'ألعاب تدريبية'],
];

const systemHighlights = [
  { title: 'منع التشتت', body: 'الطالب لا يرى كل المناهج مرة واحدة؛ تظهر الألعاب أولاً ثم المسار المعتمد من الدكتور.', icon: LockKeyhole },
  { title: 'صوت وصورة داخل النشاط', body: 'أزرار استماع موحدة وصور تعليمية داخل الدروس لتقليل الحمل المعرفي على الطفل.', icon: Volume2 },
  { title: 'تقرير قابل للقرار', body: 'التحليل لا يكتفي بالنسبة؛ يعرض المجالات الأضعف، الأولويات، وأهداف الخطة الفردية.', icon: LineChart },
];

const reportPreview = [
  ['القراءة والوعي الصوتي', 58],
  ['الكتابة والتآزر الحركي', 64],
  ['الرياضيات ومفهوم العدد', 72],
  ['الانتباه والتنظيم الحسي', 49],
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
            className="object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.96),rgba(15,23,42,0.82),rgba(15,23,42,0.42))]" />
          <div className="animated-grid absolute inset-0 opacity-70" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950 to-transparent" />

          <div className="relative mx-auto grid min-h-[calc(100svh-128px)] max-w-7xl items-center gap-10 px-5 py-10 lg:min-h-[calc(100svh-70px)] lg:grid-cols-[1.04fr_0.96fr] lg:px-8">
            <div className="motion-fade-up max-w-3xl">
              <div className="mb-5 inline-flex items-center gap-3 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-black text-white/90 backdrop-blur">
                <BrandMark size="sm" showText={false} />
                منصة د. إسماعيل عيسى للتأهيل والتعليم الذكي
              </div>
              <h1 className="text-5xl font-black leading-[1.12] text-white md:text-7xl">
                مسار MASAR
              </h1>
              <h2 className="mt-4 max-w-3xl text-2xl font-black leading-10 text-teal-100 md:text-4xl">
                من تسجيل الطفل إلى قرار المسار العلاجي في تجربة واحدة مترابطة
              </h2>
              <p className="mt-6 max-w-2xl text-base font-bold leading-8 text-white/82 md:text-xl md:leading-10">
                النظام يبدأ ببيانات الطفل والاستبيان، يرسل تقارير مفصلة للدكتور، ثم يفتح للطالب بيئة لعب آمنة حتى يعتمد د. إسماعيل المسار المناسب.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/student/new" className="focus-ring shine-sweep inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-teal-950/30 hover:bg-teal-500">
                  تسجيل طالب وبدء الاستبيان
                  <ArrowLeft size={18} />
                </Link>
                <Link href="/reports" className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-white/24 bg-white/10 px-6 py-4 text-sm font-black text-white backdrop-blur hover:bg-white/16">
                  عرض تقارير الدكتور
                  <BarChart3 size={18} />
                </Link>
              </div>

              <div className="stagger mt-10 grid max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
                {metrics.map(([value, label]) => (
                  <div key={label} className="glass-panel rounded-lg p-4">
                    <p className="text-3xl font-black text-white">{value}</p>
                    <p className="mt-1 text-sm font-bold leading-6 text-white/72">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="motion-slide-left hidden lg:block">
              <div className="motion-float glass-panel rounded-lg p-5">
                <div className="flex items-center justify-between gap-4 border-b border-white/12 pb-4">
                  <div>
                    <p className="text-xs font-black text-teal-200">لوحة القرار السريري</p>
                    <h3 className="mt-1 text-2xl font-black text-white">ملف طالب قيد المراجعة</h3>
                  </div>
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-teal-400/16 text-teal-200">
                    <Brain size={25} />
                  </div>
                </div>

                <div className="relative mt-5 overflow-hidden rounded-lg border border-white/10 bg-slate-950/62 p-4">
                  <div className="motion-scan pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-teal-300/22 to-transparent" />
                  <div className="grid gap-3">
                    {reportPreview.map(([label, value]) => (
                      <div key={label} className="rounded-lg bg-white/8 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-sm font-black text-white">{label}</span>
                          <span className="text-sm font-black text-teal-200">{value}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="motion-path h-full rounded-full bg-teal-300" style={{ width: `${value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-white/10 bg-white/8 p-4">
                    <p className="text-xs font-black text-white/58">الطالب يرى</p>
                    <p className="mt-1 text-lg font-black text-white">ألعاب ورسائل تشجيع</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/8 p-4">
                    <p className="text-xs font-black text-white/58">الدكتور يرى</p>
                    <p className="mt-1 text-lg font-black text-white">إجابات وتحليل وخطة</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
            <div className="mb-9 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-black text-teal-800">رحلة الطالب داخل النظام</p>
                <h2 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">كل خطوة لها وظيفة واضحة</h2>
              </div>
              <p className="max-w-xl text-sm font-bold leading-7 text-slate-600">
                التصميم الجديد يوجه ولي الأمر والطالب والدكتور بدون خلط أدوار أو إظهار نتيجة حساسة للطفل.
              </p>
            </div>

            <div className="stagger path-line grid gap-4 md:grid-cols-4 md:[&.path-line]:before:hidden">
              {workflow.map(({ title, body, icon: Icon }, index) => (
                <article key={title} className="hover-lift relative rounded-lg border border-slate-200 bg-white p-5 soft-surface">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-800">
                      <Icon size={23} strokeWidth={2.4} />
                    </div>
                    <span className="text-sm font-black text-slate-400">0{index + 1}</span>
                  </div>
                  <h3 className="mt-5 text-xl font-black text-slate-950">{title}</h3>
                  <p className="mt-2 text-sm font-bold leading-7 text-slate-600">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
          <Image src="/learning/communication-lab.png" alt="" fill sizes="100vw" className="object-cover opacity-24" />
          <div className="absolute inset-0 bg-slate-950/86" />
          <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
            <div className="motion-fade-up">
              <p className="text-sm font-black text-teal-200">داخل النظام بعد تسجيل الدخول</p>
              <h2 className="mt-2 text-3xl font-black leading-tight md:text-4xl">تفاعل مدروس، مش حركة للزينة</h2>
              <p className="mt-4 text-sm font-bold leading-8 text-white/70">
                الحركات والانتقالات مصممة تساعد الطفل يفهم أين يضغط، وتساعد الدكتور يقرأ الحالة بسرعة، وتخلي الموبايل أخف وأسهل.
              </p>
              <Link href="/kids" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-teal-50">
                تجربة بوابة الطالب
                <Gamepad2 size={17} />
              </Link>
            </div>

            <div className="stagger grid gap-4 md:grid-cols-3">
              {systemHighlights.map(({ title, body, icon: Icon }) => (
                <article key={title} className="hover-lift rounded-lg border border-white/10 bg-white/8 p-5 backdrop-blur">
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

        <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black text-teal-800">المسارات العلاجية</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">مناهج تظهر بقرار، لا باختيار عشوائي</h2>
            </div>
            <Link href="/dashboard" className="focus-ring inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50">
              دخول لوحة التشغيل
              <Route size={17} />
            </Link>
          </div>

          <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {curriculumPrograms.map((program) => (
              <Link key={program.slug} href={`/programs/${program.slug}`} className="hover-lift group rounded-lg border border-slate-200 bg-white p-5 soft-surface">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <span className="h-2 w-24 rounded-full" style={{ backgroundColor: program.color }} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{program.duration}</span>
                </div>
                <p className="text-sm font-black" style={{ color: program.color }}>{program.tag}</p>
                <h3 className="mt-2 text-xl font-black text-slate-950">{program.shortTitle}</h3>
                <p className="mt-3 line-clamp-3 text-sm font-bold leading-7 text-slate-600">{program.promise}</p>
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <span className="text-xs font-black text-slate-500">{program.modules.length} مراحل قياس</span>
                  <span className="inline-flex items-center gap-1 text-sm font-black text-slate-950 group-hover:-translate-x-1">
                    فتح المسار
                    <ArrowLeft size={16} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 py-12 lg:grid-cols-[1fr_420px] lg:px-8">
            <div>
              <p className="text-sm font-black text-teal-800">جاهز للتشغيل</p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950 md:text-4xl">
                ابدأ من تسجيل طالب جديد وسيقوم النظام ببناء ملف المراجعة تلقائياً
              </h2>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-8 text-slate-600">
                الواجهة الآن تعرض القيمة الحقيقية للنظام من أول شاشة: قياس، تقرير، مراجعة الدكتور، ثم فتح مسار علاجي مناسب.
              </p>
            </div>
            <div className="flex flex-col justify-center gap-3 sm:flex-row lg:flex-col">
              <Link href="/student/new" className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-6 py-4 text-sm font-black text-white hover:bg-slate-800">
                تسجيل طالب جديد
                <UserRoundPlus size={18} />
              </Link>
              <Link href="/auth/login" className="focus-ring inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-800 hover:bg-slate-50">
                تسجيل الدخول
                <CheckCircle2 size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
