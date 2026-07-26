import { ProgramSlug } from './curriculum';

export type ActivityKind = 'listen' | 'choose' | 'blend' | 'build' | 'read' | 'routine';

export type StudioActivity = {
  id: string;
  kind: ActivityKind;
  title: string;
  prompt: string;
  speak: string;
  target: string;
  options?: string[];
  correct?: string;
  scaffold: string;
  mastery: string;
};

export type LearningStudioProgram = {
  slug: ProgramSlug;
  title: string;
  childTitle: string;
  color: string;
  background: string;
  method: string;
  teacherFocus: string[];
  stages: {
    id: string;
    title: string;
    childGoal: string;
    checkpoint: string;
    activities: StudioActivity[];
  }[];
};

export const learningStudioPrograms: LearningStudioProgram[] = [
  {
    slug: 'reading',
    title: 'استوديو القراءة',
    childTitle: 'رحلة الأصوات والكلمات',
    color: '#16695f',
    background: '#f5efe3',
    method: 'تعليم صريح ومتدرج: اسمع الصوت، اربطه بالحرف، ادمجه في مقطع، ثم اقرأ كلمة وجملة.',
    teacherFocus: ['وعي صوتي قبل القراءة', 'صوت واحد في كل مرة', 'إتقان 80% قبل الانتقال', 'إملاء قصير بعد القراءة'],
    stages: [
      {
        id: 'sound-letter',
        title: 'الصوت والحرف',
        childGoal: 'أسمع الصوت وأعرف شكله.',
        checkpoint: 'يميز الطفل 8 من 10 أصوات مستهدفة.',
        activities: [
          {
            id: 'ra-sound',
            kind: 'listen',
            title: 'اسمع الصوت',
            prompt: 'اضغط اسمع، ثم كرر: رَ',
            speak: 'رَ. راء مفتوحة. رَ',
            target: 'رَ',
            scaffold: 'لو صعبت، نبدأ بالصوت وحده ثم نضيف الحركة.',
            mastery: '3 محاولات صحيحة متتالية.',
          },
          {
            id: 'find-ra',
            kind: 'choose',
            title: 'اختار الحرف',
            prompt: 'أي حرف يبدأ به صوت رَ؟',
            speak: 'استمع: رَ. اختر حرف الراء.',
            target: 'ر',
            options: ['ز', 'ر', 'د'],
            correct: 'ر',
            scaffold: 'قارن بين ر وز: الراء بدون نقطة.',
            mastery: 'إجابة صحيحة خلال 5 ثوان.',
          },
        ],
      },
      {
        id: 'blend',
        title: 'المقاطع',
        childGoal: 'أركب صوتين وأقرأ مقطعا.',
        checkpoint: 'يقرأ 12 مقطعا بدقة 85%.',
        activities: [
          {
            id: 'ba-bi-bu',
            kind: 'blend',
            title: 'ادمج الأصوات',
            prompt: 'ب + ا = ؟',
            speak: 'باء مع ألف تصبح با. بَا.',
            target: 'بَا',
            options: ['بِ', 'بَا', 'بُ'],
            correct: 'بَا',
            scaffold: 'نطول الحركة: بَ ااا، ثم نقرأها مرة واحدة.',
            mastery: 'يقرأ المقطع دون تهجئة طويلة.',
          },
          {
            id: 'word-bab',
            kind: 'read',
            title: 'اقرأ كلمة',
            prompt: 'بَا + ب = باب',
            speak: 'بَا. بْ. باب.',
            target: 'بَاب',
            scaffold: 'غطي آخر الكلمة ثم اكشفها تدريجيا.',
            mastery: 'قراءة الكلمة 4 مرات بدقة.',
          },
        ],
      },
      {
        id: 'fluency',
        title: 'جملة قصيرة',
        childGoal: 'أقرأ جملة وأفهمها.',
        checkpoint: 'يقرأ جملة من 4 كلمات ويجيب سؤال فهم.',
        activities: [
          {
            id: 'sentence-read',
            kind: 'read',
            title: 'قراءة بفهم',
            prompt: 'رَامِي فَتَحَ بَابَ الدَّارِ.',
            speak: 'رامي فتح باب الدار.',
            target: 'رَامِي فَتَحَ بَابَ الدَّارِ',
            scaffold: 'اقرأ كلمة كلمة، ثم الجملة كاملة بإيقاع طبيعي.',
            mastery: 'قراءة صحيحة ثم إجابة: ماذا فتح رامي؟',
          },
        ],
      },
    ],
  },
  {
    slug: 'math',
    title: 'استوديو الرياضيات',
    childTitle: 'من المكعبات إلى الحل',
    color: '#9a4f2d',
    background: '#f7f0e8',
    method: 'محسوس، مرسوم، رمزي: الطفل يلمس الكمية، يرسمها، ثم يكتب العملية.',
    teacherFocus: ['تطور مفهوم العدد', 'تمثيل بصري قبل الرمز', 'شرح طريقة التفكير', 'مسائل من الحياة اليومية'],
    stages: [
      {
        id: 'quantity',
        title: 'الكمية والعدد',
        childGoal: 'أعرف أن الرقم يعني كمية.',
        checkpoint: 'يمثل 10 أعداد بأشياء حقيقية.',
        activities: [
          {
            id: 'five-count',
            kind: 'build',
            title: 'ابن العدد',
            prompt: 'كوّن العدد 5: كم نقطة تحتاج؟',
            speak: 'خمسة. واحد، اثنان، ثلاثة، أربعة، خمسة.',
            target: '5',
            options: ['3', '5', '7'],
            correct: '5',
            scaffold: 'عد ببطء مع لمس كل نقطة مرة واحدة.',
            mastery: 'مطابقة الرقم بالكمية في 8 من 10 محاولات.',
          },
        ],
      },
      {
        id: 'operations',
        title: 'الجمع والطرح',
        childGoal: 'أحل بالتمثيل ثم أكتب الرمز.',
        checkpoint: 'يحل 10 عمليات مع شرح الطريقة.',
        activities: [
          {
            id: 'add-3-2',
            kind: 'choose',
            title: 'اجمع',
            prompt: '3 + 2 = ؟',
            speak: 'ثلاثة زائد اثنان. نعد: أربعة، خمسة. الناتج خمسة.',
            target: '5',
            options: ['4', '5', '6'],
            correct: '5',
            scaffold: 'ابدأ من العدد الأكبر ثم أكمل العد.',
            mastery: 'يشرح: بدأت من 3 وعددت 2.',
          },
          {
            id: 'story-problem',
            kind: 'read',
            title: 'مسألة قصيرة',
            prompt: 'مع ليان 4 أقلام، أخذت قلما آخر. كم أصبح معها؟',
            speak: 'مع ليان أربعة أقلام. أخذت قلما آخر. أربعة زائد واحد يساوي خمسة.',
            target: '5 أقلام',
            options: ['3 أقلام', '5 أقلام', '6 أقلام'],
            correct: '5 أقلام',
            scaffold: 'ارسم الأقلام ثم أضف قلما واحدا.',
            mastery: 'يحدد البيانات والمطلوب قبل الحل.',
          },
        ],
      },
    ],
  },
  {
    slug: 'speech',
    title: 'استوديو التخاطب',
    childTitle: 'أسمع، أنطق، أتكلم',
    color: '#5b558d',
    background: '#f1eef8',
    method: 'تمييز سمعي ثم إنتاج صوت منفرد، مقطع، كلمة، جملة، ثم كلام تلقائي.',
    teacherFocus: ['صوت واحد مستهدف', 'تصحيح لطيف وفوري', 'تعميم في البيت', 'تسجيل دقة الصوت'],
    stages: [
      {
        id: 'sound-production',
        title: 'الصوت المستهدف',
        childGoal: 'أنطق الصوت بوضوح.',
        checkpoint: 'ينتج الصوت منفردا 8 مرات من 10.',
        activities: [
          {
            id: 'seen-sound',
            kind: 'listen',
            title: 'صوت السين',
            prompt: 'ابتسم، قرب الأسنان، وقل: سسس',
            speak: 'س س س. سمكة. ساعة. سلم.',
            target: 'س',
            scaffold: 'استخدم المرآة وتأكد أن اللسان خلف الأسنان.',
            mastery: 'إنتاج الصوت بدون اندفاع هواء زائد.',
          },
        ],
      },
    ],
  },
  {
    slug: 'behavior',
    title: 'استوديو السلوك',
    childTitle: 'أختار التصرف الأفضل',
    color: '#963f3f',
    background: '#f8ece8',
    method: 'تحليل وظيفة السلوك، تعليم بديل واضح، وتعزيز فوري للسلوك المرغوب.',
    teacherFocus: ['سلوك هدف واحد', 'بديل قابل للتدريب', 'تعزيز ثابت', 'تسجيل تكرار السلوك'],
    stages: [
      {
        id: 'replacement',
        title: 'البديل المناسب',
        childGoal: 'أطلب مساعدة بدل ما أرفض.',
        checkpoint: 'يستخدم جملة بديلة في 4 من 5 مواقف.',
        activities: [
          {
            id: 'ask-break',
            kind: 'routine',
            title: 'اختار الجملة',
            prompt: 'لو المهمة صعبة، ماذا تقول؟',
            speak: 'من فضلك، أحتاج مساعدة. أو: أحتاج استراحة قصيرة.',
            target: 'أحتاج مساعدة',
            options: ['أرمي القلم', 'أحتاج مساعدة', 'أصرخ'],
            correct: 'أحتاج مساعدة',
            scaffold: 'نعطي بطاقة اختيار قبل بداية المهمة.',
            mastery: 'استخدام الجملة قبل ظهور السلوك الصعب.',
          },
        ],
      },
    ],
  },
  {
    slug: 'autism',
    title: 'استوديو التواصل',
    childTitle: 'أطلب، أختار، أنتظر',
    color: '#2d6f8f',
    background: '#eaf3f7',
    method: 'روتين بصري وفرص تواصل وظيفي قصيرة ومتكررة داخل نشاط محبوب.',
    teacherFocus: ['أول/ثم', 'اختياران بصريان', 'تبادل دور', 'قياس محاولات التواصل'],
    stages: [
      {
        id: 'functional-communication',
        title: 'طلب وظيفي',
        childGoal: 'أطلب الشيء الذي أريده.',
        checkpoint: '10 محاولات تواصل وظيفي يوميا.',
        activities: [
          {
            id: 'first-then',
            kind: 'routine',
            title: 'أول ثم',
            prompt: 'أول تدريب قصير، ثم لعبة.',
            speak: 'أول تدريب قصير. ثم لعبة. اختر: أريد اللعبة.',
            target: 'أريد اللعبة',
            options: ['أريد اللعبة', 'لا أعرف', 'أترك المكان'],
            correct: 'أريد اللعبة',
            scaffold: 'اعرض صورتين فقط وقل الجملة نفسها كل مرة.',
            mastery: 'يختار أو يشير دون بكاء أو انسحاب.',
          },
        ],
      },
    ],
  },
  {
    slug: 'learning-difficulties',
    title: 'استوديو المهارات التنفيذية',
    childTitle: 'أفهم المهمة خطوة خطوة',
    color: '#496f3d',
    background: '#eef3e8',
    method: 'تقسيم المهمة، تعليم استراتيجية، تدريب قصير، ثم قياس المساعدة المطلوبة.',
    teacherFocus: ['هدف واحد', 'تعليمات قصيرة', 'ذاكرة عاملة', 'قياس الاستقلالية'],
    stages: [
      {
        id: 'task-steps',
        title: 'خطوات المهمة',
        childGoal: 'أسمع التعليمات وأنفذها بالترتيب.',
        checkpoint: 'ينفذ 3 خطوات بمساعدة بسيطة.',
        activities: [
          {
            id: 'three-steps',
            kind: 'routine',
            title: 'اسمع ونفذ',
            prompt: 'اقرأ الكلمة، ضع دائرة، ثم قل معناها.',
            speak: 'الخطوة الأولى: اقرأ. الخطوة الثانية: ضع دائرة. الخطوة الثالثة: قل المعنى.',
            target: 'اقرأ، دائرة، معنى',
            scaffold: 'استخدم أصابع اليد لتثبيت عدد الخطوات.',
            mastery: 'تنفيذ الخطوات الثلاث دون إعادة التعليمات أكثر من مرة.',
          },
        ],
      },
    ],
  },
];

export const getLearningStudio = (slug: string) =>
  learningStudioPrograms.find((program) => program.slug === slug);
