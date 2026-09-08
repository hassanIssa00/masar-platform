'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation, ShieldCheck, RefreshCw, MapPin, AlertTriangle, Loader2 } from 'lucide-react';
import ClassroomFaceAttendanceFullPage from '@/components/ClassroomFaceAttendanceFullPage';
import {
  getCurrentBrowserPosition,
  checkLocationWithinSchool,
  getSchoolLocation,
  GeofenceResult,
} from '@/lib/schoolLocation';

type GeoGate = 'checking' | 'allowed' | 'denied' | 'error';

export default function IkhlasFaceAttendanceStandalonePage() {
  const router = useRouter();
  const [geoGate, setGeoGate]     = useState<GeoGate>('checking');
  const [geoMsg, setGeoMsg]       = useState('');
  const [geoResult, setGeoResult] = useState<GeofenceResult | null>(null);
  const school = getSchoolLocation();

  const checkGPS = async () => {
    setGeoGate('checking');
    setGeoMsg('');
    try {
      const pos    = await getCurrentBrowserPosition();
      const result = checkLocationWithinSchool(pos.lat, pos.lng);
      setGeoResult(result);

      if (result.isWithin) {
        setGeoGate('allowed');
      } else {
        setGeoGate('denied');
        setGeoMsg(
          `أنت تبعد ${result.distanceText} عن المدرسة. يُشترط التواجد الفعلي داخل محيط المدرسة (أقل من ${school.radiusMeters} متر) لفتح هذه الصفحة.`
        );
      }
    } catch (err: any) {
      setGeoGate('error');
      setGeoMsg(err?.message || 'تعذر تحديد موقع الجهاز. تأكد من تفعيل الـ GPS وإعطاء إذن الموقع للمتصفح.');
    }
  };

  useEffect(() => {
    checkGPS();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Checking ─────────────────────────────────────────────────────────── */
  if (geoGate === 'checking') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6" dir="rtl">
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-10 max-w-sm w-full text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-lg animate-pulse">
            <Navigation size={30} className="animate-spin" />
          </div>
          <h2 className="text-lg font-black text-white">جاري فحص الموقع الجغرافي...</h2>
          <p className="text-sm font-bold text-slate-400">
            يتم التحقق من تواجد الجهاز داخل محيط مدرسة الإخلاص الأهلية قبل فتح كشف الحضور.
          </p>
          <Loader2 size={28} className="text-blue-400 animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  /* ── Denied — hard block ──────────────────────────────────────────────── */
  if (geoGate === 'denied') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6" dir="rtl">
        <div className="bg-slate-800 border-2 border-rose-600 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-rose-700 text-white flex items-center justify-center mx-auto shadow-lg">
            <AlertTriangle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-black text-white">⛔ الوصول مرفوض</h2>
            <p className="text-sm font-bold text-rose-300 leading-relaxed">
              {geoMsg}
            </p>
          </div>

          {geoResult && (
            <div className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4 text-right space-y-1.5">
              <div className="flex items-center gap-2 text-slate-300 text-xs font-bold">
                <MapPin size={14} className="text-rose-400 shrink-0" />
                <span>المسافة الفعلية: <span className="text-rose-300 font-black">{geoResult.distanceText}</span></span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 text-xs font-bold">
                <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                <span>النطاق المسموح: <span className="text-emerald-300 font-black">{school.radiusMeters} متر</span></span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              onClick={checkGPS}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 transition"
            >
              <RefreshCw size={16} />
              إعادة فحص موقعي الآن
            </button>
            <button
              type="button"
              onClick={() => router.push('/branches/ikhlas-jeddah')}
              className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-sm rounded-xl transition"
            >
              العودة للفرع
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── GPS error (technical) — allow override since GPS itself failed ─────── */
  if (geoGate === 'error') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6" dir="rtl">
        <div className="bg-slate-800 border border-amber-600 rounded-3xl p-8 max-w-md w-full text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-700 text-white flex items-center justify-center mx-auto shadow-lg">
            <Navigation size={30} />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-black text-white">⚠️ تعذر تحديد الموقع الجغرافي</h2>
            <p className="text-xs font-bold text-amber-300 leading-relaxed">{geoMsg}</p>
          </div>
          <div className="bg-amber-950/40 border border-amber-700 rounded-xl p-3 text-xs font-bold text-amber-200 text-right leading-relaxed">
            💡 لتفعيل GPS: اضغط أيقونة القفل 🔒 بجانب رابط الموقع → الموقع → السماح
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={checkGPS}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 transition"
            >
              <RefreshCw size={16} />
              إعادة المحاولة
            </button>
            <button
              type="button"
              onClick={() => router.push('/branches/ikhlas-jeddah')}
              className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold text-sm rounded-xl transition"
            >
              العودة للفرع
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Allowed ─ render the actual kiosk ───────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Geofence badge */}
        <div className="mb-4 flex items-center gap-2 text-xs font-black text-emerald-400">
          <ShieldCheck size={15} />
          <span>
            تم التحقق من الموقع الجغرافي ✅ — الجهاز داخل محيط المدرسة
            {geoResult && ` (${geoResult.distanceText})`}
          </span>
        </div>
        <ClassroomFaceAttendanceFullPage onBack={() => router.push('/branches/ikhlas-jeddah')} />
      </div>
    </div>
  );
}
