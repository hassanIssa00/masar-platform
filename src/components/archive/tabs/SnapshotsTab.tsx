'use client';
import { useState, useEffect } from 'react';
import { HardDrive, Download, Plus, BarChart3, Users, FileText, ScanFace, Clock } from 'lucide-react';
import { getSavedSnapshots, type PlatformSnapshot } from '@/lib/archiveSnapshot';

interface Props {
  currentSnapshot: PlatformSnapshot;
  onCreateNew: () => void;
}

export default function SnapshotsTab({ currentSnapshot, onCreateNew }: Props) {
  const [savedList, setSavedList] = useState<ReturnType<typeof getSavedSnapshots>>([]);

  useEffect(() => {
    setSavedList(getSavedSnapshots());
  }, []);

  const stats = currentSnapshot.stats;

  return (
    <div className="p-5" dir="rtl">
      {/* Current stats card */}
      <div className="mb-6 rounded-2xl bg-gradient-to-l from-slate-800 to-slate-900 p-5 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-500">
              <HardDrive className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">البيانات الحالية في النظام</h3>
              <p className="text-[11px] text-slate-400">{new Date().toLocaleString('ar-SA')}</p>
            </div>
          </div>
          <button onClick={onCreateNew}
            className="flex items-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 border border-sky-400 px-4 py-2.5 text-sm font-black text-white transition cursor-pointer shadow-sm">
            <Download className="h-4 w-4" />
            📸 تصدير نسخة احتياطية كاملة
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'الطلاب',       value: stats.totalStudents,    icon: Users,      color: 'text-emerald-400' },
            { label: 'الحسابات',     value: stats.totalAccounts,    icon: Users,      color: 'text-violet-400' },
            { label: 'التقارير',     value: stats.totalReports,     icon: FileText,   color: 'text-amber-400' },
            { label: 'الاستبيانات',  value: stats.totalSurveys,     icon: BarChart3,  color: 'text-teal-400' },
            { label: 'الواجبات',     value: stats.totalHomeworkLogs,icon: FileText,   color: 'text-orange-400' },
            { label: 'الشهادات',     value: stats.totalCertificates,icon: FileText,   color: 'text-yellow-400' },
            { label: 'الحضور',       value: stats.totalAttendance,  icon: Clock,      color: 'text-green-400' },
            { label: 'بصمات الوجه',  value: stats.totalFaceRecords, icon: ScanFace,   color: 'text-indigo-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-2">
              <Icon className={`h-4 w-4 shrink-0 ${color}`} />
              <div>
                <p className={`text-lg font-black ${color}`}>{value.toLocaleString('ar-EG')}</p>
                <p className="text-[10px] text-slate-400">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved snapshots */}
      <div>
        <h3 className="text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-slate-500" />
          النسخ الاحتياطية المحفوظة ({savedList.length})
        </h3>

        {savedList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 py-16 text-center">
            <HardDrive className="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-bold text-slate-400 mb-2">لا توجد نسخ احتياطية محفوظة بعد</p>
            <p className="text-xs text-slate-400">اضغط زر "تصدير نسخة احتياطية كاملة" لإنشاء أول نسخة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {savedList.map((snap) => (
              <div key={snap.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start gap-4 shadow-xs">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 border border-slate-200 shrink-0">
                  <HardDrive className="h-5 w-5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-800 text-sm">{snap.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {new Date(snap.createdAt).toLocaleString('ar-SA')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[
                      ['طلاب', snap.stats.totalStudents],
                      ['حسابات', snap.stats.totalAccounts],
                      ['تقارير', snap.stats.totalReports],
                      ['واجبات', snap.stats.totalHomeworkLogs],
                      ['بصمات', snap.stats.totalFaceRecords],
                    ].map(([label, val]) => (
                      <span key={String(label)} className="text-[10px] font-bold bg-slate-50 border border-slate-200 text-slate-600 rounded-lg px-2 py-0.5">
                        {label}: <strong>{String(val)}</strong>
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 shrink-0">#{snap.id.slice(-6)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="mt-5 rounded-xl bg-sky-50 border border-sky-200 p-4">
        <p className="text-xs font-black text-sky-800 mb-1">💡 معلومة مهمة</p>
        <p className="text-[11px] text-sky-700 leading-relaxed">
          النسخ الاحتياطية تُحفظ في متصفحك (localStorage) وتُصدَّر كملفات JSON.
          احرص على تنزيل نسخة بشكل دوري وحفظها في مكان آمن.
          كل نسخة تحتوي على <strong>جميع بيانات النظام بما فيها الملفات الشخصية الكاملة وبصمات الوجه</strong>.
        </p>
      </div>
    </div>
  );
}
