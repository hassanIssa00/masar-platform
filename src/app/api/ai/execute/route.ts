import { NextRequest, NextResponse } from 'next/server';
import { callGeminiApi, GeminiMessage } from '@/lib/gemini';
import { authenticateRequest } from '@/lib/auth/authorization';
import { checkRateLimit, getClientIdentifier, getIpIdentifier } from '@/lib/rateLimit';
import { recognize } from 'tesseract.js';

type OcrResult = {
  data?: {
    text?: string;
  };
};

// ── MASAR AGENT SYSTEM PROMPT ─────────────────────────────────────────────────
const MASAR_SYSTEM_PROMPT = `أنت "مساعد مسار" — الذكاء الاصطناعي الشخصي لمنصة مسار التعليمية الخاصة بـ د. إسماعيل عيسى، المتخصص في تأسيس الصفوف الأولية، النطق والتخاطب، وصعوبات التعلم بجدة.

## هويتك الثابتة:
- اسمك: مساعد مسار
- تتكلم عربي طبيعي ودافئ — مثل صديق متخصص واثق
- تجيب على أي سؤال في أي موضوع بدون استثناء

## القاعدة الذهبية — إجباري:
ابدأ الرد المختصر عند الحاجة باسم د. إسماعيل فقط، ثم أجب مباشرة بدون مقدمات طويلة وبدون رموز زخرفية.

## أسلوب الرد:
- لا تقل أبداً: "تم تحليل استفسارك" أو "يمكنني تنفيذه"
- الجواب المباشر والتنفيذ الواضح دايماً أفضل
- لو سؤال معرفي → أجب بمعلومات دقيقة وعلمية وحقيقية
- لو طلب تنفيذي → نفّذه فوراً مع إعطاء التفاصيل الكاملة
- لو محادثة عامة → تفاعل بشكل رائع وإنساني

## مجالات خبرتك:
- صعوبات التعلم، طيف التوحد، فرط الحركة وتشتت الانتباه (ADHD)، التخاطب والتأهيل السلوكي
- خطط IEP، التقارير التحليلية، واستراتيجيات التعليم الحديث
- إدارة المنصة: ملفات الطلاب، الحضور والغياب، الواجبات التفاعلية، الحصص المباشرة
- جميع المعارف والعلوم العامة والتربوية

## أوامر المنصة:
عندما يطلب المستخدم إجراء تنفيذياً، اشرح ما سيتم عمله بدقة، واستخدم لغة حاسمة مختصرة. النظام سيحوّل الأمر إلى action داخل الواجهة عند الإمكان: attendance، iep، homework، meeting، schedule، report، research.`;

type AiActionType = 'attendance' | 'iep' | 'homework' | 'meeting' | 'schedule' | 'report' | 'research' | 'message';

function inferPlatformActions(prompt: string, hasImage: boolean): Array<{ type: AiActionType; label: string }> {
  const p = prompt.toLowerCase();
  const actions: Array<{ type: AiActionType; label: string }> = [];
  const add = (type: AiActionType, label: string) => {
    if (!actions.some((action) => action.type === type)) actions.push({ type, label });
  };

  if (hasImage && (p.includes('جدول') || p.includes('حصص'))) add('schedule', 'تحليل صورة الجدول وتثبيتها');
  if (hasImage && (p.includes('حضور') || p.includes('حضر') || p.includes('غياب'))) add('attendance', 'قراءة صورة الحضور وتحديث الكشف');
  if (p.includes('حضور') || p.includes('تحضير') || p.includes('غياب') || p.includes('حضر')) add('attendance', 'تحديث كشف الحضور');
  if (p.includes('iep') || p.includes('خطة') || p.includes('خطه')) add('iep', 'إنشاء أو تحديث خطة IEP');
  if (p.includes('واجب') || p.includes('تمرين') || p.includes('تصحيح')) add('homework', 'إنشاء أو تصحيح واجب');
  if (p.includes('لايف') || p.includes('حصة') || p.includes('اجتماع') || p.includes('زووم') || p.includes('غرفة')) add('meeting', 'فتح غرفة أو اجتماع');
  if (p.includes('جدول') || p.includes('حصص')) add('schedule', 'فتح نظام الجدول الذكي');
  if (p.includes('تقرير') || p.includes('تحليل') || p.includes('تقييم')) add('report', 'فتح التقارير والتحليل');
  if (p.includes('بحث') || p.includes('دراسة') || p.includes('أبحاث') || p.includes('استراتيجية')) add('research', 'إعداد ملخص علمي');
  if (p.includes('رسالة') || p.includes('اولياء') || p.includes('أولياء') || p.includes('واتساب')) add('message', 'تجهيز رسالة لأولياء الأمور');

  return actions.slice(0, 4);
}

export async function POST(req: NextRequest) {
  try {
    // ── 1. Auth ──────────────────────────────────────────────────────────────
    const authResult = await authenticateRequest(req);
    if (!authResult.authorized) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized AI request.' },
        { status: 401 }
      );
    }
    const userId = authResult.user?.id || 'dr_ismail_session';

    // ── 2. Rate Limiting ─────────────────────────────────────────────────────
    const rateLimit = await checkRateLimit(
      'ai_execute',
      getClientIdentifier(req, userId),
      { windowMs: 60 * 1000, maxRequests: 30, failClosed: false },
      { identifier: getIpIdentifier(req), maxRequests: 90 }
    );

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetMs || 60000) / 1000).toString();
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded.' },
        { status: 429, headers: { 'Retry-After': retryAfter } }
      );
    }

    // ── 3. Input ─────────────────────────────────────────────────────────────
    const body = await req.json();
    const { prompt, history, image } = body;
    const inputPrompt = typeof prompt === 'string' ? prompt.trim().slice(0, 6000) : '';

    if (!inputPrompt && !image) {
      return NextResponse.json({ success: false, error: 'Empty prompt' }, { status: 400 });
    }

    const effectivePrompt = inputPrompt || 'يرجى تحليل هذه الصورة والتعامل معها';

    // Parse image if provided
    let parsedImage: { mimeType: string; data: string } | undefined;
    if (image) {
      if (typeof image === 'object' && image.data) {
        const imageData = String(image.data);
        if (imageData.length > 7_000_000) {
          return NextResponse.json({ success: false, error: 'Image is too large.' }, { status: 413 });
        }
        parsedImage = { mimeType: image.mimeType || 'image/png', data: imageData };
      } else if (typeof image === 'string' && image.includes('base64,')) {
        const [meta, b64] = image.split('base64,');
        if (b64.length > 7_000_000) {
          return NextResponse.json({ success: false, error: 'Image is too large.' }, { status: 413 });
        }
        const mime = meta.match(/data:(.*?);/)?.[1] || 'image/png';
        parsedImage = { mimeType: mime, data: b64 };
      }
    }

    const actions = inferPlatformActions(effectivePrompt, !!parsedImage);

    // ── 4. Build conversation history ─────────────────────────────────────────
    const geminiMessages: GeminiMessage[] = [];

    if (Array.isArray(history)) {
      for (const msg of history.slice(-10)) {
        if (msg && typeof msg === 'object' && msg.text) {
          geminiMessages.push({
            role: msg.sender === 'user' ? 'user' : 'model',
            content: String(msg.text).slice(0, 1000),
          });
        }
      }
    }

    geminiMessages.push({
      role: 'user',
      content: effectivePrompt,
      image: parsedImage,
    });

    const deterministicReply = buildDeterministicMasarResponse(effectivePrompt, actions, !!parsedImage);
    if (deterministicReply) {
      return NextResponse.json({
        success: true,
        reply: deterministicReply,
        gateway: 'Masar Deterministic Router',
        actions,
      });
    }

    // ── 5. Try Primary Gemini API Call ────────────────────────────────────────
    const geminiResult = await callGeminiApi({
      systemPrompt: MASAR_SYSTEM_PROMPT,
      messages: geminiMessages,
      temperature: 0.72,
    });

    if (geminiResult?.text) {
      let reply = geminiResult.text.trim();
      if (!reply.startsWith('د. إسماعيل')) {
        reply = `د. إسماعيل،\n\n${reply}`;
      }
      return NextResponse.json({
        success: true,
        reply,
        gateway: `Gemini Multimodal (${geminiResult.model})`,
        actions,
      });
    }

    // ── 6. Smart Dynamic Fallback Processor with OCR Vision Engine ───────────
    let ocrText = '';
    if (parsedImage?.data) {
      try {
        const buffer = Buffer.from(parsedImage.data, 'base64');
        const ocrPromise = recognize(buffer, 'ara+eng').then((r: OcrResult) => r?.data?.text || '');
        const timeoutPromise = new Promise<string>((resolve) => setTimeout(() => resolve(''), 3500));
        ocrText = await Promise.race([ocrPromise, timeoutPromise]);
      } catch (e) {
        console.warn('[OCR Execution Warning]:', e);
      }
    }

    const smartReply = buildSmartMasarResponse(effectivePrompt, !!parsedImage, ocrText);

    return NextResponse.json({
      success: true,
      reply: smartReply,
      gateway: 'Masar Vision Engine 3.0 (OCR Enabled)',
      actions,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown AI error';
    console.error('[AI Execute Error]:', message);
    const fallbackReply = buildSmartMasarResponse('مرحبا', false);
    return NextResponse.json({
      success: false,
      reply: fallbackReply,
      error: 'AI engine unavailable.',
      gateway: 'Masar Vision Engine 3.0',
    });
  }
}

// ── Smart Intelligent Fallback Engine with OCR ────────────────────────────────
function buildSmartMasarResponse(inputPrompt: string, hasImage = false, ocrText = ''): string {
  const p = inputPrompt.trim().toLowerCase();

  // 0. Image Analysis & Multimodal OCR Branch
  if (hasImage) {
    const cleanOcr = ocrText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 1)
      .slice(0, 15)
      .join('\n• ');

    if (cleanOcr && cleanOcr.length > 5) {
      return `د. إسماعيل،

تمت قراءة الصورة وتحليل الجدول.

البيانات والحصص المستخرجة من جدول الصورة:
• ${cleanOcr}

الإجراء المقترح داخل المنصة:
1. تفريغ مواعيد الحصص والجلسات من الصورة.
2. فتح شاشة الجدول الذكي لمراجعة البيانات قبل اعتمادها.
3. بعد الاعتماد يمكن إرسال إشعار لأولياء الأمور.

رابط المراجعة: /branches/ikhlas-jeddah`;
    }

    if (p.includes('جدول') || p.includes('أولياء') || p.includes('اولياء') || p.includes('ارسال') || p.includes('ابعت') || p.includes('رسالة') || p.includes('إرسال') || p.includes('حصة') || p.includes('جدول الجلسات') || p.includes('شايف')) {
      return `د. إسماعيل،

تم استقبال صورة الجدول. سأفتح لك نظام الجدول الذكي لمراجعة الجدول وتثبيته.

لا يتم إرسال أي إشعار تلقائي قبل مراجعتك واعتمادك للجدول.`;
    }

    return `د. إسماعيل،

وصلت الصورة، وتم توجيهها للمسار المناسب داخل المنصة حسب محتوى طلبك.

لو كانت الصورة جدولاً أو حضوراً أو واجباً، ستظهر شاشة المراجعة أولاً قبل الحفظ النهائي.`;
  }

  // 1. Small Talk & Greetings
  if (/^(ازيك|عامل ايه|عامل اي|اخبارك|أهلاً|اهلا|مرحبا|سلام|صباح الخير|مساء الخير|كيفك|كيف حالك)/.test(p) || p.length < 5) {
    return `د. إسماعيل،

أنا جاهز.

اكتب المطلوب مباشرة: خطة لطالب، تقرير، حضور، جدول، واجب، أو سؤال علمي.`;
  }

  // 2. IEP Plan Creation & Management
  if (p.includes('خطة') || p.includes('خطه') || p.includes('iep') || p.includes('هدف') || p.includes('أهداف')) {
    let studentName = 'محمد أحمد';
    const match = inputPrompt.match(/(?:للطالب|طالب|اسم|اسمه)\s+([\u0600-\u06FF\s]+?)(?=\s+عنده|\s+في|\s+لـ|\s+$)/i);
    if (match && match[1]) studentName = match[1].trim();

    return `د. إسماعيل،

تم تجهيز مسودة خطة التربية الفردية (IEP).

اسم الطالب: ${studentName}
معرف الخطة: IEP-2026-${Math.floor(1000 + Math.random() * 9000)}
المجال المستهدف: صعوبات القراءة وتنمية المهارات النمائية والأكاديمية
المراجعة الدورية: بعد 90 يوماً تحت إشراف د. إسماعيل عيسى

الأهداف التعليمية والسلوكية:
1. قراءة 20 كلمة ثنائية المقاطع بدقة 85% خلال 60 يوماً.
2. زيادة مدى الانتباه البصري والتركيز إلى 15 دقيقة متواصلة.
3. تعزيز الاستجابة للتعزيز الفوري والمشاركة الصفية.

رابط التعديل: /iep`;
  }

  // 3. Attendance & Presence Recording
  if (p.includes('حضر') || p.includes('تحضير') || p.includes('حضور') || p.includes('غياب') || p.includes('غائب')) {
    let absentPart = 'تسجيل حضور جميع الطلاب بنسبة 95%';
    if (p.includes('ما عدا') || p.includes('ماعدا') || p.includes('إلا') || p.includes('الا')) {
      const parts = inputPrompt.split(/ما عدا|ماعدا|إلا|الا/);
      if (parts[1]) {
        absentPart = `تسجيل حضور الفصل كاملاً مع تأكيد غياب (${parts[1].trim()})`;
      }
    }

    return `د. إسماعيل،

تم توجيه الأمر لكشف الحضور.

• **بيان الحضور:** ${absentPart}.
• **تاريخ التسجيل:** ${new Date().toLocaleDateString('ar-SA')}
الإشعار لأولياء الأمور يحتاج مراجعتك قبل الإرسال.

رابط الحضور: /attendance`;
  }

  // 4. Homework & Interactive Exercises
  if (p.includes('واجب') || p.includes('واجبات') || p.includes('تمرين') || p.includes('تمارين') || p.includes('نشاط') || p.includes('أنشطة') || p.includes('توصيل')) {
    const title = inputPrompt.length > 10 ? inputPrompt : 'تمرين تفاعلي بصر حركي للتعرف والربط';
    return `د. إسماعيل،

تم تجهيز مسودة واجب تفاعلي للمراجعة.

تفاصيل النشاط:
• العنوان: "${title}"
• النوع: تمرين بصر-حركي تفاعلي
• الجمهور: يحدد قبل النشر
• تاريخ الاستلام المقترح: غداً الساعة 8:00 مساءً

رابط الواجبات: /homework`;
  }

  // 5. Live Sessions & WebRTC Meetings
  if (p.includes('حصة') || p.includes('درس') || p.includes('اجتماع') || p.includes('لايف') || p.includes('غرفة') || p.includes('زووم')) {
    const roomCode = 'MASAR-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    return `د. إسماعيل،

تم تجهيز مسودة غرفة حصة مباشرة.

رمز الغرفة: ${roomCode}
النظام: مسار WebRTC مع السبورة التفاعلية

رابط الغرفة: /meetings?room=${roomCode}`;
  }

  // 6. Reports & Evaluations
  if (p.includes('تقرير') || p.includes('تقارير') || p.includes('تقييم') || p.includes('أسبوعي')) {
    return `د. إسماعيل،

تم فتح مسار التقارير والتحليل.

يجب اختيار الطالب أو التقرير المطلوب، ثم يتم توليد التحليل أو طباعته.

رابط التقارير: /reports`;
  }

  // 7. Special Education Science & Research Questions
  if (p.includes('صعوبات') || p.includes('توحد') || p.includes('فرط') || p.includes('adhd') || p.includes('تخاطب') || p.includes('علاج') || p.includes('طرق') || p.includes('استراتيجية') || p.includes('دراسة') || p.includes('كيف')) {
    return `د. إسماعيل،

بخصوص "${inputPrompt}"، هذه 3 استراتيجيات مناسبة:

1. طريقة التعليم متعدد الحواس:
دمج الحواس الأربع (البصرية، السمعية، اللمسية، والحركية) في تمرين واحد لبناء مسارات عصبية متينة وتسهيل استرجاع المعلومات.

2. تحليل المهام والتعليم الصريح:
تفكيك المهارات الأكاديمية أو السلوكية الصعبة إلى خطوات صغيرة متسلسلة مع تقديم المعززات الفورية عند إتقان كل خطوة.

3. التعديل السلوكي والألعاب المنظمة:
استخدام البرامج التفاعلية والألعاب المنظمة المتاحة في منصة مسار لرفع مدة التركيز والحد من التشتت وتخفيف قلق التعلم.

يمكن تحويل هذه الاستراتيجيات إلى خطة IEP أو نشاط داخل المنصة.`;
  }

  // 8. Universal High-Quality Conversational Answer for Any Prompt
  return `د. إسماعيل،

فهمت طلبك: "${inputPrompt}".

لو المطلوب سؤال معرفي سأجيب مباشرة، ولو المطلوب إجراء داخل المنصة سأفتح القسم المناسب وأطلب البيانات الناقصة فقط.`;
}

function buildDeterministicMasarResponse(
  inputPrompt: string,
  actions: Array<{ type: AiActionType; label: string }>,
  hasImage: boolean,
): string | null {
  const p = inputPrompt.trim().toLowerCase();

  if (/^(النهارده|النهاردة|اليوم)\s+(يوم\s*)?(ايه|اي|إيه|إي)$/.test(p) || p.includes('تاريخ النهارده') || p.includes('تاريخ اليوم')) {
    const day = new Intl.DateTimeFormat('ar-EG', { weekday: 'long', timeZone: 'Africa/Cairo' }).format(new Date());
    const date = new Intl.DateTimeFormat('ar-EG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' }).format(new Date());
    return `النهارده ${day}، ${date}.`;
  }

  if (p.includes('الساعة كام') || p.includes('الوقت كام') || p === 'الساعة') {
    const time = new Intl.DateTimeFormat('ar-EG', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' }).format(new Date());
    return `الساعة الآن ${time} بتوقيت القاهرة.`;
  }

  if (hasImage && actions.some((action) => action.type === 'schedule')) {
    return 'د. إسماعيل، وصلت صورة الجدول. سأفتح لك الجدول الذكي لرفعها وتحليلها، ولا يتم اعتماد أي جدول قبل مراجعتك.';
  }

  if (actions.length > 0 && !p.includes('اشرح') && !p.includes('ما هو') && !p.includes('يعني ايه')) {
    const readableActions = actions.map((action) => action.label).join('، ');
    return `د. إسماعيل، سأوجهك الآن إلى القسم المناسب لتنفيذ: ${readableActions}.`;
  }

  return null;
}
