import Link from 'next/link';
import { curriculumPrograms } from '@/data/curriculum';

export default function Sidebar() {
  return (
    <aside className="sticky top-[65px] hidden h-[calc(100vh-65px)] w-72 shrink-0 overflow-y-auto border-l border-black/10 bg-white md:block">
      <div className="p-5">
        <p className="text-xs font-black text-stone-500">إدارة المنصة</p>
        <div className="mt-3 grid gap-2">
          <Link href="/dashboard" className="rounded-lg px-4 py-3 text-sm font-black text-stone-800 transition hover:bg-stone-100">
            لوحة التحكم
          </Link>
          <Link href="/reports" className="rounded-lg px-4 py-3 text-sm font-black text-stone-800 transition hover:bg-stone-100">
            التقارير
          </Link>
          <Link href="/survey" className="rounded-lg px-4 py-3 text-sm font-black text-stone-800 transition hover:bg-stone-100">
            استبيان الأسرة
          </Link>
        </div>

        <div className="mt-7 border-t border-black/10 pt-5">
          <p className="text-xs font-black text-stone-500">المناهج العلاجية</p>
          <div className="mt-3 grid gap-2">
            {curriculumPrograms.map((program) => (
              <Link
                key={program.slug}
                href={`/programs/${program.slug}`}
                className="rounded-lg border border-transparent px-4 py-3 text-sm font-black text-stone-800 transition hover:border-black/10 hover:bg-stone-50"
              >
                <span className="mb-2 block h-1.5 rounded-full" style={{ backgroundColor: program.color }} />
                {program.shortTitle}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
