// جدول الحصص الأسبوعي — فصل د. إسماعيل عيسى
// يُستخدَم من الـ Frontend ويُزامَن مع قاعدة البيانات
import { readCloudCache } from '@/lib/firestoreSync';

export type Period = {
  dayOfWeek: number; // 0=الأحد … 4=الخميس
  periodNumber: number; // 1-7
  subjectName: string;
  startTime: string;
  endTime: string;
  teacherName?: string;
};

export const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

// جدول الحصص الأسبوعي المعتمد — فصل د. إسماعيل عيسى
// 6 حصص يومياً (30 حصة أسبوعياً) مع الفسحة المدرسية
export const DEFAULT_SCHEDULE: Period[] = [
  // الأحد
  { dayOfWeek: 0, periodNumber: 1, subjectName: 'لغتي العربية', startTime: '07:30', endTime: '08:10' },
  { dayOfWeek: 0, periodNumber: 2, subjectName: 'الرياضيات', startTime: '08:10', endTime: '08:50' },
  { dayOfWeek: 0, periodNumber: 3, subjectName: 'التربية الإسلامية', startTime: '08:50', endTime: '09:30' },
  { dayOfWeek: 0, periodNumber: 4, subjectName: 'العلوم', startTime: '09:50', endTime: '10:30' },
  { dayOfWeek: 0, periodNumber: 5, subjectName: 'التربية الفنية', startTime: '10:30', endTime: '11:10' },
  { dayOfWeek: 0, periodNumber: 6, subjectName: 'القرآن الكريم', startTime: '11:10', endTime: '11:50' },

  // الاثنين
  { dayOfWeek: 1, periodNumber: 1, subjectName: 'الرياضيات', startTime: '07:30', endTime: '08:10' },
  { dayOfWeek: 1, periodNumber: 2, subjectName: 'لغتي العربية', startTime: '08:10', endTime: '08:50' },
  { dayOfWeek: 1, periodNumber: 3, subjectName: 'التربية الإسلامية', startTime: '08:50', endTime: '09:30' },
  { dayOfWeek: 1, periodNumber: 4, subjectName: 'التربية البدنية', startTime: '09:50', endTime: '10:30' },
  { dayOfWeek: 1, periodNumber: 5, subjectName: 'العلوم', startTime: '10:30', endTime: '11:10' },
  { dayOfWeek: 1, periodNumber: 6, subjectName: 'الحاسب الآلي', startTime: '11:10', endTime: '11:50' },

  // الثلاثاء
  { dayOfWeek: 2, periodNumber: 1, subjectName: 'القرآن الكريم', startTime: '07:30', endTime: '08:10' },
  { dayOfWeek: 2, periodNumber: 2, subjectName: 'الرياضيات', startTime: '08:10', endTime: '08:50' },
  { dayOfWeek: 2, periodNumber: 3, subjectName: 'لغتي العربية', startTime: '08:50', endTime: '09:30' },
  { dayOfWeek: 2, periodNumber: 4, subjectName: 'التربية الإسلامية', startTime: '09:50', endTime: '10:30' },
  { dayOfWeek: 2, periodNumber: 5, subjectName: 'الاجتماعيات', startTime: '10:30', endTime: '11:10' },
  { dayOfWeek: 2, periodNumber: 6, subjectName: 'التربية الفنية', startTime: '11:10', endTime: '11:50' },

  // الأربعاء
  { dayOfWeek: 3, periodNumber: 1, subjectName: 'لغتي العربية', startTime: '07:30', endTime: '08:10' },
  { dayOfWeek: 3, periodNumber: 2, subjectName: 'العلوم', startTime: '08:10', endTime: '08:50' },
  { dayOfWeek: 3, periodNumber: 3, subjectName: 'الرياضيات', startTime: '08:50', endTime: '09:30' },
  { dayOfWeek: 3, periodNumber: 4, subjectName: 'القرآن الكريم', startTime: '09:50', endTime: '10:30' },
  { dayOfWeek: 3, periodNumber: 5, subjectName: 'الحاسب الآلي', startTime: '10:30', endTime: '11:10' },
  { dayOfWeek: 3, periodNumber: 6, subjectName: 'التربية البدنية', startTime: '11:10', endTime: '11:50' },

  // الخميس
  { dayOfWeek: 4, periodNumber: 1, subjectName: 'التربية الإسلامية', startTime: '07:30', endTime: '08:10' },
  { dayOfWeek: 4, periodNumber: 2, subjectName: 'لغتي العربية', startTime: '08:10', endTime: '08:50' },
  { dayOfWeek: 4, periodNumber: 3, subjectName: 'الرياضيات', startTime: '08:50', endTime: '09:30' },
  { dayOfWeek: 4, periodNumber: 4, subjectName: 'الاجتماعيات', startTime: '09:50', endTime: '10:30' },
  { dayOfWeek: 4, periodNumber: 5, subjectName: 'العلوم', startTime: '10:30', endTime: '11:10' },
  { dayOfWeek: 4, periodNumber: 6, subjectName: 'القرآن الكريم', startTime: '11:10', endTime: '11:50' },
];

export const SUBJECT_COLORS: Record<string, string> = {
  'لغتي العربية':    'bg-blue-500/20 text-blue-700 border-blue-300',
  'الرياضيات':       'bg-green-500/20 text-green-700 border-green-300',
  'التربية الإسلامية':'bg-amber-500/20 text-amber-700 border-amber-300',
  'القرآن الكريم':   'bg-emerald-500/20 text-emerald-700 border-emerald-300',
  'العلوم':           'bg-cyan-500/20 text-cyan-700 border-cyan-300',
  'التربية الفنية':   'bg-pink-500/20 text-pink-700 border-pink-300',
  'التربية البدنية':  'bg-orange-500/20 text-orange-700 border-orange-300',
  'الحاسب الآلي':    'bg-violet-500/20 text-violet-700 border-violet-300',
  'الاجتماعيات':     'bg-rose-500/20 text-rose-700 border-rose-300',
  'فسحة 🌤️':         'bg-yellow-300/30 text-yellow-700 border-yellow-300',
};

export function normalizeArabicDay(dayStr: any): number {
  if (typeof dayStr === 'number') return dayStr >= 0 && dayStr <= 4 ? dayStr : 0;
  if (!dayStr || typeof dayStr !== 'string') return 0;
  const clean = dayStr.replace(/يوم\s*/g, '').replace(/[:\-]/g, '').trim();
  if (clean.includes('أحد') || clean.includes('احد')) return 0;
  if (clean.includes('اثنين') || clean.includes('إثنين') || clean.includes('ثنين')) return 1;
  if (clean.includes('ثلاثاء') || clean.includes('ثلاثا')) return 2;
  if (clean.includes('أربعاء') || clean.includes('اربعاء')) return 3;
  if (clean.includes('خميس')) return 4;
  return 0;
}

export const DAY_MAP_AR_TO_NUM: Record<string, number> = {
  'الأحد': 0,
  'الاثنين': 1,
  'الإثنين': 1,
  'الثلاثاء': 2,
  'الأربعاء': 3,
  'الخميس': 4,
};

export const DAY_MAP_NUM_TO_AR: Record<number, string> = {
  0: 'الأحد',
  1: 'الاثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
};

export function parseSlotsToPeriods(slots: any[]): Period[] {
  if (!Array.isArray(slots) || slots.length === 0) return DEFAULT_SCHEDULE;
  
  return slots.map((s) => {
    let dayNum = 0;
    if (typeof s.dayOfWeek === 'number') {
      dayNum = s.dayOfWeek;
    } else if (s.day) {
      dayNum = normalizeArabicDay(s.day);
    }

    return {
      dayOfWeek: dayNum,
      periodNumber: Number(s.period || s.periodNumber || 1),
      subjectName: String(s.subject || s.subjectName || 'حصة دراسية').trim(),
      startTime: String(s.startTime || '07:30').trim(),
      endTime: String(s.endTime || '08:10').trim(),
      teacherName: s.teacher || s.teacherName,
    };
  });
}

export function getSavedSchedule(): Period[] {
  if (typeof window === 'undefined') return DEFAULT_SCHEDULE;
  try {
    const parsed = readCloudCache<any>('masar_smart_schedule_v1')[0];
    if (!parsed) return DEFAULT_SCHEDULE;
    if (parsed && Array.isArray(parsed.slots) && parsed.slots.length > 0) {
      const hasRealSubjects = parsed.slots.some((s: any) => {
        const sub = s.subject || s.subjectName;
        return sub && sub !== 'درس حر' && sub !== 'حصة دراسية';
      });
      if (!hasRealSubjects) return DEFAULT_SCHEDULE;
      return parseSlotsToPeriods(parsed.slots);
    }
    return DEFAULT_SCHEDULE;
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

export function getTodayPeriods(schedule: Period[]): Period[] {
  const jsDay = new Date().getDay(); // 0=Sun…6=Sat
  if (jsDay === 5 || jsDay === 6) return []; // جمعة وسبت إجازة
  return schedule.filter((p) => p.dayOfWeek === jsDay).sort((a, b) => a.periodNumber - b.periodNumber);
}

export function getCurrentPeriod(schedule: Period[]): Period | null {
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const todays = getTodayPeriods(schedule);
  return todays.find((p) => hhmm >= p.startTime && hhmm < p.endTime) ?? null;
}

export function getMinutesUntilDismissal(schedule: Period[]): number {
  const todays = getTodayPeriods(schedule);
  if (!todays.length) return -1;
  const lastPeriod = todays[todays.length - 1];
  const [h, m] = lastPeriod.endTime.split(':').map(Number);
  const now = new Date();
  const dismissal = new Date(now);
  dismissal.setHours(h, m, 0, 0);
  return Math.floor((dismissal.getTime() - now.getTime()) / 60000);
}
