import { notFound } from 'next/navigation';
import LearningStudio from '@/components/LearningStudio';
import { getLearningStudio, learningStudioPrograms } from '@/data/learningStudio';

type LearnPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return learningStudioPrograms.map((program) => ({ slug: program.slug }));
}

export default async function LearnPage({ params }: LearnPageProps) {
  const { slug } = await params;
  const program = getLearningStudio(slug);

  if (!program) notFound();

  return <LearningStudio program={program} />;
}
