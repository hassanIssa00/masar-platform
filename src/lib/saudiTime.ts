/**
 * توقيت المملكة العربية السعودية الرسمي (Asia/Riyadh) — مكة المكرمة
 * يضمن أن جميع حسابات الجدول، الحصص، الحضور، وتوثيق البصمة تعمل بتوقيت السعودية بدقة
 * بغض النظر عن موقع جهاز المستخدم أو توقيت السيرفر.
 */

export const SAUDI_TIMEZONE = 'Asia/Riyadh';

export interface SaudiTimeInfo {
  date: Date;
  dateStr: string;        // YYYY-MM-DD في السعودية
  timeStr: string;        // HH:mm:ss بتوقيت مكة (عربي)
  timeShortStr: string;   // HH:mm بتوقيت مكة (عربي)
  hhmm: string;           // '07:30' (24-hour للمقارنة مع جدول الحصص)
  dayOfWeek: number;      // 0=الأحد … 6=السبت
  dayArabicName: string;  // 'الأحد', 'الاثنين', إلخ
  hours: number;          // 0-23
  minutes: number;        // 0-59
}

const ARABIC_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function getSaudiNow(): SaudiTimeInfo {
  const now = new Date();

  // تنسيق عناصر الوقت في منطقة Asia/Riyadh
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SAUDI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }

  const year = partMap.year || String(now.getFullYear());
  const month = partMap.month || String(now.getMonth() + 1).padStart(2, '0');
  const day = partMap.day || String(now.getDate()).padStart(2, '0');
  
  let hours = parseInt(partMap.hour || '0', 10);
  if (hours === 24) hours = 0;
  const minutes = parseInt(partMap.minute || '0', 10);

  const dateStr = `${year}-${month}-${day}`;
  const hhmm = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dayOfWeek = weekdayMap[partMap.weekday || 'Sun'] ?? now.getDay();
  const dayArabicName = ARABIC_DAYS[dayOfWeek] || 'الأحد';

  const timeStr = now.toLocaleTimeString('ar-SA', {
    timeZone: SAUDI_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const timeShortStr = now.toLocaleTimeString('ar-SA', {
    timeZone: SAUDI_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  });

  return {
    date: now,
    dateStr,
    timeStr,
    timeShortStr,
    hhmm,
    dayOfWeek,
    dayArabicName,
    hours,
    minutes,
  };
}

/**
 * تحويل أي تاريخ إلى صيغة نصية عربية بتوقيت مكة المكرمة
 */
export function formatSaudiDate(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return d.toLocaleDateString('ar-SA', {
    timeZone: SAUDI_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  });
}

/**
 * تحويل أي وقت إلى صيغة وقت عربي بتوقيت مكة المكرمة
 */
export function formatSaudiTime(date: Date | string | number, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return d.toLocaleTimeString('ar-SA', {
    timeZone: SAUDI_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });
}
