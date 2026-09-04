'use client';

import { useEffect, useState } from 'react';
import {
  BookOpen, Plus, CheckCircle2, Clock, CheckSquare, X, User
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { getStudents, type StudentRecord } from '@/lib/cloudStore';
import { getLocalHomework, createHomework, updateHomeworkStatus, type HomeworkRecord } from '@/lib/homework';
import { createNotification } from '@/lib/notifications';

export default function HomeworkPage() {
  const [list, setList] = useState<HomeworkRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [studentId, setStudentId] = useState('');
  const [title, setTitle] = useState('تمرين منزلي: قراءة الأصوات القصيرة وتتبع الحروف');
  const [description, setDescription] = useState('تطبيق التمارين لمدة 15 دقيقة يومياً مع تسجيل ملحوظات الأداء.');
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10));

  useEffect(() => {
    setList(getLocalHomework());
    const allSt = getStudents();
    setStudents(allSt);
    if (allSt.length > 0) setStudentId(allSt[0].id);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find((s) => s.id === studentId);
    await createHomework({
      studentId,
      studentName: st ? st.fullName : 'طالب',
      title,
      description,
      dueDate,
    });
    setList(getLocalHomework());
    setShowModal(false);

    // Notify parent
    void createNotification({
      type: 'homework',
      title: `📝 واجب جديد للبطل ${st?.fullName || 'الطالب'}`,
      body: `تم إسناد واجب منزلي جديد (${title}) من قبل د. إسماعيل عيسى. موعد التسليم: ${dueDate}.`,
      link: `/school-parent?student=${studentId}&tab=homework`,
      targetRole: 'parent',
      studentId,
      studentName: st?.fullName,
    });

    // Notify student
    void createNotification({
      type: 'homework',
      title: `📝 واجب منزلي جديد: ${title}`,
      body: `كلفك د. إسماعيل عيسى بواجب جديد. موعد التسليم: ${dueDate}.`,
      link: `/school-student?tab=homework`,
      targetRole: 'student',
      studentId,
      studentName: st?.fullName,
    });
  };

  const handleStatus = (id: string, status: HomeworkRecord['status']) => {
    updateHomeworkStatus(id, status);
    setList(getLocalHomework());
  };

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
                <BookOpen className="text-teal-600" size={26} />
                الواجبات والأنشطة المنزلية اليومية
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-1">
                إسناد التمارين المنزلية لأولياء الأمور وتتبع التأكيد والتعليقات
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-black text-white hover:bg-teal-700 transition shadow-sm"
            >
              <Plus size={18} /> إسناد نشاط منزلي جديد
            </button>
          </div>

          {/* Homework Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.length === 0 ? (
              <div className="sm:col-span-2 lg:col-span-3 py-16 text-center text-slate-400 space-y-2 rounded-2xl border bg-white">
                <BookOpen className="mx-auto text-slate-300" size={36} />
                <p className="text-sm font-black">لا توجد واجبات مسجلة بعد</p>
                <button onClick={() => setShowModal(true)} className="text-xs font-black text-teal-600 hover:underline">
                  + إسناد أول نشاط
                </button>
              </div>
            ) : (
              list.map((hw) => (
                <div key={hw.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[11px] font-black text-teal-700">
                        👦 {hw.studentName}
                      </span>
                      <span className={`text-[11px] font-black ${
                        hw.status === 'submitted' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {hw.status === 'submitted' ? 'تم التنفيذ ✓' : 'قيد التنفيذ'}
                      </span>
                    </div>

                    <h3 className="font-black text-slate-900 text-base">{hw.title}</h3>
                    <p className="text-xs font-bold text-slate-600 leading-relaxed">{hw.description}</p>
                    <p className="text-[11px] font-bold text-slate-400">تاريخ التسليم: {hw.dueDate}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => handleStatus(hw.id, hw.status === 'submitted' ? 'assigned' : 'submitted')}
                      className="text-xs font-black text-teal-700 hover:underline"
                    >
                      {hw.status === 'submitted' ? 'إعادة إلى قيد التنفيذ' : 'تأكيد إكمال الواجب ✓'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-xs grid place-items-center">
              <form
                onSubmit={handleCreate}
                className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 text-right"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-slate-900 text-lg">إسناد نشاط منزلي جديد</h3>
                  <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">اختر الطالب</label>
                  <select
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none"
                    required
                  >
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>👦 {st.fullName} ({st.grade})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">عنوان النشاط / التمرين</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">التفاصيل والتعليمات لولي الأمر</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">تاريخ الأداء / التسليم</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none"
                    required
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-xs font-black text-slate-500">
                    إلغاء
                  </button>
                  <button type="submit" className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white hover:bg-teal-700">
                    حفظ وإرسال لولي الأمر
                  </button>
                </div>
              </form>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
