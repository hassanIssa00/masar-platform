'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Camera, Plus, Send, ArrowRight, Loader2, Heart, Smile, Sparkles } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
const BRANCH = 'IKHLAS_JEDDAH';

function authHeaders() {
  return { 'Content-Type': 'application/json' };
}

export default function IkhlasPhotosPage() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [photoUrl, setPhotoUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/school/photos?branch=${BRANCH}`, { headers: authHeaders() });
      if (r.ok) setPhotos(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const uploadPhoto = async () => {
    if (!photoUrl) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/school/photos`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ branch: BRANCH, photoUrl, caption }),
      });
      if (r.ok) {
        setPhotoUrl(''); setCaption('');
        await fetchPhotos();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-pink-950 text-white p-4 sm:p-6" dir="rtl">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <Link href="/branches/ikhlas-jeddah"
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-slate-300">
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              📸 مجتمع ومعرض صور الفصل
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              خاص بالمعلم فقط للنشر — يمكن لأولياء الأمور مشاهدة الصور والتفاعل بـ Emoji
            </p>
          </div>
        </div>

        {/* Upload Card */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Camera className="w-5 h-5 text-pink-400" /> نشر صورة يومية جديدة للأنشطة
          </h2>

          <input placeholder="رابط الصورة المباشر (Image URL)" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} dir="ltr"
            className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-pink-500 transition" />

          <input placeholder="تعليق أو توضيح على الصورة (مثال: أبطال أولى ابتدائي في حصة العلوم 🧪)" value={caption} onChange={(e) => setCaption(e.target.value)}
            className="w-full bg-slate-900/90 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-pink-500 transition" />

          <button onClick={uploadPhoto} disabled={submitting || !photoUrl}
            className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-black text-sm px-6 py-2.5 rounded-xl shadow-lg transition-all disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            نشر الصورة لمعرض الفصل 🚀
          </button>
        </div>

        {/* Photos Grid */}
        <div className="space-y-3">
          <h2 className="text-base font-black text-white">صور الأنشطة المرفوعة</h2>
          {loading && <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-pink-400 mx-auto" /></div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((ph) => (
              <div key={ph.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group">
                <img src={ph.photoUrl} alt={ph.caption ?? ''} className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300" />
                {ph.caption && <p className="text-xs text-slate-300 p-3 font-bold">{ph.caption}</p>}
                
                <div className="p-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <span>{new Date(ph.createdAt).toLocaleDateString('ar-SA')}</span>
                  <div className="flex gap-1">
                    {Object.entries((ph.reactions as Record<string, number>) ?? {}).map(([emoji, count]) => (
                      <span key={emoji} className="bg-white/10 rounded-full px-2 py-0.5">{emoji} {String(count)}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {!loading && !photos.length && <p className="text-slate-500 text-center py-8">لا توجد صور مرفوعة بعد 📷</p>}
        </div>
      </div>
    </div>
  );
}
