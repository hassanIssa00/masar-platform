'use client';

import { useState, useRef } from 'react';
import {
  Camera, Plus, ExternalLink, Calendar, Sparkles, Folder,
  Image as ImageIcon, Upload, Trash2, Tag, Layers, Share2,
  CheckCircle2, Heart, Trophy, Sun, Compass
} from 'lucide-react';

export interface ClassEventItem {
  id: string;
  title: string;
  category: 'party' | 'trip' | 'activity' | 'competition' | 'open_day' | 'other';
  categoryLabel?: string;
  driveUrl?: string;
  coverImage?: string;
  images?: string[];
  description?: string;
  date: string;
  createdAt?: string;
}

interface Props {
  eventsList: ClassEventItem[];
  onCreateEvent: (newEvent: {
    title: string;
    category: ClassEventItem['category'];
    categoryLabel: string;
    driveUrl?: string;
    coverImage?: string;
    images?: string[];
    description?: string;
    date: string;
  }) => Promise<void>;
}

const CATEGORY_CONFIG: Record<ClassEventItem['category'], { label: string; icon: string; bg: string; text: string; border: string }> = {
  party: {
    label: 'حفلة وحفل تكريم 🎉',
    icon: '🎉',
    bg: 'bg-pink-50 text-pink-900',
    border: 'border-pink-200',
    text: 'text-pink-700',
  },
  trip: {
    label: 'رحلة مدرسية 🚌',
    icon: '🚌',
    bg: 'bg-blue-50 text-blue-900',
    border: 'border-blue-200',
    text: 'text-blue-700',
  },
  activity: {
    label: 'نشاط صفي وفني 🎨',
    icon: '🎨',
    bg: 'bg-purple-50 text-purple-900',
    border: 'border-purple-200',
    text: 'text-purple-700',
  },
  competition: {
    label: 'مسابقة وتفوق صفي 🏆',
    icon: '🏆',
    bg: 'bg-amber-50 text-amber-900',
    border: 'border-amber-200',
    text: 'text-amber-700',
  },
  open_day: {
    label: 'يوم مفتوح 🌤️',
    icon: '🌤️',
    bg: 'bg-emerald-50 text-emerald-900',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
  },
  other: {
    label: 'حدث عام 📌',
    icon: '📌',
    bg: 'bg-slate-50 text-slate-900',
    border: 'border-slate-200',
    text: 'text-slate-700',
  },
};

/* Initial Demo Events if empty */
const INITIAL_DEMO_EVENTS: ClassEventItem[] = [
  {
    id: 'EVT-1',
    title: 'حفلة تكريم الطلاب المتفوقين في القراءة 🏆',
    category: 'party',
    categoryLabel: 'حفلة وحفل تكريم 🎉',
    driveUrl: 'https://drive.google.com',
    description: 'تغطية مصورة لحفلة تكريم طلاب الفصل المتميزين في مهارات القراءة والوعي الفونيجي بحضور إدارة المدرسة والآباء.',
    date: new Date().toISOString().split('T')[0],
    coverImage: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80',
    images: [
      'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80'
    ]
  },
  {
    id: 'EVT-2',
    title: 'الرحلة الاستكشافية للمركز العلمي 🚌',
    category: 'trip',
    categoryLabel: 'رحلة مدرسية 🚌',
    driveUrl: 'https://drive.google.com',
    description: 'صور وفيديوهات التوثيق لرحلة طلاب الصف الثالث إلى المعارض العلمية وتجارب الفيزياء التفاعلية.',
    date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0],
    coverImage: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80',
  }
];

export default function ClassEventsArchiveTab({ eventsList, onCreateEvent }: Props) {
  const [events, setEvents] = useState<ClassEventItem[]>(() => {
    return eventsList.length > 0 ? eventsList : INITIAL_DEMO_EVENTS;
  });

  /* Form State */
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ClassEventItem['category']>('party');
  const [driveUrl, setDriveUrl] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  /* Filter */
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Handle Upload Local Photos */
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setUploadedImages(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  /* Create Event */
  const handleSubmit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    const catCfg = CATEGORY_CONFIG[category];

    const newEvt: ClassEventItem = {
      id: `EVT-${Date.now()}`,
      title,
      category,
      categoryLabel: catCfg.label,
      driveUrl: driveUrl.trim() || undefined,
      description: description.trim() || undefined,
      date,
      coverImage: uploadedImages[0] || 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80',
      images: uploadedImages,
    };

    try {
      await onCreateEvent({
        title,
        category,
        categoryLabel: catCfg.label,
        driveUrl: driveUrl.trim() || undefined,
        coverImage: newEvt.coverImage,
        images: uploadedImages,
        description: description.trim() || undefined,
        date,
      });
      setEvents(prev => [newEvt, ...prev]);

      // Reset
      setTitle('');
      setDriveUrl('');
      setDescription('');
      setUploadedImages([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(evt => {
    if (selectedFilter === 'all') return true;
    return evt.category === selectedFilter;
  });

  return (
    <div className="space-y-6 text-slate-900" dir="rtl">

      {/* ── TOP HEADER BANNER ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#06392c] via-[#0b4d3c] to-[#04291e] p-6 text-white shadow-xl border border-emerald-800/40">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Camera className="h-6 w-6 text-amber-400" />
              <span className="font-black text-emerald-200 text-sm">منصة مَسَار · أرشيف الفعاليات ومعرض الصور الموثق</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">أرشيف الأحداث ومعرض الصور 📸🎉</h2>
            <p className="mt-1 text-sm font-semibold text-emerald-100/90">
              وثق حفلات التكريم والرحلات والأنشطة الصفية وشارك ألبومات Google Drive مع أولياء الأمور بنقرة واحدة!
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center shrink-0">
            <span className="text-2xl font-black text-amber-400 block font-mono">{events.length}</span>
            <span className="text-xs font-bold text-emerald-100">فعالية وحفلة موثقة</span>
          </div>
        </div>
      </div>

      {/* ── CREATE NEW EVENT & ALBUM FORM ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="font-black text-slate-900 flex items-center gap-2 text-base">
            <Plus className="w-5 h-5 text-pink-600" /> إضافة حدث أو ألبوم فعاليات جديد
          </h3>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            يُحفظ في أرشيف الفرع ويظهر لأولياء الأمور 📲
          </span>
        </div>

        {/* Category & Title */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">نوع الفعالية / الحدث</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-pink-500 focus:outline-none"
            >
              <option value="party">🎉 حفلة وحفل تكريم</option>
              <option value="trip">🚌 رحلة مدرسية واستكشافية</option>
              <option value="activity">🎨 نشاط صفي وفني</option>
              <option value="competition">🏆 مسابقة وتفوق صفي</option>
              <option value="open_day">🌤️ يوم مفتوح</option>
              <option value="other">📌 حدث عام</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-black text-slate-700 mb-1.5">عنوان الفعالية أو الحفلة</label>
            <input
              type="text"
              placeholder="مثال: حفل تكريم الطلاب المتفوقين في القراءة بنهاية الفصل الأول..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-900 focus:border-pink-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Google Drive Album Link */}
        <div>
          <label className="block text-xs font-black text-slate-700 mb-1.5">
            رابط ألبوم Google Drive / السحابة للصور (اختياري)
          </label>
          <div className="relative">
            <input
              type="url"
              placeholder="https://drive.google.com/drive/folders/..."
              value={driveUrl}
              onChange={e => setDriveUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 pr-10 text-xs font-mono text-slate-900 focus:border-pink-500 focus:outline-none"
              dir="ltr"
            />
            <Folder className="absolute right-3 top-3 h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-[10px] text-slate-400 font-bold mt-1">
            ضع رابط مجلد صور Google Drive المباشر ليتمكن أولياء الأمور من استعراض وتنزيل الصور بجودة عالية.
          </p>
        </div>

        {/* Event Description */}
        <div>
          <label className="block text-xs font-black text-slate-700 mb-1.5">وصف ومحاضر الحدث (اختياري)</label>
          <textarea
            rows={2}
            placeholder="اكتب نبذة عن الفعالية ومجريات التكريم وأسماء المكرمين..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-medium text-slate-900 focus:border-pink-500 focus:outline-none resize-none"
          />
        </div>

        {/* Local Photo Upload */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <ImageIcon size={14} className="text-pink-600" /> رفع صور للمعاينة المباشرة (اختياري)
            </label>
            <span className="text-[10px] text-slate-400 font-bold">يمكنك رفع صور من جهازك لتظهر في الأرشيف</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl border-2 border-dashed border-pink-300 bg-pink-50/50 hover:bg-pink-100/60 px-4 py-3 text-xs font-black text-pink-900 transition active:scale-95"
            >
              <Upload size={16} /> اختيار صور من الجهاز 📷
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              multiple
              className="hidden"
            />

            {uploadedImages.map((img, idx) => (
              <div key={idx} className="relative group w-16 h-16 rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <img src={img} alt="صورة الفعالية" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute inset-0 bg-slate-950/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Date & Submit */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-700">تاريخ الفعالية:</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:border-pink-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 text-xs font-black transition shadow-md active:scale-95 disabled:opacity-40"
          >
            <Camera className="h-4 w-4" />
            حفظ ونشر الفعالية بالأرشيف 🚀
          </button>
        </div>

      </div>

      {/* ── EVENTS ARCHIVE TIMELINE & FILTER ── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" /> أرشيف الفعاليات الموثقة ({filteredEvents.length})
          </h3>

          {/* Filter Options */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              الكل ({events.length})
            </button>
            {Object.entries(CATEGORY_CONFIG).map(([catKey, catCfg]) => (
              <button
                key={catKey}
                onClick={() => setSelectedFilter(catKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedFilter === catKey
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {catCfg.label}
              </button>
            ))}
          </div>
        </div>

        {/* Event Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredEvents.map((evt) => {
            const catCfg = CATEGORY_CONFIG[evt.category] || CATEGORY_CONFIG.other;

            return (
              <div
                key={evt.id}
                className="rounded-3xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between"
              >
                {/* Event Cover Image or Header Banner */}
                {evt.coverImage ? (
                  <div className="relative h-48 w-full bg-slate-900 overflow-hidden">
                    <img src={evt.coverImage} alt={evt.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    <div className="absolute top-3 right-3">
                      <span className={`text-xs font-black px-3 py-1 rounded-full border shadow-sm ${catCfg.bg} ${catCfg.border}`}>
                        {catCfg.label}
                      </span>
                    </div>
                    <div className="absolute bottom-3 right-3 text-white">
                      <span className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                        <Calendar size={12} /> {new Date(evt.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className={`text-xs font-black px-3 py-1 rounded-full border ${catCfg.bg} ${catCfg.border}`}>
                      {catCfg.label}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {new Date(evt.date).toLocaleDateString('ar-EG')}
                    </span>
                  </div>
                )}

                {/* Content */}
                <div className="p-5 space-y-3 flex-1">
                  <h4 className="font-black text-base text-slate-900 leading-snug">{evt.title}</h4>

                  {evt.description && (
                    <p className="text-xs font-medium text-slate-600 leading-relaxed line-clamp-3">
                      {evt.description}
                    </p>
                  )}

                  {/* Images preview gallery */}
                  {evt.images && evt.images.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] font-black text-slate-400">معاينة الصور:</span>
                      <div className="flex gap-1.5">
                        {evt.images.slice(0, 4).map((img, i) => (
                          <div key={i} className="w-10 h-10 rounded-lg border border-slate-200 overflow-hidden">
                            <img src={img} alt="صورة الفعالية" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action: Google Drive Link */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  {evt.driveUrl ? (
                    <a
                      href={evt.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 px-4 py-2.5 text-xs font-black text-white shadow-sm transition active:scale-95"
                    >
                      <Folder size={14} /> فتح ألبوم الصور الكامل على Google Drive 📁
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400 font-bold mx-auto">معرض الصور محفوظ بالأرشيف 📸</span>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
