'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import { Eye, Radio, AlertCircle } from 'lucide-react';
import Image from 'next/image';

function LiveViewer() {
  const params = useSearchParams();
  const roomId = params.get('room') || '';
  const [token, setToken] = useState('');
  const [wsUrl, setWsUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!roomId) { setError('رابط البث غير صحيح.'); setLoading(false); return; }
    (async () => {
      try {
        const res = await fetch(
          `/api/livekit/token?room=${encodeURIComponent(roomId)}&username=${encodeURIComponent('مشاهد — ولي أمر')}&isHost=false`
        );
        const data = await res.json();
        if (data.token) { setToken(data.token); setWsUrl(data.wsUrl); }
        else setError('لم نتمكن من الاتصال بالبث. ربما انتهى البث أو الرابط منتهي الصلاحية.');
      } catch {
        setError('خطأ في الاتصال. تحقق من اتصالك بالإنترنت وحاول مجدداً.');
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 relative rounded-xl overflow-hidden border border-slate-700">
            <Image src="/brand/masar-logo.png" alt="مسار" fill className="object-contain p-1" />
          </div>
          <div>
            <h1 className="font-black text-lg text-white">بث مباشر — مَسَار</h1>
            <p className="text-xs font-bold text-teal-400">منصة التأهيل والتعليم الذكي · مدرسة الإخلاص جدة</p>
          </div>
        </div>
        {token && (
          <span className="inline-flex items-center gap-2 rounded-full bg-red-600/80 px-4 py-1.5 text-xs font-black text-white border border-red-500/30 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-white animate-ping" />
            🔴 مباشر الآن
          </span>
        )}
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center p-4">
        {loading && (
          <div className="text-center space-y-4">
            <Radio className="h-12 w-12 text-teal-400 mx-auto animate-spin" />
            <p className="text-lg font-black text-slate-200">جاري الاتصال بالبث المباشر…</p>
            <p className="text-sm font-bold text-slate-400">الرجاء الانتظار قليلاً</p>
          </div>
        )}
        {!loading && error && (
          <div className="max-w-md text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-rose-400 mx-auto" />
            <p className="text-lg font-black text-rose-300">{error}</p>
            <p className="text-sm font-bold text-slate-400">إذا كنت تعتقد أن الرابط صحيح، تواصل مع مدرستك.</p>
          </div>
        )}
        {!loading && !error && token && wsUrl && (
          <div className="w-full max-w-5xl rounded-2xl overflow-hidden border border-slate-800 shadow-2xl" style={{ minHeight: '70vh' }}>
            <LiveKitRoom
              video={false}
              audio={false}
              token={token}
              serverUrl={wsUrl}
              data-lk-theme="default"
              style={{ height: '70vh', '--lk-bg': '#0f172a' } as React.CSSProperties}
            >
              <VideoConference />
              <RoomAudioRenderer />
            </LiveKitRoom>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 px-6 py-3 text-center">
        <p className="text-[11px] font-bold text-slate-500">
          منصة مَسَار للتعليم العلاجي · تقديم: د. إسماعيل عيسى · للاستفسارات تواصل مع المدرسة
        </p>
      </footer>
    </div>
  );
}

export default function LivePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-white font-bold text-lg">جاري التحميل…</p>
      </div>
    }>
      <LiveViewer />
    </Suspense>
  );
}
