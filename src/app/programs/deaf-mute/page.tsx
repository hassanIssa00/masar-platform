'use client';

import Link from 'next/link';
import {
  Ear,
  Eye,
  Users,
  ClipboardCheck,
  ArrowLeft,
  BookOpen,
  Sparkles,
  Shield,
  Brain,
  GraduationCap,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

const PROGRAMS = [
  {
    id: 1,
    title: 'لغة الإشارة السعودية',
    color: '#0f766e',
    icon: <Ear size={22} />,
    description: 'تعلم لغة الإشارة السعودية الموحدة كوسيلة تواصل رئيسية',
    tag: 'تواصل أساسي',
  },
  {
    id: 2,
    title: 'القراءة الشفوية والتواصل البصري',
    color: '#1d4ed8',
    icon: <Eye size={22} />,
    description: 'تدريب الطفل على قراءة حركة الشفاه وفهم التعبيرات الوجهية',
    tag: 'مهارات بصرية',
  },
  {
    id: 3,
    title: 'التدريب السمعي والتأهيل الصوتي',
    color: '#7c3aed',
    icon: <Brain size={22} />,
    description: 'تمارين تأهيل ما تبقى من سمع وتطوير الإنتاج الصوتي',
    tag: 'تأهيل سمعي',
  },
  {
    id: 4,
    title: 'المهارات اللغوية والتعبير اللفظي',
    color: '#b45309',
    icon: <BookOpen size={22} />,
    description: 'بناء المفردات وتطوير التعبير اللغوي بالإشارة والصوت',
    tag: 'لغة وتعبير',
  },
  {
    id: 5,
    title: 'الدمج التعليمي والاجتماعي',
    color: '#be185d',
    icon: <Users size={22} />,
    description: 'مهارات الاندماج في الفصل الدراسي العادي والبيئة الاجتماعية',
    tag: 'دمج اجتماعي',
  },
  {
    id: 6,
    title: 'تقييم الصم والبكم الشامل',
    color: '#065f46',
    icon: <ClipboardCheck size={22} />,
    description: 'تقييم شامل وفق أحدث المعايير الدولية WHO وDSM-5',
    tag: 'تقييم دولي',
    assessmentLink: '/assessment/deaf',
  },
];

export default function DeafMutePage() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">

          {/* Breadcrumb */}
          <nav className="mb-5 flex items-center gap-2 text-xs font-bold text-slate-500">
            <Link href="/programs" className="hover:text-teal-700 transition-colors">
              المسارات والبرامج
            </Link>
            <span className="text-slate-300">›</span>
            <span className="text-teal-700">مسار الصم والبكم</span>
          </nav>

          {/* Hero Header */}
          <header className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-teal-950 via-cyan-900 to-slate-900 p-8 text-white shadow-xl lg:p-10">
            {/* Background decorations */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
              <div className="absolute -bottom-16 left-0 h-48 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-teal-400/20 px-4 py-1.5 text-xs font-black text-teal-300 ring-1 ring-teal-400/30">
                  <Sparkles size={13} />
                  إعاقة سمعية وتواصل · 6 مجالات تأهيلية
                </div>

                <h1 className="text-3xl font-black leading-tight md:text-5xl">
                  مسار الصم والبكم
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-bold leading-8 text-slate-300">
                  برنامج التأهيل الشامل للإعاقة السمعية وتنمية التواصل — يشمل لغة الإشارة السعودية،
                  القراءة الشفوية، التدريب السمعي، والدمج التعليمي وفق أحدث المعايير الدولية.
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-black text-slate-200">
                    <Shield size={14} className="text-teal-300" />
                    معايير WHO وDSM-5
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-black text-slate-200">
                    <GraduationCap size={14} className="text-teal-300" />
                    6 مجالات تأهيلية
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="shrink-0">
                <Link
                  href="/assessment/deaf"
                  className="inline-flex items-center gap-3 rounded-2xl bg-teal-400 px-7 py-4 text-sm font-black text-teal-950 shadow-lg transition-all hover:bg-teal-300 hover:shadow-teal-400/30"
                >
                  <ClipboardCheck size={20} />
                  ابدأ تقييم الصم والبكم الآن
                  <ArrowLeft size={17} />
                </Link>
              </div>
            </div>
          </header>

          {/* Programs Grid */}
          <section className="mt-8">
            <h2 className="mb-5 text-xl font-black text-slate-800">
              المجالات والبرامج التأهيلية
            </h2>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {PROGRAMS.map((program) => (
                <article
                  key={program.id}
                  className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Icon + Tag */}
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-white"
                      style={{ backgroundColor: program.color }}
                    >
                      {program.icon}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                      {program.tag}
                    </span>
                  </div>

                  {/* Title + Description */}
                  <div className="mt-4 flex-1">
                    <h3 className="text-lg font-black leading-7 text-slate-950">
                      {program.title}
                    </h3>
                    <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                      {program.description}
                    </p>
                  </div>

                  {/* CTA */}
                  {program.assessmentLink ? (
                    <Link
                      href={program.assessmentLink}
                      className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white transition hover:opacity-90"
                      style={{ backgroundColor: program.color }}
                    >
                      <ClipboardCheck size={16} />
                      بدء التقييم
                      <ArrowLeft size={14} />
                    </Link>
                  ) : (
                    <button
                      className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                    >
                      <BookOpen size={16} />
                      عرض المحتوى
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>

          {/* Bottom CTA Banner */}
          <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-2xl border border-teal-100 bg-teal-50 p-6 sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-teal-100">
                <Ear size={22} className="text-teal-700" />
              </div>
              <div>
                <p className="font-black text-teal-900">جاهز لبدء التقييم؟</p>
                <p className="mt-0.5 text-sm font-bold text-teal-700">
                  أجب على أسئلة التقييم الشامل للحصول على خطة تأهيل مخصصة
                </p>
              </div>
            </div>
            <Link
              href="/assessment/deaf"
              className="shrink-0 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-6 py-3 text-sm font-black text-white transition hover:bg-teal-800"
            >
              ابدأ التقييم الآن
              <ArrowLeft size={15} />
            </Link>
          </div>

        </main>
      </div>
    </div>
  );
}
