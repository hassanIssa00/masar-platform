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
      temperature: 0.1,
    });

    console.log('[Schedule Parse] Gemini raw response:', result?.text?.slice(0, 500));

    if (result?.text) {
      // Try to extract JSON array from response
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const slots = JSON.parse(jsonMatch[0]);
          if (Array.isArray(slots) && slots.length > 0) {
            const cleanedSlots = slots.map((s: any) => ({
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
              });
            }
          }
        } catch (e) {
          console.warn('[Schedule Parse] JSON parse error:', e);
        }
      }
    }

    // Fallback to DEFAULT_SCHEDULE
    const fallbackSlots = DEFAULT_SCHEDULE.map(p => ({
      day: DAY_MAP_NUM_TO_AR[p.dayOfWeek] || 'الأحد',
      period: p.periodNumber,
      subject: p.subjectName,
      teacher: p.teacherName || '',
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
