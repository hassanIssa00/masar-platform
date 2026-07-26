"use client";
import { useState } from 'react';
import Navbar from '@/components/Navbar';

const SECTIONS = [
  {
    id: 'general',
    title: 'معلومات عامة',
    icon: '👤',
    questions: [
      { id: 'q1', text: 'ما هو عمر الطفل؟', type: 'select', options: ['3 سنوات', '4 سنوات', '5 سنوات', '6 سنوات', '7 سنوات', '8 سنوات', '9 سنوات', '10 سنوات', '11 سنوات', '12 سنوات'] },
      { id: 'q2', text: 'ما الصف الدراسي الحالي؟', type: 'select', options: ['ما قبل المدرسة', 'الصف الأول', 'الصف الثاني', 'الصف الثالث', 'الصف الرابع', 'الصف الخامس', 'الصف السادس'] },
      { id: 'q3', text: 'هل الطفل من ذوي الاحتياجات الخاصة؟', type: 'radio', options: ['نعم', 'لا', 'غير مؤكد'] },
      { id: 'q4', text: 'هل توجد إصابات أو أمراض مزمنة؟', type: 'radio', options: ['نعم', 'لا'] },
    ],
  },
  {
    id: 'language',
    title: 'المهارات اللغوية',
    icon: '🗣️',
    questions: [
      { id: 'q5', text: 'هل يواجه الطفل صعوبة في نطق الحروف بشكل صحيح؟', type: 'radio', options: ['نعم دائماً', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q6', text: 'هل يتلعثم أو يتأتئ عند الكلام؟', type: 'radio', options: ['نعم دائماً', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q7', text: 'هل يستطيع قراءة جمل بسيطة؟', type: 'radio', options: ['نعم بطلاقة', 'نعم ببطء', 'بصعوبة', 'لا'] },
      { id: 'q8', text: 'كيف تقيّم ثروته اللغوية مقارنة بأقرانه؟', type: 'scale' },
    ],
  },
  {
    id: 'social',
    title: 'المهارات الاجتماعية',
    icon: '👫',
    questions: [
      { id: 'q9', text: 'هل يستطيع التفاعل مع أقرانه بشكل طبيعي؟', type: 'radio', options: ['نعم', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q10', text: 'هل يفضل اللعب بمفرده؟', type: 'radio', options: ['دائماً', 'أحياناً', 'نادراً'] },
      { id: 'q11', text: 'هل يعاني من صعوبة في التعبير عن مشاعره؟', type: 'radio', options: ['نعم', 'أحياناً', 'لا'] },
      { id: 'q12', text: 'هل يحافظ على التواصل البصري أثناء الحديث؟', type: 'radio', options: ['نعم دائماً', 'أحياناً', 'نادراً', 'لا'] },
    ],
  },
  {
    id: 'behavior',
    title: 'السلوك والانتباه',
    icon: '🧠',
    questions: [
      { id: 'q13', text: 'هل يجد صعوبة في الجلوس هادئاً لفترة؟', type: 'radio', options: ['نعم دائماً', 'أحياناً', 'نادراً', 'لا'] },
      { id: 'q14', text: 'هل يصدر سلوكيات متكررة (حركات، أصوات)؟', type: 'radio', options: ['نعم', 'أحياناً', 'لا'] },
      { id: 'q15', text: 'كيف يكون تصرفه عند تغيير الروتين اليومي؟', type: 'radio', options: ['هادئ ومرن', 'قليل الانزعاج', 'منزعج جداً', 'عدوانية أو بكاء شديد'] },
      { id: 'q16', text: 'قيّم مستوى الانتباه والتركيز (1 أضعف - 5 أقوى):', type: 'scale' },
    ],
  },
  {
    id: 'academic',
    title: 'المهارات الأكاديمية',
    icon: '📚',
    questions: [
      { id: 'q17', text: 'كيف يؤدي واجباته المدرسية؟', type: 'radio', options: ['باستقلالية تامة', 'بمساعدة بسيطة', 'يحتاج مساعدة كبيرة', 'يرفض تماماً'] },
      { id: 'q18', text: 'هل يواجه صعوبة في الرياضيات؟', type: 'radio', options: ['نعم', 'أحياناً', 'لا'] },
      { id: 'q19', text: 'هل يواجه صعوبة في الكتابة (إمساك القلم، الترتيب)؟', type: 'radio', options: ['نعم دائماً', 'أحياناً', 'لا'] },
      { id: 'q20', text: 'قيّم مستواه الأكاديمي العام مقارنة بأقرانه:', type: 'scale' },
    ],
  },
];

type Answers = Record<string, string | number>;

export default function SurveyPage() {
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);

  const section = SECTIONS[currentSection];
  const progress = Math.round(((currentSection) / SECTIONS.length) * 100);

  const setAnswer = (qid: string, val: string | number) => {
    setAnswers(prev => ({ ...prev, [qid]: val }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFB] flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="bg-white rounded-3xl shadow-xl p-12 max-w-2xl w-full text-center animate-slide-up">
            <div className="text-7xl mb-6">🎉</div>
            <h1 className="text-3xl font-bold text-[#1E6FBF] mb-4">شكراً! تم استلام الاستبيان</h1>
            <p className="text-gray-600 mb-8">سيقوم فريق د. إسماعيل عيسى بمراجعة إجاباتك وإعداد تقرير شامل خلال 24 ساعة.</p>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-8 text-right space-y-3">
              <h2 className="font-bold text-green-700 text-xl text-center mb-4">ملخص الاستبيان</h2>
              <p className="text-gray-700">✅ <strong>عدد الأسئلة المجاب عليها:</strong> {Object.keys(answers).length} / 20</p>
              <p className="text-gray-700">📋 <strong>الأقسام المكتملة:</strong> {SECTIONS.length} أقسام</p>
              <p className="text-gray-700">🔄 <strong>الحالة:</strong> قيد المراجعة من قِبل الأخصائي</p>
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
                  {i < currentSection ? '✓' : s.icon}
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
              التالي ←
            </button>
          ) : (
            <button onClick={handleSubmit}
              className="bg-[#2ECC71] text-white px-8 py-3 rounded-xl font-bold hover:bg-green-600 transition shadow-md">
              إرسال الاستبيان ✅
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
