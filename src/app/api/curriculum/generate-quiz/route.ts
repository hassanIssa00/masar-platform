import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { callGeminiApi } from '@/lib/gemini';
import { curriculaList, getCurriculumBySlug, CurriculumSubject } from '@/data/curriculaData';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      subjectSlug,
      subjectName,
      gradeLabel = 'الصف الأول الابتدائي',
      fileBase64,
      fileMimeType,
      pageFrom = 1,
      pageTo = 5,
      questionType = 'multiple_choice', // 'multiple_choice' | 'true_false' | 'fill_blank'
      questionCount = 5,
      language = 'ar',
    } = body;

    // Resolve curriculum object
    const curriculum: CurriculumSubject | undefined =
      (subjectSlug && getCurriculumBySlug(subjectSlug)) ||
      curriculaList.find((c) => c.title === subjectName || c.shortTitle === subjectName) ||
      curriculaList[0];

    const finalSubjectName = subjectName || curriculum?.title || 'المنهج الدراسي';
    const cleanFrom = Math.max(1, Number(pageFrom) || 1);
    const cleanTo = Math.max(cleanFrom, Number(pageTo) || cleanFrom);
    const cleanCount = Math.min(20, Math.max(1, Number(questionCount) || 5));

    // Find relevant unit(s)
    const matchedUnits = curriculum?.units.filter(
      (u) => !(u.toPage < cleanFrom || u.fromPage > cleanTo)
    ) || [];
    const unitSummary = matchedUnits.map((u) => u.title).join('، ') || 'الوحدة الدراسية المقررة';

    // Attempt to load actual textbook page images from disk
    const pageImages: Array<{ mimeType: string; data: string }> = [];
    if (fileBase64) {
      pageImages.push({
        mimeType: fileMimeType || 'application/pdf',
        data: fileBase64,
      });
    } else if (curriculum?.slug) {
      const publicDir = path.join(process.cwd(), 'public', 'resources', 'curricula', curriculum.slug);
      // Read up to 4 representative pages from the requested range to keep request within token limits
      const pagesToLoad: number[] = [];
      const totalInRange = cleanTo - cleanFrom + 1;
      if (totalInRange <= 4) {
        for (let p = cleanFrom; p <= cleanTo; p++) pagesToLoad.push(p);
      } else {
        // Sample pages: start, middle-1, middle-2, end
        pagesToLoad.push(cleanFrom);
        pagesToLoad.push(Math.floor(cleanFrom + totalInRange * 0.33));
        pagesToLoad.push(Math.floor(cleanFrom + totalInRange * 0.66));
        pagesToLoad.push(cleanTo);
      }

      for (const pageNum of pagesToLoad) {
        const padded = String(pageNum).padStart(3, '0');
        const candidatePath = path.join(publicDir, `page-${padded}.jpg`);
        try {
          if (fs.existsSync(candidatePath)) {
            const buf = fs.readFileSync(candidatePath);
            pageImages.push({
              mimeType: 'image/jpeg',
              data: buf.toString('base64'),
            });
          }
        } catch {
          // Continue if single page read fails
        }
      }
    }

    const typeInstruction =
      questionType === 'multiple_choice'
        ? 'أسئلة اختيار من متعدد (4 خيارات لكل سؤال: أ، ب، ج، د مع تحديد خيار صحيح واحد بدقة)'
        : questionType === 'true_false'
        ? 'أسئلة صواب وخطأ (خيارات صواب / خطأ)'
        : 'أسئلة إكمال الفراغات (جملة ينقصها كلمة مفتاحية مع 3 إلى 4 خيارات)';

    const systemPrompt = `أنت موجه تربوي وخبير بإعداد المناهج والاختبارات المدرسية المعتمدة بوزارة التعليم السعودية للمرحلة الابتدائية (الصف الأول الابتدائي 1448هـ).
مهمتك: توليد أسئلة كويز تفاعلية ذكية وممتعة للطفل مستخرجة بدقة من محتوى صفحات كتاب المنهج المرفق.

القواعد التربوية الإلزامية:
1. الأسئلة يجب أن تكون مستوحاة مباشرة من محتوى صفحات الكتاب المرفقة (${finalSubjectName}، ص ${cleanFrom} إلى ص ${cleanTo}، الوحدة: ${unitSummary}).
2. صياغة واضحة، محفزة ومناسبة لعمر طالب الصف الأول الابتدائي بلغة عربية فصحى مشكولة ومبسطة.
3. الإجابة الصحيحة دقيقة وغير قابلة للبس.
4. كتابة تفسير تربوي لطيف ومبسط يشرح للطفل سبب صحة الإجابة.`;

    const userPrompt = `قم بتحليل محتوى كتاب مادة **${finalSubjectName}** (${gradeLabel}).
الصفحات المستهدفة: من صفحة (${cleanFrom}) إلى صفحة (${cleanTo}).
الوحدة المرتبطة: ${unitSummary}.

المطلوب: إنشاء **${cleanCount} أسئلة** من نوع **${typeInstruction}**.

أرجع حصراً كود JSON صارم بدون أي نص خارجه بالشكل التالي:
{
  "title": "كويز تفاعلي: ${finalSubjectName} (ص ${cleanFrom}-${cleanTo})",
  "questions": [
    {
      "id": "q1",
      "text": "نص السؤال الواضح للطفل...",
      "options": ["أ) الخيار الأول", "ب) الخيار الثاني", "ج) الخيار الثالث", "د) الخيار الرابع"],
      "correctAnswer": "أ) الخيار الأول",
      "explanation": "شرح تربوي مبسط للطفل..."
    }
  ]
}

ملاحظات:
- في أسئلة الصواب والخطأ، اجعل خيارات "options": ["صواب", "خطأ"].
- في أسئلة إكمال الفراغ، ضع الفراغ كـ (...) والخيارات هي الكلمات المناسبة.`;

    let generatedQuestions: any[] | null = null;

    try {
      const geminiResult = await callGeminiApi({
        systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
            images: pageImages.length > 0 ? pageImages : undefined,
          },
        ],
        temperature: 0.35,
        maxOutputTokens: 3000,
        timeoutMs: 14000,
      });

      if (geminiResult?.text) {
        const jsonMatch = geminiResult.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed?.questions) && parsed.questions.length > 0) {
            generatedQuestions = parsed.questions.map((q: any, idx: number) => ({
              id: q.id || `q_${idx + 1}`,
              text: q.text,
              options: Array.isArray(q.options) ? q.options : ['صواب', 'خطأ'],
              correctAnswer: q.correctAnswer || q.options?.[0] || 'صواب',
              explanation: q.explanation || `إجابة صحيحة من كتاب ${finalSubjectName}`,
            }));
          }
        }
      }
    } catch (aiErr: any) {
      console.warn('[AI Quiz Generation] Gemini call failed, using curriculum fallback:', aiErr.message);
    }

    // Fallback if AI was unavailable or returned empty questions
    if (!generatedQuestions || generatedQuestions.length === 0) {
      generatedQuestions = generateCurriculumFallbackQuestions(
        curriculum,
        finalSubjectName,
        cleanFrom,
        cleanTo,
        unitSummary,
        questionType,
        cleanCount
      );
    }

    return NextResponse.json({
      success: true,
      subjectName: finalSubjectName,
      subjectSlug: curriculum?.slug || 'curriculum',
      pageFrom: cleanFrom,
      pageTo: cleanTo,
      unitSummary,
      questionsCount: generatedQuestions.length,
      questions: generatedQuestions,
      title: `كويز ${finalSubjectName} (ص ${cleanFrom}–${cleanTo})`,
    });
  } catch (err: any) {
    console.error('[Quiz Generate Error]:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * Intelligent Curricular Fallback Generator grounded in official Saudi textbooks for Grade 1
 */
function generateCurriculumFallbackQuestions(
  curriculum: CurriculumSubject | undefined,
  subjectTitle: string,
  pageFrom: number,
  pageTo: number,
  unitSummary: string,
  questionType: string,
  count: number
): any[] {
  const slug = curriculum?.slug || 'lughati';

  // Curricular banks tailored per subject & page context
  const bankBySubject: Record<string, Array<{ text: string; options: string[]; correct: string; expl: string }>> = {
    lughati: [
      {
        text: 'في كتاب لغتي (الوحدة الأولى: أسرتي)، ما هو أول حرف نتعلمه في أسرة فواز ونورة؟',
        options: ['أ) حرف الميم (م)', 'ب) حرف الراء (ر)', 'ج) حرف السين (س)', 'د) حرف الكاف (ك)'],
        correct: 'أ) حرف الميم (م)',
        expl: 'حرف الميم هو الحرف الأول الذي تم تقديمه في درس أسرتي (مهند، مريم، مشعل).',
      },
      {
        text: 'ما هي الحركة التي توضع فوق الحرف وتجعلنا نضم الشفتين عند النطق به؟',
        options: ['أ) الفتحة', 'ب) الكسرة', 'ج) الضمة', 'د) السكون'],
        correct: 'ج) الضمة',
        expl: 'الضمة تُرسم مثل واو صغيرة فوق الحرف وتُنطق بضم الشفتين (مُ، بُ).',
      },
      {
        text: 'أي من الكلمات التالية تبدأ بحرف الباء (ب)؟',
        options: ['أ) بَابٌ', 'ب) دَفْتَرٌ', 'ج) قَلَمٌ', 'د) مَسْجِدٌ'],
        correct: 'أ) بَابٌ',
        expl: 'كلمة بَابٌ تبدأ بصوت حرف الباء مع الفتحة والمد.',
      },
      {
        text: 'الصوت القصير لحرف اللام مع الفتحة يُنطق:',
        options: ['أ) لا', 'ب) لَ', 'ج) لُو', 'د) لِي'],
        correct: 'ب) لَ',
        expl: 'الصوت القصير هو نطق الحرف مع حركته فقط دون حرف مد.',
      },
      {
        text: 'المد بالألف يسبقه حرف عليه حركة:',
        options: ['أ) الفتحة', 'ب) الضمة', 'ج) الكسرة', 'د) السكون'],
        correct: 'أ) الفتحة',
        expl: 'حرف المد بالألف يناسبه الفتحة على الحرف الممدود قبله.',
      },
    ],
    math: [
      {
        text: 'في كتاب الرياضيات، ما هو العدد الذي يأتي مباشرة بعد العدد ٤؟',
        options: ['أ) ٣', 'ب) ٥', 'ج) ٦', 'د) ٢'],
        correct: 'ب) ٥',
        expl: 'العد التصاعدي: ١، ٢، ٣، ٤، ٥.',
      },
      {
        text: 'إذا كان مع محمد ٣ تفاحات وأعطاه والده تفاحتين إضافيتين، كم تفاحة تصبح معه؟',
        options: ['أ) ٤ تفاحات', 'ب) ٥ تفاحات', 'ج) ٦ تفاحات', 'د) ٣ تفاحات'],
        correct: 'ب) ٥ تفاحات',
        expl: '٣ + ٢ = ٥ تفاحات.',
      },
      {
        text: 'أي الأشكال الهندسية التالية له ٤ أضلاع متساوية؟',
        options: ['أ) الدائرة', 'ب) المثلث', 'ج) المربع', 'د) الأسطوانة'],
        correct: 'ج) المربع',
        expl: 'المربع يتكون من أربعة أضلاع متطابقة وأربع زوايا.',
      },
      {
        text: 'العدد الأكبر بين الأعداد التالية هو:',
        options: ['أ) ٧', 'ب) ٩', 'ج) ٦', 'د) ٤'],
        correct: 'ب) ٩',
        expl: 'العدد ٩ أكبر من ٧ و ٦ و ٤ على خط الأعداد.',
      },
      {
        text: 'المجموعة التي تحتوي على صفر من العناصر تسمى مجموعة:',
        options: ['أ) خالية', 'ب) ممتلئة', 'ج) زوجية', 'د) كبيرة'],
        correct: 'أ) خالية',
        expl: 'الصفر يمثل عدم وجود أي عنصر.',
      },
    ],
    science: [
      {
        text: 'في كتاب العلوم، ماذا تحتاج النبتة لكي تنمو وتكبر؟',
        options: ['أ) الماء وضوء الشمس والهواء', 'ب) العصير فقط', 'ج) الظلام التام', 'د) السكر'],
        correct: 'أ) الماء وضوء الشمس والهواء',
        expl: 'النباتات كائنات حية تصنع غذاءها بمساعدة ضوء الشمس والماء والتربة.',
      },
      {
        text: 'أي أجزاء النبات هو الذي يثبته في التربة ويمتص الماء؟',
        options: ['أ) الجذور', 'ب) الساق', 'ج) الأوراق', 'د) الزهرة'],
        correct: 'أ) الجذور',
        expl: 'الجذور تمتد تحت الأرض لتثبيت النبات وامتصاص الماء والأملاح.',
      },
      {
        text: 'ما الحاسة التي نستخدمها لتمييز الألوان والأشكال في البيئة؟',
        options: ['أ) حاسة السمع', 'ب) حاسة البصر', 'ج) حاسة الشم', 'د) حاسة التذوق'],
        correct: 'ب) حاسة البصر',
        expl: 'نستخدم أعيننا (حاسة البصر) لرؤية الألوان والتمييز بين الأشياء.',
      },
      {
        text: 'أي من الحيوانات التالية يغطي جسمه الريش ويطير في الهواء؟',
        options: ['أ) السمكة', 'ب) العصفور', 'ج) الأرنب', 'د) الخروف'],
        correct: 'ب) العصفور',
        expl: 'الطيور مثل العصافير يغطي أجسامها الريش ولها جناحان.',
      },
      {
        text: 'تتنفس الكائنات الحية غاز:',
        options: ['أ) الأكسجين', 'ب) النيتروجين', 'ج) الهيليوم', 'د) الدخان'],
        correct: 'أ) الأكسجين',
        expl: 'جميع المخلوقات الحية تحتاج الأكسجين للتنفس والحياة.',
      },
    ],
    islamic: [
      {
        text: 'من هو ربنا وخالقنا الذي نعبده وحده لا شريك له؟',
        options: ['أ) الله عز وجل', 'ب) الملائكة', 'ج) الرسل', 'د) الناس'],
        correct: 'أ) الله عز وجل',
        expl: 'الله هو ربنا وخالق كل شيء وهو المستحق للعبادة وحده.',
      },
      {
        text: 'ما هو ديننا الحق الذي ارتضاه الله لنا؟',
        options: ['أ) الإسلام', 'ب) الصدق', 'ج) الإحسان', 'د) الكرم'],
        correct: 'أ) الإسلام',
        expl: 'ديننا هو الإسلام، وهو دين السلام والرحمة والتوحيد.',
      },
      {
        text: 'من هو نبينا وخاتم الأنبياء والمرسلين صلى الله عليه وسلم؟',
        options: ['أ) محمد صلى الله عليه وسلم', 'ب) إبراهيم عليه السلام', 'ج) موسى عليه السلام', 'د) عيسى عليه السلام'],
        correct: 'أ) محمد صلى الله عليه وسلم',
        expl: 'نبينا محمد بن عبد الله صلى الله عليه وسلم خاتم الأنبياء والمرسلين.',
      },
      {
        text: 'ما هي الكلمة العظيمة التي نقولها عند البدء في أي عمل نافع؟',
        options: ['أ) بسم الله الرحمن الرحيم', 'ب) الحمد لله', 'ج) مع السلامة', 'د) شكراً'],
        correct: 'أ) بسم الله الرحمن الرحيم',
        expl: 'نبدأ أعمالنا بالتسمية لطلب البركة والتوفيق من الله.',
      },
      {
        text: 'أول أركان الإسلام الخمسة هو:',
        options: ['أ) الشهادتان', 'ب) إقامة الصلاة', 'ج) صوم رمضان', 'د) حج البيت'],
        correct: 'أ) الشهادتان',
        expl: 'شهادة أن لا إله إلا الله وأن محمداً رسول الله هي الركن الأول.',
      },
    ],
  };

  const selectedBank = bankBySubject[slug] || bankBySubject['lughati'];
  const questions: any[] = [];

  for (let i = 0; i < count; i++) {
    const item = selectedBank[i % selectedBank.length];
    if (questionType === 'true_false') {
      const isTrue = i % 2 === 0;
      questions.push({
        id: `q_${i + 1}`,
        text: isTrue
          ? `في درس ${subjectTitle} (ص ${pageFrom}-${pageTo}): ${item.text.replace(/\?$/, '')}.`
          : `في درس ${subjectTitle}: هل يمكن الاستغناء عن مراجعة التمارين في الصفحات من ${pageFrom} إلى ${pageTo}؟`,
        options: ['صواب', 'خطأ'],
        correctAnswer: isTrue ? 'صواب' : 'خطأ',
        explanation: item.expl,
      });
    } else {
      questions.push({
        id: `q_${i + 1}`,
        text: `${item.text} (ص ${pageFrom}–${pageTo})`,
        options: item.options,
        correctAnswer: item.correct,
        explanation: item.expl,
      });
    }
  }

  return questions;
}
