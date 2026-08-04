'use client';

import { useEffect, useState } from 'react';
import {
  BookMarked, Plus, X, Search, Download, Filter, Trash2,
  FileText, Video, BookOpen, Wrench, ClipboardList, Layers3
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import {
  getLocalResources, createResource, deleteResource, incrementDownload,
  type ResourceItem, type ResourceCategory, type ResourceDomain, type DifficultyLevel,
  CATEGORY_LABELS, DOMAIN_LABELS_RES, DIFFICULTY_LABELS
} from '@/lib/resources';
import FeatureGuideBanner from '@/components/FeatureGuideBanner';

const CATEGORY_ICONS: Record<ResourceCategory, React.ReactNode> = {
  worksheet: <FileText size={18} />,
  activity: <Layers3 size={18} />,
  video: <Video size={18} />,
  article: <BookOpen size={18} />,
  tool: <Wrench size={18} />,
  assessment: <ClipboardList size={18} />,
};

const DIFFICULTY_COLORS: Record<DifficultyLevel, string> = {
  beginner: 'bg-emerald-100 text-emerald-800',
  intermediate: 'bg-amber-100 text-amber-800',
  advanced: 'bg-rose-100 text-rose-800',
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterDomain, setFilterDomain] = useState<ResourceDomain | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<ResourceCategory | 'all'>('all');
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'worksheet' as ResourceCategory,
    domain: 'reading' as ResourceDomain,
    difficulty: 'beginner' as DifficultyLevel,
    ageRange: '6-9 سنوات',
    tags: '',
    uploadedBy: 'أ.د. إسماعيل عيسى',
  });

  useEffect(() => {
    setResources(getLocalResources());
  }, []);

  const filtered = resources.filter(r => {
    const matchSearch = !search || r.title.includes(search) || r.description.includes(search) || r.tags.join(',').includes(search);
    const matchDomain = filterDomain === 'all' || r.domain === filterDomain;
    const matchCat = filterCategory === 'all' || r.category === filterCategory;
    return matchSearch && matchDomain && matchCat;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createResource({
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      fileType: 'pdf',
    });
    setResources(getLocalResources());
    setShowModal(false);
  };

  const handleDownload = (id: string) => {
    incrementDownload(id);
    setResources(getLocalResources());
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
                <BookMarked className="text-teal-600" size={26} />
                مكتبة الموارد العلاجية التشاركية
              </h1>
              <p className="text-xs font-bold text-slate-500 mt-1">
                أوراق عمل، أنشطة، أدوات تقييم وموارد علمية مصنفة حسب المجال والمستوى
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-black text-white hover:bg-teal-700 shadow-sm"
            >
              <Plus size={18} /> رفع مورد جديد
            </button>
          </div>

          <FeatureGuideBanner
            title="مكتبة الموارد التشاركية (Resource Library)"
            description="مستودع رقمي محمي يضم جميع الوسائل، أوراق العمل، التمارين والتطبيقات السلوكية والأكاديمية المعتمدة بالمركز لتبادلها بين الفريق الطبي والأسرة."
            benefits={[
              'تمنع عشوائية المواد المستخدمة وتوفر محتوى موحّد وعالي الجودة للجلسات.',
              'تسمح بنقل التمارين والواجبات إلى المنزل بسهولة بضغطة زر مع متابعة التحميل.',
              'تُصنّف الموارد حسب الصعوبة والفئة العمرية والمجال العلاجي لتوفير الوقت.'
            ]}
            modernShift="الانتقال إلى الموارد العلاجية المفتوحة والتشاركية (Open Therapeutic Educational Resources) يضمن استمرارية العلاج واستدامة التدريب في كافة بيئات الطفل بنفس الكفاءة."
          />

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(CATEGORY_LABELS).slice(0, 4).map(([key, label]) => {
              const count = resources.filter(r => r.category === key).length;
              return (
                <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                    {CATEGORY_ICONS[key as ResourceCategory]}
                  </span>
                  <div>
                    <p className="text-xl font-black text-slate-900">{count}</p>
                    <p className="text-[11px] font-black text-slate-400">{label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="بحث في الموارد..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pr-9 pl-3 text-xs font-black outline-none focus:border-teal-600"
              />
            </div>
            <select
              value={filterDomain}
              onChange={e => setFilterDomain(e.target.value as ResourceDomain | 'all')}
              className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-black outline-none"
            >
              <option value="all">كل المجالات</option>
              {Object.entries(DOMAIN_LABELS_RES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as ResourceCategory | 'all')}
              className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs font-black outline-none"
            >
              <option value="all">كل الأنواع</option>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {/* Resources Grid */}
          {filtered.length === 0 ? (
            <div className="py-20 text-center rounded-2xl border border-dashed border-slate-300 bg-white space-y-3">
              <BookMarked className="mx-auto text-slate-300" size={48} />
              <p className="text-lg font-black text-slate-600">لا توجد موارد مطابقة</p>
              <button onClick={() => setShowModal(true)} className="mx-auto flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-black text-white hover:bg-teal-700">
                <Plus size={16} /> رفع أول مورد علاجي
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(r => (
                <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-teal-300 transition space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                      {CATEGORY_ICONS[r.category]}
                    </span>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${DIFFICULTY_COLORS[r.difficulty]}`}>
                        {DIFFICULTY_LABELS[r.difficulty]}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">
                        {CATEGORY_LABELS[r.category]}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-black text-slate-900 text-base leading-snug">{r.title}</h3>
                    <p className="text-xs font-bold text-slate-500 mt-1 leading-relaxed line-clamp-2">{r.description}</p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    <span className="rounded-full bg-teal-50 border border-teal-100 px-2 py-0.5 text-[10px] font-black text-teal-700">
                      {DOMAIN_LABELS_RES[r.domain]}
                    </span>
                    <span className="rounded-full bg-slate-50 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {r.ageRange}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-[11px] font-bold text-slate-400">
                      <span>{r.downloads} تنزيل</span> · <span>بواسطة {r.uploadedBy}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDownload(r.id)}
                        className="flex items-center gap-1 rounded-xl bg-teal-600 px-3 py-1.5 text-[11px] font-black text-white hover:bg-teal-700"
                      >
                        <Download size={12} /> تنزيل
                      </button>
                      <button onClick={() => { deleteResource(r.id); setResources(getLocalResources()); }} className="p-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Create Modal */}
          {showModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm grid place-items-center">
              <form onSubmit={handleCreate} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 text-right">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-black text-slate-900 text-lg">رفع مورد علاجي جديد</h3>
                  <button type="button" onClick={() => setShowModal(false)}><X size={20} className="text-slate-400" /></button>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">عنوان المورد</label>
                  <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none" required placeholder="مثال: ورقة عمل تمييز الحروف المتشابهة" />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">وصف تفصيلي</label>
                  <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none resize-none" required />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">نوع المورد</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ResourceCategory }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none">
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">المجال العلاجي</label>
                    <select value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value as ResourceDomain }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none">
                      {Object.entries(DOMAIN_LABELS_RES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">مستوى الصعوبة</label>
                    <select value={form.difficulty} onChange={e => setForm(f => ({ ...f, difficulty: e.target.value as DifficultyLevel }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none">
                      {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1">الفئة العمرية</label>
                    <input type="text" value={form.ageRange} onChange={e => setForm(f => ({ ...f, ageRange: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none" />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1">الكلمات المفتاحية (مفصولة بفاصلة)</label>
                  <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-black outline-none" placeholder="مثال: قراءة، حروف، مقاطع" />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-xs font-black text-slate-500">إلغاء</button>
                  <button type="submit" className="flex-1 rounded-xl bg-teal-600 py-2.5 text-xs font-black text-white hover:bg-teal-700 shadow-sm">
                    حفظ المورد في المكتبة
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
