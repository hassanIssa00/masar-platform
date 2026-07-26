import { notFound } from 'next/navigation';
import ProgramExperience from '@/components/ProgramExperience';
import { curriculumPrograms, programBySlug } from '@/data/curriculum';

type ProgramPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return curriculumPrograms.map((program) => ({ slug: program.slug }));
}

export default async function ProgramPage({ params }: ProgramPageProps) {
  const { slug } = await params;
  const program = programBySlug(slug);

  if (!program) {
    notFound();
  }

  return <ProgramExperience program={program} />;
}
