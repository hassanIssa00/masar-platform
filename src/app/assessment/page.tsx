'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, ClipboardCheck, Volume2 } from 'lucide-react';
import BrandMark from '@/components/BrandMark';
import Navbar from '@/components/Navbar';
import { placementAssessments, PlacementGradeKey, PlacementQuestion } from '@/data/placementAssessments';
import { buildPlacementRecommendations, buildPlacementSummary, enrichDomains, getDecisionFromScore } from '@/data/assessmentModel';
import { getStudents, saveReport, saveStudent, StudentRecord, updateStudent } from '@/lib/localDb';
import { speakWithMasarVoice } from '@/lib/voicePackage';

type ResponseRecord = {
  question: PlacementQuestion;
  answer: string;
  correct: boolean;
};

export default function PlacementAssessmentPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <PlacementAssessmentContent />
    </Suspense>
  );
}

function PlacementAssessmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get('student');
  const [gradeKey, setGradeKey] = useState<PlacementGradeKey>('general');
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [studentName, setStudentName] = useState('');
  const [studentAge, setStudentAge] = useState('');
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const [savedReportId, setSavedReportId] = useState('');
  const [savedStudentId, setSavedStudentId] = useState('');

  const assessment = placementAssessments.find((item) => item.key === gradeKey) ?? placementAssessments[0];
  const current = assessment.questions[index];
  const selected = answers[current.id];
  const responses: ResponseRecord[] = assessment.questions.map((question) => ({
    question,
    answer: answers[question.id] ?? '',
    correct: answers[question.id] === question.correct,
  }));
  const answeredCount = Object.keys(answers).length;
  const correctCount = responses.filter((response) => response.correct).length;
  const score = assessment.questions.length ? Math.round((correctCount / assessment.questions.length) * 100) : 0;
  const progress = Math.round((answeredCount / assessment.questions.length) * 100);
  const decision = getDecisionFromScore(score);

  useEffect(() => {
    const studentId = searchParams.get('student');
    const timeout = window.setTimeout(() => {
      const existingStudent = studentId ? getStudents().find((item) => item.id === studentId) : null;
      if (existingStudent) {
        setStudent(existingStudent);
        setStudentName(existingStudent.fullName);
        setGradeKey(getGradeKeyFromStudentGrade(existingStudent.grade));
        return;
      }

      if (studentId) {
        setStudent({
          id: studentId,
          fullName: 'طالب الاختبار',
          grade: 'عام',
          reviewStatus: 'awaiting-doctor-review',
          source: 'student-wizard',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      const fromUrl = searchParams.get('level') as PlacementGradeKey | null;
      const stored = typeof window !== 'undefined' ? (localStorage.getItem('masar.assessment.gradeKey') as PlacementGradeKey | null) : null;
      const next = placementAssessments.some((item) => item.key === fromUrl)
        ? fromUrl
        : placementAssessments.some((item) => item.key === stored)
          ? stored
          : null;

      if (next) {
        setGradeKey(next);
      }
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [searchParams]);

  const isStudentFlow = Boolean(studentIdParam);

  useEffect(() => {
    if (!finished || !isStudentFlow || !savedStudentId) return;

    const timeout = window.setTimeout(() => {
      router.push(`/kids?student=${savedStudentId}`);
    }, 1400);

    return () => window.clearTimeout(timeout);
  }, [finished, isStudentFlow, router, savedStudentId]);

  const domains = useMemo(() => {
    const grouped = new Map<string, ResponseRecord[]>();
    responses.forEach((response) => {
      const key = response.question.categoryLabel;
      grouped.set(key, [...(grouped.get(key) ?? []), response]);
    });

    const baseDomains = Array.from(grouped.entries()).map(([name, items]) => {
      const domainScore = Math.round((items.filter((item) => item.correct).length / items.length) * 100);
      return {
        name,
        score: domainScore,
        note: `${items.filter((item) => item.correct).length} من ${items.length} إجابات صحيحة`,
      };
    });
    return enrichDomains(baseDomains);
  }, [responses]);
  const recommendedProgram = getRecommendedProgram(domains);

  const speak = (text: string) => void speakWithMasarVoice(text, { lang: /[a-zA-Z]/.test(text) ? 'en-US' : 'ar-SA', rate: 0.84 });

  const choose = (answer: string) => {
    setAnswers((currentAnswers) => ({ ...currentAnswers, [current.id]: answer }));
  };

  const resetForGrade = (key: PlacementGradeKey) => {
    setGradeKey(key);
    setIndex(0);
    setAnswers({});
    setFinished(false);
    setSavedReportId('');
    setSavedStudentId('');
  };

  const finish = () => {
    const fallbackStudent: StudentRecord = {
      id: studentIdParam ?? 'student_assessment',
      fullName: studentName.trim() || 'طالب الاختبار',
      grade: assessment.shortTitle,
      reviewStatus: 'awaiting-doctor-review',
      source: 'student-wizard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const savedStudent = student
      ? updateStudent(student.id, {
        fullName: studentName.trim() || student.fullName,
        grade: student.grade,
        reviewStatus: 'awaiting-doctor-review',
      }) ?? student
      : isStudentFlow
        ? saveStudent(fallbackStudent)
      : saveStudent({
        fullName: studentName.trim() || 'طالب اختبار تحديد مستوى',
        grade: assessment.shortTitle,
        reviewStatus: 'awaiting-doctor-review',
        source: 'student-wizard',
      });

    const rawReport = saveReport({
      studentId: savedStudent.id,
      studentName: savedStudent.fullName,
      grade: savedStudent.grade || assessment.shortTitle,
      program: 'إجابات اختبار الطالب التفصيلية',
      programColor: '#334155',
      score: Math.round((answeredCount / assessment.questions.length) * 100),
      status: 'pending',
      type: 'student-assessment-answers',
      summary: 'تقرير خام يحتوي على إجابات الطالب في اختبار تحديد المستوى المباشر، مخصص لمراجعة د. إسماعيل قبل اعتماد المسار.',
      recommendations: [
        'مراجعة الأسئلة غير الصحيحة بجانب إجابات ولي الأمر في الاستبيان.',
        'ملاحظة سرعة الاستجابة واحتياج الطالب للصوت أو الصورة قبل اعتماد المسار.',
      ],
      answers: responses.map((response) => ({
        question: `${response.question.categoryLabel}: ${response.question.prompt}`,
        answer: `${response.answer || 'لم يجب'} | الإجابة الصحيحة: ${response.question.correct} | ${response.correct ? 'صحيح' : 'يحتاج مراجعة'} | المهارة: ${response.question.skill}`,
      })),
      domains,
    });

    const report = saveReport({
      studentId: savedStudent.id,
      studentName: savedStudent.fullName,
      grade: savedStudent.grade || assessment.shortTitle,
      program: isStudentFlow ? 'تحليل اختبار الطالب المباشر' : 'اختبار قبول وتحديد مستوى',
      programColor: '#2563eb',
      score,
      status: isStudentFlow ? 'pending' : 'completed',
      type: isStudentFlow ? 'student-assessment-analysis' : 'placement',
      summary: buildPlacementSummary({
        assessmentTitle: assessment.title,
        score,
        domains,
        correctCount,
        total: assessment.questions.length,
      }),
      recommendations: buildPlacementRecommendations(score, domains),
      answers: responses.map((response) => ({
        question: response.question.prompt,
        answer: `${response.answer || 'لم يجب'} | الإجابة الصحيحة: ${response.question.correct} | ${response.correct ? 'صحيح' : 'يحتاج مراجعة'} | المهارة: ${response.question.skill}`,
      })),
      domains,
    });

    localStorage.setItem(
      'masar.last-placement-result',
      JSON.stringify({
        reportId: report.id,
        rawReportId: rawReport.id,
        gradeKey,
        studentAge,
        correctCount,
        total: assessment.questions.length,
        recommendedProgram,
      }),
    );
    localStorage.setItem('masar.recommended-program', recommendedProgram.href);
    localStorage.setItem('masar.current-student-id', savedStudent.id);
    setSavedReportId(report.id);
    setSavedStudentId(savedStudent.id);
    setFinished(true);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      {isStudentFlow ? (
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
            <BrandMark size="sm" />
            <div className="rounded-full bg-blue-50 px-4 py-2 text-xs font-black text-blue-800">
              اختبار الطالب محفوظ للدكتور فقط
            </div>
          </div>
        </header>
      ) : (
        <Navbar />
      )}
      <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <header className="mb-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black text-blue-700">{isStudentFlow ? 'اختبار الطالب بعد استبيان ولي الأمر' : 'اختبارات القبول وتحديد المستوى'}</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950 md:text-4xl">{isStudentFlow ? 'أجب على الأسئلة بهدوء' : '7 اختبارات مختلفة بتقرير تحليلي كامل'}</h1>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-600">
                {isStudentFlow
                  ? 'بعد انتهاء الاختبار سيتم إرسال إجاباتك لد. إسماعيل، ثم تفتح لك صفحة الطالب والألعاب بدون عرض درجات أو تشخيص.'
                  : 'اختر المستوى، أدخل بيانات الطالب، أجب على الأسئلة، وسيتم حفظ تقرير كامل بالإجابات والتحليل داخل صفحة التقارير.'}
              </p>
            </div>
            {!isStudentFlow && <Link href="/reports" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-800 hover:bg-slate-50">
              فتح التقارير
              <ArrowLeft size={17} />
            </Link>}
          </div>
        </header>

        {!isStudentFlow && <section className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {placementAssessments.map((item) => (
            <button
              key={item.key}
              onClick={() => resetForGrade(item.key)}
              className={`shrink-0 rounded-lg border px-4 py-3 text-sm font-black transition ${
                gradeKey === item.key ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.shortTitle}
            </button>
          ))}
        </section>}

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">اسم الطالب</span>
                <input value={studentName} onChange={(event) => setStudentName(event.target.value)} readOnly={isStudentFlow} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-700 read-only:text-slate-500" placeholder="اسم الطالب" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-black text-slate-700">العمر</span>
                <input value={studentAge} onChange={(event) => setStudentAge(event.target.value)} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-blue-700" placeholder="مثال: 8" />
              </label>
              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-500">المستوى الحالي</p>
                <p className="mt-1 font-black text-slate-950">{assessment.shortTitle}</p>
              </div>
            </div>

            {!finished ? (
              <article>
                <div className="mb-5 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-700 transition-all" style={{ width: `${progress}%` }} />
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-black text-blue-700">{current.categoryLabel} · سؤال {index + 1} من {assessment.questions.length}</p>
                      <h2 className="mt-3 text-2xl font-black leading-10 text-slate-950">{current.prompt}</h2>
                      <p className="mt-2 text-sm font-bold text-slate-500">المهارة: {current.skill}</p>
                    </div>
                    <button onClick={() => speak(current.prompt)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-slate-800 ring-1 ring-slate-200 hover:bg-slate-100">
                      <Volume2 size={17} />
                      اسمع السؤال
                    </button>
                  </div>

                  <div className="mt-5 grid min-h-24 place-items-center rounded-lg bg-white p-6 text-center text-5xl font-black text-slate-950 ring-1 ring-slate-200">
                    {current.visual}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {current.options.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => choose(option)}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        choose(option);
                      }}
                      className={`min-h-16 rounded-lg border px-4 py-4 text-right text-base font-black transition ${
                        selected === option
                          ? 'border-blue-700 bg-blue-50 text-blue-950 ring-2 ring-blue-200'
                          : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                {selected && (
                  <div className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
                    <p className="text-sm font-black text-slate-500">التفسير</p>
                    <p className="mt-1 text-sm font-bold leading-7 text-slate-700">{current.explanation}</p>
                  </div>
                )}

                <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
                  <button onClick={() => setIndex(Math.max(0, index - 1))} disabled={index === 0} className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 disabled:opacity-40">
                    السابق
                  </button>
                  {index < assessment.questions.length - 1 ? (
                    <button onClick={() => setIndex(index + 1)} disabled={!selected} className="rounded-lg bg-blue-700 px-6 py-3 text-sm font-black text-white disabled:opacity-40">
                      التالي
                    </button>
                  ) : (
                    <button onClick={finish} disabled={answeredCount < assessment.questions.length} className="rounded-lg bg-teal-700 px-6 py-3 text-sm font-black text-white disabled:opacity-40">
                      إنهاء وحفظ التقرير
                    </button>
                  )}
                </div>
              </article>
            ) : (
              <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
                <CheckCircle2 className="mx-auto text-emerald-700" size={42} />
                <h2 className="mt-4 text-2xl font-black text-slate-950">{isStudentFlow ? 'أحسنت، تم حفظ إجاباتك' : 'تم حفظ اختبار تحديد المستوى'}</h2>
                <p className="mt-2 text-sm font-bold leading-7 text-slate-700">
                  {isStudentFlow
                    ? 'تم إرسال إجاباتك وتقرير التحليل إلى د. إسماعيل. سيتم فتح صفحة الطالب والألعاب الآن حتى يراجع الدكتور الملف ويعتمد المسار المناسب.'
                    : `النتيجة ${score}%، القرار: ${decision.label}. تم حفظ التقرير داخل لوحة د. إسماعيل وصفحة التقارير.`}
                </p>
                <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
                  {!isStudentFlow && <Link href={`/reports?report=${savedReportId}`} className="inline-flex rounded-lg bg-slate-950 px-5 py-3 text-sm font-black text-white">
                    عرض التقرير الرسمي
                  </Link>}
                  <Link href={isStudentFlow ? `/kids?student=${savedStudentId || student?.id || studentIdParam || ''}` : recommendedProgram.href} className="inline-flex rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white">
                    {isStudentFlow ? 'فتح صفحة الطالب' : `فتح ${recommendedProgram.label}`}
                  </Link>
                </div>
                {!isStudentFlow && <p className="mt-3 text-xs font-bold text-slate-500">رقم التقرير: {savedReportId}</p>}
              </article>
            )}
          </div>

          <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-32 lg:self-start">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-blue-50 text-blue-800">
                <ClipboardCheck size={22} />
              </span>
              <div>
                <p className="text-xs font-black text-slate-500">ملخص مباشر</p>
                <h2 className="font-black text-slate-950">{assessment.shortTitle}</h2>
              </div>
            </div>
            {isStudentFlow ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-lg bg-slate-950 p-5 text-center text-white">
                  <p className="text-4xl font-black">{answeredCount}</p>
                  <p className="mt-2 text-sm font-bold text-white/70">من {assessment.questions.length} سؤال</p>
                </div>
                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-sm font-black leading-7 text-emerald-950">
                    الإجابات محفوظة للدكتور فقط. ركز في السؤال الحالي، ولا توجد درجة ظاهرة داخل تجربة الطالب.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-5 rounded-lg bg-slate-950 p-5 text-center text-white">
                  <p className="text-5xl font-black">{score}%</p>
                  <p className="mt-2 text-sm font-bold text-white/70">{correctCount} من {assessment.questions.length}</p>
                </div>
                <div className="mt-5 space-y-3">
                  {domains.map((domain) => (
                    <div key={domain.name} className="rounded-lg bg-slate-50 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm font-black text-slate-950">{domain.name}</h3>
                        <span className="text-xs font-black text-blue-800">{domain.score}%</span>
                      </div>
                      <p className="mt-1 text-xs font-bold leading-6 text-slate-600">{domain.note}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}

function getRecommendedProgram(domains: Array<{ name: string; score: number }>) {
  const weakest = [...domains].sort((first, second) => first.score - second.score)[0]?.name ?? '';

  if (weakest.includes('رياض')) {
    return { href: '/programs/math', label: 'برنامج الرياضيات المحسوسة' };
  }

  if (weakest.includes('العربية') || weakest.includes('الإنجليزية')) {
    return { href: '/programs/reading', label: 'برنامج القراءة والكتابة' };
  }

  return { href: '/programs/learning-difficulties', label: 'برنامج صعوبات التعلم والخطة الفردية' };
}

function getGradeKeyFromStudentGrade(grade: string): PlacementGradeKey {
  if (grade.includes('الأول')) return 'g1';
  if (grade.includes('الثاني')) return 'g2';
  if (grade.includes('الثالث')) return 'g3';
  if (grade.includes('الرابع')) return 'g4';
  if (grade.includes('الخامس')) return 'g5';
  if (grade.includes('السادس')) return 'g6';
  return 'general';
}
