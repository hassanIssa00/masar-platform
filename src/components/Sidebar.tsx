'use client';

import { useEffect, useState } from 'react';
import type { ElementType } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3, CalendarClock, ChevronDown, ClipboardCheck,
  BookOpen, FileText, Gamepad2, LogOut, MessageSquareText,
  PanelRightClose, PanelRightOpen, Settings2, Stethoscope, UserRoundPlus, UsersRound, X,
  ClipboardList, Users, Building2, Bot, KeyRound, Route, FolderKanban
} from 'lucide-react';
import { clearSession, getSession } from '@/lib/localDb';

type NavLink = {
  name: string;
  path: string;
  icon: ElementType;
};

type NavGroup = {
  id: string;
  title: string;
  icon: ElementType;
  links: NavLink[];
};

const adminGroups: NavGroup[] = [
  {
    id: 'operation',
    title: 'التشغيل',
    icon: BarChart3,
    links: [
      { name: 'لوحة التشغيل', path: '/dashboard', icon: BarChart3 },
      { name: 'مساعد الذكاء الاصطناعي', path: '/ai-assistant', icon: Bot },
    ],
  },
  {
    id: 'students',
    title: 'الطلاب والحسابات',
    icon: UsersRound,
    links: [
      { name: 'إدارة الطلاب', path: '/students', icon: UsersRound },
      { name: 'توليد الحسابات', path: '/account-generator', icon: KeyRound },
      { name: 'أولياء الأمور', path: '/parents', icon: Users },
      { name: 'الرسائل', path: '/messages', icon: MessageSquareText },
    ],
  },
  {
    id: 'clinical',
    title: 'التقييم والتقارير',
    icon: ClipboardCheck,
    links: [
      { name: 'اختبارات تحديد المستوى', path: '/assessment', icon: ClipboardCheck },
      { name: 'التقارير', path: '/reports', icon: FileText },
    ],
  },
  {
    id: 'programs',
    title: 'المسارات والخطط',
    icon: Route,
    links: [
      { name: 'المسارات العلاجية', path: '/programs', icon: Route },
      { name: 'خطط IEP الفردية', path: '/iep', icon: ClipboardList },
      { name: 'مكتبة الموارد', path: '/resources', icon: BookOpen },
    ],
  },
  {
    id: 'sessions',
    title: 'الجلسات والتواصل',
    icon: CalendarClock,
    links: [
      { name: 'جدول الجلسات', path: '/calendar', icon: CalendarClock },
      { name: 'اجتماعات Zoom', path: '/meetings', icon: CalendarClock },
    ],
  },
  {
    id: 'classroom',
    title: 'الفصل والإعدادات',
    icon: FolderKanban,
    links: [
      { name: 'فصل د. إسماعيل عيسى', path: '/branches/ikhlas-jeddah', icon: Building2 },
      { name: 'إعدادات المنصة', path: '/platform-settings', icon: Settings2 },
    ],
  },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
  desktopOnly?: boolean;
}

export default function Sidebar({ open: externalOpen = false, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    operation: true,
    students: true,
    clinical: true,
    programs: true,
    sessions: false,
    classroom: true,
  });
  const [userRole, setUserRole] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const session = getSession();
      if (session?.role) return session.role;
      return localStorage.getItem('user_role') || 'doctor';
    }
    return 'doctor';
  });

  useEffect(() => {
    const saved = localStorage.getItem('masar_sidebar_collapsed');
    if (saved === 'true') {
      setCollapsed(true);
    }
    const session = getSession();
    if (session?.role) {
      setUserRole(session.role);
    }

    const handleToggle = () => {
      if (window.innerWidth >= 1024) {
        setCollapsed((prev) => {
          const next = !prev;
          localStorage.setItem('masar_sidebar_collapsed', String(next));
          return next;
        });
      } else {
        setMobileOpen((prev) => !prev);
      }
    };

    window.addEventListener('masar_toggle_sidebar', handleToggle);
    return () => window.removeEventListener('masar_toggle_sidebar', handleToggle);
  }, []);

  const isStaff = userRole === 'doctor' || userRole === 'specialist' || userRole === 'teacher';

  const parentLinks = [
    { name: 'بوابة ولي الأمر', path: '/parent', icon: Building2 },
    { name: 'استبيان طفل جديد', path: '/survey', icon: ClipboardList },
    { name: 'أولادي', path: '/parent', icon: Users },
  ];

  const studentLinks = [
    { name: 'فصلي المباشر', path: '/school-student', icon: Building2 },
    { name: 'ألعابي', path: '/kids', icon: Gamepad2 },
  ];

  const activeNavGroups = isStaff
    ? adminGroups
    : [
        {
          id: userRole === 'student' ? 'student' : 'parent',
          title: userRole === 'student' ? 'بوابة الطالب' : 'بوابة ولي الأمر',
          icon: userRole === 'student' ? Gamepad2 : Building2,
          links: userRole === 'student' ? studentLinks : parentLinks,
        },
      ];

  const toggleCollapse = () => {
    const nextState = !collapsed;
    setCollapsed(nextState);
    localStorage.setItem('masar_sidebar_collapsed', String(nextState));
  };

  const logout = () => {
    clearSession();
    router.push('/auth/login');
  };

  const isMobileShow = mobileOpen || externalOpen;

  const isPathActive = (path: string) => pathname === path || (path !== '/dashboard' && pathname.startsWith(`${path}/`));

  return (
    <>
      {/* Backdrop for mobile screen when toggled open */}
      {isMobileShow && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden"
          onClick={() => { setMobileOpen(false); onClose?.(); }}
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`
          sticky top-[65px] h-[calc(100vh-65px)] shrink-0 overflow-y-auto border-l border-slate-200 bg-white
          transition-all duration-300 ease-in-out z-40 text-slate-800 font-sans shadow-sm
          lg:flex lg:flex-col
          ${isMobileShow ? 'fixed top-0 right-0 z-50 h-full w-80 flex flex-col shadow-2xl translate-x-0' : 'hidden lg:flex lg:flex-col'}
          ${collapsed && !isMobileShow ? 'w-20' : 'w-80'}
        `}
        dir="rtl"
      >
        {/* Toggle Collapse Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-3.5">
          {(!collapsed || isMobileShow) && (
            <span className="text-sm font-black tracking-wide text-slate-600 uppercase">تشغيل المنصة</span>
          )}
          <div className="flex items-center gap-1">
            {isMobileShow && (
              <button
                onClick={() => { setMobileOpen(false); onClose?.(); }}
                className="lg:hidden grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X size={20} />
              </button>
            )}
            <button
              onClick={toggleCollapse}
              className={`
                hidden lg:grid h-9 w-9 place-items-center rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-700 transition border border-slate-200 cursor-pointer
                ${collapsed ? 'mx-auto' : ''}
              `}
              title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
              aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
            >
              {collapsed ? <PanelRightOpen size={20} /> : <PanelRightClose size={20} />}
            </button>
          </div>
        </div>

        {/* Links List */}
        <div className="flex-1 overflow-y-auto p-2.5">
          <div className="grid gap-2">
            {activeNavGroups.map((group) => {
              const GroupIcon = group.icon;
              const groupActive = group.links.some((link) => isPathActive(link.path));
              const groupOpen = collapsed && !isMobileShow ? false : Boolean(openGroups[group.id]);
              return (
                <section
                  key={group.id}
                  className={`rounded-2xl border transition-colors duration-200 ${
                    groupActive ? 'border-teal-100 bg-teal-50/60' : 'border-slate-100 bg-white'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (collapsed && !isMobileShow) return;
                      setOpenGroups((current) => ({ ...current, [group.id]: !current[group.id] }));
                    }}
                    title={collapsed && !isMobileShow ? group.title : undefined}
                    className={`
                      flex w-full items-center rounded-2xl font-black text-slate-800 transition duration-200
                      ${collapsed && !isMobileShow ? 'justify-center px-0 py-3' : 'gap-3 px-3.5 py-3 text-sm'}
                      ${groupActive ? 'text-teal-900' : 'hover:bg-slate-50'}
                    `}
                  >
                    <GroupIcon className={`shrink-0 ${collapsed && !isMobileShow ? 'h-6 w-6' : 'h-5 w-5'} ${groupActive ? 'text-teal-700' : 'text-slate-500'}`} />
                    {(!collapsed || isMobileShow) && (
                      <>
                        <span className="min-w-0 flex-1 truncate text-right leading-5">{group.title}</span>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${groupOpen ? 'rotate-180' : ''}`} />
                      </>
                    )}
                  </button>

                  {(!collapsed || isMobileShow) && (
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                        groupOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="grid gap-1 px-2 pb-2">
                          {group.links.map(({ name, path, icon: Icon }) => {
                            const isActive = isPathActive(path);
                            return (
                              <Link
                                key={path}
                                href={path}
                                onClick={() => { setMobileOpen(false); onClose?.(); }}
                                className={`
                                  focus-ring group flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-black leading-5 transition duration-200
                                  ${
                                    isActive
                                      ? 'border-teal-700 bg-teal-700 text-white shadow-sm shadow-teal-700/20'
                                      : 'border-transparent text-slate-700 hover:border-teal-100 hover:bg-white hover:text-teal-800'
                                  }
                                `}
                              >
                                <Icon className={`h-[18px] w-[18px] shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-teal-700'}`} />
                                <span className="truncate">{name}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        {/* Logout Footer Button */}
        <div className="border-t border-slate-100 p-2.5">
          <button
            onClick={logout}
            title={collapsed && !isMobileShow ? 'تسجيل الخروج' : undefined}
            className={`
              flex w-full items-center rounded-2xl border border-transparent font-black text-rose-700 transition hover:bg-rose-50 hover:border-rose-100 cursor-pointer
              ${collapsed && !isMobileShow ? 'justify-center px-0 py-3' : 'gap-3.5 px-4 py-3 text-sm md:text-[15px]'}
            `}
          >
            <LogOut className={`shrink-0 ${collapsed && !isMobileShow ? 'h-6 w-6' : 'h-5 w-5'}`} />
            {(!collapsed || isMobileShow) && <span className="truncate leading-tight font-black">تسجيل الخروج</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
