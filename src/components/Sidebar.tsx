'use client';

import { useEffect, useState, useRef } from 'react';
import type { ElementType } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3, CalendarClock, ChevronDown, ClipboardCheck,
  BookOpen, FileText, Gamepad2, LogOut, MessageSquareText,
  PanelRightClose, PanelRightOpen, Settings2, UsersRound, X,
  ClipboardList, Users, Building2, Bot, KeyRound, Route, FolderKanban,
  Sparkles, ShieldCheck, ScanFace, Archive, Printer
} from 'lucide-react';
import { clearSession, getSession, getStudents, getReports, hydrateSessionFromServer } from '@/lib/cloudStore';
import { TAB_PDF_EXPORTERS } from '@/lib/allPagesPdfReports';
import { PlatformReportsModal } from '@/components/PageReportButton';

const PATH_TO_TAB_KEY: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/ai-assistant': 'aiAssistant',
  '/face-id': 'faceId',
  '/students': 'students',
  '/platform-settings?tab=users&focus=account-generator': 'accountGenerator',
  '/parents': 'parents',
  '/messages': 'messages',
  '/assessment': 'assessment',
  '/reports': 'reports',
  '/programs': 'programs',
  '/programs/curricula': 'curricula',
  '/iep': 'iep',
  '/resources': 'resources',
  '/calendar': 'calendar',
  '/meetings': 'meetings',
  '/branches/ikhlas-jeddah': 'classroom',
  '/platform-settings': 'platformSettings',
  '/archive': 'archive',
  '/parent': 'parents',
  '/survey': 'assessment',
  '/school-student': 'classroom',
  '/kids': 'curricula',
};

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
  const [mounted, setMounted] = useState(false);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    operation: true,
    students: true,
    clinical: true,
    programs: false,
    sessions: false,
    classroom: false,
    archive: false,
  });

  const [userRole, setUserRole] = useState<string>('doctor');
  const [showReportsCenter, setShowReportsCenter] = useState(false);
  const isMobileShow = mobileOpen || externalOpen;

  useEffect(() => {
    setMounted(true);
    let disposed = false;
    const loadSession = async () => {
      const session = getSession() ?? await hydrateSessionFromServer();
      if (disposed) return;
      if (session?.role) setUserRole(session.role);
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

  useEffect(() => {
    setMobileOpen(false);
    onClose?.();
  }, [pathname, onClose]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (!isMobileShow) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileShow]);

  const isStaff = userRole === 'doctor' || userRole === 'specialist' || userRole === 'teacher';

  const adminGroups: NavGroup[] = [
    {
      id: 'operation',
      title: 'التشغيل',
      icon: BarChart3,
      links: [
        { name: 'لوحة التشغيل', path: '/dashboard', icon: BarChart3 },
        { name: 'مساعد الذكاء الاصطناعي', path: '/ai-assistant', icon: Bot, badge: 'AI ⚡', badgeColor: 'bg-emerald-400 text-slate-950 border-emerald-300 font-black shadow-xs' },
        { name: 'سجلات Face ID', path: '/face-id', icon: ScanFace, badge: 'جديد', badgeColor: 'bg-violet-500 text-white border-violet-400 font-black shadow-xs' },
      ],
    },
    {
      id: 'students',
      title: 'الطلاب والحسابات',
      icon: UsersRound,
      links: [
        { name: 'إدارة الطلاب', path: '/students', icon: UsersRound, badge: studentsCount || undefined, badgeColor: 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-xs' },
        { name: 'توليد الحسابات', path: '/platform-settings?tab=users&focus=account-generator', icon: KeyRound },
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
        { name: 'المناهج التعليمية', path: '/programs/curricula', icon: BookOpen, badge: 'جديد', badgeColor: 'bg-amber-400 text-slate-950 border-amber-300 font-black shadow-xs' },
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
    {
      id: 'archive',
      title: 'الأرشيف والحفظ',
      icon: Archive,
      links: [
        { name: 'الأرشيف الشامل', path: '/archive', icon: Archive, badge: '🗄️', badgeColor: 'bg-slate-700 text-white border-slate-600 font-black shadow-xs' },
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

  const toggleCollapse = () => setCollapsed((c) => !c);

  const logout = () => {
    clearSession();
    router.push('/auth/login');
  };

  const isPathActive = (path: string) =>
    pathname === path || (path !== '/dashboard' && pathname.startsWith(`${path}/`));

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileShow && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{
            background: 'rgba(2,6,23,0.75)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            animation: 'fade-in 200ms ease both',
          }}
          onClick={() => { setMobileOpen(false); onClose?.(); }}
        />
      )}

      {/* Main Sidebar */}
      <aside
        dir="rtl"
        className={`
          sticky top-[57px] h-[calc(100vh-57px)] shrink-0 overflow-hidden
          bg-white border-l border-slate-200/80 text-slate-700 select-none
          transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] z-40
          [&::-webkit-scrollbar]:w-1.5
          [&::-webkit-scrollbar-thumb]:bg-teal-200
          [&::-webkit-scrollbar-thumb]:rounded-full
          [&::-webkit-scrollbar-track]:bg-transparent
          lg:flex lg:flex-col
          ${isMobileShow
            ? 'fixed top-0 right-0 z-50 flex h-[100dvh] w-[min(22rem,calc(100vw-16px))] max-w-[calc(100vw-16px)] flex-col shadow-[0_0_80px_rgba(2,6,23,0.35)]'
            : 'hidden lg:flex lg:flex-col'
          }
          ${collapsed && !isMobileShow ? 'w-[68px]' : 'w-72 xl:w-80'}
        `}
        style={{
          animation: isMobileShow
            ? 'slide-left 320ms cubic-bezier(0.16,1,0.3,1) both'
            : 'none',
          boxShadow: !isMobileShow ? '0 0 0 1px rgba(15,23,42,0.04), 4px 0 24px rgba(15,23,42,0.06)' : undefined,
        }}
      >
        {/* ── Sidebar Header ── */}
        <div className="p-3 shrink-0">
          {(!collapsed || isMobileShow) ? (
            <div
              className="relative overflow-hidden rounded-2xl p-3.5 shimmer"
              style={{
                background: 'linear-gradient(135deg, #0c4a44 0%, #0f766e 45%, #0284c7 100%)',
                boxShadow: '0 8px 32px rgba(15,118,110,0.35), 0 2px 8px rgba(2,6,23,0.2)',
              }}
            >
              {/* Mesh pattern overlay */}
              <div
                className="absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className="grid h-10 w-10 place-items-center rounded-xl border border-white/30 shadow-inner"
                    style={{ background: 'rgba(255,255,255,0.18)' }}
                  >
                    <Sparkles className="h-5 w-5 text-white" style={{ animation: 'logo-breathe 3s ease-in-out infinite' }} />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white leading-tight tracking-wide">مَسَار</h2>
                    <p className="text-[11px] font-bold text-white/70 leading-tight mt-0.5">المنصة التعليمية الشاملة</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isMobileShow && (
                    <button
                      onClick={() => { setMobileOpen(false); onClose?.(); }}
                      className="grid h-8 w-8 place-items-center rounded-xl border border-white/20 text-white hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
                    >
                      <X size={16} />
                    </button>
                  )}
                  <button
                    onClick={toggleCollapse}
                    className="hidden lg:grid h-8 w-8 place-items-center rounded-xl border border-white/20 text-white hover:bg-white/20 active:scale-90 transition-all cursor-pointer"
                    title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
                  >
                    <PanelRightClose size={15} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Collapsed header — icon only */
            <div className="flex flex-col items-center py-1 gap-2">
              <button
                onClick={toggleCollapse}
                className="grid h-10 w-10 place-items-center rounded-xl text-white hover:scale-110 active:scale-90 transition-all cursor-pointer shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #0f766e, #0284c7)',
                  boxShadow: '0 4px 16px rgba(15,118,110,0.35)',
                }}
                title="توسيع القائمة"
              >
                <PanelRightOpen size={18} />
              </button>
            </div>
          )}
        </div>

        {/* ── Navigation Links ── */}
        <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-teal-200 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
          {activeNavGroups.map((group, groupIdx) => {
            const GroupIcon = group.icon;
            const groupActive = group.links.some((link) => isPathActive(link.path));
            const groupOpen = collapsed && !isMobileShow ? false : Boolean(openGroups[group.id]);

            return (
              <section
                key={group.id}
                className={`
                  rounded-2xl overflow-hidden transition-all duration-250
                  border
                  ${groupActive
                    ? 'border-teal-300/70 bg-gradient-to-b from-teal-50/80 to-white shadow-sm'
                    : 'border-slate-200/70 bg-slate-50/60 hover:border-teal-200/60 hover:bg-teal-50/30'
                  }
                `}
                style={{
                  animation: mounted ? `fade-up 350ms cubic-bezier(0.16,1,0.3,1) ${80 + groupIdx * 45}ms both` : 'none',
                }}
              >
                {/* Group header button */}
                <button
                  type="button"
                  onClick={() => {
                    if (collapsed && !isMobileShow) return;
                    setOpenGroups((cur) => ({ ...cur, [group.id]: !cur[group.id] }));
                  }}
                  title={collapsed && !isMobileShow ? group.title : undefined}
                  className={`
                    flex w-full items-center font-black transition-all duration-200 select-none cursor-pointer rounded-2xl
                    ${collapsed && !isMobileShow ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5 text-sm'}
                    ${groupActive
                      ? 'text-teal-700'
                      : 'text-slate-500 hover:text-teal-700'
                    }
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`
                        grid h-8 w-8 place-items-center rounded-xl border transition-all duration-200 shrink-0
                        ${groupActive
                          ? 'text-white border-transparent shadow-sm'
                          : 'bg-white border-slate-200/80 text-teal-500'
                        }
                      `}
                      style={groupActive ? {
                        background: 'linear-gradient(135deg, #0f766e, #0284c7)',
                        boxShadow: '0 4px 12px rgba(15,118,110,0.35)',
                      } : {}}
                    >
                      <GroupIcon className="h-4 w-4" />
                    </div>
                    {(!collapsed || isMobileShow) && (
                      <span className="truncate text-right text-sm font-black tracking-wide">
                        {group.title}
                      </span>
                    )}
                  </div>

                  {(!collapsed || isMobileShow) && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`
                          text-[11px] font-black px-1.5 py-0.5 rounded-lg border
                          ${groupActive
                            ? 'bg-teal-600 text-white border-teal-500'
                            : 'bg-white text-slate-400 border-slate-200'
                          }
                        `}
                      >
                        {group.links.length}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform duration-300 ${groupActive ? 'text-teal-400' : 'text-slate-300'} ${groupOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  )}
                </button>

                {/* Accordion content */}
                {(!collapsed || isMobileShow) && (
                  <div
                    className={`grid transition-[grid-template-rows,opacity] ease-[cubic-bezier(0.16,1,0.3,1)] ${groupOpen ? 'duration-350' : 'duration-200'} ${
                      groupOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="grid gap-0.5 px-2 pb-2 pt-1 border-t border-slate-200/50">
                        {group.links.map(({ name, path, icon: Icon, badge, badgeColor }, linkIdx) => {
                          const isActive = isPathActive(path);
                          return (
                            <Link
                              key={path}
                              href={path}
                              onClick={() => { setMobileOpen(false); onClose?.(); }}
                              className={`
                                group relative flex min-h-9 items-center justify-between
                                rounded-xl px-2.5 py-2 text-xs md:text-sm font-bold
                                transition-all duration-150 border
                                ${isActive
                                  ? 'border-transparent text-white font-black shadow-sm'
                                  : 'border-transparent text-slate-600 hover:text-teal-700 hover:bg-teal-50/80 hover:border-teal-100/80'
                                }
                              `}
                              style={isActive ? {
                                background: 'linear-gradient(135deg, #0f766e 0%, #0e8a82 50%, #0284c7 100%)',
                                boxShadow: '0 4px 14px rgba(15,118,110,0.35)',
                              } : {}}
                            >
                              {/* Active rail indicator */}
                              {isActive && (
                                <span
                                  className="absolute right-0 top-1/4 bottom-1/4 w-0.5 rounded-full bg-white/50"
                                />
                              )}

                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className={`
                                    grid h-6 w-6 place-items-center rounded-lg shrink-0 transition-all duration-200
                                    ${isActive
                                      ? 'bg-white/20'
                                      : 'bg-transparent group-hover:bg-teal-100/80'
                                    }
                                  `}
                                >
                                  <Icon
                                    className={`h-3.5 w-3.5 transition-all duration-200 ${
                                      isActive ? 'text-white' : 'text-teal-400 group-hover:text-teal-600 group-hover:scale-110'
                                    }`}
                                  />
                                </div>
                                <span className="truncate text-right font-black tracking-wide">{name}</span>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                {badge !== undefined && (
                                  <span
                                    className={`
                                      text-[11px] font-black px-1.5 py-0.5 rounded-full border shrink-0
                                      ${badgeColor || (isActive ? 'bg-white/20 text-white border-white/30' : 'bg-teal-100 text-teal-700 border-teal-200')}
                                    `}
                                    style={{ animation: typeof badge === 'number' && badge > 0 ? 'badge-pop 2s ease-in-out 1s infinite' : 'none' }}
                                  >
                                    {badge}
                                  </span>
                                )}

                                {PATH_TO_TAB_KEY[path] && TAB_PDF_EXPORTERS[PATH_TO_TAB_KEY[path]] && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      TAB_PDF_EXPORTERS[PATH_TO_TAB_KEY[path]]?.run();
                                    }}
                                    title={`تصدير تقرير PDF رسمي: ${name}`}
                                    className={`
                                      grid h-6 w-6 place-items-center rounded-lg shrink-0 transition-all duration-150 cursor-pointer
                                      ${isActive
                                        ? 'text-white/80 hover:text-white hover:bg-white/25'
                                        : 'text-slate-400 hover:text-teal-700 hover:bg-teal-100'
                                      }
                                    `}
                                  >
                                    <Printer size={12} />
                                  </button>
                                )}
                              </div>
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

          {/* ── All Tabs Reports Center Launcher ── */}
          <div className="pt-2 pb-1">
            <button
              type="button"
              onClick={() => setShowReportsCenter(true)}
              className={`
                w-full flex items-center justify-between rounded-2xl p-2.5 font-black transition-all cursor-pointer border
                ${collapsed && !isMobileShow
                  ? 'justify-center bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100'
                  : 'bg-gradient-to-r from-teal-50 via-emerald-50/70 to-teal-50 border-teal-200/90 hover:border-teal-400 text-teal-900 text-xs shadow-2xs hover:shadow-xs'
                }
              `}
              title="مركز تقارير المنصة الموحد لجميع التبويبات (PDF)"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="grid h-7 w-7 place-items-center rounded-xl bg-teal-700 text-white shadow-2xs shrink-0">
                  <Printer size={14} />
                </div>
                {(!collapsed || isMobileShow) && (
                  <span className="truncate text-xs font-black">تقارير PDF لجميع التبويبات</span>
                )}
              </div>
              {(!collapsed || isMobileShow) && (
                <span className="text-[10px] font-black bg-teal-700 text-white px-2 py-0.5 rounded-lg shrink-0">
                  18 تقرير
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Footer: User Profile ── */}
        <div
          className="shrink-0 border-t border-slate-200/70 p-3"
          style={{
            background: 'rgba(248,250,252,0.8)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {(!collapsed || isMobileShow) ? (
            <div
              className="flex items-center justify-between gap-2 rounded-2xl p-2.5 border border-slate-200/60"
              style={{ background: 'rgba(255,255,255,0.7)' }}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  <div
                    className="h-9 w-9 rounded-xl overflow-hidden border-2 border-teal-200/80 bg-[#f1f0f4]"
                    style={{ boxShadow: '0 0 0 2px rgba(20,184,166,0.15)' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/dr-ismail.jpg"
                      alt={userName || 'د. إسماعيل عيسى'}
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                    />
                  </div>
                  {/* Online pulse dot */}
                  <span
                    className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white"
                    style={{ animation: 'pulse-ring 2s ease-in-out infinite' }}
                  />
                </div>
                <div className="min-w-0 text-right">
                  <p className="truncate text-xs font-black text-slate-800 leading-tight">{userName || 'د. إسماعيل عيسى'}</p>
                  <p className="truncate text-[10px] font-bold text-teal-600 leading-tight mt-0.5">
                    {isStaff ? '⭐ الاستشاري المسؤول' : userRole === 'student' ? '🎓 طالب' : '👨‍👩‍👧 ولي أمر'}
                  </p>
                </div>
              </div>

              <button
                onClick={logout}
                title="تسجيل الخروج"
                className="
                  grid h-8 w-8 place-items-center rounded-xl shrink-0
                  border border-rose-200 bg-rose-50 text-rose-500
                  hover:bg-rose-500 hover:text-white hover:border-rose-400
                  hover:shadow-[0_4px_12px_rgba(244,63,94,0.3)]
                  active:scale-90 transition-all duration-200 cursor-pointer
                "
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            /* Collapsed footer */
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="h-9 w-9 rounded-xl overflow-hidden border-2 border-teal-200/80 bg-[#f1f0f4]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/dr-ismail.jpg"
                    alt={userName || 'د. إسماعيل عيسى'}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                </div>
                <span className="absolute -bottom-0.5 -left-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white" />
              </div>

              <button
                onClick={logout}
                title="تسجيل الخروج"
                className="
                  grid h-8 w-8 place-items-center rounded-xl
                  border border-rose-200 bg-rose-50 text-rose-500
                  hover:bg-rose-500 hover:text-white hover:border-rose-400
                  active:scale-90 transition-all duration-200 cursor-pointer
                "
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 🌟 نافذة مركز تقارير المنصة الموحد لجميع التبويبات 🌟 */}
      <PlatformReportsModal isOpen={showReportsCenter} onClose={() => setShowReportsCenter(false)} />
    </>
  );
}
