import { NextRequest, NextResponse } from 'next/server';
import { callGeminiApi } from '@/lib/gemini';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      subjectName,
      gradeLabel,
      fileBase64,
      fileMimeType,
      pageFrom,
      pageTo,
      questionType,   // 'multiple_choice' | 'true_false' | 'fill_blank'
      questionCount,
      language = 'ar',
    } = body;

    if (!fileBase64 || !subjectName) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const typeInstruction =
      questionType === 'multiple_choice'
        ? 'أسئلة اختيار متعدد (4 خيارات لكل سؤال — أ، ب، ج، د)'
        : questionType === 'true_false'
        ? 'أسئلة صواب وخطأ'
        : 'أسئلة إكمال الفراغات';

    const pageRange = pageFrom && pageTo
      ? `الصفحات من ${pageFrom} إلى ${pageTo}`
      : 'جميع محتوى المنهج المرفق';

    const systemPrompt = `أنت خبير تربوي متخصص في إعداد الاختبارات والواجبات المدرسية للمرحلة الابتدائية.
مهمتك: قراءة محتوى المنهج المرفق وتوليد أسئلة دقيقة مرتبطة بالمحتوى مباشرة.

**قواعد صارمة:**
- الأسئلة يجب أن تكون من المحتوى المرفق فقط، لا معلومات خارجية
- اللغة: العربية الفصحى المبسطة المناسبة للمرحلة الابتدائية
- كل سؤال يجب أن يكون واضحاً ومحدداً
- الإجابة الصحيحة يجب أن تكون مأخوذة حرفياً من النص`;

    const userPrompt = `قم بتحليل محتوى مادة **${subjectName}** (${gradeLabel}) - ${pageRange}.

أنشئ **${questionCount} سؤال** من نوع **${typeInstruction}**.

**أرجع JSON صارم بهذا الشكل:**
{
  "questions": [
    {
      "id": "q1",
      "text": "نص السؤال",
      "options": ["أ) الخيار الأول", "ب) الخيار الثاني", "ج) الخيار الثالث", "د) الخيار الرابع"],
      "correctAnswer": "أ) الخيار الأول",
      "explanation": "لأن النص ذكر كذا..."
    }
  ]
}

ملاحظة: حقل "options" للاختيار المتعدد فقط. للصواب/الخطأ اجعله: ["صواب","خطأ"]. لإكمال الفراغ اجعله null.
لا تضيف أي نص خارج الـ JSON.`;

    const result = await callGeminiApi({
      systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
          image: {
            mimeType: fileMimeType || 'application/pdf',
            data: fileBase64,
          },
        },
      ],
      temperature: 0.4,
    });

    if (!result?.text) {
      return NextResponse.json({ success: false, error: 'AI generation failed — all keys exhausted' }, { status: 503 });
    }

    // Parse JSON from AI response
    let parsed: any = null;
    try {
      // Extract JSON block if wrapped in markdown
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      return NextResponse.json({ success: false, error: 'Failed to parse AI response as JSON', raw: result.text }, { status: 500 });
    }

    if (!parsed?.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json({ success: false, error: 'Invalid questions format from AI', raw: result.text }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      questions: parsed.questions,
      model: result.model,
      keyIndex: result.keyIndex,
    });

  } catch (err: any) {
    console.error('[Quiz Generate Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
