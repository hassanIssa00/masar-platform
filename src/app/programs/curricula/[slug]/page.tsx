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
          {/* Breadcrumbs */}
          <div className="mb-4 flex items-center gap-2 text-xs font-bold text-slate-500">
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

          <CurriculumInteractiveWorkbook curriculum={curriculum} />
        </main>
      </div>
    </div>
  );
}
