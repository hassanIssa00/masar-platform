import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, FileSearch, Gamepad2, LockKeyhole, ShieldCheck } from 'lucide-react';
import BrandMark from '@/components/BrandMark';

const promises = [
  { title: 'تقييم بدون ضغط', body: 'ولي الأمر يجيب، والطالب لا يرى تشخيصاً أو درجة.', icon: ShieldCheck },
  { title: 'تقرير للدكتور', body: 'إجابات خام وتحليل واضح قبل أي قرار علاجي.', icon: FileSearch },
  { title: 'مسار مقفل', body: 'المناهج لا تفتح إلا بعد اعتماد د. إسماعيل.', icon: LockKeyhole },
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <header className="absolute inset-x-0 top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-5 lg:px-8">
          <Link href="/" className="focus-ring rounded-lg">
            <BrandMark size="md" dark />
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/auth/login" className="focus-ring rounded-lg border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-black text-white backdrop-blur hover:bg-white/15">
              دخول
            </Link>
            <Link href="/auth/register" className="focus-ring rounded-lg bg-teal-400 px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-teal-950/30 hover:bg-teal-300">
              ابدأ الآن
            </Link>
          </div>
        </div>
      </header>

      <main className="relative isolate min-h-screen">
        <Image
          src="/learning/communication-lab.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hero-image-drift object-cover opacity-62"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.98)_0%,rgba(2,6,23,0.86)_42%,rgba(2,6,23,0.42)_100%)]" />
        <div className="animated-grid absolute inset-0 opacity-45" />

        <section className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-5 pb-10 pt-28 lg:grid-cols-[1fr_0.86fr] lg:px-8">
          <div className="motion-fade-up">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm font-black text-white/88 backdrop-blur">
              <BrandMark size="sm" showText={false} />
              بإشراف د. إسماعيل عيسى
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-[1.08] text-white md:text-7xl lg:text-8xl">
              تقييم ذكي.
              <br />
              مسار آمن.
            </h1>
            <p className="mt-6 max-w-2xl text-xl font-black leading-9 text-teal-100 md:text-3xl md:leading-[1.35]">
              منصة تقيس صعوبات التعلم، تحمي الطفل من التشخيص الظاهر، وتترك قرار البرنامج للمختص.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/register" className="focus-ring shine-sweep inline-flex min-h-14 items-center justify-center gap-2 rounded-lg bg-teal-400 px-7 py-4 text-sm font-black text-slate-950 shadow-2xl shadow-teal-950/40 hover:bg-teal-300">
                ابدأ تقييم ولي الأمر
                <ArrowLeft size={18} />
              </Link>
              <Link href="/auth/login" className="focus-ring inline-flex min-h-14 items-center justify-center gap-2 rounded-lg border border-white/22 bg-white/10 px-7 py-4 text-sm font-black text-white backdrop-blur hover:bg-white/16">
                تسجيل الدخول
                <LockKeyhole size={18} />
              </Link>
            </div>

            <div className="stagger mt-10 grid gap-3 sm:grid-cols-3">
              {promises.map(({ title, body, icon: Icon }) => (
                <article key={title} className="rounded-lg border border-white/12 bg-white/10 p-4 backdrop-blur">
                  <Icon size={22} className="text-teal-200" />
                  <h2 className="mt-3 text-lg font-black text-white">{title}</h2>
                  <p className="mt-1 text-xs font-bold leading-6 text-white/64">{body}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="motion-slide-left hidden lg:block">
            <div className="landing-console rounded-lg border border-white/14 bg-white/10 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-black text-teal-200">MASAR Review</p>
                  <h2 className="mt-1 text-2xl font-black">ملف طالب قيد القرار</h2>
                </div>
                <span className="grid h-12 w-12 place-items-center rounded-lg bg-teal-300/12 text-teal-200">
                  <FileSearch size={25} />
                </span>
              </div>

              <div className="mt-5 grid gap-3">
                {[
                  ['استبيان ولي الأمر', 'مكتمل'],
                  ['تقرير التحليل', 'جاهز للدكتور'],
                  ['صفحة الطالب', 'ألعاب فقط'],
                  ['المسار العلاجي', 'بانتظار الاعتماد'],
                ].map(([label, status]) => (
                  <div key={label} className="flex items-center justify-between rounded-lg bg-slate-950/50 p-4 ring-1 ring-white/10">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={18} className="text-teal-200" />
                      <p className="font-black text-white">{label}</p>
                    </div>
                    <p className="text-xs font-black text-white/55">{status}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-white/8 p-4 ring-1 ring-white/10">
                  <Gamepad2 size={22} className="text-teal-200" />
                  <p className="mt-2 text-sm font-black text-white">الطالب يلعب</p>
                </div>
                <div className="rounded-lg bg-white/8 p-4 ring-1 ring-white/10">
                  <ShieldCheck size={22} className="text-teal-200" />
                  <p className="mt-2 text-sm font-black text-white">الدكتور يعتمد</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
