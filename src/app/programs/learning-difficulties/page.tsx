import ProgramExperience from '@/components/ProgramExperience';
import { programBySlug } from '@/data/curriculum';

export default function LearningDifficultiesPage() {
  return <ProgramExperience program={programBySlug('learning-difficulties')!} />;
}
