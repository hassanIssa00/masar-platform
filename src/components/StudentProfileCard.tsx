'use client';

import Image from 'next/image';
import { Phone, GraduationCap, User, Calendar, IdCard, Activity, UserCheck } from 'lucide-react';
import { formatLastSeen } from '@/lib/presence';
import { cleanClassStudentName } from '@/lib/classDb';

export interface StudentProfileData {
  fullName: string;
  grade?: string;
  photoUrl?: string;
  parentName?: string;
  parentPhone?: string;
  nationalId?: string;
  dateOfBirth?: string;
  notes?: string;
  studentLastLoginAt?: string;
  parentLastLoginAt?: string;
  studentLastActiveAt?: string;
  parentLastActiveAt?: string;
  lastLoginAt?: string;
  lastActiveAt?: string;
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
  const validName = cleanClassStudentName(student?.fullName || '') || 'طالب';
  const cleanParentName = student?.parentName
    ? student.parentName.replace(/^ولي أمر:\s*فصل\s*/i, 'ولي أمر: ').replace(/^فصل\s*/i, '').trim()
    : '';
  const initials = validName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('') || 'ط';

  const studentPresence = formatLastSeen(
    student.studentLastActiveAt || student.studentLastLoginAt || student.lastActiveAt || student.lastLoginAt,
  );
  const parentPresence = formatLastSeen(student.parentLastActiveAt || student.parentLastLoginAt);

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
          {student.photoUrl && (student.photoUrl.startsWith('data:') || student.photoUrl.startsWith('http') || student.photoUrl.startsWith('/')) ? (
            <Image
              src={student.photoUrl}
              alt={student.fullName}
              fill
              unoptimized
              className="rounded-full object-cover ring-4 ring-white/30 shadow-xl"
            />
          ) : student.photoUrl && student.photoUrl.length <= 4 ? (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white/20 ring-4 ring-white/20 text-white text-3xl shadow-inner select-none">
              {student.photoUrl}
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-full bg-white/20 ring-4 ring-white/20 text-white font-black text-2xl shadow-inner">
              {initials}
            </div>
          )}
          {/* Dynamic Online/Offline dot */}
          <span
            className={`absolute bottom-1 right-1 h-4 w-4 rounded-full ring-2 ring-white shadow transition-all ${
              studentPresence.isOnline
                ? 'bg-emerald-500 ring-emerald-300 animate-pulse'
                : studentPresence.rawDate
                ? 'bg-slate-400'
                : 'bg-slate-300'
            }`}
            title={studentPresence.title}
          />
        </div>

        {/* Name & Grade */}
        <div className="min-w-0 flex-1">
          {greeting && (
            <p className="text-xs font-black text-emerald-200 mb-0.5 flex items-center gap-1">
              <span>{greeting}</span>
            </p>
          )}
          <h2 className="text-xl font-black text-white leading-tight">{student.fullName}</h2>
          
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {student.grade && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[11px] font-black text-white">
                <GraduationCap size={13} />
                {student.grade}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black backdrop-blur-xs ${
                studentPresence.isOnline
                  ? 'bg-emerald-500/30 text-white border border-emerald-300/40 shadow-xs'
                  : 'bg-black/20 text-white/80'
              }`}
              title={studentPresence.title}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${studentPresence.dotClass}`} />
              {studentPresence.text}
            </span>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="divide-y divide-slate-100">
        {/* Student Presence Activity */}
        <InfoRow
          icon={<Activity size={15} className="text-emerald-600" />}
          label="آخر ظهور / نشاط للطالب"
          value={
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-black ${studentPresence.badgeClass}`} title={studentPresence.title}>
              <span className={`h-1.5 w-1.5 rounded-full ${studentPresence.dotClass}`} />
              {studentPresence.text}
            </span>
          }
        />

        {/* Parent Presence Activity (if parent info is shown) */}
        {showParent && (student.parentLastActiveAt || student.parentLastLoginAt || student.parentName) && (
          <InfoRow
            icon={<UserCheck size={15} className="text-teal-600" />}
            label="آخر ظهور / نشاط لولي الأمر"
            value={
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-black ${parentPresence.badgeClass}`} title={parentPresence.title}>
                <span className={`h-1.5 w-1.5 rounded-full ${parentPresence.dotClass}`} />
                {parentPresence.text}
              </span>
            }
          />
        )}

        {showParent && student.parentName && (
          <InfoRow icon={<User size={15} className="text-teal-600" />} label="ولي الأمر" value={cleanParentName || student.parentName} />
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

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <span className="shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black text-slate-400 leading-none">{label}</p>
        {typeof value === 'string' ? (
          <p className="mt-0.5 text-xs font-bold text-slate-800 truncate">{value}</p>
        ) : (
          <div className="mt-0.5">{value}</div>
        )}
      </div>
    </div>
  );
}
