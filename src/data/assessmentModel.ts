export type RiskLevel = 'low' | 'moderate' | 'high';

export const assessmentPrinciples = [
  {
    title: 'تعليم صريح ومتدرج',
    detail: 'ابدأ بمهارة واحدة، نمذجها، درب الطالب عليها، ثم قس الإتقان قبل الانتقال.',
  },
  {
    title: 'تمثيل بصري ومحسوس',
    detail: 'في الرياضيات ينتقل الطالب من المحسوس إلى الرسم ثم الرمز، وفي القراءة من الصوت إلى الحرف ثم الكلمة.',
  },
  {
    title: 'تعديل الخطة بالبيانات',
    detail: 'التقرير لا يكتفي بدرجة عامة؛ يحدد المجال الأضعف، ونوع التدخل، وموعد إعادة القياس.',
  },
  {
    title: 'تصميم مناسب لكل طالب',
    detail: 'الواجهة تعرض اختيارات واضحة، صوت، تباين عال، وخطوات قصيرة لتقليل الحمل المعرفي.',
  },
];

export const decisionRules = [
  { range: '80% فأكثر', label: 'انتقال مشروط', action: 'ينتقل الطالب للمهارة التالية مع مراجعة متباعدة.' },
  { range: '60%-79%', label: 'تدريب مركز', action: 'يستمر التدريب على نفس المهارة مع تنويع النشاط والتغذية الراجعة.' },
  { range: 'أقل من 60%', label: 'إعادة تدريس', action: 'يعاد تقديم المهارة بنمذجة صريحة ووسائل حسية أبسط.' },
];

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 70) return 'high';
  if (score >= 35) return 'moderate';
  return 'low';
}

export function getRiskLabel(level: RiskLevel) {
  return {
    low: 'احتياج بسيط',
    moderate: 'احتياج متوسط',
    high: 'احتياج مرتفع',
  }[level];
}

export function getDecisionFromScore(score: number) {
  if (score >= 80) return decisionRules[0];
  if (score >= 60) return decisionRules[1];
  return decisionRules[2];
}

