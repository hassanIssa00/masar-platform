'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ClassroomFaceAttendanceFullPage from '@/components/ClassroomFaceAttendanceFullPage';

export default function IkhlasFaceAttendanceStandalonePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        <ClassroomFaceAttendanceFullPage onBack={() => router.push('/branches/ikhlas-jeddah')} />
      </div>
    </div>
  );
}
