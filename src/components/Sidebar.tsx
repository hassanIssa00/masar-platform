'use client';

import { useEffect, useState } from 'react';
import type { ElementType } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3, CalendarClock, ChevronDown, ClipboardCheck,
  BookOpen, FileText, Gamepad2, LogOut, MessageSquareText,
  PanelRightClose, PanelRightOpen, Settings2, UsersRound, X,
  ClipboardList, Users, Building2, Bot, KeyRound, Route, FolderKanban,
  Sparkles, ShieldCheck
} from 'lucide-react';
import { clearSession, getSession, getStudents, getReports } from '@/lib/localDb';

type NavLink = {
  name: string;
  path: string;
  icon: ElementType;
  badge?: string | number;
  badgeColor?: string;
};

type NavGroup = {
  id: string;
  title: string;
  icon: ElementType;
  links: NavLink[];
};

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
  const [studentsCount, setStudentsCount] = useState<number>(0);
  const [reportsCount, setReportsCount] = useState<number>(0);
  const [userName, setUserName] = useState<string>('');
  
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    operation: true,
    students: true,
    clinical: true,
    programs: false,
    sessions: false,
    classroom: false,
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
    if (session?.name) {
      setUserName(session.name);
    } else if (typeof window !== 'undefined') {
      setUserName(localStorage.getItem('user_name') || 'د. إسماعيل عيسى');
    }

    try {
      const st = getStudents();
      setStudentsCount(st?.length || 0);
      const rp = getReports();
      setReportsCount(rp?.length || 0);
    } catch {}

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

  const adminGroups: NavGroup[] = [
    {
      id: 'operation',
      title: 'التشغيل',
      icon: BarChart3,
      links: [
        { name: 'لوحة التشغيل', path: '/dashboard', icon: BarChart3 },
        { name: 'مساعد الذكاء الاصطناعي', path: '/ai-assistant', icon: Bot, badge: 'AI ⚡', badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
      ],
    },
    {
      id: 'students',
      title: 'الطلاب والحسابات',
      icon: UsersRound,
      links: [
        { name: 'إدارة الطلاب', path: '/students', icon: UsersRound, badge: studentsCount || undefined, badgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/40' },
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
        { name: 'التقارير', path: '/reports', icon: FileText, badge: reportsCount || undefined, badgeColor: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40' },
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
        { name: 'اجتماعات Zoom', path: '/meetings', icon: CalendarClock, badge: 'مباشر', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
      ],
    },
    {
      id: 'classroom',
      title: 'الفصل والإعدادات',
      icon: FolderKanban,
      links: [
        { name: 'فصل د. إسماعيل عيسى', path: '/branches/ikhlas-jeddah', icon: Building2, badge: '🌟', badgeColor: 'bg-amber-400/20 text-amber-300 border-amber-400/40' },
        { name: 'إعدادات المنصة', path: '/platform-settings', icon: Settings2 },
      ],
    },
  ];

  const parentLinks = [
    { name: 'بوابة ولي الأمر', path: '/parent', icon: Building2 },
    { name: 'استبيان طفل جديد', path: '/survey', icon: ClipboardList },
    { name: 'أولادي', path: '/parent', icon: Users, badge: studentsCount || undefined },
  ];

  const studentLinks = [
    { name: 'فصلي المباشر', path: '/school-student', icon: Building2, badge: 'مباشر' },
    { name: 'ألعابي', path: '/kids', icon: Gamepad2 },
  ];

  const activeNavGroups: NavGroup[] = isStaff
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
      {/* Backdrop for mobile view */}
      {isMobileShow && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => { setMobileOpen(false); onClose?.(); }}
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`
          sticky top-[65px] h-[calc(100vh-65px)] shrink-0 overflow-y-auto
          bg-gradient-to-b from-[#0e3b3d] via-[#092d2f] to-[#061f20]
          border-l border-[#154d50]/70 text-teal-100 font-sans shadow-2xl
          transition-all duration-300 ease-in-out z-40 select-none
          [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-teal-700/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent
          lg:flex lg:flex-col
          ${isMobileShow ? 'fixed top-0 right-0 z-50 h-full w-80 flex flex-col shadow-2xl translate-x-0' : 'hidden lg:flex lg:flex-col'}
          ${collapsed && !isMobileShow ? 'w-20' : 'w-76 xl:w-80'}
        `}
        dir="rtl"
      >
        {/* Top Header Card (Brand Style matching reference) */}
        <div className="p-3">
          {(!collapsed || isMobileShow) ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#175b5e] to-[#12494c] p-3.5 border border-teal-500/30 shadow-lg shadow-teal-950/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-teal-400/20 border border-teal-300/30 text-teal-200 shadow-inner">
                    <Sparkles className="h-5 w-5 text-teal-300" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white tracking-wide leading-tight">مَسَار</h2>
                    <p className="text-[10px] font-bold text-teal-200/90 leading-tight mt-0.5">المنصة التعليمية الشاملة</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isMobileShow && (
                    <button
                      onClick={() => { setMobileOpen(false); onClose?.(); }}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-teal-900/60 text-teal-200 hover:bg-teal-800 hover:text-white transition"
                    >
                      <X size={18} />
                    </button>
                  )}
                  <button
                    onClick={toggleCollapse}
                    className="hidden lg:grid h-8 w-8 place-items-center rounded-lg bg-teal-900/50 hover:bg-teal-800 text-teal-200 hover:text-white border border-teal-600/30 transition cursor-pointer"
                    title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
                    aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
                  >
                    <PanelRightClose size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-1">
              <button
                onClick={toggleCollapse}
                className="grid h-10 w-10 place-items-center rounded-xl bg-[#165a5d] text-teal-100 hover:bg-teal-600 hover:text-white border border-teal-400/30 transition shadow-md cursor-pointer"
                title="توسيع القائمة"
              >
                <PanelRightOpen size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Links Navigation List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-teal-700/40 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {activeNavGroups.map((group) => {
            const GroupIcon = group.icon;
            const groupActive = group.links.some((link) => isPathActive(link.path));
            const groupOpen = collapsed && !isMobileShow ? false : Boolean(openGroups[group.id]);

            return (
              <section
                key={group.id}
                className={`rounded-2xl transition-all duration-200 border ${
                  groupActive
                    ? 'border-teal-500/40 bg-[#0d3436]/90 shadow-md shadow-teal-950/30'
                    : 'border-teal-900/40 bg-[#0b2b2d]/50 hover:border-teal-700/40'
                }`}
              >
                {/* Group Accordion Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (collapsed && !isMobileShow) return;
                    setOpenGroups((current) => ({ ...current, [group.id]: !current[group.id] }));
                  }}
                  title={collapsed && !isMobileShow ? group.title : undefined}
                  className={`
                    flex w-full items-center font-black transition duration-200 select-none
                    ${collapsed && !isMobileShow ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5 text-xs md:text-sm'}
                    ${groupActive ? 'text-teal-50' : 'text-teal-200/80 hover:text-white hover:bg-white/[0.04]'}
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`grid h-7 w-7 place-items-center rounded-lg border transition ${
                      groupActive
                        ? 'bg-teal-500/20 border-teal-400/40 text-teal-300'
                        : 'bg-teal-950/50 border-teal-800/40 text-teal-400'
                    }`}>
                      <GroupIcon className="h-4 w-4" />
                    </div>
                    {(!collapsed || isMobileShow) && (
                      <span className="truncate text-right font-black tracking-wide">{group.title}</span>
                    )}
                  </div>

                  {(!collapsed || isMobileShow) && (
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                        groupActive ? 'bg-teal-700/60 text-teal-200' : 'bg-teal-950/60 text-teal-400/70'
                      }`}>
                        {group.links.length}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 text-teal-400 transition-transform duration-300 ${
                          groupOpen ? 'rotate-180 text-teal-200' : ''
                        }`}
                      />
                    </div>
                  )}
                </button>

                {/* Sub Links */}
                {(!collapsed || isMobileShow) && (
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      groupOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="grid gap-1 px-2 pb-2 pt-1 border-t border-teal-900/40">
                        {group.links.map(({ name, path, icon: Icon, badge, badgeColor }) => {
                          const isActive = isPathActive(path);
                          return (
                            <Link
                              key={path}
                              href={path}
                              onClick={() => { setMobileOpen(false); onClose?.(); }}
                              className={`
                                group flex min-h-10 items-center justify-between rounded-xl px-3 py-2 text-xs md:text-sm font-bold transition-all duration-150 border
                                ${
                                  isActive
                                    ? 'bg-[#186063] text-white border-teal-400/40 shadow-sm shadow-teal-950/40 font-black'
                                    : 'border-transparent text-teal-100/75 hover:bg-white/[0.08] hover:text-white hover:border-teal-500/20'
                                }
                              `}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Icon
                                  className={`h-4 w-4 shrink-0 transition-colors ${
                                    isActive ? 'text-white' : 'text-teal-400/80 group-hover:text-teal-200'
                                  }`}
                                />
                                <span className="truncate">{name}</span>
                              </div>

                              {badge !== undefined && (
                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                                    badgeColor || (isActive ? 'bg-white/20 text-white border-white/30' : 'bg-teal-900/60 text-teal-300 border-teal-700/40')
                                  }`}
                                >
                                  {badge}
                                </span>
                              )}
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

        {/* User Profile & Actions Footer */}
        <div className="border-t border-[#154d50]/70 bg-[#061f20]/95 backdrop-blur-md p-3 space-y-2.5">
          {(!collapsed || isMobileShow) ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-teal-950/50 border border-teal-800/40 p-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="h-9 w-9 rounded-xl overflow-hidden border border-teal-400/40 bg-teal-900">
                    <img
                      src="/dr-ismail.jpg"
                      alt={userName || 'د. إسماعيل عيسى'}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#061f20]" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-white leading-tight">{userName || 'د. إسماعيل عيسى'}</p>
                  <p className="truncate text-[10px] font-bold text-teal-300/80 leading-tight mt-0.5">
                    {isStaff ? 'الاستشاري المسؤول 🌟' : userRole === 'student' ? 'طالب' : 'ولي أمر'}
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                title="تسجيل الخروج"
                className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-100 transition cursor-pointer"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="h-9 w-9 rounded-xl overflow-hidden border border-teal-400/40 bg-teal-900">
                  <img
                    src="/dr-ismail.jpg"
                    alt={userName || 'د. إسماعيل عيسى'}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-[#061f20]" />
              </div>

              <button
                onClick={logout}
                title="تسجيل الخروج"
                className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 hover:text-rose-100 transition cursor-pointer"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

