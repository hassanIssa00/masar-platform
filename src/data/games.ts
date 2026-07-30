export type GameKind = 'targets' | 'collector' | 'racer' | 'memory' | 'paint' | 'snake' | 'piano' | 'focus';

export type GameConfig = {
  slug: string;
  title: string;
  description: string;
  skill: string;
  kind: GameKind;
  color: string;
};

export const games: GameConfig[] = [
  { slug: 'balloon-pop', title: 'فرقعة البالونات', description: 'اضغط الأهداف قبل انتهاء الوقت.', skill: 'سرعة استجابة وانتباه بصري', kind: 'targets', color: '#dc2626' },
  { slug: 'space-collector', title: 'جامع النجوم', description: 'حرّك المركبة واجمع القطع الساقطة.', skill: 'تتبع بصري وتوقيت', kind: 'collector', color: '#4f46e5' },
  { slug: 'car-racer', title: 'سباق المسارات', description: 'غيّر المسار وتجنب العوائق.', skill: 'تخطيط حركي وسرعة قرار', kind: 'racer', color: '#059669' },
  { slug: 'memory-match', title: 'ذاكرة الألوان', description: 'اكشف البطاقات وطابق الأزواج.', skill: 'ذاكرة عاملة وتركيز', kind: 'memory', color: '#b45309' },
  { slug: 'paint-studio', title: 'استوديو الرسم', description: 'ارسم بحرية باستخدام القلم والألوان.', skill: 'تحكم دقيق بالقلم', kind: 'paint', color: '#be185d' },
  { slug: 'target-ring', title: 'تنشين الأهداف', description: 'اضغط الدوائر المتحركة بدقة.', skill: 'دقة بصرية حركية', kind: 'targets', color: '#7c3aed' },
  { slug: 'snake', title: 'مسار التركيز', description: 'اجمع النقاط دون لمس الحواف.', skill: 'تخطيط وتسلسل', kind: 'snake', color: '#0f766e' },
  { slug: 'piano', title: 'بيانو النغمات', description: 'اضغط المفاتيح واستمع للنغمات.', skill: 'تمييز سمعي وإيقاع', kind: 'piano', color: '#2563eb' },
];

export function getGame(slug: string) {
  return games.find((game) => game.slug === slug) ?? games[0];
}
