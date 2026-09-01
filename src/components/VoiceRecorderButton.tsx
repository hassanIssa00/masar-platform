'use client';

import { useRef, useState } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';

type VoiceRecorderButtonProps = {
  onRecorded: (audioDataUrl: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  title?: string;
};

export default function VoiceRecorderButton({
  onRecorded,
  disabled,
  className = '',
  title = 'تسجيل رسالة صوتية',
}: VoiceRecorderButtonProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startRecording = async () => {
    if (disabled || isSaving) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      alert('التسجيل الصوتي غير مدعوم في هذا المتصفح.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });
        stopTracks();
        setIsRecording(false);
        if (!blob.size) return;

        setIsSaving(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            await onRecorded(String(reader.result));
          } finally {
            setIsSaving(false);
          }
        };
        reader.onerror = () => setIsSaving(false);
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      stopTracks();
      setIsRecording(false);
      alert('افتح صلاحية الميكروفون من المتصفح ثم حاول مرة أخرى.');
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
  };

  return (
    <button
      type="button"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled || isSaving}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
        isRecording ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-slate-100 text-slate-700 hover:bg-teal-50 hover:text-teal-800'
      } ${className}`}
      title={isRecording ? 'إيقاف التسجيل وإرساله' : title}
    >
      {isSaving ? <Loader2 size={16} className="animate-spin" /> : isRecording ? <Square size={16} /> : <Mic size={16} />}
      <span className="hidden sm:inline">{isSaving ? 'حفظ' : isRecording ? 'إيقاف' : 'صوت'}</span>
    </button>
  );
}

export function MessageAudio({ src, className = '' }: { src?: string; className?: string }) {
  if (!src) return null;
  return (
    <audio
      controls
      preload="metadata"
      src={src}
      className={`mt-2 h-10 w-full min-w-[220px] max-w-full rounded-lg ${className}`}
    />
  );
}
