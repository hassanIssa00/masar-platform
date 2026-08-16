import { NextRequest, NextResponse } from 'next/server';
import { callGeminiApi, type GeminiMessage } from '@/lib/gemini';
import { authenticateRequest } from '@/lib/auth/authorization';
import { checkRateLimit, getClientIdentifier, getIpIdentifier } from '@/lib/rateLimit';

type ScheduleSlotInput = {
  day?: string;
  period?: number | string;
  periodNumber?: number | string;
  subject?: string;
  subjectName?: string;
  teacher?: string;
  teacherName?: string;
  startTime?: string;
  endTime?: string;
};

type ScheduleSlot = {
  day: string;
  period: number;
  subject: string;
  teacher: string;
  startTime: string;
  endTime: string;
};

const DEFAULT_IKHLAS_SLOTS: ScheduleSlot[] = [
  ['الأحد', 1, 'لغتي العربية', '07:30', '08:10'], ['الأحد', 2, 'الرياضيات', '08:10', '08:50'], ['الأحد', 3, 'التربية الإسلامية', '08:50', '09:30'], ['الأحد', 4, 'العلوم', '09:50', '10:30'], ['الأحد', 5, 'التربية الفنية', '10:30', '11:10'], ['الأحد', 6, 'القرآن الكريم', '11:10', '11:50'],
  ['الاثنين', 1, 'الرياضيات', '07:30', '08:10'], ['الاثنين', 2, 'لغتي العربية', '08:10', '08:50'], ['الاثنين', 3, 'التربية الإسلامية', '08:50', '09:30'], ['الاثنين', 4, 'التربية البدنية', '09:50', '10:30'], ['الاثنين', 5, 'العلوم', '10:30', '11:10'], ['الاثنين', 6, 'الحاسب الآلي', '11:10', '11:50'],
  ['الثلاثاء', 1, 'القرآن الكريم', '07:30', '08:10'], ['الثلاثاء', 2, 'الرياضيات', '08:10', '08:50'], ['الثلاثاء', 3, 'لغتي العربية', '08:50', '09:30'], ['الثلاثاء', 4, 'التربية الإسلامية', '09:50', '10:30'], ['الثلاثاء', 5, 'الاجتماعيات', '10:30', '11:10'], ['الثلاثاء', 6, 'التربية الفنية', '11:10', '11:50'],
  ['الأربعاء', 1, 'لغتي العربية', '07:30', '08:10'], ['الأربعاء', 2, 'العلوم', '08:10', '08:50'], ['الأربعاء', 3, 'الرياضيات', '08:50', '09:30'], ['الأربعاء', 4, 'القرآن الكريم', '09:50', '10:30'], ['الأربعاء', 5, 'الحاسب الآلي', '10:30', '11:10'], ['الأربعاء', 6, 'التربية البدنية', '11:10', '11:50'],
  ['الخميس', 1, 'التربية الإسلامية', '07:30', '08:10'], ['الخميس', 2, 'لغتي العربية', '08:10', '08:50'], ['الخميس', 3, 'الرياضيات', '08:50', '09:30'], ['الخميس', 4, 'الاجتماعيات', '09:50', '10:30'], ['الخميس', 5, 'العلوم', '10:30', '11:10'], ['الخميس', 6, 'القرآن الكريم', '11:10', '11:50'],
].map(([day, period, subject, startTime, endTime]) => ({
  day: String(day),
  period: Number(period),
  subject: String(subject),
  teacher: '',
  startTime: String(startTime),
  endTime: String(endTime),
}));

function parseManualScheduleText(text: string): ScheduleSlot[] {
  const periodTimes: Record<number, [string, string]> = {
    1: ['07:30', '08:10'],
    2: ['08:10', '08:50'],
    3: ['08:50', '09:30'],
    4: ['09:50', '10:30'],
    5: ['10:30', '11:10'],
    6: ['11:10', '11:50'],
  };
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const rows = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const slots: ScheduleSlot[] = [];
  let currentDay = '';

  for (const row of rows) {
    const detectedDay = days.find((day) => row.includes(day) || row.includes(day.replace('أ', 'ا')));
    if (detectedDay) currentDay = detectedDay;

    const periodMatch = row.match(/(?:الحصة\s*)?([1-6١-٦])\s*[:\-،]/);
    const period = periodMatch ? Number(periodMatch[1].replace('١', '1').replace('٢', '2').replace('٣', '3').replace('٤', '4').replace('٥', '5').replace('٦', '6')) : 0;
    if (!currentDay || !period) continue;

    const subject = row
      .replace(/الأحد|الاحد|الاثنين|الإثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس/g, '')
      .replace(/الحصة\s*[1-6١-٦]\s*[:\-،]?/g, '')
      .replace(/[0-9٠-٩]{1,2}:[0-9٠-٩]{2}\s*[-–]\s*[0-9٠-٩]{1,2}:[0-9٠-٩]{2}/g, '')
      .trim();
    if (!subject) continue;
    const [startTime, endTime] = periodTimes[period] ?? ['07:30', '08:10'];
    slots.push({ day: currentDay, period, subject, teacher: '', startTime, endTime });
  }

  return slots;
}

function extractScheduleJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const source = fenced || text;
  const arrayMatch = source.match(/\[[\s\S]*\]/);
  if (arrayMatch) return arrayMatch[0];
  const objectMatch = source.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      const parsed = JSON.parse(objectMatch[0]);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
      if (Array.isArray(parsed.slots)) return JSON.stringify(parsed.slots);
      if (Array.isArray(parsed.schedule)) return JSON.stringify(parsed.schedule);
    } catch {
      return '';
    }
  }
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: 'Unauthorized schedule parse request' }, { status: 401 });
    }

    const limit = await checkRateLimit(
      'schedule_parse',
      getClientIdentifier(req, auth.user?.id),
      { windowMs: 60 * 1000, maxRequests: 12, failClosed: false },
      { identifier: getIpIdentifier(req), maxRequests: 36 },
    );
    if (!limit.allowed) {
      return NextResponse.json({ success: false, error: 'Rate limit exceeded' }, { status: 429 });
    }

    const body = await req.json();
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
    const imageMime = typeof body.imageMime === 'string' ? body.imageMime : 'image/png';
    const manualText = typeof body.manualText === 'string' ? body.manualText : '';

    if (!imageBase64 && !manualText.trim()) {
      return NextResponse.json({ success: false, error: 'No image or text provided' }, { status: 400 });
    }
    if (imageBase64 && String(imageBase64).length > 7_000_000) {
      return NextResponse.json({ success: false, error: 'Image is too large' }, { status: 413 });
    }

    const manualSlots = manualText.trim() ? parseManualScheduleText(manualText) : [];
    if (manualSlots.length >= 6) {
      return NextResponse.json({
        success: true,
        slots: manualSlots,
        model: 'manual-parser',
        parsedCount: manualSlots.length,
      });
    }

    const systemPrompt = `أنت خبير متخصص في قراءة جداول الحصص المدرسية بدقة 100%.

المهمة: اقرأ صورة جدول الحصص الأسبوعي واستخرج كل بيانات الجدول بدقة تامة:
- اسم المادة الدراسية
- اسم المعلم/المعلمة (إن وُجد في الجدول)
- رقم الحصة
- اليوم
- وقت البداية ووقت النهاية

الأيام الدراسية: الأحد، الاثنين، الثلاثاء، الأربعاء، الخميس

قواعد صارمة:
1. اقرأ النص الموجود في الجدول بالضبط، لا تخترع أو تخمن.
2. إذا كان هناك اسم معلم في الخلية، استخرجه في حقل "teacher".
3. لا تكتب "درس حر" أو "حصة دراسية" أبداً - اقرأ ما هو مكتوب فعلاً.
4. الأوقات الافتراضية إن لم تكن واضحة في الصورة:
   - الحصة 1: 07:30 - 08:10
   - الحصة 2: 08:10 - 08:50
   - الحصة 3: 08:50 - 09:30
   - الحصة 4: 09:50 - 10:30 (بعد الفسحة)
   - الحصة 5: 10:30 - 11:10
   - الحصة 6: 11:10 - 11:50
5. أرجع JSON فقط بدون أي نص إضافي قبله أو بعده، بالشكل الآتي:

[
  {
    "day": "الأحد",
    "period": 1,
    "subject": "اسم المادة كما في الجدول",
    "teacher": "اسم المعلم إن وُجد أو اتركه فارغاً",
    "startTime": "07:30",
    "endTime": "08:10"
  }
]`;

    let userPrompt = 'اقرأ الجدول في هذه الصورة بالكامل واستخرج جميع الحصص لكل يوم مع أسماء المواد والمعلمين. أرجع JSON فقط.';
    if (manualText.trim()) {
      userPrompt = `استخرج بيانات الجدول الدراسي الآتي وأرجع JSON فقط:\n${manualText.trim()}`;
    }

    const messages: GeminiMessage[] = [
      {
        role: 'user',
        content: userPrompt,
        ...(imageBase64 ? { image: { data: imageBase64, mimeType: imageMime } } : {}),
      },
    ];

    const result = await callGeminiApi({
      systemPrompt,
      messages,
      temperature: 0.1,
    });

    if (result?.text) {
      const jsonText = extractScheduleJson(result.text);
      if (jsonText) {
        try {
          const slots = JSON.parse(jsonText);
          if (Array.isArray(slots) && slots.length > 0) {
            const cleanedSlots: ScheduleSlot[] = (slots as ScheduleSlotInput[]).map((s) => ({
              day: String(s.day || 'الأحد').trim(),
              period: Number(s.period || s.periodNumber || 1),
              subject: String(s.subject || s.subjectName || '').trim(),
              teacher: String(s.teacher || s.teacherName || '').trim(),
              startTime: String(s.startTime || '07:30').trim(),
              endTime: String(s.endTime || '08:10').trim(),
            })).filter(s => s.subject && s.subject !== 'درس حر' && s.subject !== 'حصة دراسية');

            if (cleanedSlots.length > 0) {
              return NextResponse.json({
                success: true,
                slots: cleanedSlots,
                model: result.model,
                parsedCount: cleanedSlots.length,
              });
            }
          }
        } catch (e) {
          console.warn('[Schedule Parse] JSON parse error:', e);
        }
      }
    }

    if (imageBase64) {
      return NextResponse.json({
        success: true,
        slots: DEFAULT_IKHLAS_SLOTS,
        model: 'ikhlas-official-fallback',
        parsedCount: DEFAULT_IKHLAS_SLOTS.length,
        warning: 'تعذر استخراج الجدول من الصورة بدقة، فتم تثبيت جدول الإخلاص الرسمي الحالي حتى لا تتعطل صفحة جدول الحصص.',
      });
    }

    return NextResponse.json({
      success: false,
      error: 'لم أستطع قراءة الجدول من النص. اكتب اليوم ثم الحصة ثم المادة مثل: الأحد - الحصة 1: لغتي العربية.',
    }, { status: 422 });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Schedule parser failed';
    console.error('[Schedule Parse API Error]:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
