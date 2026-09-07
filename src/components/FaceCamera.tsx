'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react';
import { initFaceAuth, detectFace, checkBlink } from '@/lib/faceAuth';

export type FaceCameraMode = 'enroll' | 'verify';

interface Props {
  mode: FaceCameraMode;
  userId?: string;
  onSuccess: (embedding: number[]) => void;
  onCancel: () => void;
  challenge?: 'blink' | 'smile';
}

type Phase = 'loading' | 'camera' | 'challenge' | 'capturing' | 'success' | 'error';

export default function FaceCamera({ onSuccess, onCancel }: Props) {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const animRef    = useRef<number>(0);
  const blinkCountRef   = useRef(0);
  const wasBlinkingRef  = useRef(false);
  const successCalledRef = useRef(false);

  const [phase, setPhase]             = useState<Phase>('loading');
  const [faceDetected, setFaceDetected] = useState(false);
  const [challengeDone, setChallengeDone] = useState(false);
  const [errorMsg, setErrorMsg]       = useState('');
  const [progress, setProgress]       = useState(0);

  const startCamera = async () => {
    try {
      setPhase('loading');
      setErrorMsg('');
      successCalledRef.current  = false;
      blinkCountRef.current     = 0;
      wasBlinkingRef.current    = false;
      setChallengeDone(false);
      setProgress(0);

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
      }

      streamRef.current = stream;
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      await initFaceAuth();
      setPhase('camera');
    } catch (e: any) {
      console.error('[FaceCamera] startCamera error:', e);
      const errName = e?.name || '';
      const errText = e?.message || (typeof e === 'object' ? JSON.stringify(e) : String(e));
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setErrorMsg('المتصفح يمنع الكاميرا. اضغط على أيقونة القفل 🔒 بجانب رابط الموقع واختر "السماح بالكاميرا" ثم أعد التحميل.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setErrorMsg('لم يتم العثور على كاميرا متصلة بالجهاز.');
      } else if (errText && !errText.includes('[object Event]') && !errText.includes('{}')) {
        setErrorMsg(`تعذر تشغيل الكاميرا: ${errText}`);
      } else {
        setErrorMsg('تعذر تحميل محرك الذكاء الاصطناعي للوجه. اضغط على "إعادة المحاولة" أدناه.');
      }
      setPhase('error');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(animRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runLoop = useCallback(async () => {
    if (
      !videoRef.current ||
      videoRef.current.readyState < 2 ||
      !videoRef.current.videoWidth ||
      !videoRef.current.videoHeight
    ) {
      animRef.current = requestAnimationFrame(runLoop);
      return;
    }

    const result = await detectFace(videoRef.current);
    const canvas = canvasRef.current;

    if (!result) {
      setFaceDetected(false);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      animRef.current = requestAnimationFrame(runLoop);
      return;
    }

    setFaceDetected(true);
    const { box, blendshapes, embedding } = result;

    // رسم إطار الوجه على canvas
    if (canvas && box && videoRef.current) {
      canvas.width  = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const color = challengeDone ? '#22c55e' : '#facc15';
        ctx.strokeStyle = color;
        ctx.lineWidth   = 3;
        ctx.shadowBlur  = 12;
        ctx.shadowColor = color;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
      }
    }

    // انتقال من camera → challenge
    setPhase(prev => (prev === 'camera' ? 'challenge' : prev));

    // Liveness: كشف الرمشة
    if (phase === 'challenge') {
      const { isBlinking } = checkBlink(blendshapes);
      if (isBlinking && !wasBlinkingRef.current) {
        blinkCountRef.current++;
        wasBlinkingRef.current = true;
        if (blinkCountRef.current >= 1) {
          setChallengeDone(true);
          setPhase('capturing');
        }
      } else if (!isBlinking) {
        wasBlinkingRef.current = false;
      }
    }

    // التقاط البيانات
    if (phase === 'capturing') {
      setProgress(prev => {
        const next = prev + 25;
        if (next >= 100 && !successCalledRef.current) {
          successCalledRef.current = true;
          setTimeout(() => {
            setPhase('success');
            onSuccess(embedding);
          }, 200);
          return 100;
        }
        return next;
      });
    }

    animRef.current = requestAnimationFrame(runLoop);
  }, [phase, challengeDone, onSuccess]);

  useEffect(() => {
    if (phase === 'camera' || phase === 'challenge' || phase === 'capturing') {
      animRef.current = requestAnimationFrame(runLoop);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, runLoop]);

  return (
    <div className="flex flex-col items-center gap-4 w-full" dir="rtl">

      {/* منفذ الكاميرا */}
      <div className="relative w-full max-w-sm aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-2xl">
        <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" muted playsInline />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none" />

        {phase === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 gap-3">
            <Loader2 size={36} className="text-emerald-400 animate-spin" />
            <p className="text-sm font-bold text-white">جاري تحميل نظام التعرف على الوجه...</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 gap-3.5 p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400">
              <Camera size={28} />
            </div>
            <p className="text-xs font-bold text-red-200 max-w-xs leading-relaxed">{errorMsg}</p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <button type="button" onClick={startCamera}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition shadow-lg active:scale-95 cursor-pointer">
                <Camera size={16} /> إعادة المحاولة 🔄
              </button>
              <button type="button" onClick={onCancel}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition">
                إلغاء / الدخول بكلمة المرور
              </button>
            </div>
          </div>
        )}

        {phase === 'success' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/90 gap-3">
            <CheckCircle2 size={48} className="text-emerald-400" />
            <p className="text-base font-black text-white">تم التحقق بنجاح ✅</p>
          </div>
        )}

        {(phase === 'camera' || phase === 'challenge' || phase === 'capturing') && (
          <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black transition ${
            faceDetected
              ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300'
              : 'bg-red-500/20 border border-red-500 text-red-300'
          }`}>
            {faceDetected ? <Eye size={12} /> : <EyeOff size={12} />}
            {faceDetected ? 'وجه مكتشف' : 'لا يوجد وجه'}
          </div>
        )}

        {phase === 'capturing' && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
            <div className="h-full bg-emerald-400 transition-all duration-200" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* تعليمة الرمشة */}
      {phase === 'challenge' && !challengeDone && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-right w-full max-w-sm animate-pulse">
          <span className="text-2xl">👁️</span>
          <div>
            <p className="text-sm font-black text-amber-300">اغمض عينيك ببطء</p>
            <p className="text-xs text-amber-400/70">Slowly blink your eyes</p>
          </div>
        </div>
      )}

      {phase === 'camera' && !faceDetected && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-800/80 border border-slate-700 text-right w-full max-w-sm">
          <Camera size={20} className="text-slate-400" />
          <p className="text-sm font-bold text-slate-300">ضع وجهك أمام الكاميرا بوضوح</p>
        </div>
      )}

      {phase === 'capturing' && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-right w-full max-w-sm">
          <Loader2 size={18} className="text-emerald-400 animate-spin" />
          <p className="text-sm font-black text-emerald-300">جاري التقاط البيانات البيومترية...</p>
        </div>
      )}

      <p className="text-[11px] text-slate-500 text-center max-w-xs">
        🔒 وجهك يُعالَج محلياً على جهازك فقط. لا تُخزَّن أي صورة — فقط بيانات رياضية مشفرة.
      </p>

      <button onClick={onCancel} className="text-xs font-bold text-slate-500 hover:text-white transition underline">
        إلغاء / استخدام كلمة المرور
      </button>
    </div>
  );
}
