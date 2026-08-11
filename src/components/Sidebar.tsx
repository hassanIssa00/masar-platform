'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3, CalendarClock, ChevronLeft, ChevronRight, ClipboardCheck,
  CreditCard, BookOpen, FileText, Gamepad2, Layers3, LogOut, MessageSquareText,
  PanelRightClose, PanelRightOpen, Settings2, Stethoscope, UserRoundPlus, UsersRound, X,
  ClipboardList, Users, Building2, Bot, Trophy, BookMarked, ShieldCheck, ClipboardPen, Stamp
} from 'lucide-react';
import { clearSession } from '@/lib/localDb';

const adminLinks = [
  { name: 'لوحة التشغيل', path: '/dashboard', icon: BarChart3 },
  { name: 'التوقيع والختم الإلكتروني ✒️', path: '/signature', icon: Stamp },
  { name: 'مساعد الذكاء الاصطناعي 🤖', path: '/ai-assistant', icon: Bot },
  { name: 'لوحة ذكاء الأعمال BI', path: '/bi-dashboard', icon: BarChart3 },
  { name: 'خطط IEP الفردية', path: '/iep', icon: ClipboardList },
  { name: 'جدول الجلسات', path: '/calendar', icon: CalendarClock },
  { name: 'سجلات الجلسات الطبية', path: '/session-records', icon: ClipboardPen },
  { name: 'إدارة الحضور والغياب', path: '/attendance', icon: ClipboardCheck },
  { name: 'قائمة الانتظار CRM', path: '/waitlist', icon: Users },
  { name: 'إدارة الطلاب', path: '/students', icon: UsersRound },
  { name: 'أولياء الأمور', path: '/parents', icon: UsersRound },
  { name: 'فصل 1/1 الإخلاص بجدة 🏫', path: '/branches/ikhlas-jeddah', icon: Building2 },
  { name: 'التلعيب والمكافآت', path: '/gamification', icon: Trophy },
  { name: 'الموافقات الرقمية', path: '/consents', icon: ShieldCheck },
  { name: 'مكتبة الموارد العلاجية', path: '/resources', icon: BookMarked },
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

export default function Sidebar({ open: externalOpen = false, onClose }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('masar_sidebar_collapsed');
    if (saved === 'true') {
      setCollapsed(true);
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
          <div className="grid gap-1.5">
            {adminLinks.map(({ name, path, icon: Icon }) => {
              const isActive = pathname === path;
              return (
                <Link
                  key={path}
                  href={path}
                  onClick={() => { setMobileOpen(false); onClose?.(); }}
                  title={collapsed && !isMobileShow ? name : undefined}
                  className={`
                    focus-ring flex items-center rounded-2xl transition group border font-black
                    ${collapsed && !isMobileShow ? 'justify-center px-0 py-3' : 'gap-3.5 px-4 py-3 text-sm md:text-[15px]'}
                    ${
                      isActive
                        ? 'bg-teal-700 text-white border-teal-700 shadow-md shadow-teal-700/20'
                        : 'border-transparent text-slate-800 hover:bg-teal-50/80 hover:text-teal-800 hover:border-teal-100'
                    }
                  `}
                >
                  <Icon
                    className={`
                      shrink-0 transition-transform group-hover:scale-110
                      ${collapsed && !isMobileShow ? 'h-6 w-6' : 'h-5 w-5'}
                      ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-teal-700'}
                    `}
                  />
                  {(!collapsed || isMobileShow) && (
                    <span className="truncate leading-tight font-black">{name}</span>
                  )}
                </Link>
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
