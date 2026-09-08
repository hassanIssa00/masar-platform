'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Eye, EyeOff, CheckCircle2, Loader2, ScanFace, ShieldCheck } from 'lucide-react';
import { initFaceAuth, detectFace, checkBlink, estimateHeadPose } from '@/lib/faceAuth';

export type FaceCameraMode = 'enroll' | 'verify';

interface Props {
  mode: FaceCameraMode;
  userId?: string;
  /** Called on successful VERIFY — receives single clean averaged embedding + snapshot */
  onSuccess?: (embedding: number[], photoSnapshot?: string) => void;
  /** Live continuous verification callback for real-time unlock */
  onVerify?: (embedding: number[], photoSnapshot?: string) => Promise<{ ok: boolean; name?: string } | boolean>;
  /** Called on successful ENROLL — receives ALL 5 pose embeddings + frontal snapshot */
  onEnrollSuccess?: (embeddings: number[][], photoSnapshot?: string) => void;
  onCancel: () => void;
}

// ── Average multiple candidate embeddings to eliminate camera jitter & noise ──
function averageEmbeddings(candidates: number[][]): number[] {
  if (!candidates || candidates.length === 0) return [];
  if (candidates.length === 1) return candidates[0];
  const len = candidates[0].length;
  const avg = new Array(len).fill(0);
  for (let i = 0; i < len; i++) {
    let sum = 0;
    for (let k = 0; k < candidates.length; k++) {
      sum += candidates[k][i];
    }
    avg[i] = sum / candidates.length;
  }
  return avg;
}

// ── Draw high-tech biometric HUD overlay on canvas ───────────────────────────
function drawFaceHUD(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; width: number; height: number },
  landmarks: { x: number; y: number; z: number }[],
  isGood: boolean,
  isScanning: boolean,
  videoWidth: number,
  videoHeight: number
) {
  const color = isGood ? '#10b981' : isScanning ? '#06b6d4' : '#facc15';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 14;
  ctx.shadowColor = color;

  // 1. High-tech Viewfinder Corner Brackets
  const cornerSize = Math.min(box.width, box.height) * 0.18;
  // Top-left
  ctx.beginPath();
  ctx.moveTo(box.x, box.y + cornerSize);
  ctx.lineTo(box.x, box.y);
  ctx.lineTo(box.x + cornerSize, box.y);
  ctx.stroke();

  // Top-right
  ctx.beginPath();
  ctx.moveTo(box.x + box.width - cornerSize, box.y);
  ctx.lineTo(box.x + box.width, box.y);
  ctx.lineTo(box.x + box.width, box.y + cornerSize);
  ctx.stroke();

  // Bottom-left
  ctx.beginPath();
  ctx.moveTo(box.x, box.y + box.height - cornerSize);
  ctx.lineTo(box.x, box.y + box.height);
  ctx.lineTo(box.x + cornerSize, box.y + box.height);
  ctx.stroke();

  // Bottom-right
  ctx.beginPath();
  ctx.moveTo(box.x + box.width - cornerSize, box.y + box.height);
  ctx.lineTo(box.x + box.width, box.y + box.height);
  ctx.lineTo(box.x + box.width, box.y + box.height - cornerSize);
  ctx.stroke();

  // 2. Subtle landmark mesh anchor points (eyes, nose, chin, cheeks)
  if (landmarks && landmarks.length >= 468) {
    const keyIndices = [33, 133, 263, 362, 1, 4, 61, 291, 152, 234, 454, 70, 300];
    ctx.fillStyle = isGood ? 'rgba(16, 185, 129, 0.85)' : 'rgba(6, 182, 212, 0.75)';
    ctx.shadowBlur = 6;
    for (const idx of keyIndices) {
      const lm = landmarks[idx];
      if (lm) {
        ctx.beginPath();
        ctx.arc(lm.x * videoWidth, lm.y * videoHeight, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 3. High-tech scanning laser line (oscillating vertically inside face box)
  if (isScanning) {
    const t = performance.now() / 700;
    const scanRatio = (Math.sin(t) + 1) / 2; // 0..1 smooth oscillation
    const laserY = box.y + box.height * scanRatio;

    const grad = ctx.createLinearGradient(box.x, laserY, box.x + box.width, laserY);
    grad.addColorStop(0, 'rgba(6, 182, 212, 0)');
    grad.addColorStop(0.5, isGood ? 'rgba(16, 185, 129, 0.95)' : 'rgba(6, 182, 212, 0.9)');
    grad.addColorStop(1, 'rgba(6, 182, 212, 0)');

    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = 12;
    ctx.shadowColor = isGood ? '#10b981' : '#06b6d4';
    ctx.beginPath();
    ctx.moveTo(box.x + 4, laserY);
    ctx.lineTo(box.x + box.width - 4, laserY);
    ctx.stroke();
  }
}

// ── Enroll pose sequence ──────────────────────────────────────────────────────
const ENROLL_STEPS = [
  {
    id: 'frontal',
    ar: 'انظر للكاميرا مباشرةً',
    arSub: 'ثبّت رأسك وأبقِ عينيك مفتوحتين 🎯',
    icon: '🎯',
    dir: null as null | 'right' | 'left' | 'up' | 'down',
    check: (yaw: number, pitch: number) => Math.abs(yaw) < 0.16 && Math.abs(pitch) < 0.16,
  },
  {
    id: 'right',
    ar: 'الف رأسك للجهة اليمنى',
    arSub: 'حرّك رأسك برفق حتى يصبح السهم أخضر ➡️',
    icon: '➡️',
    dir: 'right' as const,
    check: (yaw: number, _p: number) => yaw < -0.20,
  },
  {
    id: 'left',
    ar: 'الف رأسك للجهة اليسرى',
    arSub: 'حرّك رأسك برفق حتى يصبح السهم أخضر ⬅️',
    icon: '⬅️',
    dir: 'left' as const,
    check: (yaw: number, _p: number) => yaw > 0.20,
  },
  {
    id: 'up',
    ar: 'ارفع رأسك للأعلى قليلاً',
    arSub: 'ارفع ذقنك برفق حتى يصبح السهم أخضر ⬆️',
    icon: '⬆️',
    dir: 'up' as const,
    check: (_y: number, pitch: number) => pitch < -0.12,
  },
  {
    id: 'down',
    ar: 'اخفض رأسك للأسفل قليلاً',
    arSub: 'اخفض ذقنك برفق حتى يصبح السهم أخضر ⬇️',
    icon: '⬇️',
    dir: 'down' as const,
    check: (_y: number, pitch: number) => pitch > 0.12,
  },
] as const;

type Phase =
  | 'loading' | 'camera' | 'error'
  // Verify mode:
  | 'scanning' | 'success'
  // Enroll mode:
  | 'enroll_pose_guide'   // steps 0-4: waiting for correct head angle
  | 'enroll_capturing'    // capturing embedding for current step
  | 'enroll_success';     // all 5 poses done

export default function FaceCamera({
  mode,
  userId,
  onSuccess,
  onVerify,
  onEnrollSuccess,
  onCancel,
}: Props) {
  // ── DOM refs ────────────────────────────────────────────────────────────────
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef   = useRef<number>(0);

  // ── Animation-loop refs (avoid stale closures) ───────────────────────────────
  const phaseRef          = useRef<Phase>('loading');
  const enrollStepRef     = useRef(0);
  const enrollEmbsRef     = useRef<number[][]>([]);  // accumulated final pose embeddings
  const stepFramesRef     = useRef<number[][]>([]);  // frames accumulated during current pose
  const poseOkRef         = useRef(false);
  const successCalledRef  = useRef(false);
  const poseHoldRef       = useRef(0);   // frames held in correct pose
  const isCheckingRef     = useRef(false);

  // Multi-frame verification accumulation (~30 clean frontal frames = ~1.5 - 1.8s)
  const verifyCandidatesRef = useRef<number[][]>([]);
  const TARGET_VERIFY_FRAMES = 30;

  // ── React state (UI only) ───────────────────────────────────────────────────
  const [phase, _setPhase]                = useState<Phase>('loading');
  const [faceDetected, setFaceDetected]   = useState(false);
  const [hasMultiFaces, setHasMultiFaces] = useState(false);
  const [errorMsg, setErrorMsg]           = useState('');
  const [progress, setProgress]           = useState(0);
  const [scanStatusText, setScanStatusText] = useState('جاري مسح أبعاد وملامح الوجه...');
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
    successCalledRef.current    = false;
    poseHoldRef.current         = 0;
    verifyCandidatesRef.current = [];
    stepFramesRef.current       = [];
    setProgress(0);
    setEnrollStep(0);
    enrollEmbsRef.current = [];
    setPoseOk(false);
    setScanStatusText('جاري مسح أبعاد وملامح الوجه...');

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
      setPhase(mode === 'verify' ? 'scanning' : 'enroll_pose_guide');
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

    // ── No face detected ────────────────────────────────────────────────────
    if (!result) {
      setFaceDetected(false);
      setHasMultiFaces(false);
      if (canvas) canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      if (phaseRef.current === 'scanning') {
        setScanStatusText('ضع وجهك أمام الكاميرا بوضوح...');
      }
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
    const pose     = estimateHeadPose(landmarks);
    const { isBlinking, score: blinkScore } = checkBlink(blendshapes);

    // ── Draw high-tech HUD on canvas ─────────────────────────────────────────
    if (canvas && box && v) {
      canvas.width  = v.videoWidth;
      canvas.height = v.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const isGood = curPhase === 'success' || curPhase === 'enroll_success' || poseOkRef.current;
        const isScanning = curPhase === 'scanning' || curPhase === 'enroll_capturing';
        drawFaceHUD(ctx, box, landmarks, isGood, isScanning, v.videoWidth, v.videoHeight);
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // VERIFY MODE (Multi-frame Scan: 1.5 - 1.8s of clean frontal frames)
    // ══════════════════════════════════════════════════════════════════════
    if (mode === 'verify') {
      if (curPhase === 'camera') {
        setPhase('scanning');
      }

      if (curPhase === 'scanning') {
        const isFrontal   = Math.abs(pose.yaw) < 0.24 && Math.abs(pose.pitch) < 0.24;
        const eyesOpen    = !isBlinking && blinkScore < 0.40;
        const faceAdequate = box ? (box.width >= v.videoWidth * 0.16) : true;

        if (!faceAdequate) {
          setScanStatusText('يرجى الاقتراب قليلاً من الكاميرا 🔍');
        } else if (!isFrontal) {
          setScanStatusText('يرجى النظر مباشرة للكاميرا وتثبيت الرأس 🎯');
        } else if (!eyesOpen) {
          setScanStatusText('يرجى فتح العينين بشكل طبيعي 👁️');
        } else {
          // Clean frame (whether smiling, talking, or neutral)
          verifyCandidatesRef.current.push(embedding);
          const count = verifyCandidatesRef.current.length;

          if (onVerify) {
            // Live continuous verification mode (like Apple Face ID)
            const targetBatch = 12; // ~0.35s of continuous frames
            const pct = Math.min(95, Math.round((count / targetBatch) * 100));
            setProgress(pct);
            setScanStatusText('🔒 جاري فحص ومطابقة البصمة البيومترية لحظياً...');

            if (count >= targetBatch && !isCheckingRef.current && !successCalledRef.current) {
              isCheckingRef.current = true;
              const avgEmb = averageEmbeddings(verifyCandidatesRef.current);
              const snap   = captureSnapshot();
              verifyCandidatesRef.current = []; // Reset window to keep streaming

              onVerify(avgEmb, snap)
                .then((res) => {
                  isCheckingRef.current = false;
                  const isMatch = typeof res === 'boolean' ? res : Boolean(res && res.ok);
                  if (isMatch) {
                    successCalledRef.current = true;
                    setProgress(100);
                    const matchedName = typeof res === 'object' && res?.name ? res.name : '';
                    setScanStatusText(matchedName ? `✅ مرحباً بك يا ${matchedName}` : '✅ تم التحقق البيومتري بنجاح');
                    setPhase('success');
                    setTimeout(() => {
                      onSuccess?.(avgEmb, snap);
                    }, 400);
                  }
                })
                .catch(() => {
                  isCheckingRef.current = false;
                });
            }
          } else {
            // Standard batch verify
            const pct = Math.min(100, Math.round((count / TARGET_VERIFY_FRAMES) * 100));
            setProgress(pct);

            if (pct < 30) {
              setScanStatusText('🎯 جاري ضبط محاذاة الوجه وتتبع الملامح...');
            } else if (pct < 70) {
              setScanStatusText('📐 جاري تحليل 478 نقطة هندسية والنسب التشريحية...');
            } else if (pct < 98) {
              setScanStatusText('🔒 جاري مطابقة البصمة البيومترية مع السجلات...');
            } else {
              setScanStatusText('✅ تم التقاط وتحليل البصمة بدقة فائقة');
            }

            if (count >= TARGET_VERIFY_FRAMES && !successCalledRef.current) {
              successCalledRef.current = true;
              const avgEmb = averageEmbeddings(verifyCandidatesRef.current);
              const snap   = captureSnapshot();
              setPhase('success');
              setTimeout(() => {
                onSuccess?.(avgEmb, snap);
              }, 350);
            }
          }
        }
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // ENROLL MODE (5 Poses with multi-frame averaging for every angle)
    // ══════════════════════════════════════════════════════════════════════
    else if (mode === 'enroll') {
      if (curPhase === 'camera') {
        setPhase('enroll_pose_guide');
      }

      // ── Step 0..4: wait for correct head angle & hold ───────────────────
      if (curPhase === 'enroll_pose_guide') {
        const step = ENROLL_STEPS[curStep];
        let ok = false;

        if (step) {
          if (curStep === 0) {
            // Frontal requires frontal angle + open eyes (not blinking)
            ok = step.check(pose.yaw, pose.pitch) && !isBlinking && blinkScore < 0.35;
          } else {
            ok = step.check(pose.yaw, pose.pitch);
          }
        }

        setPoseOk(ok);

        if (ok) {
          poseHoldRef.current++;
          // Hold stable for 8 frames before initiating capture
          if (poseHoldRef.current >= 8) {
            poseHoldRef.current   = 0;
            stepFramesRef.current = [];
            successCalledRef.current = false;
            setPhase('enroll_capturing');
          }
        } else {
          poseHoldRef.current = 0;
        }
      }

      // ── Capturing pose: accumulate 10 clean frames & average ────────────
      if (curPhase === 'enroll_capturing' && !successCalledRef.current) {
        stepFramesRef.current.push(embedding);

        const targetStepFrames = curStep === 0 ? 12 : 8;
        if (stepFramesRef.current.length >= targetStepFrames) {
          successCalledRef.current = true;

          const averagedPoseEmb = averageEmbeddings(stepFramesRef.current);
          const newEmbs = [...enrollEmbsRef.current, averagedPoseEmb];
          enrollEmbsRef.current = newEmbs;

          // Capture frontal snapshot for attendance photo
          const snap = curStep === 0 ? captureSnapshot() : undefined;

          if (curStep < ENROLL_STEPS.length - 1) {
            // Advance to next pose
            const nextStep = curStep + 1;
            enrollStepRef.current = nextStep;
            poseOkRef.current     = false;
            poseHoldRef.current   = 0;
            stepFramesRef.current = [];
            successCalledRef.current = false;

            _setEnrollStep(nextStep);
            _setPoseOk(false);
            setProgress(Math.round((nextStep / ENROLL_STEPS.length) * 100));
            setPhase('enroll_pose_guide');
          } else {
            // All 5 poses collected — complete!
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
  }, [mode, onSuccess, onVerify, onEnrollSuccess]);

  useEffect(() => {
    const activePhases: Phase[] = [
      'camera', 'scanning',
      'enroll_pose_guide', 'enroll_capturing',
    ];
    if (activePhases.includes(phase)) {
      animRef.current = requestAnimationFrame(runLoop);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, runLoop]);

  // ── Derived render flags ───────────────────────────────────────────────────
  const isEnroll       = mode === 'enroll';
  const curStepData    = ENROLL_STEPS[enrollStep];
  const isCapturing    = phase === 'scanning' || phase === 'enroll_capturing';
  const isSuccess      = phase === 'success' || phase === 'enroll_success';
  const isPoseGuiding  = phase === 'enroll_pose_guide';
  const isActive       = phase === 'camera' || phase === 'scanning' || isPoseGuiding || isCapturing;

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

        {/* Capturing progress bar (bottom of camera) */}
        {isCapturing && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-100"
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

      {/* Verify Scanning HUD Card */}
      {!hasMultiFaces && mode === 'verify' && phase === 'scanning' && (
        <div className="w-full max-w-sm rounded-2xl bg-slate-900 border-2 border-cyan-500/40 p-4 shadow-xl shadow-cyan-950/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ScanFace size={20} className="text-cyan-400 animate-pulse" />
              <span className="text-xs font-black text-white">فحص البصمة البيومترية</span>
            </div>
            <span className="text-xs font-black text-cyan-400 font-mono">{progress}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-xs font-bold text-slate-300 flex items-center gap-1.5 leading-relaxed">
            {scanStatusText}
          </p>
        </div>
      )}

      {/* Pose guide card (Enroll mode) */}
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

      {/* Capturing card (Enroll mode) */}
      {mode === 'enroll' && phase === 'enroll_capturing' && (
        <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-emerald-600 border-2 border-emerald-700 text-white w-full max-w-sm shadow-md">
          <Loader2 size={18} className="animate-spin shrink-0" />
          <p className="text-sm font-black">جاري تسجيل زاوية الوجه بدقة عالية...</p>
        </div>
      )}

      <p className="text-[11px] font-bold text-slate-500 text-center max-w-xs flex items-center justify-center gap-1">
        <ShieldCheck size={13} className="text-emerald-500 inline shrink-0" />
        <span>حماية بيومترية عالية — تُعالج البيانات محلياً فقط بأمان تام</span>
      </p>
    </div>
  );
}
