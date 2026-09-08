'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Eye, EyeOff, CheckCircle2, Loader2 } from 'lucide-react';
import { initFaceAuth, detectFace, checkBlink, estimateHeadPose } from '@/lib/faceAuth';

export type FaceCameraMode = 'enroll' | 'verify';

interface Props {
  mode: FaceCameraMode;
  userId?: string;
  /** Called on successful VERIFY — receives single embedding + optional snapshot */
  onSuccess?: (embedding: number[], photoSnapshot?: string) => void;
  /** Called on successful ENROLL — receives ALL 5 pose embeddings + frontal snapshot */
  onEnrollSuccess?: (embeddings: number[][], photoSnapshot?: string) => void;
  onCancel: () => void;
}

// ── Enroll pose sequence ──────────────────────────────────────────────────────
const ENROLL_STEPS = [
  {
    id: 'frontal',
    ar: 'انظر للكاميرا مباشرةً',
    arSub: 'ثم أغمض عينيك ببطء للتحقق من الحياة 👁️',
    icon: '🎯',
    dir: null as null | 'right' | 'left' | 'up' | 'down',
    useBlink: true,
    /** Returns true when pose is achieved */
    check: (_y: number, _p: number) => true, // frontal uses blink, not pose angle
  },
  {
    id: 'right',
    ar: 'الف رأسك للجهة اليمنى',
    arSub: 'ابتعد برفق حتى يصبح السهم أخضر ➡️',
    icon: '➡️',
    dir: 'right' as const,
    useBlink: false,
    // yaw < -0.20 means nose shifted camera-left = user turned right in mirror
    check: (yaw: number, _p: number) => yaw < -0.20,
  },
  {
    id: 'left',
    ar: 'الف رأسك للجهة اليسرى',
    arSub: 'ابتعد برفق حتى يصبح السهم أخضر ⬅️',
    icon: '⬅️',
    dir: 'left' as const,
    useBlink: false,
    check: (yaw: number, _p: number) => yaw > 0.20,
  },
  {
    id: 'up',
    ar: 'ارفع رأسك للأعلى قليلاً',
    arSub: 'ارفع ذقنك برفق حتى يصبح السهم أخضر ⬆️',
    icon: '⬆️',
    dir: 'up' as const,
    useBlink: false,
    check: (_y: number, pitch: number) => pitch < -0.12,
  },
  {
    id: 'down',
    ar: 'اخفض رأسك للأسفل قليلاً',
    arSub: 'اخفض ذقنك برفق حتى يصبح السهم أخضر ⬇️',
    icon: '⬇️',
    dir: 'down' as const,
    useBlink: false,
    check: (_y: number, pitch: number) => pitch > 0.12,
  },
] as const;

type Phase =
  | 'loading' | 'camera' | 'error'
  // Verify mode:
  | 'challenge' | 'capturing' | 'success'
  // Enroll mode:
  | 'enroll_challenge'    // step 0: waiting for blink
  | 'enroll_pose_guide'   // steps 1-4: waiting for correct head angle
  | 'enroll_capturing'    // capturing embedding for current step
  | 'enroll_success';     // all 5 poses done

export default function FaceCamera({
  mode,
  onSuccess,
  onEnrollSuccess,
  onCancel,
}: Props) {
  // ── DOM refs ────────────────────────────────────────────────────────────────
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef   = useRef<number>(0);

  // ── Animation-loop refs (avoid stale closures) ───────────────────────────────
  const phaseRef        = useRef<Phase>('loading');
  const enrollStepRef   = useRef(0);
  const enrollEmbsRef   = useRef<number[][]>([]);  // accumulated embeddings
  const poseOkRef       = useRef(false);

  const blinkCountRef   = useRef(0);
  const wasBlinkingRef  = useRef(false);
  const successCalledRef = useRef(false);
  const poseHoldRef     = useRef(0);   // frames held in correct pose
  const captureFrameRef = useRef(0);   // frames accumulated in capturing phase

  // ── React state (UI only) ───────────────────────────────────────────────────
  const [phase, _setPhase]                = useState<Phase>('loading');
  const [faceDetected, setFaceDetected]   = useState(false);
  const [hasMultiFaces, setHasMultiFaces] = useState(false);
  const [challengeDone, setChallengeDone] = useState(false);
  const [errorMsg, setErrorMsg]           = useState('');
  const [progress, setProgress]           = useState(0);
  const [enrollStep, _setEnrollStep]      = useState(0);
  const [poseOk, _setPoseOk]             = useState(false);

  // ── Sync setters: update both ref and state atomically ───────────────────────
  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    _setPhase(p);
  };
  const setEnrollStep = (s: number) => {
    enrollStepRef.current = s;
    _setEnrollStep(s);
  };
  const setPoseOk = (ok: boolean) => {
    poseOkRef.current = ok;
    _setPoseOk(ok);
  };

  // ── Camera startup ────────────────────────────────────────────────────────────
  const startCamera = async () => {
    setPhase('loading');
    setErrorMsg('');
    successCalledRef.current  = false;
    blinkCountRef.current     = 0;
    wasBlinkingRef.current    = false;
    poseHoldRef.current       = 0;
    captureFrameRef.current   = 0;
    setChallengeDone(false);
    setProgress(0);
    setEnrollStep(0);
    enrollEmbsRef.current = [];
    setPoseOk(false);

    try {
      let stream: MediaStream | null = null;
      const constraints = [
        { video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false },
        { video: { facingMode: 'user' }, audio: false },
        { video: true, audio: false },
      ];
      for (const c of constraints) {
        try { stream = await navigator.mediaDevices.getUserMedia(c); break; } catch {}
      }

      if (!stream) throw new Error('no_stream');
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      await initFaceAuth();
      setPhase('camera');
    } catch (e: any) {
      const name = e?.name || '';
      const msg  = e?.message || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setErrorMsg('المتصفح يمنع الكاميرا. اضغط على أيقونة القفل 🔒 بجانب رابط الموقع واختر "السماح بالكاميرا" ثم أعد التحميل.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setErrorMsg('لم يتم العثور على كاميرا متصلة بالجهاز.');
      } else if (msg && !msg.includes('[object') && !msg.includes('no_stream')) {
        setErrorMsg(`تعذر تشغيل الكاميرا: ${msg}`);
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

  // ── Snapshot helper ────────────────────────────────────────────────────────
  const captureSnapshot = (): string | undefined => {
    try {
      const v = videoRef.current;
      if (!v || v.videoWidth === 0 || v.videoHeight === 0) return undefined;
      const sc  = document.createElement('canvas');
      sc.width  = 240;
      sc.height = 240;
      const ctx = sc.getContext('2d');
      if (!ctx) return undefined;
      ctx.translate(240, 0);
      ctx.scale(-1, 1);
      const min = Math.min(v.videoWidth, v.videoHeight);
      const sx  = (v.videoWidth  - min) / 2;
      const sy  = (v.videoHeight - min) / 2;
      ctx.drawImage(v, sx, sy, min, min, 0, 0, 240, 240);
      return sc.toDataURL('image/jpeg', 0.85);
    } catch { return undefined; }
  };

  // ── Main animation loop ────────────────────────────────────────────────────
  const runLoop = useCallback(async () => {
    const v = videoRef.current;
    if (!v || v.readyState < 2 || !v.videoWidth || !v.videoHeight) {
      animRef.current = requestAnimationFrame(runLoop);
      return;
    }

    const result = await detectFace(v);
    const canvas = canvasRef.current;

    // ── No face ────────────────────────────────────────────────────────────
    if (!result) {
      setFaceDetected(false);
      setHasMultiFaces(false);
      if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      animRef.current = requestAnimationFrame(runLoop);
      return;
    }

    // ── Multiple faces → block ─────────────────────────────────────────────
    if (result.multipleFaces) {
      setHasMultiFaces(true);
      setFaceDetected(true);
      if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      animRef.current = requestAnimationFrame(runLoop);
      return;
    }

    setHasMultiFaces(false);
    setFaceDetected(true);

    const { box, blendshapes, embedding, landmarks } = result;
    const curPhase = phaseRef.current;
    const curStep  = enrollStepRef.current;

    // ── Draw face bounding box ─────────────────────────────────────────────
    if (canvas && box && v) {
      canvas.width  = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const isGood = curPhase === 'enroll_capturing' || curPhase === 'capturing' ||
                       curPhase === 'success' || curPhase === 'enroll_success';
        const color  = (isGood || poseOkRef.current) ? '#22c55e' : '#facc15';
        ctx.strokeStyle = color;
        ctx.lineWidth   = 3;
        ctx.shadowBlur  = 14;
        ctx.shadowColor = color;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // VERIFY MODE
    // ══════════════════════════════════════════════════════════════════════
    if (mode === 'verify') {
      if (curPhase === 'camera') {
        setPhase('challenge');
      }

      if (curPhase === 'challenge') {
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

      if (curPhase === 'capturing') {
        setProgress(prev => {
          const next = prev + 25;
          if (next >= 100 && !successCalledRef.current) {
            successCalledRef.current = true;
            const snap = captureSnapshot();
            setTimeout(() => {
              setPhase('success');
              onSuccess?.(embedding, snap);
            }, 200);
            return 100;
          }
          return next >= 100 ? 100 : next;
        });
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // ENROLL MODE
    // ══════════════════════════════════════════════════════════════════════
    else if (mode === 'enroll') {
      const pose = estimateHeadPose(landmarks);

      // ── Face visible → start frontal blink challenge ────────────────────
      if (curPhase === 'camera') {
        setPhase('enroll_challenge');
      }

      // ── Step 0: wait for blink ─────────────────────────────────────────
      if (curPhase === 'enroll_challenge') {
        const { isBlinking } = checkBlink(blendshapes);
        if (isBlinking && !wasBlinkingRef.current) {
          blinkCountRef.current++;
          wasBlinkingRef.current = true;
          if (blinkCountRef.current >= 1) {
            captureFrameRef.current  = 0;
            successCalledRef.current = false;
            setPhase('enroll_capturing');
          }
        } else if (!isBlinking) {
          wasBlinkingRef.current = false;
        }
      }

      // ── Steps 1-4: wait for correct head angle ─────────────────────────
      if (curPhase === 'enroll_pose_guide') {
        const step = ENROLL_STEPS[curStep];
        const ok   = step ? step.check(pose.yaw, pose.pitch) : false;
        setPoseOk(ok);

        if (ok) {
          poseHoldRef.current++;
          if (poseHoldRef.current >= 10) { // ~10 stable frames before capture
            poseHoldRef.current      = 0;
            captureFrameRef.current  = 0;
            successCalledRef.current = false;
            setPhase('enroll_capturing');
          }
        } else {
          poseHoldRef.current = 0;
        }
      }

      // ── Capturing current pose embedding ───────────────────────────────
      if (curPhase === 'enroll_capturing' && !successCalledRef.current) {
        captureFrameRef.current++;

        if (captureFrameRef.current >= 6) {
          // Lock against re-entry
          successCalledRef.current = true;

          // Accumulate embedding
          const newEmbs = [...enrollEmbsRef.current, embedding];
          enrollEmbsRef.current = newEmbs;

          // Capture frontal snapshot for attendance photo
          const snap = curStep === 0 ? captureSnapshot() : undefined;

          if (curStep < ENROLL_STEPS.length - 1) {
            // ── Advance to next pose ─────────────────────────────────
            const nextStep = curStep + 1;
            enrollStepRef.current = nextStep;
            poseOkRef.current     = false;
            poseHoldRef.current   = 0;
            captureFrameRef.current = 0;

            // Reset lock for next step BEFORE setting phase
            successCalledRef.current = false;

            _setEnrollStep(nextStep);
            _setPoseOk(false);
            setProgress(Math.round((nextStep / ENROLL_STEPS.length) * 100));
            setPhase('enroll_pose_guide');
          } else {
            // ── All 5 poses collected — success! ─────────────────────
            setProgress(100);
            setTimeout(() => {
              setPhase('enroll_success');
              onEnrollSuccess?.(newEmbs, snap);
            }, 400);
          }
        }
      }
    }

    animRef.current = requestAnimationFrame(runLoop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, onSuccess, onEnrollSuccess]);

  useEffect(() => {
    const activePhases: Phase[] = [
      'camera', 'challenge', 'capturing',
      'enroll_challenge', 'enroll_pose_guide', 'enroll_capturing',
    ];
    if (activePhases.includes(phase)) {
      animRef.current = requestAnimationFrame(runLoop);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, runLoop]);

  // ── Derived render flags ───────────────────────────────────────────────────
  const isEnroll       = mode === 'enroll';
  const curStepData    = ENROLL_STEPS[enrollStep];
  const isCapturing    = phase === 'capturing' || phase === 'enroll_capturing';
  const isSuccess      = phase === 'success' || phase === 'enroll_success';
  const isChallenging  = phase === 'challenge' || phase === 'enroll_challenge';
  const isPoseGuiding  = phase === 'enroll_pose_guide';
  const isActive       = phase === 'camera' || isChallenging || isPoseGuiding || isCapturing;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-4 w-full" dir="rtl">

      {/* ── Multi-pose progress bar (enroll mode only) ─────────────────────── */}
      {isEnroll && phase !== 'loading' && phase !== 'error' && (
        <div className="w-full max-w-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-300">تسجيل الوجه متعدد الزوايا</span>
            <span className="text-xs font-black text-emerald-400">
              {Math.min(enrollStep + 1, ENROLL_STEPS.length)} / {ENROLL_STEPS.length}
            </span>
          </div>
          {/* Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* Step dots */}
          <div className="flex justify-between px-1">
            {ENROLL_STEPS.map((s, i) => (
              <div
                key={s.id}
                title={s.ar}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all duration-300 ${
                  i < enrollStep
                    ? 'bg-emerald-500 border-emerald-400 text-white scale-90'
                    : i === enrollStep
                    ? 'bg-amber-500 border-amber-400 text-white scale-110 shadow-lg shadow-amber-500/30'
                    : 'bg-slate-800 border-slate-700 text-slate-500 scale-90'
                }`}
              >
                {i < enrollStep ? '✓' : s.icon}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Camera viewport ────────────────────────────────────────────────── */}
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

        {/* Directional arrow overlay for pose guide */}
        {isPoseGuiding && curStepData?.dir && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="text-7xl transition-all duration-200 select-none"
              style={{
                filter: poseOk
                  ? 'drop-shadow(0 0 24px #22c55e)'
                  : 'drop-shadow(0 0 12px #facc15)',
                transform: poseOk ? 'scale(1.3)' : 'scale(1)',
                opacity: poseOk ? 1 : 0.6,
              }}
            >
              {curStepData.dir === 'right' ? '➡️'
                : curStepData.dir === 'left' ? '⬅️'
                : curStepData.dir === 'up'   ? '⬆️'
                : '⬇️'}
            </span>
          </div>
        )}

        {/* Loading overlay */}
        {phase === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 gap-3">
            <Loader2 size={36} className="text-emerald-400 animate-spin" />
            <p className="text-sm font-bold text-white">جاري تحميل نظام التعرف على الوجه...</p>
          </div>
        )}

        {/* Error overlay */}
        {phase === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 gap-3.5 p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400">
              <Camera size={28} />
            </div>
            <p className="text-xs font-bold text-red-200 max-w-xs leading-relaxed">{errorMsg}</p>
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <button
                type="button"
                onClick={startCamera}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition shadow-lg active:scale-95"
              >
                <Camera size={16} /> إعادة المحاولة 🔄
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

        {/* Success overlay */}
        {isSuccess && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-emerald-950/90 gap-3">
            <CheckCircle2 size={52} className="text-emerald-400" />
            <p className="text-base font-black text-white">
              {isEnroll ? 'اكتمل التسجيل البيومتري! 🎉' : 'تم التحقق بنجاح ✅'}
            </p>
          </div>
        )}

        {/* Face detected badge */}
        {isActive && (
          <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black transition ${
            faceDetected
              ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300'
              : 'bg-red-500/20 border border-red-500 text-red-300'
          }`}>
            {faceDetected ? <Eye size={12} /> : <EyeOff size={12} />}
            {faceDetected ? 'وجه مكتشف' : 'لا يوجد وجه'}
          </div>
        )}

        {/* Blink prompt (inside camera) */}
        {isChallenging && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400 border-2 border-amber-600 text-slate-950 font-black text-xs shadow-2xl animate-bounce whitespace-nowrap">
            <span className="text-base">👁️</span>
            <span>أغمض عينيك ببطء للتحقق</span>
          </div>
        )}

        {/* Capturing progress bar (bottom of camera) */}
        {isCapturing && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
            <div
              className="h-full bg-emerald-400 transition-all duration-100"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Info cards (below camera) ──────────────────────────────────────── */}

      {/* Multiple faces warning */}
      {hasMultiFaces && (
        <div className="flex items-center gap-3.5 px-5 py-3.5 rounded-2xl bg-rose-600 border-2 border-rose-700 text-white w-full max-w-sm shadow-lg shadow-rose-600/20 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-rose-700 flex items-center justify-center shrink-0 text-xl">👥</div>
          <div>
            <p className="text-sm font-black leading-tight">اكتُشف أكثر من شخص أمام الكاميرا</p>
            <p className="text-[11px] font-bold text-rose-100 mt-0.5">يرجى وقوف شخص واحد فقط للتحقق الأمني</p>
          </div>
        </div>
      )}

      {/* Blink challenge card */}
      {!hasMultiFaces && isChallenging && (
        <div className="flex items-center gap-3.5 px-5 py-3.5 rounded-2xl bg-amber-400 border-2 border-amber-500 text-slate-950 w-full max-w-sm shadow-lg shadow-amber-400/20 animate-pulse">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 border border-amber-600/40 flex items-center justify-center shrink-0 text-2xl">👁️</div>
          <div>
            <p className="text-base font-black leading-tight">أغمض عينيك ببطء الآن</p>
            <p className="text-xs font-black text-amber-950/80 mt-0.5">Slowly close and open your eyes</p>
          </div>
        </div>
      )}

      {/* Pose guide card */}
      {!hasMultiFaces && isPoseGuiding && curStepData && (
        <div className={`flex items-center gap-3.5 px-5 py-3.5 rounded-2xl border-2 w-full max-w-sm shadow-lg transition-all duration-300 ${
          poseOk
            ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/30'
            : 'bg-slate-900 border-slate-700 text-white'
        }`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-2xl transition-all ${
            poseOk ? 'bg-emerald-600' : 'bg-slate-800'
          }`}>
            {poseOk ? '✅' : curStepData.icon}
          </div>
          <div>
            <p className="text-sm font-black leading-tight">
              {poseOk ? '🟢 ممتاز! ثبّت رأسك...' : curStepData.ar}
            </p>
            <p className={`text-xs font-bold mt-0.5 ${poseOk ? 'text-emerald-100' : 'text-slate-400'}`}>
              {poseOk ? 'جاري التقاط البيانات البيومترية...' : curStepData.arSub}
            </p>
          </div>
        </div>
      )}

      {/* No face / place face card */}
      {!hasMultiFaces && phase === 'camera' && !faceDetected && (
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-slate-900 border-2 border-slate-700 w-full max-w-sm shadow-sm">
          <Camera size={20} className="text-amber-400 shrink-0" />
          <p className="text-sm font-black text-white">ضع وجهك أمام الكاميرا بوضوح</p>
        </div>
      )}

      {/* Capturing card */}
      {isCapturing && (
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-600 border-2 border-emerald-700 text-white w-full max-w-sm shadow-md">
          <Loader2 size={18} className="animate-spin shrink-0" />
          <p className="text-sm font-black">جاري التقاط البيانات البيومترية...</p>
        </div>
      )}

      <p className="text-[11px] font-bold text-slate-600 text-center max-w-xs">
        🔒 وجهك يُعالَج محلياً على جهازك فقط — لا تُخزَّن أي صورة
      </p>
    </div>
  );
}
