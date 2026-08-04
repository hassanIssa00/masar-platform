'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3, CalendarClock, ChevronLeft, ChevronRight, ClipboardCheck,
  CreditCard, BookOpen, FileText, Gamepad2, Layers3, LogOut, MessageSquareText,
  PanelRightClose, PanelRightOpen, Settings2, Stethoscope, UserRoundPlus, UsersRound, X,
  ClipboardList, Users, Building2, Bot
} from 'lucide-react';
import { curriculumPrograms } from '@/data/curriculum';
import { clearSession } from '@/lib/localDb';

const adminLinks = [
  { name: 'لوحة التشغيل', path: '/dashboard', icon: BarChart3 },
  { name: 'خطط IEP الفردية', path: '/iep', icon: ClipboardList },
  { name: 'جدول الجلسات', path: '/calendar', icon: CalendarClock },
  { name: 'إدارة الحضور والغياب', path: '/attendance', icon: ClipboardCheck },
  { name: 'قائمة الانتظار CRM', path: '/waitlist', icon: Users },
  { name: 'إدارة الطلاب', path: '/students', icon: UsersRound },
  { name: 'أولياء الأمور', path: '/parents', icon: UsersRound },
  { name: 'مساعد الذكاء الاصطناعي', path: '/ai-assistant', icon: Bot },
  { name: 'الفروع والعيادات', path: '/branches', icon: Building2 },
  { name: 'الفواتير والمالية', path: '/invoices', icon: CreditCard },
  { name: 'الأنشطة والواجبات', path: '/homework', icon: BookOpen },
  { name: 'اختبارات تحديد المستوى', path: '/assessment', icon: ClipboardCheck },
  { name: 'التقارير', path: '/reports', icon: FileText },
  { name: 'لوحة الأخصائي', path: '/specialist', icon: Stethoscope },
  { name: 'الرسائل', path: '/messages', icon: MessageSquareText },
  { name: 'اجتماعات Zoom', path: '/meetings', icon: CalendarClock },
  { name: 'طالب جديد', path: '/student/new', icon: UserRoundPlus },
  { name: 'ألعاب الطالب', path: '/kids', icon: Gamepad2 },
  { name: 'إعدادات المنصة', path: '/platform-settings', icon: Settings2 },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
  desktopOnly?: boolean;
}

export default function Sidebar({ open = false, onClose, desktopOnly = false }: SidebarProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('masar_sidebar_collapsed');
    if (saved === 'true') {
      setCollapsed(true);
    }
  }, []);

  const toggleCollapse = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    localStorage.setItem('masar_sidebar_collapsed', String(nextState));
  };

  const logout = () => {
    clearSession();
    router.push('/auth/login');
  };

  // ── Desktop Collapsible Sidebar ──────────────────────────────────────────
  if (desktopOnly) {
    return (
      <aside
        className={`
          sticky top-[65px] hidden h-[calc(100vh-65px)] shrink-0 overflow-y-auto border-l border-slate-200 bg-white
          transition-all duration-300 ease-in-out lg:flex lg:flex-col
          ${collapsed ? 'w-20' : 'w-72'}
        `}
        dir="rtl"
      >
        {/* Toggle Collapse Button Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-3">
          {!collapsed && (
            <span className="text-xs font-black uppercase text-slate-400">تشغيل المنصة</span>
          )}
          <button
            onClick={toggleCollapse}
            className={`
              grid h-9 w-9 place-items-center rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-700 transition border border-slate-200
              ${collapsed ? 'mx-auto' : ''}
            `}
            title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
            aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
          >
            {collapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
          </button>
        </div>

        {/* Links List */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="grid gap-1">
            {adminLinks.map(({ name, path, icon: Icon }) => (
              <Link
                key={path}
                href={path}
                title={collapsed ? name : undefined}
                className={`
                  focus-ring flex items-center rounded-xl transition hover:bg-teal-50 hover:text-teal-800 group
                  ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5 text-sm font-black text-slate-700'}
                `}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-700 transition">
                  <Icon size={18} />
                </span>
                {!collapsed && <span className="flex-1 truncate">{name}</span>}
                {!collapsed && <ChevronLeft size={14} className="text-slate-300 group-hover:text-teal-500 transition" />}
              </Link>
            ))}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            {!collapsed && (
              <p className="text-xs font-black uppercase text-slate-400 mb-3 px-2">المسارات العلاجية</p>
            )}
            <div className="grid gap-1">
              {curriculumPrograms.map((program) => (
                <Link
                  key={program.slug}
                  href={`/programs/${program.slug}`}
                  title={collapsed ? program.shortTitle : undefined}
                  className={`
                    focus-ring rounded-xl border border-transparent transition hover:border-slate-200 hover:bg-slate-50
                    ${collapsed ? 'flex justify-center p-2.5' : 'px-3 py-2.5 text-sm font-black text-slate-700'}
                  `}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                      style={{ backgroundColor: `${program.color}20`, color: program.color }}
                    >
                      <Layers3 size={16} />
                    </span>
                    {!collapsed && <span className="flex-1 truncate">{program.shortTitle}</span>}
                  </span>
                  {!collapsed && <span className="mt-2 block h-1 rounded-full" style={{ backgroundColor: program.color }} />}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="border-t border-slate-200 p-2">
          <button
            onClick={logout}
            title={collapsed ? 'تسجيل الخروج' : undefined}
            className={`
              flex items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-sm font-black text-rose-700 hover:bg-rose-100 transition
              ${collapsed ? 'h-10 w-full' : 'w-full gap-2 px-4 py-3'}
            `}
          >
            <LogOut size={18} />
            {!collapsed && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>
    );
  }

  // ── Mobile Drawer (Slides in from right) ──────────────────────────────────
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 right-0 z-50 h-full w-72 bg-white shadow-2xl border-l border-slate-200
          transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
        dir="rtl"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <p className="text-sm font-black text-slate-700">قائمة التنقل المنصة</p>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="h-[calc(100%-65px)] overflow-y-auto p-4 flex flex-col justify-between">
          <div>
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

          <div className="border-t border-slate-200 pt-4 mt-4">
            <button
              onClick={logout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-700 hover:bg-rose-100 transition"
            >
              <LogOut size={16} />
              تسجيل الخروج
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
