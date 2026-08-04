'use client';

import { useEffect, useState } from 'react';
import {
  Building2, Plus, X, MapPin, Phone, Users, Edit3,
  CheckCircle2, TrendingUp, Globe, Trash2, Settings2, ShieldCheck
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import { getLocalBranches, createBranch, updateBranch, deleteBranch, type BranchRecord } from '@/lib/branches';

export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BranchRecord | null>(null);

  const [form, setForm] = useState({
    name: '', city: '', address: '', phone: '', managerName: '',
    activeStudents: 0, status: 'active' as 'active' | 'inactive',
  });

  useEffect(() => {
    setBranches(getLocalBranches());
  }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', city: '', address: '', phone: '', managerName: '', activeStudents: 0, status: 'active' }); setShowModal(true); };
  const openEdit = (b: BranchRecord) => { setEditing(b); setForm({ name: b.name, city: b.city, address: b.address, phone: b.phone, managerName: b.managerName, activeStudents: b.activeStudents, status: b.status }); setShowModal(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      updateBranch(editing.id, { ...form });
    } else {
      await createBranch({ ...form, doctorIds: [] });
    }
    setBranches(getLocalBranches());
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    deleteBranch(id);
    setBranches(getLocalBranches());
  };

  const totalStudents = branches.reduce((s, b) => s + b.activeStudents, 0);
  const activeBranches = branches.filter(b => b.status === 'active').length;

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
                <Building2 className="text-teal-600" size={26} />
                إدارة الفروع والعيادات المتعددة
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-1">
                تشغيل وإدارة فروع وعيادات المركز في مواقع متعددة من مكان واحد
              </p>
            </div>
            <button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-black text-white hover:bg-teal-700 transition shadow-sm">
              <Plus size={18} /> إضافة فرع جديد
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: 'إجمالي الفروع', value: branches.length, icon: Building2, color: 'text-teal-600' },
              { label: 'فروع نشطة', value: activeBranches, icon: CheckCircle2, color: 'text-emerald-600' },
              { label: 'إجمالي الطلاب', value: totalStudents, icon: Users, color: 'text-indigo-600' },
              { label: 'فروع غير نشطة', value: branches.length - activeBranches, icon: Settings2, color: 'text-slate-500' },
            ].map(s => (
              <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon size={18} className={s.color} />
                  <p className="text-xs font-black text-slate-400">{s.label}</p>
                </div>
                <p className="text-3xl font-black text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Branches Grid */}
          {branches.length === 0 ? (
            <div className="py-20 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-3">
              <Building2 className="mx-auto text-slate-300" size={48} />
              <p className="text-lg font-black text-slate-500">لا توجد فروع مسجلة بعد</p>
              <p className="text-xs font-bold text-slate-400">ابدأ بإضافة فرع أو عيادة أولى للمركز</p>
              <button onClick={openCreate} className="mx-auto flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-black text-white hover:bg-teal-700 transition shadow-sm">
                <Plus size={16} /> إضافة أول فرع
              </button>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {branches.map(b => (
                <div key={b.id} className={`rounded-2xl border bg-white p-5 shadow-xs space-y-4 ${b.status === 'active' ? 'border-slate-200' : 'border-rose-200 opacity-70'}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-xl bg-teal-600 text-white">
                        <Building2 size={20} />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900">{b.name}</h3>
                        <p className="text-xs font-bold text-slate-500">{b.city}</p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${b.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {b.status === 'active' ? 'نشط ✓' : 'موقوف'}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs font-bold text-slate-600">
                    <div className="flex items-center gap-2"><MapPin size={13} className="text-slate-400" /> {b.address}</div>
                    <div className="flex items-center gap-2"><Phone size={13} className="text-slate-400" /> {b.phone}</div>
                    <div className="flex items-center gap-2"><ShieldCheck size={13} className="text-slate-400" /> مدير الفرع: {b.managerName}</div>
                    <div className="flex items-center gap-2"><Users size={13} className="text-slate-400" /> {b.activeStudents} طالب نشط</div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button onClick={() => openEdit(b)} className="flex items-center gap-1.5 text-xs font-black text-teal-700 hover:underline">
                      <Edit3 size={13} /> تعديل بيانات الفرع
                    </button>
                    <button onClick={() => handleDelete(b.id)} className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create/Edit Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm grid place-items-center">
              <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 text-right">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-slate-900 text-lg">{editing ? 'تعديل بيانات الفرع' : 'إضافة فرع جديد'}</h3>
                  <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-black text-slate-700 block mb-1">اسم الفرع / العيادة</label>
                    <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none focus:border-teal-600" required placeholder="مثال: فرع المدينة — القاهرة" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">المدينة</label>
                    <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none" required />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">رقم الهاتف</label>
                    <input type="text" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none" required />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-black text-slate-700 block mb-1">العنوان التفصيلي</label>
                    <input type="text" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none" required />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">اسم مدير الفرع</label>
                    <input type="text" value={form.managerName} onChange={e => setForm(f => ({ ...f, managerName: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none" required />
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">عدد الطلاب النشطين</label>
                    <input type="number" value={form.activeStudents} onChange={e => setForm(f => ({ ...f, activeStudents: +e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none" min={0} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-black text-slate-700 block mb-1">حالة الفرع</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none">
                      <option value="active">نشط ✓</option>
                      <option value="inactive">موقوف مؤقتاً</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-xs font-black text-slate-500 hover:bg-slate-100 rounded-xl">إلغاء</button>
                  <button type="submit" className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white hover:bg-teal-700 shadow-sm">
                    {editing ? 'حفظ التعديلات' : 'إنشاء الفرع'}
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
