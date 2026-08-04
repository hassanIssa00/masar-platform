'use client';

import { useState } from 'react';
import { Mic, Square, Play, Trash2, CheckCircle2 } from 'lucide-react';

export default function VoiceNoteRecorder({ onSave }: { onSave?: (noteText: string) => void }) {
  const [recording, setRecording] = useState(false);
  const [textNote, setTextNote] = useState('');
  const [savedMsg, setSavedMsg] = useState(false);

  const toggleRecording = () => {
    if (!recording) {
      setRecording(true);
    } else {
      setRecording(false);
      setTextNote('تسجيل صوتي محاكاة: ملاحظة أخصائي إيجابية حول استجابة الطالب في الجلسة.');
    }
  };

  const handleSave = () => {
    if (!textNote.trim()) return;
    onSave?.(textNote);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <span className="font-black text-slate-800 text-xs flex items-center gap-1.5">
          <Mic size={16} className="text-teal-600" /> تسجيل ملاحظة صوتية للجلسة
        </span>
        {recording && (
          <span className="flex items-center gap-1 text-[11px] font-black text-rose-600 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-rose-600" /> جاري التسجيل...
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleRecording}
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${
            recording ? 'bg-rose-600 text-white shadow-md' : 'bg-teal-600 text-white hover:bg-teal-700'
          }`}
          title={recording ? 'إيقاف التسجيل' : 'بدء التسجيل الصوتي'}
        >
          {recording ? <Square size={16} /> : <Mic size={18} />}
        </button>

        <input
          type="text"
          value={textNote}
          onChange={(e) => setTextNote(e.target.value)}
          placeholder="أو اكتب الملاحظة التقييمية هنا..."
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-black outline-none focus:border-teal-600"
        />

        <button
          type="button"
          onClick={handleSave}
          disabled={!textNote.trim()}
          className="rounded-xl bg-slate-900 px-3.5 py-2.5 text-xs font-black text-white hover:bg-slate-800 transition disabled:opacity-40"
        >
          حفظ الملاحظة
        </button>
      </div>

      {savedMsg && (
        <p className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-center">
          ✓ تم حفظ الملاحظة الصوتية في ملف الطالب بنجاح!
        </p>
      )}
    </div>
  );
}
