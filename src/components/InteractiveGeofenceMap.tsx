'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin, Compass, Navigation, ShieldCheck, AlertTriangle,
  ZoomIn, ZoomOut, RefreshCw, ExternalLink, School, User
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
  const [zoomLevel, setZoomLevel] = useState<number>(16);
  const [focusTarget, setFocusTarget] = useState<'school' | 'student' | 'fit'>('fit');

  // Compute map center and bounding box
  const centerLat = studentCoords && focusTarget === 'student'
    ? studentCoords.lat
    : focusTarget === 'school'
      ? school.lat
      : studentCoords
        ? (school.lat + studentCoords.lat) / 2
        : school.lat;

  const centerLng = studentCoords && focusTarget === 'student'
    ? studentCoords.lng
    : focusTarget === 'school'
      ? school.lng
      : studentCoords
        ? (school.lng + studentCoords.lng) / 2
        : school.lng;

  // OpenStreetMap embed URL with dynamic markers
  // OpenStreetMap export iframe supports bbox
  const bboxPadding = Math.max(0.003, Math.min(0.04, (geofenceResult?.distanceMeters || 200) / 111000 * 1.5));
  const minLat = Math.min(school.lat, studentCoords?.lat ?? school.lat) - bboxPadding;
  const maxLat = Math.max(school.lat, studentCoords?.lat ?? school.lat) + bboxPadding;
  const minLng = Math.min(school.lng, studentCoords?.lng ?? school.lng) - bboxPadding;
  const maxLng = Math.max(school.lng, studentCoords?.lng ?? school.lng) + bboxPadding;

  const osmIframeUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${school.lat}%2C${school.lng}`;

  const isWithin = geofenceResult?.isWithin ?? false;
  const distanceText = geofenceResult?.distanceText ?? '--';

  return (
    <div className={`relative overflow-hidden rounded-3xl border ${
      isWithin ? 'border-emerald-300 bg-emerald-50/40 shadow-emerald-500/5' : 'border-rose-300 bg-rose-50/40 shadow-rose-500/5'
    } shadow-lg transition-all`} dir="rtl">

      {/* Map Header Status Bar */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isWithin ? 'bg-emerald-100/70 border-emerald-200 text-emerald-950' : 'bg-rose-100/70 border-rose-200 text-rose-950'
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
              <span>{isWithin ? 'داخل النطاق الجغرافي المعتمد' : 'خارج النطاق الجغرافي للمدرسة'}</span>
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
              <span className="hidden sm:inline">تحديث الموقع</span>
            </button>
          )}

          <a
            href={school.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 bg-white/90 hover:bg-white text-blue-700 border border-blue-200/80 px-2.5 py-1.5 rounded-xl text-[11px] font-black transition active:scale-95 shadow-2xs"
            title="فتح في خرائط Google"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Google Maps</span>
          </a>
        </div>
      </div>

      {/* Interactive Map Viewport */}
      <div className={`relative w-full ${compact ? 'h-52' : 'h-72'} bg-slate-100 overflow-hidden`}>
        {/* OpenStreetMap Tile Layer Embed */}
        <iframe
          title="خريطة النطاق الجغرافي لمدرسة الإخلاص"
          src={osmIframeUrl}
          className="w-full h-full border-0 pointer-events-auto"
          loading="lazy"
        />

        {/* Floating Interactive Visual HUD (Overlaid on the map) */}
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={() => setFocusTarget(focusTarget === 'school' ? 'student' : 'school')}
            className="bg-white/95 backdrop-blur-xs text-slate-800 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[10px] font-black shadow-md flex items-center gap-1.5 hover:bg-white transition"
          >
            {focusTarget === 'school' ? (
              <>
                <User className="w-3 h-3 text-indigo-600" />
                <span>تركيز على موقعي</span>
              </>
            ) : (
              <>
                <School className="w-3 h-3 text-emerald-600" />
                <span>تركيز على المدرسة</span>
              </>
            )}
          </button>
        </div>

        {/* Floating Distance HUD Pill */}
        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between bg-slate-900/90 backdrop-blur-md text-white rounded-2xl px-4 py-2.5 shadow-xl border border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isWithin ? 'bg-emerald-400 animate-ping' : 'bg-rose-400 animate-pulse'}`} />
            <div>
              <span className="text-[10px] text-slate-300 block leading-tight">المسافة بينك وبين الفصل:</span>
              <span className="font-black text-sm text-white">{distanceText}</span>
            </div>
          </div>

          <div className="text-left">
            <span className="text-[10px] text-slate-300 block leading-tight">الحد الأقصى المسموح:</span>
            <span className="font-black text-xs text-emerald-300">{school.radiusMeters} متر فقط</span>
          </div>
        </div>
      </div>

      {/* Footer Instruction Text */}
      <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-600">
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          <span>موقع المدرسة المعتمد: {school.lat.toFixed(5)}, {school.lng.toFixed(5)}</span>
        </span>
        <span className="text-[10px] text-slate-400 font-normal">
          {studentCoords ? `إحداثيات جهازك: ${studentCoords.lat.toFixed(5)}, ${studentCoords.lng.toFixed(5)}` : 'جاري قراءة GPS...'}
        </span>
      </div>
    </div>
  );
}
