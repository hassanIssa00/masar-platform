import ProgramExperience from '@/components/ProgramExperience';
import { programBySlug } from '@/data/curriculum';

export default function MathProgramPage() {
  return <ProgramExperience program={programBySlug('math')!} />;
}
