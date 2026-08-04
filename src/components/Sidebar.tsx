'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3, CalendarClock, ChevronLeft, ClipboardCheck,
  FileText, Gamepad2, Layers3, LogOut, MessageSquareText,
  Stethoscope, UserRoundPlus, UsersRound, X
} from 'lucide-react';
import { curriculumPrograms } from '@/data/curriculum';
import { clearSession } from '@/lib/localDb';

const adminLinks = [
  { name: 'لوحة التشغيل', path: '/dashboard', icon: BarChart3 },
  { name: 'إدارة الطلاب', path: '/students', icon: UsersRound },
  { name: 'أولياء الأمور', path: '/parents', icon: UsersRound },
  { name: 'اختبارات تحديد المستوى', path: '/assessment', icon: ClipboardCheck },
  { name: 'التقارير', path: '/reports', icon: FileText },
  { name: 'لوحة الأخصائي', path: '/specialist', icon: Stethoscope },
  { name: 'الرسائل', path: '/messages', icon: MessageSquareText },
  { name: 'اجتماعات Zoom', path: '/meetings', icon: CalendarClock },
  { name: 'طالب جديد', path: '/student/new', icon: UserRoundPlus },
  { name: 'ألعاب الطالب', path: '/kids', icon: Gamepad2 },
];

interface SidebarProps {
  /** Pass true to open as a mobile drawer. On desktop it's always visible. */
  open?: boolean;
  onClose?: () => void;
  /** If true, this is the desktop-pinned sidebar in the page layout (hidden on mobile). */
  desktopOnly?: boolean;
}

export default function Sidebar({ open = false, onClose, desktopOnly = false }: SidebarProps) {
  const router = useRouter();
  const logout = () => {
    clearSession();
    router.push('/auth/login');
  };

  const SidebarContent = () => (
    <div className="overflow-y-auto h-full" dir="rtl">
      <div className="p-4">
        <p className="text-xs font-black uppercase text-slate-400 mb-3">تشغيل المنصة</p>
        <div className="grid gap-1">
          {adminLinks.map(({ name, path, icon: Icon }) => (
            <Link
              key={path}
              href={path}
              onClick={onClose}
              className="focus-ring flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black text-slate-700 transition hover:bg-teal-50 hover:text-teal-800 group"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-700 transition">
                <Icon size={16} />
              </span>
              <span className="flex-1">{name}</span>
              <ChevronLeft size={14} className="text-slate-300 group-hover:text-teal-500 transition" />
            </Link>
          ))}
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-xs font-black uppercase text-slate-400 mb-3">المسارات العلاجية</p>
          <div className="grid gap-1">
            {curriculumPrograms.map((program) => (
              <Link
                key={program.slug}
                href={`/programs/${program.slug}`}
                onClick={onClose}
                className="focus-ring rounded-xl border border-transparent px-3 py-2.5 text-sm font-black text-slate-700 transition hover:border-slate-200 hover:bg-slate-50"
              >
                <span className="flex items-center gap-3">
                  <span
                    className="grid h-8 w-8 place-items-center rounded-lg"
                    style={{ backgroundColor: `${program.color}20`, color: program.color }}
                  >
                    <Layers3 size={14} />
                  </span>
                  <span className="flex-1">{program.shortTitle}</span>
                </span>
                <span className="mt-2 block h-1 rounded-full" style={{ backgroundColor: program.color }} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 p-4 mt-2">
        <button
          onClick={logout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 hover:bg-rose-100 transition"
        >
          <LogOut size={16} />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );

  // ── Desktop-pinned sidebar (used inside page layout flex) ──────────────
  if (desktopOnly) {
    return (
      <aside className="sticky top-[65px] hidden h-[calc(100vh-65px)] w-72 shrink-0 overflow-y-auto border-l border-slate-200 bg-white lg:flex lg:flex-col">
        <SidebarContent />
      </aside>
    );
  }

  // ── Mobile drawer (rendered by Navbar, slides in from right) ──────────
  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer panel */}
      <aside
        className={`
          fixed top-0 right-0 z-50 h-full w-72 bg-white shadow-2xl border-l border-slate-200
          transform transition-transform duration-300 ease-in-out lg:hidden
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Close button */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100" dir="rtl">
          <p className="text-sm font-black text-slate-700">قائمة التنقل</p>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100 text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>
        <div className="h-[calc(100%-61px)] overflow-y-auto">
          <SidebarContent />
        </div>
      </aside>
    </>
  );
}
