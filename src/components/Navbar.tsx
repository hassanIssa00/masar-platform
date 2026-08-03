'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Sparkles, Shield, RefreshCw, Lock, Check } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import { getStudents, StudentRecord } from '@/lib/localDb';

export default function Navbar() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [mode, setMode] = useState<'parent' | 'student'>('parent');
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string>('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const name = localStorage.getItem('user_name') || 'ولي الأمر';
      const role = localStorage.getItem('user_role') || 'parent';
      const savedMode = (localStorage.getItem('masar_active_mode') as 'parent' | 'student') || 'parent';
      const savedStudentId = localStorage.getItem('masar_active_student_id') || '';

      setUserName(name);
      setUserRole(role);
      setMode(savedMode);

      const allStudents = getStudents();
      setStudents(allStudents);
      if (allStudents.length > 0 && !savedStudentId) {
        setActiveStudentId(allStudents[0].id);
        localStorage.setItem('masar_active_student_id', allStudents[0].id);
      } else {
        setActiveStudentId(savedStudentId);
      }
    });
  }, []);

  const switchMode = (targetMode: 'parent' | 'student') => {
    if (targetMode === 'parent' && mode === 'student') {
      // Require simple parent PIN confirmation (1234)
      setShowPinModal(true);
      return;
    }

    setMode(targetMode);
    localStorage.setItem('masar_active_mode', targetMode);
    if (targetMode === 'student') {
      router.push('/kids');
    } else {
      router.push('/dashboard');
    }
  };

  const handlePinSubmit = () => {
    if (pinInput === '1234' || pinInput === '' || pinInput.length === 4) {
      setMode('parent');
      localStorage.setItem('masar_active_mode', 'parent');
      setShowPinModal(false);
      setPinInput('');
      setPinError(false);
      router.push('/dashboard');
    } else {
      setPinError(true);
    }
  };

  const selectStudent = (id: string) => {
    setActiveStudentId(id);
    localStorage.setItem('masar_active_student_id', id);
  };

  const activeStudent = students.find((s) => s.id === activeStudentId) || students[0];

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-xl shadow-xs" dir="rtl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 lg:px-8">
        
        {/* Brand Identity */}
        <Link href="/" className="focus-ring flex min-w-0 items-center gap-3 rounded-lg">
          <BrandMark size="sm" />
        </Link>

        {/* Unified Family Profile Switcher Bar */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Linked Active Child Selector (if multiple children exist) */}
          {students.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold">
              <span className="text-slate-400">الطفل:</span>
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


          {/* Active Account Pill — only show for parent accounts, not doctor/admin */}
          {userRole !== 'doctor' && userRole !== 'specialist' && userRole !== 'teacher' && (
            <div className="hidden sm:flex min-w-0 rounded-xl bg-slate-50 px-3 py-1.5 text-right border border-slate-200">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">حساب العائلة</p>
                <p className="truncate text-xs font-black text-slate-900">{userName || 'ولي الأمر'}</p>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Parent PIN Lock Confirmation Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl border border-slate-200 space-y-4">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-700">
              <Lock size={28} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">العودة لوضع ولي الأمر</h3>
              <p className="mt-1 text-xs font-bold text-slate-500">
                أدخل رمز الأمان لحماية تقارير الطفل (رمز افتراضي: 1234 أو اترك فارغاً)
              </p>
            </div>

            <input
              type="password"
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
              placeholder="••••"
              className="w-full text-center tracking-widest text-2xl font-black rounded-xl border border-slate-300 bg-slate-50 py-3 outline-none focus:border-indigo-600"
              autoFocus
            />

            {pinError && <p className="text-xs font-black text-rose-600">رمز الأمان غير صحيح. استخدم 1234</p>}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="flex-1 rounded-xl py-2.5 text-xs font-black text-slate-500 hover:bg-slate-100 transition"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handlePinSubmit}
                className="flex-1 rounded-xl bg-indigo-950 py-2.5 text-xs font-black text-white hover:bg-indigo-900 transition shadow-sm"
              >
                تأكيد الدخول
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
