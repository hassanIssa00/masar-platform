'use client';

import { useState, useEffect } from 'react';
import { X, BookOpen, MessageSquare, Award, Plus, Trash2, Star, CheckCircle2, AlertCircle, Clock, Send, Printer } from 'lucide-react';
import {
  ClassStudentRecord, StudentNote, StudentHomeworkLog, StudentCertificateLog,
  getStudentNotes, saveStudentNote, deleteStudentNote,
  getStudentHomeworkLogs, saveStudentHomeworkLog, deleteStudentHomeworkLog,
  getStudentCertificateLogs, saveStudentCertificateLog, deleteStudentCertificateLog,
} from '@/lib/classDb';

type Tab = 'info' | 'homework' | 'notes' | 'certificates' | 'report';
interface Props { student: ClassStudentRecord; onClose: () => void; }

const SL: Record<string, { label: string; color: string; Icon: any }> = {
  submitted: { label: 'تم التسليم', color: 'bg-emerald-100 text-emerald-800', Icon: CheckCircle2 },
  late:      { label: 'متأخر',      color: 'bg-amber-100 text-amber-800',    Icon: Clock },
  missing:   { label: 'لم يسلم',   color: 'bg-rose-100 text-rose-800',      Icon: AlertCircle },
};

export default function StudentProfileModal({ student, onClose }: Props) {
  const [tab, setTab]           = useState<Tab>('info');
  const [notes, setNotes]       = useState<StudentNote[]>([]);
  const [noteText, setNoteText] = useState('');
  const [addNote, setAddNote]   = useState(false);
  const [hwLogs, setHwLogs]     = useState<StudentHomeworkLog[]>([]);
  const [showHw, setShowHw]     = useState(false);
  const [hwTitle, setHwTitle]   = useState('');
  const [hwSub, setHwSub]       = useState('u0644u063au062au064a u0627u0644u0639u0631u0628u064au0629');
  const [hwDue, setHwDue]       = useState('');
  const [hwGrade, setHwGrade]   = useState('');
  const [hwSt, setHwSt]         = useState<'submitted'|'late'|'missing'>('submitted');
  const [hwFb, setHwFb]         = useState('');
  const [certs, setCerts]       = useState<StudentCertificateLog[]>([]);
  const [showCert, setShowCert] = useState(false);
  const [cTitle, setCTitle]     = useState('');
  const [cProg, setCProg]       = useState('');
  const [cDate, setCDate]       = useState(new Date().toISOString().slice(0,10));
  const [cScore, setCScore]     = useState('');

  useEffect(() => {
    setNotes(getStudentNotes(student.id));
    setHwLogs(getStudentHomeworkLogs(student.id));
    setCerts(getStudentCertificateLogs(student.id));
  }, [student.id]);
  const doAddNote = () => {
    if (!noteText.trim()) return;
    const n = saveStudentNote({ studentId: student.id, text: noteText.trim() });
    setNotes(p => [n, ...p]); setNoteText(''); setAddNote(false);
  };

  const doAddHw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hwTitle.trim()) return;
    const log = saveStudentHomeworkLog({
      studentId: student.id, title: hwTitle.trim(), subject: hwSub,
      dueDate: hwDue, grade: hwGrade ? Number(hwGrade) : undefined,
      status: hwSt, teacherFeedback: hwFb.trim() || undefined,
    });
    setHwLogs(p => [log, ...p]);
    setHwTitle(''); setHwSub('لغتي العربية'); setHwDue('');
    setHwGrade(''); setHwSt('submitted'); setHwFb(''); setShowHw(false);
  };

  const doAddCert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cTitle.trim()) return;
    const log = saveStudentCertificateLog({
      studentId: student.id, title: cTitle.trim(),
      programTitle: cProg.trim() || cTitle.trim(),
      completionDate: cDate, score: cScore ? Number(cScore) : 100,
    });
    setCerts(p => [log, ...p]);
    setCTitle(''); setCProg(''); setCScore('');
    setCDate(new Date().toISOString().slice(0, 10)); setShowCert(false);
  };

  const doWhatsApp = () => {
    const ph = (student.parentPhone || '').replace(/\D/g, '');
    const wap = ph.startsWith('966') ? ph : '966' + ph.replace(/^0/, '');
    const day = new Date().toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });
    let m = `مدرسة الإخلاص الأهلية — مسار التعليمي\nتقرير الطالب: ${student.fullName}\nالتاريخ: ${day}\nولي الأمر: ${student.parentName ?? '—'}\n\n`;
    if (hwLogs.length) {
      m += `الواجبات (${hwLogs.length}):\n`;
      hwLogs.slice(0, 5).forEach(h => {
        const ic = h.status === 'submitted' ? '✅' : h.status === 'late' ? '⏰' : '❌';
        m += `${ic} ${h.title} — ${h.subject}${h.grade !== undefined ? ` (${h.grade}/10)` : ''}\n`;
      });
      m += '\n';
    }
    if (notes.length) { m += `ملاحظات المعلم:\n`; notes.slice(0, 3).forEach(n => { m += `• ${n.text}\n`; }); m += '\n'; }
    if (certs.length) { m += `الشهادات:\n`; certs.forEach(c => { m += `🏆 ${c.title} — ${c.completionDate}\n`; }); }
    m += `\n🌟 نتمنى لابنكم التوفيق!\nمنصة مسار للتعليم الذكي`;
    window.open(`https://wa.me/${wap}?text=${encodeURIComponent(m)}`, '_blank');
  };

  const TABS: { key: Tab; label: string; n?: number }[] = [
    { key: 'info',         label: '📋 البيانات' },
    { key: 'homework',     label: '📚 الواجبات',   n: hwLogs.length },
    { key: 'notes',        label: '📝 الملاحظات',  n: notes.length  },
    { key: 'certificates', label: '🏆 الشهادات',   n: certs.length  },
    { key: 'report',       label: '📨 إرسال تقرير' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto" dir="rtl">
      <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden mt-6 mb-6">

        {/* Header */}
        <div className="bg-gradient-to-l from-teal-700 to-slate-800 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white font-black text-lg">
                {student.fullName.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-black text-white">{student.fullName}</h2>
                <p className="text-sm text-teal-200 font-bold">{student.grade}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition">
              <X size={18} />
            </button>
          </div>
          <div className="flex gap-1 mt-5 flex-wrap">
            {TABS.map(({ key, label, n }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${tab === key ? 'bg-white text-slate-900 shadow-sm' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                {label}
                {n !== undefined && n > 0 && (
                  <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${tab === key ? 'bg-teal-600 text-white' : 'bg-white/20 text-white'}`}>{n}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4">

          {/* ── INFO ── */}
          {tab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                ['الاسم الكامل',      student.fullName],
                ['الاسم بالإنجليزية', student.fullNameEn || '—'],
                ['الصف / الفصل',      student.grade],
                ['رقم الهوية',        student.nationalId || '—'],
                ['تاريخ الميلاد',     student.dateOfBirth || '—'],
                ['اسم ولي الأمر',     student.parentName  || '—'],
                ['هاتف ولي الأمر',    student.parentPhone  || '—'],
                ['تاريخ التسجيل',     new Date(student.createdAt).toLocaleDateString('ar-SA')],
              ] as [string,string][]).map(([lbl, val]) => (
                <div key={lbl} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{lbl}</p>
                  <p className="text-sm font-black text-slate-900">{val}</p>
                </div>
              ))}
              <div className="md:col-span-2 bg-teal-50 border border-teal-200 rounded-2xl p-4">
                <p className="text-[10px] font-black text-teal-500 uppercase tracking-wider mb-2">المسارات المخصصة</p>
                <div className="flex flex-wrap gap-2">
                  {(student.assignedPrograms || [student.assignedProgram || 'reading']).map(p => (
                    <span key={p} className="bg-teal-600 text-white text-xs font-black px-3 py-1 rounded-full">{p}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── HOMEWORK ── */}
          {tab === 'homework' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">سجل الواجبات ({hwLogs.length})</h3>
                <button onClick={() => setShowHw(!showHw)} className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-xl text-xs font-black transition">
                  <Plus size={13} /> إضافة واجب
                </button>
              </div>
              {showHw && (
                <form onSubmit={doAddHw} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-black text-slate-600 mb-1 block">عنوان الواجب</label>
                      <input value={hwTitle} onChange={e => setHwTitle(e.target.value)} placeholder="واجب الجمع والطرح" required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:border-teal-400 focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-600 mb-1 block">المادة</label>
                      <select value={hwSub} onChange={e => setHwSub(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none">
                        {['لغتي العربية','الرياضيات','القرآن الكريم','العلوم','التربية الإسلامية','الإنجليزية'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-600 mb-1 block">الحالة</label>
                      <select value={hwSt} onChange={e => setHwSt(e.target.value as any)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none">
                        <option value="submitted">تم التسليم ✅</option>
                        <option value="late">متأخر ⏰</option>
                        <option value="missing">لم يسلم ❌</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-600 mb-1 block">تاريخ التسليم</label>
                      <input type="date" value={hwDue} onChange={e => setHwDue(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-600 mb-1 block">الدرجة (من 10)</label>
                      <input type="number" min={0} max={10} value={hwGrade} onChange={e => setHwGrade(e.target.value)} placeholder="8" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-black text-slate-600 mb-1 block">ملاحظة المعلم</label>
                      <input value={hwFb} onChange={e => setHwFb(e.target.value)} placeholder="ملاحظة اختيارية..." className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-teal-600 text-white py-2 rounded-xl text-xs font-black hover:bg-teal-700 transition">حفظ الواجب</button>
                    <button type="button" onClick={() => setShowHw(false)} className="px-4 border border-slate-200 rounded-xl text-xs font-black text-slate-600">إلغاء</button>
                  </div>
                </form>
              )}
              {hwLogs.length === 0 ? (
                <div className="text-center py-10 text-slate-400"><BookOpen size={32} className="mx-auto mb-2 opacity-30"/><p className="text-xs font-bold">لا توجد واجبات مسجلة بعد</p></div>
              ) : (
                <div className="space-y-2">
                  {hwLogs.map(h => {
                    const s = SL[h.status];
                    return (
                      <div key={h.id} className="flex items-start gap-3 bg-white border border-slate-200 rounded-2xl p-4">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}><s.Icon size={15}/></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-900">{h.title}</p>
                          <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                            {h.subject}{h.dueDate && ` · ${h.dueDate}`}{h.grade !== undefined && ` · ${h.grade}/10`}
                          </p>
                          {h.teacherFeedback && <p className="text-[11px] font-bold text-amber-700 mt-0.5 border-r-2 border-amber-400 pr-2">{h.teacherFeedback}</p>}
                        </div>
                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg shrink-0 ${s.color}`}>{s.label}</span>
                        <button onClick={() => { deleteStudentHomeworkLog(h.id); setHwLogs(p => p.filter(x => x.id !== h.id)); }} className="text-slate-300 hover:text-rose-500 transition"><Trash2 size={14}/></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── NOTES ── */}
          {tab === 'notes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">ملاحظات المعلم ({notes.length})</h3>
                <button onClick={() => setAddNote(!addNote)} className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-black transition">
                  <Plus size={13} /> إضافة ملاحظة
                </button>
              </div>
              {addNote && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="اكتب ملاحظتك على الطالب هنا..." rows={3} className="w-full border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none resize-none bg-white" />
                  <div className="flex gap-2">
                    <button onClick={doAddNote} className="flex-1 bg-amber-500 text-white py-2 rounded-xl text-xs font-black hover:bg-amber-600 transition">حفظ الملاحظة</button>
                    <button onClick={() => { setAddNote(false); setNoteText(''); }} className="px-4 border border-slate-200 rounded-xl text-xs font-black text-slate-600">إلغاء</button>
                  </div>
                </div>
              )}
              {notes.length === 0 ? (
                <div className="text-center py-10 text-slate-400"><MessageSquare size={32} className="mx-auto mb-2 opacity-30"/><p className="text-xs font-bold">لا توجد ملاحظات مسجلة بعد</p></div>
              ) : (
                <div className="space-y-2">
                  {notes.map(n => (
                    <div key={n.id} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                      <div className="w-1 self-stretch bg-amber-400 rounded-full shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 leading-relaxed">{n.text}</p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">{new Date(n.createdAt).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                      <button onClick={() => { deleteStudentNote(n.id); setNotes(p => p.filter(x => x.id !== n.id)); }} className="text-slate-300 hover:text-rose-500 transition"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CERTIFICATES ── */}
          {tab === 'certificates' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900">سجل الشهادات ({certs.length})</h3>
                <button onClick={() => setShowCert(!showCert)} className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-xl text-xs font-black transition">
                  <Plus size={13} /> تسجيل شهادة
                </button>
              </div>
              {showCert && (
                <form onSubmit={doAddCert} className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs font-black text-slate-600 mb-1 block">عنوان الشهادة</label>
                      <input value={cTitle} onChange={e => setCTitle(e.target.value)} placeholder="شهادة تميز في القراءة" required className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-600 mb-1 block">البرنامج / المسار</label>
                      <input value={cProg} onChange={e => setCProg(e.target.value)} placeholder="مسار القراءة" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-slate-600 mb-1 block">تاريخ المنح</label>
                      <input type="date" value={cDate} onChange={e => setCDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs font-black text-slate-600 mb-1 block">الدرجة %</label>
                      <input type="number" min={0} max={100} value={cScore} onChange={e => setCScore(e.target.value)} placeholder="95" className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-yellow-500 text-white py-2 rounded-xl text-xs font-black hover:bg-yellow-600 transition">حفظ الشهادة</button>
                    <button type="button" onClick={() => setShowCert(false)} className="px-4 border border-slate-200 rounded-xl text-xs font-black text-slate-600">إلغاء</button>
                  </div>
                </form>
              )}
              {certs.length === 0 ? (
                <div className="text-center py-10 text-slate-400"><Award size={32} className="mx-auto mb-2 opacity-30"/><p className="text-xs font-bold">لا توجد شهادات مسجلة بعد</p></div>
              ) : (
                <div className="space-y-3">
                  {certs.map(c => (
                    <div key={c.id} className="flex items-center gap-4 bg-gradient-to-l from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-4">
                      <div className="w-10 h-10 rounded-xl bg-yellow-100 border border-yellow-300 flex items-center justify-center text-yellow-700 shrink-0"><Award size={20}/></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-900">{c.title}</p>
                        <p className="text-[11px] font-bold text-slate-500 mt-0.5">{c.programTitle} · {c.completionDate}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => <Star key={i} size={11} className={i < Math.round(c.score / 20) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}/>)}
                          <span className="text-[10px] text-slate-400 font-bold mr-1">{c.score}%</span>
                        </div>
                      </div>
                      <button onClick={() => { deleteStudentCertificateLog(c.id); setCerts(p => p.filter(x => x.id !== c.id)); }} className="text-slate-300 hover:text-rose-500 transition"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── REPORT ── */}
          {tab === 'report' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                {([
                  { l: 'الواجبات',  n: hwLogs.length, c: 'bg-teal-50 border-teal-200 text-teal-800'   },
                  { l: 'الملاحظات', n: notes.length,  c: 'bg-amber-50 border-amber-200 text-amber-800' },
                  { l: 'الشهادات',  n: certs.length,  c: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
                ] as { l: string; n: number; c: string }[]).map(s => (
                  <div key={s.l} className={`border rounded-2xl p-4 text-center ${s.c}`}>
                    <div className="text-2xl font-black">{s.n}</div>
                    <div className="text-[11px] font-black mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
                <h4 className="text-xs font-black text-slate-700 mb-3">معاينة التقرير</h4>
                <div className="text-xs font-bold text-slate-600 space-y-1 leading-relaxed">
                  <p>📋 <strong>تقرير الطالب:</strong> {student.fullName}</p>
                  <p>📅 <strong>التاريخ:</strong> {new Date().toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <p>👨‍👩‍👦 <strong>ولي الأمر:</strong> {student.parentName ?? '—'}</p>
                  <p>📚 <strong>الواجبات المنجزة:</strong> {hwLogs.filter(h => h.status === 'submitted').length} من {hwLogs.length}</p>
                  <p>📝 <strong>ملاحظات المعلم:</strong> {notes.length} ملاحظة</p>
                  <p>🏆 <strong>الشهادات الممنوحة:</strong> {certs.length} شهادة</p>
                </div>
              </div>

              <div className="space-y-3">
                {student.parentPhone ? (
                  <button onClick={doWhatsApp}
                    className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl text-sm font-black shadow-lg shadow-emerald-600/20 transition">
                    <Send size={18} />
                    إرسال التقرير لولي الأمر عبر واتساب
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-xs font-bold">
                    <AlertCircle size={14} />
                    لم يتم تسجيل رقم هاتف ولي الأمر — يرجى تحديث بيانات الطالب أولاً
                  </div>
                )}
                <button onClick={() => window.print()}
                  className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-900 text-white py-4 rounded-2xl text-sm font-black transition">
                  <Printer size={18} />
                  طباعة / تصدير PDF
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
