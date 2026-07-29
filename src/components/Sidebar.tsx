import Link from 'next/link';
import { BarChart3, ClipboardList, FileText, Layers3 } from 'lucide-react';
import { curriculumPrograms } from '@/data/curriculum';

const adminLinks = [
  { name: 'لوحة التشغيل', path: '/dashboard', icon: BarChart3 },
  { name: 'التقارير', path: '/reports', icon: FileText },
  { name: 'إضافة طالب', path: '/student/new', icon: ClipboardList },
];

export default function Sidebar() {
  return (
    <aside className="sticky top-[118px] hidden h-[calc(100vh-118px)] w-72 shrink-0 overflow-y-auto border-l border-slate-200 bg-white lg:block">
      <div className="p-5">
        <p className="text-xs font-black uppercase text-slate-400">تشغيل المنصة</p>
        <div className="mt-3 grid gap-2">
          {adminLinks.map(({ name, path, icon: Icon }) => (
            <Link key={path} href={path} className="focus-ring flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-100">
              <Icon size={18} />
              {name}
            </Link>
          ))}
        </div>

        <div className="mt-7 border-t border-slate-200 pt-5">
          <p className="text-xs font-black uppercase text-slate-400">المسارات العلاجية</p>
          <div className="mt-3 grid gap-2">
            {curriculumPrograms.map((program) => (
              <Link key={program.slug} href={`/programs/${program.slug}`} className="focus-ring rounded-lg border border-transparent px-4 py-3 text-sm font-black text-slate-800 transition hover:border-slate-200 hover:bg-slate-50">
                <span className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-md bg-slate-100 text-slate-700">
                    <Layers3 size={15} />
                  </span>
                  <span>{program.shortTitle}</span>
                </span>
                <span className="mt-3 block h-1.5 rounded-full" style={{ backgroundColor: program.color }} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
