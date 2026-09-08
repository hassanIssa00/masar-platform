'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, CheckCircle2, AlertCircle, ScanFace, Loader2, Sparkles,
  ShieldCheck, Clock, BookOpen, MapPin, Navigation, Compass,
  ChevronDown, ChevronUp, RefreshCw, AlertTriangle
} from 'lucide-react';
import FaceCamera from './FaceCamera';
import { verifyFace, findBestMatch } from '@/lib/faceAuth';
import { markStudentAttendanceViaFace, AttendanceRecord, resolveActivePeriod, PERIOD_NAMES } from '@/lib/attendance';
import {
  getSchoolLocation, checkLocationWithinSchool, getCurrentBrowserPosition,
  SchoolLocationConfig, GeofenceResult
} from '@/lib/schoolLocation';
import InteractiveGeofenceMap from './InteractiveGeofenceMap';

interface Props {
  studentId: string;
  studentName: string;
  branch?: 'MASAR' | 'IKHLAS_JEDDAH';
  targetPeriodNumber?: number;
  targetSubjectName?: string;
  onClose: () => void;
  onSuccess: (record: AttendanceRecord) => void;
}

export default function StudentFaceAttendanceModal({
  studentId,
  studentName,
  branch = 'IKHLAS_JEDDAH',
  targetPeriodNumber,
  targetSubjectName,
  onClose,
  onSuccess,
}: Props) {
  const defaultPeriod = resolveActivePeriod(targetPeriodNumber);
  const [selectedPeriodNumber, setSelectedPeriodNumber] = useState<number>(targetPeriodNumber || defaultPeriod.periodNumber);
  const [status, setStatus] = useState<'scan' | 'verifying' | 'success' | 'error'>('scan');
  const [errorMsg, setErrorMsg] = useState('');
  const [verifiedTime, setVerifiedTime] = useState('');
  const [capturedSnapshot, setCapturedSnapshot] = useState<string | null>(null);
  const [recordedRecord, setRecordedRecord] = useState<AttendanceRecord | null>(null);

  /* ── GPS Geofencing States ── */
  const [school] = useState<SchoolLocationConfig>(() => getSchoolLocation());
  const [geoStatus, setGeoStatus] = useState<'checking' | 'allowed' | 'denied' | 'error'>('checking');
  const [geoErrorMsg, setGeoErrorMsg] = useState<string>('');
  const [studentCoords, setStudentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geofenceResult, setGeofenceResult] = useState<GeofenceResult | null>(null);
  const [showInteractiveMap, setShowInteractiveMap] = useState<boolean>(true);

  const currentPeriodName = PERIOD_NAMES[selectedPeriodNumber] || `الحصة ${selectedPeriodNumber}`;
  const currentSubjectName = targetSubjectName || defaultPeriod.subjectName;

  // Verify Student GPS Location
  const checkGPSLocation = useCallback(async () => {
    setGeoStatus('checking');
    setGeoErrorMsg('');

    try {
      const pos = await getCurrentBrowserPosition();
      setStudentCoords({ lat: pos.lat, lng: pos.lng });

      const result = checkLocationWithinSchool(pos.lat, pos.lng);
      setGeofenceResult(result);

      if (result.isWithin) {
        setGeoStatus('allowed');
      } else {
        setGeoStatus('denied');
        setGeoErrorMsg(`أنت تبعد مسافة (${result.distanceText}) عن المدرسة. يُشترط التواجد الفعلي داخل الحرم المدرسي.`);
      }
    } catch (err: any) {
      setGeoStatus('error');
      setGeoErrorMsg(err?.message || 'تعذر تحديد موقع جهازك الجغرافي. يرجى تفعيل الـ GPS والسماح للمتصفح بالوصول للموقع.');
    }
  }, []);

  useEffect(() => {
    checkGPSLocation();
  }, [checkGPSLocation]);

  const speakCelebration = (name: string, pName: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(`أهلاً بك يا ${name}! تم تسجيل حضورك في ${pName} بنجاح.`);
        utterance.lang = 'ar-SA';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch {}
    }
  };

  const handleFaceSuccess = async (embedding: number[], snapshot?: string) => {
    // Safety check: Don't allow submission if GPS was not confirmed or outside school
    if (geoStatus !== 'allowed' || !geofenceResult?.isWithin) {
      setStatus('error');
      setErrorMsg('التسجيل مرفوض: أنت خارج النطاق الجغرافي للمدرسة ولا يمكن تسجيل حضورك عن بعد.');
      return;
    }

    setStatus('verifying');
    setErrorMsg('');
    if (snapshot) setCapturedSnapshot(snapshot);

    try {
      // 1. Check local verification first
      let matchRes = verifyFace(studentId, embedding);
      let sim = matchRes.similarity;

      // 2. If no local match, check if best match points to this student
      if (!matchRes.match) {
        const best = findBestMatch(embedding);
        if (best.userId === studentId && best.similarity >= 0.80) {
          matchRes = { match: true, similarity: best.similarity };
          sim = best.similarity;
        }
      }

      // 3. If still no local match, query server /api/auth/face
      if (!matchRes.match) {
        try {
          const res = await fetch('/api/auth/face', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ embedding }),
          });
          const data = await res.json();
          if (data.ok && (data.account?.id === studentId || data.account?.linkedStudentId === studentId)) {
            matchRes = { match: true, similarity: data.similarity || 0.95 };
            sim = data.similarity || 0.95;
          }
        } catch {}
      }

      // If matched
      if (matchRes.match || sim >= 0.80) {
        const { record } = await markStudentAttendanceViaFace(studentId, studentName, {
          branch,
          confidence: sim,
          isClassroom: branch === 'IKHLAS_JEDDAH',
          capturedPhotoUrl: snapshot,
          periodNumber: selectedPeriodNumber,
          periodName: currentPeriodName,
          subjectName: currentSubjectName,
          geoVerified: true,
          geoDistanceMeters: geofenceResult?.distanceMeters,
          geoCoords: studentCoords || undefined,
        });

        const timeStr = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        setVerifiedTime(timeStr);
        setRecordedRecord(record);
        setStatus('success');
        speakCelebration(studentName, currentPeriodName);

        setTimeout(() => {
          onSuccess(record);
          onClose();
        }, 2200);
      } else {
        setStatus('error');
        setErrorMsg('لم يتم التعرف على ملامح وجهك بدقة كافية. يرجى النظر مباشرة إلى الكاميرا في إضاءة جيدة.');
      }
    } catch (e: any) {
      console.error('Face attendance verification error:', e);
      setStatus('error');
      setErrorMsg('حدث خطأ أثناء معالجة بصمة الوجه. يمكنك المحاولة مرة أخرى.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto" dir="rtl">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-l from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
              <ScanFace size={22} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <span>تسجيل حضور الحصة بالبصمة</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {currentPeriodName} 📚
                </span>
              </h3>
              <p className="text-xs font-bold text-slate-500">الطالب: {studentName} • المادة: {currentSubjectName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition flex items-center justify-center cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">

          {/* GPS CHECKING */}
          {geoStatus === 'checking' && (
            <div className="p-6 bg-blue-50/80 border border-blue-200 rounded-3xl text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/20 animate-pulse">
                <Navigation size={28} className="animate-spin" />
              </div>
              <h4 className="text-sm font-black text-blue-900">جاري فحص الموقع الجغرافي (GPS)...</h4>
              <p className="text-xs font-bold text-blue-700 max-w-sm mx-auto">
                يتم التحقق للتأكد من تواجدك الفعلي داخل محيط مدرسة الإخلاص الأهلية بجدة لمنع التسجيل عن بُعد.
              </p>
            </div>
          )}

          {/* GEOFENCE DENIED (OUTSIDE SCHOOL) — HARD BLOCK: no bypass button */}
          {geoStatus === 'denied' && (
            <div className="space-y-3">
              <div className="p-5 bg-rose-50 border-2 border-rose-400 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <h4 className="text-sm font-black text-rose-900">
                    ⛔ التسجيل مرفوض — أنت خارج النطاق الجغرافي للمدرسة
                  </h4>
                  <p className="text-xs font-bold text-rose-700 leading-relaxed">
                    {geoErrorMsg}
                  </p>
                  <p className="text-[11px] text-rose-600 font-medium">
                    يُشترط التواجد داخل المدرسة على بعد أقل من {school.radiusMeters} متر لتسجيل الحضور. لا يمكن تجاوز هذا الشرط.
                  </p>
                </div>
              </div>

              {/* Interactive Map Display */}
              <InteractiveGeofenceMap
                school={school}
                studentCoords={studentCoords}
                geofenceResult={geofenceResult}
                onRefreshLocation={checkGPSLocation}
                isLoading={false}
              />

              <div className="flex items-center justify-between gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={checkGPSLocation}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw size={14} />
                  <span>إعادة فحص موقعي الآن</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition cursor-pointer"
                >
                  إغلاق
                </button>
              </div>
            </div>
          )}

          {/* GEOFENCE ERROR OR PERMISSION REFUSED — NO BYPASS ALLOWED */}
          {geoStatus === 'error' && (
            <div className="space-y-4 text-center py-2">
              <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
                <AlertTriangle size={34} />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-black text-slate-900">تعذر التحقق من الموقع الجغرافي (GPS) ⚠️</h4>
                <p className="text-xs font-bold text-slate-500 max-w-sm mx-auto leading-relaxed">
                  {geoErrorMsg || 'يُشترط تفعيل خدمة الموقع الجغرافي (GPS) والسماح للمتصفح بالوصول للتأكد من تواجدك الفعلي داخل المدرسة.'}
                </p>
                <p className="text-[11px] font-black text-rose-600">
                  ⛔ لا يمكن فتح كاميرا الحضور دون تأكيد تواجدك الجغرافي داخل محيط المدرسة.
                </p>
              </div>

              {/* Action buttons */}
              <div className="space-y-2.5 pt-1 max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={checkGPSLocation}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Compass size={16} />
                  <span>إعادة فحص الموقع الجغرافي (GPS) 📍</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition cursor-pointer"
                >
                  إغلاق
                </button>
              </div>

              {/* Browser settings guide */}
              <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-[11px] font-bold text-amber-900 text-right space-y-1">
                <div className="flex items-center gap-1.5 font-black text-amber-900">
                  <span>💡</span>
                  <span>كيف تسمح بالموقع في متصفحك (Google Chrome / Safari)؟</span>
                </div>
                <p className="text-amber-800 text-[10px] leading-relaxed pr-3.5">
                  اضغط على أيقونة الإعدادات ⚙️ أو القفل 🔒 بجانب اسم الموقع في شريط العنوان، واضبط "الموقع (Location)" على "السماح / Allow" ثم اضغط إعادة فحص.
                </p>
              </div>
            </div>
          )}

          {/* ══════════════ 2. GEOFENCE ALLOWED -> PROCEED TO FACE SCAN ══════════════ */}
          {geoStatus === 'allowed' && status === 'scan' && (
            <div className="space-y-4">
              {/* Geofence Verified Banner with Map Toggle */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-black text-emerald-950">
                      الموقع الجغرافي مؤكد: داخل محيط المدرسة ✅
                    </p>
                    <p className="text-[10px] font-bold text-emerald-700">
                      أنت على بعد {geofenceResult?.distanceText} من فصل د. إسماعيل عيسى
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowInteractiveMap(!showInteractiveMap)}
                  className="text-[10px] font-black text-emerald-800 bg-white border border-emerald-300 px-2.5 py-1.5 rounded-xl hover:bg-emerald-100 transition flex items-center gap-1 cursor-pointer"
                >
                  <MapPin size={12} />
                  <span>{showInteractiveMap ? 'إخفاء الخريطة' : 'عرض الخريطة'}</span>
                  {showInteractiveMap ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              </div>

              {/* Collapsible Interactive Map */}
              {showInteractiveMap && (
                <InteractiveGeofenceMap
                  school={school}
                  studentCoords={studentCoords}
                  geofenceResult={geofenceResult}
                  onRefreshLocation={checkGPSLocation}
                  compact={true}
                />
              )}

              {/* Period Selector Tabs */}
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
                    <Clock size={12} className="text-emerald-600" />
                    <span>حدد الحصة المراد تسجيل حضورها:</span>
                  </span>
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {currentPeriodName}
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7].map((num) => {
                    const isSel = selectedPeriodNumber === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setSelectedPeriodNumber(num)}
                        className={`py-2 px-1 rounded-xl text-center text-xs font-black transition cursor-pointer ${
                          isSel
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-400/50'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                        }`}
                      >
                        حـ{num}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Face ID Camera View */}
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-950">
                <FaceCamera
                  mode="verify"
                  userId={studentId}
                  onSuccess={handleFaceSuccess}
                  onCancel={onClose}
                />
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] font-bold text-slate-400">
                <ShieldCheck size={14} className="text-emerald-500" />
                <span>حماية مزدوجة: بصمة الوجه البيومترية + النطاق الجغرافي GPS للمدرسة</span>
              </div>
            </div>
          )}

          {/* VERIFYING STATE */}
          {status === 'verifying' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-emerald-500/20 border-t-emerald-600 animate-spin flex items-center justify-center" />
                <div className="absolute inset-0 flex items-center justify-center text-emerald-600">
                  <ScanFace size={32} className="animate-pulse" />
                </div>
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">جاري مطابقة بصمة الوجه والموقع...</h4>
                <p className="text-xs font-bold text-slate-500 mt-1">يتم توثيق حضور {currentPeriodName} بمدرسة الإخلاص</p>
              </div>
            </div>
          )}

          {/* SUCCESS STATE */}
          {status === 'success' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              {capturedSnapshot ? (
                <div className="relative">
                  <img
                    src={capturedSnapshot}
                    alt={studentName}
                    className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500 shadow-xl"
                  />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center border-2 border-white shadow">
                    <CheckCircle2 size={18} />
                  </div>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-bounce">
                  <CheckCircle2 size={44} />
                </div>
              )}
              <div className="space-y-1">
                <h4 className="text-xl font-black text-emerald-800">أهلاً بك يا {studentName}! 🌟</h4>
                <p className="text-sm font-black text-slate-800">
                  تم تسجيل حضورك بنجاح في <span className="text-emerald-600 underline">{currentPeriodName} ({currentSubjectName})</span>
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
                    <Sparkles size={13} />
                    <span>توقيت الحضور: {verifiedTime || 'الآن'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold">
                    <MapPin size={13} />
                    <span>موثق جغرافياً داخل المدرسة ({geofenceResult?.distanceText})</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ERROR STATE */}
          {status === 'error' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertCircle size={36} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900">تعذر تسجيل الحضور</h4>
                <p className="text-xs font-bold text-slate-500 mt-1 max-w-xs mx-auto">{errorMsg}</p>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStatus('scan')}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow transition cursor-pointer"
                >
                  إعادة المحاولة 🔄
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
