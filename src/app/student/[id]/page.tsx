'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, FileText, UserRound } from 'lucide-react';
import Navbar from '@/components/Navbar';
import ProgressBar from '@/components/ProgressBar';
import { getReports, getStudents, getSession, ReportRecord, StudentRecord } from '@/lib/localDb';

export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('profile');
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    queueMicrotask(() => {
      const session = getSession();
      const role = session?.role || (typeof window !== 'undefined' ? localStorage.getItem('user_role') : '') || 'parent';
      setUserRole(role);

      const found = getStudents().find((item) => item.id === params.id) ?? null;
      setStudent(found);
      setReports(getReports().filter((report) => report.studentId === params.id));
    });
  }, [params.id]);

  const isStaff = userRole === 'doctor' || userRole === 'specialist';

  const tabs = [
    { id: 'profile', name: 'البروفايل' },
    { id: 'plan', name: 'خطة التعلم' },
    ...(isStaff ? [{ id: 'reports', name: 'التقارير الطبيّة (للدكتور فقط)' }] : []),
    { id: 'progress', name: 'التقدم' },
  ];

  if (!student) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-slate-950">
        <Navbar />
        <main className="mx-auto grid min-h-[70svh] max-w-2xl place-items-center px-4 py-8">
          <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
            <UserRound className="mx-auto text-slate-400" size={44} />
            <h1 className="mt-4 text-2xl font-black text-slate-950">ملف الطالب غير موجود</h1>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-600">لا توجد بيانات محفوظة لهذا الرابط.</p>
            <Link href={isStaff ? "/student/new" : "/parent"} className="mt-5 inline-flex rounded-lg bg-teal-700 px-5 py-3 text-sm font-black text-white">
              {isStaff ? 'إضافة طالب' : 'العودة لصفحة ولي الأمر'}
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
          href={isStaff ? "/students" : "/parent"}
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
        >
          <ArrowRight size={17} />
          {isStaff ? 'العودة لقائمة الطلاب' : 'العودة للرئيسية'}
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
