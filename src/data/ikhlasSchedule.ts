// جدول الحصص الأسبوعي — مدارس الإخلاص الأهلية بجدة
// يُستخدَم من الـ Frontend ويُزامَن مع قاعدة البيانات

export type Period = {
  dayOfWeek: number; // 0=الأحد … 4=الخميس
  periodNumber: number; // 1-7
  subjectName: string;
  startTime: string;
  endTime: string;
  teacherName?: string;
};

export const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

// جدول افتراضي — يتم استبداله بالجدول الحقيقي من الـ API
export const DEFAULT_SCHEDULE: Period[] = [
  // الأحد
  { dayOfWeek: 0, periodNumber: 1, subjectName: 'لغتي العربية', startTime: '07:30', endTime: '08:10' },
  { dayOfWeek: 0, periodNumber: 2, subjectName: 'الرياضيات', startTime: '08:10', endTime: '08:50' },
  { dayOfWeek: 0, periodNumber: 3, subjectName: 'التربية الإسلامية', startTime: '08:50', endTime: '09:30' },
  { dayOfWeek: 0, periodNumber: 4, subjectName: 'فسحة 🌤️', startTime: '09:30', endTime: '09:50', teacherName: 'استراحة' },
  { dayOfWeek: 0, periodNumber: 5, subjectName: 'العلوم', startTime: '09:50', endTime: '10:30' },
  { dayOfWeek: 0, periodNumber: 6, subjectName: 'التربية الفنية', startTime: '10:30', endTime: '11:10' },
  { dayOfWeek: 0, periodNumber: 7, subjectName: 'القرآن الكريم', startTime: '11:10', endTime: '11:50' },
  // الاثنين
  { dayOfWeek: 1, periodNumber: 1, subjectName: 'الرياضيات', startTime: '07:30', endTime: '08:10' },
  { dayOfWeek: 1, periodNumber: 2, subjectName: 'لغتي العربية', startTime: '08:10', endTime: '08:50' },
  { dayOfWeek: 1, periodNumber: 3, subjectName: 'التربية الإسلامية', startTime: '08:50', endTime: '09:30' },
  { dayOfWeek: 1, periodNumber: 4, subjectName: 'فسحة 🌤️', startTime: '09:30', endTime: '09:50', teacherName: 'استراحة' },
  { dayOfWeek: 1, periodNumber: 5, subjectName: 'التربية البدنية', startTime: '09:50', endTime: '10:30' },
  { dayOfWeek: 1, periodNumber: 6, subjectName: 'العلوم', startTime: '10:30', endTime: '11:10' },
  { dayOfWeek: 1, periodNumber: 7, subjectName: 'الحاسب الآلي', startTime: '11:10', endTime: '11:50' },
  // الثلاثاء
  { dayOfWeek: 2, periodNumber: 1, subjectName: 'القرآن الكريم', startTime: '07:30', endTime: '08:10' },
  { dayOfWeek: 2, periodNumber: 2, subjectName: 'الرياضيات', startTime: '08:10', endTime: '08:50' },
  { dayOfWeek: 2, periodNumber: 3, subjectName: 'لغتي العربية', startTime: '08:50', endTime: '09:30' },
  { dayOfWeek: 2, periodNumber: 4, subjectName: 'فسحة 🌤️', startTime: '09:30', endTime: '09:50', teacherName: 'استراحة' },
  { dayOfWeek: 2, periodNumber: 5, subjectName: 'التربية الإسلامية', startTime: '09:50', endTime: '10:30' },
  { dayOfWeek: 2, periodNumber: 6, subjectName: 'الاجتماعيات', startTime: '10:30', endTime: '11:10' },
  { dayOfWeek: 2, periodNumber: 7, subjectName: 'التربية الفنية', startTime: '11:10', endTime: '11:50' },
  // الأربعاء
  { dayOfWeek: 3, periodNumber: 1, subjectName: 'لغتي العربية', startTime: '07:30', endTime: '08:10' },
  { dayOfWeek: 3, periodNumber: 2, subjectName: 'العلوم', startTime: '08:10', endTime: '08:50' },
  { dayOfWeek: 3, periodNumber: 3, subjectName: 'الرياضيات', startTime: '08:50', endTime: '09:30' },
  { dayOfWeek: 3, periodNumber: 4, subjectName: 'فسحة 🌤️', startTime: '09:30', endTime: '09:50', teacherName: 'استراحة' },
  { dayOfWeek: 3, periodNumber: 5, subjectName: 'القرآن الكريم', startTime: '09:50', endTime: '10:30' },
  { dayOfWeek: 3, periodNumber: 6, subjectName: 'الحاسب الآلي', startTime: '10:30', endTime: '11:10' },
  { dayOfWeek: 3, periodNumber: 7, subjectName: 'التربية البدنية', startTime: '11:10', endTime: '11:50' },
  // الخميس
  { dayOfWeek: 4, periodNumber: 1, subjectName: 'التربية الإسلامية', startTime: '07:30', endTime: '08:10' },
  { dayOfWeek: 4, periodNumber: 2, subjectName: 'لغتي العربية', startTime: '08:10', endTime: '08:50' },
  { dayOfWeek: 4, periodNumber: 3, subjectName: 'الرياضيات', startTime: '08:50', endTime: '09:30' },
  { dayOfWeek: 4, periodNumber: 4, subjectName: 'فسحة 🌤️', startTime: '09:30', endTime: '09:50', teacherName: 'استراحة' },
  { dayOfWeek: 4, periodNumber: 5, subjectName: 'الاجتماعيات', startTime: '09:50', endTime: '10:30' },
  { dayOfWeek: 4, periodNumber: 6, subjectName: 'العلوم', startTime: '10:30', endTime: '11:10' },
  { dayOfWeek: 4, periodNumber: 7, subjectName: 'القرآن الكريم', startTime: '11:10', endTime: '11:50' },
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
