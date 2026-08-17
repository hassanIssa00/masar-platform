import { NextRequest, NextResponse } from 'next/server';
import { callGeminiApi, type GeminiMessage } from '@/lib/gemini';
import { authenticateRequest } from '@/lib/auth/authorization';
import { checkRateLimit, getClientIdentifier, getIpIdentifier } from '@/lib/rateLimit';

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

const SYSTEM_PROMPT = `
أنت مساعد مسار التنفيذي داخل منصة د. إسماعيل عيسى.
دورك:
1. تجيب على الأسئلة العامة مباشرة وباختصار مفيد.
2. في المهام الإدارية داخل المنصة، ترجع خطة تنفيذ واضحة بخطوات قليلة.
3. لا تستخدم عبارات فارغة مثل "تم تحليل استفسارك" أو "يمكننا دمج الطلب".
4. لا تضع رموز زخرفية أو إيموجي في الرد.
5. عندما تكون الصورة مرفقة، اقرأ محتواها بجدية واشرح ما يمكن استخراجه منها.
6. لو ينقصك اسم طالب أو تاريخ أو مادة، اطلب المعلومة الناقصة فقط.
7. أسلوبك عربي مهني، مباشر، ومناسب لإدارة منصة تعليمية علاجية.

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

  if (p.includes('طالب') || p.includes('طلاب')) add({ type: 'navigate', label: 'فتح إدارة الطلاب', target: '/students' });
  if (p.includes('ولي') || p.includes('أولياء') || p.includes('اولياء')) add({ type: 'navigate', label: 'فتح أولياء الأمور', target: '/parents' });
  if (p.includes('تقرير') || p.includes('تحليل')) add({ type: 'report_review', label: 'فتح التقارير', target: '/reports' });
  if (p.includes('اختبار') || p.includes('تقييم')) add({ type: 'navigate', label: 'فتح اختبارات تحديد المستوى', target: '/assessment' });
  if (p.includes('iep') || p.includes('خطة') || p.includes('خطه')) add({ type: 'draft_iep', label: 'تجهيز مسودة خطة IEP', target: '/iep' });
  if (p.includes('واجب') || p.includes('تمرين') || p.includes('تصحيح')) add({ type: 'draft_homework', label: 'تجهيز واجب أو تصحيح', target: '/homework' });
  if (p.includes('حضور') || p.includes('غياب') || p.includes('حضر')) add({ type: 'attendance_review', label: 'مراجعة الحضور', target: '/attendance' });
  if (p.includes('جدول') || p.includes('حصص') || hasImage) add({ type: 'schedule_review', label: 'مراجعة جدول أو صورة مرفقة', target: '/branches/ikhlas-jeddah' });
  if (p.includes('رسالة') || p.includes('واتساب')) add({ type: 'message_draft', label: 'تجهيز رسالة', target: '/messages' });
  if (p.includes('بحث') || p.includes('دراسة') || p.includes('استراتيجية')) add({ type: 'research_note', label: 'إعداد ملخص علمي' });

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

function buildFallback(prompt: string, actions: AiAction[], hasImage: boolean) {
  const direct = directAnswer(prompt);
  if (direct) return direct;

  if (hasImage) {
    return [
      'استلمت الصورة.',
      'سأتعامل معها كملف يحتاج مراجعة داخل المنصة، ولو كانت جدولاً أو حضوراً افتح لك شاشة المراجعة المناسبة قبل الحفظ.',
      actions.length ? `الإجراء المقترح: ${actions.map((a) => a.label).join('، ')}.` : '',
    ].filter(Boolean).join('\n');
  }

  if (actions.length) {
    return [
      'فهمت المطلوب.',
      `الإجراء المقترح داخل المنصة: ${actions.map((a) => a.label).join('، ')}.`,
      'اضغط على الإجراء المناسب أو أكمل التفاصيل الناقصة في رسالتك التالية.',
    ].join('\n');
  }

  return 'اكتب طلبك بتفاصيل أكثر: اسم الطالب، الصف، نوع المهمة، وهل تريد تقريراً أو خطة أو واجباً أو رسالة.';
}

export async function POST(req: NextRequest) {
  const authResult = await authenticateRequest(req);
  if (!authResult.authorized) {
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
    return NextResponse.json({ success: true, reply: direct, gateway: 'Masar Direct', actions });
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
    gateway: result ? `Gemini ${result.model}` : 'Masar Fallback',
    actions,
    needsKeys: !result,
  });
}
