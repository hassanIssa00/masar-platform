import { ProgramSlug } from './curriculum';

export type AssessmentItem = {
  id: string;
  domain: string;
  skill: string;
  prompt: string;
  speak: string;
  options: string[];
  correct: string;
  scoringNote: string;
};

export type AssessmentBlueprint = {
  slug: ProgramSlug;
  title: string;
  shortPurpose: string;
  image: string;
  domains: string[];
  items: AssessmentItem[];
};

export const assessmentBlueprints: AssessmentBlueprint[] = [
  {
    slug: 'reading',
    title: 'اختبار القراءة التشخيصي',
    shortPurpose: 'يفصل بين الوعي الصوتي، فك الترميز، الإملاء، والفهم بدل درجة عامة واحدة.',
    image: '/learning/literacy-lab.png',
    domains: ['وعي صوتي', 'فك ترميز', 'إملاء', 'فهم'],
    items: [
      {
        id: 'pa-1',
        domain: 'وعي صوتي',
        skill: 'تمييز الصوت الأول',
        prompt: 'أي كلمة تبدأ بصوت ب؟',
        speak: 'استمع جيدا. أي كلمة تبدأ بصوت باء؟ باب. دار. قلم.',
        options: ['باب', 'دار', 'قلم'],
        correct: 'باب',
        scoringNote: 'الخطأ هنا يعني أن التدخل يبدأ سمعيا قبل الحروف المكتوبة.',
      },
      {
        id: 'dec-1',
        domain: 'فك ترميز',
        skill: 'دمج مقطع',
        prompt: 'بَا + ب = ؟',
        speak: 'باء مع ألف: با. ثم باء ساكنة. ما الكلمة؟',
        options: ['باب', 'بيت', 'توت'],
        correct: 'باب',
        scoringNote: 'يقيس الدمج الصوتي لا الحفظ البصري.',
      },
      {
        id: 'spell-1',
        domain: 'إملاء',
        skill: 'اختيار كتابة مسموعة',
        prompt: 'استمع للكلمة واختر كتابتها الصحيحة.',
        speak: 'الكلمة هي: قمر. قمر.',
        options: ['قمر', 'كمر', 'تمر'],
        correct: 'قمر',
        scoringNote: 'تحليل الخطأ يوضح هل المشكلة صوتية أم شكلية.',
      },
      {
        id: 'comp-1',
        domain: 'فهم',
        skill: 'فهم جملة قصيرة',
        prompt: 'قرأ سامي كتابا. ماذا قرأ سامي؟',
        speak: 'قرأ سامي كتابا. ماذا قرأ سامي؟',
        options: ['كتابا', 'تفاحة', 'كرة'],
        correct: 'كتابا',
        scoringNote: 'يفصل بين قراءة الكلمات وفهم معنى الجملة.',
      },
    ],
  },
  {
    slug: 'math',
    title: 'اختبار الرياضيات التشخيصي',
    shortPurpose: 'يفحص مفهوم العدد، التمثيل، العملية، والمسألة اللفظية.',
    image: '/learning/math-lab.png',
    domains: ['مفهوم العدد', 'تمثيل', 'عمليات', 'مسائل'],
    items: [
      {
        id: 'num-1',
        domain: 'مفهوم العدد',
        skill: 'مطابقة الرقم بالكمية',
        prompt: 'كم قطعة تراها لو عدّينا: واحد، اثنان، ثلاثة، أربعة؟',
        speak: 'واحد، اثنان، ثلاثة، أربعة. ما العدد؟',
        options: ['3', '4', '5'],
        correct: '4',
        scoringNote: 'يقيس فهم الكمية وليس ترديد العد فقط.',
      },
      {
        id: 'rep-1',
        domain: 'تمثيل',
        skill: 'تكوين العدد',
        prompt: 'أي اختيار يمثل العدد 5؟',
        speak: 'اختر التمثيل الذي يساوي خمسة.',
        options: ['2 و2', '3 و2', '4 و3'],
        correct: '3 و2',
        scoringNote: 'التكوين المرن للعدد أساس الجمع والطرح.',
      },
      {
        id: 'op-1',
        domain: 'عمليات',
        skill: 'جمع بسيط',
        prompt: '3 + 2 = ؟',
        speak: 'ثلاثة زائد اثنان يساوي؟',
        options: ['4', '5', '6'],
        correct: '5',
        scoringNote: 'لو أخطأ، يبدأ التدخل بخط عدد أو مكعبات.',
      },
      {
        id: 'story-1',
        domain: 'مسائل',
        skill: 'مسألة لفظية',
        prompt: 'مع مريم 4 أقلام وأخذت قلما. كم أصبح معها؟',
        speak: 'مع مريم أربعة أقلام وأخذت قلما. كم أصبح معها؟',
        options: ['3', '5', '6'],
        correct: '5',
        scoringNote: 'يقيس ربط اللغة بالعملية الحسابية.',
      },
    ],
  },
  {
    slug: 'behavior',
    title: 'اختبار السلوك الوظيفي',
    shortPurpose: 'يركز على وظيفة السلوك والبديل المناسب بدل وصف الطفل فقط.',
    image: '/learning/communication-lab.png',
    domains: ['طلب مساعدة', 'انتظار', 'انتقال', 'تنظيم'],
    items: [
      {
        id: 'beh-1',
        domain: 'طلب مساعدة',
        skill: 'اختيار بديل',
        prompt: 'لو المهمة صعبة، ما التصرف الأفضل؟',
        speak: 'لو المهمة صعبة، ماذا تقول؟ أحتاج مساعدة.',
        options: ['أحتاج مساعدة', 'أترك المكان', 'أمزق الورقة'],
        correct: 'أحتاج مساعدة',
        scoringNote: 'التدخل يعلم البديل قبل زيادة صعوبة المهمة.',
      },
      {
        id: 'beh-2',
        domain: 'انتظار',
        skill: 'انتظار الدور',
        prompt: 'عندما ينتظر الطالب دوره، ماذا يفعل؟',
        speak: 'عندما أنتظر دوري، أضع يدي بهدوء وأنظر للبطاقة.',
        options: ['ينتظر بهدوء', 'يدفع زميله', 'يصرخ'],
        correct: 'ينتظر بهدوء',
        scoringNote: 'يقيس فهم السلوك البديل لا مجرد الطاعة.',
      },
    ],
  },
];

export const getAssessmentBlueprint = (slug: string) =>
  assessmentBlueprints.find((assessment) => assessment.slug === slug) ?? assessmentBlueprints[0];
