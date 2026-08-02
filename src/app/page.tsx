import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Brain, Eye, FileSearch, Hand, LockKeyhole, Shapes, ShieldCheck, Volume2 } from 'lucide-react';
import BrandMark from '@/components/BrandMark';

const therapyAreas = ['قراءة وتهجئة', 'كتابة وإملاء', 'رياضيات محسوسة', 'نطق وتخاطب', 'انتباه وسلوك', 'تنظيم حسي'];

const methods = [
  { title: 'تعليم صريح ومنظم', body: 'خطوات قصيرة: نموذج، تدريب، قياس، ثم انتقال.', icon: Brain },
  { title: 'تعدد حسي', body: 'صوت، صورة، لمس، وحركة لتثبيت المهارة.', icon: Hand },
  { title: 'تمثيل بصري ومحسوس', body: 'خصوصاً في القراءة والرياضيات قبل الرمز المجرد.', icon: Shapes },
  { title: 'قياس قبل القرار', body: 'التقرير يحدد المسار، وليس انطباعاً عاماً.', icon: FileSearch },
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

      <main>
        <section className="relative isolate min-h-screen overflow-hidden">
          <Image src="/learning/communication-lab.png" alt="" fill priority sizes="100vw" className="hero-image-drift object-cover opacity-58" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.98)_0%,rgba(2,6,23,0.9)_42%,rgba(2,6,23,0.48)_100%)]" />
          <div className="animated-grid absolute inset-0 opacity-45" />

          <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-5 pb-12 pt-28 lg:grid-cols-[1fr_0.82fr] lg:px-8">
            <div className="motion-fade-up">
              <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-sm font-black text-white/88 backdrop-blur">
                <BrandMark size="sm" showText={false} />
                بإشراف د. إسماعيل عيسى
              </div>

              <h1 className="max-w-4xl text-4xl font-black leading-[1.1] text-white sm:text-5xl md:text-7xl lg:text-8xl">
                علاج صعوبات التعلم.
                <br />
                بطريقة تقيس ثم تعالج.
              </h1>
              <p className="mt-6 max-w-2xl text-lg font-black leading-8 text-teal-100 md:text-3xl md:leading-[1.35]">
                قراءة، كتابة، رياضيات، نطق، انتباه وسلوك. بخطة مبنية على تقييم واضح.
              </p>

              <div className="mt-8 flex flex-wrap gap-2">
                {therapyAreas.map((area) => (
                  <span key={area} className="rounded-lg border border-white/14 bg-white/10 px-4 py-2 text-sm font-black text-white/86 backdrop-blur">
                    {area}
                  </span>
                ))}
              </div>

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
            </div>

            <div className="motion-slide-left hidden lg:block">
              <div className="landing-console rounded-lg border border-white/14 bg-white/10 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs font-black text-teal-200">MASAR Method</p>
                    <h2 className="mt-1 text-2xl font-black">أساليب علاج حديثة</h2>
                  </div>
                  <span className="grid h-12 w-12 place-items-center rounded-lg bg-teal-300/12 text-teal-200">
                    <ShieldCheck size={25} />
                  </span>
                </div>

                <div className="mt-5 grid gap-3">
                  {methods.map(({ title, body, icon: Icon }) => (
                    <article key={title} className="rounded-lg bg-slate-950/50 p-4 ring-1 ring-white/10">
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-teal-300/12 text-teal-200">
                          <Icon size={20} />
                        </span>
                        <div>
                          <h3 className="font-black text-white">{title}</h3>
                          <p className="mt-1 text-xs font-bold leading-6 text-white/58">{body}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-slate-950 px-5 py-10 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
            {[
              { title: 'الطفل لا يرى تشخيصاً', icon: Eye },
              { title: 'النطق بصوت واضح', icon: Volume2 },
              { title: 'المسار يفتح باعتماد', icon: LockKeyhole },
            ].map(({ title, icon: Icon }) => (
              <article key={title} className="hover-lift rounded-lg border border-white/10 bg-white/6 p-5 backdrop-blur">
                <Icon className="text-teal-200" size={25} />
                <h2 className="mt-4 text-xl font-black text-white">{title}</h2>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
