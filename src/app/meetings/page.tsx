'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Copy, ExternalLink, Video } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { getStudents, StudentRecord } from '@/lib/localDb';

type MeetingRecord = {
  id: string;
  studentId: string;
  title: string;
  date: string;
  time: string;
  link: string;
  notes: string;
};

const KEY = 'masar.meetings.v1';

function readMeetings(): MeetingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as MeetingRecord[];
  } catch {
    return [];
  }
}

function writeMeetings(meetings: MeetingRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(meetings));
}

export default function MeetingsPage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [form, setForm] = useState({
    studentId: '',
    title: 'جلسة متابعة مع د. إسماعيل',
    date: '',
    time: '',
    link: '',
    notes: '',
  });
  const [copyMessage, setCopyMessage] = useState('');

  const refresh = () => {
    const nextStudents = getStudents();
    setStudents(nextStudents);
    setMeetings(readMeetings());
    setForm((current) => ({ ...current, studentId: current.studentId || nextStudents[0]?.id || '' }));
  };

  useEffect(() => {
    const timeout = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const save = () => {
    if (!form.studentId || !form.date || !form.time || !form.link.trim()) return;
    const next: MeetingRecord = {
      ...form,
      id: `meeting_${crypto.randomUUID?.() ?? Date.now()}`,
    };
    writeMeetings([next, ...meetings]);
    setMeetings([next, ...meetings]);
    setForm((current) => ({ ...current, link: '', notes: '' }));
  };

  const copyInvite = async (meeting: MeetingRecord) => {
    const student = students.find((item) => item.id === meeting.studentId);
    const text = `${meeting.title}\nالطالب: ${student?.fullName ?? 'غير محدد'}\nالموعد: ${meeting.date} - ${meeting.time}\nالرابط: ${meeting.link}\n${meeting.notes ? `ملاحظات: ${meeting.notes}` : ''}`;
    await navigator.clipboard.writeText(text);
    setCopyMessage('تم نسخ دعوة الاجتماع.');
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-teal-800">اجتماعات Zoom</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">جدولة جلسات المتابعة وإرسال الرابط لولي الأمر</h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-600">
              صفحة تشغيل بسيطة للمتابعة: اختر الطالب، ضع رابط Zoom أو Google Meet، ثم انسخ الدعوة أو افتح الاجتماع.
            </p>
          </header>

          <section className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24 xl:self-start">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-lg bg-teal-50 text-teal-800">
                  <Video size={22} />
                </span>
                <div>
                  <p className="text-xs font-black text-slate-500">اجتماع جديد</p>
                  <h2 className="text-xl font-black text-slate-950">بيانات الموعد</h2>
                </div>
              </div>
              <div className="grid gap-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-black text-slate-500">الطالب</span>
                  <select value={form.studentId} onChange={(event) => setForm({ ...form, studentId: event.target.value })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black outline-none">
                    {students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}
                  </select>
                </label>
                <Field label="عنوان الجلسة" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="التاريخ" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} />
                  <Field label="الوقت" type="time" value={form.time} onChange={(value) => setForm({ ...form, time: value })} />
                </div>
                <Field label="رابط الاجتماع" value={form.link} onChange={(value) => setForm({ ...form, link: value })} placeholder="https://zoom.us/..." />
                <label className="block">
                  <span className="mb-2 block text-xs font-black text-slate-500">ملاحظات</span>
                  <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="min-h-24 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700" />
                </label>
                <button onClick={save} className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white">حفظ الاجتماع</button>
              </div>
            </aside>

            <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <CalendarClock className="text-teal-700" size={24} />
                <h2 className="text-xl font-black text-slate-950">الاجتماعات المحفوظة</h2>
              </div>
              <div className="grid gap-3">
                {meetings.length ? meetings.map((meeting) => {
                  const student = students.find((item) => item.id === meeting.studentId);
                  return (
                    <article key={meeting.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <h3 className="text-lg font-black text-slate-950">{meeting.title}</h3>
                          <p className="mt-1 text-sm font-bold text-slate-500">{student?.fullName ?? 'طالب غير محدد'} - {meeting.date} - {meeting.time}</p>
                          {meeting.notes && <p className="mt-2 text-sm font-bold leading-7 text-slate-600">{meeting.notes}</p>}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button onClick={() => copyInvite(meeting)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700">
                            <Copy size={16} />
                            نسخ الدعوة
                          </button>
                          <a href={meeting.link} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-sm font-black text-white">
                            <ExternalLink size={16} />
                            فتح الاجتماع
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                }) : (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold text-slate-500">لا توجد اجتماعات محفوظة بعد.</p>
                )}
              </div>
              {copyMessage && <p className="mt-4 rounded-lg bg-teal-50 p-3 text-sm font-black text-teal-900">{copyMessage}</p>}
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black text-slate-500">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700" />
    </label>
  );
}
