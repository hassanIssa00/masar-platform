'use client';

import { useEffect, useState } from 'react';
import { 
  Video, VideoOff, Mic, MicOff, Monitor, PhoneOff, Copy, 
  ExternalLink, CalendarClock, MessageSquare, Sparkles, User, 
  ShieldCheck, PenTool, Radio, Volume2
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { getStudents, StudentRecord } from '@/lib/localDb';

type MeetingRecord = {
  id: string;
  studentId: string;
  roomCode: string;
  title: string;
  date: string;
  time: string;
  link: string;
  type: 'internal' | 'zoom';
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
  
  // Live Studio States
  const [activeCallRoom, setActiveCallRoom] = useState<MeetingRecord | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([
    { sender: 'د. إسماعيل عيسى', text: 'أهلاً بك في جلسة المتابعة المباشرة على منصة مسار.', time: '10:00 ص' }
  ]);
  const [newChatText, setNewChatText] = useState('');

  const [form, setForm] = useState({
    studentId: '',
    title: 'جلسة تأهيل ومتابعة مباشرة',
    date: new Date().toISOString().slice(0, 10),
    time: '10:00',
    type: 'internal' as 'internal' | 'zoom',
    zoomUrl: '',
    notes: '',
  });
  const [copyMessage, setCopyMessage] = useState('');

  const refresh = () => {
    const nextStudents = getStudents();
    setStudents(nextStudents);
    const existing = readMeetings();
    
    // Default demo meeting if empty
    if (existing.length === 0 && nextStudents.length > 0) {
      const demoMeeting: MeetingRecord = {
        id: 'meeting_demo_1',
        studentId: nextStudents[0].id,
        roomCode: 'MASAR-ROOM-8802',
        title: 'جلسة تأسيس قرائي ونطق مباشر',
        date: new Date().toISOString().slice(0, 10),
        time: '11:00',
        type: 'internal',
        link: `${typeof window !== 'undefined' ? window.location.origin : ''}/meetings?room=MASAR-ROOM-8802`,
        notes: 'جلسة تقييم وتدريب على المخارج الصوتية والقاموس المفيد.',
      };
      writeMeetings([demoMeeting]);
      setMeetings([demoMeeting]);
    } else {
      setMeetings(existing);
    }

    setForm((current) => ({ ...current, studentId: current.studentId || nextStudents[0]?.id || '' }));
  };

  useEffect(() => {
    const timeout = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const saveMeeting = () => {
    if (!form.studentId || !form.date || !form.time) return;
    const roomCode = `MASAR-ROOM-${Math.floor(1000 + Math.random() * 9000)}`;
    const internalLink = typeof window !== 'undefined' ? `${window.location.origin}/meetings?room=${roomCode}` : '';
    
    const next: MeetingRecord = {
      id: `meeting_${Date.now()}`,
      studentId: form.studentId,
      roomCode,
      title: form.title,
      date: form.date,
      time: form.time,
      type: form.type,
      link: form.type === 'internal' ? internalLink : (form.zoomUrl || internalLink),
      notes: form.notes,
    };

    const updated = [next, ...meetings];
    writeMeetings(updated);
    setMeetings(updated);
    setForm((current) => ({ ...current, zoomUrl: '', notes: '' }));
  };

  const copyInvite = async (meeting: MeetingRecord) => {
    const student = students.find((item) => item.id === meeting.studentId);
    const text = `🎥 ${meeting.title}\nالطالب: ${student?.fullName ?? 'طالب منصة مسار'}\nالموعد: ${meeting.date} - ${meeting.time}\nرابط الدخول المباشر للجلسة:\n${meeting.link}\n${meeting.notes ? `ملاحظات الجلسة: ${meeting.notes}` : ''}`;
    await navigator.clipboard.writeText(text);
    setCopyMessage('تم نسخ دعوة الاجتماع ورابط الجلسة المباشر بنجاح!');
    setTimeout(() => setCopyMessage(''), 4000);
  };

  const launchCall = (meeting: MeetingRecord) => {
    setActiveCallRoom(meeting);
  };

  const sendChatMessage = () => {
    if (!newChatText.trim()) return;
    setChatMessages((prev) => [
      ...prev,
      { sender: 'د. إسماعيل عيسى', text: newChatText.trim(), time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) }
    ]);
    setNewChatText('');
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950 font-sans" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          
          <header className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black text-teal-800 uppercase tracking-wider">نظام الجلسات والتواصل المباشر</p>
                <h1 className="mt-1 text-3xl font-black text-slate-950 md:text-4xl">غرفة البث المباشر وجدول الاجتماعات</h1>
                <p className="mt-2 max-w-3xl text-xs sm:text-sm font-bold text-slate-600">
                  نظام تواصل مرئي متكامل خاص بالمنصة (Live Studio) بين د. إسماعيل عيسى والطلاب مع سبورة تفاعلية ودوزنة صوتية.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-black text-teal-800">
                <Radio size={16} className="text-teal-600 animate-pulse" />
                <span>نظام الاتصال المباشر مفعل</span>
              </span>
            </div>
          </header>

          {/* ACTIVE LIVE VIDEO CALL STUDIO MODAL / INTERFACE */}
          {activeCallRoom && (
            <div className="mb-8 overflow-hidden rounded-3xl border-2 border-teal-600 bg-slate-950 text-white shadow-2xl transition">
              
              {/* Call Top Control Bar */}
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/90 px-6 py-4">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-rose-500 animate-ping" />
                  <div>
                    <h2 className="font-black text-white text-base">{activeCallRoom.title}</h2>
                    <p className="text-xs font-bold text-teal-300">رمز الغرفة: {activeCallRoom.roomCode} · جودة الاتصال 1080p HD</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowWhiteboard(!showWhiteboard)}
                    className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-black transition ${
                      showWhiteboard ? 'bg-teal-400 text-slate-950' : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <PenTool size={16} />
                    <span>السبورة التفاعلية</span>
                  </button>

                  <button
                    onClick={() => setActiveCallRoom(null)}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 transition"
                  >
                    <PhoneOff size={16} />
                    <span>إنهاء الجلسة</span>
                  </button>
                </div>
              </div>

              {/* Call Main Screen & Grid */}
              <div className="grid lg:grid-cols-12 min-h-[460px]">
                
                {/* Video Streams & Whiteboard Area */}
                <div className={`p-4 space-y-4 ${showWhiteboard ? 'lg:col-span-8' : 'lg:col-span-8'}`}>
                  
                  {showWhiteboard ? (
                    <div className="h-96 rounded-2xl bg-white p-4 text-slate-900 flex flex-col justify-between border border-slate-300 shadow-inner">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <span className="text-xs font-black text-teal-800 flex items-center gap-1">
                          <PenTool size={14} /> سبورة التدريب والقراءة المشتركة
                        </span>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                          <span>ألوان الكتابة:</span>
                          <span className="h-4 w-4 rounded-full bg-teal-600 cursor-pointer" />
                          <span className="h-4 w-4 rounded-full bg-blue-600 cursor-pointer" />
                          <span className="h-4 w-4 rounded-full bg-rose-600 cursor-pointer" />
                        </div>
                      </div>
                      <div className="grid place-items-center flex-1 text-center text-slate-400 font-bold text-sm">
                        <p className="max-w-md leading-relaxed">
                          [سبورة تفاعلية مباشرة كراسة التهجئة والرياضيات]
                          <br />
                          يمكن للدكتور والطالب الكتابة والحل المباشر معاً أثناء الاتصال المرئي.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 h-96">
                      
                      {/* Doctor Video Box */}
                      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-white/10 flex flex-col justify-between p-4">
                        <div className="flex justify-between items-center z-10">
                          <span className="rounded-full bg-slate-950/80 backdrop-blur px-3 py-1 text-[11px] font-black text-teal-300">
                            د. إسماعيل عيسى (المضيف)
                          </span>
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        </div>

                        {videoOn ? (
                          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900">
                            <div className="text-center space-y-2">
                              <ShieldCheck size={56} className="mx-auto text-teal-400 opacity-80 animate-pulse" />
                              <p className="text-xs font-black text-slate-300">البث المباشر للكاميرا محاكي بوضوح HD</p>
                            </div>
                          </div>
                        ) : (
                          <div className="absolute inset-0 grid place-items-center bg-slate-950">
                            <User size={48} className="text-slate-600" />
                          </div>
                        )}

                        <div className="z-10 flex items-center justify-between text-xs font-bold text-white/70">
                          <span>{micOn ? '🎙️ الصوت يعمل' : '🔇 مكتوم'}</span>
                          <span>1080p</span>
                        </div>
                      </div>

                      {/* Student Video Box */}
                      <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-white/10 flex flex-col justify-between p-4">
                        <div className="flex justify-between items-center z-10">
                          <span className="rounded-full bg-slate-950/80 backdrop-blur px-3 py-1 text-[11px] font-black text-emerald-300">
                            {students.find((s) => s.id === activeCallRoom.studentId)?.fullName || 'الطالب المباشر'}
                          </span>
                          <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        </div>

                        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950">
                          <div className="text-center space-y-2">
                            <User size={56} className="mx-auto text-emerald-400 opacity-80" />
                            <p className="text-xs font-black text-slate-300">متصل الآن عبر الغرفة المباشرة</p>
                          </div>
                        </div>

                        <div className="z-10 flex items-center justify-between text-xs font-bold text-white/70">
                          <span>🎙️ ميكروفون الطالب يعمل</span>
                          <span>مستقر</span>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Call Bottom Action Toolbar */}
                  <div className="flex items-center justify-center gap-4 rounded-2xl bg-slate-900 p-3 border border-white/10">
                    <button
                      onClick={() => setMicOn(!micOn)}
                      className={`grid h-11 w-11 place-items-center rounded-xl transition ${
                        micOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white'
                      }`}
                      title="الميكروفون"
                    >
                      {micOn ? <Mic size={20} /> : <MicOff size={20} />}
                    </button>

                    <button
                      onClick={() => setVideoOn(!videoOn)}
                      className={`grid h-11 w-11 place-items-center rounded-xl transition ${
                        videoOn ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white'
                      }`}
                      title="الكاميرا"
                    >
                      {videoOn ? <Video size={20} /> : <VideoOff size={20} />}
                    </button>

                    <button
                      onClick={() => setScreenShare(!screenShare)}
                      className={`grid h-11 w-11 place-items-center rounded-xl transition ${
                        screenShare ? 'bg-teal-400 text-slate-950' : 'bg-slate-800 text-white hover:bg-slate-700'
                      }`}
                      title="مشاركة الشاشة"
                    >
                      <Monitor size={20} />
                    </button>

                    <button
                      onClick={() => setActiveCallRoom(null)}
                      className="flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-2.5 text-xs font-black text-white hover:bg-rose-700 transition"
                    >
                      <PhoneOff size={18} />
                      <span>مغادرة الغرفة</span>
                    </button>
                  </div>

                </div>

                {/* Right In-Call Chat & Notes Panel */}
                <div className="lg:col-span-4 border-r border-white/10 bg-slate-900/60 p-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <h3 className="text-xs font-black text-teal-300 uppercase tracking-wider border-b border-white/10 pb-2">
                      محادثة وملاحظات الجلسة
                    </h3>
                    
                    <div className="space-y-2.5 max-h-72 overflow-y-auto">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className="rounded-xl bg-slate-950/80 p-3 border border-white/5 text-right">
                          <p className="text-[11px] font-black text-teal-300">{msg.sender} <span className="text-[9px] text-slate-400 opacity-60">· {msg.time}</span></p>
                          <p className="mt-1 text-xs font-bold text-slate-200 leading-relaxed">{msg.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={newChatText}
                      onChange={(e) => setNewChatText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                      placeholder="اكتب رسالة في الجلسة..."
                      className="flex-1 rounded-xl bg-slate-950 border border-white/10 px-3 py-2 text-xs font-bold text-white outline-none focus:border-teal-400"
                    />
                    <button
                      onClick={sendChatMessage}
                      className="rounded-xl bg-teal-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-teal-300 transition"
                    >
                      إرسال
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* MAIN MEETINGS MANAGEMENT GRID */}
          <section className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
            
            {/* New Schedule Form */}
            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24 xl:self-start space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  <Video size={20} />
                </span>
                <div>
                  <p className="text-xs font-black text-slate-500">إنشاء موعد جديد</p>
                  <h2 className="text-lg font-black text-slate-950">بيانات الجلسة المباشرة</h2>
                </div>
              </div>

              <div className="space-y-3.5 text-right">
                
                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-slate-700">الطالب المستهدف</span>
                  <select 
                    value={form.studentId} 
                    onChange={(event) => setForm({ ...form, studentId: event.target.value })} 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-black text-slate-900 outline-none focus:border-teal-600"
                  >
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>{student.fullName} ({student.grade})</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-slate-700">نوع نظام الاتصال</span>
                  <select 
                    value={form.type} 
                    onChange={(event) => setForm({ ...form, type: event.target.value as 'internal' | 'zoom' })} 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-black text-slate-900 outline-none focus:border-teal-600"
                  >
                    <option value="internal">🎥 غرفة البث المباشر الخاصة بالمنصة (Masar Native Live)</option>
                    <option value="zoom">🔗 رابط Zoom خارجي</option>
                  </select>
                </label>

                <Field label="عنوان الجلسة" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
                
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="التاريخ" type="date" value={form.date} onChange={(value) => setForm({ ...form, date: value })} />
                  <Field label="الوقت" type="time" value={form.time} onChange={(value) => setForm({ ...form, time: value })} />
                </div>

                {form.type === 'zoom' && (
                  <Field label="رابط Zoom الخارجي" value={form.zoomUrl} onChange={(value) => setForm({ ...form, zoomUrl: value })} placeholder="https://zoom.us/j/..." />
                )}

                <label className="block">
                  <span className="mb-1.5 block text-xs font-black text-slate-700">ملاحظات الجلسة والتعليمات</span>
                  <textarea 
                    value={form.notes} 
                    onChange={(event) => setForm({ ...form, notes: event.target.value })} 
                    placeholder="تعليمات الجلسة أو المهارات المراد تدريب الطفل عليها..."
                    className="min-h-20 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600" 
                  />
                </label>

                <button 
                  onClick={saveMeeting} 
                  className="w-full rounded-xl bg-teal-600 px-4 py-3 text-xs font-black text-white hover:bg-teal-700 transition shadow-md shadow-teal-600/20 active:scale-95"
                >
                  جدولة واعتمد الجلسة
                </button>

              </div>
            </aside>

            {/* Saved Scheduled Meetings */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <CalendarClock className="text-teal-700" size={22} />
                <h2 className="text-xl font-black text-slate-950">الجلسات المجدولة والمباشرة</h2>
              </div>

              {copyMessage && (
                <div className="rounded-xl bg-teal-50 border border-teal-200 p-3.5 text-xs font-black text-teal-900">
                  {copyMessage}
                </div>
              )}

              <div className="grid gap-3">
                {meetings.length > 0 ? (
                  meetings.map((meeting) => {
                    const student = students.find((item) => item.id === meeting.studentId);
                    return (
                      <article key={meeting.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:bg-white hover:border-slate-300">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-teal-100 border border-teal-200 px-2.5 py-0.5 text-[10px] font-black text-teal-800">
                                {meeting.type === 'internal' ? '🎥 غرفة المنصة المباشرة' : '🔗 Zoom'}
                              </span>
                              <span className="text-xs font-black text-slate-400">رمز: {meeting.roomCode}</span>
                            </div>
                            <h3 className="text-base font-black text-slate-950">{meeting.title}</h3>
                            <p className="text-xs font-bold text-slate-600">
                              الطالب: <span className="font-black text-slate-900">{student?.fullName ?? 'طالب منصة مسار'}</span> ({student?.grade ?? 'عام'}) · الموعد: {meeting.date} الساعة {meeting.time}
                            </p>
                            {meeting.notes && (
                              <p className="text-xs font-bold text-slate-500 leading-relaxed mt-1">ملاحظة: {meeting.notes}</p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => copyInvite(meeting)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-100 transition"
                            >
                              <Copy size={15} />
                              <span>نسخ الدعوة</span>
                            </button>

                            <button
                              onClick={() => launchCall(meeting)}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white hover:bg-teal-700 transition shadow-sm active:scale-95"
                            >
                              <Video size={16} />
                              <span>دخول الغرفة المباشرة</span>
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs font-bold text-slate-500">
                    لا توجد جلسات مجدولة بعد. أنشئ موعد جديد للبدء بالبث المباشر.
                  </p>
                )}
              </div>

            </section>

          </section>

        </main>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block text-right">
      <span className="mb-1.5 block text-xs font-black text-slate-700">{label}</span>
      <input 
        type={type} 
        value={value} 
        onChange={(event) => onChange(event.target.value)} 
        placeholder={placeholder} 
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-bold text-slate-900 outline-none focus:border-teal-600" 
      />
    </label>
  );
}
