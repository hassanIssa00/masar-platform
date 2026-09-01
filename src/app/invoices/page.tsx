'use client';

import { useEffect, useState } from 'react';
import {
  CreditCard, Plus, Printer, CheckCircle2, AlertCircle, Clock,
  DollarSign, FileText, X, User, Search
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { getStudents, type StudentRecord } from '@/lib/cloudStore';
import { getLocalInvoices, createInvoice, updateInvoiceStatus, type InvoiceRecord } from '@/lib/invoices';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<InvoiceRecord | null>(null);

  // Form states
  const [studentId, setStudentId] = useState('');
  const [amount, setAmount] = useState(500);
  const [description, setDescription] = useState('رسوم الجلسات العلاجية المخصصة والمنهج');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setInvoices(getLocalInvoices());
    const allSt = getStudents();
    setStudents(allSt);
    if (allSt.length > 0) setStudentId(allSt[0].id);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const st = students.find((s) => s.id === studentId);
    await createInvoice({
      studentId,
      studentName: st ? st.fullName : 'طالب',
      parentName: (st && st.parentName) ? st.parentName : 'ولي الأمر',
      amount,
      currency: 'EGP',
      status: 'unpaid',
      description,
      dueDate,
    });
    setInvoices(getLocalInvoices());
    setShowModal(false);
  };

  const handleStatusChange = (id: string, status: InvoiceRecord['status']) => {
    updateInvoiceStatus(id, status);
    setInvoices(getLocalInvoices());
  };

  const totalPaid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  const totalUnpaid = invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);

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
                <CreditCard className="text-teal-600" size={26} />
                إدارة الفواتير والمدفوعات المالية
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-1">
                تتبع رسوم الجلسات، الفواتير المستحقة، وتصدير إيصالات السداد الرسمية
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-black text-white hover:bg-teal-700 transition shadow-sm"
            >
              <Plus size={18} /> إنشاء فاتورة جديدة
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <p className="text-xs font-black text-slate-400">إجمالي السداد المحصل</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">{totalPaid.toLocaleString()} EGP</p>
              <p className="text-[11px] font-bold text-slate-500 mt-1">فواتير مدفوعة بالكامل</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <p className="text-xs font-black text-slate-400">المبالغ المستحقة غير المدفوعة</p>
              <p className="text-3xl font-black text-amber-600 mt-1">{totalUnpaid.toLocaleString()} EGP</p>
              <p className="text-[11px] font-bold text-slate-500 mt-1">في انتظار التحصيل</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <p className="text-xs font-black text-slate-400">إجمالي عدد الفواتير</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{invoices.length} فاتورة</p>
              <p className="text-[11px] font-bold text-slate-500 mt-1">مسجلة في قاعدة البيانات</p>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <p className="font-black text-slate-900 text-sm">سجل الفواتير والإيصالات الرسمية</p>
              <span className="text-xs font-bold text-slate-400">{invoices.length} فاتورة</span>
            </div>

            {invoices.length === 0 ? (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <CreditCard className="mx-auto text-slate-300" size={36} />
                <p className="text-sm font-black">لا توجد فواتير مسجلة بعد</p>
                <button onClick={() => setShowModal(true)} className="text-xs font-black text-teal-600 hover:underline">
                  + إنشاء أول فاتورة
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-black text-slate-400">
                      <th className="pb-3">رقم الفاتورة</th>
                      <th className="pb-3">الطالب</th>
                      <th className="pb-3">البيان</th>
                      <th className="pb-3">المبلغ</th>
                      <th className="pb-3">تاريخ الاستحقاق</th>
                      <th className="pb-3">الحالة</th>
                      <th className="pb-3">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition">
                        <td className="py-3 font-black text-slate-900">{inv.invoiceNumber}</td>
                        <td className="py-3 font-black text-teal-800">{inv.studentName}</td>
                        <td className="py-3 text-xs font-bold text-slate-600">{inv.description}</td>
                        <td className="py-3 font-black text-slate-900">{inv.amount} {inv.currency}</td>
                        <td className="py-3 text-xs text-slate-400">{inv.dueDate}</td>
                        <td className="py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${
                            inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {inv.status === 'paid' ? 'مدفوعة ✓' : 'معلقة'}
                          </span>
                        </td>
                        <td className="py-3 flex items-center gap-2">
                          <button
                            onClick={() => handleStatusChange(inv.id, inv.status === 'paid' ? 'unpaid' : 'paid')}
                            className="text-xs font-black text-teal-700 hover:underline"
                          >
                            {inv.status === 'paid' ? 'تغيير إلى غير مدفوع' : 'تأكيد التحصيل ✓'}
                          </button>
                          <button
                            onClick={() => setPrintInvoice(inv)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                            title="طباعة الفاتورة"
                          >
                            <Printer size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Create Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-xs grid place-items-center">
              <form
                onSubmit={handleCreate}
                className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 text-right"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-slate-900 text-lg">إنشاء فاتورة جديدة</h3>
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
                      <option key={st.id} value={st.id}>👦 {st.fullName} ({st.parentName})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">المبلغ المطلوب (EGP)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(+e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">البيان / الخدمة</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">تاريخ الاستحقاق</label>
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
                    تأكيد الفاتورة
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Printable Invoice Modal */}
          {printInvoice && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-xs grid place-items-center">
              <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl space-y-6 border border-slate-200 text-right">
                <div className="flex justify-between items-center border-b pb-4">
                  <span className="font-black text-teal-800 text-lg">إيصال سداد رسمي · {printInvoice.invoiceNumber}</span>
                  <button onClick={() => window.print()} className="rounded-xl bg-teal-600 px-3 py-1.5 text-xs font-black text-white">
                    <Printer size={14} className="inline ml-1" /> طباعة
                  </button>
                </div>
                <div className="space-y-2 text-sm font-bold text-slate-700">
                  <p>اسم الطالب: <span className="font-black text-slate-900">{printInvoice.studentName}</span></p>
                  <p>ولي الأمر: <span className="font-black text-slate-900">{printInvoice.parentName}</span></p>
                  <p>البيان: <span className="font-black text-slate-900">{printInvoice.description}</span></p>
                  <p className="text-xl font-black text-teal-700 pt-2">المبلغ: {printInvoice.amount} {printInvoice.currency}</p>
                </div>
                <div className="pt-4 border-t flex justify-between items-center text-xs font-bold text-slate-400">
                  <span>منصة مسار — د. إسماعيل عيسى</span>
                  <button onClick={() => setPrintInvoice(null)} className="text-slate-600 font-black">إغلاق</button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
