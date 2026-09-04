'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Shield, Lock, Check, LogOut, LayoutDashboard, KeyRound } from 'lucide-react';
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

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  useEffect(() => {
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
    return () => {
      cancelled = true;
    };
  }, []);

  const isStaff = userRole === 'doctor' || userRole === 'specialist' || userRole === 'teacher';

  const selectStudent = (id: string) => {
    setActiveStudentId(id);
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl shadow-xs" dir="rtl">
        <div className="w-full flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">

          <div className="flex items-center gap-2">
            {/* Hamburger — only show when staff sidebar exists and not hidden */}
            {isStaff && !hideSidebarToggle && (
              <button
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('masar_toggle_sidebar'));
                  }
                }}
                className="grid h-9 w-9 place-items-center rounded-xl hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                aria-label="تبديل القائمة"
                title="تبديل القائمة الرئيسية"
              >
                <Menu size={22} />
              </button>
            )}

            {/* Brand Identity */}
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
              className="focus-ring flex min-w-0 items-center gap-3 rounded-lg"
            >
              <BrandMark size="sm" />
            </Link>

            {/* Dashboard Quick Access Button — STRICTLY FOR STAFF / DOCTOR ONLY */}
            {isStaff && (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs transition shadow-sm"
                title="الذهاب للوحة التحكم"
              >
                <LayoutDashboard size={15} />
                <span className="hidden sm:inline">لوحة التحكم (الداشبورد)</span>
              </Link>
            )}
          </div>

          {/* Profile Header Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <NotificationBell role="doctor" />

            {isStaff ? (
              /* Staff / Doctor Badge (Clickable link to Dashboard) */
              <Link href="/dashboard" className="hidden sm:flex min-w-0 items-center gap-2 rounded-xl bg-teal-50 hover:bg-teal-100 px-3.5 py-1.5 text-right border border-teal-200 transition">
                <Shield size={16} className="text-teal-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-black text-teal-700 uppercase tracking-wider">لوحة تشغيل الاستشاري</p>
                  <p className="truncate text-xs font-black text-slate-900">{userName || 'د. إسماعيل عيسى'}</p>
                </div>
              </Link>
            ) : (
              /* Family & Child Switcher Bar — Parent Account Only */
              <>
                {students.length > 0 && (
                  <div className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold">
                    <span className="text-slate-400">{students.length > 1 ? 'الطلاب:' : 'الطالب:'}</span>
                    <select
                      value={activeStudentId}
                      onChange={(e) => selectStudent(e.target.value)}
                      className="bg-transparent font-black text-slate-900 outline-none cursor-pointer"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>👦 {s.fullName} ({s.grade})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="hidden sm:flex min-w-0 rounded-xl bg-slate-50 px-3 py-1.5 text-right border border-slate-200">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">حساب العائلة</p>
                    <p className="truncate text-xs font-black text-slate-900">{userName || 'ولي الأمر'}</p>
                  </div>
                </div>
              </>
            )}

            {/* Change Password Button */}
            <button
              onClick={() => setShowChangePassword(true)}
              className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-black text-teal-800 hover:bg-teal-100 transition shadow-2xs cursor-pointer"
              title="تغيير كلمة المرور للحساب"
            >
              <KeyRound size={15} />
              <span className="hidden sm:inline">كلمة المرور</span>
            </button>

            {/* Always Visible Direct Logout Button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100 transition shadow-2xs cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">تسجيل الخروج</span>
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
