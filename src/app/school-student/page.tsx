'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  BookOpen,
  Star,
  Mic,
  Camera,
  FileText,
  CheckCircle,
  Award,
  Flame,
  Clock,
  Video,
  ChevronRight,
  ChevronLeft,
  Send,
  Loader2,
  X,
  Play,
  Square,
  Upload,
  LogOut,
  ScanFace,
  Sparkles,
  Home,
  User,
  GraduationCap,
  Calendar
} from 'lucide-react';
import { DAY_NAMES, SUBJECT_COLORS, DEFAULT_SCHEDULE, Period } from '@/data/ikhlasSchedule';
import { clearSession, getSession, getStudents, getIkhlasPosts, hydrateSessionFromServer, StudentRecord } from '@/lib/localDb';
import { getClassStudents, ClassStudentRecord } from '@/lib/classDb';
import StudentProfileCard from '@/components/StudentProfileCard';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
const BRANCH = 'IKHLAS_JEDDAH';

type Tab = 'home' | 'homework' | 'schedule' | 'meetings';

export default function StudentDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Student Data from session & DB
  const [studentName, setStudentName] = useState('طالب');
  const [studentPhoto, setStudentPhoto] = useState<string>('');
  const [studentRecord, setStudentRecord] = useState<any>(null);

  const [selectedHw, setSelectedHw] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadStudentPortal = async () => {
      const session = getSession() ?? await hydrateSessionFromServer();
      if (cancelled) return;
      if (!session) {
        router.replace('/login');
        return;
      }
      if (session.role === 'doctor' || session.role === 'specialist') {
        router.replace('/dashboard');
        return;
      }
      if (session.role === 'parent') {
        router.replace('/school-parent');
        return;
      }

      // Look up student from both Classroom DB and Platform DB
      const classStudents = getClassStudents();
      const allStudents = getStudents();
      const combined = [...classStudents, ...allStudents];

      const email = session.email?.trim().toLowerCase() ?? '';
      const phone = session.phone?.replace(/\D/g, '') ?? '';
      const sName = session.name?.trim().toLowerCase() ?? '';

      const linked = combined.find((s: any) => {
        if (session.id && s.id === session.id) return true;
        const fn = (s.fullName || '').trim().toLowerCase();
        if (sName && (fn === sName || fn.includes(sName) || sName.includes(fn))) return true;
        if (sName.includes('ربيع') && fn.includes('ربيع')) return true;
        if (phone && (s.parentPhone || '').replace(/\D/g, '').includes(phone)) return true;
        if (email && ((s.email || '').trim().toLowerCase() === email || (s.parentEmail || '').trim().toLowerCase() === email)) return true;
        return false;
      }) || combined[0] || null;

      const finalName = linked?.fullName || session.name || 'طالب';
      setStudentName(finalName);
      setStudentPhoto(linked?.photoUrl || '');
      setStudentRecord(linked || {
        fullName: finalName,
        grade: 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
        parentName: 'ولي الأمر',
        parentPhone: session.phone || '',
      });

      fetchData();
    };

    void loadStudentPortal();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      let hwData = [];
      let meetData = [];
      try {
        const hwRes = await fetch(`${API}/school/homework?branch=${BRANCH}`, { headers });
        if (hwRes.ok) hwData = await hwRes.json();
      } catch (e) {}

      if (!Array.isArray(hwData) || hwData.length === 0) {
        const posts = getIkhlasPosts();
        const hwPosts = posts.filter((p) => p.type === 'homework');
        hwData = hwPosts.map((p) => ({
          id: p.id,
          title: p.title,
          subject: 'واجب منزلي',
          dueDate: p.dueDate || p.createdAt.slice(0, 10),
          status: 'pending',
          points: 10,
        }));
      }

      try {
        const meetRes = await fetch(`${API}/school/meetings?branch=${BRANCH}`, { headers });
        if (meetRes.ok) meetData = await meetRes.json();
      } catch (e) {}

      setHomeworks(hwData);
      setMeetings(meetData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    router.push('/login');
  };

  const tabs: Array<{ key: Tab; label: string; icon: any }> = [
    { key: 'home',      label: 'الرئيسية',  icon: Home },
    { key: 'schedule',  label: 'الجدول',    icon: Clock },
    { key: 'homework',  label: 'الواجبات',  icon: BookOpen },
    { key: 'meetings',  label: 'الحصص',     icon: Video },
  ];

  const renderNavbar = () => (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-4 py-3 mb-6">
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div>
          <h1 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-1.5">
            <span>منصة مَسَار الذكية</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-black px-2.5 py-0.5 rounded-full border border-emerald-200">
              فصل د. إسماعيل
            </span>
          </h1>
          <p className="text-xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            بوابة الطالب التفاعلية — {new Date().toLocaleDateString('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/face-enroll"
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/80 px-3 py-2 rounded-2xl text-xs font-black transition-all shadow-xs active:scale-95"
            title="تسجيل الدخول بالوجه"
          >
            <ScanFace size={16} className="text-emerald-700" />
            <span className="hidden sm:inline">تسجيل الوجه</span>
          </Link>

          <button
            onClick={handleLogout}
            title="تسجيل الخروج"
            className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-2 rounded-2xl text-xs font-black transition-all shadow-xs active:scale-95 cursor-pointer"
          >
            <LogOut size={16} />
            <span>خروج</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderHomeTab = () => (
    <div className="space-y-5">
      {/* Student Profile Card */}
      {studentRecord && (
        <StudentProfileCard
          student={{
            fullName: studentRecord.fullName || studentName,
            grade: studentRecord.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى',
            photoUrl: studentRecord.photoUrl || studentPhoto,
            parentName: studentRecord.parentName,
            parentPhone: studentRecord.parentPhone,
            nationalId: studentRecord.nationalId,
            dateOfBirth: studentRecord.dateOfBirth,
            notes: studentRecord.notes,
          }}
          greeting="مرحباً بك يا بطل 👋"
          variant="student"
          showParent={true}
        />
      )}

      {/* Quick Homework Preview Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-teal-600" />
            <h3 className="font-black text-sm text-slate-900">الواجبات المطلوبة منك 📋</h3>
          </div>
          <button onClick={() => setActiveTab('homework')} className="text-xs font-black text-teal-700 hover:underline cursor-pointer">
            عرض الكل ({homeworks.length})
          </button>
        </div>

        {homeworks.length === 0 ? (
          <div className="p-4 text-center text-xs font-bold text-slate-400">
            🎉 رائع! لا توجد واجبات متأخرة اليوم.
          </div>
        ) : (
          <div className="space-y-2">
            {homeworks.slice(0, 2).map((hw) => (
              <div key={hw.id} onClick={() => { setActiveTab('homework'); setSelectedHw(hw); }} className="p-3 bg-slate-50 hover:bg-teal-50 rounded-2xl border border-slate-100 flex items-center justify-between cursor-pointer transition">
                <div>
                  <h4 className="font-black text-xs text-slate-900">{hw.title}</h4>
                  <p className="text-[10px] font-bold text-slate-500">{hw.subject} • موعد التسليم: {hw.dueDate}</p>
                </div>
                <span className="bg-teal-100 text-teal-800 text-[10px] font-black px-2.5 py-1 rounded-full">
                  حل الواجب ✍️
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today Schedule Summary */}
      {(() => {
        const jsDay = new Date().getDay();
        const isSchoolDay = jsDay >= 0 && jsDay <= 4;
        const todayPeriods = DEFAULT_SCHEDULE.filter((p) => p.dayOfWeek === jsDay).slice(0, 2);

        return (
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-emerald-600" />
                <h3 className="font-black text-sm text-slate-900">
                  {isSchoolDay ? `جدول حصص اليوم (${DAY_NAMES[jsDay]}) 🕒` : 'جدول الحصص المدرسية 🕒'}
                </h3>
              </div>
              <button onClick={() => setActiveTab('schedule')} className="text-xs font-black text-emerald-700 hover:underline cursor-pointer">
                الجدول الكامل
              </button>
            </div>
            {isSchoolDay && todayPeriods.length >= 2 ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200">
                  <p className="text-[10px] font-black text-emerald-800">الحصة الأولى ({todayPeriods[0].startTime})</p>
                  <p className="text-xs font-black text-slate-900 mt-0.5">{todayPeriods[0].subjectName}</p>
                </div>
                <div className="p-3 bg-teal-50 rounded-2xl border border-teal-200">
                  <p className="text-[10px] font-black text-teal-800">الحصة الثانية ({todayPeriods[1].startTime})</p>
                  <p className="text-xs font-black text-slate-900 mt-0.5">{todayPeriods[1].subjectName}</p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-2xl text-center text-xs font-bold text-slate-500">
                🌴 اليوم إجازة نهاية الأسبوع — يبدأ اليوم الدراسي يوم الأحد القادم.
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );

  const renderHomeworkTab = () => (
    <div className="space-y-4">
      {homeworks.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm space-y-3">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl">
            🎉
          </div>
          <h3 className="text-lg font-black text-slate-900">لا توجد واجبات منزلية مطلوبة حالياً</h3>
          <p className="text-xs font-bold text-slate-500 max-w-sm mx-auto leading-relaxed">
            أحسنت يا بطل! لم ينشر معلمك واجبات جديدة بعد. ستظهر الواجبات فور نشرها من معلم الفصل.
          </p>
        </div>
      ) : (
        homeworks.map((hw) => (
          <div key={hw.id} onClick={() => hw.status === 'pending' && setSelectedHw(hw)} className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-all ${hw.status === 'pending' ? 'hover:shadow-md cursor-pointer hover:border-emerald-200' : 'opacity-80'}`}>
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-xl ${SUBJECT_COLORS[hw.subject] || 'bg-gray-100 text-gray-600'}`}>
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{hw.title}</h3>
                  <p className="text-xs text-gray-500">{hw.subject} • التسليم: {hw.dueDate}</p>
                </div>
              </div>
              {hw.status === 'pending' && (
                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Star size={12} className="fill-amber-700" /> {hw.points}
                </span>
              )}
              {hw.status === 'submitted' && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <Clock size={12} /> قيد المراجعة
                </span>
              )}
              {hw.status === 'graded' && (
                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle size={12} /> مصحح
                </span>
              )}
            </div>

            {hw.status === 'graded' && (
              <div className="mt-4 bg-emerald-50 p-4 rounded-xl border border-emerald-100 animate-fade-in-up">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-emerald-800 font-bold">الدرجة: {hw.score}/100</span>
                  <span className="flex text-amber-500"><Star size={16} className="fill-amber-500" /> +{hw.points}</span>
                </div>
                <p className="text-sm text-emerald-700 bg-white p-3 rounded-lg border border-emerald-100">"{hw.comment}"</p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderScheduleTab = () => {
    const jsDay = new Date().getDay(); // 0=Sunday... 4=Thursday
    const activeDayIndex = (jsDay >= 0 && jsDay <= 4) ? jsDay : 0;
    const dayPeriods = DEFAULT_SCHEDULE.filter((p) => p.dayOfWeek === activeDayIndex);

    return (
      <div className="bg-white rounded-3xl shadow-sm p-6 relative overflow-hidden border border-slate-200 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-black text-slate-900 text-sm">جدول الحصص المعتمد — فصل د. إسماعيل عيسى</h3>
            <p className="text-[11px] font-bold text-slate-500 mt-0.5">مدرج حسب الخطة الدراسية المعتمدة</p>
          </div>
          <span className="text-xs font-black text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
            يوم {DAY_NAMES[activeDayIndex]}
          </span>
        </div>

        <div className="space-y-2.5">
          {dayPeriods.map((item) => (
            <div key={`${item.dayOfWeek}-${item.periodNumber}`} className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 flex items-center justify-between transition">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center font-black text-xs shadow-xs">
                  {item.periodNumber}
                </div>
                <div>
                  <h4 className="font-black text-xs text-slate-900">{item.subjectName}</h4>
                  <p className="text-[10px] font-bold text-slate-500">الحصة {item.periodNumber}</p>
                </div>
              </div>
              <div className="text-left">
                <span className="text-[11px] font-mono font-black text-slate-700">{item.startTime} - {item.endTime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMeetingsTab = () => (
    <div className="space-y-4">
      {meetings.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-sm space-y-3">
          <div className="w-16 h-16 bg-blue-50 border border-blue-200 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl">
            🎥
          </div>
          <h3 className="text-lg font-black text-slate-900">لا توجد حصص مباشرة الآن</h3>
          <p className="text-xs font-bold text-slate-500 max-w-sm mx-auto leading-relaxed">
            ستظهر روابط البث والاجتماعات التفاعلية المباشرة هنا فور بدئها من المعلم.
          </p>
        </div>
      ) : (
        meetings.map((meet) => (
          <div key={meet.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                <Video size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-sm">{meet.title}</h3>
                <p className="text-xs text-gray-500">{meet.date} • {meet.time}</p>
              </div>
            </div>
            <a href={meet.link} target="_blank" rel="noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition flex items-center gap-1 shadow-md shadow-blue-500/20">
              <Play size={14} /> دخول البث
            </a>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-28 text-slate-900" dir="rtl">
      {renderNavbar()}

      <div className="max-w-2xl mx-auto px-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center font-bold text-sm">
            {error}
          </div>
        ) : (
          <>
            {activeTab === 'home' && renderHomeTab()}
            {activeTab === 'homework' && renderHomeworkTab()}
            {activeTab === 'schedule' && renderScheduleTab()}
            {activeTab === 'meetings' && renderMeetingsTab()}
          </>
        )}
      </div>

      {/* Prominent Floating Bottom Navigation Bar matching school-parent */}
      <div className="fixed bottom-3 left-3 right-3 max-w-2xl mx-auto z-40 bg-white/95 backdrop-blur-xl border-2 border-emerald-500/30 shadow-2xl rounded-3xl p-1.5 ring-4 ring-emerald-500/10">
        <div className="grid grid-cols-4 gap-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-2xl transition-all duration-200 cursor-pointer ${
                  active
                    ? 'bg-gradient-to-br from-emerald-600 to-teal-600 text-white font-black shadow-lg shadow-emerald-600/30 scale-105'
                    : 'text-slate-600 hover:text-slate-900 font-bold hover:bg-slate-100/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-white stroke-[2.5]' : 'text-slate-600'}`} />
                <span className="text-[10px] leading-none">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Homework Submission Modal */}
      {selectedHw && (
        <HomeworkModal
          hw={selectedHw}
          onClose={() => setSelectedHw(null)}
          onSubmitSuccess={() => {
            setSelectedHw(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}

function HomeworkModal({ hw, onClose, onSubmitSuccess }: { hw: any; onClose: () => void; onSubmitSuccess: () => void }) {
  const [subTab, setSubTab] = useState<'text' | 'image' | 'audio'>('text');
  const [answer, setAnswer] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setAnswer(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAnswer(reader.result as string);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert('يرجى السماح بالوصول إلى الميكروفون');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
  };

  const handleSubmit = async () => {
    if (!answer) return;
    setIsSubmitting(true);
    try {
      await fetch(`${API}/school/homework/${hw.id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: subTab,
          content: answer,
        }),
      });
      onSubmitSuccess();
    } catch (err) {
      alert('حدث خطأ أثناء إرسال الواجب');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center bg-black/60 backdrop-blur-sm sm:p-4" dir="rtl">
      <div className="bg-white w-full sm:max-w-md sm:mx-auto rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 text-sm pr-2">{hw.title}</h3>
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-red-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          <button onClick={() => setSubTab('text')} className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs font-bold border-b-2 transition-colors ${subTab === 'text' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
            <FileText size={16} /> نص
          </button>
          <button onClick={() => setSubTab('image')} className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs font-bold border-b-2 transition-colors ${subTab === 'image' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
            <Camera size={16} /> صورة
          </button>
          <button onClick={() => setSubTab('audio')} className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs font-bold border-b-2 transition-colors ${subTab === 'audio' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
            <Mic size={16} /> صوت
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {subTab === 'text' && (
            <textarea
              className="w-full h-40 p-3 bg-gray-50 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:border-emerald-500 text-xs font-bold text-gray-700"
              placeholder="اكتب إجابتك هنا يا بطل..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          )}

          {subTab === 'image' && (
            <div className="h-40 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gray-50 relative overflow-hidden group hover:bg-gray-100 transition-colors">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={() => { setImagePreview(null); setAnswer(''); }} className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur text-red-500 rounded-xl">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <label className="flex flex-col items-center gap-2 cursor-pointer p-4">
                  <Upload className="text-gray-400" size={28} />
                  <span className="text-xs font-bold text-gray-500">اختر صورة أو التقط من الكاميرا</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>
          )}

          {subTab === 'audio' && (
            <div className="h-40 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gray-50 gap-3">
              {!audioURL ? (
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${isRecording ? 'bg-red-500 animate-pulse scale-110' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                >
                  {isRecording ? <Square size={20} /> : <Mic size={24} />}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <audio src={audioURL} controls className="h-10" />
                  <button onClick={() => { setAudioURL(null); setAnswer(''); }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                    <X size={18} />
                  </button>
                </div>
              )}
              {isRecording && <span className="text-red-500 text-xs font-bold animate-pulse">جاري تسجيل صوتك...</span>}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white">
          <button
            onClick={handleSubmit}
            disabled={!answer || isSubmitting}
            className={`w-full py-3.5 rounded-2xl text-white font-bold text-xs flex justify-center items-center gap-2 shadow-lg transition-all ${!answer || isSubmitting ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-emerald-500 hover:bg-emerald-600 hover:shadow-emerald-500/30'}`}
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (
              <>
                <Send size={16} />
                تسليم الواجب للمعلم
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
