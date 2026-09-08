/**
 * مكتبة النطاق الجغرافي الذكي (GPS Geofencing) — مدارس الإخلاص الأهلية بجدة
 * الإحداثيات الرسمية:
 * Latitude: 21.54974
 * Longitude: 39.1813937
 * https://maps.app.goo.gl/Y1dmJMTc2V5pYMFn7
 */

export interface SchoolLocationConfig {
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number; // نصف القطر المسموح به بالأمتار (افتراضياً 200م)
  address: string;
  mapsUrl: string;
  updatedAt?: string;
  calibratedBy?: string;
}

// الإحداثيات الافتراضية الدقيقة المستخرجة من رابط جوجل مابس الرسمي
export const DEFAULT_IKHLAS_LOCATION: SchoolLocationConfig = {
  name: 'مدارس الإخلاص الأهلية للبنين',
  lat: 21.54974,
  lng: 39.1813937,
  radiusMeters: 200, // 200 متر يغطي كامل مبنى المدرسة والفناء والمداخل
  address: 'جدة — حي الصفا / مدرسة الإخلاص الأهلية',
  mapsUrl: 'https://maps.app.goo.gl/Y1dmJMTc2V5pYMFn7',
};

const STORAGE_KEY = 'masar.school_location_config.v1';

/**
 * جلب إعدادات موقع المدرسة الحالي (من التخزين المحلي أو الإعدادات الافتراضية)
 */
export function getSchoolLocation(): SchoolLocationConfig {
  if (typeof window === 'undefined') return DEFAULT_IKHLAS_LOCATION;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_IKHLAS_LOCATION;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_IKHLAS_LOCATION,
      ...parsed,
    };
  } catch {
    return DEFAULT_IKHLAS_LOCATION;
  }
}

/**
 * حفظ أو إعادة معايرة إحداثيات المدرسة أو نصف القطر
 */
export function saveSchoolLocation(config: Partial<SchoolLocationConfig>): SchoolLocationConfig {
  const current = getSchoolLocation();
  const updated: SchoolLocationConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('masar_location_config_updated', { detail: updated }));
  }
  return updated;
}

/**
 * حساب المسافة الدقيقة بين نقطتين على سطح الأرض بالأمتار
 * باستخدام معادلة هافيرسين (Haversine Formula) الرياضية
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // نصف قطر الأرض التقريبي بالأمتار
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export interface GeofenceResult {
  isWithin: boolean;
  distanceMeters: number;
  distanceText: string;
  allowedRadius: number;
  schoolLocation: SchoolLocationConfig;
  studentCoords: { lat: number; lng: number };
}

/**
 * فحص ما إذا كانت إحداثيات الطالب تقع داخل النطاق الجغرافي للمدرسة
 */
export function checkLocationWithinSchool(
  studentLat: number,
  studentLng: number,
  customRadius?: number
): GeofenceResult {
  const school = getSchoolLocation();
  const radius = customRadius ?? school.radiusMeters;
  const distanceMeters = calculateDistanceMeters(studentLat, studentLng, school.lat, school.lng);

  let distanceText: string;
  if (distanceMeters < 1000) {
    distanceText = `${distanceMeters} متر`;
  } else {
    distanceText = `${(distanceMeters / 1000).toFixed(1)} كم`;
  }

  return {
    isWithin: distanceMeters <= radius,
    distanceMeters,
    distanceText,
    allowedRadius: radius,
    schoolLocation: school,
    studentCoords: { lat: studentLat, lng: studentLng },
  };
}

/**
 * جلب الموقع الجغرافي الحالي لجهاز المستخدم عبر المتصفح بدقة عالية
 */
export function getCurrentBrowserPosition(): Promise<{
  lat: number;
  lng: number;
  accuracy: number;
}> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return reject(new Error('خدمة تحديد الموقع الجغرافي (GPS) غير مدعومة في هذا المتصفح.'));
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
      },
      (err) => {
        let msg = 'تعذر تحديد الموقع الجغرافي.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = 'تم رفض إذن الوصول إلى الموقع الجغرافي (GPS). يرجى تفعيل الموقع للتأكد من تواجدك داخل المدرسة.';
            break;
          case err.POSITION_UNAVAILABLE:
            msg = 'إشارة الموقع الجغرافي غير متوفرة حالياً على هذا الجهاز.';
            break;
          case err.TIMEOUT:
            msg = 'استغرق طلب تحديد الموقع وقتاً طويلاً. يرجى التحقق من اتصال الإنترنت وفتح الـ GPS.';
            break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  });
}
