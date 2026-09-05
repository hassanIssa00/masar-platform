'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Award, BookOpen, CheckCircle, FileText, MessageSquare, Sparkles, User, Video, X } from 'lucide-react';
import {
  subscribeToNotifications,
  markNotificationAsRead,
  clearNotificationsForRole,
  matchesNotificationRole,
  type AppNotification,
} from '@/lib/notifications';
import { getSession } from '@/lib/cloudStore';

const NOTIF_ICONS: Record<string, React.ElementType> = {
  survey: FileText,
  report: FileText,
  meeting: Video,
  message: MessageSquare,
  student: User,
  system: Sparkles,
  achievement: Award,
  homework: BookOpen,
  assessment: CheckCircle,
};

interface NotificationBellProps {
  role?: 'doctor' | 'parent' | 'student';
  studentId?: string;
  studentName?: string;
  className?: string;
}

export default function NotificationBell({ role, studentId, studentName, className = '' }: NotificationBellProps) {
  const [allNotifications, setAllNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname() || '';

  // 1. Resolve role
  const resolvedRole = useMemo<'doctor' | 'parent' | 'student'>(() => {
    if (role) return role;
    const session = getSession();
    if (pathname.includes('/school-student') || pathname.startsWith('/student/')) {
      return 'student';
    }
    if (pathname.includes('/school-parent') || pathname === '/parent') {
      return 'parent';
    }
    // Note: /parents is Dr. Ismail's parent management table in doctor portal
    if (
      pathname.includes('/parents') ||
      pathname.includes('/dashboard') ||
      pathname.includes('/branches') ||
      pathname.includes('/attendance') ||
      pathname.includes('/calendar') ||
      pathname.includes('/homework') ||
      pathname.includes('/messages') ||
      pathname.includes('/reports') ||
      pathname.includes('/students')
    ) {
      return 'doctor';
    }
    if (session?.role === 'parent') return 'parent';
    if (session?.role === 'student') return 'student';
    return 'doctor';
  }, [role, pathname]);

  // 2. Resolve studentId
  const resolvedStudentId = useMemo(() => {
    if (studentId) return studentId;
    const session = getSession();
    if (resolvedRole === 'parent') {
      return (session as any)?.linkedStudentId || session?.id || undefined;
    }
    if (resolvedRole === 'student') {
      return session?.id || (session as any)?.linkedStudentId || undefined;
    }
    return undefined;
  }, [studentId, resolvedRole]);

  // 2b. Resolve studentName (prefer prop, then session fallback)
  const resolvedStudentName = useMemo(() => {
    if (studentName) return studentName;
    const session = getSession();
    if (resolvedRole === 'student') return session?.name;
    if (resolvedRole === 'parent') return (session as any)?.childName || (session as any)?.linkedStudentName;
    return undefined;
  }, [resolvedRole, studentName]);

  useEffect(() => {
    const unsub = subscribeToNotifications(setAllNotifications);
    return () => unsub();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3. Filter notifications strictly by resolved role & student
  const notifications = useMemo(() => {
    return allNotifications.filter((n) => matchesNotificationRole(n, resolvedRole, resolvedStudentId, resolvedStudentName));
  }, [allNotifications, resolvedRole, resolvedStudentId, resolvedStudentName]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleRead = (id: string) => {
    markNotificationAsRead(id);
    setAllNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleClear = async () => {
    await clearNotificationsForRole(resolvedRole, resolvedStudentId);
    setAllNotifications((prev) => prev.filter((n) => !matchesNotificationRole(n, resolvedRole, resolvedStudentId)));
  };

  const roleLabel =
    resolvedRole === 'doctor'
      ? 'لوحة د. إسماعيل'
      : resolvedRole === 'parent'
      ? 'متابعة ولي الأمر'
      : 'بوابة البطل';

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
        aria-label="الإشعارات"
        title="التنبيهات والإشعارات"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 grid h-5 min-w-[20px] place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '+9' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-40 sm:hidden"
            onClick={() => setOpen(false)}
          />

          {/* Notification Menu (Centered on Mobile, Anchored on Desktop) */}
          <div className="fixed inset-x-3 top-16 max-w-sm sm:max-w-none mx-auto sm:mx-0 sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:mt-2 w-auto sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl z-50 text-right space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-black text-slate-900 text-sm">التنبيهات والإشعارات</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {roleLabel}
                </span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">
                    {unreadCount} جديد
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={handleClear}
                    className="text-[11px] font-black text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  >
                    مسح الكل
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 sm:hidden transition"
                  title="إغلاق"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

          {notifications.length === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-1">
              <Bell className="mx-auto text-slate-300" size={28} />
              <p className="text-xs font-black">لا توجد إشعارات جديدة</p>
              <p className="text-[10px] text-slate-400">
                {resolvedRole === 'doctor'
                  ? 'ستصلك هنا تنبيهات تسليم الواجبات والاستبيانات من الطلاب.'
                  : resolvedRole === 'parent'
                  ? 'ستصلك هنا شهادات وأوسمة وواجبات ابنك أولاً بأول.'
                  : 'ستصلك هنا شهاداتك وأوسمتك وواجباتك المدرسية يا بطل!'}
              </p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {notifications.map((n) => {
                const Icon = NOTIF_ICONS[n.type] || Sparkles;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleRead(n.id)}
                    className={`flex items-start gap-3 rounded-xl p-3 border transition cursor-pointer ${
                      n.read ? 'border-slate-100 bg-slate-50/50' : 'border-teal-100 bg-teal-50/60 font-black'
                    }`}
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                        n.read ? 'bg-slate-200 text-slate-600' : 'bg-teal-600 text-white'
                      }`}
                    >
                      <Icon size={15} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-slate-900 truncate">{n.title}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(n.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-600 line-clamp-2 mt-0.5">{n.body}</p>
                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => setOpen(false)}
                          className="mt-1.5 inline-block text-[11px] font-black text-teal-700 hover:underline"
                        >
                          عرض التفاصيل ←
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </>
      )}
    </div>
  );
}
