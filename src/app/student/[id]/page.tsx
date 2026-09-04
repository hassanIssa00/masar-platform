'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, FileText, UserRound } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ProgressBar from '@/components/ProgressBar';
import { getReports, getStudents, getSession, getAccounts, hydrateSessionFromServer, ReportRecord, StudentRecord, saveStudent } from '@/lib/cloudStore';
import { getClassStudents } from '@/lib/classDb';
import { pullCloudDataToLocal } from '@/lib/firestoreSync';
import { normalizeArabicText, isParentChildNameMatch } from '@/lib/nameMatching';

import { getPlayableAudioUrl } from '@/app/assessment/page';

type StudentMediaItem = {
  id: string;
  type: 'audio' | 'image';
  dataUrl: string;
  label: string;
  categoryLabel?: string;
  createdAt?: string;
};

function sanitizeAudioSrc(src?: string): string {
  if (!src) return '';
  return getPlayableAudioUrl(src);
}

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadStudentProfile = async () => {
      await pullCloudDataToLocal(['students', 'reports', 'classStudents', 'accounts']).catch(() => {});
      if (cancelled) return;

      const session = getSession() ?? await hydrateSessionFromServer();
      if (cancelled) return;
      const role = session?.role || 'parent';
      setUserRole(role);

      if (session?.role === 'student') {
        router.replace('/school-student');
        return;
      }
      if (session?.role === 'parent') {
        router.replace(params?.id ? `/parent?student=${params.id}` : '/parent');
        return;
      }

      const allSt = getStudents();
      const classSt = getClassStudents();
      const allAcc = getAccounts();
      const allKnown = [...allSt, ...classSt];

      // 1. Find student by direct ID
      let found = allKnown.find((item) => item.id === params.id) ?? null;

      // 2. If not found or if found has a generic/placeholder name, find real student
      const isGeneric = (n?: string | null) => !n || n.includes('جديد') || n.includes('الاستبيان') || n === 'طالب' || n === 'الطالب';

      if (!found || isGeneric(found.fullName)) {
        const allReports = getReports();
        const rep = allReports.find((r) => r.studentId === params.id || (found && r.studentId === found.id));
        const realTwin = allKnown.find((st) =>
          !isGeneric(st.fullName) &&
          (st.id === params.id ||
           (rep?.studentName && normalizeArabicText(st.fullName) === normalizeArabicText(rep.studentName)))
        );

        if (realTwin) {
          found = { ...found, ...realTwin };
        } else if (rep?.studentName && !isGeneric(rep.studentName)) {
          found = {
            ...(found || {}),
            id: params.id,
            fullName: rep.studentName,
            grade: rep.grade || found?.grade || 'الصف الأول الابتدائي',
            source: 'student-wizard',
            createdAt: found?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as StudentRecord;
        } else {
          const acc = allAcc.find((a) => (a.id === params.id || (found && a.linkedStudentId === found.id)) && !isGeneric(a.name));
          if (acc) {
            found = {
              ...(found || {}),
              id: params.id,
              fullName: acc.name,
              photoUrl: acc.photoUrl || found?.photoUrl,
              grade: found?.grade || 'الصف الأول الابتدائي',
              source: 'student-wizard',
              createdAt: found?.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as StudentRecord;
          }
        }
      }

      // 3. Find any matching reports by ID or student name
      const allReports = getReports();
      let foundReports = allReports.filter((report) => {
        if (report.studentId === params.id) return true;
        if (found) {
          if (report.studentId === found.id) return true;
          if (normalizeArabicText(report.studentName) === normalizeArabicText(found.fullName)) return true;
          if (isParentChildNameMatch(report.studentName, found.fullName)) return true;
        }
        return false;
      });

      // 4. If student was not found in students table but reports exist with this ID/name, reconstruct
      if (!found && foundReports.length > 0) {
        const primaryRep = foundReports[0];
        found = allKnown.find((st) => normalizeArabicText(st.fullName) === normalizeArabicText(primaryRep.studentName)) ?? {
          id: params.id,
          fullName: primaryRep.studentName || 'طالب مسار',
          grade: primaryRep.grade || 'الصف الأول الابتدائي',
          reviewStatus: 'awaiting-doctor-review',
          source: 'student-wizard',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as StudentRecord;
      }

      // 5. Deeply enrich student with twin data (photo, dateOfBirth, nationalId, media)
      if (found) {
        const foundRecord = found as any;
        const foundName = foundRecord.fullName || '';
        const norm = normalizeArabicText(foundName);
        const twins = allKnown.filter((s: any) =>
          normalizeArabicText(s.fullName) === norm ||
          isParentChildNameMatch(s.fullName, foundName) ||
          isParentChildNameMatch(foundName, s.fullName)
        );

        const bestPhoto =
          foundRecord.photoUrl ||
          twins.find((t: any) => t.photoUrl)?.photoUrl ||
          allAcc.find((a) => a.photoUrl && normalizeArabicText(a.name) === norm)?.photoUrl ||
          '';

        const bestDob =
          foundRecord.dateOfBirth ||
          twins.find((t: any) => t.dateOfBirth)?.dateOfBirth ||
          '';

        const bestNationalId =
          foundRecord.nationalId ||
          twins.find((t: any) => t.nationalId)?.nationalId ||
          '';

        const foundMedia = foundRecord.media || {};
        const mergedMedia = {
          ...(twins.reduce((acc: any, t: any) => ({ ...acc, ...(t.media || {}) }), {})),
          ...foundMedia,
        };

        found = {
          ...foundRecord,
          photoUrl: bestPhoto,
          dateOfBirth: bestDob,
          nationalId: bestNationalId,
          media: Object.keys(mergedMedia).length > 0 ? mergedMedia : foundMedia,
        };
      }

      setStudent(found as StudentRecord | null);
      setReports(foundReports);
      setLoading(false);
    };

    void loadStudentProfile();
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  const isStaff = userRole === 'doctor' || userRole === 'specialist';
  const isStudent = userRole === 'student';

  const mediaList = useMemo<StudentMediaItem[]>(() => {
    const list: StudentMediaItem[] = [];
    const norm = normalizeArabicText(student?.fullName);

    // 1. From student's own media
    if (student?.media) {
      Object.entries(student.media).forEach(([key, val]) => {
        if (val && (val.dataUrl || (val as any).blobUrl)) {
          list.push({ id: key, ...val });
        }
      });
    }

    // 2. From all matching reports (combining state reports + getReports with full patronymic matching)
    const allReports = getReports();
    const matchingReports = [
      ...reports,
      ...allReports.filter((rep) => {
        if (reports.some((r) => r.id === rep.id)) return false;
        if (rep.studentId === params.id) return true;
        if (student) {
          if (rep.studentId === student.id) return true;
          if (normalizeArabicText(rep.studentName) === norm) return true;
          if (
            isParentChildNameMatch(rep.studentName, student.fullName) ||
            isParentChildNameMatch(student.fullName, rep.studentName)
          ) return true;
        }
        return false;
      }),
    ];

    matchingReports.forEach((rep) => {
      if (rep.media) {
        Object.entries(rep.media).forEach(([key, val]) => {
          if (val && (val.dataUrl || (val as any).blobUrl)) {
            const isDup = list.some((item) => (item.dataUrl && item.dataUrl === val.dataUrl) || item.id === `${rep.id}_${key}`);
            if (!isDup) {
              list.push({ id: `${rep.id}_${key}`, ...val });
            }
          }
        });
      }
    });

    // 3. From twin records
    const allSt = getStudents();
    const twins = allSt.filter((s) =>
      s.id === params.id ||
      (student && s.id === student.id) ||
      normalizeArabicText(s.fullName) === norm ||
      (student && (
        isParentChildNameMatch(s.fullName, student.fullName) ||
        isParentChildNameMatch(student.fullName, s.fullName)
      ))
    );

    twins.forEach((t) => {
      if (t.media) {
        Object.entries(t.media).forEach(([key, val]) => {
          if (val && (val.dataUrl || (val as any).blobUrl)) {
            const isDup = list.some((item) => (item.dataUrl && item.dataUrl === val.dataUrl) || item.id === `twin_${t.id}_${key}`);
            if (!isDup) {
              list.push({ id: `twin_${t.id}_${key}`, ...val });
            }
          }
        });
      }
    });

    // 4. From report answers (if answers recorded oral/drawing attachments)
    matchingReports.forEach((rep) => {
      if (Array.isArray(rep.answers)) {
        rep.answers.forEach((ans, idx) => {
          if (!ans || !ans.answer) return;
          const isAudio = ans.answer.includes('مرفق: تسجيل صوتي') || ans.answer.includes('تسجيل صوتي محفوظ');
          const isImage = ans.answer.includes('مرفق: رسم') || ans.answer.includes('رسم محفوظ');
          if (isAudio || isImage) {
            const label = ans.question || `بند تقييم ${idx + 1}`;
            const alreadyExists = list.some((item) => item.label === label);
            if (!alreadyExists) {
              list.push({
                id: `ans_${rep.id}_${idx}`,
                type: isAudio ? 'audio' : 'image',
                dataUrl: '', // Documented in clinical report
                label,
                categoryLabel: isAudio ? 'استجابة شفهية موثقة بالتقرير' : 'رسم يدوي موثق بالتقرير',
                createdAt: rep.date,
              });
            }
          }
        });
      }
    });

    return list;
  }, [student, reports, params.id]);

  const audioList = mediaList.filter((item: StudentMediaItem) => item.type === 'audio');
  const imageList = mediaList.filter((item: StudentMediaItem) => item.type === 'image');

  const tabs = [
    { id: 'profile', name: 'البروفايل' },
    { id: 'recordings', name: `التسجيلات والمرفقات (${mediaList.length})` },
    { id: 'plan', name: 'خطة التعلم' },
    ...(isStaff ? [{ id: 'reports', name: 'التقارير الطبيّة (للدكتور فقط)' }] : []),
    { id: 'progress', name: 'التقدم' },
  ];

  // Show loading state while fetching
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-slate-950">
        <Navbar />
        <main className="mx-auto grid min-h-[70svh] max-w-2xl place-items-center px-4 py-8">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-teal-700" />
            <p className="mt-4 text-sm font-black text-slate-600">جاري تحميل ملف الطالب...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!student) {
    const backHref = isStaff ? '/student/new' : isStudent ? '/assessment' : '/parent';
    const backLabel = isStaff ? 'إضافة طالب' : isStudent ? 'العودة للاختبار' : 'العودة للرئيسية';
    return (
      <div className="min-h-screen bg-[var(--background)] text-slate-950">
        <Navbar />
        <main className="mx-auto grid min-h-[70svh] max-w-2xl place-items-center px-4 py-8">
          <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <UserRound className="mx-auto text-slate-400" size={44} />
            <h1 className="mt-4 text-2xl font-black text-slate-950">ملف الطالب غير موجود</h1>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-600">لا توجد بيانات محفوظة لهذا الرابط.</p>
            <Link href={backHref} className="mt-5 inline-flex rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white">
              {backLabel}
            </Link>
          </section>
        </main>
      </div>
    );
  }

  const averageScore = reports.length ? Math.round(reports.reduce((total, report) => total + report.score, 0) / reports.length) : 0;

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <Link
          href={isStaff ? '/students' : isStudent ? '/assessment' : '/parent'}
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
        >
          <ArrowRight size={17} />
          {isStaff ? 'العودة لقائمة الطلاب' : isStudent ? 'العودة للاختبار' : 'العودة للرئيسية'}
        </Link>

        <section className="mb-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-0 lg:grid-cols-[260px_1fr]">
            <div className="grid place-items-center bg-slate-950 p-6 text-white">
              {student.photoUrl ? (
                <Image src={student.photoUrl} alt={student.fullName} width={144} height={144} unoptimized className="h-36 w-36 rounded-lg object-cover ring-4 ring-white/20" />
              ) : (
                <div className="grid h-36 w-36 place-items-center rounded-lg bg-white/10">
                  <UserRound size={62} />
                </div>
              )}
            </div>
            <div className="p-6">
              <p className="text-sm font-black text-teal-800">ملف الطالب</p>
              <h1 className="mt-2 text-3xl font-black text-slate-950">{student.fullName}</h1>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{student.grade}</span>
                {isStaff && (
                  <>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-800">{reports.length} تقرير</span>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-800">متوسط {averageScore}%</span>
                  </>
                )}
              </div>
              <p className="mt-4 text-sm font-bold leading-7 text-slate-600">آخر تحديث: {new Date(student.updatedAt).toLocaleDateString('ar-EG')}</p>
            </div>
          </div>
        </section>

        <div className="mb-6 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 rounded-lg px-5 py-3 text-sm font-black transition ${activeTab === tab.id ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-7">
          {activeTab === 'profile' && (
            <div className="grid gap-4 md:grid-cols-2">
              <Info label="الاسم" value={student.fullName} />
              <Info label="الصف" value={student.grade} />
              <Info label="تاريخ الميلاد" value={student.dateOfBirth || 'غير مسجل'} />
              <Info label="ولي الأمر" value={student.parentName || 'غير مسجل'} />
            </div>
          )}

          {activeTab === 'recordings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-slate-950">تسجيلات الطالب الصوتية ومرفقات الاختبار</h2>
                <p className="mt-1 text-sm font-bold text-slate-600">
                  جميع الإجابات الشفهية والتسجيلات المسجلة للطالب أثناء اختبار تحديد المستوى المباشر.
                </p>
              </div>

              {audioList.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-black text-blue-800">🎙️ التسجيلات الصوتية ({audioList.length})</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {audioList.map((item, idx) => (
                      <div key={item.id || idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">
                            {item.categoryLabel || 'استجابة صوتية'}
                          </span>
                          {item.createdAt && (
                            <span className="text-xs font-bold text-slate-400">
                              {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-black text-slate-900 mb-3">{item.label}</p>
                        {item.dataUrl ? (
                          <audio controls preload="metadata" className="w-full" src={sanitizeAudioSrc(item.dataUrl)} />
                        ) : (
                          <div className="rounded-lg bg-blue-50/70 border border-blue-200 p-3 text-xs font-bold text-blue-900 flex items-center gap-2">
                            <span className="text-base">🎙️</span>
                            <span>استجابة شفهية مسجلة وموثقة ضمن تقرير التقييم الإكلينيكي المعتمد.</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {imageList.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-black text-teal-800">🎨 رسومات وتوصيلات الطالب ({imageList.length})</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {imageList.map((item, idx) => (
                      <div key={item.id || idx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-black text-teal-700">
                            {item.categoryLabel || 'رسم يدوي'}
                          </span>
                          {item.createdAt && (
                            <span className="text-xs font-bold text-slate-400">
                              {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-black text-slate-900 mb-2">{item.label}</p>
                        {item.dataUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={item.dataUrl} alt={item.label} className="h-48 w-full rounded-lg object-contain bg-slate-50 border border-slate-200" />
                        ) : (
                          <div className="rounded-lg bg-teal-50/70 border border-teal-200 p-4 text-xs font-bold text-teal-900 flex items-center justify-center gap-2 h-32">
                            <span className="text-base">🎨</span>
                            <span>رسم وتوصيل يدوي موثق ضمن بنود تقرير التقييم المباشر.</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mediaList.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <p className="text-sm font-bold text-slate-500">لا توجد تسجيلات صوتية أو مرفقات محفوظة لهذا الطالب بعد.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'plan' && (
            <div>
              <h2 className="text-xl font-black text-slate-950">خطة التعلم المقترحة</h2>
              <div className="mt-4 grid gap-3">
                {(reports[0]?.recommendations ?? ['تظهر الخطة التعليمية بعد مراجعة د. إسماعيل للاستبيان والاختبار.']).map((item, index) => (
                  <p key={item} className="rounded-lg bg-teal-50 p-4 text-sm font-bold leading-7 text-teal-950">{index + 1}. {item}</p>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reports' && isStaff && (
            <div className="grid gap-3">
              {reports.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-5 text-sm font-bold text-slate-600">لا توجد تقارير محفوظة لهذا الطالب بعد.</p>
              ) : (
                reports.map((report) => (
                  <Link key={report.id} href={`/reports?report=${report.id}`} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4 hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <FileText className="text-slate-500" size={20} />
                      <div>
                        <h3 className="font-black text-slate-950">{report.program}</h3>
                        <p className="text-xs font-bold text-slate-500">{report.date}</p>
                      </div>
                    </div>
                    <span className="text-xl font-black text-teal-800">{report.score}%</span>
                  </Link>
                ))
              )}
            </div>
          )}

          {activeTab === 'progress' && (
            <div className="grid gap-6 md:grid-cols-2">
              <ProgressBar label="التقدم في الدروس" percentage={75} colorClass="bg-teal-700" />
              <ProgressBar label="المواظبة على الخطة" percentage={90} colorClass="bg-blue-700" />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 font-black text-slate-950">{value}</p>
    </div>
  );
}
