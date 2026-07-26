import Link from 'next/link';
import Image from 'next/image';

interface StudentCardProps {
  id: string;
  name: string;
  grade: string;
  status: string;
  photoUrl?: string;
}

export default function StudentCard({ id, name, grade, status, photoUrl }: StudentCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-5 border border-gray-100 hover:shadow-lg transition">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full overflow-hidden border-2 border-[#1E6FBF]">
          {photoUrl ? (
            <Image src={photoUrl} alt={name} width={64} height={64} className="h-full w-full object-cover" unoptimized />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">👤</div>
          )}
        </div>
        <div>
          <h3 className="font-bold text-lg text-gray-800">{name}</h3>
          <p className="text-gray-500 text-sm">{grade}</p>
        </div>
      </div>
      <div className="flex justify-between items-center mb-4">
        <span className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">{status}</span>
      </div>
      <Link href={`/student/${id}`} className="block text-center w-full bg-[#F8FAFB] text-[#1E6FBF] font-semibold py-2 rounded-lg hover:bg-[#1E6FBF] hover:text-white transition">
        عرض الملف
      </Link>
    </div>
  );
}
