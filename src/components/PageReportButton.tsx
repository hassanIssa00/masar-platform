'use client';

import React, { useState } from 'react';
import { FileText, Printer, ChevronDown, CheckCircle2, X } from 'lucide-react';
import { TAB_PDF_EXPORTERS } from '@/lib/allPagesPdfReports';

interface PageReportButtonProps {
  tabKey?: string;
  label?: string;
  onExport?: () => void;
  variant?: 'primary' | 'outline' | 'amber' | 'dark';
  size?: 'sm' | 'md';
  className?: string;
}

export default function PageReportButton({
  tabKey,
  label = 'تقرير PDF',
  onExport,
  variant = 'primary',
  size = 'md',
  className = '',
}: PageReportButtonProps) {
  const [showModal, setShowModal] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onExport) {
      onExport();
      return;
    }
    if (tabKey && TAB_PDF_EXPORTERS[tabKey]) {
      TAB_PDF_EXPORTERS[tabKey].run();
      return;
    }
    setShowModal(true);
  };

  const baseStyle =
    'inline-flex items-center gap-2 font-black rounded-xl transition-all duration-200 cursor-pointer shadow-xs active:scale-95';

  const sizeStyle =
    size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2.5 text-xs sm:text-sm';

  let variantStyle = 'bg-teal-700 hover:bg-teal-800 text-white shadow-teal-900/10';
  if (variant === 'outline') {
    variantStyle = 'border-2 border-teal-600 text-teal-700 bg-white hover:bg-teal-50';
  } else if (variant === 'amber') {
    variantStyle = 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-900/10';
  } else if (variant === 'dark') {
    variantStyle = 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20';
  }

  return (
    <>
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={handleClick}
          className={`${baseStyle} ${sizeStyle} ${variantStyle} ${className}`}
          title="تصدير وحفظ تقرير PDF رسمي معتمد"
        >
          <FileText size={size === 'sm' ? 14 : 16} className="shrink-0" />
          <span>{label}</span>
          <Printer size={size === 'sm' ? 12 : 14} className="opacity-80 shrink-0" />
        </button>

        {/* Small dropdown arrow to access the All-Reports Center */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className={`rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 hover:text-teal-700 transition cursor-pointer shadow-2xs ${size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'} flex items-center justify-center`}
          title="عرض مركز تقارير المنصة الموحد لجميع التبويبات"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      <PlatformReportsModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}

export function PlatformReportsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
      <div
        className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-teal-50 text-2xl border border-teal-200">
              🖨️
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                مركز تقارير المنصة الموحد (جميع التبويبات)
              </h2>
              <p className="mt-0.5 text-xs font-bold text-slate-500">
                اختر أي تبويب من القائمة لتصدير وطباعة تقرير PDF رسمي معتمد ومختوم
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Exporters Grid grouped by category */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(TAB_PDF_EXPORTERS).map(([key, item]) => (
            <div
              key={key}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-4 hover:border-teal-300 hover:bg-teal-50/30 transition group"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-black text-slate-600 border border-slate-200">
                    {item.category}
                  </span>
                </div>
                <h3 className="mt-2 text-sm font-black text-slate-900 leading-snug">
                  {item.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => {
                  item.run();
                  onClose();
                }}
                className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-black text-white hover:bg-teal-800 transition cursor-pointer shadow-xs group-hover:scale-102"
              >
                <Printer size={13} />
                <span>طباعة تقرير PDF</span>
              </button>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
          <span className="flex items-center gap-1.5 text-teal-700 font-black">
            <CheckCircle2 size={14} />
            جميع التقارير معتمدة ومختومة إلكترونياً بختم د. إسماعيل عيسى
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 font-black text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
