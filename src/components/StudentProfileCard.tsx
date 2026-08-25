'use client';

import Image from 'next/image';
import { Phone, GraduationCap, User, Calendar, IdCard } from 'lucide-react';

export interface StudentProfileData {
  fullName: string;
  grade?: string;
  photoUrl?: string;
  parentName?: string;
  parentPhone?: string;
  nationalId?: string;
  dateOfBirth?: string;
  notes?: string;
}

interface StudentProfileCardProps {
  student: StudentProfileData;
  /** Custom greeting above student name, e.g. "مرحباً بك يا بطل 👋" */
  greeting?: string;
  /** Show parent info section (default: true) */
  showParent?: boolean;
  /** Variant: 'doctor' = dark sidebar, 'parent' = warm card, 'classroom' = teal theme, 'student' = emerald student theme */
  variant?: 'doctor' | 'parent' | 'classroom' | 'student';
  className?: string;
}

export default function StudentProfileCard({
  student,
  greeting,
  showParent = true,
  variant = 'doctor',
  className = '',
}: StudentProfileCardProps) {
  const initials = student.fullName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('');

  const bgClass =
    variant === 'student'
      ? 'bg-gradient-to-br from-emerald-600 via-teal-600 to-teal-700'
      : variant === 'parent'
      ? 'bg-gradient-to-br from-teal-700 to-emerald-800'
      : variant === 'classroom'
      ? 'bg-gradient-to-br from-teal-600 to-teal-800'
      : 'bg-gradient-to-br from-slate-800 to-slate-900';

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {/* Top Banner */}
      <div className={`${bgClass} p-5 flex items-center gap-4`}>
        {/* Avatar */}
        <div className="relative h-20 w-20 shrink-0">
          {student.photoUrl ? (
            <Image
              src={student.photoUrl}
              alt={student.fullName}
              fill
              unoptimized
              className="rounded-full object-cover ring-4 ring-white/30 shadow-xl"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white/20 ring-4 ring-white/20 text-white font-black text-2xl shadow-inner">
              {initials}
            </div>
          )}
          {/* Online dot */}
          <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-400 ring-2 ring-white shadow" />
        </div>

        {/* Name & Grade */}
        <div className="min-w-0 flex-1">
          {greeting && (
            <p className="text-xs font-black text-emerald-200 mb-0.5 flex items-center gap-1">
              <span>{greeting}</span>
            </p>
          )}
          <h2 className="text-xl font-black text-white leading-tight">{student.fullName}</h2>
          
          {student.grade && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[11px] font-black text-white">
                <GraduationCap size={13} />
                {student.grade}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Info Grid */}
      <div className="divide-y divide-slate-100">
        {showParent && student.parentName && (
          <InfoRow icon={<User size={15} className="text-teal-600" />} label="ولي الأمر" value={student.parentName} />
        )}
        {showParent && student.parentPhone && (
          <InfoRow icon={<Phone size={15} className="text-teal-600" />} label="هاتف ولي الأمر" value={student.parentPhone} />
        )}
        {student.nationalId && (
          <InfoRow icon={<IdCard size={15} className="text-slate-500" />} label="رقم الهوية / الإقامة" value={student.nationalId} />
        )}
        {student.dateOfBirth && (
          <InfoRow icon={<Calendar size={15} className="text-slate-500" />} label="تاريخ الميلاد" value={student.dateOfBirth} />
        )}
        {student.notes && (
          <div className="px-4 py-3">
            <p className="text-[11px] font-black text-slate-400 mb-0.5">ملاحظات أولية</p>
            <p className="text-xs font-bold text-slate-700 leading-relaxed">{student.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 leading-none">{label}</p>
        <p className="mt-0.5 text-xs font-bold text-slate-800 truncate">{value}</p>
      </div>
    </div>
  );
}
