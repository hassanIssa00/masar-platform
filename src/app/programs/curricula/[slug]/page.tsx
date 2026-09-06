import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import CurriculumInteractiveWorkbook from '@/components/CurriculumInteractiveWorkbook';
import { curriculaList, getCurriculumBySlug } from '@/data/curriculaData';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return curriculaList.map((c) => ({ slug: c.slug }));
}

export default async function CurriculumBookPage({ params }: PageProps) {
  const { slug } = await params;
  const curriculum = getCurriculumBySlug(slug);

  if (!curriculum) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-950" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8">
          {/* Breadcrumbs & Quick Return to Student Portal */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
              <Link href="/programs" className="hover:text-teal-700">
                المسارات
              </Link>
              <ChevronLeft size={14} />
              <Link href="/programs/curricula" className="hover:text-teal-700">
                المناهج التعليمية
              </Link>
              <ChevronLeft size={14} />
              <span className="font-black text-slate-900">{curriculum.title}</span>
            </div>

            <Link
              href="/school-student?tab=curriculum"
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs transition"
            >
              <span>⬅️ رجوع لبوابة الطالب (فصل د. إسماعيل)</span>
            </Link>
          </div>

          <CurriculumInteractiveWorkbook curriculum={curriculum} />
        </main>
      </div>
    </div>
  );
}
