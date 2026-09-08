'use client';

import React, { useState } from 'react';
import {
  MapPin, Compass, Navigation, ShieldCheck, AlertTriangle,
  RefreshCw, ExternalLink, School, User, Route
} from 'lucide-react';
import { SchoolLocationConfig, GeofenceResult } from '@/lib/schoolLocation';

interface Props {
  school: SchoolLocationConfig;
  studentCoords?: { lat: number; lng: number } | null;
  geofenceResult?: GeofenceResult | null;
  onRefreshLocation?: () => void;
  isLoading?: boolean;
  compact?: boolean;
}

export default function InteractiveGeofenceMap({
  school,
  studentCoords,
  geofenceResult,
  onRefreshLocation,
  isLoading = false,
  compact = false,
}: Props) {
  // 'fit' displays both student and school with the route between them
  const [focusTarget, setFocusTarget] = useState<'fit' | 'school' | 'student'>('fit');

  // Generate Google Maps embed URL
  let mapUrl = '';
  if (focusTarget === 'fit' && studentCoords) {
    // Directions view shows both origin (student) and destination (school) regardless of distance
    mapUrl = `https://maps.google.com/maps?saddr=${studentCoords.lat},${studentCoords.lng}&daddr=${school.lat},${school.lng}&hl=ar&output=embed`;
  } else if (focusTarget === 'student' && studentCoords) {
    mapUrl = `https://maps.google.com/maps?q=${studentCoords.lat},${studentCoords.lng}&hl=ar&z=16&output=embed`;
  } else {
    // Default to school view
    mapUrl = `https://maps.google.com/maps?q=${school.lat},${school.lng}&hl=ar&z=17&output=embed`;
  }

  const isWithin = geofenceResult?.isWithin ?? false;
  const distanceText = geofenceResult?.distanceText ?? '--';

  // Direct external Google Maps link
  const externalMapsUrl = studentCoords
    ? `https://www.google.com/maps/dir/?api=1&origin=${studentCoords.lat},${studentCoords.lng}&destination=${school.lat},${school.lng}`
    : school.mapsUrl;

  return (
    <div className={`relative overflow-hidden rounded-3xl border-2 ${
      isWithin ? 'border-emerald-300 bg-emerald-50/40 shadow-emerald-500/10' : 'border-rose-300 bg-rose-50/40 shadow-rose-500/10'
    } shadow-lg transition-all`} dir="rtl">

      {/* Map Header Status Bar */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isWithin ? 'bg-emerald-100/80 border-emerald-200 text-emerald-950' : 'bg-rose-100/80 border-rose-200 text-rose-950'
      }`}>
        <div className="flex items-center gap-2">
          {isWithin ? (
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
          )}
          <div>
            <h4 className="text-xs font-black leading-tight flex items-center gap-1.5">
              <span>{isWithin ? 'داخل النطاق الجغرافي المعتمد ✅' : 'خارج النطاق الجغرافي للمدرسة ⛔'}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                isWithin ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              }`}>
                {distanceText}
              </span>
            </h4>
            <p className="text-[10px] font-bold opacity-80 mt-0.5">
              {school.name} (نطاق السماح: {school.radiusMeters}م)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onRefreshLocation && (
            <button
              type="button"
              onClick={onRefreshLocation}
              disabled={isLoading}
              className="flex items-center gap-1 bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 border border-slate-200/80 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition active:scale-95 shadow-2xs cursor-pointer"
              title="إعادة فحص موقعي الجغرافي"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>
          )}

          <a
            href={externalMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 bg-white/90 hover:bg-white text-blue-700 border border-blue-200/80 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition active:scale-95 shadow-2xs"
            title="فتح في تطبيق خرائط Google"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">خرائط Google</span>
          </a>
        </div>
      </div>

      {/* Interactive View Switcher Tabs */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 text-white text-[11px] font-black border-b border-slate-800 gap-1 overflow-x-auto">
        <span className="text-[10px] text-slate-400 shrink-0 ml-1">عرض الخريطة:</span>
        <div className="flex items-center gap-1">
          {studentCoords && (
            <button
              type="button"
              onClick={() => setFocusTarget('fit')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                focusTarget === 'fit'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Route className="w-3 h-3" />
              <span>المسار بالكامل (موقعي والمدرسة)</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setFocusTarget('school')}
            className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
              focusTarget === 'school'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <School className="w-3 h-3" />
            <span>مدرسة الإخلاص</span>
          </button>
          {studentCoords && (
            <button
              type="button"
              onClick={() => setFocusTarget('student')}
              className={`px-2.5 py-1 rounded-lg transition flex items-center gap-1 cursor-pointer ${
                focusTarget === 'student'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <User className="w-3 h-3" />
              <span>موقعي الحالي</span>
            </button>
          )}
        </div>
      </div>

      {/* Interactive Map Viewport */}
      <div className={`relative w-full ${compact ? 'h-60' : 'h-80'} bg-slate-100 overflow-hidden`}>
        {/* Google Maps Embed Iframe */}
        <iframe
          key={mapUrl}
          title="خريطة النطاق الجغرافي لمدرسة الإخلاص"
          src={mapUrl}
          className="w-full h-full border-0 pointer-events-auto"
          loading="lazy"
        />

        {/* Floating Distance HUD Pill */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between bg-slate-900/90 backdrop-blur-md text-white rounded-2xl px-4 py-2.5 shadow-xl border border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isWithin ? 'bg-emerald-400 animate-ping' : 'bg-rose-400 animate-pulse'}`} />
            <div>
              <span className="text-[10px] text-slate-300 block leading-tight">المسافة بينك وبين المدرسة:</span>
              <span className="font-black text-sm text-white">{distanceText}</span>
            </div>
          </div>

          <div className="text-left">
            <span className="text-[10px] text-slate-300 block leading-tight">الحد الأقصى المسموح:</span>
            <span className="font-black text-xs text-emerald-300">{school.radiusMeters} متر فقط</span>
          </div>
        </div>
      </div>

      {/* Footer Details */}
      <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-600">
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>موقع مدرسة الإخلاص: {school.lat.toFixed(4)}, {school.lng.toFixed(4)}</span>
        </span>
        <span className="text-[10px] text-slate-400 font-mono font-normal">
          {studentCoords ? `إحداثيات جهازك: ${studentCoords.lat.toFixed(4)}, ${studentCoords.lng.toFixed(4)}` : 'جاري قراءة GPS...'}
        </span>
      </div>
    </div>
  );
}
