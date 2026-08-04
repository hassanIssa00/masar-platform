'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BarChart3, CalendarClock, ChevronLeft, ChevronRight, ClipboardCheck,
  CreditCard, BookOpen, FileText, Gamepad2, Layers3, LogOut, MessageSquareText,
  PanelRightClose, PanelRightOpen, Settings2, Stethoscope, UserRoundPlus, UsersRound, X,
  ClipboardList, Users, Building2, Bot, Trophy, BookMarked, ShieldCheck, ClipboardPen
} from 'lucide-react';
import { curriculumPrograms } from '@/data/curriculum';
import { clearSession } from '@/lib/localDb';

const adminLinks = [
  { name: 'لوحة التشغيل', path: '/dashboard', icon: BarChart3 },
  { name: 'لوحة ذكاء الأعمال BI', path: '/bi-dashboard', icon: BarChart3 },
  { name: 'خطط IEP الفردية', path: '/iep', icon: ClipboardList },
  { name: 'جدول الجلسات', path: '/calendar', icon: CalendarClock },
  { name: 'سجلات الجلسات الطبية', path: '/session-records', icon: ClipboardPen },
  { name: 'إدارة الحضور والغياب', path: '/attendance', icon: ClipboardCheck },
  { name: 'قائمة الانتظار CRM', path: '/waitlist', icon: Users },
  { name: 'إدارة الطلاب', path: '/students', icon: UsersRound },
  { name: 'أولياء الأمور', path: '/parents', icon: UsersRound },
  { name: 'مساعد الذكاء الاصطناعي', path: '/ai-assistant', icon: Bot },
  { name: 'الفروع والعيادات', path: '/branches', icon: Building2 },
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

export default function Sidebar({ open: externalOpen = false, onClose, desktopOnly = false }: SidebarProps) {
  const router = useRouter();
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
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden"
          onClick={() => { setMobileOpen(false); onClose?.(); }}
        />
      )}

      {/* Main Sidebar Element (responsive for desktop and mobile) */}
      <aside
        className={`
          sticky top-[65px] h-[calc(100vh-65px)] shrink-0 overflow-y-auto border-l border-slate-200 bg-white
          transition-all duration-300 ease-in-out z-40
          lg:flex lg:flex-col
          ${isMobileShow ? 'fixed top-0 right-0 z-50 h-full w-72 flex flex-col shadow-2xl translate-x-0' : 'hidden lg:flex lg:flex-col'}
          ${collapsed && !isMobileShow ? 'w-20' : 'w-72'}
        `}
        dir="rtl"
      >
        {/* Toggle Collapse Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-3">
          {(!collapsed || isMobileShow) && (
            <span className="text-xs font-black uppercase text-slate-400">تشغيل المنصة</span>
          )}
          <div className="flex items-center gap-1">
            {isMobileShow && (
              <button
                onClick={() => { setMobileOpen(false); onClose?.(); }}
                className="lg:hidden grid h-8 w-8 place-items-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            )}
            <button
              onClick={toggleCollapse}
              className={`
                hidden lg:grid h-9 w-9 place-items-center rounded-xl bg-slate-50 hover:bg-teal-50 text-slate-600 hover:text-teal-700 transition border border-slate-200
                ${collapsed ? 'mx-auto' : ''}
              `}
              title={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
              aria-label={collapsed ? 'توسيع القائمة' : 'طي القائمة'}
            >
              {collapsed ? <PanelRightOpen size={18} /> : <PanelRightClose size={18} />}
            </button>
          </div>
        </div>

        {/* Links List */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="grid gap-1">
            {adminLinks.map(({ name, path, icon: Icon }) => (
              <Link
                key={path}
                href={path}
                onClick={() => { setMobileOpen(false); onClose?.(); }}
                title={collapsed && !isMobileShow ? name : undefined}
                className={`
                  focus-ring flex items-center rounded-xl transition hover:bg-teal-50 hover:text-teal-800 group
                  ${collapsed && !isMobileShow ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5 text-sm font-black text-slate-700'}
                `}
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-teal-100 group-hover:text-teal-700 transition">
                  <Icon size={18} />
                </span>
                {(!collapsed || isMobileShow) && <span className="flex-1 truncate">{name}</span>}
                {(!collapsed || isMobileShow) && <ChevronLeft size={14} className="text-slate-300 group-hover:text-teal-500 transition" />}
              </Link>
            ))}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-4">
            {(!collapsed || isMobileShow) && (
              <p className="text-xs font-black uppercase text-slate-400 mb-3 px-2">المسارات العلاجية</p>
            )}
            <div className="grid gap-1">
              {curriculumPrograms.map((program) => (
                <Link
                  key={program.slug}
                  href={`/programs/${program.slug}`}
                  onClick={() => { setMobileOpen(false); onClose?.(); }}
                  title={collapsed && !isMobileShow ? program.shortTitle : undefined}
                  className={`
                    focus-ring rounded-xl border border-transparent transition hover:border-slate-200 hover:bg-slate-50
                    ${collapsed && !isMobileShow ? 'flex justify-center p-2.5' : 'px-3 py-2.5 text-sm font-black text-slate-700'}
                  `}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                      style={{ backgroundColor: `${program.color}20`, color: program.color }}
                    >
                      <Layers3 size={16} />
                    </span>
                    {(!collapsed || isMobileShow) && <span className="flex-1 truncate">{program.shortTitle}</span>}
                  </span>
                  {(!collapsed || isMobileShow) && <span className="mt-2 block h-1 rounded-full" style={{ backgroundColor: program.color }} />}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="border-t border-slate-200 p-2">
          <button
            onClick={logout}
            title={collapsed && !isMobileShow ? 'تسجيل الخروج' : undefined}
            className={`
              flex items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-sm font-black text-rose-700 hover:bg-rose-100 transition
              ${collapsed && !isMobileShow ? 'h-10 w-full' : 'w-full gap-2 px-4 py-3'}
            `}
          >
            <LogOut size={18} />
            {(!collapsed || isMobileShow) && <span>تسجيل الخروج</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
