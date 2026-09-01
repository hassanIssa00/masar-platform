'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, UserRound } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import VoiceRecorderButton, { MessageAudio } from '@/components/VoiceRecorderButton';
import { getMessages, getSession, getStudents, hydrateSessionFromServer, MessageRecord, saveMessage, StudentRecord } from '@/lib/cloudStore';
import { pullCloudDataToLocal, subscribeToCloudUpdates } from '@/lib/firestoreSync';

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <MessagesContent />
    </Suspense>
  );
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [body, setBody] = useState('');
  const [role, setRole] = useState<'doctor' | 'parent'>('doctor');

  const refresh = useCallback(async () => {
    const nextStudents = getStudents();
    setStudents(nextStudents);
    setMessages(getMessages());
    setSelectedStudentId((current) => current || searchParams.get('student') || nextStudents[0]?.id || '');
    const sessionRole = (getSession() ?? await hydrateSessionFromServer())?.role;
    setRole(sessionRole === 'parent' ? 'parent' : 'doctor');
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      await pullCloudDataToLocal(['students', 'messages']).catch(() => {});
      if (!cancelled) void refresh();
    };
    void load();
    const unsubscribe = subscribeToCloudUpdates(() => void refresh(), ['students', 'messages']);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [refresh]);

  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? students[0] ?? null;
  const thread = messages.filter((message) => !selectedStudent || message.studentId === selectedStudent.id).reverse();

  const send = () => {
    if (!body.trim()) return;
    saveMessage({
      studentId: selectedStudent?.id,
      from: role,
      to: role === 'doctor' ? 'parent' : 'doctor',
      body: body.trim(),
      read: false,
    });
    setBody('');
    void refresh();
  };

  const sendAudio = async (audioDataUrl: string) => {
    if (!selectedStudent) return;
    saveMessage({
      studentId: selectedStudent.id,
      from: role,
      to: role === 'doctor' ? 'parent' : 'doctor',
      body: 'رسالة صوتية',
      audioDataUrl,
      attachmentType: 'audio',
      read: false,
    });
    await refresh();
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          <header className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-teal-800">الرسائل</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">مراسلة د. إسماعيل وولي الأمر</h1>
            <p className="mt-3 max-w-3xl text-sm font-bold leading-7 text-slate-600">
              كل محادثة مرتبطة بملف طالب محدد حتى تكون المتابعة واضحة بجانب التقارير والمسار.
            </p>
          </header>

          <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="px-2 text-xl font-black text-slate-950">الطلاب</h2>
              <div className="mt-4 grid gap-2">
                {students.map((student) => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudentId(student.id)}
                    className={`rounded-lg border p-4 text-right ${selectedStudent?.id === student.id ? 'border-teal-700 bg-teal-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  >
                    <p className="font-black text-slate-950">{student.fullName}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{student.grade}</p>
                  </button>
                ))}
              </div>
            </aside>

            <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-lg bg-teal-50 text-teal-800">
                    <UserRound size={22} />
                  </span>
                  <div>
                    <p className="text-xs font-black text-slate-500">المحادثة الحالية</p>
                    <h2 className="text-xl font-black text-slate-950">{selectedStudent?.fullName ?? 'لا يوجد طالب محدد'}</h2>
                  </div>
                </div>
              </div>
              <div className="grid min-h-[420px] content-end gap-3 bg-slate-50 p-5">
                {thread.length ? (
                  thread.map((message) => (
                    <article key={message.id} className={`max-w-[82%] rounded-lg p-4 shadow-sm ${message.from === 'doctor' ? 'mr-auto bg-slate-950 text-white' : 'ml-auto bg-white text-slate-950'}`}>
                      <p className="text-xs font-black opacity-70">{message.from === 'doctor' ? 'د. إسماعيل' : 'ولي الأمر'}</p>
                      <p className="mt-2 text-sm font-bold leading-7">{message.body}</p>
                      <MessageAudio src={message.audioDataUrl} />
                      <p className="mt-2 text-[11px] font-bold opacity-50">{new Date(message.createdAt).toLocaleString('ar-SA')}</p>
                    </article>
                  ))
                ) : (
                  <p className="rounded-lg bg-white p-5 text-center text-sm font-bold text-slate-500">لا توجد رسائل لهذا الطالب بعد.</p>
                )}
              </div>
              <div className="grid gap-3 border-t border-slate-200 p-4 md:grid-cols-[180px_minmax(0,1fr)_auto_120px]">
                <select value={role} onChange={(event) => setRole(event.target.value as 'doctor' | 'parent')} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black outline-none">
                  <option value="doctor">د. إسماعيل</option>
                  <option value="parent">ولي الأمر</option>
                </select>
                <input value={body} onChange={(event) => setBody(event.target.value)} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-teal-700" placeholder="اكتب الرسالة..." />
                <VoiceRecorderButton onRecorded={sendAudio} disabled={!selectedStudent} />
                <button onClick={send} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-3 text-sm font-black text-white">
                  <Send size={17} />
                  إرسال
                </button>
              </div>
            </section>
          </section>
        </main>
      </div>
    </div>
  );
}
