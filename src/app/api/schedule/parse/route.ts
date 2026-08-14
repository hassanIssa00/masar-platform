import { NextRequest, NextResponse } from 'next/server';
import { callGeminiApi } from '@/lib/gemini';
import { DEFAULT_SCHEDULE, DAY_MAP_NUM_TO_AR } from '@/data/ikhlasSchedule';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, imageMime = 'image/png', manualText = '' } = body;

    if (!imageBase64 && !manualText.trim()) {
      return NextResponse.json({ success: false, error: 'No image or text provided' }, { status: 400 });
    }

    const systemPrompt = `أنت خبير في قراءة واستخراج جداول الحصص المدرسية بدقة متناهية.
المهمة: قراءة صورة جدول الحصص واستخراج أسماء المواد لكل يوم ولكل حصة (من الحصة 1 إلى الحصة 6 أو 7) للأيام من الأحد إلى الخميس.

المواد الدراسية الشائعة:
- لغتي العربية
- الرياضيات
- القرآن الكريم
- التربية الإسلامية (أو دراسات إسلامية / فقه / توحيد)
- العلوم
- التربية البدنية (بدنية)
- التربية الفنية (فنية)
- الحاسب الآلي (حاسب / مهارات رقمية)
- الاجتماعيات (دراسات اجتماعية)
- الفسحة (فسحة)

قواعد صارمة:
1. استخرج اسم المادة الفعلي الظاهر في الجدول (لا تكتب 'درس حر' أبداً).
2. رتب الحصص حسب رقم الحصة (1، 2، 3، 4، 5، 6).
3. حدد الأوقات القياسية:
   - الحصة 1: 07:30 - 08:10
   - الحصة 2: 08:10 - 08:50
   - الحصة 3: 08:50 - 09:30
   - الحصة 4: 09:50 - 10:30
   - الحصة 5: 10:30 - 11:10
   - الحصة 6: 11:10 - 11:50
4. أرجع JSON فقط كقائمة من الكائنات دون أي نص إضافي:
[
  {
    "day": "الأحد",
    "period": 1,
    "subject": "القرآن الكريم",
    "startTime": "07:30",
    "endTime": "08:10"
  }
]`;

    let userPrompt = 'اقرأ صورة الجدول المرفقة واستخرج جميع الحصص والمواد بدقة وأرجع JSON فقط.';
    if (manualText.trim()) {
      userPrompt += `\nنص إضافي أو بديل:\n${manualText.trim()}`;
    }

    const messages: any[] = [
      {
        role: 'user',
        content: userPrompt,
        ...(imageBase64 ? { image: { data: imageBase64, mimeType: imageMime } } : {}),
      },
    ];

    const result = await callGeminiApi({
      systemPrompt,
      messages,
      temperature: 0.2,
    });

    if (result?.text) {
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const slots = JSON.parse(jsonMatch[0]);
          if (Array.isArray(slots) && slots.length > 0) {
            // Clean and validate slots
            const cleanedSlots = slots.map((s: any) => ({
              day: String(s.day || 'الأحد').trim(),
              period: Number(s.period || s.periodNumber || 1),
              subject: String(s.subject || s.subjectName || 'حصة دراسية').trim(),
              startTime: String(s.startTime || '07:30').trim(),
              endTime: String(s.endTime || '08:10').trim(),
            }));

            return NextResponse.json({
              success: true,
              slots: cleanedSlots,
              model: result.model,
            });
          }
        } catch (e) {
          console.warn('JSON parse error from Gemini:', e);
        }
      }
    }

    // Fallback to DEFAULT_SCHEDULE converted to slot format
    const fallbackSlots = DEFAULT_SCHEDULE.map(p => ({
      day: DAY_MAP_NUM_TO_AR[p.dayOfWeek] || 'الأحد',
      period: p.periodNumber,
      subject: p.subjectName,
      startTime: p.startTime,
      endTime: p.endTime,
    }));

    return NextResponse.json({
      success: true,
      slots: fallbackSlots,
      isFallback: true,
    });

  } catch (err: any) {
    console.error('[Schedule Parse API Error]:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
