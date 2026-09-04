'use client';

import { useState, useEffect } from 'react';
import {
  Medal,
  Trophy,
  Award,
  Sparkles,
  Send,
  UserCheck,
  CheckCircle2,
  Trash2,
  PlusCircle,
  Star,
  ShieldCheck,
  Crown,
  BookOpen,
} from 'lucide-react';
import {
  getClassStudents,
  saveBadge,
  getAllBadges,
  BADGE_TEMPLATES,
  type StudentBadgeRecord,
} from '@/lib/classDb';
import { saveMessage } from '@/lib/cloudStore';
import { createNotification } from '@/lib/notifications';
import { deleteDocFromCloud, writeCloudCache } from '@/lib/firestoreSync';

interface Props {
  students?: { id: string; name: string; phone?: string; grade?: string }[];
}

export default function StudentBadgesManagerTab({ students: passedStudents }: Props) {
  const [students, setStudents] = useState<{ id: string; name: string; phone?: string; grade?: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(BADGE_TEMPLATES[0].badgeId);
  const [customNote, setCustomNote] = useState<string>('');
  const [badgeList, setBadgeList] = useState<StudentBadgeRecord[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Load students and badge records
  useEffect(() => {
    if (passedStudents && passedStudents.length > 0) {
      setStudents(passedStudents);
    } else {
      const dbStudents = getClassStudents().map((s) => ({
        id: s.id,
        name: s.fullName,
        phone: s.parentPhone,
        grade: s.grade,
      }));
      setStudents(dbStudents);
    }
    loadBadges();
  }, [passedStudents]);

  const loadBadges = () => {
    const list = getAllBadges();
    setBadgeList([...list].reverse());
  };

  const currentTemplate = BADGE_TEMPLATES.find((b) => b.badgeId === selectedTemplateId) || BADGE_TEMPLATES[0];

  const handleAwardBadge = async () => {
    if (!students.length) return;
    setIsSubmitting(true);

    try {
      const targets =
        selectedStudentId === 'all'
          ? students
          : students.filter((s) => s.id === selectedStudentId);

      const now = new Date().toISOString();

      for (const st of targets) {
        saveBadge({
          studentId: st.id,
          studentName: st.name,
          badgeId: currentTemplate.badgeId,
          title: currentTemplate.title,
          description: currentTemplate.description,
          icon: currentTemplate.icon,
          category: currentTemplate.category,
          points: currentTemplate.points,
          color: currentTemplate.color,
          note: customNote.trim() || undefined,
          awardedBy: 'د. إسماعيل عيسى',
          awardedAt: now,
        });

        // 1. Notify parent in chat
        saveMessage({
          studentId: st.id,
          from: 'doctor',
          to: 'parent',
          body: `🎖️ *وسام شرف وتكريم للبطل (${st.name})*\n\nمنح د. إسماعيل عيسى ابنكم البطل: *${currentTemplate.title}* ${currentTemplate.icon}\n🏅 *المجال:* ${currentTemplate.category}\n⭐ *نقاط التميز:* +${currentTemplate.points} نقطة\n${customNote.trim() ? `\n💬 *كلمة د. إسماعيل:* "${customNote.trim()}"\n` : ''}\nيمكنكم استعراض الوسام في صفحة إنجازات البطل في المنصة 🌟`,
          read: false,
        });

        // 2. Notify student in chat
        saveMessage({
          studentId: st.id,
          from: 'doctor',
          to: 'student',
          body: `🎉 مبروك يا بطل (${st.name})! لقد منحك د. إسماعيل عيسى وسام تكريم (${currentTemplate.title} ${currentTemplate.icon}) تقديراً لتميزك! 🌟`,
          read: false,
        });

        // 3. In-app notification for Parent
        void createNotification({
          type: 'achievement',
          title: `🎖️ وسام تكريم جديد للبطل ${st.name}`,
          body: `منح د. إسماعيل عيسى ابنكم (${currentTemplate.title} ${currentTemplate.icon})`,
          link: `/school-parent?tab=achievements`,
          targetRole: 'parent',
          studentId: st.id,
          studentName: st.name,
        });

        // 4. In-app notification for Student
        void createNotification({
          type: 'achievement',
          title: `🎖️ مبروك يا بطل! حصلت على وسام تكريم ${currentTemplate.icon}`,
          body: `منحك د. إسماعيل عيسى (${currentTemplate.title}) تقديراً لتميزك!`,
          link: `/school-student?tab=home`,
          targetRole: 'student',
          studentId: st.id,
          studentName: st.name,
        });
      }

      setSuccessNotice(
        selectedStudentId === 'all'
          ? `🎉 تم بنجاح منح وإرسال (${currentTemplate.title}) لكافة طلاب الفصل (${targets.length} طالب) وإشعار أولياء أمورهم!`
          : `🎉 تم بنجاح منح وإرسال (${currentTemplate.title}) للبطل (${targets[0]?.name}) وإشعار ولي أمره!`
      );
      setCustomNote('');
      loadBadges();
      setTimeout(() => setSuccessNotice(null), 6000);
    } catch (err) {
      console.error(err);
      setSuccessNotice('حدث خطأ أثناء إرسال الوسام.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBadge = (badgeId: string) => {
    const list = getAllBadges().filter((b) => b.id !== badgeId);
    writeCloudCache('masar_student_badges_v1', list);
    deleteDocFromCloud('studentBadges', badgeId);
    loadBadges();
  };

  return (
    <div className="space-y-6 text-slate-900" dir="rtl">
      {/* ── HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06392c] via-[#0b4d3c] to-[#04291e] p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Medal className="h-6 w-6 text-amber-400" />
              <span className="font-black text-emerald-200 text-sm">
                لوحة تكريم الطلاب ومنح الأوسمة الرسمية
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">
              إرسال الأوسمة والميداليات للطلاب 🎖️
            </h2>
            <p className="mt-1.5 text-sm font-semibold text-emerald-100/90 max-w-2xl">
              اختر الطالب المناسب أو امنح وساماً لجميع طلاب الفصل دفعة واحدة. سيتم توثيق الوسام فوراً في صفحة الطالب ولوحة ولي أمره مع إشعار رسمي.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/20">
            <div className="text-center px-3">
              <div className="text-2xl font-black text-amber-300 font-mono">{badgeList.length}</div>
              <div className="text-[11px] font-bold text-emerald-100">أوسمة ممنوحة</div>
            </div>
            <div className="h-8 w-[1px] bg-white/20" />
            <div className="text-center px-3">
              <div className="text-2xl font-black text-amber-300 font-mono">{students.length}</div>
              <div className="text-[11px] font-bold text-emerald-100">طلاب بالفصل</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SUCCESS BANNER ── */}
      {successNotice && (
        <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-4 text-emerald-950 font-black text-xs sm:text-sm flex items-center gap-2.5 shadow-md animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* ── MAIN CREATION GRID ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Select Student */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <label className="text-sm font-black text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              1. حدد الطالب المستلم للوسام:
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 focus:border-emerald-600 focus:outline-none shadow-xs"
            >
              <option value="all">🌟 منح الوسام لجميع طلاب الفصل ({students.length} طالب)</option>
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  🎓 {st.name} — {st.grade || 'طالب بالفصل'}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Badge Template */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <label className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              2. اختر الوسام المناسب للإنجاز:
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              {BADGE_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplateId === tmpl.badgeId;
                return (
                  <button
                    key={tmpl.badgeId}
                    type="button"
                    onClick={() => setSelectedTemplateId(tmpl.badgeId)}
                    className={`rounded-2xl border p-4 text-right transition-all flex items-start gap-3.5 cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50/70 shadow-md ring-2 ring-amber-400/50'
                        : 'border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50'
                    }`}
                  >
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tmpl.color} text-white flex items-center justify-center text-2xl shrink-0 shadow-sm`}
                    >
                      {tmpl.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                          {tmpl.category}
                        </span>
                        <span className="text-xs font-black text-amber-600 font-mono">
                          +{tmpl.points} نقطة
                        </span>
                      </div>
                      <h4 className="font-black text-xs sm:text-sm text-slate-950 mt-1 truncate">
                        {tmpl.title}
                      </h4>
                      <p className="text-[11px] font-bold text-slate-500 mt-0.5 line-clamp-2">
                        {tmpl.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3: Optional Encouragement Note */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
            <label className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              3. ملاحظة تشجيعية خاصة من د. إسماعيل (اختياري):
            </label>
            <textarea
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              rows={2}
              placeholder="مثال: أحسنت يا بطل على تميزك في قراءة النص بطلاقة والتزامك المستمر 🌟"
              className="w-full rounded-2xl border border-slate-300 bg-white p-3.5 text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none resize-none shadow-xs"
            />

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleAwardBadge}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white py-4 text-sm font-black transition shadow-lg active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <Send size={16} />
              <span>
                {selectedStudentId === 'all'
                  ? `منح وإرسال الوسام لجميع طلاب الفصل (${students.length} طالب) 🚀`
                  : 'منح وإرسال الوسام للطالب وولي الأمر 🎖️'}
              </span>
            </button>
          </div>
        </div>

        {/* Right Col: Live Badge Preview Card */}
        <div className="space-y-6">
          <div className="rounded-3xl border-2 border-amber-300/80 bg-gradient-to-br from-amber-50/40 via-white to-emerald-50/40 p-6 shadow-md space-y-4">
            <span className="text-xs font-black text-amber-900 bg-amber-200/70 px-3 py-1 rounded-full inline-block">
              معاينة الوسام الممنوح 👁️
            </span>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 text-center">
              <div
                className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${currentTemplate.color} text-white flex items-center justify-center text-4xl mx-auto shadow-md`}
              >
                {currentTemplate.icon}
              </div>

              <div>
                <span className="text-xs font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                  {currentTemplate.category}
                </span>
                <h3 className="font-black text-base sm:text-lg text-slate-950 mt-2">
                  {currentTemplate.title}
                </h3>
                <p className="text-xs font-bold text-slate-600 mt-1 leading-relaxed">
                  {currentTemplate.description}
                </p>
              </div>

              {customNote.trim() && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-right">
                  <p className="text-xs font-bold text-amber-900 italic">
                    &quot;{customNote.trim()}&quot;
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-black">
                <span className="text-amber-700 flex items-center gap-1">
                  <Star size={14} className="fill-amber-400 text-amber-500" /> {currentTemplate.points} نقطة
                </span>
                <span className="text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[11px]">
                  معتمد من د. إسماعيل عيسى ✓
                </span>
              </div>
            </div>
          </div>

          {/* Recently Awarded List */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h4 className="font-black text-sm text-slate-900 flex items-center justify-between">
              <span>سجل الأوسمة الممنوحة مؤخراً</span>
              <span className="text-xs text-slate-400 font-mono">({badgeList.length})</span>
            </h4>

            {badgeList.length === 0 ? (
              <p className="text-xs font-bold text-slate-400 text-center py-6">
                لم يتم منح أي أوسمة بعد. امنح أول وسام من النموذج أعلاه! 🌟
              </p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {badgeList.slice(0, 10).map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-xs font-bold gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg shrink-0">{b.icon}</span>
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 truncate">{b.title}</p>
                        <p className="text-[10px] text-slate-500 truncate">
                          للطالب: {b.studentName} ({new Date(b.awardedAt).toLocaleDateString('ar-EG')})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteBadge(b.id)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 transition shrink-0 cursor-pointer"
                      title="حذف الوسام"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
