"use client";
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { saveReport, saveStudent, saveSurvey } from '@/lib/localDb';

const SECTIONS = [
  {
    id: 'general',
    title: 'معلومات عامة',
    icon: '1',
    questions: [
      { id: 'q1', text: 'ما هو عمر الطفل؟', type: 'select', options: ['3 سنوات', '4 سنوات', '5 سنوات', '6 سنوات', '7 سنوات', '8 سنوات', '9 سنوات', '10 سنوات', '11 سنوات', '12 سنوات'] },
      { id: 'q2', text: 'ما الصف الدراسي الحالي؟', type: 'select', options: ['ما قبل المدرسة', 'الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس'] },
      { id: 'q3', text: 'هل الطفل من ذوي الاحتياجات الخاصة؟', type: 'radio', options: ['نعم', 'لا', 'غير مؤكد'] },
      { id: 'q4', text: 'هل توجد إصابات أو أمراض مزمنة؟', type: 'radio', options: ['نعم', 'لا'] },
      { id: 'q21', text: 'هل ينام الطفل عدد ساعات كافياً قبل يوم الدراسة؟', type: 'radio', options: ['غالباً', 'أحياناً', 'نادراً'] },
      { id: 'q22', text: 'هل يستخدم الطفل الأجهزة لفترات طويلة يومياً؟', type: 'radio', options: ['أكثر من ساعتين', 'ساعة تقريباً', 'قليل جداً'] },
      { id: 'q23', text: 'ما اللغة الأكثر استخداماً في البيت؟', type: 'select', options: ['العربية', 'العربية والإنجليزية', 'الإنجليزية غالباً', 'لغة أخرى'] },
    ],
  },
  {
    id: 'language',
    title: 'المهارات اللغوية',
    icon: '2',
    questions: [
      { id: 'q5', text: 'هل يواجه الطفل صعوبة في نطق الحروف بشكل صحيح؟', type: 'radio', options: ['نعم دائماً', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q6', text: 'هل يتلعثم أو يتأتئ عند الكلام؟', type: 'radio', options: ['نعم دائماً', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q7', text: 'هل يستطيع قراءة جمل بسيطة؟', type: 'radio', options: ['نعم بطلاقة', 'نعم ببطء', 'بصعوبة', 'لا'] },
      { id: 'q8', text: 'كيف تقيّم ثروته اللغوية مقارنة بأقرانه؟', type: 'scale' },
      { id: 'q24', text: 'هل يفهم التعليمات الشفهية من خطوتين؟', type: 'radio', options: ['نعم', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q25', text: 'هل يحكي ما حدث في المدرسة بجمل واضحة؟', type: 'radio', options: ['نعم', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q26', text: 'هل يخلط بين أصوات حروف مثل س/ص أو ت/ط؟', type: 'radio', options: ['دائماً', 'أحياناً', 'نادراً', 'لا'] },
    ],
  },
  {
    id: 'social',
    title: 'المهارات الاجتماعية',
    icon: '3',
    questions: [
      { id: 'q9', text: 'هل يستطيع التفاعل مع أقرانه بشكل طبيعي؟', type: 'radio', options: ['نعم', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q10', text: 'هل يفضل اللعب بمفرده؟', type: 'radio', options: ['دائماً', 'أحياناً', 'نادراً'] },
      { id: 'q11', text: 'هل يعاني من صعوبة في التعبير عن مشاعره؟', type: 'radio', options: ['نعم', 'أحياناً', 'لا'] },
      { id: 'q12', text: 'هل يحافظ على التواصل البصري أثناء الحديث؟', type: 'radio', options: ['نعم دائماً', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q27', text: 'هل يشارك في أنشطة جماعية داخل المدرسة؟', type: 'radio', options: ['نعم', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q28', text: 'هل يستطيع انتظار دوره في اللعب أو الحديث؟', type: 'radio', options: ['نعم', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q29', text: 'هل يتقبل توجيهات المعلم أو الأخصائي؟', type: 'radio', options: ['غالباً', 'أحياناً', 'بصعوبة', 'يرفض'] },
    ],
  },
  {
    id: 'behavior',
    title: 'السلوك والانتباه',
    icon: '4',
    questions: [
      { id: 'q13', text: 'هل يجد صعوبة في الجلوس هادئاً لفترة؟', type: 'radio', options: ['نعم دائماً', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q14', text: 'هل يصدر سلوكيات متكررة (حركات، أصوات)؟', type: 'radio', options: ['نعم', 'أحياناً', 'لا'] },
      { id: 'q15', text: 'كيف يكون تصرفه عند تغيير الروتين اليومي؟', type: 'radio', options: ['هادئ ومرن', 'قليل الانزعاج', 'منزعج جداً', 'عدوانية أو بكاء شديد'] },
      { id: 'q16', text: 'قيّم مستوى الانتباه والتركيز (1 أضعف - 5 أقوى):', type: 'scale' },
      { id: 'q30', text: 'هل يتأثر الطفل بالأصوات العالية أو الازدحام؟', type: 'radio', options: ['كثيراً', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q31', text: 'هل يحتاج حركة كثيرة أثناء الجلوس للمذاكرة؟', type: 'radio', options: ['دائماً', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q32', text: 'هل يستطيع إنهاء مهمة قصيرة دون تركها؟', type: 'radio', options: ['نعم', 'أحياناً', 'نادراً', 'لا'] },
    ],
  },
  {
    id: 'academic',
    title: 'المهارات الأكاديمية',
    icon: '5',
    questions: [
      { id: 'q17', text: 'كيف يؤدي واجباته المدرسية؟', type: 'radio', options: ['باستقلالية تامة', 'بمساعدة بسيطة', 'يحتاج مساعدة كبيرة', 'يرفض تماماً'] },
      { id: 'q18', text: 'هل يواجه صعوبة في الرياضيات؟', type: 'radio', options: ['نعم', 'أحياناً', 'لا'] },
      { id: 'q19', text: 'هل يواجه صعوبة في الكتابة (إمساك القلم، الترتيب)؟', type: 'radio', options: ['نعم دائماً', 'أحياناً', 'لا'] },
      { id: 'q20', text: 'قيّم مستواه الأكاديمي العام مقارنة بأقرانه:', type: 'scale' },
      { id: 'q33', text: 'هل يحضر واجباته المدرسية في الوقت المحدد؟', type: 'radio', options: ['غالباً', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q34', text: 'ما أكثر مادة يحتاج فيها دعماً؟', type: 'select', options: ['القراءة', 'الكتابة', 'الرياضيات', 'العلوم', 'الإنجليزية', 'السلوك والانتباه'] },
      { id: 'q35', text: 'هل يوجد تواصل منتظم بين الأسرة والمدرسة؟', type: 'radio', options: ['نعم', 'أحياناً', 'نادراً', 'لا'] },
    ],
  },
];

type Answers = Record<string, string | number>;

const answerScores: Record<string, Record<string, number>> = {
  q3: { نعم: 40, لا: 100, 'غير مؤكد': 60 },
  q4: { نعم: 55, لا: 100 },
  q5: { 'نعم دائماً': 25, أحياناً: 55, نادراً: 80, لا: 100 },
  q6: { 'نعم دائماً': 25, أحياناً: 55, نادراً: 80, لا: 100 },
  q7: { 'نعم بطلاقة': 100, 'نعم ببطء': 75, بصعوبة: 35, لا: 15 },
  q9: { نعم: 100, أحياناً: 70, نادراً: 40, لا: 20 },
  q10: { دائماً: 30, أحياناً: 60, نادراً: 85 },
  q11: { نعم: 30, أحياناً: 60, لا: 100 },
  q12: { 'نعم دائماً': 100, أحياناً: 65, نادراً: 35, لا: 15 },
  q13: { 'نعم دائماً': 25, أحياناً: 55, نادراً: 80, لا: 100 },
  q14: { نعم: 35, أحياناً: 65, لا: 100 },
  q15: { 'هادئ ومرن': 100, 'قليل الانزعاج': 75, 'منزعج جداً': 35, 'عدوانية أو بكاء شديد': 15 },
  q17: { 'باستقلالية تامة': 100, 'بمساعدة بسيطة': 75, 'يحتاج مساعدة كبيرة': 40, 'يرفض تماماً': 15 },
  q18: { نعم: 30, أحياناً: 60, لا: 100 },
  q19: { 'نعم دائماً': 25, أحياناً: 60, لا: 100 },
  q21: { غالباً: 100, أحياناً: 65, نادراً: 35 },
  q22: { 'أكثر من ساعتين': 45, 'ساعة تقريباً': 75, 'قليل جداً': 100 },
  q24: { نعم: 100, أحياناً: 70, نادراً: 40, لا: 20 },
  q25: { نعم: 100, أحياناً: 70, نادراً: 40, لا: 20 },
  q26: { دائماً: 25, أحياناً: 55, نادراً: 80, لا: 100 },
  q27: { نعم: 100, أحياناً: 70, نادراً: 40, لا: 20 },
  q28: { نعم: 100, أحياناً: 70, نادراً: 40, لا: 20 },
  q29: { غالباً: 100, أحياناً: 70, بصعوبة: 40, يرفض: 20 },
  q30: { كثيراً: 30, أحياناً: 60, نادراً: 85, لا: 100 },
  q31: { دائماً: 35, أحياناً: 65, نادراً: 85, لا: 100 },
  q32: { نعم: 100, أحياناً: 70, نادراً: 40, لا: 20 },
  q33: { غالباً: 100, أحياناً: 70, نادراً: 40, لا: 20 },
  q35: { نعم: 100, أحياناً: 75, نادراً: 45, لا: 25 },
};

function getSurveyQuestionScore(questionId: string, answer: string | number | undefined) {
  if (answer === undefined || answer === '') return null;

  if (['q8', 'q16', 'q20'].includes(questionId)) {
    return Math.max(20, Math.min(100, Number(answer) * 20));
  }

  return answerScores[questionId]?.[String(answer)] ?? null;
}

function getSurveyAnalysis(answers: Answers) {
  const domains = SECTIONS.map((sectionItem) => {
    const scores = sectionItem.questions
      .map((question) => getSurveyQuestionScore(question.id, answers[question.id]))
      .filter((score): score is number => score !== null);
    const score = scores.length ? Math.round(scores.reduce((total, item) => total + item, 0) / scores.length) : 0;
    const answered = sectionItem.questions.filter((question) => answers[question.id]).length;
    const note =
      score >= 80
        ? 'مؤشرات مطمئنة مع متابعة دورية.'
        : score >= 60
          ? 'احتياج متوسط يحتاج تدريباً منظماً.'
          : 'أولوية تدخل ومراجعة أخصائي.';

    return {
      name: sectionItem.title,
      score,
      note: `${answered} من ${sectionItem.questions.length} إجابات. ${note}`,
    };
  });
  const scoredDomains = domains.filter((domain) => domain.score > 0);
  const score = scoredDomains.length ? Math.round(scoredDomains.reduce((total, item) => total + item.score, 0) / scoredDomains.length) : 0;
  const priorities = [...scoredDomains].sort((first, second) => first.score - second.score).slice(0, 2);
  const priorityNames = priorities.map((item) => item.name).join(' و ') || 'المجالات الأساسية';

  return {
    score,
    domains,
    summary: `تحليل الاستبيان يشير إلى مؤشر جاهزية ${score}%. المجالات التي تحتاج متابعة أولاً: ${priorityNames}. هذه النتيجة لا تمثل تشخيصاً طبياً نهائياً، لكنها توجه جلسة التقييم المباشر.`,
    recommendations: [
      `ابدأ المقابلة التشخيصية بمراجعة ${priorityNames} وربطها بأداء الطالب داخل الفصل والبيت.`,
      'حوّل كل مجال ضعيف إلى هدف قابل للقياس: دقة الأداء، زمن الاستجابة، ونوع المساعدة.',
      'استخدم أنشطة قصيرة بصوت واضح وصورة قبل السؤال، خصوصاً مع الطلاب الذين يظهر عليهم تشتت أو حساسية حسية.',
      'أرسل لولي الأمر مهمة منزلية بسيطة من البيئة السعودية لمدة 5 دقائق يومياً وسجل الاستجابة.',
      'أعد الاستبيان بعد 4 أسابيع وقارن المجال الأضعف قبل وبعد الخطة.',
    ],
  };
}

export default function SurveyPage() {
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [studentName, setStudentName] = useState('');
  const [grade, setGrade] = useState('الصف الأول');
  const [parentPhone, setParentPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const section = SECTIONS[currentSection];
  const totalQuestions = SECTIONS.reduce((total, item) => total + item.questions.length, 0);
  const progress = Math.round(((currentSection) / SECTIONS.length) * 100);

  const setAnswer = (qid: string, val: string | number) => {
    setAnswers(prev => ({ ...prev, [qid]: val }));
  };

  const handleSubmit = () => {
    const analysis = getSurveyAnalysis(answers);
    const savedStudent = saveStudent({
      fullName: studentName.trim() || 'طالب من الاستبيان',
      grade,
      parentPhone,
      source: 'survey',
    });

    saveSurvey({
      studentId: savedStudent.id,
      studentName: savedStudent.fullName,
      grade,
      parentPhone,
      answers,
    });

    saveReport({
      studentId: savedStudent.id,
      studentName: savedStudent.fullName,
      grade,
      program: 'تحليل الاستبيان',
      programColor: '#0f766e',
      score: analysis.score,
      status: 'pending',
      type: 'survey-analysis',
      summary: analysis.summary,
      recommendations: analysis.recommendations,
      answers: SECTIONS.flatMap((sectionItem) =>
        sectionItem.questions.map((question) => ({
          question: question.text,
          answer: String(answers[question.id] ?? 'لم يتم تسجيل إجابة'),
        })),
      ),
      domains: analysis.domains,
    });

    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white rounded-3xl shadow-xl p-12 max-w-2xl w-full text-center animate-slide-up">
            <h1 className="text-3xl font-bold text-[#1E6FBF] mb-4">شكراً! تم استلام الاستبيان</h1>
            <p className="text-gray-600 mb-8">سيقوم فريق د. إسماعيل عيسى بمراجعة إجاباتك وإعداد تقرير شامل خلال 24 ساعة.</p>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8 text-right space-y-3">
              <h2 className="font-bold text-green-700 text-xl text-center mb-4">ملخص الاستبيان</h2>
              <p className="text-gray-700"><strong>عدد الأسئلة المجاب عليها:</strong> {Object.keys(answers).length} / {totalQuestions}</p>
              <p className="text-gray-700"><strong>الأقسام المكتملة:</strong> {SECTIONS.length} أقسام</p>
              <p className="text-gray-700"><strong>الحالة:</strong> قيد المراجعة من قِبل الأخصائي</p>
            </div>
            <button onClick={() => { setSubmitted(false); setCurrentSection(0); setAnswers({}); }}
              className="bg-[#1E6FBF] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#0A3D7A] transition">
              إعادة الاستبيان
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFB] flex flex-col">
      <Navbar />
      <div className="container mx-auto px-4 py-10 max-w-3xl">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#1E6FBF] mb-2">استبيان تقييم الطالب</h1>
          <p className="text-gray-500">يُرجى الإجابة بصدق — ستساعدنا إجاباتك في تقديم أفضل خدمة لطفلك</p>
        </div>

        <div className="mb-8 grid gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-gray-700">اسم الطالب</span>
            <input value={studentName} onChange={(event) => setStudentName(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold outline-none focus:border-[#1E6FBF]" placeholder="اسم الطالب" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-gray-700">الصف</span>
            <select value={grade} onChange={(event) => setGrade(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold outline-none focus:border-[#1E6FBF]">
              <option>الروضة</option>
              <option>الصف الأول</option>
              <option>الصف الثاني</option>
              <option>الصف الثالث</option>
              <option>الصف الرابع</option>
              <option>الصف الخامس</option>
              <option>الصف السادس</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-gray-700">هاتف ولي الأمر</span>
            <input value={parentPhone} onChange={(event) => setParentPhone(event.target.value)} className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold outline-none focus:border-[#1E6FBF]" placeholder="01000000000" />
          </label>
        </div>

        {/* Overall Progress */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-8">
          <div className="flex justify-between text-sm font-bold text-gray-600 mb-2">
            <span>التقدم الكلي</span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#1E6FBF] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between mt-3">
            {SECTIONS.map((s, i) => (
              <button key={s.id} onClick={() => setCurrentSection(i)}
                className={`flex flex-col items-center gap-1 text-xs font-bold transition-all ${i === currentSection ? 'text-[#1E6FBF] scale-110' : i < currentSection ? 'text-[#2ECC71]' : 'text-gray-300'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center ${i === currentSection ? 'bg-[#1E6FBF] text-white' : i < currentSection ? 'bg-[#2ECC71] text-white' : 'bg-gray-100'}`}>
                  {i < currentSection ? 'تم' : s.icon}
                </span>
                <span className="hidden md:block">{s.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Current Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
          <div className="bg-[#1E6FBF] p-6 text-white">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <span>{section.icon}</span> {section.title}
            </h2>
            <p className="text-white/70 text-sm mt-1">القسم {currentSection + 1} من {SECTIONS.length}</p>
          </div>

          <div className="p-8 space-y-8">
            {section.questions.map((q, qi) => (
              <div key={q.id} className="bg-gray-50 rounded-xl p-6 border border-gray-100">
                <p className="font-bold text-gray-800 mb-4">{qi + 1}. {q.text}</p>

                {q.type === 'radio' && (
                  <div className="grid grid-cols-2 gap-3">
                    {q.options!.map(opt => (
                      <label key={opt} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${answers[q.id] === opt ? 'border-[#1E6FBF] bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                        <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt}
                          onChange={() => setAnswer(q.id, opt)} className="w-4 h-4 text-[#1E6FBF]" />
                        <span className="font-medium text-gray-700 text-sm">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'select' && (
                  <select value={answers[q.id] as string || ''} onChange={e => setAnswer(q.id, e.target.value)}
                    className="w-full px-4 py-3 border-2 rounded-xl bg-white focus:ring-2 focus:ring-blue-300 outline-none border-gray-200 font-medium">
                    <option value="">اختر...</option>
                    {q.options!.map(opt => <option key={opt}>{opt}</option>)}
                  </select>
                )}

                {q.type === 'scale' && (
                  <div className="flex gap-3 justify-center">
                    {[1, 2, 3, 4, 5].map(v => (
                      <button key={v} onClick={() => setAnswer(q.id, v)}
                        className={`w-14 h-14 rounded-full text-xl font-black border-2 transition-all duration-200 ${answers[q.id] === v ? 'bg-[#1E6FBF] text-white border-[#1E6FBF] scale-110 shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:border-[#1E6FBF] hover:text-[#1E6FBF]'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
            disabled={currentSection === 0}
            className={`px-8 py-3 rounded-xl font-bold transition ${currentSection === 0 ? 'opacity-0 cursor-default' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
            السابق
          </button>
          <span className="text-sm font-bold text-gray-500">{currentSection + 1} / {SECTIONS.length}</span>
          {currentSection < SECTIONS.length - 1 ? (
            <button onClick={() => setCurrentSection(currentSection + 1)}
              className="bg-[#1E6FBF] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#0A3D7A] transition shadow-md">
              التالي
            </button>
          ) : (
            <button onClick={handleSubmit}
              className="bg-[#2ECC71] text-white px-8 py-3 rounded-xl font-bold hover:bg-green-600 transition shadow-md">
              إرسال الاستبيان
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
