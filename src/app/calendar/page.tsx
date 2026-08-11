'use client';

import { useEffect, useState } from 'react';
import {
  CalendarClock, Plus, UsersRound, Video, CheckCircle2,
  Clock, X, Calendar as CalendarIcon, User, ChevronRight, ChevronLeft, Trash2
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { getStudents, getSession, type StudentRecord } from '@/lib/localDb';
import { createNotification } from '@/lib/notifications';

export interface CalendarSession {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMinutes: number;
  status: 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
}

import { syncDocToCloud } from '@/lib/firestoreSync';

const LOCAL_SESSIONS_KEY = 'masar.calendar_sessions.v1';

function readCalendarSessions(): CalendarSession[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LOCAL_SESSIONS_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCalendarSessions(items: CalendarSession[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(items));
  items.forEach((item) => {
    syncDocToCloud('calendar_sessions', item.id, item);
  });
}

export default function DoctorCalendarPage() {
  const [sessions, setSessions] = useState<CalendarSession[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Modal form
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('جلسة متابعة وتأهيل علاجية');
  const [time, setTime] = useState('10:00');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setSessions(readCalendarSessions());
    const allStudents = getStudents();
    setStudents(allStudents);
    if (allStudents.length > 0) setStudentId(allStudents[0].id);
  }, []);

  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find((s) => s.id === studentId);
    const newSession: CalendarSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      studentId,
      studentName: st ? st.fullName : 'طالب غير محدد',
      title,
      date: selectedDate,
      time,
      durationMinutes: 45,
      status: 'scheduled',
      notes,
    };

    const next = [newSession, ...sessions];
    setSessions(next);
    saveCalendarSessions(next);
    setShowModal(false);

    // Trigger notification
    createNotification({
      type: 'meeting',
      title: 'جدولة جلسة علاجية جديدة',
      body: `تم جدولة جلسة لـ ${newSession.studentName} في ${newSession.date} الساعة ${newSession.time}`,
      link: '/calendar',
    });
  };

  const handleToggleStatus = (id: string) => {
    const next = sessions.map((s) => {
      if (s.id === id) {
        const nextStatus: CalendarSession['status'] =
          s.status === 'scheduled' ? 'completed' : s.status === 'completed' ? 'cancelled' : 'scheduled';
        return { ...s, status: nextStatus };
      }
      return s;
    });
    setSessions(next);
    saveCalendarSessions(next);
  };

  const handleDelete = (id: string) => {
    const next = sessions.filter((s) => s.id !== id);
    setSessions(next);
    saveCalendarSessions(next);
  };

  const filteredSessions = sessions.filter((s) => s.date === selectedDate);

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <CalendarClock className="text-teal-600" size={26} />
                أجندة وجدول الجلسات العلاجية
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-1">
                جدولة الجلسات وتتبع حضور ومواعيد الطلاب في الوقت الفعلي
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-black text-white hover:bg-teal-700 transition shadow-sm"
            >
              <Plus size={18} /> جدولة جلسة جديدة
            </button>
          </div>

          {/* Calendar Picker + Daily Schedule Grid */}
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Left: Date selector */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <p className="font-black text-slate-800 text-sm">اختر تاريخ اليوم</p>
                <CalendarIcon size={18} className="text-teal-600" />
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-black text-slate-900 outline-none focus:border-teal-600"
              />
              <div className="rounded-xl bg-teal-50 p-4 border border-teal-100 text-xs font-bold text-teal-800">
                مجموع الجلسات في هذا اليوم: <span className="font-black text-sm">{filteredSessions.length} جلسة</span>
              </div>
            </div>

            {/* Right: Daily Schedule */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <p className="font-black text-slate-800 text-sm">
                  جدول يوم: <span className="text-teal-700 font-black">{selectedDate}</span>
                </p>
                <span className="text-xs font-bold text-slate-400">{filteredSessions.length} جلسة</span>
              </div>

              {filteredSessions.length === 0 ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <Clock className="mx-auto text-slate-300" size={36} />
                  <p className="text-sm font-black">لا توجد جلسات مجدولة لهذا اليوم</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="text-xs font-black text-teal-600 hover:underline"
                  >
                    + اضغط هنا لجدولة أول جلسة
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSessions.map((s) => (
                    <div
                      key={s.id}
                      className={`flex items-center justify-between rounded-2xl p-4 border transition ${
                        s.status === 'completed'
                          ? 'border-emerald-200 bg-emerald-50/60'
                          : s.status === 'cancelled'
                          ? 'border-rose-200 bg-rose-50/60'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-black text-xs ${
                          s.status === 'completed'
                            ? 'bg-emerald-600 text-white'
                            : s.status === 'cancelled'
                            ? 'bg-rose-500 text-white'
                            : 'bg-teal-600 text-white'
                        }`}>
                          {s.time}
                        </span>
                        <div>
                          <p className="font-black text-slate-900 text-sm">{s.title}</p>
                          <p className="text-xs font-bold text-slate-600 mt-0.5">
                            👦 الطالب: <span className="font-black text-slate-900">{s.studentName}</span> (45 دقيقة)
                          </p>
                          {s.notes && <p className="text-xs text-slate-500 mt-1 italic">ملاحظة: {s.notes}</p>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(s.id)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-black transition border ${
                            s.status === 'completed'
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : s.status === 'cancelled'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {s.status === 'completed' ? 'مكتملة ✓' : s.status === 'cancelled' ? 'ملغاة ✗' : 'مجدولة'}
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition"
                          title="حذف الجلسة"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Add Session Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-xs grid place-items-center">
              <form
                onSubmit={handleAddSession}
                className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 text-right"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-slate-900 text-lg">جدولة جلسة علاجية جديدة</h3>
                  <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">اختر الطالب</label>
                  <select
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none"
                    required
                  >
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>👦 {st.fullName} ({st.grade})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">عنوان الجلسة</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">التاريخ</label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">الوقت</label>
                    <input
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">ملاحظات الأخصائي</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ملاحظات أهداف الجلسة..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none resize-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 rounded-xl py-2.5 text-xs font-black text-slate-500 hover:bg-slate-100"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white hover:bg-teal-700 shadow-sm"
                  >
                    تأكيد الجدولة
                  </button>
                </div>
              </form>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
