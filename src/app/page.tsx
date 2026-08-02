import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Gamepad2,
  LineChart,
  LockKeyhole,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
  Volume2,
} from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import Navbar from '@/components/Navbar';
import { curriculumPrograms } from '@/data/curriculum';

const trustPoints = ['تقييم أولي من ولي الأمر', 'تقرير إكلينيكي للدكتور', 'ألعاب آمنة للطالب', 'مسار لا يفتح إلا باعتماد'];

const journey = [
  { title: 'تسجيل الطفل', body: 'ولي الأمر يدخل بيانات الطالب والصف والملاحظات الأساسية.', icon: UserRoundPlus },
  { title: 'استبيان ولي الأمر', body: 'أسئلة منظمة تكشف مؤشرات القراءة والكتابة والرياضيات والنطق والانتباه.', icon: ClipboardCheck },
  { title: 'مراجعة الدكتور', body: 'النظام يحفظ تقرير إجابات خام وتقرير تحليل منفصل داخل لوحة د. إسماعيل.', icon: FileSearch },
  { title: 'صفحة الطالب', body: 'الطالب يرى الألعاب والتدريب فقط، بدون نتيجة أو تشخيص أو ضغط نفسي.', icon: Gamepad2 },
  { title: 'اعتماد المسار', body: 'د. إسماعيل يفتح البرنامج المناسب بعد مراجعة الملف والتقرير.', icon: ShieldCheck },
];

const roleViews = [
  { title: 'ولي الأمر', body: 'يدخل البيانات، يجيب الاستبيان، ويتابع حالة الملف بدون تفاصيل تشخيصية مبكرة.', icon: UsersRound },
  { title: 'الطالب', body: 'يدخل بيئة لعب وتدريب واضحة، ولا يرى درجات أو كلمات قد تؤثر عليه نفسياً.', icon: Gamepad2 },
  { title: 'د. إسماعيل', body: 'يرى الإجابات والتحليل والمجالات الأضعف، ثم يعتمد المسار المناسب.', icon: BarChart3 },
];

const reportRows = [
  ['القراءة والوعي الصوتي', 'أولوية مراجعة', 58],
  ['الكتابة والتآزر الحركي', 'احتياج متوسط', 64],
  ['الرياضيات ومفهوم العدد', 'مؤشر مستقر', 72],
  ['الانتباه والتنظيم الحسي', 'أولوية عالية', 49],
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <Navbar />

      <main>
        <section className="relative isolate overflow-hidden bg-slate-950 text-white">
          <Image
            src="/learning/communication-lab.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="hero-image-drift object-cover opacity-62"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.98)_0%,rgba(2,6,23,0.9)_38%,rgba(15,23,42,0.52)_100%)]" />
          <div className="animated-grid absolute inset-0 opacity-55" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#f5f7fb] via-slate-950/40 to-transparent" />

          <div className="relative mx-auto flex min-h-[calc(100svh-96px)] max-w-7xl flex-col justify-center px-5 py-12 lg:min-h-[calc(100svh-118px)] lg:px-8">
            <div className="motion-fade-up max-w-4xl">
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/18 bg-white/10 px-4 py-2 text-sm font-black text-white/90 backdrop-blur">
                <BrandMark size="sm" showText={false} />
                منصة د. إسماعيل عيسى لصعوبات التعلم والتأهيل الأكاديمي
              </div>

              <h1 className="max-w-4xl text-5xl font-black leading-[1.08] text-white md:text-7xl lg:text-8xl">
                مسار MASAR
              </h1>
              <p className="mt-5 max-w-3xl text-2xl font-black leading-10 text-teal-100 md:text-4xl md:leading-[1.35]">
                نظام يقرأ حالة الطفل، يحميه من التشتت، ويضع قرار المسار في يد المختص.
              </p>
              <p className="mt-6 max-w-2xl text-base font-bold leading-8 text-white/78 md:text-xl md:leading-10">
                تجربة واحدة تبدأ من ولي الأمر، تنتقل إلى تقرير دقيق لد. إسماعيل، ثم صفحة طالب بسيطة مليئة بالألعاب حتى يتم اعتماد البرنامج المناسب.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/auth/register" className="focus-ring shine-sweep inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-teal-500 px-7 py-4 text-sm font-black text-slate-950 shadow-2xl shadow-teal-950/40 hover:bg-teal-300">
                  ابدأ تسجيل ولي الأمر
                  <ArrowLeft size={18} />
                </Link>
                <Link href="/auth/login" className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-white/24 bg-white/10 px-7 py-4 text-sm font-black text-white backdrop-blur hover:bg-white/16">
                  دخول لوحة النظام
                  <LockKeyhole size={18} />
                </Link>
              </div>
            </div>

            <div className="stagger mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {trustPoints.map((point) => (
                <div key={point} className="rounded-lg border border-white/14 bg-white/10 px-4 py-3 backdrop-blur">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={17} className="text-teal-200" />
                    <p className="text-sm font-black leading-7 text-white">{point}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-[#f5f7fb]">
          <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
            <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr]">
              <div className="motion-fade-up">
                <p className="text-sm font-black text-teal-800">التدفق الحقيقي داخل المنصة</p>
                <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950 md:text-5xl">
                  لا اختيارات عشوائية، ولا نتائج ظاهرة للطفل
                </h2>
                <p className="mt-4 text-sm font-bold leading-8 text-slate-600 md:text-base">
                  الصفحة الرئيسية لازم تقول من أول لحظة إن المنصة مبنية حول حماية الطالب، دقة تقرير الدكتور، وسهولة متابعة ولي الأمر.
                </p>
              </div>

              <div className="stagger grid gap-3 md:grid-cols-5">
                {journey.map(({ title, body, icon: Icon }, index) => (
                  <article key={title} className="hover-lift rounded-lg border border-slate-200 bg-white p-4 soft-surface">
                    <div className="flex items-center justify-between gap-3">
                      <span className="grid h-11 w-11 place-items-center rounded-lg bg-teal-50 text-teal-800">
                        <Icon size={21} />
                      </span>
                      <span className="text-xs font-black text-slate-400">0{index + 1}</span>
                    </div>
                    <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
                    <p className="mt-2 text-xs font-bold leading-6 text-slate-600">{body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden bg-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 lg:grid-cols-[1fr_0.92fr] lg:px-8">
            <div>
              <p className="text-sm font-black text-teal-800">تقرير الدكتور</p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950 md:text-5xl">
                تقرير رسمي يفرق بين إجابات ولي الأمر والتحليل المهني
              </h2>
              <p className="mt-4 max-w-2xl text-sm font-bold leading-8 text-slate-600 md:text-base">
                الدكتور لا يرى مجرد رقم. يرى المجالات، الأولويات، الإجابات الخام، والخطة المقترحة قبل اعتماد المسار.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {roleViews.map(({ title, body, icon: Icon }) => (
                  <article key={title} className="hover-lift rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <Icon size={22} className="text-teal-700" />
                    <h3 className="mt-3 text-lg font-black text-slate-950">{title}</h3>
                    <p className="mt-2 text-xs font-bold leading-6 text-slate-600">{body}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="motion-slide-left rounded-lg border border-slate-200 bg-slate-950 p-5 text-white soft-surface">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-black text-teal-200">MASAR Clinical File</p>
                  <h3 className="mt-1 text-2xl font-black">التقرير التحليلي الشامل</h3>
                </div>
                <BrandMark size="md" showText={false} />
              </div>

              <div className="mt-5 space-y-3">
                {reportRows.map(([label, status, value]) => (
                  <div key={label} className="rounded-lg bg-white/8 p-4 ring-1 ring-white/10">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-white">{label}</p>
                        <p className="mt-1 text-xs font-bold text-white/55">{status}</p>
                      </div>
                      <span className="text-xl font-black text-teal-200">{value}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="motion-path h-full rounded-full bg-teal-300" style={{ width: `${value}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-lg border border-teal-300/20 bg-teal-300/10 p-4">
                <p className="text-sm font-black text-teal-100">قرار الدكتور</p>
                <p className="mt-2 text-sm font-bold leading-7 text-white/72">
                  الطالب يبقى في الألعاب التفاعلية حتى يتم اعتماد المسار المناسب من لوحة التقارير.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-slate-950 text-white">
          <Image src="/learning/math-lab.png" alt="" fill sizes="100vw" className="object-cover opacity-22" />
          <div className="absolute inset-0 bg-slate-950/88" />
          <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-black text-teal-200">المسارات العلاجية</p>
                <h2 className="mt-2 text-3xl font-black leading-tight md:text-5xl">مناهج تظهر عندما يقرر المختص</h2>
              </div>
              <Link href="/kids" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-teal-50">
                معاينة صفحة الطالب
                <Gamepad2 size={17} />
              </Link>
            </div>

            <div className="stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {curriculumPrograms.slice(0, 6).map((program) => (
                <Link key={program.slug} href={`/programs/${program.slug}`} className="hover-lift group rounded-lg border border-white/10 bg-white/8 p-5 backdrop-blur">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <span className="h-2 w-24 rounded-full" style={{ backgroundColor: program.color }} />
                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white/70">{program.duration}</span>
                  </div>
                  <p className="text-sm font-black text-teal-200">{program.tag}</p>
                  <h3 className="mt-2 text-xl font-black text-white">{program.shortTitle}</h3>
                  <p className="mt-3 line-clamp-3 text-sm font-bold leading-7 text-white/64">{program.promise}</p>
                  <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                    <span className="text-xs font-black text-white/50">{program.modules.length} مراحل قياس</span>
                    <span className="inline-flex items-center gap-1 text-sm font-black text-white group-hover:-translate-x-1">
                      فتح المسار
                      <ArrowLeft size={16} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <p className="text-sm font-black text-teal-800">الواجهة الجديدة</p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-slate-950 md:text-5xl">
                مصممة للموبايل، للأهل، وللطفل
              </h2>
              <p className="mt-4 max-w-xl text-sm font-bold leading-8 text-slate-600">
                كل زر واضح، كل خطوة مفهومة، ولا يوجد ازدحام في أول تجربة. البداية من ولي الأمر، ثم الطالب، ثم قرار الدكتور.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: 'صوت داخل الأنشطة', icon: Volume2 },
                { label: 'تقارير قابلة للطباعة', icon: LineChart },
                { label: 'مسار مقفل حتى الاعتماد', icon: LockKeyhole },
              ].map(({ label, icon: Icon }) => (
                <div key={label} className="hover-lift rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <Icon className="text-teal-700" size={25} />
                  <p className="mt-4 text-lg font-black leading-7 text-slate-950">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-[#f5f7fb]">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-12 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div>
              <p className="text-sm font-black text-teal-800">ابدأ المسار الصحيح</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">سجل ولي الأمر، ثم بيانات الطفل، ثم الاستبيان</h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/register" className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-slate-950 px-6 py-4 text-sm font-black text-white hover:bg-slate-800">
                إنشاء حساب ولي أمر
                <UserRoundPlus size={18} />
              </Link>
              <Link href="/auth/login" className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-800 hover:bg-slate-50">
                لدي حساب بالفعل
                <ArrowLeft size={18} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
