'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Download, ScanFace, Mail, Phone, Globe, Clock, FileText,
         BookOpen, Award, MessageSquareText, CalendarCheck, Activity,
         User, Shield, Fingerprint, Copy, Check, ChevronDown, ChevronUp,
         Hash, MapPin, Calendar, Link2 } from 'lucide-react';
import type { PersonArchiveProfile } from '@/lib/archiveSnapshot';

interface Props {
  profile: PersonArchiveProfile;
  onClose: () => void;
  onDownload: () => void;
}

export default function PersonProfileModal({ profile, onClose, onDownload }: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    identity: true,
    contact: true,
    face: true,
    academic: true,
    messages: false,
    activity: false,
  });

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {}
  };

  const typeLabel: Record<string, string> = {
    student: '🎓 طالب', parent: '👨‍👩‍👧 ولي أمر',
    doctor: '🩺 طبيب/معالج', specialist: '🧑‍⚕️ أخصائي', teacher: '👩‍🏫 معلم',
  };

  const CopyBtn = ({ value, field }: { value: string; field: string }) => (
    <button
      onClick={() => copyToClipboard(value, field)}
      className="ml-1 grid h-5 w-5 place-items-center rounded text-slate-400 hover:text-sky-600 transition cursor-pointer"
      title="نسخ"
    >
      {copiedField === field ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );

  const SectionHeader = ({ id, icon: Icon, title, count }: { id: string; icon: any; title: string; count?: number }) => (
    <button
      onClick={() => toggleSection(id)}
      className="flex w-full items-center justify-between py-2.5 px-1 border-b border-slate-100 mb-3 cursor-pointer group"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-sky-500" />
        <span className="font-black text-sm text-slate-700">{title}</span>
        {count !== undefined && (
          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700 border border-sky-200">{count}</span>
        )}
      </div>
      {expandedSections[id] ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
    </button>
  );

  const InfoRow = ({ label, value, field }: { label: string; value?: string | null; field?: string }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-2 py-1.5 border-b border-slate-50">
        <span className="text-xs font-bold text-slate-400 w-28 shrink-0 text-left">{label}</span>
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <span className="text-xs text-slate-700 font-medium break-all">{value}</span>
          {field && <CopyBtn value={value} field={field} />}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-l from-sky-600 to-teal-600 px-5 py-4 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl overflow-hidden border-2 border-white/40 bg-white/20 shrink-0">
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt={profile.fullName} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
              )}
            </div>
            <div>
              <h2 className="text-base font-black text-white leading-tight">{profile.fullName}</h2>
              <p className="text-xs text-sky-100 font-bold mt-0.5">{typeLabel[profile.type] ?? profile.type}</p>
              {profile.fullNameEn && <p className="text-[11px] text-sky-200 mt-0.5">{profile.fullNameEn}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/30 px-3 py-2 text-xs font-black text-white transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              تنزيل JSON
            </button>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-xl bg-white/20 hover:bg-white/30 text-white transition cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-5 space-y-5">

          {/* Face Badge */}
          {profile.faceEnrolled && (
            <div className="flex items-center gap-3 rounded-2xl bg-indigo-50 border border-indigo-200 p-3.5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-500 shadow-sm shrink-0">
                <ScanFace className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-indigo-800">بصمة الوجه مسجّلة ✅</p>
                <p className="text-xs text-indigo-600 font-medium">
                  {profile.faceEmbeddingsCount ?? 0} متجه بيومتري محفوظ
                  {profile.faceEnrolledAt && ` • تسجيل: ${new Date(profile.faceEnrolledAt).toLocaleDateString('ar-SA')}`}
                </p>
              </div>
            </div>
          )}

          {/* ── Identity ── */}
          <div>
            <SectionHeader id="identity" icon={User} title="بيانات الهوية" />
            {expandedSections.identity && (
              <div className="space-y-0.5">
                <InfoRow label="الاسم الكامل" value={profile.fullName} field="fullName" />
                <InfoRow label="الاسم بالإنجليزية" value={profile.fullNameEn} field="fullNameEn" />
                <InfoRow label="رقم الهوية" value={profile.nationalId} field="nationalId" />
                <InfoRow label="تاريخ الميلاد" value={profile.dateOfBirth} field="dob" />
                <InfoRow label="الصف/المرحلة" value={profile.grade} field="grade" />
                <InfoRow label="الفرع" value={profile.schoolBranch} field="branch" />
                <InfoRow label="مصدر التسجيل" value={profile.registrationSource} />
                <InfoRow label="تاريخ الإضافة" value={profile.createdAt ? new Date(profile.createdAt).toLocaleString('ar-SA') : undefined} />
                <InfoRow label="آخر دخول" value={profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString('ar-SA') : undefined} />
                <InfoRow label="آخر نشاط" value={profile.lastActiveAt ? new Date(profile.lastActiveAt).toLocaleString('ar-SA') : undefined} />
              </div>
            )}
          </div>

          {/* ── Contact & Accounts ── */}
          <div>
            <SectionHeader id="contact" icon={Mail} title="بيانات الاتصال والحسابات" />
            {expandedSections.contact && (
              <div className="space-y-0.5">
                {profile.emails.map((email, i) => (
                  <InfoRow key={i} label={i === 0 ? 'الإيميل الرئيسي' : `إيميل ${i + 1}`} value={email} field={`email_${i}`} />
                ))}
                <InfoRow label="رقم الهاتف" value={profile.phone} field="phone" />
                <InfoRow label="Firebase UID" value={profile.firebaseUid} field="fbuid" />
                <div className="py-1.5 border-b border-slate-50">
                  <span className="text-xs font-bold text-slate-400">معرّفات الحساب</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {profile.accountIds.map((id) => (
                      <span key={id} className="text-[10px] font-mono bg-slate-100 border border-slate-200 rounded px-2 py-0.5 text-slate-600 flex items-center gap-1">
                        {id}
                        <CopyBtn value={id} field={`accountId_${id}`} />
                      </span>
                    ))}
                  </div>
                </div>
                {profile.loginMethods.length > 0 && (
                  <div className="py-1.5">
                    <span className="text-xs font-bold text-slate-400">طرق تسجيل الدخول</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {profile.loginMethods.map((m) => (
                        <span key={m} className="text-[10px] font-bold bg-sky-50 border border-sky-200 text-sky-700 rounded px-2 py-0.5">{m}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Student Academic Data ── */}
          {profile.type === 'student' && profile.student && (
            <div>
              <SectionHeader id="academic" icon={FileText} title="البيانات الأكاديمية" count={
                profile.student.reports.length + profile.student.homeworkLogs.length + profile.student.certificates.length
              } />
              {expandedSections.academic && (
                <div className="space-y-3">
                  {/* Programs */}
                  {profile.student.assignedPrograms.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-slate-500 mb-1.5">المسارات المُخصَّصة</p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.student.assignedPrograms.map((p) => (
                          <span key={p} className="text-[11px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg px-2.5 py-1">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reports */}
                  {profile.student.reports.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-slate-500 mb-1.5">📋 التقارير ({profile.student.reports.length})</p>
                      <div className="space-y-1.5">
                        {profile.student.reports.map((r: any, i) => (
                          <div key={i} className="rounded-xl bg-amber-50 border border-amber-100 p-2.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-black text-amber-800">{r.program || r.type}</span>
                              <span className="font-bold text-amber-600">{r.score}%</span>
                            </div>
                            <p className="text-amber-600 mt-0.5">{r.date || r.createdAt?.slice(0,10)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Homework */}
                  {profile.student.homeworkLogs.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-slate-500 mb-1.5">📚 الواجبات ({profile.student.homeworkLogs.length})</p>
                      <div className="space-y-1.5">
                        {profile.student.homeworkLogs.slice(0, 5).map((h: any, i) => (
                          <div key={i} className="rounded-xl bg-orange-50 border border-orange-100 p-2.5 text-xs flex items-center justify-between">
                            <span className="font-bold text-orange-800 truncate">{h.title}</span>
                            <span className={`font-black px-1.5 py-0.5 rounded-md text-[10px] border ${
                              h.status === 'submitted' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                              h.status === 'late' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                              'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>{h.status}</span>
                          </div>
                        ))}
                        {profile.student.homeworkLogs.length > 5 && (
                          <p className="text-xs text-slate-400 text-center">+{profile.student.homeworkLogs.length - 5} واجب آخر</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Certificates */}
                  {profile.student.certificates.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-slate-500 mb-1.5">🏅 الشهادات ({profile.student.certificates.length})</p>
                      <div className="space-y-1.5">
                        {profile.student.certificates.map((c: any, i) => (
                          <div key={i} className="rounded-xl bg-yellow-50 border border-yellow-100 p-2.5 text-xs">
                            <span className="font-black text-yellow-800">{c.title}</span>
                            {c.certNumber && <span className="mr-2 text-yellow-600">{c.certNumber}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attendance */}
                  {profile.student.attendanceRecords.length > 0 && (
                    <div>
                      <p className="text-xs font-black text-slate-500 mb-1">📅 سجل الحضور ({profile.student.attendanceRecords.length} سجل)</p>
                      <div className="flex gap-3">
                        {['present', 'absent', 'late'].map((s) => (
                          <span key={s} className="text-xs font-bold text-slate-600">
                            {s === 'present' ? '✅ حاضر' : s === 'absent' ? '❌ غائب' : '⏰ متأخر'}:{' '}
                            <strong>{profile.student!.attendanceRecords.filter((a: any) => a.status === s).length}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Parent linked students ── */}
          {profile.type === 'parent' && profile.parent?.linkedStudents.length ? (
            <div>
              <p className="text-xs font-black text-slate-500 mb-2">👨‍👩‍👧 الأبناء المرتبطون</p>
              <div className="flex flex-wrap gap-2">
                {profile.parent.linkedStudents.map((s) => (
                  <span key={s.id} className="text-xs font-bold bg-violet-50 border border-violet-200 text-violet-700 rounded-xl px-3 py-1.5">{s.name}</span>
                ))}
              </div>
            </div>
          ) : null}

          {/* ── Messages ── */}
          {profile.allMessages.length > 0 && (
            <div>
              <SectionHeader id="messages" icon={MessageSquareText} title="الرسائل" count={profile.allMessages.length} />
              {expandedSections.messages && (
                <div className="space-y-1.5">
                  {profile.allMessages.slice(0, 8).map((m: any, i) => (
                    <div key={i} className="rounded-xl bg-rose-50 border border-rose-100 p-2.5 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-black text-rose-800">{m.from === 'doctor' ? 'د. إسماعيل' : 'ولي الأمر'}</span>
                        <span className="text-rose-400">{m.createdAt?.slice(0, 10)}</span>
                      </div>
                      <p className="text-rose-700 leading-relaxed">{String(m.body ?? '').slice(0, 120)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Activity Log ── */}
          {profile.activityLog.length > 0 && (
            <div>
              <SectionHeader id="activity" icon={Activity} title="سجل النشاط" count={profile.activityLog.length} />
              {expandedSections.activity && (
                <div className="space-y-1">
                  {profile.activityLog.slice(0, 10).map((a: any, i) => (
                    <div key={i} className="flex items-center gap-2 py-1.5 border-b border-slate-50 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shrink-0" />
                      <span className="font-bold text-slate-700">{a.title}</span>
                      <span className="text-slate-400 mr-auto">{a.createdAt?.slice(0, 10)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Raw JSON (collapsed) ── */}
          <details className="rounded-xl border border-slate-200 overflow-hidden">
            <summary className="px-4 py-3 text-xs font-black text-slate-500 cursor-pointer bg-slate-50 hover:bg-slate-100">
              🔧 عرض البيانات الخام (JSON)
            </summary>
            <pre className="p-4 text-[10px] text-slate-600 overflow-x-auto max-h-60 bg-slate-950 text-green-400">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </details>

        </div>
      </div>
    </div>
  );
}
