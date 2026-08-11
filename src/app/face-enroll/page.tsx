'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ScanFace, ShieldCheck, CheckCircle2, AlertTriangle, Camera,
  Trash2, RefreshCw, ArrowLeft, Loader2, User, Eye, EyeOff, ZapIcon
} from 'lucide-react';
import Link from 'next/link';
import { getSession } from '@/lib/localDb';
import { enrollFace, isFaceEnrolled, removeFaceEnrollment, initFaceAuth, detectFace, checkBlink } from '@/lib/faceAuth';

type Phase = 'idle' | 'loading' | 'camera' | 'challenge' | 'capturing' | 'success' | 'error' | 'already_enrolled';

export default function FaceEnrollPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);

  const [phase, setPhase] = useState<Phase>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [blinkDone, setBlinkDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const wasBlinkingRef = useRef(false);
  const blinkCountRef = useRef(0);

  // Check session on mount
  useEffect(() => {
    const session = getSession();
    if (!session) { router.replace('/login'); return; }
    setUserId(session.id);
    setUserName(session.name);
    setUserRole(session.role);

    if (isFaceEnrolled(session.id)) {
      setPhase('already_enrolled');
    }
  }, [router]);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  async function startCamera() {
    setPhase('loading');
    setErrorMsg('');
    setFaceDetected(false);
    setBlinkDone(false);
    setProgress(0);
    blinkCountRef.current = 0;
    wasBlinkingRef.current = false;

    try {
      await initFaceAuth();
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setPhase('camera');
        animRef.current = requestAnimationFrame(runDetectionLoop);
      }
    } catch (e: any) {
      setErrorMsg(e.name === 'NotAllowedError'
        ? 'لم يتم السماح بالكاميرا. اسمح من إعدادات المتصفح.'
        : 'تعذر تشغيل الكاميرا. حاول مرة أخرى.');
      setPhase('error');
    }
  }

  async function runDetectionLoop() {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      animRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    const result = await detectFace(videoRef.current);

    if (!result) {
      setFaceDetected(false);
      animRef.current = requestAnimationFrame(runDetectionLoop);
      return;
    }

    setFaceDetected(true);

    // Switch to challenge phase
    setPhase(prev => {
      if (prev === 'camera') return 'challenge';
      return prev;
    });

    // Check blink liveness
    const { isBlinking } = checkBlink(result.landmarks);

    if (isBlinking && !wasBlinkingRef.current) {
      blinkCountRef.current += 1;
      wasBlinkingRef.current = true;
      setBlinkDone(true);

      if (blinkCountRef.current >= 1) {
        // Start capturing enrollment embedding
        setPhase('capturing');
        let p = 0;
        const interval = setInterval(() => {
          p += 12;
          setProgress(p);
          if (p >= 100) {
            clearInterval(interval);
            // Enroll with the descriptor
            enrollFace(userId, result.descriptor);
            stopCamera();
            setPhase('success');
          }
        }, 100);
        return;
      }
    } else if (!isBlinking) {
      wasBlinkingRef.current = false;
    }

    animRef.current = requestAnimationFrame(runDetectionLoop);
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    cancelAnimationFrame(animRef.current);
  }

  function handleRemoveFace() {
    removeFaceEnrollment(userId);
    setPhase('idle');
  }

  const roleLabel = userRole === 'parent' ? 'ولي الأمر' : userRole === 'student' ? 'الطالب' : 'المستخدم';
  const dashboardHref = userRole === 'parent' ? '/parent' : userRole === 'student' ? '/kids' : '/dashboard';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href={dashboardHref} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition font-bold text-sm">
            <ArrowLeft size={18} />
            <span>العودة للوحة التحكم</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center">
              <ScanFace size={16} className="text-emerald-700" />
            </div>
            <span className="font-black text-slate-900 text-sm">تسجيل الوجه البيومتري</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* User identity card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center shadow-inner">
            <User size={26} className="text-emerald-700" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 mb-0.5">{roleLabel}</p>
            <h2 className="text-lg font-black text-slate-900">{userName}</h2>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
              {isFaceEnrolled(userId) ? '✅ الوجه مسجل' : '⚠️ لم يُسجَّل الوجه بعد'}
            </span>
          </div>
        </div>

        {/* Security notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
          <ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-blue-900 mb-1">أمان تام — لا نخزن صورتك أبداً</p>
            <p className="text-xs font-medium text-blue-700 leading-relaxed">
              النظام يحفظ فقط بيانات رياضية مشفرة (128 رقم) تمثل ملامح وجهك.
              لا يمكن إعادة بناء الصورة منها. البيانات مخزنة على السحابة بتشفير مزدوج.
            </p>
          </div>
        </div>

        {/* Main enrollment card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Already enrolled state */}
          {phase === 'already_enrolled' && (
            <div className="p-8 flex flex-col items-center text-center gap-5">
              <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-400 flex items-center justify-center shadow-md">
                <CheckCircle2 size={40} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2">وجهك مسجل بنجاح ✅</h3>
                <p className="text-sm font-bold text-slate-500">يمكنك الآن الدخول للمنصة بمجرد النظر للكاميرا بدون كلمة مرور</p>
              </div>
              <div className="flex gap-3 w-full">
                <Link href={dashboardHref}
                  className="flex-1 py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-sm text-center hover:bg-emerald-700 transition shadow-sm"
                >
                  الذهاب للوحة التحكم
                </Link>
                <button
                  onClick={handleRemoveFace}
                  className="flex items-center gap-2 px-4 py-3.5 rounded-2xl bg-red-50 text-red-700 font-bold text-sm border border-red-200 hover:bg-red-100 transition"
                >
                  <Trash2 size={16} />
                  حذف التسجيل
                </button>
              </div>
            </div>
          )}

          {/* Idle — ready to start */}
          {phase === 'idle' && (
            <div className="p-8 flex flex-col items-center text-center gap-5">
              <div className="w-20 h-20 rounded-full bg-slate-100 border-4 border-slate-300 flex items-center justify-center shadow-inner">
                <Camera size={36} className="text-slate-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2">سجّل وجهك الآن</h3>
                <p className="text-sm font-bold text-slate-500 leading-relaxed">
                  بعد التسجيل ستتمكن من الدخول فوراً عند النظر للكاميرا.<br/>
                  العملية تستغرق أقل من 10 ثوانٍ.
                </p>
              </div>
              <div className="w-full bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-2 text-right">
                <p className="text-xs font-black text-slate-700">كيف يعمل النظام؟</p>
                {['تفتح الكاميرا تلقائياً', 'ضع وجهك في منتصف الإطار', 'أطرف عينيك مرة واحدة للتحقق', 'يتم حفظ بياناتك مشفرة على السحابة فوراً'].map((step, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center shrink-0">{i+1}</span>
                    <span className="text-xs font-bold text-slate-600">{step}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={startCamera}
                className="w-full py-4 rounded-2xl bg-gradient-to-l from-emerald-600 to-teal-600 text-white font-black text-base shadow-lg hover:from-emerald-700 hover:to-teal-700 transition flex items-center justify-center gap-2"
              >
                <ZapIcon size={20} />
                ابدأ تسجيل وجهك الآن
              </button>
            </div>
          )}

          {/* Loading */}
          {phase === 'loading' && (
            <div className="p-10 flex flex-col items-center gap-4">
              <Loader2 size={40} className="text-emerald-600 animate-spin" />
              <p className="font-black text-slate-700">جاري تحميل نماذج الذكاء الاصطناعي...</p>
            </div>
          )}

          {/* Camera active */}
          {(phase === 'camera' || phase === 'challenge' || phase === 'capturing') && (
            <div className="p-4 space-y-4">
              {/* Video viewport */}
              <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-300 shadow-inner">
                <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" muted playsInline />

                {/* Face detection badge */}
                <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black transition ${faceDetected ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                  {faceDetected ? <Eye size={12} /> : <EyeOff size={12} />}
                  {faceDetected ? 'وجه مكتشف ✓' : 'لا يوجد وجه'}
                </div>

                {/* Progress bar for capturing */}
                {phase === 'capturing' && (
                  <div className="absolute bottom-0 left-0 right-0 h-2 bg-white/30">
                    <div className="h-full bg-emerald-400 transition-all duration-100" style={{ width: `${progress}%` }} />
                  </div>
                )}

                {/* Capturing overlay */}
                {phase === 'capturing' && (
                  <div className="absolute inset-0 bg-emerald-900/40 flex items-center justify-center">
                    <div className="bg-white/90 rounded-2xl px-6 py-4 text-center shadow-xl">
                      <Loader2 size={24} className="text-emerald-600 animate-spin mx-auto mb-2" />
                      <p className="font-black text-slate-900 text-sm">جاري التسجيل البيومتري...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              {phase === 'camera' && !faceDetected && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <Camera size={20} className="text-amber-600 shrink-0" />
                  <p className="text-sm font-bold text-amber-800">ضع وجهك في وسط الكاميرا بوضوح</p>
                </div>
              )}
              {phase === 'challenge' && !blinkDone && (
                <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4 animate-pulse">
                  <span className="text-2xl">😉</span>
                  <div>
                    <p className="text-sm font-black text-blue-900">أطرف عينيك مرة واحدة</p>
                    <p className="text-xs font-bold text-blue-600">للتحقق من أنك حقيقي وليس صورة</p>
                  </div>
                </div>
              )}
              {blinkDone && phase === 'challenge' && (
                <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                  <p className="text-sm font-black text-emerald-800">✓ رمشة مكتشفة! جاري التسجيل...</p>
                </div>
              )}

              <button onClick={() => { stopCamera(); setPhase('idle'); }}
                className="w-full py-3 rounded-2xl bg-slate-100 text-slate-700 font-bold text-sm border border-slate-200 hover:bg-slate-200 transition"
              >
                إلغاء
              </button>
            </div>
          )}

          {/* Success */}
          {phase === 'success' && (
            <div className="p-8 flex flex-col items-center text-center gap-5">
              <div className="w-20 h-20 rounded-full bg-emerald-100 border-4 border-emerald-500 flex items-center justify-center shadow-md animate-bounce">
                <ShieldCheck size={40} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 mb-2">تم تسجيل وجهك بنجاح! 🎉</h3>
                <p className="text-sm font-bold text-slate-500">
                  الآن يمكنك الدخول للمنصة بمجرد النظر للكاميرا<br/>
                  البيانات محفوظة بأمان على السحابة
                </p>
              </div>
              <Link href={dashboardHref}
                className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-black text-base text-center hover:bg-emerald-700 transition shadow-sm"
              >
                انتقل للوحة التحكم
              </Link>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="p-8 flex flex-col items-center text-center gap-5">
              <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-400 flex items-center justify-center">
                <AlertTriangle size={30} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 mb-2">حدث خطأ في الكاميرا</h3>
                <p className="text-sm font-bold text-slate-500">{errorMsg}</p>
              </div>
              <button onClick={startCamera}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-black text-sm hover:bg-emerald-700 transition shadow-sm"
              >
                <RefreshCw size={16} /> إعادة المحاولة
              </button>
            </div>
          )}
        </div>

        {/* Already enrolled quick re-enroll */}
        {(phase === 'already_enrolled' || phase === 'success') && (
          <button onClick={() => { setPhase('idle'); }}
            className="w-full py-3 text-center text-sm font-bold text-slate-500 hover:text-slate-800 transition"
          >
            🔄 إعادة تسجيل الوجه من جديد
          </button>
        )}
      </main>
    </div>
  );
}
