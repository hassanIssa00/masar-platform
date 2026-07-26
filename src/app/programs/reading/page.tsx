import ProgramExperience from '@/components/ProgramExperience';
import { programBySlug } from '@/data/curriculum';

export default function ReadingProgramPage() {
  return <ProgramExperience program={programBySlug('reading')!} />;
}
