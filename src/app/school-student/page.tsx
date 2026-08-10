'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  Send,
  Loader2,
  X,
  Play,
  Square,
  Upload,
  LogOut
} from 'lucide-react';
import { DAY_NAMES, SUBJECT_COLORS } from '@/data/ikhlasSchedule';
import { clearSession, getSession, getStudents } from '@/lib/localDb';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const BRANCH = 'IKHLAS_JEDDAH';

export default function StudentDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'homework' | 'schedule' | 'meetings'>('homework');
  const [homeworks, setHomeworks] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Student Data from session
  const [studentName, setStudentName] = useState('طالب');
  const [studentStars] = useState(0);
  const [studentStreak] = useState(0);

  const [selectedHw, setSelectedHw] = useState<any | null>(null);

  useEffect(() => {
    // Auth guard
    const session = getSession();
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
    // Set student name from session or from linked student record
    const students = getStudents();
    const linked = students.find((s) =>
      s.parentPhone === session.email || s.fullName === session.name
    );
    setStudentName(linked?.fullName || session.name || 'طالب');
    fetchData();
  }, [router]);


  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // In a real app, these endpoints would exist. We'll mock the response if it fails.
      let hwData = [];
      let meetData = [];
      try {
        const hwRes = await fetch(`${API}/school/homework?branch=${BRANCH}`, { headers });
        if (hwRes.ok) hwData = await hwRes.json();
      } catch (e) {
        hwData = [
          { id: '1', title: 'حل تمارين الرياضيات صفحة 45', subject: 'رياضيات', dueDate: '2026-08-07', status: 'pending', points: 20 },
          { id: '2', title: 'قراءة سورة الملك', subject: 'قرآن', dueDate: '2026-08-06', status: 'submitted', points: 15 },
          { id: '3', title: 'تعبير عن فضل الوالدين', subject: 'لغتي', dueDate: '2026-08-05', status: 'graded', points: 30, score: 95, comment: 'ممتاز جداً يا بطل!' }
        ];
      }

      try {
        const meetRes = await fetch(`${API}/school/meetings?branch=${BRANCH}`, { headers });
        if (meetRes.ok) meetData = await meetRes.json();
      } catch (e) {
        meetData = [
          { id: 'm1', title: 'حصة لغتي المباشرة', time: '10:00 AM', roomCode: 'room123' },
          { id: 'm2', title: 'مراجعة رياضيات', time: '12:30 PM', roomCode: 'room456' }
        ];
      }

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

  const renderHeader = () => (
    <div className="bg-gradient-to-r from-emerald-500 to-teal-400 p-6 rounded-b-3xl text-white shadow-lg mb-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white text-emerald-600 flex items-center justify-center text-2xl font-bold shadow-md">
            {studentName.split(' ').map((n: string) => n[0]).join('')}
          </div>
          <div>
            <h1 className="text-2xl font-bold">مرحباً، {studentName} 👋</h1>
            <p className="text-emerald-50 text-sm opacity-90">{new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
          <LogOut size={20} />
        </button>
      </div>

      <div className="flex gap-4">
        <div className="bg-white/20 rounded-2xl p-4 flex-1 flex items-center gap-3 backdrop-blur-sm">
          <div className="bg-amber-400 p-2 rounded-full shadow-inner">
            <Star className="text-white fill-white" size={24} />
          </div>
          <div>
            <p className="text-xs text-emerald-50">نجومك</p>
            <p className="font-bold text-xl">{studentStars}</p>
          </div>
        </div>
        <div className="bg-white/20 rounded-2xl p-4 flex-1 flex items-center gap-3 backdrop-blur-sm">
          <div className="bg-orange-500 p-2 rounded-full shadow-inner">
            <Flame className="text-white fill-white" size={24} />
          </div>
          <div>
            <p className="text-xs text-emerald-50">حماسك</p>
            <p className="font-bold text-xl">{studentStreak} أيام</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabs = () => (
    <div className="flex bg-white rounded-2xl p-1 shadow-sm mb-6 max-w-md mx-auto">
      <button
        onClick={() => setActiveTab('schedule')}
        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'schedule' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        الجدول
      </button>
      <button
        onClick={() => setActiveTab('homework')}
        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'homework' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        الواجبات
      </button>
      <button
        onClick={() => setActiveTab('meetings')}
        className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'meetings' ? 'bg-emerald-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
      >
        الحصص
      </button>
    </div>
  );

  const renderHomeworkTab = () => (
    <div className="space-y-4">
      {homeworks.map(hw => (
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
      ))}
    </div>
  );

  const renderScheduleTab = () => {
    const mockSchedule = [
      { id: 1, period: 'الحصة الأولى', time: '07:30 - 08:15', subject: 'قرآن', active: false },
      { id: 2, period: 'الحصة الثانية', time: '08:15 - 09:00', subject: 'لغتي', active: true },
      { id: 3, period: 'الحصة الثالثة', time: '09:00 - 09:45', subject: 'رياضيات', active: false },
      { id: 4, period: 'فسحة', time: '09:45 - 10:15', subject: 'راحة', active: false },
    ];

    return (
      <div className="bg-white rounded-2xl shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 right-8 bottom-0 w-0.5 bg-gray-100"></div>
        <div className="space-y-6">
          {mockSchedule.map((item, idx) => (
            <div key={item.id} className="relative flex items-center gap-6 z-10">
              <div className={`w-4 h-4 rounded-full border-4 border-white shadow-sm ${item.active ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`}></div>
              <div className={`flex-1 p-4 rounded-xl transition-all ${item.active ? 'bg-emerald-50 border border-emerald-100 shadow-sm' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-xs font-bold ${item.active ? 'text-emerald-600' : 'text-gray-400'}`}>{item.period}</span>
                  <span className="text-xs text-gray-500">{item.time}</span>
                </div>
                <h4 className={`font-bold ${item.active ? 'text-emerald-900' : 'text-gray-700'}`}>{item.subject}</h4>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMeetingsTab = () => (
    <div className="space-y-4">
      {meetings.map(meet => (
        <div key={meet.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
              <Video size={24} />
            </div>
            <div>
              <h4 className="font-bold text-gray-800">{meet.title}</h4>
              <p className="text-sm text-gray-500 flex items-center gap-1"><Clock size={14} /> {meet.time}</p>
            </div>
          </div>
          <button onClick={() => router.push(`/meetings?room=${meet.roomCode}`)} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 transition-all">
            دخول
          </button>
        </div>
      ))}
      {meetings.length === 0 && (
        <div className="text-center text-gray-500 py-10 bg-white rounded-2xl shadow-sm">
          لا توجد حصص مباشرة اليوم.
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">
      <div className="max-w-2xl mx-auto pb-20">
        {renderHeader()}
        
        <div className="px-4">
          {renderTabs()}
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="animate-spin text-emerald-500" size={32} />
            </div>
          ) : (
            <div className="animate-fade-in">
              {activeTab === 'homework' && renderHomeworkTab()}
              {activeTab === 'schedule' && renderScheduleTab()}
              {activeTab === 'meetings' && renderMeetingsTab()}
            </div>
          )}
        </div>
      </div>

      {selectedHw && (
        <SubmissionModal 
          hw={selectedHw} 
          onClose={() => setSelectedHw(null)} 
          onSubmit={() => {
            fetchData();
            setSelectedHw(null);
          }}
        />
      )}

      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease-out forwards;
        }
        .animate-fade-in {
          animation: fadeInUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Sub-component for Modal
function SubmissionModal({ hw, onClose, onSubmit }: { hw: any, onClose: () => void, onSubmit: () => void }) {
  const [subTab, setSubTab] = useState<'text'|'image'|'audio'>('text');
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  
  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [audioURL, setAudioURL] = useState<string|null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Image state
  const [imagePreview, setImagePreview] = useState<string|null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      // Mock submit
      // await fetch(`${API}/school/homework/${hw.id}/submit`, { ... })
      await new Promise(r => setTimeout(r, 1000));
      
      setShowCelebration(true);
      setTimeout(() => {
        onSubmit();
      }, 2500);
    } catch (e) {
      alert('حدث خطأ أثناء التسليم');
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setAnswer('IMAGE_UPLOADED');
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        setAnswer('AUDIO_RECORDED');
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Please allow microphone access');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  if (showCelebration) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center animate-fade-in-up">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">أحسنت يا بطل!</h2>
          <p className="text-gray-600 mb-6">تم تسليم الواجب بنجاح</p>
          <div className="flex justify-center items-center gap-2 text-amber-500 text-xl font-bold mb-6">
            <Star className="fill-amber-500" size={28} /> +{hw.points} نجمة
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center bg-black/60 backdrop-blur-sm sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:mx-auto rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90vh] shadow-2xl animate-fade-in-up overflow-hidden">
        
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800 text-lg pr-2">{hw.title}</h3>
          <button onClick={onClose} className="p-2 bg-white rounded-full shadow-sm text-gray-500 hover:text-red-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          <button onClick={() => setSubTab('text')} className={`flex-1 py-4 flex flex-col items-center gap-1 text-sm font-medium border-b-2 transition-colors ${subTab === 'text' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
            <FileText size={18} /> نص
          </button>
          <button onClick={() => setSubTab('image')} className={`flex-1 py-4 flex flex-col items-center gap-1 text-sm font-medium border-b-2 transition-colors ${subTab === 'image' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
            <Camera size={18} /> صورة
          </button>
          <button onClick={() => setSubTab('audio')} className={`flex-1 py-4 flex flex-col items-center gap-1 text-sm font-medium border-b-2 transition-colors ${subTab === 'audio' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>
            <Mic size={18} /> صوت
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {subTab === 'text' && (
            <textarea
              className="w-full h-48 p-4 bg-gray-50 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-gray-700"
              placeholder="اكتب إجابتك هنا..."
              value={answer}
              onChange={e => setAnswer(e.target.value)}
            />
          )}

          {subTab === 'image' && (
            <div className="h-48 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center bg-gray-50 relative overflow-hidden group hover:bg-gray-100 transition-colors">
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={() => { setImagePreview(null); setAnswer(''); }} className="absolute top-2 right-2 p-2 bg-white/80 backdrop-blur text-red-500 rounded-xl">
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-gray-400 mb-2 group-hover:text-emerald-500 transition-colors" />
                  <span className="text-gray-500 text-sm font-medium">اضغط أو اسحب الصورة هنا</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </>
              )}
            </div>
          )}

          {subTab === 'audio' && (
            <div className="h-48 flex flex-col items-center justify-center gap-6">
              {!audioURL ? (
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-24 h-24 rounded-full flex items-center justify-center text-white shadow-xl transition-all ${isRecording ? 'bg-red-500 animate-pulse scale-110' : 'bg-emerald-500 hover:bg-emerald-600 hover:scale-105'}`}
                >
                  {isRecording ? <Square size={32} fill="currentColor" /> : <Mic size={40} />}
                </button>
              ) : (
                <div className="w-full bg-gray-50 p-4 rounded-2xl flex items-center justify-between border border-gray-200">
                  <audio src={audioURL} controls className="h-10" />
                  <button onClick={() => { setAudioURL(null); setAnswer(''); }} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                    <X size={20} />
                  </button>
                </div>
              )}
              {isRecording && <span className="text-red-500 font-bold animate-pulse">جاري التسجيل...</span>}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-white">
          <button
            onClick={handleSubmit}
            disabled={!answer || isSubmitting}
            className={`w-full py-4 rounded-2xl text-white font-bold flex justify-center items-center gap-2 shadow-lg transition-all ${!answer || isSubmitting ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-emerald-500 hover:bg-emerald-600 hover:shadow-emerald-500/30'}`}
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={24} /> : (
              <>
                <Send size={20} />
                تسليم الواجب
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
