// جدول الحصص الأسبوعي — فصل د. إسماعيل عيسى
// يُستخدَم من الـ Frontend كمصدر الجدول الرسمي المعتمد.

export type Period = {
  dayOfWeek: number; // 0=الأحد … 4=الخميس
  periodNumber: number; // 1-7
  subjectName: string;
  startTime: string;
  endTime: string;
  teacherName?: string;
};

export const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

const PERIOD_TIMES: Record<number, { startTime: string; endTime: string }> = {
  1: { startTime: '07:30', endTime: '08:10' },
  2: { startTime: '08:10', endTime: '08:50' },
  3: { startTime: '08:50', endTime: '09:30' },
  4: { startTime: '09:50', endTime: '10:30' },
  5: { startTime: '10:30', endTime: '11:10' },
  6: { startTime: '11:10', endTime: '11:50' },
  7: { startTime: '11:50', endTime: '12:30' },
};

function period(dayOfWeek: number, periodNumber: number, subjectName: string): Period {
  return {
    dayOfWeek,
    periodNumber,
    subjectName,
    ...PERIOD_TIMES[periodNumber],
  };
}

// جدول الحصص الأسبوعي المعتمد — فصل د. إسماعيل عيسى
// مستخرج من جدول الترم المرسل بتاريخ 2026-08-31. الخانات الفارغة في الصورة غير مدرجة كحصص فعلية.
export const DEFAULT_SCHEDULE: Period[] = [
  // الأحد
  period(0, 1, 'لغتي العربية'),
  period(0, 2, 'الرياضيات'),
  period(0, 4, 'التربية الإسلامية'),
  period(0, 5, 'حياتية'),
  period(0, 7, 'العلوم'),

  // الاثنين
  period(1, 1, 'لغتي العربية'),
  period(1, 2, 'لغتي العربية'),
  period(1, 4, 'الرياضيات'),
  period(1, 5, 'التربية الإسلامية'),
  period(1, 6, 'العلوم'),

  // الثلاثاء
  period(2, 1, 'لغتي العربية'),
  period(2, 2, 'التربية الإسلامية'),
  period(2, 4, 'نشاط'),
  period(2, 5, 'لغتي العربية'),
  period(2, 7, 'نشاط'),

  // الأربعاء
  period(3, 1, 'لغتي العربية'),
  period(3, 2, 'لغتي العربية'),
  period(3, 4, 'الرياضيات'),
  period(3, 5, 'التربية الإسلامية'),

  // الخميس
  period(4, 1, 'الرياضيات'),
  period(4, 2, 'لغتي العربية'),
  period(4, 4, 'الرياضيات'),
  period(4, 5, 'العلوم'),
  period(4, 6, 'التربية الإسلامية'),
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
  'حياتية':          'bg-lime-500/20 text-lime-700 border-lime-300',
  'نشاط':            'bg-fuchsia-500/20 text-fuchsia-700 border-fuchsia-300',
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
  return DEFAULT_SCHEDULE;
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
