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
import { clearSession, getSession, getStudents, getReports, hydrateSessionFromServer } from '@/lib/localDb';

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

  const [userRole, setUserRole] = useState<string>('doctor');

  useEffect(() => {
    let disposed = false;
    const loadSession = async () => {
      const session = getSession() ?? await hydrateSessionFromServer();
      if (disposed) return;
      if (session?.role) {
        setUserRole(session.role);
      }
      if (session?.name) {
        setUserName(session.name);
      } else {
        setUserName('د. إسماعيل عيسى');
      }
    };
    loadSession();

    try {
      const st = getStudents();
      setStudentsCount(st?.length || 0);
      const rp = getReports();
      setReportsCount(rp?.length || 0);
    } catch {}

    const handleToggle = () => {
      if (window.innerWidth >= 1024) {
        setCollapsed((prev) => !prev);
      } else {
        setMobileOpen((prev) => !prev);
      }
    };

    window.addEventListener('masar_toggle_sidebar', handleToggle);
    return () => {
      disposed = true;
      window.removeEventListener('masar_toggle_sidebar', handleToggle);
    };
  }, []);

  const isStaff = userRole === 'doctor' || userRole === 'specialist' || userRole === 'teacher';

  const adminGroups: NavGroup[] = [
    {
      id: 'operation',
      title: 'التشغيل',
      icon: BarChart3,
      links: [
        { name: 'لوحة التشغيل', path: '/dashboard', icon: BarChart3 },
        { name: 'مساعد الذكاء الاصطناعي', path: '/ai-assistant', icon: Bot, badge: 'AI ⚡', badgeColor: 'bg-emerald-400 text-slate-950 border-emerald-300 font-black shadow-xs' },
      ],
    },
    {
      id: 'students',
      title: 'الطلاب والحسابات',
      icon: UsersRound,
      links: [
        { name: 'إدارة الطلاب', path: '/students', icon: UsersRound, badge: studentsCount || undefined, badgeColor: 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-xs' },
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
        { name: 'التقارير', path: '/reports', icon: FileText, badge: reportsCount || undefined, badgeColor: 'bg-emerald-400 text-slate-950 border-emerald-300 font-black shadow-xs' },
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
        { name: 'اجتماعات Zoom', path: '/meetings', icon: CalendarClock, badge: 'مباشر', badgeColor: 'bg-rose-500 text-white border-rose-400 font-black shadow-xs' },
      ],
    },
    {
      id: 'classroom',
      title: 'الفصل والإعدادات',
      icon: FolderKanban,
      links: [
        { name: 'فصل د. إسماعيل عيسى', path: '/branches/ikhlas-jeddah', icon: Building2, badge: '🌟', badgeColor: 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-xs' },
        { name: 'إعدادات المنصة', path: '/platform-settings', icon: Settings2 },
      ],
    },
  ];

  const parentLinks = [
    { name: 'بوابة ولي الأمر', path: '/parent', icon: Building2 },
    { name: 'استبيان طفل جديد', path: '/survey', icon: ClipboardList },
    { name: 'أولادي', path: '/parent', icon: Users, badge: studentsCount || undefined, badgeColor: 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-xs' },
  ];

  const studentLinks = [
    { name: 'فصلي المباشر', path: '/school-student', icon: Building2, badge: 'مباشر', badgeColor: 'bg-rose-500 text-white border-rose-400 font-black shadow-xs' },
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
    setCollapsed((current) => !current);
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
          bg-white border-l border-slate-200 text-slate-700 font-sans shadow-lg
          transition-all duration-300 ease-in-out z-40 select-none
          [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-sky-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent
          lg:flex lg:flex-col
          ${isMobileShow ? 'fixed top-0 right-0 z-50 h-full w-80 flex flex-col shadow-2xl translate-x-0' : 'hidden lg:flex lg:flex-col'}
          ${collapsed && !isMobileShow ? 'w-20' : 'w-76 xl:w-80'}
        `}
        dir="rtl"
      >
        {/* Top Header Card */}
        <div className="p-3">
          {(!collapsed || isMobileShow) ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-sky-500 to-teal-500 p-3.5 border border-sky-300/60 shadow-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/25 border border-white/40 text-white shadow-inner">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white tracking-wide leading-tight">مَسَار</h2>
                    <p className="text-xs font-bold text-sky-100 leading-tight mt-0.5">المنصة التعليمية الشاملة</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isMobileShow && (
                    <button
                      onClick={() => { setMobileOpen(false); onClose?.(); }}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 text-white hover:bg-white/30 transition cursor-pointer"
                    >
                      <X size={18} />
                    </button>
                  )}
                  <button
                    onClick={toggleCollapse}
                    className="hidden lg:grid h-8 w-8 place-items-center rounded-lg bg-white/20 hover:bg-white/30 text-white border border-white/30 transition cursor-pointer"
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
                className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500 text-white hover:bg-sky-600 border border-sky-300 transition shadow-md cursor-pointer"
                title="توسيع القائمة"
              >
                <PanelRightOpen size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Links Navigation List */}
        <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-sky-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {activeNavGroups.map((group) => {
            const GroupIcon = group.icon;
            const groupActive = group.links.some((link) => isPathActive(link.path));
            const groupOpen = collapsed && !isMobileShow ? false : Boolean(openGroups[group.id]);

            return (
              <section
                key={group.id}
                className={`rounded-2xl transition-all duration-200 border ${
                  groupActive
                    ? 'border-sky-300 bg-sky-50 shadow-sm'
                    : 'border-slate-200 bg-slate-50/80 hover:border-sky-200 hover:bg-sky-50/50'
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
                    flex w-full items-center font-black transition duration-200 select-none cursor-pointer rounded-2xl
                    ${collapsed && !isMobileShow ? 'justify-center p-2.5' : 'justify-between px-3.5 py-3 text-sm'}
                    ${groupActive ? 'text-sky-700' : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50/80'}
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`grid h-8 w-8 place-items-center rounded-xl border transition ${
                      groupActive
                        ? 'bg-sky-500 border-sky-400 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-sky-500'
                    }`}>
                      <GroupIcon className="h-4 w-4" />
                    </div>
                    {(!collapsed || isMobileShow) && (
                      <span className="truncate text-right text-sm font-black tracking-wide">
                        {group.title}
                      </span>
                    )}
                  </div>

                  {(!collapsed || isMobileShow) && (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-lg border shadow-xs ${
                        groupActive
                          ? 'bg-sky-500 text-white border-sky-400'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}>
                        {group.links.length}
                      </span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-300 ${
                          groupActive ? 'text-sky-500' : 'text-slate-400'
                        } ${groupOpen ? 'rotate-180' : ''}`}
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
                      <div className="grid gap-1 px-2.5 pb-2.5 pt-1.5 border-t border-slate-200">
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
                                    ? 'bg-sky-500 text-white border-sky-400 shadow-sm font-black'
                                    : 'border-transparent text-slate-600 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200'
                                }
                              `}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Icon
                                  className={`h-4 w-4 shrink-0 transition-colors ${
                                    isActive ? 'text-white' : 'text-sky-400 group-hover:text-sky-600'
                                  }`}
                                />
                                <span className="truncate text-right font-black tracking-wide">{name}</span>
                              </div>

                              {badge !== undefined && (
                                <span
                                  className={`text-[11px] font-black px-2 py-0.5 rounded-full border shrink-0 shadow-xs ${
                                    badgeColor || (isActive ? 'bg-white text-sky-700 border-sky-200' : 'bg-sky-100 text-sky-700 border-sky-200')
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
        <div className="border-t border-slate-200 bg-white p-3 space-y-2.5">
          {(!collapsed || isMobileShow) ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200 p-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div className="h-9 w-9 rounded-xl overflow-hidden border border-sky-200 bg-white shadow-xs">
                    <img
                      src="/dr-ismail.jpg"
                      alt={userName || 'د. إسماعيل عيسى'}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
                </div>
                <div className="min-w-0 text-right">
                  <p className="truncate text-xs font-black text-slate-800 leading-tight">{userName || 'د. إسماعيل عيسى'}</p>
                  <p className="truncate text-[11px] font-bold text-slate-500 leading-tight mt-0.5">
                    {isStaff ? 'الاستشاري المسؤول 🌟' : userRole === 'student' ? 'طالب' : 'ولي أمر'}
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                title="تسجيل الخروج"
                className="grid h-8 w-8 place-items-center rounded-xl border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white hover:border-rose-400 transition cursor-pointer shadow-xs"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="h-9 w-9 rounded-xl overflow-hidden border border-sky-200 bg-white shadow-xs">
                  <img
                    src="/dr-ismail.jpg"
                    alt={userName || 'د. إسماعيل عيسى'}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white" />
              </div>

              <button
                onClick={logout}
                title="تسجيل الخروج"
                className="grid h-8 w-8 place-items-center rounded-xl border border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white hover:border-rose-400 transition cursor-pointer shadow-xs"
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
