'use client';

import { useEffect, useState } from 'react';
import {
  ClipboardCheck, Users, CheckCircle2, XCircle, Clock, AlertTriangle,
  Plus, X, Calendar, TrendingUp, Search, Printer, Check
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  getLocalAttendance, recordAttendance, updateAttendance, getAttendanceStats,
  type AttendanceRecord, ATTENDANCE_LABELS, ATTENDANCE_COLORS
} from '@/lib/attendance';
import { getStudents, type StudentRecord } from '@/lib/localDb';
import { createNotification } from '@/lib/notifications';
import FeatureGuideBanner from '@/components/FeatureGuideBanner';

export default function AttendancePage() {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    setStudents(getStudents());
    setAttendanceRecords(getLocalAttendance());
  }, []);

  /* ── Sync with AI Real-Time Execution ── */
  useEffect(() => {
    const handleAIAction = (e: any) => {
      const { action, prompt } = e.detail || {};
      const p = (prompt || action || '').toLowerCase();
      if (p.includes('حضر') || p.includes('تحضير') || p.includes('حاضر') || p.includes('حضور') || p.includes('غياب') || p.includes('attendance')) {
        const timeNow = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
        const allStudents = getStudents();
        allStudents.forEach((st) => {
          recordAttendance({
            studentId: st.id,
            studentName: st.fullName,
            sessionDate: selectedDate,
            sessionTime: timeNow,
            status: 'present',
            parentNotified: false,
          });
        });
        setAttendanceRecords(getLocalAttendance());
        showToast('✅ تم تسجيل حضور جميع الطلاب بالذكاء الاصطناعي!');
      }
    };
    window.addEventListener('masar_action_executed', handleAIAction);
    return () => window.removeEventListener('masar_action_executed', handleAIAction);
  }, [selectedDate]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const markAttendance = async (studentId: string, studentName: string, status: AttendanceRecord['status']) => {
    const timeNow = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    await recordAttendance({
      studentId,
      studentName,
      sessionDate: selectedDate,
      sessionTime: timeNow,
      status,
      parentNotified: status === 'absent',
    });

    setAttendanceRecords(getLocalAttendance());

    if (status === 'absent') {
      await createNotification({
        type: 'student',
        title: 'إشعار غياب جلسة',
        body: `تم تسجيل غياب الطالب ${studentName} عن الجلسة المحددة بتاريخ ${selectedDate}`,
        link: '/attendance',
      });
      showToast(`تم تسجيل غياب ${studentName} وإرسال إشعار لولي الأمر`);
    } else {
      showToast(`تم تسجيل ${ATTENDANCE_LABELS[status]} لـ ${studentName}`);
    }
  };

  const markAllPresent = async () => {
    const timeNow = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    for (const student of students) {
      await recordAttendance({
        studentId: student.id,
        studentName: student.fullName,
        sessionDate: selectedDate,
        sessionTime: timeNow,
        status: 'present',
        parentNotified: false,
      });
    }
    setAttendanceRecords(getLocalAttendance());
    showToast('تم تسجيل حضور جميع الطلاب بنجاح ✓');
  };

  const getStudentStatus = (studentId: string) => {
    const rec = attendanceRecords.find((r) => r.studentId === studentId && r.sessionDate === selectedDate);
    return rec ? rec.status : null;
  };

  const totalSessions = attendanceRecords.length;
  const presentCount = attendanceRecords.filter((r) => r.status === 'present').length;
  const absentCount = attendanceRecords.filter((r) => r.status === 'absent').length;
  const overallRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <Navbar />
      <div className="flex">
        <Sidebar desktopOnly />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="text-teal-600" size={26} />
                نظام الحضور والغياب الذكي
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-1">
                تسجيل حضور الطلاب فورياً، رصد نسبة الحضور، وإرسال تنبيهات غياب لولي الأمر
              </p>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-black outline-none focus:border-teal-600"
              />
              <button
                onClick={markAllPresent}
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white hover:bg-teal-700 shadow-sm"
              >
                <Check size={16} /> تسجيل حضور الكل
              </button>
            </div>
          </div>

          <FeatureGuideBanner
            title="نظام تتبع الحضور الذكي والتنبيه الفوري"
            description="واجهة تفاعلية لتسجيل حضور وتأخر وغياب الطلاب في كل جلسة مع ربط مباشر بإرسال التنبيهات الفورية لأولياء الأمور."
            benefits={[
              'يضمن التواصل المباشر والسريع مع الأسرة فور رصد الغياب دون تأخير.',
              'يربط نسبة الحضور بالتحسن الأكاديمي لإبراز أهمية الالتزام.',
              'يُوفر تقارير حضور تراكمية دقيقة للمدير والاستشاري.'
            ]}
            modernShift="الالتزام والانضباط في الحضور هو عامل حاسم في نجاح الخطة العلاجية، وتتبع الحضور الرقمي يُحلل تأثير الغياب على التراجع أو البطء في تحقيق أهداف الطفل."
          />

          {/* Toast Notification */}
          {toastMessage && (
            <div className="rounded-xl bg-emerald-600 p-3 text-xs font-black text-white text-center shadow-md animate-in fade-in">
              {toastMessage}
            </div>
          )}

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs font-black text-slate-400">إجمالي التسجيلات</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{totalSessions}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs font-black text-slate-400">معدل الحضور العام</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{overallRate}%</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs font-black text-slate-400">مرات الحضور</p>
              <p className="text-3xl font-black text-teal-600 mt-1">{presentCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <p className="text-xs font-black text-slate-400">حالات الغياب</p>
              <p className="text-3xl font-black text-rose-600 mt-1">{absentCount}</p>
            </div>
          </div>

          {/* Student Quick-Mark Grid */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm">
                تسجيل حضور اليوم: <span className="text-teal-700 font-black">{selectedDate}</span>
              </h3>
              <span className="text-xs font-bold text-slate-400">{students.length} طالب</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {students.map((st) => {
                const currentStatus = getStudentStatus(st.id);
                return (
                  <div key={st.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-black text-slate-900 text-sm">{st.fullName}</h4>
                        <p className="text-[11px] font-bold text-slate-500">{st.grade}</p>
                      </div>
                      {currentStatus ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black border ${ATTENDANCE_COLORS[currentStatus]}`}>
                          {ATTENDANCE_LABELS[currentStatus]}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          لم يسجّل
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-1 pt-1">
                      <button
                        onClick={() => markAttendance(st.id, st.fullName, 'present')}
                        className={`rounded-lg py-1.5 text-[11px] font-black transition ${
                          currentStatus === 'present' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border hover:bg-slate-100'
                        }`}
                      >
                        حاضر
                      </button>
                      <button
                        onClick={() => markAttendance(st.id, st.fullName, 'late')}
                        className={`rounded-lg py-1.5 text-[11px] font-black transition ${
                          currentStatus === 'late' ? 'bg-amber-500 text-white' : 'bg-white text-slate-700 border hover:bg-slate-100'
                        }`}
                      >
                        متأخر
                      </button>
                      <button
                        onClick={() => markAttendance(st.id, st.fullName, 'absent')}
                        className={`rounded-lg py-1.5 text-[11px] font-black transition ${
                          currentStatus === 'absent' ? 'bg-rose-600 text-white' : 'bg-white text-slate-700 border hover:bg-slate-100'
                        }`}
                      >
                        غائب
                      </button>
                      <button
                        onClick={() => markAttendance(st.id, st.fullName, 'excused')}
                        className={`rounded-lg py-1.5 text-[11px] font-black transition ${
                          currentStatus === 'excused' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border hover:bg-slate-100'
                        }`}
                      >
                        بعذر
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* History Log */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm">سجل الغياب والحضور التاريخي</h3>
              <span className="text-xs font-bold text-slate-400">{attendanceRecords.length} سجل</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-100 font-black text-slate-400">
                    <th className="pb-3">تاريخ الجلسة</th>
                    <th className="pb-3">اسم الطالب</th>
                    <th className="pb-3">الوقت</th>
                    <th className="pb-3">الحالة</th>
                    <th className="pb-3">إشعار ولي الأمر</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {attendanceRecords.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 font-bold text-slate-600">{r.sessionDate}</td>
                      <td className="py-2.5 font-black text-slate-900">{r.studentName}</td>
                      <td className="py-2.5 font-bold text-slate-500">{r.sessionTime}</td>
                      <td className="py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black border ${ATTENDANCE_COLORS[r.status]}`}>
                          {ATTENDANCE_LABELS[r.status]}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-400">
                        {r.parentNotified ? 'تم إرسال إشعار للجرس ✓' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
