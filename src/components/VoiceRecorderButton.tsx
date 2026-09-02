'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Play, Pause, Square, Trash2, Send, Volume2 } from 'lucide-react';

type VoiceRecorderButtonProps = {
  onRecorded: (audioDataUrl: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  title?: string;
};

function getBestMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/wav',
    '',
  ];
  for (const mime of candidates) {
    if (!mime || MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

export default function VoiceRecorderButton({
  onRecorded,
  disabled,
  className = '',
  title = 'تسجيل رسالة صوتية',
}: VoiceRecorderButtonProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const stopTracks = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = async () => {
    if (disabled || isSaving || isRecording) return;
    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      alert('التسجيل الصوتي غير مدعوم في هذا المتصفح.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      const mimeType = getBestMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);

      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      setSeconds(0);
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const resolvedMime = recorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: resolvedMime });
        stopTracks();
        setIsRecording(false);
        setSeconds(0);

        if (!blob || blob.size < 100) {
          return;
        }

        setIsSaving(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const dataUrl = String(reader.result || '');
            if (dataUrl && dataUrl.startsWith('data:audio/')) {
              await onRecorded(dataUrl);
            }
          } catch (err) {
            console.error('Error saving audio recording:', err);
          } finally {
            setIsSaving(false);
          }
        };
        reader.onerror = () => setIsSaving(false);
        reader.readAsDataURL(blob);
      };

      // Collect data in 100ms timeslices for reliable streaming
      recorder.start(100);
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setSeconds(elapsed);
      }, 500);
    } catch (err) {
      console.error('Mic access error:', err);
      stopTracks();
      setIsRecording(false);
      alert('يرجى السماح بالوصول إلى الميكروفون لتسجيل الصوت.');
    }
  };

  const stopAndSendRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    chunksRef.current = [];
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    stopTracks();
    setIsRecording(false);
    setSeconds(0);
  };

  useEffect(() => {
    return () => {
      stopTracks();
    };
  }, []);

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isRecording) {
    return (
      <div className="inline-flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-200 px-3 py-1.5 shadow-sm animate-pulse">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
        </span>
        <span className="text-xs font-black text-rose-700 font-mono tracking-wider">
          {formatTimer(seconds)}
        </span>
        <button
          type="button"
          onClick={cancelRecording}
          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
          title="إلغاء التسجيل"
        >
          <Trash2 size={15} />
        </button>
        <button
          type="button"
          onClick={stopAndSendRecording}
          className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3 py-1 text-xs font-black transition flex items-center gap-1 cursor-pointer shadow-xs"
          title="إنهاء وإرسال التسجيل"
        >
          <Send size={13} className="rotate-180" />
          <span>إرسال</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled || isSaving}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-2xl px-3.5 py-2.5 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
        isSaving ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-800 active:scale-95'
      } ${className}`}
      title={title}
    >
      {isSaving ? (
        <Loader2 size={16} className="animate-spin text-teal-600" />
      ) : (
        <Mic size={16} className="text-teal-700" />
      )}
      <span className="hidden sm:inline font-black text-slate-700">{isSaving ? 'جاري الحفظ...' : 'تسجيل صوتي'}</span>
    </button>
  );
}

export function MessageAudio({ src, className = '' }: { src?: string; className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleError = () => setHasError(true);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [src]);

  if (!src) return null;

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Audio play prevented:', e);
      });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Number(e.target.value);
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const toggleSpeed = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const rates = [1, 1.5, 2];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const formatTime = (timeInSec: number) => {
    if (!Number.isFinite(timeInSec) || timeInSec < 0) return '0:00';
    const mins = Math.floor(timeInSec / 60);
    const secs = Math.floor(timeInSec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`mt-2.5 rounded-2xl bg-white/95 text-slate-900 p-3 shadow-sm border border-slate-200/80 backdrop-blur-xs min-w-[240px] max-w-full ${className}`}>
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition active:scale-95 cursor-pointer"
          title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل الرسالة الصوتية'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="mr-0.5" />}
        </button>

        {/* Progress & Waveform */}
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="relative flex items-center">
            {/* Visual Waveform Bars */}
            <div className="flex h-4 w-full items-center gap-1 px-1 opacity-70">
              {[35, 60, 45, 80, 55, 90, 70, 40, 65, 85, 50, 75, 95, 60, 40, 80, 55, 30].map((h, i) => {
                const barPercent = (i / 18) * 100;
                const isPassed = barPercent <= progressPercent;
                return (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className={`w-1 rounded-full transition-all duration-150 ${
                      isPassed ? 'bg-teal-700' : 'bg-slate-300'
                    } ${isPlaying && isPassed ? 'animate-pulse' : ''}`}
                  />
                );
              })}
            </div>
            {/* Transparent Range Input Overlay */}
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Timers & Speed */}
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 font-mono">
            <span>{formatTime(currentTime)}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSpeed}
                className="rounded-md bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 text-[9px] font-black text-slate-700 transition cursor-pointer"
                title="سرعة التشغيل"
              >
                {playbackRate}x
              </button>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      {hasError && (
        <p className="mt-1 text-[10px] font-bold text-rose-600">تعذر تشغيل هذا المقطع الصوتي.</p>
      )}
    </div>
  );
}
