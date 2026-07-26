import ProgressBar from './ProgressBar';

interface ProgramCardProps {
  title: string;
  description: string;
  icon: string;
  progress?: number;
  color?: string;
}

export default function ProgramCard({ title, description, icon, progress, color = "bg-[#1E6FBF]" }: ProgramCardProps) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border-t-4 hover:-translate-y-1 transition duration-300" style={{ borderTopColor: color.replace('bg-[', '').replace(']', '') }}>
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-2 text-gray-800">{title}</h3>
      <p className="text-gray-600 mb-4 text-sm leading-relaxed">{description}</p>
      {progress !== undefined && (
        <ProgressBar label="نسبة الإنجاز" percentage={progress} colorClass={color} />
      )}
    </div>
  );
}
