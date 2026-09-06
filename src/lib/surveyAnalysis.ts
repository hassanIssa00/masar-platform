import type { ReportRecord, SurveySubmission } from './cloudStore';

export type QuestionOption = string;

export interface SurveyQuestion {
  id: string;
  text: string;
  type: 'select' | 'radio' | 'scale';
  options?: QuestionOption[];
}

export interface SurveySection {
  id: string;
  title: string;
  icon: string;
  questions: SurveyQuestion[];
}

export const SECTIONS: SurveySection[] = [
  {
    id: 'general',
    title: 'معلومات عامة',
    icon: '1',
    questions: [
      { id: 'q1', text: 'ما هو عمر الطفل؟', type: 'select', options: ['3 سنوات', '4 سنوات', '5 سنوات', '6 سنوات', '7 سنوات', '8 سنوات', '9 سنوات', '10 سنوات', '11 سنوات', '12 سنوات'] },
      { id: 'q2', text: 'ما الصف الدراسي الحالي؟', type: 'select', options: ['ما قبل المدرسة', 'الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس'] },
      { id: 'q3', text: 'هل الطفل من ذوي الاحتياجات الخاصة؟', type: 'radio', options: ['نعم', 'لا', 'غير مؤكد'] },
      { id: 'q4', text: 'هل توجد إصابات أو أمراض مزمنة؟', type: 'radio', options: ['نعم', 'لا'] },
      { id: 'q36', text: 'طريقة الولادة؟', type: 'radio', options: ['طبيعية', 'قيصرية', 'غير متأكد'] },
      { id: 'q37', text: 'رقم الطفل في ترتيب الأسرة؟', type: 'select', options: ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس أو أكثر'] },
      { id: 'q38', text: 'هل تعرض الطفل لصدمة نفسية أو حادث مؤثر؟', type: 'radio', options: ['نعم', 'لا', 'غير متأكد'] },
      { id: 'q39', text: 'هل ينام الطفل عدد ساعات كافية اليوم؟', type: 'radio', options: ['غالباً', 'أحياناً', 'نادراً'] },
      { id: 'q22', text: 'هل يستخدم الطفل الأجهزة لفترات طويلة يومياً؟', type: 'radio', options: ['أكثر من ساعتين', 'ساعة تقريباً', 'قليل جداً'] },
      { id: 'q23', text: 'ما اللغة الأكثر استخداماً في البيت؟', type: 'select', options: ['العربية', 'العربية والإنجليزية', 'الإنجليزية غالباً', 'لغة أخرى'] },
    ],
  },
  {
    id: 'language',
    title: 'المهارات اللغوية',
    icon: '2',
    questions: [
      { id: 'q5', text: 'هل يواجه الطفل صعوبة في نطق الحروف بشكل صحيح؟', type: 'radio', options: ['نعم دائماً', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q6', text: 'هل يتلعثم أو يتأتأ عند الكلام؟', type: 'radio', options: ['نعم دائماً', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q7', text: 'هل يستطيع قراءة جمل بسيطة؟', type: 'radio', options: ['نعم بطلاقة', 'نعم ببطء', 'بصعوبة', 'لا'] },
      { id: 'q8', text: 'كيف تقيّم ثروته اللغوية مقارنة بأقرانه؟', type: 'scale' },
      { id: 'q24', text: 'هل يفهم التعليمات الشفهية من خطوتين؟', type: 'radio', options: ['نعم', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q25', text: 'هل يحكي ما حدث في المدرسة جملاً واضحة؟', type: 'radio', options: ['نعم', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q26', text: 'هل يخلط بين أصوات حروف مثل س/ص أو ت/ط؟', type: 'radio', options: ['دائماً', 'أحياناً', 'نادراً', 'لا'] },
    ],
  },
  {
    id: 'social',
    title: 'المهارات الاجتماعية',
    icon: '3',
    questions: [
      { id: 'q9', text: 'هل يستطيع التفاعل مع أقرانه بشكل طبيعي؟', type: 'radio', options: ['نعم', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q10', text: 'هل يفضل اللعب بمفرده؟', type: 'radio', options: ['دائماً', 'أحياناً', 'نادراً'] },
      { id: 'q11', text: 'هل يعاني من صعوبة في التعبير عن مشاعره؟', type: 'radio', options: ['نعم', 'أحياناً', 'لا'] },
      { id: 'q12', text: 'هل يحافظ على التواصل البصري أثناء الحديث؟', type: 'radio', options: ['نعم دائماً', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q28', text: 'هل يستطيع انتظار دوره في اللعب أو الحديث؟', type: 'radio', options: ['نعم', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q29', text: 'هل يتقبل توجيهات المعلم أو الأخصائي؟', type: 'radio', options: ['غالباً', 'أحياناً', 'بصعوبة', 'يرفض'] },
    ],
  },
  {
    id: 'behavior',
    title: 'السلوك والانتباه',
    icon: '4',
    questions: [
      { id: 'q13', text: 'هل يجد صعوبة في الجلوس هادئاً لفترة؟', type: 'radio', options: ['نعم دائماً', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q14', text: 'هل يصدر سلوكيات متكررة (حركات، أصوات)؟', type: 'radio', options: ['نعم', 'أحياناً', 'لا'] },
      { id: 'q15', text: 'كيف يكون تصرفه عند تغيير الروتين اليومي؟', type: 'radio', options: ['هادئ ومرن', 'قليل الانزعاج', 'منزعج جداً', 'عدوانية أو بكاء شديد'] },
      { id: 'q16', text: 'قيّم مستوى الانتباه والتركيز (1 أضعف - 5 أقوى):', type: 'scale' },
      { id: 'q30', text: 'هل يتأثر الطفل بالأصوات العالية أو الازدحام؟', type: 'radio', options: ['كثيراً', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q31', text: 'هل يحتاج حركة كثيرة أثناء الجلوس للمذاكرة؟', type: 'radio', options: ['دائماً', 'أحياناً', 'نادراً', 'لا'] },
    ],
  },
  {
    id: 'academic',
    title: 'المهارات الأكاديمية',
    icon: '5',
    questions: [
      { id: 'q17', text: 'كيف يؤدي واجباته المدرسية؟', type: 'radio', options: ['باستقلالية تامة', 'بمساعدة بسيطة', 'يحتاج مساعدة كبيرة', 'يرفض تماماً'] },
      { id: 'q18', text: 'هل يواجه صعوبة في الرياضيات؟', type: 'radio', options: ['نعم', 'أحياناً', 'لا'] },
      { id: 'q20', text: 'قيّم مستواه الأكاديمي العام مقارنة بأقرانه:', type: 'scale' },
    ],
  },
];

export const answerScores: Record<string, Record<string, number>> = {
  q3: { نعم: 40, لا: 100, 'غير مؤكد': 60 },
  q4: { نعم: 55, لا: 100 },
  q36: { طبيعية: 100, قيصرية: 85, 'غير متأكد': 70 },
  q38: { نعم: 45, لا: 100, 'غير متأكد': 70 },
  q5: { 'نعم دائماً': 25, أحياناً: 55, نادراً: 80, لا: 100 },
  q6: { 'نعم دائماً': 25, أحياناً: 55, نادراً: 80, لا: 100 },
  q7: { 'نعم بطلاقة': 100, 'نعم ببطء': 75, بصعوبة: 35, لا: 15 },
  q9: { نعم: 100, أحياناً: 70, نادراً: 40, لا: 20 },
  q10: { دائماً: 30, أحياناً: 60, نادراً: 85 },
  q11: { نعم: 30, أحياناً: 60, لا: 100 },
  q12: { 'نعم دائماً': 100, أحياناً: 65, نادراً: 35, لا: 15 },
  q13: { 'نعم دائماً': 25, أحياناً: 55, نادراً: 80, لا: 100 },
  q14: { نعم: 35, أحياناً: 65, لا: 100 },
  q15: { 'هادئ ومرن': 100, 'قليل الانزعاج': 75, 'منزعج جداً': 35, 'عدوانية أو بكاء شديد': 15 },
  q17: { 'باستقلالية تامة': 100, 'بمساعدة بسيطة': 75, 'يحتاج مساعدة كبيرة': 40, 'يرفض تماماً': 15 },
  q18: { نعم: 30, أحياناً: 60, لا: 100 },
  q19: { 'نعم دائماً': 25, أحياناً: 60, لا: 100 },
  q39: { غالباً: 100, أحياناً: 65, نادراً: 35 },
  q22: { 'أكثر من ساعتين': 45, 'ساعة تقريباً': 75, 'قليل جداً': 100 },
  q24: { نعم: 100, أحياناً: 70, نادراً: 40, لا: 20 },
  q25: { نعم: 100, أحياناً: 70, نادراً: 40, لا: 20 },
  q26: { دائماً: 25, أحياناً: 55, نادراً: 80, لا: 100 },
  q27: { نعم: 100, أحياناً: 70, نادراً: 40, لا: 20 },
  q28: { نعم: 100, أحياناً: 70, نادراً: 40, لا: 20 },
  q29: { غالباً: 100, أحياناً: 70, بصعوبة: 40, يرفض: 20 },
  q30: { كثيراً: 30, أحياناً: 60, نادراً: 85, لا: 100 },
  q31: { دائماً: 35, أحياناً: 65, نادراً: 85, لا: 100 },
  q32: { نعم: 100, أحياناً: 70, نادراً: 40, لا: 20 },
  q33: { غالباً: 100, أحياناً: 70, نادراً: 40, لا: 20 },
  q35: { نعم: 100, أحياناً: 75, نادراً: 45, لا: 25 },
};

export function getSurveyQuestionScore(questionId: string, answer: string | number | undefined): number | null {
  if (answer === undefined || answer === '') return null;
  if (['q8', 'q16', 'q20'].includes(questionId)) {
    return Math.max(20, Math.min(100, Number(answer) * 20));
  }
  return answerScores[questionId]?.[String(answer)] ?? null;
}

export function isFirstGrade(grade: string) {
  return grade.includes('الأول') || grade.includes('الاول') || grade.includes('سنة أولى') || grade.includes('سنه اولى');
}

export function getActiveSections(grade: string): SurveySection[] {
  return SECTIONS.map((sectionItem) => ({
    ...sectionItem,
    questions:
      sectionItem.id === 'language' && isFirstGrade(grade)
        ? sectionItem.questions.filter((question) => question.id !== 'q6')
        : sectionItem.questions,
  }));
}

export function averageQuestionScores(questionIds: string[], answers: Record<string, string | number>) {
  const scores = questionIds
    .map((questionId) => getSurveyQuestionScore(questionId, answers[questionId]))
    .filter((score): score is number => score !== null);

  if (!scores.length) return 0;
  return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length);
}

export function getClinicalDomains(answers: Record<string, string | number>) {
  const preferredSupport = String(answers.q34 ?? '');
  const domains = [
    {
      name: 'القراءة والوعي الصوتي',
      score: averageQuestionScores(['q5', 'q7', 'q24', 'q26'], answers),
      note: 'يفحص مؤشرات القراءة الأولية، الوعي الصوتي، وفهم التعليمات الشفهية.',
    },
    {
      name: 'الكتابة والتآزر الحركي',
      score: averageQuestionScores(['q19', 'q32', 'q33'], answers),
      note: 'يفحص إمساك القلم، تحمل المهمة، وتنظيم الواجبات.',
    },
    {
      name: 'الرياضيات ومفهوم العدد',
      score: averageQuestionScores(['q18', 'q20', 'q17'], answers),
      note: preferredSupport.includes('رياض') ? 'ولي الأمر أشار أن الرياضيات هي أكثر مجال يحتاج دعماً.' : 'يفحص الاستقلال الأكاديمي ومؤشرات صعوبة الرياضيات.',
    },
    {
      name: 'السمع والنطق واللغة',
      score: averageQuestionScores(['q5', 'q8', 'q25', 'q26'], answers),
      note: 'يفحص النطق، الطلاقة، الثروة اللغوية، وحكي الأحداث بجمل واضحة.',
    },
    {
      name: 'التواصل الاجتماعي ومؤشرات طيف التوحد',
      score: averageQuestionScores(['q9', 'q10', 'q11', 'q12', 'q27', 'q28', 'q29'], answers),
      note: 'يفحص التفاعل الاجتماعي، التواصل البصري، انتظار الدور، وتقبل التوجيه.',
    },
    {
      name: 'الانتباه والسلوك والتنظيم الحسي',
      score: averageQuestionScores(['q13', 'q14', 'q15', 'q16', 'q30', 'q31', 'q32'], answers),
      note: 'يفحص الانتباه، الحركة الزائدة، الحساسية للأصوات، والمرونة مع الروتين.',
    },
  ];

  return domains.map((domain) => ({
    ...domain,
    note:
      domain.score >= 80
        ? `${domain.note} المؤشر الحالي مطمئن مع متابعة دورية.`
        : domain.score >= 60
          ? `${domain.note} يوجد احتياج متوسط يتطلب قياساً مباشراً.`
          : `${domain.note} أولوية مراجعة مرتفعة قبل اعتماد المسار.`,
  }));
}

export function buildClinicalRecommendations(priorityDomains: Array<{ name: string; score: number }>) {
  const priorities = priorityDomains.map((domain) => domain.name).join('، ');

  return [
    `يبدأ د. إسماعيل بمراجعة المجالات الأقل في الاستبيان: ${priorities}.`,
    'لا يتم إبلاغ الطالب بدرجة أو تشخيص؛ تعرض له رسائل تشجيعية فقط حتى لا يتكون لديه وسم سلبي.',
    'إجراء مقابلة قصيرة للتحقق من القراءة والكتابة والرياضيات مع ملاحظة السلوك والانتباه أثناء المهمة.',
    'عند وجود مؤشرات سمع/نطق أو تواصل اجتماعي منخفضة، يوصى بفحص متخصص أو ملاحظة إكلينيكية مباشرة قبل اعتماد الخطة.',
    'بعد اعتماد الدكتور، يفتح للطالب مسار واحد فقط مناسب: تهجي بسيط، رياضيات محسوسة، تخاطب، سلوك، أو ألعاب تدريبية موجهة.',
  ];
}

export function synthesizeSurveyReports(
  survey: SurveySubmission,
  opts?: {
    parentPhone?: string;
    parentName?: string;
    parentAccountId?: string;
    studentId?: string;
    studentName?: string;
    grade?: string;
  }
): { surveyAnswersReport: ReportRecord; clinicalAnalysisReport: ReportRecord } {
  const grade = opts?.grade || survey.grade || 'الصف الأول';
  const studentId = opts?.studentId || survey.studentId || 'stu-survey';
  const studentName = opts?.studentName || survey.studentName || 'طالب';
  const parentName = opts?.parentName || survey.parentName || '';
  const parentPhone = opts?.parentPhone || survey.parentPhone || '';
  const parentEmail = survey.parentEmail || '';
  const parentAccountId = opts?.parentAccountId;
  const answers = survey.answers || {};

  const activeReportSections = getActiveSections(grade);
  const clinicalDomains = getClinicalDomains(answers);
  const priorityDomains = [...clinicalDomains].sort((first, second) => first.score - second.score).slice(0, 3);
  const priorityText = priorityDomains.map((domain) => `${domain.name} (${domain.score}%)`).join('، ');

  const totalQuestions = activeReportSections.reduce((total, section) => total + section.questions.length, 0);
  const answeredCount = Object.keys(answers).length;
  const surveyScore = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 100;

  const dateStr = survey.submittedAt ? survey.submittedAt.slice(0, 10) : new Date().toISOString().slice(0, 10);

  // Map answers: match question text from activeReportSections, or fallback to key if unknown
  const mappedAnswers = activeReportSections.flatMap((sectionItem) =>
    sectionItem.questions.map((question) => ({
      question: question.text,
      answer: String(answers[question.id] ?? 'لم يتم تسجيل إجابة'),
    }))
  );

  // If there are raw answers that don't match known qIDs, include them
  const knownQids = new Set(activeReportSections.flatMap((s) => s.questions.map((q) => q.id)));
  Object.entries(answers).forEach(([key, val]) => {
    if (!knownQids.has(key)) {
      mappedAnswers.push({
        question: key,
        answer: String(val),
      });
    }
  });

  const surveyAnswersReport: ReportRecord = {
    id: `rep-sa-${survey.id}`,
    studentId,
    studentName,
    grade,
    program: 'إجابات الاستبيان التفصيلية',
    programColor: '#334155',
    date: dateStr,
    score: surveyScore,
    status: 'pending',
    type: 'survey-answers',
    dispatchedToParent: false,
    dispatchedByDoctor: false,
    summary: 'ملف إجابات تفصيلي مخصص لد. إسماعيل لمراجعة كل إجابة قبل اعتماد المسار العلاجي.',
    recommendations: [
      'مراجعة الإجابات بجانب المقابلة الإكلينيكية قبل اعتماد أي مسار.',
      'مطابقة إجابات ولي الأمر مع أداء الطالب داخل مهمة قصيرة عند أول مقابلة.',
    ],
    answers: mappedAnswers,
    domains: [],
    parentName,
    parentPhone,
    parentEmail,
    parentAccountId,
    createdAt: survey.submittedAt || new Date().toISOString(),
  };

  const scoredDomains = clinicalDomains.filter((d) => d.score > 0);
  const clinicalScore = scoredDomains.length
    ? Math.round(scoredDomains.reduce((total, domain) => total + domain.score, 0) / scoredDomains.length)
    : 75;

  const clinicalAnalysisReport: ReportRecord = {
    id: `rep-ca-${survey.id}`,
    studentId,
    studentName,
    grade,
    program: 'التقرير التحليلي الشامل',
    programColor: '#4f46e5',
    date: dateStr,
    score: clinicalScore,
    status: 'pending',
    type: 'clinical-analysis',
    dispatchedToParent: false,
    dispatchedByDoctor: false,
    summary: `تم استقبال الاستبيان وتحليل المؤشرات الأولية. أولويات المراجعة التخصصية: ${priorityText}. لا يتم فتح أي منهج للطالب قبل اعتماد د. إسماعيل للمسار المناسب.`,
    recommendations: buildClinicalRecommendations(priorityDomains),
    answers: [],
    domains: clinicalDomains,
    parentName,
    parentPhone,
    parentEmail,
    parentAccountId,
    createdAt: survey.submittedAt || new Date().toISOString(),
  };

  return { surveyAnswersReport, clinicalAnalysisReport };
}
