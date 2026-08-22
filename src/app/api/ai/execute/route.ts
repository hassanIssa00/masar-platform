import { NextRequest, NextResponse } from 'next/server';
import { callGeminiApi, type GeminiMessage } from '@/lib/gemini';
import { authenticateRequest } from '@/lib/auth/authorization';
import { checkRateLimit, getClientIdentifier, getIpIdentifier } from '@/lib/rateLimit';
import { getAdminDb } from '@/lib/firebaseAdmin.server';

type AiActionType =
  | 'navigate'
  | 'draft_iep'
  | 'draft_homework'
  | 'schedule_review'
  | 'attendance_review'
  | 'report_review'
  | 'message_draft'
  | 'research_note';

type AiAction = {
  type: AiActionType;
  label: string;
  target?: string;
  payload?: Record<string, unknown>;
};

type AuthUser = NonNullable<Awaited<ReturnType<typeof authenticateRequest>>['user']>;

type StudentDoc = {
  id: string;
  fullName?: string;
  name?: string;
  grade?: string;
  parentName?: string;
  parentPhone?: string;
};

const SYSTEM_PROMPT = `
أنت مساعد مسار التنفيذي داخل منصة د. إسماعيل عيسى.
دورك:
1. تجيب على الأسئلة العامة مباشرة وباختصار مفيد.
2. في المهام الإدارية داخل المنصة، ترجع خطة تنفيذ واضحة بخطوات قليلة.
3. لا تكتفي بزر أو رابط إذا كان المستخدم طلب محتوى معرفي أو بحث أو صياغة.
4. لا تستخدم عبارات فارغة مثل "تم تحليل استفسارك" أو "يمكننا دمج الطلب".
5. لا تضع رموز زخرفية أو إيموجي في الرد.
6. عندما تكون الصورة مرفقة، اقرأ محتواها بجدية واشرح ما يمكن استخراجه منها.
7. لو ينقصك اسم طالب أو تاريخ أو مادة، اطلب المعلومة الناقصة فقط.
8. أسلوبك عربي مهني، مباشر، ومناسب لإدارة منصة تعليمية حديثة.

مناطق المنصة:
- الطلاب: /students
- أولياء الأمور: /parents
- التقارير: /reports
- الاختبارات: /assessment
- خطط IEP: /iep
- جدول الجلسات: /calendar
- الرسائل: /messages
- الاجتماعات: /meetings
- فصل د. إسماعيل: /branches/ikhlas-jeddah
`;

const ADMIN_WORDS = [
  'افتح', 'فتح', 'روح', 'اذهب', 'ادخل', 'إدارة', 'ادارة', 'بيانات',
  'ملف', 'سجل', 'أضف', 'اضف', 'احذف', 'حذف', 'عدل', 'عدّل', 'اعتمد',
  'ارسل', 'إرسال', 'ابعث', 'اعمل حساب', 'انشئ حساب', 'أنشئ حساب',
];

const RESEARCH_WORDS = [
  'بحث', 'ابحث', 'دراسة', 'دراسات', 'مقال', 'ملخص علمي', 'اهمية',
  'أهمية', 'فوائد', 'اثر', 'أثر', 'استراتيجيات', 'طرق تدريس',
];

function includesAny(text: string, words: string[]) {
  const normalizedText = normalizeArabic(text);
  return words.some((word) => normalizedText.includes(normalizeArabic(word)));
}

function wantsStudentAdmin(p: string) {
  return includesAny(p, ADMIN_WORDS) && (p.includes('طالب') || p.includes('طلاب'));
}

function wantsParentAdmin(p: string) {
  return includesAny(p, ADMIN_WORDS) && (p.includes('ولي') || p.includes('أولياء') || p.includes('اولياء'));
}

function wantsReports(p: string) {
  return p.includes('تقرير') || p.includes('تقارير') || p.includes('ريبورت');
}

function wantsResearch(p: string) {
  return includesAny(p, RESEARCH_WORDS) && !includesAny(p, ['افتح', 'روح', 'اذهب', 'ادخل']);
}

function wantsMessage(p: string) {
  return p.includes('رسالة') || p.includes('واتساب') || p.includes('ملاحظة لولي') || p.includes('ملاحظه لولي') || p.includes('ابعت') || p.includes('ابعث');
}

function wantsStudentNote(p: string) {
  return (p.includes('ملاحظة') || p.includes('ملاحظه') || p.includes('ملحوظة') || p.includes('ملحوظه'))
    && (p.includes('طالب') || p.includes('الطالب') || p.includes('ملفه') || p.includes('ملف الطالب'));
}

function normalizeArabic(value: string) {
  return value
    .toLowerCase()
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractStudentName(prompt: string) {
  const text = prompt.trim();
  const match = text.match(/(?:الطالب|طالب)\s+(.+?)(?=\s+(?:عنده|عندة|لديه|ليديه|فيه|في ملفه|ملفه|ملاحظة|ملاحظه|ملحوظة|ملحوظه)|[،,.]|$)/i);
  return match?.[1]?.trim() || '';
}

function extractStudentNote(prompt: string) {
  const text = prompt.trim();
  const patterns = [
    /(?:ملاحظة|ملاحظه|ملحوظة|ملحوظه)\s*(?:في ملفه|في ملف الطالب|عن)?\s*(.+)$/i,
    /(?:عنده|عندة|لديه|ليديه)\s+(.+)$/i,
    /(?:اكتب|ضيف|أضف|اضف|سجل)\s+(.+?)\s+(?:في ملف الطالب|في ملفه)$/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  return text.replace(/.*?(?:الطالب|طالب)\s+.+?(?:عنده|عندة|لديه|ليديه)?/i, '').trim();
}

function isStaff(role: string) {
  return role === 'doctor' || role === 'specialist' || role === 'teacher';
}

async function findStudentByName(rawName: string): Promise<StudentDoc | null> {
  const adminDb = getAdminDb();
  if (!adminDb || !rawName) return null;

  const wanted = normalizeArabic(rawName);
  const collections = ['students', 'class_students'];

  for (const collectionName of collections) {
    const snap = await adminDb.collection(collectionName).limit(250).get();
    const candidates = snap.docs.map((docSnap) => {
      const data = docSnap.data() as StudentDoc;
      const displayName = data.fullName || data.name || '';
      const normalized = normalizeArabic(displayName);
      const score = normalized === wanted ? 4 : normalized.includes(wanted) ? 3 : wanted.includes(normalized) ? 2 : 0;
      return { ...data, id: data.id || docSnap.id, score };
    });
    const found = candidates
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)[0];
    if (found) return found;
  }

  return null;
}

async function tryExecuteStudentNote(prompt: string, user: AuthUser): Promise<{ reply: string; actions: AiAction[] } | null> {
  const p = prompt.toLowerCase();
  if (!wantsStudentNote(p)) return null;

  if (!isStaff(user.role)) {
    return {
      reply: 'إضافة الملاحظات في ملفات الطلاب متاحة لد. إسماعيل وفريق التشغيل فقط. يمكنني صياغة الملاحظة لك بدون حفظ إذا أردت.',
      actions: [],
    };
  }

  const studentName = extractStudentName(prompt);
  const noteText = extractStudentNote(prompt);
  if (!studentName || !noteText || normalizeArabic(noteText).length < 4) {
    return {
      reply: 'أحتاج اسم الطالب ونص الملاحظة بوضوح. مثال: الطالب أحمد إبراهيم عنده ملاحظة أنه يحتاج متابعة في القراءة.',
      actions: [{ type: 'navigate', label: 'فتح إدارة الطلاب', target: '/students' }],
    };
  }

  const student = await findStudentByName(studentName);
  if (!student) {
    return {
      reply: `لم أجد طالباً باسم "${studentName}" في السحابة. افتح إدارة الطلاب واختر الطالب الصحيح أو اكتب الاسم كما هو في الملف.`,
      actions: [{ type: 'navigate', label: 'فتح إدارة الطلاب', target: '/students' }],
    };
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return {
      reply: 'تعذر حفظ الملاحظة لأن Firebase Admin غير مضبوط على السيرفر.',
      actions: [],
    };
  }

  const noteId = `note_ai_${Date.now()}`;
  const displayName = student.fullName || student.name || studentName;
  await adminDb.collection('student_notes').doc(noteId).set({
    id: noteId,
    studentId: student.id,
    studentName: displayName,
    text: noteText,
    source: 'ai-assistant',
    createdBy: user.id,
    createdByName: user.name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return {
    reply: [
      `تم حفظ الملاحظة في ملف الطالب: ${displayName}.`,
      '',
      `نص الملاحظة: ${noteText}`,
      '',
      'تقدر تراجعها من إدارة الطلاب داخل سجل الملاحظات.',
    ].join('\n'),
    actions: [{ type: 'navigate', label: 'فتح ملف الطالب في إدارة الطلاب', target: `/students?student=${encodeURIComponent(student.id)}` }],
  };
}

function wantsIep(p: string) {
  return p.includes('iep') || p.includes('خطة فردية') || p.includes('خطة علاج') || p.includes('خطه علاج') || p.includes('خطة تربوية');
}

function wantsHomework(p: string) {
  return p.includes('واجب') || p.includes('تمرين') || p.includes('تصحيح') || p.includes('ورقة عمل');
}

function wantsSchedule(p: string) {
  return p.includes('جدول') || p.includes('حصص') || p.includes('حصة');
}

function wantsAttendance(p: string) {
  return p.includes('حضور') || p.includes('غياب') || p.includes('حضر') || p.includes('التحضير');
}

function parseImage(image: unknown): { mimeType: string; data: string } | undefined {
  if (!image) return undefined;
  if (typeof image === 'object' && image !== null && 'data' in image) {
    const item = image as { mimeType?: string; data?: string };
    if (!item.data || item.data.length > 7_000_000) return undefined;
    return { mimeType: item.mimeType || 'image/png', data: item.data };
  }
  if (typeof image === 'string' && image.includes('base64,')) {
    const [meta, b64] = image.split('base64,');
    if (!b64 || b64.length > 7_000_000) return undefined;
    return { mimeType: meta.match(/data:(.*?);/)?.[1] || 'image/png', data: b64 };
  }
  return undefined;
}

function inferActions(prompt: string, hasImage: boolean): AiAction[] {
  const p = prompt.toLowerCase();
  const actions: AiAction[] = [];
  const add = (action: AiAction) => {
    if (!actions.some((item) => item.type === action.type && item.target === action.target)) actions.push(action);
  };

  if (wantsResearch(p)) add({ type: 'research_note', label: 'إعداد ملخص علمي', target: '/ai-assistant' });
  if (!wantsResearch(p) && wantsStudentAdmin(p)) add({ type: 'navigate', label: 'فتح إدارة الطلاب', target: '/students' });
  if (wantsParentAdmin(p)) add({ type: 'navigate', label: 'فتح أولياء الأمور', target: '/parents' });
  if (wantsReports(p)) add({ type: 'report_review', label: 'فتح التقارير', target: '/reports' });
  if (p.includes('اختبار') || p.includes('تقييم')) add({ type: 'navigate', label: 'فتح اختبارات تحديد المستوى', target: '/assessment' });
  if (wantsIep(p)) add({ type: 'draft_iep', label: 'تجهيز مسودة خطة IEP', target: '/iep' });
  if (wantsHomework(p)) add({ type: 'draft_homework', label: 'تجهيز واجب أو تصحيح', target: '/homework' });
  if (wantsAttendance(p)) add({ type: 'attendance_review', label: 'مراجعة الحضور', target: '/attendance' });
  if (wantsSchedule(p) || (hasImage && (p.includes('جدول') || p.includes('حضور') || p.includes('واجب')))) {
    add({ type: 'schedule_review', label: 'مراجعة الجدول أو الصورة', target: '/branches/ikhlas-jeddah' });
  }
  if (wantsMessage(p)) add({ type: 'message_draft', label: 'تجهيز رسالة', target: '/messages' });

  return actions.slice(0, 5);
}

function directAnswer(prompt: string): string | null {
  const p = prompt.trim().toLowerCase();
  if (/^(النهارده|النهاردة|اليوم)\s+(يوم\s*)?(ايه|اي|إيه|إي)$/.test(p) || p.includes('تاريخ النهارده')) {
    const day = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', timeZone: 'Africa/Cairo' }).format(new Date());
    const date = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' }).format(new Date());
    return `النهارده ${day}، ${date}.`;
  }
  if (p.includes('الساعة كام') || p.includes('الوقت كام')) {
    const time = new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' }).format(new Date());
    return `الساعة الآن ${time} بتوقيت القاهرة.`;
  }
  return null;
}

function isGreeting(prompt: string) {
  const p = prompt.trim().toLowerCase();
  return /^(hi|hello|hallo|hey|السلام عليكم|سلام|اهلا|أهلا|هلا|صباح الخير|مساء الخير)$/.test(p);
}

function extractTopic(prompt: string) {
  return prompt
    .replace(/^(اعمل|اكتب|جهز|حضّر|حضر)\s+(بحث|مقال|ملخص علمي|دراسة)\s+(عن|حول)\s+/i, '')
    .replace(/^(ابحث عن|ابحث|بحث عن|ملخص علمي عن|دراسة عن|مقال عن)\s+/i, '')
    .replace(/^(اعمل|اكتب|جهز|حضّر|حضر)\s+/i, '')
    .replace(/^(عن|حول)\s+/i, '')
    .trim()
    .replace(/[؟?]+$/g, '') || 'الموضوع المطلوب';
}

function buildResearchFallback(prompt: string) {
  const topic = extractTopic(prompt);
  return [
    `ملخص علمي مختصر: ${topic}`,
    '',
    'الفكرة الأساسية:',
    'المنصات التعليمية الحديثة لا تقتصر على عرض المحتوى، بل تبني بيئة تعلم منظمة تساعد الطالب على تكوين الثقة، الاستقلالية، والانضباط الذاتي من خلال متابعة مستمرة وتغذية راجعة واضحة.',
    '',
    'أثرها في بناء شخصية الطالب:',
    '1. تنمية الاستقلالية: الطالب يتعلم أن يبدأ نشاطاً، يتابع تقدمه، ويكمل مهمة داخل مسار واضح.',
    '2. رفع الدافعية: الألعاب والأنشطة القصيرة تعطي الطالب شعوراً بالإنجاز دون ضغط الدرجات المباشر.',
    '3. تحسين التنظيم الذاتي: تقسيم المحتوى إلى خطوات صغيرة يساعد الطالب على معرفة ما المطلوب منه الآن وما الخطوة التالية.',
    '4. دعم الثقة بالنفس: إخفاء التشخيص عن الطالب وعرض رسائل تشجيعية يقلل الوصمة ويزيد الاستعداد للمحاولة.',
    '5. تقوية العلاقة بين الأسرة والمختص: ولي الأمر يشارك بالملاحظة، والمختص يراجع التقرير، والطالب يتدرب في بيئة آمنة.',
    '',
    'تطبيق عملي داخل منصة مسار:',
    'تبدأ التجربة بتسجيل ولي الأمر وبيانات الطالب، ثم استبيان واختبار مناسب للصف، ثم تقرير للدكتور، وبعد الاعتماد يظهر للطالب مسار تدريبي أو ألعاب مناسبة بدون عرض تشخيص أو نتيجة جارحة.',
    '',
    'صياغة مناسبة للاستخدام في الموقع:',
    'منصة مسار تساعد الطفل على التعلم بثقة من خلال تقييم هادئ، خطة يراجعها المختص، وأنشطة تفاعلية تناسب احتياجه الحقيقي.',
  ].join('\n');
}

function buildIepFallback(prompt: string) {
  return [
    'مسودة خطة IEP قابلة للتعديل:',
    '',
    'بيانات أولية:',
    '- الطالب: يحتاج تحديد الاسم والصف من ملف الطالب.',
    '- مجال الاحتياج: يستخرج من التقرير أو يكتب يدوياً إذا كان معروفاً.',
    '',
    'هدف قصير المدى:',
    'أن ينجز الطالب مهارة واحدة محددة خلال 4 أسابيع بنسبة إتقان لا تقل عن 80% في قياسين متتاليين.',
    '',
    'أهداف تعليمية مقترحة:',
    '1. يميز الطالب المهارة المستهدفة من بين مشتتات بسيطة.',
    '2. يطبق المهارة داخل نشاط قصير متعدد الحواس.',
    '3. ينقل المهارة إلى واجب منزلي أو لعبة تدريبية.',
    '',
    'آلية المتابعة:',
    '- قياس أسبوعي قصير.',
    '- ملاحظة سلوكية مختصرة.',
    '- رسالة لولي الأمر عند وجود تقدم أو تعثر واضح.',
    '',
    `الطلب الأصلي: ${prompt}`,
  ].join('\n');
}

function buildMessageFallback(prompt: string) {
  const studentMatch = prompt.match(/الطالب\s+([^،,.]+)/);
  const studentName = studentMatch?.[1]?.trim() || 'ابنكم';
  return [
    'مسودة رسالة لولي الأمر:',
    '',
    `السلام عليكم ورحمة الله وبركاته، ولي أمر ${studentName}.`,
    'نود إبلاغكم بوجود ملاحظة تعليمية تحتاج متابعة هادئة خلال الفترة القادمة. سيتم التعامل معها داخل المنصة من خلال أنشطة قصيرة وتوجيه مناسب دون ضغط على الطالب.',
    'نرجو منكم متابعة الواجبات البسيطة عند إرسالها، وإبلاغنا بأي ملاحظات تظهر في المنزل حتى تكون الخطة أدق.',
    '',
    'مع خالص التقدير،',
    'منصة مسار',
  ].join('\n');
}

function buildStudentNoteFallback(prompt: string) {
  const studentMatch = prompt.match(/الطالب\s+([^،,.]+)/);
  const studentName = studentMatch?.[1]?.trim() || 'الطالب المحدد';
  const note = prompt
    .replace(/.*?(ملاحظة|ملاحظه|ملحوظة|ملحوظه)\s*(في ملفه|في ملف الطالب|عن)?/i, '')
    .trim()
    .replace(/[.،]+$/g, '');

  return [
    'ملاحظة جاهزة للإضافة في ملف الطالب:',
    '',
    `الطالب: ${studentName}`,
    `نص الملاحظة: ${note || 'تحتاج الحالة إلى متابعة ومراجعة من د. إسماعيل قبل اعتماد أي وصف نهائي.'}`,
    '',
    'صياغة مهنية مقترحة داخل الملف:',
    'تم تسجيل ملاحظة أولية تحتاج مراجعة مختص. لا يتم عرض أي تشخيص للطالب أو ولي الأمر قبل مراجعة د. إسماعيل واعتماد التوصية المناسبة.',
    '',
    'الإجراء التالي:',
    'افتح ملف الطالب، أضف الملاحظة في السجل الداخلي، ثم اربطها بالتقرير أو خطة المتابعة إذا لزم الأمر.',
  ].join('\n');
}

function buildReportFallback(prompt: string) {
  return [
    'هيكل تقرير تحليلي مقترح:',
    '',
    '1. بيانات الطالب:',
    'الاسم، الصف، تاريخ التقييم، مصدر البيانات، واسم ولي الأمر.',
    '',
    '2. ملخص تنفيذي:',
    'وصف مختصر للحالة بدون كلمات جارحة، مع تحديد المجالات التي تحتاج مراجعة.',
    '',
    '3. تحليل المجالات:',
    '- القراءة والوعي الصوتي.',
    '- الكتابة والتآزر البصري الحركي.',
    '- الرياضيات ومفهوم العدد.',
    '- الانتباه والذاكرة العاملة.',
    '- اللغة والنطق والتواصل.',
    '',
    '4. توصيات عملية:',
    'أهداف أسبوعية، أنشطة منزلية قصيرة، ومؤشر قياس واضح.',
    '',
    '5. قرار المختص:',
    'يعتمد المسار المناسب بعد مراجعة الإجابات الخام وتحليل الطالب.',
    '',
    `الطلب الأصلي: ${prompt}`,
  ].join('\n');
}

function buildHomeworkFallback(prompt: string) {
  return [
    'نموذج واجب تفاعلي قصير:',
    '',
    'المدة: 10 إلى 12 دقيقة.',
    'طريقة التنفيذ: نشاط واحد واضح، ثم تدريب صوتي/بصري، ثم سؤال تحقق.',
    '',
    'الخطوات:',
    '1. قراءة المثال أمام الطالب مرة واحدة.',
    '2. يكرر الطالب المهارة بصوت واضح.',
    '3. يختار الإجابة من صورتين أو ثلاث صور.',
    '4. يسجل ولي الأمر ملاحظة واحدة: سهل، متوسط، يحتاج إعادة.',
    '',
    'معيار الإتقان: 4 إجابات صحيحة من 5 بدون مساعدة مباشرة.',
    '',
    `الطلب الأصلي: ${prompt}`,
  ].join('\n');
}

function buildFallback(prompt: string, actions: AiAction[], hasImage: boolean) {
  const direct = directAnswer(prompt);
  if (direct) return direct;

  const p = prompt.toLowerCase();

  if (isGreeting(prompt)) {
    return 'أهلاً د. إسماعيل. اكتب المطلوب مباشرة: بحث، خطة طالب، رسالة لولي أمر، تحليل تقرير، أو مراجعة صورة، وسأرد بمحتوى واضح أو أفتح لك الإجراء المناسب.';
  }

  if (wantsResearch(p)) return buildResearchFallback(prompt);
  if (wantsStudentNote(p)) return buildStudentNoteFallback(prompt);
  if (wantsIep(p)) return buildIepFallback(prompt);
  if (wantsMessage(p)) return buildMessageFallback(prompt);
  if (wantsReports(p)) return buildReportFallback(prompt);
  if (wantsHomework(p)) return buildHomeworkFallback(prompt);

  if (hasImage) {
    return [
      'استلمت الصورة.',
      'أحتاج أن يقرأها محرك الرؤية أو أن تحدد نوعها: جدول حصص، حضور، واجب، أو تقرير. بعد التحديد أجهز لك البيانات بصيغة قابلة للمراجعة قبل الحفظ.',
      actions.length ? `الإجراء المناسب الآن: ${actions.map((a) => a.label).join('، ')}.` : 'اكتب نوع الصورة في رسالة قصيرة لأتعامل معها بدقة.',
    ].filter(Boolean).join('\n');
  }

  if (actions.length) {
    return [
      'فهمت المطلوب كإجراء داخل المنصة.',
      `الإجراء المقترح: ${actions.map((a) => a.label).join('، ')}.`,
      'لو تريد مني صياغة محتوى قبل فتح الصفحة، اكتب التفاصيل: اسم الطالب، الصف، ونوع المطلوب.',
    ].join('\n');
  }

  return [
    'فهمت رسالتك، لكن المطلوب يحتاج تحديد بسيط حتى أنفذه بشكل مفيد.',
    'اكتب المطلوب بصيغة مباشرة مثل: اكتب بحث عن كذا، جهز خطة لطالب صف كذا، اكتب رسالة لولي الأمر، أو حلل صورة الجدول.',
  ].join('\n');
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult.authorized || !authResult.user) {
    return NextResponse.json({ success: false, error: 'جلسة الدخول غير صالحة.' }, { status: 401 });
  }

  const rateLimit = await checkRateLimit(
    'ai_execute',
    getClientIdentifier(req, authResult.user?.id || 'ai-user'),
    { windowMs: 60 * 1000, maxRequests: 40, failClosed: false },
    { identifier: getIpIdentifier(req), maxRequests: 120 },
  );

  if (!rateLimit.allowed) {
    return NextResponse.json({ success: false, error: 'طلبات كثيرة. انتظر قليلاً.' }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, 6000) : '';
  const image = parseImage(body.image);
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

  if (!prompt && !image) {
    return NextResponse.json({ success: false, error: 'اكتب طلباً أو ارفع صورة.' }, { status: 400 });
  }

  const actions = inferActions(prompt || 'تحليل الصورة المرفقة', !!image);
  const direct = prompt ? directAnswer(prompt) : null;

  if (direct) {
    return NextResponse.json({ success: true, reply: direct, gateway: '', actions });
  }

  if (prompt) {
    const executed = await tryExecuteStudentNote(prompt, authResult.user);
    if (executed) {
      return NextResponse.json({
        success: true,
        reply: executed.reply,
        gateway: 'Masar Action Engine',
        actions: executed.actions,
      });
    }
  }

  const messages: GeminiMessage[] = [];
  for (const item of history) {
    if (item?.text) {
      messages.push({
        role: item.sender === 'user' ? 'user' : 'model',
        content: String(item.text).slice(0, 1200),
      });
    }
  }
  messages.push({
    role: 'user',
    content: prompt || 'حلل الصورة المرفقة واستخرج المطلوب منها.',
    image,
  });

  const result = await callGeminiApi({
    systemPrompt: SYSTEM_PROMPT,
    messages,
    temperature: 0.45,
    maxOutputTokens: 2048,
    timeoutMs: 16000,
  });

  return NextResponse.json({
    success: true,
    reply: result?.text?.trim() || buildFallback(prompt, actions, !!image),
    gateway: result ? `Gemini ${result.model}` : '',
    actions,
    needsKeys: !result,
  });
}
