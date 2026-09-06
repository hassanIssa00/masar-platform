'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import {
  UsersRound, Sparkles, BookOpenCheck, Award, FileText,
  UserRound, Plus, Trash2, CheckSquare, Square, CheckCircle2,
  Phone, Calendar, Search, ShieldCheck, Edit3, Camera, Upload
} from 'lucide-react';
import { curriculumPrograms } from '@/data/curriculum';
import { pullCloudDataToLocal } from '@/lib/firestoreSync';
import {
  getClassStudents, saveClassStudent, deleteClassStudent,
  cleanClassStudentName, updateStudentPhotoAcrossStores, ClassStudentRecord
} from '@/lib/classDb';
import { transliterateArabicToEnglish, resolveStudentBirthDate } from '@/lib/transliteration';
import CertificateModal from './CertificateModal';
import StudentProfileCard from './StudentProfileCard';
import StudentProfileModal from './StudentProfileModal';
import { formatLastSeen } from '@/lib/presence';

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
  const [newPhotoUrl, setNewPhotoUrl] = useState('');

  // Edit Student Modal
  const [editingStudent, setEditingStudent] = useState<ClassStudentRecord | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editFullNameEn, setEditFullNameEn] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editParentName, setEditParentName] = useState('');
  const [editParentPhone, setEditParentPhone] = useState('');
  const [editNationalId, setEditNationalId] = useState('');
  const [editDateOfBirth, setEditDateOfBirth] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editPhotoUrl, setEditPhotoUrl] = useState('');

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

  const processImageFile = (file: File, callback: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 240;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
        callback(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName.trim()) return;
    const created = saveClassStudent({
      fullName: newFullName.trim(),
      grade: newGrade,
      parentName: newParentName.trim(),
      parentPhone: newParentPhone.trim(),
      photoUrl: newPhotoUrl.trim(),
      assignedProgram: 'reading',
      assignedPrograms: ['reading'],
    });
    if (newPhotoUrl.trim()) {
      updateStudentPhotoAcrossStores(created.id, newPhotoUrl.trim(), newFullName.trim());
    }
    refresh();
    setSelectedId(created.id);
    setShowAddModal(false);
    setNewFullName('');
    setNewParentName('');
    setNewParentPhone('');
    setNewPhotoUrl('');
  };

  const openEditModal = (s: ClassStudentRecord) => {
    setEditingStudent(s);
    setEditFullName(cleanClassStudentName(s.fullName));
    setEditFullNameEn(s.fullNameEn || transliterateArabicToEnglish(s.fullName));
    setEditGrade(s.grade || 'الصف الأول الابتدائي — فصل د. إسماعيل عيسى');
    setEditParentName(s.parentName || '');
    setEditParentPhone(s.parentPhone || '');
    setEditNationalId(s.nationalId || '');
    setEditDateOfBirth(s.dateOfBirth || resolveStudentBirthDate(s));
    setEditNotes(s.notes || '');
    setEditPhotoUrl(s.photoUrl || '');
  };

  const handleUpdateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editFullName.trim()) return;
    const finalFullName = editFullName.trim();
    const finalFullNameEn = editFullNameEn.trim() || transliterateArabicToEnglish(finalFullName);
    const finalDateOfBirth = editDateOfBirth.trim() || resolveStudentBirthDate({ grade: editGrade });

    saveClassStudent({
      ...editingStudent,
      fullName: finalFullName,
      fullNameEn: finalFullNameEn,
      grade: editGrade.trim(),
      parentName: editParentName.trim(),
      parentPhone: editParentPhone.trim(),
      nationalId: editNationalId.trim(),
      dateOfBirth: finalDateOfBirth,
      notes: editNotes.trim(),
      photoUrl: editPhotoUrl.trim(),
    });
    if (editPhotoUrl.trim()) {
      updateStudentPhotoAcrossStores(editingStudent.id, editPhotoUrl.trim(), finalFullName);
    }
    refresh();
    setEditingStudent(null);
    setMessage('تم تحديث وحفظ بيانات الطالب بنجاح ✨');
    setTimeout(() => setMessage(''), 4000);
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
                          className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-xl ${
                            active ? 'ring-2 ring-teal-500 ring-offset-1' : ''
                          }`}
                        >
                          {s.photoUrl ? (
                            <Image src={s.photoUrl} alt={s.fullName} fill unoptimized className="object-cover" />
                          ) : (
                            <div className={`flex h-full w-full items-center justify-center font-black text-sm ${
                              active ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {cleanClassStudentName(s.fullName).charAt(0) || s.fullName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-slate-900">{cleanClassStudentName(s.fullName)}</h3>
                          <p className="text-[11px] font-bold text-slate-500">{s.grade}</p>
                          {(() => {
                            const presence = formatLastSeen(s.studentLastActiveAt || s.studentLastLoginAt || s.lastActiveAt || s.lastLoginAt);
                            return (
                              <div className="flex items-center gap-1.5 mt-1" title={presence.title}>
                                <span className={`inline-block h-1.5 w-1.5 rounded-full ${presence.dotClass}`} />
                                <span className="text-[10px] font-bold text-slate-500 truncate">{presence.text}</span>
                              </div>
                            );
                          })()}
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
            <div className="space-y-6">
              {/* Student Profile Card */}
              <StudentProfileCard
                student={{
                  id: selectedStudent.id,
                  fullName: selectedStudent.fullName,
                  grade: selectedStudent.grade,
                  photoUrl: selectedStudent.photoUrl,
                  parentName: selectedStudent.parentName,
                  parentPhone: selectedStudent.parentPhone,
                  nationalId: selectedStudent.nationalId,
                  dateOfBirth: selectedStudent.dateOfBirth,
                  notes: selectedStudent.notes,
                  studentLastActiveAt: selectedStudent.studentLastActiveAt,
                  studentLastLoginAt: selectedStudent.studentLastLoginAt,
                  parentLastActiveAt: selectedStudent.parentLastActiveAt,
                  parentLastLoginAt: selectedStudent.parentLastLoginAt,
                  lastActiveAt: selectedStudent.lastActiveAt,
                  lastLoginAt: selectedStudent.lastLoginAt,
                }}
                variant="classroom"
                allowPhotoUpload={true}
                onPhotoUpdated={() => {
                  refresh();
                }}
              />

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              {/* Selected Student Identity Bar — action buttons & presence */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-black text-emerald-800">
                    <CheckCircle2 size={12} /> حساب نشط بالفصل
                  </span>
                  {(() => {
                    const stPresence = formatLastSeen(selectedStudent.studentLastActiveAt || selectedStudent.studentLastLoginAt || selectedStudent.lastActiveAt || selectedStudent.lastLoginAt);
                    return (
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${stPresence.badgeClass}`} title={stPresence.title}>
                        <span className={`h-1.5 w-1.5 rounded-full ${stPresence.dotClass}`} />
                        🎒 نشاط الطالب: {stPresence.text}
                      </span>
                    );
                  })()}
                  {selectedStudent.parentName && (() => {
                    const prPresence = formatLastSeen(selectedStudent.parentLastActiveAt || selectedStudent.parentLastLoginAt);
                    return (
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${prPresence.badgeClass}`} title={prPresence.title}>
                        <span className={`h-1.5 w-1.5 rounded-full ${prPresence.dotClass}`} />
                        👤 نشاط ولي الأمر: {prPresence.text}
                      </span>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setShowCertData({
                        studentName: selectedStudent.fullName,
                        studentNameEn: selectedStudent.fullNameEn || transliterateArabicToEnglish(selectedStudent.fullName),
                        programTitle: 'برنامج التأهيل الشامل وصعوبات التعلم',
                        completionDate: new Date().toLocaleDateString('ar-SA'),
                        score: 92,
                      })
                    }
                    className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-900 hover:bg-amber-100 transition cursor-pointer"
                  >
                    <Award size={16} className="text-amber-600" />
                    إصدار شهادة تميز
                  </button>

                  <button
                    onClick={() => setProfileStudent(selectedStudent)}
                    className="flex items-center gap-1.5 rounded-xl border border-teal-300 bg-teal-50 px-4 py-2.5 text-xs font-black text-teal-900 hover:bg-teal-100 transition cursor-pointer"
                  >
                    <FileText size={16} className="text-teal-600" />
                    ملف الطالب
                  </button>

                  <button
                    onClick={() => openEditModal(selectedStudent)}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-800 hover:bg-slate-50 transition cursor-pointer shadow-xs"
                    title="تعديل بيانات الطالب"
                  >
                    <Edit3 size={15} className="text-teal-600" />
                    تعديل البيانات
                  </button>

                  <button
                    onClick={() => setConfirmDeleteId(selectedStudent.id)}
                    className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-rose-700 hover:bg-rose-100 transition cursor-pointer"
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
                  <span className="font-mono font-black text-slate-800">{selectedStudent.nationalId || 'غير مسجل'}</span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="text-slate-400 font-bold block mb-1">تاريخ الميلاد:</span>
                  <span className="font-mono font-black text-slate-800">{selectedStudent.dateOfBirth || resolveStudentBirthDate(selectedStudent)}</span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <span className="text-slate-400 font-bold block mb-1">تاريخ التسجيل بالفصل:</span>
                  <span className="font-mono font-black text-slate-800">{new Date(selectedStudent.createdAt).toLocaleDateString('ar-SA')}</span>
                </div>
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

              {/* Photo Upload Section */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="relative h-14 w-14 shrink-0 rounded-2xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                  {newPhotoUrl ? (
                    <Image src={newPhotoUrl} alt="صورة الطالب" fill unoptimized className="object-cover" />
                  ) : (
                    <div className="text-xl text-slate-400">👤</div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-slate-800">صورة الطالب الشخصية (اختياري)</p>
                  <div className="mt-1 flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 border border-teal-200 px-3 py-1.5 text-[11px] font-black text-teal-800 hover:bg-teal-100 cursor-pointer transition">
                      <Camera size={13} />
                      <span>{newPhotoUrl ? 'تغيير الصورة' : 'رفع صورة الطالب 📸'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) processImageFile(file, setNewPhotoUrl);
                        }}
                      />
                    </label>
                    {newPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setNewPhotoUrl('')}
                        className="text-[10px] font-bold text-rose-600 hover:underline"
                      >
                        إزالة
                      </button>
                    )}
                  </div>
                </div>
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
          onStudentUpdated={(updated) => {
            setProfileStudent(updated);
            refresh();
          }}
        />
      )}

      {/* Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" dir="rtl">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Edit3 size={18} className="text-teal-600" />
                تعديل بيانات الطالب بالفصل
              </h3>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-4">
              {/* Student Photo Section */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                  {editPhotoUrl ? (
                    <Image src={editPhotoUrl} alt="صورة الطالب" fill unoptimized className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-teal-50 text-teal-700 font-black text-lg">
                      {editFullName.charAt(0) || 'ط'}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-slate-800">صورة الطالب الشخصية</p>
                  <p className="text-[10px] text-slate-500 mb-1.5 font-bold">تظهر في بطاقة الطالب والملف التعريفي والشهادات</p>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 rounded-xl bg-teal-50 border border-teal-200 px-3 py-1.5 text-[11px] font-black text-teal-800 hover:bg-teal-100 cursor-pointer transition">
                      <Camera size={13} />
                      <span>{editPhotoUrl ? 'تغيير الصورة 📷' : 'رفع صورة جديدة 📸'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) processImageFile(file, setEditPhotoUrl);
                        }}
                      />
                    </label>
                    {editPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setEditPhotoUrl('')}
                        className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        إزالة الصورة
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Full Name & English Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    اسم الطالب بالعربية <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditFullName(val);
                      if (!editFullNameEn || editFullNameEn === transliterateArabicToEnglish(editFullName)) {
                        setEditFullNameEn(transliterateArabicToEnglish(val));
                      }
                    }}
                    placeholder="مثال: أحمد إبراهيم علي"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-black text-slate-700">
                      الاسم بالإنجليزية
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditFullNameEn(transliterateArabicToEnglish(editFullName))}
                      className="text-[10px] font-black text-teal-700 hover:text-teal-900 flex items-center gap-0.5 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200 cursor-pointer"
                      title="ترجمة الاسم تلقائياً"
                    >
                      🪄 ترجمة ذكية
                    </button>
                  </div>
                  <input
                    type="text"
                    value={editFullNameEn}
                    onChange={(e) => setEditFullNameEn(e.target.value)}
                    placeholder="Ahmed Ibrahim Ali"
                    dir="ltr"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    اسم ولي الأمر
                  </label>
                  <input
                    type="text"
                    value={editParentName}
                    onChange={(e) => setEditParentName(e.target.value)}
                    placeholder="مثال: إبراهيم علي"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    رقم هاتف ولي الأمر
                  </label>
                  <input
                    type="tel"
                    value={editParentPhone}
                    onChange={(e) => setEditParentPhone(e.target.value)}
                    placeholder="05xxxxxxxx"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    الصف / الفصل الدراسي
                  </label>
                  <input
                    type="text"
                    value={editGrade}
                    onChange={(e) => setEditGrade(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    رقم الهوية الوطنية / الإقامة
                  </label>
                  <input
                    type="text"
                    value={editNationalId}
                    onChange={(e) => setEditNationalId(e.target.value)}
                    placeholder="10xxxxxxxx"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none font-mono"
                    dir="ltr"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-black text-slate-700">
                      تاريخ الميلاد
                    </label>
                    <button
                      type="button"
                      onClick={() => setEditDateOfBirth(resolveStudentBirthDate({ grade: editGrade }))}
                      className="text-[10px] font-black text-slate-500 hover:text-slate-800 underline cursor-pointer"
                      title="حساب حسب الصف"
                    >
                      تلقائي
                    </button>
                  </div>
                  <input
                    type="date"
                    value={editDateOfBirth}
                    onChange={(e) => setEditDateOfBirth(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  ملاحظات المعلم الخاصة
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="أي ملاحظات حول مستوى الطالب أو الخطة الفردية..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-900 focus:border-teal-600 focus:bg-white focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-teal-700 py-3 text-xs font-black text-white hover:bg-teal-800 transition shadow-sm cursor-pointer"
                >
                  حفظ التعديلات سحابياً ✨
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-xs font-black text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
