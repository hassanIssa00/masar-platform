'use client';

import { useEffect, useState } from 'react';
import {
  ShieldCheck, Plus, X, CheckCircle2, AlertCircle, Clock, FileText,
  User, Printer, RotateCcw, Trash2, PenLine, Lock
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  getLocalConsents, createConsent, updateConsentStatus, revokeConsent,
  type ConsentForm, CONSENT_TYPE_LABELS, CONSENT_STATUS_COLORS, CONSENT_STATUS_LABELS
} from '@/lib/consents';
import { getStudents, type StudentRecord } from '@/lib/localDb';
import FeatureGuideBanner from '@/components/FeatureGuideBanner';

export default function ConsentsPage() {
  const [consents, setConsents] = useState<ConsentForm[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [signModal, setSignModal] = useState<ConsentForm | null>(null);
  const [signature, setSignature] = useState('');

  const [form, setForm] = useState({
    studentId: '',
    consentType: 'general-treatment' as ConsentForm['consentType'],
    parentName: '',
    parentPhone: '',
    expiresAt: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    notes: '',
    digitalSignature: '',
  });

  useEffect(() => {
    setConsents(getLocalConsents());
    const allSt = getStudents();
    setStudents(allSt);
    if (allSt.length > 0) {
      const first = allSt[0];
      setForm(f => ({
        ...f,
        studentId: first.id,
        parentName: first.parentName || '',
        parentPhone: first.parentPhone || '',
      }));
    }
  }, []);

  const handleStudentChange = (id: string) => {
    const st = students.find(s => s.id === id);
    setForm(f => ({
      ...f,
      studentId: id,
      parentName: st?.parentName || '',
      parentPhone: st?.parentPhone || '',
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find(s => s.id === form.studentId);
    await createConsent({
      studentId: form.studentId,
      studentName: st?.fullName || 'طالب',
      parentName: form.parentName,
      parentPhone: form.parentPhone,
      consentType: form.consentType,
      status: 'pending',
      expiresAt: form.expiresAt,
      notes: form.notes,
      digitalSignature: '',
    });
    setConsents(getLocalConsents());
    setShowModal(false);
  };

  const handleSign = (c: ConsentForm) => {
    setSignModal(c);
    setSignature('');
  };

  const confirmSign = () => {
    if (!signModal || !signature.trim()) return;
    updateConsentStatus(signModal.id, 'signed', signature);
    setConsents(getLocalConsents());
    setSignModal(null);
  };

  const handleRevoke = (id: string) => {
    revokeConsent(id);
    setConsents(getLocalConsents());
  };

  const pending = consents.filter(c => c.status === 'pending').length;
  const signed = consents.filter(c => c.status === 'signed').length;
  const revoked = consents.filter(c => c.status === 'revoked').length;

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
                <ShieldCheck className="text-teal-600" size={26} />
                نظام الموافقات الرقمية وحماية الخصوصية
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-1">
                إدارة نماذج الموافقة القانونية الرقمية لأولياء الأمور بتوقيعات إلكترونية معتمدة
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-black text-white hover:bg-teal-700 shadow-sm"
            >
              <Plus size={18} /> إنشاء نموذج موافقة جديد
            </button>
          </div>

          <FeatureGuideBanner
            title="الموافقات الرقمية وحماية البيانات (Consent Management)"
            description="منظومة إلكترونية موثقة لجمع وتوثيق موافقات أولياء الأمور على البرامج العلاجية والتصوير وتداول البيانات الطبية بشكل قانوني آمن."
            benefits={[
              'تحمي المركز والأخصائي قانونياً وتوفر سجل تتبع موثق لكل موافقة.',
              'تسهل على أولياء الأمور التوقيع الإلكتروني السريع من جوالاتهم بدون أوراق.',
              'تُنبه الإدارة تلقائياً عند اقتراب انتهاء صلاحية أي موافقة لتجديدها.'
            ]}
            modernShift="الأمان وحماية خصوصية بيانات الطفل الطبية والنفسية هو حجر الزاوية في المعايير العالمية الحديثة (HIPAA & GDPR)، ونقل المعاملات من الورق إلى التوقيع الرقمي المعتمد يعزز الثقة والموثوقية."
          />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs text-center">
              <p className="text-3xl font-black text-amber-600">{pending}</p>
              <p className="text-xs font-black text-slate-400 mt-1">في انتظار التوقيع</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs text-center">
              <p className="text-3xl font-black text-emerald-600">{signed}</p>
              <p className="text-xs font-black text-slate-400 mt-1">موقّعة ومعتمدة</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs text-center">
              <p className="text-3xl font-black text-rose-600">{revoked}</p>
              <p className="text-xs font-black text-slate-400 mt-1">تم السحب أو الإلغاء</p>
            </div>
          </div>

          {/* Alert for pending */}
          {pending > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
              <AlertCircle className="text-amber-600 shrink-0" size={20} />
              <div>
                <p className="font-black text-amber-900 text-sm">تنبيه: {pending} نموذج موافقة في انتظار التوقيع</p>
                <p className="text-xs font-bold text-amber-700 mt-0.5">يرجى التواصل مع أولياء الأمور المعنيين لإتمام توقيع الموافقات.</p>
              </div>
            </div>
          )}

          {/* Consents Grid */}
          {consents.length === 0 ? (
            <div className="py-20 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-3">
              <ShieldCheck className="mx-auto text-slate-300" size={48} />
              <p className="text-lg font-black text-slate-600">لا توجد نماذج موافقة مسجلة</p>
              <p className="text-xs font-bold text-slate-400">الموافقات الرقمية متطلب قانوني لكل طالب في المركز</p>
              <button onClick={() => setShowModal(true)} className="mx-auto flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-black text-white hover:bg-teal-700">
                <Plus size={16} /> إنشاء أول موافقة رقمية
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {consents.map(c => (
                <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-slate-900">{c.studentName}</h3>
                      <p className="text-xs font-bold text-slate-400">ولي الأمر: {c.parentName}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${CONSENT_STATUS_COLORS[c.status]}`}>
                      {CONSENT_STATUS_LABELS[c.status]}
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100 space-y-1 text-xs font-bold text-slate-600">
                    <p>📋 النوع: <span className="font-black text-slate-800">{CONSENT_TYPE_LABELS[c.consentType]}</span></p>
                    <p>📅 تاريخ الانتهاء: <span className="font-black text-slate-800">{c.expiresAt}</span></p>
                    {c.signedAt && <p>✍️ تاريخ التوقيع: <span className="font-black text-emerald-700">{c.signedAt.slice(0, 10)}</span></p>}
                    {c.digitalSignature && <p>🔏 التوقيع: <span className="font-black italic text-slate-700">{c.digitalSignature}</span></p>}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {c.status === 'pending' && (
                      <button
                        onClick={() => handleSign(c)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 py-2 text-xs font-black text-white hover:bg-teal-700"
                      >
                        <PenLine size={14} /> تسجيل التوقيع
                      </button>
                    )}
                    {c.status === 'signed' && (
                      <button
                        onClick={() => handleRevoke(c.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2 text-xs font-black text-rose-700 hover:bg-rose-100"
                      >
                        <RotateCcw size={14} /> سحب الموافقة
                      </button>
                    )}
                    <button onClick={() => window.print()} className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200">
                      <Printer size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm grid place-items-center">
              <form onSubmit={handleCreate} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 text-right">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-slate-900 text-lg">إنشاء نموذج موافقة رقمية</h3>
                  <button type="button" onClick={() => setShowModal(false)}><X size={20} className="text-slate-400" /></button>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">الطالب</label>
                  <select
                    value={form.studentId}
                    onChange={e => handleStudentChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none"
                    required
                  >
                    {students.map(st => <option key={st.id} value={st.id}>👦 {st.fullName}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">نوع الموافقة</label>
                  <select
                    value={form.consentType}
                    onChange={e => setForm(f => ({ ...f, consentType: e.target.value as ConsentForm['consentType'] }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none"
                  >
                    {Object.entries(CONSENT_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">اسم ولي الأمر</label>
                    <input type="text" value={form.parentName} onChange={e => setForm(f => ({ ...f, parentName: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none" required />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">رقم الهاتف</label>
                    <input type="text" value={form.parentPhone} onChange={e => setForm(f => ({ ...f, parentPhone: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">صالحة حتى</label>
                  <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none" required />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">ملاحظات إضافية</label>
                  <textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none resize-none" />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-xs font-black text-slate-500">إلغاء</button>
                  <button type="submit" className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white hover:bg-teal-700 shadow-sm">
                    إنشاء نموذج الموافقة
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sign Modal */}
          {signModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm grid place-items-center">
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 text-right">
                <h3 className="font-black text-slate-900 text-lg border-b pb-3">تسجيل التوقيع الرقمي</h3>
                <div className="rounded-xl bg-slate-50 p-4 border text-xs font-bold text-slate-700 space-y-1">
                  <p>الطالب: <span className="font-black">{signModal.studentName}</span></p>
                  <p>نوع الموافقة: <span className="font-black">{CONSENT_TYPE_LABELS[signModal.consentType]}</span></p>
                  <p>ولي الأمر: <span className="font-black">{signModal.parentName}</span></p>
                </div>
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">اكتب اسمك كاملاً للتوقيع الرقمي</label>
                  <input
                    type="text"
                    value={signature}
                    onChange={e => setSignature(e.target.value)}
                    placeholder="اكتب اسم ولي الأمر كاملاً..."
                    className="w-full rounded-xl border-2 border-teal-300 bg-white p-3 text-sm font-black italic outline-none focus:border-teal-600 text-center"
                  />
                  <p className="text-[11px] font-bold text-slate-400 mt-1 text-center">يُعدّ هذا التوقيع الإلكتروني ملزماً قانونياً ومعتمداً رقمياً</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setSignModal(null)} className="flex-1 py-2.5 text-xs font-black text-slate-500">إلغاء</button>
                  <button
                    onClick={confirmSign}
                    disabled={!signature.trim()}
                    className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white hover:bg-teal-700 disabled:opacity-40"
                  >
                    تأكيد التوقيع الرقمي ✓
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
