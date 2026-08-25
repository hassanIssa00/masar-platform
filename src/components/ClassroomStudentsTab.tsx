'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  UsersRound, Sparkles, BookOpenCheck, Award, FileText,
  UserRound, Plus, Trash2, CheckSquare, Square, CheckCircle2,
  Phone, Calendar, Search, ShieldCheck
} from 'lucide-react';
import { curriculumPrograms } from '@/data/curriculum';
import { pullCloudDataToLocal } from '@/lib/firestoreSync';
import {
  getClassStudents, saveClassStudent, deleteClassStudent,
  ClassStudentRecord
} from '@/lib/classDb';
import CertificateModal from './CertificateModal';
import StudentProfileModal from './StudentProfileModal';

export default function ClassroomStudentsTab() {
  const [students, setStudents] = useState<ClassStudentRecord[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [message, setMessage] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // New Student Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newGrade, setNewGrade] = useState('الصف الأول الابتدائي — فصل د. إسماعيل عيسى');
  const [newParentName, setNewParentName] = useState('');
  const [newParentPhone, setNewParentPhone] = useState('');

  // Certificate Modal
  const [showCertData, setShowCertData] = useState<{
    studentName: string;
    studentNameEn?: string;
    programTitle: string;
    completionDate: string;
    score: number;
  } | null>(null);

  const [selectedTrackSlugs, setSelectedTrackSlugs] = useState<string[]>([]);
  const [profileStudent, setProfileStudent] = useState<ClassStudentRecord | null>(null);

  const refresh = () => {
    const list = getClassStudents();
    setStudents(list);
    if (list.length > 0 && !selectedId) {
      setSelectedId(list[0].id);
      setSelectedTrackSlugs(list[0].assignedPrograms || ['reading']);
    }
  };

  useEffect(() => {
    refresh();
    pullCloudDataToLocal(['classStudents', 'students', 'accounts']).then(() => {
      refresh();
    }).catch(() => {});
  }, []);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(
      (s) => s.fullName.toLowerCase().includes(q) || (s.parentName && s.parentName.toLowerCase().includes(q)),
    );
  }, [students, searchQuery]);

  const selectedStudent = students.find((s) => s.id === selectedId) ?? students[0] ?? null;

  useEffect(() => {
    if (selectedStudent) {
      setSelectedTrackSlugs(selectedStudent.assignedPrograms || [selectedStudent.assignedProgram || 'reading']);
      setMessage('');
    }
  }, [selectedId, selectedStudent]);

  const toggleTrack = (slug: string) => {
    setSelectedTrackSlugs((prev) => {
      if (prev.includes(slug)) {
        if (prev.length === 1) return prev; // Keep at least 1 track
        return prev.filter((s) => s !== slug);
      } else {
        return [...prev, slug];
      }
    });
  };

  const handleSaveTracks = () => {
    if (!selectedStudent) return;
    const primary = selectedTrackSlugs[0] || 'reading';
    saveClassStudent({
      ...selectedStudent,
      assignedProgram: primary,
      assignedPrograms: selectedTrackSlugs,
      assignedBy: 'د. إسماعيل عيسى',
    });
    refresh();
    setMessage('تم تحديث المسارات التعليمية المعتمدة لطالب الفصل بنجاح ✨');
    setTimeout(() => setMessage(''), 4000);
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) return;
    const created = saveClassStudent({
      fullName: newFullName.trim(),
      grade: newGrade,
      parentName: newParentName.trim(),
      parentPhone: newParentPhone.trim(),
      assignedProgram: 'reading',
      assignedPrograms: ['reading'],
    });
    refresh();
    setSelectedId(created.id);
    setShowAddModal(false);
    setNewFullName('');
    setNewParentName('');
    setNewParentPhone('');
  };

  const handleDelete = (id: string) => {
    deleteClassStudent(id);
    setConfirmDeleteId(null);
    const updated = getClassStudents();
    setStudents(updated);
    if (updated.length > 0) setSelectedId(updated[0].id);
    else setSelectedId('');
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
            <UsersRound size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
              إدارة طلاب الفصل الذكي
              <span className="rounded-full bg-teal-100 px-3 py-0.5 text-xs font-black text-teal-800">
                فصل د. إسماعيل عيسى
              </span>
            </h1>
            <p className="text-xs font-bold text-slate-500 mt-1">
              إدارة مستقلة وخاصة بطلاب الفصل · تخصيص المسارات العلاجية · إعتماد الشهادات والتقارير
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-2xl bg-teal-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-teal-700/20 hover:bg-teal-800 transition shrink-0"
        >
          <Plus size={18} />
          إضافة طالب جديد للفصل
        </button>
      </div>

      {/* Main Grid: Left Student List / Right Control Panel */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Classroom Students List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="بحث عن طالب بالفصل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none"
              />
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            </div>

            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-0.5 scrollbar-thin">
              {filteredStudents.map((s) => {
                const active = s.id === selectedId;
                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                      active
                        ? 'border-teal-600 bg-teal-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`grid h-10 w-10 place-items-center rounded-xl font-black text-sm ${
                            active ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {s.fullName.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900">{s.fullName}</h3>
                          <p className="text-[11px] font-bold text-slate-500">{s.grade}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400">
                        #{s.id.slice(-4)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredStudents.length === 0 && (
                <div className="p-8 text-center text-xs font-bold text-slate-400">
                  لا يوجد طلاب مطابقون للبحث
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Student Control Dashboard */}
        <div className="lg:col-span-8 space-y-6">
          {selectedStudent ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              {/* Selected Student Identity Bar */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                <div className="flex items-center gap-4">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white font-black text-xl shadow-lg shadow-teal-600/20">
                    {selectedStudent.fullName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                      {selectedStudent.fullName}
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
                        <CheckCircle2 size={12} /> حساب نشط بالفصل
                      </span>
                    </h2>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      {selectedStudent.grade} · ولي الأمر: {selectedStudent.parentName || 'مسجل'} ({selectedStudent.parentPhone || '—'})
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setShowCertData({
                        studentName: selectedStudent.fullName,
                        studentNameEn: selectedStudent.fullNameEn,
                        programTitle: 'برنامج التأهيل الشامل وصعوبات التعلم',
                        completionDate: new Date().toLocaleDateString('ar-SA'),
                        score: 92,
                      })
                    }
                    className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-900 hover:bg-amber-100 transition"
                  >
                    <Award size={16} className="text-amber-600" />
                    إصدار شهادة تميز
                  </button>

                  <button
                    onClick={() => setProfileStudent(selectedStudent)}
                    className="flex items-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 px-4 py-2.5 text-xs font-black text-teal-900 hover:bg-teal-100 transition"
                  >
                    <FileText size={16} className="text-teal-600" />
                    ملف الطالب
                  </button>

                  <button
                    onClick={() => setConfirmDeleteId(selectedStudent.id)}
                    className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-rose-700 hover:bg-rose-100 transition"
                    title="حذف الطالب من الفصل"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Success Message Banner */}
              {message && (
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs font-black text-emerald-900 flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-600 shrink-0" />
                  {message}
                </div>
              )}

              {/* Multi-Track Assignment Panel */}
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <BookOpenCheck size={18} className="text-teal-600" />
                      تخصيص المسارات التعليمية والعلاجية المعتمدة
                    </h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">
                      حدد المسارات التي سيتلقاها الطالب في برنامج التأهيل اليومي داخل الفصل
                    </p>
                  </div>

                  <button
                    onClick={handleSaveTracks}
                    className="rounded-xl bg-teal-700 px-5 py-2.5 text-xs font-black text-white hover:bg-teal-800 transition shadow-sm"
                  >
                    حفظ المسارات المعتمدة
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {curriculumPrograms.map((program) => {
                    const isSelected = selectedTrackSlugs.includes(program.slug);
                    return (
                      <div
                        key={program.slug}
                        onClick={() => toggleTrack(program.slug)}
                        className={`cursor-pointer rounded-2xl border p-4 transition-all duration-200 ${
                          isSelected
                            ? 'border-teal-600 bg-white shadow-sm ring-2 ring-teal-600/20'
                            : 'border-slate-200 bg-white/60 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700">
                            {program.tag || 'مسار تأهيلي'}
                          </span>
                          {isSelected ? (
                            <CheckSquare size={18} className="text-teal-600" />
                          ) : (
                            <Square size={18} className="text-slate-300" />
                          )}
                        </div>
                        <h4 className="text-xs font-black text-slate-900">{program.title}</h4>
                        <p className="text-[10px] font-bold text-slate-500 mt-1 line-clamp-2">
                          {program.promise || program.audience}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Student Academic Identity Footer Details */}
              <div className="grid gap-4 sm:grid-cols-3 text-xs">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="text-slate-400 font-bold block mb-1">الرقم القومي / الهوية:</span>
                  <span className="font-mono font-black text-slate-800">{selectedStudent.nationalId || '1098234561'}</span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="text-slate-400 font-bold block mb-1">تاريخ الميلاد:</span>
                  <span className="font-mono font-black text-slate-800">{selectedStudent.dateOfBirth || '2019-04-12'}</span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="text-slate-400 font-bold block mb-1">تاريخ التسجيل بالفصل:</span>
                  <span className="font-mono font-black text-slate-800">{new Date(selectedStudent.createdAt).toLocaleDateString('ar-SA')}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400 font-bold">
              اختر طالباً من القائمة لعرض وتخصيص مساراته التعليمية
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add New Classroom Student */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" dir="rtl">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5 border border-slate-200">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Plus size={18} className="text-teal-600" />
              تسجيل طالب جديد في فصل د. إسماعيل عيسى
            </h2>

            <form onSubmit={handleAddStudent} className="space-y-4 text-xs font-bold">
              <div>
                <label className="block text-slate-700 mb-1">اسم الطالب الرباعي *</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: انس ابراهيم محمد موافي"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">المرحلة الدراسية</label>
                <input
                  type="text"
                  value={newGrade}
                  onChange={(e) => setNewGrade(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">اسم ولي الأمر</label>
                <input
                  type="text"
                  placeholder="مثال: إبراهيم محمد موافي"
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1">رقم جوال ولي الأمر</label>
                <input
                  type="text"
                  placeholder="0551234567"
                  value={newParentPhone}
                  onChange={(e) => setNewParentPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 focus:border-teal-600 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-teal-700 py-3 font-black text-white hover:bg-teal-800 transition"
                >
                  إضافة الطالب وحفظه بالفصل
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-slate-600 hover:bg-slate-50"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Classroom Student */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" dir="rtl">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-rose-600">
              <Trash2 size={24} />
            </div>
            <h3 className="text-base font-black text-slate-900">تأكيد حذف الطالب من الفصل؟</h3>
            <p className="text-xs font-bold text-slate-500">
              سيتم حذف سجل الطالب المسجل بالفصل نهائياً ولن يتمكن من الدخول لجلسات الفصل.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-xs font-black text-white hover:bg-rose-700 transition"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-xs font-black text-slate-600 hover:bg-slate-50"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Certificate Modal Launcher */}
      {showCertData && (
        <CertificateModal
          data={{
            studentName: showCertData.studentName,
            studentNameEn: showCertData.studentNameEn,
            programTitle: showCertData.programTitle,
            completionDate: showCertData.completionDate,
            score: showCertData.score,
            doctorName: 'د. إسماعيل عيسى',
          }}
          onClose={() => setShowCertData(null)}
        />
      )}

      {/* Student Profile Modal */}
      {profileStudent && (
        <StudentProfileModal
          student={profileStudent}
          onClose={() => setProfileStudent(null)}
        />
      )}
    </div>
  );
}
