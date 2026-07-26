import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 lg:px-10">
        <Link href="/" className="min-w-0">
          <span className="block text-lg font-black text-stone-950 md:text-2xl">د. إسماعيل عيسى</span>
          <span className="hidden text-xs font-bold text-stone-500 sm:block">تعليم علاجي، خطط فردية، متابعة تقدم</span>
        </Link>

        <div className="hidden items-center gap-1 rounded-lg bg-stone-100 p-1 md:flex">
          {[
            ['الرئيسية', '/'],
            ['لوحة التحكم', '/dashboard'],
            ['المناهج', '/programs/reading'],
            ['التقارير', '/reports'],
          ].map(([label, href]) => (
            <Link key={href} href={href} className="rounded-md px-4 py-2 text-sm font-black text-stone-700 transition hover:bg-white hover:text-stone-950">
              {label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link href="/auth/login" className="rounded-lg px-3 py-2 text-sm font-black text-stone-700 transition hover:bg-stone-100">
            دخول
          </Link>
          <Link href="/student/new" className="rounded-lg bg-[#1f6f63] px-4 py-2 text-sm font-black text-white transition hover:bg-[#18584f]">
            تقييم جديد
          </Link>
        </div>
      </div>
    </nav>
  );
}
