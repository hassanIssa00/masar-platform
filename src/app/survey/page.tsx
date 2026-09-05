'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import BrandMark from '@/components/BrandMark';
import { getSession, getStudents, hydrateSessionFromServer, saveAccount, saveReport, saveStudent, saveSurvey, setSession, updateStudent, StudentRecord } from '@/lib/cloudStore';
import { getClassStudents } from '@/lib/classDb';
import { pullCloudDataToLocal, syncDocToCloud } from '@/lib/firestoreSync';
import { findMatchingStudentForParent } from '@/lib/nameMatching';

const SECTIONS = [
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

type Answers = Record<string, string | number>;

const answerScores: Record<string, Record<string, number>> = {
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

function getSurveyQuestionScore(questionId: string, answer: string | number | undefined) {
  if (answer === undefined || answer === '') return null;

  if (['q8', 'q16', 'q20'].includes(questionId)) {
    return Math.max(20, Math.min(100, Number(answer) * 20));
  }

  return answerScores[questionId]?.[String(answer)] ?? null;
}

function isFirstGrade(grade: string) {
  return grade.includes('الأول') || grade.includes('الاول') || grade.includes('سنة أولى') || grade.includes('سنه اولى');
}

function getActiveSections(grade: string) {
  return SECTIONS.map((sectionItem) => ({
    ...sectionItem,
    questions:
      sectionItem.id === 'language' && isFirstGrade(grade)
        ? sectionItem.questions.filter((question) => question.id !== 'q6')
        : sectionItem.questions,
  }));
}

function getSurveyAnalysis(answers: Answers, grade: string) {
  const domains = getActiveSections(grade).map((sectionItem) => {
    const scores = sectionItem.questions
      .map((question) => getSurveyQuestionScore(question.id, answers[question.id]))
      .filter((score): score is number => score !== null);
    const score = scores.length ? Math.round(scores.reduce((total, item) => total + item, 0) / scores.length) : 0;
    const answered = sectionItem.questions.filter((question) => answers[question.id]).length;
    const note =
      score >= 80
        ? 'مؤشرات مطمئنة مع متابعة دورية.'
        : score >= 60
          ? 'احتياج متوسط يحتاج تدريباً منظماً.'
          : 'أولوية تدخل ومراجعة أخصائي.';

    return {
      name: sectionItem.title,
      score,
      note: `${answered} من ${sectionItem.questions.length} إجابات. ${note}`,
    };
  });
  const scoredDomains = domains.filter((domain) => domain.score > 0);
  const score = scoredDomains.length ? Math.round(scoredDomains.reduce((total, item) => total + item.score, 0) / scoredDomains.length) : 0;
  const priorities = [...scoredDomains].sort((first, second) => first.score - second.score).slice(0, 2);
  const priorityNames = priorities.map((item) => item.name).join(' و ') || 'المجالات الأساسية';

  return {
    score,
    domains,
    summary: `تحليل الاستبيان يشير إلى مؤشر جاهزية ${score}%. المجالات التي تحتاج متابعة أولاً: ${priorityNames}. هذه النتيجة لا تمثل تشخيصاً طبياً نهائياً، لكنها توجه جلسة التقييم المباشر.`,
    recommendations: [
      `ابدأ المقابلة التشخيصية بمراجعة ${priorityNames} وربطها بأداء الطالب داخل الفصل والبيت.`,
      'حوّل كل مجال ضعيف إلى هدف قابل للقياس: دقة الأداء، زمن الاستجابة، ونوع المساعدة.',
      'استخدم أنشطة قصيرة بصوت واضح وصورة قبل السؤال، خصوصاً مع الطلاب الذين يظهر عليهم تشتت أو حساسية حسية.',
      'أرسل لولي الأمر مهمة منزلية بسيطة من البيئة السعودية لمدة 5 دقائق يومياً وسجل الاستجابة.',
      'أعد الاستبيان بعد 4 أسابيع وقارن المجال الأضعف قبل وبعد الخطة.',
    ],
  };
}

function averageQuestionScores(questionIds: string[], answers: Answers) {
  const scores = questionIds
    .map((questionId) => getSurveyQuestionScore(questionId, answers[questionId]))
    .filter((score): score is number => score !== null);

  if (!scores.length) return 0;
  return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length);
}

function getClinicalDomains(answers: Answers) {
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

function buildClinicalRecommendations(priorityDomains: Array<{ name: string; score: number }>) {
  const priorities = priorityDomains.map((domain) => domain.name).join('، ');

  return [
    `يبدأ د. إسماعيل بمراجعة المجالات الأقل في الاستبيان: ${priorities}.`,
    'لا يتم إبلاغ الطالب بدرجة أو تشخيص؛ تعرض له رسائل تشجيعية فقط حتى لا يتكون لديه وسم سلبي.',
    'إجراء مقابلة قصيرة للتحقق من القراءة والكتابة والرياضيات مع ملاحظة السلوك والانتباه أثناء المهمة.',
    'عند وجود مؤشرات سمع/نطق أو تواصل اجتماعي منخفضة، يوصى بفحص متخصص أو ملاحظة إكلينيكية مباشرة قبل اعتماد الخطة.',
    'بعد اعتماد الدكتور، يفتح للطالب مسار واحد فقط مناسب: تهجي بسيط، رياضيات محسوسة، تخاطب، سلوك، أو ألعاب تدريبية موجهة.',
  ];
}

export default function SurveyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <SurveyContent />
    </Suspense>
  );
}

function SurveyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [studentName, setStudentName] = useState('');
  const [grade, setGrade] = useState('الصف الأول');
  const [parentPhone, setParentPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const activeSections = getActiveSections(grade);
  const section = activeSections[currentSection];
  const totalQuestions = activeSections.reduce((total, item) => total + item.questions.length, 0);
  const answeredCount = activeSections.flatMap((item) => item.questions).filter((question) => answers[question.id] !== undefined && answers[question.id] !== '').length;
  const sectionAnsweredCount = section.questions.filter((question) => answers[question.id] !== undefined && answers[question.id] !== '').length;
  const isCurrentSectionComplete = sectionAnsweredCount === section.questions.length;
  const progress = Math.round((answeredCount / totalQuestions) * 100);

  useEffect(() => {
    let cancelled = false;
    const loadSurveyStudent = async () => {
      await pullCloudDataToLocal(['students', 'accounts', 'reports', 'classStudents']).catch(() => {});
      if (cancelled) return;
      const session = getSession() ?? await hydrateSessionFromServer();
      if (cancelled) return;

      const requested = searchParams.get('student');
      const allStudents = [...getStudents(), ...getClassStudents()] as unknown as StudentRecord[];
      const realStudents = allStudents.filter(s => s.fullName && !s.fullName.includes('جديد') && !s.fullName.includes('الاستبيان') && s.fullName !== 'طالب');
      const linkedStudentId = (session as any)?.linkedStudentId;
      let found = requested ? allStudents.find((s) => s.id === requested) : null;
      if (!found && linkedStudentId) {
        found = allStudents.find((s) => s.id === linkedStudentId) || null;
      }
      if (!found && session) {
        found = session.role === 'parent'
          ? findMatchingStudentForParent(session, allStudents)
          : allStudents.find((s) =>
            (session.id && (s.id === session.id || s.studentAccountId === session.id || s.linkedStudentId === session.id)) ||
            (session.email && [s.email, s.recoveryEmail, s.linkedStudentEmail].some((mail) => mail?.trim().toLowerCase() === session.email.trim().toLowerCase()))
          ) ?? null;
      }
      if (!found && realStudents.length > 0) {
        found = realStudents[0];
      }

      if (found) {
        setStudent(found);
        setStudentName(found.fullName);
        setGrade(found.grade || 'الصف الأول');
        setParentPhone(found.parentPhone ?? '');
      }
    };
    void loadSurveyStudent();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (currentSection >= activeSections.length) {
      setCurrentSection(Math.max(0, activeSections.length - 1));
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeSections.length, currentSection]);

  const setAnswer = (qid: string, val: string | number) => {
    setAnswers(prev => ({ ...prev, [qid]: val }));
  };

  const handleSubmit = async () => {
    const activeReportSections = getActiveSections(grade);
    const clinicalDomains = getClinicalDomains(answers);
    const priorityDomains = [...clinicalDomains].sort((first, second) => first.score - second.score).slice(0, 3);
    const priorityText = priorityDomains.map((domain) => `${domain.name} (${domain.score}%)`).join('، ');
    
    const requestedId = searchParams.get('student');
    const targetId = student?.id || requestedId || undefined;
    const all = [...getStudents(), ...getClassStudents()] as unknown as StudentRecord[];
    const realStudents = all.filter(s => s.fullName && !s.fullName.includes('جديد') && !s.fullName.includes('الاستبيان') && s.fullName !== 'طالب');
    const existing = (targetId ? all.find((s) => s.id === targetId) : student) || (realStudents.length > 0 ? realStudents[0] : null);
    const session = getSession();
    const branch = (session as any)?.schoolBranch || existing?.schoolBranch || 'MASAR';

    let savedStudent: StudentRecord;
    if (existing) {
      savedStudent = updateStudent(existing.id, {
        fullName: existing.fullName,
        grade: existing.grade || grade,
        parentPhone: existing.parentPhone || parentPhone,
        parentEmail: existing.parentEmail || session?.email,
        parentName: existing.parentName || session?.name,
        ...(session?.role === 'parent' ? {
          parentAccountId: session.id,
          linkedParentId: session.id,
          linkedParentEmail: session.email,
        } : {}),
        linkedStudentId: existing.linkedStudentId || existing.id,
        linkedStudentEmail: existing.linkedStudentEmail || existing.email,
        linkedStudentName: existing.fullName,
        photoUrl: existing.photoUrl,
        dateOfBirth: existing.dateOfBirth,
        nationalId: existing.nationalId,
        schoolBranch: branch,
        reviewStatus: 'awaiting-doctor-review',
      }) ?? existing;
    } else {
      const fallbackName = realStudents[0]?.fullName || studentName.trim() || 'طالب';
      savedStudent = saveStudent({
        id: targetId,
        fullName: fallbackName,
        grade,
        parentPhone,
        parentEmail: session?.email,
        parentName: session?.name,
        ...(session?.role === 'parent' ? {
          parentAccountId: session.id,
          linkedParentId: session.id,
          linkedParentEmail: session.email,
        } : {}),
        schoolBranch: branch,
        reviewStatus: 'awaiting-doctor-review',
        source: branch === 'IKHLAS_JEDDAH' ? 'ikhlas-jeddah' : 'survey',
      });
    }

    await syncDocToCloud('students', savedStudent.id, savedStudent).catch(() => {});
    if (branch === 'IKHLAS_JEDDAH') {
      await syncDocToCloud('class_students', savedStudent.id, savedStudent).catch(() => {});
    }


    const savedSurvey = saveSurvey({
      studentId: savedStudent.id,
      studentName: savedStudent.fullName,
      grade,
      parentName: savedStudent.parentName || session?.name,
      parentPhone: savedStudent.parentPhone || parentPhone,
      parentEmail: savedStudent.parentEmail || session?.email,
      answers,
    });
    await syncDocToCloud('surveys', savedSurvey.id, savedSurvey).catch(() => {});

    const rep1 = saveReport({
      studentId: savedStudent.id,
      studentName: savedStudent.fullName,
      grade,
      program: 'إجابات الاستبيان التفصيلية',
      programColor: '#334155',
      score: Math.round((Object.keys(answers).length / totalQuestions) * 100),
      status: 'pending',
      type: 'survey-answers',
      summary: 'ملف إجابات تفصيلي مخصص لد. إسماعيل لمراجعة كل إجابة قبل اعتماد المسار العلاجي.',
      recommendations: [
        'مراجعة الإجابات بجانب المقابلة الإكلينيكية قبل اعتماد أي مسار.',
        'مطابقة إجابات ولي الأمر مع أداء الطالب داخل مهمة قصيرة عند أول مقابلة.',
      ],
      answers: activeReportSections.flatMap((sectionItem) =>
        sectionItem.questions.map((question) => ({
          question: question.text,
          answer: String(answers[question.id] ?? 'لم يتم تسجيل إجابة'),
        })),
      ),
      domains: [],
    });
    await syncDocToCloud('reports', rep1.id, rep1).catch(() => {});

    const rep2 = saveReport({
      studentId: savedStudent.id,
      studentName: savedStudent.fullName,
      grade,
      program: 'التقرير التحليلي الشامل',
      programColor: '#4f46e5',
      score: Math.round(clinicalDomains.reduce((total, domain) => total + domain.score, 0) / clinicalDomains.length),
      status: 'pending',
      type: 'clinical-analysis',
      summary: `تم استقبال الاستبيان وتحليل المؤشرات الأولية. أولويات المراجعة التخصصية: ${priorityText}. لا يتم فتح أي منهج للطالب قبل اعتماد د. إسماعيل للمسار المناسب.`,
      recommendations: buildClinicalRecommendations(priorityDomains),
      answers: [],
      domains: clinicalDomains,
    });

    const reviewedStudent = updateStudent(savedStudent.id, { reviewStatus: 'awaiting-doctor-review' });
    if (reviewedStudent) {
      await syncDocToCloud('students', reviewedStudent.id, reviewedStudent).catch(() => {});
    }

    // Mark parent onboarding as COMPLETE and link student to parent account
    if (session?.id) {
      // 1. Update local account record (so getSession() returns linkedStudentId)
      const updatedAcc = saveAccount({
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
        phone: session.phone,
        schoolBranch: session.schoolBranch,
        onboardingRequired: false,
        linkedStudentId: savedStudent.id,
        linkedStudentEmail: savedStudent.linkedStudentEmail || savedStudent.email,
        linkedStudentName: savedStudent.fullName,
        linkedParentId: session.role === 'parent' ? session.id : savedStudent.linkedParentId || savedStudent.parentAccountId,
        linkedParentEmail: session.role === 'parent' ? session.email : savedStudent.linkedParentEmail || savedStudent.parentEmail,
      });
      // 2. Update local session cache so hydrateSessionFromServer returns correct data
      setSession(updatedAcc);
      // 3. Sync to cloud Firestore
      void syncDocToCloud('accounts', session.id, updatedAcc);
    }


    setSubmitted(true);
    const currentSession = getSession();
    const flow = searchParams.get('flow') ?? currentSession?.role ?? 'parent';
    if (flow === 'student') {
      router.push(`/assessment?student=${savedStudent.id}&flow=student`);
    } else {
      router.push(branch === 'IKHLAS_JEDDAH' ? `/school-parent?student=${savedStudent.id}` : `/parent?student=${savedStudent.id}`);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex flex-col">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white rounded-3xl shadow-xl p-10 max-w-xl w-full text-center animate-slide-up">
            <div className="mx-auto mb-6 h-12 w-12 rounded-full border-4 border-blue-100 border-t-[#1E6FBF] animate-spin" />
            <h1 className="text-3xl font-bold text-[#1E6FBF] mb-4">تم حفظ استبيان ولي الأمر</h1>
            <p className="text-gray-600 leading-8">جاري فتح بوابة ولي الأمر المناسبة للحساب. اختبار الطالب يظهر فقط عند دخول الطالب أو عند فتحه من لوحة د. إسماعيل.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <BrandMark size="sm" />
          <div className="rounded-full bg-teal-50 px-4 py-2 text-xs font-black text-teal-800">
            استبيان ولي الأمر
          </div>
        </div>
      </header>
      <div className="container mx-auto px-4 py-10 max-w-3xl">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#1E6FBF] mb-2">استبيان ولي الأمر عن الطالب</h1>
          <p className="text-gray-500">هذه الأسئلة يجيب عنها ولي الأمر فقط، وتُحفظ للدكتور في تقرير منفصل عن اختبار الطالب.</p>
        </div>

        {/* Student Info Banner */}
        <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-teal-100 bg-teal-50/70 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-700 text-white font-black text-sm shadow-xs">
              {studentName ? studentName.slice(0, 2) : '📋'}
            </span>
            <div>
              <p className="text-xs font-bold text-slate-500">بيانات الطفل المسجل:</p>
              <h2 className="text-base font-black text-slate-950">{studentName || 'جاري التحميل...'}</h2>
            </div>
          </div>
          <span className="rounded-full bg-white border border-teal-200 px-3.5 py-1 text-xs font-black text-teal-800 shadow-2xs">
            {grade}
          </span>
        </div>

        {/* Current Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
          <div className="bg-[#1E6FBF] p-6 text-white">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span>{section.icon}</span> {section.title}
            </h2>
            <p className="text-white/70 text-sm mt-1">القسم {currentSection + 1} من {activeSections.length} · تم تسجيل {sectionAnsweredCount} من {section.questions.length}</p>
          </div>

          <div className="p-8 space-y-8">
            {section.questions.map((q, qi) => (
              <div key={q.id} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <p className="font-bold text-gray-800 mb-4">{qi + 1}. {q.text}</p>

                {q.type === 'radio' && (
                  <div className="grid grid-cols-2 gap-3">
                    {q.options!.map(opt => (
                      <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${answers[q.id] === opt ? 'border-[#1E6FBF] bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                        <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt}
                          onChange={() => setAnswer(q.id, opt)} className="w-4 h-4 text-[#1E6FBF]" />
                        <span className="font-medium text-gray-700 text-sm">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'select' && (
                  <select value={answers[q.id] as string || ''} onChange={e => setAnswer(q.id, e.target.value)}
                    className="w-full px-4 py-3 border-2 rounded-xl bg-white focus:ring-2 focus:ring-blue-300 outline-none border-gray-200 font-medium">
                    <option value="">اختر...</option>
                    {q.options!.map(opt => <option key={opt}>{opt}</option>)}
                  </select>
                )}

                {q.type === 'scale' && (
                  <div className="flex gap-3 justify-center">
                    {[1, 2, 3, 4, 5].map(v => (
                      <button key={v} onClick={() => setAnswer(q.id, v)}
                        className={`w-14 h-14 rounded-full text-xl font-black border-2 transition-all duration-200 ${answers[q.id] === v ? 'bg-[#1E6FBF] text-white border-[#1E6FBF] scale-110 shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:border-[#1E6FBF] hover:text-[#1E6FBF]'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
            disabled={currentSection === 0}
            className={`px-8 py-3 rounded-xl font-bold transition ${currentSection === 0 ? 'opacity-0 cursor-default' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
            السابق
          </button>
          <span className="text-sm font-bold text-gray-500">{currentSection + 1} / {activeSections.length}</span>
          {currentSection < activeSections.length - 1 ? (
            <button onClick={() => setCurrentSection(currentSection + 1)}
              disabled={!isCurrentSectionComplete}
              className="bg-[#1E6FBF] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#0A3D7A] transition shadow-md disabled:cursor-not-allowed disabled:opacity-40">
              التالي
            </button>
          ) : (
            <button onClick={handleSubmit}
              disabled={answeredCount < totalQuestions}
              className="bg-[#2ECC71] text-white px-8 py-3 rounded-xl font-bold hover:bg-green-600 transition shadow-md disabled:cursor-not-allowed disabled:opacity-40">
              إرسال الاستبيان
            </button>
          )}
        </div>
        {!isCurrentSectionComplete && (
          <p className="mt-3 text-center text-sm font-bold text-amber-700">أكمل أسئلة هذا القسم حتى نقدر نبني تقريراً دقيقاً للدكتور.</p>
        )}
      </div>
    </div>
  );
}
