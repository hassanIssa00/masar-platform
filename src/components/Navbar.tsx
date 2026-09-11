'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Shield, Lock, Check, LogOut, LayoutDashboard, KeyRound, Sparkles } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import Sidebar from '@/components/Sidebar';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import { getSession, getStudents, StudentRecord, clearSession, hydrateSessionFromServer } from '@/lib/cloudStore';
import { findStudentsForParent, findMatchingStudentForParent } from '@/lib/nameMatching';

export default function Navbar({ hideSidebarToggle = false }: { hideSidebarToggle?: boolean } = {}) {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [sessionEmail, setSessionEmail] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [mode, setMode] = useState<'parent' | 'student'>('parent');
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string>('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  // Scroll-aware shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;
    const loadHeaderState = async () => {
      const session = getSession() ?? await hydrateSessionFromServer();
      if (session?.email) setSessionEmail(session.email);
      if (cancelled) return;
      const role = session?.role || 'parent';
      const resolvedMode: 'parent' | 'student' = role === 'student' ? 'student' : 'parent';

      const allStudents = getStudents();
      let filteredStudents = allStudents;
      let resolvedName = '';

      if (session?.name && !session.name.includes('جديد') && session.name !== 'ولي الأمر') {
        resolvedName = session.name;
      }

      if (session && session.role === 'parent') {
        const found = findStudentsForParent(session, allStudents);
        const real = found.filter((s) => s.fullName && !s.fullName.includes('جديد') && !s.fullName.includes('الاستبيان'));
        filteredStudents = real.length > 0 ? real : found;
        if (!resolvedName && filteredStudents[0]?.parentName && !filteredStudents[0].parentName.includes('جديد')) {
          resolvedName = filteredStudents[0].parentName;
        }
      } else if (session && session.role === 'student') {
        filteredStudents = allStudents.filter((s) => s.fullName === session.name || s.id === session.id);
        if (!resolvedName && filteredStudents[0]?.fullName) {
          resolvedName = filteredStudents[0].fullName;
        }
      }

      const name = resolvedName || (session?.role === 'doctor' ? 'د. إسماعيل عيسى' : 'ولي الأمر');
      const linkedId = (session as any)?.linkedStudentId;
      const initialActiveId = (linkedId && filteredStudents.some((s) => s.id === linkedId))
        ? linkedId
        : (filteredStudents[0]?.id ?? '');

      setUserName(name);
      setUserRole(role);
      setMode(resolvedMode);
      setStudents(filteredStudents);
      setActiveStudentId(initialActiveId);
    };
    loadHeaderState();
    return () => { cancelled = true; };
  }, []);

  const isStaff = userRole === 'doctor' || userRole === 'specialist' || userRole === 'teacher';

  const selectStudent = (id: string) => {
    setActiveStudentId(id);
  };

  return (
    <>
      <nav
        dir="rtl"
        className={`
          sticky top-0 z-50 border-b transition-all duration-300
          ${scrolled
            ? 'border-slate-200/80 bg-white/90 backdrop-blur-2xl shadow-[0_4px_24px_rgba(15,23,42,0.10)]'
            : 'border-slate-100/60 bg-white/80 backdrop-blur-xl shadow-none'
          }
        `}
        style={{
          animation: mounted ? 'navbar-slide-down 400ms cubic-bezier(0.16,1,0.3,1) both' : 'none',
        }}
      >
        {/* Subtle gradient line at bottom of navbar */}
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: scrolled
              ? 'linear-gradient(90deg, transparent, rgba(20,184,166,0.4), rgba(56,189,248,0.3), transparent)'
              : 'none',
            transition: 'opacity 300ms ease',
          }}
        />

        <div className="w-full flex items-center justify-between gap-3 px-4 py-2 sm:px-6 lg:px-8">

          {/* LEFT SIDE */}
          <div className="flex items-center gap-2">
            {/* Hamburger toggle */}
            {isStaff && !hideSidebarToggle && (
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('masar_toggle_sidebar'));
                  }
                }}
                className="
                  group relative grid h-9 w-9 place-items-center rounded-xl
                  text-slate-600 hover:text-teal-700
                  hover:bg-teal-50 active:scale-90
                  border border-transparent hover:border-teal-200
                  transition-all duration-200 cursor-pointer
                "
                aria-label="تبديل القائمة"
                title="تبديل القائمة الرئيسية"
              >
                <Menu size={20} className="transition-transform duration-200 group-hover:scale-110" />
              </button>
            )}

            {/* Brand */}
            <Link
              href={
                isStaff
                  ? '/dashboard'
                  : userRole === 'parent'
                  ? '/parent'
                  : userRole === 'student'
                  ? '/school-student'
                  : '/'
              }
              className="focus-ring flex min-w-0 items-center gap-3 rounded-xl group"
            >
              <span className="transition-transform duration-300 group-hover:scale-105 inline-block">
                <BrandMark size="sm" />
              </span>
            </Link>

            {/* Dashboard Button — staff only */}
            {isStaff && (
              <Link
                href="/dashboard"
                className="
                  shimmer relative overflow-hidden
                  flex items-center gap-1.5 px-3 py-1.5
                  rounded-xl font-black text-xs text-white
                  bg-gradient-to-r from-teal-600 to-teal-500
                  hover:from-teal-500 hover:to-teal-400
                  shadow-sm hover:shadow-[0_4px_16px_rgba(20,184,166,0.4)]
                  active:scale-95 transition-all duration-200
                "
                title="الذهاب للوحة التحكم"
              >
                <LayoutDashboard size={14} className="shrink-0" />
                <span className="hidden sm:inline">لوحة التحكم</span>
              </Link>
            )}
          </div>

          {/* RIGHT SIDE */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              className="motion-fade-in"
              style={{ animationDelay: '100ms' }}
            >
              <ThemeToggle />
            </span>

            <span
              className="motion-fade-in"
              style={{ animationDelay: '150ms' }}
            >
              <NotificationBell role="doctor" />
            </span>

            {/* Staff badge */}
            {isStaff ? (
              <Link
                href="/dashboard"
                className="
                  motion-fade-in hidden sm:flex min-w-0 items-center gap-2.5
                  rounded-xl px-3.5 py-1.5 text-right
                  bg-gradient-to-l from-teal-50 to-sky-50
                  border border-teal-200/70
                  hover:border-teal-400/60 hover:shadow-[0_4px_20px_rgba(20,184,166,0.18)]
                  active:scale-95 transition-all duration-200
                "
                style={{ animationDelay: '200ms' }}
              >
                {/* Online pulse indicator */}
                <span className="relative shrink-0">
                  <Shield size={15} className="text-teal-600" />
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 border border-white pulse-dot" />
                </span>
                <div>
                  <p className="text-[10px] font-black text-teal-700 uppercase tracking-wider leading-tight">
                    الاستشاري المسؤول
                  </p>
                  <p className="truncate text-xs font-black text-slate-900 leading-tight mt-0.5">
                    {userName || 'د. إسماعيل عيسى'}
                  </p>
                </div>
              </Link>
            ) : (
              /* Parent / Student switcher */
              <>
                {students.length > 0 && (
                  <div
                    className="
                      motion-fade-in hidden md:flex items-center gap-1.5
                      rounded-xl border border-slate-200 bg-slate-50/80
                      px-3 py-1.5 text-xs font-bold
                      hover:border-teal-200 hover:bg-teal-50/50
                      transition-all duration-200
                    "
                    style={{ animationDelay: '200ms' }}
                  >
                    <span className="text-slate-400 text-[11px]">{students.length > 1 ? 'الطلاب:' : 'الطالب:'}</span>
                    <select
                      value={activeStudentId}
                      onChange={(e) => selectStudent(e.target.value)}
                      className="bg-transparent font-black text-slate-900 outline-none cursor-pointer text-xs"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>👦 {s.fullName} ({s.grade})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div
                  className="
                    motion-fade-in hidden sm:flex min-w-0
                    rounded-xl bg-slate-50/80 px-3 py-1.5 text-right
                    border border-slate-200 hover:border-teal-200 hover:bg-teal-50/40
                    transition-all duration-200
                  "
                  style={{ animationDelay: '250ms' }}
                >
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider leading-tight">
                      حساب العائلة
                    </p>
                    <p className="truncate text-xs font-black text-slate-900 leading-tight mt-0.5">
                      {userName || 'ولي الأمر'}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Change Password */}
            <button
              onClick={() => setShowChangePassword(true)}
              className="
                motion-fade-in
                flex items-center gap-1.5 rounded-xl
                border border-teal-200/80 bg-teal-50/80
                px-3 py-1.5 text-xs font-black text-teal-800
                hover:bg-teal-100 hover:border-teal-300
                hover:shadow-[0_4px_12px_rgba(20,184,166,0.2)]
                active:scale-95 transition-all duration-200 shadow-xs cursor-pointer
              "
              style={{ animationDelay: '300ms' }}
              title="تغيير كلمة المرور"
            >
              <KeyRound size={14} className="shrink-0" />
              <span className="hidden sm:inline">كلمة المرور</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="
                motion-fade-in
                flex items-center gap-1.5 rounded-xl
                border border-rose-200/80 bg-rose-50/80
                px-3 py-1.5 text-xs font-black text-rose-700
                hover:bg-rose-100 hover:border-rose-300
                hover:shadow-[0_4px_12px_rgba(244,63,94,0.2)]
                active:scale-95 transition-all duration-200 shadow-xs cursor-pointer
              "
              style={{ animationDelay: '350ms' }}
              title="تسجيل الخروج"
            >
              <LogOut size={14} className="shrink-0" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>

        </div>
      </nav>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        userEmail={sessionEmail}
      />
    </>
  );
}
