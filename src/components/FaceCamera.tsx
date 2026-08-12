'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Eye, EyeOff, CheckCircle2, XCircle, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { initFaceAuth, detectFace, checkBlink } from '@/lib/faceAuth';

export type FaceCameraMode = 'enroll' | 'verify';

interface Props {
  mode: FaceCameraMode;
  /** For 'verify' mode only — if omitted, matches against all enrolled */
  userId?: string;
  onSuccess: (descriptor: Float32Array) => void;
  onCancel: () => void;
  /** Challenge to show (default: blink) */
  challenge?: 'blink' | 'smile';
}

type Phase =
  | 'loading'      // loading models
  | 'camera'       // waiting for face
  | 'challenge'    // liveness challenge
  | 'capturing'    // capturing descriptor
  | 'success'
  | 'error';

const CHALLENGE_LABELS: Record<string, { ar: string; en: string; icon: string }> = {
  blink: { ar: 'اغمض عينيك ببطء', en: 'Slowly blink your eyes', icon: '👁️' },
  smile: { ar: 'ابتسم للكاميرا', en: 'Smile at the camera', icon: '😊' },
};

export default function FaceCamera({ mode, onSuccess, onCancel, challenge = 'blink' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const challengeRef = useRef(challenge);
  const blinkCountRef = useRef(0);
  const wasBlinkingRef = useRef(false);
  const animRef = useRef<number>(0);

  const [phase, setPhase] = useState<Phase>('loading');
  const [faceDetected, setFaceDetected] = useState(false);
  const [challengeDone, setChallengeDone] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [faceBox, setFaceBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [progress, setProgress] = useState(0); // 0-100 capture progress

  const startCamera = async () => {
    try {
      setPhase('loading');
      setErrorMsg('');

      // Request camera stream (must be user-triggered or immediate)
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user' },
            audio: false,
          });
        } catch {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }
      }

      streamRef.current = stream;
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Load AI models (if not already loaded)
      await initFaceAuth();

      setPhase('camera');
    } catch (e: any) {
      console.error('FaceCamera error:', e);
      const errName = e?.name || 'UnknownError';
      const errText = e?.message || String(e);

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setErrorMsg('المتصفح يمنع الكاميرا. يرجى الضغط على زر القفل 🔒 بجانب رابط الموقع في أعلى المتصفح واختيار "السماح بالمرور للكاميرا (Allow Camera)" ثم تحديث الصفحة.');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setErrorMsg('لم يتم العثور على كاميرا متصلة بالجهاز.');
      } else {
        setErrorMsg(`سبب عدم تشغيل الكاميرا: (${errName}: ${errText}). يرجى التأكد من توصيل الكاميرا والسماح بها من المتصفح.`);
      }
      setPhase('error');
    }
  };

  useEffect(() => {
    let mounted = true;
    startCamera();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Continuous face detection loop
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
      setFaceBox(null);
      animRef.current = requestAnimationFrame(runLoop);
      return;
    }

    setFaceDetected(true);
    const { box, landmarks, expressions, descriptor } = result;

    // Draw overlay box on canvas
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const color = challengeDone ? '#22c55e' : '#facc15';
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowBlur = 10;
        ctx.shadowColor = color;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
      }
    }

    setFaceBox({ x: box.x, y: box.y, w: box.width, h: box.height });

    // Phase: camera → start challenge when face is detected & centered
    if (phase === 'camera') {
      setPhase('challenge');
      blinkCountRef.current = 0;
    }

    // Phase: challenge — detect blink or smile
    if (phase === 'challenge') {
      if (challengeRef.current === 'blink') {
        const { isBlinking } = checkBlink(landmarks);
        if (isBlinking && !wasBlinkingRef.current) {
          blinkCountRef.current++;
          if (blinkCountRef.current >= 1) {
            setChallengeDone(true);
            setPhase('capturing');
          }
        }
        wasBlinkingRef.current = isBlinking;
      } else if (challengeRef.current === 'smile') {
        const smileScore = (expressions as any).happy || 0;
        if (smileScore > 0.75) {
          setChallengeDone(true);
          setPhase('capturing');
        }
      }
    }

    // Phase: capturing — collect multiple frames and average descriptor
    if (phase === 'capturing') {
      setProgress(prev => {
        const next = prev + 25;
        if (next >= 100) {
          // Done — call success with descriptor
          setTimeout(() => {
            setPhase('success');
            onSuccess(descriptor);
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

  const cl = CHALLENGE_LABELS[challenge];

  return (
    <div className="flex flex-col items-center gap-4 w-full" dir="rtl">

      {/* Camera viewport */}
      <div className="relative w-full max-w-sm aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-2xl">
        <video
          ref={videoRef}
          className="w-full h-full object-cover scale-x-[-1]"
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full scale-x-[-1] pointer-events-none"
        />

        {/* Phase overlays */}
        {phase === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 gap-3">
            <Loader2 size={36} className="text-emerald-400 animate-spin" />
            <p className="text-sm font-bold text-white">جاري تحميل نماذج التعرف على الوجه...</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 gap-3.5 p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400">
              <Camera size={28} />
            </div>
            <p className="text-xs sm:text-sm font-bold text-red-200 max-w-xs leading-relaxed">{errorMsg}</p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <button
                type="button"
                onClick={startCamera}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition shadow-lg active:scale-95"
              >
                <Camera size={16} /> منح الإذن وتفعيل الكاميرا
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
              >
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

        {/* Face detection indicator */}
        {(phase === 'camera' || phase === 'challenge' || phase === 'capturing') && (
          <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black transition ${faceDetected ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300' : 'bg-red-500/20 border border-red-500 text-red-300'}`}>
            {faceDetected ? <Eye size={12} /> : <EyeOff size={12} />}
            {faceDetected ? 'وجه مكتشف' : 'لا يوجد وجه'}
          </div>
        )}

        {/* Progress bar for capturing */}
        {phase === 'capturing' && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
            <div
              className="h-full bg-emerald-400 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Challenge instruction */}
      {(phase === 'challenge') && !challengeDone && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-right w-full max-w-sm animate-pulse">
          <span className="text-2xl">{cl.icon}</span>
          <div>
            <p className="text-sm font-black text-amber-300">{cl.ar}</p>
            <p className="text-xs text-amber-400/70">{cl.en}</p>
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

      {/* Privacy note */}
      <p className="text-[11px] text-slate-500 text-center max-w-xs">
        🔒 وجهك يُعالَج محلياً على جهازك فقط. لا تُخزَّن أي صورة — فقط بيانات رياضية مشفرة.
      </p>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="text-xs font-bold text-slate-500 hover:text-white transition underline"
      >
        إلغاء / استخدام كلمة المرور
      </button>

    </div>
  );
}
