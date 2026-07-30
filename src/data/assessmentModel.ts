export type RiskLevel = 'low' | 'moderate' | 'high';

export type DomainScore = {
  name: string;
  score: number;
  note: string;
};

export type DecisionRule = {
  range: string;
  label: string;
  action: string;
  intensity: 'maintenance' | 'targeted' | 'intensive' | 'diagnostic';
};

export const assessmentPrinciples = [
  {
    title: 'تعليم صريح ومتدرج',
    detail: 'مهارة واحدة في كل مرة: نمذجة قصيرة، تدريب موجه، ثم قياس إتقان قبل فتح المهارة التالية.',
  },
  {
    title: 'تمثيل بصري ومحسوس',
    detail: 'في الرياضيات ينتقل الطالب من المحسوس إلى الرسم ثم الرمز، وفي القراءة من الصوت إلى الحرف ثم الكلمة.',
  },
  {
    title: 'تعديل الخطة بالبيانات',
    detail: 'التقرير يحدد المجال الأضعف، نوع التدخل، معيار الإتقان، وموعد إعادة القياس الأسبوعي.',
  },
  {
    title: 'تصميم مناسب لكل طالب',
    detail: 'اختيارات قليلة وواضحة، صوت عربي مناسب، صور، تباين عال، وخطوات قصيرة لتقليل الحمل المعرفي.',
  },
  {
    title: 'سياق سعودي قريب',
    detail: 'الأمثلة والكلمات والمواقف مرتبطة بالبيت والمدرسة والبيئة السعودية حتى يشعر الطالب أن المحتوى يخصه.',
  },
];

export const decisionRules: DecisionRule[] = [
  {
    range: '90% فأكثر',
    label: 'إتقان وانتقال',
    action: 'ينتقل الطالب للمهارة التالية مع مراجعة متباعدة وسؤال تثبيت قصير في بداية الجلسة القادمة.',
    intensity: 'maintenance',
  },
  {
    range: '75%-89%',
    label: 'انتقال موجه',
    action: 'ينتقل الطالب تدريجياً مع تدريب قصير على الأخطاء المتكررة وعدم إغلاق المهارة إلا بعد ثبات الأداء.',
    intensity: 'targeted',
  },
  {
    range: '60%-74%',
    label: 'تدريب علاجي مركز',
    action: 'يبقى الطالب على نفس المجال مع أنشطة محسوسة وتغذية راجعة فورية وإعادة قياس بعد 5 دروس قصيرة.',
    intensity: 'intensive',
  },
  {
    range: 'أقل من 60%',
    label: 'إعادة تدريس وتشخيص دقيق',
    action: 'يعاد تقديم المهارات الأساسية بخطوات أصغر مع فحص السمع/النطق/الانتباه عند تكرار الضعف.',
    intensity: 'diagnostic',
  },
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
  if (score >= 90) return decisionRules[0];
  if (score >= 75) return decisionRules[1];
  if (score >= 60) return decisionRules[2];
  return decisionRules[3];
}

export function getDomainInterpretation(score: number) {
  if (score >= 85) {
    return 'إتقان مستقر: استخدم مراجعة متباعدة وافتح المهارة التالية.';
  }

  if (score >= 70) {
    return 'أساس جيد مع أخطاء محددة: يحتاج تدريباً موجهاً قصيراً قبل الانتقال الكامل.';
  }

  if (score >= 50) {
    return 'فجوة جزئية: يحتاج نمذجة صريحة وتمارين قليلة متكررة حتى يثبت الأداء.';
  }

  return 'أولوية تدخل عالية: ابدأ بمحسوسات وصور وأوامر قصيرة وسجل نوع المساعدة المطلوبة.';
}

export function enrichDomains(domains: DomainScore[]) {
  return domains.map((domain) => ({
    ...domain,
    note: `${domain.note}. ${getDomainInterpretation(domain.score)}`,
  }));
}

export function getPriorityDomains(domains: DomainScore[], limit = 2) {
  return [...domains]
    .sort((first, second) => first.score - second.score)
    .slice(0, limit);
}

export function buildPlacementSummary({
  assessmentTitle,
  score,
  domains,
  correctCount,
  total,
}: {
  assessmentTitle: string;
  score: number;
  domains: DomainScore[];
  correctCount: number;
  total: number;
}) {
  const decision = getDecisionFromScore(score);
  const priorities = getPriorityDomains(domains, 2);
  const priorityText = priorities.map((domain) => `${domain.name} (${domain.score}%)`).join('، ');

  return `${assessmentTitle}: أجاب الطالب إجابة صحيحة عن ${correctCount} من ${total} أسئلة، بنسبة ${score}%. القرار التعليمي: ${decision.label}. أولويات التدخل الحالية: ${priorityText}.`;
}

export function buildPlacementRecommendations(score: number, domains: DomainScore[]) {
  const decision = getDecisionFromScore(score);
  const priorities = getPriorityDomains(domains, 2);
  const weakDomains = priorities.map((domain) => domain.name).join(' و ');
  const firstPriority = priorities[0]?.name ?? 'المجال الأضعف';

  return [
    decision.action,
    `ابدأ بخطة 4 أسابيع على ${weakDomains}: هدف واحد في كل جلسة، مثال مصور، تدريب قصير، ثم سؤال إتقان.`,
    `لا تفتح مهارة جديدة داخل المسار إلا بعد وصول ${firstPriority} إلى 80% في قياسين متتاليين.`,
    'استخدم أمثلة سعودية قريبة من الطفل: المدرسة، المصحف، التمر، النخلة، الأسرة، المقصف، والحي.',
    score < 60
      ? 'نفذ إعادة تدريس يومية قصيرة 15-20 دقيقة مع تقليل الاختيارات وتقديم صوت وصورة قبل السؤال.'
      : 'استمر في التدريب الموجه 3 مرات أسبوعياً مع مراجعة متباعدة للأخطاء التي ظهرت في التقرير.',
    'أعد القياس بعد 5 دروس أو أسبوع واحد وسجل: الدقة، زمن الإجابة، ونوع المساعدة المطلوبة.',
  ];
}
