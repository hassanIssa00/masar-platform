import AssessmentStudio from '@/components/AssessmentStudio';
import { assessmentBlueprints, getAssessmentBlueprint } from '@/data/assessments';

type AssessmentPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return assessmentBlueprints.map((assessment) => ({ slug: assessment.slug }));
}

export default async function AssessmentPage({ params }: AssessmentPageProps) {
  const { slug } = await params;
  return <AssessmentStudio blueprint={getAssessmentBlueprint(slug)} />;
}
