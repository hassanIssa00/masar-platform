'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, ScanFace, Loader2, Sparkles, ShieldCheck, Clock, BookOpen } from 'lucide-react';
import FaceCamera from './FaceCamera';
import { verifyFace, findBestMatch } from '@/lib/faceAuth';
import { markStudentAttendanceViaFace, AttendanceRecord, resolveActivePeriod, PERIOD_NAMES } from '@/lib/attendance';

interface Props {
  studentId: string;
  studentName: string;
  branch?: 'MASAR' | 'IKHLAS_JEDDAH';
  targetPeriodNumber?: number;
  targetSubjectName?: string;
  onClose: () => void;
  onSuccess: (record: AttendanceRecord) => void;
}

export default function StudentFaceAttendanceModal({
  studentId,
  studentName,
  branch = 'MASAR',
  targetPeriodNumber,
  targetSubjectName,
  onClose,
  onSuccess,
}: Props) {
  const defaultPeriod = resolveActivePeriod(targetPeriodNumber);
  const [selectedPeriodNumber, setSelectedPeriodNumber] = useState<number>(targetPeriodNumber || defaultPeriod.periodNumber);
  const [status, setStatus] = useState<'scan' | 'verifying' | 'success' | 'error'>('scan');
  const [errorMsg, setErrorMsg] = useState('');
  const [verifiedTime, setVerifiedTime] = useState('');
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);
  const [recordedRecord, setRecordedRecord] = useState<AttendanceRecord | null>(null);

  const currentPeriodName = PERIOD_NAMES[selectedPeriodNumber] || `الحصة ${selectedPeriodNumber}`;
  const currentSubjectName = targetSubjectName || defaultPeriod.subjectName;

  const speakCelebration = (name: string, pName: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(`أهلاً بك يا ${name}! تم تسجيل حضورك في ${pName} بنجاح.`);
        utterance.lang = 'ar-SA';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch {}
    }
  };

  const handleFaceSuccess = async (embedding: number[], snapshot?: string) => {
    setStatus('verifying');
    setErrorMsg('');
    if (snapshot) setCapturedSnapshot(snapshot);

    try {
      // 1. Check local verification first
      let matchRes = verifyFace(studentId, embedding);
      let sim = matchRes.similarity;

      // 2. If no local match, check if best match points to this student
      if (!matchRes.match) {
        const best = findBestMatch(embedding);
        if (best.userId === studentId && best.similarity >= 0.80) {
          matchRes = { match: true, similarity: best.similarity };
          sim = best.similarity;
        }
      }

      // 3. If still no local match, query server /api/auth/face
      if (!matchRes.match) {
        try {
          const res = await fetch('/api/auth/face', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embedding }),
          });
          const data = await res.json();
          if (data.ok && (data.account?.id === studentId || data.account?.linkedStudentId === studentId)) {
            matchRes = { match: true, similarity: data.similarity || 0.95 };
            sim = data.similarity || 0.95;
          }
        } catch {}
      }

      // If matched
      if (matchRes.match || sim >= 0.80) {
        const { record } = await markStudentAttendanceViaFace(studentId, studentName, {
          branch,
          confidence: sim,
          isClassroom: branch === 'IKHLAS_JEDDAH',
          capturedPhotoUrl: snapshot,
          periodNumber: selectedPeriodNumber,
          periodName: currentPeriodName,
          subjectName: currentSubjectName,
        });

        const timeStr = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        setVerifiedTime(timeStr);
        setRecordedRecord(record);
        setStatus('success');
        speakCelebration(studentName, currentPeriodName);

        setTimeout(() => {
          onSuccess(record);
          onClose();
        }, 2200);
      } else {
        setStatus('error');
        setErrorMsg('لم يتم التعرف على ملامح وجهك بدقة كافية. يرجى النظر مباشرة إلى الكاميرا في إضاءة جيدة.');
      }
    } catch (e: any) {
      console.error('Face attendance verification error:', e);
      setStatus('error');
      setErrorMsg('حدث خطأ أثناء معالجة بصمة الوجه. يمكنك المحاولة مرة أخرى.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in" dir="rtl">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-l from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <ScanFace size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>تسجيل حضور الحصة بالبصمة</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {currentPeriodName} 📚
                </span>
              </h3>
              <p className="text-xs font-bold text-slate-500">الطالب: {studentName} • المادة: {currentSubjectName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition flex items-center justify-center cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {status === 'scan' && (
            <div className="space-y-4">
              {/* Period Selector Tabs */}
              <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[11px] font-black text-slate-600 flex items-center gap-1">
                    <Clock size={12} className="text-emerald-600" />
                    <span>اختر الحصة المراد تسجيل حضورها:</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    {currentPeriodName}
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                    const isSel = selectedPeriodNumber === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSelectedPeriodNumber(num)}
                        className={`py-1.5 px-1 rounded-xl text-center text-xs font-black transition cursor-pointer ${
                          isSel
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/50'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                        }`}
                      >
                        حـ{num}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-950">
                <FaceCamera
                  mode="verify"
                  userId={studentId}
                  onSuccess={handleFaceSuccess}
                  onCancel={onClose}
                />
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-slate-400">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>التحقق البيومتري المباشر وفق أعلى معايير الخصوصية</span>
              </div>
            </div>
          )}

          {status === 'verifying' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-emerald-500/20 border-t-emerald-600 animate-spin flex items-center justify-center" />
                <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                  <ScanFace size={32} className="animate-pulse" />
                </div>
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">جاري مطابقة بصمة الوجه...</h4>
                <p className="text-xs font-bold text-slate-500 mt-1">يتم التحقق وتوثيق حضور {currentPeriodName}</p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              {capturedSnapshot ? (
                <div className="relative">
                  <img
                    src={capturedSnapshot}
                    alt={studentName}
                    className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500 shadow-xl"
                  />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center border-2 border-white shadow">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-bounce">
                  <CheckCircle2 size={44} />
                </div>
              )}
              <div className="space-y-1">
                <h4 className="text-xl font-black text-emerald-800">أهلاً بك يا {studentName}! 🌟</h4>
                <p className="text-sm font-black text-slate-800">
                  تم تسجيل حضورك بنجاح في <span className="text-emerald-600 underline">{currentPeriodName} ({currentSubjectName})</span>
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mt-2">
                  <Sparkles size={13} />
                  <span>توقيت الحضور: {verifiedTime || 'الآن'}</span>
                </div>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertCircle size={36} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">تعذر التحقق من الوجه</h4>
                <p className="text-xs font-bold text-slate-500 mt-1 max-w-xs mx-auto">{errorMsg}</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStatus('scan')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow transition cursor-pointer"
                >
                  إعادة المحاولة 🔄
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
