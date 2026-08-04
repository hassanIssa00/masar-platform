'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck, FileText, MessageSquare, Sparkles, User, Video, X } from 'lucide-react';
import { subscribeToNotifications, markNotificationAsRead, clearAllNotifications, type AppNotification } from '@/lib/notifications';

const NOTIF_ICONS: Record<string, React.ElementType> = {
  survey: FileText,
  report: FileText,
  meeting: Video,
  message: MessageSquare,
  student: User,
  system: Sparkles,
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeToNotifications(setNotifications);
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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleRead = (id: string) => {
    markNotificationAsRead(id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleClear = () => {
    clearAllNotifications();
    setNotifications([]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
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
        <div className="absolute left-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl z-50 text-right space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-900 text-sm">التنبيهات والإشعارات</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-700">
                  {unreadCount} جديد
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={handleClear}
                className="text-[11px] font-black text-slate-400 hover:text-slate-600 transition"
              >
                مسح الكل
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="py-8 text-center text-slate-400 space-y-1">
              <Bell className="mx-auto text-slate-300" size={28} />
              <p className="text-xs font-black">لا توجد إشعارات جديدة</p>
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
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      n.read ? 'bg-slate-200 text-slate-600' : 'bg-teal-600 text-white'
                    }`}>
                      <Icon size={15} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-slate-900 truncate">{n.title}</p>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(n.createdAt).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-500 line-clamp-2 mt-0.5">{n.body}</p>
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
      )}
    </div>
  );
}
