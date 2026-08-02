'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BarChart3, CalendarClock, ClipboardCheck, FileText, Gamepad2, Layers3, LogOut, MessageSquareText, Stethoscope, UserRoundPlus, UsersRound } from 'lucide-react';
import { curriculumPrograms } from '@/data/curriculum';
import { clearSession } from '@/lib/localDb';

const adminLinks = [
  { name: 'لوحة التشغيل', path: '/dashboard', icon: BarChart3 },
  { name: 'إدارة الطلاب', path: '/students', icon: UsersRound },
  { name: 'اختبارات تحديد المستوى', path: '/assessment', icon: ClipboardCheck },
  { name: 'التقارير', path: '/reports', icon: FileText },
  { name: 'لوحة الأخصائي', path: '/specialist', icon: Stethoscope },
  { name: 'بوابة ولي الأمر', path: '/parent', icon: UsersRound },
  { name: 'الرسائل', path: '/messages', icon: MessageSquareText },
  { name: 'اجتماعات Zoom', path: '/meetings', icon: CalendarClock },
  { name: 'ألعاب الطالب', path: '/kids', icon: Gamepad2 },
  { name: 'طالب جديد', path: '/student/new', icon: UserRoundPlus },
];

export default function Sidebar() {
  const router = useRouter();
  const logout = () => {
    clearSession();
    router.push('/auth/login');
  };

  return (
    <aside className="sticky top-[73px] hidden h-[calc(100vh-73px)] w-72 shrink-0 overflow-y-auto border-l border-slate-200 bg-white lg:flex lg:flex-col">
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
      <div className="mt-auto border-t border-slate-200 p-5">
        <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
          <LogOut size={18} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
